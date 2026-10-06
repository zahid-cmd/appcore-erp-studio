//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.AccountGroup.DTOs;

using AccountGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup;

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
// Account Group Repository
//===============================================================

public class AccountGroupRepository : IAccountGroupRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public AccountGroupRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Account Group Query
    //===========================================================

    private IQueryable<AccountGroupDto> AccountGroupQuery()
    {
        return _context
            .Set<AccountGroupEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new AccountGroupDto
                    {
                        AccountGroupId =
                            x.AccountGroupId,

                        AccountClassId =
                            x.AccountClassId,

                        AccountClassName =
                            _context
                                .Set<AccountClassEntity>()
                                .Where
                                (
                                    c =>
                                        c.AccountClassId ==
                                        x.AccountClassId
                                )
                                .Select
                                (
                                    c =>
                                        c.ClassName
                                )
                                .FirstOrDefault()
                                ??
                                string.Empty,

                        ClassCode =
                            x.ClassCode,

                        Mode =
                            x.Mode,

                        GroupCode =
                            x.GroupCode,

                        GroupName =
                            x.GroupName,

                        AllowManualSubGroup =
                            x.AllowManualSubGroup,

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

    public async Task<List<AccountGroupDto>>
        GetAllAsync()
    {
        return await AccountGroupQuery()
            .OrderBy
            (
                x =>
                    x.GroupCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<AccountGroupDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await AccountGroupQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.AccountGroupId ==
                    id
            );
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync(
            long accountClassId)
    {
        //=======================================================
        // Resolve Account Class
        //=======================================================

        AccountClassEntity? accountClass =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountClassId ==
                        accountClassId
                        &&
                        !x.IsDeleted
                );

        if
        (
            accountClass ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Account Class not found."
            );
        }


        //=======================================================
        // Validate Manual Group Creation
        //=======================================================

        if
        (
            !accountClass.IsActive
        )
        {
            throw new InvalidOperationException(
                "The selected Account Class is inactive."
            );
        }


        if
        (
            !accountClass.AllowManualGroupCreation
        )
        {
            throw new InvalidOperationException(
                "Manual Account Group creation is not allowed for the selected Account Class."
            );
        }


        //=======================================================
        // Resolve Class Sequence
        //=======================================================

        string classCode =
            accountClass.ClassCode?.Trim()
            ??
            string.Empty;

        string[] classCodeParts =
            classCode.Split(
                '-',
                StringSplitOptions.RemoveEmptyEntries);

        if
        (
            classCodeParts.Length !=
            2
        )
        {
            throw new InvalidOperationException(
                "Invalid Account Class code."
            );
        }


        if
        (
            !int.TryParse(
                classCodeParts[1].Trim(),
                out int classSequenceNo)
            ||
            classSequenceNo < 1
        )
        {
            throw new InvalidOperationException(
                "Invalid Account Class sequence number."
            );
        }


        //=======================================================
        // Existing Group Codes
        //=======================================================

        List<string> existingCodes =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.AccountClassId ==
                        accountClassId
                )
                .Select
                (
                    x =>
                        x.GroupCode
                )
                .ToListAsync();


        //=======================================================
        // Resolve Highest Group Sequence
        //=======================================================

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
                3
            )
            {
                continue;
            }

            if
            (
                !string.Equals(
                    parts[0].Trim(),
                    "GRP",
                    StringComparison.OrdinalIgnoreCase)
            )
            {
                continue;
            }

            if
            (
                !string.Equals(
                    parts[1].Trim(),
                    classSequenceNo.ToString("D3"),
                    StringComparison.OrdinalIgnoreCase)
            )
            {
                continue;
            }

            if
            (
                int.TryParse(
                    parts[2].Trim(),
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


        //=======================================================
        // Generate Next Group Code
        //=======================================================

        int nextSequenceNo =
            highestSequenceNo +
            1;

        return CodeGenerator.GenerateAccountGroupCode(
            classSequenceNo,
            nextSequenceNo);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<AccountGroupDefaultsDto>
        GetDefaultsAsync()
    {
        AccountClassEntity? accountClass =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.IsActive
                        &&
                        x.AllowManualGroupCreation
                )
                .OrderBy
                (
                    x =>
                        x.ClassCode
                )
                .FirstOrDefaultAsync();

        if
        (
            accountClass ==
            null
        )
        {
            return new AccountGroupDefaultsDto
            {
                Code = string.Empty
            };
        }

        return new AccountGroupDefaultsDto
        {
            Code =
                await GetNextCodeAsync(
                    accountClass.AccountClassId)
        };
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateAccountGroupDto dto,
            long userId
        )
    {
        //=======================================================
        // Resolve Account Class
        //=======================================================

        AccountClassEntity? accountClass =
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
            accountClass ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Account Class not found."
            );
        }


        //=======================================================
        // Validate Account Class
        //=======================================================

        if
        (
            !accountClass.IsActive
        )
        {
            throw new InvalidOperationException(
                "The selected Account Class is inactive."
            );
        }


        if
        (
            !accountClass.AllowManualGroupCreation
        )
        {
            throw new InvalidOperationException(
                "Manual Account Group creation is not allowed for the selected Account Class."
            );
        }


        //=======================================================
        // Generate Group Code
        //=======================================================

        string groupCode =
            await GetNextCodeAsync(
                accountClass.AccountClassId);


        //=======================================================
        // Create Entity
        //=======================================================

        AccountGroupEntity entity =
            new AccountGroupEntity
            {
                AccountClassId =
                    accountClass.AccountClassId,

                ClassCode =
                    accountClass.ClassCode,

                Mode =
                    accountClass.Mode,

                GroupCode =
                    groupCode,

                GroupName =
                    dto.GroupName?.Trim()
                    ??
                    string.Empty,

                AllowManualSubGroup =
                    dto.AllowManualSubGroup,

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
            .Set<AccountGroupEntity>()
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
                    "Account Group",

                EntityId =
                    entity.AccountGroupId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Account Group Created",

                ActivityDescription =
                    $"Account Group '{entity.GroupName}' created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );

        await _context.SaveChangesAsync();

        return entity.AccountGroupId;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateAccountGroupDto dto,
            long userId
        )
    {
        //=======================================================
        // Resolve Account Group
        //=======================================================

        AccountGroupEntity? entity =
            await _context
                .Set<AccountGroupEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountGroupId ==
                        dto.AccountGroupId
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
                "Account Group not found."
            );
        }


        //=======================================================
        // Resolve Account Class
        //=======================================================

        AccountClassEntity? accountClass =
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
            accountClass ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Account Class not found."
            );
        }


        //=======================================================
        // Validate Account Class
        //=======================================================

        if
        (
            !accountClass.IsActive
        )
        {
            throw new InvalidOperationException(
                "The selected Account Class is inactive."
            );
        }


        if
        (
            !accountClass.AllowManualGroupCreation
        )
        {
            throw new InvalidOperationException(
                "Manual Account Group creation is not allowed for the selected Account Class."
            );
        }


        //=======================================================
        // Update Entity
        //=======================================================

        entity.AccountClassId =
            accountClass.AccountClassId;

        entity.ClassCode =
            accountClass.ClassCode;

        entity.Mode =
            accountClass.Mode;

        entity.GroupName =
            dto.GroupName?.Trim()
            ??
            string.Empty;

        entity.AllowManualSubGroup =
            dto.AllowManualSubGroup;


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
                    "Account Group",

                EntityId =
                    entity.AccountGroupId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Account Group Updated",

                ActivityDescription =
                    $"Account Group '{entity.GroupName}' updated.",

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
        // Resolve Account Group
        //===========================================================

        AccountGroupEntity? entity =
            await _context
                .Set<AccountGroupEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountGroupId ==
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
                "Account Group not found."
            );
        }


        //===========================================================
        // Soft Delete Account Group
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
                    "Account Group",

                EntityId =
                    entity.AccountGroupId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Account Group Deleted",

                ActivityDescription =
                    $"Account Group '{entity.GroupName}' deleted.",

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
        AccountGroupEntity? entity =
            await _context
                .Set<AccountGroupEntity>()
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
                    "Account Group",

                EntityId =
                    entity.AccountGroupId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Account Group Restored",

                ActivityDescription =
                    $"Account Group '{entity.GroupName}' restored.",

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
            .Set<AccountGroupEntity>()
            .AnyAsync
            (
                x =>
                    x.AccountGroupId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}