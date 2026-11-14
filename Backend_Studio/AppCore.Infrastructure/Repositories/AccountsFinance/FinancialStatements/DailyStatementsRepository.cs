//===============================================================
// Namespaces
//===============================================================

using System.Globalization;
using System.Text.RegularExpressions;

using Microsoft.EntityFrameworkCore;

using AppCore.Application.AccountsFinance.FinancialStatements;
using AppCore.Domain.Entities.SalesOperations.Shared;
using AppCore.Infrastructure.Persistence;

using VoucherEntriesEntity =
    AppCore.Domain.Platform.Accounting.VoucherEntries;

using UserProfileEntity =
    AppCore.Domain.Entities.SecurityPermission.UserManagement.UserProfile;

using SalesInvoicesMbEntity =
    AppCore.Domain.Entities.SalesOperations.MotorBikeSales.SalesInvoicesMb;

using SalesInvoicesMbLinesEntity =
    AppCore.Domain.Entities.SalesOperations.MotorBikeSales.SalesInvoicesMbLines;

using SalesInvoicesSpEntity =
    AppCore.Domain.Entities.SalesOperations.SparePartsLubricantSales.SalesInvoicesSp;

using SalesInvoicesSpLinesEntity =
    AppCore.Domain.Entities.SalesOperations.SparePartsLubricantSales.SalesInvoicesSpLines;

using SalesInvoicesAcEntity =
    AppCore.Domain.Entities.SalesOperations.AccessoriesSales.SalesInvoicesAc;

using SalesInvoicesAcLinesEntity =
    AppCore.Domain.Entities.SalesOperations.AccessoriesSales.SalesInvoicesAcLines;

using ProductCategoryEntity =
    AppCore.Domain.Entities.Settings.ProductSettings.ProductCategory;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.AccountsFinance.FinancialStatements;


//===============================================================
// Daily statements repository (read only)
//
// Daily Collection Statement
//   Every voucher of the period that touches a Cash / Bank / MFS
//   / POS / EMI ledger (LedgerType of the posted line) :
//     money in (net of what moved between two cash ledgers on the
//     same voucher) = a collection, split by the cash ledgers it
//     went to (Cash / Bank / MFS / POS / EMI columns);
//     money out to a customer ledger or a sales ledger, or on a
//     sales return = a refund (negative); other payments are not
//     collections and are left out.
//   Document : the voucher's reference (a sales invoice's receipt
//   carries the invoice number), else the voucher; its letters
//   give the kind (SIMB = Sales Invoice - MB, RV = Receipt Voucher
//   ...). Business line : MB / SP / AC from the document, else the
//   sales class of the other side (service); else "customer" when
//   the money came from a customer ledger with no invoice (due /
//   advance), else "other" (loan, capital, interest ...).
//   Collected by : the user who posted the voucher (owner
//   2026-11-14).
//
// Invoice-wise Daily Profit & Loss
//   Posted sales invoices (SIMB / SISP / SIAC) and sales returns
//   (SRMB / SRSP / SRAC) of the period; the figures come from the
//   document's own journal (the invoice number is its voucher
//   number), so they agree with the Profit & Loss :
//     sales = sales classes; discount = expense ledgers on it;
//     other = other-income ledgers on it; cost = COGS (FIFO).
//   Customer, sales person and lines from the documents.
//   Later non-money vouchers under the invoice number (ReferenceNo :
//   free accessories' Promotional Expenses, registration reversal)
//   are added to the invoice's figures.
//   Checks : the Profit & Loss sales / COGS by business line of the
//   same period, so the page can show whether the invoices explain
//   them (sales posted by a Journal Voucher would not).
//
// Cancelled vouchers : left out (Trial Balance rule) unless shown.
//===============================================================

