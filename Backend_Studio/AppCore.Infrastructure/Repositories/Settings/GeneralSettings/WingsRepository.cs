//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.Wings.DTOs;

using WingsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Wings;

using CompanyEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Company;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;

using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.GeneralSettings;


//===============================================================
// Wings Repository
//===============================================================

public class WingsRepository : IWingsRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public WingsRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Wings Query
    //===========================================================

    private IQueryable<WingDto> WingsQuery()
    {
        return _context
            .Set<WingsEntity>()

            .AsNoTracking()

            .Where
            (
                x =>
                    !x.IsDeleted
            )

            .Select
            (
                x =>
                    new WingDto
                    {
                        WingId =
                            x.WingId,

                        CompanyId =
                            x.CompanyId,

                        WingCode =
                            x.WingCode,

                        WingName =
                            x.WingName,


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

    public async Task<List<WingDto>>
        GetAllAsync()
    {
        return await WingsQuery()

            .OrderBy
            (
                x =>
                    x.WingCode
            )

            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<WingDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await WingsQuery()

            .FirstOrDefaultAsync
            (
                x =>
                    x.WingId ==
                    id
            );
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync
        (
            long companyId
        )
    {
        //===========================================================
        // Resolve Company
        //===========================================================

        CompanyEntity? company =

            await _context
                .Set<CompanyEntity>()

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.CompanyId ==
                        companyId

                        &&

                        !x.IsDeleted
                );


        if
        (
            company ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Company not found."
            );
        }


        //===========================================================
        // Resolve Company Sequence
        //===========================================================

        string companyCode =
            company.CompanyCode?.Trim()
            ??
            string.Empty;


        string companySequence =
            companyCode
                .Replace(
                    "CMP-",
                    "",
                    StringComparison.OrdinalIgnoreCase);


        if
        (
            !int.TryParse
            (
                companySequence,
                out int companySequenceNo
            )
        )
        {
            throw new InvalidOperationException(
                "Invalid company code."
            );
        }


        //===========================================================
        // Get Existing Wing Codes
        //===========================================================

        List<string> existingCodes =
            await _context
                .Set<WingsEntity>()

                .AsNoTracking()

                .Where
                (
                    x =>

                        x.CompanyId ==
                        companyId

                        &&

                        !x.IsDeleted
                )

                .Select
                (
                    x =>
                        x.WingCode
                )

                .ToListAsync();


        //===========================================================
        // Resolve Next Wing Sequence
        //===========================================================

        int nextWingSequenceNo =
            1;


        while
        (
            existingCodes.Any
            (
                x =>
                    string.Equals
                    (
                        x,

                        CodeGenerator.GenerateWingCode(
                            companySequenceNo,
                            nextWingSequenceNo),

                        StringComparison.OrdinalIgnoreCase
                    )
            )
        )
        {
            nextWingSequenceNo++;
        }


        //===========================================================
        // Generate Wing Code
        //===========================================================

        return CodeGenerator.GenerateWingCode(
            companySequenceNo,
            nextWingSequenceNo);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<WingsDefaultsDto>
        GetDefaultsAsync
        (
            long companyId
        )
    {
        return new WingsDefaultsDto
        {
            Code =
                await GetNextCodeAsync(
                    companyId)
        };
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateWingDto dto,

            long userId
        )
    {
        //===========================================================
        // Resolve Company
        //===========================================================

        CompanyEntity? company =

            await _context
                .Set<CompanyEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.CompanyId ==
                        dto.CompanyId

                        &&

                        !x.IsDeleted
                );


        if
        (
            company ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Company not found."
            );
        }


        //===========================================================
        // Resolve Wing Code
        //===========================================================

        string wingCode =
            dto.WingCode?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(wingCode)
        )
        {
            wingCode =
                await GetNextCodeAsync(
                    dto.CompanyId);
        }


        //===========================================================
        // Create Entity
        //===========================================================

        WingsEntity entity =
            new WingsEntity
            {
                CompanyId =
                    dto.CompanyId,

                WingCode =
                    wingCode,

                WingName =
                    dto.WingName?.Trim()
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
            .Set<WingsEntity>()
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
                    "General Settings",

                EntityName =
                    "Wing",

                EntityId =
                    entity.WingId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Wing Created",

                ActivityDescription =
                    $"Wing '{entity.WingName}' created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return entity.WingId;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateWingDto dto,

            long userId
        )
    {
        //===========================================================
        // Resolve Wing
        //===========================================================

        WingsEntity? entity =

            await _context
                .Set<WingsEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.WingId ==
                        dto.WingId

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
                "Wing not found."
            );
        }


        //===========================================================
        // Resolve Company
        //===========================================================

        CompanyEntity? company =

            await _context
                .Set<CompanyEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.CompanyId ==
                        dto.CompanyId

                        &&

                        !x.IsDeleted
                );


        if
        (
            company ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Company not found."
            );
        }


        //===========================================================
        // Update Company
        //===========================================================

        entity.CompanyId =
            dto.CompanyId;


        //===========================================================
        // Update Wing Information
        //===========================================================

        entity.WingCode =
            dto.WingCode?.Trim()
            ??
            string.Empty;


        entity.WingName =
            dto.WingName?.Trim()
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
                    "General Settings",

                EntityName =
                    "Wing",

                EntityId =
                    entity.WingId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Wing Updated",

                ActivityDescription =
                    $"Wing '{entity.WingName}' updated.",

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
        // Resolve Wing
        //===========================================================

        WingsEntity? entity =

            await _context
                .Set<WingsEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.WingId ==
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
                "Wing not found."
            );
        }


        //===========================================================
        // Soft Delete Wing
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
                    "General Settings",

                EntityName =
                    "Wing",

                EntityId =
                    entity.WingId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Wing Deleted",

                ActivityDescription =
                    $"Wing '{entity.WingName}' deleted.",

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
        WingsEntity? entity =

            await _context
                .Set<WingsEntity>()

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
                    "General Settings",

                EntityName =
                    "Wing",

                EntityId =
                    entity.WingId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Wing Restored",

                ActivityDescription =
                    $"Wing '{entity.WingName}' restored.",

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
            .Set<WingsEntity>()

            .AnyAsync
            (
                x =>

                    x.WingId ==
                    id

                    &&

                    !x.IsDeleted
            );
    }
}