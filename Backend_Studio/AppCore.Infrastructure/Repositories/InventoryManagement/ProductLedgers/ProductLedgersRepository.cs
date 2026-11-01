//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using System.Text.RegularExpressions;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.InventoryManagement.ProductLedgers;
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

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using WarehousesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Warehouses;

using SupplierProfilesEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.SupplierProfiles;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InventoryManagement.ProductLedgers;


//===============================================================
// Product Ledgers repository (read only)
//
// Read from StockMovements (one row per batch movement, at the
// batch's own cost). A document's movements of the product are
// netted into one ledger row, with In Transit in its own column :
//   purchase      In Transit + (not received yet), or In when the
//                 purchase also receives (On Hand)
//   receiving     In Transit - and In (On Hand, the warehouse)
//   cancel        Out / In Transit - (reversal)
// Balance / Opening / Closing = stock = In Transit + On Hand.
// In / Out = into / out of the warehouses (On Hand); In Transit
// is its own running column. The warehouse filter applies to On
// Hand only; In Transit stays with its branch.
//
// Cancelled purchases (batch status Cancelled) are left out
// with their cancel rows unless "show cancelled" is on.
//
// Values : what goes out is valued at the cost of the batch it
// came from (oldest batch first : FIFO), so the balance value
// is the value of the batches still held.
//===============================================================

