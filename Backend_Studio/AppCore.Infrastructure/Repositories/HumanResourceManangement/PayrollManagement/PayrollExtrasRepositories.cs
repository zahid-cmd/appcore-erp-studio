//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.AccountsFinance.VoucherManagement;
using AppCore.Application.HumanResourceManangement.PayrollManagement;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.HumanResourceManangement.AttendanceManagement;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;
using AppCore.Domain.Entities.HumanResourceManangement.PayrollManagement;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Platform.Accounting;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.HumanResourceManangement.PayrollManagement;


//===============================================================
// What the two repositories below share
//===============================================================

internal static class PayrollExtras
{
    public const string HistoryModule = "Human Resource";

    public const string LedgerTypeGeneral = "General Ledger";

    public static string Money(decimal value) => value.ToString("#,0.00");

    public static decimal Whole(decimal value) => Math.Round(value, 0, MidpointRounding.AwayFromZero);

    public static string Short(string? voucherNo)
    {
        string text = voucherNo ?? string.Empty;

        return text.Length > 30 ? text.Substring(0, 30) : text;
    }

    public static string NextCode(IEnumerable<string> codes, string prefix)
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

    public static void AddHistory(AppDbContext context, string entity, long id, string type, string title, string description, long userId)
    {
        context.ActivityHistories.Add(
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

    // One debit against one credit, on the ledgers of two Posting
    // Setup purposes
    public static List<JournalVoucherLineDto> Pair(AppDbContext context, string debitPurpose, string creditPurpose, decimal amount, string note) =>
        new()
        {
            new()
            {
                Side = "Debit",
                GroupNo = 1,
                LedgerType = LedgerTypeGeneral,
                LedgerCode = PostingLedgerCodes.Get(context, debitPurpose),
                Amount = amount,
                ShortNotes = note
            },
            new()
            {
                Side = "Credit",
                GroupNo = 1,
                LedgerType = LedgerTypeGeneral,
                LedgerCode = PostingLedgerCodes.Get(context, creditPurpose),
                Amount = amount,
                ShortNotes = note
            }
        };

    // employee -> the Basic of the salary structure
    public static async Task<Dictionary<long, decimal>> BasicAsync(AppDbContext context, List<long> employeeIds) =>
        (await (
            from l in context.Set<HrEmployeeSalaryLines>().AsNoTracking()
            where employeeIds.Contains(l.EmployeeId)
            join h in context.Set<HrSalaryHeads>().AsNoTracking() on l.SalaryHeadId equals h.SalaryHeadId
            where h.SystemKey == "BASIC"
            group l by l.EmployeeId into g
            select new { EmployeeId = g.Key, Amount = g.Sum(x => x.Amount) })
        .ToListAsync())
        .ToDictionary(x => x.EmployeeId, x => x.Amount);

    public static async Task<Dictionary<long, string>> BranchNamesAsync(AppDbContext context) =>
        (await context.Set<Branches>().AsNoTracking().Select(x => new { x.BranchId, x.BranchName }).ToListAsync())
        .ToDictionary(x => x.BranchId, x => x.BranchName);
}


//===============================================================
// Leave Encashments (hand-written page, 2026-11-14; NEVER run
// Code Sync for it)
//
// Leave days an employee does not take, paid as money, by the
// employee's Leave Encashment Policy (Human Resource Setup : the
// one the Employee Profile names, otherwise the Default) :
//     amount = days x day rate,  day rate = Basic or Gross /
//              the month days of the policy      (whole taka)
//
// The leave year is the financial year (Settings > Financial
// Years). It depends wholly on the leave balance and is paid on a
// year basis : ONE encashment of an employee for a leave year, on
// the whole balance : every leave type the policy lets encash is a
// line of it, for the days the
// employee has left of it (the entitlement less the leave taken,
// the leave applied for and what was encashed before), less the
// days the policy keeps in the balance, within its yearly limit.
// The days are never typed. No balance : nothing to encash.
//
//   Pending    saved : the days are held off the leave balance,
//              nothing is posted
//   Approved   one Journal Voucher (Posting Setup, Payroll) :
//                  Dr  PAYROLL-LEAVE-ENCASH-EXPENSE
//                  Cr  PAYROLL-LEAVE-ENCASH-PAYABLE
//              paid on Payroll Payments (Paid For : Leave
//              Encashment)
//   Rejected   the days go back to the leave balance
//
// An encashment is never edited : deleting it cancels the voucher
// and gives the days back (refused once something of it is paid).
//===============================================================

public class LeaveEncashmentsRepository
    : ILeaveEncashmentsRepository
{
    public const string HistoryEntity = "HrLeaveEncashments";

    private const string Pending = "Pending";

    private const string Approved = "Approved";

    private const string Rejected = "Rejected";

    private readonly AppDbContext _context;

    private readonly IJournalVoucherRepository _journalVouchers;

    public LeaveEncashmentsRepository(
        AppDbContext context,
        IJournalVoucherRepository journalVouchers)
    {
        _context = context;
        _journalVouchers = journalVouchers;
    }

    private DbSet<HrLeaveEncashments> Encashments => _context.Set<HrLeaveEncashments>();

    private DbSet<HrLeaveEncashmentLines> EncashLines => _context.Set<HrLeaveEncashmentLines>();

    // The days encashed of a leave year, by leave type (for the
    // leave balance : LeaveApplicationsRepository, HR Reports)
    public static async Task<Dictionary<long, decimal>> EncashedAsync(AppDbContext context, long employeeId, int year) =>
        (await (
            from x in context.Set<HrLeaveEncashments>().AsNoTracking()
            where !x.IsDeleted && x.Status != Rejected && x.EmployeeId == employeeId && x.LeaveYear == year
            join l in context.Set<HrLeaveEncashmentLines>().AsNoTracking() on x.LeaveEncashmentId equals l.LeaveEncashmentId
            group l by l.LeaveTypeId into g
            select new { LeaveTypeId = g.Key, Days = g.Sum(v => v.Days) })
        .ToListAsync())
        .ToDictionary(x => x.LeaveTypeId, x => x.Days);

    private async Task<List<LeaveEncashmentDto>> ReadAsync(IQueryable<HrLeaveEncashments> source)
    {
        var rows =
            await (
                from x in source
                join e in _context.Set<HrEmployees>().AsNoTracking() on x.EmployeeId equals e.EmployeeId
                orderby x.EncashDate descending, x.LeaveEncashmentId descending
                select new { X = x, e.Code, e.FullName })
            .ToListAsync();

        List<long> ids = rows.Select(r => r.X.LeaveEncashmentId).ToList();

        ILookup<long, HrLeaveEncashmentLines> linesOf =
            (await EncashLines.AsNoTracking()
                .Where(x => ids.Contains(x.LeaveEncashmentId))
                .OrderBy(x => x.LeaveEncashmentLineId)
                .ToListAsync())
            .ToLookup(x => x.LeaveEncashmentId);

        Dictionary<long, string> branches = await PayrollExtras.BranchNamesAsync(_context);

        HrLeaveYears leaveYears = await HrLeaveYears.LoadAsync(_context);

        Dictionary<long, decimal> paid = await HrPaymentsRepository.PaidBySourceAsync(_context, HrPaymentsRepository.Encashment);

        return rows
            .Select(r => new LeaveEncashmentDto
            {
                PublicId = r.X.PublicId,
                Code = r.X.Code,
                EmployeeId = r.X.EmployeeId,
                EmployeeCode = r.Code,
                EmployeeName = r.FullName,
                BranchId = r.X.BranchId,
                BranchName = branches.TryGetValue(r.X.BranchId, out string? name) ? name : string.Empty,
                LeaveTypeId = r.X.LeaveTypeId,
                // "Casual Leave 10, Sick Leave 7"
                LeaveTypeName = string.Join(", ", linesOf[r.X.LeaveEncashmentId].Select(l => $"{l.LeaveTypeName} {l.Days:0.##}")),
                Lines =
                    linesOf[r.X.LeaveEncashmentId]
                        .Select(l => new LeaveEncashmentLineDto
                        {
                            LeaveTypeId = l.LeaveTypeId,
                            LeaveTypeName = l.LeaveTypeName,
                            Entitled = l.Entitled,
                            Used = l.Used,
                            Days = l.Days,
                            Amount = l.Amount
                        })
                        .ToList(),
                LeaveYear = r.X.LeaveYear,
                LeaveYearName = leaveYears.NameOf(r.X.LeaveYear),
                EncashDate = HrCalendar.Day(r.X.EncashDate),
                Days = r.X.Days,
                RateBase = r.X.RateBase,
                MonthDays = r.X.MonthDays,
                DayRate = r.X.DayRate,
                Amount = r.X.Amount,
                PolicyName = r.X.PolicyName,
                Status = r.X.Status,
                RejectReason = r.X.RejectReason,
                PaidAmount = paid.TryGetValue(r.X.LeaveEncashmentId, out decimal done) ? done : 0,
                Remarks = r.X.Remarks,
                JournalVoucherNo = r.X.JournalVoucherNo
            })
            .ToList();
    }

    public Task<List<LeaveEncashmentDto>> GetListAsync() =>
        ReadAsync(Encashments.AsNoTracking().Where(x => !x.IsDeleted));

    public async Task<LeaveEncashmentDto> GetAsync(Guid publicId) =>
        (await ReadAsync(Encashments.AsNoTracking().Where(x => x.PublicId == publicId && !x.IsDeleted))).FirstOrDefault()
        ?? throw new KeyNotFoundException("The leave encashment was not found.");

    public async Task<LeaveEncashmentDefaultsDto> GetDefaultsAsync()
    {
        var employees =
            await (
                from e in _context.Set<HrEmployees>().AsNoTracking()
                where !e.IsDeleted && e.IsActive
                join g in _context.Set<Designation>().AsNoTracking() on e.DesignationId equals g.DesignationId into gj
                from g in gj.DefaultIfEmpty()
                orderby e.Code
                select new { e.EmployeeId, e.Code, e.FullName, e.GrossSalary, DesignationName = g != null ? g.DesignationName : string.Empty })
            .ToListAsync();

        Dictionary<long, decimal> basic = await PayrollExtras.BasicAsync(_context, employees.Select(x => x.EmployeeId).ToList());

        return new LeaveEncashmentDefaultsDto
        {
            NextCode = PayrollExtras.NextCode(await Encashments.AsNoTracking().Select(x => x.Code).ToListAsync(), "LEN-"),
            Year = (await HrLeaveYears.LoadAsync(_context)).Of(HrCalendar.Today()).Year,
            MonthDays = 30,
            Employees =
                employees
                    .Select(e => new EncashEmployeeDto
                    {
                        Id = e.EmployeeId,
                        Code = e.Code,
                        Name = e.FullName,
                        DesignationName = e.DesignationName,
                        BasicSalary = basic.TryGetValue(e.EmployeeId, out decimal b) ? b : 0,
                        GrossSalary = e.GrossSalary
                    })
                    .ToList()
        };
    }

    // The policy in words
    private static List<string> Rules(HrLeaveEncashPolicies p)
    {
        List<string> rules = new()
        {
            "Paid on a year basis : once a leave year, on the whole balance left of every leave type below.",
            $"Day rate : {p.RateBase.ToLowerInvariant()} salary / {p.MonthDays}."
        };

        if (p.KeepDays > 0)
        {
            rules.Add($"{p.KeepDays:0.##} day(s) stay in the balance : only the days above that are paid.");
        }

        if (p.MaxDaysPerYear > 0)
        {
            rules.Add($"{p.MaxDaysPerYear:0.##} day(s) a year at most, over all the leave types together (in the order below).");
        }

        if (p.ConfirmedOnly)
        {
            rules.Add("Confirmed employees only.");
        }

        if (p.MinServiceMonths > 0)
        {
            rules.Add($"{p.MinServiceMonths} month(s) of service needed.");
        }

        rules.Add(p.AfterYearEnd ? "Only a leave year that has ended is encashed." : "The running leave year and the one before can be encashed.");

        rules.Add("The leave year is the financial year.");

        return rules;
    }

    // The leave an employee can encash for a leave year, by the
    // employee's policy : entitled, taken, applied for, encashed,
    // left, and what of that the policy pays
    public async Task<EncashEligibilityDto> GetBalanceAsync(long employeeId, int year)
    {
        var employee =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => x.EmployeeId == employeeId && !x.IsDeleted)
                .Select(x => new { x.EmployeeId, x.FullName, x.GrossSalary, x.JoiningDate, x.ConfirmationDate, x.LeaveEncashPolicyId })
                .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("Pick the employee.");

        DateOnly today = HrCalendar.Today();

        // the leave year is the financial year : the running one and
        // the one before
        HrLeaveYears leaveYears = await HrLeaveYears.LoadAsync(_context);

        LeaveYear running = leaveYears.Of(today);
        LeaveYear before = leaveYears.Before(running);

        EncashEligibilityDto result =
            new() { Year = running.Year, YearName = running.Name, Years = new List<int> { running.Year }, YearNames = new List<string> { running.Name } };

        HrLeaveEncashPolicies? policy =
            await LeaveEncashPoliciesRepository.ForEmployeeAsync(_context, employee.LeaveEncashPolicyId);

        if (policy == null)
        {
            result.Problem = "There is no Default leave encashment policy : mark one as the Default on Human Resource Setup > Leave Encashment Policies, or pick one on the Employee Profile.";

            return result;
        }

        List<LeaveYear> allowed =
            policy.AfterYearEnd
                ? new List<LeaveYear> { before }
                : new List<LeaveYear> { running, before };

        LeaveYear leaveYear = allowed.FirstOrDefault(x => x.Year == year) ?? allowed[0];

        year = leaveYear.Year;

        result.Years = allowed.Select(x => x.Year).ToList();
        result.YearNames = allowed.Select(x => x.Name).ToList();
        result.YearName = leaveYear.Name;

        DateOnly first = leaveYear.First;
        DateOnly last = leaveYear.Last;

        decimal basic =
            (await PayrollExtras.BasicAsync(_context, new List<long> { employee.EmployeeId })).TryGetValue(employee.EmployeeId, out decimal b) ? b : 0;

        decimal salary = policy.RateBase == "Gross" ? employee.GrossSalary : basic;

        result.Year = year;
        result.LeaveEncashPolicyId = policy.LeaveEncashPolicyId;
        result.PolicyName = policy.Name;
        result.IsOwnPolicy = policy.LeaveEncashPolicyId == employee.LeaveEncashPolicyId;
        result.RateBase = policy.RateBase;
        result.MonthDays = policy.MonthDays;
        result.Salary = salary;
        result.DayRate = Math.Round(salary / policy.MonthDays, 2, MidpointRounding.AwayFromZero);
        result.Rules = Rules(policy);

        // service : whole months from joining to the end of the
        // leave year (today, when the year is still running)
        int months = BonusStructuresRepository.Months(employee.JoiningDate, last < today ? last : today);

        if (employee.JoiningDate > last)
        {
            result.Problem = $"{employee.FullName} joined after the leave year {leaveYear.Name}.";
        }
        else if (policy.ConfirmedOnly && !(employee.ConfirmationDate != null && employee.ConfirmationDate.Value <= today))
        {
            result.Problem = $"{employee.FullName} is not confirmed : {policy.Name} pays confirmed employees only.";
        }
        else if (months < policy.MinServiceMonths)
        {
            result.Problem = $"{employee.FullName} has {months} month(s) of service : {policy.Name} asks for {policy.MinServiceMonths}.";
        }
        else if (salary <= 0)
        {
            result.Problem = $"{employee.FullName} has no {policy.RateBase.ToLowerInvariant()} salary on the Employee Profile.";
        }

        var types =
            await (
                from x in _context.Set<HrLeaveEncashPolicyTypes>().AsNoTracking()
                where x.LeaveEncashPolicyId == policy.LeaveEncashPolicyId
                join t in _context.Set<HrLeaveTypes>().AsNoTracking().Where(LeaveEncashPoliciesRepository.CanBeEncashed) on x.LeaveTypeId equals t.LeaveTypeId
                orderby t.Code
                select new { t.LeaveTypeId, t.Name, t.DaysPerYear })
            .ToListAsync();

        var used =
            await _context.Set<HrAttendance>().AsNoTracking()
                .Where(x => x.EmployeeId == employeeId && x.Status == "LV" && x.AttendanceDate >= first && x.AttendanceDate <= last)
                .GroupBy(x => x.LeaveTypeId)
                .Select(g => new { LeaveTypeId = g.Key, Days = g.Count() })
                .ToListAsync();

        var pending =
            await _context.Set<HrLeaveApplications>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.EmployeeId == employeeId && x.Status == "Pending" && x.FromDate >= first && x.FromDate <= last)
                .GroupBy(x => x.LeaveTypeId)
                .Select(g => new { LeaveTypeId = g.Key, Days = g.Sum(x => x.Days) })
                .ToListAsync();

        // year basis : the one encashment of the year (it covers
        // every leave type), and its days by leave type
        var whole =
            await Encashments.AsNoTracking()
                .Where(x => !x.IsDeleted && x.Status != Rejected && x.EmployeeId == employeeId && x.LeaveYear == year)
                .OrderBy(x => x.LeaveEncashmentId)
                .Select(x => new { x.Code, x.Status })
                .FirstOrDefaultAsync();

        Dictionary<long, decimal> done = await EncashedAsync(_context, employeeId, year);

        // the yearly limit is on the TOTAL days of the employee : the
        // leave types use it up in their order (0 : no limit)
        decimal limitLeft = policy.MaxDaysPerYear > 0 ? policy.MaxDaysPerYear : decimal.MaxValue;

        result.Rows =
            types
                .Select(t =>
                {
                    decimal usedDays = used.FirstOrDefault(x => x.LeaveTypeId == t.LeaveTypeId)?.Days ?? 0;
                    decimal pendingDays = pending.FirstOrDefault(x => x.LeaveTypeId == t.LeaveTypeId)?.Days ?? 0;
                    decimal encashedDays = done.TryGetValue(t.LeaveTypeId, out decimal before) ? before : 0;
                    string? doneCode = whole?.Code;
                    bool doneWaits = whole?.Status == Pending;

                    decimal remaining = Math.Max(0, t.DaysPerYear - usedDays - pendingDays - encashedDays);

                    decimal encashable = Math.Max(0, remaining - policy.KeepDays);

                    string note =
                        doneCode != null ? (doneWaits ? $"{doneCode} is waiting for approval" : $"Encashed for {leaveYear.Name} already : {doneCode}")
                        : result.Problem.Length > 0 ? "Not eligible"
                        : remaining <= 0 ? "No balance left"
                        : encashable <= 0 ? $"The {policy.KeepDays:0.##} day(s) left must stay in the balance"
                        : string.Empty;

                    if (note.Length > 0)
                    {
                        encashable = 0;
                    }

                    // what the yearly limit still lets through
                    if (encashable > limitLeft)
                    {
                        note = $"{encashable - limitLeft:0.##} day(s) are over the yearly limit of {policy.MaxDaysPerYear:0.##} day(s)";

                        encashable = limitLeft;
                    }

                    limitLeft -= encashable;

                    return new EncashBalanceDto
                    {
                        LeaveTypeId = t.LeaveTypeId,
                        Name = t.Name,
                        Entitled = t.DaysPerYear,
                        Used = usedDays,
                        Pending = pendingDays,
                        Encashed = encashedDays,
                        Remaining = remaining,
                        Encashable = encashable,
                        Amount = PayrollExtras.Whole(encashable * salary / policy.MonthDays),
                        Note = note
                    };
                })
                .ToList();

        return result;
    }

