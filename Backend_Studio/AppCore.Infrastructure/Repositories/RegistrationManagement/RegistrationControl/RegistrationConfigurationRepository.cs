//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using AppCore.Application.RegistrationManagement.RegistrationControl;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.RegistrationManagement.RegistrationControl;
using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.RegistrationManagement.RegistrationControl;


//===============================================================
// Registration Configuration Repository (hand-written page)
//
// Registration Types (RTY-nnn)
//   Plan Installment (validity 2 years) / FullRegistration (10),
//   validity fixed by the plan. Mode Online / Offline. Name
//   required, unique among live rows. Plan and mode locked after
//   saving. One default (must be active). System rows (the 4
//   seeded types) cannot be deleted. A type with live fee / cost
//   rows cannot be deleted.
//
// Registration Fees (RFE-nnn) / Registration Costs (RCO-nnn)
//   Dated rates : a change is a NEW row with its own Effective
//   From; old rows stay. The rate in force on a date = the active
//   row with the latest Effective From on or before it. Future
//   dates allowed ("Upcoming"). One active row per type and date.
//   Type locked after saving.
//   Fees : Minimum > 0, Maximum >= Minimum.
//   Costs : BRTA Fees > 0, the others 0 or more.
//   BLOCK : on every date a rate changes, the Minimum Collection
//   in force may not be below the Total Cost in force (same
//   type). Checked on every save / delete / restore of either.
//
// Stage Timings : the 6 fixed statuses; edit only (expected days
//   0 - 365 or empty, colour, remarks).
//
// Codes : <prefix>-nnn, deleted rows count (never reused).
//===============================================================

