//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.InventoryManagement.InventoryStatus;
using AppCore.Infrastructure.Persistence;

using StockBatchesEntity =
    AppCore.Domain.Platform.Inventory.StockBatches;

using StockMovementsEntity =
    AppCore.Domain.Platform.Inventory.StockMovements;

using VatRegisterEntity =
    AppCore.Domain.Platform.Inventory.VatRegister;

using MotorBikeUnitsEntity =
    AppCore.Domain.Entities.Procurement.MotorBikePurchase.MotorBikeUnits;

using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;

using SparePartsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SpareParts;

using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using ColorManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ColorManagement;

using SparePartLocationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SparePartLocations;

using AccessoryLocationsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.AccessoryLocations;

using RackManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.RackManagement;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using WarehousesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Warehouses;

using SupplierProfilesEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.SupplierProfiles;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;

using ProductTransferUnitsEntity =
    AppCore.Domain.Entities.InventoryManagement.StockMovement.ProductTransferUnits;

using BarcodePrintRunLinesEntity =
    AppCore.Domain.Entities.InventoryManagement.PricingLabels.BarcodePrintRunLines;

using ServiceVehiclesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.ServiceVehicles;

using ServiceEnquiriesEntity =
    AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles.ServiceEnquiries;

using MembershipStatusEntity =
    AppCore.Domain.Entities.MembershipManagement.MembershipAssignment.MembershipStatus;

using ActivityHistoryEntity =
    AppCore.Domain.Common.ActivityHistory;

using UserProfileEntity =
    AppCore.Domain.Entities.SecurityPermission.UserManagement.UserProfile;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InventoryManagement.InventoryStatus;


//===============================================================
// Inventory Status repository (read only)
//
// Stock is read from StockMovements : per batch and bucket,
// quantity = Σ In − Σ Out, valued at the batch's exact unit cost.
// Buckets :
//   InTransit : purchased (posted), not received; no warehouse
//   OnHand    : in a warehouse (WarehouseId on the movement)
//
// Filters : branch (movement branch) and warehouse. The
// warehouse filter applies to On Hand only; In Transit stays
// with its branch (it is not in a warehouse yet).
//
// Product status (on Total = In Transit + On Hand) :
//   Out of Stock  nothing
//   In Transit    nothing on hand, some in transit
//   Critical      at or below Red Level (when set)
//   Low Stock     at or below Re-order Level (when set)
//   In Stock      otherwise
//===============================================================

