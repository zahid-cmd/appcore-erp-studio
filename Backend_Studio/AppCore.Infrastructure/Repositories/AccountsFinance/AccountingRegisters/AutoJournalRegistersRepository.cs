//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using System.Text.RegularExpressions;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.AccountsFinance.AccountingRegisters;
using AppCore.Infrastructure.Persistence;

using VoucherEntriesEntity =
    AppCore.Domain.Platform.Accounting.VoucherEntries;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using SupplierProfilesEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.SupplierProfiles;

using CustomerProfilesEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.CustomerProfiles;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.AccountsFinance.AccountingRegisters;


//===============================================================
// Auto Journal Registers repository (read only)
//
// Journals : VoucherEntries (every posted line). A journal is one
// voucher number; its reversing lines (IsReversal) belong to it.
// A journal is in a period when any of its lines (original or
// reversal) is dated in it.
//
// Page of a journal : AutoJournalSources (SQL table, read with
// raw SQL; no entity)
//   VoucherType → NavigationSubmenuCode
//   SourceTable (optional) : when several pages post the same
//   type (RRV), the page whose table holds the voucher number.
// Not linked → "Other". IsAutoJournal = false → left out.
//===============================================================

public class AutoJournalRegistersRepository
    : IAutoJournalRegistersRepository
{
    private readonly AppDbContext _context;


    //===========================================================
    // Constants
    //===========================================================

    public const string OtherNode = "OTHER";

    private const string OtherName = "Other";

    private const string DateFormat = "yyyy-MM-dd";

    private const string PartySupplier = "Supplier";

    private const string PartyCustomer = "Customer";

    // Journals sent per load (the rest : narrow the period)
    private const int MaxJournals = 300;

    private static readonly Regex TableName =
        new("^[A-Za-z_][A-Za-z0-9_]{0,99}$", RegexOptions.Compiled);


    public AutoJournalRegistersRepository(
        AppDbContext context)
    {
        _context = context;
    }


    //===========================================================
    // Inner rows
    //===========================================================

    // One row of AutoJournalSources (column names = properties)
    private sealed class SourceRow
    {
        public string VoucherType { get; set; } = string.Empty;

        public string SourceTable { get; set; } = string.Empty;

        public string NavigationSubmenuCode { get; set; } = string.Empty;

        public bool IsAutoJournal { get; set; }

        public int DisplayOrder { get; set; }
    }


    // A submenu with its menu and module
    private sealed class PageRow
    {
        public string SubmenuCode { get; set; } = string.Empty;

        public string SubmenuName { get; set; } = string.Empty;

        public string SubmenuIcon { get; set; } = string.Empty;

        public int SubmenuOrder { get; set; }

        public string MenuCode { get; set; } = string.Empty;

        public string MenuName { get; set; } = string.Empty;

        public string MenuIcon { get; set; } = string.Empty;

        public int MenuOrder { get; set; }

        public string ModuleCode { get; set; } = string.Empty;

        public string ModuleName { get; set; } = string.Empty;

        public string ModuleIcon { get; set; } = string.Empty;

        public int ModuleOrder { get; set; }
    }


    // One journal in the period
    private sealed class HeadRow
    {
        public string VoucherType { get; set; } = string.Empty;

        public string VoucherNo { get; set; } = string.Empty;

        public DateOnly FirstDate { get; set; }

        // Submenu code of its page ("" = Other)
        public string Page { get; set; } = string.Empty;
    }


    // Sources, pages and the journals of a period
    private sealed class Scope
    {
        public DateOnly From { get; set; }

        public DateOnly To { get; set; }

        public long BranchId { get; set; }

        public List<SourceRow> Sources { get; set; } = new();

        public Dictionary<string, PageRow> Pages { get; set; } = new();

        public List<HeadRow> Heads { get; set; } = new();
    }


    //===========================================================
    // Helpers
    //===========================================================

    private static DateOnly Today() =>
        DateOnly.FromDateTime(DateTime.UtcNow.AddHours(6));


    private static string DateText(DateOnly date) =>
        date.ToString(DateFormat, CultureInfo.InvariantCulture);


    private static DateOnly? ParseDate(string? text) =>
        DateOnly.TryParseExact(
            (text ?? string.Empty).Trim(),
            DateFormat,
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out DateOnly date)
            ? date
            : null;


    private static decimal Money(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);


    private static string Key(string type, string no) =>
        $"{type}\u001f{no}";


    // Period : empty = this month; From after To = swapped
    private static (DateOnly From, DateOnly To) Period
    (
        string? from,
        string? to
    )
    {
        DateOnly today =
            Today();

        DateOnly start =
            ParseDate(from)
            ?? new DateOnly(today.Year, today.Month, 1);

        DateOnly end =
            ParseDate(to)
            ?? new DateOnly(today.Year, today.Month, DateTime.DaysInMonth(today.Year, today.Month));

        return start <= end
            ? (start, end)
            : (end, start);
    }


    //===========================================================
    // Sources (AutoJournalSources)
    //===========================================================

    private async Task<bool> TableExistsAsync
    (
        string table
    )
    {
        return await _context.Database
            .SqlQueryRaw<bool>(
                "SELECT to_regclass({0}) IS NOT NULL AS \"Value\"",
                $"public.\"{table}\"")
            .FirstAsync();
    }


    private async Task<List<SourceRow>> LoadSourcesAsync()
    {
        if
        (
            !await TableExistsAsync("AutoJournalSources")
        )
        {
            throw new InvalidOperationException(
                "Journal sources are not set up. Run Database\\AutoJournalRegisters_Sources.sql.");
        }

        List<SourceRow> rows =
            await _context.Database
                .SqlQueryRaw<SourceRow>(
                    "SELECT \"VoucherType\", \"SourceTable\", \"NavigationSubmenuCode\", \"IsAutoJournal\", \"DisplayOrder\" " +
                    "FROM public.\"AutoJournalSources\"")
                .ToListAsync();

        foreach (SourceRow row in rows)
        {
            row.VoucherType = (row.VoucherType ?? string.Empty).Trim();
            row.SourceTable = (row.SourceTable ?? string.Empty).Trim();
            row.NavigationSubmenuCode = (row.NavigationSubmenuCode ?? string.Empty).Trim();
        }

        return rows
            .OrderBy(x => x.DisplayOrder)
            .ThenBy(x => x.VoucherType)
            .ToList();
    }


    //===========================================================
    // Pages (Navigation) of the linked submenus
    //===========================================================

    private async Task<Dictionary<string, PageRow>> LoadPagesAsync
    (
        List<SourceRow> sources
    )
    {
        List<string> codes =
            sources
                .Where(x => x.IsAutoJournal && x.NavigationSubmenuCode.Length > 0)
                .Select(x => x.NavigationSubmenuCode)
                .Distinct()
                .ToList();

        if
        (
            codes.Count == 0
        )
        {
            return new Dictionary<string, PageRow>();
        }

        List<PageRow> rows =
            await _context.NavigationSubmenus
                .AsNoTracking()
                .Where
                (
                    x =>
                        codes.Contains(x.Code)
                        &&
                        !x.IsDeleted
                        &&
                        !x.Menu.IsDeleted
                        &&
                        !x.Menu.NavigationModule.IsDeleted
                )
                .Select
                (
                    x =>
                        new PageRow
                        {
                            SubmenuCode = x.Code,
                            SubmenuName = x.Name,
                            SubmenuIcon = x.Icon ?? string.Empty,
                            SubmenuOrder = x.DisplayOrder,
                            MenuCode = x.Menu.Code,
                            MenuName = x.Menu.Name,
                            MenuIcon = x.Menu.Icon ?? string.Empty,
                            MenuOrder = x.Menu.DisplayOrder,
                            ModuleCode = x.Menu.NavigationModule.Code,
                            ModuleName = x.Menu.NavigationModule.Name,
                            ModuleIcon = x.Menu.NavigationModule.Icon ?? string.Empty,
                            ModuleOrder = x.Menu.NavigationModule.DisplayOrder
                        }
                )
                .ToListAsync();

        return rows
            .GroupBy(x => x.SubmenuCode)
            .ToDictionary(g => g.Key, g => g.First());
    }


    //===========================================================
    // Journals of the period, each with its page
    //===========================================================

    private async Task<Scope> LoadScopeAsync
    (
        string? from,
        string? to,
        long branchId
    )
    {
        (DateOnly start, DateOnly end) =
            Period(from, to);

        Scope scope =
            new()
            {
                From = start,
                To = end,
                BranchId = Math.Max(0, branchId)
            };

        scope.Sources =
            await LoadSourcesAsync();

        scope.Pages =
            await LoadPagesAsync(scope.Sources);

        // Manual vouchers stay off the register
        List<string> manual =
            scope.Sources
                .Where(x => !x.IsAutoJournal)
                .Select(x => x.VoucherType)
                .Distinct()
                .ToList();

        long branch =
            scope.BranchId;

        var heads =
            await _context
                .Set<VoucherEntriesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.VoucherDate >= start
                        &&
                        x.VoucherDate <= end
                        &&
                        (branch == 0 || x.BranchId == branch)
                        &&
                        !manual.Contains(x.VoucherType)
                )
                .GroupBy(x => new { x.VoucherType, x.VoucherNo })
                .Select
                (
                    g =>
                        new
                        {
                            g.Key.VoucherType,
                            g.Key.VoucherNo,
                            FirstDate = g.Min(x => x.VoucherDate)
                        }
                )
                .ToListAsync();

        scope.Heads =
            heads
                .Select
                (
                    x =>
                        new HeadRow
                        {
                            VoucherType = x.VoucherType,
                            VoucherNo = x.VoucherNo,
                            FirstDate = x.FirstDate
                        }
                )
                .ToList();

        await AssignPagesAsync(scope);

        return scope;
    }


    // Sets HeadRow.Page from the sources
    private async Task AssignPagesAsync
    (
        Scope scope
    )
    {
        Dictionary<string, List<SourceRow>> byType =
            scope.Sources
                .Where(x => x.IsAutoJournal)
                .GroupBy(x => x.VoucherType, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.OrdinalIgnoreCase);

        // Table → voucher numbers it holds (only for the types
        // that need a table to tell the page)
        Dictionary<string, HashSet<string>> held =
            new(StringComparer.OrdinalIgnoreCase);

        List<string> tables =
            byType.Values
                .SelectMany(x => x)
                .Where(x => x.SourceTable.Length > 0)
                .Select(x => x.SourceTable)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

        foreach (string table in tables)
        {
            HashSet<string> types =
                byType
                    .Where(x => x.Value.Any(s => s.SourceTable.Equals(table, StringComparison.OrdinalIgnoreCase)))
                    .Select(x => x.Key)
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

            string[] numbers =
                scope.Heads
                    .Where(x => types.Contains(x.VoucherType))
                    .Select(x => x.VoucherNo)
                    .Distinct()
                    .ToArray();

            held[table] =
                numbers.Length == 0 || !TableName.IsMatch(table) || !await TableExistsAsync(table)
                    ? new HashSet<string>()
                    : (
                        await _context.Database
                            .SqlQueryRaw<string>(
                                $"SELECT \"VoucherNo\" AS \"Value\" FROM public.\"{table}\" WHERE \"VoucherNo\" = ANY({{0}})",
                                new object[] { numbers })
                            .ToListAsync()
                      )
                      .ToHashSet();
        }

        foreach (HeadRow head in scope.Heads)
        {
            head.Page = string.Empty;

            if
            (
                !byType.TryGetValue(head.VoucherType, out List<SourceRow>? sources)
            )
            {
                continue;
            }

            // A source with a table needs the number in it; one
            // without a table takes every voucher of the type
            SourceRow? source =
                sources.FirstOrDefault
                (
                    x =>
                        x.SourceTable.Length > 0
                        &&
                        held.TryGetValue(x.SourceTable, out HashSet<string>? numbers)
                        &&
                        numbers.Contains(head.VoucherNo)
                )
                ??
                sources.FirstOrDefault(x => x.SourceTable.Length == 0);

            if
            (
                source != null
                &&
                scope.Pages.ContainsKey(source.NavigationSubmenuCode)
            )
            {
                head.Page = source.NavigationSubmenuCode;
            }
        }
    }


    //===========================================================
    // Tree
    //===========================================================

    public async Task<AutoJournalTreeDto> GetTreeAsync
    (
        string? from,
        string? to,
        long branchId
    )
    {
        Scope scope =
            await LoadScopeAsync(from, to, branchId);

        Dictionary<string, int> counts =
            scope.Heads
                .GroupBy(x => x.Page)
                .ToDictionary(g => g.Key, g => g.Count());

        Dictionary<string, List<string>> typesOf =
            scope.Sources
                .Where(x => x.IsAutoJournal && x.NavigationSubmenuCode.Length > 0)
                .GroupBy(x => x.NavigationSubmenuCode)
                .ToDictionary(g => g.Key, g => g.Select(x => x.VoucherType).Distinct().ToList());

        List<AutoJournalNodeDto> modules =
            scope.Pages.Values
                .GroupBy(x => x.ModuleCode)
                .Select
                (
                    module =>
                    {
                        PageRow first =
                            module.First();

                        List<AutoJournalNodeDto> menus =
                            module
                                .GroupBy(x => x.MenuCode)
                                .OrderBy(x => x.First().MenuOrder)
                                .ThenBy(x => x.First().MenuName)
                                .Select
                                (
                                    menu =>
                                    {
                                        List<AutoJournalNodeDto> submenus =
                                            menu
                                                .OrderBy(x => x.SubmenuOrder)
                                                .ThenBy(x => x.SubmenuName)
                                                .Select
                                                (
                                                    page =>
                                                        new AutoJournalNodeDto
                                                        {
                                                            Code = page.SubmenuCode,
                                                            Name = page.SubmenuName,
                                                            Icon = page.SubmenuIcon,
                                                            Count = counts.GetValueOrDefault(page.SubmenuCode),
                                                            VoucherTypes = typesOf.GetValueOrDefault(page.SubmenuCode) ?? new List<string>()
                                                        }
                                                )
                                                .ToList();

                                        return new AutoJournalNodeDto
                                        {
                                            Code = menu.Key,
                                            Name = menu.First().MenuName,
                                            Icon = menu.First().MenuIcon,
                                            Count = submenus.Sum(x => x.Count),
                                            Children = submenus
                                        };
                                    }
                                )
                                .ToList();

                        return new
                        {
                            first.ModuleOrder,
                            Node =
                                new AutoJournalNodeDto
                                {
                                    Code = module.Key,
                                    Name = first.ModuleName,
                                    Icon = first.ModuleIcon,
                                    Count = menus.Sum(x => x.Count),
                                    Children = menus
                                }
                        };
                    }
                )
                .OrderBy(x => x.ModuleOrder)
                .ThenBy(x => x.Node.Name)
                .Select(x => x.Node)
                .ToList();

        return new AutoJournalTreeDto
        {
            From = DateText(scope.From),
            To = DateText(scope.To),
            BranchId = scope.BranchId,
            Total = scope.Heads.Count,
            OtherCount = counts.GetValueOrDefault(string.Empty),
            Modules = modules,
            Branches =
                await _context
                    .Set<BranchesEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.BranchName)
                    .Select
                    (
                        x =>
                            new AutoJournalOptionDto
                            {
                                Id = x.BranchId,
                                Code = x.BranchCode,
                                Name = x.BranchName
                            }
                    )
                    .ToListAsync()
        };
    }


    //===========================================================
    // Journals of one node
    //===========================================================

    public async Task<AutoJournalListDto> GetJournalsAsync
    (
        string? from,
        string? to,
        long branchId,
        string? node
    )
    {
        Scope scope =
            await LoadScopeAsync(from, to, branchId);

        string code =
            (node ?? string.Empty).Trim();

        // Node → the pages under it
        List<HeadRow> heads;

        string path;

        if
        (
            code.Length == 0
        )
        {
            heads = scope.Heads;

            path = "All Auto Journals";
        }
        else if
        (
            code.Equals(OtherNode, StringComparison.OrdinalIgnoreCase)
        )
        {
            heads = scope.Heads.Where(x => x.Page.Length == 0).ToList();

            path = OtherName;
        }
        else
        {
            List<PageRow> pages =
                scope.Pages.Values
                    .Where(x => x.SubmenuCode == code || x.MenuCode == code || x.ModuleCode == code)
                    .ToList();

            HashSet<string> codes =
                pages.Select(x => x.SubmenuCode).ToHashSet();

            heads = scope.Heads.Where(x => codes.Contains(x.Page)).ToList();

            PageRow? page =
                pages.FirstOrDefault();

            path =
                page == null
                    ? code
                    : page.SubmenuCode == code
                        ? $"{page.ModuleName} › {page.MenuName} › {page.SubmenuName}"
                        : page.MenuCode == code
                            ? $"{page.ModuleName} › {page.MenuName}"
                            : page.ModuleName;
        }

        List<HeadRow> chosen =
            heads
                .OrderBy(x => x.FirstDate)
                .ThenBy(x => x.VoucherNo)
                .Take(MaxJournals)
                .ToList();

        Dictionary<long, string> branches =
            await _context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .ToDictionaryAsync(x => x.BranchId, x => x.BranchName ?? string.Empty);

        AutoJournalListDto result =
            new()
            {
                Node = code,
                NodePath = path,
                From = DateText(scope.From),
                To = DateText(scope.To),
                BranchId = scope.BranchId,
                BranchName = scope.BranchId == 0
                    ? "All Branches"
                    : branches.GetValueOrDefault(scope.BranchId, string.Empty),
                Total = heads.Count,
                Shown = chosen.Count,
                Truncated = heads.Count > chosen.Count
            };

        if
        (
            chosen.Count == 0
        )
        {
            return result;
        }

        List<string> numbers =
            chosen.Select(x => x.VoucherNo).Distinct().ToList();

        List<VoucherEntriesEntity> entries =
            await _context
                .Set<VoucherEntriesEntity>()
                .AsNoTracking()
                .Where(x => numbers.Contains(x.VoucherNo))
                .OrderBy(x => x.IsReversal)
                .ThenBy(x => x.GroupNo)
                .ThenBy(x => x.LineNo)
                .ThenBy(x => x.VoucherEntryId)
                .ToListAsync();

        Dictionary<string, string> parties =
            await PartyNamesAsync(entries);

        Dictionary<string, List<VoucherEntriesEntity>> byVoucher =
            entries
                .GroupBy(x => Key(x.VoucherType, x.VoucherNo))
                .ToDictionary(g => g.Key, g => g.ToList());

        foreach (HeadRow head in chosen)
        {
            if
            (
                !byVoucher.TryGetValue(Key(head.VoucherType, head.VoucherNo), out List<VoucherEntriesEntity>? rows)
            )
            {
                continue;
            }

            result.Journals.Add(
                ToJournal(head, rows, scope, branches, parties));
        }

        return result;
    }


    //===========================================================
    // One journal
    //===========================================================

    private static AutoJournalDto ToJournal
    (
        HeadRow head,
        List<VoucherEntriesEntity> rows,
        Scope scope,
        Dictionary<long, string> branches,
        Dictionary<string, string> parties
    )
    {
        List<VoucherEntriesEntity> original =
            rows.Where(x => !x.IsReversal).ToList();

        List<VoucherEntriesEntity> reversal =
            rows.Where(x => x.IsReversal).ToList();

        // Reversal lines only (should not happen) : show them
        List<VoucherEntriesEntity> main =
            original.Count > 0
                ? original
                : reversal;

        VoucherEntriesEntity first =
            main[0];

        var party =
            main
                .Where(x => !string.IsNullOrWhiteSpace(x.PartyCode))
                .Select(x => new { x.PartyType, x.PartyCode })
                .Distinct()
                .ToList();

        PageRow? page =
            scope.Pages.GetValueOrDefault(head.Page);

        AutoJournalDto journal =
            new()
            {
                VoucherNo = head.VoucherNo,
                VoucherType = head.VoucherType,
                VoucherDate = DateText(first.VoucherDate),
                SourceCode = head.Page,
                SourceName = page?.SubmenuName ?? OtherName,
                BranchId = first.BranchId,
                BranchName = branches.GetValueOrDefault(first.BranchId, first.BranchCode),
                PartyType = party.Count == 1 ? party[0].PartyType : string.Empty,
                PartyCode = party.Count == 1 ? party[0].PartyCode : string.Empty,
                PartyName = party.Count == 1 ? parties.GetValueOrDefault(Key(party[0].PartyType, party[0].PartyCode), string.Empty) : string.Empty,
                Narration = main.Select(x => x.Narration).FirstOrDefault(x => !string.IsNullOrWhiteSpace(x)) ?? string.Empty,
                ReferenceNo = main.Select(x => x.ReferenceNo).FirstOrDefault(x => !string.IsNullOrWhiteSpace(x)) ?? string.Empty,
                TotalDebit = Money(main.Sum(x => x.Debit)),
                TotalCredit = Money(main.Sum(x => x.Credit)),
                Lines = main.Select(x => ToLine(x, parties)).ToList()
            };

        if
        (
            original.Count > 0
            &&
            reversal.Count > 0
        )
        {
            journal.IsReversed = true;

            journal.ReversalDate = DateText(reversal.Min(x => x.VoucherDate));

            journal.ReversalReason =
                reversal.Select(x => x.ReversalReason).FirstOrDefault(x => !string.IsNullOrWhiteSpace(x))
                ?? string.Empty;

            journal.ReversalLines = reversal.Select(x => ToLine(x, parties)).ToList();
        }

        return journal;
    }


    private static AutoJournalLineDto ToLine
    (
        VoucherEntriesEntity row,
        Dictionary<string, string> parties
    )
    {
        return new AutoJournalLineDto
        {
            GroupNo = row.GroupNo,
            LineNo = row.LineNo,
            LedgerCode = row.LedgerCode,
            LedgerName = row.LedgerName,
            LedgerType = row.LedgerType,
            PartyType = row.PartyType,
            PartyCode = row.PartyCode,
            PartyName = parties.GetValueOrDefault(Key(row.PartyType, row.PartyCode), string.Empty),
            Narration = row.Narration,
            Debit = Money(row.Debit),
            Credit = Money(row.Credit)
        };
    }


    //===========================================================
    // Party names (suppliers and customers, by code)
    //===========================================================

    private async Task<Dictionary<string, string>> PartyNamesAsync
    (
        List<VoucherEntriesEntity> entries
    )
    {
        Dictionary<string, string> names =
            new();

        List<string> suppliers =
            entries
                .Where(x => x.PartyType == PartySupplier && x.PartyCode.Length > 0)
                .Select(x => x.PartyCode)
                .Distinct()
                .ToList();

        List<string> customers =
            entries
                .Where(x => x.PartyType == PartyCustomer && x.PartyCode.Length > 0)
                .Select(x => x.PartyCode)
                .Distinct()
                .ToList();

        if
        (
            suppliers.Count > 0
        )
        {
            var rows =
                await _context
                    .Set<SupplierProfilesEntity>()
                    .AsNoTracking()
                    .Where(x => suppliers.Contains(x.SupplierCode))
                    .Select(x => new { x.SupplierCode, x.DisplayName })
                    .ToListAsync();

            foreach (var row in rows)
            {
                names.TryAdd(Key(PartySupplier, row.SupplierCode), row.DisplayName ?? string.Empty);
            }
        }

        if
        (
            customers.Count > 0
        )
        {
            var rows =
                await _context
                    .Set<CustomerProfilesEntity>()
                    .AsNoTracking()
                    .Where(x => customers.Contains(x.CustomerCode))
                    .Select(x => new { x.CustomerCode, x.DisplayName })
                    .ToListAsync();

            foreach (var row in rows)
            {
                names.TryAdd(Key(PartyCustomer, row.CustomerCode), row.DisplayName ?? string.Empty);
            }
        }

        return names;
    }
}
