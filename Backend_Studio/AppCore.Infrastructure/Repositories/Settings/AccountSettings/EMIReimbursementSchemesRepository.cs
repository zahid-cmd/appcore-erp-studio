//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Settings.AccountSettings;

using AppCore.Domain.Common;

using AppCore.Infrastructure.Persistence;

using SchemeEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.EmiReimbursementSchemes;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using SupplierEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.SupplierProfiles;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.AccountSettings;


//===============================================================
// EMI Reimbursement Schemes Repository
//
// Code       : ERS-0001, generated here (deleted rows counted, so
//              a number is never reused). The form shows a preview.
// Brand      : by BrandCode; live, active (unless already saved)
//              and with a Motor Bikes Supplier (the claim goes to
//              it). Locked after saving.
// Validity   : Valid From required; Valid To empty = open ended,
//              else not before Valid From.
// Tenure     : 0 = all, or 3 / 6 / 9 / 12 / 18 / 24 / 36 months.
// Swap / EMI : Basis Percent (0–100, % of the showroom's share of
//              that charge) or Fixed (Tk per sale); at least one
//              value above 0. Caps optional (> 0 when given).
//              Total Cap = Swap Cap + EMI Cap (worked out here; an
//              empty cap counts 0; no limit when both are empty).
// Overlap    : two ACTIVE live schemes of the same brand cannot
//              cover the same date for the same tenure ("All"
//              overlaps every tenure).
// History    : ActivityHistories, Module "Account Settings".
//===============================================================

