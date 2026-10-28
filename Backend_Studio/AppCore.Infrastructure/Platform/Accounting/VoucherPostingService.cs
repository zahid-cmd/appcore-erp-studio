//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Platform.Accounting;

using AppCore.Domain.Platform.Accounting;

using AppCore.Infrastructure.Persistence;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.Accounting;


//===============================================================
// Voucher Posting Service
//
// The ONLY code that writes VoucherEntries. Every voucher page
// (RV, PV, JV, FT) and every reconciliation (RRV, RRP) posts
// through here.
//
// Post   : checks, then writes one row per line.
// Branch : every row carries a branch. A line on a money
//          account that belongs to ONE other branch (Cash / Bank
//          / MFS / POS / EMI with Branch Exclusive) is posted to
//          that branch; every other line to the voucher's branch.
//          When a group then touches more than one branch, an
//          Inter-Branch Current Account line is added per branch
//          so each branch's own books balance (company total of
//          that ledger stays 0) :
//            A (from) : Dr Inter-Branch, Cr A's cash
//            B (to)   : Dr B's bank,     Cr Inter-Branch
// Reverse: adds the same rows with debit / credit swapped
//          (IsReversal = true), dated the cancel date.
//
// Runs in the caller's transaction when there is one (so the
// header status change and the entries commit together),
// otherwise in its own.
//===============================================================

public class VoucherPostingService : IVoucherPostingService
{
    //===========================================================
    // Constants
    //===========================================================

    private const int NarrationMaxLength = 500;

    private const int ReferenceMaxLength = 100;

    // numeric(18,2)
    private const decimal MaxAmount = 9_999_999_999_999_999.99m;

    // Inter-Branch Current Account (General Ledger, by code)
    private const string InterBranchLedgerCode =
        "GLR-002-002-010-00001";


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IVoucherNumberService _numberService;

    private readonly IVoucherLedgerRepository _ledgerRepository;


    //===========================================================
    // Constructor
    //===========================================================

    public VoucherPostingService(
        AppDbContext context,
        IVoucherNumberService numberService,
        IVoucherLedgerRepository ledgerRepository)
    {
        _context = context;

        _numberService = numberService;

        _ledgerRepository = ledgerRepository;
    }


    //===========================================================
    // Is Posted
    //===========================================================

    public async Task<bool>
        IsPostedAsync
        (
            string voucherNo
        )
    {
        string number =
            (voucherNo ?? string.Empty).Trim();

        return await _context
            .Set<VoucherEntries>()
            .AsNoTracking()
            .AnyAsync
            (
                x =>
                    x.VoucherNo == number
                    &&
                    !x.IsReversal
            );
    }


    //===========================================================
    // Post
    //===========================================================

