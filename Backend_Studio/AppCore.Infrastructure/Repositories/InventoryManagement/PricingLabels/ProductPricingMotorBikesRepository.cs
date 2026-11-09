//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;

using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Common.ActivityHistory.DTOs;

using AppCore.Application.Common.Paging;

using AppCore.Application.InventoryManagement;

using AppCore.Application.InventoryManagement.PricingLabels;

using AppCore.Domain.Common;

using AppCore.Domain.Entities.InventoryManagement.PricingLabels;

using AppCore.Infrastructure.Persistence;

using AppCore.Infrastructure.Persistence.Paging;

using AppCore.Infrastructure.Platform.Inventory;

using SupplierProfilesEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.SupplierProfiles;

using MotorBikesEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.MotorBikes;

using ProductSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductSubCategory;

using ColorManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ColorManagement;

using StockBatchesEntity =
    AppCore.Domain.Platform.Inventory.StockBatches;

using PurchaseVatEntity =
    AppCore.Domain.Entities.VatManagement.VatSetup.PurchaseVat;

using SalesVatEntity =
    AppCore.Domain.Entities.VatManagement.VatSetup.SalesVat;


//===============================================================
// Namespace (as generated : the DI registration uses it)
//===============================================================

namespace AppCore.Infrastructure.Configurations.InventoryManagement.PricingLabels;


//===============================================================
// Product Pricing - Motor Bikes : price cards (2026-11-09)
//
// A card is per supplier : Regular (from Effective From until a
// later Regular card) or Campaign (Effective From .. To, wins over
// the Regular card inside its dates). Each line : a model + colour
// with its DP (real payable) and MRP (VAT inclusive); the page
// works out VAT inside, net sale and commission (MRP - DP).
//   Post   : checked against the other posted cards of the
//            supplier (one Regular per model and date; Campaigns
//            of a model do not overlap); the MRP goes to the price
//            index (Regular cards : Price List).
//   Cancel : reason; the price index entries are cancelled.
// The card in force is the single source of the Motor Bike MRP
// (Purchases - MB reads GetActiveAsync : stage 2).
//===============================================================