public class InventoryStatusRepository
    : IInventoryStatusRepository
{
    private readonly AppDbContext _context;


    //===========================================================
    // Constants
    //===========================================================

    private const string PageMotorBikes = "MB";

    private const string PageSpareParts = "SP";

    private const string PageAccessories = "AC";

    private const string BucketInTransit = "InTransit";

    private const string BucketOnHand = "OnHand";

    private const string KindMotorBikes = "Motor Bikes";

    private const string KindSpareParts = "Spare Parts";

    private const string KindLubricants = "Lubricants";

    private const string KindAccessories = "Accessories";

    // Movement types of the period figures
    private static readonly string[] PurchaseMoves =
        { "Purchase", "PurchaseCancel", "PurchaseReturn", "ShortSupply" };

    private static readonly string[] SalesMoves =
        { "Sale", "SaleCancel", "SaleReturn" };

    private static readonly string[] OpeningMoves =
        { "Opening", "OpeningCancel" };

    private const string UnitPending = "Pending";

    private const string UnitSold = "Sold";

    private const string UnitReturned = "Returned";

    // Edit Bike Numbers (Inventory Management, critical, OFF)
    private const string SwitchEditNumbers = "CFG-MOD-012-0090";

    private const string SwitchEditSold = "CFG-MOD-012-0091";

    // Purchases - MB switches for the bike numbers
    private const string SwitchKeyBattery = "CFG-MOD-007-0048";

    private const string SwitchUniqueKeyNo = "CFG-MOD-007-0049";

    private const string SwitchUniqueBatteryNo = "CFG-MOD-007-0050";

    private const string DateFormat = "yyyy-MM-dd";

    // Rows of the stock ledger on the stock card (latest kept)
    private const int MaxMovements = 1000;

    private const int MaxBikes = 3000;


    public InventoryStatusRepository(
        AppDbContext context)
    {
        _context = context;
    }


    //===========================================================
    // Inner rows
    //===========================================================

    private sealed class ProductInfo
    {
        public long ProductId { get; set; }

        public string ProductCode { get; set; } = string.Empty;

        public string PartNumber { get; set; } = string.Empty;

        public string ItemName { get; set; } = string.Empty;

        public string Unit { get; set; } = string.Empty;

        public string Kind { get; set; } = string.Empty;

        public long CategoryId { get; set; }

        public long SubCategoryId { get; set; }

        public long ColorId { get; set; }

        public int ReorderLevel { get; set; }

        public int RedLevel { get; set; }

        public int MaxStockLevel { get; set; }

        public bool IsActive { get; set; }

        public string ImagePath { get; set; } = string.Empty;
    }


    // Σ In − Σ Out of one batch in one bucket (and warehouse)
    private sealed class Holding
    {
        public long ProductId { get; set; }

        public long StockBatchId { get; set; }

        public long BranchId { get; set; }

        public long? WarehouseId { get; set; }

        public string Bucket { get; set; } = string.Empty;

        public decimal Quantity { get; set; }

        public DateOnly LastDate { get; set; }
    }


    //===========================================================
    // Page type : MB / SP / AC only
    //===========================================================

    private static string PageOf
    (
        string pageType
    )
    {
        string page =
            (pageType ?? string.Empty).Trim().ToUpperInvariant();

        return page is PageMotorBikes or PageSpareParts or PageAccessories
            ? page
            : throw new InvalidOperationException(
                $"Unknown stock page '{pageType}'.");
    }


    // Today in Bangladesh (UTC+6)
    private static DateOnly Today() =>
        DateOnly.FromDateTime(DateTime.UtcNow.AddHours(6));


    private static string DateText(DateOnly? date) =>
        date.HasValue
            ? date.Value.ToString(DateFormat)
            : string.Empty;


    private static decimal Money(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);


    private static decimal Cost(decimal value) =>
        Math.Round(value, 4, MidpointRounding.AwayFromZero);


    //===========================================================
    // List
    //===========================================================

    public async Task<InventoryStockListDto>
        GetStockAsync
        (
            string pageType,
            long branchId,
            long warehouseId,
            bool canViewCost,
            bool canViewCostVat = false,
            DateOnly? from = null,
            DateOnly? to = null
        )
    {
        string page =
            PageOf(pageType);

        // The period : the running calendar month by default
        DateOnly today =
            Today();

        DateOnly start =
            from ?? new DateOnly(today.Year, today.Month, 1);

        DateOnly end =
            to ?? new DateOnly(start.Year, start.Month, 1).AddMonths(1).AddDays(-1);

        if (end < start)
        {
            (start, end) = (end, start);
        }

        // One cost on these pages : always incl. VAT (owner,
        // 2026-11-06); the separate incl. VAT figures are not used
        canViewCostVat =
            false;

        InventoryStockListDto result =
            new()
            {
                PageType = page,
                CanViewCost = canViewCost,
                CanViewCostVat = canViewCostVat,
                BranchId = Math.Max(0, branchId),
                WarehouseId = Math.Max(0, warehouseId),
                AsOf = DateText(end < today ? end : today),
                From = DateText(start),
                To = DateText(end)
            };

        result.Branches =
            await _context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.BranchName)
                .Select
                (
                    x =>
                        new InventoryStockOptionDto
                        {
                            Id = x.BranchId,
                            Code = x.BranchCode,
                            Name = x.BranchName
                        }
                )
                .ToListAsync();

        result.Warehouses =
            await _context
                .Set<WarehousesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.WarehouseName)
                .Select
                (
                    x =>
                        new InventoryStockWarehouseDto
                        {
                            Id = x.WarehouseId,
                            BranchId = x.BranchId,
                            Code = x.WarehouseCode,
                            Name = x.WarehouseName
                        }
                )
                .ToListAsync();

        List<ProductInfo> products =
            await ProductsAsync(page, null);

        // Stock at the end of the period
        List<Holding> holdings =
            await HoldingsAsync(page, null, result.BranchId, result.WarehouseId, end);

        Dictionary<long, decimal> costs =
            await BatchCostsAsync(holdings);

        Dictionary<long, decimal> vats =
            new();

        //=======================================================
        // Period figures per product : Opening (before the
        // period, + Opening Stock entered in it), Purchase and
        // Sales (net, in the period); Bought = ever purchased or
        // opened (net of cancels)
        //=======================================================

        var flows =
            (
                await MovementsQuery(page, null, result.BranchId, result.WarehouseId)
                    .Where(x => x.DocumentDate <= end)
                    .GroupBy(x => x.ProductId)
                    .Select
                    (
                        g =>
                            new
                            {
                                ProductId = g.Key,
                                Opening = g.Sum(x =>
                                    x.DocumentDate < start || OpeningMoves.Contains(x.MovementType)
                                        ? x.QuantityIn - x.QuantityOut
                                        : 0m),
                                Purchase = g.Sum(x =>
                                    x.DocumentDate >= start && PurchaseMoves.Contains(x.MovementType)
                                        ? x.QuantityIn - x.QuantityOut
                                        : 0m),
                                Sales = g.Sum(x =>
                                    x.DocumentDate >= start && SalesMoves.Contains(x.MovementType)
                                        ? x.QuantityOut - x.QuantityIn
                                        : 0m),
                                Bought = g.Sum(x =>
                                    x.MovementType == "Purchase" || x.MovementType == "PurchaseCancel" || OpeningMoves.Contains(x.MovementType)
                                        ? x.QuantityIn - x.QuantityOut
                                        : 0m),
                                Moved = g.Count(x => x.DocumentDate >= start)
                            }
                    )
                    .ToListAsync()
            )
            .ToDictionary(x => x.ProductId);

        Labels labels =
            await LabelsAsync();

        Dictionary<long, string> locations =
            await LocationsAsync(page, null, result.BranchId, result.WarehouseId);

        ILookup<long, Holding> byProduct =
            holdings.ToLookup(x => x.ProductId);

        result.Rows =
            products
                .Select
                (
                    product =>
                    {
                        InventoryStockRowDto row =
                            RowOf(
                                product,
                                byProduct[product.ProductId],
                                costs,
                                labels,
                                locations,
                                canViewCost,
                                canViewCostVat ? vats : null);

                        bool listed =
                            row.Total != 0;

                        if (flows.TryGetValue(product.ProductId, out var flow))
                        {
                            row.OpeningQty = flow.Opening;

                            row.PurchaseQty = flow.Purchase;

                            row.SalesQty = flow.Sales;

                            // Purchased (or opened) at some time, or
                            // moved in the period (e.g. a transfer)
                            listed =
                                listed
                                ||
                                flow.Bought > 0
                                ||
                                flow.Moved > 0;
                        }

                        return listed ? row : null;
                    }
                )
                .Where(x => x != null)
                .Select(x => x!)
                .OrderBy(x => x.ProductCode)
                .ToList();

        return result;
    }


    //===========================================================
    // Motor Bike Stock › Free Accessories : the Accessories
    // products used as Additional / Promotional Accessories
    // (Bike Accessory Schemes), same stock as the Accessories
    // Stock page
    //===========================================================

    private const string KindFreeAccessories = "Free Accessories";

    private async Task<HashSet<long>> BikeAccessoryIdsAsync()
    {
        List<(long Id, string Use)> uses =
            (
                await _context
                    .Set<AccessoriesEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted)
                    .Select(x => new { x.AccessoryId, x.AccessoryUse })
                    .ToListAsync()
            )
            .Select(x => (x.AccessoryId, x.AccessoryUse ?? string.Empty))
            .ToList();

        return uses
            .Where(x => AppCore.Infrastructure.Repositories.Settings.ProductSettings.AccessoryUses.IsBikeAccessory(x.Use))
            .Select(x => x.Id)
            .ToHashSet();
    }


    public async Task<InventoryStockListDto>
        GetBikeAccessoriesStockAsync
        (
            long branchId,
            long warehouseId,
            bool canViewCost,
            DateOnly? from = null,
            DateOnly? to = null
        )
    {
        InventoryStockListDto result =
            await GetStockAsync(
                PageAccessories,
                branchId,
                warehouseId,
                canViewCost,
                false,
                from,
                to);

        HashSet<long> ids =
            await BikeAccessoryIdsAsync();

        result.Rows =
            result.Rows
                .Where(x => ids.Contains(x.ProductId))
                .ToList();

        foreach (var row in result.Rows)
        {
            row.ProductKind = KindFreeAccessories;
        }

        return result;
    }


    public async Task<InventoryStockCardDto?>
        GetBikeAccessoryCardAsync
        (
            long productId,
            long branchId,
            long warehouseId,
            bool canViewCost
        )
    {
        HashSet<long> ids =
            await BikeAccessoryIdsAsync();

        if (!ids.Contains(productId))
        {
            return null;
        }

        return await GetCardAsync(
            PageAccessories,
            productId,
            branchId,
            warehouseId,
            canViewCost);
    }


    //===========================================================
    // Stock card
    //===========================================================

    public async Task<InventoryStockCardDto?>
        GetCardAsync
        (
            string pageType,
            long productId,
            long branchId,
            long warehouseId,
            bool canViewCost
        )
    {
        string page =
            PageOf(pageType);

        branchId = Math.Max(0, branchId);

        warehouseId = Math.Max(0, warehouseId);

        List<ProductInfo> products =
            await ProductsAsync(page, productId);

        ProductInfo? product =
            products.FirstOrDefault();

        if (product == null)
        {
            return null;
        }

        List<Holding> holdings =
            await HoldingsAsync(page, productId, branchId, warehouseId);

        Dictionary<long, decimal> costs =
            await BatchCostsAsync(holdings);

        Labels labels =
            await LabelsAsync();

        Dictionary<long, string> locations =
            await LocationsAsync(page, productId, branchId, warehouseId);

        // Rack / shelf per warehouse for the "Where" list
        labels.Places =
            _placeCache;

        InventoryStockCardDto card =
            new()
            {
                CanViewCost = canViewCost,
                Product =
                    RowOf(
                        product,
                        holdings,
                        costs,
                        labels,
                        locations,
                        canViewCost)
            };

        //=======================================================
        // Batches holding stock (oldest first : sold first)
        //=======================================================

        List<long> heldBatchIds =
            holdings
                .GroupBy(x => x.StockBatchId)
                .Where(g => g.Sum(x => x.Quantity) != 0)
                .Select(g => g.Key)
                .ToList();

        List<StockBatchesEntity> batches =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where(x => heldBatchIds.Contains(x.StockBatchId))
                .ToListAsync();

        List<string> supplierCodes =
            batches
                .Select(x => x.SupplierCode)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .ToList();

        Dictionary<string, string> suppliers =
            (
                await _context
                    .Set<SupplierProfilesEntity>()
                    .AsNoTracking()
                    .Where(x => supplierCodes.Contains(x.SupplierCode))
                    .Select(x => new { x.SupplierCode, x.DisplayName })
                    .ToListAsync()
            )
            .GroupBy(x => x.SupplierCode)
            .ToDictionary(g => g.Key, g => g.First().DisplayName ?? string.Empty);

        DateOnly today =
            Today();

        card.Batches =
            batches
                .Select
                (
                    batch =>
                    {
                        List<Holding> of =
                            holdings
                                .Where(x => x.StockBatchId == batch.StockBatchId)
                                .ToList();

                        decimal inTransit =
                            of.Where(x => x.Bucket == BucketInTransit).Sum(x => x.Quantity);

                        decimal onHand =
                            of.Where(x => x.Bucket == BucketOnHand).Sum(x => x.Quantity);

                        return new InventoryStockBatchDto
                        {
                            StockBatchId = batch.StockBatchId,
                            BatchNo = batch.BatchNo,
                            SourceType = batch.SourceType,
                            SourceNo = batch.SourceNo,
                            SourceDate = DateText(batch.SourceDate),
                            SupplierCode = batch.SupplierCode,
                            SupplierName = suppliers.GetValueOrDefault(batch.SupplierCode, string.Empty),
                            BranchName = labels.Branches.GetValueOrDefault(batch.BranchId, string.Empty),
                            Quantity = batch.Quantity,
                            UnitCost = canViewCost ? Cost(costs.GetValueOrDefault(batch.StockBatchId, batch.UnitCost)) : 0m,
                            InTransit = inTransit,
                            OnHand = onHand,
                            Value = canViewCost ? Money((inTransit + onHand) * costs.GetValueOrDefault(batch.StockBatchId, batch.UnitCost)) : 0m,
                            AgeDays = Math.Max(0, today.DayNumber - batch.SourceDate.DayNumber)
                        };
                    }
                )
                .OrderBy(x => x.SourceDate)
                .ThenBy(x => x.StockBatchId)
                .ToList();

        //=======================================================
        // Where : branch / warehouse / bucket
        //=======================================================

        card.Places =
            holdings
                .GroupBy(x => new { x.BranchId, x.WarehouseId, x.Bucket })
                .Select
                (
                    g =>
                        new InventoryStockPlaceDto
                        {
                            BranchName = labels.Branches.GetValueOrDefault(g.Key.BranchId, string.Empty),
                            WarehouseName =
                                g.Key.WarehouseId.HasValue
                                    ? labels.Warehouses.GetValueOrDefault(g.Key.WarehouseId.Value, string.Empty)
                                    : string.Empty,
                            Bucket = g.Key.Bucket == BucketOnHand ? "On Hand" : "In Transit",
                            Quantity = g.Sum(x => x.Quantity),
                            Value =
                                canViewCost
                                    ? Money(g.Sum(x => x.Quantity * costs.GetValueOrDefault(x.StockBatchId)))
                                    : 0m,
                            Location =
                                g.Key.WarehouseId.HasValue
                                    ? labels.LocationOf(product.ProductId, g.Key.WarehouseId.Value)
                                    : string.Empty
                        }
                )
                .Where(x => x.Quantity != 0)
                .OrderBy(x => x.BranchName)
                .ThenBy(x => x.Bucket)
                .ThenBy(x => x.WarehouseName)
                .ToList();

        //=======================================================
        // Stock ledger (running balance of both buckets)
        //=======================================================

        IQueryable<StockMovementsEntity> moves =
            MovementsQuery(page, productId, branchId, warehouseId);

        List<StockMovementsEntity> rows =
            await moves
                .OrderByDescending(x => x.DocumentDate)
                .ThenByDescending(x => x.StockMovementId)
                .Take(MaxMovements)
                .ToListAsync();

        rows.Reverse();

        // Opening balance of the rows left out (older than the
        // ones shown)
        decimal balance = 0m;

        if (rows.Count == MaxMovements)
        {
            StockMovementsEntity first =
                rows[0];

            balance =
                await moves
                    .Where
                    (
                        x =>
                            x.DocumentDate < first.DocumentDate
                            ||
                            (x.DocumentDate == first.DocumentDate && x.StockMovementId < first.StockMovementId)
                    )
                    .SumAsync(x => (decimal?)(x.QuantityIn - x.QuantityOut))
                ??
                0m;
        }

        List<long> movedBatchIds =
            rows
                .Select(x => x.StockBatchId)
                .Distinct()
                .ToList();

        Dictionary<long, string> batchNos =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where(x => movedBatchIds.Contains(x.StockBatchId))
                .ToDictionaryAsync(x => x.StockBatchId, x => x.BatchNo);

        // Incl. VAT : the claimed input VAT per unit of each batch
        Dictionary<long, decimal> moveVats =
            canViewCost
                ? await ClaimedVatAsync(movedBatchIds)
                : new Dictionary<long, decimal>();

        foreach (StockMovementsEntity move in rows)
        {
            balance += move.QuantityIn - move.QuantityOut;

            decimal moveVat =
                moveVats.GetValueOrDefault(move.StockBatchId);

            card.Movements.Add(
                new InventoryStockMovementDto
                {
                    StockMovementId = move.StockMovementId,
                    DocumentDate = DateText(move.DocumentDate),
                    MovementType = move.MovementType,
                    DocumentType = move.DocumentType,
                    DocumentNo = move.DocumentNo,
                    BatchNo = batchNos.GetValueOrDefault(move.StockBatchId, string.Empty),
                    Bucket = move.Bucket == BucketOnHand ? "On Hand" : "In Transit",
                    BranchName = labels.Branches.GetValueOrDefault(move.BranchId, string.Empty),
                    WarehouseName =
                        move.WarehouseId.HasValue
                            ? labels.Warehouses.GetValueOrDefault(move.WarehouseId.Value, string.Empty)
                            : string.Empty,
                    QuantityIn = move.QuantityIn,
                    QuantityOut = move.QuantityOut,
                    Balance = balance,
                    UnitCost = canViewCost ? Cost(move.UnitCost + moveVat) : 0m,
                    Value = canViewCost ? Money(move.Value + (move.QuantityIn + move.QuantityOut) * moveVat) : 0m,
                    IsReversal = move.IsReversal,
                    Narration = move.Narration
                });
        }

        //=======================================================
        // MB : the bikes of this model
        //=======================================================

        if (page == PageMotorBikes)
        {
            card.Bikes =
                await BikeRowsAsync(
                    branchId,
                    null,
                    productId,
                    canViewCost,
                    labels);
        }

        return card;
    }


    //===========================================================
    // Motor bike units
    //===========================================================

    public async Task<InventoryBikeListDto>
        GetBikesAsync
        (
            long branchId,
            string? search,
            bool canViewCost
        )
    {
        Labels labels =
            await LabelsAsync();

        return new InventoryBikeListDto
        {
            CanViewCost = canViewCost,
            Rows =
                await BikeRowsAsync(
                    Math.Max(0, branchId),
                    search,
                    null,
                    canViewCost,
                    labels)
        };
    }


    private async Task<List<InventoryBikeUnitDto>>
        BikeRowsAsync
        (
            long branchId,
            string? search,
            long? productId,
            bool canViewCost,
            Labels labels
        )
    {
        string text =
            (search ?? string.Empty).Trim().ToUpper();

        IQueryable<MotorBikeUnitsEntity> query =
            _context
                .Set<MotorBikeUnitsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status != UnitPending);

        if (branchId > 0)
        {
            query = query.Where(x => x.BranchId == branchId);
        }

        if (productId.HasValue)
        {
            query = query.Where(x => x.ProductId == productId.Value);
        }

        if (text.Length > 0)
        {
            query =
                query.Where
                (
                    x =>
                        x.ChassisNo.ToUpper().Contains(text)
                        ||
                        x.EngineNo.ToUpper().Contains(text)
                        ||
                        x.KeyNo.ToUpper().Contains(text)
                        ||
                        x.BatteryNo.ToUpper().Contains(text)
                        ||
                        x.ProductCode.ToUpper().Contains(text)
                        ||
                        x.ProductName.ToUpper().Contains(text)
                        ||
                        x.PurchaseNo.ToUpper().Contains(text)
                );
        }

        List<MotorBikeUnitsEntity> units =
            await query
                .OrderByDescending(x => x.MotorBikeUnitId)
                .Take(MaxBikes)
                .ToListAsync();

        // Colour of each bike's model
        List<long> bikeProductIds =
            units
                .Select(x => x.ProductId)
                .Distinct()
                .ToList();

        Dictionary<long, long> bikeColors =
            await _context
                .Set<MotorBikesEntity>()
                .AsNoTracking()
                .Where(x => bikeProductIds.Contains(x.MotorBikeId))
                .ToDictionaryAsync(x => x.MotorBikeId, x => x.ColorManagementId);

        // The bike's batch says where it is (one batch per
        // purchase line)
        List<long> lineIds =
            units
                .Select(x => x.PurchaseLineId)
                .Distinct()
                .ToList();

        var batches =
            (
                await _context
                    .Set<StockBatchesEntity>()
                    .AsNoTracking()
                    .Where(x => x.ProductType == PageMotorBikes && x.SourceType == "Purchase" && lineIds.Contains(x.SourceLineId))
                    .Select(x => new { x.StockBatchId, x.SourceLineId, x.SourceId, x.QuantityInTransit, x.QuantityOnHand })
                    .ToListAsync()
            )
            .GroupBy(x => (x.SourceId, x.SourceLineId))
            .ToDictionary(g => g.Key, g => g.First());

        // Incl. VAT : the claimed input VAT per bike (its batch)
        Dictionary<long, decimal> bikeVats =
            canViewCost
                ? await ClaimedVatAsync(batches.Values.Select(x => x.StockBatchId))
                : new Dictionary<long, decimal>();

        return units
            .Select
            (
                unit =>
                {
                    string status =
                        unit.Status;

                    if (batches.TryGetValue((unit.PurchaseId, unit.PurchaseLineId), out var batch))
                    {
                        status =
                            batch.QuantityInTransit > 0 && batch.QuantityOnHand > 0
                                ? "Partly Received"
                                : batch.QuantityInTransit > 0
                                    ? "In Transit"
                                    : batch.QuantityOnHand > 0
                                        ? "In Stock"
                                        : unit.Status;
                    }

                    if (status == "InStock")
                    {
                        status = "In Stock";
                    }

                    return new InventoryBikeUnitDto
                    {
                        MotorBikeUnitId = unit.MotorBikeUnitId,
                        ProductId = unit.ProductId,
                        ProductCode = unit.ProductCode,
                        ProductName = unit.ProductName,
                        ChassisNo = unit.ChassisNo,
                        EngineNo = unit.EngineNo,
                        KeyNo = unit.KeyNo,
                        BatteryNo = unit.BatteryNo,
                        PurchaseNo = unit.PurchaseNo,
                        StockInDate = DateText(unit.StockInDate),
                        BranchName = labels.Branches.GetValueOrDefault(unit.BranchId, string.Empty),
                        Status = status,
                        UnitCost =
                            canViewCost
                                ? Money(unit.UnitCost
                                    + (batches.TryGetValue((unit.PurchaseId, unit.PurchaseLineId), out var own)
                                        ? bikeVats.GetValueOrDefault(own.StockBatchId)
                                        : 0m))
                                : 0m,
                        IsSold = unit.Status == UnitSold,
                        ColorName = labels.Colors.GetValueOrDefault(bikeColors.GetValueOrDefault(unit.ProductId), string.Empty)
                    };
                }
            )
            .OrderBy(x => x.ProductCode)
            .ThenBy(x => x.ChassisNo)
            .ToList();
    }


    //===========================================================
    // Movements of the page type with the filters
    //===========================================================

    private IQueryable<StockMovementsEntity>
        MovementsQuery
        (
            string page,
            long? productId,
            long branchId,
            long warehouseId
        )
    {
        IQueryable<StockMovementsEntity> query =
            _context
                .Set<StockMovementsEntity>()
                .AsNoTracking()
                .Where(x => x.ProductType == page);

        if (productId.HasValue)
        {
            query = query.Where(x => x.ProductId == productId.Value);
        }

        if (branchId > 0)
        {
            query = query.Where(x => x.BranchId == branchId);
        }

        // Warehouse : On Hand of that warehouse; In Transit stays
        if (warehouseId > 0)
        {
            query =
                query.Where
                (
                    x =>
                        x.Bucket != BucketOnHand
                        ||
                        x.WarehouseId == warehouseId
                );
        }

        return query;
    }


    private async Task<List<Holding>>
        HoldingsAsync
        (
            string page,
            long? productId,
            long branchId,
            long warehouseId,
            DateOnly? upTo = null
        )
    {
        IQueryable<StockMovementsEntity> query =
            MovementsQuery(page, productId, branchId, warehouseId);

        // Stock at a date : its movements up to that date
        if (upTo.HasValue)
        {
            DateOnly last =
                upTo.Value;

            query = query.Where(x => x.DocumentDate <= last);
        }

        return
            await query
                .GroupBy
                (
                    x =>
                        new
                        {
                            x.ProductId,
                            x.StockBatchId,
                            x.BranchId,
                            x.WarehouseId,
                            x.Bucket
                        }
                )
                .Select
                (
                    g =>
                        new Holding
                        {
                            ProductId = g.Key.ProductId,
                            StockBatchId = g.Key.StockBatchId,
                            BranchId = g.Key.BranchId,
                            WarehouseId = g.Key.WarehouseId,
                            Bucket = g.Key.Bucket,
                            Quantity = g.Sum(x => x.QuantityIn - x.QuantityOut),
                            LastDate = g.Max(x => x.DocumentDate)
                        }
                )
                .ToListAsync();
    }


    // Exact unit cost of each batch held
    private async Task<Dictionary<long, decimal>>
        BatchCostsAsync
        (
            List<Holding> holdings
        )
    {
        List<long> ids =
            holdings
                .Select(x => x.StockBatchId)
                .Distinct()
                .ToList();

        if (ids.Count == 0)
        {
            return new Dictionary<long, decimal>();
        }

        Dictionary<long, decimal> costs =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.StockBatchId))
                .ToDictionaryAsync(x => x.StockBatchId, x => x.UnitCost);

        // Cost on the stock pages is always incl. VAT : + the input
        // VAT claimed at purchase (owner, 2026-11-06)
        Dictionary<long, decimal> vats =
            await ClaimedVatAsync(ids);

        return costs.ToDictionary(
            x => x.Key,
            x => x.Value + vats.GetValueOrDefault(x.Key));
    }


    //===========================================================
    // Claimed input VAT per unit of each batch held : the VAT the
    // purchase took out of the cost (VAT Register, claimable).
    // A batch whose VAT was not claimed already has it in its
    // cost, so it adds nothing.
    //===========================================================

    private async Task<Dictionary<long, decimal>>
        ClaimedVatAsync
        (
            IEnumerable<long> batchIds
        )
    {
        List<long> ids =
            batchIds
                .Distinct()
                .ToList();

        if (ids.Count == 0)
        {
            return new Dictionary<long, decimal>();
        }

        var batches =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.StockBatchId) && x.SourceVatPerUnit > 0)
                .Select(x => new { x.StockBatchId, x.SourceNo, x.SourceLineId, x.SourceVatPerUnit })
                .ToListAsync();

        if (batches.Count == 0)
        {
            return new Dictionary<long, decimal>();
        }

        List<string> numbers =
            batches.Select(x => x.SourceNo).Distinct().ToList();

        // Claimable share of each source line's VAT
        var claimed =
            (await _context
                .Set<VatRegisterEntity>()
                .AsNoTracking()
                .Where(x => numbers.Contains(x.DocumentNo) && !x.IsReversal && x.DocumentLineId.HasValue)
                .Select(x => new { x.DocumentNo, LineId = x.DocumentLineId!.Value, x.VatAmount, x.VatClaimable })
                .ToListAsync())
                .GroupBy(x => (x.DocumentNo, x.LineId))
                .ToDictionary(
                    g => g.Key,
                    g =>
                    {
                        decimal vat = g.Sum(x => x.VatAmount);

                        return vat > 0m ? g.Sum(x => x.VatClaimable) / vat : 0m;
                    });

        return batches.ToDictionary(
            x => x.StockBatchId,
            x => x.SourceVatPerUnit * claimed.GetValueOrDefault((x.SourceNo, x.SourceLineId)));
    }


    //===========================================================
    // One product row from its holdings
    //===========================================================

    private static InventoryStockRowDto
        RowOf
        (
            ProductInfo product,
            IEnumerable<Holding> holdings,
            Dictionary<long, decimal> costs,
            Labels labels,
            Dictionary<long, string> locations,
            bool canViewCost,
            Dictionary<long, decimal>? vats = null
        )
    {
        List<Holding> list =
            holdings.ToList();

        decimal inTransit =
            list.Where(x => x.Bucket == BucketInTransit).Sum(x => x.Quantity);

        decimal onHand =
            list.Where(x => x.Bucket == BucketOnHand).Sum(x => x.Quantity);

        decimal total =
            inTransit + onHand;

        decimal value =
            list.Sum(x => x.Quantity * costs.GetValueOrDefault(x.StockBatchId));

        // Incl. VAT : + the claimed input VAT per unit of each batch
        decimal valueVat =
            vats == null
                ? 0m
                : list.Sum(x => x.Quantity * (costs.GetValueOrDefault(x.StockBatchId) + vats.GetValueOrDefault(x.StockBatchId)));

        int batchCount =
            list
                .GroupBy(x => x.StockBatchId)
                .Count(g => g.Sum(x => x.Quantity) > 0);

        DateOnly? last =
            list.Count > 0
                ? list.Max(x => x.LastDate)
                : null;

        string status =
            total <= 0
                ? "Out of Stock"
                : onHand <= 0
                    ? "In Transit"
                    : product.RedLevel > 0 && total <= product.RedLevel
                        ? "Critical"
                        : product.ReorderLevel > 0 && total <= product.ReorderLevel
                            ? "Low Stock"
                            : "In Stock";

        labels.Categories.TryGetValue(product.CategoryId, out (string Name, long? BrandId) category);

        return new InventoryStockRowDto
        {
            ProductId = product.ProductId,
            ImagePath = product.ImagePath,
            ProductCode = product.ProductCode,
            ProductName =
                string.IsNullOrWhiteSpace(product.PartNumber)
                    ? product.ItemName
                    : $"{product.PartNumber} - {product.ItemName}",
            PartNumber = product.PartNumber,
            ItemName = product.ItemName,
            Unit = product.Unit,
            ProductKind = product.Kind,
            CategoryName = category.Name ?? string.Empty,
            SubCategoryName = labels.SubCategories.GetValueOrDefault(product.SubCategoryId, string.Empty),
            BrandName =
                category.BrandId.HasValue
                    ? labels.Brands.GetValueOrDefault(category.BrandId.Value, string.Empty)
                    : string.Empty,
            ColorName = labels.Colors.GetValueOrDefault(product.ColorId, string.Empty),
            ReorderLevel = product.ReorderLevel,
            RedLevel = product.RedLevel,
            MaxStockLevel = product.MaxStockLevel,
            IsActive = product.IsActive,
            InTransit = inTransit,
            OnHand = onHand,
            Total = total,
            AverageCost = canViewCost && total > 0 ? Cost(value / total) : 0m,
            StockValue = canViewCost ? Money(value) : 0m,
            AverageCostVat = vats != null && total > 0 ? Cost(valueVat / total) : 0m,
            StockValueVat = vats != null ? Money(valueVat) : 0m,
            BatchCount = batchCount,
            LastMovementDate = DateText(last),
            Location = locations.GetValueOrDefault(product.ProductId, string.Empty),
            StockStatus = status
        };
    }


    //===========================================================
    // Products of the page type (not deleted)
    //===========================================================

    private async Task<List<ProductInfo>>
        ProductsAsync
        (
            string page,
            long? productId
        )
    {
        if (page == PageMotorBikes)
        {
            return
                await _context
                    .Set<MotorBikesEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && (!productId.HasValue || x.MotorBikeId == productId.Value))
                    .Select
                    (
                        x =>
                            new ProductInfo
                            {
                                ProductId = x.MotorBikeId,
                                ProductCode = x.ProductCode,
                                PartNumber = string.Empty,
                                ItemName = x.ProductName,
                                Unit = "Pcs",
                                Kind = KindMotorBikes,
                                CategoryId = x.ProductCategoryId,
                                SubCategoryId = x.ProductSubCategoryId,
                                ColorId = x.ColorManagementId,
                                ReorderLevel = x.ReorderLevel,
                                RedLevel = x.RedLevel,
                                MaxStockLevel = x.MaxStockLevel,
                                IsActive = x.IsActive,
                                ImagePath = x.ImagePath ?? string.Empty
                            }
                    )
                    .ToListAsync();
        }

        if (page == PageSpareParts)
        {
            Dictionary<long, string> types =
                await _context
                    .Set<ProductCategoryEntity>()
                    .AsNoTracking()
                    .ToDictionaryAsync(x => x.ProductCategoryId, x => x.CategoryType ?? string.Empty);

            List<ProductInfo> parts =
                await _context
                    .Set<SparePartsEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && (!productId.HasValue || x.SparePartId == productId.Value))
                    .Select
                    (
                        x =>
                            new ProductInfo
                            {
                                ProductId = x.SparePartId,
                                ProductCode = x.ProductCode,
                                PartNumber = x.PartNumber,
                                ItemName = x.PartName,
                                Unit = x.Unit,
                                CategoryId = x.ProductCategoryId,
                                SubCategoryId = x.ProductSubCategoryId,
                                ReorderLevel = x.ReorderLevel,
                                RedLevel = x.RedLevel,
                                MaxStockLevel = x.MaxStockLevel,
                                IsActive = x.IsActive,
                                ImagePath = x.ImagePath ?? string.Empty
                            }
                    )
                    .ToListAsync();

            // Spare Parts or Lubricants, from the category
            foreach (ProductInfo part in parts)
            {
                part.Kind =
                    string.Equals(types.GetValueOrDefault(part.CategoryId), KindLubricants, StringComparison.OrdinalIgnoreCase)
                        ? KindLubricants
                        : KindSpareParts;
            }

            return parts;
        }

        return
            await _context
                .Set<AccessoriesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && (!productId.HasValue || x.AccessoryId == productId.Value))
                .Select
                (
                    x =>
                        new ProductInfo
                        {
                            ProductId = x.AccessoryId,
                            ProductCode = x.ProductCode,
                            PartNumber = x.PartNumber,
                            ItemName = x.AccessoryName,
                            Unit = x.Unit,
                            Kind = KindAccessories,
                            CategoryId = x.ProductCategoryId,
                            SubCategoryId = x.ProductSubCategoryId,
                            ReorderLevel = x.ReorderLevel,
                            RedLevel = x.RedLevel,
                            MaxStockLevel = x.MaxStockLevel,
                            IsActive = x.IsActive
                        }
                )
                .ToListAsync();
    }


    //===========================================================
    // Names : branches, warehouses, categories, brands …
    //===========================================================

    private sealed class Labels
    {
        public Dictionary<long, string> Branches { get; set; } = new();

        public Dictionary<long, string> Warehouses { get; set; } = new();

        public Dictionary<long, (string Name, long? BrandId)> Categories { get; set; } = new();

        public Dictionary<long, string> SubCategories { get; set; } = new();

        public Dictionary<long, string> Brands { get; set; } = new();

        public Dictionary<long, string> Colors { get; set; } = new();

        // (product, warehouse) → "A-03-05"
        public Dictionary<(long ProductId, long WarehouseId), string> Places { get; set; } = new();

        public string LocationOf(long productId, long warehouseId) =>
            Places.GetValueOrDefault((productId, warehouseId), string.Empty);
    }


    private async Task<Labels>
        LabelsAsync()
    {
        Labels labels =
            new();

        labels.Branches =
            await _context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName ?? string.Empty);

        labels.Warehouses =
            await _context
                .Set<WarehousesEntity>()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.WarehouseId, x => x.WarehouseName ?? string.Empty);

        labels.Categories =
            (
                await _context
                    .Set<ProductCategoryEntity>()
                    .AsNoTracking()
                    .Select(x => new { x.ProductCategoryId, x.CategoryName, x.BrandManagementId })
                    .ToListAsync()
            )
            .ToDictionary(
                x => x.ProductCategoryId,
                x => (x.CategoryName ?? string.Empty, x.BrandManagementId));

        labels.SubCategories =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.ProductSubCategoryId, x => x.SubCategoryName ?? string.Empty);

        labels.Brands =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.BrandManagementId, x => x.BrandName ?? string.Empty);

        labels.Colors =
            await _context
                .Set<ColorManagementEntity>()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.ColorManagementId, x => x.ColorName ?? string.Empty);

        return labels;
    }


    //===========================================================
    // SP / AC rack + shelf per product in the warehouses of the
    // filter (one place = bin code "A-03-05"; more = "3 places").
    // Also fills labels.Places for the stock card.
    //===========================================================

    private async Task<Dictionary<long, string>>
        LocationsAsync
        (
            string page,
            long? productId,
            long branchId,
            long warehouseId
        )
    {
        Dictionary<long, string> result =
            new();

        if (page == PageMotorBikes)
        {
            return result;
        }

        List<long> warehouseIds =
            warehouseId > 0
                ? new List<long> { warehouseId }
                : await _context
                    .Set<WarehousesEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && (branchId == 0 || x.BranchId == branchId))
                    .Select(x => x.WarehouseId)
                    .ToListAsync();

        List<(long ProductId, long WarehouseId, long RackId, int Shelf, int Bin)> places =
            page == PageSpareParts
                ? (
                    await _context
                        .Set<SparePartLocationsEntity>()
                        .AsNoTracking()
                        .Where(x => warehouseIds.Contains(x.WarehouseId) && (!productId.HasValue || x.SparePartId == productId.Value))
                        .Select(x => new { x.SparePartId, x.WarehouseId, x.RackManagementId, x.ShelfNumber, x.BinNumber })
                        .ToListAsync()
                  )
                  .Select(x => (x.SparePartId, x.WarehouseId, x.RackManagementId, x.ShelfNumber, x.BinNumber))
                  .ToList()
                : (
                    await _context
                        .Set<AccessoryLocationsEntity>()
                        .AsNoTracking()
                        .Where(x => warehouseIds.Contains(x.WarehouseId) && (!productId.HasValue || x.AccessoryId == productId.Value))
                        .Select(x => new { x.AccessoryId, x.WarehouseId, x.RackManagementId, x.ShelfNumber, x.BinNumber })
                        .ToListAsync()
                  )
                  .Select(x => (x.AccessoryId, x.WarehouseId, x.RackManagementId, x.ShelfNumber, x.BinNumber))
                  .ToList();

        if (places.Count == 0)
        {
            return result;
        }

        List<long> rackIds =
            places
                .Select(x => x.RackId)
                .Distinct()
                .ToList();

        var racks =
            await _context
                .Set<RackManagementEntity>()
                .AsNoTracking()
                .Where(x => rackIds.Contains(x.RackManagementId))
                .Select(x => new { x.RackManagementId, x.RackCode, x.RackName })
                .ToDictionaryAsync(x => x.RackManagementId);

        string Text((long ProductId, long WarehouseId, long RackId, int Shelf, int Bin) place) =>
            !racks.TryGetValue(place.RackId, out var rack)
                ? string.Empty
                : place.Shelf > 0
                    // The bin code A-03-05 (RackLabels)
                    ? AppCore.Infrastructure.Repositories.Settings.ProductSettings.RackLabels.BinCode(rack.RackName, place.Shelf, place.Bin)
                    : rack.RackCode ?? string.Empty;

        foreach (var group in places.GroupBy(x => x.ProductId))
        {
            List<string> texts =
                group
                    .Select(Text)
                    .Where(x => x.Length > 0)
                    .Distinct()
                    .ToList();

            result[group.Key] =
                texts.Count == 1
                    ? texts[0]
                    : texts.Count > 1
                        ? $"{texts.Count} places"
                        : string.Empty;
        }

        _placeCache =
            places
                .GroupBy(x => (x.ProductId, x.WarehouseId))
                .ToDictionary(g => g.Key, g => string.Join(", ", g.Select(Text).Where(x => x.Length > 0).Distinct()));

        return result;
    }


    // Last LocationsAsync places per (product, warehouse), copied
    // into the labels of the stock card
    private Dictionary<(long ProductId, long WarehouseId), string> _placeCache =
        new();


    //===========================================================
    // Edit Bike Numbers (Motor Bike Stock > Technical Records)
    //
    //   Edit Bike Numbers (CFG-MOD-012-0090)       bikes not sold
    //   ... After Sale     (CFG-MOD-012-0091)       sold bikes too
    //
    // Same rules as Purchases - MB / Receiving : Chassis and
    // Engine always required and unique; Key / Battery kept only
    // with Key & Battery Required, unique only with their switch.
    // A new number is also written on the bike's copies (product
    // transfers, barcode labels, service vehicles, memberships,
    // service enquiries).
    //===========================================================

    private async Task<bool>
        IsSwitchOnAsync
        (
            string code,
            bool fallback
        )
    {
        bool? value =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => x.ConfigurationCode == code && !x.IsDeleted)
                .Select(x => (bool?)x.IsEnabled)
                .FirstOrDefaultAsync();

        return value ?? fallback;
    }


    public async Task<InventoryBikeEditRulesDto>
        GetBikeEditRulesAsync()
    {
        bool edit =
            await IsSwitchOnAsync(SwitchEditNumbers, false);

        return new InventoryBikeEditRulesDto
        {
            EditOn = edit,
            EditSoldOn = edit && await IsSwitchOnAsync(SwitchEditSold, false),
            KeyBatteryOn = await IsSwitchOnAsync(SwitchKeyBattery, true)
        };
    }


    // Trimmed, capitals, 50 characters at most
    private static string BikeNo
    (
        string? value
    )
    {
        string text =
            (value ?? string.Empty).Trim().ToUpperInvariant();

        return text.Length <= 50
            ? text
            : text.Substring(0, 50);
    }


    private sealed class BikeNumbers
    {
        public string Chassis { get; init; } = string.Empty;

        public string Engine { get; init; } = string.Empty;

        public string Key { get; init; } = string.Empty;

        public string Battery { get; init; } = string.Empty;
    }


    // Key & Battery Required OFF : the bike keeps what it has
    private static BikeNumbers NumbersOf
    (
        InventoryBikeNumbersDto dto,
        MotorBikeUnitsEntity unit,
        bool keyBattery
    )
    {
        return new BikeNumbers
        {
            Chassis = BikeNo(dto.ChassisNo),
            Engine = BikeNo(dto.EngineNo),
            Key = keyBattery ? BikeNo(dto.KeyNo) : unit.KeyNo,
            Battery = keyBattery ? BikeNo(dto.BatteryNo) : unit.BatteryNo
        };
    }


    // Numbers other live bikes (or another sold bike's service
    // record) already carry
    private async Task<List<InventoryBikeNumberTakenDto>>
        TakenNumbersAsync
        (
            MotorBikeUnitsEntity unit,
            BikeNumbers numbers,
            bool keyBattery
        )
    {
        bool uniqueKey =
            keyBattery && await IsSwitchOnAsync(SwitchUniqueKeyNo, false);

        bool uniqueBattery =
            keyBattery && await IsSwitchOnAsync(SwitchUniqueBatteryNo, false);

        string chassis = numbers.Chassis;

        string engine = numbers.Engine;

        string key = uniqueKey ? numbers.Key : string.Empty;

        string battery = uniqueBattery ? numbers.Battery : string.Empty;

        long id = unit.MotorBikeUnitId;

        var rows =
            await _context
                .Set<MotorBikeUnitsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.MotorBikeUnitId != id
                        &&
                        (
                            (chassis != "" && x.ChassisNo.ToUpper() == chassis)
                            ||
                            (engine != "" && x.EngineNo.ToUpper() == engine)
                            ||
                            (key != "" && x.KeyNo.ToUpper() == key)
                            ||
                            (battery != "" && x.BatteryNo.ToUpper() == battery)
                        )
                )
                .Select(x => new { x.ChassisNo, x.EngineNo, x.KeyNo, x.BatteryNo, x.PurchaseNo, x.ProductId })
                .Take(20)
                .ToListAsync();

        List<InventoryBikeNumberTakenDto> result =
            new();

        void Add(string field, string label, string value, string? other, string purchaseNo)
        {
            if (value.Length == 0 || !string.Equals((other ?? string.Empty).Trim(), value, StringComparison.OrdinalIgnoreCase) || result.Any(x => x.Field == field))
            {
                return;
            }

            result.Add(
                new InventoryBikeNumberTakenDto
                {
                    Field = field,
                    Value = value,
                    Message =
                        purchaseNo.Length > 0
                            ? $"{label} {value} is already on purchase {purchaseNo}."
                            : $"{label} {value} is already on another bike (opening stock)."
                });
        }

        // Electric bikes : "Motor No"
        HashSet<long> electric =
            await AppCore.Infrastructure.Platform.Inventory.MotorBikePower.ElectricAsync(_context, rows.Select(x => x.ProductId));

        foreach (var row in rows)
        {
            Add("ChassisNo", "Chassis No", chassis, row.ChassisNo, row.PurchaseNo);
            Add("EngineNo", electric.Contains(row.ProductId) ? "Motor No" : "Engine No", engine, row.EngineNo, row.PurchaseNo);
            Add("KeyNo", "Key No", key, row.KeyNo, row.PurchaseNo);
            Add("BatteryNo", "Battery No", battery, row.BatteryNo, row.PurchaseNo);
        }

        // A sold bike's service record keeps its chassis (one live
        // row per chassis)
        string oldChassis =
            BikeNo(unit.ChassisNo);

        if (chassis.Length > 0 && chassis != oldChassis && result.All(x => x.Field != "ChassisNo"))
        {
            bool serviced =
                await _context
                    .Set<ServiceVehiclesEntity>()
                    .AsNoTracking()
                    .AnyAsync(x => !x.IsDeleted && x.ChassisNo.ToUpper() == chassis);

            if (serviced)
            {
                result.Add(
                    new InventoryBikeNumberTakenDto
                    {
                        Field = "ChassisNo",
                        Value = chassis,
                        Message = $"Chassis No {chassis} is already a service vehicle (a sold bike)."
                    });
            }
        }

        return result;
    }


    public async Task<List<InventoryBikeNumberTakenDto>>
        CheckBikeNumbersAsync
        (
            InventoryBikeNumbersDto dto
        )
    {
        MotorBikeUnitsEntity? unit =
            await _context
                .Set<MotorBikeUnitsEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.MotorBikeUnitId == dto.MotorBikeUnitId && !x.IsDeleted);

        if (unit == null)
        {
            return new List<InventoryBikeNumberTakenDto>();
        }

        bool keyBattery =
            await IsSwitchOnAsync(SwitchKeyBattery, true);

        return await TakenNumbersAsync(
            unit,
            NumbersOf(dto, unit, keyBattery),
            keyBattery);
    }


    public async Task
        UpdateBikeNumbersAsync
        (
            InventoryBikeNumbersDto dto,
            long userId
        )
    {
        InventoryBikeEditRulesDto rules =
            await GetBikeEditRulesAsync();

        if (!rules.EditOn)
        {
            throw new InvalidOperationException(
                "Editing bike numbers is switched off (System Configurations : Edit Bike Numbers).");
        }

        MotorBikeUnitsEntity unit =
            await _context
                .Set<MotorBikeUnitsEntity>()
                .FirstOrDefaultAsync(x => x.MotorBikeUnitId == dto.MotorBikeUnitId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("Bike not found.");

        if (unit.Status == UnitPending || unit.Status == UnitReturned)
        {
            throw new InvalidOperationException(
                $"A {unit.Status.ToLowerInvariant()} bike's numbers cannot be edited here.");
        }

        if (unit.Status == UnitSold && !rules.EditSoldOn)
        {
            throw new InvalidOperationException(
                "This bike is sold : switch on \"Edit Bike Numbers After Sale\" to edit it.");
        }

        BikeNumbers numbers =
            NumbersOf(dto, unit, rules.KeyBatteryOn);

        // Electric bikes : "Motor No"
        string noWord =
            await AppCore.Infrastructure.Platform.Inventory.MotorBikePower.WordAsync(_context, unit.ProductId);

        if (numbers.Chassis.Length == 0 || numbers.Engine.Length == 0)
        {
            throw new InvalidOperationException(
                $"Chassis No and {noWord} No are required.");
        }

        string oldChassis = unit.ChassisNo;

        string oldEngine = unit.EngineNo;

        string oldKey = unit.KeyNo;

        string oldBattery = unit.BatteryNo;

        List<BikeNumberChange> changes =
            new();

        void Change(string label, string before, string after)
        {
            if (!string.Equals(before.Trim(), after, StringComparison.Ordinal))
            {
                changes.Add(new BikeNumberChange(label, before.Trim(), after));
            }
        }

        Change("Chassis No", oldChassis, numbers.Chassis);
        Change($"{noWord} No", oldEngine, numbers.Engine);
        Change("Key No", oldKey, numbers.Key);
        Change("Battery No", oldBattery, numbers.Battery);

        if (changes.Count == 0)
        {
            return;
        }

        List<InventoryBikeNumberTakenDto> taken =
            await TakenNumbersAsync(unit, numbers, rules.KeyBatteryOn);

        if (taken.Count > 0)
        {
            throw new InvalidOperationException(
                taken[0].Message);
        }

        DateTime now =
            DateTime.UtcNow;

        unit.ChassisNo = numbers.Chassis;
        unit.EngineNo = numbers.Engine;
        unit.KeyNo = numbers.Key;
        unit.BatteryNo = numbers.Battery;
        unit.ModifiedBy = userId;
        unit.ModifiedDate = now;

        // Copies that point at this bike
        long id = unit.MotorBikeUnitId;

        List<ProductTransferUnitsEntity> transfers =
            await _context
                .Set<ProductTransferUnitsEntity>()
                .Where(x => x.MotorBikeUnitId == id)
                .ToListAsync();

        foreach (ProductTransferUnitsEntity row in transfers)
        {
            row.ChassisNo = numbers.Chassis;
            row.EngineNo = numbers.Engine;
        }

        List<BarcodePrintRunLinesEntity> labelLines =
            await _context
                .Set<BarcodePrintRunLinesEntity>()
                .Where(x => x.MotorBikeUnitId == id)
                .ToListAsync();

        foreach (BarcodePrintRunLinesEntity row in labelLines)
        {
            row.ChassisNo = numbers.Chassis;
        }

        // Copies found by the old chassis (after the sale)
        int vehicles = 0;

        int memberships = 0;

        int enquiries = 0;

        string before =
            BikeNo(oldChassis);

        bool chassisOrEngine =
            before != numbers.Chassis
            ||
            BikeNo(oldEngine) != numbers.Engine;

        if (before.Length > 0 && chassisOrEngine)
        {
            List<ServiceVehiclesEntity> vehicleRows =
                await _context
                    .Set<ServiceVehiclesEntity>()
                    .Where(x => x.ChassisNo.ToUpper() == before)
                    .ToListAsync();

            foreach (ServiceVehiclesEntity row in vehicleRows)
            {
                row.ChassisNo = numbers.Chassis;
                row.EngineNo = numbers.Engine;
            }

            List<MembershipStatusEntity> membershipRows =
                await _context
                    .Set<MembershipStatusEntity>()
                    .Where(x => x.ChassisNo.ToUpper() == before)
                    .ToListAsync();

            foreach (MembershipStatusEntity row in membershipRows)
            {
                row.ChassisNo = numbers.Chassis;
                row.EngineNo = numbers.Engine;
            }

            List<ServiceEnquiriesEntity> enquiryRows =
                await _context
                    .Set<ServiceEnquiriesEntity>()
                    .Where(x => x.ChassisNo.ToUpper() == before)
                    .ToListAsync();

            foreach (ServiceEnquiriesEntity row in enquiryRows)
            {
                row.ChassisNo = numbers.Chassis;
            }

            vehicles = vehicleRows.Count;

            memberships = membershipRows.Count;

            enquiries = enquiryRows.Count;
        }

        List<string> copies =
            new();

        if (transfers.Count > 0) copies.Add($"{transfers.Count} product transfer line(s)");
        if (labelLines.Count > 0) copies.Add($"{labelLines.Count} barcode label line(s)");
        if (vehicles > 0) copies.Add($"{vehicles} service vehicle(s)");
        if (memberships > 0) copies.Add($"{memberships} membership(s)");
        if (enquiries > 0) copies.Add($"{enquiries} service enquiry(ies)");

        _context.Set<ActivityHistoryEntity>().Add(
            new ActivityHistoryEntity
            {
                Module = "Inventory Management",
                EntityName = "MotorBikeUnits",
                EntityId = id,
                ActivityType = "Update",
                ActivityTitle = BikeHistoryTitle(changes),
                ActivityDescription =
                    BikeHistoryText(
                        changes,
                        unit.ProductName,
                        unit.PurchaseNo.Length > 0 ? unit.PurchaseNo : "opening stock",
                        unit.Status == UnitSold,
                        copies.Count > 0 ? string.Join(", ", copies) : string.Empty),
                PerformedBy = userId,
                PerformedByName = await UserNameAsync(userId),
                PerformedDate = now
            });

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Technical Record History : one card per edit
    //
    //   Title       : "Engine No Changed" / "Chassis No & Engine
    //                 No Changed"
    //   Description : one line per number "Engine No : A -> B",
    //                 then the bike (model | purchase | sold) and
    //                 the copies also updated. ASCII only (the
    //                 page shows -> as an arrow).
    //===========================================================

    private sealed record BikeNumberChange
    (
        string Label,
        string Before,
        string After
    );


    private static string BikeHistoryTitle
    (
        List<BikeNumberChange> changes
    )
    {
        return changes.Count == 0
            ? "Bike Numbers Changed"
            : $"{string.Join(" & ", changes.Select(x => x.Label))} Changed";
    }


    // "Motor Bikes - REVOO - A04 - Black" -> "REVOO - A04 - Black"
    private static string ModelText
    (
        string name
    )
    {
        return System.Text.RegularExpressions.Regex.Replace(
            name ?? string.Empty,
            @"^\s*motor\s*bikes?\s*-\s*",
            string.Empty,
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);
    }


    private static string BikeHistoryText
    (
        List<BikeNumberChange> changes,
        string productName,
        string document,
        bool sold,
        string copies
    )
    {
        List<string> lines =
            changes
                .Select(x => $"{x.Label} : {(x.Before.Length > 0 ? x.Before : "(empty)")} -> {(x.After.Length > 0 ? x.After : "(empty)")}")
                .ToList();

        lines.Add(
            string.Join(
                " | ",
                new[] { ModelText(productName), document, sold ? "sold" : string.Empty }
                    .Where(x => !string.IsNullOrWhiteSpace(x))));

        if (copies.Length > 0)
        {
            lines.Add($"Also updated : {copies}");
        }

        return string.Join("\n", lines);
    }


    // Rows written before 07-11 : "<product> (<purchase>[, sold])
    // : Engine No A -> B; Key No C -> D.[ Also updated : ....]"
    private static readonly System.Text.RegularExpressions.Regex OldBikeHistory =
        new(@"^(?<name>.*?) \((?<doc>[^()]*?)(?<sold>, sold)?\) : (?<changes>.*?)\.(?: Also updated : (?<also>.*?)\.)?$");

    private static readonly System.Text.RegularExpressions.Regex OldBikeChange =
        new(@"^(?<label>Chassis No|Engine No|Motor No|Key No|Battery No) (?<before>.*?) -> (?<after>.*)$");


    private static (string Title, string Text)? ReadOldBikeHistory
    (
        string description
    )
    {
        var match =
            OldBikeHistory.Match(description ?? string.Empty);

        if (!match.Success)
        {
            return null;
        }

        List<BikeNumberChange> changes =
            new();

        foreach (string part in match.Groups["changes"].Value.Split("; "))
        {
            var change =
                OldBikeChange.Match(part.Trim());

            if (!change.Success)
            {
                return null;
            }

            string before = change.Groups["before"].Value;
            string after = change.Groups["after"].Value;

            changes.Add(
                new BikeNumberChange(
                    change.Groups["label"].Value,
                    before == "(empty)" ? string.Empty : before,
                    after == "(empty)" ? string.Empty : after));
        }

        return (
            BikeHistoryTitle(changes),
            BikeHistoryText(
                changes,
                match.Groups["name"].Value,
                match.Groups["doc"].Value,
                match.Groups["sold"].Success,
                match.Groups["also"].Success ? match.Groups["also"].Value : string.Empty));
    }


    // The user's name for the history (else "System")
    private async Task<string> UserNameAsync
    (
        long userId
    )
    {
        var user =
            await _context
                .Set<UserProfileEntity>()
                .AsNoTracking()
                .Where(x => x.UserProfileId == userId)
                .Select(x => new { x.FullName, x.DisplayName, x.UserName })
                .FirstOrDefaultAsync();

        return
            !string.IsNullOrWhiteSpace(user?.FullName) ? user!.FullName
            : !string.IsNullOrWhiteSpace(user?.DisplayName) ? user!.DisplayName
            : !string.IsNullOrWhiteSpace(user?.UserName) ? user!.UserName
            : "System";
    }


    // Bike number edits, newest first (the last 300)
    public async Task<List<InventoryBikeHistoryDto>>
        GetBikeHistoryAsync()
    {
        var rows =
            await _context
                .Set<ActivityHistoryEntity>()
                .AsNoTracking()
                .Where(x => x.Module == "Inventory Management" && x.EntityName == "MotorBikeUnits")
                .OrderByDescending(x => x.PerformedDate)
                .Take(300)
                .Select(x => new { x.ActivityType, x.ActivityTitle, x.ActivityDescription, x.PerformedBy, x.PerformedByName, x.PerformedDate })
                .ToListAsync();

        // Rows written as "System" before names were kept
        List<long> userIds =
            rows
                .Where(x => x.PerformedBy > 0 && (string.IsNullOrWhiteSpace(x.PerformedByName) || x.PerformedByName == "System"))
                .Select(x => x.PerformedBy)
                .Distinct()
                .ToList();

        Dictionary<long, string> names =
            new();

        foreach (long id in userIds)
        {
            names[id] = await UserNameAsync(id);
        }

        return rows
            .Select(x =>
            {
                // Older rows : the same specific card
                var old =
                    x.ActivityTitle == "Bike Numbers Edited"
                        ? ReadOldBikeHistory(x.ActivityDescription ?? string.Empty)
                        : null;

                return new { Row = x, Old = old };
            })
            .Select(y => new { x = y.Row, y.Old })
            .Select(z => new InventoryBikeHistoryDto
            {
                ActivityType = z.x.ActivityType ?? string.Empty,
                ActivityTitle = z.Old?.Title ?? z.x.ActivityTitle ?? string.Empty,
                ActivityDescription = z.Old?.Text ?? z.x.ActivityDescription ?? string.Empty,
                PerformedByName =
                    names.TryGetValue(z.x.PerformedBy, out string? name)
                        ? name
                        : (string.IsNullOrWhiteSpace(z.x.PerformedByName) ? "System" : z.x.PerformedByName),
                PerformedDate = z.x.PerformedDate
            })
            .ToList();
    }
}
