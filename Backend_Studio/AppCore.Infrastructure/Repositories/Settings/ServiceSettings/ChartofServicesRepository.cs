//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.ServiceSettings;
using AppCore.Application.Settings.ServiceSettings.ChartOfServices.DTOs;

using ServiceCategoryEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServiceCategory;

using ServiceSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServiceSubCategory;

using ScheduledServicesEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ScheduledServices;

using LaborChartEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.LaborChart;

using CustomizedServicesEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.CustomizedServices;

using MembershipServicesEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.MembershipServices;

using AccountGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using GeneralLedgersEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ServiceSettings;


//===============================================================
// Chart of Services Repository (read-only)
//
// The page owns no data. Every call reads the live tables, so
// whatever is added, renamed, priced, deactivated or deleted on
// the Service Category / Sub Category / Scheduled Services /
// Labor Chart / Customized Services / Membership Services pages
// shows up on the next load.
//
// Tree     : Category Type (fixed BRS / DRS) → Service Category →
//            Service Sub Category, linked by ID only.
// Services : every service table is registered ONCE in
//            ServiceSources below. Counts, service lists,
//            printing and link checks all read from that single
//            list, so a new service table is one entry.
// Issues   : GetIssuesAsync reports broken links instead of
//            hiding them (missing / deleted parents, a code that
//            does not follow its parent, a service under a sub
//            category of another type, missing account groups /
//            ledgers, scheduled services not priced yet).
//
// Deleted records are never shown. Nothing is written.
//===============================================================

