//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using AppCore.Application.ServiceOperations;
using AppCore.Domain.Entities.ServiceOperations;
using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.ServiceOperations;


//===============================================================
// The list of outside works (hand-written, 2026-11-17; NEVER run
// Code Sync; table made by ServiceOperations_Outside_Works.sql)
//
// Kept in Workshop Configuration, tab Outside Works. On the service
// estimate and the job card a work is picked from the list and
// becomes a labour line (kind Other) with the code and the name of
// the work and its usual charge, which can be changed on the line.
//===============================================================

public class WorkshopOutsideWorksRepository
    : IWorkshopOutsideWorksRepository
{
    private const string Prefix = "OW-";

    private const string Entity = "Workshop";

    private readonly AppDbContext _context;

    public WorkshopOutsideWorksRepository(AppDbContext context)
    {
        _context = context;
    }

    private DbSet<WorkshopOutsideWorks> Works => _context.Set<WorkshopOutsideWorks>();

    private static WorkshopOutsideWorkDto ToDto(WorkshopOutsideWorks x) =>
        new WorkshopOutsideWorkDto
        {
            WorkshopOutsideWorkId = x.WorkshopOutsideWorkId,
            PublicId = x.PublicId,
            Code = x.Code,
            Name = x.Name,
            Rate = x.Rate,
            Remarks = x.Remarks,
            IsActive = x.IsActive
        };

    public async Task<WorkshopOutsideWorksSetupDto> GetSetupAsync() =>
        new WorkshopOutsideWorksSetupDto
        {
            OutsideWorks = (await Works.AsNoTracking().Where(x => !x.IsDeleted).OrderBy(x => x.Name).ToListAsync()).Select(ToDto).ToList(),
            NextCode = Ws.NextCode(await Works.AsNoTracking().Select(x => x.Code).ToListAsync(), Prefix)
        };

    public async Task<List<WorkshopOutsideWorkDto>> GetActiveAsync() =>
        (await Works.AsNoTracking().Where(x => !x.IsDeleted && x.IsActive).OrderBy(x => x.Name).ToListAsync()).Select(ToDto).ToList();

    public async Task<WorkshopOutsideWorkDto> SaveAsync(Guid? publicId, WorkshopOutsideWorkDto dto, long userId)
    {
        string name = Ws.Clean(dto.Name, 150, "Outside work");

        if (name.Length == 0)
        {
            throw new InvalidOperationException("Outside work is required.");
        }

        decimal rate = Ws.Round(dto.Rate);

        if (rate < 0m)
        {
            throw new InvalidOperationException("The charge cannot be below 0.");
        }

        if (await Works.AsNoTracking().AnyAsync(x => !x.IsDeleted && x.PublicId != (publicId ?? Guid.Empty) && x.Name.ToLower() == name.ToLower()))
        {
            throw new InvalidOperationException($"The outside works have \"{name}\" already.");
        }

        WorkshopOutsideWorks entity;

        if (publicId == null)
        {
            entity =
                new WorkshopOutsideWorks
                {
                    Code = Ws.NextCode(await Works.AsNoTracking().Select(x => x.Code).ToListAsync(), Prefix),
                    IsDeleted = false,
                    CreatedBy = userId,
                    CreatedDate = DateTime.UtcNow
                };

            Works.Add(entity);
        }
        else
        {
            entity =
                await Works.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
                ?? throw new KeyNotFoundException("The outside work was not found.");

            entity.ModifiedBy = userId;
            entity.ModifiedDate = DateTime.UtcNow;
        }

        entity.Name = name;
        entity.Rate = rate;
        entity.Remarks = Ws.Clean(dto.Remarks, 500, "Remarks");
        entity.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();

        Ws.AddHistory(_context, Entity, entity.WorkshopOutsideWorkId, publicId == null ? "Create" : "Update", publicId == null ? "Outside Work Created" : "Outside Work Updated", $"{entity.Code} {entity.Name}, charge {entity.Rate:N2}.{(entity.IsActive ? string.Empty : " Inactive.")}", userId);

        await _context.SaveChangesAsync();

        return ToDto(entity);
    }

    // A deleted work stays on the estimates and job cards that have it
    public async Task DeleteAsync(Guid publicId, long userId)
    {
        WorkshopOutsideWorks entity =
            await Works.FirstOrDefaultAsync(x => x.PublicId == publicId && !x.IsDeleted)
            ?? throw new KeyNotFoundException("The outside work was not found.");

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = DateTime.UtcNow;

        Ws.AddHistory(_context, Entity, entity.WorkshopOutsideWorkId, "Delete", "Outside Work Deleted", $"{entity.Code} {entity.Name}", userId);

        await _context.SaveChangesAsync();
    }
}
