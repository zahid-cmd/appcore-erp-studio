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

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using AppCore.Infrastructure.Persistence;
using AppCore.Domain.Common;
using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.AccountSettings;


//===============================================================
// Account Group Repository
//
// Code      : GRP-<ccc>-<ggg>          e.g. GRP-001-001
//             ccc = the number part of the parent class code
//                   (CLS-001 → 001, CLS-002 → 002)
//             ggg = the group's own number inside that class
// Numbering : restarts at 001 for every Account Class. Deleted
//             rows are included, so a number is never reused and
//             a restore can never clash.
// Parent    : only classes of type 'Account' that are active and
//             allow manual group creation. Groups of the
//             Inventory / WIP / COGS classes are created from
//             Product Category, never from this page.
// Locked    : the parent class (and so the code) cannot change
//             after the group is saved.
// Name      : unique within its class.
//===============================================================

public class AccountGroupRepository : IAccountGroupRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string GroupPrefix =
        "GRP";

    private const string AccountClassType =
        "Account";


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
    // Resolve Parent Class For A New Group
    //
    // The class must exist, be of type 'Account', be active and
    // allow manual group creation.
    //===========================================================

    private async Task<AccountClassEntity>
        ResolveParentClassAsync
        (
            long accountClassId
        )
    {
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
                "Account Class not found.");
        }


        if
        (
            !string.Equals(
                accountClass.ClassType?.Trim(),
                AccountClassType,
                StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                $"Groups of the {accountClass.ClassType} class '{accountClass.ClassName}' are created from Product Category, not from Account Group.");
        }


        if
        (
            !accountClass.IsActive
        )
        {
            throw new InvalidOperationException(
                "The selected Account Class is inactive.");
        }


        if
        (
            !accountClass.AllowManualGroupCreation
        )
        {
            throw new InvalidOperationException(
                "Manual Account Group creation is not allowed for the selected Account Class.");
        }


        return accountClass;
    }


    //===========================================================
    // Class Sequence From Class Code
    //
    // CLS-001 → 1. The number part is always the last segment.
    //===========================================================

    private static int ResolveClassSequence
    (
        string? classCode
    )
    {
        string[] parts =
            (classCode ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

        if
        (
            parts.Length !=
            2
            ||
            !int.TryParse(
                parts[1].Trim(),
                out int classSequenceNo)
            ||
            classSequenceNo < 1
        )
        {
            throw new InvalidOperationException(
                $"Invalid Account Class code '{classCode}'.");
        }

        return classSequenceNo;
    }


    //===========================================================
    // Highest Group Sequence Within A Class
    //
    // Reads the last part of every GRP-ccc-ggg code under this
    // class, deleted rows included.
    //===========================================================

    private async Task<int>
        GetHighestSequenceAsync
        (
            long accountClassId,
            int classSequenceNo
        )
    {
        List<string> codes =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.AccountClassId ==
                        accountClassId
                )
                .Select
                (
                    x =>
                        x.GroupCode
                )
                .ToListAsync();


        string classPart =
            classSequenceNo.ToString("D3");

        int highestSequenceNo =
            0;

        foreach
        (
            string code
            in codes
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
                ||
                !string.Equals(
                    parts[0].Trim(),
                    GroupPrefix,
                    StringComparison.OrdinalIgnoreCase)
                ||
                parts[1].Trim() !=
                classPart
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

        return highestSequenceNo;
    }


    //===========================================================
    // Build Next Code For A Resolved Class
    //===========================================================

    private async Task<string>
        BuildNextCodeAsync
        (
            AccountClassEntity accountClass
        )
    {
        int classSequenceNo =
            ResolveClassSequence(
                accountClass.ClassCode);

        int highestSequenceNo =
            await GetHighestSequenceAsync(
                accountClass.AccountClassId,
                classSequenceNo);

        return CodeGenerator.GenerateAccountGroupCode(
            classSequenceNo,
            highestSequenceNo + 1);
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync
        (
            long accountClassId
        )
    {
        AccountClassEntity accountClass =
            await ResolveParentClassAsync(
                accountClassId);

        return await BuildNextCodeAsync(
            accountClass);
    }


    //===========================================================
    // Get Defaults
    //
    // Next code of the first class a group can be created under
    // (empty when there is none yet).
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
                        &&
                        x.ClassType ==
                        AccountClassType
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
                Code =
                    string.Empty
            };
        }

        return new AccountGroupDefaultsDto
        {
            Code =
                await BuildNextCodeAsync(
                    accountClass)
        };
    }


    //===========================================================
    // Normalize Group Name
    //===========================================================

    private static string NormalizeGroupName
    (
        string? groupName
    )
    {
        string name =
            groupName?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(name)
        )
        {
            throw new InvalidOperationException(
                "Group Name is required.");
        }

        if
        (
            name.Length >
            200
        )
        {
            throw new InvalidOperationException(
                "Group Name cannot be longer than 200 characters.");
        }

        return name;
    }


    //===========================================================
    // Validate Unique Name / Code
    //
    // Group Name is unique within its class; Group Code is
    // unique everywhere. Only non-deleted rows are compared.
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            long accountClassId,
            string groupCode,
            string groupName,
            long excludeId
        )
    {
        string lowerName =
            groupName.ToLower();

        AccountGroupEntity? sameName =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.AccountGroupId !=
                        excludeId
                        &&
                        x.AccountClassId ==
                        accountClassId
                        &&
                        x.GroupName.ToLower() ==
                        lowerName
                );

        if
        (
            sameName !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Account Group '{groupName}' already exists in this class ({sameName.GroupCode}).");
        }


        bool codeTaken =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.AccountGroupId !=
                        excludeId
                        &&
                        x.GroupCode ==
                        groupCode
                );

        if
        (
            codeTaken
        )
        {
            throw new InvalidOperationException(
                $"Group Code '{groupCode}' is already in use.");
        }
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

        AccountClassEntity accountClass =
            await ResolveParentClassAsync(
                dto.AccountClassId);


        //=======================================================
        // Validate
        //=======================================================

        string groupName =
            NormalizeGroupName(
                dto.GroupName);


        //=======================================================
        // Generate Group Code (server side, never from the form)
        //=======================================================

        string groupCode =
            await BuildNextCodeAsync(
                accountClass);


        await EnsureUniqueAsync(
            accountClass.AccountClassId,
            groupCode,
            groupName,
            0);


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
                    groupName,

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
                    $"Account Group '{entity.GroupName}' ({entity.GroupCode}) created.",

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
                "Account Group not found.");
        }


        //=======================================================
        // Parent Class Is Locked
        //
        // The code is built from the class number, so moving a
        // group to another class would break its code.
        //=======================================================

        if
        (
            dto.AccountClassId > 0
            &&
            dto.AccountClassId !=
            entity.AccountClassId
        )
        {
            throw new InvalidOperationException(
                "Account Class cannot be changed after the group is created.");
        }


        //=======================================================
        // Refresh Class Snapshot (Mode / Class Code)
        //=======================================================

        AccountClassEntity? accountClass =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountClassId ==
                        entity.AccountClassId
                );

        if
        (
            accountClass !=
            null
        )
        {
            entity.ClassCode =
                accountClass.ClassCode;

            entity.Mode =
                accountClass.Mode;
        }


        //=======================================================
        // Validate
        //=======================================================

        string groupName =
            NormalizeGroupName(
                dto.GroupName);

        await EnsureUniqueAsync(
            entity.AccountClassId,
            entity.GroupCode,
            groupName,
            entity.AccountGroupId);


        //=======================================================
        // Update Entity
        //=======================================================

        entity.GroupName =
            groupName;

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
                    $"Account Group '{entity.GroupName}' ({entity.GroupCode}) updated.",

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
                "Account Group not found.");
        }


        //===========================================================
        // Dependency Check : Account Sub Groups
        //
        // A soft delete is an UPDATE, so the database foreign key
        // never fires. Block the delete here while any
        // non-deleted Account Sub Group still belongs to this group.
        //===========================================================

        int accountSubGroupCount =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .CountAsync
                (
                    x =>
                        x.AccountGroupId ==
                        id
                        &&
                        !x.IsDeleted
                );

        if
        (
            accountSubGroupCount >
            0
        )
        {
            throw new InvalidOperationException(
                $"Account Group '{entity.GroupName}' cannot be deleted because " +
                $"{accountSubGroupCount} account sub group(s) are created under it. " +
                "Delete those account sub groups first.");
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
                    $"Account Group '{entity.GroupName}' ({entity.GroupCode}) deleted.",

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
    //
    // Restores the most recently deleted group. Blocked (409)
    // while its class is deleted, or its name / code is taken.
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


        //=======================================================
        // Parent Class Must Exist
        //=======================================================

        bool classExists =
            await _context
                .Set<AccountClassEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        x.AccountClassId ==
                        entity.AccountClassId
                        &&
                        !x.IsDeleted
                );

        if
        (
            !classExists
        )
        {
            throw new InvalidOperationException(
                $"Account Group '{entity.GroupName}' cannot be restored. " +
                "Its Account Class is deleted; restore the class first.");
        }


        //=======================================================
        // Name / Code Must Be Free
        //=======================================================

        try
        {
            await EnsureUniqueAsync(
                entity.AccountClassId,
                entity.GroupCode,
                entity.GroupName,
                entity.AccountGroupId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Account Group '{entity.GroupName}' cannot be restored. {ex.Message}");
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
                    $"Account Group '{entity.GroupName}' ({entity.GroupCode}) restored.",

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