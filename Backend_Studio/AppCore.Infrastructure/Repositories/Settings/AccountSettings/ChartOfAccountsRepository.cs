//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.ChartOfAccounts.DTOs;

using AccountClassEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountClass;

using AccountGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using GeneralLedgersEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using CashAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.CashAccounts;

using BankAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.BankAccounts;

using MFSAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.MFSAccounts;

using POSAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.POSAccounts;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.AccountSettings;


//===============================================================
// Chart of Accounts Repository (read-only)
//
// The page owns no data. Every call reads the live tables, so
// whatever is added, renamed, moved, deactivated or deleted on
// the Account Class / Group / Sub Group / General Ledger / Cash /
// Bank / MFS / POS pages shows up on the next load.
//
// Tree    : Class → Group → Sub Group, linked by ID only.
// Ledgers : every ledger table is registered ONCE in
//           LedgerSources below. Counts, ledger lists, printing
//           and link checks all read from that single list, so a
//           new ledger table (e.g. product ledgers) is one entry.
// Issues  : GetIssuesAsync reports broken links instead of
//           hiding them (missing / deleted parents, a code that
//           does not match its parent, a sub group whose class
//           differs from its group's class).
//
// Ledger  : the name shown for Cash / Bank / MFS accounts is
// name      their Display Name (the account name only when no
//           Display Name is set). POS uses its POS Account Name,
//           General Ledgers their Ledger Name.
//
// Deleted records are never shown. Nothing is written.
//===============================================================