    public async Task<LeaveEncashmentDto> CreateAsync(LeaveEncashmentDto dto, long userId)
    {
        var employee =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => x.EmployeeId == dto.EmployeeId && !x.IsDeleted)
                .Select(x => new { x.EmployeeId, x.Code, x.FullName, x.BranchId })
                .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("Pick the employee.");

        DateOnly date =
            HrCalendar.ParseDay(dto.EncashDate)
            ?? throw new InvalidOperationException("Date is required.");

        if (date > HrCalendar.Today())
        {
            throw new InvalidOperationException("The date cannot be in the future.");
        }

        // the leave balance and the policy decide everything : the
        // days and the rate are never taken from the screen
        EncashEligibilityDto eligibility = await GetBalanceAsync(employee.EmployeeId, dto.LeaveYear);

        if (eligibility.LeaveEncashPolicyId == 0 || eligibility.Problem.Length > 0)
        {
            throw new InvalidOperationException(eligibility.Problem);
        }

        int year = eligibility.Year;

        if (year != dto.LeaveYear)
        {
            throw new InvalidOperationException($"{eligibility.PolicyName} does not let that leave year be encashed now : pick {string.Join(" or ", eligibility.YearNames)}.");
        }

        // the whole balance : every leave type with days to encash
        List<EncashBalanceDto> balances =
            eligibility.Rows.Where(x => x.Encashable > 0 && x.Amount > 0).ToList();

