//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;

using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.InventoryManagement.PricingLabels;

using AppCore.Domain.Entities.InventoryManagement.PricingLabels;

using AppCore.Infrastructure.Persistence;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;

using SparePartsEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.SpareParts;

using AccessoriesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.Accessories;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using ColorManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ColorManagement;

using StockBatchesEntity =
    AppCore.Domain.Platform.Inventory.StockBatches;

using ProductPricingEntity =
    AppCore.Domain.Entities.InventoryManagement.PricingLabels.ProductPricing;

using ProductPricingLinesEntity =
    AppCore.Domain.Entities.InventoryManagement.PricingLabels.ProductPricingLines;

using PurchaseHeaderEntity =
    AppCore.Domain.Entities.Procurement.Shared.PurchaseHeader;

using PurchasesMbEntity =
    AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchasesMb;

using PurchasesSpEntity =
    AppCore.Domain.Entities.Procurement.SparePartsLubricantPurchase.PurchasesSp;

using PurchasesAcEntity =
    AppCore.Domain.Entities.Procurement.AccessoriesPurchase.PurchasesAc;

using MotorBikeUnitsEntity =
    AppCore.Domain.Entities.Procurement.MotorBikePurchase.MotorBikeUnits;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InventoryManagement.PricingLabels;


//===============================================================
// Barcode Management repository (utility page, no documents)
//
// A label belongs to one STOCK BATCH : its barcode value is the
// product code without hyphens + "B" + the batch id
// (SP-001-001-00002, batch 1234 → SP00100100002B1234), the same in
// the Code-128 and the QR. The MRP printed is the batch's MRP
// (VAT inclusive; 0 = unpriced).
//
// Sources (rows) :
//   pricechange : a posted price change → the batches of its lines
//                 (labels = stock in hand)
//   purchase    : a posted purchase → its received batches
//                 (labels = received quantity); Motor Bikes : the
//                 bikes on hand (hang-tags)
//   products    : brand / category / product → in-stock batches
//                 (labels = 1)
//   stock       : every in-stock batch, brand / category optional
//                 (labels = stock in hand)
// Print history is kept while CFG-MOD-012-0025 is ON.
//===============================================================