public class ProductPricingMotorBikesRepository
    : IProductPricingMotorBikesRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Inventory Management";

    private const string EntityName =
        "ProductPricingMotorBikes";

    private const string DateFormat =
        "yyyy-MM-dd";

    public const string StatusDraft = "Draft";

    public const string StatusPosted = "Posted";

    public const string StatusCancelled = "Cancelled";

    public const string TypeRegular = "Regular";

    public const string TypeCampaign = "Campaign";

    // Price index source of a posted card
    public const string IndexSource = "PriceCard";

    private const string ProductType = "MB";

    private const string VatMotorBikes = "Motor Bikes";

    private static readonly string[] SupplyTypes =
        { "Motor Bikes", "General" };

    private const int MaxLines = 500;

    // pg_advisory_xact_lock class for the numbers ("PM")
    private const int NumberLockClass = 0x504D;


    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext _context;


    public ProductPricingMotorBikesRepository(
        AppDbContext context)
    {
        _context = context;
    }


    //===========================================================
    // Helpers
    //===========================================================

    // PC-MB-0001
    private static string NumberOf(int sequence) =>
        $"PC-MB-{sequence:D4}";

    private static string DateText(DateOnly date) =>
        date.ToString(DateFormat, CultureInfo.InvariantCulture);

    private static string DateText(DateOnly? date) =>
        date.HasValue
            ? date.Value.ToString(DateFormat, CultureInfo.InvariantCulture)
            : string.Empty;

    private static string DateText(DateTime? date) =>
        date.HasValue
            ? date.Value.ToString(DateFormat, CultureInfo.InvariantCulture)
            : string.Empty;

    private static string Limit(
        string? value,
        int maxLength)
    {
        string text =
            (value ?? string.Empty).Trim();

        return text.Length <= maxLength
            ? text
            : text.Substring(0, maxLength);
    }

    private static decimal Money(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);

    private static DateOnly? TryDate(
        string? text)
    {
        return DateOnly.TryParseExact(
                (text ?? string.Empty).Trim(),
                DateFormat,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out DateOnly date)
            ? date
            : null;
    }

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

    private static DateOnly BusinessToday() =>
        DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                BusinessZone));

    private async Task InTransactionAsync(
        Func<Task> work)
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

    private void AddHistory(
        ProductPricingMotorBikes entity,
        string activityType,
        string verb,
        long userId,
        DateTime now,
        string extra = "")
    {
        string dates =
            entity.CardType == TypeCampaign && entity.EffectiveTo.HasValue
                ? $"{DateText(entity.EffectiveFrom)} to {DateText(entity.EffectiveTo)}"
                : $"from {DateText(entity.EffectiveFrom)}";

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = ModuleName,
                EntityName = EntityName,
                EntityId = entity.Id,
                ActivityType = activityType,
                ActivityTitle = $"Price Card {verb}",
                ActivityDescription =
                    Limit(
                        $"Price Card {entity.CardNo} ({entity.CardType}, {entity.SupplierName}, {dates}, {entity.ProductCount} model{(entity.ProductCount == 1 ? string.Empty : "s")}) {verb.ToLowerInvariant()}.{(string.IsNullOrWhiteSpace(extra) ? string.Empty : " " + extra)}",
                        1000),
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = now
            });
    }


    //===========================================================
    // Sales VAT % of Motor Bikes on a date (0 = no rule)
    //===========================================================

    private async Task<List<ProductPricingMotorBikesVatRuleDto>> VatRulesAsync()
    {
        return
            (
                await _context
                    .Set<SalesVatEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.Status && x.VatType == VatMotorBikes)
                    .Select(x => new { x.VatRate, x.EffectiveFrom, x.ValidTo })
                    .ToListAsync()
            )
            .Select
            (
                x =>
                    new ProductPricingMotorBikesVatRuleDto
                    {
                        Rate = x.VatRate,
                        EffectiveFrom = DateText(x.EffectiveFrom),
                        ValidTo = DateText(x.ValidTo)
                    }
            )
            .OrderBy(x => x.EffectiveFrom)
            .ToList();
    }

    // Purchase VAT rules of Motor Bikes (the VAT inside the DP)
    private async Task<List<ProductPricingMotorBikesVatRuleDto>> PurchaseVatRulesAsync()
    {
        return
            (
                await _context
                    .Set<PurchaseVatEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.Status && x.VatType == VatMotorBikes)
                    .Select(x => new { x.VatRate, x.EffectiveFrom, x.ValidTo })
                    .ToListAsync()
            )
            .Select
            (
                x =>
                    new ProductPricingMotorBikesVatRuleDto
                    {
                        Rate = x.VatRate,
                        EffectiveFrom = DateText(x.EffectiveFrom),
                        ValidTo = DateText(x.ValidTo)
                    }
            )
            .OrderBy(x => x.EffectiveFrom)
            .ToList();
    }

    private static decimal VatRateOn(
        List<ProductPricingMotorBikesVatRuleDto> rules,
        DateOnly date)
    {
        string iso =
            DateText(date);

        return rules
            .Where
            (
                x =>
                    string.CompareOrdinal(x.EffectiveFrom, iso) <= 0
                    &&
                    (x.ValidTo == string.Empty || string.CompareOrdinal(x.ValidTo, iso) >= 0)
            )
            .OrderByDescending(x => x.EffectiveFrom)
            .Select(x => x.Rate)
            .FirstOrDefault();
    }


    //===========================================================
    // Read
    //===========================================================

    private static ProductPricingMotorBikesDto ToDto(
        ProductPricingMotorBikes x,
        bool inForce,
        List<ProductPricingMotorBikeLines>? lines = null)
    {
        return new ProductPricingMotorBikesDto
        {
            Id = x.Id,
            PublicId = x.PublicId,
            CardNo = x.CardNo,
            SupplierCode = x.SupplierCode,
            SupplierName = x.SupplierName,
            CardType = x.CardType,
            EffectiveFrom = DateText(x.EffectiveFrom),
            EffectiveTo = DateText(x.EffectiveTo),
            Reference = x.Reference,
            Remarks = x.Remarks,
            ProductCount = x.ProductCount,
            Status = x.Status,
            PostedDate = DateText(x.PostedDate),
            CancelledDate = DateText(x.CancelledDate),
            CancelReason = x.CancelReason,
            SupersededByNo = x.SupersededByNo,
            SupersededFrom = DateText(x.SupersededFrom),
            Superseded = x.SupersededFrom != null && x.SupersededFrom <= BusinessToday(),
            InForce = inForce,
            Lines =
                (lines ?? new List<ProductPricingMotorBikeLines>())
                    .OrderBy(l => l.LineNo)
                    .Select
                    (
                        l =>
                            new ProductPricingMotorBikesLineDto
                            {
                                LineNo = l.LineNo,
                                ModelId = l.ModelId,
                                ModelName = l.ModelName,
                                IsException = l.MotorBikeId != null,
                                MotorBikeId = l.MotorBikeId ?? 0,
                                ProductCode = l.ProductCode,
                                ProductName = l.ProductName,
                                Dp = l.Dp,
                                Mrp = l.Mrp,
                                VatRate = l.VatRate,
                                VatInside = l.VatInside,
                                NetSale = l.NetSale,
                                Commission = l.Commission,
                                CommissionPercent = l.CommissionPercent
                            }
                    )
                    .ToList()
        };
    }

    // Cards in force today : the active Regular card of each
    // supplier (started, not yet replaced) and the Campaign cards
    // covering today
    private IQueryable<ProductPricingMotorBikes> InForceQuery(
        IQueryable<ProductPricingMotorBikes> query)
    {
        DateOnly today =
            BusinessToday();

        return query.Where
        (
            x =>
                x.Status == StatusPosted
                && x.EffectiveFrom <= today
                && x.CardType == TypeRegular
                && (x.SupersededFrom == null || x.SupersededFrom > today)
        );
    }

    private async Task<HashSet<long>> InForceIdsAsync(
        IReadOnlyCollection<long> cardIds)
    {
        if (cardIds.Count == 0)
        {
            return new HashSet<long>();
        }

        List<long> ids =
            cardIds.ToList();

        return (await InForceQuery(
                    _context
                        .Set<ProductPricingMotorBikes>()
                        .AsNoTracking()
                        .Where(x => ids.Contains(x.Id)))
                .Select(x => x.Id)
                .ToListAsync())
            .ToHashSet();
    }

    public async Task<ProductPricingMotorBikesDto?> GetByIdAsync(
        long id)
    {
        ProductPricingMotorBikes? entity =
            await _context
                .Set<ProductPricingMotorBikes>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

        if (entity == null)
        {
            return null;
        }

        List<ProductPricingMotorBikeLines> lines =
            await _context
                .Set<ProductPricingMotorBikeLines>()
                .AsNoTracking()
                .Where(x => x.CardId == id)
                .ToListAsync();

        HashSet<long> inForce =
            await InForceIdsAsync(new[] { id });

        return ToDto(entity, inForce.Contains(id), lines);
    }

    public async Task<long?> GetIdByPublicIdAsync(
        Guid publicId)
    {
        if (publicId == Guid.Empty)
        {
            return null;
        }

        return await _context
            .Set<ProductPricingMotorBikes>()
            .AsNoTracking()
            .Where(x => x.PublicId == publicId)
            .Select(x => (long?)x.Id)
            .FirstOrDefaultAsync();
    }


    //===========================================================
    // Defaults : suppliers, models, VAT rules, next number
    //===========================================================

    public async Task<ProductPricingMotorBikesDefaultsDto> GetDefaultsAsync()
    {
        List<ProductPricingMotorBikesSupplierDto> suppliers =
            await _context
                .Set<SupplierProfilesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && SupplyTypes.Contains(x.SupplyType))
                .OrderBy(x => x.SupplierName)
                .Select
                (
                    x =>
                        new ProductPricingMotorBikesSupplierDto
                        {
                            SupplierCode = x.SupplierCode,
                            SupplierName = x.DisplayName != string.Empty ? x.DisplayName : x.SupplierName
                        }
                )
                .ToListAsync();

        List<ProductPricingMotorBikesProductDto> products =
            await
            (
                from b in _context.Set<MotorBikesEntity>().AsNoTracking()
                join s in _context.Set<ProductSubCategoryEntity>().AsNoTracking()
                    on b.ProductSubCategoryId equals s.ProductSubCategoryId into sj
                from s in sj.DefaultIfEmpty()
                join c in _context.Set<ColorManagementEntity>().AsNoTracking()
                    on b.ColorManagementId equals c.ColorManagementId into cj
                from c in cj.DefaultIfEmpty()
                where !b.IsDeleted
                orderby b.ProductName
                select new ProductPricingMotorBikesProductDto
                {
                    MotorBikeId = b.MotorBikeId,
                    ProductCode = b.ProductCode,
                    ProductName = b.ProductName,
                    ModelId = b.ProductSubCategoryId,
                    ModelName = s != null ? s.SubCategoryName : string.Empty,
                    ColorName = c != null ? c.ColorName : string.Empty,
                    ImagePath = b.ImagePath,
                    IsActive = b.IsActive
                }
            )
            .ToListAsync();

        int last =
            await _context
                .Set<ProductPricingMotorBikes>()
                .Select(x => (int?)x.SequenceNo)
                .MaxAsync()
            ??
            0;

        return new ProductPricingMotorBikesDefaultsDto
        {
            Today = DateText(BusinessToday()),
            NextNumber = NumberOf(last + 1),
            Suppliers = suppliers,
            Products = products,
            VatRules = await VatRulesAsync(),
            PurchaseVatRules = await PurchaseVatRulesAsync()
        };
    }


    //===========================================================
    // Last cost per colour : its last purchase batch from the
    // supplier (cost + 6.3 VAT per unit) and its stock in hand
    // (every branch, every source)
    //===========================================================

    private const string BatchSourcePurchase = "Purchase";

    private const string BatchCancelled = "Cancelled";

    public async Task<List<ProductPricingMotorBikesCostDto>> GetCostsAsync(
        string supplierCode)
    {
        string supplier =
            (supplierCode ?? string.Empty).Trim();

        var batches =
            await _context
                .Set<StockBatchesEntity>()
                .AsNoTracking()
                .Where(x => x.ProductType == ProductType && x.Status != BatchCancelled)
                .Select
                (
                    x =>
                        new
                        {
                            x.StockBatchId,
                            x.ProductId,
                            x.SourceType,
                            x.SourceNo,
                            x.SourceDate,
                            x.SupplierCode,
                            x.UnitCost,
                            x.SourceVatPerUnit,
                            x.QuantityOnHand
                        }
                )
                .ToListAsync();

        return batches
            .GroupBy(x => x.ProductId)
            .Select
            (
                g =>
                {
                    var last =
                        g.Where(x => x.SourceType == BatchSourcePurchase && x.SupplierCode == supplier)
                         .OrderByDescending(x => x.SourceDate)
                         .ThenByDescending(x => x.StockBatchId)
                         .FirstOrDefault();

                    decimal qty =
                        g.Sum(x => x.QuantityOnHand);

                    decimal value =
                        g.Sum(x => x.QuantityOnHand * (x.UnitCost + x.SourceVatPerUnit));

                    return new ProductPricingMotorBikesCostDto
                    {
                        MotorBikeId = g.Key,
                        LastBatchId = last?.StockBatchId ?? 0,
                        LastDate = last == null ? string.Empty : DateText(last.SourceDate),
                        LastSourceNo = last?.SourceNo ?? string.Empty,
                        LastUnitCost = last == null ? 0m : Money(last.UnitCost),
                        LastVat = last == null ? 0m : Money(last.SourceVatPerUnit),
                        LastPaid = last == null ? 0m : Money(last.UnitCost + last.SourceVatPerUnit),
                        StockQty = qty,
                        StockAvgPaid = qty > 0m ? Money(value / qty) : 0m
                    };
                }
            )
            .Where(x => x.LastBatchId > 0 || x.StockQty > 0m)
            .ToList();
    }


    //===========================================================
    // The card in force per model for a supplier on a date :
    // a posted Campaign covering the date, else the latest posted
    // Regular card with Effective From on or before it
    //===========================================================

    public async Task<List<ProductPricingMotorBikesActiveDto>> GetActiveAsync(
        string supplierCode,
        DateOnly date,
        IReadOnlyCollection<long>? motorBikeIds = null,
        bool regularOnly = false)
    {
        string supplier =
            (supplierCode ?? string.Empty).Trim();

        var cards =
            await _context
                .Set<ProductPricingMotorBikes>()
                .AsNoTracking()
                .Where
                (
                    h =>
                        !h.IsDeleted
                        && h.Status == StatusPosted
                        && h.SupplierCode == supplier
                        && h.EffectiveFrom <= date
                        && h.CardType == TypeRegular
                )
                .Select(h => new { h.Id, h.CardNo, h.CardType, h.EffectiveFrom, h.EffectiveTo })
                .ToListAsync();

        if (cards.Count == 0)
        {
            return new List<ProductPricingMotorBikesActiveDto>();
        }

        List<long> cardIds =
            cards.Select(x => x.Id).ToList();

        List<ProductPricingMotorBikeLines> lines =
            await _context
                .Set<ProductPricingMotorBikeLines>()
                .AsNoTracking()
                .Where(x => cardIds.Contains(x.CardId))
                .ToListAsync();

        List<BikeOfModel> bikes =
            (await BikesOfModelsAsync(lines.Select(x => x.ModelId).Distinct().ToList()))
                .Where(x => motorBikeIds == null || motorBikeIds.Contains(x.MotorBikeId))
                .ToList();

        // The Regular card of the date : the latest one started
        // (a new Regular card replaces the whole previous card);
        // Campaign cards covering the date win for their models
        var regular =
            cards
                .Where(x => x.CardType == TypeRegular)
                .OrderByDescending(x => x.EffectiveFrom)
                .ThenByDescending(x => x.Id)
                .FirstOrDefault();

        var deciding =
            cards
                .Where(x => regular != null && x.Id == regular.Id)
                .ToList();

        var priced =
            deciding
                .SelectMany
                (
                    card =>
                        ColourPrices(lines.Where(l => l.CardId == card.Id), bikes)
                            .Select(p => new { Card = card, p.Bike, p.Line, p.FromModel })
                )
                .ToList();

        return priced
            .GroupBy(x => x.Bike.MotorBikeId)
            .Select
            (
                g =>
                {
                    var pick =
                        g.OrderBy(x => x.Card.CardType == TypeCampaign ? 0 : 1)
                         .ThenByDescending(x => x.Card.EffectiveFrom)
                         .ThenByDescending(x => x.Card.Id)
                         .First();

                    return new ProductPricingMotorBikesActiveDto
                    {
                        MotorBikeId = g.Key,
                        ModelId = pick.Bike.ModelId,
                        FromModel = pick.FromModel,
                        CardId = pick.Card.Id,
                        CardNo = pick.Card.CardNo,
                        CardType = pick.Card.CardType,
                        EffectiveFrom = DateText(pick.Card.EffectiveFrom),
                        EffectiveTo = DateText(pick.Card.EffectiveTo),
                        Dp = pick.Line.Dp,
                        Mrp = pick.Line.Mrp,
                        Commission = pick.Line.Commission
                    };
                }
            )
            .ToList();
    }


    //===========================================================
    // Models and colours
    //===========================================================

    private sealed class BikeOfModel
    {
        public long MotorBikeId;

        public long ModelId;

        public string ProductCode = string.Empty;

        public string ProductName = string.Empty;
    }

    // The colours (motor bikes) of the models
    private async Task<List<BikeOfModel>> BikesOfModelsAsync(
        IReadOnlyCollection<long> modelIds)
    {
        if (modelIds.Count == 0)
        {
            return new List<BikeOfModel>();
        }

        List<long> ids =
            modelIds.Distinct().ToList();

        return await _context
            .Set<MotorBikesEntity>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted && ids.Contains(x.ProductSubCategoryId))
            .Select
            (
                x =>
                    new BikeOfModel
                    {
                        MotorBikeId = x.MotorBikeId,
                        ModelId = x.ProductSubCategoryId,
                        ProductCode = x.ProductCode,
                        ProductName = x.ProductName
                    }
            )
            .ToListAsync();
    }

    private static ProductPricingMotorBikeLines PriceLine(
        int lineNo,
        long modelId,
        string modelName,
        long? motorBikeId,
        string productCode,
        string productName,
        decimal dp,
        decimal mrp,
        decimal vatRate)
    {
        if (dp <= 0m)
        {
            throw new InvalidOperationException(
                $"{productName} : DP must be above 0.");
        }

        if (mrp <= 0m)
        {
            throw new InvalidOperationException(
                $"{productName} : MRP must be above 0.");
        }

        if (Money(dp) != dp || Money(mrp) != mrp)
        {
            throw new InvalidOperationException(
                $"{productName} : DP and MRP take at most 2 decimals.");
        }

        decimal vatInside =
            Money(mrp * vatRate / (100m + vatRate));

        decimal commission =
            Money(mrp - dp);

        return new ProductPricingMotorBikeLines
        {
            LineNo = lineNo,
            ModelId = modelId,
            ModelName = Limit(modelName, 250),
            MotorBikeId = motorBikeId,
            ProductCode = Limit(productCode, 40),
            ProductName = Limit(productName, 250),
            Dp = dp,
            Mrp = mrp,
            VatRate = vatRate,
            VatInside = vatInside,
            NetSale = Money(mrp - vatInside),
            Commission = commission,
            CommissionPercent =
                mrp > 0m
                    ? Math.Round(commission * 100m / mrp, 4, MidpointRounding.AwayFromZero)
                    : 0m
        };
    }

    // The price of each colour on a card : its exception, else its
    // model's price (every current colour of the card's models)
    private static List<(BikeOfModel Bike, ProductPricingMotorBikeLines Line, bool FromModel)> ColourPrices(
        IEnumerable<ProductPricingMotorBikeLines> cardLines,
        IEnumerable<BikeOfModel> bikes)
    {
        List<ProductPricingMotorBikeLines> lines =
            cardLines.ToList();

        Dictionary<long, ProductPricingMotorBikeLines> modelLine =
            lines
                .Where(x => x.MotorBikeId == null)
                .GroupBy(x => x.ModelId)
                .ToDictionary(g => g.Key, g => g.First());

        Dictionary<long, ProductPricingMotorBikeLines> colourLine =
            lines
                .Where(x => x.MotorBikeId != null)
                .GroupBy(x => x.MotorBikeId!.Value)
                .ToDictionary(g => g.Key, g => g.First());

        List<(BikeOfModel Bike, ProductPricingMotorBikeLines Line, bool FromModel)> result =
            new();

        foreach (BikeOfModel bike in bikes)
        {
            if (colourLine.TryGetValue(bike.MotorBikeId, out ProductPricingMotorBikeLines? own))
            {
                result.Add((bike, own, false));
            }
            else if (modelLine.TryGetValue(bike.ModelId, out ProductPricingMotorBikeLines? model))
            {
                result.Add((bike, model, true));
            }
        }

        return result;
    }


    //===========================================================
    // Input
    //===========================================================

    private sealed class Resolved
    {
        public string SupplierCode = string.Empty;

        public string SupplierName = string.Empty;

        public string CardType = TypeRegular;

        public DateOnly EffectiveFrom;

        public DateOnly? EffectiveTo;

        public string Reference = string.Empty;

        public string Remarks = string.Empty;

        public List<ProductPricingMotorBikeLines> Lines = new();
    }

    private async Task<Resolved> ResolveAsync(
        CreateProductPricingMotorBikesDto dto)
    {
        Resolved input =
            new();

        string supplierCode =
            (dto.SupplierCode ?? string.Empty).Trim();

        var supplier =
            await _context
                .Set<SupplierProfilesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.SupplierCode == supplierCode)
                .Select(x => new { x.SupplierCode, x.SupplierName, x.DisplayName, x.SupplyType, x.IsActive })
                .FirstOrDefaultAsync();

        if (supplier == null)
        {
            throw new InvalidOperationException(
                "Choose the supplier.");
        }

        if (!SupplyTypes.Contains(supplier.SupplyType))
        {
            throw new InvalidOperationException(
                $"Supplier '{supplier.SupplierName}' supplies {supplier.SupplyType}, not Motor Bikes.");
        }

        input.SupplierCode = supplier.SupplierCode;

        input.SupplierName =
            Limit(
                string.IsNullOrWhiteSpace(supplier.DisplayName) ? supplier.SupplierName : supplier.DisplayName,
                250);

        // Regular cards only (2026-11-10 : no Campaign cards; a
        // campaign discount is entered on the purchase invoice)
        input.CardType = TypeRegular;

        input.EffectiveFrom =
            TryDate(dto.EffectiveFrom)
            ??
            throw new InvalidOperationException(
                "Effective From is required.");

        input.Reference =
            Limit(dto.Reference, 100);

        input.Remarks =
            Limit((dto.Remarks ?? string.Empty).Replace("\r", " ").Replace("\n", " "), 500);

        List<ProductPricingMotorBikesLineInputDto> lines =
            (dto.Lines ?? new List<ProductPricingMotorBikesLineInputDto>())
                .Where(x => x != null && x.ModelId > 0)
                .ToList();

        List<ProductPricingMotorBikesLineInputDto> models =
            lines.Where(x => x.MotorBikeId <= 0).ToList();

        List<ProductPricingMotorBikesLineInputDto> colours =
            lines.Where(x => x.MotorBikeId > 0).ToList();

        if (models.Count == 0)
        {
            throw new InvalidOperationException(
                "Add at least one model to the card.");
        }

        if (lines.Count > MaxLines)
        {
            throw new InvalidOperationException(
                $"A card holds at most {MaxLines} lines (models and colour exceptions).");
        }

        List<long> modelIds =
            models.Select(x => x.ModelId).Distinct().ToList();

        Dictionary<long, string> modelNames =
            await _context
                .Set<ProductSubCategoryEntity>()
                .AsNoTracking()
                .Where(x => modelIds.Contains(x.ProductSubCategoryId))
                .ToDictionaryAsync(x => x.ProductSubCategoryId, x => x.SubCategoryName);

        List<BikeOfModel> bikes =
            await BikesOfModelsAsync(modelIds);

        Dictionary<long, BikeOfModel> bikeById =
            bikes.ToDictionary(x => x.MotorBikeId);

        decimal vatRate =
            VatRateOn(await VatRulesAsync(), input.EffectiveFrom);

        int lineNo = 0;

        HashSet<long> seenModels =
            new();

        HashSet<long> seenColours =
            new();

        foreach (ProductPricingMotorBikesLineInputDto model in models)
        {
            if (!modelNames.TryGetValue(model.ModelId, out string? modelName))
            {
                throw new InvalidOperationException(
                    $"Line {lineNo + 1} : the model was not found.");
            }

            if (!seenModels.Add(model.ModelId))
            {
                throw new InvalidOperationException(
                    $"{modelName} is on the card twice.");
            }

            if (!bikes.Any(x => x.ModelId == model.ModelId))
            {
                throw new InvalidOperationException(
                    $"{modelName} has no motor bike (colour) set up.");
            }

            input.Lines.Add(
                PriceLine(++lineNo, model.ModelId, modelName, null, string.Empty, modelName, model.Dp, model.Mrp, vatRate));

            foreach (ProductPricingMotorBikesLineInputDto colour in colours.Where(x => x.ModelId == model.ModelId))
            {
                if (!bikeById.TryGetValue(colour.MotorBikeId, out BikeOfModel? bike) || bike.ModelId != model.ModelId)
                {
                    throw new InvalidOperationException(
                        $"{modelName} : a colour exception is not of this model.");
                }

                if (!seenColours.Add(bike.MotorBikeId))
                {
                    throw new InvalidOperationException(
                        $"{bike.ProductName} has two colour exceptions.");
                }

                input.Lines.Add(
                    PriceLine(++lineNo, model.ModelId, modelName, bike.MotorBikeId, bike.ProductCode, bike.ProductName, colour.Dp, colour.Mrp, vatRate));
            }
        }

        if (colours.Any(x => !seenModels.Contains(x.ModelId)))
        {
            throw new InvalidOperationException(
                "A colour exception needs its model on the card.");
        }

        return input;
    }

    private static void FillHeader(
        ProductPricingMotorBikes entity,
        Resolved input)
    {
        entity.SupplierCode = input.SupplierCode;
        entity.SupplierName = input.SupplierName;
        entity.CardType = input.CardType;
        entity.EffectiveFrom = input.EffectiveFrom;
        entity.EffectiveTo = input.CardType == TypeCampaign ? input.EffectiveTo : null;
        entity.Reference = input.Reference;
        entity.Remarks = input.Remarks;
        entity.ProductCount = input.Lines.Count(x => x.MotorBikeId == null);
    }

    private async Task WriteLinesAsync(
        ProductPricingMotorBikes entity,
        Resolved input)
    {
        List<ProductPricingMotorBikeLines> old =
            await _context
                .Set<ProductPricingMotorBikeLines>()
                .Where(x => x.CardId == entity.Id)
                .ToListAsync();

        _context.Set<ProductPricingMotorBikeLines>().RemoveRange(old);

        foreach (ProductPricingMotorBikeLines line in input.Lines)
        {
            line.CardId = entity.Id;

            _context.Set<ProductPricingMotorBikeLines>().Add(line);
        }
    }

    private async Task<ProductPricingMotorBikes> DraftAsync(
        long id)
    {
        ProductPricingMotorBikes entity =
            await _context
                .Set<ProductPricingMotorBikes>()
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException(
                "Price card not found.");

        if (entity.Status != StatusDraft)
        {
            throw new InvalidOperationException(
                $"{entity.CardNo} is {entity.Status}. Only a draft can be changed.");
        }

        return entity;
    }


    //===========================================================
    // Draft : save / change / delete / restore
    //===========================================================

    public async Task<ProductPricingMotorBikesSavedDto> CreateAsync(
        CreateProductPricingMotorBikesDto dto,
        long userId)
    {
        Resolved input =
            await ResolveAsync(dto);

        DateTime now =
            DateTime.UtcNow;

        ProductPricingMotorBikes entity =
            new()
            {
                Status = StatusDraft,
                CancelReason = string.Empty,
                CreatedBy = userId,
                CreatedDate = now
            };

        FillHeader(entity, input);

        await InTransactionAsync(
            async () =>
            {
                await _context.Database.ExecuteSqlRawAsync(
                    "SELECT pg_advisory_xact_lock({0}, {1})",
                    NumberLockClass,
                    1);

                int last =
                    await _context
                        .Set<ProductPricingMotorBikes>()
                        .Select(x => (int?)x.SequenceNo)
                        .MaxAsync()
                    ??
                    0;

                entity.SequenceNo = last + 1;

                entity.CardNo = NumberOf(entity.SequenceNo);

                _context.Set<ProductPricingMotorBikes>().Add(entity);

                await _context.SaveChangesAsync();

                await WriteLinesAsync(entity, input);

                AddHistory(entity, "Create", "Saved", userId, now);

                await _context.SaveChangesAsync();
            });

        return Saved(entity);
    }

    private static ProductPricingMotorBikesSavedDto Saved(
        ProductPricingMotorBikes entity) =>
        new()
        {
            Id = entity.Id,
            PublicId = entity.PublicId,
            CardNo = entity.CardNo,
            Status = entity.Status
        };

    public async Task<ProductPricingMotorBikesSavedDto> UpdateAsync(
        long id,
        UpdateProductPricingMotorBikesDto dto,
        long userId)
    {
        ProductPricingMotorBikes entity =
            await DraftAsync(id);

        Resolved input =
            await ResolveAsync(dto);

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

        return Saved(entity);
    }

    public async Task DeleteAsync(
        long id,
        long userId)
    {
        ProductPricingMotorBikes entity =
            await DraftAsync(id);

        DateTime now =
            DateTime.UtcNow;

        entity.IsDeleted = true;

        entity.DeletedBy = userId;

        entity.DeletedDate = now;

        AddHistory(entity, "Delete", "Deleted", userId, now);

        await _context.SaveChangesAsync();
    }

    public async Task<bool> RestoreAsync(
        long userId)
    {
        ProductPricingMotorBikes? entity =
            await _context
                .Set<ProductPricingMotorBikes>()
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
    // Post : no other posted Regular card of the supplier for a
    // model on the same Effective From; no overlapping posted
    // Campaign of a model. The MRP of a Regular card goes to the
    // price index (Price List).
    //===========================================================

    public async Task<ProductPricingMotorBikesSavedDto> PostAsync(
        long id,
        long userId)
    {
        ProductPricingMotorBikes entity =
            await DraftAsync(id);

        List<ProductPricingMotorBikeLines> lines =
            await _context
                .Set<ProductPricingMotorBikeLines>()
                .Where(x => x.CardId == id)
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        if (lines.Count == 0)
        {
            throw new InvalidOperationException(
                "The card has no models.");
        }

        List<long> modelIds =
            lines.Select(x => x.ModelId).Distinct().ToList();

        // A Regular card replaces the supplier's current Regular card
        // (the whole set) from its Effective From : it must start
        // after that card
        ProductPricingMotorBikes? previous =
            entity.CardType == TypeRegular
                ? await _context
                    .Set<ProductPricingMotorBikes>()
                    .Where
                    (
                        x =>
                            !x.IsDeleted
                            && x.Id != id
                            && x.Status == StatusPosted
                            && x.CardType == TypeRegular
                            && x.SupplierCode == entity.SupplierCode
                    )
                    .OrderByDescending(x => x.EffectiveFrom)
                    .ThenByDescending(x => x.Id)
                    .FirstOrDefaultAsync()
                : null;

        if (previous != null && entity.EffectiveFrom <= previous.EffectiveFrom)
        {
            throw new InvalidOperationException(
                $"{previous.CardNo} is the supplier's current Regular card from {DateText(previous.EffectiveFrom)}. " +
                $"A new Regular card replaces it, so its Effective From must be after {DateText(previous.EffectiveFrom)}.");
        }

        // Each current colour of the card's models : its price
        List<(BikeOfModel Bike, ProductPricingMotorBikeLines Line, bool FromModel)> colourPrices =
            ColourPrices(lines, await BikesOfModelsAsync(modelIds));

        DateTime now =
            DateTime.UtcNow;

        await InTransactionAsync(
            async () =>
            {
                entity.Status = StatusPosted;

                entity.PostedBy = userId;

                entity.PostedDate = now;

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                if (previous != null)
                {
                    previous.SupersededById = entity.Id;

                    previous.SupersededByNo = entity.CardNo;

                    previous.SupersededFrom = entity.EffectiveFrom;

                    previous.ModifiedBy = userId;

                    previous.ModifiedDate = now;

                    AddHistory(previous, "Superseded", "Superseded", userId, now, $"Replaced by {entity.CardNo} from {DateText(entity.EffectiveFrom)}");
                }

                if (entity.CardType == TypeRegular)
                {
                    foreach (var price in colourPrices)
                    {
                        ProductPriceIndexWriter.Add(
                            _context,
                            ProductType,
                            price.Bike.MotorBikeId,
                            price.Bike.ProductCode,
                            price.Bike.ProductName,
                            price.Line.Mrp,
                            entity.EffectiveFrom,
                            IndexSource,
                            entity.Id,
                            entity.CardNo,
                            userId,
                            now);
                    }
                }

                AddHistory(entity, "Post", "Posted", userId, now);

                await _context.SaveChangesAsync();
            });

        return Saved(entity);
    }


    //===========================================================
    // Cancel (posted) : reason; price index entries cancelled.
    // (Stage 2 : refused once a purchase used the card.)
    //===========================================================

    // The first non-cancelled document that took its DP from the
    // card ('' = none) : Purchase Invoice - MB, Opening Stock - MB
    private async Task<string> CardUsedByAsync(
        string cardNo)
    {
        if (string.IsNullOrWhiteSpace(cardNo))
        {
            return string.Empty;
        }

        List<string> purchases =
            await _context.Database
                .SqlQueryRaw<string>(
                    "SELECT h.\"PurchaseNo\" AS \"Value\" FROM public.\"PurchasesMbLines\" l " +
                    "JOIN public.\"PurchasesMb\" h ON h.\"PurchaseId\" = l.\"PurchaseId\" " +
                    "WHERE l.\"CardNo\" = {0} AND NOT h.\"IsDeleted\" AND h.\"Status\" <> 'Cancelled' " +
                    "ORDER BY h.\"PurchaseId\" LIMIT 1",
                    cardNo)
                .ToListAsync();

        if (purchases.Count > 0)
        {
            return $"purchase invoice {purchases[0]}";
        }

        List<string> openings =
            await _context.Database
                .SqlQueryRaw<string>(
                    "SELECT h.\"OpeningNo\" AS \"Value\" FROM public.\"OpeningStockLines\" l " +
                    "JOIN public.\"OpeningStock\" h ON h.\"OpeningStockId\" = l.\"OpeningStockId\" " +
                    "WHERE l.\"CardNo\" = {0} AND NOT h.\"IsDeleted\" AND h.\"Status\" = 'Posted' " +
                    "ORDER BY h.\"OpeningStockId\" LIMIT 1",
                    cardNo)
                .ToListAsync();

        return openings.Count > 0
            ? $"opening stock {openings[0]}"
            : string.Empty;
    }

    public async Task CancelAsync(
        long id,
        CancelProductPricingMotorBikesDto dto,
        long userId)
    {
        ProductPricingMotorBikes entity =
            await _context
                .Set<ProductPricingMotorBikes>()
                .FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
            ??
            throw new KeyNotFoundException(
                "Price card not found.");

        if (entity.Status != StatusPosted)
        {
            throw new InvalidOperationException(
                $"{entity.CardNo} is {entity.Status}. Only a posted card can be cancelled.");
        }

        if (entity.SupersededById != null)
        {
            throw new InvalidOperationException(
                $"{entity.CardNo} was replaced by {entity.SupersededByNo}. Cancel {entity.SupersededByNo} first.");
        }

        // A card already used by a posted / approved Purchase Invoice
        // - MB or a posted Opening Stock - MB stays : the stock was
        // valued at its DP (allowance posted)
        string used =
            await CardUsedByAsync(entity.CardNo);

        if (used.Length > 0)
        {
            throw new InvalidOperationException(
                $"{entity.CardNo} prices {used}. Cancel that first, or post a new card to replace it.");
        }

        string reason =
            Limit((dto?.Reason ?? string.Empty).Replace("\r", " ").Replace("\n", " "), 500);

        // The card this one replaced becomes current again
        ProductPricingMotorBikes? replaced =
            entity.CardType == TypeRegular
                ? await _context
                    .Set<ProductPricingMotorBikes>()
                    .FirstOrDefaultAsync(x => x.SupersededById == entity.Id)
                : null;

        if (reason.Length < 5)
        {
            throw new InvalidOperationException(
                "Give the reason for cancelling (at least 5 characters).");
        }

        DateTime now =
            DateTime.UtcNow;

        await InTransactionAsync(
            async () =>
            {
                entity.Status = StatusCancelled;

                if (replaced != null)
                {
                    replaced.SupersededById = null;

                    replaced.SupersededByNo = string.Empty;

                    replaced.SupersededFrom = null;

                    replaced.ModifiedBy = userId;

                    replaced.ModifiedDate = now;

                    AddHistory(replaced, "Restored", "Current again", userId, now, $"{entity.CardNo} was cancelled");
                }

                entity.CancelledBy = userId;

                entity.CancelledDate = now;

                entity.CancelReason = reason;

                entity.ModifiedBy = userId;

                entity.ModifiedDate = now;

                await ProductPriceIndexWriter.CancelAsync(
                    _context,
                    IndexSource,
                    ProductType,
                    entity.Id,
                    now);

                AddHistory(entity, "Cancel", "Cancelled", userId, now, $"Reason : {reason}");

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // History
    //===========================================================

    public async Task<IReadOnlyList<ActivityHistoryDto>> GetHistoryAsync() =>
        await HistoryQuery(null);

    public async Task<IReadOnlyList<ActivityHistoryDto>> GetEntityHistoryAsync(
        long id) =>
        await HistoryQuery(id);

    private async Task<List<ActivityHistoryDto>> HistoryQuery(
        long? id)
    {
        return await _context.ActivityHistories
            .AsNoTracking()
            .Where(x => x.Module == ModuleName && x.EntityName == EntityName && (id == null || x.EntityId == id))
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
    // List page : tab (status / in force), search, sort, page on
    // the server. Counts : All / <status> / InForce.
    //===========================================================

    private static SortMap<ProductPricingMotorBikes> PagedSorts() =>
        new SortMap<ProductPricingMotorBikes>("CardNo")
            .Add("CardNo", x => x.CardNo)
            .Add("SupplierName", x => x.SupplierName)
            .Add("CardType", x => x.CardType)
            .Add("FromText", x => x.EffectiveFrom)
            .Add("ToText", x => x.EffectiveTo)
            .Add("ProductCount", x => x.ProductCount)
            .Add("Reference", x => x.Reference)
            .Add("Status", x => x.Status)
            .Tie(x => x.Id);

    public async Task<PagedResult<ProductPricingMotorBikesDto>> GetPagedAsync(
        InventoryDocumentPageRequest request)
    {
        IQueryable<ProductPricingMotorBikes> query =
            _context
                .Set<ProductPricingMotorBikes>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted);

        foreach (string word in request.SafeSearch.Split(' ', StringSplitOptions.RemoveEmptyEntries))
        {
            string like =
                PagingQuery.LikePattern(word);

            query =
                query.Where
                (
                    x =>
                        EF.Functions.ILike(x.CardNo, like) ||
                        EF.Functions.ILike(x.SupplierName, like) ||
                        EF.Functions.ILike(x.CardType, like) ||
                        EF.Functions.ILike(x.Reference, like) ||
                        EF.Functions.ILike(x.Remarks, like) ||
                        EF.Functions.ILike(x.Status, like)
                );
        }

        DateOnly today =
            BusinessToday();

        var statusCounts =
            await query
                .GroupBy(x => x.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync();

        int supersededCount =
            await query.CountAsync(x => x.Status == StatusPosted && x.SupersededFrom != null && x.SupersededFrom <= today);

        // In force today
        HashSet<long> inForce =
            (await InForceQuery(query).Select(x => x.Id).ToListAsync()).ToHashSet();

        string tab =
            (request.Tab ?? string.Empty).Trim().ToLowerInvariant();

        if (tab == "inforce")
        {
            query = InForceQuery(query);
        }
        else if (tab == "superseded")
        {
            query = query.Where(x => x.Status == StatusPosted && x.SupersededFrom != null && x.SupersededFrom <= today);
        }
        else if (tab == "posted")
        {
            // Posted and not replaced yet
            query = query.Where(x => x.Status == StatusPosted && (x.SupersededFrom == null || x.SupersededFrom > today));
        }
        else if (tab != string.Empty && tab != "all")
        {
            query = query.Where(x => x.Status.ToLower() == tab);
        }

        int total =
            await query.CountAsync();

        PagingQuery.FitPage(request, total);

        IQueryable<ProductPricingMotorBikes> ordered =
            string.IsNullOrWhiteSpace(request.Sort)
                ? query
                    .OrderByDescending(x => x.EffectiveFrom)
                    .ThenByDescending(x => x.Id)
                : PagedSorts().Apply(query, request);

        List<ProductPricingMotorBikes> rows =
            await ordered
                .Page(request)
                .ToListAsync();

        Dictionary<string, int> counts =
            new()
            {
                ["All"] = statusCounts.Sum(x => x.Count),
                ["InForce"] = inForce.Count
            };

        foreach (var row in statusCounts)
        {
            counts[row.Status ?? string.Empty] = row.Count;
        }

        counts["Superseded"] = supersededCount;

        counts[StatusPosted] =
            (counts.TryGetValue(StatusPosted, out int posted) ? posted : 0) - supersededCount;

        return new PagedResult<ProductPricingMotorBikesDto>
        {
            Items = rows.Select(x => ToDto(x, inForce.Contains(x.Id))).ToList(),
            TotalCount = total,
            Page = request.SafePage,
            PageSize = request.SafePageSize,
            Counts = counts
        };
    }
}
