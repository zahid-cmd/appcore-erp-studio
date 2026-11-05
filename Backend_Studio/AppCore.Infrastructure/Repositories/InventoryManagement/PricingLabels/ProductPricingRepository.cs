//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;

using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Common.ActivityHistory.DTOs;

using AppCore.Application.InventoryManagement.PricingLabels;

using AppCore.Application.Platform.Accounting;

using AppCore.Domain.Common;

using AppCore.Domain.Entities.InventoryManagement.PricingLabels;

using AppCore.Infrastructure.Persistence;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using SupplierProfilesEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.SupplierProfiles;

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

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using RackManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.RackManagement;

using WarehousesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Warehouses;

using StockBatchesEntity =
    AppCore.Domain.Platform.Inventory.StockBatches;

using SalesVatEntity =
    AppCore.Domain.Entities.VatManagement.VatSetup.SalesVat;

using PurchaseHeaderEntity =
    AppCore.Domain.Entities.Procurement.Shared.PurchaseHeader;

using PurchasesMbEntity =
    AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchasesMb;

using PurchasesSpEntity =
    AppCore.Domain.Entities.Procurement.SparePartsLubricantPurchase.PurchasesSp;

using PurchasesAcEntity =
    AppCore.Domain.Entities.Procurement.AccessoriesPurchase.PurchasesAc;


//===============================================================
// Namespace (as generated : the DI registration uses it)
//===============================================================

namespace AppCore.Infrastructure.Configurations.InventoryManagement.PricingLabels;


//===============================================================
// Product Pricing (Price Change) repository
//
// MRP (VAT inclusive) is the sale price : the only one. A price
// change sets the MRP of the ticked stock batches of a product.
//   No     : PC-<MB|SP|AC>-0001, company-wide, one counter per
//            type, never reset, never reused (given on first save).
//   Draft  : saved, edited, deleted freely.
//   Post   : each line's batch takes the new MRP; the MRP it had is
//            kept on the line (OldMrp). No journal : stock stays at
//            cost.
//   Cancel : each batch gets its old MRP back, while no later
//            posted price change touched it (else refused).
// Rules : the new MRP is above 0, at most 2 decimals, the same for
// all lines of a product, and never below a ticked batch's cost.
//===============================================================

