//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.BankAccounts.DTOs;

using BankAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.BankAccounts;

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
// Bank Accounts Repository
//
// Sub Group : one of two fixed sub groups, resolved by code on
//             the server; anything else is rejected.
//               SUB-002-002-002  Cash At Banks
//               SUB-003-002-002  Liability For Finance
// Code      : BNK-<ccc>-<ggg>-<sss>-<nnnnn>
//             e.g. BNK-002-002-002-00001 / BNK-003-002-002-00001
//             Each sub group numbers on its own from 00001;
//             deleted rows are included, so a number is never
//             reused and a restore can never clash.
// Sanction  : optional, only for Liability For Finance (must be
//  Limit      0 or more); always cleared for Cash At Banks.
// Locked    : sub group and code never change after creation.
// Name      : unique within a branch.
//===============================================================

public class BankAccountsRepository : IBankAccountsRepository
{
    //===========================================================
    // Constants
    //===========================================================

    // Cash At Banks
    private const string CashAtBanksSubGroupCode =
        "SUB-002-002-002";

    // Liability For Finance (allows a Sanction Limit)
    private const string LiabilityForFinanceSubGroupCode =
        "SUB-003-002-002";

    // The only sub groups Bank Accounts may use
    private static readonly string[] AllowedSubGroupCodes =
    {
        CashAtBanksSubGroupCode,
        LiabilityForFinanceSubGroupCode
    };

    // Sub group code prefix
    private const string SubGroupPrefix =
        "SUB";

    // Code prefix : BNK-002-002-002-00001
    private const string CodePrefix =
        "BNK";


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public BankAccountsRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // BankAccounts Query
    //===========================================================

    private IQueryable<BankAccountDto> BankAccountsQuery()
    {
        return _context
            .Set<BankAccountsEntity>()

            .AsNoTracking()

            .Where
            (
                x =>
                    !x.IsDeleted
            )

            .Select
            (
                x =>
                    new BankAccountDto
                    {
                        BankAccountId =
                            x.BankAccountId,

                        AccountSubGroupsId =
                            x.AccountSubGroupsId,

                        BankAccountCode =
                            x.BankAccountCode,

                        BankAccountName =
                            x.BankAccountName,

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

                        Bank =
                            x.Bank,

                        FullAccountNumber =
                            x.FullAccountNumber,

                        ShortAccountName =
                            x.ShortAccountName,

                        ShortAccountNumber =
                            x.ShortAccountNumber,

                        ShortBranchName =
                            x.ShortBranchName,

                        SwiftCode =
                            x.SwiftCode,

                        RoutingNumber =
                            x.RoutingNumber,

                        BranchExclusive =
                            x.BranchExclusive,

                        BankBranchName =
                            x.BankBranchName,

                        SanctionLimit =
                            x.SanctionLimit,

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

    public async Task<List<BankAccountDto>>
        GetAllAsync()
    {
        return await BankAccountsQuery()

            .OrderBy
            (
                x =>
                    x.BankAccountCode
            )

            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<BankAccountDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await BankAccountsQuery()

            .FirstOrDefaultAsync
            (
                x =>
                    x.BankAccountId ==
                    id
            );
    }


    //===========================================================
    // Resolve Allowed Sub Group
    //
    // The sub group must be one of the two fixed ones (looked up
    // by code) and must exist.
    //===========================================================

    private async Task<AccountSubGroupEntity>
        ResolveAllowedSubGroupAsync
        (
            long accountSubGroupsId
        )
    {
        AccountSubGroupEntity? subGroup =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountSubGroupId ==
                        accountSubGroupsId
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
                "Account Sub Group not found.");
        }

        if
        (
            !AllowedSubGroupCodes.Contains(
                (subGroup.SubGroupCode ?? string.Empty)
                    .Trim()
                    .ToUpperInvariant())
        )
        {
            throw new InvalidOperationException(
                $"Bank Accounts can only be created under {CashAtBanksSubGroupCode} (Cash At Banks) " +
                $"or {LiabilityForFinanceSubGroupCode} (Liability For Finance).");
        }

        return subGroup;
    }


    //===========================================================
    // Is Liability For Finance
    //===========================================================

    private static bool IsLiabilityForFinance
    (
        AccountSubGroupEntity subGroup
    )
    {
        return string.Equals(
            (subGroup.SubGroupCode ?? string.Empty).Trim(),
            LiabilityForFinanceSubGroupCode,
            StringComparison.OrdinalIgnoreCase);
    }


    //===========================================================
    // Normalize Sanction Limit
    //
    // Kept only for Liability For Finance; 0 or more, 2 decimals.
    //===========================================================

    private static decimal? NormalizeSanctionLimit
    (
        decimal? sanctionLimit,
        AccountSubGroupEntity subGroup
    )
    {
        if
        (
            !IsLiabilityForFinance(subGroup)
            ||
            sanctionLimit ==
            null
        )
        {
            return null;
        }

        if
        (
            sanctionLimit <
            0
        )
        {
            throw new InvalidOperationException(
                "Sanction Limit cannot be negative.");
        }

        return Math.Round(
            sanctionLimit.Value,
            2);
    }


    //===========================================================
    // Sub Group Numbers From Its Code
    //
    // SUB-003-002-002 → (3, 2, 2).
    //===========================================================

    private static (int ClassNo, int GroupNo, int SubGroupNo)
        ResolveSequences
        (
            string? subGroupCode
        )
    {
        string[] parts =
            SplitCode(
                subGroupCode);

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
    // Split Code Into Trimmed Parts
    //===========================================================

    private static string[] SplitCode
    (
        string? code
    )
    {
        return (code ?? string.Empty)
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
    }


    //===========================================================
    // Build Next Code
    //
    // Reads the last part of every BNK-ccc-ggg-sss-nnnnn code
    // under this sub group, deleted rows included.
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
                .Set<BankAccountsEntity>()
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
                        x.BankAccountCode
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
                SplitCode(
                    code);

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


        // Manual method (BNK-): the AUTO GenerateBankAccountsCode
        // is rewritten to BAN- by Code Synchronization.
        return CodeGenerator.GenerateBankAccountCode(
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
        AccountSubGroupEntity subGroup =
            await ResolveAllowedSubGroupAsync(
                accountSubGroupsId);

        return await BuildNextCodeAsync(
            subGroup);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<BankAccountsDefaultsDto>
        GetDefaultsAsync
        (
            long accountSubGroupsId
        )
    {
        return new BankAccountsDefaultsDto
        {
            Code =
                await GetNextCodeAsync(
                    accountSubGroupsId)
        };
    }


    //===========================================================
    // Normalize Required Text
    //===========================================================

    private static string RequireText
    (
        string? value,
        string label,
        int maxLength
    )
    {
        string text =
            value?.Trim()
            ??
            string.Empty;

        if
        (
            string.IsNullOrWhiteSpace(text)
        )
        {
            throw new InvalidOperationException(
                $"{label} is required.");
        }

        if
        (
            text.Length >
            maxLength
        )
        {
            throw new InvalidOperationException(
                $"{label} cannot be longer than {maxLength} characters.");
        }

        return text;
    }


    //===========================================================
    // Validate Unique Name / Code
    //
    // Bank Account Name is unique within its branch; the code is
    // unique everywhere. Only non-deleted rows are compared.
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            string bankAccountCode,
            string bankAccountName,
            string branch,
            long excludeId
        )
    {
        string lowerName =
            bankAccountName.ToLower();

        string lowerBranch =
            branch.ToLower();

        BankAccountsEntity? sameName =
            await _context
                .Set<BankAccountsEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.BankAccountId !=
                        excludeId
                        &&
                        x.BankAccountName.ToLower() ==
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
                $"Bank Account '{bankAccountName}' already exists for this branch ({sameName.BankAccountCode}).");
        }


        bool codeTaken =
            await _context
                .Set<BankAccountsEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.BankAccountId !=
                        excludeId
                        &&
                        x.BankAccountCode ==
                        bankAccountCode
                );

