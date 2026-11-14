//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.HumanResourceManangement.AttendanceManagement;
using AppCore.Application.HumanResourceManangement.PayrollManagement;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;
using AppCore.Domain.Entities.HumanResourceManangement.PayrollManagement;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.Accounting;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;
using AppCore.Domain.Entities.HumanResourceManangement.ProvidentFund;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.HumanResourceSetup;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.ProvidentFund;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.HumanResourceManangement.PayrollManagement;


//===============================================================
// Salary Sheets Repository (hand-written pages, 2026-11-13; NEVER
// run Code Sync for them)
//
//   Code SAL-0001. One live sheet per branch per month.
//   Draft -> Approved -> Posted (and back, one step at a time).
//
//   A line (one employee), worked out from Monthly Attendance,
//   the employee's salary structure and the salary advances :
//     Unpaid days  = absent + unpaid leave + not marked
//                    + half days x 0.5 + days before joining
//                    (days of the month still to come are paid)
//     Absence cut  = prorated earnings x unpaid days / month days
//     Late cut     = (late days / LateDaysPerCut, whole)
//                    x Basic / month days        (0 = no cut)
//     Overtime     = the employee's overtime structure : extra
//                    hours and extra days (OvertimeStructuresRepository)
//     Earned       = Gross - absence - late + overtime
//                    + other earning (typed)
//     Deductions, each no more than what is left of Earned :
//       the structure's deductions (provident fund, tax ...),
//       other deduction (typed), then the advance installments
//     Net Pay      = Earned - deductions
//   Employees without a salary structure are left off.
//
//   Posting writes one Journal Voucher (Posting Setup, Payroll
//   and Provident Fund) :
//     Dr  PAYROLL-SALARY-EXPENSE       total Earned (the overtime
//                                      is not part of it)
//     Dr  PAYROLL-OVERTIME-EXPENSE     the overtime, with
//     Cr  PAYROLL-OVERTIME-PAYABLE     (a group of their own; a row
//                                      without a ledger falls back
//                                      to the salary ledger)
//     Dr  PF-COMPANY-CONTRIBUTION      company part of the fund
//     Cr  PAYROLL-STAFF-ADVANCE        advances recovered
//     Cr  <ledger of the head>         every deduction head with a
//                                      Payable Ledger (Salary Heads)
//     Cr  PAYROLL-OTHER-DEDUCTIONS     the typed other deductions,
//                                      and a deduction head without
//                                      a ledger of its own
//     Cr  PF-MEMBERS-FUND              own part + company part
//     Cr  PF-LOAN-RECEIVABLE           principal in the PF loan instalments
//     Cr  PF-LOAN-INTEREST-INCOME      interest in the PF loan instalments
//     Cr  PAYROLL-SALARY-PAYABLE       the rest of the Net Pay
//   dated the last day of the month (today when that is still to
//   come). Unposting cancels the voucher. Paying the salary out
//   is a Payment Voucher (debit Salary Payable); here the lines
//   are only marked Paid.
//===============================================================