public class ProductPricingRepository
    : IProductPricingRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Inventory Management";

    private const string EntityName =
        "ProductPricing";

    private const string DateFormat =
        "yyyy-MM-dd";

    public const string StatusDraft = "Draft";

    public const string StatusPosted = "Posted";

    public const string StatusCancelled = "Cancelled";

    private const string SourcePurchase = "Purchase";

    private const string BatchCancelled = "Cancelled";

    private const string BatchClosed = "Closed";

    private const int MaxLines = 2000;

    // pg_advisory_xact_lock class for the numbers ("PC")
    private const int NumberLockClass = 0x5043;

    private const string VatMotorBikes = "Motor Bikes";

    private const string VatSpareParts = "Spare Parts";

    private const string VatLubricants = "Lubricants";

    private const string VatAccessories = "Accessories";

    // Profit % On Sale Price (shared with Opening Stock). OFF
    // (default) = profit on cost; ON = margin on the net sale
    private const string SwitchProfitOnSale = "CFG-MOD-012-0010";

    // Pricing Grid MRP Editable / Raise Old Stock to a Higher New
    // MRP / Price Reduction Applies to All Stock
    private const string SwitchGridEditable = "CFG-MOD-012-0011";

    private const string SwitchRaiseOldStock = "CFG-MOD-012-0012";

    private const string SwitchReductionAllStock = "CFG-MOD-012-0013";

    // A declared-price line : no batch (StockBatchId 0)
    private const string SourceDeclared =
        "Declared";

    // Kinds : New (one purchase invoice) / Reprice (by product)
    public const string KindNew = "New";

    public const string KindReprice = "Reprice";

    // Pricing basis : profit % on cost / margin % on MRP
    private const string BasisCost = "Cost";

    private const string BasisMargin = "Margin";

    private const string PurchasePosted = "Posted";


    //===========================================================
    // Dependencies
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IVatApplicabilityService _vatApplicability;


    //===========================================================
    // Constructor
    //===========================================================

    public ProductPricingRepository(
        AppDbContext context,
        IVatApplicabilityService vatApplicability)
    {
        _context = context;

        _vatApplicability = vatApplicability;
    }


    //===========================================================
    // Page types
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

    private static string[] VatTypesOf(string type) =>
        type switch
        {
            "MB" => new[] { VatMotorBikes },
            "SP" => new[] { VatSpareParts, VatLubricants },
            _ => new[] { VatAccessories }
        };

    // PC-MB-0001
    private static string NumberOf(string type, int sequence) =>
        $"PC-{type}-{sequence:D4}";


    //===========================================================
    // Helpers
    //===========================================================

    private static string DateText(DateOnly date) =>
        date.ToString(DateFormat, CultureInfo.InvariantCulture);

    private static string DateText(DateTime? date) =>
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

    private static decimal Money(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);

    private static DateOnly ParseDate
    (
        string? text,
        string label
    )
    {
        if (DateOnly.TryParseExact(
                (text ?? string.Empty).Trim(),
                DateFormat,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out DateOnly date))
        {
            return date;
        }

        throw new InvalidOperationException(
            $"{label} is required (yyyy-MM-dd).");
    }

    // Still in stock : not cancelled / closed, something on hand or
    // in transit
    private static bool InStock(StockBatchesEntity batch) =>
        batch.Status != BatchCancelled
        &&
        batch.Status != BatchClosed
        &&
        batch.QuantityOnHand + batch.QuantityInTransit > 0m;


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
    // Switches
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


    //===========================================================
    // Transaction
    //===========================================================

    private async Task InTransactionAsync
    (
        Func<Task> work
    )
    {
        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            await work();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // History
    //===========================================================

    private void AddHistory
    (
        ProductPricing entity,
        string activityType,
        string verb,
        long userId,
        DateTime now,
        string extra = ""
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = ModuleName,
                EntityName = $"{EntityName}{entity.PageType}",
                EntityId = entity.ProductPricingId,
                ActivityType = activityType,
                ActivityTitle = $"Price Change {verb}",
                ActivityDescription =
                    $"Price Change {entity.PricingNo} ({TitleOf(entity.PageType)}, {entity.ProductCount} product{(entity.ProductCount == 1 ? string.Empty : "s")}, {entity.BatchCount} batch{(entity.BatchCount == 1 ? string.Empty : "es")}) {verb.ToLowerInvariant()}.{(string.IsNullOrWhiteSpace(extra) ? string.Empty : " " + extra)}",
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = now
            });
    }


    //===========================================================
    // Read
    //===========================================================

    public async Task<List<ProductPricingDto>>
        GetAllAsync
        (
            string? pageType
        )
    {
        string type =
            (pageType ?? string.Empty).Trim().ToUpperInvariant();

        List<ProductPricing> rows =
            await _context
                .Set<ProductPricing>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && (type == string.Empty || x.PageType == type))
                .OrderByDescending(x => x.PricingDate)
                .ThenByDescending(x => x.ProductPricingId)
                .ToListAsync();

        return rows.Select(ToDto).ToList();
    }

    public async Task<ProductPricingDto?>
        GetByIdAsync
        (
            long id
        )
    {
        ProductPricing? entity =
            await _context
                .Set<ProductPricing>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.ProductPricingId == id && !x.IsDeleted);

        if (entity == null)
        {
            return null;
        }

        ProductPricingDto dto =
            ToDto(entity);

        dto.Lines =
            await _context
                .Set<ProductPricingLines>()
                .AsNoTracking()
                .Where(x => x.ProductPricingId == id)
                .OrderBy(x => x.LineNo)
                .Select
                (
                    x =>
                        new ProductPricingLineDto
                        {
                            ProductPricingLineId = x.ProductPricingLineId,
                            LineNo = x.LineNo,
                            ProductId = x.ProductId,
                            ProductCode = x.ProductCode,
                            ProductName = x.ProductName,
                            Unit = x.Unit,
                            StockBatchId = x.StockBatchId,
                            BatchNo = x.BatchNo,
                            SourceType = x.SourceType,
                            SourceNo = x.SourceNo,
                            BranchId = x.BranchId,
                            BranchName = x.BranchName,
                            Quantity = x.Quantity,
                            UnitCost = x.UnitCost,
                            OldMrp = x.OldMrp,
                            NewMrp = x.NewMrp,
                            Notes = x.Notes,
                            ReceivedQuantity = x.ReceivedQuantity,
                            ProfitPercent = x.ProfitPercent,
                            SuggestedMrp = x.SuggestedMrp,
                            IsRaised = x.IsRaised
                        }
                )
                .ToListAsync();

        return dto;
    }

    private static ProductPricingDto ToDto
    (
        ProductPricing x
    )
    {
        return new ProductPricingDto
        {
            ProductPricingId = x.ProductPricingId,
            PublicId = x.PublicId,
            PageType = x.PageType,
            PricingNo = x.PricingNo,
            PricingDate = DateText(x.PricingDate),
            Remarks = x.Remarks,
            PricingKind = x.PricingKind,
            PurchaseId = x.PurchaseId,
            PurchaseNo = x.PurchaseNo,
            SupplierName = x.SupplierName,
            PricingBasis = x.PricingBasis,
            BasisPercent = x.BasisPercent,
            ProductCount = x.ProductCount,
            BatchCount = x.BatchCount,
            Status = x.Status,
            PostedDate = DateText(x.PostedDate),
            CancelReason = x.CancelReason,
            CancelledDate = DateText(x.CancelledDate),
            CreatedDate = DateText(x.CreatedDate)
        };
    }


    //===========================================================
    // Defaults : next number, switch, sales VAT, products in stock
    //===========================================================

    public async Task<ProductPricingDefaultsDto>
        GetDefaultsAsync
        (
            string pageType
        )
    {
        string type =
            TypeOf(pageType);

        DateOnly today =
            BusinessToday();

        int last =
            await _context
                .Set<ProductPricing>()
                .AsNoTracking()
                .Where(x => x.PageType == type)
                .Select(x => (int?)x.SequenceNo)
                .MaxAsync()
            ??
            0;

        VatApplicabilityDto applicability =
            await _vatApplicability.GetAsync(type, today);

        ProductPricingDefaultsDto result =
            new()
            {
                PageType = type,
                Today = DateText(today),
                NextNumber = NumberOf(type, last + 1),
                ProfitOnSale = await IsSwitchOnAsync(SwitchProfitOnSale, false),
                GridEditable = await IsSwitchOnAsync(SwitchGridEditable, true),
                RaiseOldStock = await IsSwitchOnAsync(SwitchRaiseOldStock, true),
                ReductionAllStock = await IsSwitchOnAsync(SwitchReductionAllStock, false),
                SalesVatApplicable = applicability.SalesVatApplicable,
                SalesVatRules = await SalesVatRulesAsync(type)
            };

        // Batches of the type still in stock
        var batches =
            (
                await _context
                    .Set<StockBatchesEntity>()
                    .AsNoTracking()
                    .Where(x => x.ProductType == type && x.Status != BatchCancelled && x.Status != BatchClosed)
                    .Select(x => new { x.ProductId, x.StockBatchId, x.Mrp, x.QuantityOnHand, x.QuantityInTransit })
                    .ToListAsync()
            )
            .ToList();

        Dictionary<long, decimal> lastMrp =
            batches
                .Where(x => x.Mrp > 0m)
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.StockBatchId).First().Mrp);

        var stocked =
            batches
                .Where(x => x.QuantityOnHand + x.QuantityInTransit > 0m)
                .GroupBy(x => x.ProductId)
                .ToDictionary
                (
                    g => g.Key,
                    g => new
                    {
                        InStock = g.Sum(x => x.QuantityOnHand + x.QuantityInTransit),
                        Count = g.Count(),
                        Unpriced = g.Count(x => x.Mrp <= 0m)
                    }
                );

        // The declared MRP (price index) wins over the batches'
        foreach (var current in await AppCore.Infrastructure.Platform.Inventory.ProductPriceIndexWriter.CurrentAsync(_context, type))
        {
            lastMrp[current.Key] = current.Value.Mrp;
        }

        // Every product of the type, with or without stock (a
        // product without stock takes a declared price)
        List<ProductInfo> products =
            await ProductRowsAsync(type, null);

        result.Products =
            products
                .OrderBy(x => x.Code)
                .Select
                (
                    x =>
                        new ProductPricingProductDto
                        {
                            Id = x.Id,
                            Code = x.Code,
                            Name = x.Name,
                            PartNumber = x.PartNumber,
                            PartName = x.PartName,
                            CategoryId = x.CategoryId,
                            SubCategoryId = x.SubCategoryId,
                            Unit = x.Unit,
                            VatType = x.VatType,
                            BrandId = x.BrandId,
                            BrandName = x.BrandName,
                            InStock = stocked.TryGetValue(x.Id, out var s1) ? s1.InStock : 0m,
                            BatchCount = stocked.TryGetValue(x.Id, out var s2) ? s2.Count : 0,
                            UnpricedCount = stocked.TryGetValue(x.Id, out var s3) ? s3.Unpriced : 0,
                            LastMrp = lastMrp.GetValueOrDefault(x.Id)
                        }
                )
                .ToList();

        return result;
    }

    private async Task<List<ProductPricingVatRuleDto>>
        SalesVatRulesAsync
        (
            string type
        )
    {
        string[] vatTypes =
            VatTypesOf(type);

        return
            (
                await _context
                    .Set<SalesVatEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.Status && vatTypes.Contains(x.VatType))
                    .Select(x => new { x.VatType, x.VatRate, x.EffectiveFrom, x.ValidTo })
                    .ToListAsync()
            )
            .Select
            (
                x =>
                    new ProductPricingVatRuleDto
                    {
                        VatType = x.VatType,
                        Rate = x.VatRate,
                        EffectiveFrom = DateText(x.EffectiveFrom),
                        ValidTo = DateText(x.ValidTo)
                    }
            )
            .ToList();
    }

    // Sales VAT % of a VAT type on a date (0 = none / not applicable)
    private static decimal SalesVatRate
    (
        List<ProductPricingVatRuleDto> rules,
        string vatType,
        string isoDate
    )
    {
        return rules
            .Where
            (
                x =>
                    x.VatType == vatType
                    &&
                    string.CompareOrdinal(x.EffectiveFrom, isoDate) <= 0
                    &&
                    (x.ValidTo == string.Empty || string.CompareOrdinal(x.ValidTo, isoDate) >= 0)
            )
            .OrderByDescending(x => x.EffectiveFrom)
            .Select(x => x.Rate)
            .FirstOrDefault();
    }


    //===========================================================
    // Price List : the current MRP of every product of a type
    // (with or without stock), with its cost and stock.
    //   Current MRP : the declared MRP (price index), else the
    //                 latest priced batch (0 = unpriced).
    //   Avg Cost    : weighted average net unit cost of the
    //                 in-stock batches (0 = none in stock).
    //   Last Cost   : net unit cost of the latest batch (0 =
    //                 never purchased).
    //===========================================================

    public async Task<PriceListDto>
        GetPriceListAsync
        (
            string pageType
        )
    {
        string type =
            TypeOf(pageType);

        DateOnly today =
            BusinessToday();

        VatApplicabilityDto applicability =
            await _vatApplicability.GetAsync(type, today);

        PriceListDto result =
            new()
            {
                PageType = type,
                Today = DateText(today),
                ProfitOnSale = await IsSwitchOnAsync(SwitchProfitOnSale, false),
                SalesVatApplicable = applicability.SalesVatApplicable,
                SalesVatRules = await SalesVatRulesAsync(type)
            };

        // Every product of the type (with or without stock)
        List<ProductInfo> products =
            await ProductRowsAsync(type, null);

        // The batches of the type (cancelled ones never counted)
        var batches =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where(x => x.ProductType == type && x.Status != BatchCancelled)
                .Select
                (
                    x =>
                        new
                        {
                            x.ProductId,
                            x.StockBatchId,
                            x.SourceNo,
                            x.SourceDate,
                            x.Status,
                            x.UnitCost,
                            x.Mrp,
                            Quantity = x.QuantityOnHand + x.QuantityInTransit
                        }
                )
                .ToListAsync();

        var byProduct =
            batches.ToLookup(x => x.ProductId);

        // The declared MRP (price index) wins over the batches'
        Dictionary<long, (decimal Mrp, DateOnly Date, string SourceNo)> declared =
            await AppCore.Infrastructure.Platform.Inventory.ProductPriceIndexWriter.CurrentAsync(_context, type);

        // Category / sub category names
        List<long> categoryIds =
            products.Select(x => x.CategoryId).Distinct().ToList();

        List<long> subCategoryIds =
            products.Select(x => x.SubCategoryId).Distinct().ToList();

        Dictionary<long, string> categoryNames =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .Where(x => categoryIds.Contains(x.ProductCategoryId))
                .ToDictionaryAsync(x => x.ProductCategoryId, x => x.CategoryName ?? string.Empty);

        Dictionary<long, string> subCategoryNames =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .Where(x => subCategoryIds.Contains(x.ProductSubCategoryId))
                .ToDictionaryAsync(x => x.ProductSubCategoryId, x => x.SubCategoryName ?? string.Empty);

        result.Rows =
            products
                .Select
                (
                    x =>
                    {
                        var all =
                            byProduct[x.Id].ToList();

                        // Still in stock : not closed, something on
                        // hand or in transit
                        var stocked =
                            all
                                .Where(b => b.Status != BatchClosed && b.Quantity > 0m)
                                .ToList();

                        decimal inStock =
                            stocked.Sum(b => b.Quantity);

                        decimal avgCost =
                            inStock > 0m
                                ? Math.Round(stocked.Sum(b => b.Quantity * b.UnitCost) / inStock, 4, MidpointRounding.AwayFromZero)
                                : 0m;

                        decimal lastCost =
                            all
                                .OrderByDescending(b => b.StockBatchId)
                                .Select(b => b.UnitCost)
                                .FirstOrDefault();

                        decimal mrp = 0m;

                        string mrpDate = string.Empty;

                        string mrpSourceNo = string.Empty;

                        if (declared.TryGetValue(x.Id, out var index))
                        {
                            mrp = index.Mrp;

                            mrpDate = DateText(index.Date);

                            mrpSourceNo = index.SourceNo ?? string.Empty;
                        }
                        else
                        {
                            var priced =
                                all
                                    .Where(b => b.Mrp > 0m)
                                    .OrderByDescending(b => b.StockBatchId)
                                    .FirstOrDefault();

                            if (priced != null)
                            {
                                mrp = priced.Mrp;

                                mrpDate = DateText(priced.SourceDate);

                                mrpSourceNo = priced.SourceNo ?? string.Empty;
                            }
                        }

                        return new PriceListRowDto
                        {
                            ProductId = x.Id,
                            Code = x.Code,
                            Name = x.Name,
                            PartNumber = x.PartNumber,
                            PartName = x.PartName,
                            Unit = x.Unit,
                            VatType = x.VatType,
                            BrandId = x.BrandId,
                            BrandName = x.BrandName,
                            CategoryId = x.CategoryId,
                            CategoryName = categoryNames.GetValueOrDefault(x.CategoryId, string.Empty),
                            SubCategoryId = x.SubCategoryId,
                            SubCategoryName = subCategoryNames.GetValueOrDefault(x.SubCategoryId, string.Empty),
                            InStock = inStock,
                            AvgCost = avgCost,
                            LastCost = lastCost,
                            CurrentMrp = mrp,
                            MrpDate = mrpDate,
                            MrpSourceNo = mrpSourceNo,
                            BatchCount = stocked.Count,
                            UnpricedBatches = stocked.Count(b => b.Mrp <= 0m)
                        };
                    }
                )
                .OrderBy(x => x.CategoryName)
                .ThenBy(x => x.SubCategoryName)
                .ThenBy(x => x.Code)
                .ToList();

        return result;
    }


    //===========================================================
    // Excel import : the in-stock batches and last MRP of many
    // products in one call (three queries, no suggestions)
    //===========================================================

    public async Task<List<ProductPricingBatchListDto>>
        GetStocksAsync
        (
            string pageType,
            List<long> productIds
        )
    {
        string type =
            TypeOf(pageType);

        List<long> ids =
            (productIds ?? new List<long>())
                .Where(x => x > 0)
                .Distinct()
                .Take(5000)
                .ToList();

        if (ids.Count == 0)
        {
            return new List<ProductPricingBatchListDto>();
        }

        List<StockBatchesEntity> all =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where(x => x.ProductType == type && ids.Contains(x.ProductId) && x.Status != BatchCancelled)
                .ToListAsync();

        // The declared MRP (price index) wins over the batches'
        var declared =
            await AppCore.Infrastructure.Platform.Inventory.ProductPriceIndexWriter.CurrentAsync(_context, type, ids);

        List<long> branchIds =
            all.Where(InStock).Select(x => x.BranchId).Distinct().ToList();

        Dictionary<long, string> branches =
            await _context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => branchIds.Contains(x.BranchId))
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName ?? string.Empty);

        ILookup<long, StockBatchesEntity> byProduct =
            all.ToLookup(x => x.ProductId);

        return ids
            .Select
            (
                id =>
                {
                    List<StockBatchesEntity> rows =
                        byProduct[id].ToList();

                    decimal lastMrp =
                        declared.TryGetValue(id, out var index)
                            ? index.Mrp
                            : rows
                                .Where(x => x.Mrp > 0m)
                                .OrderByDescending(x => x.StockBatchId)
                                .Select(x => x.Mrp)
                                .FirstOrDefault();

                    return new ProductPricingBatchListDto
                    {
                        ProductId = id,
                        LastMrp = lastMrp,
                        Batches =
                            rows
                                .Where(InStock)
                                .OrderByDescending(x => x.StockBatchId)
                                .Select
                                (
                                    x =>
                                        new ProductPricingBatchDto
                                        {
                                            StockBatchId = x.StockBatchId,
                                            BatchNo = x.BatchNo,
                                            SourceType = x.SourceType,
                                            SourceNo = x.SourceNo,
                                            SourceDate = DateText(x.SourceDate),
                                            BranchId = x.BranchId,
                                            BranchName = branches.GetValueOrDefault(x.BranchId, string.Empty),
                                            Quantity = x.QuantityOnHand + x.QuantityInTransit,
                                            UnitCost = x.UnitCost,
                                            Mrp = x.Mrp
                                        }
                                )
                                .ToList()
                    };
                }
            )
            .ToList();
    }


    //===========================================================
    // Excel import : setup for parts not in the database
    //===========================================================

    private static readonly string[] NewItemUnits =
        new[] { "Pcs", "Set", "Pair", "Box", "Packet", "Litre", "Kg", "Meter", "Roll" };

    public async Task<NewItemSetupDto>
        GetNewItemSetupAsync
        (
            string pageType,
            long branchId
        )
    {
        string type =
            TypeOf(pageType);

        NewItemSetupDto result =
            new()
            {
                Units = NewItemUnits.ToList(),
                BranchId = branchId
            };

        if (type != "SP")
        {
            return result;
        }

        result.Categories =
            (
                await _context
                    .Set<ProductCategoryEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive && (x.CategoryType == VatSpareParts || x.CategoryType == VatLubricants))
                    .Select(x => new { x.ProductCategoryId, x.CategoryName, x.CategoryType })
                    .ToListAsync()
            )
            .OrderBy(x => x.CategoryName)
            .Select(x => new NewItemCategoryDto { Id = x.ProductCategoryId, Name = x.CategoryName ?? string.Empty, CategoryType = x.CategoryType ?? string.Empty })
            .ToList();

        List<long> categoryIds =
            result.Categories.Select(x => x.Id).ToList();

        result.SubCategories =
            (
                await _context
                    .Set<ProductSubCategoryEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive && categoryIds.Contains(x.ProductCategoryId))
                    .Select(x => new { x.ProductSubCategoryId, x.ProductCategoryId, x.SubCategoryName })
                    .ToListAsync()
            )
            .OrderBy(x => x.SubCategoryName)
            .Select(x => new NewItemSubCategoryDto { Id = x.ProductSubCategoryId, CategoryId = x.ProductCategoryId, Name = x.SubCategoryName ?? string.Empty })
            .ToList();

        if (branchId <= 0)
        {
            return result;
        }

        result.BranchName =
            await _context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => x.BranchId == branchId)
                .Select(x => x.BranchName ?? string.Empty)
                .FirstOrDefaultAsync()
            ??
            string.Empty;

        // The branch's default warehouse (else its first)
        var warehouse =
            await _context
                .Set<WarehousesEntity>()
                .AsNoTracking()
                .Where(x => x.BranchId == branchId && x.IsActive && !x.IsDeleted)
                .OrderByDescending(x => x.IsDefault)
                .ThenBy(x => x.WarehouseId)
                .Select(x => new { x.WarehouseId, x.WarehouseName })
                .FirstOrDefaultAsync();

        if (warehouse == null)
        {
            return result;
        }

        result.WarehouseId = warehouse.WarehouseId;

        result.WarehouseName = warehouse.WarehouseName ?? string.Empty;

        // Active racks of the warehouse with their free bins (one
        // item per bin, spare parts and accessories)
        List<AppCore.Application.Settings.ProductSettings.RackMapDto> racks =
            await AppCore.Infrastructure.Configurations.Settings.ProductSettings.BinOccupancy.GetRackMapAsync(
                _context,
                warehouse.WarehouseId,
                0,
                0,
                true);

        result.Racks =
            racks
                .OrderBy(x => x.RackCode)
                .Select
                (
                    x =>
                        new NewItemRackDto
                        {
                            Id = x.RackManagementId,
                            Name = string.IsNullOrWhiteSpace(x.RackName) ? x.RackCode : $"{x.RackCode} · {x.RackName}",
                            FreeShelves =
                                x.Shelves
                                    .Where(s => s.FreeBins > 0)
                                    .Select(s => s.ShelfNumber)
                                    .ToList(),
                            FreeBins =
                                x.Shelves
                                    .SelectMany
                                    (
                                        s =>
                                            s.Bins
                                                .Where(b => b.IsFree)
                                                .Select(b => new NewItemBinDto { ShelfNumber = s.ShelfNumber, BinNumber = b.BinNumber, BinCode = b.BinCode })
                                    )
                                    .ToList()
                        }
                )
                .ToList();

        return result;
    }


    //===========================================================
    // The in-stock batches of a product, with suggestions
    //===========================================================

    public async Task<ProductPricingBatchListDto>
        GetBatchesAsync
        (
            string pageType,
            long productId
        )
    {
        string type =
            TypeOf(pageType);

        ProductInfo product =
            (await ProductRowsAsync(type, new List<long> { productId })).FirstOrDefault()
            ??
            throw new KeyNotFoundException("Product not found.");

        List<StockBatchesEntity> all =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where(x => x.ProductType == type && x.ProductId == productId && x.Status != BatchCancelled)
                .ToListAsync();

        decimal lastMrp =
            all
                .Where(x => x.Mrp > 0m)
                .OrderByDescending(x => x.StockBatchId)
                .Select(x => x.Mrp)
                .FirstOrDefault();

        // The declared MRP (price index) wins over the batches'
        var declared =
            await AppCore.Infrastructure.Platform.Inventory.ProductPriceIndexWriter.CurrentAsync(_context, type, new List<long> { productId });

        if (declared.TryGetValue(productId, out var index))
        {
            lastMrp = index.Mrp;
        }

        List<StockBatchesEntity> batches =
            all
                .Where(InStock)
                .OrderByDescending(x => x.StockBatchId)
                .ToList();

        // Branch and supplier names
        List<long> branchIds =
            batches.Select(x => x.BranchId).Distinct().ToList();

        Dictionary<long, string> branches =
            await _context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => branchIds.Contains(x.BranchId))
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName ?? string.Empty);

        List<string> supplierCodes =
            batches
                .Where(x => !string.IsNullOrWhiteSpace(x.SupplierCode))
                .Select(x => x.SupplierCode)
                .Distinct()
                .ToList();

        var suppliers =
            (
                await _context
                    .Set<SupplierProfilesEntity>()
                    .AsNoTracking()
                    .Where(x => supplierCodes.Contains(x.SupplierCode))
                    .Select(x => new { x.SupplierCode, x.SupplierName, x.DefaultProfitPercent, x.DefaultProfitOn })
                    .ToListAsync()
            )
            .GroupBy(x => x.SupplierCode)
            .ToDictionary(g => g.Key, g => g.First());

        // Sales VAT inside the MRP
        DateOnly today =
            BusinessToday();

        VatApplicabilityDto applicability =
            await _vatApplicability.GetAsync(type, today);

        decimal salesVat =
            applicability.SalesVatApplicable
                ? SalesVatRate(await SalesVatRulesAsync(type), product.VatType, DateText(today))
                : 0m;

        // DP-invoice batch : cost × (1 + profit % on DP), plus the
        // sales VAT, up to the whole taka
        decimal Suggest(StockBatchesEntity batch)
        {
            if
            (
                batch.SourceType != SourcePurchase
                ||
                !suppliers.TryGetValue(batch.SupplierCode ?? string.Empty, out var supplier)
                ||
                !string.Equals(supplier.DefaultProfitOn, "DP", StringComparison.OrdinalIgnoreCase)
                ||
                (supplier.DefaultProfitPercent ?? 0m) <= 0m
                ||
                batch.UnitCost <= 0m
            )
            {
                return 0m;
            }

            decimal value =
                batch.UnitCost
                * (1m + (supplier.DefaultProfitPercent ?? 0m) / 100m)
                * (1m + salesVat / 100m);

            return Math.Ceiling(Math.Round(value, 4, MidpointRounding.AwayFromZero));
        }

        long newest =
            batches.Count > 0 ? batches[0].StockBatchId : 0;

        ProductPricingBatchListDto result =
            new()
            {
                ProductId = productId,
                LastMrp = lastMrp,
                Batches =
                    batches
                        .Select
                        (
                            x =>
                                new ProductPricingBatchDto
                                {
                                    StockBatchId = x.StockBatchId,
                                    BatchNo = x.BatchNo,
                                    SourceType = x.SourceType,
                                    SourceNo = x.SourceNo,
                                    SourceDate = DateText(x.SourceDate),
                                    SupplierName = suppliers.TryGetValue(x.SupplierCode ?? string.Empty, out var s) ? s.SupplierName ?? string.Empty : string.Empty,
                                    BranchId = x.BranchId,
                                    BranchName = branches.GetValueOrDefault(x.BranchId, string.Empty),
                                    Quantity = x.QuantityOnHand + x.QuantityInTransit,
                                    UnitCost = x.UnitCost,
                                    Mrp = x.Mrp,
                                    SuggestedMrp = Suggest(x),
                                    DefaultTicked = x.Mrp <= 0m || x.StockBatchId == newest
                                }
                        )
                        .ToList()
            };

        // The product's suggestion : the highest DP-invoice
        // suggestion among its unpriced batches, else its last MRP
        decimal fromSupplier =
            result.Batches
                .Where(x => x.Mrp <= 0m && x.SuggestedMrp > 0m)
                .Select(x => x.SuggestedMrp)
                .DefaultIfEmpty(0m)
                .Max();

        if (fromSupplier > 0m)
        {
            result.SuggestedMrp = fromSupplier;

            result.SuggestionNote =
                salesVat > 0m
                    ? $"Cost + supplier profit % + sales VAT {salesVat:0.##}%, up to the whole taka"
                    : "Cost + supplier profit %, up to the whole taka";
        }
        else if (lastMrp > 0m)
        {
            result.SuggestedMrp = lastMrp;

            result.SuggestionNote = "The product's last MRP";
        }

        // Never below the cost of a default-ticked batch
        decimal floor =
            result.Batches
                .Where(x => x.DefaultTicked)
                .Select(x => Math.Ceiling(Money(x.UnitCost)))
                .DefaultIfEmpty(0m)
                .Max();

        if (result.SuggestedMrp > 0m && result.SuggestedMrp < floor)
        {
            result.SuggestedMrp = floor;

            result.SuggestionNote = "Raised to the cost of the ticked batches";
        }

        return result;
    }


    //===========================================================
    // New Pricing : purchase invoices and their received lines
    //===========================================================

    private sealed class InvoiceHead
    {
        public long Id { get; set; }

        public string No { get; set; } = string.Empty;

        public DateOnly Date { get; set; }

        public string SupplierCode { get; set; } = string.Empty;

        public string SupplierName { get; set; } = string.Empty;

        public string Basis { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;
    }

    private async Task<List<InvoiceHead>>
        InvoiceHeadsAsync
        (
            string type,
            List<long> ids
        )
    {
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
                        SupplierCode = x.SupplierCode,
                        SupplierName = x.SupplierName,
                        Basis = x.InvoicePriceBasis,
                        Status = x.Status
                    }
            )
            .ToListAsync();
    }

    public async Task<List<ProductPricingInvoiceDto>>
        GetInvoicesAsync
        (
            string pageType
        )
    {
        string type =
            TypeOf(pageType);

        var batches =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where(x => x.ProductType == type && x.SourceType == SourcePurchase && x.Status != BatchCancelled)
                .Select(x => new { x.SourceId, x.Quantity, x.QuantityInTransit, x.Mrp })
                .ToListAsync();

        var perInvoice =
            batches
                .GroupBy(x => x.SourceId)
                .Select
                (
                    g => new
                    {
                        Id = g.Key,
                        Received = g.Count(x => x.Quantity - x.QuantityInTransit > 0m),
                        Unpriced = g.Count(x => x.Quantity - x.QuantityInTransit > 0m && x.Mrp <= 0m),
                        Pending = g.Count(x => x.Quantity - x.QuantityInTransit <= 0m)
                    }
                )
                .Where(x => x.Received > 0)
                .ToDictionary(x => x.Id);

        List<InvoiceHead> heads =
            await InvoiceHeadsAsync(type, perInvoice.Keys.ToList());

        return heads
            .Where(x => x.Status == PurchasePosted)
            .Select
            (
                x =>
                    new ProductPricingInvoiceDto
                    {
                        PurchaseId = x.Id,
                        PurchaseNo = x.No,
                        PurchaseDate = DateText(x.Date),
                        SupplierCode = x.SupplierCode,
                        SupplierName = x.SupplierName,
                        InvoicePriceBasis = x.Basis,
                        ReceivedLines = perInvoice[x.Id].Received,
                        UnpricedLines = perInvoice[x.Id].Unpriced,
                        PendingLines = perInvoice[x.Id].Pending
                    }
            )
            // Unpriced first, then the newest
            .OrderByDescending(x => x.UnpricedLines > 0)
            .ThenByDescending(x => x.PurchaseDate)
            .ThenByDescending(x => x.PurchaseId)
            .Take(1000)
            .ToList();
    }

    public async Task<ProductPricingInvoiceLinesDto>
        GetInvoiceAsync
        (
            string pageType,
            long purchaseId
        )
    {
        string type =
            TypeOf(pageType);

        InvoiceHead head =
            (await InvoiceHeadsAsync(type, new List<long> { purchaseId })).FirstOrDefault()
            ??
            throw new KeyNotFoundException("Purchase invoice not found.");

        if (head.Status != PurchasePosted)
        {
            throw new InvalidOperationException(
                $"Purchase {head.No} is {head.Status}; only a posted invoice is priced.");
        }

        List<StockBatchesEntity> lines =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where(x => x.ProductType == type && x.SourceType == SourcePurchase && x.SourceId == purchaseId && x.Status != BatchCancelled)
                .OrderBy(x => x.SourceLineId)
                .ToListAsync();

        List<StockBatchesEntity> received =
            lines.Where(x => x.Quantity - x.QuantityInTransit > 0m).ToList();

        List<long> productIds =
            received.Select(x => x.ProductId).Distinct().ToList();

        Dictionary<long, ProductInfo> products =
            (await ProductRowsAsync(type, productIds)).ToDictionary(x => x.Id);

        // Stock in hand of each product (every batch)
        Dictionary<long, decimal> stock =
            (
                await _context
                    .Set<StockBatchesEntity>()
                    .AsNoTracking()
                    .Where(x => x.ProductType == type && productIds.Contains(x.ProductId) && x.Status != BatchCancelled && x.Status != BatchClosed)
                    .Select(x => new { x.ProductId, x.QuantityOnHand, x.QuantityInTransit })
                    .ToListAsync()
            )
            .GroupBy(x => x.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.QuantityOnHand + x.QuantityInTransit));

        var declared =
            await AppCore.Infrastructure.Platform.Inventory.ProductPriceIndexWriter.CurrentAsync(_context, type, productIds);

        List<long> branchIds =
            received.Select(x => x.BranchId).Distinct().ToList();

        Dictionary<long, string> branches =
            await _context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => branchIds.Contains(x.BranchId))
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName ?? string.Empty);

        // Sales VAT inside the MRP, on the effective date (today)
        DateOnly today =
            BusinessToday();

        VatApplicabilityDto applicability =
            await _vatApplicability.GetAsync(type, today);

        List<ProductPricingVatRuleDto> rules =
            applicability.SalesVatApplicable
                ? await SalesVatRulesAsync(type)
                : new List<ProductPricingVatRuleDto>();

        // The supplier's terms
        var supplier =
            await _context
                .Set<SupplierProfilesEntity>()
                .AsNoTracking()
                .Where(x => x.SupplierCode == head.SupplierCode)
                .Select(x => new { x.DefaultProfitPercent, x.DefaultProfitOn })
                .FirstOrDefaultAsync();

        string supplierOn =
            (supplier?.DefaultProfitOn ?? string.Empty).Trim().ToUpperInvariant();

        decimal supplierPercent =
            supplier?.DefaultProfitPercent ?? 0m;

        return new ProductPricingInvoiceLinesDto
        {
            Invoice =
                new ProductPricingInvoiceDto
                {
                    PurchaseId = head.Id,
                    PurchaseNo = head.No,
                    PurchaseDate = DateText(head.Date),
                    SupplierCode = head.SupplierCode,
                    SupplierName = head.SupplierName,
                    InvoicePriceBasis = head.Basis,
                    ReceivedLines = received.Count,
                    UnpricedLines = received.Count(x => x.Mrp <= 0m),
                    PendingLines = lines.Count - received.Count
                },
            // DP = profit % on the DP (cost); MRP = margin % on MRP
            SupplierBasis =
                supplierPercent <= 0m
                    ? string.Empty
                    : supplierOn == "DP"
                        ? BasisCost
                        : supplierOn == "MRP"
                            ? BasisMargin
                            : string.Empty,
            SupplierPercent = supplierPercent,
            Lines =
                received
                    .Where(x => products.ContainsKey(x.ProductId))
                    .Select
                    (
                        x =>
                        {
                            ProductInfo product =
                                products[x.ProductId];

                            return new ProductPricingInvoiceLineDto
                            {
                                StockBatchId = x.StockBatchId,
                                BatchNo = x.BatchNo,
                                PurchaseLineId = x.SourceLineId,
                                ProductId = x.ProductId,
                                ProductCode = product.Code,
                                ProductName = product.Name,
                                Unit = product.Unit,
                                VatType = product.VatType,
                                SalesVatRate = SalesVatRate(rules, product.VatType, DateText(today)),
                                BranchId = x.BranchId,
                                BranchName = branches.GetValueOrDefault(x.BranchId, string.Empty),
                                Quantity = x.Quantity,
                                ReceivedQuantity = x.Quantity - x.QuantityInTransit,
                                UnitCost = x.UnitCost,
                                Mrp = x.Mrp,
                                LastMrp = declared.TryGetValue(x.ProductId, out var d) ? d.Mrp : 0m,
                                LastMrpDate = declared.TryGetValue(x.ProductId, out var e) ? DateText(e.Date) : string.Empty,
                                ProductStock = stock.GetValueOrDefault(x.ProductId)
                            };
                        }
                    )
                    .ToList()
        };
    }


    //===========================================================
    // Products of a type (live) : code, name, unit, VAT type
    //===========================================================

    private sealed class ProductInfo
    {
        public long Id { get; set; }

        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        // The maker's part number / name (MB : the model name)
        public string PartNumber { get; set; } = string.Empty;

        public string PartName { get; set; } = string.Empty;

        public string Unit { get; set; } = string.Empty;

        public long CategoryId { get; set; }

        public long SubCategoryId { get; set; }

        public string InventoryLedgerCode { get; set; } = string.Empty;

        // Motor Bikes / Spare Parts / Lubricants / Accessories
        public string VatType { get; set; } = string.Empty;

        // Brand of its category (0 / '' = none)
        public long BrandId { get; set; }

        public string BrandName { get; set; } = string.Empty;
    }

    private async Task<List<ProductInfo>>
        ProductRowsAsync
        (
            string type,
            List<long>? ids
        )
    {
        List<ProductInfo> rows =
            await ProductRowsCoreAsync(type, ids);

        // The categories : Spare Parts or Lubricants, and the brand
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
            .ToDictionary(x => x.ProductCategoryId);

        List<long> brandIds =
            categories.Values
                .Where(x => x.BrandManagementId.HasValue)
                .Select(x => x.BrandManagementId!.Value)
                .Distinct()
                .ToList();

        Dictionary<long, string> brands =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .Where(x => brandIds.Contains(x.BrandManagementId))
                .ToDictionaryAsync(x => x.BrandManagementId, x => x.BrandName ?? string.Empty);

        string fixedVat =
            type == "MB" ? VatMotorBikes : VatAccessories;

        rows.ForEach
        (
            x =>
            {
                var category =
                    categories.GetValueOrDefault(x.CategoryId);

                x.BrandId = category?.BrandManagementId ?? 0;

                x.BrandName = brands.GetValueOrDefault(x.BrandId, string.Empty);

                // A category saved before the brand field : its name
                // ("<Brand> <Type>") stands for the brand
                if (x.BrandId == 0 || x.BrandName.Length == 0)
                {
                    string name =
                        (category?.CategoryName ?? string.Empty).Trim();

                    string kind =
                        (category?.CategoryType ?? string.Empty).Trim();

                    if (kind.Length > 0 && name.EndsWith(kind, StringComparison.OrdinalIgnoreCase))
                    {
                        name = name[..^kind.Length].Trim();
                    }

                    x.BrandId = category != null ? -category.ProductCategoryId : 0;

                    x.BrandName = name;
                }

                x.VatType =
                    type != "SP"
                        ? fixedVat
                        : string.Equals((category?.CategoryType ?? string.Empty).Trim(), VatLubricants, StringComparison.OrdinalIgnoreCase)
                            ? VatLubricants
                            : VatSpareParts;
            }
        );

        return rows;
    }

    private async Task<List<ProductInfo>>
        ProductRowsCoreAsync
        (
            string type,
            List<long>? ids
        )
    {
        if (type == "MB")
        {
            return await _context
                .Set<MotorBikesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && (ids == null || ids.Contains(x.MotorBikeId)))
                .Select
                (
                    x =>
                        new ProductInfo
                        {
                            Id = x.MotorBikeId,
                            Code = x.ProductCode,
                            Name = x.ProductName,
                            PartNumber = string.Empty,
                            PartName = x.ProductName,
                            Unit = "Pcs",
                            CategoryId = x.ProductCategoryId,
                            SubCategoryId = x.ProductSubCategoryId,
                            InventoryLedgerCode = x.InventoryLedgerCode ?? string.Empty
                        }
                )
                .ToListAsync();
        }

        if (type == "SP")
        {
            return await _context
                .Set<SparePartsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && (ids == null || ids.Contains(x.SparePartId)))
                .Select
                (
                    x =>
                        new ProductInfo
                        {
                            Id = x.SparePartId,
                            Code = x.ProductCode,
                            Name = x.PartNumber + " - " + x.PartName,
                            PartNumber = x.PartNumber ?? string.Empty,
                            PartName = x.PartName ?? string.Empty,
                            Unit = x.Unit,
                            CategoryId = x.ProductCategoryId,
                            SubCategoryId = x.ProductSubCategoryId,
                            InventoryLedgerCode = x.InventoryLedgerCode ?? string.Empty
                        }
                )
                .ToListAsync();
        }

        return
            (
                await _context
                    .Set<AccessoriesEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && (ids == null || ids.Contains(x.AccessoryId)))
                    .Select(x => new { x.AccessoryId, x.ProductCode, x.PartNumber, x.AccessoryName, x.Unit, x.ProductCategoryId, x.ProductSubCategoryId, x.InventoryLedgerCode })
                    .ToListAsync()
            )
            .Select
            (
                x =>
                    new ProductInfo
                    {
                        Id = x.AccessoryId,
                        Code = x.ProductCode,
                        Name = string.IsNullOrWhiteSpace(x.PartNumber) ? x.AccessoryName : $"{x.PartNumber} - {x.AccessoryName}",
                        PartNumber = x.PartNumber ?? string.Empty,
                        PartName = x.AccessoryName ?? string.Empty,
                        Unit = x.Unit,
                        CategoryId = x.ProductCategoryId,
                        SubCategoryId = x.ProductSubCategoryId,
                        InventoryLedgerCode = x.InventoryLedgerCode ?? string.Empty
                    }
            )
            .ToList();
    }



    //===========================================================
    // Input checked against the database
    //===========================================================

    private sealed class Resolved
    {
        public string Type { get; set; } = string.Empty;

        public DateOnly Date { get; set; }

        public string Remarks { get; set; } = string.Empty;

        public string Kind { get; set; } = KindReprice;

        public long PurchaseId { get; set; }

        public string PurchaseNo { get; set; } = string.Empty;

        public string SupplierCode { get; set; } = string.Empty;

        public string SupplierName { get; set; } = string.Empty;

        public string Basis { get; set; } = string.Empty;

        public decimal Percent { get; set; }

        public List<ProductPricingLines> Lines { get; set; } = new();
    }

    private async Task<Resolved>
        ResolveAsync
        (
            CreateProductPricingDto dto,
            bool posting
        )
    {
        string type =
            TypeOf(dto.PageType);

        DateOnly date =
            ParseDate(dto.PricingDate, "The effective date");

        string kind =
            string.Equals((dto.PricingKind ?? string.Empty).Trim(), KindNew, StringComparison.OrdinalIgnoreCase)
                ? KindNew
                : KindReprice;

        // New : the posted purchase invoice
        InvoiceHead? invoice =
            null;

        if (kind == KindNew)
        {
            invoice =
                (await InvoiceHeadsAsync(type, new List<long> { dto.PurchaseId })).FirstOrDefault();

            if (invoice == null || invoice.Status != PurchasePosted)
            {
                throw new InvalidOperationException(
                    "Choose a posted purchase invoice to price.");
            }
        }

        string basis =
            kind != KindNew
                ? string.Empty
                : string.Equals((dto.PricingBasis ?? string.Empty).Trim(), BasisMargin, StringComparison.OrdinalIgnoreCase)
                    ? BasisMargin
                    : BasisCost;

        if (kind == KindNew && (dto.BasisPercent < 0m || dto.BasisPercent >= (basis == BasisMargin ? 100m : 1000m)))
        {
            throw new InvalidOperationException(
                basis == BasisMargin
                    ? "The margin % is 0 to below 100."
                    : "The profit % is 0 to below 1000.");
        }

        List<CreateProductPricingLineDto> input =
            dto.Lines ?? new List<CreateProductPricingLineDto>();

        if (input.Count == 0)
        {
            throw new InvalidOperationException(
                "Add at least one product with its batches.");
        }

        if (input.Count > MaxLines)
        {
            throw new InvalidOperationException(
                $"At most {MaxLines} batches on one price change.");
        }

        if (input.Where(x => x.StockBatchId > 0).GroupBy(x => x.StockBatchId).Any(g => g.Count() > 1))
        {
            throw new InvalidOperationException(
                "A batch is on the list twice.");
        }

        List<long> productIds =
            input.Select(x => x.ProductId).Distinct().ToList();

        Dictionary<long, ProductInfo> products =
            (await ProductRowsAsync(type, productIds))
                .ToDictionary(x => x.Id);

        List<long> batchIds =
            input.Where(x => x.StockBatchId > 0).Select(x => x.StockBatchId).Distinct().ToList();

        Dictionary<long, StockBatchesEntity> batches =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where(x => batchIds.Contains(x.StockBatchId))
                .ToDictionaryAsync(x => x.StockBatchId);

        // Declared-price lines (no batch) : the product's MRP now
        List<long> declaredIds =
            input.Where(x => x.StockBatchId <= 0).Select(x => x.ProductId).Distinct().ToList();

        var declaredNow =
            declaredIds.Count > 0
                ? await AppCore.Infrastructure.Platform.Inventory.ProductPriceIndexWriter.CurrentAsync(_context, type, declaredIds)
                : null;

        List<long> branchIds =
            batches.Values.Select(x => x.BranchId).Distinct().ToList();

        Dictionary<long, string> branches =
            await _context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => branchIds.Contains(x.BranchId))
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName ?? string.Empty);

        Resolved result =
            new()
            {
                Type = type,
                Date = date,
                Remarks = Limit(dto.Remarks, 500),
                Kind = kind,
                PurchaseId = invoice?.Id ?? 0,
                PurchaseNo = Limit(invoice?.No, 30),
                SupplierCode = Limit(invoice?.SupplierCode, 40),
                SupplierName = Limit(invoice?.SupplierName, 200),
                Basis = basis,
                Percent = kind == KindNew ? Math.Round(dto.BasisPercent, 4) : 0m
            };

        foreach (IGrouping<long, CreateProductPricingLineDto> group in input.GroupBy(x => x.ProductId))
        {
            if (!products.TryGetValue(group.Key, out ProductInfo? product))
            {
                throw new InvalidOperationException(
                    $"A product on the list is not a {TitleOf(type).ToLowerInvariant()} product (or was deleted).");
            }

            decimal mrp =
                group.First().NewMrp;

            if (group.Any(x => x.NewMrp != mrp))
            {
                throw new InvalidOperationException(
                    $"{product.Name} : all its batches take one new MRP.");
            }

            if (mrp <= 0m)
            {
                throw new InvalidOperationException(
                    $"{product.Name} : enter the new MRP (it is the sale price).");
            }

            if (mrp != Math.Round(mrp, 2))
            {
                throw new InvalidOperationException(
                    $"{product.Name} : the MRP can have at most 2 decimals.");
            }

            // Repricing : a declared price only (no stock taking it :
            // no stock, or a reduction its stock does not take). The
            // price index takes it; new purchases follow it
            if (group.Any(x => x.StockBatchId <= 0))
            {
                if (kind == KindNew)
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : an invoice line needs its batch.");
                }

                if (group.Count() > 1)
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : a declared price is the product's only line.");
                }

                decimal current =
                    declaredNow != null && declaredNow.TryGetValue(product.Id, out var now0)
                        ? now0.Mrp
                        : 0m;

                if (current == mrp)
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : {mrp:N2} is already its MRP.");
                }

                result.Lines.Add(
                    new ProductPricingLines
                    {
                        ProductId = product.Id,
                        ProductCode = Limit(product.Code, 40),
                        ProductName = Limit(product.Name, 250),
                        Unit = Limit(product.Unit, 30),
                        StockBatchId = 0,
                        BatchNo = string.Empty,
                        SourceType = SourceDeclared,
                        SourceNo = string.Empty,
                        BranchId = 0,
                        BranchName = string.Empty,
                        Quantity = 0m,
                        UnitCost = 0m,
                        OldMrp = current,
                        NewMrp = mrp,
                        Notes = Limit(group.First().Notes, 200),
                        SuggestedMrp = Money(group.First().SuggestedMrp)
                    });

                continue;
            }

            foreach (CreateProductPricingLineDto line in group)
            {
                if (!batches.TryGetValue(line.StockBatchId, out StockBatchesEntity? batch)
                    || batch.ProductType != type
                    || batch.ProductId != product.Id)
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : a batch on the list is not this product's.");
                }

                decimal received =
                    batch.Quantity - batch.QuantityInTransit;

                if (kind == KindNew)
                {
                    // A received line of this invoice (sold or not)
                    if (batch.SourceType != SourcePurchase || batch.SourceId != result.PurchaseId || batch.Status == BatchCancelled)
                    {
                        throw new InvalidOperationException(
                            $"{product.Name} : batch {batch.BatchNo} is not a line of purchase {result.PurchaseNo}.");
                    }

                    if (received <= 0m)
                    {
                        throw new InvalidOperationException(
                            $"{product.Name} : batch {batch.BatchNo} is not received yet; it is priced after its receiving.");
                    }
                }
                else if (!InStock(batch))
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : batch {batch.BatchNo} is no longer in stock. Untick it.");
                }

                // MRP (the sale price) is never below the cost
                if (mrp < Money(batch.UnitCost))
                {
                    throw new InvalidOperationException(
                        $"{product.Name} : the MRP {mrp:N2} is below the cost {batch.UnitCost:N2} of batch {batch.BatchNo}. MRP must be equal to or more than the cost.");
                }

                result.Lines.Add(
                    new ProductPricingLines
                    {
                        ProductId = product.Id,
                        ProductCode = Limit(product.Code, 40),
                        ProductName = Limit(product.Name, 250),
                        Unit = Limit(product.Unit, 30),
                        StockBatchId = batch.StockBatchId,
                        BatchNo = Limit(batch.BatchNo, 40),
                        SourceType = Limit(batch.SourceType, 20),
                        SourceNo = Limit(batch.SourceNo, 40),
                        BranchId = batch.BranchId,
                        BranchName = Limit(branches.GetValueOrDefault(batch.BranchId, string.Empty), 150),
                        Quantity = batch.QuantityOnHand + batch.QuantityInTransit,
                        UnitCost = batch.UnitCost,
                        OldMrp = batch.Mrp,
                        NewMrp = mrp,
                        Notes = Limit(line.Notes, 200),
                        PurchaseLineId = kind == KindNew ? batch.SourceLineId : 0,
                        ReceivedQuantity = kind == KindNew ? received : 0m,
                        ProfitPercent = kind == KindNew ? Math.Round(line.ProfitPercent, 4) : 0m,
                        SuggestedMrp = Money(line.SuggestedMrp),
                        SupplierCode = Limit(batch.SupplierCode, 40)
                    });
            }
        }

        return result;
    }

    private static void FillHeader
    (
        ProductPricing entity,
        Resolved input
    )
    {
        entity.PageType = input.Type;
        entity.PricingDate = input.Date;
        entity.Remarks = input.Remarks;
        entity.PricingKind = input.Kind;
        entity.PurchaseId = input.PurchaseId;
        entity.PurchaseNo = input.PurchaseNo;
        entity.SupplierCode = input.SupplierCode;
        entity.SupplierName = input.SupplierName;
        entity.PricingBasis = input.Basis;
        entity.BasisPercent = input.Percent;
        entity.ProductCount = input.Lines.Select(x => x.ProductId).Distinct().Count();
        entity.BatchCount = input.Lines.Count(x => x.StockBatchId > 0);
    }

    private async Task WriteLinesAsync
    (
        ProductPricing entity,
        Resolved input
    )
    {
        List<ProductPricingLines> old =
            await _context
                .Set<ProductPricingLines>()
                .Where(x => x.ProductPricingId == entity.ProductPricingId)
                .ToListAsync();

        _context.Set<ProductPricingLines>().RemoveRange(old);

        int lineNo = 0;

        foreach (ProductPricingLines line in input.Lines.OrderBy(x => x.ProductCode).ThenByDescending(x => x.StockBatchId))
        {
            line.ProductPricingId = entity.ProductPricingId;

            line.LineNo = ++lineNo;

            _context.Set<ProductPricingLines>().Add(line);
        }
    }


    //===========================================================
    // Draft : save / change / delete
    //===========================================================

    public async Task<ProductPricingSavedDto>
        CreateAsync
        (
            CreateProductPricingDto dto,
            long userId
        )
    {
        Resolved input =
            await ResolveAsync(dto, false);

        DateTime now =
            DateTime.UtcNow;

        ProductPricing entity =
            new()
            {
                Status = StatusDraft,
                CancelReason = string.Empty,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = now
            };

        FillHeader(entity, input);

        await InTransactionAsync(
            async () =>
            {
                // One writer per type for the number
                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT pg_advisory_xact_lock({0}, {1})",
                    NumberLockClass,
                    Array.IndexOf(new[] { "MB", "SP", "AC" }, input.Type));

                int last =
                    await _context
                        .Set<ProductPricing>()
                        .Where(x => x.PageType == input.Type)
                        .Select(x => (int?)x.SequenceNo)
                        .MaxAsync()
                    ??
                    0;

                entity.SequenceNo =
                    last + 1;

                entity.PricingNo =
                    NumberOf(input.Type, entity.SequenceNo);

                _context.Set<ProductPricing>().Add(entity);

                await _context.SaveChangesAsync();

                await WriteLinesAsync(entity, input);

                AddHistory(entity, "Create", "Saved", userId, now);

                await _context.SaveChangesAsync();
            });

        return new ProductPricingSavedDto
        {
            ProductPricingId = entity.ProductPricingId,
            PublicId = entity.PublicId,
            PricingNo = entity.PricingNo,
            Status = entity.Status
        };
    }

    public async Task<ProductPricingSavedDto>
        UpdateAsync
        (
            long id,
            UpdateProductPricingDto dto,
            long userId
        )
    {
        ProductPricing entity =
            await _context
                .Set<ProductPricing>()
                .FirstOrDefaultAsync(x => x.ProductPricingId == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException("Price change not found.");

        if (entity.Status != StatusDraft)
        {
            throw new InvalidOperationException(
                $"Price change {entity.PricingNo} is {entity.Status}; only a draft can be changed.");
        }

        // The type is fixed after the first save
        dto.PageType = entity.PageType;

        Resolved input =
            await ResolveAsync(dto, false);

        DateTime now =
            DateTime.UtcNow;

        await InTransactionAsync(
            async () =>
            {
                FillHeader(entity, input);

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                await WriteLinesAsync(entity, input);

                AddHistory(entity, "Update", "Updated", userId, now);

                await _context.SaveChangesAsync();
            });

        return new ProductPricingSavedDto
        {
            ProductPricingId = entity.ProductPricingId,
            PublicId = entity.PublicId,
            PricingNo = entity.PricingNo,
            Status = entity.Status
        };
    }

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        DateTime now =
            DateTime.UtcNow;

        ProductPricing entity =
            await _context
                .Set<ProductPricing>()
                .FirstOrDefaultAsync(x => x.ProductPricingId == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException("Price change not found.");

        if (entity.Status != StatusDraft)
        {
            throw new InvalidOperationException(
                $"Price change {entity.PricingNo} is {entity.Status}; only a draft can be deleted (cancel a posted one).");
        }

        entity.IsDeleted = true;

        entity.DeletedBy = userId;

        entity.DeletedDate = now;

        AddHistory(entity, "Delete", "Deleted", userId, now);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Post : every line's batch takes the new MRP
    //===========================================================

    public async Task<ProductPricingSavedDto>
        PostAsync
        (
            long id,
            long userId
        )
    {
        ProductPricingDto saved =
            await GetByIdAsync(id)
            ??
            throw new KeyNotFoundException("Price change not found.");

        if (saved.Status != StatusDraft)
        {
            throw new InvalidOperationException(
                $"Price change {saved.PricingNo} is {saved.Status}; only a draft can be posted.");
        }

        // The saved draft, checked again with today's stock and costs
        Resolved input =
            await ResolveAsync(
                new CreateProductPricingDto
                {
                    PageType = saved.PageType,
                    PricingDate = saved.PricingDate,
                    Remarks = saved.Remarks,
                    PricingKind = saved.PricingKind,
                    PurchaseId = saved.PurchaseId,
                    PricingBasis = saved.PricingBasis,
                    BasisPercent = saved.BasisPercent,
                    Lines =
                        saved.Lines
                            .Select
                            (
                                x =>
                                    new CreateProductPricingLineDto
                                    {
                                        ProductId = x.ProductId,
                                        StockBatchId = x.StockBatchId,
                                        NewMrp = x.NewMrp,
                                        Notes = x.Notes,
                                        ProfitPercent = x.ProfitPercent,
                                        SuggestedMrp = x.SuggestedMrp
                                    }
                            )
                            .Where(x => !saved.Lines.Any(l => l.StockBatchId == x.StockBatchId && l.IsRaised))
                            .ToList()
                },
                true);

        DateTime now =
            DateTime.UtcNow;

        ProductPricing entity =
            await _context
                .Set<ProductPricing>()
                .FirstAsync(x => x.ProductPricingId == id);

        await InTransactionAsync(
            async () =>
            {
                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT 1 FROM \"ProductPricing\" WHERE \"ProductPricingId\" = {0} FOR UPDATE",
                    id);

                List<long> batchIds =
                    input.Lines.Where(x => x.StockBatchId > 0).Select(x => x.StockBatchId).ToList();

                Dictionary<long, StockBatchesEntity> batches =
                    await _context
                        .Set<StockBatchesEntity>()
                        .Where(x => batchIds.Contains(x.StockBatchId))
                        .ToDictionaryAsync(x => x.StockBatchId);

                // New : older stock of the products with a lower MRP is
                // raised to the new one (switch 0012), when the new MRP
                // covers its cost; kept as lines so a cancel gives back
                if (input.Kind == KindNew && await IsSwitchOnAsync(SwitchRaiseOldStock, true))
                {
                    await AddRaisedLinesAsync(input, batches);
                }

                // A declared-price line : its old MRP is the declared one
                // now (no batch changes)
                List<long> declaredIds =
                    input.Lines.Where(x => x.StockBatchId <= 0).Select(x => x.ProductId).Distinct().ToList();

                var declaredNow =
                    declaredIds.Count > 0
                        ? await AppCore.Infrastructure.Platform.Inventory.ProductPriceIndexWriter.CurrentAsync(_context, input.Type, declaredIds)
                        : null;

                foreach (ProductPricingLines line in input.Lines)
                {
                    if (line.StockBatchId <= 0)
                    {
                        line.OldMrp =
                            declaredNow != null && declaredNow.TryGetValue(line.ProductId, out var now1)
                                ? now1.Mrp
                                : 0m;

                        continue;
                    }

                    StockBatchesEntity batch =
                        batches[line.StockBatchId];

                    // The MRP it has now is the one to give back on cancel
                    line.OldMrp = batch.Mrp;

                    batch.Mrp = line.NewMrp;
                }

                // The products' declared MRP (price index), one entry
                // per product
                foreach (ProductPricingLines line in input.Lines.GroupBy(x => x.ProductId).Select(g => g.First()))
                {
                    AppCore.Infrastructure.Platform.Inventory.ProductPriceIndexWriter.Add(
                        _context,
                        input.Type,
                        line.ProductId,
                        line.ProductCode,
                        line.ProductName,
                        line.NewMrp,
                        input.Date,
                        AppCore.Infrastructure.Platform.Inventory.ProductPriceIndexWriter.SourcePriceChange,
                        entity.ProductPricingId,
                        entity.PricingNo,
                        userId,
                        now);
                }

                FillHeader(entity, input);

                await WriteLinesAsync(entity, input);

                entity.Status = StatusPosted;

                entity.PostedBy = userId;

                entity.PostedDate = now;

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                AddHistory(entity, "Post", "Posted", userId, now);

                await _context.SaveChangesAsync();
            });

        return new ProductPricingSavedDto
        {
            ProductPricingId = entity.ProductPricingId,
            PublicId = entity.PublicId,
            PricingNo = entity.PricingNo,
            Status = entity.Status
        };
    }


    private async Task AddRaisedLinesAsync
    (
        Resolved input,
        Dictionary<long, StockBatchesEntity> batches
    )
    {
        Dictionary<long, decimal> newMrps =
            input.Lines
                .GroupBy(x => x.ProductId)
                .ToDictionary(g => g.Key, g => g.First().NewMrp);

        List<long> productIds =
            newMrps.Keys.ToList();

        List<long> taken =
            batches.Keys.ToList();

        List<StockBatchesEntity> older =
            (
                await _context
                    .Set<StockBatchesEntity>()
                    .Where
                    (
                        x =>
                            x.ProductType == input.Type
                            &&
                            productIds.Contains(x.ProductId)
                            &&
                            !taken.Contains(x.StockBatchId)
                            &&
                            x.Status != BatchCancelled
                            &&
                            x.Status != BatchClosed
                    )
                    .ToListAsync()
            )
            .Where(x => InStock(x) && x.Mrp < newMrps[x.ProductId] && Money(x.UnitCost) <= newMrps[x.ProductId])
            .ToList();

        if (older.Count == 0)
        {
            return;
        }

        List<long> branchIds =
            older.Select(x => x.BranchId).Distinct().ToList();

        Dictionary<long, string> branches =
            await _context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .Where(x => branchIds.Contains(x.BranchId))
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName ?? string.Empty);

        foreach (StockBatchesEntity batch in older)
        {
            ProductPricingLines first =
                input.Lines.First(x => x.ProductId == batch.ProductId);

            batches[batch.StockBatchId] = batch;

            input.Lines.Add(
                new ProductPricingLines
                {
                    ProductId = batch.ProductId,
                    ProductCode = first.ProductCode,
                    ProductName = first.ProductName,
                    Unit = first.Unit,
                    StockBatchId = batch.StockBatchId,
                    BatchNo = Limit(batch.BatchNo, 40),
                    SourceType = Limit(batch.SourceType, 20),
                    SourceNo = Limit(batch.SourceNo, 40),
                    BranchId = batch.BranchId,
                    BranchName = Limit(branches.GetValueOrDefault(batch.BranchId, string.Empty), 150),
                    Quantity = batch.QuantityOnHand + batch.QuantityInTransit,
                    UnitCost = batch.UnitCost,
                    OldMrp = batch.Mrp,
                    NewMrp = newMrps[batch.ProductId],
                    Notes = "Older stock raised to the new MRP",
                    IsRaised = true,
                    SupplierCode = Limit(batch.SupplierCode, 40)
                });
        }
    }


    //===========================================================
    // Cancel : the old MRP back, while no later price change
    // touched the batch
    //===========================================================

    public async Task
        CancelAsync
        (
            long id,
            CancelProductPricingDto dto,
            long userId
        )
    {
        string reason =
            Limit(dto?.Reason, 500);

        if (reason.Length == 0)
        {
            throw new InvalidOperationException(
                "Give the reason for cancelling.");
        }

        ProductPricing entity =
            await _context
                .Set<ProductPricing>()
                .FirstOrDefaultAsync(x => x.ProductPricingId == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException("Price change not found.");

        if (entity.Status != StatusPosted)
        {
            throw new InvalidOperationException(
                $"Price change {entity.PricingNo} is {entity.Status}; only a posted one can be cancelled.");
        }

        List<ProductPricingLines> lines =
            await _context
                .Set<ProductPricingLines>()
                .AsNoTracking()
                .Where(x => x.ProductPricingId == id)
                .ToListAsync();

        // Its batches (a declared-price line has none)
        List<long> batchIds =
            lines.Where(x => x.StockBatchId > 0).Select(x => x.StockBatchId).ToList();

        // A later posted price change on one of these batches
        DateTime postedAt =
            entity.PostedDate ?? DateTime.MinValue;

        string? later =
            await
            (
                from l in _context.Set<ProductPricingLines>().AsNoTracking()
                join h in _context.Set<ProductPricing>().AsNoTracking()
                    on l.ProductPricingId equals h.ProductPricingId
                where batchIds.Contains(l.StockBatchId)
                      && h.ProductPricingId != id
                      && !h.IsDeleted
                      && h.Status == StatusPosted
                      && h.PostedDate > postedAt
                orderby h.PostedDate
                select h.PricingNo
            )
            .FirstOrDefaultAsync();

        if (later != null)
        {
            throw new InvalidOperationException(
                $"Price change {entity.PricingNo} cannot be cancelled : {later} changed the MRP of its batches later. Cancel {later} first.");
        }

        DateTime now =
            DateTime.UtcNow;

        await InTransactionAsync(
            async () =>
            {
                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT 1 FROM \"ProductPricing\" WHERE \"ProductPricingId\" = {0} FOR UPDATE",
                    id);

                Dictionary<long, StockBatchesEntity> batches =
                    await _context
                        .Set<StockBatchesEntity>()
                        .Where(x => batchIds.Contains(x.StockBatchId))
                        .ToDictionaryAsync(x => x.StockBatchId);

                foreach (ProductPricingLines line in lines)
                {
                    if (batches.TryGetValue(line.StockBatchId, out StockBatchesEntity? batch))
                    {
                        batch.Mrp = line.OldMrp;
                    }
                }

                // Its price index entries are cancelled too
                await AppCore.Infrastructure.Platform.Inventory.ProductPriceIndexWriter.CancelAsync(
                    _context,
                    AppCore.Infrastructure.Platform.Inventory.ProductPriceIndexWriter.SourcePriceChange,
                    entity.PageType,
                    entity.ProductPricingId,
                    now);

                entity.Status = StatusCancelled;

                entity.CancelReason = reason;

                entity.CancelledBy = userId;

                entity.CancelledDate = now;

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                AddHistory(entity, "Cancel", "Cancelled", userId, now, $"Reason : {reason}. The old MRPs are back.");

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Restore : the most recently deleted draft
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        ProductPricing? entity =
            await _context
                .Set<ProductPricing>()
                .Where(x => x.IsDeleted && x.Status == StatusDraft)
                .OrderByDescending(x => x.DeletedDate)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        DateTime now =
            DateTime.UtcNow;

        entity.IsDeleted = false;

        entity.DeletedBy = null;

        entity.DeletedDate = null;

        entity.ModifiedBy = userId;

        entity.ModifiedDate = now;

        AddHistory(entity, "Restore", "Restored", userId, now);

        await _context.SaveChangesAsync();

        return true;
    }


    //===========================================================
    // History : every price change / one of them
    //===========================================================

    public async Task<IReadOnlyList<ActivityHistoryDto>>
        GetHistoryAsync()
    {
        return await HistoryQuery(null);
    }

    public async Task<IReadOnlyList<ActivityHistoryDto>>
        GetEntityHistoryAsync
        (
            long id
        )
    {
        return await HistoryQuery(id);
    }

    private async Task<List<ActivityHistoryDto>>
        HistoryQuery
        (
            long? id
        )
    {
        string[] names =
            new[] { $"{EntityName}MB", $"{EntityName}SP", $"{EntityName}AC" };

        return await _context.ActivityHistories
            .AsNoTracking()
            .Where
            (
                x =>
                    x.Module == ModuleName
                    &&
                    names.Contains(x.EntityName)
                    &&
                    (id == null || x.EntityId == id)
            )
            .OrderByDescending(x => x.PerformedDate)
            .Take(500)
            .Select
            (
                x =>
                    new ActivityHistoryDto
                    {
                        Id = x.Id,
                        Module = x.Module,
                        EntityName = x.EntityName,
                        EntityId = x.EntityId,
                        ActivityType = x.ActivityType,
                        ActivityTitle = x.ActivityTitle,
                        ActivityDescription = x.ActivityDescription,
                        PerformedBy = x.PerformedBy,
                        PerformedByName = x.PerformedByName,
                        PerformedDate = x.PerformedDate
                    }
            )
            .ToListAsync();
    }


    //===========================================================
    // Public Id -> internal id (deleted drafts too : the Deleted tab opens them)
    //===========================================================

    public async Task<long?>
        GetIdByPublicIdAsync
        (
            Guid publicId
        )
    {
        if
        (
            publicId == Guid.Empty
        )
        {
            return null;
        }

        return await _context
            .Set<global::AppCore.Domain.Entities.InventoryManagement.PricingLabels.ProductPricing>()
            .AsNoTracking()
            .Where(x => x.PublicId == publicId)
            .Select(x => (long?)x.ProductPricingId)
            .FirstOrDefaultAsync();
    }
}
