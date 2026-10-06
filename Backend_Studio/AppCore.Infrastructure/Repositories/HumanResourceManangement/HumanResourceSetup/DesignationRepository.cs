//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.HumanResourceManangement.HumanResourceSetup;

using AppCore.Application.HumanResourceManangement.HumanResourceSetup.Designation.DTOs;

using DesignationEntity =
    AppCore.Domain.Entities.HumanResourceManangement.HumanResourceSetup.Designation;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;

using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.HumanResourceManangement.HumanResourceSetup;


//===============================================================
// Designation Repository
//===============================================================

public class DesignationRepository : IDesignationRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public DesignationRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Designation Query
    //===========================================================

    private IQueryable<DesignationDto> DesignationQuery()
    {
        return _context
            .Set<DesignationEntity>()

            .AsNoTracking()

            .Where
            (
                x =>
                    !x.IsDeleted
            )

            .Select
            (
                x =>
                    new DesignationDto
                    {
                        DesignationId =
                            x.DesignationId,

                        DesignationCode =
                            x.DesignationCode,

                        DesignationName =
                            x.DesignationName,

                        DesignationShortName =
                            x.DesignationShortName,


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

    public async Task<List<DesignationDto>>
        GetAllAsync()
    {
        return await DesignationQuery()

            .OrderBy
            (
                x =>
                    x.DesignationCode
            )

            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<DesignationDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await DesignationQuery()

            .FirstOrDefaultAsync
            (
                x =>
                    x.DesignationId ==
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
                .Set<DesignationEntity>()

                .AsNoTracking()

                .Where
                (
                    x =>
                        !x.IsDeleted
                )

                .Select
                (
                    x =>
                        x.DesignationCode
                )

                .ToListAsync();


        int nextSequenceNo =
            1;


        while
        (
            existingCodes.Any
            (
                x =>
                    string.Equals
                    (
                        x,

                        CodeGenerator.GenerateDesignationCode(
                            nextSequenceNo),

                        StringComparison.OrdinalIgnoreCase
                    )
            )
        )
        {
            nextSequenceNo++;
        }


        return CodeGenerator.GenerateDesignationCode(
            nextSequenceNo);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<DesignationDefaultsDto>
        GetDefaultsAsync()
    {
        return new DesignationDefaultsDto
        {
            Code =
                await GetNextCodeAsync()
        };
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateDesignationDto dto,

            long userId
        )
    {
        string designationCode =
            dto.DesignationCode?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(designationCode)
        )
        {
            designationCode =
                await GetNextCodeAsync();
        }


        DesignationEntity entity =
            new DesignationEntity
            {
                DesignationCode =
                    designationCode,

                DesignationName =
                    dto.DesignationName?.Trim()
                    ??
                    string.Empty,

                DesignationShortName =
                    dto.DesignationShortName?.Trim()
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
            .Set<DesignationEntity>()
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
                    "Designation",

                EntityId =
                    entity.DesignationId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Designation Created",

                ActivityDescription =
                    $"Designation '{entity.DesignationName}' created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return entity.DesignationId;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateDesignationDto dto,

            long userId
        )
    {
        DesignationEntity? entity =

            await _context
                .Set<DesignationEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.DesignationId ==
                        dto.DesignationId

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
                "Designation not found."
            );
        }


        entity.DesignationCode =
            dto.DesignationCode?.Trim()
            ??
            string.Empty;


        entity.DesignationName =
            dto.DesignationName?.Trim()
            ??
            string.Empty;


        entity.DesignationShortName =
            dto.DesignationShortName?.Trim()
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
                    "Designation",

                EntityId =
                    entity.DesignationId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Designation Updated",

                ActivityDescription =
                    $"Designation '{entity.DesignationName}' updated.",

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
        DeleteAsync
        (
            long id,

            long userId
        )
    {
        //===========================================================
        // Resolve Designation
        //===========================================================

        DesignationEntity? entity =

            await _context
                .Set<DesignationEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.DesignationId ==
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
                "Designation not found."
            );
        }


        //===========================================================
        // Soft Delete Designation
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
                    "Designation",

                EntityId =
                    entity.DesignationId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Designation Deleted",

                ActivityDescription =
                    $"Designation '{entity.DesignationName}' deleted.",

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
        RestoreAsync
        (
            long userId
        )
    {
        DesignationEntity? entity =

            await _context
                .Set<DesignationEntity>()

                .Where
                (
                    x =>
                        x.IsDeleted
                )

                .OrderByDescending
                (
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
                    "Designation",

                EntityId =
                    entity.DesignationId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Designation Restored",

                ActivityDescription =
                    $"Designation '{entity.DesignationName}' restored.",

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
        ExistsAsync
        (
            long id
        )
    {
        return await _context
            .Set<DesignationEntity>()

            .AnyAsync
            (
                x =>

                    x.DesignationId ==
                    id

                    &&

                    !x.IsDeleted
            );
    }
}