public class DailyStatementsRepository
    : IDailyStatementsRepository
{
    private readonly AppDbContext _context;

    private readonly ITrialBalanceRepository _trialBalance;


    //===========================================================
    // Constants
    //===========================================================

    private const string DateFormat = "yyyy-MM-dd";

    private const string LineBikes = "mb";

    private const string LineParts = "sp";

    private const string LineAccessories = "ac";

    private const string LineService = "service";

    private const string LineOther = "other";

    // Money from a customer ledger with no invoice behind it (due
    // collection, advance by Receipt Voucher) : owner 2026-11-14
    private const string LineCustomer = "customer";

    private const string Sales = "sales";

    private const string Cogs = "cogs";

    private const string OtherIncome = "other-income";

    private const string Expense = "expense";

    private static readonly string[] MoneyTypes =
    {
        "CASH",
        "BANK",
        "MFS",
        "POS",
        "EMI"
    };

    private static readonly string[] InvoiceTypes =
    {
        "SIMB",
        "SISP",
        "SIAC",
        "SRMB",
        "SRSP",
        "SRAC"
    };

    private static readonly Dictionary<string, string> DocumentNames =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["SIMB"] = "Sales Invoice - MB",
            ["SISP"] = "Sales Invoice - SP",
            ["SIAC"] = "Sales Invoice - AC",
            ["SRMB"] = "Sales Return - MB",
            ["SRSP"] = "Sales Return - SP",
            ["SRAC"] = "Sales Return - AC",
            ["RV"] = "Receipt Voucher",
            ["PV"] = "Payment Voucher",
            ["JV"] = "Journal Voucher",
            ["FT"] = "Fund Transfer",
            ["RRV"] = "Reconciliation",
            ["RRP"] = "Reconciliation"
        };

    private static readonly Regex Letters =
        new("^[A-Za-z]+", RegexOptions.Compiled);


    public DailyStatementsRepository(
        AppDbContext context,
        ITrialBalanceRepository trialBalance)
    {
        _context = context;

        _trialBalance = trialBalance;
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


    private static bool Has
    (
        string? text,
        params string[] words
    )
    {
        string value =
            Clean(text);

        return value.Length > 0
            && words.Any(word => value.Contains(word, StringComparison.OrdinalIgnoreCase));
    }


    private static bool IsMoney(string? ledgerType) =>
        MoneyTypes.Contains(Clean(ledgerType).ToUpperInvariant());


    // Empty = today; From after To = swapped
    private static (DateOnly From, DateOnly To) Period
    (
        string? from,
        string? to
    )
    {
        DateOnly today =
            Today();

        DateOnly start =
            ParseDate(from) ?? today;

        DateOnly end =
            ParseDate(to) ?? today;

        return start <= end
            ? (start, end)
            : (end, start);
    }


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


    // Lines of the period without cancelled vouchers (reversed on
    // or before To) when hidden : the Trial Balance rule
    private async Task<IQueryable<VoucherEntriesEntity>> PeriodLinesAsync
    (
        List<long> branchIds,
        DateOnly start,
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

        return lines.Where(x => x.VoucherDate >= start);
    }


    // Business line from a name
    private static string LineOf
    (
        params string?[] texts
    )
    {
        foreach (string? value in texts)
        {
            string text =
                Clean(value);

            if (text.Length == 0)
            {
                continue;
            }

            if (Has(text, "accessor"))
            {
                return LineAccessories;
            }

            if (Has(text, "spare", "lubric", "part"))
            {
                return LineParts;
            }

            if (Has(text, "service"))
            {
                return LineService;
            }

            if (Has(text, "bike", "motor"))
            {
                return LineBikes;
            }
        }

        return string.Empty;
    }


    // Letters of a document number : "SIMB-0101-..." -> SIMB
    private static string PrefixOf
    (
        string? number
    )
    {
        Match match =
            Letters.Match(Clean(number));

        return match.Success
            ? match.Value.ToUpperInvariant()
            : string.Empty;
    }


    // MB / SP / AC from a sales document prefix ("" = none)
    private static string LineOfPrefix
    (
        string prefix
    ) =>
        prefix.Length == 4 && (prefix.StartsWith("SI") || prefix.StartsWith("SR"))
            ? prefix[2..] switch
            {
                "MB" => LineBikes,
                "SP" => LineParts,
                "AC" => LineAccessories,
                _ => string.Empty
            }
            : string.Empty;


    // Same section rule as the Profit & Loss
    private static string SectionOf
    (
        TrialBalanceRowDto? row
    )
    {
        if (row == null || !row.IsNominal)
        {
            return string.Empty;
        }

        string code =
            Clean(row.ClassCode).ToUpperInvariant();

        if (code.StartsWith("COGS-") || Has(row.ClassName, "cost of"))
        {
            return Cogs;
        }

        if (Has(row.ClassName, "income", "revenue", "sale"))
        {
            return Has(row.ClassName, "other") ? OtherIncome : Sales;
        }

        return Expense;
    }


    private static Dictionary<string, TrialBalanceRowDto> ChartOf
    (
        TrialBalanceDto tb
    ) =>
        tb.Rows
            .Where(x => Clean(x.LedgerCode).Length > 0)
            .GroupBy(x => Clean(x.LedgerCode), StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);


    //===========================================================
    // Daily Collection
    //===========================================================

    public async Task<DailyCollectionDto> GetDailyCollectionAsync
    (
        long userId,
        string? from,
        string? to,
        long branchId,
        bool showCancelled
    )
    {
        (DateOnly start, DateOnly end) =
            Period(from, to);

        // Branch check + chart (sales classes of the other side)
        TrialBalanceDto tb =
            await _trialBalance.GetTrialBalanceAsync(
                userId,
                DateText(start),
                DateText(end),
                branchId,
                showCancelled);

        Dictionary<string, TrialBalanceRowDto> chart =
            ChartOf(tb);

        List<long> branchIds =
            await BranchIdsAsync(userId, branchId);

        IQueryable<VoucherEntriesEntity> period =
            await PeriodLinesAsync(branchIds, start, end, showCancelled);

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
                            x.VoucherType,
                            x.VoucherDate,
                            x.ReferenceNo,
                            x.LedgerCode,
                            x.LedgerName,
                            x.LedgerType,
                            x.Debit,
                            x.Credit,
                            x.Narration,
                            x.PostedBy,
                            x.PostedDate
                        }
                )
                .ToListAsync();

        List<DailyCollectionRowDto> rows =
            new();

        foreach (var voucher in entries.GroupBy(x => x.VoucherNo))
        {
            var first =
                voucher.First();

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
                                Type = Clean(g.Max(x => x.LedgerType)),
                                Money = g.Any(x => IsMoney(x.LedgerType)),
                                Net = g.Sum(x => x.Debit - x.Credit)
                            }
                    )
                    .ToList();

            decimal moneyIn =
                ledgers.Where(x => x.Money && x.Net > 0).Sum(x => x.Net);

            decimal moneyOut =
                ledgers.Where(x => x.Money && x.Net < 0).Sum(x => -x.Net);

            decimal net =
                moneyIn - moneyOut;

            if (Math.Abs(net) < 0.005m)
            {
                continue;
            }

            string reference =
                Clean(first.ReferenceNo);

            string documentNo =
                reference.Length > 0 ? reference : Clean(first.VoucherNo);

            string prefix =
                PrefixOf(documentNo);

            if (prefix.Length == 0)
            {
                prefix = Clean(first.VoucherType).ToUpperInvariant();
            }

            // The other side : credited ledgers (money in) or
            // debited ledgers (money out)
            var contra =
                ledgers
                    .Where(x => !x.Money && (net > 0 ? x.Net < 0 : x.Net > 0))
                    .ToList();

            decimal amount;

            bool refund =
                net < 0;

            if (refund)
            {
                // Only what went back to a customer or a sales
                // ledger, or on a sales return
                bool isReturn =
                    prefix.StartsWith("SR") || Clean(first.VoucherType).ToUpperInvariant().StartsWith("SR");

                decimal contraTotal =
                    contra.Sum(x => x.Net);

                decimal customerPart =
                    contra
                        .Where
                        (
                            x =>
                                isReturn
                                || string.Equals(x.Type, "Customer", StringComparison.OrdinalIgnoreCase)
                                || SectionOf(chart.GetValueOrDefault(x.Code)) == Sales
                        )
                        .Sum(x => x.Net);

                if (customerPart <= 0m || contraTotal <= 0m)
                {
                    continue;
                }

                // Negative : money paid back
                amount =
                    net * customerPart / contraTotal;
            }
            else
            {
                amount = net;
            }

            // Split over the cash ledgers that moved the money
            var accounts =
                ledgers
                    .Where(x => x.Money && (refund ? x.Net < 0 : x.Net > 0))
                    .ToList();

            decimal accountTotal =
                accounts.Sum(x => Math.Abs(x.Net));

            DailyCollectionRowDto row =
                new()
                {
                    Date = DateText(first.VoucherDate),
                    Time = first.PostedDate == default
                        ? string.Empty
                        : first.PostedDate.AddHours(6).ToString("HH:mm", CultureInfo.InvariantCulture),
                    VoucherNo = first.VoucherNo,
                    VoucherType = Clean(first.VoucherType),
                    DocumentNo = documentNo,
                    DocumentType = DocumentNames.GetValueOrDefault(prefix) ?? prefix,
                    Narration = voucher.Select(x => Clean(x.Narration)).FirstOrDefault(x => x.Length > 0) ?? string.Empty,
                    Accounts = string.Join(", ", accounts.Select(x => Clean(x.Name)).Where(x => x.Length > 0).Distinct()),
                    IsRefund = refund,
                    CollectedById = first.PostedBy
                };

            foreach (var account in accounts)
            {
                decimal share =
                    accountTotal == 0m
                        ? 0m
                        : amount * Math.Abs(account.Net) / accountTotal;

                switch (account.Type.ToUpperInvariant())
                {
                    case "CASH": row.Cash += share; break;
                    case "BANK": row.Bank += share; break;
                    case "MFS": row.Mfs += share; break;
                    case "POS": row.Pos += share; break;
                    case "EMI": row.Emi += share; break;
                }
            }

            row.Cash = Money(row.Cash);
            row.Bank = Money(row.Bank);
            row.Mfs = Money(row.Mfs);
            row.Pos = Money(row.Pos);
            row.Emi = Money(row.Emi);
            row.Total = Money(row.Cash + row.Bank + row.Mfs + row.Pos + row.Emi);

            // Customer : a customer ledger on the other side, else
            // the largest other-side ledger
            var customer =
                contra.FirstOrDefault(x => string.Equals(x.Type, "Customer", StringComparison.OrdinalIgnoreCase))
                ?? contra.OrderByDescending(x => Math.Abs(x.Net)).FirstOrDefault();

            row.Customer = Clean(customer?.Name);

            // Business line : the document, else the other side's
            // sales class
            string line =
                LineOfPrefix(prefix);

            if (line.Length == 0)
            {
                foreach (var item in contra.OrderByDescending(x => Math.Abs(x.Net)))
                {
                    TrialBalanceRowDto? chartRow =
                        chart.GetValueOrDefault(item.Code);

                    if (SectionOf(chartRow) == Sales || Has(chartRow?.ClassName, "service"))
                    {
                        line = LineOf(chartRow?.ClassName, chartRow?.GroupName, item.Name);

                        if (line.Length > 0)
                        {
                            break;
                        }
                    }
                }
            }

            // No line : a customer's own money (due / advance with no
            // invoice) or any other money in (loan, capital, interest)
            if (line.Length == 0)
            {
                line =
                    contra.Any(x => string.Equals(x.Type, "Customer", StringComparison.OrdinalIgnoreCase))
                        ? LineCustomer
                        : LineOther;
            }

            row.Line = line;

            if (row.Total != 0m)
            {
                rows.Add(row);
            }
        }

        //=======================================================
        // Users (collected by)
        //=======================================================

        List<long> userIds =
            rows.Select(x => x.CollectedById).Distinct().ToList();

        var users =
            await _context
                .Set<UserProfileEntity>()
                .AsNoTracking()
                .Where(x => userIds.Contains(x.UserProfileId))
                .Select(x => new { x.UserProfileId, x.FullName, x.DisplayName, x.UserName })
                .ToListAsync();

        Dictionary<long, string> names =
            users.ToDictionary(
                x => x.UserProfileId,
                x => Clean(x.FullName).Length > 0 ? Clean(x.FullName)
                    : Clean(x.DisplayName).Length > 0 ? Clean(x.DisplayName)
                    : Clean(x.UserName));

        foreach (DailyCollectionRowDto row in rows)
        {
            row.CollectedBy =
                names.GetValueOrDefault(row.CollectedById) ?? (row.CollectedById == 0 ? "System" : $"User {row.CollectedById}");
        }

        return new DailyCollectionDto
        {
            From = DateText(start),
            To = DateText(end),
            BranchId = branchId,
            BranchName = tb.BranchName,
            ShowCancelled = showCancelled,
            Users =
                rows
                    .GroupBy(x => x.CollectedById)
                    .Select(g => new DailyCollectionUserDto { Id = g.Key, Name = g.First().CollectedBy })
                    .OrderBy(x => x.Name)
                    .ToList(),
            Rows =
                rows
                    .OrderBy(x => x.Date)
                    .ThenBy(x => x.Time)
                    .ThenBy(x => x.VoucherNo)
                    .ToList()
        };
    }


    //===========================================================
    // Invoice-wise Daily Profit & Loss
    //===========================================================

    public async Task<InvoiceProfitDto> GetInvoiceProfitAsync
    (
        long userId,
        string? from,
        string? to,
        long branchId,
        bool showCancelled
    )
    {
        (DateOnly start, DateOnly end) =
            Period(from, to);

        TrialBalanceDto tb =
            await _trialBalance.GetTrialBalanceAsync(
                userId,
                DateText(start),
                DateText(end),
                branchId,
                showCancelled);

        Dictionary<string, TrialBalanceRowDto> chart =
            ChartOf(tb);

        List<long> branchIds =
            await BranchIdsAsync(userId, branchId);

        IQueryable<VoucherEntriesEntity> period =
            await PeriodLinesAsync(branchIds, start, end, showCancelled);

        var entries =
            await period
                .Where(x => InvoiceTypes.Contains(x.VoucherType.ToUpper()))
                .Select
                (
                    x =>
                        new
                        {
                            x.VoucherNo,
                            x.VoucherType,
                            x.VoucherDate,
                            x.ReferenceNo,
                            x.LedgerCode,
                            x.LedgerName,
                            x.LedgerType,
                            x.Debit,
                            x.Credit
                        }
                )
                .ToListAsync();

        List<InvoiceProfitRowDto> rows =
            new();

        foreach (var voucher in entries.GroupBy(x => x.VoucherNo))
        {
            var first =
                voucher.First();

            string type =
                Clean(first.VoucherType).ToUpperInvariant();

            InvoiceProfitRowDto row =
                new()
                {
                    Line = LineOfPrefix(type),
                    Kind = type.StartsWith("SR") ? "return" : "invoice",
                    Date = DateText(voucher.Min(x => x.VoucherDate)),
                    DocumentNo = first.VoucherNo,
                    InvoiceNo = type.StartsWith("SR") ? Clean(first.ReferenceNo) : first.VoucherNo,
                    Customer =
                        Clean(
                            voucher
                                .FirstOrDefault(x => string.Equals(Clean(x.LedgerType), "Customer", StringComparison.OrdinalIgnoreCase))
                                ?.LedgerName)
                };

            foreach (var line in voucher)
            {
                string section =
                    SectionOf(chart.GetValueOrDefault(Clean(line.LedgerCode)));

                decimal debit =
                    line.Debit - line.Credit;

                switch (section)
                {
                    case Sales: row.Sales -= debit; break;
                    case OtherIncome: row.Other -= debit; break;
                    case Expense: row.Discount += debit; break;
                    case Cogs: row.Cost += debit; break;
                }
            }

            row.Sales = Money(row.Sales);
            row.Other = Money(row.Other);
            row.Discount = Money(row.Discount);
            row.Cost = Money(row.Cost);
            row.NetSales = Money(row.Sales - row.Discount + row.Other);
            row.Profit = Money(row.NetSales - row.Cost);

            rows.Add(row);
        }

        //=======================================================
        // Other vouchers under an invoice's number (ReferenceNo) :
        // later postings that belong to the sale (e.g. free
        // accessories given with a bike : Dr Promotional Expenses,
        // a registration reversal). Receipts (money) are left out.
        //=======================================================

        Dictionary<string, InvoiceProfitRowDto> invoices =
            rows
                .Where(x => x.Kind == "invoice")
                .GroupBy(x => x.DocumentNo, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        if (invoices.Count > 0)
        {
            List<string> numbers =
                invoices.Keys.ToList();

            var linked =
                await period
                    .Where
                    (
                        x =>
                            numbers.Contains(x.ReferenceNo)
                            && !InvoiceTypes.Contains(x.VoucherType.ToUpper())
                    )
                    .Select
                    (
                        x =>
                            new
                            {
                                x.VoucherNo,
                                x.ReferenceNo,
                                x.LedgerCode,
                                x.LedgerType,
                                x.Debit,
                                x.Credit
                            }
                    )
                    .ToListAsync();

            foreach (var voucher in linked.GroupBy(x => x.VoucherNo))
            {
                // A receipt / payment of the invoice : not part of
                // its profit
                if (voucher.Any(x => IsMoney(x.LedgerType)))
                {
                    continue;
                }

                if (!invoices.TryGetValue(Clean(voucher.First().ReferenceNo), out InvoiceProfitRowDto? row))
                {
                    continue;
                }

                row.LinkedVouchers++;

                foreach (var line in voucher)
                {
                    decimal debit =
                        line.Debit - line.Credit;

                    switch (SectionOf(chart.GetValueOrDefault(Clean(line.LedgerCode))))
                    {
                        case Sales: row.Sales -= debit; break;
                        case OtherIncome: row.Other -= debit; break;
                        case Expense: row.Discount += debit; break;
                        case Cogs: row.Cost += debit; break;
                    }
                }

                row.Sales = Money(row.Sales);
                row.Other = Money(row.Other);
                row.Discount = Money(row.Discount);
                row.Cost = Money(row.Cost);
                row.NetSales = Money(row.Sales - row.Discount + row.Other);
                row.Profit = Money(row.NetSales - row.Cost);
            }
        }

        //=======================================================
        // Documents : customer, sales person, lines
        //=======================================================

        await InvoiceDetailsAsync<SalesInvoicesMbEntity, SalesInvoicesMbLinesEntity>(rows, LineBikes, true);

        await InvoiceDetailsAsync<SalesInvoicesSpEntity, SalesInvoicesSpLinesEntity>(rows, LineParts, false);

        await InvoiceDetailsAsync<SalesInvoicesAcEntity, SalesInvoicesAcLinesEntity>(rows, LineAccessories, false);

        await ReturnDetailsAsync(rows);

        return new InvoiceProfitDto
        {
            From = DateText(start),
            To = DateText(end),
            BranchId = branchId,
            BranchName = tb.BranchName,
            ShowCancelled = showCancelled,
            Checks = await ProfitLossLinesAsync(tb),
            Rows =
                rows
                    .OrderBy(x => x.Date)
                    .ThenBy(x => x.Kind)
                    .ThenBy(x => x.DocumentNo)
                    .ToList()
        };
    }


    // The Profit & Loss "Gross profit by business line" of the same
    // period (same rule as FinalAccountsRepository) : the check
    // line of the Invoice-wise page
    private async Task<List<InvoiceProfitCheckDto>> ProfitLossLinesAsync
    (
        TrialBalanceDto tb
    )
    {
        var categories =
            await _context
                .Set<ProductCategoryEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => new { x.CogsGroupCode, x.CategoryType })
                .ToListAsync();

        Dictionary<string, string> cogsLines =
            new(StringComparer.OrdinalIgnoreCase);

        foreach (var category in categories)
        {
            string code =
                Clean(category.CogsGroupCode);

            string line =
                LineOf(category.CategoryType);

            if (code.Length > 0 && line.Length > 0 && !cogsLines.ContainsKey(code))
            {
                cogsLines[code] = line;
            }
        }

        Dictionary<string, InvoiceProfitCheckDto> checks =
            new[] { LineBikes, LineParts, LineAccessories }
                .ToDictionary(x => x, x => new InvoiceProfitCheckDto { Line = x });

        foreach (TrialBalanceRowDto row in tb.Rows.Where(x => x.IsNominal))
        {
            string section =
                SectionOf(row);

            if (section == Sales)
            {
                string line =
                    LineOf(row.ClassName, row.GroupName, row.SubGroupName, row.LedgerName);

                if (checks.TryGetValue(line, out InvoiceProfitCheckDto? check))
                {
                    check.Sales += row.Credit - row.Debit;
                }
            }
            else if (section == Cogs)
            {
                string line =
                    cogsLines.GetValueOrDefault(Clean(row.GroupCode))
                    ?? cogsLines.GetValueOrDefault(Clean(row.SubGroupCode))
                    ?? LineOf(row.GroupName, row.SubGroupName, row.LedgerName);

                if (checks.TryGetValue(line, out InvoiceProfitCheckDto? check))
                {
                    check.Cost += row.Debit - row.Credit;
                }
            }
        }

        foreach (InvoiceProfitCheckDto check in checks.Values)
        {
            check.Sales = Money(check.Sales);

            check.Cost = Money(check.Cost);
        }

        return checks.Values.ToList();
    }


    private async Task InvoiceDetailsAsync<THeader, TLine>
    (
        List<InvoiceProfitRowDto> rows,
        string line,
        bool bikes
    )
        where THeader : SalesInvoiceHeader
        where TLine : SalesInvoiceLine
    {
        List<InvoiceProfitRowDto> own =
            rows.Where(x => x.Line == line && x.Kind == "invoice").ToList();

        if (own.Count == 0)
        {
            return;
        }

        List<string> numbers =
            own.Select(x => x.DocumentNo).Distinct().ToList();

        var heads =
            await _context
                .Set<THeader>()
                .AsNoTracking()
                .Where(x => numbers.Contains(x.InvoiceNo))
                .Select(x => new { x.SalesInvoiceId, x.InvoiceNo, x.CustomerName, x.SalesPersonName, x.TotalQuantity })
                .ToListAsync();

        List<long> ids =
            heads.Select(x => x.SalesInvoiceId).ToList();

        var lines =
            await _context
                .Set<TLine>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.SalesInvoiceId))
                .Select
                (
                    x =>
                        new
                        {
                            x.SalesInvoiceLineId,
                            x.SalesInvoiceId,
                            x.LineNo,
                            x.ProductCode,
                            x.ProductName,
                            x.Quantity,
                            x.UnitPrice,
                            x.GrossAmount,
                            Discount = x.CampaignMembershipAmount + x.SpecialAmount + x.FractionalShare,
                            x.LineTotal,
                            x.VatInside,
                            x.CostAmount
                        }
                )
                .ToListAsync();

        // MB : chassis / engine / colour of each line
        Dictionary<long, (string Chassis, string Detail)> bikesOf =
            new();

        if (bikes)
        {
            List<long> lineIds =
                lines.Select(x => x.SalesInvoiceLineId).ToList();

            var units =
                await _context
                    .Set<SalesInvoicesMbLinesEntity>()
                    .AsNoTracking()
                    .Where(x => lineIds.Contains(x.SalesInvoiceLineId))
                    .Select(x => new { x.SalesInvoiceLineId, x.ChassisNo, x.EngineNo, x.ColorName })
                    .ToListAsync();

            foreach (var unit in units)
            {
                bikesOf[unit.SalesInvoiceLineId] =
                (
                    Clean(unit.ChassisNo),
                    string.Join(" · ", new[] { Clean(unit.EngineNo), Clean(unit.ColorName) }.Where(x => x.Length > 0))
                );
            }
        }

        foreach (InvoiceProfitRowDto row in own)
        {
            var head =
                heads.FirstOrDefault(x => string.Equals(x.InvoiceNo, row.DocumentNo, StringComparison.OrdinalIgnoreCase));

            if (head == null)
            {
                continue;
            }

            if (Clean(head.CustomerName).Length > 0)
            {
                row.Customer = Clean(head.CustomerName);
            }

            row.SalesPerson = Clean(head.SalesPersonName);

            row.Quantity = head.TotalQuantity;

            row.Lines =
                lines
                    .Where(x => x.SalesInvoiceId == head.SalesInvoiceId)
                    .OrderBy(x => x.LineNo)
                    .Select
                    (
                        x =>
                        {
                            (string Chassis, string Detail) bike =
                                bikesOf.GetValueOrDefault(x.SalesInvoiceLineId);

                            decimal net =
                                Money(x.LineTotal - x.VatInside);

                            return new InvoiceProfitLineDto
                            {
                                LineNo = x.LineNo,
                                ProductCode = x.ProductCode,
                                ProductName = x.ProductName,
                                ChassisNo = bike.Chassis ?? string.Empty,
                                Detail = bike.Detail ?? string.Empty,
                                Quantity = x.Quantity,
                                UnitPrice = x.UnitPrice,
                                Gross = x.GrossAmount,
                                Discount = Money(x.Discount),
                                Net = net,
                                UnitCost = x.Quantity == 0m ? 0m : Money(x.CostAmount / x.Quantity),
                                Cost = Money(x.CostAmount),
                                Profit = Money(net - x.CostAmount)
                            };
                        }
                    )
                    .ToList();

            row.Chassis =
                string.Join(", ", row.Lines.Select(x => x.ChassisNo).Where(x => x.Length > 0));
        }
    }


    private async Task ReturnDetailsAsync
    (
        List<InvoiceProfitRowDto> rows
    )
    {
        List<InvoiceProfitRowDto> own =
            rows.Where(x => x.Kind == "return").ToList();

        if (own.Count == 0)
        {
            return;
        }

        List<string> numbers =
            own.Select(x => x.DocumentNo).Distinct().ToList();

        var heads =
            await _context
                .Set<SalesReturns>()
                .AsNoTracking()
                .Where(x => numbers.Contains(x.ReturnNo))
                .Select(x => new { x.SalesReturnId, x.ReturnNo, x.SalesInvoiceNo, x.CustomerName, x.TotalQuantity })
                .ToListAsync();

        List<long> ids =
            heads.Select(x => x.SalesReturnId).ToList();

        var lines =
            await _context
                .Set<SalesReturnLines>()
                .AsNoTracking()
                .Where(x => ids.Contains(x.SalesReturnId))
                .Select
                (
                    x =>
                        new
                        {
                            x.SalesReturnId,
                            x.LineNo,
                            x.ProductCode,
                            x.ProductName,
                            x.ChassisNo,
                            x.EngineNo,
                            x.ColorName,
                            x.Quantity,
                            x.UnitPrice,
                            x.GrossAmount,
                            Discount = x.CampaignMembershipAmount + x.SpecialAmount + x.FractionalShare,
                            x.LineTotal,
                            x.VatInside,
                            x.CostAmount
                        }
                )
                .ToListAsync();

        foreach (InvoiceProfitRowDto row in own)
        {
            var head =
                heads.FirstOrDefault(x => string.Equals(x.ReturnNo, row.DocumentNo, StringComparison.OrdinalIgnoreCase));

            if (head == null)
            {
                continue;
            }

            row.InvoiceNo = Clean(head.SalesInvoiceNo);

            if (Clean(head.CustomerName).Length > 0)
            {
                row.Customer = Clean(head.CustomerName);
            }

            row.Quantity = -head.TotalQuantity;

            // A return takes the figures back : negative
            row.Lines =
                lines
                    .Where(x => x.SalesReturnId == head.SalesReturnId)
                    .OrderBy(x => x.LineNo)
                    .Select
                    (
                        x =>
                        {
                            decimal net =
                                Money(x.LineTotal - x.VatInside);

                            return new InvoiceProfitLineDto
                            {
                                LineNo = x.LineNo,
                                ProductCode = x.ProductCode,
                                ProductName = x.ProductName,
                                ChassisNo = Clean(x.ChassisNo),
                                Detail = string.Join(" · ", new[] { Clean(x.EngineNo), Clean(x.ColorName) }.Where(v => v.Length > 0)),
                                Quantity = -x.Quantity,
                                UnitPrice = x.UnitPrice,
                                Gross = -x.GrossAmount,
                                Discount = -Money(x.Discount),
                                Net = -net,
                                UnitCost = x.Quantity == 0m ? 0m : Money(x.CostAmount / x.Quantity),
                                Cost = -Money(x.CostAmount),
                                Profit = -Money(net - x.CostAmount)
                            };
                        }
                    )
                    .ToList();

            row.Chassis =
                string.Join(", ", row.Lines.Select(x => x.ChassisNo).Where(x => x.Length > 0));
        }
    }
}
