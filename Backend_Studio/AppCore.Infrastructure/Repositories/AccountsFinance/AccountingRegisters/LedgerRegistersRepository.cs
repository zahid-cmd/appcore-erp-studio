//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.AccountsFinance.AccountingRegisters;
using AppCore.Application.Platform.Accounting;
using AppCore.Infrastructure.Persistence;

using VoucherEntriesEntity =
    AppCore.Domain.Platform.Accounting.VoucherEntries;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using FinancialYearsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.FinancialYears;

using AccountClassEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountClass;

using AccountGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup;

using GeneralLedgersEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using SupplierProfilesEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.SupplierProfiles;

using CustomerProfilesEntity =
    AppCore.Domain.Entities.Settings.ClientSettings.CustomerProfiles;

using ReceiptVoucherPaymentsEntity =
    AppCore.Domain.Entities.AccountsFinance.VoucherManagement.ReceiptVoucherPayments;

using CheckReconciliationsEntity =
    AppCore.Domain.Entities.AccountsFinance.AccountsReconciliation.CheckReconciliations;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.AccountsFinance.AccountingRegisters;


//===============================================================
// Ledger Statements and Registers repository (read only)
//
// Source : VoucherEntries (every posted line; never edited). A
// cancelled voucher has reversing lines (IsReversal, Dr / Cr
// swapped).
//
//   Opening : Σ(Debit − Credit) before From; income / expense
//             ledgers count from the start of the financial
//             year that holds From
//   Balance : running Debit − Credit (positive = Dr)
//   Hidden cancelled (default) : a voucher reversed on or
//             before To and its reversal are left out of the
//             opening, the rows and the totals (they net to 0)
//
// Ledgers, their class / group / sub group : the voucher ledger
// list (GL + Cash / Bank / MFS / POS / EMI accounts).
//===============================================================

