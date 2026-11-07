//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using Microsoft.EntityFrameworkCore;
using AppCore.Application.WarrantyManagement.WarrantyControl;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.Settings.ProductSettings;
using AppCore.Domain.Entities.WarrantyManagement.WarrantyControl;
using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.WarrantyManagement.WarrantyControl;


//===============================================================
// Warranty Configuration Repository (hand-written page)
//
// Warranty Parts (WPT-nnn)
//   Name required, unique among live rows. A part named by a
//   live coverage cannot be deleted (deactivate it instead).
//
// Warranty Policies (WPO-nnn) : the warranty of a brand
//   Brand required, Model optional (empty = all models of the
//   brand; a model policy wins over the brand one). Effective
//   From, Effective To (empty = open-ended), the whole-bike
//   period + km limit, terms, exclusions. Active policies of the
//   same brand / model may not overlap in dates : to start a new
//   one, set the To date of the old one first. Brand and model
//   locked after saving. A policy with live coverages cannot be
//   deleted.
//
// Warranty Coverages (WCV-nnn) : the part-level warranty
//   One part of a policy, once per policy; it wins over the
//   whole-bike period for that part. Policy and part locked after
//   saving.
//
// Periods : number + Days / Months / Years (at most 10 years),
// optional km limit (the warranty ends at whichever comes first).
//
// Codes : <prefix>-nnn, deleted rows count (never reused).
//===============================================================

