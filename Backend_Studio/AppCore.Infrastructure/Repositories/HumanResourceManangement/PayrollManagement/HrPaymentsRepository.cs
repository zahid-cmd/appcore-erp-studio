//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.HumanResourceManangement.PayrollManagement;
using AppCore.Application.Platform.Accounting;
using AppCore.Domain.Entities.AccountsFinance.VoucherManagement;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Entities.HumanResourceManangement.PayrollManagement;
using AppCore.Domain.Entities.HumanResourceManangement.ProvidentFund;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.Accounting;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.HumanResourceManangement.PayrollManagement;


//===============================================================
// Payments of Human Resource (hand-written page, 2026-11-14;
// NEVER run Code Sync for it). ONE page for four kinds :
//
//   group "payroll" (Payroll Management > Payroll Payments)
//     Salary        the net pay of a POSTED salary sheet,
//                   employee by employee
//     Overtime      the overtime of a POSTED salary sheet,
//                   employee by employee
//     Advance       a salary advance / loan, paid out to the
//                   employee
//     Bonus         the festival bonus of a POSTED bonus sheet,
//                   employee by employee
//     Encashment    a leave encashment
//   group "pf" (Provident Fund > PF Payments)
//     PfSettlement  the net payable of a settlement
//     PfLoan        a loan of the fund, paid out to the member
//
// A payment is numbered as a voucher : PPY-010101-2627-11-00001
// (branch, financial year, month, serial of the month; PFP- for
// the fund). It pays ONE source (a salary sheet, a
// settlement, a loan), in full or in part : any number of
// payments, never more than what is still due of a line. What is
// due = payable - the payments that are not cancelled; the paid
// status is worked out, never typed.
//
// Saving writes ONE Payment Voucher, posted at once :
//     Dr  Salary Payable / Overtime Payable / PF Settlement
//         Payable / PF Loan Receivable     (Posting Setup)
//     Cr  the money accounts of the Payment Desk
// The voucher carries "Payroll Payment" / "PF Payment" and
// "PPY-0001 · SAL-0001" : on Payment Voucher it is read only.
// Cancelling the payment cancels the voucher; a payment is never
// edited.
//===============================================================

