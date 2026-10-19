//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ServiceSettings;

using ServicePolicyEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServicePolicy;

using ServicePolicyScheduleEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServicePolicySchedule;

using ServiceCategoryEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServiceCategory;

using BrandManagementEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.BrandManagement;

using AccountClassEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountClass;

using AccountGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using GeneralLedgerEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.CodeMaster;
using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ServiceSettings;


//===============================================================
// Service Policy Repository
//
// One policy per brand, declared FIRST : only brands with a live
// policy can get a Brand Services category (Service Category checks
// it), so a policy cannot be deleted while its brand has one.
//
// Warranty limit (free services only) :
//   Every FREE service must be taken within WarrantyYears or
//   WarrantyKm, whichever comes first. Paid services are not
//   limited by it.
//
// Schedule (template, ServicePolicySchedule rows, in order) :
//   Required : a policy cannot be saved without at least one row.
//   Each row is the n-th Free or Paid service, due IntervalDays
//   after the previous service (row 1 : after the sale date), plus
//   GraceDays. Days control the schedule; IntervalKm is reference
//   only. The standard (sale-date based) due day of every Free row
//   must fall inside the warranty years (1 year = 365 days).
//   Names and numbers ("4th Free Service") are built here.
//   FreeServiceCount / PaidServiceCount are counted from the rows.
//   Per-vehicle schedules (built from this after a sale, re-based
//   on the last service actually taken when one is late) come later.
//
// Codes :
//   Policy Code    SVP-nnn, highest used (deleted rows included)
//                  + 1, never reused.
//   Associated     GLR-ccc-ggg-sss-nnnnn, a General Ledger under
//   Ledger         the Associated Sub Group, same pattern and
//                  numbering as the General Ledgers page (highest
//                  in that sub group, deleted rows included, + 1).
//
// Associated Sub Group :
//   ONE sub group for all policies. The first policy chooses it
//   (active sub groups of active 'Account' classes in Debit mode,
//   e.g. "Receivables Against Service"); every later policy is
//   fixed to the same one. Linked by id, never by name.
//
// Associated Ledger (the brand's free service claim receivable) :
//   Name "<Sub Group Name> - <Brand Name>", always built from the
//   CURRENT sub group and brand names (never typed or hard coded) :
//   reads return the live name, and the ledger row is renamed to
//   match whenever the list is read or the policy is saved.
//   Created with the policy, (de)activated / deleted / restored
//   with it. Listed on the General Ledgers page under "Auto
//   Financial Ledgers".
//
// Locked : Policy Code, Brand and Associated Sub Group never change
//          after creation.
//===============================================================