public class RegistrationConfigurationRepository
    : IRegistrationConfigurationRepository
{
    private const int NameMaxLength = 100;

    private const int RemarksMaxLength = 500;

    private const decimal MaxAmount = 99999999.99m;

    private const string HistoryModule = "Registration Management";

    private const string HistoryEntity = "RegistrationConfiguration";

    private static readonly Regex ColorPattern =
        new("^#[0-9A-Fa-f]{6}$", RegexOptions.Compiled);


    private readonly AppDbContext _context;


    public RegistrationConfigurationRepository(
        AppDbContext context)
    {
        _context = context;
    }


    private DbSet<RegistrationTypes> Types =>
        _context.Set<RegistrationTypes>();

    private DbSet<RegistrationFees> Fees =>
        _context.Set<RegistrationFees>();

    private DbSet<RegistrationCosts> Costs =>
        _context.Set<RegistrationCosts>();

    private DbSet<RegistrationStageTimings> Stages =>
        _context.Set<RegistrationStageTimings>();


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

    private static string Money(decimal value) =>
        value.ToString("#,##0.00", CultureInfo.InvariantCulture);

    private static string Clean(string? value) =>
        string.Join(" ", (value ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries));

    private static string PlanName(string plan) =>
        RegistrationPlans.All.TryGetValue(plan, out var item) ? item.Label : plan;

    private static decimal TotalOf(RegistrationCosts x) =>
        x.BrtaFees + x.SubmissionCharges + x.BrtaTips + x.RegistrationCommission;


    private static string CleanRemarks
    (
        string? remarks
    )
    {
        string value =
            (remarks ?? string.Empty).Trim();

        if (value.Length > RemarksMaxLength)
        {
            throw new InvalidOperationException(
                $"Remarks cannot be longer than {RemarksMaxLength} characters.");
        }

        return value;
    }


    private static DateOnly ParseDate
    (
        string? text
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
                "Effective From is required (a valid date).");
        }

        if (date.Year < 2000 || date.Year > 2100)
        {
            throw new InvalidOperationException(
                "Effective From must be between 2000 and 2100.");
        }

        return date;
    }


    private static decimal Amount
    (
        decimal value,
        string label,
        bool mustBePositive
    )
    {
        if (mustBePositive ? value <= 0 : value < 0)
        {
            throw new InvalidOperationException(
                mustBePositive
                    ? $"{label} must be more than 0."
                    : $"{label} cannot be negative.");
        }

        if (value > MaxAmount)
        {
            throw new InvalidOperationException(
                $"{label} is too large.");
        }

        if (decimal.Round(value, 2) != value)
        {
            throw new InvalidOperationException(
                $"{label} can have at most 2 decimals.");
        }

        return value;
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


    private async Task<string> NextTypeCodeAsync() =>
        NextCode("RTY", await Types.AsNoTracking().Select(x => x.Code).ToListAsync());

    private async Task<string> NextFeeCodeAsync() =>
        NextCode("RFE", await Fees.AsNoTracking().Select(x => x.Code).ToListAsync());

    private async Task<string> NextCostCodeAsync() =>
        NextCode("RCO", await Costs.AsNoTracking().Select(x => x.Code).ToListAsync());


    private async Task<int> NextTypeOrderAsync()
    {
        int highest =
            await Types
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
    // Rate states : Current / Upcoming / Old (per type)
    //===========================================================

    private static Dictionary<long, string> RateStates<T>
    (
        IEnumerable<T> rows,
        Func<T, long> idOf,
        Func<T, long> typeOf,
        Func<T, DateOnly> dateOf,
        Func<T, bool> activeOf,
        DateOnly today
    )
    {
        Dictionary<long, string> states = new();

        foreach (IGrouping<long, T> group in rows.GroupBy(typeOf))
        {
            T? current =
                group
                    .Where(x => activeOf(x) && dateOf(x) <= today)
                    .OrderByDescending(dateOf)
                    .FirstOrDefault();

            foreach (T row in group)
            {
                states[idOf(row)] =
                    current != null && idOf(row) == idOf(current)
                        ? RegistrationRateStates.Current
                        : activeOf(row) && dateOf(row) > today
                            ? RegistrationRateStates.Upcoming
                            : RegistrationRateStates.Old;
            }
        }

        return states;
    }



    //===========================================================
    // Read : every tab in one call
    //===========================================================

    public async Task<RegistrationConfigurationDto>
        GetAllAsync()
    {
        DateOnly today = Today;

        List<RegistrationTypes> types =
            await Types
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.Code)
                .ToListAsync();

        List<RegistrationFees> fees =
            await Fees
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .ToListAsync();

        List<RegistrationCosts> costs =
            await Costs
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .ToListAsync();

        List<RegistrationStageTimings> stages =
            await Stages
                .AsNoTracking()
                .OrderBy(x => x.StageOrder)
                .ToListAsync();

        Dictionary<long, RegistrationTypes> typeById =
            types.ToDictionary(x => x.RegistrationTypeId);

        Dictionary<long, string> feeStates =
            RateStates(fees, x => x.RegistrationFeeId, x => x.RegistrationTypeId, x => x.EffectiveFrom, x => x.IsActive, today);

        Dictionary<long, string> costStates =
            RateStates(costs, x => x.RegistrationCostId, x => x.RegistrationTypeId, x => x.EffectiveFrom, x => x.IsActive, today);

        HashSet<long> typesWithCurrentFee =
            fees.Where(x => feeStates[x.RegistrationFeeId] == RegistrationRateStates.Current)
                .Select(x => x.RegistrationTypeId)
                .ToHashSet();

        HashSet<long> typesWithCurrentCost =
            costs.Where(x => costStates[x.RegistrationCostId] == RegistrationRateStates.Current)
                .Select(x => x.RegistrationTypeId)
                .ToHashSet();

        RegistrationConfigurationDto result =
            new RegistrationConfigurationDto
            {
                Today = DateText(today)
            };

        result.Types =
            types
                .Select(
                    x =>
                        new RegistrationTypeDto
                        {
                            RegistrationTypeId = x.RegistrationTypeId,
                            PublicId = x.PublicId,
                            Code = x.Code,
                            RegistrationPlan = x.RegistrationPlan,
                            PlanName = PlanName(x.RegistrationPlan),
                            ValidityYears = x.ValidityYears,
                            RegistrationMode = x.RegistrationMode,
                            VehiclePower = x.VehiclePower,
                            Name = x.Name,
                            DisplayOrder = x.DisplayOrder,
                            IsDefault = x.IsDefault,
                            IsSystem = x.IsSystem,
                            Remarks = x.Remarks,
                            IsActive = x.IsActive,
                            FeeCount = fees.Count(f => f.RegistrationTypeId == x.RegistrationTypeId),
                            CostCount = costs.Count(c => c.RegistrationTypeId == x.RegistrationTypeId),
                            Usable =
                                x.IsActive
                                && typesWithCurrentFee.Contains(x.RegistrationTypeId)
                                && typesWithCurrentCost.Contains(x.RegistrationTypeId)
                        })
                .ToList();

        result.Fees =
            fees
                .Where(x => typeById.ContainsKey(x.RegistrationTypeId))
                .OrderBy(x => typeById[x.RegistrationTypeId].DisplayOrder)
                .ThenByDescending(x => x.EffectiveFrom)
                .ThenBy(x => x.Code)
                .Select(
                    x =>
                        new RegistrationFeeDto
                        {
                            RegistrationFeeId = x.RegistrationFeeId,
                            PublicId = x.PublicId,
                            Code = x.Code,
                            RegistrationTypeId = x.RegistrationTypeId,
                            RegistrationTypePublicId = typeById[x.RegistrationTypeId].PublicId,
                            RegistrationTypeName = typeById[x.RegistrationTypeId].Name,
                            RegistrationMode = typeById[x.RegistrationTypeId].RegistrationMode,
                            EffectiveFrom = DateText(x.EffectiveFrom),
                            MinimumCollection = x.MinimumCollection,
                            MaximumCollection = x.MaximumCollection,
                            RateState = feeStates[x.RegistrationFeeId],
                            Remarks = x.Remarks,
                            IsActive = x.IsActive
                        })
                .ToList();

        result.Costs =
            costs
                .Where(x => typeById.ContainsKey(x.RegistrationTypeId))
                .OrderBy(x => typeById[x.RegistrationTypeId].DisplayOrder)
                .ThenByDescending(x => x.EffectiveFrom)
                .ThenBy(x => x.Code)
                .Select(
                    x =>
                        new RegistrationCostDto
                        {
                            RegistrationCostId = x.RegistrationCostId,
                            PublicId = x.PublicId,
                            Code = x.Code,
                            RegistrationTypeId = x.RegistrationTypeId,
                            RegistrationTypePublicId = typeById[x.RegistrationTypeId].PublicId,
                            RegistrationTypeName = typeById[x.RegistrationTypeId].Name,
                            RegistrationMode = typeById[x.RegistrationTypeId].RegistrationMode,
                            EffectiveFrom = DateText(x.EffectiveFrom),
                            BrtaFees = x.BrtaFees,
                            SubmissionCharges = x.SubmissionCharges,
                            BrtaTips = x.BrtaTips,
                            RegistrationCommission = x.RegistrationCommission,
                            TotalCost = TotalOf(x),
                            RateState = costStates[x.RegistrationCostId],
                            Remarks = x.Remarks,
                            IsActive = x.IsActive
                        })
                .ToList();

        result.Stages =
            stages
                .Select(
                    x =>
                        new RegistrationStageTimingDto
                        {
                            RegistrationStageTimingId = x.RegistrationStageTimingId,
                            PublicId = x.PublicId,
                            Code = x.Code,
                            StageKey = x.StageKey,
                            StageName = x.StageName,
                            StageOrder = x.StageOrder,
                            ExpectedDays = x.ExpectedDays,
                            ColorCode = x.ColorCode,
                            Remarks = x.Remarks
                        })
                .ToList();

        return result;
    }


    public async Task<RegistrationConfigurationDefaultsDto>
        GetDefaultsAsync()
    {
        return new RegistrationConfigurationDefaultsDto
        {
            TypeCode = await NextTypeCodeAsync(),
            NextTypeOrder = await NextTypeOrderAsync(),
            FeeCode = await NextFeeCodeAsync(),
            CostCode = await NextCostCodeAsync()
        };
    }



    //===========================================================
    // THE BLOCK RULE : on every date a fee or cost of the type
    // changes, Minimum Collection in force >= Total Cost in force.
    // fees / costs = the type's active live rows AFTER the change.
    //===========================================================

    private static void CheckRates
    (
        string typeName,
        List<RegistrationFees> fees,
        List<RegistrationCosts> costs
    )
    {
        IEnumerable<DateOnly> dates =
            fees.Select(x => x.EffectiveFrom)
                .Concat(costs.Select(x => x.EffectiveFrom))
                .Distinct()
                .OrderBy(x => x);

        foreach (DateOnly date in dates)
        {
            RegistrationFees? fee =
                fees.Where(x => x.EffectiveFrom <= date)
                    .OrderByDescending(x => x.EffectiveFrom)
                    .FirstOrDefault();

            RegistrationCosts? cost =
                costs.Where(x => x.EffectiveFrom <= date)
                    .OrderByDescending(x => x.EffectiveFrom)
                    .FirstOrDefault();

            if (fee == null || cost == null)
            {
                continue;
            }

            decimal total = TotalOf(cost);

            if (fee.MinimumCollection < total)
            {
                string feeCode = string.IsNullOrEmpty(fee.Code) ? "this fee" : fee.Code;

                string costCode = string.IsNullOrEmpty(cost.Code) ? "this cost" : cost.Code;

                throw new InvalidOperationException(
                    $"{typeName} : from {DisplayDate(date)} the Minimum Collection {Money(fee.MinimumCollection)} ({feeCode}) " +
                    $"would be below the Total Cost {Money(total)} ({costCode}). Raise the minimum collection or lower the costs.");
            }
        }
    }


    // The type's active live fees / costs, read for a check
    private Task<List<RegistrationFees>> ActiveFeesAsync(long typeId, long excludeId) =>
        Fees.AsNoTracking()
            .Where(x => x.RegistrationTypeId == typeId && !x.IsDeleted && x.IsActive && x.RegistrationFeeId != excludeId)
            .ToListAsync();

    private Task<List<RegistrationCosts>> ActiveCostsAsync(long typeId, long excludeId) =>
        Costs.AsNoTracking()
            .Where(x => x.RegistrationTypeId == typeId && !x.IsDeleted && x.IsActive && x.RegistrationCostId != excludeId)
            .ToListAsync();


    private async Task<RegistrationTypes> LiveTypeAsync
    (
        Guid publicId
    )
    {
        if (publicId == Guid.Empty)
        {
            throw new InvalidOperationException(
                "Choose the Registration Type.");
        }

        RegistrationTypes? type =
            await Types
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted);

        return type
            ?? throw new InvalidOperationException(
                "The registration type was not found. It may have been deleted.");
    }



    //===========================================================
    // REGISTRATION TYPES
    //===========================================================

    private sealed record TypeInput(string Plan, int Years, string Mode, string Power, string Name, int Order, string Remarks);


    private static TypeInput NormalizeType
    (
        SaveRegistrationTypeDto dto
    )
    {
        string planKey = (dto.RegistrationPlan ?? string.Empty).Trim();

        string? plan =
            RegistrationPlans.All.Keys.FirstOrDefault(x => string.Equals(x, planKey, StringComparison.OrdinalIgnoreCase));

        if (plan == null)
        {
            throw new InvalidOperationException(
                "Choose the Registration Plan : Installment System or One Time Full Registration.");
        }

        string modeKey = (dto.RegistrationMode ?? string.Empty).Trim();

        string? mode =
            RegistrationModes.All.FirstOrDefault(x => string.Equals(x, modeKey, StringComparison.OrdinalIgnoreCase));

        if (mode == null)
        {
            throw new InvalidOperationException(
                "Choose the Mode : Online or Offline.");
        }

        string powerKey = (dto.VehiclePower ?? string.Empty).Trim();

        string? power =
            RegistrationVehiclePowers.All.FirstOrDefault(x => string.Equals(x, powerKey, StringComparison.OrdinalIgnoreCase));

        if (power == null)
        {
            throw new InvalidOperationException(
                "Choose the Vehicle Power : Fuel or Electric.");
        }

        string name = Clean(dto.Name);

        if (name.Length == 0)
        {
            throw new InvalidOperationException(
                "Registration Type Name is required.");
        }

        if (name.Length > NameMaxLength)
        {
            throw new InvalidOperationException(
                $"Registration Type Name cannot be longer than {NameMaxLength} characters.");
        }

        if (dto.DisplayOrder < 0 || dto.DisplayOrder > 9999)
        {
            throw new InvalidOperationException(
                "Display Order must be between 1 and 9999.");
        }

        if (dto.IsDefault && !dto.IsActive)
        {
            throw new InvalidOperationException(
                "The default registration type must be active.");
        }

        return new TypeInput(plan, RegistrationPlans.All[plan].Years, mode, power, name, dto.DisplayOrder, CleanRemarks(dto.Remarks));
    }


    private async Task EnsureTypeNameFreeAsync
    (
        string name,
        long excludeId
    )
    {
        string key = name.ToLower();

        RegistrationTypes? same =
            await Types
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    x => !x.IsDeleted && x.RegistrationTypeId != excludeId && x.Name.ToLower() == key);

        if (same != null)
        {
            throw new InvalidOperationException(
                $"Registration Type '{name}' already exists ({same.Code}).");
        }
    }


    private async Task ClearOtherTypeDefaultsAsync
    (
        long keepId,
        long userId
    )
    {
        List<RegistrationTypes> others =
            await Types
                .Where(x => x.IsDefault && x.RegistrationTypeId != keepId)
                .ToListAsync();

        foreach (RegistrationTypes row in others)
        {
            row.IsDefault = false;
            row.ModifiedBy = userId;
            row.ModifiedDate = DateTime.UtcNow;
        }
    }


    public async Task<Guid>
        CreateTypeAsync
        (
            SaveRegistrationTypeDto dto,
            long userId
        )
    {
        TypeInput input = NormalizeType(dto);

        await EnsureTypeNameFreeAsync(input.Name, 0);

        RegistrationTypes entity =
            new RegistrationTypes
            {
                Code = await NextTypeCodeAsync(),
                RegistrationPlan = input.Plan,
                ValidityYears = input.Years,
                RegistrationMode = input.Mode,
                VehiclePower = input.Power,
                Name = input.Name,
                DisplayOrder = input.Order > 0 ? input.Order : await NextTypeOrderAsync(),
                IsDefault = dto.IsDefault,
                IsSystem = false,
                Remarks = input.Remarks,
                IsActive = dto.IsActive,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        if (entity.IsDefault)
        {
            await ClearOtherTypeDefaultsAsync(0, userId);
        }

        Types.Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(entity.RegistrationTypeId, "Create", "Registration Type Created",
            $"Registration Type '{entity.Name}' ({entity.Code}) created.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.PublicId;
    }


    public async Task
        UpdateTypeAsync
        (
            Guid publicId,
            SaveRegistrationTypeDto dto,
            long userId
        )
    {
        RegistrationTypes entity =
            await Types.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The registration type was not found. It may have been deleted.");

        TypeInput input = NormalizeType(dto);

        if
        (
            !string.Equals(input.Plan, entity.RegistrationPlan, StringComparison.OrdinalIgnoreCase)
            ||
            !string.Equals(input.Mode, entity.RegistrationMode, StringComparison.OrdinalIgnoreCase)
            ||
            !string.Equals(input.Power, entity.VehiclePower, StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                "The plan, mode and vehicle power of a registration type cannot be changed after saving. Add a new type instead.");
        }

        if (entity.IsDefault && !dto.IsDefault)
        {
            throw new InvalidOperationException(
                $"'{entity.Name}' is the default registration type. Make another type the default instead.");
        }

        await EnsureTypeNameFreeAsync(input.Name, entity.RegistrationTypeId);

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        if (dto.IsDefault && !entity.IsDefault)
        {
            await ClearOtherTypeDefaultsAsync(entity.RegistrationTypeId, userId);
        }

        entity.Name = input.Name;
        entity.ValidityYears = input.Years;
        entity.DisplayOrder = input.Order > 0 ? input.Order : entity.DisplayOrder;
        entity.IsDefault = dto.IsDefault;
        entity.Remarks = input.Remarks;
        entity.IsActive = dto.IsActive;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.RegistrationTypeId, "Update", "Registration Type Updated",
            $"Registration Type '{entity.Name}' ({entity.Code}) updated.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    public async Task
        DeleteTypeAsync
        (
            Guid publicId,
            long userId
        )
    {
        RegistrationTypes entity =
            await Types.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The registration type was not found. It may have been deleted already.");

        if (entity.IsSystem)
        {
            throw new InvalidOperationException(
                $"'{entity.Name}' is a system registration type and cannot be deleted. You can deactivate or rename it instead.");
        }

        if (entity.IsDefault)
        {
            throw new InvalidOperationException(
                $"'{entity.Name}' is the default registration type. Set another default first.");
        }

        int feeCount =
            await Fees.CountAsync(x => x.RegistrationTypeId == entity.RegistrationTypeId && !x.IsDeleted);

        int costCount =
            await Costs.CountAsync(x => x.RegistrationTypeId == entity.RegistrationTypeId && !x.IsDeleted);

        if (feeCount + costCount > 0)
        {
            throw new InvalidOperationException(
                $"'{entity.Name}' has {feeCount} fee and {costCount} cost row(s). Delete them first.");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.RegistrationTypeId, "Delete", "Registration Type Deleted",
            $"Registration Type '{entity.Name}' ({entity.Code}) deleted.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task<bool>
        RestoreTypeAsync
        (
            long userId
        )
    {
        RegistrationTypes? entity =
            await Types
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .ThenByDescending(x => x.RegistrationTypeId)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        try
        {
            await EnsureTypeNameFreeAsync(entity.Name, entity.RegistrationTypeId);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException(
                $"'{entity.Name}' cannot be restored. {ex.Message}");
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.IsDefault = false;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.RegistrationTypeId, "Restore", "Registration Type Restored",
            $"Registration Type '{entity.Name}' ({entity.Code}) restored.", userId);

        await _context.SaveChangesAsync();

        return true;
    }



    //===========================================================
    // REGISTRATION FEES
    //===========================================================

    private static (DateOnly Date, decimal Min, decimal Max, string Remarks) NormalizeFee
    (
        SaveRegistrationFeeDto dto
    )
    {
        DateOnly date = ParseDate(dto.EffectiveFrom);

        decimal min = Amount(dto.MinimumCollection, "Minimum Collection", true);

        decimal max = Amount(dto.MaximumCollection, "Maximum Collection", true);

        if (max < min)
        {
            throw new InvalidOperationException(
                "Maximum Collection cannot be less than Minimum Collection.");
        }

        return (date, min, max, CleanRemarks(dto.Remarks));
    }


    // One active row per type and date (active rows only)
    private async Task EnsureFeeDateFreeAsync
    (
        long typeId,
        DateOnly date,
        long excludeId,
        bool active
    )
    {
        if (!active)
        {
            return;
        }

        RegistrationFees? same =
            await Fees.AsNoTracking()
                .FirstOrDefaultAsync(
                    x =>
                        x.RegistrationTypeId == typeId && !x.IsDeleted && x.IsActive
                        && x.EffectiveFrom == date && x.RegistrationFeeId != excludeId);

        if (same != null)
        {
            throw new InvalidOperationException(
                $"An active fee of this type already starts on {DisplayDate(date)} ({same.Code}). Change that row, or pick another date.");
        }
    }


    // The fee rows of the type after the change, then the block rule
    private async Task CheckFeeChangeAsync
    (
        RegistrationTypes type,
        RegistrationFees? changed,
        long excludeId
    )
    {
        List<RegistrationFees> fees =
            await ActiveFeesAsync(type.RegistrationTypeId, excludeId);

        if (changed != null && changed.IsActive && !changed.IsDeleted)
        {
            fees.Add(changed);
        }

        List<RegistrationCosts> costs =
            await ActiveCostsAsync(type.RegistrationTypeId, 0);

        CheckRates(type.Name, fees, costs);
    }


    public async Task<Guid>
        CreateFeeAsync
        (
            SaveRegistrationFeeDto dto,
            long userId
        )
    {
        RegistrationTypes type = await LiveTypeAsync(dto.RegistrationTypePublicId);

        var input = NormalizeFee(dto);

        await EnsureFeeDateFreeAsync(type.RegistrationTypeId, input.Date, 0, dto.IsActive);

        RegistrationFees entity =
            new RegistrationFees
            {
                Code = await NextFeeCodeAsync(),
                RegistrationTypeId = type.RegistrationTypeId,
                EffectiveFrom = input.Date,
                MinimumCollection = input.Min,
                MaximumCollection = input.Max,
                Remarks = input.Remarks,
                IsActive = dto.IsActive,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        await CheckFeeChangeAsync(type, entity, 0);

        Fees.Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(entity.RegistrationFeeId, "Create", "Registration Fee Created",
            $"Registration Fee {entity.Code} : {type.Name} from {DisplayDate(entity.EffectiveFrom)}, {Money(entity.MinimumCollection)} - {Money(entity.MaximumCollection)}.", userId);

        await _context.SaveChangesAsync();

        return entity.PublicId;
    }


    public async Task
        UpdateFeeAsync
        (
            Guid publicId,
            SaveRegistrationFeeDto dto,
            long userId
        )
    {
        RegistrationFees entity =
            await Fees.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The registration fee was not found. It may have been deleted.");

        RegistrationTypes type =
            await Types.AsNoTracking().FirstAsync(x => x.RegistrationTypeId == entity.RegistrationTypeId);

        if (dto.RegistrationTypePublicId != Guid.Empty && dto.RegistrationTypePublicId != type.PublicId)
        {
            throw new InvalidOperationException(
                "The registration type of a fee cannot be changed after saving. Add a new fee instead.");
        }

        var input = NormalizeFee(dto);

        await EnsureFeeDateFreeAsync(type.RegistrationTypeId, input.Date, entity.RegistrationFeeId, dto.IsActive);

        RegistrationFees after =
            new RegistrationFees
            {
                RegistrationFeeId = entity.RegistrationFeeId,
                Code = entity.Code,
                RegistrationTypeId = entity.RegistrationTypeId,
                EffectiveFrom = input.Date,
                MinimumCollection = input.Min,
                MaximumCollection = input.Max,
                IsActive = dto.IsActive
            };

        await CheckFeeChangeAsync(type, after, entity.RegistrationFeeId);

        entity.EffectiveFrom = input.Date;
        entity.MinimumCollection = input.Min;
        entity.MaximumCollection = input.Max;
        entity.Remarks = input.Remarks;
        entity.IsActive = dto.IsActive;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.RegistrationFeeId, "Update", "Registration Fee Updated",
            $"Registration Fee {entity.Code} : {type.Name} from {DisplayDate(entity.EffectiveFrom)}, {Money(entity.MinimumCollection)} - {Money(entity.MaximumCollection)}.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task
        DeleteFeeAsync
        (
            Guid publicId,
            long userId
        )
    {
        RegistrationFees entity =
            await Fees.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The registration fee was not found. It may have been deleted already.");

        RegistrationTypes type =
            await Types.AsNoTracking().FirstAsync(x => x.RegistrationTypeId == entity.RegistrationTypeId);

        // Removing a rate may bring an older, lower one back in force
        try
        {
            await CheckFeeChangeAsync(type, null, entity.RegistrationFeeId);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException(
                $"{entity.Code} cannot be deleted. {ex.Message}");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.RegistrationFeeId, "Delete", "Registration Fee Deleted",
            $"Registration Fee {entity.Code} ({type.Name}, from {DisplayDate(entity.EffectiveFrom)}) deleted.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task<bool>
        RestoreFeeAsync
        (
            long userId
        )
    {
        RegistrationFees? entity =
            await Fees
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .ThenByDescending(x => x.RegistrationFeeId)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        RegistrationTypes? type =
            await Types.AsNoTracking().FirstOrDefaultAsync(x => x.RegistrationTypeId == entity.RegistrationTypeId && !x.IsDeleted);

        if (type == null)
        {
            throw new InvalidOperationException(
                $"{entity.Code} cannot be restored : its registration type is deleted. Restore the type first.");
        }

        try
        {
            await EnsureFeeDateFreeAsync(type.RegistrationTypeId, entity.EffectiveFrom, entity.RegistrationFeeId, entity.IsActive);

            RegistrationFees after =
                new RegistrationFees
                {
                    RegistrationFeeId = entity.RegistrationFeeId,
                    Code = entity.Code,
                    RegistrationTypeId = entity.RegistrationTypeId,
                    EffectiveFrom = entity.EffectiveFrom,
                    MinimumCollection = entity.MinimumCollection,
                    MaximumCollection = entity.MaximumCollection,
                    IsActive = entity.IsActive
                };

            await CheckFeeChangeAsync(type, after, entity.RegistrationFeeId);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException(
                $"{entity.Code} cannot be restored. {ex.Message}");
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.RegistrationFeeId, "Restore", "Registration Fee Restored",
            $"Registration Fee {entity.Code} ({type.Name}, from {DisplayDate(entity.EffectiveFrom)}) restored.", userId);

        await _context.SaveChangesAsync();

        return true;
    }



    //===========================================================
    // REGISTRATION COSTS
    //===========================================================

    private sealed record CostInput(DateOnly Date, decimal Brta, decimal Submission, decimal Tips, decimal Commission, string Remarks);


    private static CostInput NormalizeCost
    (
        SaveRegistrationCostDto dto
    )
    {
        return new CostInput(
            ParseDate(dto.EffectiveFrom),
            Amount(dto.BrtaFees, "Registration Fees (BRTA)", true),
            Amount(dto.SubmissionCharges, "Submission Charges", false),
            Amount(dto.BrtaTips, "BRTA Tips", false),
            Amount(dto.RegistrationCommission, "Registration Commission", false),
            CleanRemarks(dto.Remarks));
    }


    private async Task EnsureCostDateFreeAsync
    (
        long typeId,
        DateOnly date,
        long excludeId,
        bool active
    )
    {
        if (!active)
        {
            return;
        }

        RegistrationCosts? same =
            await Costs.AsNoTracking()
                .FirstOrDefaultAsync(
                    x =>
                        x.RegistrationTypeId == typeId && !x.IsDeleted && x.IsActive
                        && x.EffectiveFrom == date && x.RegistrationCostId != excludeId);

        if (same != null)
        {
            throw new InvalidOperationException(
                $"An active cost of this type already starts on {DisplayDate(date)} ({same.Code}). Change that row, or pick another date.");
        }
    }


    private async Task CheckCostChangeAsync
    (
        RegistrationTypes type,
        RegistrationCosts? changed,
        long excludeId
    )
    {
        List<RegistrationCosts> costs =
            await ActiveCostsAsync(type.RegistrationTypeId, excludeId);

        if (changed != null && changed.IsActive && !changed.IsDeleted)
        {
            costs.Add(changed);
        }

        List<RegistrationFees> fees =
            await ActiveFeesAsync(type.RegistrationTypeId, 0);

        CheckRates(type.Name, fees, costs);
    }


    private static RegistrationCosts CostOf
    (
        RegistrationCosts source,
        CostInput input,
        bool active
    )
    {
        return new RegistrationCosts
        {
            RegistrationCostId = source.RegistrationCostId,
            Code = source.Code,
            RegistrationTypeId = source.RegistrationTypeId,
            EffectiveFrom = input.Date,
            BrtaFees = input.Brta,
            SubmissionCharges = input.Submission,
            BrtaTips = input.Tips,
            RegistrationCommission = input.Commission,
            IsActive = active
        };
    }


    public async Task<Guid>
        CreateCostAsync
        (
            SaveRegistrationCostDto dto,
            long userId
        )
    {
        RegistrationTypes type = await LiveTypeAsync(dto.RegistrationTypePublicId);

        CostInput input = NormalizeCost(dto);

        await EnsureCostDateFreeAsync(type.RegistrationTypeId, input.Date, 0, dto.IsActive);

        RegistrationCosts entity =
            new RegistrationCosts
            {
                Code = await NextCostCodeAsync(),
                RegistrationTypeId = type.RegistrationTypeId,
                EffectiveFrom = input.Date,
                BrtaFees = input.Brta,
                SubmissionCharges = input.Submission,
                BrtaTips = input.Tips,
                RegistrationCommission = input.Commission,
                Remarks = input.Remarks,
                IsActive = dto.IsActive,
                IsDeleted = false,
                CreatedBy = userId,
                CreatedDate = DateTime.UtcNow
            };

        await CheckCostChangeAsync(type, entity, 0);

        Costs.Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(entity.RegistrationCostId, "Create", "Registration Cost Created",
            $"Registration Cost {entity.Code} : {type.Name} from {DisplayDate(entity.EffectiveFrom)}, total {Money(TotalOf(entity))}.", userId);

        await _context.SaveChangesAsync();

        return entity.PublicId;
    }


    public async Task
        UpdateCostAsync
        (
            Guid publicId,
            SaveRegistrationCostDto dto,
            long userId
        )
    {
        RegistrationCosts entity =
            await Costs.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The registration cost was not found. It may have been deleted.");

        RegistrationTypes type =
            await Types.AsNoTracking().FirstAsync(x => x.RegistrationTypeId == entity.RegistrationTypeId);

        if (dto.RegistrationTypePublicId != Guid.Empty && dto.RegistrationTypePublicId != type.PublicId)
        {
            throw new InvalidOperationException(
                "The registration type of a cost cannot be changed after saving. Add a new cost instead.");
        }

        CostInput input = NormalizeCost(dto);

        await EnsureCostDateFreeAsync(type.RegistrationTypeId, input.Date, entity.RegistrationCostId, dto.IsActive);

        await CheckCostChangeAsync(type, CostOf(entity, input, dto.IsActive), entity.RegistrationCostId);

        entity.EffectiveFrom = input.Date;
        entity.BrtaFees = input.Brta;
        entity.SubmissionCharges = input.Submission;
        entity.BrtaTips = input.Tips;
        entity.RegistrationCommission = input.Commission;
        entity.Remarks = input.Remarks;
        entity.IsActive = dto.IsActive;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.RegistrationCostId, "Update", "Registration Cost Updated",
            $"Registration Cost {entity.Code} : {type.Name} from {DisplayDate(entity.EffectiveFrom)}, total {Money(TotalOf(entity))}.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task
        DeleteCostAsync
        (
            Guid publicId,
            long userId
        )
    {
        RegistrationCosts entity =
            await Costs.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The registration cost was not found. It may have been deleted already.");

        RegistrationTypes type =
            await Types.AsNoTracking().FirstAsync(x => x.RegistrationTypeId == entity.RegistrationTypeId);

        // Removing a cost may bring an older, higher one back in force
        try
        {
            await CheckCostChangeAsync(type, null, entity.RegistrationCostId);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException(
                $"{entity.Code} cannot be deleted. {ex.Message}");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.RegistrationCostId, "Delete", "Registration Cost Deleted",
            $"Registration Cost {entity.Code} ({type.Name}, from {DisplayDate(entity.EffectiveFrom)}) deleted.", userId);

        await _context.SaveChangesAsync();
    }


    public async Task<bool>
        RestoreCostAsync
        (
            long userId
        )
    {
        RegistrationCosts? entity =
            await Costs
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .ThenByDescending(x => x.RegistrationCostId)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        RegistrationTypes? type =
            await Types.AsNoTracking().FirstOrDefaultAsync(x => x.RegistrationTypeId == entity.RegistrationTypeId && !x.IsDeleted);

        if (type == null)
        {
            throw new InvalidOperationException(
                $"{entity.Code} cannot be restored : its registration type is deleted. Restore the type first.");
        }

        try
        {
            await EnsureCostDateFreeAsync(type.RegistrationTypeId, entity.EffectiveFrom, entity.RegistrationCostId, entity.IsActive);

            CostInput same =
                new CostInput(entity.EffectiveFrom, entity.BrtaFees, entity.SubmissionCharges, entity.BrtaTips, entity.RegistrationCommission, entity.Remarks);

            await CheckCostChangeAsync(type, CostOf(entity, same, entity.IsActive), entity.RegistrationCostId);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException(
                $"{entity.Code} cannot be restored. {ex.Message}");
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.RegistrationCostId, "Restore", "Registration Cost Restored",
            $"Registration Cost {entity.Code} ({type.Name}, from {DisplayDate(entity.EffectiveFrom)}) restored.", userId);

        await _context.SaveChangesAsync();

        return true;
    }



    //===========================================================
    // STAGE TIMINGS (edit only)
    //===========================================================

    public async Task
        UpdateStageAsync
        (
            Guid publicId,
            SaveRegistrationStageTimingDto dto,
            long userId
        )
    {
        RegistrationStageTimings entity =
            await Stages.FirstOrDefaultAsync(x => x.PublicId == publicId)
            ?? throw new KeyNotFoundException("The stage was not found.");

        if (dto.ExpectedDays.HasValue && (dto.ExpectedDays < 0 || dto.ExpectedDays > 365))
        {
            throw new InvalidOperationException(
                "Expected Days must be between 0 and 365, or empty (no overdue check).");
        }

        string color = (dto.ColorCode ?? string.Empty).Trim();

        if (color.Length > 0 && !color.StartsWith('#'))
        {
            color = "#" + color;
        }

        if (!ColorPattern.IsMatch(color))
        {
            throw new InvalidOperationException(
                "Colour must be a hex colour such as #2563EB.");
        }

        entity.ExpectedDays = dto.ExpectedDays;
        entity.ColorCode = color.ToUpperInvariant();
        entity.Remarks = CleanRemarks(dto.Remarks);
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(entity.RegistrationStageTimingId, "Update", "Stage Timing Updated",
            $"Stage '{entity.StageName}' : expected days {(entity.ExpectedDays.HasValue ? entity.ExpectedDays.Value.ToString(CultureInfo.InvariantCulture) : "none")}.", userId);

        await _context.SaveChangesAsync();
    }
}
