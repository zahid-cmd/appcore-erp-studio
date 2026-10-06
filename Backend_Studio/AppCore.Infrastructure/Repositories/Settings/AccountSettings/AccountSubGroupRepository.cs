//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.AccountSubGroup.DTOs;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

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
// Account Sub Group Repository
//===============================================================

public class AccountSubGroupRepository : IAccountSubGroupRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public AccountSubGroupRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Account Sub Group Query
    //===========================================================

    private IQueryable<AppCore.Application.Settings.AccountSettings.AccountSubGroup.DTOs.AccountSubGroupDto> AccountSubGroupQuery()
    {
        return _context
            .Set<AccountSubGroupEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new AppCore.Application.Settings.AccountSettings.AccountSubGroup.DTOs.AccountSubGroupDto
                    {
                        AccountSubGroupId =
                            x.AccountSubGroupId,

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

                        AccountGroupId =
                            x.AccountGroupId,

                        AccountGroupName =
                            _context
                                .Set<AccountGroupEntity>()
                                .Where
                                (
                                    g =>
                                        g.AccountGroupId ==
                                        x.AccountGroupId
                                )
                                .Select
                                (
                                    g =>
                                        g.GroupName
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

                        SubGroupCode =
                            x.SubGroupCode,

                        SubGroupName =
                            x.SubGroupName,

                        //===================================================
                        // Configuration
                        //===================================================

                        AllowManualLedger =
                            x.AllowManualLedger,

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

    public async Task<List<AccountSubGroupDto>>
        GetAllAsync()
    {
        return await AccountSubGroupQuery()
            .OrderBy
            (
                x =>
                    x.SubGroupCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<AccountSubGroupDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await AccountSubGroupQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.AccountSubGroupId ==
                    id
            );
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync(
            long accountGroupId)
    {
        //=======================================================
        // Resolve Account Group
        //=======================================================

        AccountGroupEntity? accountGroup =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountGroupId ==
                        accountGroupId
                        &&
                        !x.IsDeleted
                );

        if
        (
            accountGroup ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Account Group not found."
            );
        }


        //=======================================================
        // Validate Account Group
        //=======================================================

        if
        (
            !accountGroup.IsActive
        )
        {
            throw new InvalidOperationException(
                "The selected Account Group is inactive."
            );
        }


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
                        accountGroup.AccountClassId
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
                "The parent Account Class is inactive."
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
        // Resolve Group Sequence
        //=======================================================

        string groupCode =
            accountGroup.GroupCode?.Trim()
            ??
            string.Empty;

        string[] groupCodeParts =
            groupCode.Split(
                '-',
                StringSplitOptions.RemoveEmptyEntries);

        if
        (
            groupCodeParts.Length !=
            3
        )
        {
            throw new InvalidOperationException(
                "Invalid Account Group code."
            );
        }


        if
        (
            !string.Equals(
                groupCodeParts[0].Trim(),
                "GRP",
                StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                "Invalid Account Group code prefix."
            );
        }


        if
        (
            !string.Equals(
                groupCodeParts[1].Trim(),
                classSequenceNo.ToString("D3"),
                StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                "Account Group does not belong to the selected Account Class."
            );
        }


        if
        (
            !int.TryParse(
                groupCodeParts[2].Trim(),
                out int groupSequenceNo)
            ||
            groupSequenceNo < 1
        )
        {
            throw new InvalidOperationException(
                "Invalid Account Group sequence number."
            );
        }


        //=======================================================
        // Existing Sub Group Codes
        //=======================================================

        List<string> existingCodes =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.AccountGroupId ==
                        accountGroupId
                )
                .Select
                (
                    x =>
                        x.SubGroupCode
                )
                .ToListAsync();


        //=======================================================
        // Resolve Highest Sub Group Sequence
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
                4
            )
            {
                continue;
            }


            if
            (
                !string.Equals(
                    parts[0].Trim(),
                    "SUB",
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
                !string.Equals(
                    parts[2].Trim(),
                    groupSequenceNo.ToString("D3"),
                    StringComparison.OrdinalIgnoreCase)
            )
            {
                continue;
            }


            if
            (
                int.TryParse(
                    parts[3].Trim(),
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
        // Generate Next Sub Group Code
        //=======================================================

        int nextSequenceNo =
            highestSequenceNo +
            1;

        return CodeGenerator.GenerateAccountSubGroupCode(
            classSequenceNo,
            groupSequenceNo,
            nextSequenceNo);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<AccountSubGroupDefaultsDto>
        GetDefaultsAsync()
    {
        AccountGroupEntity? accountGroup =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.IsActive
                )
                .OrderBy
                (
                    x =>
                        x.GroupCode
                )
                .FirstOrDefaultAsync();

        if
        (
            accountGroup ==
            null
        )
        {
            return new AccountSubGroupDefaultsDto
            {
                Code = string.Empty
            };
        }


        return new AccountSubGroupDefaultsDto
        {
            Code =
                await GetNextCodeAsync(
                    accountGroup.AccountGroupId)
        };
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateAccountSubGroupDto dto,
            long userId
        )
    {
        //=======================================================
        // Resolve Account Group
        //=======================================================

        AccountGroupEntity? accountGroup =
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
            accountGroup ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Account Group not found."
            );
        }


        //=======================================================
        // Validate Account Group
        //=======================================================

        if
        (
            !accountGroup.IsActive
        )
        {
            throw new InvalidOperationException(
                "The selected Account Group is inactive."
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
                        accountGroup.AccountClassId
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
                "The parent Account Class is inactive."
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
        // Generate Sub Group Code
        //=======================================================

        string subGroupCode =
            await GetNextCodeAsync(
                accountGroup.AccountGroupId);


        //=======================================================
        // Create Entity
        //=======================================================

        AccountSubGroupEntity entity =
            new AccountSubGroupEntity
            {
                AccountClassId =
                    accountClass.AccountClassId,

                AccountGroupId =
                    accountGroup.AccountGroupId,

                ClassCode =
                    accountClass.ClassCode,

                Mode =
                    accountClass.Mode,

                GroupCode =
                    accountGroup.GroupCode,

                SubGroupCode =
                    subGroupCode,

                SubGroupName =
                    dto.SubGroupName?.Trim()
                    ??
                    string.Empty,

                //=======================================================
                // Configuration
                //=======================================================

                AllowManualLedger =
                    dto.AllowManualLedger,

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
            .Set<AccountSubGroupEntity>()
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
                    "Account Sub Group",

                EntityId =
                    entity.AccountSubGroupId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Account Sub Group Created",

                ActivityDescription =
                    $"Account Sub Group '{entity.SubGroupName}' created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );

        await _context.SaveChangesAsync();

        return entity.AccountSubGroupId;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateAccountSubGroupDto dto,
            long userId
        )
    {
        //=======================================================
        // Resolve Account Sub Group
        //=======================================================

        AccountSubGroupEntity? entity =
            await _context
                .Set<AccountSubGroupEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountSubGroupId ==
                        dto.AccountSubGroupId
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
                "Account Sub Group not found."
            );
        }


        //=======================================================
        // Resolve Account Group
        //=======================================================

        AccountGroupEntity? accountGroup =
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
            accountGroup ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Account Group not found."
            );
        }


        //=======================================================
        // Validate Account Group
        //=======================================================

        if
        (
            !accountGroup.IsActive
        )
        {
            throw new InvalidOperationException(
                "The selected Account Group is inactive."
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
                        accountGroup.AccountClassId
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
                "The parent Account Class is inactive."
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
        // Validate Parent Consistency
        //=======================================================

        if
        (
            entity.AccountGroupId !=
            accountGroup.AccountGroupId
        )
        {
            throw new InvalidOperationException(
                "The selected Account Group does not match the existing Account Sub Group."
            );
        }


        if
        (
            entity.AccountClassId !=
            accountClass.AccountClassId
        )
        {
            throw new InvalidOperationException(
                "The selected Account Class does not match the existing Account Sub Group."
            );
        }


        //=======================================================
        // Update Entity
        //=======================================================

        entity.AccountClassId =
            accountClass.AccountClassId;

        entity.AccountGroupId =
            accountGroup.AccountGroupId;

        entity.ClassCode =
            accountClass.ClassCode;

        entity.Mode =
            accountClass.Mode;

        entity.GroupCode =
            accountGroup.GroupCode;

        entity.SubGroupName =
            dto.SubGroupName?.Trim()
            ??
            string.Empty;

        //===========================================================
        // Configuration
        //===========================================================

        entity.AllowManualLedger =
            dto.AllowManualLedger;

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
                    "Account Sub Group",

                EntityId =
                    entity.AccountSubGroupId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Account Sub Group Updated",

                ActivityDescription =
                    $"Account Sub Group '{entity.SubGroupName}' updated.",

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
        //=======================================================
        // Resolve Account Sub Group
        //=======================================================

        AccountSubGroupEntity? entity =
            await _context
                .Set<AccountSubGroupEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountSubGroupId ==
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
                "Account Sub Group not found."
            );
        }


        //=======================================================
        // Soft Delete Account Sub Group
        //=======================================================

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
                    "Account Sub Group",

                EntityId =
                    entity.AccountSubGroupId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Account Sub Group Deleted",

                ActivityDescription =
                    $"Account Sub Group '{entity.SubGroupName}' deleted.",

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
        AccountSubGroupEntity? entity =
            await _context
                .Set<AccountSubGroupEntity>()
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
                    "Account Sub Group",

                EntityId =
                    entity.AccountSubGroupId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Account Sub Group Restored",

                ActivityDescription =
                    $"Account Sub Group '{entity.SubGroupName}' restored.",

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
            .Set<AccountSubGroupEntity>()
            .AnyAsync
            (
                x =>
                    x.AccountSubGroupId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}