public class ServicePolicyRepository :
    IServicePolicyRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string PolicyCodePrefix =
        "SVP";

    private const string LedgerPrefix =
        "GLR";

    private const string AccountClassType =
        "Account";

    private const string DebitMode =
        "Debit";

    private const string BrandServicesType =
        "Brand Services";

    // "<Sub Group Name> - <Brand Name>"
    private const string LedgerNameSeparator =
        " - ";

    private const string FreeType =
        "Free";

    private const string PaidType =
        "Paid";

    private const int MaxScheduleRows =
        60;

    private const int MaxIntervalDays =
        3650;

    private const int MaxIntervalKm =
        100000;

    private const int MaxGraceDays =
        365;

    private const int MaxWarrantyKm =
        1000000;

    private const int MaxWarrantyYears =
        30;

    private const int DaysPerYear =
        365;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public ServicePolicyRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Service Policy Query
    //===========================================================

    private IQueryable<ServicePolicyDto>
        ServicePolicyQuery()
    {
        return _context
            .Set<ServicePolicyEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new ServicePolicyDto
                    {
                        ServicePolicyId =
                            x.ServicePolicyId,

                        PolicyCode =
                            x.PolicyCode,

                        BrandManagementId =
                            x.BrandManagementId,

                        BrandName =
                            _context
                                .Set<BrandManagementEntity>()
                                .Where(b => b.BrandManagementId == x.BrandManagementId)
                                .Select(b => b.BrandName)
                                .FirstOrDefault()
                            ??
                            string.Empty,

                        WarrantyYears =
                            x.WarrantyYears,

                        WarrantyKm =
                            x.WarrantyKm,

                        FreeServiceCount =
                            x.FreeServiceCount,

                        PaidServiceCount =
                            x.PaidServiceCount,

                        AssociatedSubGroupId =
                            x.AssociatedSubGroupId,

                        AssociatedSubGroupCode =
                            _context
                                .Set<AccountSubGroupEntity>()
                                .Where(s => s.AccountSubGroupId == x.AssociatedSubGroupId)
                                .Select(s => s.SubGroupCode)
                                .FirstOrDefault()
                            ??
                            string.Empty,

                        AssociatedSubGroupName =
                            _context
                                .Set<AccountSubGroupEntity>()
                                .Where(s => s.AccountSubGroupId == x.AssociatedSubGroupId)
                                .Select(s => s.SubGroupName)
                                .FirstOrDefault()
                            ??
                            string.Empty,

                        AssociatedLedgerCode =
                            x.AssociatedLedgerCode,

                        AssociatedLedgerName =
                            x.AssociatedLedgerName,

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
                    }
            );
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<ServicePolicyDto>>
        GetAllAsync()
    {
        // Bring ledger names in line with renamed sub groups / brands
        await SyncLedgerNamesAsync();

        List<ServicePolicyDto> list =
            await ServicePolicyQuery()
                .OrderBy
                (
                    x =>
                        x.PolicyCode
                )
                .ToListAsync();

        list.ForEach(ApplyLiveName);

        return list;
    }


    //===========================================================
    // Live Associated Ledger Name
    //
    // "<Sub Group Name> - <Brand Name>" from the current names.
    //===========================================================

    private static string BuildLedgerName
    (
        string? subGroupName,
        string? brandName
    )
    {
        string subGroup =
            (subGroupName ?? string.Empty).Trim();

        string brand =
            (brandName ?? string.Empty).Trim();

        return subGroup.Length > 0 && brand.Length > 0
            ? $"{subGroup}{LedgerNameSeparator}{brand}"
            : subGroup + brand;
    }


    private static void ApplyLiveName
    (
        ServicePolicyDto dto
    )
    {
        string live =
            BuildLedgerName(
                dto.AssociatedSubGroupName,
                dto.BrandName);

        if
        (
            live.Length > 0
        )
        {
            dto.AssociatedLedgerName =
                live;
        }
    }


    //===========================================================
    // Sync Ledger Names
    //
    // Renames the Associated Ledgers (and the names stored on the
    // policies) whose sub group or brand has been renamed since.
    // Matching is by code / id only.
    //===========================================================

    private async Task
        SyncLedgerNamesAsync()
    {
        var rows =
            await
            (
                from p in _context.Set<ServicePolicyEntity>()
                join s in _context.Set<AccountSubGroupEntity>()
                    on p.AssociatedSubGroupId equals s.AccountSubGroupId
                join b in _context.Set<BrandManagementEntity>()
                    on p.BrandManagementId equals b.BrandManagementId
                join l in _context.Set<GeneralLedgerEntity>()
                    on p.AssociatedLedgerCode equals l.LedgerCode
                where
                    !p.IsDeleted
                    &&
                    !l.IsDeleted
                select new
                {
                    Policy = p,
                    Ledger = l,
                    s.SubGroupName,
                    b.BrandName
                }
            )
            .ToListAsync();

        bool changed =
            false;

        DateTime now =
            DateTime.UtcNow;

        foreach
        (
            var row
            in rows
        )
        {
            string live =
                BuildLedgerName(
                    row.SubGroupName,
                    row.BrandName);

            if
            (
                live.Length == 0
                ||
                live.Length > 200
            )
            {
                continue;
            }

            if
            (
                row.Ledger.LedgerName != live
            )
            {
                row.Ledger.LedgerName =
                    live;

                row.Ledger.ModifiedDate =
                    now;

                changed =
                    true;
            }

            if
            (
                row.Policy.AssociatedLedgerName != live
            )
            {
                row.Policy.AssociatedLedgerName =
                    live;

                changed =
                    true;
            }
        }

        if
        (
            changed
        )
        {
            await _context.SaveChangesAsync();
        }
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<ServicePolicyDto?>
        GetByIdAsync
        (
            long id
        )
    {
        ServicePolicyDto? dto =
            await ServicePolicyQuery()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ServicePolicyId ==
                        id
                );

        if
        (
            dto != null
        )
        {
            ApplyLiveName(
                dto);

            dto.Schedules =
                await _context
                    .Set<ServicePolicyScheduleEntity>()
                    .AsNoTracking()
                    .Where
                    (
                        x =>
                            x.ServicePolicyId ==
                            id
                    )
                    .OrderBy
                    (
                        x =>
                            x.SequenceNo
                    )
                    .Select
                    (
                        x =>
                            new ServicePolicyScheduleDto
                            {
                                ServicePolicyScheduleId = x.ServicePolicyScheduleId,
                                SequenceNo = x.SequenceNo,
                                ServiceType = x.ServiceType,
                                ServiceTypeNo = x.ServiceTypeNo,
                                ServiceName = x.ServiceName,
                                IntervalDays = x.IntervalDays,
                                IntervalKm = x.IntervalKm,
                                GraceDays = x.GraceDays
                            }
                    )
                    .ToListAsync();
        }

        return dto;
    }


    //===========================================================
    // Code Helpers
    //===========================================================

    // Number in the last part of a code : "SUB-002-002-005" -> 5
    private static int LastNumber
    (
        string? code
    )
    {
        string[] parts =
            (code ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

        return parts.Length >= 2
            &&
            int.TryParse(
                parts[^1].Trim(),
                out int number)
                ? number
                : 0;
    }


    // "SVP-007" -> 7, otherwise 0
    private static int PolicyNumber
    (
        string? code
    )
    {
        string[] parts =
            (code ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

        return parts.Length == 2
            &&
            string.Equals(
                parts[0],
                PolicyCodePrefix,
                StringComparison.OrdinalIgnoreCase)
            &&
            int.TryParse(
                parts[1],
                out int number)
                ? number
                : 0;
    }


    //===========================================================
    // Next Policy Code (SVP-nnn)
    //===========================================================

    private async Task<string>
        GetNextPolicyCodeAsync()
    {
        List<string> codes =
            await _context
                .Set<ServicePolicyEntity>()
                .AsNoTracking()
                .Select
                (
                    x =>
                        x.PolicyCode
                )
                .ToListAsync();

        int highest =
            codes
                .Select(PolicyNumber)
                .DefaultIfEmpty(0)
                .Max();

        // Central code generator : SVP-001
        return CodeGenerator.GeneratePolicyCode(
            highest + 1);
    }


    public async Task<string>
        GetNextCodeAsync()
    {
        return await GetNextPolicyCodeAsync();
    }


    //===========================================================
    // Associated Sub Group (sub group + its group + its class)
    //===========================================================

    private sealed class LedgerParent
    {
        public AccountClassEntity Class { get; init; } = null!;

        public AccountGroupEntity Group { get; init; } = null!;

        public AccountSubGroupEntity SubGroup { get; init; } = null!;
    }


    // Eligible : active sub group, active group, active class of
    // type 'Account' in Debit mode (assets such as receivables)
    private IQueryable<ServicePolicySubGroupOptionDto>
        EligibleSubGroupsQuery()
    {
        return
            from s in _context.Set<AccountSubGroupEntity>().AsNoTracking()
            join g in _context.Set<AccountGroupEntity>().AsNoTracking()
                on s.AccountGroupId equals g.AccountGroupId
            join c in _context.Set<AccountClassEntity>().AsNoTracking()
                on s.AccountClassId equals c.AccountClassId
            where
                !s.IsDeleted && s.IsActive
                &&
                !g.IsDeleted && g.IsActive
                &&
                !c.IsDeleted && c.IsActive
                &&
                c.ClassType == AccountClassType
                &&
                c.Mode == DebitMode
            orderby s.SubGroupCode
            select new ServicePolicySubGroupOptionDto
            {
                AccountSubGroupId = s.AccountSubGroupId,
                SubGroupCode = s.SubGroupCode,
                SubGroupName = s.SubGroupName,
                GroupName = g.GroupName,
                ClassName = c.ClassName
            };
    }


    private async Task<LedgerParent>
        ResolveLedgerParentAsync
        (
            long subGroupId,
            bool requireEligible
        )
    {
        if
        (
            subGroupId <=
            0
        )
        {
            throw new InvalidOperationException(
                "Associated Sub Group is required.");
        }

        AccountSubGroupEntity? subGroup =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountSubGroupId ==
                        subGroupId
                        &&
                        !x.IsDeleted
                );

        AccountGroupEntity? group =
            subGroup == null
                ? null
                : await _context
                    .Set<AccountGroupEntity>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync
                    (
                        x =>
                            x.AccountGroupId ==
                            subGroup.AccountGroupId
                            &&
                            !x.IsDeleted
                    );

        AccountClassEntity? accountClass =
            subGroup == null
                ? null
                : await _context
                    .Set<AccountClassEntity>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync
                    (
                        x =>
                            x.AccountClassId ==
                            subGroup.AccountClassId
                            &&
                            !x.IsDeleted
                    );

        if
        (
            subGroup == null
            ||
            group == null
            ||
            accountClass == null
        )
        {
            throw new InvalidOperationException(
                "The Associated Sub Group was not found. It may have been deleted.");
        }

        if
        (
            requireEligible
            &&
            !await EligibleSubGroupsQuery()
                .AnyAsync
                (
                    x =>
                        x.AccountSubGroupId ==
                        subGroupId
                )
        )
        {
            throw new InvalidOperationException(
                $"Sub Group '{subGroup.SubGroupName}' cannot hold the Associated Ledger. " +
                "Choose an active sub group of an active Debit 'Account' class (e.g. Account Receivables).");
        }

        return new LedgerParent
        {
            Class =
                accountClass,

            Group =
                group,

            SubGroup =
                subGroup
        };
    }


    //===========================================================
    // Next Associated Ledger Code (GLR-ccc-ggg-sss-nnnnn)
    //
    // Highest nnnnn used in this sub group by any ledger or any
    // policy (deleted rows included) + 1.
    //===========================================================

    private async Task<string>
        GetNextLedgerCodeAsync
        (
            LedgerParent parent
        )
    {
        int classNo =
            LastNumber(parent.Class.ClassCode);

        int groupNo =
            LastNumber(parent.Group.GroupCode);

        int subGroupNo =
            LastNumber(parent.SubGroup.SubGroupCode);

        string parentPart =
            $"{classNo:D3}-{groupNo:D3}-{subGroupNo:D3}";

        List<string> ledgerCodes =
            await _context
                .Set<GeneralLedgerEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.AccountSubGroupId ==
                        parent.SubGroup.AccountSubGroupId
                )
                .Select
                (
                    x =>
                        x.LedgerCode
                )
                .ToListAsync();

        List<string> policyCodes =
            await _context
                .Set<ServicePolicyEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.AssociatedSubGroupId ==
                        parent.SubGroup.AccountSubGroupId
                )
                .Select
                (
                    x =>
                        x.AssociatedLedgerCode
                )
                .ToListAsync();

        int highest =
            ledgerCodes
                .Concat(policyCodes)
                .Select
                (
                    code =>
                    {
                        string[] parts =
                            (code ?? string.Empty)
                                .Trim()
                                .Split(
                                    '-',
                                    StringSplitOptions.RemoveEmptyEntries);

                        return parts.Length == 5
                            &&
                            string.Equals(
                                parts[0],
                                LedgerPrefix,
                                StringComparison.OrdinalIgnoreCase)
                            &&
                            $"{parts[1]}-{parts[2]}-{parts[3]}" ==
                            parentPart
                            &&
                            int.TryParse(
                                parts[4],
                                out int number)
                                ? number
                                : 0;
                    }
                )
                .DefaultIfEmpty(0)
                .Max();

        return CodeGenerator.GenerateGeneralLedgerCode(
            classNo,
            groupNo,
            subGroupNo,
            highest + 1);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<ServicePolicyDefaultsDto>
        GetDefaultsAsync()
    {
        List<ServicePolicySubGroupOptionDto> subGroups =
            await EligibleSubGroupsQuery()
                .ToListAsync();

        //=======================================================
        // Associated Sub Group : fixed once a policy exists;
        // for the first policy, the first eligible sub group named
        // "...receivable..." is offered
        //=======================================================

        long? fixedSubGroupId =
            await GetFixedSubGroupIdAsync(
                0);

        long defaultSubGroupId =
            fixedSubGroupId
            ??
            subGroups
                .Where
                (
                    x =>
                        (x.SubGroupName ?? string.Empty)
                            .Contains(
                                "receivable",
                                StringComparison.OrdinalIgnoreCase)
                )
                .Select
                (
                    x =>
                        x.AccountSubGroupId
                )
                .FirstOrDefault();

        // The fixed sub group is always listed, even if it is no
        // longer eligible (e.g. made inactive)
        if
        (
            fixedSubGroupId.HasValue
            &&
            !subGroups.Any(x => x.AccountSubGroupId == fixedSubGroupId.Value)
        )
        {
            ServicePolicySubGroupOptionDto? fixedOption =
                await
                (
                    from sg in _context.Set<AccountSubGroupEntity>().AsNoTracking()
                    join g in _context.Set<AccountGroupEntity>().AsNoTracking()
                        on sg.AccountGroupId equals g.AccountGroupId
                    join c in _context.Set<AccountClassEntity>().AsNoTracking()
                        on sg.AccountClassId equals c.AccountClassId
                    where sg.AccountSubGroupId == fixedSubGroupId.Value
                    select new ServicePolicySubGroupOptionDto
                    {
                        AccountSubGroupId = sg.AccountSubGroupId,
                        SubGroupCode = sg.SubGroupCode,
                        SubGroupName = sg.SubGroupName,
                        GroupName = g.GroupName,
                        ClassName = c.ClassName
                    }
                )
                .FirstOrDefaultAsync();

            if
            (
                fixedOption != null
            )
            {
                subGroups.Insert(
                    0,
                    fixedOption);
            }
        }

        string nextLedgerCode =
            defaultSubGroupId > 0
                ? await GetNextLedgerCodeAsync(
                    defaultSubGroupId)
                : string.Empty;

        //=======================================================
        // Brands (the form offers active brands without a policy,
        // plus the policy's own brand)
        //=======================================================

        List<ServicePolicyBrandOptionDto> brands =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .Where
                (
                    b =>
                        !b.IsDeleted
                )
                .OrderBy
                (
                    b =>
                        b.BrandName
                )
                .Select
                (
                    b =>
                        new ServicePolicyBrandOptionDto
                        {
                            BrandManagementId = b.BrandManagementId,
                            BrandName = b.BrandName,
                            BrandActive = b.Status,
                            ServicePolicyId =
                                _context
                                    .Set<ServicePolicyEntity>()
                                    .Where
                                    (
                                        p =>
                                            !p.IsDeleted
                                            &&
                                            p.BrandManagementId ==
                                            b.BrandManagementId
                                    )
                                    .Select
                                    (
                                        p =>
                                            (long?)p.ServicePolicyId
                                    )
                                    .FirstOrDefault()
                        }
                )
                .ToListAsync();

        return new ServicePolicyDefaultsDto
        {
            Code =
                await GetNextPolicyCodeAsync(),

            DefaultSubGroupId =
                defaultSubGroupId,

            IsSubGroupFixed =
                fixedSubGroupId.HasValue,

            NextLedgerCode =
                nextLedgerCode,

            SubGroups =
                subGroups,

            Brands =
                brands
        };
    }


    //===========================================================
    // Fixed Associated Sub Group
    //
    // The sub group the live policies use (all use the same one),
    // or null when there is no live policy yet. excludeId leaves
    // out one policy (the one being restored).
    //===========================================================

    private async Task<long?>
        GetFixedSubGroupIdAsync
        (
            long excludeId
        )
    {
        long id =
            await _context
                .Set<ServicePolicyEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.ServicePolicyId !=
                        excludeId
                )
                .OrderBy
                (
                    x =>
                        x.CreatedDate
                )
                .Select
                (
                    x =>
                        x.AssociatedSubGroupId
                )
                .FirstOrDefaultAsync();

        return id > 0
            ? id
            : null;
    }


    //===========================================================
    // Next Associated Ledger Code for a sub group (preview)
    //===========================================================

    public async Task<string>
        GetNextLedgerCodeAsync
        (
            long subGroupId
        )
    {
        LedgerParent parent =
            await ResolveLedgerParentAsync(
                subGroupId,
                false);

        return await GetNextLedgerCodeAsync(
            parent);
    }


    //===========================================================
    // Brand
    //===========================================================

    private async Task<BrandManagementEntity>
        ResolveBrandAsync
        (
            long brandId,
            bool isNew
        )
    {
        if
        (
            brandId <=
            0
        )
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
                        x.BrandManagementId ==
                        brandId
                        &&
                        !x.IsDeleted
                );

        if
        (
            brand ==
            null
        )
        {
            throw new InvalidOperationException(
                "The selected Brand was not found. It may have been deleted.");
        }

        if
        (
            isNew
            &&
            !brand.Status
        )
        {
            throw new InvalidOperationException(
                $"Brand '{brand.BrandName}' is inactive.");
        }

        return brand;
    }


    //===========================================================
    // One Policy Per Brand
    //===========================================================

    private async Task
        EnsureBrandFreeAsync
        (
            long brandId,
            string brandName,
            long excludeId
        )
    {
        ServicePolicyEntity? other =
            await _context
                .Set<ServicePolicyEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.ServicePolicyId !=
                        excludeId
                        &&
                        x.BrandManagementId ==
                        brandId
                );

        if
        (
            other !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Brand '{brandName}' already has a service policy ({other.PolicyCode}).");
        }
    }


    //===========================================================
    // Ordinal : 1 -> "1st", 2 -> "2nd", 11 -> "11th", 23 -> "23rd"
    //===========================================================

    private static string Ordinal
    (
        int number
    )
    {
        int lastTwo =
            number % 100;

        string suffix =
            lastTwo is >= 11 and <= 13
                ? "th"
                : (number % 10) switch
                {
                    1 => "st",
                    2 => "nd",
                    3 => "rd",
                    _ => "th"
                };

        return $"{number}{suffix}";
    }


    //===========================================================
    // Validate Warranty Limit (years + km)
    //
    // Returns the warranty period in days (1 year = 365).
    //===========================================================

    private static int
        ValidateWarranty
        (
            int warrantyYears,
            int warrantyKm
        )
    {
        if
        (
            warrantyYears < 1
            ||
            warrantyYears > MaxWarrantyYears
        )
        {
            throw new InvalidOperationException(
                $"Warranty (Years) is required (1 to {MaxWarrantyYears}).");
        }

        if
        (
            warrantyKm < 1
            ||
            warrantyKm > MaxWarrantyKm
        )
        {
            throw new InvalidOperationException(
                $"Warranty Km is required (1 to {MaxWarrantyKm:N0}).");
        }

        return warrantyYears * DaysPerYear;
    }


    //===========================================================
    // Build Schedule
    //
    // Validates the rows in the order given and builds their
    // sequence, type number and name. The standard due day of
    // every Free row (sale date + running total of IntervalDays)
    // must fall inside the warranty period.
    //===========================================================

    private static List<ServicePolicyScheduleDto>
        BuildSchedule
        (
            List<ServicePolicyScheduleDto>? rows,
            int warrantyDays
        )
    {
        List<ServicePolicyScheduleDto> input =
            rows
            ??
            new List<ServicePolicyScheduleDto>();

        if
        (
            input.Count == 0
        )
        {
            throw new InvalidOperationException(
                "Add at least one service to the schedule.");
        }

        if
        (
            input.Count > MaxScheduleRows
        )
        {
            throw new InvalidOperationException(
                $"The schedule can have at most {MaxScheduleRows} services.");
        }

        List<ServicePolicyScheduleDto> result =
            new();

        int freeNo =
            0;

        int paidNo =
            0;

        int dueDay =
            0;

        for
        (
            int index = 0;
            index < input.Count;
            index++
        )
        {
            ServicePolicyScheduleDto row =
                input[index];

            int position =
                index + 1;

            string type =
                string.Equals(row.ServiceType?.Trim(), FreeType, StringComparison.OrdinalIgnoreCase)
                    ? FreeType
                    : string.Equals(row.ServiceType?.Trim(), PaidType, StringComparison.OrdinalIgnoreCase)
                        ? PaidType
                        : throw new InvalidOperationException(
                            $"Service #{position} : choose Free or Paid.");

            if
            (
                row.IntervalDays < 1
                ||
                row.IntervalDays > MaxIntervalDays
            )
            {
                throw new InvalidOperationException(
                    $"Service #{position} : Due After (Days) must be between 1 and {MaxIntervalDays}.");
            }

            if
            (
                row.IntervalKm < 0
                ||
                row.IntervalKm > MaxIntervalKm
            )
            {
                throw new InvalidOperationException(
                    $"Service #{position} : Km must be between 0 and {MaxIntervalKm:N0}.");
            }

            if
            (
                row.GraceDays < 0
                ||
                row.GraceDays > MaxGraceDays
            )
            {
                throw new InvalidOperationException(
                    $"Service #{position} : Grace Days must be between 0 and {MaxGraceDays}.");
            }

            int typeNo =
                type == FreeType
                    ? ++freeNo
                    : ++paidNo;

            string name =
                $"{Ordinal(typeNo)} {type} Service";

            dueDay +=
                row.IntervalDays;

            if
            (
                type == FreeType
                &&
                dueDay > warrantyDays
            )
            {
                throw new InvalidOperationException(
                    $"{name} (service #{position}) is due on day {dueDay} after sale, " +
                    $"beyond the warranty ({warrantyDays / DaysPerYear} year(s) = {warrantyDays} days). Free services must fall within the warranty.");
            }

            result.Add(
                new ServicePolicyScheduleDto
                {
                    SequenceNo = position,
                    ServiceType = type,
                    ServiceTypeNo = typeNo,
                    ServiceName = name,
                    IntervalDays = row.IntervalDays,
                    IntervalKm = row.IntervalKm,
                    GraceDays = row.GraceDays
                }
            );
        }

        return result;
    }


    //===========================================================
    // Replace Schedule Rows (call after the policy has its id)
    //===========================================================

    private async Task
        ReplaceScheduleAsync
        (
            long servicePolicyId,
            List<ServicePolicyScheduleDto> rows,
            long userId
        )
    {
        List<ServicePolicyScheduleEntity> existing =
            await _context
                .Set<ServicePolicyScheduleEntity>()
                .Where
                (
                    x =>
                        x.ServicePolicyId ==
                        servicePolicyId
                )
                .ToListAsync();

        _context
            .Set<ServicePolicyScheduleEntity>()
            .RemoveRange(
                existing);

        // Old rows go first, so the (policy, sequence) index never clashes
        await _context.SaveChangesAsync();

        DateTime now =
            DateTime.UtcNow;

        _context
            .Set<ServicePolicyScheduleEntity>()
            .AddRange
            (
                rows.Select
                (
                    x =>
                        new ServicePolicyScheduleEntity
                        {
                            ServicePolicyId = servicePolicyId,
                            SequenceNo = x.SequenceNo,
                            ServiceType = x.ServiceType,
                            ServiceTypeNo = x.ServiceTypeNo,
                            ServiceName = x.ServiceName,
                            IntervalDays = x.IntervalDays,
                            IntervalKm = x.IntervalKm,
                            GraceDays = x.GraceDays,
                            CreatedBy = userId,
                            CreatedDate = now
                        }
                )
            );
    }


    private static string AssociatedLedgerName
    (
        LedgerParent parent,
        BrandManagementEntity brand
    )
    {
        string name =
            BuildLedgerName(
                parent.SubGroup.SubGroupName,
                brand.BrandName);

        if
        (
            name.Length > 200
        )
        {
            throw new InvalidOperationException(
                "The Associated Ledger Name (Sub Group Name - Brand Name) is longer than 200 characters.");
        }

        return name;
    }


    //===========================================================
    // Associated Ledger name must be unique within its sub group
    //===========================================================

    private async Task
        EnsureLedgerNameFreeAsync
        (
            ServicePolicyEntity entity
        )
    {
        string lowerName =
            entity.AssociatedLedgerName.ToLower();

        GeneralLedgerEntity? same =
            await _context
                .Set<GeneralLedgerEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.AccountSubGroupId ==
                        entity.AssociatedSubGroupId
                        &&
                        x.LedgerCode !=
                        entity.AssociatedLedgerCode
                        &&
                        x.LedgerName.ToLower() ==
                        lowerName
                );

        if
        (
            same !=
            null
        )
        {
            throw new InvalidOperationException(
                $"General Ledger '{entity.AssociatedLedgerName}' already exists in this sub group ({same.LedgerCode}).");
        }
    }


    //===========================================================
    // Sync Associated Ledger
    //
    // Creates the ledger when missing and keeps it in line with
    // the policy : name, active state, parent data.
    //===========================================================

    private async Task
        SyncLedgerAsync
        (
            ServicePolicyEntity entity,
            LedgerParent parent,
            long userId
        )
    {
        GeneralLedgerEntity? ledger =
            await _context
                .Set<GeneralLedgerEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.LedgerCode ==
                        entity.AssociatedLedgerCode
                        &&
                        !x.IsDeleted
                );

        if
        (
            ledger ==
            null
        )
        {
            _context
                .Set<GeneralLedgerEntity>()
                .Add
                (
                    new GeneralLedgerEntity
                    {
                        AccountClassId =
                            parent.Class.AccountClassId,

                        AccountGroupId =
                            parent.Group.AccountGroupId,

                        AccountSubGroupId =
                            parent.SubGroup.AccountSubGroupId,

                        ClassCode =
                            parent.Class.ClassCode,

                        Mode =
                            parent.Class.Mode,

                        GroupCode =
                            parent.Group.GroupCode,

                        SubGroupCode =
                            parent.SubGroup.SubGroupCode,

                        LedgerCode =
                            entity.AssociatedLedgerCode,

                        LedgerName =
                            entity.AssociatedLedgerName,

                        Remarks =
                            $"System generated from Service Policy {entity.PolicyCode}.",

                        IsActive =
                            entity.IsActive,

                        IsDeleted =
                            false,

                        CreatedBy =
                            userId,

                        CreatedDate =
                            DateTime.UtcNow
                    }
                );

            return;
        }

        if
        (
            ledger.AccountSubGroupId !=
            parent.SubGroup.AccountSubGroupId
        )
        {
            throw new InvalidOperationException(
                $"General Ledger '{entity.AssociatedLedgerCode}' belongs to a different sub group.");
        }

        bool changed =
            ledger.LedgerName != entity.AssociatedLedgerName
            ||
            ledger.IsActive != entity.IsActive
            ||
            ledger.ClassCode != parent.Class.ClassCode
            ||
            ledger.Mode != parent.Class.Mode
            ||
            ledger.GroupCode != parent.Group.GroupCode
            ||
            ledger.SubGroupCode != parent.SubGroup.SubGroupCode;

        if
        (
            !changed
        )
        {
            return;
        }

        ledger.LedgerName =
            entity.AssociatedLedgerName;

        ledger.IsActive =
            entity.IsActive;

        ledger.ClassCode =
            parent.Class.ClassCode;

        ledger.Mode =
            parent.Class.Mode;

        ledger.GroupCode =
            parent.Group.GroupCode;

        ledger.SubGroupCode =
            parent.SubGroup.SubGroupCode;

        ledger.ModifiedBy =
            userId;

        ledger.ModifiedDate =
            DateTime.UtcNow;
    }


    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory
    (
        ServicePolicyEntity entity,
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
                    "Service Settings",

                EntityName =
                    "Service Policy",

                EntityId =
                    entity.ServicePolicyId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Service Policy {verb}",

                ActivityDescription =
                    $"Service Policy {entity.PolicyCode} ({brandName}) {verb.ToLower()}.",

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
    // Create
    //
    // Codes and the ledger name are built here; the form's
    // values are only a preview.
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateServicePolicyDto dto,
            long userId
        )
    {
        BrandManagementEntity brand =
            await ResolveBrandAsync(
                dto.BrandManagementId,
                true);

        await EnsureBrandFreeAsync(
            brand.BrandManagementId,
            brand.BrandName,
            0);

        int warrantyDays =
            ValidateWarranty(
                dto.WarrantyYears,
                dto.WarrantyKm);

        List<ServicePolicyScheduleDto> schedule =
            BuildSchedule(
                dto.Schedules,
                warrantyDays);

        //=======================================================
        // Associated Sub Group : fixed by the existing policies;
        // only the first policy chooses it
        //=======================================================

        long? fixedSubGroupId =
            await GetFixedSubGroupIdAsync(
                0);

        LedgerParent parent =
            await ResolveLedgerParentAsync(
                fixedSubGroupId ?? dto.AssociatedSubGroupId,
                !fixedSubGroupId.HasValue);

        ServicePolicyEntity entity =
            new ServicePolicyEntity
            {
                PolicyCode =
                    await GetNextPolicyCodeAsync(),

                BrandManagementId =
                    brand.BrandManagementId,

                WarrantyYears =
                    dto.WarrantyYears,

                WarrantyKm =
                    dto.WarrantyKm,

                FreeServiceCount =
                    schedule.Count(x => x.ServiceType == FreeType),

                PaidServiceCount =
                    schedule.Count(x => x.ServiceType == PaidType),

                AssociatedSubGroupId =
                    parent.SubGroup.AccountSubGroupId,

                AssociatedLedgerCode =
                    await GetNextLedgerCodeAsync(
                        parent),

                AssociatedLedgerName =
                    AssociatedLedgerName(
                        parent,
                        brand),

                Remarks =
                    dto.Remarks?.Trim()
                    ??
                    string.Empty,

                IsActive =
                    dto.IsActive,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };

        await EnsureLedgerNameFreeAsync(
            entity);


        //=======================================================
        // Policy + its Associated Ledger in one transaction
        //=======================================================

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        _context
            .Set<ServicePolicyEntity>()
            .Add(
                entity);

        await SyncLedgerAsync(
            entity,
            parent,
            userId);

        await _context.SaveChangesAsync();

        await ReplaceScheduleAsync(
            entity.ServicePolicyId,
            schedule,
            userId);

        // Scheduled Services : one row per schedule position
        await ScheduledServicesSync.SyncPolicyAsync(
            _context,
            entity.ServicePolicyId,
            userId);

        AddHistory(
            entity,
            brand.BrandName,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.ServicePolicyId;
    }


    //===========================================================
    // Update
    //
    // Brand and claim sub group are locked. The ledger name is
    // rebuilt from the brand (a renamed brand renames it).
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateServicePolicyDto dto,
            long userId
        )
    {
        ServicePolicyEntity? entity =
            await _context
                .Set<ServicePolicyEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ServicePolicyId ==
                        dto.ServicePolicyId
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Service Policy not found.");
        }

        if
        (
            dto.BrandManagementId !=
            entity.BrandManagementId
        )
        {
            throw new InvalidOperationException(
                "Brand cannot be changed after saving. Create a new policy for the other brand.");
        }

        if
        (
            dto.AssociatedSubGroupId > 0
            &&
            dto.AssociatedSubGroupId !=
            entity.AssociatedSubGroupId
        )
        {
            throw new InvalidOperationException(
                "Associated Sub Group cannot be changed after saving.");
        }

        BrandManagementEntity brand =
            await ResolveBrandAsync(
                entity.BrandManagementId,
                false);

        int warrantyDays =
            ValidateWarranty(
                dto.WarrantyYears,
                dto.WarrantyKm);

        List<ServicePolicyScheduleDto> schedule =
            BuildSchedule(
                dto.Schedules,
                warrantyDays);

        LedgerParent parent =
            await ResolveLedgerParentAsync(
                entity.AssociatedSubGroupId,
                false);

        entity.WarrantyYears =
            dto.WarrantyYears;

        entity.WarrantyKm =
            dto.WarrantyKm;

        entity.FreeServiceCount =
            schedule.Count(x => x.ServiceType == FreeType);

        entity.PaidServiceCount =
            schedule.Count(x => x.ServiceType == PaidType);

        entity.AssociatedLedgerName =
            AssociatedLedgerName(
                parent,
                brand);

        entity.Remarks =
            dto.Remarks?.Trim()
            ??
            string.Empty;

        entity.IsActive =
            dto.IsActive;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await EnsureLedgerNameFreeAsync(
            entity);


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await SyncLedgerAsync(
            entity,
            parent,
            userId);

        await _context.SaveChangesAsync();

        await ReplaceScheduleAsync(
            entity.ServicePolicyId,
            schedule,
            userId);

        // Scheduled Services : one row per schedule position
        await ScheduledServicesSync.SyncPolicyAsync(
            _context,
            entity.ServicePolicyId,
            userId);

        AddHistory(
            entity,
            brand.BrandName,
            "Update",
            "Updated",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    //===========================================================
    // Delete
    //
    // Blocked (409) while the brand has a Brand Services category.
    // Deletes the policy and its Associated Ledger together (the
    // schedule rows stay with the deleted policy for a restore).
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        ServicePolicyEntity? entity =
            await _context
                .Set<ServicePolicyEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ServicePolicyId ==
                        id
                        &&
                        !x.IsDeleted
                );

        if
        (
            entity ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Service Policy not found.");
        }

        //=======================================================
        // Dependency : the brand's Brand Services category needs
        // this policy
        //=======================================================

        ServiceCategoryEntity? category =
            await _context
                .Set<ServiceCategoryEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.CategoryType ==
                        BrandServicesType
                        &&
                        x.BrandManagementId ==
                        entity.BrandManagementId
                );

        if
        (
            category != null
        )
        {
            throw new InvalidOperationException(
                $"Service Policy {entity.PolicyCode} cannot be deleted because Service Category " +
                $"'{category.CategoryName}' ({category.CategoryCode}) uses it. Delete that category first.");
        }

        string brandName =
            await _context
                .Set<BrandManagementEntity>()
                .AsNoTracking()
                .Where(x => x.BrandManagementId == entity.BrandManagementId)
                .Select(x => x.BrandName)
                .FirstOrDefaultAsync()
            ??
            string.Empty;

        List<GeneralLedgerEntity> ledgers =
            await _context
                .Set<GeneralLedgerEntity>()
                .Where
                (
                    x =>
                        x.LedgerCode ==
                        entity.AssociatedLedgerCode
                        &&
                        !x.IsDeleted
                )
                .ToListAsync();

        DateTime now =
            DateTime.UtcNow;

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            now;

        foreach
        (
            GeneralLedgerEntity ledger
            in ledgers
        )
        {
            ledger.IsDeleted =
                true;

            ledger.DeletedBy =
                userId;

            ledger.DeletedDate =
                now;
        }

        await _context.SaveChangesAsync();

        // Scheduled Services : one row per schedule position
        await ScheduledServicesSync.SyncPolicyAsync(
            _context,
            entity.ServicePolicyId,
            userId);

        AddHistory(
            entity,
            brandName,
            "Delete",
            "Deleted",
            userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore
    //
    // Restores the most recently deleted policy and its ledger.
    // Blocked (409) while the brand already has another policy,
    // or its brand / claim sub group is gone.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        ServicePolicyEntity? entity =
            await _context
                .Set<ServicePolicyEntity>()
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
            entity ==
            null
        )
        {
            return false;
        }

        BrandManagementEntity brand;

        LedgerParent parent;

        try
        {
            brand =
                await ResolveBrandAsync(
                    entity.BrandManagementId,
                    false);

            await EnsureBrandFreeAsync(
                brand.BrandManagementId,
                brand.BrandName,
                entity.ServicePolicyId);

            long? fixedSubGroupId =
                await GetFixedSubGroupIdAsync(
                    entity.ServicePolicyId);

            if
            (
                fixedSubGroupId.HasValue
                &&
                fixedSubGroupId.Value != entity.AssociatedSubGroupId
            )
            {
                throw new InvalidOperationException(
                    "It uses a different Associated Sub Group than the current policies.");
            }

            parent =
                await ResolveLedgerParentAsync(
                    entity.AssociatedSubGroupId,
                    false);

            entity.AssociatedLedgerName =
                AssociatedLedgerName(
                    parent,
                    brand);

            await EnsureLedgerNameFreeAsync(
                entity);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Service Policy {entity.PolicyCode} cannot be restored. {ex.Message}");
        }


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        //=======================================================
        // Restore the deleted ledger first, then let Sync create
        // it if missing and bring name / state in line.
        //=======================================================

        GeneralLedgerEntity? deletedLedger =
            await _context
                .Set<GeneralLedgerEntity>()
                .Where
                (
                    x =>
                        x.LedgerCode ==
                        entity.AssociatedLedgerCode
                        &&
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
            deletedLedger != null
        )
        {
            deletedLedger.IsDeleted =
                false;

            deletedLedger.DeletedBy =
                null;

            deletedLedger.DeletedDate =
                null;

            deletedLedger.ModifiedBy =
                userId;

            deletedLedger.ModifiedDate =
                DateTime.UtcNow;

            await _context.SaveChangesAsync();
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

        await SyncLedgerAsync(
            entity,
            parent,
            userId);

        await _context.SaveChangesAsync();

        // Scheduled Services : one row per schedule position
        await ScheduledServicesSync.SyncPolicyAsync(
            _context,
            entity.ServicePolicyId,
            userId);

        AddHistory(
            entity,
            brand.BrandName,
            "Restore",
            "Restored",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

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
            .Set<ServicePolicyEntity>()
            .AnyAsync
            (
                x =>
                    x.ServicePolicyId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}