    public async Task
        PostAsync
        (
            VoucherPostingRequest request,
            long userId
        )
    {
        if (request == null)
        {
            throw new ArgumentNullException(
                nameof(request));
        }

        //=======================================================
        // Voucher
        //=======================================================

        string type =
            (request.VoucherType ?? string.Empty).Trim().ToUpperInvariant();

        if (!VoucherTypes.IsValid(type))
        {
            throw new InvalidOperationException(
                $"Unknown voucher type '{request.VoucherType}'.");
        }

        string voucherNo =
            (request.VoucherNo ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(voucherNo))
        {
            throw new InvalidOperationException(
                "Voucher number is required for posting.");
        }

        if (request.VoucherId <= 0)
        {
            throw new InvalidOperationException(
                "Voucher id is required for posting.");
        }

        if (await IsPostedAsync(voucherNo))
        {
            throw new InvalidOperationException(
                $"Voucher {voucherNo} is already posted.");
        }

        //=======================================================
        // Period (branch + open financial year)
        //=======================================================

        VoucherPeriodDto period =
            await _numberService.ResolvePeriodAsync(
                request.BranchId,
                request.VoucherDate);

        // The number must belong to this type, branch and month
        string expectedStart =
            $"{type}-{period.BranchDigits}-{period.FinancialYearCode}-{period.PeriodMonth:D2}-";

        if (!voucherNo.StartsWith(expectedStart, StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"Voucher number {voucherNo} does not match the voucher type, branch and date (expected {expectedStart}nnnnn). Save the voucher again to renumber it.");
        }

        //=======================================================
        // Lines
        //=======================================================

        List<VoucherPostingLine> lines =
            (request.Lines ?? new List<VoucherPostingLine>())
                .ToList();

        if (lines.Count < 2)
        {
            throw new InvalidOperationException(
                "A voucher needs at least one debit and one credit line.");
        }

        for (int i = 0; i < lines.Count; i++)
        {
            VoucherPostingLine line =
                lines[i];

            int lineNo =
                i + 1;

            if (string.IsNullOrWhiteSpace(line.LedgerCode))
            {
                throw new InvalidOperationException(
                    $"Line {lineNo} has no ledger.");
            }

            if (line.Debit < 0 || line.Credit < 0)
            {
                throw new InvalidOperationException(
                    $"Line {lineNo} has a negative amount.");
            }

            if ((line.Debit > 0) == (line.Credit > 0))
            {
                throw new InvalidOperationException(
                    $"Line {lineNo} must have either a debit or a credit amount (not both, not none).");
            }

            if (decimal.Round(line.Debit, 2) != line.Debit
                ||
                decimal.Round(line.Credit, 2) != line.Credit)
            {
                throw new InvalidOperationException(
                    $"Line {lineNo} has more than 2 decimal places.");
            }

            if (line.Debit > MaxAmount || line.Credit > MaxAmount)
            {
                throw new InvalidOperationException(
                    $"Line {lineNo} amount is too large.");
            }

            if (line.GroupNo < 1)
            {
                throw new InvalidOperationException(
                    $"Line {lineNo} has an invalid group number.");
            }
        }

        //=======================================================
        // Balance : the voucher and every group
        //=======================================================

        decimal totalDebit =
            lines.Sum(x => x.Debit);

        decimal totalCredit =
            lines.Sum(x => x.Credit);

        if (totalDebit != totalCredit)
        {
            throw new InvalidOperationException(
                $"Voucher {voucherNo} is not balanced (debit {totalDebit:N2}, credit {totalCredit:N2}).");
        }

        foreach (IGrouping<int, VoucherPostingLine> group in lines.GroupBy(x => x.GroupNo))
        {
            decimal groupDebit =
                group.Sum(x => x.Debit);

            decimal groupCredit =
                group.Sum(x => x.Credit);

            if (groupDebit != groupCredit)
            {
                throw new InvalidOperationException(
                    $"Group {group.Key} of voucher {voucherNo} is not balanced (debit {groupDebit:N2}, credit {groupCredit:N2}).");
            }
        }

        //=======================================================
        // Ledgers : must exist and be active
        //=======================================================

        Dictionary<string, VoucherLedgerDto> ledgers =
            await _ledgerRepository.GetByCodesAsync(
                lines.Select(x => x.LedgerCode));

        foreach (VoucherPostingLine line in lines)
        {
            string code =
                line.LedgerCode.Trim();

            if (!ledgers.TryGetValue(code, out VoucherLedgerDto? ledger))
            {
                throw new InvalidOperationException(
                    $"Ledger '{code}' was not found.");
            }

            if (!ledger.IsActive)
            {
                throw new InvalidOperationException(
                    $"Ledger '{ledger.LedgerCode} - {ledger.LedgerName}' is inactive.");
            }
        }

        //=======================================================
        // Branch of every line (see the class notes)
        //=======================================================

        List<PostingRow> rows =
            await ResolveBranchesAsync(
                lines,
                ledgers,
                period);

        //=======================================================
        // Write
        //=======================================================

        DateTime now =
            DateTime.UtcNow;

        string defaultNarration =
            Limit(request.Narration, NarrationMaxLength);

        List<VoucherEntries> entries =
            rows
                .Select
                (
                    (row, index) =>
                    {
                        VoucherPostingLine line =
                            row.Line;

                        VoucherLedgerDto ledger =
                            row.Ledger;

                        string narration =
                            string.IsNullOrWhiteSpace(line.Narration)
                                ? defaultNarration
                                : Limit(line.Narration, NarrationMaxLength);

                        return new VoucherEntries
                        {
                            VoucherType = type,

                            VoucherId = request.VoucherId,

                            VoucherNo = voucherNo,

                            VoucherDate = request.VoucherDate,

                            FinancialYearId = period.FinancialYearId,

                            BranchId = row.BranchId,

                            BranchCode = row.BranchCode,

                            GroupNo = line.GroupNo,

                            LineNo = index + 1,

                            LedgerCode = ledger.LedgerCode,

                            LedgerName = ledger.LedgerName,

                            LedgerType = ledger.LedgerType,

                            Debit = line.Debit,

                            Credit = line.Credit,

                            Narration = narration,

                            // The line's own party, else the voucher's
                            PartyType = Limit(
                                string.IsNullOrWhiteSpace(line.PartyCode)
                                    ? request.PartyType
                                    : line.PartyType,
                                30),

                            PartyCode = Limit(
                                string.IsNullOrWhiteSpace(line.PartyCode)
                                    ? request.PartyCode
                                    : line.PartyCode,
                                40),

                            ReferenceNo = Limit(request.ReferenceNo, ReferenceMaxLength),

                            IsReversal = false,

                            ReversalReason = string.Empty,

                            PostedBy = userId,

                            PostedDate = now
                        };
                    }
                )
                .ToList();

        await SaveAsync(entries);
    }


