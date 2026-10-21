//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.MembershipManagement.MembershipSetup;

using MembershipPolicyEntity =
    AppCore.Domain.Entities.MembershipManagement.MembershipSetup.MembershipPolicies;

using MembershipCardEntity =
    AppCore.Domain.Entities.MembershipManagement.MembershipSetup.MembershipCards;

using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.CodeMaster;
using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.MembershipManagement.MembershipSetup;


//===============================================================
// Membership Policies Repository
//
// One live policy per membership card :
//   Validity (Months)          1 - 120
//   Enrollment / Renewal Fee   >= 0 (0 = free)
//   Discounts %                Spare Parts / Accessories / Service
//                              Charge, 0 - 100
//   Free Services              count 0 - 99 per validity period, in
//                              FIXED windows of Service Interval
//                              (Days / Months) from the membership
//                              start; count x interval must fit the
//                              validity (12 months = 365 days).
//                              A missed window can be given later
//                              only with approval, up to
//                              MaxMissedServices per period and until
//                              MissedServiceGraceDays after expiry;
//                              the other windows never move.
//
// No ledgers here : fees post to the card's Fee Ledger, discounts
// to its Discount Ledger. Enrollment / renewal copy these values.
//
// Policy Code MSP-001 (central CodeGenerator). Locked : Policy Code,
// Membership Card. Cannot be active while its card is inactive.
//===============================================================