public class HrPaymentsRepository
    : IHrPaymentsRepository
{
    public const string Salary = "Salary";

    public const string Overtime = "Overtime";

    public const string PfSettlement = "PfSettlement";

    public const string PfLoan = "PfLoan";

    // a salary advance paid out / a posted bonus sheet / a leave
    // encashment (group "payroll" too)
    public const string Advance = "Advance";

    public const string Bonus = "Bonus";

    public const string Encashment = "Encashment";

    private const string HistoryModule = "Human Resource";

    private const string HistoryEntity = "HrPayments";

    private const string Posted = "Posted";

    private readonly AppDbContext _context;

    private readonly IPaymentVoucherRepository _paymentVouchers;

    private readonly IVoucherNumberService _numbers;

    public HrPaymentsRepository(
        AppDbContext context,
        IPaymentVoucherRepository paymentVouchers,
        IVoucherNumberService numbers)
    {
        _context = context;
        _paymentVouchers = paymentVouchers;
        _numbers = numbers;
    }

    // voucher id -> its public id (to open the voucher / its print)
    private async Task<Dictionary<long, Guid>> VoucherIdsAsync(IEnumerable<long?> ids)
    {
        List<long> wanted = ids.Where(x => x != null).Select(x => x!.Value).Distinct().ToList();

        return (await _context.Set<PaymentVoucher>().AsNoTracking()
                .Where(x => wanted.Contains(x.PaymentVoucherId))
                .Select(x => new { x.PaymentVoucherId, x.PublicId })
                .ToListAsync())
            .ToDictionary(x => x.PaymentVoucherId, x => x.PublicId);
    }

    private DbSet<HrPayments> Payments => _context.Set<HrPayments>();

    private DbSet<HrPaymentLines> PaymentLines => _context.Set<HrPaymentLines>();


    //===========================================================
    // Helpers
    //===========================================================

    private static string[] TypesOf(string group) =>
        string.Equals(group, "pf", StringComparison.OrdinalIgnoreCase)
            ? new[] { PfSettlement, PfLoan }
            : new[] { Salary, Overtime, Advance, Bonus, Encashment };

    private static string TypeOf(string group, string? type)
    {
        string value = (type ?? string.Empty).Trim();

        return TypesOf(group).FirstOrDefault(x => string.Equals(x, value, StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("Pick what is paid.");
    }

    private static string TypeText(string type) =>
        type == PfSettlement ? "PF Settlement"
        : type == PfLoan ? "PF Loan"
        : type == Advance ? "Salary Advance"
        : type == Bonus ? "Festival Bonus"
        : type == Encashment ? "Leave Encashment"
        : type;

    // The lines of these sources are their own rows (the id is kept
    // in HrPaymentLines.SalarySheetLineId) : paid employee by employee
    private static bool ByLine(string type) => type == Salary || type == Overtime || type == Bonus;

    private static string SourceName(string type) =>
        type == PfSettlement || type == PfLoan ? "PF Payment" : "Payroll Payment";

    private static string Money(decimal value) => value.ToString("#,0.00");

    private static string MonthText(int year, int month) =>
        new DateOnly(year, month, 1).ToString("MMMM yyyy");

    private static string OvertimeCode(string sheetCode) =>
        sheetCode.StartsWith("SAL", StringComparison.OrdinalIgnoreCase) ? "OTS" + sheetCode.Substring(3) : "OTS-" + sheetCode;

    private void AddHistory(long id, string type, string title, string description, long userId)
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module = HistoryModule,
                EntityName = HistoryEntity,
                EntityId = id,
                ActivityType = type,
                ActivityTitle = title,
                ActivityDescription = description.Length > 1000 ? description.Substring(0, 1000) : description,
                PerformedBy = userId,
                PerformedByName = "System",
                PerformedDate = DateTime.UtcNow
            });
    }

    private async Task<Dictionary<long, string>> BranchNamesAsync() =>
        (await _context.Set<Branches>().AsNoTracking().Select(x => new { x.BranchId, x.BranchName }).ToListAsync())
        .ToDictionary(x => x.BranchId, x => x.BranchName);


    //===========================================================
    // A source and what it has to pay
    //===========================================================

    private sealed class Source
    {
        public long SourceId;
        public string Code = string.Empty;
        public string Text = string.Empty;
        public long BranchId;
        public List<HrPaymentLineDto> Lines = new();
    }

    // What the payments that are not cancelled have paid of a
    // source : (employee, salary sheet line) -> amount
    private async Task<Dictionary<(long, long), decimal>> PaidAsync(string type, long sourceId) =>
        (await (
            from p in Payments.AsNoTracking()
            where p.PaymentType == type && p.SourceId == sourceId && !p.IsCancelled
            join l in PaymentLines.AsNoTracking() on p.PaymentId equals l.PaymentId
            group l by new { l.EmployeeId, l.SalarySheetLineId } into g
            select new { g.Key.EmployeeId, g.Key.SalarySheetLineId, Amount = g.Sum(x => x.Amount) })
        .ToListAsync())
        .ToDictionary(x => (x.EmployeeId, x.SalarySheetLineId), x => x.Amount);

    // The bank / MFS account of the employees (for the bank advice)
    private async Task FillAccountsAsync(List<HrPaymentLineDto> lines)
    {
        List<long> ids = lines.Select(x => x.EmployeeId).Distinct().ToList();

        var employees =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => ids.Contains(x.EmployeeId))
                .Select(x => new { x.EmployeeId, x.Code, x.FullName, x.BankName, x.BankAccountNo, x.MfsName, x.MfsNo })
                .ToListAsync();

        foreach (HrPaymentLineDto line in lines)
        {
            var e = employees.FirstOrDefault(x => x.EmployeeId == line.EmployeeId);

            if (e == null)
            {
                continue;
            }

            if (line.EmployeeCode.Length == 0)
            {
                line.EmployeeCode = e.Code;
                line.EmployeeName = e.FullName;
            }

            line.BankName = e.BankName;
            line.BankAccountNo = e.BankAccountNo;
            line.MfsName = e.MfsName;
            line.MfsNo = e.MfsNo;
        }
    }

    private async Task<Source> SourceAsync(string type, long sourceId)
    {
        Source source = new() { SourceId = sourceId };

        if (type == Salary || type == Overtime)
        {
            HrSalarySheets sheet =
                await _context.Set<HrSalarySheets>().AsNoTracking()
                    .FirstOrDefaultAsync(x => x.SalarySheetId == sourceId && !x.IsDeleted)
                ?? throw new InvalidOperationException("Pick the salary sheet.");

            if (sheet.Status != Posted)
            {
                throw new InvalidOperationException($"{sheet.Code} is {sheet.Status} : only a Posted salary sheet is paid.");
            }

            var rows =
                await _context.Set<HrSalarySheetLines>().AsNoTracking()
                    .Where(x => x.SalarySheetId == sourceId)
                    .OrderBy(x => x.EmployeeCode)
                    .Select(x => new { x.SalarySheetLineId, x.EmployeeId, x.EmployeeCode, x.EmployeeName, x.DesignationName, x.NetPay, x.OvertimeAmount })
                    .ToListAsync();

            source.Code = type == Overtime ? OvertimeCode(sheet.Code) : sheet.Code;
            source.Text = $"{source.Code} : {MonthText(sheet.Year, sheet.Month)}";
            source.BranchId = sheet.BranchId;
            source.Lines =
                rows
                    .Select(x => new HrPaymentLineDto
                    {
                        EmployeeId = x.EmployeeId,
                        SalarySheetLineId = x.SalarySheetLineId,
                        EmployeeCode = x.EmployeeCode,
                        EmployeeName = x.EmployeeName,
                        DesignationName = x.DesignationName,
                        Payable = type == Overtime ? x.OvertimeAmount : x.NetPay
                    })
                    .Where(x => x.Payable > 0)
                    .ToList();
        }
        else if (type == Bonus)
        {
            HrBonusSheets sheet =
                await _context.Set<HrBonusSheets>().AsNoTracking()
                    .FirstOrDefaultAsync(x => x.BonusSheetId == sourceId && !x.IsDeleted)
                ?? throw new InvalidOperationException("Pick the bonus sheet.");

            if (sheet.Status != Posted)
            {
                throw new InvalidOperationException($"{sheet.Code} is {sheet.Status} : only a Posted bonus sheet is paid.");
            }

            source.Code = sheet.Code;
            source.Text = $"{sheet.Code} : {sheet.Title}";
            source.BranchId = sheet.BranchId;
            source.Lines =
                await _context.Set<HrBonusSheetLines>().AsNoTracking()
                    .Where(x => x.BonusSheetId == sourceId && x.Amount > 0)
                    .OrderBy(x => x.EmployeeCode)
                    .Select(x => new HrPaymentLineDto
                    {
                        EmployeeId = x.EmployeeId,
                        SalarySheetLineId = x.BonusSheetLineId,
                        EmployeeCode = x.EmployeeCode,
                        EmployeeName = x.EmployeeName,
                        DesignationName = x.DesignationName,
                        Payable = x.Amount
                    })
                    .ToListAsync();
        }
        else if (type == Advance)
        {
            HrSalaryAdvances advance =
                await _context.Set<HrSalaryAdvances>().AsNoTracking()
                    .FirstOrDefaultAsync(x => x.AdvanceId == sourceId && !x.IsDeleted)
                ?? throw new InvalidOperationException("Pick the salary advance.");

            source.Code = advance.Code;
            source.Text = $"{advance.Code} : {advance.AdvanceType} of {HrCalendar.Day(advance.AdvanceDate)}";
            source.Lines =
                new List<HrPaymentLineDto> { new() { EmployeeId = advance.EmployeeId, Payable = advance.Amount } };
        }
        else if (type == Encashment)
        {
            HrLeaveEncashments encashment =
                await _context.Set<HrLeaveEncashments>().AsNoTracking()
                    .FirstOrDefaultAsync(x => x.LeaveEncashmentId == sourceId && !x.IsDeleted && x.Status == "Approved")
                ?? throw new InvalidOperationException("Pick an approved leave encashment.");

            source.Code = encashment.Code;
            source.Text = $"{encashment.Code} : {encashment.Days:0.##} day(s), {HrCalendar.Day(encashment.EncashDate)}";
            source.BranchId = encashment.BranchId;
            source.Lines =
                new List<HrPaymentLineDto> { new() { EmployeeId = encashment.EmployeeId, Payable = encashment.Amount } };
        }
        else if (type == PfSettlement)
        {
            HrPfSettlements settlement =
                await _context.Set<HrPfSettlements>().AsNoTracking()
                    .FirstOrDefaultAsync(x => x.PfSettlementId == sourceId && !x.IsDeleted)
                ?? throw new InvalidOperationException("Pick the provident fund settlement.");

            source.Code = settlement.Code;
            source.Text = $"{settlement.Code} : {settlement.Reason}, {HrCalendar.Day(settlement.SettlementDate)}";
            source.Lines =
                settlement.NetPayable > 0
                    ? new List<HrPaymentLineDto> { new() { EmployeeId = settlement.EmployeeId, Payable = settlement.NetPayable } }
                    : new List<HrPaymentLineDto>();
        }
        else
        {
            HrPfLoans loan =
                await _context.Set<HrPfLoans>().AsNoTracking()
                    .FirstOrDefaultAsync(x => x.PfLoanId == sourceId && !x.IsDeleted)
                ?? throw new InvalidOperationException("Pick the provident fund loan.");

            source.Code = loan.Code;
            source.Text = $"{loan.Code} : loan of {HrCalendar.Day(loan.LoanDate)}";
            source.Lines =
                new List<HrPaymentLineDto> { new() { EmployeeId = loan.EmployeeId, Payable = loan.Amount } };
        }

        await FillAccountsAsync(source.Lines);

        // (a settlement / a loan / an advance / an encashment : one
        //  employee; paid in the branch of the employee unless the
        //  source has its own)
        if (!ByLine(type) && source.Lines.Count > 0)
        {
            source.Text = $"{source.Text}, {source.Lines[0].EmployeeCode} {source.Lines[0].EmployeeName}";
        }

        if (source.BranchId == 0 && source.Lines.Count > 0)
        {
            long employeeId = source.Lines[0].EmployeeId;

            source.BranchId =
                await _context.Set<HrEmployees>().AsNoTracking()
                    .Where(x => x.EmployeeId == employeeId)
                    .Select(x => x.BranchId)
                    .FirstOrDefaultAsync();
        }

        var paid = await PaidAsync(type, sourceId);

        foreach (HrPaymentLineDto line in source.Lines)
        {
            line.Paid = paid.TryGetValue((line.EmployeeId, line.SalarySheetLineId), out decimal done) ? done : 0;
            line.Due = Math.Max(0, line.Payable - line.Paid);
        }

        return source;
    }


    //===========================================================
    // Read
    //===========================================================

    public async Task<List<HrPaymentListItemDto>> GetListAsync(string group)
    {
        string[] types = TypesOf(group);

        List<HrPayments> rows =
            await Payments.AsNoTracking()
                .Where(x => types.Contains(x.PaymentType))
                .OrderByDescending(x => x.PaymentDate).ThenByDescending(x => x.PaymentId)
                .ToListAsync();

        List<long> ids = rows.Select(x => x.PaymentId).ToList();

        var counts =
            await PaymentLines.AsNoTracking()
                .Where(x => ids.Contains(x.PaymentId))
                .GroupBy(x => x.PaymentId)
                .Select(g => new { PaymentId = g.Key, Count = g.Count() })
                .ToListAsync();

        Dictionary<long, string> branches = await BranchNamesAsync();

        Dictionary<long, Guid> vouchers = await VoucherIdsAsync(rows.Select(x => x.PaymentVoucherId));

        return rows
            .Select(x =>
            {
                HrPaymentListItemDto dto = new();

                Fill(dto, x, branches, counts.FirstOrDefault(c => c.PaymentId == x.PaymentId)?.Count ?? 0);

                dto.PaymentVoucherPublicId =
                    x.PaymentVoucherId != null && vouchers.TryGetValue(x.PaymentVoucherId.Value, out Guid id) ? id : null;

                return dto;
            })
            .ToList();
    }

    private static void Fill(HrPaymentListItemDto dto, HrPayments x, Dictionary<long, string> branches, int employees)
    {
        dto.PublicId = x.PublicId;
        dto.Code = x.Code;
        dto.PaymentType = x.PaymentType;
        dto.PaymentTypeText = TypeText(x.PaymentType);
        dto.SourceCode = x.SourceCode;
        dto.BranchId = x.BranchId;
        dto.BranchName = branches.TryGetValue(x.BranchId, out string? name) ? name : string.Empty;
        dto.PaymentDate = HrCalendar.Day(x.PaymentDate);
        dto.TotalAmount = x.TotalAmount;
        dto.PaymentModes = x.PaymentModes;
        dto.EmployeeCount = employees;
        dto.PaymentVoucherNo = x.PaymentVoucherNo;
        dto.IsCancelled = x.IsCancelled;
        dto.CancelReason = x.CancelReason;
        dto.Remarks = x.Remarks;
    }

    public async Task<HrPaymentDto> GetAsync(string group, Guid publicId)
    {
        string[] types = TypesOf(group);

        HrPayments x =
            await Payments.AsNoTracking().FirstOrDefaultAsync(p => p.PublicId == publicId && types.Contains(p.PaymentType))
            ?? throw new KeyNotFoundException("The payment was not found.");

        List<HrPaymentLines> rows =
            await PaymentLines.AsNoTracking().Where(l => l.PaymentId == x.PaymentId).OrderBy(l => l.PaymentLineId).ToListAsync();

        List<long> lineIds = rows.Where(l => l.SalarySheetLineId > 0).Select(l => l.SalarySheetLineId).ToList();

        var sheetLines =
            await _context.Set<HrSalarySheetLines>().AsNoTracking()
                .Where(l => lineIds.Contains(l.SalarySheetLineId))
                .Select(l => new { l.SalarySheetLineId, l.EmployeeCode, l.EmployeeName, l.DesignationName })
                .ToListAsync();

        // (a bonus payment : the lines of the bonus sheet)
        var bonusLines =
            x.PaymentType == Bonus
                ? await _context.Set<HrBonusSheetLines>().AsNoTracking()
                    .Where(l => lineIds.Contains(l.BonusSheetLineId))
                    .Select(l => new { SalarySheetLineId = l.BonusSheetLineId, l.EmployeeCode, l.EmployeeName, l.DesignationName })
                    .ToListAsync()
                : null;

        if (bonusLines != null)
        {
            sheetLines = bonusLines;
        }

        HrPaymentDto dto = new();

        Fill(dto, x, await BranchNamesAsync(), rows.Count);

        dto.PaymentVoucherPublicId =
            (await VoucherIdsAsync(new[] { x.PaymentVoucherId })).Values.Select(v => (Guid?)v).FirstOrDefault();

        dto.Lines =
            rows
                .Select(l =>
                {
                    var s = sheetLines.FirstOrDefault(v => v.SalarySheetLineId == l.SalarySheetLineId);

                    return new HrPaymentLineDto
                    {
                        EmployeeId = l.EmployeeId,
                        SalarySheetLineId = l.SalarySheetLineId,
                        EmployeeCode = s?.EmployeeCode ?? string.Empty,
                        EmployeeName = s?.EmployeeName ?? string.Empty,
                        DesignationName = s?.DesignationName ?? string.Empty,
                        Amount = l.Amount
                    };
                })
                .OrderBy(l => l.EmployeeCode)
                .ToList();

        await FillAccountsAsync(dto.Lines);

        dto.Lines = dto.Lines.OrderBy(l => l.EmployeeCode).ToList();

        return dto;
    }

    // What can still be paid : the sources of a kind with something due
    public async Task<List<HrPaymentSourceDto>> GetSourcesAsync(string group, string type)
    {
        string kind = TypeOf(group, type);

        List<long> ids;

        if (kind == Salary || kind == Overtime)
        {
            ids =
                await _context.Set<HrSalarySheets>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.Status == Posted)
                    .OrderByDescending(x => x.Year).ThenByDescending(x => x.Month).ThenBy(x => x.Code)
                    .Select(x => x.SalarySheetId)
                    .ToListAsync();
        }
        else if (kind == Bonus)
        {
            ids =
                await _context.Set<HrBonusSheets>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.Status == Posted)
                    .OrderByDescending(x => x.BonusDate).ThenByDescending(x => x.BonusSheetId)
                    .Select(x => x.BonusSheetId)
                    .ToListAsync();
        }
        else if (kind == Advance)
        {
            ids =
                await _context.Set<HrSalaryAdvances>().AsNoTracking()
                    .Where(x => !x.IsDeleted)
                    .OrderByDescending(x => x.AdvanceId)
                    .Select(x => x.AdvanceId)
                    .ToListAsync();
        }
        else if (kind == Encashment)
        {
            ids =
                await _context.Set<HrLeaveEncashments>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.Status == "Approved")
                    .OrderByDescending(x => x.LeaveEncashmentId)
                    .Select(x => x.LeaveEncashmentId)
                    .ToListAsync();
        }
        else if (kind == PfSettlement)
        {
            ids =
                await _context.Set<HrPfSettlements>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.NetPayable > 0)
                    .OrderByDescending(x => x.PfSettlementId)
                    .Select(x => x.PfSettlementId)
                    .ToListAsync();
        }
        else
        {
            ids =
                await _context.Set<HrPfLoans>().AsNoTracking()
                    .Where(x => !x.IsDeleted)
                    .OrderByDescending(x => x.PfLoanId)
                    .Select(x => x.PfLoanId)
                    .ToListAsync();
        }

        Dictionary<long, string> branches = await BranchNamesAsync();

        List<HrPaymentSourceDto> result = new();

        foreach (long id in ids)
        {
            Source source = await SourceAsync(kind, id);

            decimal due = source.Lines.Sum(x => x.Due);

            if (due <= 0)
            {
                continue;
            }

            string branch = branches.TryGetValue(source.BranchId, out string? name) ? name : string.Empty;

            result.Add(
                new HrPaymentSourceDto
                {
                    SourceId = id,
                    Code = source.Code,
                    Text = $"{source.Text}{(ByLine(kind) ? ", " + branch : string.Empty)}  (due Tk {Money(due)})",
                    BranchId = source.BranchId,
                    BranchName = branch,
                    Payable = source.Lines.Sum(x => x.Payable),
                    Paid = source.Lines.Sum(x => x.Paid),
                    Due = due
                });
        }

        return result;
    }

    public async Task<List<HrPaymentLineDto>> GetDuesAsync(string group, string type, long sourceId) =>
        (await SourceAsync(TypeOf(group, type), sourceId)).Lines;


    //===========================================================
    // Pay
    //===========================================================

    // The ledger the payment is debited to (Posting Setup)
    private string DebitLedger(string type)
    {
        if (type == Overtime)
        {
            // (as the salary sheet posted it : Overtime Payable, or
            //  Salary Payable when that row has no ledger)
            string own = PostingLedgerCodes.TryGet(_context, "PAYROLL-OVERTIME-PAYABLE");

            return own.Length > 0 ? own : PostingLedgerCodes.Get(_context, "PAYROLL-SALARY-PAYABLE");
        }

        return PostingLedgerCodes.Get(
            _context,
            type == PfSettlement ? "PF-SETTLEMENT-PAYABLE"
            : type == PfLoan ? "PF-LOAN-RECEIVABLE"
            : type == Advance ? "PAYROLL-STAFF-ADVANCE"
            : type == Bonus ? "PAYROLL-BONUS-PAYABLE"
            : type == Encashment ? "PAYROLL-LEAVE-ENCASH-PAYABLE"
            : "PAYROLL-SALARY-PAYABLE");
    }

    public async Task<HrPaymentDto> CreateAsync(string group, CreateHrPaymentDto dto, long userId)
    {
        string type = TypeOf(group, dto.PaymentType);

        DateOnly date =
            HrCalendar.ParseDay(dto.PaymentDate)
            ?? throw new InvalidOperationException("Payment Date is required.");

        if (date > HrCalendar.Today())
        {
            throw new InvalidOperationException("The payment date cannot be in the future.");
        }

        string remarks = (dto.Remarks ?? string.Empty).Trim();

        if (remarks.Length > 500)
        {
            throw new InvalidOperationException("Remarks : 500 characters at most.");
        }

        Source source = await SourceAsync(type, dto.SourceId);

        // the amounts : whole lines of the source, never more than
        // what is still due
        List<HrPaymentLines> lines = new();

        foreach (CreateHrPaymentLineDto row in dto.Lines ?? new List<CreateHrPaymentLineDto>())
        {
            decimal amount = Math.Round(row.Amount, 2);

            if (amount <= 0)
            {
                continue;
            }

            HrPaymentLineDto due =
                source.Lines.FirstOrDefault(x => x.EmployeeId == row.EmployeeId && x.SalarySheetLineId == row.SalarySheetLineId)
                ?? throw new InvalidOperationException($"An employee of the payment is not on {source.Code}.");

            if (lines.Any(x => x.EmployeeId == row.EmployeeId && x.SalarySheetLineId == row.SalarySheetLineId))
            {
                throw new InvalidOperationException($"{due.EmployeeCode} {due.EmployeeName} is on the payment twice.");
            }

            if (amount > due.Due)
            {
                throw new InvalidOperationException($"{due.EmployeeCode} {due.EmployeeName} : Tk {Money(amount)} is more than what is still due (Tk {Money(due.Due)}).");
            }

            lines.Add(new HrPaymentLines { EmployeeId = row.EmployeeId, SalarySheetLineId = row.SalarySheetLineId, Amount = amount });
        }

        decimal total = lines.Sum(x => x.Amount);

        if (total <= 0)
        {
            throw new InvalidOperationException("Type the amount to pay for at least one employee.");
        }

        List<PaymentVoucherCreditDto> credits = (dto.Credits ?? new List<PaymentVoucherCreditDto>()).Where(x => x.Amount > 0).ToList();

        decimal money = credits.Sum(x => Math.Round(x.Amount, 2));

        if (money != total)
        {
            throw new InvalidOperationException($"The payment modes add up to Tk {Money(money)}; the payment is Tk {Money(total)}.");
        }

        string ledger = DebitLedger(type);

        string what = $"{TypeText(type)} {source.Text}";

        await using var transaction = await _context.Database.BeginTransactionAsync();

        HrPayments entity = new()
        {
            Code = await NextCodeAsync(type, source.BranchId, date),
            PaymentType = type,
            SourceId = source.SourceId,
            SourceCode = source.Code,
            BranchId = source.BranchId,
            PaymentDate = date,
            TotalAmount = total,
            PaymentModes = string.Join(", ", credits.Select(x => (x.Mode ?? string.Empty).Trim()).Where(x => x.Length > 0).Distinct()),
            Remarks = remarks,
            IsCancelled = false,
            CreatedBy = userId,
            CreatedDate = DateTime.UtcNow
        };

        if (entity.PaymentModes.Length > 60)
        {
            entity.PaymentModes = entity.PaymentModes.Substring(0, 60);
        }

        Payments.Add(entity);

        await _context.SaveChangesAsync();

        foreach (HrPaymentLines line in lines)
        {
            line.PaymentId = entity.PaymentId;

            PaymentLines.Add(line);
        }

        string narration = $"{what} : {lines.Count} employee(s), Tk {Money(total)} | {entity.Code}{(remarks.Length > 0 ? " | " + remarks : string.Empty)}";

        PaymentVoucherSavedDto voucher =
            await _paymentVouchers.CreatePostedAsync(
                new CreatePaymentVoucherDto
                {
                    VoucherDate = HrCalendar.Day(date),
                    BranchId = source.BranchId,
                    Narration = narration.Length > 500 ? narration.Substring(0, 500) : narration,
                    Debits =
                        new List<PaymentVoucherDebitDto>
                        {
                            new()
                            {
                                LedgerType = "General Ledger",
                                LedgerCode = ledger,
                                Amount = total,
                                ShortNotes = $"{entity.Code} : {source.Code}"
                            }
                        },
                    Credits = credits
                },
                SourceName(type),
                $"{entity.Code} · {source.Code}",
                userId);

        string voucherNo = voucher.VoucherNo ?? string.Empty;

        entity.PaymentVoucherId = voucher.PaymentVoucherId;
        entity.PaymentVoucherNo = voucherNo.Length > 30 ? voucherNo.Substring(0, 30) : voucherNo;

        AddHistory(entity.PaymentId, "Create", $"{SourceName(type)} Saved", $"{entity.Code} : {what}. {lines.Count} employee(s), Tk {Money(total)}, {entity.PaymentModes}. Payment Voucher {entity.PaymentVoucherNo}.", userId);

        await _context.SaveChangesAsync();

        await MarkSheetLinesAsync(type, source.SourceId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetAsync(group, entity.PublicId);
    }

    // PPY-010101-2627-11-00001 : as a voucher number (branch,
    // financial year, month of the payment date, serial of that
    // month). PFP- for the payments of the provident fund.
    private async Task<string> NextCodeAsync(string type, long branchId, DateOnly date)
    {
        VoucherPeriodDto period = await _numbers.ResolvePeriodAsync(branchId, date);

        string start =
            $"{(type == PfSettlement || type == PfLoan ? "PFP" : "PPY")}-{period.BranchDigits}-{period.FinancialYearCode}-{period.PeriodMonth:D2}-";

        List<string> codes =
            await Payments.AsNoTracking().Where(x => x.Code.StartsWith(start)).Select(x => x.Code).ToListAsync();

        int highest = 0;

        foreach (string code in codes)
        {
            if (int.TryParse(code.Substring(start.Length), out int number) && number > highest)
            {
                highest = number;
            }
        }

        return $"{start}{highest + 1:D5}";
    }

    // The salary sheet shows who is paid : a line is Paid when its
    // net pay is paid in full (set here, never typed)
    private async Task MarkSheetLinesAsync(string type, long sheetId)
    {
        if (type != Salary)
        {
            return;
        }

        var paid = await PaidAsync(Salary, sheetId);

        var last =
            await (
                from p in Payments.AsNoTracking()
                where p.PaymentType == Salary && p.SourceId == sheetId && !p.IsCancelled
                join l in PaymentLines.AsNoTracking() on p.PaymentId equals l.PaymentId
                group p by l.SalarySheetLineId into g
                select new { SalarySheetLineId = g.Key, Date = g.Max(x => x.PaymentDate) })
            .ToListAsync();

        List<HrSalarySheetLines> sheetLines =
            await _context.Set<HrSalarySheetLines>().Where(x => x.SalarySheetId == sheetId).ToListAsync();

        foreach (HrSalarySheetLines line in sheetLines)
        {
            decimal done = paid.TryGetValue((line.EmployeeId, line.SalarySheetLineId), out decimal amount) ? amount : 0;

            bool isPaid = line.NetPay > 0 && done >= line.NetPay;

            line.IsPaid = isPaid;
            line.PaidDate = isPaid ? last.FirstOrDefault(x => x.SalarySheetLineId == line.SalarySheetLineId)?.Date : null;
            line.PaidNote = isPaid ? "Payroll Payments" : string.Empty;
        }
    }


    //===========================================================
    // Cancel
    //===========================================================

    public async Task CancelAsync(string group, Guid publicId, CancelHrPaymentDto dto, long userId)
    {
        string[] types = TypesOf(group);

        string reason = (dto?.Reason ?? string.Empty).Trim();

        if (reason.Length == 0)
        {
            throw new InvalidOperationException("Write why the payment is cancelled.");
        }

        if (reason.Length > 300)
        {
            throw new InvalidOperationException("Reason : 300 characters at most.");
        }

        HrPayments entity =
            await Payments.FirstOrDefaultAsync(x => x.PublicId == publicId && types.Contains(x.PaymentType))
            ?? throw new KeyNotFoundException("The payment was not found.");

        if (entity.IsCancelled)
        {
            throw new InvalidOperationException($"{entity.Code} is cancelled already.");
        }

        // An advance payment : salary sheets may already recover
        // what it paid out (only paid-out money is recovered)
        if (entity.PaymentType == Advance)
        {
            decimal recovered =
                (await SalaryAdvancesRepository.RecoveredAsync(_context, new List<long> { entity.SourceId }))
                    .GetValueOrDefault(entity.SourceId);

            decimal paidLeft =
                (await SalaryAdvancesRepository.PaidOutAsync(_context, new List<long> { entity.SourceId }))
                    .GetValueOrDefault(entity.SourceId) - entity.TotalAmount;

            if (recovered > paidLeft)
            {
                throw new InvalidOperationException(
                    $"Salary sheets have recovered Tk {Money(recovered)} of {entity.SourceCode} : delete or recalculate those sheets (unpost first if posted) before cancelling this payment.");
            }
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (entity.PaymentVoucherId != null)
        {
            await _paymentVouchers.CancelBySourceAsync(
                entity.PaymentVoucherId.Value,
                new CancelPaymentVoucherDto { CancelDate = HrCalendar.Day(HrCalendar.Today()), Reason = $"{entity.Code} cancelled : {reason}" },
                userId);
        }

        entity.IsCancelled = true;
        entity.CancelReason = reason;
        entity.CancelledBy = userId;
        entity.CancelledDate = DateTime.UtcNow;

        AddHistory(entity.PaymentId, "Cancel", $"{SourceName(entity.PaymentType)} Cancelled", $"{entity.Code} : {entity.SourceCode}, Tk {Money(entity.TotalAmount)}. Payment Voucher {entity.PaymentVoucherNo} cancelled. Reason : {reason}", userId);

        await _context.SaveChangesAsync();

        await MarkSheetLinesAsync(entity.PaymentType, entity.SourceId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    //===========================================================
    // For the other pages : is something of it paid ?
    //===========================================================

    // source -> what the payments that are not cancelled paid of it
    public static async Task<Dictionary<long, decimal>> PaidBySourceAsync(AppDbContext context, string type) =>
        (await context.Set<HrPayments>().AsNoTracking()
            .Where(x => x.PaymentType == type && !x.IsCancelled)
            .GroupBy(x => x.SourceId)
            .Select(g => new { SourceId = g.Key, Amount = g.Sum(x => x.TotalAmount) })
            .ToListAsync())
        .ToDictionary(x => x.SourceId, x => x.Amount);

    // line of a source -> what was paid of it
    public static async Task<Dictionary<long, decimal>> PaidByLineAsync(AppDbContext context, string type, long sourceId) =>
        (await (
            from p in context.Set<HrPayments>().AsNoTracking()
            where p.PaymentType == type && p.SourceId == sourceId && !p.IsCancelled
            join l in context.Set<HrPaymentLines>().AsNoTracking() on p.PaymentId equals l.PaymentId
            group l by l.SalarySheetLineId into g
            select new { LineId = g.Key, Amount = g.Sum(x => x.Amount) })
        .ToListAsync())
        .ToDictionary(x => x.LineId, x => x.Amount);

    public static Task<bool> AnyAsync(AppDbContext context, string[] types, long sourceId) =>
        context.Set<HrPayments>().AsNoTracking().AnyAsync(x => types.Contains(x.PaymentType) && x.SourceId == sourceId && !x.IsCancelled);
}