public class ChartOfServicesRepository : IChartOfServicesRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public ChartOfServicesRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Category Types (fixed, in display order)
    //
    // SubCategoryTypes : the Sub Category Types allowed under
    //                    the Category Type.
    //===========================================================

    private sealed class TypeDef
    {
        public long Id { get; init; }

        public string Code { get; init; } = string.Empty;

        public string Name { get; init; } = string.Empty;

        public string[] SubCategoryTypes { get; init; } = Array.Empty<string>();
    }


    private static readonly TypeDef[] Types =
    {
        new TypeDef
        {
            Id = 1,
            Code = "BRS",
            Name = "Brand Services",
            SubCategoryTypes = new[] { "Labor Chart", "Scheduled Services" }
        },

        new TypeDef
        {
            Id = 2,
            Code = "DRS",
            Name = "Differential Services",
            SubCategoryTypes = new[] { "Customized Services", "Membership Services" }
        }
    };


    // "brand services" → the Brand Services type, unknown → null
    private static TypeDef? TypeOf
    (
        string? categoryType
    )
    {
        return Types.FirstOrDefault
        (
            x =>
                string.Equals(
                    x.Name,
                    categoryType?.Trim(),
                    StringComparison.OrdinalIgnoreCase)
        );
    }


    //===========================================================
    // Service Sources (THE ONLY PLACE SERVICE TABLES ARE LISTED)
    //
    // Each source returns its non-deleted rows in one shape.
    // subCategoryId = null → all rows of that table.
    //
    // SubCategoryType : the Sub Category Type the rows belong to
    // CodePrefix      : the item code prefix (MSS / BLC / OCS / MSC)
    //===========================================================

    private sealed class ServiceSource
    {
        public string ItemType { get; init; } = string.Empty;

        public string SubCategoryType { get; init; } = string.Empty;

        public string CodePrefix { get; init; } = string.Empty;

        public Func<AppDbContext, long?, IQueryable<ChartOfServicesDto>> Query { get; init; } =
            (_, _) => Enumerable.Empty<ChartOfServicesDto>().AsQueryable();
    }


    private static readonly ServiceSource[] ServiceSources =
    {
        //=======================================================
        // Scheduled Services (MSS)
        //
        // Rows are created by the Service Policy page and get a
        // sub category, code and ledger only when priced on the
        // Scheduled Services page. Rows without a sub category
        // are not in the tree; GetIssuesAsync lists them.
        //=======================================================

        new ServiceSource
        {
            ItemType =
                ChartOfServicesItemTypes.ScheduledService,

            SubCategoryType =
                "Scheduled Services",

            CodePrefix =
                "MSS",

            Query =
                (db, subCategoryId) =>
                    db.Set<ScheduledServicesEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                x.ServiceSubCategoryId != null
                                &&
                                (subCategoryId == null || x.ServiceSubCategoryId == subCategoryId)
                        )
                        .Select
                        (
                            x =>
                                new ChartOfServicesDto
                                {
                                    Id = x.ScheduledServiceId,
                                    SubCategoryId = x.ServiceSubCategoryId ?? 0,
                                    ItemType = ChartOfServicesItemTypes.ScheduledService,
                                    Code = x.ServiceCode,
                                    Name = x.ServiceName,
                                    Charge = x.CustomerCharge,
                                    StandardMinutes = 0,
                                    IncomeLedger = x.IncomeLedgerCode,
                                    ExpenseLedger = "",
                                    IsConfigured = x.IsConfigured,
                                    Status = x.IsActive
                                }
                        )
        },


        //=======================================================
        // Labor Chart (BLC)
        //=======================================================

        new ServiceSource
        {
            ItemType =
                ChartOfServicesItemTypes.LaborChart,

            SubCategoryType =
                "Labor Chart",

            CodePrefix =
                "BLC",

            Query =
                (db, subCategoryId) =>
                    db.Set<LaborChartEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                (subCategoryId == null || x.ServiceSubCategoryId == subCategoryId)
                        )
                        .Select
                        (
                            x =>
                                new ChartOfServicesDto
                                {
                                    Id = x.LaborChartId,
                                    SubCategoryId = x.ServiceSubCategoryId,
                                    ItemType = ChartOfServicesItemTypes.LaborChart,
                                    Code = x.LaborCode,
                                    Name = x.ServiceName,
                                    Charge = x.ServiceCharge,
                                    StandardMinutes = x.StandardMinutes,
                                    IncomeLedger = x.IncomeLedgerCode,
                                    ExpenseLedger = "",
                                    IsConfigured = true,
                                    Status = x.IsActive
                                }
                        )
        },


        //=======================================================
        // Customized Services (OCS)
        //=======================================================

        new ServiceSource
        {
            ItemType =
                ChartOfServicesItemTypes.CustomizedService,

            SubCategoryType =
                "Customized Services",

            CodePrefix =
                "OCS",

            Query =
                (db, subCategoryId) =>
                    db.Set<CustomizedServicesEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                (subCategoryId == null || x.ServiceSubCategoryId == subCategoryId)
                        )
                        .Select
                        (
                            x =>
                                new ChartOfServicesDto
                                {
                                    Id = x.CustomizedServiceId,
                                    SubCategoryId = x.ServiceSubCategoryId,
                                    ItemType = ChartOfServicesItemTypes.CustomizedService,
                                    Code = x.ServiceCode,
                                    Name = x.ServiceName,
                                    Charge = x.ServiceCharge,
                                    StandardMinutes = x.StandardMinutes,
                                    IncomeLedger = x.IncomeLedgerCode,
                                    ExpenseLedger = "",
                                    IsConfigured = true,
                                    Status = x.IsActive
                                }
                        )
        },


        //=======================================================
        // Membership Services (MSC)
        //
        // Complimentary : billed on the invoice (income ledger),
        // then discounted (expense ledger under SUB-004-002-001).
        //=======================================================

        new ServiceSource
        {
            ItemType =
                ChartOfServicesItemTypes.MembershipService,

            SubCategoryType =
                "Membership Services",

            CodePrefix =
                "MSC",

            Query =
                (db, subCategoryId) =>
                    db.Set<MembershipServicesEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                (subCategoryId == null || x.ServiceSubCategoryId == subCategoryId)
                        )
                        .Select
                        (
                            x =>
                                new ChartOfServicesDto
                                {
                                    Id = x.MembershipServiceId,
                                    SubCategoryId = x.ServiceSubCategoryId,
                                    ItemType = ChartOfServicesItemTypes.MembershipService,
                                    Code = x.ServiceCode,
                                    Name = x.DisplayName,
                                    Charge = x.ServiceValue,
                                    StandardMinutes = 0,
                                    IncomeLedger = x.IncomeLedgerCode,
                                    ExpenseLedger = x.ExpenseLedgerCode,
                                    IsConfigured = true,
                                    Status = x.IsActive
                                }
                        )
        }
    };


    private static ServiceSource? SourceOf
    (
        string itemType
    )
    {
        return ServiceSources.FirstOrDefault
        (
            x =>
                x.ItemType == itemType
        );
    }


    //===========================================================
    // Load Services (one sub category, or all when null)
    //
    // Null strings from older rows become "". Sorted by sub
    // category, then code.
    //===========================================================

    private async Task<List<ChartOfServicesDto>>
        LoadServicesAsync
        (
            long? subCategoryId
        )
    {
        List<ChartOfServicesDto> rows =
            new List<ChartOfServicesDto>();

        foreach
        (
            ServiceSource source
            in ServiceSources
        )
        {
            rows.AddRange(
                await source
                    .Query(
                        _context,
                        subCategoryId)
                    .ToListAsync());
        }

        foreach
        (
            ChartOfServicesDto row
            in rows
        )
        {
            row.Code = row.Code?.Trim() ?? string.Empty;
            row.Name = row.Name?.Trim() ?? string.Empty;
            row.IncomeLedger = row.IncomeLedger?.Trim() ?? string.Empty;
            row.ExpenseLedger = row.ExpenseLedger?.Trim() ?? string.Empty;
        }

        return rows
            .OrderBy(x => x.SubCategoryId)
            .ThenBy(x => x.Code, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }


    //===========================================================
    // Live Structure (categories / sub categories)
    //===========================================================

    private sealed class CategoryRow
    {
        public long Id { get; init; }

        public string Code { get; init; } = string.Empty;

        public string Name { get; init; } = string.Empty;

        public string CategoryType { get; init; } = string.Empty;

        public string IncomeGroupCode { get; init; } = string.Empty;

        public bool Status { get; init; }
    }

    private sealed class SubCategoryRow
    {
        public long Id { get; init; }

        public long CategoryId { get; init; }

        public string Code { get; init; } = string.Empty;

        public string Name { get; init; } = string.Empty;

        public string SubCategoryType { get; init; } = string.Empty;

        public string IncomeSubGroupCode { get; init; } = string.Empty;

        public bool Status { get; init; }
    }


    private async Task<List<CategoryRow>>
        LoadCategoriesAsync()
    {
        List<CategoryRow> rows =
            await _context
                .Set<ServiceCategoryEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select
                (
                    x =>
                        new CategoryRow
                        {
                            Id = x.ServiceCategoryId,
                            Code = x.CategoryCode ?? string.Empty,
                            Name = x.CategoryName ?? string.Empty,
                            CategoryType = x.CategoryType ?? string.Empty,
                            IncomeGroupCode = x.IncomeGroupCode ?? string.Empty,
                            Status = x.IsActive
                        }
                )
                .ToListAsync();

        return rows
            .OrderBy(x => x.Code, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }


    private async Task<List<SubCategoryRow>>
        LoadSubCategoriesAsync()
    {
        List<SubCategoryRow> rows =
            await _context
                .Set<ServiceSubCategoryEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select
                (
                    x =>
                        new SubCategoryRow
                        {
                            Id = x.ServiceSubCategoryId,
                            CategoryId = x.ServiceCategoryId,
                            Code = x.SubCategoryCode ?? string.Empty,
                            Name = x.SubCategoryName ?? string.Empty,
                            SubCategoryType = x.SubCategoryType ?? string.Empty,
                            IncomeSubGroupCode = x.IncomeSubGroupCode ?? string.Empty,
                            Status = x.IsActive
                        }
                )
                .ToListAsync();

        return rows
            .OrderBy(x => x.Code, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }


    //===========================================================
    // Get Tree
    //
    // Type → Category → Sub Category, linked by ID. Service
    // counts per sub category come from every registered source.
    //===========================================================

    public async Task<List<ChartOfServicesTypeDto>>
        GetTreeAsync()
    {
        List<CategoryRow> categories =
            await LoadCategoriesAsync();

        List<SubCategoryRow> subCategories =
            await LoadSubCategoriesAsync();


        //=======================================================
        // Service counts (SubCategoryId + Status only)
        //=======================================================

        Dictionary<long, (int Total, int Active)> counts =
            new Dictionary<long, (int Total, int Active)>();

        foreach
        (
            ServiceSource source
            in ServiceSources
        )
        {
            var rows =
                await source
                    .Query(
                        _context,
                        null)
                    .Select
                    (
                        x =>
                            new
                            {
                                x.SubCategoryId,
                                x.Status
                            }
                    )
                    .ToListAsync();

            foreach
            (
                var row
                in rows
            )
            {
                counts.TryGetValue(
                    row.SubCategoryId,
                    out (int Total, int Active) current);

                counts[row.SubCategoryId] =
                (
                    current.Total + 1,
                    current.Active + (row.Status ? 1 : 0)
                );
            }
        }


        //=======================================================
        // Assemble by ID
        //=======================================================

        ILookup<long, ChartOfServicesSubCategoryDto> subCategoriesByCategory =
            subCategories.ToLookup
            (
                x =>
                    x.CategoryId,
                x =>
                {
                    counts.TryGetValue(
                        x.Id,
                        out (int Total, int Active) count);

                    return new ChartOfServicesSubCategoryDto
                    {
                        Id = x.Id,
                        Code = x.Code,
                        Name = x.Name,
                        SubCategoryType = x.SubCategoryType,
                        Status = x.Status,
                        ServiceCount = count.Total,
                        ActiveServiceCount = count.Active
                    };
                }
            );

        ILookup<long, ChartOfServicesCategoryDto> categoriesByType =
            categories
                .Where(x => TypeOf(x.CategoryType) != null)
                .ToLookup
                (
                    x =>
                        TypeOf(x.CategoryType)!.Id,
                    x =>
                        new ChartOfServicesCategoryDto
                        {
                            Id = x.Id,
                            Code = x.Code,
                            Name = x.Name,
                            Status = x.Status,
                            SubCategories = subCategoriesByCategory[x.Id].ToList()
                        }
                );

        return Types
            .Select
            (
                x =>
                    new ChartOfServicesTypeDto
                    {
                        Id = x.Id,
                        Code = x.Code,
                        Name = x.Name,
                        CategoryType = x.Name,
                        Status = true,
                        Categories = categoriesByType[x.Id].ToList()
                    }
            )
            .ToList();
    }


    //===========================================================
    // Get Sub Category Services
    //===========================================================

    public async Task<List<ChartOfServicesDto>>
        GetSubCategoryServicesAsync
        (
            long subCategoryId
        )
    {
        return await LoadServicesAsync(
            subCategoryId);
    }


    //===========================================================
    // Get All Services (printing)
    //===========================================================

    public async Task<List<ChartOfServicesDto>>
        GetAllServicesAsync()
    {
        return await LoadServicesAsync(
            null);
    }


    //===========================================================
    // Code Helpers
    //
    // "MSS-001-002-00003" → prefix "MSS",
    //                       numbers ["001","002","00003"].
    //===========================================================

    private static string Prefix
    (
        string? code
    )
    {
        return (code ?? string.Empty)
            .Trim()
            .Split('-')[0]
            .Trim()
            .ToUpperInvariant();
    }


    private static string[] NumberParts
    (
        string? code
    )
    {
        string[] parts =
            (code ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries)
                .Select
                (
                    x =>
                        x.Trim()
                )
                .ToArray();

        return parts.Length > 1
            ? parts.Skip(1).ToArray()
            : Array.Empty<string>();
    }


    // True when the child's leading number parts equal the
    // parent's and it has exactly one more part.
    //   BRS-001-002 under BRS-001          (same prefix)
    //   MSS-001-002-00001 under BRS-001-002 (item prefix differs)
    // childPrefix = null → the child must use the parent's prefix.
    private static bool CodeFollowsParent
    (
        string? parentCode,
        string? childCode,
        string? childPrefix = null
    )
    {
        string expectedPrefix =
            string.IsNullOrWhiteSpace(childPrefix)
                ? Prefix(parentCode)
                : childPrefix.Trim().ToUpperInvariant();

        if
        (
            Prefix(childCode) != expectedPrefix
        )
        {
            return false;
        }

        string[] parent =
            NumberParts(parentCode);

        string[] child =
            NumberParts(childCode);

        if
        (
            parent.Length == 0
            ||
            child.Length != parent.Length + 1
        )
        {
            return false;
        }

        for
        (
            int i = 0;
            i < parent.Length;
            i++
        )
        {
            if
            (
                !int.TryParse(parent[i], out int p)
                ||
                !int.TryParse(child[i], out int c)
                ||
                p != c
            )
            {
                return false;
            }
        }

        return true;
    }


    //===========================================================
    // Get Issues (link check)
    //
    // Categories     : unknown Category Type, code prefix ≠ type,
    //                  income account group missing
    // Sub Categories : category missing / deleted, code ≠ category
    //                  numbers, Sub Category Type not allowed for
    //                  the Category Type, income sub group missing
    // Services       : sub category missing / deleted, service
    //                  under a sub category of another type, code ≠
    //                  sub category numbers, income (and membership
    //                  expense) ledger missing, scheduled service
    //                  not priced yet
    //===========================================================

    public async Task<List<ChartOfServicesIssueDto>>
        GetIssuesAsync()
    {
        List<ChartOfServicesIssueDto> issues =
            new List<ChartOfServicesIssueDto>();

        Dictionary<long, CategoryRow> categories =
            (await LoadCategoriesAsync())
                .ToDictionary(x => x.Id);

        List<SubCategoryRow> subCategoryList =
            await LoadSubCategoriesAsync();

        Dictionary<long, SubCategoryRow> subCategories =
            subCategoryList
                .ToDictionary(x => x.Id);


        //=======================================================
        // Live account codes (groups / sub groups / ledgers)
        //=======================================================

        HashSet<string> groupCodes =
            (
                await _context
                    .Set<AccountGroupEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted)
                    .Select(x => x.GroupCode)
                    .ToListAsync()
            )
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        HashSet<string> subGroupCodes =
            (
                await _context
                    .Set<AccountSubGroupEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted)
                    .Select(x => x.SubGroupCode)
                    .ToListAsync()
            )
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        HashSet<string> ledgerCodes =
            (
                await _context
                    .Set<GeneralLedgersEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted)
                    .Select(x => x.LedgerCode)
                    .ToListAsync()
            )
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);


        // "INC-002-001" missing from the set → "Income (INC-002-001)"
        static List<string> Missing
        (
            HashSet<string> live,
            params (string Label, string Code)[] codes
        )
        {
            return codes
                .Where
                (
                    x =>
                        string.IsNullOrWhiteSpace(x.Code)
                        ||
                        !live.Contains(x.Code.Trim())
                )
                .Select
                (
                    x =>
                        string.IsNullOrWhiteSpace(x.Code)
                            ? $"{x.Label} (not set)"
                            : $"{x.Label} ({x.Code})"
                )
                .ToList();
        }


        //=======================================================
        // Categories
        //=======================================================

        foreach
        (
            CategoryRow cat
            in categories.Values
        )
        {
            TypeDef? type =
                TypeOf(
                    cat.CategoryType);

            if
            (
                type == null
            )
            {
                issues.Add(
                    Issue(
                        "Category",
                        cat.Id,
                        cat.Code,
                        cat.Name,
                        $"Category Type '{cat.CategoryType}' is not Brand Services or Differential Services, so it is not shown in the tree."));

                continue;
            }

            if
            (
                Prefix(cat.Code) != type.Code
            )
            {
                issues.Add(
                    Issue(
                        "Category",
                        cat.Id,
                        cat.Code,
                        cat.Name,
                        $"Code does not start with {type.Code} ({type.Name})."));
            }

            List<string> missingGroups =
                Missing(
                    groupCodes,
                    ("Income", cat.IncomeGroupCode));

            if
            (
                missingGroups.Count > 0
            )
            {
                issues.Add(
                    Issue(
                        "Category",
                        cat.Id,
                        cat.Code,
                        cat.Name,
                        $"Account group missing or deleted : {string.Join(", ", missingGroups)}."));
            }
        }


        //=======================================================
        // Sub Categories
        //=======================================================

        foreach
        (
            SubCategoryRow sub
            in subCategoryList
        )
        {
            if
            (
                !categories.TryGetValue(
                    sub.CategoryId,
                    out CategoryRow? cat)
            )
            {
                issues.Add(
                    Issue(
                        "Sub Category",
                        sub.Id,
                        sub.Code,
                        sub.Name,
                        "Its Service Category is missing or deleted, so it is not shown in the tree."));

                continue;
            }

            if
            (
                !CodeFollowsParent(
                    cat.Code,
                    sub.Code)
            )
            {
                issues.Add(
                    Issue(
                        "Sub Category",
                        sub.Id,
                        sub.Code,
                        sub.Name,
                        $"Code does not follow its category {cat.Code}."));
            }

            if
            (
                TypeOf(cat.CategoryType) is TypeDef type
                &&
                !type.SubCategoryTypes.Contains(
                    sub.SubCategoryType,
                    StringComparer.OrdinalIgnoreCase)
            )
            {
                issues.Add(
                    Issue(
                        "Sub Category",
                        sub.Id,
                        sub.Code,
                        sub.Name,
                        $"Sub Category Type '{sub.SubCategoryType}' is not allowed under {type.Name} ({string.Join(" / ", type.SubCategoryTypes)})."));
            }

            List<string> missingSubGroups =
                Missing(
                    subGroupCodes,
                    ("Income", sub.IncomeSubGroupCode));

            if
            (
                missingSubGroups.Count > 0
            )
            {
                issues.Add(
                    Issue(
                        "Sub Category",
                        sub.Id,
                        sub.Code,
                        sub.Name,
                        $"Account sub group missing or deleted : {string.Join(", ", missingSubGroups)}."));
            }
        }


        //=======================================================
        // Scheduled Services not linked yet (no sub category :
        // created by the Service Policy page, not priced yet)
        //=======================================================

        var pending =
            await _context
                .Set<ScheduledServicesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.ServiceSubCategoryId == null
                )
                .Select
                (
                    x =>
                        new
                        {
                            x.ScheduledServiceId,
                            x.ServiceCode,
                            x.ServiceName
                        }
                )
                .ToListAsync();

        foreach
        (
            var row
            in pending
                .OrderBy(x => x.ServiceName, StringComparer.OrdinalIgnoreCase)
        )
        {
            issues.Add(
                Issue(
                    $"Service ({ChartOfServicesItemTypes.ScheduledService})",
                    row.ScheduledServiceId,
                    row.ServiceCode ?? string.Empty,
                    row.ServiceName ?? string.Empty,
                    "Not configured yet (no sub category, price or ledger) on the Scheduled Services page, so it is not shown in the tree and cannot be invoiced."));
        }


        //=======================================================
        // Services (every registered source)
        //=======================================================

        foreach
        (
            ChartOfServicesDto service
            in await LoadServicesAsync(null)
        )
        {
            string level =
                $"Service ({service.ItemType})";

            ServiceSource? source =
                SourceOf(
                    service.ItemType);

            if
            (
                !subCategories.TryGetValue(
                    service.SubCategoryId,
                    out SubCategoryRow? sub)
            )
            {
                issues.Add(
                    Issue(
                        level,
                        service.Id,
                        service.Code,
                        service.Name,
                        "Its Service Sub Category is missing or deleted, so it is not shown in the tree."));

                continue;
            }

            if
            (
                !service.IsConfigured
            )
            {
                issues.Add(
                    Issue(
                        level,
                        service.Id,
                        service.Code,
                        service.Name,
                        "Not configured yet on the Scheduled Services page, so it cannot be invoiced."));
            }

            if
            (
                source != null
                &&
                !string.Equals(
                    source.SubCategoryType,
                    sub.SubCategoryType,
                    StringComparison.OrdinalIgnoreCase)
            )
            {
                issues.Add(
                    Issue(
                        level,
                        service.Id,
                        service.Code,
                        service.Name,
                        $"A {service.ItemType} under {sub.Code}, a '{sub.SubCategoryType}' sub category."));
            }

            if
            (
                source != null
                &&
                !string.IsNullOrWhiteSpace(service.Code)
                &&
                !CodeFollowsParent(
                    sub.Code,
                    service.Code,
                    source.CodePrefix)
            )
            {
                issues.Add(
                    Issue(
                        level,
                        service.Id,
                        service.Code,
                        service.Name,
                        $"Code does not follow its sub category {sub.Code} ({source.CodePrefix}-{string.Join("-", NumberParts(sub.Code))}-nnnnn)."));
            }

            if
            (
                string.IsNullOrWhiteSpace(service.Code)
                &&
                service.IsConfigured
            )
            {
                issues.Add(
                    Issue(
                        level,
                        service.Id,
                        service.Code,
                        service.Name,
                        "Service code is not set."));
            }

            List<(string Label, string Code)> ledgers =
                new List<(string Label, string Code)>
                {
                    ("Income", service.IncomeLedger)
                };

            if
            (
                service.ItemType == ChartOfServicesItemTypes.MembershipService
            )
            {
                ledgers.Add(
                    ("Expense", service.ExpenseLedger));
            }

            List<string> missingLedgers =
                service.IsConfigured
                    ? Missing(
                        ledgerCodes,
                        ledgers.ToArray())
                    : new List<string>();

            if
            (
                missingLedgers.Count > 0
            )
            {
                issues.Add(
                    Issue(
                        level,
                        service.Id,
                        service.Code,
                        service.Name,
                        $"General ledger missing or deleted : {string.Join(", ", missingLedgers)}."));
            }
        }


        return issues;
    }


    private static ChartOfServicesIssueDto Issue
    (
        string level,
        long id,
        string code,
        string name,
        string problem
    )
    {
        return new ChartOfServicesIssueDto
        {
            Level = level,
            Id = id,
            Code = code ?? string.Empty,
            Name = name ?? string.Empty,
            Problem = problem
        };
    }


    //===========================================================
    // Sub Category Exists
    //===========================================================

    public async Task<bool>
        SubCategoryExistsAsync
        (
            long subCategoryId
        )
    {
        return await _context
            .Set<ServiceSubCategoryEntity>()
            .AnyAsync
            (
                x =>
                    x.ServiceSubCategoryId == subCategoryId
                    &&
                    !x.IsDeleted
            );
    }
}