public class MembershipPoliciesRepository :
    IMembershipPoliciesRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string PolicyPrefix =
        "MSP-";

    private const int MaxPolicyNumber =
        999;

    private const int MaxValidityMonths =
        120;

    private const int MaxFreeServices =
        99;

    private const int MaxGraceDays =
        365;

    private const decimal MaxAmount =
        99999999.99m;

    public const string Days =
        "Days";

    public const string Months =
        "Months";

    public static readonly string[] IntervalUnits =
    {
        Days,
        Months
    };


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public MembershipPoliciesRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Get All (live policies, by card rank)
    //===========================================================

    public async Task<List<MembershipPoliciesDto>>
        GetAllAsync()
    {
        List<MembershipPolicyEntity> policies =
            await _context
                .Set<MembershipPolicyEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                )
                .ToListAsync();

        return (await ToDtosAsync(policies))
            .OrderBy(x => x.CardRank)
            .ThenBy(x => x.PolicyCode)
            .ToList();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<MembershipPoliciesDto?>
        GetByIdAsync
        (
            long id
        )
    {
        MembershipPolicyEntity? policy =
            await _context
                .Set<MembershipPolicyEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MembershipPolicyId ==
                        id
                        &&
                        !x.IsDeleted
                );

        if
        (
            policy == null
        )
        {
            return null;
        }

        return (await ToDtosAsync(
                new List<MembershipPolicyEntity> { policy }))
            .FirstOrDefault();
    }


    //===========================================================
    // Map policies (+ their cards) to DTOs
    //===========================================================

    private async Task<List<MembershipPoliciesDto>>
        ToDtosAsync
        (
            List<MembershipPolicyEntity> policies
        )
    {
        List<long> cardIds =
            policies
                .Select(x => x.MembershipCardId)
                .Distinct()
                .ToList();

        Dictionary<long, MembershipCardEntity> cards =
            await _context
                .Set<MembershipCardEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        cardIds.Contains(x.MembershipCardId)
                )
                .ToDictionaryAsync
                (
                    x => x.MembershipCardId
                );

        return policies
            .Select
            (
                x =>
                {
                    MembershipCardEntity? card =
                        cards.GetValueOrDefault(
                            x.MembershipCardId);

                    return new MembershipPoliciesDto
                    {
                        MembershipPolicyId =
                            x.MembershipPolicyId,

                        PolicyCode =
                            x.PolicyCode,

                        MembershipCardId =
                            x.MembershipCardId,

                        CardCode =
                            card?.CardCode
                            ??
                            string.Empty,

                        CardName =
                            card?.CardName
                            ??
                            string.Empty,

                        CardRank =
                            card?.CardRank
                            ??
                            0,

                        CardIsActive =
                            card != null
                            &&
                            !card.IsDeleted
                            &&
                            card.IsActive,

                        ValidityMonths =
                            x.ValidityMonths,

                        EnrollmentFee =
                            x.EnrollmentFee,

                        RenewalFee =
                            x.RenewalFee,

                        SparePartsDiscountPercent =
                            x.SparePartsDiscountPercent,

                        AccessoriesDiscountPercent =
                            x.AccessoriesDiscountPercent,

                        ServiceChargeDiscountPercent =
                            x.ServiceChargeDiscountPercent,

                        FreeServiceCount =
                            x.FreeServiceCount,

                        ServiceInterval =
                            x.ServiceInterval,

                        ServiceIntervalUnit =
                            x.ServiceIntervalUnit,

                        MissedServiceGraceDays =
                            x.MissedServiceGraceDays,

                        MaxMissedServices =
                            x.MaxMissedServices,

                        Remarks =
                            x.Remarks,

                        IsActive =
                            x.IsActive,

                        IsDeleted =
                            x.IsDeleted,

                        DeletedBy =
                            x.DeletedBy,

                        DeletedDate =
                            x.DeletedDate,

                        CreatedBy =
                            x.CreatedBy,

                        CreatedDate =
                            x.CreatedDate,

                        ModifiedBy =
                            x.ModifiedBy,

                        ModifiedDate =
                            x.ModifiedDate
                    };
                }
            )
            .ToList();
    }


    //===========================================================
    // Get Defaults : next code + cards without a live policy
    //===========================================================

    public async Task<MembershipPoliciesDefaultsDto>
        GetDefaultsAsync()
    {
        List<long> usedCardIds =
            await _context
                .Set<MembershipPolicyEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                )
                .Select
                (
                    x =>
                        x.MembershipCardId
                )
                .ToListAsync();

        return new MembershipPoliciesDefaultsDto
        {
            NextPolicyCode =
                await NextPolicyCodeAsync(),

            Cards =
                await _context
                    .Set<MembershipCardEntity>()
                    .AsNoTracking()
                    .Where
                    (
                        x =>
                            !x.IsDeleted
                            &&
                            !usedCardIds.Contains(x.MembershipCardId)
                    )
                    .OrderBy
                    (
                        x =>
                            x.CardRank
                    )
                    .Select
                    (
                        x =>
                            new MembershipPoliciesCardOptionDto
                            {
                                MembershipCardId =
                                    x.MembershipCardId,

                                CardCode =
                                    x.CardCode,

                                CardName =
                                    x.CardName,

                                CardRank =
                                    x.CardRank,

                                IsActive =
                                    x.IsActive
                            }
                    )
                    .ToListAsync(),

            IntervalUnits =
                IntervalUnits.ToList()
        };
    }


    //===========================================================
    // Next Policy Code (highest MSP number, deleted included, + 1)
    //===========================================================

    private async Task<string>
        NextPolicyCodeAsync()
    {
        List<string> codes =
            await _context
                .Set<MembershipPolicyEntity>()
                .AsNoTracking()
                .Select
                (
                    x =>
                        x.PolicyCode
                )
                .ToListAsync();

        int highest =
            codes
                .Where
                (
                    code =>
                        (code ?? string.Empty).StartsWith(
                            PolicyPrefix,
                            StringComparison.OrdinalIgnoreCase)
                )
                .Select
                (
                    code =>
                        int.TryParse(
                            code.Substring(PolicyPrefix.Length),
                            out int number)
                            ? number
                            : 0
                )
                .DefaultIfEmpty(0)
                .Max();

        if
        (
            highest >= MaxPolicyNumber
        )
        {
            throw new InvalidOperationException(
                "All policy codes MSP-001 to MSP-999 are used.");
        }

        return CodeGenerator.GenerateMembershipPolicyCode(
            highest + 1);
    }


    //===========================================================
    // Validated values
    //===========================================================

    private sealed class PolicyValues
    {
        public int ValidityMonths { get; set; }

        public decimal EnrollmentFee { get; set; }

        public decimal RenewalFee { get; set; }

        public decimal SparePartsDiscountPercent { get; set; }

        public decimal AccessoriesDiscountPercent { get; set; }

        public decimal ServiceChargeDiscountPercent { get; set; }

        public int FreeServiceCount { get; set; }

        public int ServiceInterval { get; set; }

        public string ServiceIntervalUnit { get; set; } = string.Empty;

        public int MissedServiceGraceDays { get; set; }

        public int MaxMissedServices { get; set; }

        public string Remarks { get; set; } = string.Empty;
    }


    private static decimal Amount
    (
        decimal value,
        string label
    )
    {
        decimal amount =
            Math.Round(
                value,
                2);

        if
        (
            amount < 0
            ||
            amount > MaxAmount
        )
        {
            throw new InvalidOperationException(
                $"{label} must be from 0.00 to {MaxAmount:N2}.");
        }

        return amount;
    }


    private static decimal Percent
    (
        decimal value,
        string label
    )
    {
        decimal percent =
            Math.Round(
                value,
                2);

        if
        (
            percent < 0
            ||
            percent > 100
        )
        {
            throw new InvalidOperationException(
                $"{label} must be from 0 to 100.");
        }

        return percent;
    }


    private static PolicyValues ValidateInput
    (
        CreateMembershipPoliciesDto dto
    )
    {
        if
        (
            dto.ValidityMonths < 1
            ||
            dto.ValidityMonths > MaxValidityMonths
        )
        {
            throw new InvalidOperationException(
                $"Validity must be from 1 to {MaxValidityMonths} months.");
        }

        PolicyValues values =
            new PolicyValues
            {
                ValidityMonths =
                    dto.ValidityMonths,

                EnrollmentFee =
                    Amount(dto.EnrollmentFee, "Enrollment Fee"),

                RenewalFee =
                    Amount(dto.RenewalFee, "Renewal Fee"),

                SparePartsDiscountPercent =
                    Percent(dto.SparePartsDiscountPercent, "Spare Parts Discount %"),

                AccessoriesDiscountPercent =
                    Percent(dto.AccessoriesDiscountPercent, "Accessories Discount %"),

                ServiceChargeDiscountPercent =
                    Percent(dto.ServiceChargeDiscountPercent, "Service Charge Discount %"),

                Remarks =
                    dto.Remarks?.Trim()
                    ??
                    string.Empty
            };

        if
        (
            dto.FreeServiceCount < 0
            ||
            dto.FreeServiceCount > MaxFreeServices
        )
        {
            throw new InvalidOperationException(
                $"No. of Free Services must be from 0 to {MaxFreeServices}.");
        }

        values.FreeServiceCount =
            dto.FreeServiceCount;

        // No free services : the window settings do not apply
        if
        (
            values.FreeServiceCount == 0
        )
        {
            values.ServiceInterval =
                0;

            values.ServiceIntervalUnit =
                string.Empty;

            values.MissedServiceGraceDays =
                0;

            values.MaxMissedServices =
                0;

            return values;
        }

        string unit =
            IntervalUnits.FirstOrDefault
            (
                x =>
                    string.Equals(
                        x,
                        dto.ServiceIntervalUnit?.Trim(),
                        StringComparison.OrdinalIgnoreCase)
            )
            ??
            throw new InvalidOperationException(
                "Interval Unit is required (Days or Months).");

        if
        (
            dto.ServiceInterval < 1
        )
        {
            throw new InvalidOperationException(
                "Service Interval must be at least 1.");
        }

        // The windows must fit the validity (12 months = 365 days)
        int validityDays =
            (int)Math.Floor(
                values.ValidityMonths * 365m / 12m);

        bool fits =
            unit == Months
                ? (long)values.FreeServiceCount * dto.ServiceInterval <= values.ValidityMonths
                : (long)values.FreeServiceCount * dto.ServiceInterval <= validityDays;

        if
        (
            !fits
        )
        {
            throw new InvalidOperationException(
                unit == Months
                    ? $"{values.FreeServiceCount} free services every {dto.ServiceInterval} months need {values.FreeServiceCount * dto.ServiceInterval} months, more than the validity of {values.ValidityMonths} months."
                    : $"{values.FreeServiceCount} free services every {dto.ServiceInterval} days need {(long)values.FreeServiceCount * dto.ServiceInterval} days, more than the validity of {validityDays} days.");
        }

        if
        (
            dto.MissedServiceGraceDays < 0
            ||
            dto.MissedServiceGraceDays > MaxGraceDays
        )
        {
            throw new InvalidOperationException(
                $"Grace Period After Expiry must be from 0 to {MaxGraceDays} days.");
        }

        if
        (
            dto.MaxMissedServices < 0
            ||
            dto.MaxMissedServices > values.FreeServiceCount
        )
        {
            throw new InvalidOperationException(
                $"Max Missed Services Allowed must be from 0 to {values.FreeServiceCount} (the No. of Free Services).");
        }

        values.ServiceInterval =
            dto.ServiceInterval;

        values.ServiceIntervalUnit =
            unit;

        values.MissedServiceGraceDays =
            dto.MissedServiceGraceDays;

        values.MaxMissedServices =
            dto.MaxMissedServices;

        return values;
    }


    // The update DTO carries the same values
    private static CreateMembershipPoliciesDto ToCreate
    (
        UpdateMembershipPoliciesDto dto
    )
    {
        return new CreateMembershipPoliciesDto
        {
            MembershipCardId =
                dto.MembershipCardId,

            ValidityMonths =
                dto.ValidityMonths,

            EnrollmentFee =
                dto.EnrollmentFee,

            RenewalFee =
                dto.RenewalFee,

            SparePartsDiscountPercent =
                dto.SparePartsDiscountPercent,

            AccessoriesDiscountPercent =
                dto.AccessoriesDiscountPercent,

            ServiceChargeDiscountPercent =
                dto.ServiceChargeDiscountPercent,

            FreeServiceCount =
                dto.FreeServiceCount,

            ServiceInterval =
                dto.ServiceInterval,

            ServiceIntervalUnit =
                dto.ServiceIntervalUnit,

            MissedServiceGraceDays =
                dto.MissedServiceGraceDays,

            MaxMissedServices =
                dto.MaxMissedServices,

            Remarks =
                dto.Remarks,

            IsActive =
                dto.IsActive
        };
    }


    private static void Apply
    (
        MembershipPolicyEntity entity,
        PolicyValues values
    )
    {
        entity.ValidityMonths =
            values.ValidityMonths;

        entity.EnrollmentFee =
            values.EnrollmentFee;

        entity.RenewalFee =
            values.RenewalFee;

        entity.SparePartsDiscountPercent =
            values.SparePartsDiscountPercent;

        entity.AccessoriesDiscountPercent =
            values.AccessoriesDiscountPercent;

        entity.ServiceChargeDiscountPercent =
            values.ServiceChargeDiscountPercent;

        entity.FreeServiceCount =
            values.FreeServiceCount;

        entity.ServiceInterval =
            values.ServiceInterval;

        entity.ServiceIntervalUnit =
            values.ServiceIntervalUnit;

        entity.MissedServiceGraceDays =
            values.MissedServiceGraceDays;

        entity.MaxMissedServices =
            values.MaxMissedServices;

        entity.Remarks =
            values.Remarks;
    }


    //===========================================================
    // Card checks
    //===========================================================

    private async Task<MembershipCardEntity>
        LoadCardAsync
        (
            long membershipCardId
        )
    {
        if
        (
            membershipCardId <= 0
        )
        {
            throw new InvalidOperationException(
                "Membership Card is required.");
        }

        return await _context
                .Set<MembershipCardEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MembershipCardId ==
                        membershipCardId
                        &&
                        !x.IsDeleted
                )
            ??
            throw new InvalidOperationException(
                "The selected Membership Card was not found. It may have been deleted.");
    }


    private async Task
        EnsureCardFreeAsync
        (
            MembershipCardEntity card,
            long excludeId
        )
    {
        MembershipPolicyEntity? other =
            await _context
                .Set<MembershipPolicyEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.MembershipPolicyId !=
                        excludeId
                        &&
                        x.MembershipCardId ==
                        card.MembershipCardId
                );

        if
        (
            other != null
        )
        {
            throw new InvalidOperationException(
                $"'{card.CardName}' already has a policy ({other.PolicyCode}). A card has one policy.");
        }
    }


    private static void EnsureActiveAllowed
    (
        MembershipCardEntity card,
        bool isActive
    )
    {
        if
        (
            isActive
            &&
            !card.IsActive
        )
        {
            throw new InvalidOperationException(
                $"Membership Card '{card.CardName}' is inactive. Activate the card first.");
        }
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateMembershipPoliciesDto dto,
            long userId
        )
    {
        MembershipCardEntity card =
            await LoadCardAsync(
                dto.MembershipCardId);

        await EnsureCardFreeAsync(
            card,
            0);

        EnsureActiveAllowed(
            card,
            dto.IsActive);

        PolicyValues values =
            ValidateInput(
                dto);

        MembershipPolicyEntity entity =
            new MembershipPolicyEntity
            {
                PolicyCode =
                    await NextPolicyCodeAsync(),

                MembershipCardId =
                    card.MembershipCardId,

                IsActive =
                    dto.IsActive,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };

        Apply(
            entity,
            values);

        _context
            .Set<MembershipPolicyEntity>()
            .Add(
                entity);

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            card,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        return entity.MembershipPolicyId;
    }


    //===========================================================
    // Update (Policy Code and Membership Card are locked)
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateMembershipPoliciesDto dto,
            long userId
        )
    {
        MembershipPolicyEntity? entity =
            await _context
                .Set<MembershipPolicyEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MembershipPolicyId ==
                        dto.MembershipPolicyId
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity == null
        )
        {
            throw new KeyNotFoundException(
                "Membership Policy not found.");
        }

        if
        (
            dto.MembershipCardId > 0
            &&
            dto.MembershipCardId !=
            entity.MembershipCardId
        )
        {
            throw new InvalidOperationException(
                "Membership Card cannot be changed after saving.");
        }

        MembershipCardEntity card =
            await LoadCardAsync(
                entity.MembershipCardId);

        EnsureActiveAllowed(
            card,
            dto.IsActive);

        PolicyValues values =
            ValidateInput(
                ToCreate(dto));

        Apply(
            entity,
            values);

        entity.IsActive =
            dto.IsActive;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            card,
            "Update",
            "Updated",
            userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Delete (soft)
    //
    // Blocking check for enrollments comes with Membership Status.
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        MembershipPolicyEntity? entity =
            await _context
                .Set<MembershipPolicyEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MembershipPolicyId ==
                        id
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity == null
        )
        {
            throw new KeyNotFoundException(
                "Membership Policy not found.");
        }

        MembershipCardEntity? card =
            await _context
                .Set<MembershipCardEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MembershipCardId ==
                        entity.MembershipCardId
                );

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            card,
            "Delete",
            "Deleted",
            userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore (most recently deleted)
    //
    // Blocked (409) while its card is deleted or already has
    // another live policy. Restored inactive under an inactive card.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        MembershipPolicyEntity? entity =
            await _context
                .Set<MembershipPolicyEntity>()
                .Where
                (
                    x =>
                        x.IsDeleted
                )
                .OrderByDescending
                (
                    x =>
                        x.DeletedDate
                )
                .FirstOrDefaultAsync();

        if
        (
            entity == null
        )
        {
            return false;
        }

        MembershipCardEntity card;

        try
        {
            card =
                await LoadCardAsync(
                    entity.MembershipCardId);

            await EnsureCardFreeAsync(
                card,
                entity.MembershipPolicyId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Membership Policy {entity.PolicyCode} cannot be restored. {ex.Message}");
        }

        entity.IsDeleted =
            false;

        entity.DeletedBy =
            null;

        entity.DeletedDate =
            null;

        if
        (
            !card.IsActive
        )
        {
            entity.IsActive =
                false;
        }

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        AddHistory(
            entity,
            card,
            "Restore",
            "Restored",
            userId);

        await _context.SaveChangesAsync();

        return true;
    }


    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory
    (
        MembershipPolicyEntity entity,
        MembershipCardEntity? card,
        string activityType,
        string verb,
        long userId
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Membership Management",

                EntityName =
                    "Membership Policies",

                EntityId =
                    entity.MembershipPolicyId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Membership Policy {verb}",

                ActivityDescription =
                    $"Membership Policy {entity.PolicyCode} ({card?.CardName ?? "card"}) {verb.ToLower()}.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );
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
            .Set<MembershipPolicyEntity>()
            .AnyAsync
            (
                x =>
                    x.MembershipPolicyId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}