public class LedgerRegistersRepository
    : ILedgerRegistersRepository
{
    private readonly AppDbContext _context;

    private readonly IVoucherLedgerRepository _ledgers;


    //===========================================================
    // Constants
    //===========================================================

    private const string GeneralLedger = "General Ledger";

    private const string DateFormat = "yyyy-MM-dd";

    private const string Dr = "Dr";

    private const string Cr = "Cr";

    private const string PartySupplier = "Supplier";

    private const string PartyCustomer = "Customer";

    private const string ReceiptVoucher = "RV";

    // Line texts the voucher pages write themselves when no
    // short note is typed (Receipt / Payment / Fund Transfer)
    private static readonly System.Text.RegularExpressions.Regex SystemNote =
        new(
            @"^\S+\s+(received from|paid to|charges recovered from|charges on payment to|charges on transfer to)\b",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Compiled);

    // Manual voucher types (by code : RV / PV / JV / FT) : the
    // only ones whose line notes are typed by a user
    private static readonly HashSet<string> ManualTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            AppCore.Domain.Platform.Accounting.VoucherTypes.Receipt,
            AppCore.Domain.Platform.Accounting.VoucherTypes.Payment,
            AppCore.Domain.Platform.Accounting.VoucherTypes.Journal,
            AppCore.Domain.Platform.Accounting.VoucherTypes.FundTransfer
        };

    // Purchase voucher types (by code : PIMB / PISP / PIAC)
    private static readonly HashSet<string> PurchaseTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            AppCore.Domain.Platform.Accounting.VoucherTypes.PurchaseMotorBikes,
            AppCore.Domain.Platform.Accounting.VoucherTypes.PurchaseSpareParts,
            AppCore.Domain.Platform.Accounting.VoucherTypes.PurchaseAccessories
        };

    // Opening Stock voucher types (by code : OPMB / OPSP / OPAC) :
    // line notes as "Opening Stock - Reve A04 - White : 1 Pcs",
    // "Opening Stock - Unclaimed input VAT"
    private static readonly HashSet<string> OpeningTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            AppCore.Domain.Platform.Accounting.VoucherTypes.OpeningMotorBikes,
            AppCore.Domain.Platform.Accounting.VoucherTypes.OpeningSpareParts,
            AppCore.Domain.Platform.Accounting.VoucherTypes.OpeningAccessories
        };

    // " on opening stock OS-…" at the end of a line text : the
    // number is in the Ref No column already
    private static readonly System.Text.RegularExpressions.Regex OpeningRef =
        new(
            @"\s+on opening stock\s+\S+$",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Compiled);

    // Statement rows sent per load (totals stay complete)
    private const int MaxRows = 5000;

    private static readonly string[] Types =
    {
        GeneralLedger,
        "Cash",
        "Bank",
        "MFS",
        "POS",
        "EMI"
    };

    // Class words of income / expense (nominal) ledgers
    private static readonly string[] NominalWords =
    {
        "income",
        "revenue",
        "expense",
        "expenditure",
        "cost"
    };


    public LedgerRegistersRepository(
        AppDbContext context,
        IVoucherLedgerRepository ledgers)
    {
        _context = context;

        _ledgers = ledgers;
    }


    //===========================================================
    // Inner rows
    //===========================================================

    // A ledger of the type with its chart names
    private sealed class LedgerRow
    {
        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string ClassCode { get; set; } = string.Empty;

        public string ClassName { get; set; } = string.Empty;

        public string GroupCode { get; set; } = string.Empty;

        public string GroupName { get; set; } = string.Empty;

        public string SubGroupCode { get; set; } = string.Empty;

        public string SubGroupName { get; set; } = string.Empty;

        public string Mode { get; set; } = Dr;

        public bool IsNominal { get; set; }

        public bool IsActive { get; set; }
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


    private static string Clean(string? value) =>
        (value ?? string.Empty).Trim();


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


    // "general-ledger" / "gl" / "" → General Ledger; "bank" → Bank
    private static string NormalType
    (
        string? type
    )
    {
        string text =
            Clean(type).Replace("-", " ").Replace("_", " ");

        if
        (
            text.Length == 0
            ||
            text.Equals("gl", StringComparison.OrdinalIgnoreCase)
            ||
            text.Equals("ledger", StringComparison.OrdinalIgnoreCase)
        )
        {
            return GeneralLedger;
        }

        return Types.FirstOrDefault(x => x.Equals(text, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException($"Unknown register type \"{type}\".");
    }


    // Class words of credit-side ledgers (used when no mode is
    // set on the ledger, its group or its class)
    private static readonly string[] CreditWords =
    {
        "liabilit",
        "equity",
        "capital",
        "income",
        "revenue",
        "sales",
        "payable",
        "reserve"
    };


    // "Debit" / "Dr" → Dr ; "Credit" / "Cr" → Cr (first one set);
    // none set → "" (the class name decides)
    private static string NormalMode
    (
        params string?[] modes
    )
    {
        foreach (string? mode in modes)
        {
            string text =
                Clean(mode);

            if (text.StartsWith("d", StringComparison.OrdinalIgnoreCase))
            {
                return Dr;
            }

            if (text.StartsWith("c", StringComparison.OrdinalIgnoreCase))
            {
                return Cr;
            }
        }

        return string.Empty;
    }


    // Normal side from the class name / type when no mode is set
    private static string ModeOfClass
    (
        string? classType,
        string? className
    )
    {
        string text =
            $"{classType} {className}".ToLowerInvariant();

        return CreditWords.Any(word => text.Contains(word))
            ? Cr
            : Dr;
    }


    private static bool IsNominalClass
    (
        string? classType,
        string? className
    )
    {
        string text =
            $"{classType} {className}".ToLowerInvariant();

        return NominalWords.Any(word => text.Contains(word));
    }


    private static string ContraText
    (
        List<string> names
    )
    {
        return names.Count switch
        {
            0 => string.Empty,
            1 => names[0],
            2 => $"{names[0]}, {names[1]}",
            _ => $"{names[0]} +{names.Count - 1} more"
        };
    }


    //===========================================================
    // Ledgers of a type with class / group / sub group names
    //===========================================================

    private async Task<List<LedgerRow>> LoadLedgersAsync
    (
        string type
    )
    {
        List<VoucherLedgerDto> all =
            await _ledgers.GetAllAsync(false);

        List<VoucherLedgerDto> ledgers =
            all
                .Where(x => x.LedgerType == type)
                .ToList();

        var classes =
            (await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => new { x.ClassCode, x.ClassName, x.ClassType, x.Mode })
                .ToListAsync())
            .Where(x => !string.IsNullOrWhiteSpace(x.ClassCode))
            .GroupBy(x => x.ClassCode!)
            .ToDictionary(g => g.Key, g => g.First());

        var groups =
            (await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => new { x.GroupCode, x.GroupName, x.Mode })
                .ToListAsync())
            .Where(x => !string.IsNullOrWhiteSpace(x.GroupCode))
            .GroupBy(x => x.GroupCode!)
            .ToDictionary(g => g.Key, g => g.First());

        Dictionary<string, string> glModes =
            type == GeneralLedger
                ? (await _context
                    .Set<GeneralLedgersEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted)
                    .Select(x => new { x.LedgerCode, x.Mode })
                    .ToListAsync())
                    .Where(x => !string.IsNullOrWhiteSpace(x.LedgerCode))
                    .GroupBy(x => x.LedgerCode!)
                    .ToDictionary(g => g.Key, g => g.First().Mode ?? string.Empty)
                : new Dictionary<string, string>();

        List<LedgerRow> rows =
            new();

        foreach (VoucherLedgerDto ledger in ledgers)
        {
            var cls =
                classes.GetValueOrDefault(ledger.ClassCode ?? string.Empty);

            var grp =
                groups.GetValueOrDefault(ledger.GroupCode ?? string.Empty);

            rows.Add(
                new LedgerRow
                {
                    Code = ledger.LedgerCode,
                    Name = ledger.LedgerName,
                    ClassCode = ledger.ClassCode ?? string.Empty,
                    ClassName = cls?.ClassName ?? string.Empty,
                    GroupCode = ledger.GroupCode ?? string.Empty,
                    GroupName = grp?.GroupName ?? string.Empty,
                    SubGroupCode = ledger.SubGroupCode ?? string.Empty,
                    SubGroupName = ledger.SubGroupName ?? string.Empty,
                    Mode = NormalMode(glModes.GetValueOrDefault(ledger.LedgerCode), grp?.Mode, cls?.Mode) is { Length: > 0 } mode
                        ? mode
                        : ModeOfClass(cls?.ClassType, cls?.ClassName),
                    IsNominal = type == GeneralLedger && IsNominalClass(cls?.ClassType, cls?.ClassName),
                    IsActive = ledger.IsActive
                });
        }

        return rows
            .OrderBy(x => x.Name)
            .ToList();
    }


    //===========================================================
    // Branches / financial year
    //===========================================================

    private async Task<Dictionary<long, string>> BranchNamesAsync()
    {
        return await _context
            .Set<BranchesEntity>()
            .AsNoTracking()
            .ToDictionaryAsync(x => x.BranchId, x => x.BranchName ?? string.Empty);
    }


    private static string BranchText
    (
        Dictionary<long, string> branches,
        long branchId
    )
    {
        return branchId == 0
            ? "All Branches"
            : branches.GetValueOrDefault(branchId, string.Empty);
    }


    // Start of the financial year that holds the date (none = null)
    private async Task<DateOnly?> YearStartAsync
    (
        DateOnly date
    )
    {
        List<DateOnly> starts =
            await _context
                .Set<FinancialYearsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.StartDate <= date && x.EndDate >= date)
                .Select(x => x.StartDate)
                .ToListAsync();

        return starts.Count == 0
            ? null
            : starts.Max();
    }


    // Lines of the ledgers, branch filtered; without the
    // cancelled vouchers (reversed on or before To) when hidden
    private async Task<IQueryable<VoucherEntriesEntity>> LinesAsync
    (
        List<string> codes,
        long branchId,
        DateOnly to,
        bool showCancelled
    )
    {
        IQueryable<VoucherEntriesEntity> query =
            _context
                .Set<VoucherEntriesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        codes.Contains(x.LedgerCode)
                        &&
                        (branchId == 0 || x.BranchId == branchId)
                );

        if
        (
            !showCancelled
        )
        {
            List<string> cancelled =
                await query
                    .Where(x => x.IsReversal && x.VoucherDate <= to)
                    .Select(x => x.VoucherNo)
                    .Distinct()
                    .ToListAsync();

            if
            (
                cancelled.Count > 0
            )
            {
                query =
                    query.Where(x => !cancelled.Contains(x.VoucherNo));
            }
        }

        return query;
    }


    //===========================================================
    // Chart
    //===========================================================

    public async Task<LedgerChartDto> GetChartAsync
    (
        string? type
    )
    {
        string ledgerType =
            NormalType(type);

        List<LedgerRow> ledgers =
            await LoadLedgersAsync(ledgerType);

        return new LedgerChartDto
        {
            Type = ledgerType,

            Classes =
                ledgers
                    .Where(x => x.ClassCode.Length > 0)
                    .GroupBy(x => x.ClassCode)
                    .Select
                    (
                        g =>
                            new LedgerChartNodeDto
                            {
                                Code = g.Key,
                                Name = g.First().ClassName.Length > 0 ? g.First().ClassName : g.Key,
                                ClassCode = g.Key
                            }
                    )
                    .OrderBy(x => x.Code)
                    .ToList(),

            Groups =
                ledgers
                    .Where(x => x.GroupCode.Length > 0)
                    .GroupBy(x => x.GroupCode)
                    .Select
                    (
                        g =>
                            new LedgerChartNodeDto
                            {
                                Code = g.Key,
                                Name = g.First().GroupName.Length > 0 ? g.First().GroupName : g.Key,
                                ParentCode = g.First().ClassCode,
                                ClassCode = g.First().ClassCode
                            }
                    )
                    .OrderBy(x => x.Code)
                    .ToList(),

            SubGroups =
                ledgers
                    .Where(x => x.SubGroupCode.Length > 0)
                    .GroupBy(x => x.SubGroupCode)
                    .Select
                    (
                        g =>
                            new LedgerChartNodeDto
                            {
                                Code = g.Key,
                                Name = g.First().SubGroupName.Length > 0 ? g.First().SubGroupName : g.Key,
                                ParentCode = g.First().GroupCode,
                                ClassCode = g.First().ClassCode
                            }
                    )
                    .OrderBy(x => x.Code)
                    .ToList(),

            Ledgers =
                ledgers
                    .Select
                    (
                        x =>
                            new LedgerChartLedgerDto
                            {
                                Code = x.Code,
                                Name = x.Name,
                                ClassCode = x.ClassCode,
                                GroupCode = x.GroupCode,
                                SubGroupCode = x.SubGroupCode,
                                Mode = x.Mode,
                                IsActive = x.IsActive
                            }
                    )
                    .ToList(),

            Branches =
                await _context
                    .Set<BranchesEntity>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.BranchName)
                    .Select
                    (
                        x =>
                            new LedgerOptionDto
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
    // Statement of one ledger
    //===========================================================

    public async Task<LedgerStatementDto> GetStatementAsync
    (
        string? type,
        string? ledgerCode,
        string? from,
        string? to,
        long branchId,
        bool showCancelled
    )
    {
        string ledgerType =
            NormalType(type);

        string code =
            Clean(ledgerCode);

        LedgerRow ledger =
            (await LoadLedgersAsync(ledgerType)).FirstOrDefault(x => x.Code == code)
            ?? throw new KeyNotFoundException("Ledger not found.");

        (DateOnly start, DateOnly end) =
            Period(from, to);

        long branch =
            Math.Max(0, branchId);

        // Income / expense : opening from the year start
        DateOnly? yearStart =
            ledger.IsNominal
                ? await YearStartAsync(start)
                : null;

        IQueryable<VoucherEntriesEntity> lines =
            await LinesAsync(new List<string> { code }, branch, end, showCancelled);

        IQueryable<VoucherEntriesEntity> before =
            lines.Where(x => x.VoucherDate < start);

        if
        (
            yearStart.HasValue
        )
        {
            DateOnly fy =
                yearStart.Value;

            before =
                before.Where(x => x.VoucherDate >= fy);
        }

        decimal opening =
            await before.SumAsync(x => x.Debit - x.Credit);

        IQueryable<VoucherEntriesEntity> period =
            lines.Where(x => x.VoucherDate >= start && x.VoucherDate <= end);

        decimal totalDebit =
            await period.SumAsync(x => x.Debit);

        decimal totalCredit =
            await period.SumAsync(x => x.Credit);

        List<VoucherEntriesEntity> rows =
            await period
                .OrderBy(x => x.VoucherDate)
                .ThenBy(x => x.VoucherNo)
                .ThenBy(x => x.IsReversal)
                .ThenBy(x => x.GroupNo)
                .ThenBy(x => x.LineNo)
                .ThenBy(x => x.VoucherEntryId)
                .Take(MaxRows + 1)
                .ToListAsync();

        bool truncated =
            rows.Count > MaxRows;

        if
        (
            truncated
        )
        {
            rows = rows.Take(MaxRows).ToList();
        }

        Dictionary<long, string> branches =
            await BranchNamesAsync();

        LedgerStatementDto result =
            new()
            {
                Type = ledgerType,
                LedgerCode = ledger.Code,
                LedgerName = ledger.Name,
                ClassName = ledger.ClassName,
                GroupName = ledger.GroupName,
                SubGroupName = ledger.SubGroupName,
                Mode = ledger.Mode,
                IsNominal = ledger.IsNominal,
                OpeningFrom = yearStart.HasValue ? DateText(yearStart.Value) : string.Empty,
                From = DateText(start),
                To = DateText(end),
                BranchId = branch,
                BranchName = BranchText(branches, branch),
                ShowCancelled = showCancelled,
                Opening = Money(opening),
                TotalDebit = Money(totalDebit),
                TotalCredit = Money(totalCredit),
                Closing = Money(opening + totalDebit - totalCredit),
                Truncated = truncated
            };

        if
        (
            rows.Count == 0
        )
        {
            return result;
        }

        //=======================================================
        // Every line of the vouchers on the statement
        //=======================================================

        List<string> numbers =
            rows.Select(x => x.VoucherNo).Distinct().ToList();

        List<VoucherEntriesEntity> voucherLines =
            await _context
                .Set<VoucherEntriesEntity>()
                .AsNoTracking()
                .Where(x => numbers.Contains(x.VoucherNo))
                .ToListAsync();

        HashSet<string> reversed =
            voucherLines
                .Where(x => x.IsReversal)
                .Select(x => Key(x.VoucherType, x.VoucherNo))
                .ToHashSet();

        Dictionary<string, List<VoucherEntriesEntity>> byVoucher =
            voucherLines
                .GroupBy(x => Key(x.VoucherType, x.VoucherNo))
                .ToDictionary(g => g.Key, g => g.ToList());

        Dictionary<string, string> parties =
            await PartyNamesAsync(voucherLines);

        Dictionary<string, (string Reference, string Status)> references =
            await ReferencesAsync(rows);

        decimal balance =
            opening;

        // This ledger's lines, bucketed by voucher · side
        // (original / reversal) · group · Dr or Cr, in statement
        // order. Per-group posting (1 Dr : n Cr / n Dr : 1 Cr)
        // gives every bucket its counter heads in the same group.
        List<List<VoucherEntriesEntity>> buckets =
            new();

        Dictionary<string, List<VoucherEntriesEntity>> bucketByKey =
            new();

        foreach (VoucherEntriesEntity row in rows)
        {
            string bucketKey =
                $"{Key(row.VoucherType, row.VoucherNo)}\u001f{row.IsReversal}\u001f{row.GroupNo}\u001f{row.Debit > 0}";

            if
            (
                !bucketByKey.TryGetValue(bucketKey, out List<VoucherEntriesEntity>? bucket)
            )
            {
                bucket = new List<VoucherEntriesEntity>();

                bucketByKey[bucketKey] = bucket;

                buckets.Add(bucket);
            }

            bucket.Add(row);
        }

        foreach (List<VoucherEntriesEntity> bucket in buckets)
        {
            VoucherEntriesEntity first =
                bucket[0];

            bool isDebit =
                first.Debit > 0;

            List<VoucherEntriesEntity> all =
                byVoucher.GetValueOrDefault(Key(first.VoucherType, first.VoucherNo))
                ?? new List<VoucherEntriesEntity>();

            // Same side of the voucher (original / reversal)
            List<VoucherEntriesEntity> side =
                all.Where(x => x.IsReversal == first.IsReversal).ToList();

            // Counter lines : the opposite side of the same group,
            // else of the whole voucher
            List<VoucherEntriesEntity> contra =
                side
                    .Where(x => x.GroupNo == first.GroupNo && x.LedgerCode != first.LedgerCode && (isDebit ? x.Credit > 0 : x.Debit > 0))
                    .ToList();

            if
            (
                contra.Count == 0
            )
            {
                contra =
                    side
                        .Where(x => x.LedgerCode != first.LedgerCode && (isDebit ? x.Credit > 0 : x.Debit > 0))
                        .ToList();
            }

            // Counter heads (lines of one ledger added together)
            var heads =
                contra
                    .GroupBy(x => x.LedgerCode)
                    .Select
                    (
                        g =>
                            new
                            {
                                Code = g.Key,
                                Name = g.First().LedgerName,
                                Amount = g.Sum(x => isDebit ? x.Credit : x.Debit),
                                Note = g.Select(x => Clean(x.Narration)).FirstOrDefault(x => x.Length > 0) ?? string.Empty
                            }
                    )
                    .ToList();

            // Voucher narration : the most common line narration
            // of the voucher (original / reversal side)
            string voucherNarration =
                VoucherNarration(side);

            string party =
                PartyName(parties, first.PartyType, first.PartyCode);

            bool cancelled =
                !first.IsReversal && reversed.Contains(Key(first.VoucherType, first.VoucherNo));

            string branchName =
                branches.GetValueOrDefault(first.BranchId, first.BranchCode);

            // Short note : a line's own narration when it differs
            // from the voucher's, without the ledger names it
            // repeats (counter head, this ledger). Purchases : the
            // quantity left, as "Purchase - 10 Pcs"; other vouchers :
            // the typed note as it is.
            bool purchase =
                PurchaseTypes.Contains(first.VoucherType);

            bool openingStock =
                OpeningTypes.Contains(first.VoucherType);

            // Typed notes exist only on manual vouchers; the line
            // texts of other posting pages (reconciliations …) are
            // made by the system and repeat the row
            bool manual =
                ManualTypes.Contains(first.VoucherType);

            string NoteOf(string narration, IEnumerable<string> names)
            {
                if
                (
                    narration.Length == 0
                    ||
                    narration == voucherNarration
                )
                {
                    return string.Empty;
                }

                string note =
                    StripNames(narration, names.Append(ledger.Name));

                if
                (
                    purchase
                )
                {
                    return note.Length > 0
                        ? $"Purchase - {note}"
                        : string.Empty;
                }

                if
                (
                    openingStock
                )
                {
                    note =
                        OpeningRef.Replace(note, string.Empty).Trim();

                    return note.Length > 0
                        ? $"Opening Stock - {note}"
                        : string.Empty;
                }

                // Texts the voucher pages write when no note is
                // typed ("POS received from …", "MFS charges
                // recovered from …", "Bank paid to …") are not notes
                return manual && !SystemNote.IsMatch(narration)
                    ? note
                    : string.Empty;
            }

            void AddRow
            (
                VoucherEntriesEntity entry,
                string particulars,
                string codeText,
                decimal debit,
                decimal credit,
                string note
            )
            {
                (string reference, string status) =
                    references.GetValueOrDefault(EntryKey(entry), (Clean(entry.ReferenceNo), string.Empty));

                balance += debit - credit;

                result.Rows.Add(
                    new LedgerStatementRowDto
                    {
                        VoucherType = entry.VoucherType,
                        VoucherNo = entry.VoucherNo,
                        VoucherDate = DateText(entry.VoucherDate),
                        BranchName = branchName,
                        IsReversal = entry.IsReversal,
                        IsCancelled = cancelled,
                        Particulars = particulars,
                        ContraCodes = codeText,
                        PartyName = party,
                        Reference = reference,
                        Status = status,
                        Narration = voucherNarration.Length > 0 ? voucherNarration : Clean(entry.Narration),
                        ShortNote = note,
                        Debit = Money(debit),
                        Credit = Money(credit),
                        Balance = Money(balance)
                    });
            }

            decimal bucketAmount =
                bucket.Sum(x => isDebit ? x.Debit : x.Credit);

            if
            (
                heads.Count > 1
                &&
                Money(heads.Sum(x => x.Amount)) == Money(bucketAmount)
            )
            {
                // This ledger is the "1" side : one row per counter
                // head with the head's own figure and note
                foreach (var head in heads)
                {
                    AddRow(
                        first,
                        head.Name,
                        head.Code,
                        isDebit ? head.Amount : 0m,
                        isDebit ? 0m : head.Amount,
                        NoteOf(head.Note, new[] { head.Name }));
                }

                continue;
            }

            // Several counter heads that do not add up to this
            // ledger's figure (a group with several lines on both
            // sides, e.g. a receipt paid by cash + POS) : pair the
            // group's debit and credit lines (equal figures first,
            // then in line order) and give each own line one row
            // per counter head it is paired with
            if
            (
                heads.Count > 1
            )
            {
                List<VoucherEntriesEntity> groupLines =
                    side.Where(x => x.GroupNo == first.GroupNo).ToList();

                List<(VoucherEntriesEntity Debit, VoucherEntriesEntity Credit, decimal Amount)> pairs =
                    PairLines(groupLines);

                bool paired = false;

                foreach (VoucherEntriesEntity line in bucket)
                {
                    var shares =
                        pairs
                            .Where(x => ReferenceEquals(isDebit ? x.Debit : x.Credit, line))
                            .Select(x => new { Counter = isDebit ? x.Credit : x.Debit, x.Amount })
                            .GroupBy(x => x.Counter.LedgerCode)
                            .Select
                            (
                                g =>
                                    new
                                    {
                                        Code = g.Key,
                                        Name = g.First().Counter.LedgerName,
                                        Amount = g.Sum(x => x.Amount),
                                        Note = g.Select(x => Clean(x.Counter.Narration)).FirstOrDefault(x => x.Length > 0) ?? string.Empty
                                    }
                            )
                            .ToList();

                    if
                    (
                        shares.Count == 0
                        ||
                        Money(shares.Sum(x => x.Amount)) != Money(isDebit ? line.Debit : line.Credit)
                    )
                    {
                        continue;
                    }

                    paired = true;

                    foreach (var share in shares)
                    {
                        AddRow(
                            line,
                            share.Name,
                            share.Code,
                            isDebit ? share.Amount : 0m,
                            isDebit ? 0m : share.Amount,
                            NoteOf(share.Note, new[] { share.Name }).Length > 0
                                ? NoteOf(share.Note, new[] { share.Name })
                                : NoteOf(Clean(line.Narration), new[] { share.Name }));
                    }
                }

                if
                (
                    paired
                )
                {
                    continue;
                }
            }

            // This ledger is on the "n" side (one counter head), or
            // the figures do not pair : one row per own line
            string names =
                ContraText(heads.Select(x => x.Name).Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().ToList());

            string codes =
                ContraText(heads.Select(x => x.Code).ToList());

            foreach (VoucherEntriesEntity line in bucket)
            {
                AddRow(
                    line,
                    names,
                    codes,
                    line.Debit,
                    line.Credit,
                    NoteOf(Clean(line.Narration), heads.Select(x => x.Name)));
            }
        }

        return result;
    }


    //===========================================================
    // Pairs a group's debit and credit lines : equal figures
    // first, then the rest in line order (first in, first out)
    //===========================================================

    private static List<(VoucherEntriesEntity Debit, VoucherEntriesEntity Credit, decimal Amount)> PairLines
    (
        List<VoucherEntriesEntity> lines
    )
    {
        List<(VoucherEntriesEntity Debit, VoucherEntriesEntity Credit, decimal Amount)> pairs =
            new();

        List<(VoucherEntriesEntity Line, decimal Left)> debits =
            lines
                .Where(x => x.Debit > 0)
                .OrderBy(x => x.LineNo)
                .ThenBy(x => x.VoucherEntryId)
                .Select(x => (x, x.Debit))
                .ToList();

        List<(VoucherEntriesEntity Line, decimal Left)> credits =
            lines
                .Where(x => x.Credit > 0)
                .OrderBy(x => x.LineNo)
                .ThenBy(x => x.VoucherEntryId)
                .Select(x => (x, x.Credit))
                .ToList();

        // Equal figures pair first (one to one)
        for (int d = 0; d < debits.Count; d++)
        {
            int c =
                credits.FindIndex(x => x.Left > 0 && Money(x.Left) == Money(debits[d].Left));

            if
            (
                debits[d].Left > 0
                &&
                c >= 0
            )
            {
                pairs.Add((debits[d].Line, credits[c].Line, debits[d].Left));

                credits[c] = (credits[c].Line, 0m);

                debits[d] = (debits[d].Line, 0m);
            }
        }

        // The rest in line order
        int di = 0;

        int ci = 0;

        while (di < debits.Count && ci < credits.Count)
        {
            if (debits[di].Left <= 0) { di++; continue; }

            if (credits[ci].Left <= 0) { ci++; continue; }

            decimal amount =
                Math.Min(debits[di].Left, credits[ci].Left);

            pairs.Add((debits[di].Line, credits[ci].Line, amount));

            debits[di] = (debits[di].Line, debits[di].Left - amount);

            credits[ci] = (credits[ci].Line, credits[ci].Left - amount);
        }

        return pairs;
    }


    //===========================================================
    // Voucher narration : the narration of the single line of a
    // group (the "1" of 1 Dr : n Cr / n Dr : 1 Cr, e.g. the
    // supplier line of a purchase); else the most common one
    //===========================================================

    private static string VoucherNarration
    (
        List<VoucherEntriesEntity> lines
    )
    {
        foreach (var group in lines.GroupBy(x => x.GroupNo).OrderBy(g => g.Key))
        {
            List<VoucherEntriesEntity> debits =
                group.Where(x => x.Debit > 0).ToList();

            List<VoucherEntriesEntity> credits =
                group.Where(x => x.Credit > 0).ToList();

            VoucherEntriesEntity? single =
                debits.Count == 1 && credits.Count > 1
                    ? debits[0]
                    : credits.Count == 1 && debits.Count > 1
                        ? credits[0]
                        : null;

            if
            (
                single != null
                &&
                Clean(single.Narration).Length > 0
            )
            {
                return Clean(single.Narration);
            }
        }

        return lines
            .Select(x => Clean(x.Narration))
            .Where(x => x.Length > 0)
            .GroupBy(x => x)
            .OrderByDescending(g => g.Count())
            .ThenBy(g => g.Key)
            .Select(g => g.Key)
            .FirstOrDefault()
            ?? string.Empty;
    }


    //===========================================================
    // Short note without the ledger names it repeats
    //
    //   "AC-H103 - Open Face Helmet : 20 Pcs" on the head
    //   "INV - AC-H103 - Open Face Helmet" → "20 Pcs"
    //
    // A name is tried whole and without its leading parts
    // ("INV - …"); what is left is trimmed of separators.
    //===========================================================

    private static string StripNames
    (
        string note,
        IEnumerable<string> names
    )
    {
        string text =
            note.Trim();

        foreach (string name in names.Where(x => !string.IsNullOrWhiteSpace(x)))
        {
            string[] parts =
                name.Split(" - ", StringSplitOptions.TrimEntries);

            // Longest variant first : whole name, then without
            // its leading parts (at least two parts kept unless
            // it is the last one)
            for (int i = 0; i < parts.Length; i++)
            {
                string variant =
                    string.Join(" - ", parts.Skip(i));

                if
                (
                    variant.Length < 3
                )
                {
                    continue;
                }

                int at =
                    text.IndexOf(variant, StringComparison.OrdinalIgnoreCase);

                if
                (
                    at >= 0
                )
                {
                    text =
                        (text[..at] + " " + text[(at + variant.Length)..]).Trim();

                    break;
                }
            }
        }

        return text
            .Trim(' ', ':', '-', '·', ',', ';', '|')
            .Replace("  ", " ")
            .Trim();
    }


    //===========================================================
    // Summary : the ledgers of a class / group / sub group
    //===========================================================

    public async Task<LedgerSummaryDto> GetSummaryAsync
    (
        string? type,
        string? classCode,
        string? groupCode,
        string? subGroupCode,
        string? from,
        string? to,
        long branchId,
        bool showCancelled
    )
    {
        string ledgerType =
            NormalType(type);

        string cls =
            Clean(classCode);

        string grp =
            Clean(groupCode);

        string sub =
            Clean(subGroupCode);

        (DateOnly start, DateOnly end) =
            Period(from, to);

        long branch =
            Math.Max(0, branchId);

        List<LedgerRow> ledgers =
            (await LoadLedgersAsync(ledgerType))
                .Where
                (
                    x =>
                        (cls.Length == 0 || x.ClassCode == cls)
                        &&
                        (grp.Length == 0 || x.GroupCode == grp)
                        &&
                        (sub.Length == 0 || x.SubGroupCode == sub)
                )
                .ToList();

        Dictionary<long, string> branches =
            await BranchNamesAsync();

        LedgerRow? sample =
            ledgers.FirstOrDefault();

        string scope =
            sub.Length > 0 && sample != null
                ? $"{sample.ClassName} › {sample.GroupName} › {sample.SubGroupName}"
                : grp.Length > 0 && sample != null
                    ? $"{sample.ClassName} › {sample.GroupName}"
                    : cls.Length > 0 && sample != null
                        ? sample.ClassName
                        : ledgerType == GeneralLedger
                            ? "All Ledgers"
                            : $"All {ledgerType} Accounts";

        LedgerSummaryDto result =
            new()
            {
                Type = ledgerType,
                ClassCode = cls,
                GroupCode = grp,
                SubGroupCode = sub,
                ScopePath = scope,
                From = DateText(start),
                To = DateText(end),
                BranchId = branch,
                BranchName = BranchText(branches, branch),
                ShowCancelled = showCancelled
            };

        if
        (
            ledgers.Count == 0
        )
        {
            return result;
        }

        List<string> codes =
            ledgers.Select(x => x.Code).ToList();

        // Income / expense ledgers : opening from the year start
        DateOnly yearStart =
            await YearStartAsync(start) ?? DateOnly.MinValue;

        IQueryable<VoucherEntriesEntity> lines =
            (await LinesAsync(codes, branch, end, showCancelled))
                .Where(x => x.VoucherDate <= end);

        var sums =
            await lines
                .GroupBy(x => x.LedgerCode)
                .Select
                (
                    g =>
                        new
                        {
                            Code = g.Key,
                            Before = g.Sum(x => x.VoucherDate < start ? x.Debit - x.Credit : 0m),
                            BeforeInYear = g.Sum(x => x.VoucherDate < start && x.VoucherDate >= yearStart ? x.Debit - x.Credit : 0m),
                            Debit = g.Sum(x => x.VoucherDate >= start ? x.Debit : 0m),
                            Credit = g.Sum(x => x.VoucherDate >= start ? x.Credit : 0m)
                        }
                )
                .ToListAsync();

        var byCode =
            sums.ToDictionary(x => x.Code);

        foreach (LedgerRow ledger in ledgers.OrderBy(x => x.GroupName).ThenBy(x => x.SubGroupName).ThenBy(x => x.Name))
        {
            var sum =
                byCode.GetValueOrDefault(ledger.Code);

            decimal opening =
                sum == null
                    ? 0m
                    : ledger.IsNominal ? sum.BeforeInYear : sum.Before;

            decimal debit =
                sum?.Debit ?? 0m;

            decimal credit =
                sum?.Credit ?? 0m;

            // Inactive ledgers only when they carry figures
            if
            (
                !ledger.IsActive
                &&
                opening == 0m
                &&
                debit == 0m
                &&
                credit == 0m
            )
            {
                continue;
            }

            result.Rows.Add(
                new LedgerSummaryRowDto
                {
                    LedgerCode = ledger.Code,
                    LedgerName = ledger.Name,
                    GroupName = ledger.GroupName,
                    SubGroupName = ledger.SubGroupName,
                    Mode = ledger.Mode,
                    IsActive = ledger.IsActive,
                    Opening = Money(opening),
                    Debit = Money(debit),
                    Credit = Money(credit),
                    Closing = Money(opening + debit - credit)
                });
        }

        result.Opening = result.Rows.Sum(x => x.Opening);

        result.TotalDebit = result.Rows.Sum(x => x.Debit);

        result.TotalCredit = result.Rows.Sum(x => x.Credit);

        result.Closing = result.Rows.Sum(x => x.Closing);

        return result;
    }


    //===========================================================
    // One voucher
    //===========================================================

    public async Task<LedgerVoucherDto?> GetVoucherAsync
    (
        string? voucherType,
        string? voucherNo
    )
    {
        string type =
            Clean(voucherType);

        string no =
            Clean(voucherNo);

        List<VoucherEntriesEntity> lines =
            await _context
                .Set<VoucherEntriesEntity>()
                .AsNoTracking()
                .Where(x => x.VoucherType == type && x.VoucherNo == no)
                .OrderBy(x => x.IsReversal)
                .ThenBy(x => x.GroupNo)
                .ThenBy(x => x.LineNo)
                .ThenBy(x => x.VoucherEntryId)
                .ToListAsync();

        if
        (
            lines.Count == 0
        )
        {
            return null;
        }

        Dictionary<string, string> parties =
            await PartyNamesAsync(lines);

        Dictionary<long, string> branches =
            await BranchNamesAsync();

        List<VoucherEntriesEntity> original =
            lines.Where(x => !x.IsReversal).ToList();

        List<VoucherEntriesEntity> reversal =
            lines.Where(x => x.IsReversal).ToList();

        List<VoucherEntriesEntity> main =
            original.Count > 0 ? original : reversal;

        LedgerVoucherLineDto ToLine(VoucherEntriesEntity x) =>
            new()
            {
                LedgerCode = x.LedgerCode,
                LedgerName = x.LedgerName,
                PartyName = PartyName(parties, x.PartyType, x.PartyCode),
                Narration = Clean(x.Narration),
                Debit = Money(x.Debit),
                Credit = Money(x.Credit)
            };

        LedgerVoucherDto voucher =
            new()
            {
                VoucherType = type,
                VoucherNo = no,
                VoucherDate = DateText(main[0].VoucherDate),
                BranchName = branches.GetValueOrDefault(main[0].BranchId, main[0].BranchCode),
                Narration =
                    main
                        .Select(x => Clean(x.Narration))
                        .Where(x => x.Length > 0)
                        .GroupBy(x => x)
                        .OrderByDescending(g => g.Count())
                        .Select(g => g.Key)
                        .FirstOrDefault()
                    ?? string.Empty,
                Lines = main.Select(ToLine).ToList()
            };

        if
        (
            original.Count > 0
            &&
            reversal.Count > 0
        )
        {
            voucher.IsReversed = true;

            voucher.ReversalDate = DateText(reversal.Min(x => x.VoucherDate));

            voucher.ReversalReason =
                reversal.Select(x => Clean(x.ReversalReason)).FirstOrDefault(x => x.Length > 0)
                ?? string.Empty;

            voucher.ReversalLines = reversal.Select(ToLine).ToList();
        }

        return voucher;
    }


    //===========================================================
    // Reference / status of statement lines
    //
    //   Receipt Voucher payment : cheque no (status) else the
    //   transaction ref; cheque reconciliation : cheque no and
    //   Cleared / Dishonoured / the cheque's status; otherwise
    //   the line's ReferenceNo.
    //===========================================================

    private static string EntryKey(VoucherEntriesEntity x) =>
        $"{x.VoucherEntryId}";


    private async Task<Dictionary<string, (string Reference, string Status)>> ReferencesAsync
    (
        List<VoucherEntriesEntity> rows
    )
    {
        Dictionary<string, (string, string)> result =
            new();

        List<long> receiptIds =
            rows
                .Where(x => x.VoucherType == ReceiptVoucher)
                .Select(x => x.VoucherId)
                .Distinct()
                .ToList();

        Dictionary<string, ReceiptVoucherPaymentsEntity> payments =
            receiptIds.Count == 0
                ? new Dictionary<string, ReceiptVoucherPaymentsEntity>()
                : (await _context
                    .Set<ReceiptVoucherPaymentsEntity>()
                    .AsNoTracking()
                    .Where(x => receiptIds.Contains(x.ReceiptVoucherId))
                    .ToListAsync())
                    .GroupBy(x => $"{x.ReceiptVoucherId}\u001f{x.LedgerCode}")
                    .ToDictionary(g => g.Key, g => g.OrderBy(x => x.LineNo).First());

        List<string> numbers =
            rows.Select(x => x.VoucherNo).Distinct().ToList();

        List<CheckReconciliationsEntity> cheques =
            await _context
                .Set<CheckReconciliationsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        numbers.Contains(x.SourceVoucherNo)
                        ||
                        numbers.Contains(x.ClearingVoucherNo)
                        ||
                        numbers.Contains(x.DishonourVoucherNo)
                )
                .ToListAsync();

        foreach (VoucherEntriesEntity row in rows)
        {
            string reference =
                string.Empty;

            string status =
                string.Empty;

            if
            (
                row.VoucherType == ReceiptVoucher
                &&
                payments.TryGetValue($"{row.VoucherId}\u001f{row.LedgerCode}", out ReceiptVoucherPaymentsEntity? payment)
            )
            {
                string checkNo =
                    Clean(payment.CheckNo);

                reference =
                    checkNo.Length > 0
                        ? checkNo
                        : Clean(payment.TransactionRef);

                if
                (
                    checkNo.Length > 0
                )
                {
                    status =
                        Clean(payment.CheckStatus);
                }
            }

            CheckReconciliationsEntity? cheque =
                cheques.FirstOrDefault(x => x.ClearingVoucherNo == row.VoucherNo)
                ?? cheques.FirstOrDefault(x => x.DishonourVoucherNo == row.VoucherNo)
                ?? cheques.FirstOrDefault
                (
                    x =>
                        x.SourceVoucherNo == row.VoucherNo
                        &&
                        (x.AccountLedgerCode == row.LedgerCode || x.DepositLedgerCode == row.LedgerCode)
                );

            if
            (
                cheque != null
            )
            {
                if
                (
                    Clean(cheque.CheckNo).Length > 0
                )
                {
                    reference =
                        Clean(cheque.CheckNo);
                }

                status =
                    cheque.ClearingVoucherNo == row.VoucherNo
                        ? "Cleared"
                        : cheque.DishonourVoucherNo == row.VoucherNo
                            ? "Dishonoured"
                            : Clean(cheque.Status);
            }

            if
            (
                reference.Length == 0
            )
            {
                reference =
                    Clean(row.ReferenceNo);
            }

            // A reversing line carries no cheque status
            if
            (
                row.IsReversal
            )
            {
                status =
                    string.Empty;
            }

            result[EntryKey(row)] = (reference, status);
        }

        return result;
    }


    //===========================================================
    // Party names (suppliers and customers, by code)
    //===========================================================

    private static string PartyName
    (
        Dictionary<string, string> parties,
        string? type,
        string? code
    )
    {
        string partyCode =
            Clean(code);

        if
        (
            partyCode.Length == 0
        )
        {
            return string.Empty;
        }

        string name =
            parties.GetValueOrDefault(Key(Clean(type), partyCode), string.Empty);

        return name.Length > 0
            ? $"{name} ({partyCode})"
            : partyCode;
    }


    private async Task<Dictionary<string, string>> PartyNamesAsync
    (
        List<VoucherEntriesEntity> lines
    )
    {
        Dictionary<string, string> names =
            new();

        List<string> suppliers =
            lines
                .Where(x => x.PartyType == PartySupplier && x.PartyCode.Length > 0)
                .Select(x => x.PartyCode)
                .Distinct()
                .ToList();

        List<string> customers =
            lines
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