public class BarcodeManagementRepository
    : IBarcodeManagementRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string DateFormat =
        "yyyy-MM-dd";

    private const string Posted = "Posted";

    private const string BatchCancelled = "Cancelled";

    private const string BatchClosed = "Closed";

    private const string BatchSourcePurchase = "Purchase";

    private const string BatchSourceOpening = "Opening";

    private const string UnitPending = "Pending";

    private const string UnitSold = "Sold";

    private const string UnitReturned = "Returned";

    private const string SourcePriceChange = "pricechange";

    private const string SourcePurchase = "purchase";

    private const string SourceProducts = "products";

    private const string SourceStock = "stock";

    private const int MaxRows = 5000;

    private const int MaxUnits = 2000;

    private const int MaxDocuments = 1000;

    private const int MaxLabelsPerLine = 1000;

    private const string DefaultMrpFormat = "MRP {0}";

    private const string DefaultPaper = "A4-3x8";

    private static readonly string[] Papers =
        new[] { "A4-3x8", "A4-4x10", "A4-5x13", "Roll-38x25", "Roll-50x25" };

    // History : the hang-tag paper (Motor Bikes)
    private static readonly string[] HistoryPapers =
        new[] { "A4-3x8", "A4-4x10", "A4-5x13", "Roll-38x25", "Roll-50x25", "Tag-A4-2x2" };

    private static readonly string[] HistorySources =
        new[] { "PriceChange", "Purchase", "Products", "Stock", "Mixed" };

    // Switches on the Barcode Management page
    private const string SwitchPrintMrp = "CFG-MOD-012-0014";

    private const string SwitchMrpFormat = "CFG-MOD-012-0015";

    private const string SwitchShowName = "CFG-MOD-012-0016";

    private const string SwitchShowPartNumber = "CFG-MOD-012-0017";

    private const string SwitchShowBrand = "CFG-MOD-012-0018";

    private const string SwitchBrandAs = "CFG-MOD-012-0019";

    private const string SwitchShowBatch = "CFG-MOD-012-0020";

    private const string SwitchShowDate = "CFG-MOD-012-0021";

    private const string SwitchCode128 = "CFG-MOD-012-0022";

    private const string SwitchQr = "CFG-MOD-012-0023";

    private const string SwitchDefaultPaper = "CFG-MOD-012-0024";

    private const string SwitchKeepHistory = "CFG-MOD-012-0025";

    private static readonly string[] AllSwitches =
        new[]
        {
            SwitchPrintMrp, SwitchMrpFormat, SwitchShowName, SwitchShowPartNumber,
            SwitchShowBrand, SwitchBrandAs, SwitchShowBatch, SwitchShowDate,
            SwitchCode128, SwitchQr, SwitchDefaultPaper, SwitchKeepHistory
        };


    //===========================================================
    // Dependencies
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public BarcodeManagementRepository(
        AppDbContext context)
    {
        _context = context;
    }


    //===========================================================
    // Page types / sources
    //===========================================================

    private static string TypeOf
    (
        string? pageType
    )
    {
        string type =
            (pageType ?? string.Empty).Trim().ToUpperInvariant();

        return type is "MB" or "SP" or "AC"
            ? type
            : throw new InvalidOperationException(
                "Choose the product type (Motor Bikes, Spare Parts & Lubricants or Accessories).");
    }

    private static string TitleOf(string type) =>
        type switch
        {
            "MB" => "Motor Bikes",
            "SP" => "Spare Parts & Lubricants",
            _ => "Accessories"
        };

    private static string SourceOf
    (
        string? source
    )
    {
        string value =
            (source ?? string.Empty).Trim().ToLowerInvariant();

        return value is SourcePriceChange or SourcePurchase or SourceProducts or SourceStock
            ? value
            : throw new InvalidOperationException(
                "Choose where the labels come from (Price Change, Purchase, Products or Stock).");
    }


    //===========================================================
    // Helpers
    //===========================================================

    private static string DateText(DateOnly date) =>
        date.ToString(DateFormat, CultureInfo.InvariantCulture);

    private static string DateText(DateOnly? date) =>
        date.HasValue
            ? date.Value.ToString(DateFormat, CultureInfo.InvariantCulture)
            : string.Empty;

    private static string Limit
    (
        string? value,
        int maxLength
    )
    {
        string text =
            (value ?? string.Empty).Trim();

        return text.Length <= maxLength
            ? text
            : text.Substring(0, maxLength);
    }

    // Labels of a quantity : whole labels, at most MaxLabelsPerLine
    private static int Labels
    (
        decimal quantity
    )
    {
        return quantity <= 0m
            ? 0
            : (int)Math.Min(MaxLabelsPerLine, Math.Ceiling(quantity));
    }

    // SP-001-001-00002 + batch 1234 → SP00100100002B1234 (letters and
    // digits only : Code-128 subset B and any scanner read it)
    private static string BarcodeValueOf
    (
        string? productCode,
        long stockBatchId
    )
    {
        string code =
            new string(
                (productCode ?? string.Empty)
                    .Where(c => c is >= '0' and <= '9' or >= 'A' and <= 'Z' or >= 'a' and <= 'z')
                    .ToArray())
            .ToUpperInvariant();

        return $"{code}B{stockBatchId.ToString(CultureInfo.InvariantCulture)}";
    }


    //===========================================================
    // Business date (Bangladesh time)
    //===========================================================

    private static readonly TimeZoneInfo BusinessZone =
        FindBusinessZone();

    private static TimeZoneInfo FindBusinessZone()
    {
        foreach (string id in new[] { "Asia/Dhaka", "Bangladesh Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        return TimeZoneInfo.Local;
    }

    private static DateOnly BusinessToday()
    {
        return DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                BusinessZone));
    }


    //===========================================================
    // Switches : ON / OFF and the text value, by code (one read)
    //===========================================================

    private async Task<Dictionary<string, (bool IsOn, string Value)>>
        SwitchesAsync
        (
            params string[] codes
        )
    {
        var rows =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => codes.Contains(x.ConfigurationCode) && !x.IsDeleted)
                .Select(x => new { x.ConfigurationCode, x.IsEnabled, x.Value })
                .ToListAsync();

        Dictionary<string, (bool IsOn, string Value)> result =
            new();

        foreach (var row in rows)
        {
            result[row.ConfigurationCode] = (row.IsEnabled, row.Value ?? string.Empty);
        }

        return result;
    }

    // Missing switch : the fallback
    private static bool On
    (
        Dictionary<string, (bool IsOn, string Value)> switches,
        string code,
        bool fallback
    )
    {
        return switches.TryGetValue(code, out var state)
            ? state.IsOn
            : fallback;
    }

    // ON with a value : the value (else the fallback)
    private static string TextOf
    (
        Dictionary<string, (bool IsOn, string Value)> switches,
        string code,
        string fallback
    )
    {
        return switches.TryGetValue(code, out var state) && state.IsOn && state.Value.Trim().Length > 0
            ? state.Value.Trim()
            : fallback;
    }


    //===========================================================
    // Settings : switches + pickers (products with stock in hand)
    //===========================================================

    public async Task<BarcodeSettingsDto>
        GetSettingsAsync
        (
            string pageType
        )
    {
        string type =
            TypeOf(pageType);

        Dictionary<string, (bool IsOn, string Value)> switches =
            await SwitchesAsync(AllSwitches);

        // "MRP {0}" : a text without {0} gets the amount after it
        string format =
            Limit(TextOf(switches, SwitchMrpFormat, DefaultMrpFormat), 40);

        if (!format.Contains("{0}", StringComparison.Ordinal))
        {
            format = $"{format} {{0}}";
        }

        string brandAs =
            string.Equals(TextOf(switches, SwitchBrandAs, "Name"), "Logo", StringComparison.OrdinalIgnoreCase)
                ? "Logo"
                : "Name";

        string paperText =
            TextOf(switches, SwitchDefaultPaper, DefaultPaper);

        string paper =
            Papers.FirstOrDefault(x => string.Equals(x, paperText, StringComparison.OrdinalIgnoreCase))
            ??
            DefaultPaper;

        BarcodeSettingsDto result =
            new()
            {
                PageType = type,
                Today = DateText(BusinessToday()),
                PrintMrp = On(switches, SwitchPrintMrp, true),
                MrpFormat = format,
                ShowName = On(switches, SwitchShowName, true),
                ShowPartNumber = On(switches, SwitchShowPartNumber, true),
                ShowBrand = On(switches, SwitchShowBrand, true),
                BrandAs = brandAs,
                ShowBatch = On(switches, SwitchShowBatch, false),
                ShowDate = On(switches, SwitchShowDate, false),
                ShowCode128 = On(switches, SwitchCode128, true),
                ShowQr = On(switches, SwitchQr, true),
                DefaultPaper = paper,
                KeepHistory = On(switches, SwitchKeepHistory, true)
            };

        // Products of the type with stock in hand
        var stock =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductType == type
                        &&
                        x.Status != BatchCancelled
                        &&
                        x.Status != BatchClosed
                        &&
                        x.QuantityOnHand > 0m
                        &&
                        x.Mrp > 0m
                )
                .GroupBy(x => x.ProductId)
                .Select(g => new { ProductId = g.Key, Stock = g.Sum(x => x.QuantityOnHand), Batches = g.Count() })
                .ToListAsync();

        if (stock.Count == 0)
        {
            return result;
        }

        Dictionary<long, (decimal Stock, int Batches)> stockOf =
            stock.ToDictionary(x => x.ProductId, x => (x.Stock, x.Batches));

        List<ProductInfo> products =
            await ProductRowsAsync(type, stockOf.Keys.ToList());

        result.Products =
            products
                .OrderBy(x => x.Code)
                .Select
                (
                    x =>
                        new BarcodeProductDto
                        {
                            Id = x.Id,
                            Code = x.Code,
                            Name = x.Name,
                            PartNumber = x.PartNumber,
                            BrandId = x.BrandId,
                            CategoryId = x.CategoryId,
                            Stock = stockOf.TryGetValue(x.Id, out var s1) ? s1.Stock : 0m,
                            BatchCount = stockOf.TryGetValue(x.Id, out var s2) ? s2.Batches : 0
                        }
                )
                .ToList();

        result.Brands =
            products
                .Where(x => x.BrandId != 0 && x.BrandName.Length > 0)
                .GroupBy(x => x.BrandId)
                .Select
                (
                    g =>
                        new BarcodeBrandDto
                        {
                            Id = g.Key,
                            Name = g.First().BrandName,
                            LogoPath = g.First().BrandLogo
                        }
                )
                .OrderBy(x => x.Name)
                .ToList();

        result.Categories =
            products
                .Where(x => x.CategoryId > 0)
                .GroupBy(x => x.CategoryId)
                .Select
                (
                    g =>
                        new BarcodeCategoryDto
                        {
                            Id = g.Key,
                            Name = g.First().CategoryName.Length > 0 ? g.First().CategoryName : $"Category {g.Key}",
                            BrandId = g.First().BrandId
                        }
                )
                .OrderBy(x => x.Name)
                .ToList();

        return result;
    }


    //===========================================================
    // Source documents : posted price changes / purchases with
    // batches behind them
    //===========================================================

    public async Task<List<BarcodeDocumentDto>>
        GetDocumentsAsync
        (
            string pageType,
            string source
        )
    {
        string type =
            TypeOf(pageType);

        string kind =
            SourceOf(source);

        if (kind == SourcePriceChange)
        {
            return await PriceChangeDocumentsAsync(type);
        }

        if (kind == SourcePurchase)
        {
            return await PurchaseDocumentsAsync(type);
        }

        throw new InvalidOperationException(
            "Documents are listed for Price Change and Purchase only.");
    }

    private async Task<List<BarcodeDocumentDto>>
        PriceChangeDocumentsAsync
        (
            string type
        )
    {
        var heads =
            await _context
                .Set<ProductPricingEntity>()
                .AsNoTracking()
                .Where(x => x.PageType == type && x.Status == Posted && !x.IsDeleted)
                .OrderByDescending(x => x.PricingDate)
                .ThenByDescending(x => x.ProductPricingId)
                .Take(MaxDocuments)
                .Select
                (
                    x =>
                        new
                        {
                            x.ProductPricingId,
                            x.PricingNo,
                            x.PricingDate,
                            x.PurchaseNo,
                            x.SupplierName,
                            x.Remarks
                        }
                )
                .ToListAsync();

        List<long> headIds =
            heads.Select(x => x.ProductPricingId).ToList();

        var lines =
            await _context
                .Set<ProductPricingLinesEntity>()
                .AsNoTracking()
                .Where(x => headIds.Contains(x.ProductPricingId) && x.StockBatchId > 0)
                .Select(x => new { x.ProductPricingId, x.StockBatchId })
                .ToListAsync();

        List<long> batchIds =
            lines.Select(x => x.StockBatchId).Distinct().ToList();

        // Only the batches still with stock in hand
        HashSet<long> stocked =
            (
                await _context
                    .Set<StockBatchesEntity>()
                    .AsNoTracking()
                    .Where
                    (
                        x =>
                            batchIds.Contains(x.StockBatchId)
                            &&
                            x.Status != BatchCancelled
                            &&
                            x.Status != BatchClosed
                            &&
                            x.QuantityOnHand > 0m
                            &&
                            x.Mrp > 0m
                    )
                    .Select(x => x.StockBatchId)
                    .ToListAsync()
            )
            .ToHashSet();

        ILookup<long, long> byHead =
            lines
                .Where(x => stocked.Contains(x.StockBatchId))
                .ToLookup(x => x.ProductPricingId, x => x.StockBatchId);

        return heads
            .Select
            (
                x =>
                    new BarcodeDocumentDto
                    {
                        Id = x.ProductPricingId,
                        No = x.PricingNo,
                        Date = DateText(x.PricingDate),
                        Party =
                            Limit(
                                string.Join(
                                    " · ",
                                    new[] { x.PurchaseNo, x.SupplierName, x.Remarks }
                                        .Where(t => !string.IsNullOrWhiteSpace(t))
                                        .Select(t => t.Trim())),
                                120),
                        Lines = byHead[x.ProductPricingId].Distinct().Count()
                    }
            )
            .Where(x => x.Lines > 0)
            .ToList();
    }

    private async Task<List<BarcodeDocumentDto>>
        PurchaseDocumentsAsync
        (
            string type
        )
    {
        // Received batches of the type (received = quantity not in
        // transit any more); only the priced ones get labels
        var batches =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductType == type
                        &&
                        x.SourceType == BatchSourcePurchase
                        &&
                        x.Status != BatchCancelled
                        &&
                        x.Quantity - x.QuantityInTransit > 0m
                )
                .Select(x => new { x.SourceId, x.SourceLineId, x.StockBatchId, Priced = x.Mrp > 0m })
                .ToListAsync();

        // Purchase → (priced batches, all batches); a purchase with
        // no priced batch is not listed
        Dictionary<long, (int Priced, int Total)> perPurchase =
            batches
                .GroupBy(x => x.SourceId)
                .ToDictionary(g => g.Key, g => (g.Count(x => x.Priced), g.Count()));

        List<long> purchaseIds =
            perPurchase
                .Where(x => x.Value.Priced > 0)
                .Select(x => x.Key)
                .ToList();

        List<InvoiceHead> heads =
            (await HeadsAsync(type, purchaseIds))
                .Where(x => x.Status == Posted)
                .ToList();

        // Motor Bikes : the bikes on hand of each purchase whose
        // batch is priced
        Dictionary<long, int> unitsOf =
            new();

        if (type == "MB" && purchaseIds.Count > 0)
        {
            HashSet<(long, long)> pricedLines =
                batches
                    .Where(x => x.Priced)
                    .Select(x => (x.SourceId, x.SourceLineId))
                    .ToHashSet();

            unitsOf =
                (
                    await _context
                        .Set<MotorBikeUnitsEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                purchaseIds.Contains(x.PurchaseId)
                                &&
                                x.Status != UnitPending
                                &&
                                x.Status != UnitSold
                                &&
                                x.Status != UnitReturned
                        )
                        .Select(x => new { x.PurchaseId, x.PurchaseLineId })
                        .ToListAsync()
                )
                .Where(x => pricedLines.Contains((x.PurchaseId, x.PurchaseLineId)))
                .GroupBy(x => x.PurchaseId)
                .ToDictionary(g => g.Key, g => g.Count());
        }

        return heads
            .OrderByDescending(x => x.Date)
            .ThenByDescending(x => x.Id)
            .Select
            (
                x =>
                    new BarcodeDocumentDto
                    {
                        Id = x.Id,
                        No = x.No,
                        Date = DateText(x.Date),
                        Party = Limit(x.SupplierName, 120),
                        Lines = perPurchase.GetValueOrDefault(x.Id).Priced,
                        TotalLines = perPurchase.GetValueOrDefault(x.Id).Total,
                        Units = unitsOf.GetValueOrDefault(x.Id)
                    }
            )
            // Motor Bikes : a purchase whose priced bikes are all sold
            // has nothing to tag
            .Where(x => type != "MB" || x.Units > 0)
            .Take(MaxDocuments)
            .ToList();
    }


    //===========================================================
    // Purchase heads (Motor Bikes / Spare Parts / Accessories)
    //===========================================================

    private sealed class InvoiceHead
    {
        public long Id { get; set; }

        public string No { get; set; } = string.Empty;

        public DateOnly Date { get; set; }

        public string SupplierName { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;
    }

    private async Task<List<InvoiceHead>>
        HeadsAsync
        (
            string type,
            List<long> ids
        )
    {
        if (ids.Count == 0)
        {
            return new List<InvoiceHead>();
        }

        return type switch
        {
            "MB" => await HeadsOf<PurchasesMbEntity>(ids),
            "SP" => await HeadsOf<PurchasesSpEntity>(ids),
            _ => await HeadsOf<PurchasesAcEntity>(ids)
        };
    }

    private async Task<List<InvoiceHead>>
        HeadsOf<THeader>
        (
            List<long> ids
        )
        where THeader : PurchaseHeaderEntity
    {
        return await _context
            .Set<THeader>()
            .AsNoTracking()
            .Where(x => ids.Contains(x.PurchaseId) && !x.IsDeleted)
            .Select
            (
                x =>
                    new InvoiceHead
                    {
                        Id = x.PurchaseId,
                        No = x.PurchaseNo,
                        Date = x.PurchaseDate,
                        SupplierName = x.SupplierName,
                        Status = x.Status
                    }
            )
            .ToListAsync();
    }


    //===========================================================
    // Rows : the batches of a source, one row each
    //===========================================================

    public async Task<List<BarcodeRowDto>>
        GetRowsAsync
        (
            BarcodeRowsFilterDto filter
        )
    {
        string type =
            TypeOf(filter?.Type);

        string source =
            SourceOf(filter?.Source);

        BarcodeRowsFilterDto input =
            filter ?? new BarcodeRowsFilterDto();

        List<StockBatchesEntity> batches =
            await BatchesOfAsync(type, source, input);

        // Labels suggested : stock in hand / received / one each
        Func<StockBatchesEntity, int> labelsOf =
            source switch
            {
                SourcePurchase => b => Labels(b.Quantity - b.QuantityInTransit),
                SourceProducts => b => 1,
                _ => b => Labels(b.QuantityOnHand)
            };

        return await ToRowsAsync(type, batches, labelsOf);
    }

    private async Task<List<StockBatchesEntity>>
        BatchesOfAsync
        (
            string type,
            string source,
            BarcodeRowsFilterDto filter
        )
    {
        if (source == SourcePriceChange)
        {
            if (filter.Id <= 0)
            {
                throw new InvalidOperationException(
                    "Choose the price change.");
            }

            var head =
                await _context
                    .Set<ProductPricingEntity>()
                    .AsNoTracking()
                    .Where(x => x.ProductPricingId == filter.Id && !x.IsDeleted)
                    .Select(x => new { x.PageType, x.Status, x.PricingNo })
                    .FirstOrDefaultAsync()
                ??
                throw new KeyNotFoundException("Price change not found.");

            if (head.PageType != type)
            {
                throw new InvalidOperationException(
                    $"Price change {head.PricingNo} is not of {TitleOf(type)}.");
            }

            if (head.Status != Posted)
            {
                throw new InvalidOperationException(
                    $"Price change {head.PricingNo} is {head.Status}; only a posted price change prints labels.");
            }

            List<long> ids =
                await _context
                    .Set<ProductPricingLinesEntity>()
                    .AsNoTracking()
                    .Where(x => x.ProductPricingId == filter.Id && x.StockBatchId > 0)
                    .Select(x => x.StockBatchId)
                    .Distinct()
                    .ToListAsync();

            return await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        ids.Contains(x.StockBatchId)
                        &&
                        x.ProductType == type
                        &&
                        x.Status != BatchCancelled
                        &&
                        x.Status != BatchClosed
                        &&
                        x.Mrp > 0m
                )
                .OrderBy(x => x.ProductCode)
                .ThenBy(x => x.StockBatchId)
                .ToListAsync();
        }

        if (source == SourcePurchase)
        {
            if (filter.Id <= 0)
            {
                throw new InvalidOperationException(
                    "Choose the purchase.");
            }

            InvoiceHead head =
                (await HeadsAsync(type, new List<long> { filter.Id })).FirstOrDefault()
                ??
                throw new KeyNotFoundException("Purchase not found.");

            if (head.Status != Posted)
            {
                throw new InvalidOperationException(
                    $"Purchase {head.No} is {head.Status}; only a posted purchase prints labels.");
            }

            return await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductType == type
                        &&
                        x.SourceType == BatchSourcePurchase
                        &&
                        x.SourceId == filter.Id
                        &&
                        x.Status != BatchCancelled
                        &&
                        x.Quantity - x.QuantityInTransit > 0m
                        &&
                        x.Mrp > 0m
                )
                .OrderBy(x => x.SourceLineId)
                .ToListAsync();
        }

        if (source == SourceProducts)
        {
            if (filter.BrandId == 0 && filter.CategoryId <= 0 && filter.ProductId <= 0)
            {
                throw new InvalidOperationException(
                    "Choose a brand, a category or a product.");
            }

            return await InStockAsync(type, filter.BrandId, filter.CategoryId, filter.ProductId);
        }

        return await InStockAsync(type, filter.BrandId, filter.CategoryId, 0);
    }

    // In-stock batches (stock in hand) of the type, by brand /
    // category / product (0 = any)
    private async Task<List<StockBatchesEntity>>
        InStockAsync
        (
            string type,
            long brandId,
            long categoryId,
            long productId
        )
    {
        IQueryable<StockBatchesEntity> query =
            _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.ProductType == type
                        &&
                        x.Status != BatchCancelled
                        &&
                        x.Status != BatchClosed
                        &&
                        x.QuantityOnHand > 0m
                        &&
                        x.Mrp > 0m
                );

        if (productId > 0)
        {
            query = query.Where(x => x.ProductId == productId);
        }

        List<StockBatchesEntity> batches =
            await query
                .OrderBy(x => x.ProductCode)
                .ThenBy(x => x.StockBatchId)
                .ToListAsync();

        if ((brandId != 0 || categoryId > 0) && batches.Count > 0)
        {
            List<long> productIds =
                batches.Select(x => x.ProductId).Distinct().ToList();

            HashSet<long> keep =
                (await ProductRowsAsync(type, productIds))
                    .Where
                    (
                        x =>
                            (brandId == 0 || x.BrandId == brandId)
                            &&
                            (categoryId <= 0 || x.CategoryId == categoryId)
                    )
                    .Select(x => x.Id)
                    .ToHashSet();

            batches =
                batches.Where(x => keep.Contains(x.ProductId)).ToList();
        }

        if (batches.Count > MaxRows)
        {
            throw new InvalidOperationException(
                $"{batches.Count} batches : too many for one load (at most {MaxRows}). Choose a brand or a category.");
        }

        return batches;
    }

    private async Task<List<BarcodeRowDto>>
        ToRowsAsync
        (
            string type,
            List<StockBatchesEntity> batches,
            Func<StockBatchesEntity, int> labelsOf
        )
    {
        if (batches.Count == 0)
        {
            return new List<BarcodeRowDto>();
        }

        List<long> productIds =
            batches.Select(x => x.ProductId).Distinct().ToList();

        Dictionary<long, ProductInfo> products =
            (await ProductRowsAsync(type, productIds))
                .GroupBy(x => x.Id)
                .ToDictionary(g => g.Key, g => g.First());

        Dictionary<long, string> branches =
            await BranchNamesAsync(batches.Select(x => x.BranchId));

        return batches
            .Select
            (
                b =>
                {
                    products.TryGetValue(b.ProductId, out ProductInfo? product);

                    string code =
                        b.ProductCode.Length > 0
                            ? b.ProductCode
                            : product?.Code ?? string.Empty;

                    return new BarcodeRowDto
                    {
                        StockBatchId = b.StockBatchId,
                        BatchNo = b.BatchNo,
                        ProductId = b.ProductId,
                        Code = code,
                        Name = product?.Name ?? b.ProductName,
                        PartNumber = product?.PartNumber ?? string.Empty,
                        BrandId = product?.BrandId ?? 0,
                        BrandName = product?.BrandName ?? string.Empty,
                        BrandLogo = product?.BrandLogo ?? string.Empty,
                        Unit = product?.Unit ?? "Pcs",
                        Mrp = b.Mrp,
                        Stock = b.QuantityOnHand,
                        DefaultQty = labelsOf(b),
                        BarcodeValue = BarcodeValueOf(code, b.StockBatchId),
                        SourceNo = b.SourceNo,
                        BatchDate = DateText(b.SourceDate),
                        BranchName = branches.GetValueOrDefault(b.BranchId, string.Empty)
                    };
                }
            )
            .ToList();
    }

    private async Task<Dictionary<long, string>>
        BranchNamesAsync
        (
            IEnumerable<long> branchIds
        )
    {
        List<long> ids =
            branchIds.Where(x => x > 0).Distinct().ToList();

        if (ids.Count == 0)
        {
            return new Dictionary<long, string>();
        }

        return await _context
            .Set<BranchesEntity>()
            .AsNoTracking()
            .Where(x => ids.Contains(x.BranchId))
            .ToDictionaryAsync(x => x.BranchId, x => x.BranchName ?? string.Empty);
    }


    //===========================================================
    // Motor bike units (hang-tags) : the bikes on hand behind the
    // batches of a source
    //===========================================================

    public Task<List<BarcodeUnitDto>>
        GetUnitsByPurchaseAsync
        (
            long purchaseId
        )
    {
        return GetUnitsAsync(
            new BarcodeRowsFilterDto
            {
                Type = "MB",
                Source = SourcePurchase,
                Id = purchaseId
            });
    }

    public async Task<List<BarcodeUnitDto>>
        GetUnitsAsync
        (
            BarcodeRowsFilterDto filter
        )
    {
        BarcodeRowsFilterDto input =
            filter ?? new BarcodeRowsFilterDto();

        string type =
            TypeOf(string.IsNullOrWhiteSpace(input.Type) ? "MB" : input.Type);

        if (type != "MB")
        {
            throw new InvalidOperationException(
                "Hang-tags are printed for motor bikes only.");
        }

        string source =
            SourceOf(input.Source);

        List<StockBatchesEntity> batches =
            await BatchesOfAsync(type, source, input);

        if (batches.Count == 0)
        {
            return new List<BarcodeUnitDto>();
        }

        // A bike's batch : its purchase line, or its opening stock
        // document and model
        Dictionary<(long, long), StockBatchesEntity> byLine =
            batches
                .Where(x => x.SourceType == BatchSourcePurchase)
                .GroupBy(x => (x.SourceId, x.SourceLineId))
                .ToDictionary(g => g.Key, g => g.First());

        Dictionary<(long, long), StockBatchesEntity> byOpening =
            batches
                .Where(x => x.SourceType == BatchSourceOpening)
                .GroupBy(x => (x.SourceId, x.ProductId))
                .ToDictionary(g => g.Key, g => g.First());

        List<long> purchaseIds =
            byLine.Keys.Select(x => x.Item1).Distinct().ToList();

        List<long> openingIds =
            byOpening.Keys.Select(x => x.Item1).Distinct().ToList();

        List<MotorBikeUnitsEntity> units =
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
                        x.Status != UnitSold
                        &&
                        x.Status != UnitReturned
                        &&
                        (
                            (x.PurchaseId > 0 && purchaseIds.Contains(x.PurchaseId))
                            ||
                            (x.OpeningStockId.HasValue && openingIds.Contains(x.OpeningStockId.Value))
                        )
                )
                .OrderBy(x => x.MotorBikeUnitId)
                .ToListAsync();

        List<(MotorBikeUnitsEntity Unit, StockBatchesEntity Batch)> pairs =
            new();

        foreach (MotorBikeUnitsEntity unit in units)
        {
            StockBatchesEntity? batch = null;

            if (unit.PurchaseId > 0)
            {
                byLine.TryGetValue((unit.PurchaseId, unit.PurchaseLineId), out batch);
            }
            else if (unit.OpeningStockId.HasValue)
            {
                byOpening.TryGetValue((unit.OpeningStockId.Value, unit.ProductId), out batch);
            }

            if (batch != null)
            {
                pairs.Add((unit, batch));
            }
        }

        if (pairs.Count > MaxUnits)
        {
            throw new InvalidOperationException(
                $"{pairs.Count} bikes : too many for one load (at most {MaxUnits}). Choose a brand or a model.");
        }

        List<long> productIds =
            pairs.Select(x => x.Unit.ProductId).Distinct().ToList();

        Dictionary<long, ProductInfo> products =
            (await ProductRowsAsync(type, productIds))
                .GroupBy(x => x.Id)
                .ToDictionary(g => g.Key, g => g.First());

        List<long> colorIds =
            products.Values
                .Select(x => x.ColorId)
                .Where(x => x > 0)
                .Distinct()
                .ToList();

        Dictionary<long, string> colors =
            colorIds.Count == 0
                ? new Dictionary<long, string>()
                : await _context
                    .Set<ColorManagementEntity>()
                    .AsNoTracking()
                    .Where(x => colorIds.Contains(x.ColorManagementId))
                    .ToDictionaryAsync(x => x.ColorManagementId, x => x.ColorName ?? string.Empty);

        Dictionary<long, string> branches =
            await BranchNamesAsync(pairs.Select(x => x.Unit.BranchId));

        return pairs
            .Select
            (
                x =>
                {
                    products.TryGetValue(x.Unit.ProductId, out ProductInfo? product);

                    string code =
                        x.Batch.ProductCode.Length > 0
                            ? x.Batch.ProductCode
                            : x.Unit.ProductCode;

                    string value =
                        BarcodeValueOf(code, x.Batch.StockBatchId);

                    return new BarcodeUnitDto
                    {
                        UnitId = x.Unit.MotorBikeUnitId,
                        StockBatchId = x.Batch.StockBatchId,
                        BatchNo = x.Batch.BatchNo,
                        ProductId = x.Unit.ProductId,
                        Code = code,
                        Model = product?.Name ?? x.Unit.ProductName,
                        Color = product != null ? colors.GetValueOrDefault(product.ColorId, string.Empty) : string.Empty,
                        ChassisNo = x.Unit.ChassisNo,
                        EngineNo = x.Unit.EngineNo,
                        KeyNo = x.Unit.KeyNo ?? string.Empty,
                        BatteryNo = x.Unit.BatteryNo ?? string.Empty,
                        BrandName = product?.BrandName ?? string.Empty,
                        BrandLogo = product?.BrandLogo ?? string.Empty,
                        Mrp = x.Batch.Mrp,
                        BarcodeValue = value,
                        QrValue = $"{value}|{x.Unit.ChassisNo}",
                        SourceNo = x.Unit.PurchaseNo.Length > 0 ? x.Unit.PurchaseNo : x.Batch.SourceNo,
                        StockInDate = x.Unit.StockInDate.HasValue ? DateText(x.Unit.StockInDate) : DateText(x.Batch.SourceDate),
                        BranchName = branches.GetValueOrDefault(x.Unit.BranchId, string.Empty)
                    };
                }
            )
            .OrderBy(x => x.Code)
            .ThenBy(x => x.ChassisNo)
            .ToList();
    }


    //===========================================================
    // Print history (only while CFG-MOD-012-0025 is ON)
    //===========================================================

    public async Task<BarcodeHistorySavedDto>
        SaveHistoryAsync
        (
            BarcodeHistoryInputDto input,
            long userId,
            string userName,
            long branchId
        )
    {
        Dictionary<string, (bool IsOn, string Value)> switches =
            await SwitchesAsync(SwitchKeepHistory);

        if (!On(switches, SwitchKeepHistory, true))
        {
            return new BarcodeHistorySavedDto { Saved = false };
        }

        if (input == null)
        {
            throw new InvalidOperationException(
                "Nothing to print.");
        }

        string type =
            TypeOf(input.Type);

        List<BarcodeHistoryLineDto> lines =
            (input.Lines ?? new List<BarcodeHistoryLineDto>())
                .Where(x => x.Quantity > 0 && (x.StockBatchId > 0 || x.UnitId > 0))
                .ToList();

        if (lines.Count == 0)
        {
            throw new InvalidOperationException(
                "Nothing to print : no label with a quantity.");
        }

        if (lines.Count > MaxRows)
        {
            throw new InvalidOperationException(
                $"At most {MaxRows} batches in one print.");
        }

        if (lines.Any(x => x.Quantity > MaxLabelsPerLine))
        {
            throw new InvalidOperationException(
                $"At most {MaxLabelsPerLine} labels of one batch in one print.");
        }

        List<long> batchIds =
            lines.Where(x => x.StockBatchId > 0).Select(x => x.StockBatchId).Distinct().ToList();

        List<long> unitIds =
            lines.Where(x => x.UnitId > 0).Select(x => x.UnitId).Distinct().ToList();

        Dictionary<long, StockBatchesEntity> batches =
            batchIds.Count == 0
                ? new Dictionary<long, StockBatchesEntity>()
                : await _context
                    .Set<StockBatchesEntity>()
                    .AsNoTracking()
                    .Where(x => batchIds.Contains(x.StockBatchId) && x.ProductType == type)
                    .ToDictionaryAsync(x => x.StockBatchId);

        Dictionary<long, MotorBikeUnitsEntity> units =
            unitIds.Count == 0
                ? new Dictionary<long, MotorBikeUnitsEntity>()
                : await _context
                    .Set<MotorBikeUnitsEntity>()
                    .AsNoTracking()
                    .Where(x => unitIds.Contains(x.MotorBikeUnitId))
                    .ToDictionaryAsync(x => x.MotorBikeUnitId);

        List<BarcodePrintRunLines> rows =
            new();

        foreach (BarcodeHistoryLineDto line in lines)
        {
            batches.TryGetValue(line.StockBatchId, out StockBatchesEntity? batch);

            units.TryGetValue(line.UnitId, out MotorBikeUnitsEntity? unit);

            if (batch == null && unit == null)
            {
                continue;
            }

            string code =
                batch != null && batch.ProductCode.Length > 0
                    ? batch.ProductCode
                    : unit?.ProductCode ?? string.Empty;

            rows.Add(
                new BarcodePrintRunLines
                {
                    LineNo = rows.Count + 1,
                    StockBatchId = batch?.StockBatchId ?? 0,
                    BatchNo = Limit(batch?.BatchNo, 40),
                    ProductId = batch?.ProductId ?? unit?.ProductId ?? 0,
                    ProductCode = Limit(code, 40),
                    ProductName = Limit(batch?.ProductName ?? unit?.ProductName, 250),
                    MotorBikeUnitId = unit?.MotorBikeUnitId ?? 0,
                    ChassisNo = Limit(unit?.ChassisNo, 50),
                    Quantity = line.Quantity,
                    Mrp = batch?.Mrp ?? 0m,
                    BarcodeValue = batch != null ? Limit(BarcodeValueOf(code, batch.StockBatchId), 60) : string.Empty
                });
        }

        if (rows.Count == 0)
        {
            throw new InvalidOperationException(
                "The batches printed were not found.");
        }

        string paper =
            HistoryPapers.FirstOrDefault(x => string.Equals(x, (input.Paper ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
            ??
            Limit(input.Paper, 20);

        string source =
            HistorySources.FirstOrDefault(x => string.Equals(x, (input.Source ?? string.Empty).Trim(), StringComparison.OrdinalIgnoreCase))
            ??
            "Mixed";

        BarcodePrintRuns run =
            new()
            {
                ProductType = type,
                LabelKind = string.Equals((input.LabelKind ?? string.Empty).Trim(), "HangTag", StringComparison.OrdinalIgnoreCase) ? "HangTag" : "Label",
                PaperCode = paper,
                SourceType = source,
                SourceId = Math.Max(0, input.SourceId),
                SourceNo = Limit(input.SourceNo, 60),
                StartAt = Math.Clamp(input.StartAt, 1, 999),
                PrintMrp = input.PrintMrp,
                LineCount = rows.Count,
                LabelCount = rows.Sum(x => x.Quantity),
                SheetCount = Math.Clamp(input.SheetCount, 0, 100000),
                BranchId = Math.Max(0, branchId),
                PrintedBy = userId,
                PrintedByName = Limit(string.IsNullOrWhiteSpace(userName) ? "System" : userName, 150),
                PrintedDate = DateTime.UtcNow
            };

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            _context.Set<BarcodePrintRuns>().Add(run);

            await _context.SaveChangesAsync();

            rows.ForEach(x => x.BarcodePrintRunId = run.BarcodePrintRunId);

            _context.Set<BarcodePrintRunLines>().AddRange(rows);

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }

        return new BarcodeHistorySavedDto
        {
            Saved = true,
            RunId = run.BarcodePrintRunId,
            Labels = run.LabelCount
        };
    }


    //===========================================================
    // Products of a type (live) : label name, part number, unit,
    // category, brand (logo), colour (Motor Bikes)
    //===========================================================

    private sealed class ProductInfo
    {
        public long Id { get; set; }

        public string Code { get; set; } = string.Empty;

        // The name on the label : part / accessory name; MB : model
        public string Name { get; set; } = string.Empty;

        public string PartNumber { get; set; } = string.Empty;

        public string Unit { get; set; } = string.Empty;

        public long CategoryId { get; set; }

        public string CategoryName { get; set; } = string.Empty;

        // Brand of its category (below 0 : the category name stands
        // for it)
        public long BrandId { get; set; }

        public string BrandName { get; set; } = string.Empty;

        public string BrandLogo { get; set; } = string.Empty;

        // Motor Bikes : ColorManagementId (0 = none)
        public long ColorId { get; set; }
    }

    private async Task<List<ProductInfo>>
        ProductRowsAsync
        (
            string type,
            List<long> ids
        )
    {
        if (ids.Count == 0)
        {
            return new List<ProductInfo>();
        }

        List<ProductInfo> rows =
            await ProductRowsCoreAsync(type, ids);

        List<long> categoryIds =
            rows.Select(x => x.CategoryId).Distinct().ToList();

        var categories =
            (
                await _context
                    .Set<ProductCategoryEntity>()
                    .AsNoTracking()
                    .Where(x => categoryIds.Contains(x.ProductCategoryId))
                    .Select(x => new { x.ProductCategoryId, x.CategoryType, x.CategoryName, x.BrandManagementId })
                    .ToListAsync()
            )
            .GroupBy(x => x.ProductCategoryId)
            .ToDictionary(g => g.Key, g => g.First());

        List<long> brandIds =
            categories.Values
                .Where(x => x.BrandManagementId.HasValue)
                .Select(x => x.BrandManagementId!.Value)
                .Distinct()
                .ToList();

        var brands =
            (
                await _context
                    .Set<BrandManagementEntity>()
                    .AsNoTracking()
                    .Where(x => brandIds.Contains(x.BrandManagementId))
                    .Select(x => new { x.BrandManagementId, x.BrandName, x.BrandImagePath })
                    .ToListAsync()
            )
            .GroupBy(x => x.BrandManagementId)
            .ToDictionary(g => g.Key, g => g.First());

        rows.ForEach
        (
            x =>
            {
                var category =
                    categories.GetValueOrDefault(x.CategoryId);

                x.CategoryName =
                    (category?.CategoryName ?? string.Empty).Trim();

                x.BrandId =
                    category?.BrandManagementId ?? 0;

                var brand =
                    brands.GetValueOrDefault(x.BrandId);

                x.BrandName =
                    (brand?.BrandName ?? string.Empty).Trim();

                x.BrandLogo =
                    (brand?.BrandImagePath ?? string.Empty).Trim();

                // A category saved before the brand field : its name
                // ("<Brand> <Type>") stands for the brand
                if (x.BrandId == 0 || x.BrandName.Length == 0)
                {
                    string name =
                        x.CategoryName;

                    string kind =
                        (category?.CategoryType ?? string.Empty).Trim();

                    if (kind.Length > 0 && name.EndsWith(kind, StringComparison.OrdinalIgnoreCase))
                    {
                        name = name[..^kind.Length].Trim();
                    }

                    x.BrandId = category != null ? -category.ProductCategoryId : 0;

                    x.BrandName = name;

                    x.BrandLogo = string.Empty;
                }
            }
        );

        return rows;
    }

    private async Task<List<ProductInfo>>
        ProductRowsCoreAsync
        (
            string type,
            List<long> ids
        )
    {
        if (type == "MB")
        {
            return
                (
                    await _context
                        .Set<MotorBikesEntity>()
                        .AsNoTracking()
                        .Where(x => ids.Contains(x.MotorBikeId))
                        .Select(x => new { x.MotorBikeId, x.ProductCode, x.ProductName, x.ProductCategoryId, x.ColorManagementId })
                        .ToListAsync()
                )
                .Select
                (
                    x =>
                        new ProductInfo
                        {
                            Id = x.MotorBikeId,
                            Code = x.ProductCode ?? string.Empty,
                            Name = x.ProductName ?? string.Empty,
                            PartNumber = string.Empty,
                            Unit = "Pcs",
                            CategoryId = x.ProductCategoryId,
                            ColorId = x.ColorManagementId
                        }
                )
                .ToList();
        }

        if (type == "SP")
        {
            return
                (
                    await _context
                        .Set<SparePartsEntity>()
                        .AsNoTracking()
                        .Where(x => ids.Contains(x.SparePartId))
                        .Select(x => new { x.SparePartId, x.ProductCode, x.PartNumber, x.PartName, x.Unit, x.ProductCategoryId })
                        .ToListAsync()
                )
                .Select
                (
                    x =>
                        new ProductInfo
                        {
                            Id = x.SparePartId,
                            Code = x.ProductCode ?? string.Empty,
                            Name = x.PartName ?? string.Empty,
                            PartNumber = x.PartNumber ?? string.Empty,
                            Unit = string.IsNullOrWhiteSpace(x.Unit) ? "Pcs" : x.Unit,
                            CategoryId = x.ProductCategoryId
                        }
                )
                .ToList();
        }

        return
            (
                await _context
                    .Set<AccessoriesEntity>()
                    .AsNoTracking()
                    .Where(x => ids.Contains(x.AccessoryId))
                    .Select(x => new { x.AccessoryId, x.ProductCode, x.PartNumber, x.AccessoryName, x.Unit, x.ProductCategoryId })
                    .ToListAsync()
            )
            .Select
            (
                x =>
                    new ProductInfo
                    {
                        Id = x.AccessoryId,
                        Code = x.ProductCode ?? string.Empty,
                        Name = x.AccessoryName ?? string.Empty,
                        PartNumber = x.PartNumber ?? string.Empty,
                        Unit = string.IsNullOrWhiteSpace(x.Unit) ? "Pcs" : x.Unit,
                        CategoryId = x.ProductCategoryId
                    }
            )
            .ToList();
    }
}
