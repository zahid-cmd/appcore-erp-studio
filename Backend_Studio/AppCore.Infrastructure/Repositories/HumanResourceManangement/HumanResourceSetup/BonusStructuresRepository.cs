//===============================================================
// Namespaces
//===============================================================

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
// Bonus Structures Repository (hand-written page, 2026-11-14;
// NEVER run Code Sync for it; tables made by
// HumanResource_BonusStructures_Engine.sql)
//
// How a festival bonus is worked out, and who gets it by the
// length of employment :
//
//   RateBase       Basic / Gross : the salary the bonus is a
//                  percent of
//   ServiceFrom    Joining / Confirmation : where the months of
//                  service are counted from (an employee without
//                  a confirmation date has no service when it is
//                  Confirmation)
//   ConfirmedOnly  only employees with a confirmation date on or
//                  before the bonus date
//   Slabs          from so many whole months of service, so many
//                  percent. The slab with the highest FromMonths
//                  the service reaches is the one. Below the
//                  first slab : no bonus.
//
//   bonus = salary x the slab's percent / 100      (whole taka)
//
// Structures are named by the page : "Bonus Structure - 1" for
// BNS-0001 ... One structure is the Default : it applies to every
// employee whose profile names no other structure. A bonus sheet
// keeps what the structures said on its day, so changing a
// structure never changes a sheet.
//===============================================================

