//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.CashAccounts.DTOs;

using CashAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.CashAccounts;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;

using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.AccountSettings;


//===============================================================
// Cash Accounts Repository
//
// Sub Group : always the fixed SUB-002-002-001, resolved by code
//             on the server. Any other sub group is rejected.
// Code      : CSH-<ccc>-<ggg>-<sss>-<nnnnn>
//             e.g. CSH-002-002-001-00001
//             ccc / ggg / sss come from the fixed sub group code,
//             nnnnn is the cash account's own number.
// Numbering : starts at 00001 and never reuses a number (deleted
//             rows are included), so a restore can never clash.
// Locked    : sub group and code never change after creation.
// Name      : unique within a branch (each branch can have its
//             own 'Cash In Hand').
//===============================================================

public class CashAccountsRepository : ICashAccountsRepository
{
    //===========================================================
    // Constants
    //===========================================================

    // Cash Accounts are reserved to this Account Sub Group only.
    private const string ReservedSubGroupCode =
        "SUB-002-002-001";

    // Sub group code prefix
    private const string SubGroupPrefix =
        "SUB";

    // Code prefix : CSH-002-002-001-00001
    private const string CodePrefix =
        "CSH";


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public CashAccountsRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // CashAccounts Query
    //===========================================================

    private IQueryable<CashAccountDto> CashAccountsQuery()
    {
        return _context
            .Set<CashAccountsEntity>()

            .AsNoTracking()

            .Where
            (
                x =>
                    !x.IsDeleted
            )

            .Select
            (
                x =>
                    new CashAccountDto
                    {
                        CashAccountId =
                            x.CashAccountId,

                        AccountSubGroupsId =
                            x.AccountSubGroupsId,

                        CashAccountCode =
                            x.CashAccountCode,

                        CashAccountName =
                            x.CashAccountName,

                        Remarks =
                            x.Remarks,

                        Status =
                            x.Status,

                        Branch =
                            x.Branch,

                        DisplayName =
                            x.DisplayName,

                        CollectionAccount =
                            x.CollectionAccount,

                        PaymentAccount =
                            x.PaymentAccount,

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

    public async Task<List<CashAccountDto>>
        GetAllAsync()
    {
        return await CashAccountsQuery()

            .OrderBy
            (
                x =>
                    x.CashAccountCode
            )

            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<CashAccountDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await CashAccountsQuery()

            .FirstOrDefaultAsync
            (
                x =>
                    x.CashAccountId ==
                    id
            );
    }


    //===========================================================
    // Resolve Reserved Sub Group (SUB-002-002-001)
    //===========================================================

    private async Task<AccountSubGroupEntity>
        ResolveReservedSubGroupAsync()
    {
        AccountSubGroupEntity? subGroup =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.SubGroupCode ==
                        ReservedSubGroupCode
                        &&
                        !x.IsDeleted
                );

        if
        (
            subGroup ==
            null
        )
        {
            throw new KeyNotFoundException(
                $"Reserved Account Sub Group {ReservedSubGroupCode} (Cash In Hand) was not found. Create it first.");
        }

        return subGroup;
    }


    //===========================================================
    // Validate Requested Sub Group
    //
    // The form sends the reserved sub group id; anything else is
    // rejected. 0 means "not sent" and falls back to the reserved
    // one.
    //===========================================================

    private static void EnsureReservedSubGroup
    (
        long requestedSubGroupId,
        AccountSubGroupEntity reserved
    )
    {
        if
        (
            requestedSubGroupId > 0
            &&
            requestedSubGroupId !=
            reserved.AccountSubGroupId
        )
        {
            throw new InvalidOperationException(
                $"Cash Accounts can only be created under Account Sub Group {ReservedSubGroupCode}.");
        }
    }


    //===========================================================
    // Sub Group Numbers From The Reserved Code
    //
    // SUB-002-002-001 → (2, 2, 1).
    //===========================================================

    private static (int ClassNo, int GroupNo, int SubGroupNo)
        ResolveSequences
        (
            string? subGroupCode
        )
    {
        string[] parts =
            (subGroupCode ?? string.Empty)
                .Trim()
                .Split(
                    '-',
                    StringSplitOptions.RemoveEmptyEntries)
                .Select
                (
                    x =>
                        x.Trim()
                )
                .ToArray();

        if
        (
            parts.Length !=
            4
            ||
            !string.Equals(
                parts[0],
                SubGroupPrefix,
                StringComparison.OrdinalIgnoreCase)
            ||
            !int.TryParse(
                parts[1],
                out int classNo)
            ||
            classNo < 1
            ||
            !int.TryParse(
                parts[2],
                out int groupNo)
            ||
            groupNo < 1
            ||
            !int.TryParse(
                parts[3],
                out int subGroupNo)
            ||
            subGroupNo < 1
        )
        {
            throw new InvalidOperationException(
                $"Invalid Account Sub Group code '{subGroupCode}'.");
        }

        return (classNo, groupNo, subGroupNo);
    }


    //===========================================================
    // Build Next Code
    //
    // Reads the last part of every CSH-ccc-ggg-sss-nnnnn code under
    // the reserved sub group, deleted rows included.
    //===========================================================

    private async Task<string>
        BuildNextCodeAsync
        (
            AccountSubGroupEntity subGroup
        )
    {
        (int classNo, int groupNo, int subGroupNo) =
            ResolveSequences(
                subGroup.SubGroupCode);

        string parentPart =
            $"{classNo:D3}-{groupNo:D3}-{subGroupNo:D3}";


        List<string> codes =
            await _context
                .Set<CashAccountsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.AccountSubGroupsId ==
                        subGroup.AccountSubGroupId
                )
                .Select
                (
                    x =>
                        x.CashAccountCode
                )
                .ToListAsync();


        int highest =
            0;

        foreach
        (
            string code
            in codes
        )
        {
            string[] parts =
                (code ?? string.Empty)
                    .Trim()
                    .Split(
                        '-',
                        StringSplitOptions.RemoveEmptyEntries)
                    .Select
                    (
                        x =>
                            x.Trim()
                    )
                    .ToArray();

            if
            (
                parts.Length !=
                5
                ||
                !string.Equals(
                    parts[0],
                    CodePrefix,
                    StringComparison.OrdinalIgnoreCase)
                ||
                $"{parts[1]}-{parts[2]}-{parts[3]}" !=
                parentPart
            )
            {
                continue;
            }

            if
            (
                int.TryParse(
                    parts[4],
                    out int sequenceNo)
                &&
                sequenceNo >
                highest
            )
            {
                highest =
                    sequenceNo;
            }
        }


        // Manual method (CSH-): the AUTO GenerateCashAccountsCode is
        // rewritten to CAS- by Code Synchronization.
        return CodeGenerator.GenerateCashAccountCode(
            classNo,
            groupNo,
            subGroupNo,
            highest + 1);
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync
        (
            long accountSubGroupsId
        )
    {
        AccountSubGroupEntity reserved =
            await ResolveReservedSubGroupAsync();

        EnsureReservedSubGroup(
            accountSubGroupsId,
            reserved);

        return await BuildNextCodeAsync(
            reserved);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<CashAccountsDefaultsDto>
        GetDefaultsAsync
        (
            long accountSubGroupsId
        )
    {
        return new CashAccountsDefaultsDto
        {
            Code =
                await GetNextCodeAsync(
                    accountSubGroupsId)
        };
    }


    //===========================================================
    // Normalize Cash Account Name
    //===========================================================

    private static string NormalizeName
    (
        string? cashAccountName
    )
    {
        string name =
            cashAccountName?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(name)
        )
        {
            throw new InvalidOperationException(
                "Cash Account Name is required.");
        }

        if
        (
            name.Length >
            200
        )
        {
            throw new InvalidOperationException(
                "Cash Account Name cannot be longer than 200 characters.");
        }

        return name;
    }


    //===========================================================
    // Normalize Branch
    //===========================================================

    private static string NormalizeBranch
    (
        string? branch
    )
    {
        string value =
            branch?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(value)
        )
        {
            throw new InvalidOperationException(
                "Branch is required.");
        }

        return value;
    }


    //===========================================================
    // Validate Unique Name / Code
    //
    // Cash Account Name is unique within its branch, so every
    // branch can have its own 'Cash In Hand'. The code is unique
    // everywhere. Only non-deleted rows are compared.
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            string cashAccountCode,
            string cashAccountName,
            string branch,
            long excludeId
        )
    {
        string lowerName =
            cashAccountName.ToLower();

        string lowerBranch =
            branch.ToLower();

        CashAccountsEntity? sameName =
            await _context
                .Set<CashAccountsEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.CashAccountId !=
                        excludeId
                        &&
                        x.CashAccountName.ToLower() ==
                        lowerName
                        &&
                        x.Branch.ToLower() ==
                        lowerBranch
                );

