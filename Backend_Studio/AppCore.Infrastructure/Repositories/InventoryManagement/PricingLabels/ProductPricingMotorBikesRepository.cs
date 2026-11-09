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
                                MotorBikeId = l.MotorBikeId,
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

    // Cards with at least one line in force today
    private async Task<HashSet<long>> InForceIdsAsync(
        IReadOnlyCollection<long> cardIds)
    {
        if (cardIds.Count == 0)
        {
            return new HashSet<long>();
        }

        var suppliers =
            await _context
                .Set<ProductPricingMotorBikes>()
                .AsNoTracking()
                .Where(x => cardIds.Contains(x.Id) && x.Status == StatusPosted)
                .Select(x => x.SupplierCode)
                .Distinct()
                .ToListAsync();

        DateOnly today =
            BusinessToday();

        HashSet<long> result =
            new();

        foreach (string supplier in suppliers)
        {
            foreach (ProductPricingMotorBikesActiveDto active in await GetActiveAsync(supplier, today))
            {
                result.Add(active.CardId);
            }
        }

        return result;
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
            VatRules = await VatRulesAsync()
        };
    }


    //===========================================================
    // The card in force per model for a supplier on a date :
    // a posted Campaign covering the date, else the latest posted
    // Regular card with Effective From on or before it
    //===========================================================

    public async Task<List<ProductPricingMotorBikesActiveDto>> GetActiveAsync(
        string supplierCode,
        DateOnly date,
        IReadOnlyCollection<long>? motorBikeIds = null)
    {
        string supplier =
            (supplierCode ?? string.Empty).Trim();

        var rows =
            await
            (
                from h in _context.Set<ProductPricingMotorBikes>().AsNoTracking()
                join l in _context.Set<ProductPricingMotorBikeLines>().AsNoTracking()
                    on h.Id equals l.CardId
                where !h.IsDeleted
                      && h.Status == StatusPosted
                      && h.SupplierCode == supplier
                      && h.EffectiveFrom <= date
                      && (h.CardType == TypeRegular || (h.EffectiveTo != null && h.EffectiveTo >= date))
                      && (motorBikeIds == null || motorBikeIds.Contains(l.MotorBikeId))
                select new
                {
                    l.MotorBikeId,
                    h.Id,
                    h.CardNo,
                    h.CardType,
                    h.EffectiveFrom,
                    h.EffectiveTo,
                    l.Dp,
                    l.Mrp,
                    l.Commission
                }
            )
            .ToListAsync();

        return rows
            .GroupBy(x => x.MotorBikeId)
            .Select
            (
                g =>
                {
                    var pick =
                        g.OrderBy(x => x.CardType == TypeCampaign ? 0 : 1)
                         .ThenByDescending(x => x.EffectiveFrom)
                         .ThenByDescending(x => x.Id)
                         .First();

                    return new ProductPricingMotorBikesActiveDto
                    {
                        MotorBikeId = g.Key,
                        CardId = pick.Id,
                        CardNo = pick.CardNo,
                        CardType = pick.CardType,
                        EffectiveFrom = DateText(pick.EffectiveFrom),
                        EffectiveTo = DateText(pick.EffectiveTo),
                        Dp = pick.Dp,
                        Mrp = pick.Mrp,
                        Commission = pick.Commission
                    };
                }
            )
            .ToList();
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

        string cardType =
            (dto.CardType ?? string.Empty).Trim();

        input.CardType =
            string.Equals(cardType, TypeCampaign, StringComparison.OrdinalIgnoreCase)
                ? TypeCampaign
                : TypeRegular;

        input.EffectiveFrom =
            TryDate(dto.EffectiveFrom)
            ??
            throw new InvalidOperationException(
                "Effective From is required.");

        if (input.CardType == TypeCampaign)
        {
            input.EffectiveTo =
                TryDate(dto.EffectiveTo)
                ??
                throw new InvalidOperationException(
                    "A campaign card needs Effective To (its last day).");

            if (input.EffectiveTo.Value < input.EffectiveFrom)
            {
                throw new InvalidOperationException(
                    "Effective To must be on or after Effective From.");
            }
        }

        input.Reference =
            Limit(dto.Reference, 100);

        input.Remarks =
            Limit((dto.Remarks ?? string.Empty).Replace("\r", " ").Replace("\n", " "), 500);

        List<ProductPricingMotorBikesLineInputDto> lines =
            (dto.Lines ?? new List<ProductPricingMotorBikesLineInputDto>())
                .Where(x => x != null && x.MotorBikeId > 0)
                .ToList();

        if (lines.Count == 0)
        {
            throw new InvalidOperationException(
                "Add at least one model to the card.");
        }

        if (lines.Count > MaxLines)
        {
            throw new InvalidOperationException(
                $"A card holds at most {MaxLines} models.");
        }

        long? twice =
            lines
                .GroupBy(x => x.MotorBikeId)
                .Where(g => g.Count() > 1)
                .Select(g => (long?)g.Key)
                .FirstOrDefault();

        List<long> ids =
            lines.Select(x => x.MotorBikeId).Distinct().ToList();

        var bikes =
            (
                await _context
                    .Set<MotorBikesEntity>()
                    .AsNoTracking()
                    .Where(x => ids.Contains(x.MotorBikeId) && !x.IsDeleted)
                    .Select(x => new { x.MotorBikeId, x.ProductCode, x.ProductName })
                    .ToListAsync()
            )
            .ToDictionary(x => x.MotorBikeId);

        if (twice.HasValue)
        {
            string name =
                bikes.TryGetValue(twice.Value, out var b) ? b.ProductName : $"#{twice.Value}";

            throw new InvalidOperationException(
                $"{name} is on the card twice.");
        }

        decimal vatRate =
            VatRateOn(await VatRulesAsync(), input.EffectiveFrom);

        int lineNo = 0;

        foreach (ProductPricingMotorBikesLineInputDto line in lines)
        {
            lineNo++;

            if (!bikes.TryGetValue(line.MotorBikeId, out var bike))
            {
                throw new InvalidOperationException(
                    $"Line {lineNo} : the model was not found.");
            }

            if (line.Dp <= 0m)
            {
                throw new InvalidOperationException(
                    $"{bike.ProductName} : DP must be above 0.");
            }

            if (line.Mrp <= 0m)
            {
                throw new InvalidOperationException(
                    $"{bike.ProductName} : MRP must be above 0.");
            }

            if (Money(line.Dp) != line.Dp || Money(line.Mrp) != line.Mrp)
            {
                throw new InvalidOperationException(
                    $"{bike.ProductName} : DP and MRP take at most 2 decimals.");
            }

            decimal vatInside =
                Money(line.Mrp * vatRate / (100m + vatRate));

            decimal commission =
                Money(line.Mrp - line.Dp);

            input.Lines.Add(
                new ProductPricingMotorBikeLines
                {
                    LineNo = lineNo,
                    MotorBikeId = bike.MotorBikeId,
                    ProductCode = Limit(bike.ProductCode, 40),
                    ProductName = Limit(bike.ProductName, 250),
                    Dp = line.Dp,
                    Mrp = line.Mrp,
                    VatRate = vatRate,
                    VatInside = vatInside,
                    NetSale = Money(line.Mrp - vatInside),
                    Commission = commission,
                    CommissionPercent =
                        line.Mrp > 0m
                            ? Math.Round(commission * 100m / line.Mrp, 4, MidpointRounding.AwayFromZero)
                            : 0m
                });
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
        entity.ProductCount = input.Lines.Count;
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

        List<long> ids =
            lines.Select(x => x.MotorBikeId).ToList();

        var clashes =
            await
            (
                from h in _context.Set<ProductPricingMotorBikes>().AsNoTracking()
                join l in _context.Set<ProductPricingMotorBikeLines>().AsNoTracking()
                    on h.Id equals l.CardId
                where !h.IsDeleted
                      && h.Status == StatusPosted
                      && h.Id != id
                      && h.SupplierCode == entity.SupplierCode
                      && h.CardType == entity.CardType
                      && ids.Contains(l.MotorBikeId)
                select new { h.CardNo, h.EffectiveFrom, h.EffectiveTo, l.ProductName }
            )
            .ToListAsync();

        var clash =
            entity.CardType == TypeRegular
                ? clashes.FirstOrDefault(x => x.EffectiveFrom == entity.EffectiveFrom)
                : clashes.FirstOrDefault
                  (
                      x =>
                          x.EffectiveFrom <= (entity.EffectiveTo ?? entity.EffectiveFrom)
                          &&
                          (x.EffectiveTo ?? x.EffectiveFrom) >= entity.EffectiveFrom
                  );

        if (clash != null)
        {
            throw new InvalidOperationException(
                entity.CardType == TypeRegular
                    ? $"{clash.ProductName} already has a posted Regular card from {DateText(clash.EffectiveFrom)} for this supplier ({clash.CardNo}). Use another Effective From, or cancel {clash.CardNo}."
                    : $"{clash.ProductName} already has a posted Campaign card of this supplier on these dates ({clash.CardNo}, {DateText(clash.EffectiveFrom)} to {DateText(clash.EffectiveTo)}).");
        }

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

                if (entity.CardType == TypeRegular)
                {
                    foreach (ProductPricingMotorBikeLines line in lines)
                    {
                        ProductPriceIndexWriter.Add(
                            _context,
                            ProductType,
                            line.MotorBikeId,
                            line.ProductCode,
                            line.ProductName,
                            line.Mrp,
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

        string reason =
            Limit((dto?.Reason ?? string.Empty).Replace("\r", " ").Replace("\n", " "), 500);

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

        var statusCounts =
            await query
                .GroupBy(x => x.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToListAsync();

        // In force today (posted cards that still decide a model)
        List<long> postedIds =
            await query
                .Where(x => x.Status == StatusPosted)
                .Select(x => x.Id)
                .ToListAsync();

        HashSet<long> inForce =
            await InForceIdsAsync(postedIds);

        string tab =
            (request.Tab ?? string.Empty).Trim().ToLowerInvariant();

        if (tab == "inforce")
        {
            List<long> ids = inForce.ToList();

            query = query.Where(x => ids.Contains(x.Id));
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
