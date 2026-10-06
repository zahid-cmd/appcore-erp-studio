//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.AccountClass.DTOs;

using AccountClassEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountClass;

using AppCore.Infrastructure.Persistence;
using AppCore.Domain.Common;
using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.AccountSettings;


//===============================================================
// Account Class Repository
//===============================================================

public class AccountClassRepository : IAccountClassRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public AccountClassRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Account Class Query
    //===========================================================

    private IQueryable<AccountClassDto> AccountClassQuery()
    {
        return _context
            .Set<AccountClassEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new AccountClassDto
                    {
                        AccountClassId =
                            x.AccountClassId,

                        ClassType =
                            x.ClassType,

                        ClassCode =
                            x.ClassCode,

                        ClassName =
                            x.ClassName,

                        Mode =
                            x.Mode,

                        ClassPrefix =
                            x.ClassPrefix,

                        AllowManualGroupCreation =
                            x.AllowManualGroupCreation,

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

    public async Task<List<AccountClassDto>>
        GetAllAsync()
    {
        return await AccountClassQuery()
            .OrderBy
            (
                x =>
                    x.ClassCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<AccountClassDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await AccountClassQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.AccountClassId ==
                    id
            );
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync(
            string classType)
    {
        string normalizedClassType =
            classType?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(normalizedClassType)
        )
        {
            normalizedClassType =
                "Account Class";
        }

        string prefix =
            string.Equals(
                normalizedClassType,
                "Inventory Class",
                StringComparison.OrdinalIgnoreCase)
                    ?
                        "INV"
                    :
                        "ACC";

        List<string> existingCodes =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.ClassType ==
                        normalizedClassType
                )
                .Select
                (
                    x =>
                        x.ClassCode
                )
                .ToListAsync();

        int highestSequenceNo =
            0;

        foreach
        (
            string code
            in existingCodes
        )
        {
            if
            (
                string.IsNullOrWhiteSpace(code)
            )
            {
                continue;
            }

            string[] parts =
                code.Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

            if
            (
                parts.Length !=
                2
            )
            {
                continue;
            }

            if
            (
                !string.Equals(
                    parts[0].Trim(),
                    prefix,
                    StringComparison.OrdinalIgnoreCase)
            )
            {
                continue;
            }

            if
            (
                int.TryParse(
                    parts[1].Trim(),
                    out int sequenceNo)
                &&
                sequenceNo >
                highestSequenceNo
            )
            {
                highestSequenceNo =
                    sequenceNo;
            }
        }

        int nextSequenceNo =
            highestSequenceNo +
            1;

        return
            CodeGenerator.GenerateAccountClassCode(
                nextSequenceNo,
                normalizedClassType);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<AccountClassDefaultsDto>
        GetDefaultsAsync()
    {
        return new AccountClassDefaultsDto
        {
            Code =
                await GetNextCodeAsync(
                    "Account Class")
        };
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateAccountClassDto dto,
            long userId
        )
    {
        string classType =
            dto.ClassType?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(classType)
        )
        {
            classType =
                "Account Class";
        }

        string classPrefix =
            string.Equals(
                classType,
                "Inventory Class",
                StringComparison.OrdinalIgnoreCase)
                    ?
                        "INV"
                    :
                        "ACC";

        string classCode =
            dto.ClassCode?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(classCode)
        )
        {
            classCode =
                await GetNextCodeAsync(
                    classType);
        }

        AccountClassEntity entity =
            new AccountClassEntity
            {
                ClassType =
                    classType,

                ClassCode =
                    classCode,

                ClassName =
                    dto.ClassName?.Trim()
                    ??
                    string.Empty,

                Mode =
                    dto.Mode?.Trim()
                    ??
                    string.Empty,

                ClassPrefix =
                    classPrefix,

                AllowManualGroupCreation =
                    dto.AllowManualGroupCreation,

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
            .Set<AccountClassEntity>()
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
                    "Account Settings",

                EntityName =
                    "Account Class",

                EntityId =
                    entity.AccountClassId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Account Class Created",

                ActivityDescription =
                    $"Account Class '{entity.ClassName}' created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );

        await _context.SaveChangesAsync();

        return entity.AccountClassId;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateAccountClassDto dto,
            long userId
        )
    {
        AccountClassEntity? entity =
            await _context
                .Set<AccountClassEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountClassId ==
                        dto.AccountClassId
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
                "Account Class not found."
            );
        }

        string classType =
            dto.ClassType?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(classType)
        )
        {
            classType =
                "Account Class";
        }

        string classPrefix =
            string.Equals(
                classType,
                "Inventory Class",
                StringComparison.OrdinalIgnoreCase)
                    ?
                        "INV"
                    :
                        "ACC";

        entity.ClassType =
            classType;

        entity.ClassCode =
            dto.ClassCode?.Trim()
            ??
            string.Empty;

        entity.ClassName =
            dto.ClassName?.Trim()
            ??
            string.Empty;

        entity.Mode =
            dto.Mode?.Trim()
            ??
            string.Empty;

        entity.ClassPrefix =
            classPrefix;

        entity.AllowManualGroupCreation =
            dto.AllowManualGroupCreation;

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
                    "Account Settings",

                EntityName =
                    "Account Class",

                EntityId =
                    entity.AccountClassId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Account Class Updated",

                ActivityDescription =
                    $"Account Class '{entity.ClassName}' updated.",

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
        // Resolve Account Class
        //===========================================================

        AccountClassEntity? entity =
            await _context
                .Set<AccountClassEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountClassId ==
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
                "Account Class not found."
            );
        }

        //===========================================================
        // Soft Delete Account Class
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
                    "Account Settings",

                EntityName =
                    "Account Class",

                EntityId =
                    entity.AccountClassId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Account Class Deleted",

                ActivityDescription =
                    $"Account Class '{entity.ClassName}' deleted.",

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
        AccountClassEntity? entity =
            await _context
                .Set<AccountClassEntity>()
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
                    "Account Settings",

                EntityName =
                    "Account Class",

                EntityId =
                    entity.AccountClassId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Account Class Restored",

                ActivityDescription =
                    $"Account Class '{entity.ClassName}' restored.",

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
            .Set<AccountClassEntity>()
            .AnyAsync
            (
                x =>
                    x.AccountClassId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}