public class WarrantyConfigurationRepository
    : IWarrantyConfigurationRepository
{
    private const int NameMaxLength = 100;

    private const int RemarksMaxLength = 500;

    private const int TextMaxLength = 4000;

    private const int NotesMaxLength = 200;

    private const int MaxKm = 1000000;

    private const string HistoryModule = "Warranty Management";

    private const string HistoryEntity = "WarrantyConfiguration";


    private readonly AppDbContext _context;


    public WarrantyConfigurationRepository(
        AppDbContext context)
    {
        _context = context;
    }


    private DbSet<WarrantyParts> Parts =>
        _context.Set<WarrantyParts>();

    private DbSet<WarrantyPolicies> Policies =>
        _context.Set<WarrantyPolicies>();

    private DbSet<WarrantyCoverages> Coverages =>
        _context.Set<WarrantyCoverages>();

    private DbSet<BrandManagement> Brands =>
        _context.Set<BrandManagement>();

    private DbSet<BikeModels> Models =>
        _context.Set<BikeModels>();


    // The server's date (the dealer's local day)
    private static DateOnly Today =>
        DateOnly.FromDateTime(DateTime.Now);



    //===========================================================
    // Small helpers
    //===========================================================

    private static string DateText(DateOnly date) =>
        date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static string DisplayDate(DateOnly date) =>
        date.ToString("dd MMM yyyy", CultureInfo.InvariantCulture);

    private static string Clean(string? value) =>
        string.Join(" ", (value ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries));


    private static string Limited
    (
        string? value,
        int maxLength,
        string label
    )
    {
        string text =
            (value ?? string.Empty).Trim();

        if (text.Length > maxLength)
        {
            throw new InvalidOperationException(
                $"{label} cannot be longer than {maxLength} characters.");
        }

        return text;
    }


    private static string RequiredName
    (
        string? value,
        string label
    )
    {
        string name = Clean(value);

        if (name.Length == 0)
        {
            throw new InvalidOperationException(
                $"{label} is required.");
        }

        if (name.Length > NameMaxLength)
        {
            throw new InvalidOperationException(
                $"{label} cannot be longer than {NameMaxLength} characters.");
        }

        return name;
    }


    private static DateOnly ParseDate
    (
        string? text,
        string label = "Effective From"
    )
    {
        string value =
            (text ?? string.Empty).Trim();

        if (value.Length >= 10)
        {
            value = value.Substring(0, 10);
        }

        if
        (
            !DateOnly.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out DateOnly date)
        )
        {
            throw new InvalidOperationException(
                $"{label} is required (a valid date).");
        }

        if (date.Year < 2000 || date.Year > 2100)
        {
            throw new InvalidOperationException(
                $"{label} must be between 2000 and 2100.");
        }

        return date;
    }


    // A period : number > 0, at most 10 years
    private static (int Value, string Unit) Period
    (
        int value,
        string? unit,
        string label = "Period"
    )
    {
        string key = (unit ?? string.Empty).Trim();

        string stored =
            WarrantyPeriodUnits.All.FirstOrDefault(x => string.Equals(x, key, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException($"{label} unit : choose Days, Months or Years.");

        if (value <= 0)
        {
            throw new InvalidOperationException(
                $"{label} is required (more than 0).");
        }

        int max =
            stored == WarrantyPeriodUnits.Days ? 3660
            : stored == WarrantyPeriodUnits.Months ? 120
            : 10;

        if (value > max)
        {
            throw new InvalidOperationException(
                $"{label} cannot be more than {max} {stored.ToLower()} (10 years).");
        }

        return (value, stored);
    }


    // Optional km limit : empty / 0 = no limit
    private static int? Km
    (
        int? value
    )
    {
        if (value == null || value == 0)
        {
            return null;
        }

        if (value < 0 || value > MaxKm)
        {
            throw new InvalidOperationException(
                $"Km Limit must be between 1 and {MaxKm:N0} km (or empty for no limit).");
        }

        return value;
    }


    // 2, Years, 20000 -> "2 Years / 20,000 km"
    private static string PeriodText(int value, string unit, int? km)
    {
        string label =
            value == 1 && unit.EndsWith("s") ? unit[..^1] : unit;

        string text = $"{value} {label}";

        return km == null
            ? text
            : $"{text} / {km.Value.ToString("N0", CultureInfo.InvariantCulture)} km";
    }


    // <prefix>-nnn : highest number used (deleted rows included) + 1
    private static string NextCode
    (
        string prefix,
        IEnumerable<string> codes
    )
    {
        int highest = 0;

        foreach (string code in codes)
        {
            string[] parts =
                (code ?? string.Empty).Trim().Split('-', StringSplitOptions.RemoveEmptyEntries);

            if
            (
                parts.Length == 2
                &&
                string.Equals(parts[0], prefix, StringComparison.OrdinalIgnoreCase)
                &&
                int.TryParse(parts[1], out int number)
                &&
                number > highest
            )
            {
                highest = number;
            }
        }

        return $"{prefix}-{highest + 1:D3}";
    }


    private async Task<string> NextPartCodeAsync() =>
        NextCode("WPT", await Parts.AsNoTracking().Select(x => x.Code).ToListAsync());

    private async Task<string> NextPolicyCodeAsync() =>
        NextCode("WPO", await Policies.AsNoTracking().Select(x => x.Code).ToListAsync());

    private async Task<string> NextCoverageCodeAsync() =>
        NextCode("WCV", await Coverages.AsNoTracking().Select(x => x.Code).ToListAsync());


    private async Task<int> NextPartOrderAsync()
    {
        int highest =
            await Parts
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => (int?)x.DisplayOrder)
                .MaxAsync()
            ?? 0;

        return highest + 1;
    }



    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory
    (
        long entityId,
        string activityType,
        string title,
        string description,
        long userId
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = entityId,
                ActivityType = activityType,
                ActivityTitle = title,
                ActivityDescription = description,
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });
    }



    //===========================================================
    // Policy state : its dates against today
    //===========================================================

    private static string StateOf
    (
        WarrantyPolicies x,
        DateOnly today
    ) =>
        !x.IsActive ? WarrantyPolicyStates.Inactive
        : x.EffectiveFrom > today ? WarrantyPolicyStates.Upcoming
        : x.EffectiveTo != null && x.EffectiveTo < today ? WarrantyPolicyStates.Ended
        : WarrantyPolicyStates.Current;


    private static string RangeText(DateOnly from, DateOnly? to) =>
        to == null
            ? $"from {DisplayDate(from)} (open-ended)"
            : $"{DisplayDate(from)} to {DisplayDate(to.Value)}";



    //===========================================================
    // Read : every tab in one call
    //===========================================================

    public async Task<WarrantyConfigurationDto>
        GetAllAsync()
    {
        DateOnly today = Today;

        List<WarrantyParts> parts =
            await Parts
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.Code)
                .ToListAsync();

        List<WarrantyPolicies> policies =
            await Policies
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .ToListAsync();

        List<WarrantyCoverages> coverages =
            await Coverages
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .ToListAsync();

        List<BrandManagement> brands =
            await Brands
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.BrandName)
                .ToListAsync();

        List<BikeModels> models =
            await Models
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.ModelName)
                .ToListAsync();

        Dictionary<long, WarrantyParts> partById =
            parts.ToDictionary(x => x.WarrantyPartId);

        Dictionary<long, BrandManagement> brandById =
            brands.ToDictionary(x => x.BrandManagementId);

        Dictionary<long, BikeModels> modelById =
            models.ToDictionary(x => x.BikeModelId);

        Dictionary<long, WarrantyPolicies> policyById =
            policies.ToDictionary(x => x.WarrantyPolicyId);

        // Coverages of live policies only
        coverages =
            coverages.Where(x => policyById.ContainsKey(x.WarrantyPolicyId)).ToList();

        string BrandName(WarrantyPolicies p) =>
            brandById.TryGetValue(p.BrandManagementId, out var b) ? b.BrandName : "(deleted brand)";

        string ModelName(WarrantyPolicies p) =>
            p.BikeModelId != null && modelById.TryGetValue(p.BikeModelId.Value, out var m) ? m.ModelName : string.Empty;

        string ScopeOf(WarrantyPolicies p) =>
            p.BikeModelId == null ? $"{BrandName(p)} (all models)" : $"{BrandName(p)} {ModelName(p)}";

        string PartNameOf(WarrantyCoverages c) =>
            partById.TryGetValue(c.WarrantyPartId, out var p) ? p.Name : "(deleted part)";

        WarrantyConfigurationDto result =
            new WarrantyConfigurationDto
            {
                Today = DateText(today)
            };

        result.Parts =
            parts
                .Select(
                    x =>
                        new WarrantyPartDto
                        {
                            WarrantyPartId = x.WarrantyPartId,
                            PublicId = x.PublicId,
                            Code = x.Code,
                            Name = x.Name,
                            DisplayOrder = x.DisplayOrder,
                            Remarks = x.Remarks,
                            IsActive = x.IsActive,
                            CoverageCount = coverages.Count(c => c.WarrantyPartId == x.WarrantyPartId)
                        })
                .ToList();

        result.Policies =
            policies
                .Select(
                    x =>
                        new WarrantyPolicyDto
                        {
                            WarrantyPolicyId = x.WarrantyPolicyId,
                            PublicId = x.PublicId,
                            Code = x.Code,
                            Name = x.Name,
                            BrandPublicId = brandById.TryGetValue(x.BrandManagementId, out var b) ? b.PublicId : Guid.Empty,
                            BrandName = BrandName(x),
                            BikeModelPublicId = x.BikeModelId != null && modelById.TryGetValue(x.BikeModelId.Value, out var m) ? m.PublicId : null,
                            ModelName = ModelName(x),
                            EffectiveFrom = DateText(x.EffectiveFrom),
                            EffectiveTo = x.EffectiveTo == null ? string.Empty : DateText(x.EffectiveTo.Value),
                            PeriodValue = x.PeriodValue,
                            PeriodUnit = x.PeriodUnit,
                            KmLimit = x.KmLimit,
                            Terms = x.Terms,
                            Exclusions = x.Exclusions,
                            Remarks = x.Remarks,
                            IsActive = x.IsActive,
                            PolicyState = StateOf(x, today),
                            CoverageCount = coverages.Count(c => c.WarrantyPolicyId == x.WarrantyPolicyId)
                        })
                .OrderBy(x => x.BrandName)
                .ThenBy(x => x.ModelName)
                .ThenByDescending(x => x.EffectiveFrom)
                .ThenBy(x => x.Code)
                .ToList();

        result.Coverages =
            coverages
                .Select(
                    x =>
                    {
                        WarrantyPolicies policy = policyById[x.WarrantyPolicyId];

                        return new WarrantyCoverageDto
                        {
                            WarrantyCoverageId = x.WarrantyCoverageId,
                            PublicId = x.PublicId,
                            Code = x.Code,
                            PolicyPublicId = policy.PublicId,
                            PolicyCode = policy.Code,
                            PolicyName = policy.Name,
                            ScopeText = ScopeOf(policy),
                            PolicyState = StateOf(policy, today),
                            PartPublicId = partById.TryGetValue(x.WarrantyPartId, out var p) ? p.PublicId : Guid.Empty,
                            PartName = PartNameOf(x),
                            PeriodValue = x.PeriodValue,
                            PeriodUnit = x.PeriodUnit,
                            KmLimit = x.KmLimit,
                            Notes = x.Notes,
                            IsActive = x.IsActive
                        };
                    })
                // Policy, then the parts in their order
                .OrderBy(x => x.PolicyCode)
                .ThenBy(x => parts.FindIndex(p => p.PublicId == x.PartPublicId))
                .ThenBy(x => x.Code)
                .ToList();

        result.Brands =
            brands
                .Select(x => new WarrantyLookupDto { PublicId = x.PublicId, Code = x.BrandCode, Name = x.BrandName, IsActive = x.Status })
                .ToList();

        result.Models =
            models
                .Where(x => brandById.ContainsKey(x.BrandManagementId))
                .Select(
                    x =>
                        new WarrantyLookupDto
                        {
                            PublicId = x.PublicId,
                            Code = x.ModelCode,
                            Name = x.ModelName,
                            ParentPublicId = brandById[x.BrandManagementId].PublicId,
                            IsActive = x.Status
                        })
                .ToList();

        return result;
    }


    public async Task<WarrantyConfigurationDefaultsDto>
        GetDefaultsAsync()
    {
        return new WarrantyConfigurationDefaultsDto
        {
            PartCode = await NextPartCodeAsync(),
            NextPartOrder = await NextPartOrderAsync(),
            PolicyCode = await NextPolicyCodeAsync(),
            CoverageCode = await NextCoverageCodeAsync()
        };
    }



    //===========================================================
    // WARRANTY PARTS
    //===========================================================

    private static (string Name, int Order, string Remarks) NormalizePart
    (
        SaveWarrantyPartDto dto
    )
    {
        string name = RequiredName(dto.Name, "Part Name");

        if (dto.DisplayOrder < 0 || dto.DisplayOrder > 9999)
        {
            throw new InvalidOperationException(
                "Display Order must be between 1 and 9999.");
        }

        return (name, dto.DisplayOrder, Limited(dto.Remarks, RemarksMaxLength, "Remarks"));
    }


    private async Task EnsurePartNameFreeAsync
    (
        string name,
        long excludeId
    )
    {
        string key = name.ToLower();

        WarrantyParts? same =
            await Parts
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => !x.IsDeleted && x.WarrantyPartId != excludeId && x.Name.ToLower() == key);

        if (same != null)
        {
            throw new InvalidOperationException(
                $"Warranty Part '{name}' already exists ({same.Code}).");
        }
    }


    public async Task<Guid>
        CreatePartAsync
        (
            SaveWarrantyPartDto dto,
            long userId
        )
    {
        var input = NormalizePart(dto);

        await EnsurePartNameFreeAsync(input.Name, 0);

        WarrantyParts entity =
            new WarrantyParts
            {
                Code = await NextPartCodeAsync(),
                Name = input.Name,
                DisplayOrder = input.Order > 0 ? input.Order : await NextPartOrderAsync(),
                Remarks = input.Remarks,
                IsActive = dto.IsActive,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        Parts.Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(entity.WarrantyPartId, "Create", "Warranty Part Created",
            $"Warranty Part '{entity.Name}' ({entity.Code}) created.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.PublicId;
    }


    public async Task
        UpdatePartAsync
        (
            Guid publicId,
            SaveWarrantyPartDto dto,
            long userId
        )
    {
        WarrantyParts entity =
            await Parts.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The warranty part was not found. It may have been deleted.");

        var input = NormalizePart(dto);

        await EnsurePartNameFreeAsync(input.Name, entity.WarrantyPartId);

        entity.Name = input.Name;
        entity.DisplayOrder = input.Order > 0 ? input.Order : entity.DisplayOrder;
        entity.Remarks = input.Remarks;
        entity.IsActive = dto.IsActive;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.WarrantyPartId, "Update", "Warranty Part Updated",
            $"Warranty Part '{entity.Name}' ({entity.Code}) updated.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task
        DeletePartAsync
        (
            Guid publicId,
            long userId
        )
    {
        WarrantyParts entity =
            await Parts.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The warranty part was not found. It may have been deleted already.");

        List<string> usedBy =
            await Coverages
                .AsNoTracking()
                .Where(x => x.WarrantyPartId == entity.WarrantyPartId && !x.IsDeleted)
                .OrderBy(x => x.Code)
                .Select(x => x.Code)
                .ToListAsync();

        if (usedBy.Count > 0)
        {
            throw new InvalidOperationException(
                $"'{entity.Name}' is used by {usedBy.Count} coverage(s) ({string.Join(", ", usedBy.Take(5))}). Deactivate it instead, or delete those coverages first.");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(entity.WarrantyPartId, "Delete", "Warranty Part Deleted",
            $"Warranty Part '{entity.Name}' ({entity.Code}) deleted.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task<bool>
        RestorePartAsync
        (
            long userId
        )
    {
        WarrantyParts? entity =
            await Parts
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .ThenByDescending(x => x.WarrantyPartId)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        try
        {
            await EnsurePartNameFreeAsync(entity.Name, entity.WarrantyPartId);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException(
                $"'{entity.Name}' cannot be restored. {ex.Message}");
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.WarrantyPartId, "Restore", "Warranty Part Restored",
            $"Warranty Part '{entity.Name}' ({entity.Code}) restored.", userId);

        await _context.SaveChangesAsync();

        return true;
    }



    //===========================================================
    // WARRANTY POLICIES
    //===========================================================

    private sealed record PolicyInput(
        string Name,
        long BrandId,
        long? ModelId,
        string ScopeText,
        DateOnly From,
        DateOnly? To,
        int PeriodValue,
        string PeriodUnit,
        int? KmLimit,
        string Terms,
        string Exclusions,
        string Remarks);


    private async Task<PolicyInput> NormalizePolicyAsync
    (
        SaveWarrantyPolicyDto dto
    )
    {
        string name = RequiredName(dto.Name, "Policy Name");

        DateOnly from = ParseDate(dto.EffectiveFrom);

        DateOnly? to =
            string.IsNullOrWhiteSpace(dto.EffectiveTo)
                ? null
                : ParseDate(dto.EffectiveTo, "Effective To");

        if (to != null && to < from)
        {
            throw new InvalidOperationException(
                "Effective To cannot be before Effective From.");
        }

        var period = Period(dto.PeriodValue, dto.PeriodUnit, "Warranty Period");

        int? km = Km(dto.KmLimit);

        if (dto.BrandPublicId == null || dto.BrandPublicId == Guid.Empty)
        {
            throw new InvalidOperationException(
                "Choose the Brand.");
        }

        BrandManagement brand =
            await Brands.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == dto.BrandPublicId && !x.IsDeleted)
            ?? throw new InvalidOperationException("The brand was not found. It may have been deleted.");

        long? modelId = null;

        string scope = $"{brand.BrandName} (all models)";

        if (dto.BikeModelPublicId != null && dto.BikeModelPublicId != Guid.Empty)
        {
            BikeModels model =
                await Models.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == dto.BikeModelPublicId && !x.IsDeleted)
                ?? throw new InvalidOperationException("The model was not found. It may have been deleted.");

            if (model.BrandManagementId != brand.BrandManagementId)
            {
                throw new InvalidOperationException(
                    $"Model '{model.ModelName}' does not belong to {brand.BrandName}.");
            }

            modelId = model.BikeModelId;

            scope = $"{brand.BrandName} {model.ModelName}";
        }

        return new PolicyInput(
            name,
            brand.BrandManagementId,
            modelId,
            scope,
            from,
            to,
            period.Value,
            period.Unit,
            km,
            Limited(dto.Terms, TextMaxLength, "Terms"),
            Limited(dto.Exclusions, TextMaxLength, "Exclusions"),
            Limited(dto.Remarks, RemarksMaxLength, "Remarks"));
    }


    // Active policies of the same brand / model may not overlap
    private async Task EnsureNoOverlapAsync
    (
        long brandId,
        long? modelId,
        DateOnly from,
        DateOnly? to,
        long excludeId,
        bool active
    )
    {
        if (!active)
        {
            return;
        }

        DateOnly end =
            to ?? DateOnly.MaxValue;

        WarrantyPolicies? other =
            await Policies.AsNoTracking()
                .Where(
                    x =>
                        !x.IsDeleted && x.IsActive
                        && x.BrandManagementId == brandId
                        && x.BikeModelId == modelId
                        && x.WarrantyPolicyId != excludeId
                        && x.EffectiveFrom <= end
                        && (x.EffectiveTo == null || x.EffectiveTo >= from))
                .OrderBy(x => x.EffectiveFrom)
                .FirstOrDefaultAsync();

        if (other != null)
        {
            throw new InvalidOperationException(
                other.EffectiveTo == null
                    ? $"{other.Code} ({other.Name}) runs {RangeText(other.EffectiveFrom, null)} for the same brand / model. Set its Effective To before this policy starts, or change these dates."
                    : $"The dates overlap {other.Code} ({other.Name}), which runs {RangeText(other.EffectiveFrom, other.EffectiveTo)} for the same brand / model. Change the dates so they do not overlap.");
        }
    }


    public async Task<Guid>
        CreatePolicyAsync
        (
            SaveWarrantyPolicyDto dto,
            long userId
        )
    {
        PolicyInput input = await NormalizePolicyAsync(dto);

        await EnsureNoOverlapAsync(input.BrandId, input.ModelId, input.From, input.To, 0, dto.IsActive);

        WarrantyPolicies entity =
            new WarrantyPolicies
            {
                Code = await NextPolicyCodeAsync(),
                Name = input.Name,
                BrandManagementId = input.BrandId,
                BikeModelId = input.ModelId,
                EffectiveFrom = input.From,
                EffectiveTo = input.To,
                PeriodValue = input.PeriodValue,
                PeriodUnit = input.PeriodUnit,
                KmLimit = input.KmLimit,
                Terms = input.Terms,
                Exclusions = input.Exclusions,
                Remarks = input.Remarks,
                IsActive = dto.IsActive,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        Policies.Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(entity.WarrantyPolicyId, "Create", "Warranty Policy Created",
            $"Warranty Policy '{entity.Name}' ({entity.Code}) created for {input.ScopeText}, {RangeText(input.From, input.To)} : whole bike {PeriodText(input.PeriodValue, input.PeriodUnit, input.KmLimit)}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.PublicId;
    }


    public async Task
        UpdatePolicyAsync
        (
            Guid publicId,
            SaveWarrantyPolicyDto dto,
            long userId
        )
    {
        WarrantyPolicies entity =
            await Policies.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The warranty policy was not found. It may have been deleted.");

        PolicyInput input = await NormalizePolicyAsync(dto);

        if (input.BrandId != entity.BrandManagementId || input.ModelId != entity.BikeModelId)
        {
            throw new InvalidOperationException(
                "The brand and model of a policy cannot be changed after saving. Add a new policy instead.");
        }

        await EnsureNoOverlapAsync(input.BrandId, input.ModelId, input.From, input.To, entity.WarrantyPolicyId, dto.IsActive);

        entity.Name = input.Name;
        entity.EffectiveFrom = input.From;
        entity.EffectiveTo = input.To;
        entity.PeriodValue = input.PeriodValue;
        entity.PeriodUnit = input.PeriodUnit;
        entity.KmLimit = input.KmLimit;
        entity.Terms = input.Terms;
        entity.Exclusions = input.Exclusions;
        entity.Remarks = input.Remarks;
        entity.IsActive = dto.IsActive;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.WarrantyPolicyId, "Update", "Warranty Policy Updated",
            $"Warranty Policy '{entity.Name}' ({entity.Code}) updated : {RangeText(input.From, input.To)}, whole bike {PeriodText(input.PeriodValue, input.PeriodUnit, input.KmLimit)}.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task
        DeletePolicyAsync
        (
            Guid publicId,
            long userId
        )
    {
        WarrantyPolicies entity =
            await Policies.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The warranty policy was not found. It may have been deleted already.");

        int coverageCount =
            await Coverages.CountAsync(x => x.WarrantyPolicyId == entity.WarrantyPolicyId && !x.IsDeleted);

        if (coverageCount > 0)
        {
            throw new InvalidOperationException(
                $"'{entity.Name}' ({entity.Code}) has {coverageCount} coverage(s). Delete them first, or deactivate the policy.");
        }

        // Later : refuse when warranty records use the policy
        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(entity.WarrantyPolicyId, "Delete", "Warranty Policy Deleted",
            $"Warranty Policy '{entity.Name}' ({entity.Code}) deleted.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task<bool>
        RestorePolicyAsync
        (
            long userId
        )
    {
        WarrantyPolicies? entity =
            await Policies
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .ThenByDescending(x => x.WarrantyPolicyId)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        try
        {
            await EnsureNoOverlapAsync(entity.BrandManagementId, entity.BikeModelId, entity.EffectiveFrom, entity.EffectiveTo, entity.WarrantyPolicyId, entity.IsActive);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException(
                $"'{entity.Name}' ({entity.Code}) cannot be restored. {ex.Message}");
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.WarrantyPolicyId, "Restore", "Warranty Policy Restored",
            $"Warranty Policy '{entity.Name}' ({entity.Code}) restored.", userId);

        await _context.SaveChangesAsync();

        return true;
    }



    //===========================================================
    // WARRANTY COVERAGES
    //===========================================================

    private async Task<WarrantyPolicies> LivePolicyAsync
    (
        Guid? publicId
    )
    {
        if (publicId == null || publicId == Guid.Empty)
        {
            throw new InvalidOperationException(
                "Choose the Warranty Policy.");
        }

        return await Policies.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new InvalidOperationException("The warranty policy was not found. It may have been deleted.");
    }


    private async Task<WarrantyParts> LivePartAsync
    (
        Guid? publicId
    )
    {
        if (publicId == null || publicId == Guid.Empty)
        {
            throw new InvalidOperationException(
                "Choose the Part.");
        }

        return await Parts.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new InvalidOperationException("The part was not found. It may have been deleted.");
    }


    // Each part once per policy (live rows)
    private async Task EnsureCoverageFreeAsync
    (
        long policyId,
        long partId,
        string coversName,
        string policyCode,
        long excludeId
    )
    {
        WarrantyCoverages? same =
            await Coverages.AsNoTracking()
                .FirstOrDefaultAsync(
                    x =>
                        !x.IsDeleted
                        && x.WarrantyPolicyId == policyId
                        && x.WarrantyPartId == partId
                        && x.WarrantyCoverageId != excludeId);

        if (same != null)
        {
            throw new InvalidOperationException(
                $"{policyCode} already covers {coversName} ({same.Code}). Change that row instead.");
        }
    }


    public async Task<Guid>
        CreateCoverageAsync
        (
            SaveWarrantyCoverageDto dto,
            long userId
        )
    {
        WarrantyPolicies policy = await LivePolicyAsync(dto.PolicyPublicId);

        WarrantyParts part = await LivePartAsync(dto.PartPublicId);

        if (!part.IsActive)
        {
            throw new InvalidOperationException(
                $"'{part.Name}' is inactive. Activate it on the Warranty Parts tab first.");
        }

        string covers = part.Name;

        var period = Period(dto.PeriodValue, dto.PeriodUnit);

        int? km = Km(dto.KmLimit);

        string notes = Limited(dto.Notes, NotesMaxLength, "Notes");

        await EnsureCoverageFreeAsync(policy.WarrantyPolicyId, part.WarrantyPartId, covers, policy.Code, 0);

        WarrantyCoverages entity =
            new WarrantyCoverages
            {
                Code = await NextCoverageCodeAsync(),
                WarrantyPolicyId = policy.WarrantyPolicyId,
                WarrantyPartId = part.WarrantyPartId,
                PeriodValue = period.Value,
                PeriodUnit = period.Unit,
                KmLimit = km,
                Notes = notes,
                IsActive = dto.IsActive,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        Coverages.Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(entity.WarrantyCoverageId, "Create", "Warranty Coverage Created",
            $"Warranty Coverage {entity.Code} created : {policy.Code} covers {covers} for {PeriodText(entity.PeriodValue, entity.PeriodUnit, entity.KmLimit)}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.PublicId;
    }


    public async Task
        UpdateCoverageAsync
        (
            Guid publicId,
            SaveWarrantyCoverageDto dto,
            long userId
        )
    {
        WarrantyCoverages entity =
            await Coverages.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The warranty coverage was not found. It may have been deleted.");

        WarrantyPolicies policy = await LivePolicyAsync(dto.PolicyPublicId);

        WarrantyParts part = await LivePartAsync(dto.PartPublicId);

        if (policy.WarrantyPolicyId != entity.WarrantyPolicyId || part.WarrantyPartId != entity.WarrantyPartId)
        {
            throw new InvalidOperationException(
                "The policy and the part of a coverage cannot be changed after saving. Add a new coverage instead.");
        }

        var period = Period(dto.PeriodValue, dto.PeriodUnit);

        string covers = part.Name;

        entity.PeriodValue = period.Value;
        entity.PeriodUnit = period.Unit;
        entity.KmLimit = Km(dto.KmLimit);
        entity.Notes = Limited(dto.Notes, NotesMaxLength, "Notes");
        entity.IsActive = dto.IsActive;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.WarrantyCoverageId, "Update", "Warranty Coverage Updated",
            $"Warranty Coverage {entity.Code} updated : {policy.Code} covers {covers} for {PeriodText(entity.PeriodValue, entity.PeriodUnit, entity.KmLimit)}.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task
        DeleteCoverageAsync
        (
            Guid publicId,
            long userId
        )
    {
        WarrantyCoverages entity =
            await Coverages.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The warranty coverage was not found. It may have been deleted already.");

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(entity.WarrantyCoverageId, "Delete", "Warranty Coverage Deleted",
            $"Warranty Coverage {entity.Code} deleted.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task<bool>
        RestoreCoverageAsync
        (
            long userId
        )
    {
        WarrantyCoverages? entity =
            await Coverages
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .ThenByDescending(x => x.WarrantyCoverageId)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        WarrantyPolicies? policy =
            await Policies.AsNoTracking().FirstOrDefaultAsync(x => x.WarrantyPolicyId == entity.WarrantyPolicyId);

        if (policy == null || policy.IsDeleted)
        {
            throw new InvalidOperationException(
                $"Coverage {entity.Code} cannot be restored : its policy is deleted. Restore the policy first.");
        }

        WarrantyParts? part =
            await Parts.AsNoTracking().FirstOrDefaultAsync(x => x.WarrantyPartId == entity.WarrantyPartId);

        if (part == null || part.IsDeleted)
        {
            throw new InvalidOperationException(
                $"Coverage {entity.Code} cannot be restored : its part is deleted. Restore the part first.");
        }

        string covers = part.Name;

        try
        {
            await EnsureCoverageFreeAsync(entity.WarrantyPolicyId, entity.WarrantyPartId, covers, policy.Code, entity.WarrantyCoverageId);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException(
                $"Coverage {entity.Code} cannot be restored. {ex.Message}");
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.WarrantyCoverageId, "Restore", "Warranty Coverage Restored",
            $"Warranty Coverage {entity.Code} restored.", userId);

        await _context.SaveChangesAsync();

        return true;
    }
}