public class SalarySheetsRepository
    : ISalarySheetsRepository
{
    private const string HistoryModule = "Human Resource";

    public const string HistoryEntity = "HrSalarySheets";

    private const string LedgerTypeGeneral = "General Ledger";

    private const string StatusDraft = "Draft";

    private const string StatusApproved = "Approved";

    private const string StatusPosted = "Posted";

    private static readonly string[] MonthNames =
    {
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    };

    private readonly AppDbContext _context;

    private readonly IAttendanceRepository _attendance;

    private readonly IJournalVoucherRepository _journalVouchers;

    public SalarySheetsRepository(
        AppDbContext context,
        IAttendanceRepository attendance,
        IJournalVoucherRepository journalVouchers)
    {
        _context = context;
        _attendance = attendance;
        _journalVouchers = journalVouchers;
    }

    private DbSet<HrSalarySheets> Sheets => _context.Set<HrSalarySheets>();

    private DbSet<HrSalarySheetLines> Lines => _context.Set<HrSalarySheetLines>();

    private DbSet<HrSalarySheetLineHeads> LineHeads => _context.Set<HrSalarySheetLineHeads>();

    private DbSet<HrAdvanceRecoveries> Recoveries => _context.Set<HrAdvanceRecoveries>();


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

    private static string MonthText(int year, int month) =>
        $"{MonthNames[month - 1]} {year}";

    private static string Money(decimal amount) =>
        amount.ToString("#,0.00");

    private static string NextCode(IEnumerable<string> codes)
    {
        int highest = 0;

        foreach (string code in codes)
        {
            string value = (code ?? string.Empty).Trim();

            if (value.StartsWith("SAL-", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value.Substring(4), out int number)
                && number > highest)
            {
                highest = number;
            }
        }

        return $"SAL-{highest + 1:D4}";
    }

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

    private async Task<HrSalarySheets> FindAsync(Guid publicId)
    {
        return await Sheets.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The salary sheet was not found.");
    }

    private async Task<string> BranchNameAsync(long branchId)
    {
        return await _context.Set<Branches>().AsNoTracking()
            .Where(x => x.BranchId == branchId)
            .Select(x => x.BranchName)
            .FirstOrDefaultAsync() ?? string.Empty;
    }

    private async Task<string> DescribeAsync(HrSalarySheets s) =>
        $"{s.Code} : {MonthText(s.Year, s.Month)}, {await BranchNameAsync(s.BranchId)}, {s.EmployeeCount} employee(s), net Tk {Money(s.TotalNet)}.";

    private static void Require(HrSalarySheets sheet, string status, string action)
    {
        if (sheet.Status != status)
        {
            throw new InvalidOperationException($"{sheet.Code} is {sheet.Status} : only a {status} sheet can be {action}.");
        }
    }

    private async Task InTransactionAsync(Func<Task> work)
    {
        if (_context.Database.CurrentTransaction != null)
        {
            await work();

            return;
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            await work();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // Read
    //===========================================================

    private static void Fill(SalarySheetListItemDto dto, HrSalarySheets s, string branchName, int paid)
    {
        dto.PublicId = s.PublicId;
        dto.Code = s.Code;
        dto.Year = s.Year;
        dto.Month = s.Month;
        dto.BranchId = s.BranchId;
        dto.BranchName = branchName;
        dto.Status = s.Status;
        dto.EmployeeCount = s.EmployeeCount;
        dto.PaidCount = paid;
        dto.TotalGross = s.TotalGross;
        dto.TotalEarned = s.TotalEarned;
        dto.TotalDeductions = s.TotalDeductions;
        dto.TotalNet = s.TotalNet;
        dto.JournalVoucherNo = s.JournalVoucherNo;
    }

    public async Task<List<SalarySheetListItemDto>> GetListAsync()
    {
        List<HrSalarySheets> sheets =
            await Sheets.AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.Year).ThenByDescending(x => x.Month).ThenBy(x => x.Code)
                .ToListAsync();

        List<long> ids = sheets.Select(x => x.SalarySheetId).ToList();

        var paid =
            await Lines.AsNoTracking()
                .Where(x => ids.Contains(x.SalarySheetId) && x.IsPaid)
                .GroupBy(x => x.SalarySheetId)
                .Select(g => new { SalarySheetId = g.Key, Count = g.Count() })
                .ToListAsync();

        var branches =
            await _context.Set<Branches>().AsNoTracking()
                .Select(x => new { x.BranchId, x.BranchName })
                .ToListAsync();

        return sheets
            .Select(s =>
            {
                SalarySheetListItemDto dto = new();

                Fill(
                    dto,
                    s,
                    branches.FirstOrDefault(b => b.BranchId == s.BranchId)?.BranchName ?? string.Empty,
                    paid.FirstOrDefault(p => p.SalarySheetId == s.SalarySheetId)?.Count ?? 0);

                return dto;
            })
            .ToList();
    }

    //===========================================================
    // Overtime Sheets : the overtime of a POSTED salary sheet.
    // No table : the sheet is there when the salary sheet is
    // posted and goes when it is unposted. OTS-0001 for SAL-0001.
    //===========================================================

    private static string OvertimeCode(string sheetCode) =>
        sheetCode.StartsWith("SAL", StringComparison.OrdinalIgnoreCase) ? "OTS" + sheetCode.Substring(3) : "OTS-" + sheetCode;

    private static void FillOvertime(OvertimeSheetListItemDto dto, HrSalarySheets s, string branchName, int employees, decimal hours, decimal days, decimal amount)
    {
        dto.PublicId = s.PublicId;
        dto.Code = OvertimeCode(s.Code);
        dto.SalarySheetCode = s.Code;
        dto.Year = s.Year;
        dto.Month = s.Month;
        dto.BranchId = s.BranchId;
        dto.BranchName = branchName;
        dto.EmployeeCount = employees;
        dto.OvertimeHours = hours;
        dto.OvertimeDays = days;
        dto.Amount = amount;
        dto.PostedDate = s.PostedDate == null ? string.Empty : HrCalendar.Day(DateOnly.FromDateTime(s.PostedDate.Value.ToLocalTime()));
        dto.JournalVoucherNo = s.JournalVoucherNo;
    }

    public async Task<List<OvertimeSheetListItemDto>> GetOvertimeSheetsAsync()
    {
        List<HrSalarySheets> sheets =
            await Sheets.AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status == StatusPosted)
                .OrderByDescending(x => x.Year).ThenByDescending(x => x.Month).ThenBy(x => x.Code)
                .ToListAsync();

        List<long> ids = sheets.Select(x => x.SalarySheetId).ToList();

        var totals =
            await Lines.AsNoTracking()
                .Where(x => ids.Contains(x.SalarySheetId) && x.OvertimeAmount > 0)
                .GroupBy(x => x.SalarySheetId)
                .Select(g => new
                {
                    SalarySheetId = g.Key,
                    Count = g.Count(),
                    Hours = g.Sum(x => x.OvertimeHours),
                    Days = g.Sum(x => x.OvertimeDays),
                    Amount = g.Sum(x => x.OvertimeAmount)
                })
                .ToListAsync();

        var branches =
            await _context.Set<Branches>().AsNoTracking()
                .Select(x => new { x.BranchId, x.BranchName })
                .ToListAsync();

        List<OvertimeSheetListItemDto> result = new();

        foreach (HrSalarySheets s in sheets)
        {
            var total = totals.FirstOrDefault(x => x.SalarySheetId == s.SalarySheetId);

            // (a salary sheet without overtime has no overtime sheet)
            if (total == null)
            {
                continue;
            }

            OvertimeSheetListItemDto dto = new();

            FillOvertime(
                dto,
                s,
                branches.FirstOrDefault(b => b.BranchId == s.BranchId)?.BranchName ?? string.Empty,
                total.Count,
                total.Hours,
                total.Days,
                total.Amount);

            result.Add(dto);
        }

        return result;
    }

    public async Task<OvertimeSheetDto> GetOvertimeSheetAsync(Guid publicId)
    {
        HrSalarySheets s =
            await Sheets.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted && x.Status == StatusPosted)
            ?? throw new KeyNotFoundException("The overtime sheet was not found : its salary sheet is not posted (any more).");

        List<OvertimeSheetLineDto> lines =
            await Lines.AsNoTracking()
                .Where(x => x.SalarySheetId == s.SalarySheetId && x.OvertimeAmount > 0)
                .OrderBy(x => x.EmployeeCode)
                .Select(x => new OvertimeSheetLineDto
                {
                    EmployeeCode = x.EmployeeCode,
                    EmployeeName = x.EmployeeName,
                    DesignationName = x.DesignationName,
                    DepartmentName = x.DepartmentName,
                    BasicSalary = x.BasicSalary,
                    GrossSalary = x.GrossSalary,
                    OvertimeHours = x.OvertimeHours,
                    OvertimeDays = x.OvertimeDays,
                    Amount = x.OvertimeAmount
                })
                .ToListAsync();

        OvertimeSheetDto dto = new() { Lines = lines };

        FillOvertime(
            dto,
            s,
            await BranchNameAsync(s.BranchId),
            lines.Count,
            lines.Sum(x => x.OvertimeHours),
            lines.Sum(x => x.OvertimeDays),
            lines.Sum(x => x.Amount));

        return dto;
    }

    public async Task<SalarySheetDto> GetAsync(Guid publicId)
    {
        HrSalarySheets s =
            await Sheets.AsNoTracking().FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The salary sheet was not found.");

        List<HrSalarySheetLines> lines =
            await Lines.AsNoTracking()
                .Where(x => x.SalarySheetId == s.SalarySheetId)
                .OrderBy(x => x.EmployeeCode)
                .ToListAsync();

        List<long> lineIds = lines.Select(x => x.SalarySheetLineId).ToList();

        // what Payroll Payments have paid of each line's net pay
        Dictionary<long, decimal> paidByLine =
            (await (
                from p in _context.Set<HrPayments>().AsNoTracking()
                where p.PaymentType == HrPaymentsRepository.Salary && p.SourceId == s.SalarySheetId && !p.IsCancelled
                join pl in _context.Set<HrPaymentLines>().AsNoTracking() on p.PaymentId equals pl.PaymentId
                group pl by pl.SalarySheetLineId into g
                select new { SalarySheetLineId = g.Key, Amount = g.Sum(x => x.Amount) })
            .ToListAsync())
            .ToDictionary(x => x.SalarySheetLineId, x => x.Amount);

        List<HrSalarySheetLineHeads> heads =
            await LineHeads.AsNoTracking()
                .Where(x => lineIds.Contains(x.SalarySheetLineId))
                .OrderBy(x => x.HeadType == "Earning" ? 0 : 1).ThenBy(x => x.DisplayOrder)
                .ToListAsync();

        DateOnly monthEnd = new DateOnly(s.Year, s.Month, 1).AddMonths(1).AddDays(-1);

        SalarySheetDto dto = new()
        {
            LateDaysPerCut = s.LateDaysPerCut,
            Remarks = s.Remarks,
            ApprovedDate = s.ApprovedDate == null ? string.Empty : HrCalendar.Day(DateOnly.FromDateTime(s.ApprovedDate.Value.AddHours(6))),
            PostedDate = s.PostedDate == null ? string.Empty : HrCalendar.Day(DateOnly.FromDateTime(s.PostedDate.Value.AddHours(6))),
            NoSalaryCount =
                await _context.Set<HrEmployees>().AsNoTracking()
                    .CountAsync(x => !x.IsDeleted && x.IsActive && x.BranchId == s.BranchId && x.JoiningDate <= monthEnd && x.GrossSalary <= 0)
        };

        Fill(dto, s, await BranchNameAsync(s.BranchId), lines.Count(x => x.IsPaid));

        // not posted yet : the advances it cannot recover (not paid out)
        if (s.Status != StatusPosted)
        {
            dto.UnpaidAdvances =
                await UnpaidAdvancesAsync(s.BranchId, s.Year, s.Month, lines.Select(x => x.EmployeeId).ToList());
        }

        dto.Lines =
            lines
                .Select(l => new SalarySheetLineDto
                {
                    SalarySheetLineId = l.SalarySheetLineId,
                    EmployeeId = l.EmployeeId,
                    EmployeeCode = l.EmployeeCode,
                    EmployeeName = l.EmployeeName,
                    DesignationName = l.DesignationName,
                    DepartmentName = l.DepartmentName,
                    PaymentMode = l.PaymentMode,
                    PaymentAccount = l.PaymentAccount,
                    MonthDays = l.MonthDays,
                    PayableDays = l.PayableDays,
                    UnpaidDays = l.UnpaidDays,
                    LateDays = l.LateDays,
                    OvertimeHours = l.OvertimeHours,
                    OvertimeDays = l.OvertimeDays,
                    BasicSalary = l.BasicSalary,
                    GrossSalary = l.GrossSalary,
                    AbsenceDeduction = l.AbsenceDeduction,
                    LateDeduction = l.LateDeduction,
                    OvertimeAmount = l.OvertimeAmount,
                    PfEmployee = l.PfEmployee,
                    PfCompany = l.PfCompany,
                    PfLoan = l.PfLoan,
                    OtherEarning = l.OtherEarning,
                    OtherDeduction = l.OtherDeduction,
                    EarnedSalary = l.EarnedSalary,
                    StructureDeduction = l.StructureDeduction,
                    AdvanceDeduction = l.AdvanceDeduction,
                    NetPay = l.NetPay,
                    Remarks = l.Remarks,
                    IsPaid = l.IsPaid,
                    PaidAmount = paidByLine.TryGetValue(l.SalarySheetLineId, out decimal paidAmount) ? paidAmount : 0,
                    PaidDate = HrCalendar.Day(l.PaidDate),
                    PaidNote = l.PaidNote,
                    Heads =
                        heads
                            .Where(h => h.SalarySheetLineId == l.SalarySheetLineId)
                            .Select(h => new SalarySheetHeadDto { HeadName = h.HeadName, HeadType = h.HeadType, Amount = h.Amount })
                            .ToList()
                })
                .ToList();

        return dto;
    }

    public async Task<List<UnpaidAdvanceDto>> GetUnpaidAdvancesAsync(long branchId, int year, int month)
    {
        if (branchId <= 0 || year < 2000 || month < 1 || month > 12)
        {
            return new List<UnpaidAdvanceDto>();
        }

        return await UnpaidAdvancesAsync(branchId, year, month, null);
    }

    // Advances due in the month (start month on or before it, not
    // closed, not fully recovered) that were not fully paid out on
    // Payroll Payments by the month end. The sheet recovers only
    // what was paid out (owner, 2026-11-14), so these are a notice,
    // never a block. employeeIds = the sheet's employees; null =
    // the active employees of the branch.
    private async Task<List<UnpaidAdvanceDto>> UnpaidAdvancesAsync(long branchId, int year, int month, List<long>? employeeIds)
    {
        int sheetMonth = year * 12 + month;

        DateOnly monthEnd =
            new DateOnly(year, month, 1).AddMonths(1).AddDays(-1);

        IQueryable<HrEmployees> employees =
            _context.Set<HrEmployees>().AsNoTracking().Where(x => !x.IsDeleted);

        employees =
            employeeIds != null
                ? employees.Where(x => employeeIds.Contains(x.EmployeeId))
                : employees.Where(x => x.BranchId == branchId && x.IsActive);

        var rows =
            await (
                from a in _context.Set<HrSalaryAdvances>().AsNoTracking()
                join e in employees on a.EmployeeId equals e.EmployeeId
                where !a.IsDeleted && !a.IsClosed && a.StartYear * 12 + a.StartMonth <= sheetMonth
                orderby e.Code, a.AdvanceDate, a.AdvanceId
                select new
                {
                    a.AdvanceId,
                    a.Code,
                    a.EmployeeId,
                    EmployeeCode = e.Code,
                    EmployeeName = e.FullName,
                    a.AdvanceDate,
                    a.Amount
                })
            .ToListAsync();

        if (rows.Count == 0)
        {
            return new List<UnpaidAdvanceDto>();
        }

        List<long> ids = rows.Select(x => x.AdvanceId).ToList();

        Dictionary<long, decimal> byMonthEnd =
            await SalaryAdvancesRepository.PaidOutAsync(_context, ids, monthEnd);

        Dictionary<long, decimal> allPaid =
            await SalaryAdvancesRepository.PaidOutAsync(_context, ids);

        Dictionary<long, decimal> recovered =
            await SalaryAdvancesRepository.RecoveredAsync(_context, ids);

        List<UnpaidAdvanceDto> list = new();

        foreach (var row in rows)
        {
            decimal paid =
                Math.Min(row.Amount, byMonthEnd.TryGetValue(row.AdvanceId, out decimal p) ? p : 0);

            decimal notPaid = row.Amount - paid;

            decimal taken =
                recovered.TryGetValue(row.AdvanceId, out decimal r) ? r : 0;

            if (notPaid <= 0 || taken >= row.Amount)
            {
                continue;
            }

            decimal total =
                Math.Min(row.Amount, allPaid.TryGetValue(row.AdvanceId, out decimal t) ? t : 0);

            list.Add(new UnpaidAdvanceDto
            {
                AdvanceId = row.AdvanceId,
                Code = row.Code,
                EmployeeId = row.EmployeeId,
                EmployeeCode = row.EmployeeCode,
                EmployeeName = row.EmployeeName,
                AdvanceDate = HrCalendar.Day(row.AdvanceDate),
                Amount = row.Amount,
                PaidOut = paid,
                PaidLater = Math.Max(0, total - paid),
                NotPaidOut = notPaid
            });
        }

        return list;
    }

    public async Task<SalarySheetDefaultsDto> GetDefaultsAsync()
    {
        // the last month that has ended
        DateOnly last = HrCalendar.Today().AddMonths(-1);

        return new SalarySheetDefaultsDto
        {
            NextCode = NextCode(await Sheets.AsNoTracking().Select(x => x.Code).ToListAsync()),
            Year = last.Year,
            Month = last.Month,
            LateDaysPerCut = 3,
            Branches =
                await _context.Set<Branches>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.BranchName)
                    .Select(x => new PayrollLookupDto { Id = x.BranchId, Name = x.BranchName })
                    .ToListAsync()
        };
    }


    //===========================================================
    // Working a sheet out
    //===========================================================

    // What the user typed on a line, by employee
    private sealed class Typed
    {
        public decimal OtherEarning;
        public decimal OtherDeduction;
        public string Remarks = string.Empty;
    }

    // Writes the lines of the sheet again from the attendance, the
    // salary structures and the advances; the typed amounts stay.
    // Returns the number of lines.
    private async Task<int> BuildAsync(HrSalarySheets sheet, Dictionary<long, Typed> typed)
    {
        // ---------- the old lines go ----------
        Recoveries.RemoveRange(await Recoveries.Where(x => x.SalarySheetId == sheet.SalarySheetId).ToListAsync());

        _context.Set<HrPfLoanRecoveries>().RemoveRange(
            await _context.Set<HrPfLoanRecoveries>().Where(x => x.SalarySheetId == sheet.SalarySheetId).ToListAsync());

        List<HrSalarySheetLines> old = await Lines.Where(x => x.SalarySheetId == sheet.SalarySheetId).ToListAsync();

        List<long> oldIds = old.Select(x => x.SalarySheetLineId).ToList();

        LineHeads.RemoveRange(await LineHeads.Where(x => oldIds.Contains(x.SalarySheetLineId)).ToListAsync());

        Lines.RemoveRange(old);

        await _context.SaveChangesAsync();

        // ---------- attendance of the month ----------
        MonthlyAttendanceDto month = await _attendance.GetMonthlyAsync(sheet.Year, sheet.Month, sheet.BranchId);

        int monthDays = month.Days.Count;

        List<long> employeeIds = month.Rows.Select(x => x.EmployeeId).ToList();

        // ---------- employees and their structures ----------
        var employees =
            await (
                from e in _context.Set<HrEmployees>().AsNoTracking()
                where employeeIds.Contains(e.EmployeeId)
                join d in _context.Set<Department>().AsNoTracking() on e.DepartmentId equals d.DepartmentId into dj
                from d in dj.DefaultIfEmpty()
                select new
                {
                    e.EmployeeId,
                    e.OvertimeAllowed,
                    e.OvertimeRate,
                    e.OvertimeStructureId,
                    e.ShiftId,
                    e.PaymentMode,
                    e.BankName,
                    e.BankAccountNo,
                    e.MfsName,
                    e.MfsNo,
                    DepartmentName = d != null ? d.DepartmentName : string.Empty
                })
            .ToListAsync();

        // the working hours of the shifts (the hours a day of overtime)
        Dictionary<long, decimal> shiftHours =
            (await _context.Set<HrShifts>().AsNoTracking()
                .Select(x => new { x.ShiftId, x.StartTime, x.EndTime, x.BreakMinutes })
                .ToListAsync())
            .ToDictionary(x => x.ShiftId, x => HrCalendar.ShiftHours(x.StartTime, x.EndTime, x.BreakMinutes));

        // the overtime structures of those employees
        List<long> overtimeIds =
            employees.Where(x => x.OvertimeStructureId != null).Select(x => x.OvertimeStructureId!.Value).Distinct().ToList();

        Dictionary<long, HrOvertimeStructures> overtimeStructures =
            (await _context.Set<HrOvertimeStructures>().AsNoTracking()
                .Where(x => overtimeIds.Contains(x.OvertimeStructureId))
                .ToListAsync())
            .ToDictionary(x => x.OvertimeStructureId);

        var structure =
            await (
                from line in _context.Set<HrEmployeeSalaryLines>().AsNoTracking()
                where employeeIds.Contains(line.EmployeeId)
                join head in _context.Set<HrSalaryHeads>().AsNoTracking() on line.SalaryHeadId equals head.SalaryHeadId
                select new
                {
                    line.EmployeeId,
                    line.SalaryHeadId,
                    line.Amount,
                    head.Name,
                    head.HeadType,
                    head.SystemKey,
                    head.IsProrated,
                    head.DisplayOrder
                })
            .ToListAsync();

        // ---------- advances that can still be recovered ----------
        int sheetMonth = sheet.Year * 12 + sheet.Month;

        List<HrSalaryAdvances> advances =
            await _context.Set<HrSalaryAdvances>().AsNoTracking()
                .Where(x => !x.IsDeleted && !x.IsClosed && employeeIds.Contains(x.EmployeeId))
                .OrderBy(x => x.AdvanceDate).ThenBy(x => x.AdvanceId)
                .ToListAsync();

        Dictionary<long, decimal> recovered =
            await SalaryAdvancesRepository.RecoveredAsync(_context, advances.Select(x => x.AdvanceId).ToList());

        // only what was paid out (Payroll Payments) by the last day
        // of the sheet's month can be recovered (owner, 2026-11-14)
        DateOnly advanceMonthEnd =
            new DateOnly(sheet.Year, sheet.Month, 1).AddMonths(1).AddDays(-1);

        Dictionary<long, decimal> paidOut =
            await SalaryAdvancesRepository.PaidOutAsync(_context, advances.Select(x => x.AdvanceId).ToList(), advanceMonthEnd);

        // ---------- provident fund : the policy, the members of the
        //            month and their loans ----------
        HrPfPolicy pfPolicy = await ProvidentFundRepository.PolicyAsync(_context);

        DateOnly pfMonthEnd = new DateOnly(sheet.Year, sheet.Month, 1).AddMonths(1).AddDays(-1);

        HashSet<long> pfMembers =
            (await _context.Set<HrPfMembers>().AsNoTracking()
                .Where(x => !x.IsDeleted
                         && x.Status == ProvidentFundRepository.Active
                         && x.MemberDate <= pfMonthEnd
                         && employeeIds.Contains(x.EmployeeId))
                .Select(x => x.EmployeeId)
                .ToListAsync())
            .ToHashSet();

        List<HrPfLoans> pfLoans =
            await _context.Set<HrPfLoans>().AsNoTracking()
                .Where(x => !x.IsDeleted && employeeIds.Contains(x.EmployeeId))
                .OrderBy(x => x.LoanDate).ThenBy(x => x.PfLoanId)
                .ToListAsync();

        var pfLoanRecovered =
            await ProvidentFundRepository.LoanRecoveredAsync(_context, pfLoans.Select(x => x.PfLoanId).ToList());

        // ---------- the lines ----------
        List<(HrSalarySheetLines Line, List<HrSalarySheetLineHeads> Heads, List<HrAdvanceRecoveries> Recoveries, List<HrPfLoanRecoveries> PfLoans)> built = new();

        foreach (MonthlyAttendanceRowDto row in month.Rows.OrderBy(x => x.Code))
        {
            var employee = employees.FirstOrDefault(x => x.EmployeeId == row.EmployeeId);

            if (employee == null)
            {
                continue;
            }

            var mine = structure.Where(x => x.EmployeeId == row.EmployeeId).ToList();

            decimal gross = mine.Where(x => x.HeadType == "Earning").Sum(x => x.Amount);

            // no salary structure : left off the sheet
            if (gross <= 0)
            {
                continue;
            }

            decimal basic = mine.Where(x => x.SystemKey == "BASIC").Sum(x => x.Amount);
            decimal prorated = mine.Where(x => x.HeadType == "Earning" && x.IsProrated).Sum(x => x.Amount);
            // (the Provident Fund head is worked out below from the
            //  policy, never from the salary structure)
            mine = mine.Where(x => x.SystemKey != "PF").ToList();

            // every amount the sheet works out is a whole taka (0.50
            // and above goes up) : no paisa on the sheet or the payslip
            static decimal Whole(decimal value) => Math.Round(value, 0, MidpointRounding.AwayFromZero);

            decimal structureDeduction = Whole(mine.Where(x => x.HeadType == "Deduction").Sum(x => x.Amount));

            int beforeJoining = row.Kinds.Count(x => x == "-");

            decimal unpaidDays =
                Math.Min(monthDays, row.Absent + row.UnpaidLeave + row.NotMarked + row.HalfDay * 0.5m + beforeJoining);

            decimal absence =
                monthDays == 0 ? 0 : Math.Min(gross, Whole(prorated * unpaidDays / monthDays));

            decimal late = 0;

            if (sheet.LateDaysPerCut > 0 && monthDays > 0)
            {
                late = Math.Min(gross - absence, Whole((row.Late / sheet.LateDaysPerCut) * (basic / monthDays)));
            }

            // overtime : the employee's overtime structure (extra
            // hours and extra days); a profile from before overtime
            // structures keeps hours x its typed rate
            decimal overtime = 0;

            decimal overtimeDays = 0;

            if (employee.OvertimeAllowed)
            {
                if (employee.OvertimeStructureId != null
                    && overtimeStructures.TryGetValue(employee.OvertimeStructureId.Value, out HrOvertimeStructures? ot))
                {
                    overtime =
                        OvertimeStructuresRepository.Amount(
                            ot,
                            basic,
                            gross,
                            monthDays,
                            shiftHours.TryGetValue(employee.ShiftId, out decimal hoursPerDay) ? hoursPerDay : 8,
                            row.OvertimeHours - row.HolidayOvertimeHours,
                            row.HolidayOvertimeHours,
                            row.ExtraDays);

                    overtimeDays = ot.PayExtraDays ? row.ExtraDays : 0;
                }
                else
                {
                    overtime = row.OvertimeHours * employee.OvertimeRate;
                }

                overtime = Whole(overtime);
            }

            typed.TryGetValue(row.EmployeeId, out Typed? own);

            decimal otherEarning = Whole(own?.OtherEarning ?? 0);

            // (the overtime is not part of the salary : it is worked
            //  out here for the Overtime Sheet, and paid on its own)
            decimal earned = gross - absence - late + otherEarning;

            // deductions, each no more than what is left
            decimal left = earned;

            decimal structureTaken = Math.Min(structureDeduction, left);

            left -= structureTaken;

            decimal otherDeduction = Math.Min(Whole(own?.OtherDeduction ?? 0), left);

            left -= otherDeduction;

            // provident fund : a member of the month gives the
            // policy's percent of the Basic or the Gross; the company
            // adds its own percent (not taken from the pay)
            decimal pfEmployee = 0;

            decimal pfCompany = 0;

            if (pfMembers.Contains(row.EmployeeId))
            {
                decimal pfBase = pfPolicy.ContributionBase == "Gross" ? gross : basic;

                pfEmployee = Math.Min(Whole(pfBase * pfPolicy.EmployeePercent / 100m), left);

                left -= pfEmployee;

                if (pfEmployee > 0 && pfPolicy.CompanyContributes)
                {
                    pfCompany = Whole(pfBase * pfPolicy.CompanyPercent / 100m);
                }
            }

            // the instalments of the fund loans
            decimal pfLoanTaken = 0;

            List<HrPfLoanRecoveries> linePfLoans = new();

            foreach (HrPfLoans loan in pfLoans.Where(x => x.EmployeeId == row.EmployeeId))
            {
                if (loan.StartYear * 12 + loan.StartMonth > sheetMonth)
                {
                    continue;
                }

                // the instalment : principal, and the interest of the
                // loan (income of the fund)
                (decimal take, decimal loanInterest) =
                    ProvidentFundRepository.NextInstallment(
                        loan,
                        ProvidentFundRepository.StateOf(loan, pfLoanRecovered),
                        left);

                // (whole taka : never more than what is left of the pay)
                take = Math.Min(Whole(take), left);
                loanInterest = Math.Min(Whole(loanInterest), take);

                if (take <= 0)
                {
                    continue;
                }

                linePfLoans.Add(new HrPfLoanRecoveries
                {
                    PfLoanId = loan.PfLoanId,
                    SalarySheetId = sheet.SalarySheetId,
                    EmployeeId = row.EmployeeId,
                    Amount = take,
                    InterestAmount = loanInterest
                });

                pfLoanTaken += take;
                left -= take;
            }

            decimal advanceTaken = 0;

            List<HrAdvanceRecoveries> lineRecoveries = new();

            foreach (HrSalaryAdvances advance in advances.Where(x => x.EmployeeId == row.EmployeeId))
            {
                if (advance.StartYear * 12 + advance.StartMonth > sheetMonth)
                {
                    continue;
                }

                // what was paid out (never more than the advance) less
                // what earlier sheets took; not paid out = nothing
                decimal paid =
                    Math.Min(advance.Amount, paidOut.TryGetValue(advance.AdvanceId, out decimal outAmount) ? outAmount : 0);

                decimal balance =
                    paid - (recovered.TryGetValue(advance.AdvanceId, out decimal done) ? done : 0);

                decimal take = Math.Min(Math.Min(Whole(advance.InstallmentAmount), balance), left);

                if (take <= 0)
                {
                    continue;
                }

                lineRecoveries.Add(new HrAdvanceRecoveries
                {
                    AdvanceId = advance.AdvanceId,
                    SalarySheetId = sheet.SalarySheetId,
                    EmployeeId = row.EmployeeId,
                    Amount = take
                });

                advanceTaken += take;
                left -= take;
            }

            string account =
                employee.PaymentMode == "Bank" ? Clean($"{employee.BankName} {employee.BankAccountNo}")
                : employee.PaymentMode == "MFS" ? Clean($"{employee.MfsName} {employee.MfsNo}")
                : string.Empty;

            HrSalarySheetLines line = new()
            {
                SalarySheetId = sheet.SalarySheetId,
                EmployeeId = row.EmployeeId,
                EmployeeCode = row.Code,
                EmployeeName = row.FullName,
                DesignationName = row.DesignationName,
                DepartmentName = employee.DepartmentName,
                PaymentMode = employee.PaymentMode,
                PaymentAccount = account.Length > 150 ? account.Substring(0, 150) : account,
                MonthDays = monthDays,
                PayableDays = monthDays - unpaidDays,
                UnpaidDays = unpaidDays,
                LateDays = row.Late,
                OvertimeHours = row.OvertimeHours,
                OvertimeDays = overtimeDays,
                BasicSalary = basic,
                GrossSalary = gross,
                AbsenceDeduction = absence,
                LateDeduction = late,
                OvertimeAmount = overtime,
                PfEmployee = pfEmployee,
                PfCompany = pfCompany,
                PfLoan = pfLoanTaken,
                OtherEarning = otherEarning,
                OtherDeduction = otherDeduction,
                EarnedSalary = earned,
                StructureDeduction = structureTaken,
                AdvanceDeduction = advanceTaken,
                NetPay = left,
                Remarks = own?.Remarks ?? string.Empty,
                IsPaid = false
            };

            List<HrSalarySheetLineHeads> heads =
                mine
                    .OrderBy(x => x.HeadType == "Earning" ? 0 : 1).ThenBy(x => x.DisplayOrder)
                    .Select(x => new HrSalarySheetLineHeads
                    {
                        SalaryHeadId = x.SalaryHeadId,
                        HeadName = x.Name,
                        HeadType = x.HeadType,
                        Amount = x.Amount,
                        DisplayOrder = x.DisplayOrder
                    })
                    .ToList();

            Lines.Add(line);

            built.Add((line, heads, lineRecoveries, linePfLoans));
        }

        // the lines first : the heads and recoveries need their ids
        await _context.SaveChangesAsync();

        foreach (var item in built)
        {
            foreach (HrSalarySheetLineHeads head in item.Heads)
            {
                head.SalarySheetLineId = item.Line.SalarySheetLineId;

                LineHeads.Add(head);
            }

            foreach (HrAdvanceRecoveries recovery in item.Recoveries)
            {
                recovery.SalarySheetLineId = item.Line.SalarySheetLineId;

                Recoveries.Add(recovery);
            }

            foreach (HrPfLoanRecoveries recovery in item.PfLoans)
            {
                recovery.SalarySheetLineId = item.Line.SalarySheetLineId;

                _context.Set<HrPfLoanRecoveries>().Add(recovery);
            }
        }

        sheet.EmployeeCount = built.Count;
        sheet.TotalGross = built.Sum(x => x.Line.GrossSalary);
        sheet.TotalEarned = built.Sum(x => x.Line.EarnedSalary);
        sheet.TotalDeductions = built.Sum(x => x.Line.StructureDeduction + x.Line.OtherDeduction + x.Line.AdvanceDeduction + x.Line.PfEmployee + x.Line.PfLoan);
        sheet.TotalNet = built.Sum(x => x.Line.NetPay);

        await _context.SaveChangesAsync();

        return built.Count;
    }

    // The typed amounts now on the sheet
    private async Task<Dictionary<long, Typed>> TypedAsync(long sheetId)
    {
        return (await Lines.AsNoTracking()
                .Where(x => x.SalarySheetId == sheetId)
                .Select(x => new { x.EmployeeId, x.OtherEarning, x.OtherDeduction, x.Remarks })
                .ToListAsync())
            .GroupBy(x => x.EmployeeId)
            .ToDictionary(
                g => g.Key,
                g => new Typed { OtherEarning = g.First().OtherEarning, OtherDeduction = g.First().OtherDeduction, Remarks = g.First().Remarks });
    }


    //===========================================================
    // Generate / recalculate / save
    //===========================================================

    public async Task<SalarySheetDto> GenerateAsync(GenerateSalarySheetDto dto, long userId)
    {
        if (dto.Year < 2000 || dto.Year > 2100 || dto.Month < 1 || dto.Month > 12)
        {
            throw new InvalidOperationException("Pick the salary month.");
        }

        if (new DateOnly(dto.Year, dto.Month, 1) > HrCalendar.Today())
        {
            throw new InvalidOperationException($"{MonthText(dto.Year, dto.Month)} has not started yet.");
        }

        if (!await _context.Set<Branches>().AsNoTracking().AnyAsync(x => x.BranchId == dto.BranchId && !x.IsDeleted))
        {
            throw new InvalidOperationException("Pick the branch.");
        }

        if (dto.LateDaysPerCut < 0 || dto.LateDaysPerCut > 31)
        {
            throw new InvalidOperationException("Late days for one day's cut must be 0 to 31 (0 = no cut).");
        }

        string remarks = Limited(dto.Remarks, 500, "Remarks");

        string? existing =
            await Sheets.AsNoTracking()
                .Where(x => !x.IsDeleted && x.Year == dto.Year && x.Month == dto.Month && x.BranchId == dto.BranchId)
                .Select(x => x.Code)
                .FirstOrDefaultAsync();

        if (existing != null)
        {
            throw new InvalidOperationException($"{existing} is already the salary sheet of {MonthText(dto.Year, dto.Month)} for this branch.");
        }

        HrSalarySheets sheet = new()
        {
            Year = dto.Year,
            Month = dto.Month,
            BranchId = dto.BranchId,
            Status = StatusDraft,
            LateDaysPerCut = dto.LateDaysPerCut,
            Remarks = remarks,
            IsDeleted = false,
            CreatedBy = userId,
            CreatedDate = DateTime.UtcNow
        };

        await InTransactionAsync(
            async () =>
            {
                sheet.Code = NextCode(await Sheets.AsNoTracking().Select(x => x.Code).ToListAsync());

                Sheets.Add(sheet);

                await _context.SaveChangesAsync();

                int lines = await BuildAsync(sheet, new Dictionary<long, Typed>());

                if (lines == 0)
                {
                    throw new InvalidOperationException($"No employee of the branch has a salary structure for {MonthText(dto.Year, dto.Month)} : set the salary on Employee Profiles first.");
                }

                AddHistory(sheet.SalarySheetId, "Create", "Salary Sheet Generated", await DescribeAsync(sheet), userId);

                await _context.SaveChangesAsync();
            });

        return await GetAsync(sheet.PublicId);
    }

    public async Task RecalculateAsync(Guid publicId, long userId)
    {
        HrSalarySheets sheet = await FindAsync(publicId);

        Require(sheet, StatusDraft, "recalculated");

        await InTransactionAsync(
            async () =>
            {
                await BuildAsync(sheet, await TypedAsync(sheet.SalarySheetId));

                sheet.ModifiedBy = userId;
                sheet.ModifiedDate = DateTime.UtcNow;

                AddHistory(sheet.SalarySheetId, "Update", "Salary Sheet Recalculated", await DescribeAsync(sheet), userId);

                await _context.SaveChangesAsync();
            });
    }

    public async Task SaveAsync(Guid publicId, SaveSalarySheetDto dto, long userId)
    {
        HrSalarySheets sheet = await FindAsync(publicId);

        Require(sheet, StatusDraft, "changed");

        string remarks = Limited(dto.Remarks, 500, "Remarks");

        var lines =
            await Lines.AsNoTracking()
                .Where(x => x.SalarySheetId == sheet.SalarySheetId)
                .Select(x => new { x.SalarySheetLineId, x.EmployeeId, x.EmployeeCode, x.EmployeeName })
                .ToListAsync();

        Dictionary<long, Typed> typed = await TypedAsync(sheet.SalarySheetId);

        foreach (SaveSalarySheetLineDto row in dto.Lines ?? new())
        {
            var line = lines.FirstOrDefault(x => x.SalarySheetLineId == row.SalarySheetLineId);

            if (line == null)
            {
                throw new InvalidOperationException("The sheet has changed since it was opened : refresh the page.");
            }

            string who = $"{line.EmployeeCode} {line.EmployeeName}";

            if (row.OtherEarning < 0 || row.OtherDeduction < 0)
            {
                throw new InvalidOperationException($"{who} : Other Earning and Other Deduction cannot be negative.");
            }

            typed[line.EmployeeId] =
                new Typed
                {
                    OtherEarning = Math.Round(row.OtherEarning, 0, MidpointRounding.AwayFromZero),
                    OtherDeduction = Math.Round(row.OtherDeduction, 0, MidpointRounding.AwayFromZero),
                    Remarks = Limited(row.Remarks, 200, $"{who} : Remarks")
                };
        }

        await InTransactionAsync(
            async () =>
            {
                sheet.Remarks = remarks;

                await BuildAsync(sheet, typed);

                sheet.ModifiedBy = userId;
                sheet.ModifiedDate = DateTime.UtcNow;

                AddHistory(sheet.SalarySheetId, "Update", "Salary Sheet Saved", await DescribeAsync(sheet), userId);

                await _context.SaveChangesAsync();
            });
    }


    //===========================================================
    // Approve / post / pay
    //===========================================================

    // Every advance this sheet recovers must be paid out (Payroll
    // Payments) by the last day of its month, at least as much as
    // all the live sheets take from it : an advance paid later, or
    // whose payment was cancelled, refuses approve / post until the
    // sheet is recalculated (owner, 2026-11-14)
    private async Task CheckAdvancesPaidOutAsync(HrSalarySheets sheet)
    {
        var mine =
            await Recoveries.AsNoTracking()
                .Where(x => x.SalarySheetId == sheet.SalarySheetId && x.Amount > 0)
                .GroupBy(x => x.AdvanceId)
                .Select(g => new { AdvanceId = g.Key, Amount = g.Sum(x => x.Amount) })
                .ToListAsync();

        if (mine.Count == 0)
        {
            return;
        }

        List<long> ids =
            mine.Select(x => x.AdvanceId).ToList();

        DateOnly monthEnd =
            new DateOnly(sheet.Year, sheet.Month, 1).AddMonths(1).AddDays(-1);

        Dictionary<long, decimal> paidOut =
            await SalaryAdvancesRepository.PaidOutAsync(_context, ids, monthEnd);

        // all live sheets (this one included)
        Dictionary<long, decimal> recovered =
            await SalaryAdvancesRepository.RecoveredAsync(_context, ids);

        var advances =
            await _context.Set<HrSalaryAdvances>().AsNoTracking()
                .Where(x => ids.Contains(x.AdvanceId))
                .Select(x => new { x.AdvanceId, x.Code, x.Amount })
                .ToListAsync();

        List<string> wrong = new();

        foreach (var advance in advances)
        {
            decimal paid =
                Math.Min(advance.Amount, paidOut.TryGetValue(advance.AdvanceId, out decimal amount) ? amount : 0);

            decimal taken =
                recovered.TryGetValue(advance.AdvanceId, out decimal done) ? done : 0;

            if (taken > paid)
            {
                wrong.Add(
                    paid <= 0
                        ? $"{advance.Code} is not paid out by {HrCalendar.Day(monthEnd)}"
                        : $"{advance.Code} : only {Money(paid)} paid out by {HrCalendar.Day(monthEnd)}, {Money(taken)} recovered");
            }
        }

        if (wrong.Count > 0)
        {
            throw new InvalidOperationException(
                $"{sheet.Code} recovers salary advances that are not paid out ({string.Join("; ", wrong)}). Pay them on Payroll Payments first, or recalculate the sheet.");
        }
    }

    public async Task ApproveAsync(Guid publicId, long userId)
    {
        HrSalarySheets sheet = await FindAsync(publicId);

        Require(sheet, StatusDraft, "approved");

        if (sheet.EmployeeCount == 0)
        {
            throw new InvalidOperationException($"{sheet.Code} has no employees.");
        }

        await CheckAdvancesPaidOutAsync(sheet);

        sheet.Status = StatusApproved;
        sheet.ApprovedBy = userId;
        sheet.ApprovedDate = DateTime.UtcNow;
        sheet.ModifiedBy = userId;
        sheet.ModifiedDate = DateTime.UtcNow;

        AddHistory(sheet.SalarySheetId, "Approve", "Salary Sheet Approved", await DescribeAsync(sheet), userId);

        await _context.SaveChangesAsync();
    }

    public async Task ReturnToDraftAsync(Guid publicId, long userId)
    {
        HrSalarySheets sheet = await FindAsync(publicId);

        Require(sheet, StatusApproved, "returned to Draft");

        sheet.Status = StatusDraft;
        sheet.ApprovedBy = null;
        sheet.ApprovedDate = null;
        sheet.ModifiedBy = userId;
        sheet.ModifiedDate = DateTime.UtcNow;

        AddHistory(sheet.SalarySheetId, "Update", "Salary Sheet Returned to Draft", await DescribeAsync(sheet), userId);

        await _context.SaveChangesAsync();
    }

    public async Task PostAsync(Guid publicId, long userId)
    {
        HrSalarySheets sheet = await FindAsync(publicId);

        Require(sheet, StatusApproved, "posted");

        await CheckAdvancesPaidOutAsync(sheet);

        var totals =
            await Lines.AsNoTracking()
                .Where(x => x.SalarySheetId == sheet.SalarySheetId)
                .GroupBy(x => x.SalarySheetId)
                .Select(g => new
                {
                    Earned = g.Sum(x => x.EarnedSalary),
                    Advance = g.Sum(x => x.AdvanceDeduction),
                    Kept = g.Sum(x => x.StructureDeduction + x.OtherDeduction),
                    Overtime = g.Sum(x => x.OvertimeAmount),
                    Worked = g.Sum(x => x.GrossSalary - x.AbsenceDeduction - x.LateDeduction + x.OtherEarning),
                    PfEmployee = g.Sum(x => x.PfEmployee),
                    PfCompany = g.Sum(x => x.PfCompany),
                    PfLoan = g.Sum(x => x.PfLoan),
                    Net = g.Sum(x => x.NetPay)
                })
                .FirstOrDefaultAsync();

        if (totals == null || totals.Earned <= 0)
        {
            throw new InvalidOperationException($"{sheet.Code} has nothing to post.");
        }

        // a sheet worked out when the overtime was still part of
        // the salary
        if (totals.Earned != totals.Worked)
        {
            throw new InvalidOperationException($"{sheet.Code} was worked out when the overtime was part of the salary : return it to Draft and press Recalculate, then approve and post it again.");
        }

        if (totals.Earned != totals.Advance + totals.Kept + totals.PfEmployee + totals.PfLoan + totals.Net)
        {
            throw new InvalidOperationException($"{sheet.Code} does not add up (earned {Money(totals.Earned)}; deductions and net {Money(totals.Advance + totals.Kept + totals.PfEmployee + totals.PfLoan + totals.Net)}) : return it to Draft and recalculate.");
        }

        // the interest in the provident fund loan instalments
        decimal pfLoanInterest =
            await _context.Set<HrPfLoanRecoveries>().AsNoTracking()
                .Where(x => x.SalarySheetId == sheet.SalarySheetId)
                .SumAsync(x => (decimal?)x.InterestAmount) ?? 0;

        pfLoanInterest = Math.Min(Math.Max(0, pfLoanInterest), totals.PfLoan);

        string month = MonthText(sheet.Year, sheet.Month);
        string note = $"Salary {month} ({sheet.Code})";

        // The overtime is not part of the salary : it is posted on
        // its own (Payroll - Overtime Expense / Overtime Payable;
        // a row without a ledger falls back to the salary ledger).
        string overtimeLedger = PostingLedgerCodes.TryGet(_context, "PAYROLL-OVERTIME-EXPENSE");

        string overtimePayable = PostingLedgerCodes.TryGet(_context, "PAYROLL-OVERTIME-PAYABLE");

        decimal overtimeApart = Math.Max(0, totals.Overtime);

        // A Journal Voucher group is one debit with its credits (or
        // one credit with its debits), so the voucher has up to
        // three groups :
        //   1  Dr Salary Expense          Cr everything kept back
        //                                    and the net pay
        //   2  Dr Overtime Expense        Cr Overtime Payable
        //   3  Dr PF Company Contribution Cr PF Members Fund

        List<JournalVoucherLineDto> lines = new();

        lines.Add(
            new JournalVoucherLineDto
            {
                Side = "Debit",
                GroupNo = 1,
                LedgerType = LedgerTypeGeneral,
                LedgerCode = PostingLedgerCodes.Get(_context, "PAYROLL-SALARY-EXPENSE"),
                Amount = totals.Earned,
                ShortNotes = note
            });

        if (overtimeApart > 0)
        {
            lines.Add(
                new JournalVoucherLineDto
                {
                    Side = "Debit",
                    GroupNo = 2,
                    LedgerType = LedgerTypeGeneral,
                    LedgerCode = overtimeLedger.Length > 0 ? overtimeLedger : PostingLedgerCodes.Get(_context, "PAYROLL-SALARY-EXPENSE"),
                    Amount = overtimeApart,
                    ShortNotes = $"{note} : overtime"
                });

            lines.Add(
                new JournalVoucherLineDto
                {
                    Side = "Credit",
                    GroupNo = 2,
                    LedgerType = LedgerTypeGeneral,
                    LedgerCode = overtimePayable.Length > 0 ? overtimePayable : PostingLedgerCodes.Get(_context, "PAYROLL-SALARY-PAYABLE"),
                    Amount = overtimeApart,
                    ShortNotes = $"{note} : overtime payable"
                });
        }

        // the company part of the provident fund : an expense too
        if (totals.PfCompany > 0)
        {
            lines.Add(
                new JournalVoucherLineDto
                {
                    Side = "Debit",
                    GroupNo = 3,
                    LedgerType = LedgerTypeGeneral,
                    LedgerCode = PostingLedgerCodes.Get(_context, "PF-COMPANY-CONTRIBUTION"),
                    Amount = totals.PfCompany,
                    ShortNotes = $"{note} : provident fund, company part"
                });

            lines.Add(
                new JournalVoucherLineDto
                {
                    Side = "Credit",
                    GroupNo = 3,
                    LedgerType = LedgerTypeGeneral,
                    LedgerCode = PostingLedgerCodes.Get(_context, "PF-MEMBERS-FUND"),
                    Amount = totals.PfCompany,
                    ShortNotes = $"{note} : provident fund, company part"
                });
        }

        void Credit(string purpose, decimal amount, string what)
        {
            if (amount <= 0)
            {
                return;
            }

            lines.Add(
                new JournalVoucherLineDto
                {
                    Side = "Credit",
                    GroupNo = 1,
                    LedgerType = LedgerTypeGeneral,
                    LedgerCode = PostingLedgerCodes.Get(_context, purpose),
                    Amount = amount,
                    ShortNotes = $"{note} : {what}"
                });
        }

        Credit("PAYROLL-STAFF-ADVANCE", totals.Advance, "advances recovered");
        // the deductions : every deduction head on its own ledger
        // (Payable Ledger of the Salary Head); the typed other
        // deductions and a head without a ledger of its own go to
        // Payroll - Other Deductions Payable
        var sheetLines =
            await Lines.AsNoTracking()
                .Where(x => x.SalarySheetId == sheet.SalarySheetId)
                .Select(x => new { x.SalarySheetLineId, x.StructureDeduction, x.OtherDeduction })
                .ToListAsync();

        List<long> sheetLineIds = sheetLines.Select(x => x.SalarySheetLineId).ToList();

        var deductionHeads =
            await LineHeads.AsNoTracking()
                .Where(x => sheetLineIds.Contains(x.SalarySheetLineId) && x.HeadType == "Deduction" && x.Amount > 0)
                .OrderBy(x => x.DisplayOrder)
                .Select(x => new { x.SalarySheetLineId, x.SalaryHeadId, x.HeadName, x.Amount })
                .ToListAsync();

        List<long> headIds = deductionHeads.Select(x => x.SalaryHeadId).Distinct().ToList();

        Dictionary<long, string> headLedgers =
            (await _context.Set<HrSalaryHeads>().AsNoTracking()
                .Where(x => headIds.Contains(x.SalaryHeadId))
                .Select(x => new { x.SalaryHeadId, x.PayableLedgerCode })
                .ToListAsync())
            .ToDictionary(x => x.SalaryHeadId, x => (x.PayableLedgerCode ?? string.Empty).Trim());

        // ledger code -> (amount, the heads in it); '' : no ledger of its own
        Dictionary<string, (decimal Amount, HashSet<string> Names)> byLedger = new();

        void Keep(string ledger, decimal amount, string name)
        {
            if (amount <= 0)
            {
                return;
            }

            if (!byLedger.TryGetValue(ledger, out var slot))
            {
                slot = (0, new HashSet<string>());
            }

            slot.Names.Add(name);

            byLedger[ledger] = (slot.Amount + amount, slot.Names);
        }

        foreach (var sheetLine in sheetLines)
        {
            // what the line really kept back, shared over its heads
            // (the last head takes the rest : whole taka, no paisa lost)
            var mine = deductionHeads.Where(x => x.SalarySheetLineId == sheetLine.SalarySheetLineId).ToList();

            decimal whole = mine.Sum(x => x.Amount);

            decimal left = sheetLine.StructureDeduction;

            for (int i = 0; i < mine.Count && left > 0; i++)
            {
                decimal share =
                    i == mine.Count - 1
                        ? left
                        : Math.Min(left, Math.Round(sheetLine.StructureDeduction * mine[i].Amount / whole, 0, MidpointRounding.AwayFromZero));

                Keep(headLedgers.TryGetValue(mine[i].SalaryHeadId, out string? code) ? code : string.Empty, share, mine[i].HeadName);

                left -= share;
            }

            // (a line without heads : nothing to tell apart)
            Keep(string.Empty, left, "deductions");

            Keep(string.Empty, sheetLine.OtherDeduction, "other deductions");
        }

        foreach (var entry in byLedger.Where(x => x.Key.Length > 0).OrderBy(x => x.Key))
        {
            lines.Add(
                new JournalVoucherLineDto
                {
                    Side = "Credit",
                    GroupNo = 1,
                    LedgerType = LedgerTypeGeneral,
                    LedgerCode = entry.Key,
                    Amount = entry.Value.Amount,
                    ShortNotes = $"{note} : {string.Join(", ", entry.Value.Names)}"
                });
        }

        if (byLedger.TryGetValue(string.Empty, out var plain))
        {
            Credit("PAYROLL-OTHER-DEDUCTIONS", plain.Amount, string.Join(", ", plain.Names));
        }
        Credit("PF-MEMBERS-FUND", totals.PfEmployee, "provident fund, own part");
        Credit("PF-LOAN-RECEIVABLE", totals.PfLoan - pfLoanInterest, "provident fund loan recovered");
        Credit("PF-LOAN-INTEREST-INCOME", pfLoanInterest, "provident fund loan interest");
        Credit("PAYROLL-SALARY-PAYABLE", totals.Net, "net pay");

        // the last day of the month; today when that is still to come
        DateOnly monthEnd = new DateOnly(sheet.Year, sheet.Month, 1).AddMonths(1).AddDays(-1);
        DateOnly today = HrCalendar.Today();

        string branch = await BranchNameAsync(sheet.BranchId);

        await InTransactionAsync(
            async () =>
            {
                JournalVoucherSavedDto voucher =
                    await _journalVouchers.CreatePostedAsync(
                        new CreateJournalVoucherDto
                        {
                            VoucherDate = HrCalendar.Day(monthEnd > today ? today : monthEnd),
                            BranchId = sheet.BranchId,
                            Narration = $"Salary of {month}, {branch} : {sheet.EmployeeCount} employee(s), earned {Money(totals.Earned)}, net pay {Money(totals.Net)} | {sheet.Code}",
                            Lines = lines
                        },
                        sheet.Code,
                        userId);

                string voucherNo = voucher.VoucherNo ?? string.Empty;

                sheet.Status = StatusPosted;
                sheet.PostedBy = userId;
                sheet.PostedDate = DateTime.UtcNow;
                sheet.JournalVoucherId = voucher.JournalVoucherId;
                sheet.JournalVoucherNo = voucherNo.Length > 30 ? voucherNo.Substring(0, 30) : voucherNo;
                sheet.ModifiedBy = userId;
                sheet.ModifiedDate = DateTime.UtcNow;

                // the provident fund contributions go to the fund ledger
                await ProvidentFundRepository.WriteSheetAsync(_context, sheet, userId);

                AddHistory(sheet.SalarySheetId, "Post", "Salary Sheet Posted", $"{await DescribeAsync(sheet)} Journal Voucher {voucherNo}.", userId);

                await _context.SaveChangesAsync();
            });
    }

    public async Task UnpostAsync(Guid publicId, SalarySheetReasonDto dto, long userId)
    {
        HrSalarySheets sheet = await FindAsync(publicId);

        Require(sheet, StatusPosted, "unposted");

        string reason = Limited(dto.Reason, 300, "Reason");

        if (reason.Length == 0)
        {
            throw new InvalidOperationException("Write why the salary sheet is unposted.");
        }

        // a sheet with a payment (salary or overtime) stays posted
        if (await HrPaymentsRepository.AnyAsync(_context, new[] { HrPaymentsRepository.Salary, HrPaymentsRepository.Overtime }, sheet.SalarySheetId))
        {
            throw new InvalidOperationException($"{sheet.Code} has payments on Payroll Payments : cancel them first.");
        }

        string voucherNo = sheet.JournalVoucherNo;

        await InTransactionAsync(
            async () =>
            {
                if (sheet.JournalVoucherId != null)
                {
                    await _journalVouchers.CancelAsync(
                        sheet.JournalVoucherId.Value,
                        new CancelJournalVoucherDto { CancelDate = HrCalendar.Day(HrCalendar.Today()), Reason = $"{sheet.Code} unposted : {reason}" },
                        userId);
                }

                // the provident fund contributions leave the fund ledger
                await ProvidentFundRepository.RemoveSheetAsync(_context, sheet.SalarySheetId);

                sheet.Status = StatusApproved;
                sheet.PostedBy = null;
                sheet.PostedDate = null;
                sheet.JournalVoucherId = null;
                sheet.JournalVoucherNo = string.Empty;
                sheet.ModifiedBy = userId;
                sheet.ModifiedDate = DateTime.UtcNow;

                AddHistory(sheet.SalarySheetId, "Cancel", "Salary Sheet Unposted", $"{await DescribeAsync(sheet)} Journal Voucher {voucherNo} cancelled. Reason : {reason}", userId);

                await _context.SaveChangesAsync();
            });
    }

    public async Task<int> PayAsync(Guid publicId, PaySalaryDto dto, long userId)
    {
        // (the paid status is worked out from Payroll Payments now)
        if (dto != null)
        {
            throw new InvalidOperationException("The salary is paid on Payroll Management > Payroll Payments : the paid status comes from there.");
        }

        HrSalarySheets sheet = await FindAsync(publicId);

        Require(sheet, StatusPosted, "paid");

        DateOnly today = HrCalendar.Today();

        DateOnly paidDate = today;

        string note = Limited(dto.Note, 100, "Note");

        if (dto.Paid)
        {
            paidDate =
                string.IsNullOrWhiteSpace(dto.PaidDate)
                    ? today
                    : HrCalendar.ParseDay(dto.PaidDate) ?? throw new InvalidOperationException("The paid date is not a valid date.");

            if (paidDate > today)
            {
                throw new InvalidOperationException("The paid date cannot be in the future.");
            }
        }

        List<long> asked = dto.LineIds ?? new();

        List<HrSalarySheetLines> lines =
            await Lines
                .Where(x => x.SalarySheetId == sheet.SalarySheetId
                         && x.IsPaid != dto.Paid
                         && (asked.Count == 0 || asked.Contains(x.SalarySheetLineId)))
                .ToListAsync();

        if (lines.Count == 0)
        {
            return 0;
        }

        foreach (HrSalarySheetLines line in lines)
        {
            line.IsPaid = dto.Paid;
            line.PaidDate = dto.Paid ? paidDate : null;
            line.PaidNote = dto.Paid ? note : string.Empty;
        }

        sheet.ModifiedBy = userId;
        sheet.ModifiedDate = DateTime.UtcNow;

        string who =
            lines.Count <= 5
                ? string.Join(", ", lines.Select(x => x.EmployeeCode))
                : $"{lines.Count} employees";

        AddHistory(
            sheet.SalarySheetId,
            "Update",
            dto.Paid ? "Salary Marked Paid" : "Salary Marked Not Paid",
            dto.Paid
                ? $"{sheet.Code} : {who}, Tk {Money(lines.Sum(x => x.NetPay))} on {HrCalendar.Day(paidDate)}{(note.Length > 0 ? $" ({note})" : string.Empty)}."
                : $"{sheet.Code} : {who} marked not paid.",
            userId);

        await _context.SaveChangesAsync();

        return lines.Count;
    }


    //===========================================================
    // Delete / restore
    //===========================================================

    public async Task DeleteAsync(Guid publicId, long userId)
    {
        HrSalarySheets sheet = await FindAsync(publicId);

        Require(sheet, StatusDraft, "deleted");

        // what it took from the advances is given back
        Recoveries.RemoveRange(await Recoveries.Where(x => x.SalarySheetId == sheet.SalarySheetId).ToListAsync());

        // and from the provident fund loans
        _context.Set<HrPfLoanRecoveries>().RemoveRange(
            await _context.Set<HrPfLoanRecoveries>().Where(x => x.SalarySheetId == sheet.SalarySheetId).ToListAsync());

        sheet.IsDeleted = true;
        sheet.DeletedBy = userId;
        sheet.DeletedDate = DateTime.UtcNow;

        AddHistory(sheet.SalarySheetId, "Delete", "Salary Sheet Deleted", await DescribeAsync(sheet), userId);

        await _context.SaveChangesAsync();
    }

    public async Task<string?> RestoreAsync(long userId)
    {
        HrSalarySheets? sheet =
            await Sheets.Where(x => x.IsDeleted).OrderByDescending(x => x.DeletedDate).FirstOrDefaultAsync();

        if (sheet == null)
        {
            return null;
        }

        string? existing =
            await Sheets.AsNoTracking()
                .Where(x => !x.IsDeleted && x.Year == sheet.Year && x.Month == sheet.Month && x.BranchId == sheet.BranchId)
                .Select(x => x.Code)
                .FirstOrDefaultAsync();

        if (existing != null)
        {
            throw new InvalidOperationException($"{sheet.Code} cannot be restored : {existing} is now the salary sheet of {MonthText(sheet.Year, sheet.Month)} for the branch.");
        }

        await InTransactionAsync(
            async () =>
            {
                sheet.IsDeleted = false;
                sheet.DeletedBy = null;
                sheet.DeletedDate = null;
                sheet.Status = StatusDraft;
                sheet.ModifiedBy = userId;
                sheet.ModifiedDate = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                // comes back as a Draft worked out again (the typed
                // amounts stay)
                await BuildAsync(sheet, await TypedAsync(sheet.SalarySheetId));

                AddHistory(sheet.SalarySheetId, "Restore", "Salary Sheet Restored", await DescribeAsync(sheet), userId);

                await _context.SaveChangesAsync();
            });

        return sheet.Code;
    }
}
