//===============================================================
// Namespaces
//===============================================================

using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using AppCore.Application.HumanResourceManangement.HumanResourceSetup;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.HumanResourceManangement.EmployeeManagement;
using AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup;
using AppCore.Domain.Entities.HumanResourceManangement.PayrollManagement;
using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Leave Encashment Policies Repository (hand-written page,
// 2026-11-14; NEVER run Code Sync for it; tables made by
// HumanResource_EncashmentPolicies_Engine.sql)
//
// The rule of a leave encashment :
//
//   LeaveTypes        the leave types that can be encashed
//   RateBase          Basic / Gross : the salary of the day rate
//   MonthDays         day rate = salary / this
//   ConfirmedOnly     only confirmed employees
//   MinServiceMonths  whole months of service needed
//   KeepDays          days that must stay in the balance
//   MaxDaysPerYear    the most days of an employee a leave year,
//                     (0 = no limit)
//   AfterYearEnd      only a leave year that has ended
//
// The leave year is the financial year. An encashment depends on
// the leave balance and is paid on a year basis : once a leave
// year for a leave type, for the days the
// employee has left of it (less KeepDays, within MaxDaysPerYear).
//
// Policies are named by the page : "Encashment Policy - 1" for
// LEP-0001 ... One policy is the Default : it applies to every
// employee whose profile names no other policy. An encashment
// keeps what the policy said on its day.
//===============================================================

public class LeaveEncashPoliciesRepository
    : ILeaveEncashPoliciesRepository
{
    private const string HistoryModule = "Human Resource";

    public const string HistoryEntity = "HrLeaveEncashPolicies";

    private readonly AppDbContext _context;

    public LeaveEncashPoliciesRepository(
        AppDbContext context)
    {
        _context = context;
    }

    private DbSet<HrLeaveEncashPolicies> Policies => _context.Set<HrLeaveEncashPolicies>();

    private DbSet<HrLeaveEncashPolicyTypes> PolicyTypes => _context.Set<HrLeaveEncashPolicyTypes>();


    //===========================================================
    // The leave that can be encashed at all (also used by Leave
    // Encashments) : a paid leave with days a year, for everyone.
    // Leave without pay and maternity leave are never encashed.
    //===========================================================

    public static readonly Expression<Func<HrLeaveTypes, bool>> CanBeEncashed =
        x => !x.IsDeleted
            && x.IsActive
            && x.IsPaid
            && x.DaysPerYear > 0
            && x.AppliesTo == "All"
            && !x.Name.ToLower().Contains("matern");


    //===========================================================
    // The policy of an employee (also used by Leave Encashments)
    //===========================================================

    // The policy the profile names when it is there and Active,
    // otherwise the Default (null : there is none)
    public static async Task<HrLeaveEncashPolicies?> ForEmployeeAsync(AppDbContext context, long? policyId)
    {
        List<HrLeaveEncashPolicies> policies =
            await context.Set<HrLeaveEncashPolicies>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive && (x.IsDefault || x.LeaveEncashPolicyId == policyId))
                .ToListAsync();

        return policies.FirstOrDefault(x => x.LeaveEncashPolicyId == policyId)
            ?? policies.FirstOrDefault(x => x.IsDefault);
    }


    //===========================================================
    // Helpers
    //===========================================================

    private static string NextCode(IEnumerable<string> codes)
    {
        const string prefix = "LEP-";

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

    // LEP-0003 : Encashment Policy - 3
    private static string NameOf(string code) =>
        $"Encashment Policy - {(int.TryParse(code.Substring(code.IndexOf('-') + 1), out int number) ? number : 0)}";

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

    private async Task<HrLeaveEncashPolicies> FindAsync(Guid publicId) =>
        await Policies.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
        ?? throw new KeyNotFoundException("The leave encashment policy was not found.");

    private async Task<List<LeaveEncashPolicyDto>> ReadAsync(IQueryable<HrLeaveEncashPolicies> source)
    {
        List<HrLeaveEncashPolicies> rows =
            await source.OrderBy(x => x.Code).ToListAsync();

        List<long> ids = rows.Select(x => x.LeaveEncashPolicyId).ToList();

        var types =
            await (
                from x in PolicyTypes.AsNoTracking()
                where ids.Contains(x.LeaveEncashPolicyId)
                join t in _context.Set<HrLeaveTypes>().AsNoTracking().Where(CanBeEncashed) on x.LeaveTypeId equals t.LeaveTypeId
                orderby t.Code
                select new { x.LeaveEncashPolicyId, x.LeaveTypeId, t.Name })
            .ToListAsync();

        var employees =
            await _context.Set<HrEmployees>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.LeaveEncashPolicyId != null && ids.Contains(x.LeaveEncashPolicyId.Value))
                .GroupBy(x => x.LeaveEncashPolicyId)
                .Select(g => new { LeaveEncashPolicyId = g.Key, Count = g.Count() })
                .ToListAsync();

        var encashments =
            await _context.Set<HrLeaveEncashments>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.LeaveEncashPolicyId != null && ids.Contains(x.LeaveEncashPolicyId.Value))
                .GroupBy(x => x.LeaveEncashPolicyId)
                .Select(g => new { LeaveEncashPolicyId = g.Key, Count = g.Count() })
                .ToListAsync();

        return rows
            .Select(p => new LeaveEncashPolicyDto
            {
                LeaveEncashPolicyId = p.LeaveEncashPolicyId,
                PublicId = p.PublicId,
                Code = p.Code,
                Name = p.Name,
                RateBase = p.RateBase,
                MonthDays = p.MonthDays,
                ConfirmedOnly = p.ConfirmedOnly,
                MinServiceMonths = p.MinServiceMonths,
                MaxDaysPerYear = p.MaxDaysPerYear,
                KeepDays = p.KeepDays,
                AfterYearEnd = p.AfterYearEnd,
                IsDefault = p.IsDefault,
                Remarks = p.Remarks,
                IsActive = p.IsActive,
                LeaveTypeIds = types.Where(t => t.LeaveEncashPolicyId == p.LeaveEncashPolicyId).Select(t => t.LeaveTypeId).ToList(),
                LeaveTypeNames = string.Join(", ", types.Where(t => t.LeaveEncashPolicyId == p.LeaveEncashPolicyId).Select(t => t.Name)),
                EmployeeCount = employees.FirstOrDefault(e => e.LeaveEncashPolicyId == p.LeaveEncashPolicyId)?.Count ?? 0,
                EncashmentCount = encashments.FirstOrDefault(e => e.LeaveEncashPolicyId == p.LeaveEncashPolicyId)?.Count ?? 0
            })
            .ToList();
    }


    //===========================================================
    // Read
    //===========================================================

    public Task<List<LeaveEncashPolicyDto>> GetListAsync() =>
        ReadAsync(Policies.AsNoTracking().Where(x => !x.IsDeleted));

    public async Task<LeaveEncashPolicyDto> GetAsync(Guid publicId) =>
        (await ReadAsync(Policies.AsNoTracking().Where(x => x.PublicId == publicId && !x.IsDeleted))).FirstOrDefault()
        ?? throw new KeyNotFoundException("The leave encashment policy was not found.");

    public async Task<LeaveEncashPolicyDefaultsDto> GetDefaultsAsync()
    {
        string code = NextCode(await Policies.AsNoTracking().Select(x => x.Code).ToListAsync());

        return new LeaveEncashPolicyDefaultsDto
        {
            NextCode = code,
            NextName = NameOf(code),
            // the first policy is the Default
            IsFirst = !await Policies.AsNoTracking().AnyAsync(x => !x.IsDeleted),
            LeaveTypes =
                await _context.Set<HrLeaveTypes>().AsNoTracking()
                    .Where(CanBeEncashed)
                    .OrderBy(x => x.Code)
                    .Select(x => new LeaveEncashPolicyLeaveTypeDto { Id = x.LeaveTypeId, Name = x.Name, DaysPerYear = x.DaysPerYear })
                    .ToListAsync()
        };
    }


    //===========================================================
    // Write
    //===========================================================

    // Checks the DTO; gives the leave types of the policy back
    private async Task<List<long>> ApplyAsync(HrLeaveEncashPolicies entity, LeaveEncashPolicyDto dto)
    {
        string remarks = (dto.Remarks ?? string.Empty).Trim();

        if (remarks.Length > 500)
        {
            throw new InvalidOperationException("Remarks : 500 characters at most.");
        }

        if (dto.MonthDays < 1 || dto.MonthDays > 31)
        {
            throw new InvalidOperationException("Days of the month (for the day rate) must be 1 to 31.");
        }

        if (dto.MinServiceMonths < 0 || dto.MinServiceMonths > 600)
        {
            throw new InvalidOperationException("Minimum service must be 0 to 600 months.");
        }

        decimal keep = Math.Round(dto.KeepDays, 2);
        decimal most = Math.Round(dto.MaxDaysPerYear, 2);

        if (keep < 0 || keep > 366 || most < 0 || most > 366)
        {
            throw new InvalidOperationException("Days to keep and the maximum encashable days a year must be 0 to 366.");
        }

        List<long> asked = (dto.LeaveTypeIds ?? new List<long>()).Distinct().ToList();

        List<long> typeIds =
            await _context.Set<HrLeaveTypes>().AsNoTracking()
                .Where(CanBeEncashed)
                .Where(x => asked.Contains(x.LeaveTypeId))
                .Select(x => x.LeaveTypeId)
                .ToListAsync();

        if (typeIds.Count == 0)
        {
            throw new InvalidOperationException("Tick at least one leave type that can be encashed.");
        }

        entity.RateBase = string.Equals(dto.RateBase, "Gross", StringComparison.OrdinalIgnoreCase) ? "Gross" : "Basic";
        entity.MonthDays = dto.MonthDays;
        entity.ConfirmedOnly = dto.ConfirmedOnly;
        entity.MinServiceMonths = dto.MinServiceMonths;
        entity.KeepDays = keep;
        entity.MaxDaysPerYear = most;
        entity.AfterYearEnd = dto.AfterYearEnd;
        entity.IsDefault = dto.IsDefault && dto.IsActive;
        entity.IsActive = dto.IsActive;
        entity.Remarks = remarks;

        return typeIds;
    }

    private async Task<string> DescribedAsync(HrLeaveEncashPolicies p, List<long> typeIds)
    {
        List<string> names =
            await _context.Set<HrLeaveTypes>().AsNoTracking()
                .Where(x => typeIds.Contains(x.LeaveTypeId))
                .OrderBy(x => x.Code)
                .Select(x => x.Name)
                .ToListAsync();

        return $"{p.Code} {p.Name} : {string.Join(", ", names)}; on {p.RateBase} / {p.MonthDays}"
            + (p.ConfirmedOnly ? ", confirmed employees only" : string.Empty)
            + (p.MinServiceMonths > 0 ? $", {p.MinServiceMonths} month(s) of service" : string.Empty)
            + (p.KeepDays > 0 ? $", {p.KeepDays:0.##} day(s) stay in the balance" : string.Empty)
            + (p.MaxDaysPerYear > 0 ? $", {p.MaxDaysPerYear:0.##} day(s) a year at most in total" : string.Empty)
            + (p.AfterYearEnd ? ", after the leave year ends" : string.Empty)
            + "."
            + (p.IsDefault ? " Default." : string.Empty)
            + (p.IsActive ? string.Empty : " Inactive.");
    }

    private async Task ClearOtherDefaultsAsync(long selfId, long userId)
    {
        List<HrLeaveEncashPolicies> others =
            await Policies.Where(x => !x.IsDeleted && x.IsDefault && x.LeaveEncashPolicyId != selfId).ToListAsync();

        foreach (HrLeaveEncashPolicies other in others)
        {
            other.IsDefault = false;
            other.ModifiedBy = userId;
            other.ModifiedDate = DateTime.UtcNow;

            AddHistory(other.LeaveEncashPolicyId, "Update", "Leave Encashment Policy Default Moved", $"{other.Code} {other.Name} : no longer the Default.", userId);
        }

        if (others.Count > 0)
        {
            await _context.SaveChangesAsync();
        }
    }

    private void WriteTypes(long policyId, List<long> typeIds)
    {
        foreach (long typeId in typeIds)
        {
            PolicyTypes.Add(new HrLeaveEncashPolicyTypes { LeaveEncashPolicyId = policyId, LeaveTypeId = typeId });
        }
    }

    public async Task<LeaveEncashPolicyDto> CreateAsync(LeaveEncashPolicyDto dto, long userId)
    {
        HrLeaveEncashPolicies entity = new();

        List<long> typeIds = await ApplyAsync(entity, dto);

        bool isDefault = entity.IsDefault;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (isDefault)
        {
            await ClearOtherDefaultsAsync(0, userId);
        }

        entity.Code = NextCode(await Policies.AsNoTracking().Select(x => x.Code).ToListAsync());
        entity.Name = NameOf(entity.Code);
        entity.IsDeleted = false;
        entity.CreatedBy = userId;
        entity.CreatedDate = DateTime.UtcNow;

        Policies.Add(entity);

        await _context.SaveChangesAsync();

        WriteTypes(entity.LeaveEncashPolicyId, typeIds);

        AddHistory(entity.LeaveEncashPolicyId, "Create", "Leave Encashment Policy Created", await DescribedAsync(entity, typeIds), userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetAsync(entity.PublicId);
    }

    public async Task UpdateAsync(Guid publicId, LeaveEncashPolicyDto dto, long userId)
    {
        HrLeaveEncashPolicies entity = await FindAsync(publicId);

        // the Default flag waits : the other Default is cleared first
        bool wasDefault = entity.IsDefault;

        List<long> typeIds = await ApplyAsync(entity, dto);

        bool isDefault = entity.IsDefault;

        entity.IsDefault = wasDefault && isDefault;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (isDefault)
        {
            await ClearOtherDefaultsAsync(entity.LeaveEncashPolicyId, userId);
        }

        entity.IsDefault = isDefault;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        PolicyTypes.RemoveRange(await PolicyTypes.Where(x => x.LeaveEncashPolicyId == entity.LeaveEncashPolicyId).ToListAsync());

        WriteTypes(entity.LeaveEncashPolicyId, typeIds);

        AddHistory(entity.LeaveEncashPolicyId, "Update", "Leave Encashment Policy Updated", await DescribedAsync(entity, typeIds), userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    public async Task DeleteAsync(Guid publicId, long userId)
    {
        HrLeaveEncashPolicies entity = await FindAsync(publicId);

        int used =
            await _context.Set<HrEmployees>().AsNoTracking()
                .CountAsync(x => !x.IsDeleted && x.LeaveEncashPolicyId == entity.LeaveEncashPolicyId);

        if (used > 0)
        {
            throw new InvalidOperationException($"{entity.Code} {entity.Name} is on {used} Employee Profile(s) : it cannot be deleted. Make it Inactive to stop using it (those employees then follow the Default).");
        }

        entity.IsDeleted = true;
        entity.IsDefault = false;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(entity.LeaveEncashPolicyId, "Delete", "Leave Encashment Policy Deleted", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();
    }

    public async Task<string?> RestoreAsync(long userId)
    {
        HrLeaveEncashPolicies? entity =
            await Policies.Where(x => x.IsDeleted).OrderByDescending(x => x.DeletedDate).FirstOrDefaultAsync();

        if (entity == null)
        {
            return null;
        }

        // comes back as a normal (not Default) policy
        entity.IsDeleted = false;
        entity.IsDefault = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.LeaveEncashPolicyId, "Restore", "Leave Encashment Policy Restored", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();

        return entity.Code;
    }
}