        if (balances.Count == 0)
        {
            string why = eligibility.Rows.Select(x => x.Note).FirstOrDefault(x => x.Length > 0) ?? "No balance left";

            throw new InvalidOperationException($"{employee.FullName}, {eligibility.YearName} : nothing to encash. {why}.");
        }

        decimal days = balances.Sum(x => x.Encashable);
        decimal dayRate = eligibility.DayRate;
        decimal amount = balances.Sum(x => x.Amount);
        string rateBase = eligibility.RateBase;

        string remarks = (dto.Remarks ?? string.Empty).Trim();

        if (remarks.Length > 500)
        {
            throw new InvalidOperationException("Remarks : 500 characters at most.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        HrLeaveEncashments entity = new()
        {
            Code = PayrollExtras.NextCode(await Encashments.AsNoTracking().Select(x => x.Code).ToListAsync(), "LEN-"),
            EmployeeId = employee.EmployeeId,
            BranchId = employee.BranchId,
            LeaveTypeId = 0,
            LeaveYear = year,
            EncashDate = date,
            Days = days,
            RateBase = rateBase,
            MonthDays = eligibility.MonthDays,
            LeaveEncashPolicyId = eligibility.LeaveEncashPolicyId,
            PolicyName = eligibility.PolicyName,
            DayRate = dayRate,
            Amount = amount,
            Remarks = remarks,
            Status = Pending,
            IsDeleted = false,
            CreatedBy = userId,
            CreatedDate = DateTime.UtcNow
        };

        Encashments.Add(entity);

        await _context.SaveChangesAsync();

        foreach (EncashBalanceDto balance in balances)
        {
            EncashLines.Add(
                new HrLeaveEncashmentLines
                {
                    LeaveEncashmentId = entity.LeaveEncashmentId,
                    LeaveTypeId = balance.LeaveTypeId,
                    LeaveTypeName = balance.Name,
                    Entitled = balance.Entitled,
                    Used = balance.Used + balance.Pending,
                    Days = balance.Encashable,
                    Amount = balance.Amount
                });
        }

        string what = $"{days:0.##} day(s) of leave {eligibility.YearName} ({string.Join(", ", balances.Select(x => $"{x.Name} {x.Encashable:0.##}"))}), {employee.Code} {employee.FullName}";

        PayrollExtras.AddHistory(_context, HistoryEntity, entity.LeaveEncashmentId, "Create", "Leave Encashment Saved", $"{entity.Code} : {what}, by {entity.PolicyName}, on {rateBase} at Tk {PayrollExtras.Money(dayRate)} a day = Tk {PayrollExtras.Money(amount)}. Waiting for approval.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetAsync(entity.PublicId);
    }

    private async Task<HrLeaveEncashments> PendingAsync(Guid publicId)
    {
        HrLeaveEncashments entity =
            await Encashments.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The leave encashment was not found.");

        if (entity.Status != Pending)
        {
            throw new InvalidOperationException($"{entity.Code} is {entity.Status} already.");
        }

        return entity;
    }

    // Pending -> Approved : the Journal Voucher is posted
    public async Task ApproveAsync(Guid publicId, long userId)
    {
        HrLeaveEncashments entity = await PendingAsync(publicId);

        var employee =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => x.EmployeeId == entity.EmployeeId)
                .Select(x => new { x.Code, x.FullName })
                .FirstOrDefaultAsync();

        List<string> leaveTypes =
            (await EncashLines.AsNoTracking()
                .Where(x => x.LeaveEncashmentId == entity.LeaveEncashmentId)
                .OrderBy(x => x.LeaveEncashmentLineId)
                .Select(x => new { x.LeaveTypeName, x.Days })
                .ToListAsync())
            .Select(x => $"{x.LeaveTypeName} {x.Days:0.##}")
            .ToList();

        string yearName = (await HrLeaveYears.LoadAsync(_context)).NameOf(entity.LeaveYear);

        string what = $"{entity.Days:0.##} day(s) of leave {yearName} ({string.Join(", ", leaveTypes)}), {employee?.Code} {employee?.FullName}";

        await using var transaction = await _context.Database.BeginTransactionAsync();

        JournalVoucherSavedDto voucher =
            await _journalVouchers.CreatePostedAsync(
                new CreateJournalVoucherDto
                {
                    VoucherDate = HrCalendar.Day(entity.EncashDate),
                    BranchId = entity.BranchId,
                    Narration = $"Leave encashment : {what}, Tk {PayrollExtras.Money(entity.Amount)} | {entity.Code}",
                    Lines = PayrollExtras.Pair(_context, "PAYROLL-LEAVE-ENCASH-EXPENSE", "PAYROLL-LEAVE-ENCASH-PAYABLE", entity.Amount, $"Leave encashment {entity.Code} : {employee?.Code}")
                },
                entity.Code,
                userId);

        entity.Status = Approved;
        entity.ApprovedBy = userId;
        entity.ApprovedDate = DateTime.UtcNow;
        entity.JournalVoucherId = voucher.JournalVoucherId;
        entity.JournalVoucherNo = PayrollExtras.Short(voucher.VoucherNo);

        PayrollExtras.AddHistory(_context, HistoryEntity, entity.LeaveEncashmentId, "Approve", "Leave Encashment Approved", $"{entity.Code} : {what}, Tk {PayrollExtras.Money(entity.Amount)}. Journal Voucher {entity.JournalVoucherNo}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    // Pending -> Rejected : the days go back to the leave balance
    public async Task RejectAsync(Guid publicId, SalarySheetReasonDto dto, long userId)
    {
        HrLeaveEncashments entity = await PendingAsync(publicId);

        string reason = (dto?.Reason ?? string.Empty).Trim();

        if (reason.Length == 0 || reason.Length > 300)
        {
            throw new InvalidOperationException("Write why the leave encashment is rejected (300 characters at most).");
        }

        entity.Status = Rejected;
        entity.RejectReason = reason;
        entity.ApprovedBy = userId;
        entity.ApprovedDate = DateTime.UtcNow;

        PayrollExtras.AddHistory(_context, HistoryEntity, entity.LeaveEncashmentId, "Reject", "Leave Encashment Rejected", $"{entity.Code} : {entity.Days:0.##} day(s) given back. Reason : {reason}", userId);

        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid publicId, long userId)
    {
        HrLeaveEncashments entity =
            await Encashments.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The leave encashment was not found.");

        if (await HrPaymentsRepository.AnyAsync(_context, new[] { HrPaymentsRepository.Encashment }, entity.LeaveEncashmentId))
        {
            throw new InvalidOperationException($"{entity.Code} is paid on Payroll Payments : cancel the payment first.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (entity.JournalVoucherId != null)
        {
            await _journalVouchers.CancelAsync(
                entity.JournalVoucherId.Value,
                new CancelJournalVoucherDto { CancelDate = HrCalendar.Day(HrCalendar.Today()), Reason = $"{entity.Code} deleted" },
                userId);
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        PayrollExtras.AddHistory(_context, HistoryEntity, entity.LeaveEncashmentId, "Delete", "Leave Encashment Deleted", $"{entity.Code} ({entity.Status}) : {entity.Days:0.##} day(s) given back, Tk {PayrollExtras.Money(entity.Amount)}.{(entity.JournalVoucherId != null ? $" Journal Voucher {entity.JournalVoucherNo} cancelled." : string.Empty)}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }
}


//===============================================================
// Festival Bonus (hand-written page, 2026-11-14; NEVER run Code
// Sync for it)
//
// A bonus sheet (BON-0001) of a branch for an occasion. Every
// employee is worked out by the employee's Bonus Structure (Human
// Resource Setup : the one the Employee Profile names, otherwise
// the Default) :
//     amount = Basic or Gross x the percent of the service slab
//              the employee falls in            (whole taka)
// for every active employee of the branch who joined on or before
// the bonus date. The months of service are counted from the
// joining or the confirmation date, as the structure says; an
// employee below the first slab (or not confirmed, when the
// structure asks for that) is left off. A line keeps the name of
// its structure and what that said that day.
//
//   Draft    the amounts can be changed, the sheet deleted
//   Posted   one Journal Voucher (Posting Setup, Payroll) :
//                Dr  PAYROLL-BONUS-EXPENSE
//                Cr  PAYROLL-BONUS-PAYABLE
//            paid on Payroll Payments (Paid For : Festival Bonus).
//            Unposting cancels the voucher (refused once
//            something of it is paid).
//===============================================================

public class BonusSheetsRepository
    : IBonusSheetsRepository
{
    public const string HistoryEntity = "HrBonusSheets";

    private const string Draft = "Draft";

    private const string Posted = "Posted";

    private readonly AppDbContext _context;

    private readonly IJournalVoucherRepository _journalVouchers;

    public BonusSheetsRepository(
        AppDbContext context,
        IJournalVoucherRepository journalVouchers)
    {
        _context = context;
        _journalVouchers = journalVouchers;
    }

    private DbSet<HrBonusSheets> Sheets => _context.Set<HrBonusSheets>();

    private DbSet<HrBonusSheetLines> Lines => _context.Set<HrBonusSheetLines>();

    private static void Fill(BonusSheetListItemDto dto, HrBonusSheets s, Dictionary<long, string> branches, decimal paid)
    {
        dto.PublicId = s.PublicId;
        dto.Code = s.Code;
        dto.Title = s.Title;
        dto.BranchId = s.BranchId;
        dto.BranchName = branches.TryGetValue(s.BranchId, out string? name) ? name : string.Empty;
        dto.BonusDate = HrCalendar.Day(s.BonusDate);
        dto.BonusStructureId = s.BonusStructureId ?? 0;
        dto.StructureName = s.StructureName;
        dto.ServiceFrom = s.ServiceFrom;
        dto.RateBase = s.RateBase;
        dto.BonusPercent = s.BonusPercent;
        dto.MinServiceMonths = s.MinServiceMonths;
        dto.Status = s.Status;
        dto.EmployeeCount = s.EmployeeCount;
        dto.TotalAmount = s.TotalAmount;
        dto.PaidAmount = paid;
        dto.Remarks = s.Remarks;
        dto.JournalVoucherNo = s.JournalVoucherNo;
    }

    public async Task<List<BonusSheetListItemDto>> GetListAsync()
    {
        List<HrBonusSheets> sheets =
            await Sheets.AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderByDescending(x => x.BonusDate).ThenByDescending(x => x.BonusSheetId)
                .ToListAsync();

        Dictionary<long, string> branches = await PayrollExtras.BranchNamesAsync(_context);

        Dictionary<long, decimal> paid = await HrPaymentsRepository.PaidBySourceAsync(_context, HrPaymentsRepository.Bonus);

        return sheets
            .Select(s =>
            {
                BonusSheetListItemDto dto = new();

                Fill(dto, s, branches, paid.TryGetValue(s.BonusSheetId, out decimal done) ? done : 0);

                return dto;
            })
            .ToList();
    }

    private async Task<HrBonusSheets> FindAsync(Guid publicId, bool tracked) =>
        await (tracked ? Sheets : Sheets.AsNoTracking()).FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
        ?? throw new KeyNotFoundException("The bonus sheet was not found.");

    public async Task<BonusSheetDto> GetAsync(Guid publicId)
    {
        HrBonusSheets s = await FindAsync(publicId, false);

        List<HrBonusSheetLines> lines =
            await Lines.AsNoTracking().Where(x => x.BonusSheetId == s.BonusSheetId).OrderBy(x => x.EmployeeCode).ToListAsync();

        Dictionary<long, decimal> paidByLine = await HrPaymentsRepository.PaidByLineAsync(_context, HrPaymentsRepository.Bonus, s.BonusSheetId);

        BonusSheetDto dto = new();

        Fill(dto, s, await PayrollExtras.BranchNamesAsync(_context), paidByLine.Values.Sum());

        dto.Lines =
            lines
                .Select(l => new BonusSheetLineDto
                {
                    BonusSheetLineId = l.BonusSheetLineId,
                    EmployeeId = l.EmployeeId,
                    EmployeeCode = l.EmployeeCode,
                    EmployeeName = l.EmployeeName,
                    DesignationName = l.DesignationName,
                    BasicSalary = l.BasicSalary,
                    GrossSalary = l.GrossSalary,
                    ServiceMonths = l.ServiceMonths,
                    BonusPercent = l.BonusPercent,
                    StructureName = l.StructureName,
                    Amount = l.Amount,
                    PaidAmount = paidByLine.TryGetValue(l.BonusSheetLineId, out decimal done) ? done : 0
                })
                .ToList();

        return dto;
    }

    public async Task<BonusSheetDefaultsDto> GetDefaultsAsync()
    {
        List<HrBonusStructures> structures =
            await _context.Set<HrBonusStructures>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderByDescending(x => x.IsDefault).ThenBy(x => x.Code)
                .ToListAsync();

        List<long> ids = structures.Select(x => x.BonusStructureId).ToList();

        List<HrBonusStructureSlabs> slabs =
            await _context.Set<HrBonusStructureSlabs>().AsNoTracking()
                .Where(x => ids.Contains(x.BonusStructureId))
                .OrderBy(x => x.FromMonths)
                .ToListAsync();

        return new BonusSheetDefaultsDto
        {
            NextCode = PayrollExtras.NextCode(await Sheets.AsNoTracking().Select(x => x.Code).ToListAsync(), "BON-"),
            Branches =
                await _context.Set<Branches>().AsNoTracking()
                    .Where(x => !x.IsDeleted && x.IsActive)
                    .OrderBy(x => x.BranchName)
                    .Select(x => new PayrollLookupDto { Id = x.BranchId, Name = x.BranchName })
                    .ToListAsync(),
            Structures =
                structures
                    .Select(x => new BonusStructureChoiceDto
                    {
                        Id = x.BonusStructureId,
                        Name = x.Name,
                        IsDefault = x.IsDefault,
                        RateBase = x.RateBase,
                        ServiceFrom = x.ServiceFrom,
                        ConfirmedOnly = x.ConfirmedOnly,
                        Slabs =
                            slabs
                                .Where(l => l.BonusStructureId == x.BonusStructureId)
                                .Select(l => $"{l.FromMonths} month(s) and above : {l.BonusPercent:0.###} %")
                                .ToList()
                    })
                    .ToList()
        };
    }

    // Makes the Draft sheet : every active employee of the branch
    // with the service asked
    public async Task<BonusSheetDto> GenerateAsync(GenerateBonusSheetDto dto, long userId)
    {
        string title = (dto.Title ?? string.Empty).Trim();

        if (title.Length == 0 || title.Length > 100)
        {
            throw new InvalidOperationException("Name the bonus (e.g. Eid-ul-Fitr 2027) : 100 characters at most.");
        }

        bool branchFound =
            await _context.Set<Branches>().AsNoTracking().AnyAsync(x => x.BranchId == dto.BranchId && !x.IsDeleted);

        if (!branchFound)
        {
            throw new InvalidOperationException("Pick the branch.");
        }

        DateOnly date =
            HrCalendar.ParseDay(dto.BonusDate)
            ?? throw new InvalidOperationException("Bonus Date is required.");

        string remarks = (dto.Remarks ?? string.Empty).Trim();

        if (remarks.Length > 500)
        {
            throw new InvalidOperationException("Remarks : 500 characters at most.");
        }

        if (await Sheets.AsNoTracking().AnyAsync(x => !x.IsDeleted && x.BranchId == dto.BranchId && x.Title == title))
        {
            throw new InvalidOperationException($"\"{title}\" has a bonus sheet for this branch already.");
        }

        // the structures : an employee has the one of the profile
        // (when it is still Active), otherwise the Default
        List<HrBonusStructures> structures =
            await _context.Set<HrBonusStructures>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .ToListAsync();

        HrBonusStructures? fallback = structures.FirstOrDefault(x => x.IsDefault);

        List<long> structureIds = structures.Select(x => x.BonusStructureId).ToList();

        ILookup<long, HrBonusStructureSlabs> slabsOf =
            (await _context.Set<HrBonusStructureSlabs>().AsNoTracking()
                .Where(x => structureIds.Contains(x.BonusStructureId))
                .OrderBy(x => x.FromMonths)
                .ToListAsync())
            .ToLookup(x => x.BonusStructureId);

        var employees =
            await (
                from e in _context.Set<HrEmployees>().AsNoTracking()
                where !e.IsDeleted && e.IsActive && e.BranchId == dto.BranchId && e.JoiningDate <= date
                join g in _context.Set<Designation>().AsNoTracking() on e.DesignationId equals g.DesignationId into gj
                from g in gj.DefaultIfEmpty()
                orderby e.Code
                select new { e.EmployeeId, e.Code, e.FullName, e.GrossSalary, e.JoiningDate, e.ConfirmationDate, e.BonusStructureId, DesignationName = g != null ? g.DesignationName : string.Empty })
            .ToListAsync();

        int withoutStructure =
            fallback != null ? 0 : employees.Count(e => !structures.Any(x => x.BonusStructureId == e.BonusStructureId));

        if (withoutStructure > 0)
        {
            throw new InvalidOperationException($"There is no Default bonus structure, and {withoutStructure} employee(s) of the branch name none on the Employee Profile : mark one as the Default on Human Resource Setup > Bonus Structures.");
        }

        Dictionary<long, decimal> basic = await PayrollExtras.BasicAsync(_context, employees.Select(x => x.EmployeeId).ToList());

        List<HrBonusSheetLines> lines = new();

        List<HrBonusStructures> usedStructures = new();

        foreach (var e in employees)
        {
            HrBonusStructures structure =
                structures.FirstOrDefault(x => x.BonusStructureId == e.BonusStructureId) ?? fallback!;

            bool confirmed = e.ConfirmationDate != null && e.ConfirmationDate.Value <= date;

            if (structure.ConfirmedOnly && !confirmed)
            {
                continue;
            }

            // whole months of service on the bonus date, from the
            // joining or the confirmation date (the structure says)
            int months =
                structure.ServiceFrom == "Confirmation"
                    ? (confirmed ? BonusStructuresRepository.Months(e.ConfirmationDate!.Value, date) : -1)
                    : BonusStructuresRepository.Months(e.JoiningDate, date);

            // the slab the service falls in (none : no bonus)
            decimal percent = months < 0 ? 0 : BonusStructuresRepository.PercentFor(slabsOf[structure.BonusStructureId], months);

            if (percent <= 0)
            {
                continue;
            }

            decimal basicSalary = basic.TryGetValue(e.EmployeeId, out decimal b) ? b : 0;

            decimal amount = PayrollExtras.Whole((structure.RateBase == "Gross" ? e.GrossSalary : basicSalary) * percent / 100m);

            if (amount <= 0)
            {
                continue;
            }

            if (!usedStructures.Contains(structure))
            {
                usedStructures.Add(structure);
            }

            lines.Add(
                new HrBonusSheetLines
                {
                    EmployeeId = e.EmployeeId,
                    EmployeeCode = e.Code,
                    EmployeeName = e.FullName,
                    DesignationName = e.DesignationName,
                    BasicSalary = basicSalary,
                    GrossSalary = e.GrossSalary,
                    ServiceMonths = Math.Max(0, months),
                    BonusPercent = percent,
                    StructureName = structure.Name,
                    Amount = amount
                });
        }

        if (lines.Count == 0)
        {
            throw new InvalidOperationException("No employee of the branch gets a bonus : check the service slabs of the bonus structures, and the salary on the Employee Profiles.");
        }

        // one structure for everyone : the sheet says which; more :
        // each line says its own
        HrBonusStructures? only = usedStructures.Count == 1 ? usedStructures[0] : null;

        string by = only != null ? only.Name : $"{usedStructures.Count} bonus structures (by Employee Profile)";

        await using var transaction = await _context.Database.BeginTransactionAsync();

        HrBonusSheets sheet = new()
        {
            Code = PayrollExtras.NextCode(await Sheets.AsNoTracking().Select(x => x.Code).ToListAsync(), "BON-"),
            Title = title,
            BranchId = dto.BranchId,
            BonusDate = date,
            BonusStructureId = only?.BonusStructureId,
            StructureName = only != null ? only.Name : "By Employee Profile",
            RateBase = only != null ? only.RateBase : "Mixed",
            ServiceFrom = only != null ? only.ServiceFrom : "Mixed",
            BonusPercent = lines.Max(x => x.BonusPercent),
            MinServiceMonths = lines.Min(x => x.ServiceMonths),
            Status = Draft,
            EmployeeCount = lines.Count,
            TotalAmount = lines.Sum(x => x.Amount),
            Remarks = remarks,
            IsDeleted = false,
            CreatedBy = userId,
            CreatedDate = DateTime.UtcNow
        };

        Sheets.Add(sheet);

        await _context.SaveChangesAsync();

        foreach (HrBonusSheetLines line in lines)
        {
            line.BonusSheetId = sheet.BonusSheetId;

            Lines.Add(line);
        }

        PayrollExtras.AddHistory(_context, HistoryEntity, sheet.BonusSheetId, "Create", "Bonus Sheet Generated", $"{sheet.Code} : {title}, by {by}, {lines.Count} employee(s), Tk {PayrollExtras.Money(sheet.TotalAmount)}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetAsync(sheet.PublicId);
    }

    // Draft : the amounts typed (0 leaves the employee without bonus)
    public async Task SaveAsync(Guid publicId, SaveBonusSheetDto dto, long userId)
    {
        HrBonusSheets sheet = await FindAsync(publicId, true);

        if (sheet.Status != Draft)
        {
            throw new InvalidOperationException($"{sheet.Code} is {sheet.Status} : only a Draft sheet is changed.");
        }

        List<HrBonusSheetLines> lines = await Lines.Where(x => x.BonusSheetId == sheet.BonusSheetId).ToListAsync();

        foreach (SaveBonusLineDto row in dto?.Lines ?? new List<SaveBonusLineDto>())
        {
            HrBonusSheetLines? line = lines.FirstOrDefault(x => x.BonusSheetLineId == row.BonusSheetLineId);

            if (line == null)
            {
                continue;
            }

            if (row.Amount < 0)
            {
                throw new InvalidOperationException($"{line.EmployeeCode} {line.EmployeeName} : the amount cannot be negative.");
            }

            line.Amount = PayrollExtras.Whole(row.Amount);
        }

        sheet.EmployeeCount = lines.Count(x => x.Amount > 0);
        sheet.TotalAmount = lines.Sum(x => x.Amount);
        sheet.ModifiedBy = userId;
        sheet.ModifiedDate = DateTime.UtcNow;

        PayrollExtras.AddHistory(_context, HistoryEntity, sheet.BonusSheetId, "Update", "Bonus Sheet Updated", $"{sheet.Code} : {sheet.EmployeeCount} employee(s), Tk {PayrollExtras.Money(sheet.TotalAmount)}.", userId);

        await _context.SaveChangesAsync();
    }

    public async Task PostAsync(Guid publicId, long userId)
    {
        HrBonusSheets sheet = await FindAsync(publicId, true);

        if (sheet.Status != Draft)
        {
            throw new InvalidOperationException($"{sheet.Code} is {sheet.Status} already.");
        }

        decimal total =
            await Lines.AsNoTracking().Where(x => x.BonusSheetId == sheet.BonusSheetId).SumAsync(x => (decimal?)x.Amount) ?? 0;

        if (total <= 0)
        {
            throw new InvalidOperationException($"{sheet.Code} has nothing to post.");
        }

        DateOnly today = HrCalendar.Today();

        await using var transaction = await _context.Database.BeginTransactionAsync();

        JournalVoucherSavedDto voucher =
            await _journalVouchers.CreatePostedAsync(
                new CreateJournalVoucherDto
                {
                    VoucherDate = HrCalendar.Day(sheet.BonusDate > today ? today : sheet.BonusDate),
                    BranchId = sheet.BranchId,
                    Narration = $"Festival bonus {sheet.Title} : {sheet.EmployeeCount} employee(s), Tk {PayrollExtras.Money(total)} | {sheet.Code}",
                    Lines = PayrollExtras.Pair(_context, "PAYROLL-BONUS-EXPENSE", "PAYROLL-BONUS-PAYABLE", total, $"Festival bonus {sheet.Title} ({sheet.Code})")
                },
                sheet.Code,
                userId);

        sheet.Status = Posted;
        sheet.TotalAmount = total;
        sheet.PostedBy = userId;
        sheet.PostedDate = DateTime.UtcNow;
        sheet.JournalVoucherId = voucher.JournalVoucherId;
        sheet.JournalVoucherNo = PayrollExtras.Short(voucher.VoucherNo);
        sheet.ModifiedBy = userId;
        sheet.ModifiedDate = DateTime.UtcNow;

        PayrollExtras.AddHistory(_context, HistoryEntity, sheet.BonusSheetId, "Post", "Bonus Sheet Posted", $"{sheet.Code} : {sheet.Title}, Tk {PayrollExtras.Money(total)}. Journal Voucher {sheet.JournalVoucherNo}.", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    public async Task UnpostAsync(Guid publicId, SalarySheetReasonDto dto, long userId)
    {
        HrBonusSheets sheet = await FindAsync(publicId, true);

        if (sheet.Status != Posted)
        {
            throw new InvalidOperationException($"{sheet.Code} is not posted.");
        }

        string reason = (dto?.Reason ?? string.Empty).Trim();

        if (reason.Length == 0 || reason.Length > 300)
        {
            throw new InvalidOperationException("Write why the bonus sheet is unposted (300 characters at most).");
        }

        if (await HrPaymentsRepository.AnyAsync(_context, new[] { HrPaymentsRepository.Bonus }, sheet.BonusSheetId))
        {
            throw new InvalidOperationException($"{sheet.Code} has payments on Payroll Payments : cancel them first.");
        }

        string voucherNo = sheet.JournalVoucherNo;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (sheet.JournalVoucherId != null)
        {
            await _journalVouchers.CancelAsync(
                sheet.JournalVoucherId.Value,
                new CancelJournalVoucherDto { CancelDate = HrCalendar.Day(HrCalendar.Today()), Reason = $"{sheet.Code} unposted : {reason}" },
                userId);
        }

        sheet.Status = Draft;
        sheet.PostedBy = null;
        sheet.PostedDate = null;
        sheet.JournalVoucherId = null;
        sheet.JournalVoucherNo = string.Empty;
        sheet.ModifiedBy = userId;
        sheet.ModifiedDate = DateTime.UtcNow;

        PayrollExtras.AddHistory(_context, HistoryEntity, sheet.BonusSheetId, "Cancel", "Bonus Sheet Unposted", $"{sheet.Code} : Journal Voucher {voucherNo} cancelled. Reason : {reason}", userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    public async Task DeleteAsync(Guid publicId, long userId)
    {
        HrBonusSheets sheet = await FindAsync(publicId, true);

        if (sheet.Status != Draft)
        {
            throw new InvalidOperationException($"{sheet.Code} is {sheet.Status} : only a Draft sheet is deleted. Unpost it first.");
        }

        sheet.IsDeleted = true;
        sheet.DeletedBy = userId;
        sheet.DeletedDate = DateTime.UtcNow;

        PayrollExtras.AddHistory(_context, HistoryEntity, sheet.BonusSheetId, "Delete", "Bonus Sheet Deleted", $"{sheet.Code} : {sheet.Title}.", userId);

        await _context.SaveChangesAsync();
    }
}
