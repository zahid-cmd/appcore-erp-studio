//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.VatManagement.VatSetup;
using AppCore.Domain.Common;
using AppCore.Infrastructure.Persistence;

using RuleEntity =
    AppCore.Domain.Entities.VatManagement.VatSetup.PurchaseVat;

using GeneralLedgersEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.VatManagement.VatSetup;


//===============================================================
// Purchase VAT Repository
//
// Code        : PVT-0001, generated here (deleted rows counted,
//               so a number is never reused). The form previews it.
// VAT Type    : Motor Bikes / Spare Parts / Lubricants / Accessories.
//               Locked after saving.
// VAT Rate    : 0 – 100 %, at most 2 decimals.
// Period      : Effective From → Valid To (both required; Valid To
//               defaults to 30 June ending the financial year).
//               Same rate next period = Extend (Valid To moves);
//               a new rate = a new rule.
// Overlap     : ACTIVE live rules of a type never overlap.
// Same rate   : a new rule must change the rate of the rule right
//               before (and after) it; otherwise extend that rule.
// Ledger      : an active live General Ledger under the VAT Current
//               Account sub group (SUB-002-002-011), stored by code.
// State       : Inactive / Upcoming / Current / Expiring (Valid To
//               within ReminderDays and no next rule) / Expired
//               (passed, no later rule) / Old (a later rule took
//               over).
// History     : ActivityHistories, Module "VAT Management".
//===============================================================

