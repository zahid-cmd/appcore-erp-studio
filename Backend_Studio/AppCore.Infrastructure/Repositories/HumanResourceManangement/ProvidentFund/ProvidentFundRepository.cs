//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.HumanResourceManangement.ProvidentFund;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;
using AppCore.Domain.Entities.HumanResourceManangement.PayrollManagement;
using AppCore.Domain.Entities.HumanResourceManangement.ProvidentFund;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.Accounting;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.PayrollManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.HumanResourceManangement.ProvidentFund;


//===============================================================
// Provident Fund Repository (hand-written pages, 2026-11-14;
// NEVER run Code Sync for them)
//
//   Policy       ONE row (HrPfPolicy) : contributions (employee
//                percent, company yes / no and percent, on Basic
//                or Gross), who can join, yearly interest, loans
//                and the forfeiture rules. Edited in place.
//   Members      PFM-0001 : one live membership for an employee.
//                The membership date cannot be before the date the
//                policy lets the employee join. Opening balances
//                are one ledger row (Opening).
//   Ledger       HrPfTransactions : employee part and company
//                part, + into the fund and - out of it. A posted
//                salary sheet writes the Contribution rows
//                (SalarySheetsRepository); unposting removes them.
//   Loans        PFL-0001 : no more than the policy's percent of
//                the member's own balance (other loans counted),
//                recovered from the salary by instalments. A loan
//                does not change the ledger : what is still out is
//                taken off the settlement. Interest (when the
//                policy has it) : Flat or Reducing, the terms of
//                the day stay with the loan; the interest in what
//                is recovered is income of the fund, never the
//                member's money (PlanLoan, NextInstallment).
//   Settlements  PFS-0001 : payment / cancellation / forfeiture.
//                The company part is decided by the policy
//                (Settle) :
//                  misconduct              nothing, whatever the
//                                          years (when switched on)
//                  death / retirement      all of it (when on)
//                  fewer years than asked  nothing
//                  otherwise               all of it
//                The member becomes Settled, the ledger gets a
//                Payment row (and a Forfeit row), open loans are
//                closed against the payment. Deleting the
//                settlement takes all of that back.
//   Interest     once a financial year (Settings > General
//                Settings > Financial Years) : rate x the balance
//                on the last day of the year (before the interest
//                of that year), employee part and company part
//                each, once the year is over.
//   Accounting   by Posting Setup, group Provident Fund (ledgers
//                chosen on Settings > Account Settings > Posting
//                Setup) :
//                  salary sheet posted (SalarySheetsRepository)
//                    Dr PF-COMPANY-CONTRIBUTION   company part
//                    Cr PF-MEMBERS-FUND           own + company
//                    Cr PF-LOAN-RECEIVABLE        loan principal
//                    Cr PF-LOAN-INTEREST-INCOME   loan interest
//                  yearly interest : one Journal Voucher a branch
//                    Dr PF-INTEREST-EXPENSE  Cr PF-MEMBERS-FUND
//                  settlement : one Journal Voucher
//                    Dr PF-MEMBERS-FUND           own + company
//                    Cr PF-FORFEITURE-INCOME      forfeited (or
//                       PF-FORFEITURE-COMPANY     when the policy
//                       gives it back to the company)
//                    Cr PF-LOAN-RECEIVABLE        loan principal
//                    Cr PF-LOAN-INTEREST-INCOME   loan interest
//                    Cr PF-SETTLEMENT-PAYABLE     net payable
//                Deleting the interest / the settlement cancels
//                its voucher. A loan paid out and a settlement
//                paid are Payment Vouchers. Opening balances post
//                nothing (opening balances of the accounts).
//===============================================================