public class ChartOfAccountsRepository : IChartOfAccountsRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public ChartOfAccountsRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Class Type Order
    //
    // Classes are listed Account first, then the inventory
    // family, each by code. Unknown types go last.
    //===========================================================

    private static readonly string[] ClassTypeOrder =
    {
        "Account",
        "Inventory",
        "Work In Progress",
        "Cost of Goods Sold"
    };

    private static int ClassTypeRank
    (
        string? classType
    )
    {
        int index =
            Array.FindIndex(
                ClassTypeOrder,
                x =>
                    string.Equals(
                        x,
                        classType?.Trim(),
                        StringComparison.OrdinalIgnoreCase));

        return index < 0
            ? ClassTypeOrder.Length
            : index;
    }


    //===========================================================
    // Ledger Sources (THE ONLY PLACE LEDGER TABLES ARE LISTED)
    //
    // Each source returns its non-deleted rows in one shape.
    // subGroupId = null → all rows of that table.
    //===========================================================

    private sealed class LedgerSource
    {
        public string Type { get; init; } = string.Empty;

        public Func<AppDbContext, long?, IQueryable<ChartOfAccountsDto>> Query { get; init; } =
            (_, _) => Enumerable.Empty<ChartOfAccountsDto>().AsQueryable();
    }


    private static readonly LedgerSource[] LedgerSources =
    {
        //=======================================================
        // General Ledgers (GLR-)
        //=======================================================

        new LedgerSource
        {
            Type =
                ChartOfAccountsLedgerTypes.GeneralLedger,

            Query =
                (db, subGroupId) =>
                    db.Set<GeneralLedgersEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                (subGroupId == null || x.AccountSubGroupId == subGroupId)
                        )
                        .Select
                        (
                            x =>
                                new ChartOfAccountsDto
                                {
                                    Id = x.GeneralLedgerId,
                                    SubGroupId = x.AccountSubGroupId,
                                    Code = x.LedgerCode,
                                    Name = x.LedgerName,
                                    Type = ChartOfAccountsLedgerTypes.GeneralLedger,
                                    Branch = string.Empty,
                                    Status = x.IsActive
                                }
                        )
        },


        //=======================================================
        // Cash Accounts (CSH-)
        //=======================================================

        new LedgerSource
        {
            Type =
                ChartOfAccountsLedgerTypes.Cash,

            Query =
                (db, subGroupId) =>
                    db.Set<CashAccountsEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                (subGroupId == null || x.AccountSubGroupsId == subGroupId)
                        )
                        .Select
                        (
                            x =>
                                new ChartOfAccountsDto
                                {
                                    Id = x.CashAccountId,
                                    SubGroupId = x.AccountSubGroupsId,
                                    Code = x.CashAccountCode,
                                    // Display Name is the ledger name (falls back to the account name)
                                    Name = x.DisplayName != null && x.DisplayName != ""
                                        ? x.DisplayName
                                        : x.CashAccountName,
                                    Type = ChartOfAccountsLedgerTypes.Cash,
                                    Branch = x.Branch,
                                    Status = x.Status
                                }
                        )
        },


        //=======================================================
        // Bank Accounts (BNK-)
        //=======================================================

        new LedgerSource
        {
            Type =
                ChartOfAccountsLedgerTypes.Bank,

            Query =
                (db, subGroupId) =>
                    db.Set<BankAccountsEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                (subGroupId == null || x.AccountSubGroupsId == subGroupId)
                        )
                        .Select
                        (
                            x =>
                                new ChartOfAccountsDto
                                {
                                    Id = x.BankAccountId,
                                    SubGroupId = x.AccountSubGroupsId,
                                    Code = x.BankAccountCode,
                                    // Display Name is the ledger name (falls back to the account name)
                                    Name = x.DisplayName != null && x.DisplayName != ""
                                        ? x.DisplayName
                                        : x.BankAccountName,
                                    Type = ChartOfAccountsLedgerTypes.Bank,
                                    Branch = x.Branch,
                                    Status = x.Status
                                }
                        )
        },


        //=======================================================
        // MFS Accounts (MFS-)
        //=======================================================

        new LedgerSource
        {
            Type =
                ChartOfAccountsLedgerTypes.MFS,

            Query =
                (db, subGroupId) =>
                    db.Set<MFSAccountsEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                (subGroupId == null || x.AccountSubGroupsId == subGroupId)
                        )
                        .Select
                        (
                            x =>
                                new ChartOfAccountsDto
                                {
                                    Id = x.MFSAccountId,
                                    SubGroupId = x.AccountSubGroupsId,
                                    Code = x.MFSAccountCode,
                                    // Display Name is the ledger name (falls back to the account name)
                                    Name = x.DisplayName != null && x.DisplayName != ""
                                        ? x.DisplayName
                                        : x.MFSAccountName,
                                    Type = ChartOfAccountsLedgerTypes.MFS,
                                    Branch = x.Branch,
                                    Status = x.Status
                                }
                        )
        },


        //=======================================================
        // POS Accounts (POS-)
        //=======================================================

        new LedgerSource
        {
            Type =
                ChartOfAccountsLedgerTypes.POS,

            Query =
                (db, subGroupId) =>
                    db.Set<POSAccountsEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                (subGroupId == null || x.AccountSubGroupsId == subGroupId)
                        )
                        .Select
                        (
                            x =>
                                new ChartOfAccountsDto
                                {
                                    Id = x.POSAccountId,
                                    SubGroupId = x.AccountSubGroupsId,
                                    Code = x.POSAccountCode,
                                    // POS has no separate Display Name; its name is the ledger name
                                    Name = x.POSAccountName,
                                    Type = ChartOfAccountsLedgerTypes.POS,
                                    Branch = x.Branch,
                                    Status = x.Status
                                }
                        )
        }

        // To add a ledger table : one more LedgerSource here.
    };


    //===========================================================
    // Load Ledgers (one sub group, or all when null)
    //
    // Sorted by sub group, then code.
    //===========================================================

    private async Task<List<ChartOfAccountsDto>>
        LoadLedgersAsync
        (
            long? subGroupId
        )
    {
        List<ChartOfAccountsDto> rows =
            new List<ChartOfAccountsDto>();

        foreach
        (
            LedgerSource source
            in LedgerSources
        )
        {
            rows.AddRange(
                await source
                    .Query(
                        _context,
                        subGroupId)
                    .ToListAsync());
        }

        return rows
            .OrderBy(x => x.SubGroupId)
            .ThenBy(x => x.Code, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }


    //===========================================================
    // Live Structure (classes / groups / sub groups)
    //===========================================================

    private sealed class ClassRow
    {
        public long Id { get; init; }

        public string Code { get; init; } = string.Empty;

        public string Name { get; init; } = string.Empty;

        public string ClassType { get; init; } = string.Empty;

        public bool Status { get; init; }
    }

    private sealed class GroupRow
    {
        public long Id { get; init; }

        public long ClassId { get; init; }

        public string Code { get; init; } = string.Empty;

        public string Name { get; init; } = string.Empty;

        public bool Status { get; init; }
    }

    private sealed class SubGroupRow
    {
        public long Id { get; init; }

        public long GroupId { get; init; }

        public long ClassId { get; init; }

        public string Code { get; init; } = string.Empty;

        public string Name { get; init; } = string.Empty;

        public bool Status { get; init; }
    }


    private async Task<List<ClassRow>>
        LoadClassesAsync()
    {
        List<ClassRow> rows =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select
                (
                    x =>
                        new ClassRow
                        {
                            Id = x.AccountClassId,
                            Code = x.ClassCode ?? string.Empty,
                            Name = x.ClassName ?? string.Empty,
                            ClassType = x.ClassType ?? string.Empty,
                            Status = x.IsActive
                        }
                )
                .ToListAsync();

        return rows
            .OrderBy(x => ClassTypeRank(x.ClassType))
            .ThenBy(x => x.Code, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }


    private async Task<List<GroupRow>>
        LoadGroupsAsync()
    {
        List<GroupRow> rows =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select
                (
                    x =>
                        new GroupRow
                        {
                            Id = x.AccountGroupId,
                            ClassId = x.AccountClassId,
                            Code = x.GroupCode ?? string.Empty,
                            Name = x.GroupName ?? string.Empty,
                            Status = x.IsActive
                        }
                )
                .ToListAsync();

        return rows
            .OrderBy(x => x.Code, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }


    private async Task<List<SubGroupRow>>
        LoadSubGroupsAsync()
    {
        List<SubGroupRow> rows =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select
                (
                    x =>
                        new SubGroupRow
                        {
                            Id = x.AccountSubGroupId,
                            GroupId = x.AccountGroupId,
                            ClassId = x.AccountClassId,
                            Code = x.SubGroupCode ?? string.Empty,
                            Name = x.SubGroupName ?? string.Empty,
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
    // Class → Group → Sub Group, linked by ID. Ledger counts per
    // sub group come from every registered ledger source.
    //===========================================================

    public async Task<List<ChartOfAccountsClassDto>>
        GetTreeAsync()
    {
        List<ClassRow> classes =
            await LoadClassesAsync();

        List<GroupRow> groups =
            await LoadGroupsAsync();

        List<SubGroupRow> subGroups =
            await LoadSubGroupsAsync();


        //=======================================================
        // Ledger counts (SubGroupId + Status only)
        //=======================================================

        Dictionary<long, (int Total, int Active)> counts =
            new Dictionary<long, (int Total, int Active)>();

        foreach
        (
            LedgerSource source
            in LedgerSources
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
                                x.SubGroupId,
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
                    row.SubGroupId,
                    out (int Total, int Active) current);

                counts[row.SubGroupId] =
                (
                    current.Total + 1,
                    current.Active + (row.Status ? 1 : 0)
                );
            }
        }


        //=======================================================
        // Assemble by ID
        //=======================================================

        ILookup<long, ChartOfAccountsSubGroupDto> subGroupsByGroup =
            subGroups.ToLookup
            (
                x =>
                    x.GroupId,
                x =>
                {
                    counts.TryGetValue(
                        x.Id,
                        out (int Total, int Active) count);

                    return new ChartOfAccountsSubGroupDto
                    {
                        Id = x.Id,
                        Code = x.Code,
                        Name = x.Name,
                        Status = x.Status,
                        LedgerCount = count.Total,
                        ActiveLedgerCount = count.Active
                    };
                }
            );

        ILookup<long, ChartOfAccountsGroupDto> groupsByClass =
            groups.ToLookup
            (
                x =>
                    x.ClassId,
                x =>
                    new ChartOfAccountsGroupDto
                    {
                        Id = x.Id,
                        Code = x.Code,
                        Name = x.Name,
                        Status = x.Status,
                        SubGroups = subGroupsByGroup[x.Id].ToList()
                    }
            );

        return classes
            .Select
            (
                x =>
                    new ChartOfAccountsClassDto
                    {
                        Id = x.Id,
                        Code = x.Code,
                        Name = x.Name,
                        ClassType = x.ClassType,
                        Status = x.Status,
                        Groups = groupsByClass[x.Id].ToList()
                    }
            )
            .ToList();
    }


    //===========================================================
    // Get Sub Group Ledgers
    //===========================================================

    public async Task<List<ChartOfAccountsDto>>
        GetSubGroupLedgersAsync
        (
            long subGroupId
        )
    {
        return await LoadLedgersAsync(
            subGroupId);
    }


    //===========================================================
    // Get All Ledgers (printing)
    //===========================================================

    public async Task<List<ChartOfAccountsDto>>
        GetAllLedgersAsync()
    {
        return await LoadLedgersAsync(
            null);
    }


    //===========================================================
    // Code Helpers
    //
    // "SUB-002-002-003" → ["002","002","003"] (number parts).
    //===========================================================

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


    // True when child's leading number parts equal the parent's
    // number parts (e.g. GRP-001-002 under CLS-001).
    private static bool CodeFollowsParent
    (
        string? parentCode,
        string? childCode
    )
    {
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
    // Groups      : class missing / deleted, code ≠ class number
    // Sub Groups  : group missing / deleted, class ≠ group's
    //               class, code ≠ group numbers
    // Ledgers     : sub group missing / deleted, code ≠ sub group
    //               numbers
    //===========================================================

    public async Task<List<ChartOfAccountsIssueDto>>
        GetIssuesAsync()
    {
        List<ChartOfAccountsIssueDto> issues =
            new List<ChartOfAccountsIssueDto>();

        Dictionary<long, ClassRow> classes =
            (await LoadClassesAsync())
                .ToDictionary(x => x.Id);

        Dictionary<long, GroupRow> groups =
            (await LoadGroupsAsync())
                .ToDictionary(x => x.Id);

        List<SubGroupRow> subGroupList =
            await LoadSubGroupsAsync();

        Dictionary<long, SubGroupRow> subGroups =
            subGroupList
                .ToDictionary(x => x.Id);


        //=======================================================
        // Groups
        //=======================================================

        foreach
        (
            GroupRow grp
            in groups.Values
        )
        {
            if
            (
                !classes.TryGetValue(
                    grp.ClassId,
                    out ClassRow? cls)
            )
            {
                issues.Add(
                    Issue(
                        "Group",
                        grp.Id,
                        grp.Code,
                        grp.Name,
                        "Its Account Class is missing or deleted, so it is not shown in the tree."));

                continue;
            }

            if
            (
                !CodeFollowsParent(
                    cls.Code,
                    grp.Code)
            )
            {
                issues.Add(
                    Issue(
                        "Group",
                        grp.Id,
                        grp.Code,
                        grp.Name,
                        $"Code does not follow its class {cls.Code}."));
            }
        }


        //=======================================================
        // Sub Groups
        //=======================================================

        foreach
        (
            SubGroupRow sub
            in subGroupList
        )
        {
            if
            (
                !groups.TryGetValue(
                    sub.GroupId,
                    out GroupRow? grp)
            )
            {
                issues.Add(
                    Issue(
                        "Sub Group",
                        sub.Id,
                        sub.Code,
                        sub.Name,
                        "Its Account Group is missing or deleted, so it is not shown in the tree."));

                continue;
            }

            if
            (
                sub.ClassId != grp.ClassId
            )
            {
                string groupClass =
                    classes.TryGetValue(grp.ClassId, out ClassRow? gc)
                        ? gc.Code
                        : grp.ClassId.ToString();

                string ownClass =
                    classes.TryGetValue(sub.ClassId, out ClassRow? oc)
                        ? oc.Code
                        : sub.ClassId.ToString();

                issues.Add(
                    Issue(
                        "Sub Group",
                        sub.Id,
                        sub.Code,
                        sub.Name,
                        $"Saved under class {ownClass}, but its group {grp.Code} belongs to class {groupClass}."));
            }

            if
            (
                !CodeFollowsParent(
                    grp.Code,
                    sub.Code)
            )
            {
                issues.Add(
                    Issue(
                        "Sub Group",
                        sub.Id,
                        sub.Code,
                        sub.Name,
                        $"Code does not follow its group {grp.Code}."));
            }
        }


        //=======================================================
        // Ledgers (every registered source)
        //=======================================================

        foreach
        (
            ChartOfAccountsDto ledger
            in await LoadLedgersAsync(null)
        )
        {
            string level =
                $"Ledger ({ledger.Type})";

            if
            (
                !subGroups.TryGetValue(
                    ledger.SubGroupId,
                    out SubGroupRow? sub)
            )
            {
                issues.Add(
                    Issue(
                        level,
                        ledger.Id,
                        ledger.Code,
                        ledger.Name,
                        "Its Account Sub Group is missing or deleted, so it is not shown in the tree."));

                continue;
            }

            if
            (
                !CodeFollowsParent(
                    sub.Code,
                    ledger.Code)
            )
            {
                issues.Add(
                    Issue(
                        level,
                        ledger.Id,
                        ledger.Code,
                        ledger.Name,
                        $"Code does not follow its sub group {sub.Code} ({sub.Name})."));
            }
        }


        return issues;
    }


    private static ChartOfAccountsIssueDto Issue
    (
        string level,
        long id,
        string code,
        string name,
        string problem
    )
    {
        return new ChartOfAccountsIssueDto
        {
            Level = level,
            Id = id,
            Code = code ?? string.Empty,
            Name = name ?? string.Empty,
            Problem = problem
        };
    }


    //===========================================================
    // Sub Group Exists
    //===========================================================

    public async Task<bool>
        SubGroupExistsAsync
        (
            long subGroupId
        )
    {
        return await _context
            .Set<AccountSubGroupEntity>()
            .AnyAsync
            (
                x =>
                    x.AccountSubGroupId == subGroupId
                    &&
                    !x.IsDeleted
            );
    }
}