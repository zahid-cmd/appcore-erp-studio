//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.Company.DTOs;

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
// Company Repository
//===============================================================

public class CompanyRepository : ICompanyRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public CompanyRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Company Query
    //===========================================================

    private IQueryable<CompanyDto> CompanyQuery()
    {
        return _context
            .Set<CompanyEntity>()

            .AsNoTracking()

            .Where
            (
                x =>
                    !x.IsDeleted
            )

            .Select
            (
                x =>
                    new CompanyDto
                    {
                        CompanyId =
                            x.CompanyId,

                        CompanyCode =
                            x.CompanyCode,

                        CompanyName =
                            x.CompanyName,

                        CompanyShortName =
                            x.CompanyShortName,


                        //===================================================
                        // Address & Contact Information
                        //===================================================

                        AddressLine1 =
                            x.AddressLine1,

                        AddressLine2 =
                            x.AddressLine2,

                        Phone =
                            x.Phone,

                        Mobile =
                            x.Mobile,

                        Email =
                            x.Email,

                        Website =
                            x.Website,


                        //===================================================
                        // Business Information
                        //===================================================

                        BINNo =
                            x.BINNo,

                        OwnershipType =
                            x.OwnershipType,

                        EconomicActivity =
                            x.EconomicActivity,

                        TINNo =
                            x.TINNo,

                        TradeLicenseNo =
                            x.TradeLicenseNo,


                        //===================================================
                        // Configuration
                        //===================================================

                        CompanyLogoPath =
                            x.CompanyLogoPath,

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

    public async Task<List<CompanyDto>>
        GetAllAsync()
    {
        return await CompanyQuery()

            .OrderBy
            (
                x =>
                    x.CompanyCode
            )

            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<CompanyDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await CompanyQuery()

            .FirstOrDefaultAsync
            (
                x =>
                    x.CompanyId ==
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
                .Set<CompanyEntity>()

                .AsNoTracking()

                .Where
                (
                    x =>
                        !x.IsDeleted
                )

                .Select
                (
                    x =>
                        x.CompanyCode
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

                        CodeGenerator.GenerateCompanyCode(
                            nextSequenceNo),

                        StringComparison.OrdinalIgnoreCase
                    )
            )
        )
        {
            nextSequenceNo++;
        }


        return CodeGenerator.GenerateCompanyCode(
            nextSequenceNo);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<CompanyDefaultsDto>
        GetDefaultsAsync()
    {
        return new CompanyDefaultsDto
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
            CreateCompanyDto dto,

            long userId
        )
    {
        string companyCode =
            dto.CompanyCode?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(companyCode)
        )
        {
            companyCode =
                await GetNextCodeAsync();
        }


        CompanyEntity entity =
            new CompanyEntity
            {
                CompanyCode =
                    companyCode,

                CompanyName =
                    dto.CompanyName?.Trim()
                    ??
                    string.Empty,

                CompanyShortName =
                    dto.CompanyShortName?.Trim()
                    ??
                    string.Empty,


                //=======================================================
                // Address & Contact Information
                //=======================================================

                AddressLine1 =
                    dto.AddressLine1?.Trim()
                    ??
                    string.Empty,

                AddressLine2 =
                    dto.AddressLine2?.Trim()
                    ??
                    string.Empty,

                Phone =
                    dto.Phone?.Trim()
                    ??
                    string.Empty,

                Mobile =
                    dto.Mobile?.Trim()
                    ??
                    string.Empty,

                Email =
                    dto.Email?.Trim()
                    ??
                    string.Empty,

                Website =
                    dto.Website?.Trim()
                    ??
                    string.Empty,


                //=======================================================
                // Business Information
                //=======================================================

                BINNo =
                    dto.BINNo?.Trim()
                    ??
                    string.Empty,

                OwnershipType =
                    dto.OwnershipType?.Trim()
                    ??
                    string.Empty,

                EconomicActivity =
                    dto.EconomicActivity?.Trim()
                    ??
                    string.Empty,

                TINNo =
                    dto.TINNo?.Trim()
                    ??
                    string.Empty,

                TradeLicenseNo =
                    dto.TradeLicenseNo?.Trim()
                    ??
                    string.Empty,


                //=======================================================
                // Configuration
                //=======================================================

                CompanyLogoPath =
                    dto.CompanyLogoPath?.Trim()
                    ??
                    string.Empty,

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
            .Set<CompanyEntity>()
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
                    "Company",

                EntityId =
                    entity.CompanyId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Company Created",

                ActivityDescription =
                    $"Company '{entity.CompanyName}' created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return entity.CompanyId;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateCompanyDto dto,

            long userId
        )
    {
        CompanyEntity? entity =

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
            entity ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Company not found."
            );
        }


        entity.CompanyCode =
            dto.CompanyCode?.Trim()
            ??
            string.Empty;


        entity.CompanyName =
            dto.CompanyName?.Trim()
            ??
            string.Empty;


        entity.CompanyShortName =
            dto.CompanyShortName?.Trim()
            ??
            string.Empty;


        //===========================================================
        // Address & Contact Information
        //===========================================================

        entity.AddressLine1 =
            dto.AddressLine1?.Trim()
            ??
            string.Empty;


        entity.AddressLine2 =
            dto.AddressLine2?.Trim()
            ??
            string.Empty;


        entity.Phone =
            dto.Phone?.Trim()
            ??
            string.Empty;


        entity.Mobile =
            dto.Mobile?.Trim()
            ??
            string.Empty;


        entity.Email =
            dto.Email?.Trim()
            ??
            string.Empty;


        entity.Website =
            dto.Website?.Trim()
            ??
            string.Empty;


        //===========================================================
        // Business Information
        //===========================================================

        entity.BINNo =
            dto.BINNo?.Trim()
            ??
            string.Empty;


        entity.OwnershipType =
            dto.OwnershipType?.Trim()
            ??
            string.Empty;


        entity.EconomicActivity =
            dto.EconomicActivity?.Trim()
            ??
            string.Empty;


        entity.TINNo =
            dto.TINNo?.Trim()
            ??
            string.Empty;


        entity.TradeLicenseNo =
            dto.TradeLicenseNo?.Trim()
            ??
            string.Empty;


        //===========================================================
        // Configuration
        //===========================================================

        entity.CompanyLogoPath =
            dto.CompanyLogoPath?.Trim()
            ??
            string.Empty;


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
                    "Company",

                EntityId =
                    entity.CompanyId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Company Updated",

                ActivityDescription =
                    $"Company '{entity.CompanyName}' updated.",

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
        // Resolve Company
        //===========================================================

        CompanyEntity? entity =

            await _context
                .Set<CompanyEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.CompanyId ==
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
                "Company not found."
            );
        }


        //===========================================================
        // Soft Delete Company
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
                    "Company",

                EntityId =
                    entity.CompanyId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Company Deleted",

                ActivityDescription =
                    $"Company '{entity.CompanyName}' deleted.",

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
        CompanyEntity? entity =

            await _context
                .Set<CompanyEntity>()

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
                    "Company",

                EntityId =
                    entity.CompanyId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Company Restored",

                ActivityDescription =
                    $"Company '{entity.CompanyName}' restored.",

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
            .Set<CompanyEntity>()

            .AnyAsync
            (
                x =>

                    x.CompanyId ==
                    id

                    &&

                    !x.IsDeleted
            );
    }
}