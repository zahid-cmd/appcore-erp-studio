//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.Warehouses.DTOs;

using WarehousesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Warehouses;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

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
// Warehouses Repository
//===============================================================

public class WarehousesRepository : IWarehousesRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public WarehousesRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Warehouses Query
    //===========================================================

    private IQueryable<WarehousesDto> WarehousesQuery()
    {
        return _context
            .Set<WarehousesEntity>()

            .AsNoTracking()

            .Where
            (
                x =>
                    !x.IsDeleted
            )

            .Select
            (
                x =>
                    new WarehousesDto
                    {
                        WarehouseId =
                            x.WarehouseId,

                        CompanyId =
                            x.CompanyId,

                        WingId =
                            x.WingId,

                        BranchId =
                            x.BranchId,

                        WarehouseCode =
                            x.WarehouseCode,

                        WarehouseName =
                            x.WarehouseName,

                        DisplayName =
                            x.DisplayName,


                        //===================================================
                        // Contact Information
                        //===================================================

                        Mobile =
                            x.Mobile,

                        Email =
                            x.Email,

                        Address =
                            x.Address,


                        //===================================================
                        // Configuration
                        //===================================================

                        IsBranchGenerated =
                            x.IsBranchGenerated,

                        IsDefault =
                            x.IsDefault,

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

    public async Task<List<WarehousesDto>>
        GetAllAsync()
    {
        return await WarehousesQuery()

            .OrderBy
            (
                x =>
                    x.WarehouseCode
            )

            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<WarehousesDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await WarehousesQuery()

            .FirstOrDefaultAsync
            (
                x =>
                    x.WarehouseId ==
                    id
            );
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync
        (
            long branchId
        )
    {
        //===========================================================
        // Resolve Branch
        //===========================================================

        BranchesEntity? branch =

            await _context
                .Set<BranchesEntity>()

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.BranchId ==
                        branchId

                        &&

                        !x.IsDeleted
                );


        if
        (
            branch ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Branch not found."
            );
        }


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
                        branch.CompanyId

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
        // Resolve Wing
        //===========================================================

        WingsEntity? wing =

            await _context
                .Set<WingsEntity>()

                .AsNoTracking()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.WingId ==
                        branch.WingId

                        &&

                        !x.IsDeleted
                );


        if
        (
            wing ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Wing not found."
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
        // Resolve Wing Sequence
        //===========================================================

        string wingCode =
            wing.WingCode?.Trim()
            ??
            string.Empty;


        string wingSequence =
            wingCode
                .Replace(
                    "WNG-",
                    "",
                    StringComparison.OrdinalIgnoreCase);


        string[] wingParts =
            wingSequence.Split('-');


        if
        (
            wingParts.Length != 2

            ||

            !int.TryParse(
                wingParts[1],
                out int wingSequenceNo)
        )
        {
            throw new InvalidOperationException(
                "Invalid wing code."
            );
        }


        //===========================================================
        // Resolve Branch Sequence
        //===========================================================

        string branchCode =
            branch.BranchCode?.Trim()
            ??
            string.Empty;


        string branchSequence =
            branchCode
                .Replace(
                    "BRN-",
                    "",
                    StringComparison.OrdinalIgnoreCase);


        string[] branchParts =
            branchSequence.Split('-');


        if
        (
            branchParts.Length != 3

            ||

            !int.TryParse(
                branchParts[2],
                out int branchSequenceNo)
        )
        {
            throw new InvalidOperationException(
                "Invalid branch code."
            );
        }


        //===========================================================
        // Get Existing Warehouse Codes
        //===========================================================

        List<string> existingCodes =
            await _context
                .Set<WarehousesEntity>()

                .AsNoTracking()

                .Where
                (
                    x =>

                        x.BranchId ==
                        branchId

                        &&

                        !x.IsDeleted
                )

                .Select
                (
                    x =>
                        x.WarehouseCode
                )

                .ToListAsync();


        //===========================================================
        // Resolve Next Warehouse Sequence
        //===========================================================

        int nextWarehouseSequenceNo =
            1;


        while
        (
            existingCodes.Any
            (
                x =>
                    string.Equals
                    (
                        x,

                        CodeGenerator.GenerateWarehouseCode(
                            companySequenceNo,
                            wingSequenceNo,
                            branchSequenceNo,
                            nextWarehouseSequenceNo),

                        StringComparison.OrdinalIgnoreCase
                    )
            )
        )
        {
            nextWarehouseSequenceNo++;
        }


        //===========================================================
        // Generate Warehouse Code
        //===========================================================

        return CodeGenerator.GenerateWarehouseCode(
            companySequenceNo,
            wingSequenceNo,
            branchSequenceNo,
            nextWarehouseSequenceNo);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<WarehousesDefaultsDto>
        GetDefaultsAsync
        (
            long branchId
        )
    {
        return new WarehousesDefaultsDto
        {
            Code =
                await GetNextCodeAsync(
                    branchId)
        };
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateWarehousesDto dto,

            long userId
        )
    {
        //===========================================================
        // Resolve Branch
        //===========================================================

        BranchesEntity? branch =

            await _context
                .Set<BranchesEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.BranchId ==
                        dto.BranchId

                        &&

                        x.CompanyId ==
                        dto.CompanyId

                        &&

                        x.WingId ==
                        dto.WingId

                        &&

                        !x.IsDeleted
                );


        if
        (
            branch ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Branch not found."
            );
        }


        //===========================================================
        // Resolve Warehouse Code
        //===========================================================

        string warehouseCode =
            dto.WarehouseCode?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(warehouseCode)
        )
        {
            warehouseCode =
                await GetNextCodeAsync(
                    dto.BranchId);
        }


        //===========================================================
        // Resolve Display Name
        //===========================================================

        string displayName =
            dto.DisplayName?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(displayName)
        )
        {
            displayName =
                $"{branch.ShortName} Warehouse";
        }


        //===========================================================
        // Create Entity
        //===========================================================

        WarehousesEntity entity =
            new WarehousesEntity
            {
                CompanyId =
                    dto.CompanyId,

                WingId =
                    dto.WingId,

                BranchId =
                    dto.BranchId,

                WarehouseCode =
                    warehouseCode,

                WarehouseName =
                    dto.WarehouseName?.Trim()
                    ??
                    displayName,

                DisplayName =
                    displayName,

                Mobile =
                    dto.Mobile?.Trim()
                    ??
                    string.Empty,

                Email =
                    dto.Email?.Trim()
                    ??
                    string.Empty,

                Address =
                    dto.Address?.Trim()
                    ??
                    string.Empty,


                //=======================================================
                // Configuration
                //=======================================================

                IsBranchGenerated =
                    dto.IsBranchGenerated,

                IsDefault =
                    dto.IsDefault,

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
            .Set<WarehousesEntity>()
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
                    "Warehouse",

                EntityId =
                    entity.WarehouseId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Warehouse Created",

                ActivityDescription =
                    $"Warehouse '{entity.DisplayName}' created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return entity.WarehouseId;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateWarehousesDto dto,

            long userId
        )
    {
        //===========================================================
        // Resolve Warehouse
        //===========================================================

        WarehousesEntity? entity =

            await _context
                .Set<WarehousesEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.WarehouseId ==
                        dto.WarehouseId

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
                "Warehouse not found."
            );
        }


        //===========================================================
        // Resolve Branch
        //===========================================================

        BranchesEntity? branch =

            await _context
                .Set<BranchesEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.BranchId ==
                        dto.BranchId

                        &&

                        x.CompanyId ==
                        dto.CompanyId

                        &&

                        x.WingId ==
                        dto.WingId

                        &&

                        !x.IsDeleted
                );


        if
        (
            branch ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Branch not found."
            );
        }


        //===========================================================
        // Update Company
        //===========================================================

        entity.CompanyId =
            dto.CompanyId;


        //===========================================================
        // Update Wing
        //===========================================================

        entity.WingId =
            dto.WingId;


        //===========================================================
        // Update Branch
        //===========================================================

        entity.BranchId =
            dto.BranchId;


        //===========================================================
        // Update Warehouse Information
        //===========================================================

        entity.WarehouseCode =
            dto.WarehouseCode?.Trim()
            ??
            string.Empty;


        entity.WarehouseName =
            dto.WarehouseName?.Trim()
            ??
            string.Empty;


        entity.DisplayName =
            dto.DisplayName?.Trim()
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


        entity.Address =
            dto.Address?.Trim()
            ??
            string.Empty;


        //===========================================================
        // Configuration
        //===========================================================

        entity.IsBranchGenerated =
            dto.IsBranchGenerated;


        entity.IsDefault =
            dto.IsDefault;


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
                    "Warehouse",

                EntityId =
                    entity.WarehouseId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Warehouse Updated",

                ActivityDescription =
                    $"Warehouse '{entity.DisplayName}' updated.",

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
        // Resolve Warehouse
        //===========================================================

        WarehousesEntity? entity =

            await _context
                .Set<WarehousesEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.WarehouseId ==
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
                "Warehouse not found."
            );
        }


        //===========================================================
        // Soft Delete Warehouse
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
                    "Warehouse",

                EntityId =
                    entity.WarehouseId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Warehouse Deleted",

                ActivityDescription =
                    $"Warehouse '{entity.DisplayName}' deleted.",

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
        WarehousesEntity? entity =

            await _context
                .Set<WarehousesEntity>()

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
                    "Warehouse",

                EntityId =
                    entity.WarehouseId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Warehouse Restored",

                ActivityDescription =
                    $"Warehouse '{entity.DisplayName}' restored.",

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
            .Set<WarehousesEntity>()

            .AnyAsync
            (
                x =>

                    x.WarehouseId ==
                    id

                    &&

                    !x.IsDeleted
            );
    }
}