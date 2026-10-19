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

//---------------------------------------------------------------
// Ledger Entities (dependents of Account Sub Group)
//---------------------------------------------------------------

using GeneralLedgerEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.GeneralLedgers;

using CashAccountEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.CashAccounts;

using BankAccountEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.BankAccounts;

using AppCore.Infrastructure.Persistence;
using AppCore.Domain.Common;
using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.AccountSettings;


//===============================================================
// Account Sub Group Repository
//
// Code      : SUB-<ccc>-<ggg>-<sss>    e.g. SUB-001-001-001
//             ccc = parent class number   (CLS-001     → 001)
//             ggg = parent group number   (GRP-001-002 → 002)
//             sss = the sub group's own number inside that group
// Numbering : restarts at 001 for every Account Group. Deleted
//             rows are included, so a number is never reused and
//             a restore can never clash.
// Parent    : groups of 'Account' type classes only, that are
//             active and allow manual sub groups. Sub groups of
//             the Inventory / WIP / COGS classes are created from
//             Product Sub Category, never from this page.
// Locked    : the parent class and group (and so the code)
//             cannot change after the sub group is saved.
// Name      : unique within its group.
//===============================================================

public class AccountSubGroupRepository : IAccountSubGroupRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string GroupPrefix =
        "GRP";

    private const string SubGroupPrefix =
        "SUB";

    private const string AccountClassType =
        "Account";


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
    // Resolve Parent Group / Class For A New Sub Group
    //
    // The group must exist, be active and allow manual sub
    // groups. Its class must exist, be of type 'Account' and be
    // active. Sub groups of the Inventory / WIP / COGS classes
    // are created from Product Sub Category, never from here.
    //===========================================================

    private async Task<(AccountGroupEntity Group, AccountClassEntity Class)>
        ResolveParentAsync
        (
            long accountGroupId
        )
    {
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
                "Account Group not found.");
        }


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
                "Parent Account Class not found.");
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
                $"Sub groups of the {accountClass.ClassType} class '{accountClass.ClassName}' are created from Product Sub Category, not from Account Sub Group.");
        }


        if
        (
            !accountClass.IsActive
        )
        {
            throw new InvalidOperationException(
                "The parent Account Class is inactive.");
        }


        if
        (
            !accountGroup.IsActive
        )
        {
            throw new InvalidOperationException(
                "The selected Account Group is inactive.");
        }


        if
        (
            !accountGroup.AllowManualSubGroup
        )
        {
            throw new InvalidOperationException(
                "Manual Account Sub Group creation is not allowed for the selected Account Group.");
        }


        return (accountGroup, accountClass);
    }


    //===========================================================
    // Class / Group Sequence From Group Code
    //
    // GRP-001-002 → (1, 2). The class part must match the
    // parent class code (CLS-001 → 001).
    //===========================================================

    private static (int ClassSequenceNo, int GroupSequenceNo)
        ResolveSequences
        (
            string? classCode,
            string? groupCode
        )
    {
        string[] classParts =
            (classCode ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

        if
        (
            classParts.Length !=
            2
            ||
            !int.TryParse(
                classParts[1].Trim(),
                out int classSequenceNo)
            ||
            classSequenceNo < 1
        )
        {
            throw new InvalidOperationException(
                $"Invalid Account Class code '{classCode}'.");
        }


        string[] groupParts =
            (groupCode ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries);

        if
        (
            groupParts.Length !=
            3
            ||
            !string.Equals(
                groupParts[0].Trim(),
                GroupPrefix,
                StringComparison.OrdinalIgnoreCase)
            ||
            !int.TryParse(
                groupParts[1].Trim(),
                out int groupClassNo)
            ||
            groupClassNo !=
            classSequenceNo
            ||
            !int.TryParse(
                groupParts[2].Trim(),
                out int groupSequenceNo)
            ||
            groupSequenceNo < 1
        )
        {
            throw new InvalidOperationException(
                $"Invalid Account Group code '{groupCode}' for class '{classCode}'.");
        }


        return (classSequenceNo, groupSequenceNo);
    }


    //===========================================================
    // Highest Sub Group Sequence Within A Group
    //
    // Reads the last part of every SUB-ccc-ggg-sss code under
    // this group, deleted rows included.
    //===========================================================

    private async Task<int>
        GetHighestSequenceAsync
        (
            long accountGroupId,
            int classSequenceNo,
            int groupSequenceNo
        )
    {
        List<string> codes =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.AccountGroupId ==
                        accountGroupId
                )
                .Select
                (
                    x =>
                        x.SubGroupCode
                )
                .ToListAsync();


        string classPart =
            classSequenceNo.ToString("D3");

        string groupPart =
            groupSequenceNo.ToString("D3");

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
                4
                ||
                !string.Equals(
                    parts[0].Trim(),
                    SubGroupPrefix,
                    StringComparison.OrdinalIgnoreCase)
                ||
                parts[1].Trim() !=
                classPart
                ||
                parts[2].Trim() !=
                groupPart
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

        return highestSequenceNo;
    }


    //===========================================================
    // Build Next Code For A Resolved Group
    //===========================================================

    private async Task<string>
        BuildNextCodeAsync
        (
            AccountGroupEntity accountGroup,
            AccountClassEntity accountClass
        )
    {
        (int classSequenceNo, int groupSequenceNo) =
            ResolveSequences(
                accountClass.ClassCode,
                accountGroup.GroupCode);

        int highestSequenceNo =
            await GetHighestSequenceAsync(
                accountGroup.AccountGroupId,
                classSequenceNo,
                groupSequenceNo);

        return CodeGenerator.GenerateAccountSubGroupCode(
            classSequenceNo,
            groupSequenceNo,
            highestSequenceNo + 1);
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync
        (
            long accountGroupId
        )
    {
        (AccountGroupEntity accountGroup, AccountClassEntity accountClass) =
            await ResolveParentAsync(
                accountGroupId);

        return await BuildNextCodeAsync(
            accountGroup,
            accountClass);
    }


    //===========================================================
    // Get Defaults
    //
    // Next code of the first group a sub group can be created
    // under (empty when there is none yet).
    //===========================================================

    public async Task<AccountSubGroupDefaultsDto>
        GetDefaultsAsync()
    {
        List<long> accountClassIds =
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
                        x.ClassType ==
                        AccountClassType
                )
                .Select
                (
                    x =>
                        x.AccountClassId
                )
                .ToListAsync();


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
                        &&
                        x.AllowManualSubGroup
                        &&
                        accountClassIds.Contains(
                            x.AccountClassId)
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
                Code =
                    string.Empty
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
    // Normalize Sub Group Name
    //===========================================================

    private static string NormalizeSubGroupName
    (
        string? subGroupName
    )
    {
        string name =
            subGroupName?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(name)
        )
        {
            throw new InvalidOperationException(
                "Sub Group Name is required.");
        }

        if
        (
            name.Length >
            200
        )
        {
            throw new InvalidOperationException(
                "Sub Group Name cannot be longer than 200 characters.");
        }

        return name;
    }


    //===========================================================
    // Validate Unique Name / Code
    //
    // Sub Group Name is unique within its group; Sub Group Code
    // is unique everywhere. Only non-deleted rows are compared.
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            long accountGroupId,
            string subGroupCode,
            string subGroupName,
            long excludeId
        )
    {
        string lowerName =
            subGroupName.ToLower();

        AccountSubGroupEntity? sameName =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.AccountSubGroupId !=
                        excludeId
                        &&
                        x.AccountGroupId ==
                        accountGroupId
                        &&
                        x.SubGroupName.ToLower() ==
                        lowerName
                );

        if
        (
            sameName !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Account Sub Group '{subGroupName}' already exists in this group ({sameName.SubGroupCode}).");
        }


        bool codeTaken =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.AccountSubGroupId !=
                        excludeId
                        &&
                        x.SubGroupCode ==
                        subGroupCode
                );

        if
        (
            codeTaken
        )
        {
            throw new InvalidOperationException(
                $"Sub Group Code '{subGroupCode}' is already in use.");
        }
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
        // Resolve Parent Group / Class
        //=======================================================

        (AccountGroupEntity accountGroup, AccountClassEntity accountClass) =
            await ResolveParentAsync(
                dto.AccountGroupId);


        if
        (
            dto.AccountClassId > 0
            &&
            dto.AccountClassId !=
            accountClass.AccountClassId
        )
        {
            throw new InvalidOperationException(
                "The selected Account Group does not belong to the selected Account Class.");
        }


        //=======================================================
        // Validate
        //=======================================================

        string subGroupName =
            NormalizeSubGroupName(
                dto.SubGroupName);


        //=======================================================
        // Generate Sub Group Code (server side, never from the form)
        //=======================================================

        string subGroupCode =
            await BuildNextCodeAsync(
                accountGroup,
                accountClass);


        await EnsureUniqueAsync(
            accountGroup.AccountGroupId,
            subGroupCode,
            subGroupName,
            0);


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
                    subGroupName,

                AllowManualLedger =
                    dto.AllowManualLedger,

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
                    $"Account Sub Group '{entity.SubGroupName}' ({entity.SubGroupCode}) created.",

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
                "Account Sub Group not found.");
        }


        //=======================================================
        // Parent Class / Group Are Locked
        //
        // The code is built from the class and group numbers, so
        // moving a sub group would break its code.
        //=======================================================

        if
        (
            (
                dto.AccountGroupId > 0
                &&
                dto.AccountGroupId !=
                entity.AccountGroupId
            )
            ||
            (
                dto.AccountClassId > 0
                &&
                dto.AccountClassId !=
                entity.AccountClassId
            )
        )
        {
            throw new InvalidOperationException(
                "Account Class and Account Group cannot be changed after the sub group is created.");
        }


        //=======================================================
        // Refresh Parent Snapshot (Mode / Class / Group Code)
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


        AccountGroupEntity? accountGroup =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountGroupId ==
                        entity.AccountGroupId
                );

        if
        (
            accountGroup !=
            null
        )
        {
            entity.GroupCode =
                accountGroup.GroupCode;
        }


        //=======================================================
        // Validate
        //=======================================================

        string subGroupName =
            NormalizeSubGroupName(
                dto.SubGroupName);

        await EnsureUniqueAsync(
            entity.AccountGroupId,
            entity.SubGroupCode,
            subGroupName,
            entity.AccountSubGroupId);


        //=======================================================
        // Update Entity
        //=======================================================

        entity.SubGroupName =
            subGroupName;

        entity.AllowManualLedger =
            dto.AllowManualLedger;


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
                    "Account Sub Group",

                EntityId =
                    entity.AccountSubGroupId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Account Sub Group Updated",

                ActivityDescription =
                    $"Account Sub Group '{entity.SubGroupName}' ({entity.SubGroupCode}) updated.",

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
        // Dependency Check : Ledgers
        //
        // A soft delete is an UPDATE, so the database foreign key
        // never fires. Block the delete here while any
        // non-deleted ledger still belongs to this sub group.
        //
        // Ledger types linked to Account Sub Group:
        //   General Ledgers  -> AccountSubGroupId
        //   Cash Accounts    -> AccountSubGroupsId
        //   Bank Accounts    -> AccountSubGroupsId
        //
        // MFS Accounts / POS Accounts : not linked to a sub group
        // yet. Add a count below once they get AccountSubGroupsId.
        //=======================================================

        int generalLedgerCount =
            await _context
                .Set<GeneralLedgerEntity>()
                .AsNoTracking()
                .CountAsync
                (
                    x =>
                        x.AccountSubGroupId ==
                        id
                        &&
                        !x.IsDeleted
                );

        int cashAccountCount =
            await _context
                .Set<CashAccountEntity>()
                .AsNoTracking()
                .CountAsync
                (
                    x =>
                        x.AccountSubGroupsId ==
                        id
                        &&
                        !x.IsDeleted
                );

        int bankAccountCount =
            await _context
                .Set<BankAccountEntity>()
                .AsNoTracking()
                .CountAsync
                (
                    x =>
                        x.AccountSubGroupsId ==
                        id
                        &&
                        !x.IsDeleted
                );


        //=======================================================
        // Build Blocked Message
        //=======================================================

        List<string> dependents =
            new List<string>();

        if
        (
            generalLedgerCount >
            0
        )
        {
            dependents.Add(
                $"{generalLedgerCount} general ledger(s)"
            );
        }

        if
        (
            cashAccountCount >
            0
        )
        {
            dependents.Add(
                $"{cashAccountCount} cash account(s)"
            );
        }

        if
        (
            bankAccountCount >
            0
        )
        {
            dependents.Add(
                $"{bankAccountCount} bank account(s)"
            );
        }

        if
        (
            dependents.Count >
            0
        )
        {
            throw new InvalidOperationException(
                $"Account Sub Group '{entity.SubGroupName}' cannot be deleted because " +
                $"{string.Join(", ", dependents)} are created under it. " +
                "Delete those ledgers first."
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
    //
    // Restores the most recently deleted sub group. Blocked (409)
    // while its group or class is deleted, or its name / code is
    // taken.
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


        //=======================================================
        // Parent Group / Class Must Exist
        //=======================================================

        bool groupExists =
            await _context
                .Set<AccountGroupEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        x.AccountGroupId ==
                        entity.AccountGroupId
                        &&
                        !x.IsDeleted
                );

        if
        (
            !groupExists
        )
        {
            throw new InvalidOperationException(
                $"Account Sub Group '{entity.SubGroupName}' cannot be restored. " +
                "Its Account Group is deleted; restore the group first.");
        }


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
                $"Account Sub Group '{entity.SubGroupName}' cannot be restored. " +
                "Its Account Class is deleted; restore the class first.");
        }


        //=======================================================
        // Name / Code Must Be Free
        //=======================================================

        try
        {
            await EnsureUniqueAsync(
                entity.AccountGroupId,
                entity.SubGroupCode,
                entity.SubGroupName,
                entity.AccountSubGroupId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Account Sub Group '{entity.SubGroupName}' cannot be restored. {ex.Message}");
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
                    $"Account Sub Group '{entity.SubGroupName}' ({entity.SubGroupCode}) restored.",

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