public class BonusStructuresRepository
    : IBonusStructuresRepository
{
    private const string HistoryModule = "Human Resource";

    public const string HistoryEntity = "HrBonusStructures";

    private readonly AppDbContext _context;

    public BonusStructuresRepository(
        AppDbContext context)
    {
        _context = context;
    }

    private DbSet<HrBonusStructures> Structures => _context.Set<HrBonusStructures>();

    private DbSet<HrBonusStructureSlabs> Slabs => _context.Set<HrBonusStructureSlabs>();


    //===========================================================
    // The formula (also used by Festival Bonus)
    //===========================================================

    // Whole months from a date to another (0 when it is later)
    public static int Months(DateOnly from, DateOnly to)
    {
        if (from > to)
        {
            return 0;
        }

        return (to.Year - from.Year) * 12 + to.Month - from.Month - (to.Day < from.Day ? 1 : 0);
    }

    // The percent of the slab the service falls in (0 : no bonus)
    public static decimal PercentFor(IEnumerable<HrBonusStructureSlabs> slabs, int serviceMonths) =>
        slabs
            .Where(x => x.FromMonths <= serviceMonths)
            .OrderByDescending(x => x.FromMonths)
            .Select(x => x.BonusPercent)
            .FirstOrDefault();


    //===========================================================
    // Helpers
    //===========================================================

    private static string NextCode(IEnumerable<string> codes)
    {
        const string prefix = "BNS-";

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

    // BNS-0003 : Bonus Structure - 3
    private static string NameOf(string code) =>
        $"Bonus Structure - {(int.TryParse(code.Substring(code.IndexOf('-') + 1), out int number) ? number : 0)}";

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

    private async Task<HrBonusStructures> FindAsync(Guid publicId) =>
        await Structures.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
        ?? throw new KeyNotFoundException("The bonus structure was not found.");

    private static string SlabText(IEnumerable<BonusSlabDto> slabs) =>
        string.Join(", ", slabs.OrderBy(x => x.FromMonths).Select(x => $"{x.FromMonths} month(s) : {x.BonusPercent:0.###} %"));

    private async Task<List<BonusStructureDto>> ReadAsync(IQueryable<HrBonusStructures> source)
    {
        List<HrBonusStructures> rows =
            await source.OrderBy(x => x.Code).ToListAsync();

        List<long> ids = rows.Select(x => x.BonusStructureId).ToList();

        List<HrBonusStructureSlabs> slabs =
            await Slabs.AsNoTracking().Where(x => ids.Contains(x.BonusStructureId)).OrderBy(x => x.FromMonths).ToListAsync();

        var used =
            await _context.Set<HrBonusSheets>().AsNoTracking()
                .Where(x => !x.IsDeleted && x.BonusStructureId != null && ids.Contains(x.BonusStructureId.Value))
                .GroupBy(x => x.BonusStructureId)
                .Select(g => new { BonusStructureId = g.Key, Count = g.Count() })
                .ToListAsync();

        return rows
            .Select(s => new BonusStructureDto
            {
                BonusStructureId = s.BonusStructureId,
                PublicId = s.PublicId,
                Code = s.Code,
                Name = s.Name,
                RateBase = s.RateBase,
                ServiceFrom = s.ServiceFrom,
                ConfirmedOnly = s.ConfirmedOnly,
                IsDefault = s.IsDefault,
                Remarks = s.Remarks,
                IsActive = s.IsActive,
                SheetCount = used.FirstOrDefault(u => u.BonusStructureId == s.BonusStructureId)?.Count ?? 0,
                Slabs =
                    slabs
                        .Where(l => l.BonusStructureId == s.BonusStructureId)
                        .Select(l => new BonusSlabDto { FromMonths = l.FromMonths, BonusPercent = l.BonusPercent })
                        .ToList()
            })
            .ToList();
    }


    //===========================================================
    // Read
    //===========================================================

    public Task<List<BonusStructureDto>> GetListAsync() =>
        ReadAsync(Structures.AsNoTracking().Where(x => !x.IsDeleted));

    public async Task<BonusStructureDto> GetAsync(Guid publicId) =>
        (await ReadAsync(Structures.AsNoTracking().Where(x => x.PublicId == publicId && !x.IsDeleted))).FirstOrDefault()
        ?? throw new KeyNotFoundException("The bonus structure was not found.");

    public async Task<BonusStructureDefaultsDto> GetDefaultsAsync()
    {
        string code = NextCode(await Structures.AsNoTracking().Select(x => x.Code).ToListAsync());

        return new BonusStructureDefaultsDto
        {
            NextCode = code,
            NextName = NameOf(code),
            // the first structure is the Default
            IsFirst = !await Structures.AsNoTracking().AnyAsync(x => !x.IsDeleted)
        };
    }


    //===========================================================
    // Write
    //===========================================================

    // Checks the DTO; gives the clean slabs back
    private static List<BonusSlabDto> Apply(HrBonusStructures entity, BonusStructureDto dto)
    {
        string remarks = (dto.Remarks ?? string.Empty).Trim();

        if (remarks.Length > 500)
        {
            throw new InvalidOperationException("Remarks : 500 characters at most.");
        }

        List<BonusSlabDto> slabs =
            (dto.Slabs ?? new List<BonusSlabDto>())
                .Select(x => new BonusSlabDto { FromMonths = x.FromMonths, BonusPercent = Math.Round(x.BonusPercent, 3) })
                .OrderBy(x => x.FromMonths)
                .ToList();

        if (slabs.Count == 0)
        {
            throw new InvalidOperationException("Add at least one service slab : from how many months of service, and what percent.");
        }

        foreach (BonusSlabDto slab in slabs)
        {
            if (slab.FromMonths < 0 || slab.FromMonths > 600)
            {
                throw new InvalidOperationException("Months of service must be 0 to 600.");
            }

            if (slab.BonusPercent <= 0 || slab.BonusPercent > 1000)
            {
                throw new InvalidOperationException($"From {slab.FromMonths} month(s) : the percent must be more than 0 (and no more than 1000). Leave a service out of the slabs to give it no bonus.");
            }
        }

        if (slabs.Select(x => x.FromMonths).Distinct().Count() != slabs.Count)
        {
            throw new InvalidOperationException("Two slabs start at the same months of service.");
        }

        entity.RateBase = string.Equals(dto.RateBase, "Gross", StringComparison.OrdinalIgnoreCase) ? "Gross" : "Basic";
        entity.ServiceFrom = string.Equals(dto.ServiceFrom, "Confirmation", StringComparison.OrdinalIgnoreCase) ? "Confirmation" : "Joining";
        entity.ConfirmedOnly = dto.ConfirmedOnly;
        entity.IsDefault = dto.IsDefault && dto.IsActive;
        entity.IsActive = dto.IsActive;
        entity.Remarks = remarks;

        return slabs;
    }

    private static string Described(HrBonusStructures s, List<BonusSlabDto> slabs) =>
        $"{s.Code} {s.Name} : on {s.RateBase}, service from {s.ServiceFrom.ToLowerInvariant()}{(s.ConfirmedOnly ? ", confirmed employees only" : string.Empty)}; {SlabText(slabs)}.{(s.IsDefault ? " Default." : string.Empty)}{(s.IsActive ? string.Empty : " Inactive.")}";

    private async Task ClearOtherDefaultsAsync(long selfId, long userId)
    {
        List<HrBonusStructures> others =
            await Structures.Where(x => !x.IsDeleted && x.IsDefault && x.BonusStructureId != selfId).ToListAsync();

        foreach (HrBonusStructures other in others)
        {
            other.IsDefault = false;
            other.ModifiedBy = userId;
            other.ModifiedDate = DateTime.UtcNow;

            AddHistory(other.BonusStructureId, "Update", "Bonus Structure Default Moved", $"{other.Code} {other.Name} : no longer the Default.", userId);
        }

        if (others.Count > 0)
        {
            await _context.SaveChangesAsync();
        }
    }

    private void WriteSlabs(long structureId, List<BonusSlabDto> slabs)
    {
        foreach (BonusSlabDto slab in slabs)
        {
            Slabs.Add(new HrBonusStructureSlabs { BonusStructureId = structureId, FromMonths = slab.FromMonths, BonusPercent = slab.BonusPercent });
        }
    }

    public async Task<BonusStructureDto> CreateAsync(BonusStructureDto dto, long userId)
    {
        HrBonusStructures entity = new();

        List<BonusSlabDto> slabs = Apply(entity, dto);

        bool isDefault = entity.IsDefault;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (isDefault)
        {
            await ClearOtherDefaultsAsync(0, userId);
        }

        entity.Code = NextCode(await Structures.AsNoTracking().Select(x => x.Code).ToListAsync());
        entity.Name = NameOf(entity.Code);
        entity.IsDeleted = false;
        entity.CreatedBy = userId;
        entity.CreatedDate = DateTime.UtcNow;

        Structures.Add(entity);

        await _context.SaveChangesAsync();

        WriteSlabs(entity.BonusStructureId, slabs);

        AddHistory(entity.BonusStructureId, "Create", "Bonus Structure Created", Described(entity, slabs), userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return await GetAsync(entity.PublicId);
    }

    public async Task UpdateAsync(Guid publicId, BonusStructureDto dto, long userId)
    {
        HrBonusStructures entity = await FindAsync(publicId);

        // the Default flag waits : the other Default is cleared first
        bool wasDefault = entity.IsDefault;

        List<BonusSlabDto> slabs = Apply(entity, dto);

        bool isDefault = entity.IsDefault;

        entity.IsDefault = wasDefault && isDefault;

        await using var transaction = await _context.Database.BeginTransactionAsync();

        if (isDefault)
        {
            await ClearOtherDefaultsAsync(entity.BonusStructureId, userId);
        }

        entity.IsDefault = isDefault;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        Slabs.RemoveRange(await Slabs.Where(x => x.BonusStructureId == entity.BonusStructureId).ToListAsync());

        WriteSlabs(entity.BonusStructureId, slabs);

        AddHistory(entity.BonusStructureId, "Update", "Bonus Structure Updated", Described(entity, slabs), userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    public async Task DeleteAsync(Guid publicId, long userId)
    {
        HrBonusStructures entity = await FindAsync(publicId);

        int used =
            await _context.Set<HrBonusSheets>().AsNoTracking()
                .CountAsync(x => !x.IsDeleted && x.BonusStructureId == entity.BonusStructureId);

        if (used > 0)
        {
            throw new InvalidOperationException($"{entity.Code} {entity.Name} is on {used} bonus sheet(s) : it cannot be deleted. Make it Inactive to stop using it.");
        }

        int profiles =
            await _context.Set<HrEmployees>().AsNoTracking()
                .CountAsync(x => !x.IsDeleted && x.BonusStructureId == entity.BonusStructureId);

        if (profiles > 0)
        {
            throw new InvalidOperationException($"{entity.Code} {entity.Name} is on {profiles} Employee Profile(s) : it cannot be deleted. Make it Inactive to stop using it (those employees then follow the Default).");
        }

        entity.IsDeleted = true;
        entity.IsDefault = false;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        AddHistory(entity.BonusStructureId, "Delete", "Bonus Structure Deleted", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();
    }

    public async Task<string?> RestoreAsync(long userId)
    {
        HrBonusStructures? entity =
            await Structures.Where(x => x.IsDeleted).OrderByDescending(x => x.DeletedDate).FirstOrDefaultAsync();

        if (entity == null)
        {
            return null;
        }

        // comes back as a normal (not Default) structure
        entity.IsDeleted = false;
        entity.IsDefault = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = DateTime.UtcNow;

        AddHistory(entity.BonusStructureId, "Restore", "Bonus Structure Restored", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();

        return entity.Code;
    }
}
