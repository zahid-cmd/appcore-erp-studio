//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.Branches.DTOs;

using BranchesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Branches;

using WingsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Wings;

using CompanyEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Company;

using WarehousesEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.Warehouses;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;

using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.GeneralSettings;


//===============================================================
// Branches Repository
//===============================================================

public class BranchesRepository : IBranchesRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public BranchesRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Branches Query
    //===========================================================

    private IQueryable<BranchesDto> BranchesQuery()
    {
        return _context
            .Set<BranchesEntity>()

            .AsNoTracking()

            .Where
            (
                x =>
                    !x.IsDeleted
            )

            .Select
            (
                x =>
                    new BranchesDto
                    {
                        BranchId =
                            x.BranchId,

                        CompanyId =
                            x.CompanyId,

                        WingId =
                            x.WingId,

                        WingName =
                            _context
                                .Set<WingsEntity>()
                                .Where
                                (
                                    wing =>
                                        wing.WingId ==
                                        x.WingId

                                        &&

                                        !wing.IsDeleted
                                )
                                .Select
                                (
                                    wing =>
                                        wing.WingName
                                )
                                .FirstOrDefault()
                                ??
                                string.Empty,

                        BranchCode =
                            x.BranchCode,

                        ShortName =
                            x.ShortName,

                        BranchName =
                            x.BranchName,


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

    public async Task<List<BranchesDto>>
        GetAllAsync()
    {
        return await BranchesQuery()

            .OrderBy
            (
                x =>
                    x.BranchCode
            )

            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<BranchesDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await BranchesQuery()

            .FirstOrDefaultAsync
            (
                x =>
                    x.BranchId ==
                    id
            );
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync
        (
            long wingId
        )
    {
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
                        wingId

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
                        wing.CompanyId

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
        // Get Existing Branch Codes
        //===========================================================

        List<string> existingCodes =
            await _context
                .Set<BranchesEntity>()

                .AsNoTracking()

                .Where
                (
                    x =>

                        x.WingId ==
                        wingId

                        &&

                        !x.IsDeleted
                )

                .Select
                (
                    x =>
                        x.BranchCode
                )

                .ToListAsync();


        //===========================================================
        // Resolve Next Branch Sequence
        //===========================================================

        int nextBranchSequenceNo =
            1;


        while
        (
            existingCodes.Any
            (
                x =>
                    string.Equals
                    (
                        x,

                        CodeGenerator.GenerateBranchCode(
                            companySequenceNo,
                            wingSequenceNo,
                            nextBranchSequenceNo),

                        StringComparison.OrdinalIgnoreCase
                    )
            )
        )
        {
            nextBranchSequenceNo++;
        }


        //===========================================================
        // Generate Branch Code
        //===========================================================

        return CodeGenerator.GenerateBranchCode(
            companySequenceNo,
            wingSequenceNo,
            nextBranchSequenceNo);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<BranchesDefaultsDto>
        GetDefaultsAsync
        (
            long wingId
        )
    {
        return new BranchesDefaultsDto
        {
            Code =
                await GetNextCodeAsync(
                    wingId)
        };
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateBranchesDto dto,

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
        // Resolve Wing
        //===========================================================

        WingsEntity? wing =

            await _context
                .Set<WingsEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.WingId ==
                        dto.WingId

                        &&

                        x.CompanyId ==
                        dto.CompanyId

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
        // Resolve Branch Code
        //===========================================================

        string branchCode =
            dto.BranchCode?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(branchCode)
        )
        {
            branchCode =
                await GetNextCodeAsync(
                    dto.WingId);
        }


        //===========================================================
        // Begin Transaction
        //===========================================================

        await using var transaction =
            await _context.Database.BeginTransactionAsync();


        try
        {
            //=======================================================
            // Create Branch
            //=======================================================

            BranchesEntity entity =
                new BranchesEntity
                {
                    CompanyId =
                        dto.CompanyId,

                    WingId =
                        dto.WingId,

                    BranchCode =
                        branchCode,

                    ShortName =
                        dto.ShortName?.Trim()
                        ??
                        string.Empty,

                    BranchName =
                        dto.BranchName?.Trim()
                        ??
                        string.Empty,


                    //===================================================
                    // Contact Information
                    //===================================================

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


                    //===================================================
                    // Configuration
                    //===================================================

                    Remarks =
                        dto.Remarks?.Trim()
                        ??
                        string.Empty,


                    //===================================================
                    // Status
                    //===================================================

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
                .Set<BranchesEntity>()
                .Add(
                    entity
                );


            await _context.SaveChangesAsync();


            //=======================================================
            // Resolve Warehouse Code
            //=======================================================

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


            //=======================================================
            // Create First Warehouse Automatically
            //=======================================================

            string warehouseCode =
                CodeGenerator.GenerateWarehouseCode(
                    companySequenceNo,
                    wingSequenceNo,
                    GetBranchSequence(
                        branchCode),
                    1);


            string warehouseDisplayName =
                $"{entity.ShortName} Warehouse";


            WarehousesEntity warehouse =
                new WarehousesEntity
                {
                    CompanyId =
                        entity.CompanyId,

                    WingId =
                        entity.WingId,

                    BranchId =
                        entity.BranchId,

                    WarehouseCode =
                        warehouseCode,

                    WarehouseName =
                        warehouseDisplayName,

                    DisplayName =
                        warehouseDisplayName,

                    Mobile =
                        string.Empty,

                    Email =
                        string.Empty,

                    Address =
                        string.Empty,

                    IsBranchGenerated =
                        true,

                    IsDefault =
                        true,

                    Remarks =
                        string.Empty,

                    IsActive =
                        true,

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
                    warehouse
                );


            await _context.SaveChangesAsync();


            //=======================================================
            // Activity History - Branch
            //=======================================================

            _context.ActivityHistories.Add(

                new ActivityHistory
                {
                    Module =
                        "General Settings",

                    EntityName =
                        "Branch",

                    EntityId =
                        entity.BranchId,

                    ActivityType =
                        "Create",

                    ActivityTitle =
                        "Branch Created",

                    ActivityDescription =
                        $"Branch '{entity.BranchName}' created.",

                    PerformedBy =
                        userId,

                    PerformedByName =
                        "System",

                    PerformedDate =
                        DateTime.UtcNow
                }
            );


            //=======================================================
            // Activity History - Warehouse
            //=======================================================

            _context.ActivityHistories.Add(

                new ActivityHistory
                {
                    Module =
                        "General Settings",

                    EntityName =
                        "Warehouse",

                    EntityId =
                        warehouse.WarehouseId,

                    ActivityType =
                        "Create",

                    ActivityTitle =
                        "Warehouse Created",

                    ActivityDescription =
                        $"Default warehouse '{warehouse.DisplayName}' created for branch '{entity.BranchName}'.",

                    PerformedBy =
                        userId,

                    PerformedByName =
                        "System",

                    PerformedDate =
                        DateTime.UtcNow
                }
            );


            await _context.SaveChangesAsync();


            //=======================================================
            // Commit Transaction
            //=======================================================

            await transaction.CommitAsync();


            return entity.BranchId;
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateBranchesDto dto,

            long userId
        )
    {
        //===========================================================
        // Resolve Branch
        //===========================================================

        BranchesEntity? entity =

            await _context
                .Set<BranchesEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.BranchId ==
                        dto.BranchId

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
                "Branch not found."
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
        // Resolve Wing
        //===========================================================

        WingsEntity? wing =

            await _context
                .Set<WingsEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.WingId ==
                        dto.WingId

                        &&

                        x.CompanyId ==
                        dto.CompanyId

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
        // Update Branch Information
        //===========================================================

        entity.BranchCode =
            dto.BranchCode?.Trim()
            ??
            string.Empty;


        entity.ShortName =
            dto.ShortName?.Trim()
            ??
            string.Empty;


        entity.BranchName =
            dto.BranchName?.Trim()
            ??
            string.Empty;


        //===========================================================
        // Contact Information
        //===========================================================

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
        // Update Branch Generated Warehouse
        //===========================================================

        WarehousesEntity? warehouse =

            await _context
                .Set<WarehousesEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.BranchId ==
                        entity.BranchId

                        &&

                        x.IsBranchGenerated

                        &&

                        !x.IsDeleted
                );


        if
        (
            warehouse !=
            null
        )
        {
            string warehouseDisplayName =
                $"{entity.ShortName} Warehouse";


            warehouse.CompanyId =
                entity.CompanyId;


            warehouse.WingId =
                entity.WingId;


            warehouse.WarehouseName =
                warehouseDisplayName;


            warehouse.DisplayName =
                warehouseDisplayName;


            warehouse.ModifiedBy =
                userId;


            warehouse.ModifiedDate =
                DateTime.UtcNow;


            await _context.SaveChangesAsync();
        }


        //===========================================================
        // Activity History
        //===========================================================

        _context.ActivityHistories.Add(

            new ActivityHistory
            {
                Module =
                    "General Settings",

                EntityName =
                    "Branch",

                EntityId =
                    entity.BranchId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Branch Updated",

                ActivityDescription =
                    $"Branch '{entity.BranchName}' updated.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        //===========================================================
        // Warehouse Activity History
        //===========================================================

        if
        (
            warehouse !=
            null
        )
        {
            _context.ActivityHistories.Add(

                new ActivityHistory
                {
                    Module =
                        "General Settings",

                    EntityName =
                        "Warehouse",

                    EntityId =
                        warehouse.WarehouseId,

                    ActivityType =
                        "Update",

                    ActivityTitle =
                        "Branch Generated Warehouse Updated",

                    ActivityDescription =
                        $"Warehouse '{warehouse.DisplayName}' updated automatically from Branch '{entity.BranchName}'.",

                    PerformedBy =
                        userId,

                    PerformedByName =
                        "System",

                    PerformedDate =
                        DateTime.UtcNow
                }
            );
        }


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
        // Resolve Branch
        //===========================================================

        BranchesEntity? entity =

            await _context
                .Set<BranchesEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.BranchId ==
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
                "Branch not found."
            );
        }


        //===========================================================
        // Soft Delete Branch
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
                    "Branch",

                EntityId =
                    entity.BranchId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Branch Deleted",

                ActivityDescription =
                    $"Branch '{entity.BranchName}' deleted.",

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
        BranchesEntity? entity =

            await _context
                .Set<BranchesEntity>()

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
                    "Branch",

                EntityId =
                    entity.BranchId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Branch Restored",

                ActivityDescription =
                    $"Branch '{entity.BranchName}' restored.",

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
            .Set<BranchesEntity>()

            .AnyAsync
            (
                x =>

                    x.BranchId ==
                    id

                    &&

                    !x.IsDeleted
            );
    }


    //===========================================================
    // Get Branch Sequence
    //===========================================================

    private int GetBranchSequence(
        string branchCode)
    {
        string sequence =
            branchCode
                .Replace(
                    "BRN-",
                    "",
                    StringComparison.OrdinalIgnoreCase);


        string[] parts =
            sequence.Split('-');


        if
        (
            parts.Length != 3

            ||

            !int.TryParse(
                parts[2],
                out int branchSequenceNo)
        )
        {
            throw new InvalidOperationException(
                "Invalid branch code."
            );
        }


        return branchSequenceNo;
    }
}