        if
        (
            sameName !=
            null
        )
        {
            throw new InvalidOperationException(
                $"Cash Account '{cashAccountName}' already exists for this branch ({sameName.CashAccountCode}).");
        }


        bool codeTaken =
            await _context
                .Set<CashAccountsEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.CashAccountId !=
                        excludeId
                        &&
                        x.CashAccountCode ==
                        cashAccountCode
                );

        if
        (
            codeTaken
        )
        {
            throw new InvalidOperationException(
                $"Cash Account Code '{cashAccountCode}' is already in use.");
        }
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateCashAccountDto dto,

            long userId
        )
    {
        //===========================================================
        // Resolve Reserved Sub Group
        //===========================================================

        AccountSubGroupEntity reserved =
            await ResolveReservedSubGroupAsync();

        EnsureReservedSubGroup(
            dto.AccountSubGroupsId,
            reserved);

        if
        (
            !reserved.IsActive
        )
        {
            throw new InvalidOperationException(
                $"Account Sub Group {ReservedSubGroupCode} is inactive.");
        }


        //===========================================================
        // Validate
        //===========================================================

        string cashAccountName =
            NormalizeName(
                dto.CashAccountName);


        //===========================================================
        // Generate Code (server side, never from the form)
        //===========================================================

        string cashAccountCode =
            await BuildNextCodeAsync(
                reserved);


        string branch =
            NormalizeBranch(
                dto.Branch);

        await EnsureUniqueAsync(
            cashAccountCode,
            cashAccountName,
            branch,
            0);


        //===========================================================
        // Create Entity
        //===========================================================

        CashAccountsEntity entity =
            new CashAccountsEntity
            {
                AccountSubGroupsId =
                    reserved.AccountSubGroupId,

                CashAccountCode =
                    cashAccountCode,

                CashAccountName =
                    cashAccountName,

                Remarks =
                    dto.Remarks?.Trim()
                    ??
                    string.Empty,

                Status =
                    dto.Status,

                Branch =
                    branch,

                DisplayName =
                    dto.DisplayName?.Trim()
                    ??
                    string.Empty,

                CollectionAccount =
                    dto.CollectionAccount,

                PaymentAccount =
                    dto.PaymentAccount,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };


        _context
            .Set<CashAccountsEntity>()
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
                    "CashAccount",

                EntityId =
                    entity.CashAccountId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "CashAccount Created",

                ActivityDescription =
                    $"CashAccount '{entity.CashAccountName}' ({entity.CashAccountCode}) created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return entity.CashAccountId;
    }


    //===========================================================
    // Update
    //
    // Sub group and code are locked; only the details change.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateCashAccountDto dto,

            long userId
        )
    {
        //===========================================================
        // Resolve CashAccount
        //===========================================================

        CashAccountsEntity? entity =

            await _context
                .Set<CashAccountsEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.CashAccountId ==
                        dto.CashAccountId

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
                "CashAccount not found."
            );
        }


        //===========================================================
        // Sub Group Is Locked
        //===========================================================

        if
        (
            dto.AccountSubGroupsId > 0
            &&
            dto.AccountSubGroupsId !=
            entity.AccountSubGroupsId
        )
        {
            throw new InvalidOperationException(
                "Account Sub Group cannot be changed after the cash account is created.");
        }


        //===========================================================
        // Validate
        //===========================================================

        string cashAccountName =
            NormalizeName(
                dto.CashAccountName);

        string branch =
            NormalizeBranch(
                dto.Branch);

        await EnsureUniqueAsync(
            entity.CashAccountCode,
            cashAccountName,
            branch,
            entity.CashAccountId);


        //===========================================================
        // Update Entity (code is never taken from the form)
        //===========================================================

        entity.CashAccountName =
            cashAccountName;

        entity.Remarks =
            dto.Remarks?.Trim()
            ??
            string.Empty;

        entity.Status =
            dto.Status;

        entity.Branch =
            branch;

        entity.DisplayName =
            dto.DisplayName?.Trim()
            ??
            string.Empty;

        entity.CollectionAccount =
            dto.CollectionAccount;

        entity.PaymentAccount =
            dto.PaymentAccount;


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
                    "CashAccount",

                EntityId =
                    entity.CashAccountId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "CashAccount Updated",

                ActivityDescription =
                    $"CashAccount '{entity.CashAccountName}' ({entity.CashAccountCode}) updated.",

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
        // Resolve CashAccount
        //===========================================================

        CashAccountsEntity? entity =

            await _context
                .Set<CashAccountsEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.CashAccountId ==
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
                "CashAccount not found."
            );
        }


        //===========================================================
        // Soft Delete CashAccount
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
                    "CashAccount",

                EntityId =
                    entity.CashAccountId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "CashAccount Deleted",

                ActivityDescription =
                    $"CashAccount '{entity.CashAccountName}' ({entity.CashAccountCode}) deleted.",

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
    // Restores the most recently deleted cash account. Blocked
    // (409) while its sub group is deleted, or its name / code is
    // taken.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        CashAccountsEntity? entity =

            await _context
                .Set<CashAccountsEntity>()

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


        //===========================================================
        // Sub Group Must Exist
        //===========================================================

        bool subGroupExists =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        x.AccountSubGroupId ==
                        entity.AccountSubGroupsId
                        &&
                        !x.IsDeleted
                );

        if
        (
            !subGroupExists
        )
        {
            throw new InvalidOperationException(
                $"Cash Account '{entity.CashAccountName}' cannot be restored. " +
                "Its Account Sub Group is deleted; restore the sub group first.");
        }


        //===========================================================
        // Name / Code Must Be Free
        //===========================================================

        try
        {
            await EnsureUniqueAsync(
                entity.CashAccountCode,
                entity.CashAccountName,
                entity.Branch ?? string.Empty,
                entity.CashAccountId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Cash Account '{entity.CashAccountName}' cannot be restored. {ex.Message}");
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
                    "CashAccount",

                EntityId =
                    entity.CashAccountId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "CashAccount Restored",

                ActivityDescription =
                    $"CashAccount '{entity.CashAccountName}' ({entity.CashAccountCode}) restored.",

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
            .Set<CashAccountsEntity>()

            .AnyAsync
            (
                x =>

                    x.CashAccountId ==
                    id

                    &&

                    !x.IsDeleted
            );
    }
}