        if
        (
            codeTaken
        )
        {
            throw new InvalidOperationException(
                $"Bank Account Code '{bankAccountCode}' is already in use.");
        }
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateBankAccountDto dto,

            long userId
        )
    {
        //===========================================================
        // Resolve Sub Group (Cash At Banks / Liability For Finance)
        //===========================================================

        AccountSubGroupEntity subGroup =
            await ResolveAllowedSubGroupAsync(
                dto.AccountSubGroupsId);

        if
        (
            !subGroup.IsActive
        )
        {
            throw new InvalidOperationException(
                $"Account Sub Group {subGroup.SubGroupCode} is inactive.");
        }


        //===========================================================
        // Validate
        //===========================================================

        string bankAccountName =
            RequireText(
                dto.BankAccountName,
                "Bank Account Name",
                200);

        string branch =
            RequireText(
                dto.Branch,
                "Branch",
                1000);

        decimal? sanctionLimit =
            NormalizeSanctionLimit(
                dto.SanctionLimit,
                subGroup);


        //===========================================================
        // Generate Code (server side, never from the form)
        //===========================================================

        string bankAccountCode =
            await BuildNextCodeAsync(
                subGroup);


        await EnsureUniqueAsync(
            bankAccountCode,
            bankAccountName,
            branch,
            0);


        //===========================================================
        // Create Entity
        //===========================================================

        BankAccountsEntity entity =
            new BankAccountsEntity
            {
                AccountSubGroupsId =
                    subGroup.AccountSubGroupId,

                BankAccountCode =
                    bankAccountCode,

                BankAccountName =
                    bankAccountName,

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

                Bank =
                    dto.Bank?.Trim()
                    ??
                    string.Empty,

                FullAccountNumber =
                    dto.FullAccountNumber?.Trim()
                    ??
                    string.Empty,

                ShortAccountName =
                    dto.ShortAccountName?.Trim()
                    ??
                    string.Empty,

                ShortAccountNumber =
                    dto.ShortAccountNumber?.Trim()
                    ??
                    string.Empty,

                ShortBranchName =
                    dto.ShortBranchName?.Trim()
                    ??
                    string.Empty,

                SwiftCode =
                    dto.SwiftCode?.Trim()
                    ??
                    string.Empty,

                RoutingNumber =
                    dto.RoutingNumber?.Trim()
                    ??
                    string.Empty,

                BranchExclusive =
                    dto.BranchExclusive,

                BankBranchName =
                    dto.BankBranchName?.Trim()
                    ??
                    string.Empty,

                SanctionLimit =
                    sanctionLimit,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };


        _context
            .Set<BankAccountsEntity>()
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
                    "BankAccount",

                EntityId =
                    entity.BankAccountId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "BankAccount Created",

                ActivityDescription =
                    $"BankAccount '{entity.BankAccountName}' ({entity.BankAccountCode}) created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return entity.BankAccountId;
    }


    //===========================================================
    // Update
    //
    // Sub group and code are locked; only the details change.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateBankAccountDto dto,

            long userId
        )
    {
        //===========================================================
        // Resolve BankAccount
        //===========================================================

        BankAccountsEntity? entity =

            await _context
                .Set<BankAccountsEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.BankAccountId ==
                        dto.BankAccountId

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
                "BankAccount not found."
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
                "Account Sub Group cannot be changed after the bank account is created.");
        }


        AccountSubGroupEntity? subGroup =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.AccountSubGroupId ==
                        entity.AccountSubGroupsId
                );

        if
        (
            subGroup ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Account Sub Group not found.");
        }


        //===========================================================
        // Validate
        //===========================================================

        string bankAccountName =
            RequireText(
                dto.BankAccountName,
                "Bank Account Name",
                200);

        string branch =
            RequireText(
                dto.Branch,
                "Branch",
                1000);

        decimal? sanctionLimit =
            NormalizeSanctionLimit(
                dto.SanctionLimit,
                subGroup);

        await EnsureUniqueAsync(
            entity.BankAccountCode,
            bankAccountName,
            branch,
            entity.BankAccountId);


        //===========================================================
        // Update Entity (code is never taken from the form)
        //===========================================================

        entity.BankAccountName =
            bankAccountName;

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

        entity.Bank =
            dto.Bank?.Trim()
            ??
            string.Empty;

        entity.FullAccountNumber =
            dto.FullAccountNumber?.Trim()
            ??
            string.Empty;

        entity.ShortAccountName =
            dto.ShortAccountName?.Trim()
            ??
            string.Empty;

        entity.ShortAccountNumber =
            dto.ShortAccountNumber?.Trim()
            ??
            string.Empty;

        entity.ShortBranchName =
            dto.ShortBranchName?.Trim()
            ??
            string.Empty;

        entity.SwiftCode =
            dto.SwiftCode?.Trim()
            ??
            string.Empty;

        entity.RoutingNumber =
            dto.RoutingNumber?.Trim()
            ??
            string.Empty;

        entity.BranchExclusive =
            dto.BranchExclusive;

        entity.BankBranchName =
            dto.BankBranchName?.Trim()
            ??
            string.Empty;

        entity.SanctionLimit =
            sanctionLimit;


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
                    "BankAccount",

                EntityId =
                    entity.BankAccountId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "BankAccount Updated",

                ActivityDescription =
                    $"BankAccount '{entity.BankAccountName}' ({entity.BankAccountCode}) updated.",

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
        // Resolve BankAccount
        //===========================================================

        BankAccountsEntity? entity =

            await _context
                .Set<BankAccountsEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.BankAccountId ==
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
                "BankAccount not found."
            );
        }


        //===========================================================
        // Soft Delete BankAccount
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
                    "BankAccount",

                EntityId =
                    entity.BankAccountId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "BankAccount Deleted",

                ActivityDescription =
                    $"BankAccount '{entity.BankAccountName}' deleted.",

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
    // Restores the most recently deleted bank account. Blocked
    // (409) while its sub group is deleted, or its name / code is
    // taken.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        BankAccountsEntity? entity =

            await _context
                .Set<BankAccountsEntity>()

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
                $"Bank Account '{entity.BankAccountName}' cannot be restored. " +
                "Its Account Sub Group is deleted; restore the sub group first.");
        }


        //===========================================================
        // Name / Code Must Be Free
        //===========================================================

        try
        {
            await EnsureUniqueAsync(
                entity.BankAccountCode,
                entity.BankAccountName,
                entity.Branch ?? string.Empty,
                entity.BankAccountId);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Bank Account '{entity.BankAccountName}' cannot be restored. {ex.Message}");
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
                    "BankAccount",

                EntityId =
                    entity.BankAccountId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "BankAccount Restored",

                ActivityDescription =
                    $"BankAccount '{entity.BankAccountName}' ({entity.BankAccountCode}) restored.",

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
            .Set<BankAccountsEntity>()

            .AnyAsync
            (
                x =>

                    x.BankAccountId ==
                    id

                    &&

                    !x.IsDeleted
            );
    }
}