public class ProductLedgersRepository
    : IProductLedgersRepository
{
    private readonly AppDbContext _context;


    //===========================================================
    // Constants
    //===========================================================

    private const string PageMotorBikes = "MB";

    private const string PageSpareParts = "SP";

    private const string PageAccessories = "AC";

    private const string BucketOnHand = "OnHand";

    private const string BatchCancelled = "Cancelled";

    private const string MovePurchase = "Purchase";

    private const string MovePurchaseCancel = "PurchaseCancel";

    // Product Receiving : In Transit → warehouse, and its cancel
    private const string MoveReceive = "Receive";

    private const string MoveReceiveCancel = "ReceiveCancel";

    private const string KindMotorBikes = "Motor Bikes";

    private const string KindSpareParts = "Spare Parts";

    private const string KindLubricants = "Lubricants";

    private const string KindAccessories = "Accessories";

    private const string UnitPending = "Pending";

    private const string DateFormat = "yyyy-MM-dd";

    // Rows listed on a statement (totals cover the whole period)
    private const int MaxRows = 3000;


    public ProductLedgersRepository(
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

        public bool IsActive { get; set; }

        public string Name =>
            string.IsNullOrWhiteSpace(PartNumber)
                ? ItemName
                : $"{PartNumber} - {ItemName}";
    }


    // One document's movements of one product (summary)
    private sealed class DocumentSums
    {
        public long ProductId { get; set; }

        public decimal In { get; set; }

        public decimal Out { get; set; }

        public decimal InValue { get; set; }

        public decimal OutValue { get; set; }

        // In Transit change (in - out) of the document, and its value
        public decimal Transit { get; set; }

        public decimal TransitValue { get; set; }
    }


    //===========================================================
    // Helpers
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
                $"Unknown ledger page '{pageType}'.");
    }


    // Today in Bangladesh (UTC+6)
    private static DateOnly Today() =>
        DateOnly.FromDateTime(DateTime.UtcNow.AddHours(6));


    private static string DateText(DateOnly date) =>
        date.ToString(DateFormat, CultureInfo.InvariantCulture);


    // yyyy-MM-dd; empty = this month (from the 1st / to the end)
    private static (DateOnly From, DateOnly To) Period
    (
        string? from,
        string? to
    )
    {
        DateOnly today =
            Today();

        DateOnly start =
            DateOnly.TryParseExact((from ?? string.Empty).Trim(), DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly f)
                ? f
                : new DateOnly(today.Year, today.Month, 1);

        DateOnly end =
            DateOnly.TryParseExact((to ?? string.Empty).Trim(), DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly t)
                ? t
                : new DateOnly(today.Year, today.Month, 1).AddMonths(1).AddDays(-1);

        if (end < start)
        {
            throw new InvalidOperationException(
                "The To date is before the From date.");
        }

        return (start, end);
    }


    private static decimal Money(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);


    private static decimal Cost(decimal value) =>
        Math.Round(value, 4, MidpointRounding.AwayFromZero);


    private static string Qty(decimal value) =>
        value.ToString("0.##", CultureInfo.InvariantCulture);


    // "PurchaseReturn" → "Purchase Return"
    private static string Words(string value) =>
        Regex.Replace(value ?? string.Empty, "(?<=[a-z])(?=[A-Z])", " ").Trim();


    //===========================================================
    // Movements of the page type with the filters
    //===========================================================

    private IQueryable<StockMovementsEntity>
        MovementsQuery
        (
            string page,
            long? productId,
            long branchId,
            long warehouseId,
            bool showCancelled
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

        // Cancelled purchases : their movements net to nothing;
        // left out unless asked for
        if (!showCancelled)
        {
            IQueryable<long> cancelled =
                _context
                    .Set<StockBatchesEntity>()
                    .AsNoTracking()
                    .Where(b => b.ProductType == page && b.Status == BatchCancelled)
                    .Select(b => b.StockBatchId);

            query = query.Where(x => !cancelled.Contains(x.StockBatchId));
        }

        return query;
    }


    //===========================================================
    // Filter lists
    //===========================================================

    public async Task<ProductLedgerFiltersDto>
        GetFiltersAsync
        (
            string pageType,
            bool canViewCost
        )
    {
        string page =
            PageOf(pageType);

        ProductLedgerFiltersDto result =
            new()
            {
                PageType = page,
                CanViewCost = canViewCost
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
                        new ProductLedgerOptionDto
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
                        new ProductLedgerWarehouseDto
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

        // Categories / sub categories of the page's products
        HashSet<long> categoryIds =
            products.Select(x => x.CategoryId).ToHashSet();

        HashSet<long> subCategoryIds =
            products.Select(x => x.SubCategoryId).ToHashSet();

        Dictionary<long, string> kinds =
            products
                .GroupBy(x => x.CategoryId)
                .ToDictionary(g => g.Key, g => g.First().Kind);

        result.Categories =
            (
                await _context
                    .Set<ProductCategoryEntity>()
                    .AsNoTracking()
                    .Where(x => categoryIds.Contains(x.ProductCategoryId))
                    .Select(x => new { x.ProductCategoryId, x.CategoryName })
                    .ToListAsync()
            )
            .Select
            (
                x =>
                    new ProductLedgerCategoryDto
                    {
                        Id = x.ProductCategoryId,
                        Name = x.CategoryName ?? string.Empty,
                        Kind = kinds.GetValueOrDefault(x.ProductCategoryId, string.Empty)
                    }
            )
            .OrderBy(x => x.Name)
            .ToList();

        result.SubCategories =
            (
                await _context
                    .Set<ProductSubCategoryEntity>()
                    .AsNoTracking()
                    .Where(x => subCategoryIds.Contains(x.ProductSubCategoryId))
                    .Select(x => new { x.ProductSubCategoryId, x.SubCategoryName })
                    .ToListAsync()
            )
            .Select
            (
                x =>
                    new ProductLedgerSubCategoryDto
                    {
                        Id = x.ProductSubCategoryId,
                        // A sub category belongs to the category of its products
                        CategoryId =
                            products
                                .Where(p => p.SubCategoryId == x.ProductSubCategoryId)
                                .Select(p => p.CategoryId)
                                .FirstOrDefault(),
                        Name = x.SubCategoryName ?? string.Empty
                    }
            )
            .OrderBy(x => x.Name)
            .ToList();

        result.Products =
            products
                .Select
                (
                    x =>
                        new ProductLedgerProductDto
                        {
                            Id = x.ProductId,
                            Code = x.ProductCode,
                            Name = x.Name,
                            Unit = x.Unit,
                            Kind = x.Kind,
                            CategoryId = x.CategoryId,
                            SubCategoryId = x.SubCategoryId,
                            IsActive = x.IsActive
                        }
                )
                .OrderBy(x => x.Code)
                .ToList();

        return result;
    }


    //===========================================================
    // Statement of one product
    //===========================================================

    public async Task<ProductLedgerStatementDto?>
        GetStatementAsync
        (
            string pageType,
            long productId,
            string? from,
            string? to,
            long branchId,
            long warehouseId,
            bool showCancelled,
            bool withBikes,
            bool canViewCost
        )
    {
        string page =
            PageOf(pageType);

        (DateOnly start, DateOnly end) =
            Period(from, to);

        branchId = Math.Max(0, branchId);

        warehouseId = Math.Max(0, warehouseId);

        ProductInfo? product =
            (await ProductsAsync(page, productId)).FirstOrDefault();

        if (product == null)
        {
            return null;
        }

        Labels labels =
            await LabelsAsync();

        labels.Categories.TryGetValue(product.CategoryId, out (string Name, long? BrandId) category);

        ProductLedgerStatementDto result =
            new()
            {
                PageType = page,
                CanViewCost = canViewCost,
                ProductId = product.ProductId,
                ProductCode = product.ProductCode,
                ProductName = product.Name,
                Unit = product.Unit,
                Kind = product.Kind,
                CategoryName = category.Name ?? string.Empty,
                SubCategoryName = labels.SubCategories.GetValueOrDefault(product.SubCategoryId, string.Empty),
                BrandName =
                    category.BrandId.HasValue
                        ? labels.Brands.GetValueOrDefault(category.BrandId.Value, string.Empty)
                        : string.Empty,
                ColorName = labels.Colors.GetValueOrDefault(product.ColorId, string.Empty),
                From = DateText(start),
                To = DateText(end),
                BranchId = branchId,
                BranchName = branchId > 0 ? labels.Branches.GetValueOrDefault(branchId, string.Empty) : "All Branches",
                WarehouseId = warehouseId,
                WarehouseName = warehouseId > 0 ? labels.Warehouses.GetValueOrDefault(warehouseId, string.Empty) : string.Empty,
                ShowCancelled = showCancelled
            };

        IQueryable<StockMovementsEntity> moves =
            MovementsQuery(page, productId, branchId, warehouseId, showCancelled);

        //=======================================================
        // Opening : everything before the period
        //=======================================================

        // Stock = In Transit + On Hand; In Transit also apart
        decimal openingQty =
            await moves
                .Where(x => x.DocumentDate < start)
                .SumAsync(x => (decimal?)(x.QuantityIn - x.QuantityOut))
            ??
            0m;

        decimal openingValue =
            await moves
                .Where(x => x.DocumentDate < start)
                .SumAsync(x => (decimal?)(x.QuantityIn > 0 ? x.Value : -x.Value))
            ??
            0m;

        decimal openingTransit =
            await moves
                .Where(x => x.DocumentDate < start && x.Bucket != BucketOnHand)
                .SumAsync(x => (decimal?)(x.QuantityIn - x.QuantityOut))
            ??
            0m;

        //=======================================================
        // The period's movements, one row per document
        //=======================================================

        List<StockMovementsEntity> list =
            await moves
                .Where(x => x.DocumentDate >= start && x.DocumentDate <= end)
                .OrderBy(x => x.DocumentDate)
                .ThenBy(x => x.StockMovementId)
                .ToListAsync();

        List<long> batchIds =
            list
                .Select(x => x.StockBatchId)
                .Distinct()
                .ToList();

        var batches =
            (
                await _context
                    .Set<StockBatchesEntity>()
                    .AsNoTracking()
                    .Where(x => batchIds.Contains(x.StockBatchId))
                    .Select(x => new { x.StockBatchId, x.BatchNo, x.SupplierCode, x.Status })
                    .ToListAsync()
            )
            .ToDictionary(x => x.StockBatchId);

        List<string> supplierCodes =
            batches.Values
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

        var documents =
            list
                .GroupBy
                (
                    x =>
                        new
                        {
                            x.DocumentType,
                            x.DocumentId,
                            x.DocumentNo,
                            x.MovementType,
                            x.IsReversal,
                            x.DocumentDate
                        }
                )
                .OrderBy(g => g.Key.DocumentDate)
                .ThenBy(g => g.Min(x => x.StockMovementId))
                .ToList();

        // MB : the bikes of each purchase (posted, not draft)
        Dictionary<long, List<ProductLedgerBikeDto>> bikes =
            new();

        if (page == PageMotorBikes && withBikes)
        {
            List<long> purchaseIds =
                documents
                    .Where(g => g.Key.MovementType is MovePurchase or MovePurchaseCancel)
                    .Select(g => g.Key.DocumentId)
                    .Distinct()
                    .ToList();

            bikes =
                (
                    await _context
                        .Set<MotorBikeUnitsEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                x.Status != UnitPending
                                &&
                                x.ProductId == productId
                                &&
                                purchaseIds.Contains(x.PurchaseId)
                        )
                        .OrderBy(x => x.ChassisNo)
                        .Select(x => new { x.PurchaseId, x.ChassisNo, x.EngineNo })
                        .ToListAsync()
                )
                .GroupBy(x => x.PurchaseId)
                .ToDictionary
                (
                    g => g.Key,
                    g =>
                        g.Select
                        (
                            x =>
                                new ProductLedgerBikeDto
                                {
                                    ChassisNo = x.ChassisNo ?? string.Empty,
                                    EngineNo = x.EngineNo ?? string.Empty
                                }
                        )
                        .ToList()
                );
        }

        decimal balanceQty =
            openingQty;

        decimal balanceValue =
            openingValue;

        decimal transitBalance =
            openingTransit;

        decimal inQty = 0m, outQty = 0m, inValue = 0m, outValue = 0m;

        foreach (var document in documents)
        {
            List<StockMovementsEntity> of =
                document.ToList();

            // On Hand part : In / Out / Balance
            List<StockMovementsEntity> hand =
                of.Where(x => x.Bucket == BucketOnHand).ToList();

            decimal qtyIn =
                hand.Sum(x => x.QuantityIn);

            decimal qtyOut =
                hand.Sum(x => x.QuantityOut);

            decimal valIn =
                hand.Where(x => x.QuantityIn > 0).Sum(x => x.Value);

            decimal valOut =
                hand.Where(x => x.QuantityOut > 0).Sum(x => x.Value);

            decimal net =
                qtyIn - qtyOut;

            decimal netValue =
                valIn - valOut;

            // In Transit part : its own column
            List<StockMovementsEntity> road =
                of.Where(x => x.Bucket != BucketOnHand).ToList();

            decimal transit =
                road.Sum(x => x.QuantityIn - x.QuantityOut);

            decimal transitValue =
                road.Sum(x => x.QuantityIn > 0 ? x.Value : -x.Value);

            transitBalance += transit;

            // Between two warehouses of the branch : nets to nothing
            bool transfer =
                qtyIn > 0 && qtyOut > 0 && net == 0;

            decimal rowIn =
                net > 0 ? net : 0m;

            decimal rowOut =
                net < 0 ? -net : 0m;

            decimal rowInValue =
                netValue > 0 ? netValue : 0m;

            decimal rowOutValue =
                netValue < 0 ? -netValue : 0m;

            // Stock : both parts (a receiving moves it, no change)
            balanceQty += net + transit;

            balanceValue += netValue + transitValue;

            inQty += rowIn;

            outQty += rowOut;

            inValue += rowInValue;

            outValue += rowOutValue;

            if (result.Rows.Count >= MaxRows)
            {
                result.Truncated = true;

                continue;
            }

            List<long> rowBatchIds =
                of.Select(x => x.StockBatchId).Distinct().ToList();

            string party =
                rowBatchIds
                    .Select(id => batches.TryGetValue(id, out var b) ? b.SupplierCode : string.Empty)
                    .Where(code => !string.IsNullOrWhiteSpace(code))
                    .Select(code => suppliers.GetValueOrDefault(code, code))
                    .FirstOrDefault()
                ??
                string.Empty;

            bool cancelled =
                !document.Key.IsReversal
                &&
                rowBatchIds.Any(id => batches.TryGetValue(id, out var b) && b.Status == BatchCancelled);

            string type =
                document.Key.MovementType;

            string particulars =
                type == MovePurchase
                    ? "Purchase"
                    : type == MovePurchaseCancel
                        ? "Purchase Cancelled"
                        : type == MoveReceive
                            ? "Received Into Store"
                            : type == MoveReceiveCancel
                                ? "Receiving Cancelled"
                                : type == "Opening"
                                    ? "Opening Stock"
                                    : type == "OpeningCancel"
                                        ? "Opening Stock Cancelled"
                                        : transfer
                                            ? "Moved Between Warehouses"
                                            : Words(type);

            if (party.Length > 0 && (type == MovePurchase || type == MovePurchaseCancel))
            {
                particulars += $" – {party}";
            }

            // Where the stock was / went
            string location =
                string.Join
                (
                    ", ",
                    of
                        .Select
                        (
                            x =>
                            {
                                string branch =
                                    labels.Branches.GetValueOrDefault(x.BranchId, string.Empty);

                                string place =
                                    x.Bucket == BucketOnHand && x.WarehouseId.HasValue
                                        ? labels.Warehouses.GetValueOrDefault(x.WarehouseId.Value, string.Empty)
                                        : "In Transit";

                                return branch.Length > 0 ? $"{branch} · {place}" : place;
                            }
                        )
                        .Distinct()
                );

            decimal shownQty =
                rowIn > 0 ? rowIn : rowOut;

            decimal shownValue =
                rowIn > 0 ? rowInValue : rowOutValue;

            result.Rows.Add(
                new ProductLedgerRowDto
                {
                    Date = DateText(document.Key.DocumentDate),
                    MovementType = type,
                    DocumentType = document.Key.DocumentType,
                    DocumentNo = document.Key.DocumentNo,
                    Particulars = particulars,
                    PartyName = party,
                    Batches =
                        string.Join
                        (
                            ", ",
                            rowBatchIds
                                .Select(id => batches.TryGetValue(id, out var b) ? b.BatchNo : string.Empty)
                                .Where(x => x.Length > 0)
                        ),
                    Location = location,
                    IsReversal = document.Key.IsReversal,
                    IsCancelled = cancelled,
                    IsTransfer = transfer,
                    InQty = rowIn,
                    OutQty = rowOut,
                    BalanceQty = balanceQty,
                    TransitQty = transit,
                    TransitBalance = transitBalance,
                    UnitCost = canViewCost && shownQty > 0 ? Cost(shownValue / shownQty) : 0m,
                    InValue = canViewCost ? Money(rowInValue) : 0m,
                    OutValue = canViewCost ? Money(rowOutValue) : 0m,
                    BalanceValue = canViewCost ? Money(balanceValue) : 0m,
                    ShortNote = ShortNote(type, of, transit, rowIn > 0 ? rowIn : rowOut, product.Unit),
                    Bikes =
                        (type == MovePurchase || type == MovePurchaseCancel)
                        && bikes.TryGetValue(document.Key.DocumentId, out List<ProductLedgerBikeDto>? units)
                            ? units
                            : new List<ProductLedgerBikeDto>()
                });
        }

        result.OpeningQty = openingQty;

        result.InQty = inQty;

        result.OutQty = outQty;

        result.ClosingQty = balanceQty;

        result.OpeningTransit = openingTransit;

        result.ClosingTransit = transitBalance;

        if (canViewCost)
        {
            result.OpeningValue = Money(openingValue);

            result.InValue = Money(inValue);

            result.OutValue = Money(outValue);

            result.ClosingValue = Money(balanceValue);
        }

        return result;
    }


    //===========================================================
    // Short notes : what the row adds, not what it repeats
    //   Purchase  "Purchase - 10 Pcs · Inv 4521"
    //   Cancel    "Reason : <reason>"
    //   Transfer  "200 Pcs In Transit → store"
    //   others    the movement's own note
    //===========================================================

    private static readonly Regex InvoiceNote =
        new(@",\s*invoice\s+(?<no>.+)$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static string ShortNote
    (
        string type,
        List<StockMovementsEntity> moves,
        decimal transit,
        decimal quantity,
        string unit
    )
    {
        string narration =
            moves
                .Select(x => (x.Narration ?? string.Empty).Trim())
                .FirstOrDefault(x => x.Length > 0)
            ??
            string.Empty;

        string qty =
            $"{Qty(quantity)}{(unit.Length > 0 ? " " + unit : string.Empty)}";

        if (type == MovePurchase)
        {
            Match invoice =
                InvoiceNote.Match(narration);

            // In Transit purchase : its quantity is in the In Transit
            // column, not In
            string bought =
                quantity > 0
                    ? qty
                    : $"{Qty(transit)}{(unit.Length > 0 ? " " + unit : string.Empty)} in transit";

            return invoice.Success
                ? $"Purchase - {bought} · Inv {invoice.Groups["no"].Value.Trim()}"
                : $"Purchase - {bought}";
        }

        if (type == MovePurchaseCancel)
        {
            string reason =
                Regex.Replace(narration, @"^\s*Cancelled\s*:\s*", string.Empty, RegexOptions.IgnoreCase).Trim();

            return reason.Length > 0
                ? $"Reason : {reason}"
                : string.Empty;
        }

        if (type == MoveReceive)
        {
            return $"{qty} In Transit → store";
        }

        if (type == MoveReceiveCancel)
        {
            return $"{qty} store → In Transit";
        }

        return narration;
    }


    //===========================================================
    // Summary : one row per product
    //===========================================================

    public async Task<ProductLedgerSummaryDto>
        GetSummaryAsync
        (
            string pageType,
            string? kind,
            long categoryId,
            long subCategoryId,
            string? from,
            string? to,
            long branchId,
            long warehouseId,
            bool showCancelled,
            bool canViewCost
        )
    {
        string page =
            PageOf(pageType);

        (DateOnly start, DateOnly end) =
            Period(from, to);

        branchId = Math.Max(0, branchId);

        warehouseId = Math.Max(0, warehouseId);

        categoryId = Math.Max(0, categoryId);

        subCategoryId = Math.Max(0, subCategoryId);

        string kindText =
            page == PageSpareParts
                ? (kind ?? string.Empty).Trim()
                : string.Empty;

        Labels labels =
            await LabelsAsync();

        List<ProductInfo> products =
            (await ProductsAsync(page, null))
                .Where
                (
                    x =>
                        (kindText.Length == 0 || string.Equals(x.Kind, kindText, StringComparison.OrdinalIgnoreCase))
                        &&
                        (categoryId == 0 || x.CategoryId == categoryId)
                        &&
                        (subCategoryId == 0 || x.SubCategoryId == subCategoryId)
                )
                .ToList();

        bool scoped =
            kindText.Length > 0 || categoryId > 0 || subCategoryId > 0;

        List<long> productIds =
            products.Select(x => x.ProductId).ToList();

        List<string> path =
            new();

        if (kindText.Length > 0)
        {
            path.Add(kindText);
        }

        if (categoryId > 0)
        {
            path.Add(labels.Categories.TryGetValue(categoryId, out (string Name, long? BrandId) c) ? c.Name : string.Empty);
        }

        if (subCategoryId > 0)
        {
            path.Add(labels.SubCategories.GetValueOrDefault(subCategoryId, string.Empty));
        }

        ProductLedgerSummaryDto result =
            new()
            {
                PageType = page,
                CanViewCost = canViewCost,
                ScopePath =
                    path.Any(x => x.Length > 0)
                        ? string.Join(" › ", path.Where(x => x.Length > 0))
                        : "All Products",
                Kind = kindText,
                CategoryId = categoryId,
                SubCategoryId = subCategoryId,
                From = DateText(start),
                To = DateText(end),
                BranchId = branchId,
                BranchName = branchId > 0 ? labels.Branches.GetValueOrDefault(branchId, string.Empty) : "All Branches",
                WarehouseId = warehouseId,
                WarehouseName = warehouseId > 0 ? labels.Warehouses.GetValueOrDefault(warehouseId, string.Empty) : string.Empty,
                ShowCancelled = showCancelled
            };

        if (productIds.Count == 0)
        {
            return result;
        }

        IQueryable<StockMovementsEntity> moves =
            MovementsQuery(page, null, branchId, warehouseId, showCancelled);

        if (scoped)
        {
            moves = moves.Where(x => productIds.Contains(x.ProductId));
        }

        //=======================================================
        // Opening per product
        //=======================================================

        var openings =
            (
                await moves
                    .Where(x => x.DocumentDate < start)
                    .GroupBy(x => x.ProductId)
                    .Select
                    (
                        g =>
                            new
                            {
                                ProductId = g.Key,
                                Qty = g.Sum(x => x.QuantityIn - x.QuantityOut),
                                Value = g.Sum(x => x.QuantityIn > 0 ? x.Value : -x.Value),
                                Transit = g.Sum(x => x.Bucket != BucketOnHand ? x.QuantityIn - x.QuantityOut : 0m)
                            }
                    )
                    .ToListAsync()
            )
            .ToDictionary(x => x.ProductId);

        //=======================================================
        // The period : per product and document, netted
        //=======================================================

        List<DocumentSums> documents =
            await moves
                .Where(x => x.DocumentDate >= start && x.DocumentDate <= end)
                .GroupBy
                (
                    x =>
                        new
                        {
                            x.ProductId,
                            x.DocumentType,
                            x.DocumentId,
                            x.MovementType,
                            x.IsReversal
                        }
                )
                .Select
                (
                    g =>
                        new DocumentSums
                        {
                            ProductId = g.Key.ProductId,
                            In = g.Sum(x => x.Bucket == BucketOnHand ? x.QuantityIn : 0m),
                            Out = g.Sum(x => x.Bucket == BucketOnHand ? x.QuantityOut : 0m),
                            InValue = g.Sum(x => x.Bucket == BucketOnHand && x.QuantityIn > 0 ? x.Value : 0m),
                            OutValue = g.Sum(x => x.Bucket == BucketOnHand && x.QuantityOut > 0 ? x.Value : 0m),
                            Transit = g.Sum(x => x.Bucket != BucketOnHand ? x.QuantityIn - x.QuantityOut : 0m),
                            TransitValue = g.Sum(x => x.Bucket != BucketOnHand ? (x.QuantityIn > 0 ? x.Value : -x.Value) : 0m)
                        }
                )
                .ToListAsync();

        ILookup<long, DocumentSums> byProduct =
            documents.ToLookup(x => x.ProductId);

        foreach (ProductInfo product in products)
        {
            openings.TryGetValue(product.ProductId, out var opening);

            decimal openingQty =
                opening?.Qty ?? 0m;

            decimal openingValue =
                opening?.Value ?? 0m;

            decimal inQty = 0m, outQty = 0m, inValue = 0m, outValue = 0m;

            decimal transit =
                opening?.Transit ?? 0m;

            // Stock change through In Transit (purchased, received)
            decimal roadQty = 0m, roadValue = 0m;

            foreach (DocumentSums document in byProduct[product.ProductId])
            {
                transit += document.Transit;

                roadQty += document.Transit;

                roadValue += document.TransitValue;

                decimal net =
                    document.In - document.Out;

                decimal netValue =
                    document.InValue - document.OutValue;

                if (net > 0)
                {
                    inQty += net;
                }
                else
                {
                    outQty += -net;
                }

                if (netValue > 0)
                {
                    inValue += netValue;
                }
                else
                {
                    outValue += -netValue;
                }
            }

            if (openingQty == 0 && inQty == 0 && outQty == 0 && openingValue == 0 && transit == 0 && !byProduct[product.ProductId].Any())
            {
                continue;
            }

            labels.Categories.TryGetValue(product.CategoryId, out (string Name, long? BrandId) category);

            result.Rows.Add(
                new ProductLedgerSummaryRowDto
                {
                    ProductId = product.ProductId,
                    ProductCode = product.ProductCode,
                    ProductName = product.Name,
                    Unit = product.Unit,
                    CategoryName = category.Name ?? string.Empty,
                    SubCategoryName = labels.SubCategories.GetValueOrDefault(product.SubCategoryId, string.Empty),
                    IsActive = product.IsActive,
                    OpeningQty = openingQty,
                    OpeningValue = canViewCost ? Money(openingValue) : 0m,
                    InQty = inQty,
                    InValue = canViewCost ? Money(inValue) : 0m,
                    OutQty = outQty,
                    OutValue = canViewCost ? Money(outValue) : 0m,
                    ClosingQty = openingQty + inQty - outQty + roadQty,
                    ClosingValue = canViewCost ? Money(openingValue + inValue - outValue + roadValue) : 0m,
                    ClosingTransit = transit
                });
        }

        result.Rows =
            result.Rows
                .OrderBy(x => x.ProductCode)
                .ToList();

        result.OpeningQty = result.Rows.Sum(x => x.OpeningQty);

        result.InQty = result.Rows.Sum(x => x.InQty);

        result.OutQty = result.Rows.Sum(x => x.OutQty);

        result.ClosingQty = result.Rows.Sum(x => x.ClosingQty);

        result.OpeningValue = result.Rows.Sum(x => x.OpeningValue);

        result.InValue = result.Rows.Sum(x => x.InValue);

        result.OutValue = result.Rows.Sum(x => x.OutValue);

        result.ClosingValue = result.Rows.Sum(x => x.ClosingValue);

        result.ClosingTransit = result.Rows.Sum(x => x.ClosingTransit);

        return result;
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
}