    //===========================================================
    // Posting Row : a line with its ledger and branch
    //===========================================================

    private sealed class PostingRow
    {
        public VoucherPostingLine Line { get; init; } = new();

        public VoucherLedgerDto Ledger { get; init; } = new();

        public long BranchId { get; init; }

        public string BranchCode { get; init; } = string.Empty;
    }


    //===========================================================
    // Resolve Branches
    //
    // 1. Each line : the branch of its money account when that
    //    account is exclusive to another branch, else the
    //    voucher's branch.
    // 2. Each group : per branch, debit - credit must net to 0;
    //    an Inter-Branch Current Account line is added for the
    //    difference (debit when the branch gave, credit when it
    //    received). The group and the voucher stay balanced
    //    because the differences of a group add up to 0.
    //===========================================================

    private async Task<List<PostingRow>>
        ResolveBranchesAsync
        (
            List<VoucherPostingLine> lines,
            Dictionary<string, VoucherLedgerDto> ledgers,
            VoucherPeriodDto period
        )
    {
        // Other branches named on exclusive money accounts
        string voucherBranchKey =
            (period.BranchName ?? string.Empty).Trim().ToUpperInvariant();

        HashSet<string> otherNames =
            new(StringComparer.OrdinalIgnoreCase);

        foreach (VoucherPostingLine line in lines)
        {
            VoucherLedgerDto ledger =
                ledgers[line.LedgerCode.Trim()];

            string accountBranch =
                (ledger.Branch ?? string.Empty).Trim();

            if (ledger.IsMoneyLedger
                &&
                ledger.BranchExclusive
                &&
                accountBranch.Length > 0
                &&
                accountBranch.ToUpperInvariant() != voucherBranchKey)
            {
                otherNames.Add(accountBranch);
            }
        }

        List<PostingRow> rows =
            new();

        if (otherNames.Count == 0)
        {
            // Usual case : everything on the voucher's branch
            foreach (VoucherPostingLine line in lines)
            {
                rows.Add(
                    new PostingRow
                    {
                        Line = line,
                        Ledger = ledgers[line.LedgerCode.Trim()],
                        BranchId = period.BranchId,
                        BranchCode = period.BranchCode
                    });
            }

            return rows;
        }

        List<string> wanted =
            otherNames
                .Select(x => x.ToUpper())
                .ToList();

        List<BranchesEntity> branches =
            await _context
                .Set<BranchesEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        wanted.Contains(x.BranchName.Trim().ToUpper())
                )
                .ToListAsync();

        Dictionary<string, BranchesEntity> byName =
            new(StringComparer.OrdinalIgnoreCase);

        foreach (BranchesEntity branch in branches)
        {
            byName.TryAdd(
                (branch.BranchName ?? string.Empty).Trim(),
                branch);
        }

