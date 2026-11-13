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
//   Posting writes one Journal Voucher (Posting Setup, Payroll) :
//     Dr  PAYROLL-SALARY-EXPENSE       total Earned
//     Cr  PAYROLL-STAFF-ADVANCE        advances recovered
//     Cr  PAYROLL-DEDUCTIONS-PAYABLE   structure + other deductions
//     Cr  PAYROLL-SALARY-PAYABLE       total Net Pay
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

            decimal structureDeduction = mine.Where(x => x.HeadType == "Deduction").Sum(x => x.Amount);

            int beforeJoining = row.Kinds.Count(x => x == "-");

            decimal unpaidDays =
                Math.Min(monthDays, row.Absent + row.UnpaidLeave + row.NotMarked + row.HalfDay * 0.5m + beforeJoining);

            decimal absence =
                monthDays == 0 ? 0 : Math.Min(gross, Math.Round(prorated * unpaidDays / monthDays, 2));

            decimal late = 0;

            if (sheet.LateDaysPerCut > 0 && monthDays > 0)
            {
                late = Math.Min(gross - absence, (row.Late / sheet.LateDaysPerCut) * Math.Round(basic / monthDays, 2));
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
                    overtime = Math.Round(row.OvertimeHours * employee.OvertimeRate, 2);
                }
            }

            typed.TryGetValue(row.EmployeeId, out Typed? own);

            decimal otherEarning = own?.OtherEarning ?? 0;

            decimal earned = gross - absence - late + overtime + otherEarning;

            // deductions, each no more than what is left
            decimal left = earned;

            decimal structureTaken = Math.Min(structureDeduction, left);

            left -= structureTaken;

            decimal otherDeduction = Math.Min(own?.OtherDeduction ?? 0, left);

            left -= otherDeduction;

            // provident fund : a member of the month gives the
            // policy's percent of the Basic or the Gross; the company
            // adds its own percent (not taken from the pay)
            decimal pfEmployee = 0;

            decimal pfCompany = 0;

            if (pfMembers.Contains(row.EmployeeId))
            {
                decimal pfBase = pfPolicy.ContributionBase == "Gross" ? gross : basic;

                pfEmployee = Math.Min(Math.Round(pfBase * pfPolicy.EmployeePercent / 100m, 2, MidpointRounding.AwayFromZero), left);

                left -= pfEmployee;

                if (pfEmployee > 0 && pfPolicy.CompanyContributes)
                {
                    pfCompany = Math.Round(pfBase * pfPolicy.CompanyPercent / 100m, 2, MidpointRounding.AwayFromZero);
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

                decimal balance =
                    advance.Amount - (recovered.TryGetValue(advance.AdvanceId, out decimal done) ? done : 0);

                decimal take = Math.Min(Math.Min(advance.InstallmentAmount, balance), left);

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
                    OtherEarning = Math.Round(row.OtherEarning, 2),
                    OtherDeduction = Math.Round(row.OtherDeduction, 2),
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

    public async Task ApproveAsync(Guid publicId, long userId)
    {
        HrSalarySheets sheet = await FindAsync(publicId);

        Require(sheet, StatusDraft, "approved");

        if (sheet.EmployeeCount == 0)
        {
            throw new InvalidOperationException($"{sheet.Code} has no employees.");
        }

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

        var totals =
            await Lines.AsNoTracking()
                .Where(x => x.SalarySheetId == sheet.SalarySheetId)
                .GroupBy(x => x.SalarySheetId)
                .Select(g => new
                {
                    Earned = g.Sum(x => x.EarnedSalary),
                    Advance = g.Sum(x => x.AdvanceDeduction),
                    Kept = g.Sum(x => x.StructureDeduction + x.OtherDeduction + x.PfEmployee + x.PfLoan),
                    Net = g.Sum(x => x.NetPay)
                })
                .FirstOrDefaultAsync();

        if (totals == null || totals.Earned <= 0)
        {
            throw new InvalidOperationException($"{sheet.Code} has nothing to post.");
        }

        if (totals.Earned != totals.Advance + totals.Kept + totals.Net)
        {
            throw new InvalidOperationException($"{sheet.Code} does not add up (earned {Money(totals.Earned)}; deductions and net {Money(totals.Advance + totals.Kept + totals.Net)}) : return it to Draft and recalculate.");
        }

        string month = MonthText(sheet.Year, sheet.Month);
        string note = $"Salary {month} ({sheet.Code})";

        List<JournalVoucherLineDto> lines =
            new()
            {
                new()
                {
                    Side = "Debit",
                    GroupNo = 1,
                    LedgerType = LedgerTypeGeneral,
                    LedgerCode = PostingLedgerCodes.Get(_context, "PAYROLL-SALARY-EXPENSE"),
                    Amount = totals.Earned,
                    ShortNotes = note
                }
            };

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
        Credit("PAYROLL-DEDUCTIONS-PAYABLE", totals.Kept, "deductions kept back");
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

        int paid = await Lines.AsNoTracking().CountAsync(x => x.SalarySheetId == sheet.SalarySheetId && x.IsPaid);

        if (paid > 0)
        {
            throw new InvalidOperationException($"{paid} employee(s) of {sheet.Code} are marked Paid : mark them not paid first.");
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
