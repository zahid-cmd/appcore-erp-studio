//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.HumanResourceManangement.PayrollManagement;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;
using AppCore.Domain.Entities.HumanResourceManangement.PayrollManagement;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.Repositories.HumanResourceManangement.AttendanceManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.HumanResourceManangement.PayrollManagement;


//===============================================================
// Salary Advances Repository (hand-written page, 2026-11-13;
// NEVER run Code Sync for it)
//
//   Code ADV-0001 (deleted rows count, never reused).
//   An advance / loan is recovered by its installment from each
//   month's salary, starting with the start month, until the
//   balance is nil (the last installment is the balance).
//   Recovered = what salary sheets have taken (deleted sheets do
//   not count). Closed stops the recovery and leaves the balance.
//   This page keeps the record only : the money is paid out by a
//   Payment Voucher (debit the Staff Advance ledger); its number
//   can be noted here.
//   Once a salary sheet has taken from it, the employee cannot
//   change, the amount cannot go below what was recovered and the
//   advance cannot be deleted.
//===============================================================

public class SalaryAdvancesRepository
    : ISalaryAdvancesRepository
{
    private const string HistoryModule = "Human Resource";

    public const string HistoryEntity = "HrSalaryAdvances";

    private static readonly string[] AdvanceTypes = { "Advance", "Loan" };

    private readonly AppDbContext _context;

    public SalaryAdvancesRepository(
        AppDbContext context)
    {
        _context = context;
    }

    private DbSet<HrSalaryAdvances> Advances => _context.Set<HrSalaryAdvances>();


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

    private static string NextCode(IEnumerable<string> codes)
    {
        int highest = 0;

        foreach (string code in codes)
        {
            string value = (code ?? string.Empty).Trim();

            if (value.StartsWith("ADV-", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(value.Substring(4), out int number)
                && number > highest)
            {
                highest = number;
            }
        }

        return $"ADV-{highest + 1:D4}";
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

    private async Task<HrSalaryAdvances> FindAsync(Guid publicId)
    {
        return await Advances.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The salary advance was not found.");
    }

    // What live salary sheets have taken, by advance
    public static async Task<Dictionary<long, decimal>> RecoveredAsync(AppDbContext context, List<long>? advanceIds = null)
    {
        var rows =
            await (
                from r in context.Set<HrAdvanceRecoveries>().AsNoTracking()
                join s in context.Set<HrSalarySheets>().AsNoTracking() on r.SalarySheetId equals s.SalarySheetId
                where !s.IsDeleted && (advanceIds == null || advanceIds.Contains(r.AdvanceId))
                group r by r.AdvanceId into g
                select new { AdvanceId = g.Key, Amount = g.Sum(x => x.Amount) })
            .ToListAsync();

        return rows.ToDictionary(x => x.AdvanceId, x => x.Amount);
    }

    private async Task<decimal> RecoveredAsync(long advanceId)
    {
        Dictionary<long, decimal> all = await RecoveredAsync(_context, new List<long> { advanceId });

        return all.TryGetValue(advanceId, out decimal amount) ? amount : 0;
    }

    private async Task<List<SalaryAdvanceDto>> ReadAsync(IQueryable<HrSalaryAdvances> source)
    {
        var rows =
            await (
                from a in source
                join e in _context.Set<HrEmployees>().AsNoTracking() on a.EmployeeId equals e.EmployeeId
                join g in _context.Set<Designation>().AsNoTracking() on e.DesignationId equals g.DesignationId into gj
                from g in gj.DefaultIfEmpty()
                join b in _context.Set<Branches>().AsNoTracking() on e.BranchId equals b.BranchId into bj
                from b in bj.DefaultIfEmpty()
                orderby a.Code descending
                select new
                {
                    A = a,
                    EmployeeCode = e.Code,
                    EmployeeName = e.FullName,
                    DesignationName = g != null ? g.DesignationName : string.Empty,
                    BranchName = b != null ? b.BranchName : string.Empty
                })
            .ToListAsync();

        Dictionary<long, decimal> recovered =
            await RecoveredAsync(_context, rows.Select(x => x.A.AdvanceId).ToList());

        return rows
            .Select(x =>
            {
                decimal taken = recovered.TryGetValue(x.A.AdvanceId, out decimal amount) ? amount : 0;
                decimal balance = Math.Max(0, x.A.Amount - taken);

                return new SalaryAdvanceDto
                {
                    PublicId = x.A.PublicId,
                    Code = x.A.Code,
                    EmployeeId = x.A.EmployeeId,
                    EmployeeCode = x.EmployeeCode,
                    EmployeeName = x.EmployeeName,
                    DesignationName = x.DesignationName,
                    BranchName = x.BranchName,
                    AdvanceType = x.A.AdvanceType,
                    AdvanceDate = HrCalendar.Day(x.A.AdvanceDate),
                    Amount = x.A.Amount,
                    InstallmentAmount = x.A.InstallmentAmount,
                    StartYear = x.A.StartYear,
                    StartMonth = x.A.StartMonth,
                    Reason = x.A.Reason,
                    VoucherNo = x.A.VoucherNo,
                    IsClosed = x.A.IsClosed,
                    Recovered = taken,
                    Balance = balance,
                    Status = balance <= 0 ? "Recovered" : x.A.IsClosed ? "Closed" : "Running"
                };
            })
            .ToList();
    }


    //===========================================================
    // Read
    //===========================================================

    public Task<List<SalaryAdvanceDto>> GetListAsync() =>
        ReadAsync(Advances.AsNoTracking().Where(x => !x.IsDeleted));

    public async Task<SalaryAdvanceDto> GetAsync(Guid publicId)
    {
        return (await ReadAsync(Advances.AsNoTracking().Where(x => x.PublicId == publicId && !x.IsDeleted))).FirstOrDefault()
            ?? throw new KeyNotFoundException("The salary advance was not found.");
    }

    public async Task<SalaryAdvanceDefaultsDto> GetDefaultsAsync()
    {
        return new SalaryAdvanceDefaultsDto
        {
            NextCode = NextCode(await Advances.AsNoTracking().Select(x => x.Code).ToListAsync()),

            Employees =
                await (
                    from e in _context.Set<HrEmployees>().AsNoTracking()
                    where !e.IsDeleted && e.IsActive
                    join g in _context.Set<Designation>().AsNoTracking() on e.DesignationId equals g.DesignationId into gj
                    from g in gj.DefaultIfEmpty()
                    orderby e.Code
                    select new PayrollEmployeeDto
                    {
                        Id = e.EmployeeId,
                        Code = e.Code,
                        Name = e.FullName,
                        DesignationName = g != null ? g.DesignationName : string.Empty,
                        GrossSalary = e.GrossSalary
                    })
                .ToListAsync()
        };
    }


    //===========================================================
    // Check + write
    //===========================================================

    // Checks the form and copies it to the advance
    private async Task ApplyAsync(HrSalaryAdvances entity, SalaryAdvanceDto dto, decimal recovered)
    {
        var employee =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => x.EmployeeId == dto.EmployeeId && !x.IsDeleted)
                .Select(x => new { x.EmployeeId, x.FullName, x.JoiningDate })
                .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("Pick the employee.");

        if (recovered > 0 && entity.EmployeeId != employee.EmployeeId)
        {
            throw new InvalidOperationException("A salary sheet has already taken from this advance : the employee cannot be changed.");
        }

        string type =
            AdvanceTypes.FirstOrDefault(x => string.Equals(x, Clean(dto.AdvanceType), StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidOperationException("Pick the type (Advance or Loan).");

        DateOnly date =
            HrCalendar.ParseDay(dto.AdvanceDate)
            ?? throw new InvalidOperationException("Date is required.");

        if (date > HrCalendar.Today())
        {
            throw new InvalidOperationException("The date cannot be in the future.");
        }

        if (date < employee.JoiningDate)
        {
            throw new InvalidOperationException($"{employee.FullName} joined on {HrCalendar.Day(employee.JoiningDate)} : the date is before that.");
        }

        decimal amount = Math.Round(dto.Amount, 2);

        if (amount <= 0)
        {
            throw new InvalidOperationException("Amount must be more than 0.");
        }

        if (amount < recovered)
        {
            throw new InvalidOperationException($"Tk {recovered:#,0.##} has already been recovered from salary : the amount cannot be less than that.");
        }

        decimal installment = Math.Round(dto.InstallmentAmount, 2);

        if (installment <= 0)
        {
            throw new InvalidOperationException("Monthly Installment must be more than 0.");
        }

        if (installment > amount)
        {
            throw new InvalidOperationException("Monthly Installment cannot be more than the amount.");
        }

        if (dto.StartYear < 2000 || dto.StartYear > 2100 || dto.StartMonth < 1 || dto.StartMonth > 12)
        {
            throw new InvalidOperationException("Pick the first salary month the installment is taken from.");
        }

        if (dto.StartYear * 12 + dto.StartMonth < date.Year * 12 + date.Month)
        {
            throw new InvalidOperationException("Recovery cannot start before the month the advance was given.");
        }

        entity.EmployeeId = employee.EmployeeId;
        entity.AdvanceType = type;
        entity.AdvanceDate = date;
        entity.Amount = amount;
        entity.InstallmentAmount = installment;
        entity.StartYear = dto.StartYear;
        entity.StartMonth = dto.StartMonth;
        entity.Reason = Limited(dto.Reason, 500, "Reason");
        entity.VoucherNo = Limited(dto.VoucherNo, 30, "Payment Voucher No");
        entity.IsClosed = dto.IsClosed;
    }

    private async Task<string> DescribeAsync(HrSalaryAdvances a)
    {
        string employee =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => x.EmployeeId == a.EmployeeId)
                .Select(x => x.Code + " " + x.FullName)
                .FirstOrDefaultAsync() ?? string.Empty;

        return $"{a.Code} : {employee}, {a.AdvanceType} Tk {a.Amount:#,0.##} on {HrCalendar.Day(a.AdvanceDate)}, Tk {a.InstallmentAmount:#,0.##} a month from {a.StartMonth:D2}/{a.StartYear}{(a.IsClosed ? ", closed" : string.Empty)}.";
    }

    public async Task<SalaryAdvanceDto> CreateAsync(SalaryAdvanceDto dto, long userId)
    {
        HrSalaryAdvances entity = new();

        await ApplyAsync(entity, dto, 0);

        await using var transaction = await _context.Database.BeginTransactionAsync();

        entity.Code = NextCode(await Advances.AsNoTracking().Select(x => x.Code).ToListAsync());
        entity.IsDeleted = false;
        entity.CreatedBy = userId;
        entity.CreatedDate = DateTime.UtcNow;

        Advances.Add(entity);

        await _context.SaveChangesAsync();

        AddHistory(entity.AdvanceId, "Create", "Salary Advance Created", await DescribeAsync(entity), userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetAsync(entity.PublicId);
    }

    public async Task UpdateAsync(Guid publicId, SalaryAdvanceDto dto, long userId)
    {
        HrSalaryAdvances entity = await FindAsync(publicId);

        await ApplyAsync(entity, dto, await RecoveredAsync(entity.AdvanceId));

        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.AdvanceId, "Update", "Salary Advance Updated", await DescribeAsync(entity), userId);

        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Guid publicId, long userId)
    {
        HrSalaryAdvances entity = await FindAsync(publicId);

        bool used =
            await (
                from r in _context.Set<HrAdvanceRecoveries>().AsNoTracking()
                join s in _context.Set<HrSalarySheets>().AsNoTracking() on r.SalarySheetId equals s.SalarySheetId
                where r.AdvanceId == entity.AdvanceId && !s.IsDeleted
                select r.AdvanceRecoveryId)
            .AnyAsync();

        if (used)
        {
            throw new InvalidOperationException($"{entity.Code} is on a salary sheet : it cannot be deleted. Close it to stop the recovery.");
        }

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(entity.AdvanceId, "Delete", "Salary Advance Deleted", await DescribeAsync(entity), userId);

        await _context.SaveChangesAsync();
    }

    public async Task<string?> RestoreAsync(long userId)
    {
        HrSalaryAdvances? entity =
            await Advances.Where(x => x.IsDeleted).OrderByDescending(x => x.DeletedDate).FirstOrDefaultAsync();

        if (entity == null)
        {
            return null;
        }

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.AdvanceId, "Restore", "Salary Advance Restored", await DescribeAsync(entity), userId);

        await _context.SaveChangesAsync();

        return entity.Code;
    }
}