        foreach (VoucherPostingLine line in lines)
        {
            VoucherLedgerDto ledger =
                ledgers[line.LedgerCode.Trim()];

            string accountBranch =
                (ledger.Branch ?? string.Empty).Trim();

            bool other =
                ledger.IsMoneyLedger
                &&
                ledger.BranchExclusive
                &&
                otherNames.Contains(accountBranch);

            if (!other)
            {
                rows.Add(
                    new PostingRow
                    {
                        Line = line,
                        Ledger = ledger,
                        BranchId = period.BranchId,
                        BranchCode = period.BranchCode
                    });

                continue;
            }

            if (!byName.TryGetValue(accountBranch, out BranchesEntity? branch))
            {
                throw new InvalidOperationException(
                    $"'{ledger.LedgerName}' belongs to branch '{accountBranch}', which was not found.");
            }

            rows.Add(
                new PostingRow
                {
                    Line = line,
                    Ledger = ledger,
                    BranchId = branch.BranchId,
                    BranchCode = branch.BranchCode ?? string.Empty
                });
        }

        // Inter-Branch Current Account lines
        Dictionary<string, VoucherLedgerDto> interBranch =
            await _ledgerRepository.GetByCodesAsync(
                new[] { InterBranchLedgerCode });

        if (!interBranch.TryGetValue(InterBranchLedgerCode, out VoucherLedgerDto? interLedger))
        {
            throw new InvalidOperationException(
                $"This voucher moves money between branches, but the Inter-Branch Current Account ({InterBranchLedgerCode}) was not found.");
        }

        if (!interLedger.IsActive)
        {
            throw new InvalidOperationException(
                $"The Inter-Branch Current Account ({InterBranchLedgerCode}) is inactive.");
        }

        Dictionary<long, string> branchNames =
            new()
            {
                [period.BranchId] = period.BranchName
            };

        foreach (BranchesEntity branch in branches)
        {
            branchNames.TryAdd(
                branch.BranchId,
                branch.BranchName ?? string.Empty);
        }

        List<PostingRow> interRows =
            new();

        foreach (IGrouping<int, PostingRow> group in rows.GroupBy(x => x.Line.GroupNo))
        {
            var nets =
                group
                    .GroupBy(x => new { x.BranchId, x.BranchCode })
                    .Select
                    (
                        x =>
                            new
                            {
                                x.Key.BranchId,
                                x.Key.BranchCode,
                                Net = x.Sum(r => r.Line.Debit - r.Line.Credit)
                            }
                    )
                    .Where(x => x.Net != 0)
                    .ToList();

            if (nets.Count == 0)
            {
                continue;
            }

            foreach (var net in nets)
            {
                string others =
                    string.Join(
                        ", ",
                        nets
                            .Where(x => x.BranchId != net.BranchId)
                            .Select(x => branchNames.TryGetValue(x.BranchId, out string? name) ? name : x.BranchCode));

                interRows.Add(
                    new PostingRow
                    {
                        Line =
                            new VoucherPostingLine
                            {
                                GroupNo = group.Key,

                                LedgerCode = interLedger.LedgerCode,

                                // Received more than it gave → owes the
                                // other branch (credit); gave → is owed (debit)
                                Debit = net.Net < 0 ? -net.Net : 0,

                                Credit = net.Net > 0 ? net.Net : 0,

                                Narration = Limit($"Inter-branch with {others}", NarrationMaxLength)
                            },

                        Ledger = interLedger,

                        BranchId = net.BranchId,

                        BranchCode = net.BranchCode
                    });
            }
        }

        rows.AddRange(interRows);