public class ProvidentFundRepository
    : IProvidentFundRepository
{
    private const string HistoryModule = "Human Resource";

    public const string MembersEntity = "HrPfMembers";

    public const string LoansEntity = "HrPfLoans";

    public const string SettlementsEntity = "HrPfSettlements";

    public const string PolicyEntity = "HrPfPolicy";

    public const string Active = "Active";

    public const string Settled = "Settled";

    public static readonly string[] Reasons =
        { "Resignation", "Retirement", "Termination", "Misconduct", "Death", "Membership Cancelled", "Other" };

    private const string LedgerTypeGeneral = "General Ledger";

    private readonly AppDbContext _context;

    private readonly IJournalVoucherRepository _journalVouchers;

    public ProvidentFundRepository(
        AppDbContext context,
        IJournalVoucherRepository journalVouchers)
    {
        _context = context;
        _journalVouchers = journalVouchers;
    }

    // A line of a Journal Voucher on the ledger of a Posting Setup
    // purpose (nothing for no amount)
    private void Post(List<JournalVoucherLineDto> lines, string side, string purpose, decimal amount, string note)
    {
        if (amount <= 0)
        {
            return;
        }

        lines.Add(
            new JournalVoucherLineDto
            {
                Side = side,
                GroupNo = 1,
                LedgerType = LedgerTypeGeneral,
                LedgerCode = PostingLedgerCodes.Get(_context, purpose),
                Amount = amount,
                ShortNotes = note
            });
    }

    private static string Short(string? voucherNo)
    {
        string text = voucherNo ?? string.Empty;

        return text.Length > 30 ? text.Substring(0, 30) : text;
    }

    private DbSet<HrPfMembers> Members => _context.Set<HrPfMembers>();

    private DbSet<HrPfTransactions> Ledger => _context.Set<HrPfTransactions>();

    private DbSet<HrPfLoans> Loans => _context.Set<HrPfLoans>();

    private DbSet<HrPfLoanRecoveries> LoanRecoveries => _context.Set<HrPfLoanRecoveries>();

    private DbSet<HrPfSettlements> Settlements => _context.Set<HrPfSettlements>();


    //===========================================================
    // For payroll (SalarySheetsRepository)
    //===========================================================

    public static async Task<HrPfPolicy> PolicyAsync(AppDbContext context) =>
        await context.Set<HrPfPolicy>().AsNoTracking().OrderBy(x => x.PfPolicyId).FirstOrDefaultAsync()
        ?? new HrPfPolicy();

    // What came back of each loan (interest included) and the
    // interest in it : salary sheets that are not deleted, and
    // settlements
    public static async Task<Dictionary<long, (decimal Amount, decimal Interest)>> LoanRecoveredAsync(AppDbContext context, List<long>? loanIds = null)
    {
        var rows =
            await (
                from r in context.Set<HrPfLoanRecoveries>().AsNoTracking()
                where loanIds == null || loanIds.Contains(r.PfLoanId)
                join s in context.Set<HrSalarySheets>().AsNoTracking() on r.SalarySheetId equals s.SalarySheetId into sj
                from s in sj.DefaultIfEmpty()
                where r.SalarySheetId == 0 || (s != null && !s.IsDeleted)
                group r by r.PfLoanId into g
                select new { PfLoanId = g.Key, Amount = g.Sum(x => x.Amount), Interest = g.Sum(x => x.InterestAmount) })
            .ToListAsync();

        return rows.ToDictionary(x => x.PfLoanId, x => (x.Amount, x.Interest));
    }

    public const string Flat = "Flat";

    public const string Reducing = "Reducing";

    // Where a loan stands
    public sealed class LoanState
    {
        // What came back (interest included) and the interest in it
        public decimal Recovered;
        public decimal InterestPaid;

        // The principal still out
        public decimal PrincipalOut;

        // Flat : the planned interest not paid yet (0 otherwise)
        public decimal InterestOut;

        // What settling the loan today takes
        public decimal SettleDue;

        public bool Closed;
    }

    public static LoanState StateOf(HrPfLoans loan, Dictionary<long, (decimal Amount, decimal Interest)> recovered)
    {
        (decimal amount, decimal interest) =
            recovered.TryGetValue(loan.PfLoanId, out var done) ? done : (0m, 0m);

        decimal principalOut = Math.Max(0, loan.Amount - (amount - interest));

        decimal interestOut =
            loan.InterestMethod == Flat ? Math.Max(0, loan.TotalInterest - interest) : 0;

        return new LoanState
        {
            Recovered = amount,
            InterestPaid = interest,
            PrincipalOut = principalOut,
            InterestOut = interestOut,
            SettleDue = principalOut + (loan.InterestMethod == Flat && loan.EarlyFullInterest ? interestOut : 0),
            Closed = principalOut <= 0 && interestOut <= 0
        };
    }

    // The instalment a salary sheet takes : no more than the
    // instalment, what is still due and what is left of the pay.
    //   Flat      each instalment holds its share of the planned
    //             interest
    //   Reducing  the interest of the month (rate / 12 on the
    //             principal still out) first, the rest is principal
    public static (decimal Take, decimal Interest) NextInstallment(HrPfLoans loan, LoanState state, decimal left)
    {
        if (state.Closed || left <= 0)
        {
            return (0, 0);
        }

        if (loan.InterestMethod == Reducing)
        {
            decimal monthInterest =
                Math.Round(state.PrincipalOut * loan.InterestRate / 1200m, 2, MidpointRounding.AwayFromZero);

            decimal take = Math.Min(Math.Min(loan.InstallmentAmount, state.PrincipalOut + monthInterest), left);

            return (take, Math.Min(take, monthInterest));
        }

        if (loan.InterestMethod == Flat && loan.TotalInterest > 0)
        {
            decimal take = Math.Min(Math.Min(loan.InstallmentAmount, state.PrincipalOut + state.InterestOut), left);

            decimal interest =
                Math.Min(
                    state.InterestOut,
                    Math.Round(take * loan.TotalInterest / (loan.Amount + loan.TotalInterest), 2, MidpointRounding.AwayFromZero));

            // never more principal than is out : the rest is interest
            if (take - interest > state.PrincipalOut)
            {
                interest = take - state.PrincipalOut;
            }

            return (take, interest);
        }

        return (Math.Min(Math.Min(loan.InstallmentAmount, state.PrincipalOut), left), 0);
    }

    // The interest of a whole loan and its instalment, as planned
    // when the loan is given
    public static (decimal TotalInterest, decimal Installment) PlanLoan(decimal amount, int installments, decimal rate, string method)
    {
        static decimal Up(decimal value) => Math.Ceiling(value * 100m) / 100m;

        if (rate <= 0 || method.Length == 0)
        {
            return (0, Up(amount / installments));
        }

        if (method == Reducing)
        {
            double i = (double)rate / 1200d;

            decimal emi = Up((decimal)((double)amount * i / (1d - Math.Pow(1d + i, -installments))));

            return (Math.Max(0, Math.Round(emi * installments - amount, 2)), emi);
        }

        decimal interest = Math.Round(amount * rate / 100m * installments / 12m, 2, MidpointRounding.AwayFromZero);

        return (interest, Up((amount + interest) / installments));
    }

    // The contributions of a posted salary sheet go to the ledger
    public static async Task WriteSheetAsync(AppDbContext context, HrSalarySheets sheet, long userId)
    {
        DateOnly date = new DateOnly(sheet.Year, sheet.Month, 1).AddMonths(1).AddDays(-1);

        var lines =
            await (
                from l in context.Set<HrSalarySheetLines>().AsNoTracking()
                where l.SalarySheetId == sheet.SalarySheetId && (l.PfEmployee > 0 || l.PfCompany > 0)
                join m in context.Set<HrPfMembers>().AsNoTracking() on l.EmployeeId equals m.EmployeeId
                where !m.IsDeleted
                select new { l.EmployeeId, l.PfEmployee, l.PfCompany, m.PfMemberId })
            .ToListAsync();

        foreach (var line in lines)
        {
            context.Set<HrPfTransactions>().Add(
                new HrPfTransactions
                {
                    PfMemberId = line.PfMemberId,
                    EmployeeId = line.EmployeeId,
                    TxnDate = date,
                    TxnType = "Contribution",
                    EmployeeAmount = line.PfEmployee,
                    CompanyAmount = line.PfCompany,
                    SourceType = "SalarySheet",
                    SourceId = sheet.SalarySheetId,
                    Remarks = $"Salary of {date:MMM yyyy} | {sheet.Code}",
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow
                });
        }
    }

    // The salary sheet is unposted : its ledger rows go
    public static async Task RemoveSheetAsync(AppDbContext context, long salarySheetId)
    {
        DbSet<HrPfTransactions> ledger = context.Set<HrPfTransactions>();

        ledger.RemoveRange(
            await ledger.Where(x => x.SourceType == "SalarySheet" && x.SourceId == salarySheetId).ToListAsync());
    }


    //===========================================================
    // Helpers
    //===========================================================

    private static string Clean(string? value) =>
        string.Join(" ", (value ?? string.Empty).Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries));

    private static string Limited(string? value, int max, string label)
    {
        string text = Clean(value);

        if (text.Length > max)
        {
            throw new InvalidOperationException($"{label} cannot be longer than {max} characters.");
        }

        return text;
    }

    private static string NextCode(IEnumerable<string> codes, string prefix)
    {
        int highest = 0;

        foreach (string code in codes)
        {
            string value = (code ?? string.Empty).Trim();

            if (value.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value.Substring(prefix.Length), out int number)
                && number > highest)
            {
                highest = number;
            }
        }

        return $"{prefix}{highest + 1:D4}";
    }

    private static string Money(decimal value) => value.ToString("#,0.00");

    private static string Day(DateOnly date) => HrCalendar.Day(date);

    private void AddHistory(string entity, long id, string type, string title, string description, long userId)
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = entity,
                EntityId = id,
                ActivityType = type,
                ActivityTitle = title,
                ActivityDescription = description.Length > 1000 ? description.Substring(0, 1000) : description,
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });
    }

    private static PfPolicyDto ToDto(HrPfPolicy p) =>
        new()
        {
            EmployeePercent = p.EmployeePercent,
            CompanyContributes = p.CompanyContributes,
            CompanyPercent = p.CompanyPercent,
            ContributionBase = p.ContributionBase,
            EligibilityRule = p.EligibilityRule,
            EligibilityMonths = p.EligibilityMonths,
            InterestEnabled = p.InterestEnabled,
            InterestRate = p.InterestRate,
            InterestBasis = p.InterestBasis,
            LoanEnabled = p.LoanEnabled,
            LoanMaxPercent = p.LoanMaxPercent,
            LoanMaxInstallments = p.LoanMaxInstallments,
            LoanInterestEnabled = p.LoanInterestEnabled,
            LoanInterestRate = p.LoanInterestRate,
            LoanInterestMethod = p.LoanInterestMethod,
            VestingYears = p.VestingYears,
            VestingFrom = p.VestingFrom,
            ForfeitOnMisconduct = p.ForfeitOnMisconduct,
            FullOnDeathRetirement = p.FullOnDeathRetirement,
            ForfeitToCompany = p.ForfeitToCompany,
            Remarks = p.Remarks
        };

    // The balances of the members (employee part, company part)
    private async Task<Dictionary<long, (decimal Employee, decimal Company)>> BalancesAsync(List<long>? memberIds = null, DateOnly? until = null)
    {
        var rows =
            await Ledger.AsNoTracking()
                .Where(x => (memberIds == null || memberIds.Contains(x.PfMemberId)) && (until == null || x.TxnDate <= until))
                .GroupBy(x => x.PfMemberId)
                .Select(g => new { PfMemberId = g.Key, Employee = g.Sum(x => x.EmployeeAmount), Company = g.Sum(x => x.CompanyAmount) })
                .ToListAsync();

        return rows.ToDictionary(x => x.PfMemberId, x => (x.Employee, x.Company));
    }

    // What is still out of the loans of the members
    private async Task<Dictionary<long, decimal>> LoansOutAsync(List<long>? memberIds = null)
    {
        List<HrPfLoans> loans =
            await Loans.AsNoTracking()
                .Where(x => !x.IsDeleted && (memberIds == null || memberIds.Contains(x.PfMemberId)))
                .ToListAsync();

        var recovered =
            await LoanRecoveredAsync(_context, loans.Select(x => x.PfLoanId).ToList());

        return loans
            .GroupBy(x => x.PfMemberId)
            .ToDictionary(
                g => g.Key,
                g => g.Sum(l => StateOf(l, recovered).SettleDue));
    }

    // The date the policy lets an employee join the fund
    private static DateOnly EligibleFrom(HrPfPolicy policy, DateOnly joining, DateOnly? confirmation) =>
        policy.EligibilityRule == "Joining" ? joining
        : policy.EligibilityRule == "Months" ? joining.AddMonths(Math.Max(0, policy.EligibilityMonths))
        : confirmation ?? DateOnly.MaxValue;

    private static string EligibleText(HrPfPolicy policy) =>
        policy.EligibilityRule == "Joining" ? "from the joining date"
        : policy.EligibilityRule == "Months" ? $"{policy.EligibilityMonths} month(s) after joining"
        : "from the confirmation date";


    //===========================================================
    // Policy
    //===========================================================

    public async Task<PfPolicyDto> GetPolicyAsync()
    {
        PfPolicyDto dto = ToDto(await PolicyAsync(_context));

        dto.ActiveMembers = await Members.AsNoTracking().CountAsync(x => !x.IsDeleted && x.Status == Active);

        return dto;
    }

    public async Task<PfPolicyDto> SavePolicyAsync(PfPolicyDto dto, long userId)
    {
        static decimal Percent(decimal value, string label)
        {
            decimal number = Math.Round(value, 3);

            if (number < 0 || number > 100)
            {
                throw new InvalidOperationException($"{label} must be 0 to 100 percent.");
            }

            return number;
        }

        decimal employeePercent = Percent(dto.EmployeePercent, "The employee's contribution");

        if (employeePercent <= 0)
        {
            throw new InvalidOperationException("Type the employee's contribution (percent).");
        }

        decimal companyPercent = dto.CompanyContributes ? Percent(dto.CompanyPercent, "The company's contribution") : 0;

        if (dto.CompanyContributes && companyPercent <= 0)
        {
            throw new InvalidOperationException("The company contributes : type its percent (or switch it off).");
        }

        string rule =
            string.Equals(dto.EligibilityRule, "Joining", StringComparison.OrdinalIgnoreCase) ? "Joining"
            : string.Equals(dto.EligibilityRule, "Months", StringComparison.OrdinalIgnoreCase) ? "Months"
            : "Confirmation";

        if (rule == "Months" && (dto.EligibilityMonths < 1 || dto.EligibilityMonths > 120))
        {
            throw new InvalidOperationException("Months after joining must be 1 to 120.");
        }

        decimal interestRate = dto.InterestEnabled ? Percent(dto.InterestRate, "The interest rate") : 0;

        if (dto.InterestEnabled && interestRate <= 0)
        {
            throw new InvalidOperationException("Interest is on : type the yearly rate (or switch it off).");
        }

        decimal loanPercent = dto.LoanEnabled ? Percent(dto.LoanMaxPercent, "The loan limit") : 0;

        if (dto.LoanEnabled && (loanPercent <= 0 || dto.LoanMaxInstallments < 1 || dto.LoanMaxInstallments > 120))
        {
            throw new InvalidOperationException("Loans are on : type the limit (percent of the member's own balance) and the instalments (1 to 120).");
        }

        bool loanInterest = dto.LoanEnabled && dto.LoanInterestEnabled;

        decimal loanRate = loanInterest ? Percent(dto.LoanInterestRate, "The loan interest rate") : 0;

        if (loanInterest && loanRate <= 0)
        {
            throw new InvalidOperationException("Interest on loans is on : type the yearly rate (or switch it off).");
        }

        decimal years = Math.Round(dto.VestingYears, 2);

        if (years < 0 || years > 50)
        {
            throw new InvalidOperationException("The years for the company part must be 0 to 50.");
        }

        HrPfPolicy? row =
            await _context.Set<HrPfPolicy>().OrderBy(x => x.PfPolicyId).FirstOrDefaultAsync();

        if (row == null)
        {
            row = new HrPfPolicy { CreatedBy = userId, CreatedDate = DateTime.UtcNow };

            _context.Set<HrPfPolicy>().Add(row);
        }
        else
        {
            row.ModifiedBy = userId;
            row.ModifiedDate = DateTime.UtcNow;
        }

        row.EmployeePercent = employeePercent;
        row.CompanyContributes = dto.CompanyContributes;
        row.CompanyPercent = companyPercent;
        row.ContributionBase = string.Equals(dto.ContributionBase, "Gross", StringComparison.OrdinalIgnoreCase) ? "Gross" : "Basic";
        row.EligibilityRule = rule;
        row.EligibilityMonths = rule == "Months" ? dto.EligibilityMonths : 0;
        row.InterestEnabled = dto.InterestEnabled;
        row.InterestRate = interestRate;
        row.InterestBasis = string.Equals(dto.InterestBasis, "Closing", StringComparison.OrdinalIgnoreCase) ? "Closing" : "Monthly";
        row.LoanEnabled = dto.LoanEnabled;
        row.LoanMaxPercent = dto.LoanEnabled ? loanPercent : row.LoanMaxPercent;
        row.LoanMaxInstallments = dto.LoanEnabled ? dto.LoanMaxInstallments : row.LoanMaxInstallments;
        row.LoanInterestEnabled = loanInterest;
        row.LoanInterestRate = loanRate;
        row.LoanInterestMethod = string.Equals(dto.LoanInterestMethod, Reducing, StringComparison.OrdinalIgnoreCase) ? Reducing : Flat;
        row.LoanEarlyFullInterest = false;
        row.VestingYears = years;
        row.VestingFrom = string.Equals(dto.VestingFrom, "Membership", StringComparison.OrdinalIgnoreCase) ? "Membership" : "Joining";
        row.ForfeitOnMisconduct = dto.ForfeitOnMisconduct;
        row.FullOnDeathRetirement = dto.FullOnDeathRetirement;
        row.ForfeitToCompany = dto.ForfeitToCompany;
        row.Remarks = Limited(dto.Remarks, 500, "Remarks");

        await _context.SaveChangesAsync();

        AddHistory(
            PolicyEntity,
            row.PfPolicyId,
            "Update",
            "Provident Fund Policy Changed",
            $"Employee {row.EmployeePercent:0.###} %, company {(row.CompanyContributes ? row.CompanyPercent.ToString("0.###") + " %" : "none")}, on {row.ContributionBase}; join {EligibleText(row)}; interest {(row.InterestEnabled ? row.InterestRate.ToString("0.###") + " %" : "off")}; loans {(row.LoanEnabled ? "on" : "off")}{(row.LoanInterestEnabled ? $" at {row.LoanInterestRate:0.###} % {row.LoanInterestMethod}" : string.Empty)}; company part after {row.VestingYears:0.##} year(s) from {row.VestingFrom}; misconduct {(row.ForfeitOnMisconduct ? "forfeits" : "does not forfeit")}.",
            userId);

        await _context.SaveChangesAsync();

        return await GetPolicyAsync();
    }


    //===========================================================
    // Members
    //===========================================================

    private async Task<List<PfMemberDto>> ReadMembersAsync(IQueryable<HrPfMembers> source)
    {
        var rows =
            await (
                from m in source
                join e in _context.Set<HrEmployees>().AsNoTracking() on m.EmployeeId equals e.EmployeeId
                join g in _context.Set<Designation>().AsNoTracking() on e.DesignationId equals g.DesignationId into gj
                from g in gj.DefaultIfEmpty()
                orderby m.Code
                select new
                {
                    Member = m,
                    EmployeeCode = e.Code,
                    e.FullName,
                    e.JoiningDate,
                    DesignationName = g != null ? g.DesignationName : string.Empty
                })
            .ToListAsync();

        List<long> ids = rows.Select(x => x.Member.PfMemberId).ToList();

        var balances = await BalancesAsync(ids);

        Dictionary<long, decimal> loans = await LoansOutAsync(ids);

        return rows
            .Select(x => new PfMemberDto
            {
                PfMemberId = x.Member.PfMemberId,
                PublicId = x.Member.PublicId,
                Code = x.Member.Code,
                EmployeeId = x.Member.EmployeeId,
                EmployeeCode = x.EmployeeCode,
                EmployeeName = x.FullName,
                DesignationName = x.DesignationName,
                JoiningDate = Day(x.JoiningDate),
                MemberDate = Day(x.Member.MemberDate),
                OpeningEmployee = x.Member.OpeningEmployee,
                OpeningCompany = x.Member.OpeningCompany,
                NomineeName = x.Member.NomineeName,
                NomineeRelation = x.Member.NomineeRelation,
                NomineePhone = x.Member.NomineePhone,
                Status = x.Member.Status,
                Remarks = x.Member.Remarks,
                EmployeeBalance = balances.TryGetValue(x.Member.PfMemberId, out var b) ? b.Employee : 0,
                CompanyBalance = balances.TryGetValue(x.Member.PfMemberId, out var c) ? c.Company : 0,
                LoanOutstanding = loans.TryGetValue(x.Member.PfMemberId, out decimal l) ? l : 0
            })
            .ToList();
    }

    public Task<List<PfMemberDto>> GetMembersAsync() =>
        ReadMembersAsync(Members.AsNoTracking().Where(x => !x.IsDeleted));

    public async Task<PfMemberDto> GetMemberAsync(Guid publicId)
    {
        return (await ReadMembersAsync(Members.AsNoTracking().Where(x => x.PublicId == publicId && !x.IsDeleted))).FirstOrDefault()
            ?? throw new KeyNotFoundException("The provident fund member was not found.");
    }

    public async Task<PfMemberDefaultsDto> GetMemberDefaultsAsync()
    {
        HrPfPolicy policy = await PolicyAsync(_context);

        List<long> inFund =
            await Members.AsNoTracking().Where(x => !x.IsDeleted).Select(x => x.EmployeeId).ToListAsync();

        var employees =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && !inFund.Contains(x.EmployeeId))
                .OrderBy(x => x.Code)
                .Select(x => new { x.EmployeeId, x.Code, x.FullName, x.JoiningDate, x.ConfirmationDate })
                .ToListAsync();

        return new PfMemberDefaultsDto
        {
            NextCode = NextCode(await Members.AsNoTracking().Select(x => x.Code).ToListAsync(), "PFM-"),
            Policy = ToDto(policy),
            Employees =
                employees
                    .Select(x =>
                    {
                        DateOnly from = EligibleFrom(policy, x.JoiningDate, x.ConfirmationDate);

                        return new PfLookupDto
                        {
                            Id = x.EmployeeId,
                            Code = x.Code,
                            Name = x.FullName,
                            Date = from == DateOnly.MaxValue ? string.Empty : Day(from),
                            Note = from == DateOnly.MaxValue ? "Not confirmed yet" : string.Empty
                        };
                    })
                    .ToList()
        };
    }

    // Checks the form and copies it to the member
    private async Task ApplyMemberAsync(HrPfMembers entity, PfMemberDto dto, bool isNew)
    {
        HrPfPolicy policy = await PolicyAsync(_context);

        if (isNew)
        {
            var employee =
                await _context.Set<HrEmployees>().AsNoTracking()
                    .Where(x => x.EmployeeId == dto.EmployeeId && !x.IsDeleted)
                    .Select(x => new { x.EmployeeId, x.FullName, x.JoiningDate, x.ConfirmationDate })
                    .FirstOrDefaultAsync()
                ?? throw new InvalidOperationException("Pick the employee.");

            if (await Members.AsNoTracking().AnyAsync(x => x.EmployeeId == employee.EmployeeId && !x.IsDeleted))
            {
                throw new InvalidOperationException($"{employee.FullName} is in the provident fund already.");
            }

            entity.EmployeeId = employee.EmployeeId;
        }

        var person =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => x.EmployeeId == entity.EmployeeId)
                .Select(x => new { x.FullName, x.JoiningDate, x.ConfirmationDate })
                .FirstAsync();

        DateOnly memberDate =
            HrCalendar.ParseDay(dto.MemberDate) ?? throw new InvalidOperationException("Pick the membership date.");

        DateOnly eligible = EligibleFrom(policy, person.JoiningDate, person.ConfirmationDate);

        if (eligible == DateOnly.MaxValue)
        {
            throw new InvalidOperationException($"{person.FullName} is not confirmed yet : the policy lets an employee join {EligibleText(policy)}.");
        }

        if (memberDate < eligible)
        {
            throw new InvalidOperationException($"{person.FullName} can join {EligibleText(policy)} : not before {Day(eligible)}.");
        }

        decimal openingEmployee = Math.Round(dto.OpeningEmployee, 2);
        decimal openingCompany = Math.Round(dto.OpeningCompany, 2);

        if (openingEmployee < 0 || openingCompany < 0)
        {
            throw new InvalidOperationException("An opening balance cannot be negative.");
        }

        entity.MemberDate = memberDate;
        entity.OpeningEmployee = openingEmployee;
        entity.OpeningCompany = openingCompany;
        entity.NomineeName = Limited(dto.NomineeName, 150, "Nominee");
        entity.NomineeRelation = Limited(dto.NomineeRelation, 50, "Relation");
        entity.NomineePhone = Limited(dto.NomineePhone, 20, "Nominee Phone");
        entity.Remarks = Limited(dto.Remarks, 500, "Remarks");
    }

    // The opening balances are one ledger row of the member
    private async Task WriteOpeningAsync(HrPfMembers member, long userId)
    {
        Ledger.RemoveRange(
            await Ledger.Where(x => x.PfMemberId == member.PfMemberId && x.TxnType == "Opening").ToListAsync());

        if (member.OpeningEmployee > 0 || member.OpeningCompany > 0)
        {
            Ledger.Add(
                new HrPfTransactions
                {
                    PfMemberId = member.PfMemberId,
                    EmployeeId = member.EmployeeId,
                    TxnDate = member.MemberDate,
                    TxnType = "Opening",
                    EmployeeAmount = member.OpeningEmployee,
                    CompanyAmount = member.OpeningCompany,
                    SourceType = "Member",
                    SourceId = member.PfMemberId,
                    Remarks = "Opening balance",
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow
                });
        }
    }

    public async Task<PfMemberDto> CreateMemberAsync(PfMemberDto dto, long userId)
    {
        HrPfMembers entity = new();

        await ApplyMemberAsync(entity, dto, true);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        entity.Code = NextCode(await Members.AsNoTracking().Select(x => x.Code).ToListAsync(), "PFM-");
        entity.Status = Active;
        entity.IsDeleted = false;
        entity.CreatedBy = userId;
        entity.CreatedDate = DateTime.UtcNow;

        Members.Add(entity);

        await _context.SaveChangesAsync();

        await WriteOpeningAsync(entity, userId);

        AddHistory(MembersEntity, entity.PfMemberId, "Create", "PF Member Added", $"{entity.Code} : member from {Day(entity.MemberDate)}, opening {Money(entity.OpeningEmployee)} + {Money(entity.OpeningCompany)}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetMemberAsync(entity.PublicId);
    }

    public async Task UpdateMemberAsync(Guid publicId, PfMemberDto dto, long userId)
    {
        HrPfMembers entity =
            await Members.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The provident fund member was not found.");

        if (entity.Status == Settled)
        {
            throw new InvalidOperationException($"{entity.Code} is settled : it cannot be changed.");
        }

        await ApplyMemberAsync(entity, dto, false);

        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        await WriteOpeningAsync(entity, userId);

        AddHistory(MembersEntity, entity.PfMemberId, "Update", "PF Member Updated", $"{entity.Code} : member from {Day(entity.MemberDate)}, opening {Money(entity.OpeningEmployee)} + {Money(entity.OpeningCompany)}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    public async Task DeleteMemberAsync(Guid publicId, long userId)
    {
        HrPfMembers entity =
            await Members.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The provident fund member was not found.");

        if (await Ledger.AsNoTracking().AnyAsync(x => x.PfMemberId == entity.PfMemberId && x.TxnType != "Opening"))
        {
            throw new InvalidOperationException($"{entity.Code} has contributions in the fund : it cannot be deleted. Settle the member on PF Settlements instead.");
        }

        if (await Loans.AsNoTracking().AnyAsync(x => x.PfMemberId == entity.PfMemberId && !x.IsDeleted))
        {
            throw new InvalidOperationException($"{entity.Code} has a loan : delete the loan first.");
        }

        Ledger.RemoveRange(await Ledger.Where(x => x.PfMemberId == entity.PfMemberId).ToListAsync());

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(MembersEntity, entity.PfMemberId, "Delete", "PF Member Deleted", entity.Code, userId);

        await _context.SaveChangesAsync();
    }

    // Active members with their balances (the loan and settlement
    // forms)
    private async Task<List<PfLookupDto>> ActiveMembersAsync()
    {
        return (await ReadMembersAsync(Members.AsNoTracking().Where(x => !x.IsDeleted && x.Status == Active)))
            .Select(m => new PfLookupDto
            {
                Id = m.PfMemberId,
                Code = m.Code,
                Name = $"{m.EmployeeCode}  {m.EmployeeName}",
                Date = m.MemberDate,
                EmployeeBalance = m.EmployeeBalance,
                CompanyBalance = m.CompanyBalance,
                LoanOutstanding = m.LoanOutstanding,
                Note = m.JoiningDate
            })
            .ToList();
    }


    //===========================================================
    // Loans
    //===========================================================

    private async Task<List<PfLoanDto>> ReadLoansAsync(IQueryable<HrPfLoans> source)
    {
        var rows =
            await (
                from l in source
                join m in Members.AsNoTracking() on l.PfMemberId equals m.PfMemberId
                join e in _context.Set<HrEmployees>().AsNoTracking() on l.EmployeeId equals e.EmployeeId
                orderby l.Code descending
                select new { Loan = l, MemberCode = m.Code, EmployeeCode = e.Code, e.FullName })
            .ToListAsync();

        var recovered =
            await LoanRecoveredAsync(_context, rows.Select(x => x.Loan.PfLoanId).ToList());

        return rows
            .Select(x =>
            {
                LoanState state = StateOf(x.Loan, recovered);

                return new PfLoanDto
                {
                    PublicId = x.Loan.PublicId,
                    Code = x.Loan.Code,
                    PfMemberId = x.Loan.PfMemberId,
                    MemberCode = x.MemberCode,
                    EmployeeCode = x.EmployeeCode,
                    EmployeeName = x.FullName,
                    LoanDate = Day(x.Loan.LoanDate),
                    Amount = x.Loan.Amount,
                    Installments = x.Loan.Installments,
                    InstallmentAmount = x.Loan.InstallmentAmount,
                    StartMonth = $"{x.Loan.StartYear:D4}-{x.Loan.StartMonth:D2}",
                    Remarks = x.Loan.Remarks,
                    InterestRate = x.Loan.InterestRate,
                    InterestMethod = x.Loan.InterestMethod,
                    TotalInterest = x.Loan.TotalInterest,
                    Recovered = state.Recovered,
                    InterestPaid = state.InterestPaid,
                    PrincipalOutstanding = state.PrincipalOut,
                    Outstanding = state.PrincipalOut + state.InterestOut,
                    Status = state.Closed ? "Closed" : "Running"
                };
            })
            .ToList();
    }

    public Task<List<PfLoanDto>> GetLoansAsync() =>
        ReadLoansAsync(Loans.AsNoTracking().Where(x => !x.IsDeleted));

    public async Task<PfLoanDto> GetLoanAsync(Guid publicId)
    {
        return (await ReadLoansAsync(Loans.AsNoTracking().Where(x => x.PublicId == publicId && !x.IsDeleted))).FirstOrDefault()
            ?? throw new KeyNotFoundException("The provident fund loan was not found.");
    }

    public async Task<PfLoanDefaultsDto> GetLoanDefaultsAsync()
    {
        return new PfLoanDefaultsDto
        {
            NextCode = NextCode(await Loans.AsNoTracking().Select(x => x.Code).ToListAsync(), "PFL-"),
            Policy = ToDto(await PolicyAsync(_context)),
            Members = await ActiveMembersAsync()
        };
    }

    public async Task<PfLoanDto> CreateLoanAsync(PfLoanDto dto, long userId)
    {
        HrPfPolicy policy = await PolicyAsync(_context);

        if (!policy.LoanEnabled)
        {
            throw new InvalidOperationException("Loans are switched off on the Provident Fund Policy.");
        }

        HrPfMembers member =
            await Members.AsNoTracking().FirstOrDefaultAsync(x => x.PfMemberId == dto.PfMemberId && !x.IsDeleted)
            ?? throw new InvalidOperationException("Pick the member.");

        if (member.Status != Active)
        {
            throw new InvalidOperationException($"{member.Code} is settled : no loan can be given.");
        }

        DateOnly loanDate =
            HrCalendar.ParseDay(dto.LoanDate) ?? throw new InvalidOperationException("Pick the loan date.");

        if (loanDate < member.MemberDate)
        {
            throw new InvalidOperationException($"The loan cannot be before the membership date ({Day(member.MemberDate)}).");
        }

        decimal amount = Math.Round(dto.Amount, 2);

        if (amount <= 0)
        {
            throw new InvalidOperationException("Type the loan amount.");
        }

        if (dto.Installments < 1 || dto.Installments > policy.LoanMaxInstallments)
        {
            throw new InvalidOperationException($"Instalments must be 1 to {policy.LoanMaxInstallments} (the policy).");
        }

        List<long> one = new() { member.PfMemberId };

        decimal own = (await BalancesAsync(one)).TryGetValue(member.PfMemberId, out var balance) ? balance.Employee : 0;

        decimal onLoan = (await LoansOutAsync(one)).TryGetValue(member.PfMemberId, out decimal outNow) ? outNow : 0;

        decimal limit = Math.Max(0, Math.Round(own * policy.LoanMaxPercent / 100m, 2) - onLoan);

        if (amount > limit)
        {
            throw new InvalidOperationException($"The loan can be Tk {Money(limit)} at most : {policy.LoanMaxPercent:0.###} % of the member's own balance (Tk {Money(own)}){(onLoan > 0 ? $", less Tk {Money(onLoan)} still on loan" : string.Empty)}.");
        }

        string[] month = (dto.StartMonth ?? string.Empty).Split('-');

        if (month.Length != 2
            || !int.TryParse(month[0], out int startYear)
            || !int.TryParse(month[1], out int startMonth)
            || startYear < 2000 || startYear > 2100 || startMonth < 1 || startMonth > 12)
        {
            throw new InvalidOperationException("Pick the month the recovery starts.");
        }

        if (startYear * 12 + startMonth < loanDate.Year * 12 + loanDate.Month)
        {
            throw new InvalidOperationException("The recovery cannot start before the month of the loan.");
        }

        // the interest terms of the policy today stay with the loan
        decimal loanRate = policy.LoanInterestEnabled ? policy.LoanInterestRate : 0;

        string loanMethod = loanRate > 0 ? policy.LoanInterestMethod : string.Empty;

        (decimal TotalInterest, decimal Installment) plan = PlanLoan(amount, dto.Installments, loanRate, loanMethod);

        HrPfLoans entity = new()
        {
            Code = NextCode(await Loans.AsNoTracking().Select(x => x.Code).ToListAsync(), "PFL-"),
            PfMemberId = member.PfMemberId,
            EmployeeId = member.EmployeeId,
            LoanDate = loanDate,
            Amount = amount,
            Installments = dto.Installments,
            InstallmentAmount = plan.Installment,
            StartYear = startYear,
            StartMonth = startMonth,
            InterestRate = loanRate,
            InterestMethod = loanMethod,
            TotalInterest = plan.TotalInterest,
            // settling early pays the interest of the months used only
            EarlyFullInterest = false,
            Remarks = Limited(dto.Remarks, 500, "Remarks"),
            IsDeleted = false,
            CreatedBy = userId,
            CreatedDate = DateTime.UtcNow
        };

        Loans.Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(LoansEntity, entity.PfLoanId, "Create", "PF Loan Given", $"{entity.Code} : {member.Code}, Tk {Money(entity.Amount)} in {entity.Installments} instalment(s) of Tk {Money(entity.InstallmentAmount)} from {entity.StartYear:D4}-{entity.StartMonth:D2}{(entity.TotalInterest > 0 ? $"; interest {entity.InterestRate:0.###} % {entity.InterestMethod}, Tk {Money(entity.TotalInterest)}" : string.Empty)}.", userId);

        await _context.SaveChangesAsync();

        return await GetLoanAsync(entity.PublicId);
    }

    public async Task DeleteLoanAsync(Guid publicId, long userId)
    {
        HrPfLoans entity =
            await Loans.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The provident fund loan was not found.");

        decimal recovered =
            (await LoanRecoveredAsync(_context, new List<long> { entity.PfLoanId })).TryGetValue(entity.PfLoanId, out var done) ? done.Amount : 0;

        if (recovered > 0)
        {
            throw new InvalidOperationException($"Tk {Money(recovered)} of {entity.Code} is recovered already : it cannot be deleted.");
        }

        if (await HrPaymentsRepository.AnyAsync(_context, new[] { HrPaymentsRepository.PfLoan }, entity.PfLoanId))
        {
            throw new InvalidOperationException($"{entity.Code} is paid out on PF Payments : cancel the payment first.");
        }

        LoanRecoveries.RemoveRange(await LoanRecoveries.Where(x => x.PfLoanId == entity.PfLoanId).ToListAsync());

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(LoansEntity, entity.PfLoanId, "Delete", "PF Loan Deleted", $"{entity.Code} Tk {Money(entity.Amount)}", userId);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Settlements : payment / cancellation / forfeiture
    //===========================================================

    // What the policy gives a member on a date for a reason
    private async Task<HrPfSettlements> SettleAsync(HrPfMembers member, DateOnly date, string reason)
    {
        HrPfPolicy policy = await PolicyAsync(_context);

        List<long> one = new() { member.PfMemberId };

        var balance = (await BalancesAsync(one)).TryGetValue(member.PfMemberId, out var b) ? b : (0m, 0m);

        decimal employeeBalance = Math.Max(0, balance.Item1);

        decimal companyBalance = Math.Max(0, balance.Item2);

        decimal loanOut = (await LoansOutAsync(one)).TryGetValue(member.PfMemberId, out decimal l) ? l : 0;

        DateOnly joining =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => x.EmployeeId == member.EmployeeId)
                .Select(x => x.JoiningDate)
                .FirstAsync();

        DateOnly from = policy.VestingFrom == "Membership" ? member.MemberDate : joining;

        decimal years = Math.Round(Math.Max(0, date.DayNumber - from.DayNumber) / 365.25m, 2);

        string counted = policy.VestingFrom == "Membership" ? "membership" : "service";

        decimal companyPaid;

        string note;

        if (reason == "Misconduct" && policy.ForfeitOnMisconduct)
        {
            companyPaid = 0;
            note = "Terminated for misconduct : the company part is forfeited, whatever the years (policy).";
        }
        else if ((reason == "Death" || reason == "Retirement") && policy.FullOnDeathRetirement)
        {
            companyPaid = companyBalance;
            note = $"{reason} : the whole company part is paid, whatever the years (policy).";
        }
        else if (years < policy.VestingYears)
        {
            companyPaid = 0;
            note = $"{years:0.##} year(s) of {counted} : fewer than the {policy.VestingYears:0.##} year(s) the policy asks, so the company part is forfeited.";
        }
        else
        {
            companyPaid = companyBalance;
            note = policy.VestingYears > 0
                ? $"{years:0.##} year(s) of {counted} : the {policy.VestingYears:0.##} year(s) of the policy are complete, the company part is paid."
                : "The policy pays the company part whatever the years.";
        }

        return new HrPfSettlements
        {
            PfMemberId = member.PfMemberId,
            EmployeeId = member.EmployeeId,
            SettlementDate = date,
            Reason = reason,
            ServiceYears = years,
            EmployeeBalance = employeeBalance,
            CompanyBalance = companyBalance,
            CompanyPaid = companyPaid,
            CompanyForfeited = companyBalance - companyPaid,
            ForfeitedToCompany = policy.ForfeitToCompany && companyBalance - companyPaid > 0,
            LoanOutstanding = loanOut,
            NetPayable = employeeBalance + companyPaid - loanOut,
            RuleNote = note
        };
    }

    private async Task<List<PfSettlementDto>> ReadSettlementsAsync(IQueryable<HrPfSettlements> source)
    {
        var rows =
            await (
                from s in source
                join m in Members.AsNoTracking() on s.PfMemberId equals m.PfMemberId
                join e in _context.Set<HrEmployees>().AsNoTracking() on s.EmployeeId equals e.EmployeeId
                orderby s.Code descending
                select new { Settlement = s, MemberCode = m.Code, MemberStatus = m.Status, EmployeeCode = e.Code, e.FullName })
            .ToListAsync();

        return rows
            .Select(x => ToDto(x.Settlement, x.MemberCode, x.EmployeeCode, x.FullName, x.MemberStatus == Settled))
            .ToList();
    }

    private static PfSettlementDto ToDto(HrPfSettlements s, string memberCode, string employeeCode, string employeeName, bool isLatest) =>
        new()
        {
            PublicId = s.PublicId,
            Code = s.Code,
            PfMemberId = s.PfMemberId,
            MemberCode = memberCode,
            EmployeeCode = employeeCode,
            EmployeeName = employeeName,
            SettlementDate = Day(s.SettlementDate),
            Reason = s.Reason,
            Remarks = s.Remarks,
            ServiceYears = s.ServiceYears,
            EmployeeBalance = s.EmployeeBalance,
            CompanyBalance = s.CompanyBalance,
            CompanyPaid = s.CompanyPaid,
            CompanyForfeited = s.CompanyForfeited,
            LoanOutstanding = s.LoanOutstanding,
            NetPayable = s.NetPayable,
            ForfeitedToCompany = s.ForfeitedToCompany,
            JournalVoucherNo = s.JournalVoucherNo,
            RuleNote = s.RuleNote,
            IsLatest = isLatest
        };

    public Task<List<PfSettlementDto>> GetSettlementsAsync() =>
        ReadSettlementsAsync(Settlements.AsNoTracking().Where(x => !x.IsDeleted));

    public async Task<PfSettlementDto> GetSettlementAsync(Guid publicId)
    {
        return (await ReadSettlementsAsync(Settlements.AsNoTracking().Where(x => x.PublicId == publicId && !x.IsDeleted))).FirstOrDefault()
            ?? throw new KeyNotFoundException("The provident fund settlement was not found.");
    }

    public async Task<PfSettlementDefaultsDto> GetSettlementDefaultsAsync()
    {
        return new PfSettlementDefaultsDto
        {
            NextCode = NextCode(await Settlements.AsNoTracking().Select(x => x.Code).ToListAsync(), "PFS-"),
            Policy = ToDto(await PolicyAsync(_context)),
            Reasons = Reasons.ToList(),
            Members = await ActiveMembersAsync()
        };
    }

    private async Task<(HrPfMembers Member, DateOnly Date, string Reason)> SettlementInputAsync(long memberId, string? date, string? reason, bool tracked)
    {
        IQueryable<HrPfMembers> source = tracked ? Members : Members.AsNoTracking();

        HrPfMembers member =
            await source.FirstOrDefaultAsync(x => x.PfMemberId == memberId && !x.IsDeleted)
            ?? throw new InvalidOperationException("Pick the member.");

        if (member.Status != Active)
        {
            throw new InvalidOperationException($"{member.Code} is settled already.");
        }

        DateOnly day =
            HrCalendar.ParseDay(date) ?? throw new InvalidOperationException("Pick the settlement date.");

        if (day < member.MemberDate)
        {
            throw new InvalidOperationException($"The settlement cannot be before the membership date ({Day(member.MemberDate)}).");
        }

        DateOnly? last =
            await Ledger.AsNoTracking()
                .Where(x => x.PfMemberId == member.PfMemberId)
                .OrderByDescending(x => x.TxnDate)
                .Select(x => (DateOnly?)x.TxnDate)
                .FirstOrDefaultAsync();

        if (last != null && day < last)
        {
            throw new InvalidOperationException($"The fund has entries of {member.Code} up to {Day(last.Value)} : the settlement cannot be before that.");
        }

        string why =
            Reasons.FirstOrDefault(x => string.Equals(x, Clean(reason), StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("Pick the reason.");

        return (member, day, why);
    }

    public async Task<PfSettlementDto> PreviewSettlementAsync(long memberId, string date, string reason)
    {
        (HrPfMembers member, DateOnly day, string why) = await SettlementInputAsync(memberId, date, reason, false);

        HrPfSettlements worked = await SettleAsync(member, day, why);

        return ToDto(worked, member.Code, string.Empty, string.Empty, false);
    }

    public async Task<PfSettlementDto> CreateSettlementAsync(PfSettlementDto dto, long userId)
    {
        (HrPfMembers member, DateOnly day, string why) = await SettlementInputAsync(dto.PfMemberId, dto.SettlementDate, dto.Reason, true);

        HrPfSettlements entity = await SettleAsync(member, day, why);

        if (entity.NetPayable < 0)
        {
            throw new InvalidOperationException($"The loan still out (Tk {Money(entity.LoanOutstanding)}) is more than what the member gets (Tk {Money(entity.EmployeeBalance + entity.CompanyPaid)}) : recover Tk {Money(-entity.NetPayable)} of the loan first.");
        }

        entity.Remarks = Limited(dto.Remarks, 500, "Remarks");

        await using var transaction = await _context.Database.BeginTransactionAsync();

        entity.Code = NextCode(await Settlements.AsNoTracking().Select(x => x.Code).ToListAsync(), "PFS-");
        entity.IsDeleted = false;
        entity.CreatedBy = userId;
        entity.CreatedDate = DateTime.UtcNow;

        Settlements.Add(entity);

        await _context.SaveChangesAsync();

        // the ledger : what is paid, and what is forfeited
        if (entity.EmployeeBalance > 0 || entity.CompanyPaid > 0)
        {
            Ledger.Add(
                new HrPfTransactions
                {
                    PfMemberId = member.PfMemberId,
                    EmployeeId = member.EmployeeId,
                    TxnDate = day,
                    TxnType = "Payment",
                    EmployeeAmount = -entity.EmployeeBalance,
                    CompanyAmount = -entity.CompanyPaid,
                    SourceType = "Settlement",
                    SourceId = entity.PfSettlementId,
                    Remarks = $"{why} | {entity.Code}",
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow
                });
        }

        if (entity.CompanyForfeited > 0)
        {
            Ledger.Add(
                new HrPfTransactions
                {
                    PfMemberId = member.PfMemberId,
                    EmployeeId = member.EmployeeId,
                    TxnDate = day,
                    TxnType = "Forfeit",
                    EmployeeAmount = 0,
                    CompanyAmount = -entity.CompanyForfeited,
                    SourceType = "Settlement",
                    SourceId = entity.PfSettlementId,
                    Remarks = $"Company part forfeited | {entity.Code}",
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow
                });
        }

        // the loans still out are closed against the payment
        List<HrPfLoans> loans =
            await Loans.AsNoTracking().Where(x => x.PfMemberId == member.PfMemberId && !x.IsDeleted).ToListAsync();

        var recovered =
            await LoanRecoveredAsync(_context, loans.Select(x => x.PfLoanId).ToList());

        // (the interest in what the settlement takes for the loans)
        decimal loanInterest = 0;

        foreach (HrPfLoans loan in loans)
        {
            LoanState state = StateOf(loan, recovered);

            if (state.SettleDue > 0)
            {
                loanInterest += state.SettleDue - state.PrincipalOut;

                LoanRecoveries.Add(
                    new HrPfLoanRecoveries
                    {
                        PfLoanId = loan.PfLoanId,
                        SalarySheetId = 0,
                        SalarySheetLineId = 0,
                        PfSettlementId = entity.PfSettlementId,
                        EmployeeId = member.EmployeeId,
                        Amount = state.SettleDue,
                        // (the principal still out : the interest of the
                        //  months not used is not charged)
                        InterestAmount = state.SettleDue - state.PrincipalOut
                    });
            }
        }

        member.Status = Settled;
        member.ModifiedBy = userId;
        member.ModifiedDate = DateTime.UtcNow;

        // the accounts : the fund no longer owes the member
        loanInterest = Math.Min(Math.Max(0, loanInterest), entity.LoanOutstanding);

        string about = $"PF settlement {entity.Code} ({member.Code})";

        List<JournalVoucherLineDto> lines = new();

        Post(lines, "Debit", "PF-MEMBERS-FUND", entity.EmployeeBalance + entity.CompanyBalance, $"{about} : own and company part");
        // (the policy : kept by the fund, or back to the company)
        Post(
            lines,
            "Credit",
            entity.ForfeitedToCompany ? "PF-FORFEITURE-COMPANY" : "PF-FORFEITURE-INCOME",
            entity.CompanyForfeited,
            entity.ForfeitedToCompany ? $"{about} : company part forfeited, back to the company" : $"{about} : company part forfeited, kept by the fund");
        Post(lines, "Credit", "PF-LOAN-RECEIVABLE", entity.LoanOutstanding - loanInterest, $"{about} : loan still out");
        Post(lines, "Credit", "PF-LOAN-INTEREST-INCOME", loanInterest, $"{about} : loan interest");
        Post(lines, "Credit", "PF-SETTLEMENT-PAYABLE", entity.NetPayable, $"{about} : net payable");

        string voucherText = string.Empty;

        if (lines.Count > 0)
        {
            long branchId =
                await _context.Set<HrEmployees>().AsNoTracking()
                    .Where(x => x.EmployeeId == member.EmployeeId)
                    .Select(x => x.BranchId)
                    .FirstAsync();

            JournalVoucherSavedDto voucher =
                await _journalVouchers.CreatePostedAsync(
                    new CreateJournalVoucherDto
                    {
                        VoucherDate = Day(day),
                        BranchId = branchId,
                        Narration = $"Provident fund settlement of {member.Code}, {why} : own Tk {Money(entity.EmployeeBalance)}, company paid Tk {Money(entity.CompanyPaid)}, forfeited Tk {Money(entity.CompanyForfeited)}, loan Tk {Money(entity.LoanOutstanding)}, net Tk {Money(entity.NetPayable)} | {entity.Code}",
                        Lines = lines
                    },
                    entity.Code,
                    userId);

            entity.JournalVoucherId = voucher.JournalVoucherId;
            entity.JournalVoucherNo = Short(voucher.VoucherNo);

            voucherText = $" Journal Voucher {entity.JournalVoucherNo}.";
        }

        AddHistory(
            SettlementsEntity,
            entity.PfSettlementId,
            "Create",
            "PF Settlement Saved",
            $"{entity.Code} : {member.Code}, {why} on {Day(day)}. Own Tk {Money(entity.EmployeeBalance)}, company paid Tk {Money(entity.CompanyPaid)}, forfeited Tk {Money(entity.CompanyForfeited)}, loan Tk {Money(entity.LoanOutstanding)}, net Tk {Money(entity.NetPayable)}. {entity.RuleNote}{voucherText}",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetSettlementAsync(entity.PublicId);
    }

    public async Task DeleteSettlementAsync(Guid publicId, long userId)
    {
        HrPfSettlements entity =
            await Settlements.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The provident fund settlement was not found.");

        HrPfMembers? member =
            await Members.FirstOrDefaultAsync(x => x.PfMemberId == entity.PfMemberId && !x.IsDeleted);

        if (await HrPaymentsRepository.AnyAsync(_context, new[] { HrPaymentsRepository.PfSettlement }, entity.PfSettlementId))
        {
            throw new InvalidOperationException($"{entity.Code} is paid on PF Payments : cancel the payment first.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        string voucherText = string.Empty;

        if (entity.JournalVoucherId != null)
        {
            await _journalVouchers.CancelAsync(
                entity.JournalVoucherId.Value,
                new CancelJournalVoucherDto { CancelDate = Day(HrCalendar.Today()), Reason = $"{entity.Code} deleted" },
                userId);

            voucherText = $" Journal Voucher {entity.JournalVoucherNo} cancelled.";
        }

        Ledger.RemoveRange(
            await Ledger.Where(x => x.SourceType == "Settlement" && x.SourceId == entity.PfSettlementId).ToListAsync());

        LoanRecoveries.RemoveRange(
            await LoanRecoveries.Where(x => x.PfSettlementId == entity.PfSettlementId).ToListAsync());

        if (member != null)
        {
            member.Status = Active;
            member.ModifiedBy = userId;
            member.ModifiedDate = DateTime.UtcNow;
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(SettlementsEntity, entity.PfSettlementId, "Delete", "PF Settlement Deleted", $"{entity.Code} : the member is Active again, the payment and the forfeiture are taken back.{voucherText}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    //===========================================================
    // Interest : once a financial year
    //
    // The year is a financial year of Settings > General Settings >
    // Financial Years (not January to December). The policy says
    // how it is worked out : Monthly (the balance at the end of
    // every month of the year x rate / 12 : money earns interest
    // for the months it was in the fund) or Closing (rate x the
    // balance on the last day of the year). Either way before the
    // interest of the year itself, credited on the last day, once
    // the year is over. A ledger row of it carries the financial year
    // in SourceId.
    //===========================================================

    private async Task<List<FinancialYears>> YearsAsync() =>
        await _context.Set<FinancialYears>().AsNoTracking()
            .Where(x => !x.IsDeleted)
            .OrderByDescending(x => x.StartDate)
            .ToListAsync();

    private static PfFinancialYearDto ToDto(FinancialYears y, bool posted) =>
        new()
        {
            FinancialYearId = y.FinancialYearId,
            Name = y.FinancialYearName.Length > 0 ? y.FinancialYearName : y.FinancialYearCode,
            StartDate = Day(y.StartDate),
            EndDate = Day(y.EndDate),
            IsCurrent = y.IsCurrent,
            Ended = y.EndDate < HrCalendar.Today(),
            IsPosted = posted
        };

    public async Task<PfInterestHomeDto> GetInterestHomeAsync()
    {
        List<FinancialYears> years = await YearsAsync();

        var runs =
            await Ledger.AsNoTracking()
                .Where(x => x.TxnType == "Interest")
                .GroupBy(x => x.SourceId)
                .Select(g => new
                {
                    Id = g.Key,
                    Members = g.Count(),
                    Employee = g.Sum(x => x.EmployeeAmount),
                    Company = g.Sum(x => x.CompanyAmount),
                    Date = g.Max(x => x.TxnDate)
                })
                .ToListAsync();

        HashSet<long> posted = runs.Select(x => x.Id).ToHashSet();

        var vouchers =
            await Ledger.AsNoTracking()
                .Where(x => x.TxnType == "Interest" && x.JournalVoucherNo != "")
                .Select(x => new { x.SourceId, x.JournalVoucherNo })
                .Distinct()
                .ToListAsync();

        return new PfInterestHomeDto
        {
            Years = years.Select(y => ToDto(y, posted.Contains(y.FinancialYearId))).ToList(),
            Runs =
                runs
                    .OrderByDescending(x => x.Date)
                    .Select(x =>
                    {
                        FinancialYears? year = years.FirstOrDefault(y => y.FinancialYearId == x.Id);

                        return new PfInterestRunDto
                        {
                            Id = x.Id,
                            // (an interest credited before financial years
                            //  carries its calendar year)
                            Name = year != null
                                ? (year.FinancialYearName.Length > 0 ? year.FinancialYearName : year.FinancialYearCode)
                                : $"Year {x.Id} (January to December)",
                            JournalVoucherNo = string.Join(", ", vouchers.Where(v => v.SourceId == x.Id).Select(v => v.JournalVoucherNo).OrderBy(v => v)),
                            Members = x.Members,
                            EmployeeInterest = x.Employee,
                            CompanyInterest = x.Company
                        };
                    })
                    .ToList()
        };
    }

    private async Task<FinancialYears> YearAsync(long financialYearId)
    {
        return await _context.Set<FinancialYears>().AsNoTracking()
                .FirstOrDefaultAsync(x => x.FinancialYearId == financialYearId && !x.IsDeleted)
            ?? throw new InvalidOperationException("Pick the financial year (Settings > General Settings > Financial Years).");
    }

    public async Task<PfInterestYearDto> PreviewInterestAsync(long financialYearId)
    {
        FinancialYears year = await YearAsync(financialYearId);

        HrPfPolicy policy = await PolicyAsync(_context);

        DateOnly end = year.EndDate;

        bool posted =
            await Ledger.AsNoTracking().AnyAsync(x => x.TxnType == "Interest" && x.SourceId == financialYearId);

        // the ledger up to the last day of the year, before the
        // interest of that year
        var ledger =
            await Ledger.AsNoTracking()
                .Where(x => x.TxnDate <= end && !(x.TxnType == "Interest" && x.SourceId == financialYearId))
                .Select(x => new { x.PfMemberId, x.TxnDate, x.EmployeeAmount, x.CompanyAmount })
                .ToListAsync();

        var balances =
            ledger
                .GroupBy(x => x.PfMemberId)
                .Select(g => new { PfMemberId = g.Key, Employee = g.Sum(x => x.EmployeeAmount), Company = g.Sum(x => x.CompanyAmount) })
                .ToList();

        bool monthly = policy.InterestBasis != "Closing";

        // the last day of every month of the year
        List<DateOnly> monthEnds = new();

        for (DateOnly d = new(year.StartDate.Year, year.StartDate.Month, 1); d <= end; d = d.AddMonths(1))
        {
            DateOnly last = d.AddMonths(1).AddDays(-1);

            monthEnds.Add(last < end ? last : end);
        }

        // Monthly : the balance at the end of every month x rate / 12
        // (a month the balance is below zero earns nothing)
        // Closing : the balance on the last day x rate
        decimal Interest(long memberId, bool companyPart, decimal closing, decimal rate)
        {
            if (!monthly)
            {
                return Math.Round(closing * rate / 100m, 2, MidpointRounding.AwayFromZero);
            }

            var rows = ledger.Where(x => x.PfMemberId == memberId).ToList();

            decimal product =
                monthEnds.Sum(day =>
                    Math.Max(0, rows.Where(x => x.TxnDate <= day).Sum(x => companyPart ? x.CompanyAmount : x.EmployeeAmount)));

            return Math.Round(product * rate / 100m / 12m, 2, MidpointRounding.AwayFromZero);
        }

        var members =
            await (
                from m in Members.AsNoTracking()
                where !m.IsDeleted && m.MemberDate <= end
                join e in _context.Set<HrEmployees>().AsNoTracking() on m.EmployeeId equals e.EmployeeId
                orderby m.Code
                select new { m.PfMemberId, m.Code, EmployeeCode = e.Code, e.FullName })
            .ToListAsync();

        decimal rate = policy.InterestEnabled ? policy.InterestRate : 0;

        return new PfInterestYearDto
        {
            Year = ToDto(year, posted),
            Rate = rate,
            Basis = monthly ? "Monthly" : "Closing",
            Rows =
                members
                    .Select(m =>
                    {
                        var b = balances.FirstOrDefault(x => x.PfMemberId == m.PfMemberId);

                        decimal employee = Math.Max(0, b?.Employee ?? 0);
                        decimal company = Math.Max(0, b?.Company ?? 0);

                        return new PfInterestRowDto
                        {
                            MemberCode = m.Code,
                            EmployeeCode = m.EmployeeCode,
                            EmployeeName = m.FullName,
                            EmployeeBalance = employee,
                            CompanyBalance = company,
                            EmployeeInterest = Interest(m.PfMemberId, false, employee, rate),
                            CompanyInterest = Interest(m.PfMemberId, true, company, rate)
                        };
                    })
                    .Where(x => x.EmployeeBalance > 0 || x.CompanyBalance > 0)
                    .ToList()
        };
    }

    public async Task<PfInterestRunDto> PostInterestAsync(long financialYearId, long userId)
    {
        HrPfPolicy policy = await PolicyAsync(_context);

        if (!policy.InterestEnabled || policy.InterestRate <= 0)
        {
            throw new InvalidOperationException("Interest is switched off on the Provident Fund Policy.");
        }

        FinancialYears year = await YearAsync(financialYearId);

        string name = year.FinancialYearName.Length > 0 ? year.FinancialYearName : year.FinancialYearCode;

        if (year.EndDate >= HrCalendar.Today())
        {
            throw new InvalidOperationException($"{name} is not over yet : its interest can be credited after {Day(year.EndDate)}.");
        }

        PfInterestYearDto preview = await PreviewInterestAsync(financialYearId);

        if (preview.Year.IsPosted)
        {
            throw new InvalidOperationException($"The interest of {name} is credited already : delete it first to work it out again.");
        }

        List<PfInterestRowDto> rows = preview.Rows.Where(x => x.EmployeeInterest > 0 || x.CompanyInterest > 0).ToList();

        if (rows.Count == 0)
        {
            throw new InvalidOperationException($"No member has a balance at the end of {name} ({Day(year.EndDate)}).");
        }

        Dictionary<string, (long Id, long EmployeeId, long BranchId)> byCode =
            (await (
                from m in Members.AsNoTracking()
                where !m.IsDeleted
                join e in _context.Set<HrEmployees>().AsNoTracking() on m.EmployeeId equals e.EmployeeId
                select new { m.Code, m.PfMemberId, m.EmployeeId, e.BranchId })
            .ToListAsync())
            .ToDictionary(x => x.Code, x => (x.PfMemberId, x.EmployeeId, x.BranchId));

        await using var transaction = await _context.Database.BeginTransactionAsync();

        // the accounts : one Journal Voucher a branch, dated the
        // last day of the year
        Dictionary<long, JournalVoucherSavedDto> vouchers = new();

        foreach (var branch in rows.GroupBy(x => byCode[x.MemberCode].BranchId))
        {
            decimal total = branch.Sum(x => x.EmployeeInterest + x.CompanyInterest);

            List<JournalVoucherLineDto> lines = new();

            Post(lines, "Debit", "PF-INTEREST-EXPENSE", total, $"PF interest of {name}");
            Post(lines, "Credit", "PF-MEMBERS-FUND", total, $"PF interest of {name}");

            vouchers[branch.Key] =
                await _journalVouchers.CreatePostedAsync(
                    new CreateJournalVoucherDto
                    {
                        VoucherDate = Day(year.EndDate),
                        BranchId = branch.Key,
                        Narration = $"Provident fund interest of {name} at {policy.InterestRate:0.###} % : {branch.Count()} member(s), Tk {Money(total)}",
                        Lines = lines
                    },
                    $"PF-INT-{financialYearId}",
                    userId);
        }

        foreach (PfInterestRowDto row in rows)
        {
            JournalVoucherSavedDto voucher = vouchers[byCode[row.MemberCode].BranchId];

            Ledger.Add(
                new HrPfTransactions
                {
                    PfMemberId = byCode[row.MemberCode].Id,
                    EmployeeId = byCode[row.MemberCode].EmployeeId,
                    TxnDate = year.EndDate,
                    TxnType = "Interest",
                    EmployeeAmount = row.EmployeeInterest,
                    CompanyAmount = row.CompanyInterest,
                    SourceType = "Interest",
                    SourceId = financialYearId,
                    JournalVoucherId = voucher.JournalVoucherId,
                    JournalVoucherNo = Short(voucher.VoucherNo),
                    Remarks = $"Interest of {name} at {policy.InterestRate:0.###} % ({(preview.Basis == "Closing" ? "closing balance" : "monthly balances")})",
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow
                });
        }

        AddHistory(PolicyEntity, financialYearId, "Create", "PF Interest Credited", $"Interest of {name} at {policy.InterestRate:0.###} % : {rows.Count} member(s), Tk {Money(rows.Sum(x => x.EmployeeInterest + x.CompanyInterest))}. Journal Voucher {string.Join(", ", vouchers.Values.Select(x => Short(x.VoucherNo)))}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return new PfInterestRunDto
        {
            Id = financialYearId,
            Name = name,
            JournalVoucherNo = string.Join(", ", vouchers.Values.Select(x => Short(x.VoucherNo)).OrderBy(x => x)),
            Members = rows.Count,
            EmployeeInterest = rows.Sum(x => x.EmployeeInterest),
            CompanyInterest = rows.Sum(x => x.CompanyInterest)
        };
    }

    public async Task DeleteInterestAsync(long id, long userId)
    {
        List<HrPfTransactions> rows =
            await Ledger.Where(x => x.TxnType == "Interest" && x.SourceId == id).ToListAsync();

        if (rows.Count == 0)
        {
            throw new KeyNotFoundException("The interest of that year is not credited.");
        }

        List<long> memberIds = rows.Select(x => x.PfMemberId).Distinct().ToList();

        int settled =
            await Members.AsNoTracking().CountAsync(x => memberIds.Contains(x.PfMemberId) && x.Status == Settled);

        if (settled > 0)
        {
            throw new InvalidOperationException($"{settled} member(s) with interest of that year are settled : delete their settlement first.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        foreach (long voucherId in rows.Where(x => x.JournalVoucherId != null).Select(x => x.JournalVoucherId!.Value).Distinct().ToList())
        {
            await _journalVouchers.CancelAsync(
                voucherId,
                new CancelJournalVoucherDto { CancelDate = Day(HrCalendar.Today()), Reason = "PF interest deleted" },
                userId);
        }

        Ledger.RemoveRange(rows);

        AddHistory(PolicyEntity, id, "Delete", "PF Interest Deleted", $"{rows[0].Remarks} taken back : {rows.Count} member(s).", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    //===========================================================
    // Reports
    //===========================================================

    public async Task<PfStatementDto> GetStatementAsync(long memberId)
    {
        Guid publicId =
            await Members.AsNoTracking()
                .Where(x => x.PfMemberId == memberId && !x.IsDeleted)
                .Select(x => (Guid?)x.PublicId)
                .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("The provident fund member was not found.");

        List<HrPfTransactions> rows =
            await Ledger.AsNoTracking()
                .Where(x => x.PfMemberId == memberId)
                .OrderBy(x => x.TxnDate).ThenBy(x => x.PfTransactionId)
                .ToListAsync();

        decimal employee = 0;
        decimal company = 0;

        return new PfStatementDto
        {
            Member = await GetMemberAsync(publicId),
            Rows =
                rows
                    .Select(x =>
                    {
                        employee += x.EmployeeAmount;
                        company += x.CompanyAmount;

                        return new PfStatementRowDto
                        {
                            Date = Day(x.TxnDate),
                            Type = x.TxnType,
                            Remarks = x.Remarks,
                            EmployeeAmount = x.EmployeeAmount,
                            CompanyAmount = x.CompanyAmount,
                            EmployeeBalance = employee,
                            CompanyBalance = company
                        };
                    })
                    .ToList()
        };
    }

    // The income of the fund : the interest received on the loans
    // and the company parts forfeited
    public async Task<PfIncomeDto> GetIncomeAsync()
    {
        decimal interest = (await LoanRecoveredAsync(_context)).Values.Sum(x => x.Interest);

        // kept by the fund / given back to the company
        decimal forfeited =
            await Settlements.AsNoTracking().Where(x => !x.IsDeleted && !x.ForfeitedToCompany).SumAsync(x => (decimal?)x.CompanyForfeited) ?? 0;

        decimal toCompany =
            await Settlements.AsNoTracking().Where(x => !x.IsDeleted && x.ForfeitedToCompany).SumAsync(x => (decimal?)x.CompanyForfeited) ?? 0;

        return new PfIncomeDto { LoanInterest = interest, Forfeited = forfeited, ForfeitedToCompany = toCompany };
    }

    // The fund deductions of the salary sheets of a month (posted
    // or not : what the sheets hold)
    public async Task<List<PfRegisterRowDto>> GetRegisterAsync(int year, int month)
    {
        return await (
                from l in _context.Set<HrSalarySheetLines>().AsNoTracking()
                join s in _context.Set<HrSalarySheets>().AsNoTracking() on l.SalarySheetId equals s.SalarySheetId
                where !s.IsDeleted && s.Year == year && s.Month == month
                   && (l.PfEmployee > 0 || l.PfCompany > 0 || l.PfLoan > 0)
                join m in Members.AsNoTracking().Where(x => !x.IsDeleted) on l.EmployeeId equals m.EmployeeId into mj
                from m in mj.DefaultIfEmpty()
                orderby l.EmployeeCode
                select new PfRegisterRowDto
                {
                    MemberCode = m != null ? m.Code : string.Empty,
                    EmployeeCode = l.EmployeeCode,
                    EmployeeName = l.EmployeeName,
                    SheetCode = s.Code + " (" + s.Status + ")",
                    EmployeeAmount = l.PfEmployee,
                    CompanyAmount = l.PfCompany,
                    LoanRecovered = l.PfLoan
                })
            .ToListAsync();
    }
}