public class PurchaseVatRepository
    : IPurchaseVatRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string CodePrefix =
        "PVT";

    private const string ModuleName =
        "VAT Management";

    private const string EntityName =
        "PurchaseVat";

    private const string Title =
        "Purchase VAT";

    // VAT Current Account sub group (CLS-002 Asset › Current Assets)
    private const string VatLedgerSubGroupCode =
        "SUB-002-002-011";

    private const int RemarksMaxLength =
        1000;

    // "Expiring" starts this many days before Valid To
    // (to move into System Configurations later)
    public const int ReminderDays =
        30;

    // Fixed list, in display order
    public static readonly string[] VatTypes =
    {
        "Motor Bikes",
        "Spare Parts",
        "Lubricants",
        "Accessories"
    };


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public PurchaseVatRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Normalized Input
    //===========================================================

    private sealed class RuleInput
    {
        public decimal VatRate { get; set; }

        public bool InputCreditAllowed { get; set; }

        public DateOnly EffectiveFrom { get; set; }

        public DateOnly ValidTo { get; set; }

        public string LedgerCode { get; set; } = string.Empty;

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


    private static string RateText
    (
        decimal rate
    )
    {
        return $"{rate.ToString("0.##", CultureInfo.InvariantCulture)}%";
    }


    // "spare parts" → "Spare Parts", unknown → null
    private static string? CanonicalType
    (
        string? value
    )
    {
        return VatTypes.FirstOrDefault
        (
            x =>
                string.Equals(
                    x,
                    value?.Trim(),
                    StringComparison.OrdinalIgnoreCase)
        );
    }


    //===========================================================
    // To DTOs (ledger name, valid until, state)
    //
    // Valid Until and State come from the ACTIVE live rules of the
    // same type, so they are worked out from all of them.
    //===========================================================

    private async Task<List<PurchaseVatDto>>
        ToDtosAsync
        (
            List<RuleEntity> rules
        )
    {
        if (rules.Count == 0)
        {
            return new List<PurchaseVatDto>();
        }

        List<RuleEntity> activeRules =
            await _context
                .Set<RuleEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.Status
                )
                .ToListAsync();

        List<string> ledgerCodes =
            rules
                .Select(x => x.LedgerCode)
                .Distinct()
                .ToList();

        Dictionary<string, string> ledgerNames =
            (
                await _context
                    .Set<GeneralLedgersEntity>()
                    .AsNoTracking()
                    .Where(x => ledgerCodes.Contains(x.LedgerCode))
                    .OrderBy(x => x.IsDeleted)
                    .Select(x => new { x.LedgerCode, x.LedgerName })
                    .ToListAsync()
            )
            .GroupBy(x => x.LedgerCode)
            .ToDictionary(x => x.Key, x => x.First().LedgerName);

        DateOnly today =
            BusinessToday();

        return rules
            .Select
            (
                rule =>
                {
                    string state =
                        StateOf(
                            rule,
                            activeRules,
                            today);

                    return new PurchaseVatDto
                    {
                        PurchaseVatId = rule.PurchaseVatId,

                        VatCode = rule.VatCode,

                        VatType = rule.VatType,

                        VatRate = rule.VatRate,

                        InputCreditAllowed = rule.InputCreditAllowed,

                        EffectiveFrom = Text(rule.EffectiveFrom),

                        ValidTo = Text(rule.ValidTo),

                        RateState = state,

                        DaysToExpiry = rule.ValidTo.DayNumber - today.DayNumber,

                        LedgerCode = rule.LedgerCode,

                        LedgerName =
                            ledgerNames.TryGetValue(rule.LedgerCode, out string? name)
                                ? name
                                : rule.LedgerCode,

                        Remarks = rule.Remarks,

                        Status = rule.Status,

                        CreatedDate = rule.CreatedDate,

                        ModifiedDate = rule.ModifiedDate
                    };
                }
            )
            .ToList();
    }


    // Current / Expiring / Expired / Upcoming / Old / Inactive
    private static string StateOf
    (
        RuleEntity rule,
        List<RuleEntity> activeRules,
        DateOnly today
    )
    {
        if (!rule.Status)
        {
            return "Inactive";
        }

        if (rule.EffectiveFrom > today)
        {
            return "Upcoming";
        }

        bool laterRule =
            activeRules.Any
            (
                x =>
                    x.VatType == rule.VatType
                    &&
                    x.EffectiveFrom > rule.ValidTo
            );

        if (rule.ValidTo < today)
        {
            return laterRule
                ? "Old"
                : "Expired";
        }

        // Taken over the next day → no gap, no warning
        bool continued =
            activeRules.Any
            (
                x =>
                    x.VatType == rule.VatType
                    &&
                    x.EffectiveFrom == rule.ValidTo.AddDays(1)
            );

        return !continued
               &&
               rule.ValidTo.DayNumber - today.DayNumber <= ReminderDays
            ? "Expiring"
            : "Current";
    }


    // 30 June ending the financial year that holds the date
    private static DateOnly FinancialYearEnd
    (
        DateOnly date
    )
    {
        DateOnly june30 =
            new DateOnly(date.Year, 6, 30);

        return date <= june30
            ? june30
            : june30.AddYears(1);
    }



    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<PurchaseVatDto>>
        GetAllAsync()
    {
        List<RuleEntity> rules =
            await _context
                .Set<RuleEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .ToListAsync();

        // Type in display order, newest Effective From first
        List<RuleEntity> ordered =
            rules
                .OrderBy(x => Array.IndexOf(VatTypes, x.VatType) < 0 ? 99 : Array.IndexOf(VatTypes, x.VatType))
                .ThenByDescending(x => x.EffectiveFrom)
                .ThenBy(x => x.VatCode)
                .ToList();

        return await ToDtosAsync(
            ordered);
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<PurchaseVatDto?>
        GetByIdAsync
        (
            long id
        )
    {
        RuleEntity? rule =
            await _context
                .Set<RuleEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.PurchaseVatId == id
                        &&
                        !x.IsDeleted
                );

        if (rule == null)
        {
            return null;
        }

        return (
            await ToDtosAsync(
                new List<RuleEntity> { rule })
        )
        .First();
    }


    //===========================================================
    // Get Rate : the active rule of a type in force on a date
    // (latest Effective From on or before the date)
    //===========================================================

    public async Task<PurchaseVatDto?>
        GetRateAsync
        (
            string vatType,
            DateOnly date
        )
    {
        string? type =
            CanonicalType(
                vatType);

        if (type == null)
        {
            return null;
        }

        RuleEntity? rule =
            await _context
                .Set<RuleEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.Status
                        &&
                        x.VatType == type
                        &&
                        x.EffectiveFrom <= date
                        &&
                        x.ValidTo >= date
                )
                .OrderByDescending(x => x.EffectiveFrom)
                .FirstOrDefaultAsync();

        if (rule == null)
        {
            return null;
        }

        return (
            await ToDtosAsync(
                new List<RuleEntity> { rule })
        )
        .First();
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<PurchaseVatDefaultsDto>
        GetDefaultsAsync()
    {
        List<PurchaseVatLedgerOptionDto> ledgers =
            await _context
                .Set<GeneralLedgersEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.SubGroupCode == VatLedgerSubGroupCode
                )
                .OrderBy(x => x.LedgerCode)
                .Select
                (
                    x =>
                        new PurchaseVatLedgerOptionDto
                        {
                            LedgerCode = x.LedgerCode,

                            LedgerName = x.LedgerName,

                            IsActive = x.IsActive
                        }
                )
                .ToListAsync();

        // Ledger of the latest live rule of each type
        Dictionary<string, string> suggested =
            (
                await _context
                    .Set<RuleEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted)
                    .Select(x => new { x.VatType, x.LedgerCode, x.EffectiveFrom, x.PurchaseVatId })
                    .ToListAsync()
            )
            .GroupBy(x => x.VatType)
            .ToDictionary
            (
                x => x.Key,
                x => x
                    .OrderByDescending(r => r.EffectiveFrom)
                    .ThenByDescending(r => r.PurchaseVatId)
                    .First()
                    .LedgerCode
            );

        return new PurchaseVatDefaultsDto
        {
            Code =
                await NextCodeAsync(),

            VatTypes =
                VatTypes.ToList(),

            Ledgers =
                ledgers,

            SuggestedLedgers =
                suggested,

            Today =
                Text(BusinessToday()),

            DefaultValidTo =
                Text(FinancialYearEnd(BusinessToday())),

            ReminderDays =
                ReminderDays
        };
    }


    //===========================================================
    // Next Code : PVT-0001 (deleted rows included → never
    // reused)
    //===========================================================

    private async Task<string>
        NextCodeAsync()
    {
        List<string> codes =
            await _context
                .Set<RuleEntity>()
                .AsNoTracking()
                .Select(x => x.VatCode)
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
    // Ledger check : a live General Ledger under the VAT Current
    // Account sub group, active unless the rule already uses it
    //===========================================================

    private async Task<GeneralLedgersEntity>
        CheckLedgerAsync
        (
            string? ledgerCode,
            string? savedLedgerCode
        )
    {
        string code =
            (ledgerCode ?? string.Empty).Trim();

        if (code.Length == 0)
        {
            throw new InvalidOperationException(
                "VAT Current Account is required.");
        }

        GeneralLedgersEntity? ledger =
            await _context
                .Set<GeneralLedgersEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.LedgerCode == code
                        &&
                        !x.IsDeleted
                );

        if (ledger == null)
        {
            throw new InvalidOperationException(
                $"Ledger {code} was not found. It may have been deleted.");
        }

        if (!string.Equals(ledger.SubGroupCode, VatLedgerSubGroupCode, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"'{ledger.LedgerName}' is not a VAT Current Account ledger (sub group {VatLedgerSubGroupCode}).");
        }

        if
        (
            !ledger.IsActive
            &&
            !string.Equals(code, savedLedgerCode, StringComparison.Ordinal)
        )
        {
            throw new InvalidOperationException(
                $"'{ledger.LedgerName}' is inactive.");
        }

        return ledger;
    }


    //===========================================================
    // Normalize & Validate Input
    //===========================================================

    private static DateOnly ParseDate
    (
        string? value,
        string label
    )
    {
        string text =
            (value ?? string.Empty).Trim();

        if (text.Length == 0)
        {
            throw new InvalidOperationException(
                $"{label} is required.");
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


    private static RuleInput Normalize
    (
        CreatePurchaseVatDto dto
    )
    {
        if (dto.VatRate < 0 || dto.VatRate > 100)
        {
            throw new InvalidOperationException(
                "VAT Rate must be between 0 and 100%.");
        }

        if (decimal.Round(dto.VatRate, 2) != dto.VatRate)
        {
            throw new InvalidOperationException(
                "VAT Rate can have at most 2 decimals.");
        }

        string remarks =
            (dto.Remarks ?? string.Empty).Trim();

        if (remarks.Length > RemarksMaxLength)
        {
            throw new InvalidOperationException(
                $"Remarks cannot be longer than {RemarksMaxLength} characters.");
        }

        DateOnly effectiveFrom =
            ParseDate(
                dto.EffectiveFrom,
                "Effective From");

        DateOnly validTo =
            ParseDate(
                dto.ValidTo,
                "Valid To");

        if (validTo < effectiveFrom)
        {
            throw new InvalidOperationException(
                "Valid To cannot be before Effective From.");
        }

        return new RuleInput
        {
            VatRate =
                dto.VatRate,

            InputCreditAllowed =
                dto.InputCreditAllowed,

            EffectiveFrom =
                effectiveFrom,

            ValidTo =
                validTo,

            LedgerCode =
                (dto.LedgerCode ?? string.Empty).Trim(),

            Remarks =
                remarks,

            Status =
                dto.Status
        };
    }


    //===========================================================
    // Overlap : ACTIVE live rules of a type cannot share a day
    //===========================================================

    private async Task
        EnsureNoOverlapAsync
        (
            string vatType,
            DateOnly from,
            DateOnly to,
            long currentId
        )
    {
        RuleEntity? clash =
            await _context
                .Set<RuleEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.Status
                        &&
                        x.VatType == vatType
                        &&
                        x.PurchaseVatId != currentId
                        &&
                        x.EffectiveFrom <= to
                        &&
                        x.ValidTo >= from
                )
                .OrderBy(x => x.EffectiveFrom)
                .FirstOrDefaultAsync();

        if (clash != null)
        {
            throw new InvalidOperationException(
                $"Rule {clash.VatCode} already sets the {vatType} rate from {clash.EffectiveFrom:dd-MMM-yyyy} to {clash.ValidTo:dd-MMM-yyyy}, " +
                "which overlaps these dates.");
        }
    }


    //===========================================================
    // Same Rate : a rule must change the rate of the active rule
    // right before it and right after it; the same rate is an
    // extension of that rule, not a new rule.
    //===========================================================

    private async Task
        EnsureRateChangesAsync
        (
            string vatType,
            DateOnly from,
            DateOnly to,
            decimal rate,
            long currentId
        )
    {
        List<RuleEntity> others =
            await _context
                .Set<RuleEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.Status
                        &&
                        x.VatType == vatType
                        &&
                        x.PurchaseVatId != currentId
                )
                .ToListAsync();

        RuleEntity? before =
            others
                .Where(x => x.ValidTo < from)
                .OrderByDescending(x => x.ValidTo)
                .FirstOrDefault();

        if (before != null && before.VatRate == rate)
        {
            throw new InvalidOperationException(
                $"The rate {RateText(rate)} is the same as rule {before.VatCode} " +
                $"({before.EffectiveFrom:dd-MMM-yyyy} to {before.ValidTo:dd-MMM-yyyy}). " +
                "Extend that rule instead of adding a new one.");
        }

        RuleEntity? after =
            others
                .Where(x => x.EffectiveFrom > to)
                .OrderBy(x => x.EffectiveFrom)
                .FirstOrDefault();

        if (after != null && after.VatRate == rate)
        {
            throw new InvalidOperationException(
                $"The rate {RateText(rate)} is the same as the next rule {after.VatCode} " +
                $"(from {after.EffectiveFrom:dd-MMM-yyyy}). Change that rule's dates instead of adding a new one.");
        }
    }


    //===========================================================
    // Apply
    //===========================================================

    private static void Apply
    (
        RuleEntity entity,
        RuleInput input
    )
    {
        entity.VatRate = input.VatRate;

        entity.InputCreditAllowed = input.InputCreditAllowed;

        entity.EffectiveFrom = input.EffectiveFrom;

        entity.ValidTo = input.ValidTo;

        entity.LedgerCode = input.LedgerCode;

        entity.Remarks = input.Remarks;

        entity.Status = input.Status;
    }


    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory
    (
        RuleEntity entity,
        string activityType,
        string verb,
        long userId,
        string extra = ""
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
                    entity.PurchaseVatId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"{Title} Rule {verb}",

                ActivityDescription =
                    $"Rule {entity.VatCode} ({entity.VatType}, {RateText(entity.VatRate)}, {Text(entity.EffectiveFrom)} to {Text(entity.ValidTo)}) {verb.ToLowerInvariant()}.{extra}",

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
            CreatePurchaseVatDto dto,
            long userId
        )
    {
        string type =
            CanonicalType(
                dto.VatType)
            ??
            throw new InvalidOperationException(
                $"VAT Type is required ({string.Join(", ", VatTypes)}).");

        RuleInput input =
            Normalize(dto);

        await CheckLedgerAsync(
            input.LedgerCode,
            null);

        if (input.Status)
        {
            await EnsureNoOverlapAsync(
                type,
                input.EffectiveFrom,
                input.ValidTo,
                0);

            await EnsureRateChangesAsync(
                type,
                input.EffectiveFrom,
                input.ValidTo,
                input.VatRate,
                0);
        }

        RuleEntity entity =
            new RuleEntity
            {
                VatCode =
                    await NextCodeAsync(),

                VatType =
                    type,

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
            .Set<RuleEntity>()
            .Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        return entity.PurchaseVatId;
    }


    //===========================================================
    // Update (code and VAT Type locked)
    //
    // A corrected rate is saved on the rule. Documents that used it
    // follow when purchase / sale documents exist (see the VAT
    // Setup decision : drafts, POs and unfiled posted documents).
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdatePurchaseVatDto dto,
            long userId
        )
    {
        RuleEntity? entity =
            await _context
                .Set<RuleEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.PurchaseVatId == dto.PurchaseVatId
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                $"{Title} rule not found.");
        }

        if
        (
            !string.IsNullOrWhiteSpace(dto.VatType)
            &&
            !string.Equals(CanonicalType(dto.VatType), entity.VatType, StringComparison.Ordinal)
        )
        {
            throw new InvalidOperationException(
                "VAT Type cannot be changed after the rule is saved. Make a new rule for the other type.");
        }

        RuleInput input =
            Normalize(dto);

        await CheckLedgerAsync(
            input.LedgerCode,
            entity.LedgerCode);

        if (input.Status)
        {
            await EnsureNoOverlapAsync(
                entity.VatType,
                input.EffectiveFrom,
                input.ValidTo,
                entity.PurchaseVatId);

            await EnsureRateChangesAsync(
                entity.VatType,
                input.EffectiveFrom,
                input.ValidTo,
                input.VatRate,
                entity.PurchaseVatId);
        }

        string extra =
            entity.VatRate != input.VatRate
                ? $" Rate changed from {RateText(entity.VatRate)} to {RateText(input.VatRate)}."
                : string.Empty;

        Apply(
            entity,
            input);

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        AddHistory(
            entity,
            "Update",
            "Updated",
            userId,
            extra);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Extend : same rate, later Valid To (must not run into the
    // next active rule of the type)
    //===========================================================

    public async Task
        ExtendAsync
        (
            ExtendPurchaseVatDto dto,
            long userId
        )
    {
        RuleEntity? entity =
            await _context
                .Set<RuleEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.PurchaseVatId == dto.PurchaseVatId
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                $"{Title} rule not found.");
        }

        if (!entity.Status)
        {
            throw new InvalidOperationException(
                "An inactive rule cannot be extended.");
        }

        DateOnly validTo =
            ParseDate(
                dto.ValidTo,
                "Valid To");

        if (validTo <= entity.ValidTo)
        {
            throw new InvalidOperationException(
                $"The new Valid To must be after {entity.ValidTo:dd-MMM-yyyy}.");
        }

        await EnsureNoOverlapAsync(
            entity.VatType,
            entity.EffectiveFrom,
            validTo,
            entity.PurchaseVatId);

        string extra =
            $" Extended from {Text(entity.ValidTo)} to {Text(validTo)}.";

        entity.ValidTo =
            validTo;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        AddHistory(
            entity,
            "Update",
            "Extended",
            userId,
            extra);

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
        RuleEntity? entity =
            await _context
                .Set<RuleEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.PurchaseVatId == id
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                $"{Title} rule not found.");
        }

        // TODO (Purchase / Sales) : block while documents use it

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            DateTime.UtcNow;

        AddHistory(
            entity,
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
        RuleEntity? entity =
            await _context
                .Set<RuleEntity>()
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        if (entity.Status)
        {
            try
            {
                await EnsureNoOverlapAsync(
                    entity.VatType,
                    entity.EffectiveFrom,
                    entity.ValidTo,
                    entity.PurchaseVatId);
            }
            catch (InvalidOperationException ex)
            {
                throw new InvalidOperationException(
                    $"Rule {entity.VatCode} cannot be restored. {ex.Message}");
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
            "Restore",
            "Restored",
            userId);

        await _context.SaveChangesAsync();

        return true;
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
            .Set<RuleEntity>()
            .AnyAsync
            (
                x =>
                    x.PurchaseVatId == id
                    &&
                    !x.IsDeleted
            );
    }
}