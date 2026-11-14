//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.AccountsFinance.FinancialStatements;
using AppCore.Infrastructure.Persistence;

using VoucherEntriesEntity =
    AppCore.Domain.Platform.Accounting.VoucherEntries;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.AccountsFinance.FinancialStatements;


//===============================================================
// Financial flows repository (read only)
//
// Cash flows (Receipt & Payment Account, Cash Flow Statement)
//   Cash and cash equivalents : every Cash, Bank, MFS, POS and
//   EMI ledger (LedgerType of the posted line).
//   Each voucher of the period that touches one of them :
//     money in  = Σ cash lines Dr - Cr  (per ledger, netted)
//     transfers = what moved between two cash ledgers on the
//                 same voucher (in = out; shown as contra)
//     the net in / out is shared over the OTHER side's ledgers
//     of the voucher in proportion to their amounts : money in
//     comes from the credited ledgers, money out goes to the
//     debited ledgers. A voucher with no such ledger goes to
//     "No contra ledger" (never expected).
//   Opening / closing : the Trial Balance of the same period, so
//   Opening + Receipts - Payments = Closing.
//   Activity of a contra ledger (group-name words, owner
//   2026-11-14) :
//     financing : equity / capital classes; loan, borrow, lease,
//                 debenture groups
//     investing : asset classes with fixed asset, property,
//                 plant, equipment, machinery, vehicle,
//                 furniture, fixture, building, land, investment
//                 groups
//     operating : everything else
//
// Changes in Equity
//   Equity ledgers (the Balance Sheet's equity section), credit
//   side positive. The profit / loss sits in Retained Earnings
//   (owner, 2026-11-14) : its opening holds the earlier years and
//   this year's result before From; the period's result is its
//   own column. Checked against the Balance Sheet at To.
//===============================================================