public class EmiReimbursementSchemesRepository
    : IEmiReimbursementSchemesRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string CodePrefix =
        "ERS";

    private const string ModuleName =
        "Account Settings";

    private const string EntityName =
        "EmiReimbursementScheme";

    public const string Percent =
        "Percent";

    public const string Fixed =
        "Fixed";

    // 0 = All
    public static readonly int[] Tenures =
    {
        0, 3, 6, 9, 12, 18, 24, 36
    };

    private const decimal MaxMoney =
        99999999.99m;

    private const int RemarksMaxLength =
        1000;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public EmiReimbursementSchemesRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Normalized Input
    //===========================================================

    private sealed class SchemeInput
    {
        public DateOnly ValidFrom { get; set; }

        public DateOnly? ValidTo { get; set; }

        public int TenureMonths { get; set; }

        public string SwapBasis { get; set; } = Percent;

        public decimal SwapValue { get; set; }

        public decimal? SwapCap { get; set; }

        public string EmiBasis { get; set; } = Percent;

        public decimal EmiValue { get; set; }

        public decimal? EmiCap { get; set; }

        public decimal? TotalCap { get; set; }

        public string Remarks { get; set; } = string.Empty;

        public bool Status { get; set; }
    }


    //===========================================================
    // Business Today (Asia/Dhaka)
    //===========================================================

    private static DateOnly BusinessToday()
    {
        TimeZoneInfo zone;

        try
        {
            zone =
                TimeZoneInfo.FindSystemTimeZoneById("Asia/Dhaka");
        }
        catch (TimeZoneNotFoundException)
        {
            zone =
                TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time");
        }

        return DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                zone));
    }


    private static string Text
    (
        DateOnly? value
    )
    {
        return value.HasValue
            ? value.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)
            : string.Empty;
    }


    private static string TenureText
    (
        int months
    )
    {
        return months == 0
            ? "All tenures"
            : $"{months} months";
    }


    //===========================================================
    // To DTOs (brand name + its Motor Bikes Supplier)
    //===========================================================

    private async Task<List<EmiReimbursementSchemesDto>>
        ToDtosAsync
        (
            List<SchemeEntity> rows
        )
    {
        List<string> brandCodes =
            rows
                .Select(x => x.BrandCode)
                .Distinct()
                .ToList();

        // Live brands win over deleted ones with the same code
        Dictionary<string, BrandManagementEntity> brands =
            (
                await _context
                    .Set<BrandManagementEntity>()
                    .AsNoTracking()
                    .Where(x => brandCodes.Contains(x.BrandCode))
                    .ToListAsync()
            )
            .GroupBy(x => x.BrandCode)
            .ToDictionary(
                g => g.Key,
                g => g.OrderBy(x => x.IsDeleted).First());

        List<string> supplierCodes =
            brands.Values
                .Select(x => x.MotorBikesSupplierCode)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .ToList();

        Dictionary<string, string> suppliers =
            (
                await _context
                    .Set<SupplierEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && supplierCodes.Contains(x.SupplierCode))
                    .Select(x => new { x.SupplierCode, x.DisplayName })
                    .ToListAsync()
            )
            .GroupBy(x => x.SupplierCode)
            .ToDictionary(
                g => g.Key,
                g => g.First().DisplayName);

        DateOnly today =
            BusinessToday();

        return rows
            .Select
            (
                x =>
                {
                    brands.TryGetValue(
                        x.BrandCode,
                        out BrandManagementEntity? brand);

                    string supplierCode =
                        brand?.MotorBikesSupplierCode ?? string.Empty;

                    return new EmiReimbursementSchemesDto
                    {
                        EmiReimbursementSchemeId = x.EmiReimbursementSchemeId,
                        SchemeCode = x.SchemeCode,
                        BrandCode = x.BrandCode,
                        BrandName = brand?.BrandName ?? x.BrandCode,
                        SupplierCode = supplierCode,
                        SupplierName =
                            supplierCode.Length == 0
                                ? string.Empty
                                : suppliers.GetValueOrDefault(supplierCode) ?? supplierCode,
                        ValidFrom = Text(x.ValidFrom),
                        ValidTo = Text(x.ValidTo),
                        TenureMonths = x.TenureMonths,
                        IsExpired = x.ValidTo.HasValue && x.ValidTo.Value < today,
                        IsUpcoming = x.ValidFrom > today,
                        SwapBasis = x.SwapBasis,
                        SwapValue = x.SwapValue,
                        SwapCap = x.SwapCap,
                        EmiBasis = x.EmiBasis,
                        EmiValue = x.EmiValue,
                        EmiCap = x.EmiCap,
                        TotalCap = x.TotalCap,
                        Remarks = x.Remarks,
                        Status = x.Status,
                        CreatedBy = x.CreatedBy,
                        CreatedDate = x.CreatedDate,
                        ModifiedBy = x.ModifiedBy,
                        ModifiedDate = x.ModifiedDate
                    };
                }
            )
            .ToList();
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<EmiReimbursementSchemesDto>>
        GetAllAsync()
    {
        List<SchemeEntity> rows =
            await _context
                .Set<SchemeEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.SchemeCode)
                .ToListAsync();

        return await ToDtosAsync(
            rows);
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<EmiReimbursementSchemesDto?>
        GetByIdAsync
        (
            long id
        )
    {
        SchemeEntity? row =
            await _context
                .Set<SchemeEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.EmiReimbursementSchemeId == id
                        &&
                        !x.IsDeleted
                );

        if (row == null)
        {
            return null;
        }

        return (await ToDtosAsync(new List<SchemeEntity> { row }))
            .FirstOrDefault();
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<EmiReimbursementSchemesDefaultsDto>
        GetDefaultsAsync()
    {
        var brands =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.BrandName)
                .Select
                (
                    x =>
                        new
                        {
                            x.BrandCode,
                            x.BrandName,
                            x.Status,
                            x.MotorBikesSupplierCode
                        }
                )
                .ToListAsync();

        List<string> supplierCodes =
            brands
                .Select(x => x.MotorBikesSupplierCode)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .ToList();

        Dictionary<string, string> suppliers =
            (
                await _context
                    .Set<SupplierEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && supplierCodes.Contains(x.SupplierCode))
                    .Select(x => new { x.SupplierCode, x.DisplayName })
                    .ToListAsync()
            )
            .GroupBy(x => x.SupplierCode)
            .ToDictionary(
                g => g.Key,
                g => g.First().DisplayName);

        return new EmiReimbursementSchemesDefaultsDto
        {
            Code =
                await NextCodeAsync(),

            Brands =
                brands
                    .Select
                    (
                        x =>
                        {
                            // A deleted supplier counts as none
                            bool hasSupplier =
                                !string.IsNullOrWhiteSpace(x.MotorBikesSupplierCode)
                                &&
                                suppliers.ContainsKey(x.MotorBikesSupplierCode);

                            return new EmiSchemeBrandOptionDto
                            {
                                BrandCode = x.BrandCode,
                                BrandName = x.BrandName,
                                IsActive = x.Status,
                                SupplierCode = hasSupplier ? x.MotorBikesSupplierCode : string.Empty,
                                SupplierName = hasSupplier ? suppliers[x.MotorBikesSupplierCode] : string.Empty
                            };
                        }
                    )
                    .ToList(),

            Tenures =
                Tenures.ToList(),

            Bases =
                new List<string> { Percent, Fixed },

            Today =
                Text(BusinessToday())
        };
    }


    //===========================================================
    // Next Code : ERS-0001 (deleted rows included → never reused)
    //===========================================================

    private async Task<string>
        NextCodeAsync()
    {
        List<string> codes =
            await _context
                .Set<SchemeEntity>()
                .AsNoTracking()
                .Select(x => x.SchemeCode)
                .ToListAsync();

        int highest =
            codes
                .Select
                (
                    code =>
                    {
                        string[] parts =
                            (code ?? string.Empty)
                                .Trim()
                                .Split('-', StringSplitOptions.RemoveEmptyEntries);

                        return parts.Length == 2
                            &&
                            string.Equals(parts[0], CodePrefix, StringComparison.OrdinalIgnoreCase)
                            &&
                            int.TryParse(parts[1], out int number)
                                ? number
                                : 0;
                    }
                )
                .DefaultIfEmpty(0)
                .Max();

        return $"{CodePrefix}-{highest + 1:D4}";
    }


    //===========================================================
    // Brand check : live, active (unless already saved) and with a
    // live Motor Bikes Supplier
    //===========================================================

    private async Task<BrandManagementEntity>
        CheckBrandAsync
        (
            string? brandCode,
            string? savedBrandCode
        )
    {
        string code =
            (brandCode ?? string.Empty).Trim();

        if (code.Length == 0)
        {
            throw new InvalidOperationException(
                "Brand is required.");
        }

        BrandManagementEntity? brand =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.BrandCode == code
                        &&
                        !x.IsDeleted
                );

        if (brand == null)
        {
            throw new InvalidOperationException(
                $"Brand '{code}' was not found or is deleted.");
        }

        if (!brand.Status && code != (savedBrandCode ?? string.Empty))
        {
            throw new InvalidOperationException(
                $"Brand '{brand.BrandName}' is inactive. Select another brand.");
        }

        bool hasSupplier =
            !string.IsNullOrWhiteSpace(brand.MotorBikesSupplierCode)
            &&
            await _context
                .Set<SupplierEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        x.SupplierCode == brand.MotorBikesSupplierCode
                        &&
                        !x.IsDeleted
                );

        if (!hasSupplier)
        {
            throw new InvalidOperationException(
                $"Brand '{brand.BrandName}' has no Motor Bikes Supplier. Set it on Brand Management first : the claims go to that supplier.");
        }

        return brand;
    }


    //===========================================================
    // Normalize & Validate Input
    //===========================================================

    private static DateOnly? ParseDate
    (
        string? value,
        string label,
        bool required
    )
    {
        string text =
            (value ?? string.Empty).Trim();

        if (text.Length == 0)
        {
            if (required)
            {
                throw new InvalidOperationException(
                    $"{label} is required.");
            }

            return null;
        }

        if (text.Length > 10)
        {
            text =
                text.Substring(0, 10);
        }

        if
        (
            !DateOnly.TryParseExact(
                text,
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out DateOnly date)
        )
        {
            throw new InvalidOperationException(
                $"{label} must be a valid date (yyyy-MM-dd).");
        }

        return date;
    }


    private static string Basis
    (
        string? value,
        string label
    )
    {
        string text =
            (value ?? string.Empty).Trim();

        if (string.Equals(text, Percent, StringComparison.OrdinalIgnoreCase))
        {
            return Percent;
        }

        if (string.Equals(text, Fixed, StringComparison.OrdinalIgnoreCase))
        {
            return Fixed;
        }

        throw new InvalidOperationException(
            $"{label} basis must be Percent or Fixed.");
    }


    private static decimal Value
    (
        decimal value,
        string basis,
        string label
    )
    {
        if (value < 0 || decimal.Round(value, 2) != value)
        {
            throw new InvalidOperationException(
                $"{label} must be 0 or more with at most 2 decimals.");
        }

        if (basis == Percent && value > 100)
        {
            throw new InvalidOperationException(
                $"{label} cannot be more than 100%.");
        }

        if (basis == Fixed && value > MaxMoney)
        {
            throw new InvalidOperationException(
                $"{label} cannot be more than {MaxMoney:N2}.");
        }

        return value;
    }


    private static decimal? Cap
    (
        decimal? value,
        string label
    )
    {
        if (!value.HasValue || value.Value == 0)
        {
            return null;
        }

        if (value.Value < 0 || decimal.Round(value.Value, 2) != value.Value || value.Value > MaxMoney)
        {
            throw new InvalidOperationException(
                $"{label} must be above 0 (Tk, at most 2 decimals) or left empty for no limit.");
        }

        return value.Value;
    }


    private static SchemeInput Normalize
    (
        CreateEmiReimbursementSchemesDto dto
    )
    {
        DateOnly validFrom =
            ParseDate(dto.ValidFrom, "Valid From", true)!.Value;

        DateOnly? validTo =
            ParseDate(dto.ValidTo, "Valid To", false);

        if (validTo.HasValue && validTo.Value < validFrom)
        {
            throw new InvalidOperationException(
                "Valid To cannot be before Valid From.");
        }

        if (!Tenures.Contains(dto.TenureMonths))
        {
            throw new InvalidOperationException(
                $"Tenure must be All or one of : {string.Join(", ", Tenures.Where(x => x > 0))} months.");
        }

        string swapBasis =
            Basis(dto.SwapBasis, "Swap charge");

        string emiBasis =
            Basis(dto.EmiBasis, "EMI charge");

        decimal swapValue =
            Value(dto.SwapValue, swapBasis, "Swap charge share");

        decimal emiValue =
            Value(dto.EmiValue, emiBasis, "EMI charge share");

        if (swapValue == 0 && emiValue == 0)
        {
            throw new InvalidOperationException(
                "Give a reimbursement for the swap charge, the EMI charge or both.");
        }

        decimal? swapCap =
            Cap(dto.SwapCap, "Swap Cap");

        decimal? emiCap =
            Cap(dto.EmiCap, "EMI Cap");

        string remarks =
            (dto.Remarks ?? string.Empty).Trim();

        if (remarks.Length > RemarksMaxLength)
        {
            throw new InvalidOperationException(
                $"Remarks cannot be longer than {RemarksMaxLength} characters.");
        }

        return new SchemeInput
        {
            ValidFrom = validFrom,
            ValidTo = validTo,
            TenureMonths = dto.TenureMonths,
            SwapBasis = swapBasis,
            SwapValue = swapValue,
            SwapCap = swapCap,
            EmiBasis = emiBasis,
            EmiValue = emiValue,
            EmiCap = emiCap,
            // Swap Cap + EMI Cap (the sent value is ignored; an empty
            // cap counts 0); no limit when both are empty
            TotalCap =
                swapCap.HasValue || emiCap.HasValue
                    ? (swapCap ?? 0) + (emiCap ?? 0)
                    : null,
            Remarks = remarks,
            Status = dto.Status
        };
    }


    //===========================================================
    // Overlap : active live schemes of the brand covering the same
    // date for the same tenure (All overlaps every tenure)
    //===========================================================

    private async Task
        EnsureNoOverlapAsync
        (
            string brandCode,
            DateOnly validFrom,
            DateOnly? validTo,
            int tenureMonths,
            long excludeId
        )
    {
        List<SchemeEntity> others =
            await _context
                .Set<SchemeEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.Status
                        &&
                        x.BrandCode == brandCode
                        &&
                        x.EmiReimbursementSchemeId != excludeId
                        &&
                        (
                            x.TenureMonths == tenureMonths
                            ||
                            x.TenureMonths == 0
                            ||
                            tenureMonths == 0
                        )
                )
                .ToListAsync();

        DateOnly end =
            validTo ?? DateOnly.MaxValue;

        SchemeEntity? clash =
            others.FirstOrDefault
            (
                x =>
                    x.ValidFrom <= end
                    &&
                    validFrom <= (x.ValidTo ?? DateOnly.MaxValue)
            );

        if (clash != null)
        {
            throw new InvalidOperationException(
                $"It overlaps scheme {clash.SchemeCode} ({TenureText(clash.TenureMonths)}, " +
                $"{Text(clash.ValidFrom)} to {(clash.ValidTo.HasValue ? Text(clash.ValidTo) : "open")}). " +
                "Change the dates or the tenure, or make one of them inactive.");
        }
    }


    //===========================================================
    // Apply
    //===========================================================

    private static void Apply
    (
        SchemeEntity entity,
        SchemeInput input
    )
    {
        entity.ValidFrom = input.ValidFrom;
        entity.ValidTo = input.ValidTo;
        entity.TenureMonths = input.TenureMonths;
        entity.SwapBasis = input.SwapBasis;
        entity.SwapValue = input.SwapValue;
        entity.SwapCap = input.SwapCap;
        entity.EmiBasis = input.EmiBasis;
        entity.EmiValue = input.EmiValue;
        entity.EmiCap = input.EmiCap;
        entity.TotalCap = input.TotalCap;
        entity.Remarks = input.Remarks;
        entity.Status = input.Status;
    }


    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory
    (
        SchemeEntity entity,
        string brandName,
        string activityType,
        string verb,
        long userId
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    ModuleName,

                EntityName =
                    EntityName,

                EntityId =
                    entity.EmiReimbursementSchemeId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"EMI Reimbursement Scheme {verb}",

                ActivityDescription =
                    $"Scheme {entity.SchemeCode} of brand '{brandName}' ({TenureText(entity.TenureMonths)}, " +
                    $"{Text(entity.ValidFrom)} to {(entity.ValidTo.HasValue ? Text(entity.ValidTo) : "open")}) {verb.ToLowerInvariant()}.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateEmiReimbursementSchemesDto dto,
            long userId
        )
    {
        BrandManagementEntity brand =
            await CheckBrandAsync(
                dto.BrandCode,
                null);

        SchemeInput input =
            Normalize(dto);

        if (input.Status)
        {
            await EnsureNoOverlapAsync(
                brand.BrandCode,
                input.ValidFrom,
                input.ValidTo,
                input.TenureMonths,
                0);
        }

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        SchemeEntity entity =
            new SchemeEntity
            {
                SchemeCode =
                    await NextCodeAsync(),

                BrandCode =
                    brand.BrandCode,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };

        Apply(
            entity,
            input);

        _context
            .Set<SchemeEntity>()
            .Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            brand.BrandName,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.EmiReimbursementSchemeId;
    }


    //===========================================================
    // Update (code and brand locked)
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateEmiReimbursementSchemesDto dto,
            long userId
        )
    {
        SchemeEntity? entity =
            await _context
                .Set<SchemeEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.EmiReimbursementSchemeId == dto.EmiReimbursementSchemeId
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "EMI Reimbursement Scheme not found.");
        }

        if
        (
            !string.IsNullOrWhiteSpace(dto.BrandCode)
            &&
            !string.Equals(dto.BrandCode.Trim(), entity.BrandCode, StringComparison.Ordinal)
        )
        {
            throw new InvalidOperationException(
                "Brand cannot be changed after the scheme is saved. Make a new scheme for the other brand.");
        }

        BrandManagementEntity brand =
            await CheckBrandAsync(
                entity.BrandCode,
                entity.BrandCode);

        SchemeInput input =
            Normalize(dto);

        if (input.Status)
        {
            await EnsureNoOverlapAsync(
                entity.BrandCode,
                input.ValidFrom,
                input.ValidTo,
                input.TenureMonths,
                entity.EmiReimbursementSchemeId);
        }

        Apply(
            entity,
            input);

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        AddHistory(
            entity,
            brand.BrandName,
            "Update",
            "Updated",
            userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Delete
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        SchemeEntity? entity =
            await _context
                .Set<SchemeEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.EmiReimbursementSchemeId == id
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "EMI Reimbursement Scheme not found.");
        }

        // TODO (EMI Reconciliation) : block while EMI claims use it

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            DateTime.UtcNow;

        string brandName =
            await BrandNameAsync(entity.BrandCode);

        AddHistory(
            entity,
            brandName,
            "Delete",
            "Deleted",
            userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore (most recently deleted)
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        SchemeEntity? entity =
            await _context
                .Set<SchemeEntity>()
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        bool brandLive =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        x.BrandCode == entity.BrandCode
                        &&
                        !x.IsDeleted
                );

        if (!brandLive)
        {
            throw new InvalidOperationException(
                $"Scheme {entity.SchemeCode} cannot be restored : its brand ({entity.BrandCode}) has been deleted.");
        }

        if (entity.Status)
        {
            try
            {
                await EnsureNoOverlapAsync(
                    entity.BrandCode,
                    entity.ValidFrom,
                    entity.ValidTo,
                    entity.TenureMonths,
                    entity.EmiReimbursementSchemeId);
            }
            catch (InvalidOperationException ex)
            {
                throw new InvalidOperationException(
                    $"Scheme {entity.SchemeCode} cannot be restored. {ex.Message}");
            }
        }

        entity.IsDeleted =
            false;

        entity.DeletedBy =
            null;

        entity.DeletedDate =
            null;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        AddHistory(
            entity,
            await BrandNameAsync(entity.BrandCode),
            "Restore",
            "Restored",
            userId);

        await _context.SaveChangesAsync();

        return true;
    }


    private async Task<string>
        BrandNameAsync
        (
            string brandCode
        )
    {
        return await _context
            .Set<BrandManagementEntity>()
            .AsNoTracking()
            .Where(x => x.BrandCode == brandCode)
            .OrderBy(x => x.IsDeleted)
            .Select(x => x.BrandName)
            .FirstOrDefaultAsync()
            ??
            brandCode;
    }


    //===========================================================
    // Exists
    //===========================================================

    public async Task<bool>
        ExistsAsync
        (
            long id
        )
    {
        return await _context
            .Set<SchemeEntity>()
            .AnyAsync
            (
                x =>
                    x.EmiReimbursementSchemeId == id
                    &&
                    !x.IsDeleted
            );
    }
}