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

    private const string UnitPending = "Pending";

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
            bool canViewCost
        )
    {
        string page =
            PageOf(pageType);

        InventoryStockListDto result =
            new()
            {
                PageType = page,
                CanViewCost = canViewCost,
                BranchId = Math.Max(0, branchId),
                WarehouseId = Math.Max(0, warehouseId),
                AsOf = DateText(Today())
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

        List<Holding> holdings =
            await HoldingsAsync(page, null, result.BranchId, result.WarehouseId);

        Dictionary<long, decimal> costs =
            await BatchCostsAsync(holdings);

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
                        RowOf(
                            product,
                            byProduct[product.ProductId],
                            costs,
                            labels,
                            locations,
                            canViewCost)
                )
                .OrderBy(x => x.ProductCode)
                .ToList();

        return result;
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
                            UnitCost = canViewCost ? Cost(batch.UnitCost) : 0m,
                            InTransit = inTransit,
                            OnHand = onHand,
                            Value = canViewCost ? Money((inTransit + onHand) * batch.UnitCost) : 0m,
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

        foreach (StockMovementsEntity move in rows)
        {
            balance += move.QuantityIn - move.QuantityOut;

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
                    UnitCost = canViewCost ? Cost(move.UnitCost) : 0m,
                    Value = canViewCost ? Money(move.Value) : 0m,
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
                    .Select(x => new { x.SourceLineId, x.SourceId, x.QuantityInTransit, x.QuantityOnHand })
                    .ToListAsync()
            )
            .GroupBy(x => (x.SourceId, x.SourceLineId))
            .ToDictionary(g => g.Key, g => g.First());

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
                        UnitCost = canViewCost ? Money(unit.UnitCost) : 0m
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
            long warehouseId
        )
    {
        return
            await MovementsQuery(page, productId, branchId, warehouseId)
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

        return
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.StockBatchId))
                .ToDictionaryAsync(x => x.StockBatchId, x => x.UnitCost);
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
            bool canViewCost
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
                                IsActive = x.IsActive
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
                                IsActive = x.IsActive
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

        // (product, warehouse) → "R-01 · Shelf 3"
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
    // filter (one place = "R-01 · Shelf 3"; more = "3 places").
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

        List<(long ProductId, long WarehouseId, long RackId, int Shelf)> places =
            page == PageSpareParts
                ? (
                    await _context
                        .Set<SparePartLocationsEntity>()
                        .AsNoTracking()
                        .Where(x => warehouseIds.Contains(x.WarehouseId) && (!productId.HasValue || x.SparePartId == productId.Value))
                        .Select(x => new { x.SparePartId, x.WarehouseId, x.RackManagementId, x.ShelfNumber })
                        .ToListAsync()
                  )
                  .Select(x => (x.SparePartId, x.WarehouseId, x.RackManagementId, x.ShelfNumber))
                  .ToList()
                : (
                    await _context
                        .Set<AccessoryLocationsEntity>()
                        .AsNoTracking()
                        .Where(x => warehouseIds.Contains(x.WarehouseId) && (!productId.HasValue || x.AccessoryId == productId.Value))
                        .Select(x => new { x.AccessoryId, x.WarehouseId, x.RackManagementId, x.ShelfNumber })
                        .ToListAsync()
                  )
                  .Select(x => (x.AccessoryId, x.WarehouseId, x.RackManagementId, x.ShelfNumber))
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

        Dictionary<long, string> racks =
            await _context
                .Set<RackManagementEntity>()
                .AsNoTracking()
                .Where(x => rackIds.Contains(x.RackManagementId))
                .ToDictionaryAsync(x => x.RackManagementId, x => x.RackCode ?? string.Empty);

        string Text((long ProductId, long WarehouseId, long RackId, int Shelf) place) =>
            place.Shelf > 0
                ? $"{racks.GetValueOrDefault(place.RackId, "Rack")} · Shelf {place.Shelf}"
                : racks.GetValueOrDefault(place.RackId, string.Empty);

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
}