public class FinancialFlowsRepository
    : IFinancialFlowsRepository
{
    private readonly AppDbContext _context;

    private readonly ITrialBalanceRepository _trialBalance;


    //===========================================================
    // Constants
    //===========================================================

    private const string DateFormat = "yyyy-MM-dd";

    // Cash and cash equivalents (upper case)
    private static readonly string[] MoneyTypes =
    {
        "CASH",
        "BANK",
        "MFS",
        "POS",
        "EMI"
    };

    private static readonly string[] FinancingWords =
    {
        "loan",
        "borrow",
        "lease",
        "debenture"
    };

    private static readonly string[] InvestingWords =
    {
        "fixed asset",
        "property",
        "plant",
        "equipment",
        "machinery",
        "vehicle",
        "furniture",
        "fixture",
        "building",
        "land",
        "investment"
    };


    public FinancialFlowsRepository(
        AppDbContext context,
        ITrialBalanceRepository trialBalance)
    {
        _context = context;

        _trialBalance = trialBalance;
    }


    //===========================================================
    // Helpers
    //===========================================================

    private static string DateText(DateOnly date) =>
        date.ToString(DateFormat, CultureInfo.InvariantCulture);


    private static DateOnly ParseDate(string text) =>
        DateOnly.ParseExact(text, DateFormat, CultureInfo.InvariantCulture);


    private static decimal Money(decimal value) =>
        Math.Round(value, 2, MidpointRounding.AwayFromZero);


    private static string Clean(string? value) =>
        (value ?? string.Empty).Trim();


    private static bool Has
    (
        string? text,
        IEnumerable<string> words
    )
    {
        string value =
            Clean(text);

        return value.Length > 0
            && words.Any(word => value.Contains(word, StringComparison.OrdinalIgnoreCase));
    }


    private static bool IsMoney(string? ledgerType) =>
        MoneyTypes.Contains(Clean(ledgerType).ToUpperInvariant());


    // Branch ids of the report (the Trial Balance has already
    // checked the allotment)
    private async Task<List<long>> BranchIdsAsync
    (
        long userId,
        long branchId
    )
    {
        List<TrialBalanceBranchDto> allotted =
            await _trialBalance.GetBranchesAsync(userId);

        return branchId == 0
            ? allotted.Select(x => x.Id).ToList()
            : allotted.Where(x => x.Id == branchId).Select(x => x.Id).ToList();
    }


    // Lines up to To in the branches, without cancelled vouchers
    // (reversed on or before To) when hidden : the Trial Balance
    // rule
    private async Task<IQueryable<VoucherEntriesEntity>> LinesAsync
    (
        List<long> branchIds,
        DateOnly end,
        bool showCancelled
    )
    {
        IQueryable<VoucherEntriesEntity> lines =
            _context
                .Set<VoucherEntriesEntity>()
                .AsNoTracking()
                .Where(x => branchIds.Contains(x.BranchId) && x.VoucherDate <= end);

        if (!showCancelled)
        {
            List<string> cancelled =
                await lines
                    .Where(x => x.IsReversal)
                    .Select(x => x.VoucherNo)
                    .Distinct()
                    .ToListAsync();

            if (cancelled.Count > 0)
            {
                lines =
                    lines.Where(x => !cancelled.Contains(x.VoucherNo));
            }
        }

        return lines;
    }


    // Activity of a contra ledger
    private static string ActivityOf
    (
        TrialBalanceRowDto? row
    )
    {
        if (row == null)
        {
            return FinancialFlowActivities.Operating;
        }

        if (row.IsRetainedEarnings || Has(row.ClassName, new[] { "equity", "capital" }))
        {
            return FinancialFlowActivities.Financing;
        }

        string groups =
            $"{row.GroupName} {row.SubGroupName}";

        if (Has(groups, FinancingWords))
        {
            return FinancialFlowActivities.Financing;
        }

        if (Has(row.ClassName, new[] { "asset" }) && Has(groups, InvestingWords))
        {
            return FinancialFlowActivities.Investing;
        }

        return FinancialFlowActivities.Operating;
    }


    // The Balance Sheet's equity section (same rule as
    // FinalAccountsRepository)
    private static bool IsEquity
    (
        TrialBalanceRowDto row
    )
    {
        if (row.IsNominal)
        {
            return false;
        }

        if (row.IsRetainedEarnings)
        {
            return true;
        }

        string code =
            Clean(row.ClassCode).ToUpperInvariant();

        if (code.StartsWith("INV-") || code.StartsWith("WIP-"))
        {
            return false;
        }

        return Has(row.ClassName, new[] { "equity", "capital", "reserve" });
    }


    //===========================================================
    // Cash flows
    //===========================================================

    public async Task<CashFlowsDto> GetCashFlowsAsync
    (
        long userId,
        string? from,
        string? to,
        long branchId,
        bool showCancelled
    )
    {
        // Checks the branch, fixes the period, gives the chart and
        // the cash ledgers' opening / closing
        TrialBalanceDto tb =
            await _trialBalance.GetTrialBalanceAsync(
                userId,
                from,
                to,
                branchId,
                showCancelled);

        DateOnly start =
            ParseDate(tb.From);

        DateOnly end =
            ParseDate(tb.To);

        List<long> branchIds =
            await BranchIdsAsync(userId, branchId);

        Dictionary<string, TrialBalanceRowDto> chart =
            tb.Rows
                .Where(x => Clean(x.LedgerCode).Length > 0)
                .GroupBy(x => Clean(x.LedgerCode), StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        //=======================================================
        // Lines of the period's vouchers that move money
        //=======================================================

        IQueryable<VoucherEntriesEntity> lines =
            await LinesAsync(branchIds, end, showCancelled);

        IQueryable<VoucherEntriesEntity> period =
            lines.Where(x => x.VoucherDate >= start);

        IQueryable<string> moneyVouchers =
            period
                .Where(x => MoneyTypes.Contains(x.LedgerType.ToUpper()))
                .Select(x => x.VoucherNo)
                .Distinct();

        var entries =
            await period
                .Where(x => moneyVouchers.Contains(x.VoucherNo))
                .Select
                (
                    x =>
                        new
                        {
                            x.VoucherNo,
                            x.LedgerCode,
                            x.LedgerName,
                            x.LedgerType,
                            x.Debit,
                            x.Credit
                        }
                )
                .ToListAsync();

        //=======================================================
        // Share each voucher's money in / out over its contra
        // ledgers
        //=======================================================

        Dictionary<string, CashFlowRowDto> flows =
            new(StringComparer.OrdinalIgnoreCase);

        Dictionary<string, decimal> received =
            new(StringComparer.OrdinalIgnoreCase);

        Dictionary<string, decimal> paid =
            new(StringComparer.OrdinalIgnoreCase);

        decimal transfers = 0m;

        const string NoContra = "";

        CashFlowRowDto FlowOf(string code, string name, string type)
        {
            if (flows.TryGetValue(code, out CashFlowRowDto? flow))
            {
                return flow;
            }

            chart.TryGetValue(code, out TrialBalanceRowDto? row);

            flow =
                code == NoContra
                    ? new CashFlowRowDto
                    {
                        LedgerCode = string.Empty,
                        LedgerName = "No contra ledger on the voucher",
                        ClassName = "Not in the chart",
                        IsActive = true
                    }
                    : new CashFlowRowDto
                    {
                        LedgerCode = row?.LedgerCode ?? code,
                        LedgerName = row?.LedgerName ?? (Clean(name).Length > 0 ? Clean(name) : code),
                        LedgerType = row?.LedgerType ?? Clean(type),
                        ClassCode = row?.ClassCode ?? string.Empty,
                        ClassName = row?.ClassName ?? "Not in the chart",
                        GroupCode = row?.GroupCode ?? string.Empty,
                        GroupName = row?.GroupName ?? string.Empty,
                        SubGroupCode = row?.SubGroupCode ?? string.Empty,
                        SubGroupName = row?.SubGroupName ?? string.Empty,
                        IsActive = row?.IsActive ?? false,
                        Activity = ActivityOf(row)
                    };

            flows[code] = flow;

            received[code] = 0m;

            paid[code] = 0m;

            return flow;
        }

        foreach (var voucher in entries.GroupBy(x => x.VoucherNo))
        {
            // Net per ledger on this voucher (Dr positive)
            var ledgers =
                voucher
                    .GroupBy(x => Clean(x.LedgerCode), StringComparer.OrdinalIgnoreCase)
                    .Select
                    (
                        g =>
                            new
                            {
                                Code = g.Key,
                                Name = g.Max(x => x.LedgerName) ?? string.Empty,
                                Type = g.Max(x => x.LedgerType) ?? string.Empty,
                                Money = g.Any(x => IsMoney(x.LedgerType)),
                                Net = g.Sum(x => x.Debit - x.Credit)
                            }
                    )
                    .ToList();

            decimal moneyIn =
                ledgers.Where(x => x.Money && x.Net > 0).Sum(x => x.Net);

            decimal moneyOut =
                ledgers.Where(x => x.Money && x.Net < 0).Sum(x => -x.Net);

            transfers += Math.Min(moneyIn, moneyOut);

            decimal net =
                moneyIn - moneyOut;

            if (Math.Abs(net) < 0.005m)
            {
                continue;
            }

            // Money in : from the credited ledgers; money out : to
            // the debited ledgers
            var contra =
                ledgers
                    .Where(x => !x.Money && (net > 0 ? x.Net < 0 : x.Net > 0))
                    .ToList();

            decimal total =
                contra.Sum(x => Math.Abs(x.Net));

            if (total == 0m)
            {
                FlowOf(NoContra, string.Empty, string.Empty).Vouchers++;

                if (net > 0)
                {
                    received[NoContra] += net;
                }
                else
                {
                    paid[NoContra] += -net;
                }

                continue;
            }

            foreach (var item in contra)
            {
                CashFlowRowDto flow =
                    FlowOf(item.Code, item.Name, item.Type);

                flow.Vouchers++;

                decimal share =
                    Math.Abs(net) * Math.Abs(item.Net) / total;

                if (net > 0)
                {
                    received[item.Code] += share;
                }
                else
                {
                    paid[item.Code] += share;
                }
            }
        }

        foreach (KeyValuePair<string, CashFlowRowDto> pair in flows)
        {
            pair.Value.Received = Money(received[pair.Key]);

            pair.Value.Paid = Money(paid[pair.Key]);
        }

        //=======================================================
        // Cash ledgers (Trial Balance figures)
        //=======================================================

        List<CashLedgerDto> cashLedgers =
            tb.Rows
                .Where(x => IsMoney(x.LedgerType) && x.HasEntries)
                .Select
                (
                    x =>
                        new CashLedgerDto
                        {
                            LedgerCode = x.LedgerCode,
                            LedgerName = x.LedgerName,
                            LedgerType = x.LedgerType,
                            IsActive = x.IsActive,
                            Opening = x.Opening,
                            Received = x.Debit,
                            Paid = x.Credit,
                            Closing = x.Closing
                        }
                )
                .Where(x => x.Opening != 0m || x.Received != 0m || x.Paid != 0m || x.Closing != 0m)
                .OrderBy(x => Array.IndexOf(MoneyTypes, Clean(x.LedgerType).ToUpperInvariant()))
                .ThenBy(x => x.LedgerName)
                .ToList();

        CashFlowsDto result =
            new()
            {
                From = tb.From,
                To = tb.To,
                BranchId = branchId,
                BranchName = tb.BranchName,
                ShowCancelled = showCancelled,
                CashLedgers = cashLedgers,
                Rows =
                    flows.Values
                        .Where(x => x.Received != 0m || x.Paid != 0m)
                        .OrderBy(x => x.ClassCode.Length == 0 ? 1 : 0)
                        .ThenBy(x => x.ClassCode)
                        .ThenBy(x => x.GroupCode)
                        .ThenBy(x => x.SubGroupCode)
                        .ThenBy(x => x.LedgerCode)
                        .ToList(),
                Transfers = Money(transfers),
                Opening = Money(cashLedgers.Sum(x => x.Opening)),
                Closing = Money(cashLedgers.Sum(x => x.Closing))
            };

        result.Receipts = Money(result.Rows.Sum(x => x.Received));

        result.Payments = Money(result.Rows.Sum(x => x.Paid));

        result.Difference =
            Money(result.Opening + result.Receipts - result.Payments - result.Closing);

        if (cashLedgers.Count == 0)
        {
            result.Message =
                "No cash, bank, MFS, POS or EMI ledger has a balance or a movement for this period and branch.";
        }
        else if (Math.Abs(result.Difference) >= 0.05m)
        {
            result.Message =
                "Some money could not be traced to a contra ledger (difference shown). Check the vouchers of the period.";
        }

        return result;
    }


    //===========================================================
    // Changes in Equity
    //===========================================================

    public async Task<ChangesInEquityDto> GetChangesInEquityAsync
    (
        long userId,
        string? from,
        string? to,
        long branchId,
        bool showCancelled
    )
    {
        TrialBalanceDto tb =
            await _trialBalance.GetTrialBalanceAsync(
                userId,
                from,
                to,
                branchId,
                showCancelled);

        // Balance Sheet at To (the check)
        TrialBalanceDto atEnd =
            await _trialBalance.GetTrialBalanceAsync(
                userId,
                tb.To,
                tb.To,
                branchId,
                showCancelled);

        // Income - expense of this year before From / in the
        // period (credit = profit)
        decimal profitBefore =
            -tb.Rows.Where(x => x.IsNominal).Sum(x => x.Opening);

        decimal profitPeriod =
            -tb.Rows.Where(x => x.IsNominal).Sum(x => x.Debit - x.Credit);

        List<EquityLedgerDto> ledgers =
            new();

        bool hasRetained = false;

        foreach (TrialBalanceRowDto row in tb.Rows)
        {
            if (!IsEquity(row) || (!row.HasEntries && !row.IsRetainedEarnings))
            {
                continue;
            }

            EquityLedgerDto ledger =
                new()
                {
                    LedgerCode = row.LedgerCode,
                    LedgerName = row.LedgerName,
                    GroupCode = row.GroupCode,
                    GroupName = Clean(row.GroupName).Length > 0 ? Clean(row.GroupName) : row.ClassName,
                    SubGroupCode = row.SubGroupCode,
                    SubGroupName = row.SubGroupName,
                    IsActive = row.IsActive,
                    IsRetainedEarnings = row.IsRetainedEarnings,
                    Opening = -row.Opening,
                    Added = row.Credit,
                    Withdrawn = row.Debit
                };

            if (row.IsRetainedEarnings && !hasRetained)
            {
                hasRetained = true;

                ledger.Opening += profitBefore;

                ledger.Profit = profitPeriod;
            }

            ledgers.Add(ledger);
        }

        // Retained Earnings not set : the result on its own line
        if (!hasRetained)
        {
            ledgers.Add(
                new EquityLedgerDto
                {
                    LedgerCode = string.Empty,
                    LedgerName = "Profit & Loss (Retained Earnings not set)",
                    GroupName = "Retained Earnings",
                    IsActive = true,
                    IsRetainedEarnings = true,
                    Opening = profitBefore,
                    Profit = profitPeriod
                });
        }

        foreach (EquityLedgerDto ledger in ledgers)
        {
            ledger.Opening = Money(ledger.Opening);

            ledger.Profit = Money(ledger.Profit);

            ledger.Added = Money(ledger.Added);

            ledger.Withdrawn = Money(ledger.Withdrawn);

            ledger.Closing =
                Money(ledger.Opening + ledger.Profit + ledger.Added - ledger.Withdrawn);
        }

        decimal balanceSheetEquity =
            Money(
                -atEnd.Rows.Where(IsEquity).Sum(x => x.Closing)
                - atEnd.Rows.Where(x => x.IsNominal).Sum(x => x.Closing));

        ChangesInEquityDto result =
            new()
            {
                From = tb.From,
                To = tb.To,
                BranchId = branchId,
                BranchName = tb.BranchName,
                ShowCancelled = showCancelled,
                YearStart = tb.YearStart,
                RetainedEarningsCode = tb.RetainedEarningsCode,
                RetainedEarningsName = tb.RetainedEarningsName,
                Message = tb.Message,
                Ledgers =
                    ledgers
                        .OrderBy(x => x.GroupCode.Length == 0 ? 1 : 0)
                        .ThenBy(x => x.GroupCode)
                        .ThenBy(x => x.SubGroupCode)
                        .ThenBy(x => x.LedgerCode)
                        .ToList(),
                Opening = Money(ledgers.Sum(x => x.Opening)),
                Profit = Money(ledgers.Sum(x => x.Profit)),
                Added = Money(ledgers.Sum(x => x.Added)),
                Withdrawn = Money(ledgers.Sum(x => x.Withdrawn)),
                BalanceSheetEquity = balanceSheetEquity
            };

        result.Closing =
            Money(result.Opening + result.Profit + result.Added - result.Withdrawn);

        result.Difference =
            Money(result.Closing - result.BalanceSheetEquity);

        if (Math.Abs(result.Difference) >= 0.005m && tb.YearStart != atEnd.YearStart)
        {
            result.Message =
                string.Join(
                    " ",
                    new[]
                    {
                        result.Message,
                        "The period runs across two financial years : the result of the earlier year moves into Retained Earnings at the year start, so check the closing against the Balance Sheet of each year."
                    }
                    .Where(x => !string.IsNullOrWhiteSpace(x)));
        }

        return result;
    }
}