        return rows;
    }



    //===========================================================
    // Reverse (cancel a posted voucher)
    //===========================================================

    public async Task
        ReverseAsync
        (
            string voucherNo,
            DateOnly cancelDate,
            string reason,
            long userId
        )
    {
        string number =
            (voucherNo ?? string.Empty).Trim();

        string why =
            (reason ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(why))
        {
            throw new InvalidOperationException(
                "A reason is required to cancel a posted voucher.");
        }

        List<VoucherEntries> original =
            await _context
                .Set<VoucherEntries>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.VoucherNo == number
                        &&
                        !x.IsReversal
                )
                .OrderBy(x => x.LineNo)
                .ToListAsync();

        if (original.Count == 0)
        {
            throw new InvalidOperationException(
                $"Voucher {number} is not posted, so there is nothing to reverse.");
        }

        bool alreadyReversed =
            await _context
                .Set<VoucherEntries>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        x.VoucherNo == number
                        &&
                        x.IsReversal
                );

        if (alreadyReversed)
        {
            throw new InvalidOperationException(
                $"Voucher {number} is already cancelled.");
        }

        if (cancelDate < original[0].VoucherDate)
        {
            throw new InvalidOperationException(
                $"The cancel date cannot be before the voucher date ({original[0].VoucherDate:dd-MMM-yyyy}).");
        }

        // The cancel date must be in an open financial year
        VoucherPeriodDto period =
            await _numberService.ResolvePeriodAsync(
                original[0].BranchId,
                cancelDate);

        DateTime now =
            DateTime.UtcNow;

        string reversalNarration =
            Limit($"Cancelled : {why}", NarrationMaxLength);

        List<VoucherEntries> reversal =
            original
                .Select
                (
                    x =>
                        new VoucherEntries
                        {
                            VoucherType = x.VoucherType,

                            VoucherId = x.VoucherId,

                            VoucherNo = x.VoucherNo,

                            VoucherDate = cancelDate,

                            FinancialYearId = period.FinancialYearId,

                            BranchId = x.BranchId,

                            BranchCode = x.BranchCode,

                            GroupNo = x.GroupNo,

                            LineNo = x.LineNo,

                            LedgerCode = x.LedgerCode,

                            LedgerName = x.LedgerName,

                            LedgerType = x.LedgerType,

                            // swapped
                            Debit = x.Credit,

                            Credit = x.Debit,

                            Narration = reversalNarration,

                            PartyType = x.PartyType,

                            PartyCode = x.PartyCode,

                            ReferenceNo = x.ReferenceNo,

                            IsReversal = true,

                            ReversalReason = Limit(why, NarrationMaxLength),

                            PostedBy = userId,

                            PostedDate = now
                        }
                )
                .ToList();

        await SaveAsync(reversal);
    }


    //===========================================================
    // Save (caller's transaction, or our own)
    //===========================================================

    private async Task
        SaveAsync
        (
            List<VoucherEntries> entries
        )
    {
        IDbContextTransaction? ownTransaction =
            _context.Database.CurrentTransaction == null
                ? await _context.Database.BeginTransactionAsync()
                : null;

        try
        {
            _context
                .Set<VoucherEntries>()
                .AddRange(entries);

            await _context.SaveChangesAsync();

            if (ownTransaction != null)
            {
                await ownTransaction.CommitAsync();
            }
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is Npgsql.PostgresException { SqlState: "23505" })
        {
            await FailAsync(entries, ownTransaction);

            // UX_VoucherEntries_VoucherNo_Line : posted / reversed
            // at the same moment by another request
            throw new InvalidOperationException(
                $"Voucher {entries[0].VoucherNo} was already posted or cancelled by another user.");
        }
        catch
        {
            await FailAsync(entries, ownTransaction);

            throw;
        }
        finally
        {
            if (ownTransaction != null)
            {
                await ownTransaction.DisposeAsync();
            }
        }
    }


    //===========================================================
    // Fail : roll back our own transaction and stop the failed
    // rows being saved by a later SaveChanges of the request
    //===========================================================

    private async Task
        FailAsync
        (
            List<VoucherEntries> entries,
            IDbContextTransaction? ownTransaction
        )
    {
        foreach (VoucherEntries entry in entries)
        {
            _context.Entry(entry).State =
                EntityState.Detached;
        }

        if (ownTransaction != null)
        {
            await ownTransaction.RollbackAsync();
        }
    }


    //===========================================================
    // Limit text length
    //===========================================================

    private static string Limit
    (
        string? value,
        int maxLength
    )
    {
        string text =
            (value ?? string.Empty).Trim();

        return text.Length <= maxLength
            ? text
            : text.Substring(0, maxLength);
    }
}