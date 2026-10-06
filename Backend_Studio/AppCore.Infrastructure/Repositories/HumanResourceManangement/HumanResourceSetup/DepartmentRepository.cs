//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.HumanResourceManangement.HumanResourceSetup;

using AppCore.Application.HumanResourceManangement.HumanResourceSetup.Department.DTOs;

using DepartmentEntity =
    AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup.Department;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;

using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Department Repository
//===============================================================

public class DepartmentRepository : IDepartmentRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public DepartmentRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Department Query
    //===========================================================

    private IQueryable<DepartmentDto> DepartmentQuery()
    {
        return _context
            .Set<DepartmentEntity>()
            .AsNoTracking()
            .Where(
                x =>
                    !x.IsDeleted
            )
            .Select(
                x =>
                    new DepartmentDto
                    {
                        DepartmentId =
                            x.DepartmentId,

                        DepartmentCode =
                            x.DepartmentCode,

                        DepartmentName =
                            x.DepartmentName,

                        DepartmentShortName =
                            x.DepartmentShortName,


                        //===================================================
                        // Configuration
                        //===================================================

                        Remarks =
                            x.Remarks,


                        //===================================================
                        // Status
                        //===================================================

                        IsActive =
                            x.IsActive,

                        IsDeleted =
                            x.IsDeleted,


                        //===================================================
                        // Soft Delete
                        //===================================================

                        DeletedBy =
                            x.DeletedBy,

                        DeletedDate =
                            x.DeletedDate,


                        //===================================================
                        // Audit
                        //===================================================

                        CreatedBy =
                            x.CreatedBy,

                        CreatedDate =
                            x.CreatedDate,

                        ModifiedBy =
                            x.ModifiedBy,

                        ModifiedDate =
                            x.ModifiedDate
                    }
            );
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<DepartmentDto>>
        GetAllAsync()
    {
        return await DepartmentQuery()
            .OrderBy(
                x =>
                    x.DepartmentCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<DepartmentDto?>
        GetByIdAsync(
            long id
        )
    {
        return await DepartmentQuery()
            .FirstOrDefaultAsync(
                x =>
                    x.DepartmentId ==
                    id
            );
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync()
    {
        List<string> existingCodes =
            await _context
                .Set<DepartmentEntity>()
                .AsNoTracking()
                .Where(
                    x =>
                        !x.IsDeleted
                )
                .Select(
                    x =>
                        x.DepartmentCode
                )
                .ToListAsync();


        int nextSequenceNo =
            1;


        while
        (
            existingCodes.Any(
                x =>
                    string.Equals(
                        x,

                        CodeGenerator.GenerateDepartmentCode(
                            nextSequenceNo),

                        StringComparison.OrdinalIgnoreCase
                    )
            )
        )
        {
            nextSequenceNo++;
        }


        return CodeGenerator.GenerateDepartmentCode(
            nextSequenceNo);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<DepartmentDefaultsDto>
        GetDefaultsAsync()
    {
        return new DepartmentDefaultsDto
        {
            Code =
                await GetNextCodeAsync()
        };
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync(
            CreateDepartmentDto dto,

            long userId
        )
    {
        string departmentCode =
            dto.DepartmentCode?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(departmentCode)
        )
        {
            departmentCode =
                await GetNextCodeAsync();
        }


        DepartmentEntity entity =
            new DepartmentEntity
            {
                DepartmentCode =
                    departmentCode,

                DepartmentName =
                    dto.DepartmentName?.Trim()
                    ??
                    string.Empty,

                DepartmentShortName =
                    dto.DepartmentShortName?.Trim()
                    ??
                    string.Empty,


                //=======================================================
                // Configuration
                //=======================================================

                Remarks =
                    dto.Remarks?.Trim()
                    ??
                    string.Empty,


                //=======================================================
                // Status
                //=======================================================

                IsActive =
                    dto.IsActive,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };


        _context
            .Set<DepartmentEntity>()
            .Add(
                entity
            );


        await _context.SaveChangesAsync();


        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Human Resource Setup",

                EntityName =
                    "Department",

                EntityId =
                    entity.DepartmentId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Department Created",

                ActivityDescription =
                    $"Department '{entity.DepartmentName}' created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return entity.DepartmentId;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync(
            UpdateDepartmentDto dto,

            long userId
        )
    {
        DepartmentEntity? entity =
            await _context
                .Set<DepartmentEntity>()
                .FirstOrDefaultAsync(
                    x =>
                        x.DepartmentId ==
                        dto.DepartmentId

                        &&

                        !x.IsDeleted
                );


        if
        (
            entity ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Department not found."
            );
        }


        entity.DepartmentCode =
            dto.DepartmentCode?.Trim()
            ??
            string.Empty;


        entity.DepartmentName =
            dto.DepartmentName?.Trim()
            ??
            string.Empty;


        entity.DepartmentShortName =
            dto.DepartmentShortName?.Trim()
            ??
            string.Empty;


        //===========================================================
        // Configuration
        //===========================================================

        entity.Remarks =
            dto.Remarks?.Trim()
            ??
            string.Empty;


        //===========================================================
        // Status
        //===========================================================

        entity.IsActive =
            dto.IsActive;


        entity.ModifiedBy =
            userId;


        entity.ModifiedDate =
            DateTime.UtcNow;


        await _context.SaveChangesAsync();


        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Human Resource Setup",

                EntityName =
                    "Department",

                EntityId =
                    entity.DepartmentId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Department Updated",

                ActivityDescription =
                    $"Department '{entity.DepartmentName}' updated.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Delete
    //===========================================================

    public async Task
        DeleteAsync(
            long id,

            long userId
        )
    {
        //===========================================================
        // Resolve Department
        //===========================================================

        DepartmentEntity? entity =
            await _context
                .Set<DepartmentEntity>()
                .FirstOrDefaultAsync(
                    x =>
                        x.DepartmentId ==
                        id

                        &&

                        !x.IsDeleted
                );


        if
        (
            entity ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Department not found."
            );
        }


        //===========================================================
        // Soft Delete Department
        //===========================================================

        entity.IsDeleted =
            true;


        entity.DeletedBy =
            userId;


        entity.DeletedDate =
            DateTime.UtcNow;


        await _context.SaveChangesAsync();


        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Human Resource Setup",

                EntityName =
                    "Department",

                EntityId =
                    entity.DepartmentId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Department Deleted",

                ActivityDescription =
                    $"Department '{entity.DepartmentName}' deleted.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore
    //===========================================================

    public async Task<bool>
        RestoreAsync(
            long userId
        )
    {
        DepartmentEntity? entity =
            await _context
                .Set<DepartmentEntity>()
                .Where(
                    x =>
                        x.IsDeleted
                )
                .OrderByDescending(
                    x =>
                        x.DeletedDate
                )
                .FirstOrDefaultAsync();


        if
        (
            entity ==
            null
        )
        {
            return false;
        }


        entity.IsDeleted =
            false;


        entity.DeletedBy =
            null;


        entity.DeletedDate =
            null;


        entity.ModifiedBy =
            userId;


        entity.ModifiedDate =
            DateTime.UtcNow;


        await _context.SaveChangesAsync();


        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Human Resource Setup",

                EntityName =
                    "Department",

                EntityId =
                    entity.DepartmentId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Department Restored",

                ActivityDescription =
                    $"Department '{entity.DepartmentName}' restored.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return true;
    }


    //===========================================================
    // Exists
    //===========================================================

    public async Task<bool>
        ExistsAsync(
            long id
        )
    {
        return await _context
            .Set<DepartmentEntity>()
            .AnyAsync(
                x =>
                    x.DepartmentId ==
                    id

                    &&

                    !x.IsDeleted
            );
    }
}