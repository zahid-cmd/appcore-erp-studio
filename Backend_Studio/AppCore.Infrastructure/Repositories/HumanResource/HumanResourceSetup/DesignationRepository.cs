//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.HumanResource.HumanResourceSetup.Designation.DTOs;
using AppCore.Application.HumanResource.HumanResourceSetup.Designation.Interfaces;
using AppCore.Domain.Common;
using AppCore.Domain.Entities.HumanResource.HumanResourceSetup;
using AppCore.Infrastructure.CodeMaster;
using AppCore.Infrastructure.Persistence;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.HumanResource.HumanResourceSetup;

//===============================================================
// Designation Repository
//===============================================================

public class DesignationRepository : IDesignationRepository
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext _context;

    //===========================================================
    // Constructor
    //===========================================================

    public DesignationRepository(AppDbContext context)
    {
        _context = context;
    }
    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<DesignationDefaultsDto> GetDefaultsAsync()
    {
        int nextSequenceNo =
            await GetNextSequenceNoAsync();

        return new DesignationDefaultsDto
        {
            Code =
                CodeGenerator.GenerateDesignationCode(
                    nextSequenceNo),

            IsActive =
                true
        };
    }

    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<DesignationDto>> GetAllAsync()
    {
        return await _context.Designations
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.Code)
            .Select(x => new DesignationDto
            {
                Id = x.Id,
                Code = x.Code,
                Name = x.Name,
                Remarks = x.Remarks,
                IsActive = x.IsActive
            })
            .ToListAsync();
    }

    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<DesignationDto?> GetByIdAsync(long id)
    {
        return await _context.Designations
            .Where(x => x.Id == id && !x.IsDeleted)
            .Select(x => new DesignationDto
            {
                Id = x.Id,
                Code = x.Code,
                Name = x.Name,
                Remarks = x.Remarks,
                IsActive = x.IsActive
            })
            .FirstOrDefaultAsync();
    }

    //===========================================================
    // Create
    //===========================================================

    public async Task<long> CreateAsync(CreateDesignationDto dto)
    {
        const long userId = 1;

        int nextSequenceNo =
            await GetNextSequenceNoAsync();

        var designation =
            new Designation
            {
                SequenceNo =
                    nextSequenceNo,

                Code =
                    CodeGenerator.GenerateDesignationCode(
                        nextSequenceNo),

                Name =
                    dto.Name,

                Remarks =
                    dto.Remarks,

                IsActive =
                    dto.IsActive,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };

        _context.Designations.Add(designation);

        await _context.SaveChangesAsync();

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Human Resource",

                EntityName =
                    "Designation",

                EntityId =
                    designation.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Designation Created",

                ActivityDescription =
                    $"Designation '{designation.Name}' created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        return designation.Id;
    }

    //===========================================================
    // Update
    //===========================================================

    public async Task<bool> UpdateAsync(UpdateDesignationDto dto)
    {
        const long userId = 1;

        var designation =
            await _context.Designations
                .FirstOrDefaultAsync(x =>
                    x.Id == dto.Id &&
                    !x.IsDeleted);

        if (designation == null)
        {
            return false;
        }

        designation.Name =
            dto.Name;

        designation.Remarks =
            dto.Remarks;

        designation.IsActive =
            dto.IsActive;

        designation.ModifiedBy =
            userId;

        designation.ModifiedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Human Resource",

                EntityName =
                    "Designation",

                EntityId =
                    designation.Id,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Designation Updated",

                ActivityDescription =
                    $"Designation '{designation.Name}' updated.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        return true;
    }

    //===========================================================
    // Delete
    //===========================================================

    public async Task<bool> DeleteAsync(long id)
    {
        const long userId = 1;

        var designation =
            await _context.Designations
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    !x.IsDeleted);

        if (designation == null)
        {
            return false;
        }

        designation.IsDeleted =
            true;

        designation.DeletedBy =
            userId;

        designation.DeletedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Human Resource",

                EntityName =
                    "Designation",

                EntityId =
                    designation.Id,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Designation Deleted",

                ActivityDescription =
                    $"Designation '{designation.Name}' deleted.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        return true;
    }
    //===============================================================
    // Get Next Sequence No
    //===============================================================

    private async Task<int> GetNextSequenceNoAsync()
    {
        return await _context.Designations.AnyAsync()
            ? await _context.Designations.MaxAsync(x => x.SequenceNo) + 1
            : 1;
    }

    //===========================================================
    // Exists By Name
    //===========================================================

    public async Task<bool> ExistsByNameAsync(
        string name,
        long? excludeId = null)
    {
        return await _context.Designations.AnyAsync(x =>
            !x.IsDeleted &&
            x.Name == name &&
            (!excludeId.HasValue || x.Id != excludeId.Value));
    }
}