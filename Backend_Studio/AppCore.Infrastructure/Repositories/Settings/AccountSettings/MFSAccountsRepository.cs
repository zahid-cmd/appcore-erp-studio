//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.MFSAccounts.DTOs;

using MFSAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.MFSAccounts;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using BankAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.BankAccounts;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;

using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.AccountSettings;


//===============================================================
// MFS Accounts Repository
//===============================================================

public class MFSAccountsRepository : IMFSAccountsRepository
{
    //===========================================================
    // Constants
    //===========================================================

    // MFS Accounts are reserved to this Account Sub Group only.
    private const string ReservedSubGroupCode =
        "SUB-002-002-003";

    private const string AccountTypePersonal =
        "Personal";

    private const string AccountTypeMerchant =
        "Merchant";

    private const decimal MaxMfsCharges =
        100m;

    private const int DisplayNameMaxLength =
        100;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public MFSAccountsRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Normalized Input
    //
    // One shape for Create & Update, after all business rules
    // (Personal / Merchant, display name, uppercase) are applied.
    //===========================================================

    private sealed class MfsInput
    {
        public string MFSAccountName { get; set; } = string.Empty;

        public string MFSAccountNumber { get; set; } = string.Empty;

        public string AccountType { get; set; } = AccountTypePersonal;

        public decimal MFSCharges { get; set; }

        public string LinkedBankAccount { get; set; } = string.Empty;

        public string Branch { get; set; } = string.Empty;

        public string DisplayName { get; set; } = string.Empty;

        public bool CollectionAccount { get; set; }

        public bool PaymentAccount { get; set; }

        public bool BranchExclusive { get; set; }

        public string Remarks { get; set; } = string.Empty;

        public bool Status { get; set; }
    }


    //===========================================================
    // MFS Accounts Query
    //===========================================================

    private IQueryable<MFSAccountDto> MFSAccountsQuery()
    {
        return _context
            .Set<MFSAccountsEntity>()
            .AsNoTracking()
            .Where
            (
                x =>
                    !x.IsDeleted
            )
            .Select
            (
                x =>
                    new MFSAccountDto
                    {
                        //===============================================
                        // Primary Key
                        //===============================================

                        MFSAccountId =
                            x.MFSAccountId,

                        //===============================================
                        // Account Sub Group
                        //===============================================

                        AccountSubGroupsId =
                            x.AccountSubGroupsId,

                        //===============================================
                        // Basic Information
                        //===============================================

                        MFSAccountCode =
                            x.MFSAccountCode,

                        MFSAccountName =
                            x.MFSAccountName,

                        MFSAccountNumber =
                            x.MFSAccountNumber,

                        AccountType =
                            x.AccountType,

                        MFSCharges =
                            x.MFSCharges,

                        LinkedBankAccount =
                            x.LinkedBankAccount,

                        // Linked bank account is stored by code
                        LinkedBankAccountName =
                            _context
                                .Set<BankAccountsEntity>()
                                .Where
                                (
                                    b =>
                                        b.BankAccountCode ==
                                        x.LinkedBankAccount
                                )
                                .Select
                                (
                                    b =>
                                        b.DisplayName
                                )
                                .FirstOrDefault()
                            ??
                            string.Empty,

                        Branch =
                            x.Branch,

                        DisplayName =
                            x.DisplayName,

                        //===============================================
                        // Configuration
                        //===============================================

                        CollectionAccount =
                            x.CollectionAccount,

                        PaymentAccount =
                            x.PaymentAccount,

                        BranchExclusive =
                            x.BranchExclusive,

                        Remarks =
                            x.Remarks,

                        Status =
                            x.Status,

                        //===============================================
                        // Soft Delete
                        //===============================================

                        IsDeleted =
                            x.IsDeleted,

                        DeletedBy =
                            x.DeletedBy,

                        DeletedDate =
                            x.DeletedDate,

                        //===============================================
                        // Audit
                        //===============================================

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

    public async Task<List<MFSAccountDto>>
        GetAllAsync()
    {
        return await MFSAccountsQuery()
            .OrderBy
            (
                x =>
                    x.MFSAccountCode
            )
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<MFSAccountDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await MFSAccountsQuery()
            .FirstOrDefaultAsync
            (
                x =>
                    x.MFSAccountId ==
                    id
            );
    }


    //===========================================================
    // Get Next Code
    //
    // Deleted rows are included, because the unique index on
    // MFSAccountCode covers them too. A code is never reused.
    //===========================================================

    public async Task<string>
        GetNextCodeAsync
        (
            long accountSubGroupsId
        )
    {
        AccountSubGroupEntity? parent =
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
            parent ==
            null
        )
        {
            throw new KeyNotFoundException(
                "Account Sub Group not found.");
        }

        // MFS Accounts live under the reserved sub group only
        if
        (
            !string.Equals(
                parent.SubGroupCode?.Trim(),
                ReservedSubGroupCode,
                StringComparison.OrdinalIgnoreCase)
        )
        {
            throw new InvalidOperationException(
                $"MFS Accounts can only be created under Account Sub Group {ReservedSubGroupCode}.");
        }

        string[] parentParts =
            (parent.SubGroupCode?.Trim() ?? string.Empty)
                .Split
                (
                    '-',
                    StringSplitOptions.RemoveEmptyEntries
                );

        if
        (
            parentParts.Length !=
            4
        )
        {
            throw new InvalidOperationException(
                "Invalid account sub group code.");
        }

        int[] seg =
            new int[3];

        for
        (
            int i = 0;
            i < 3;
            i++
        )
        {
            if
            (
                !int.TryParse
                (
                    parentParts[i + 1].Trim(),
                    out seg[i]
                )
                ||
                seg[i] < 1
            )
            {
                throw new InvalidOperationException(
                    "Invalid account sub group sequence number.");
            }
        }

        List<string> existingCodes =
            await _context
                .Set<MFSAccountsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.AccountSubGroupsId ==
                        accountSubGroupsId
                )
                .Select
                (
                    x =>
                        x.MFSAccountCode
                )
                .ToListAsync();

        int highest =
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
                code.Split
                (
                    '-',
                    StringSplitOptions.RemoveEmptyEntries
                );

            if
            (
                parts.Length != 5
                ||
                !string.Equals
                (
                    parts[0].Trim(),
                    "MFS",
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                continue;
            }

            bool same =
                true;

            for
            (
                int i = 0;
                i < 3;
                i++
            )
            {
                if
                (
                    !int.TryParse
                    (
                        parts[i + 1].Trim(),
                        out int v
                    )
                    ||
                    v != seg[i]
                )
                {
                    same =
                        false;

                    break;
                }
            }

            if
            (
                !same
            )
            {
                continue;
            }

            if
            (
                int.TryParse
                (
                    parts[4].Trim(),
                    out int sequenceNo
                )
                &&
                sequenceNo > highest
            )
            {
                highest =
                    sequenceNo;
            }
        }

        return CodeGenerator.GenerateMFSAccountsCode(
            seg[0],
            seg[1],
            seg[2],
            highest + 1);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<MFSAccountsDefaultsDto>
        GetDefaultsAsync
        (
            long accountSubGroupsId
        )
    {
        return new MFSAccountsDefaultsDto
        {
            Code =
                await GetNextCodeAsync(
                    accountSubGroupsId)
        };
    }


    //===========================================================
    // Resolve Reserved Sub Group (SUB-002-002-003)
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
                $"Reserved Account Sub Group {ReservedSubGroupCode} was not found.");
        }

        return subGroup;
    }


    //===========================================================
    // Normalize & Validate Input
    //
    // Personal : Linked Bank Account = "" , MFS Charges = 0
    // Merchant : Linked Bank Account required, stored as the
    //            BANK ACCOUNT CODE (must exist in Bank Accounts),
    //            MFS Charges > 0 and <= 100
    //            (a display name sent by an older screen is turned
    //            into its code)
    // Display Name = "<MFS ACCOUNT NAME> - <MFS ACCOUNT NUMBER>"
    // Same provider + number may not exist twice.
    //===========================================================

    private async Task<MfsInput>
        NormalizeInputAsync
        (
            string? mfsAccountName,
            string? mfsAccountNumber,
            string? accountType,
            decimal mfsCharges,
            string? linkedBankAccount,
            string? branch,
            bool collectionAccount,
            bool paymentAccount,
            bool branchExclusive,
            string? remarks,
            bool status,
            long? excludeId
        )
    {
        //=======================================================
        // MFS Account Name (Provider) - UPPERCASE
        //=======================================================

        string name =
            (mfsAccountName ?? string.Empty)
                .Trim()
                .ToUpperInvariant();

        if
        (
            string.IsNullOrWhiteSpace(name)
        )
        {
            throw new InvalidOperationException(
                "MFS Account Name is required.");
        }

        //=======================================================
        // MFS Account Number
        //=======================================================

        string number =
            (mfsAccountNumber ?? string.Empty)
                .Trim();

        if
        (
            string.IsNullOrWhiteSpace(number)
        )
        {
            throw new InvalidOperationException(
                "MFS Account Number is required.");
        }

        //=======================================================
        // Branch
        //=======================================================

        string branchName =
            (branch ?? string.Empty)
                .Trim();

        if
        (
            string.IsNullOrWhiteSpace(branchName)
        )
        {
            throw new InvalidOperationException(
                "Branch is required.");
        }

        //=======================================================
        // Account Type
        //=======================================================

        string type =
            (accountType ?? string.Empty).Trim();

        if
        (
            string.IsNullOrWhiteSpace(type)
            ||
            string.Equals
            (
                type,
                AccountTypePersonal,
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            type =
                AccountTypePersonal;
        }
        else if
        (
            string.Equals
            (
                type,
                AccountTypeMerchant,
                StringComparison.OrdinalIgnoreCase
            )
        )
        {
            type =
                AccountTypeMerchant;
        }
        else
        {
            throw new InvalidOperationException(
                "Account Type must be Personal or Merchant.");
        }

        bool isMerchant =
            type ==
            AccountTypeMerchant;

        //=======================================================
        // Linked Bank Account & MFS Charges
        //=======================================================

        string linkedBank =
            string.Empty;

        decimal charges =
            0m;

        if
        (
            isMerchant
        )
        {
            linkedBank =
                (linkedBankAccount ?? string.Empty)
                    .Trim();

            if
            (
                string.IsNullOrWhiteSpace(linkedBank)
            )
            {
                throw new InvalidOperationException(
                    "Linked Bank Account is required for Merchant accounts.");
            }

            // By code; a display name (older screen / older row)
            // is accepted once and replaced by its code
            string? bankCode =
                await _context
                    .Set<BankAccountsEntity>()
                    .AsNoTracking()
                    .Where
                    (
                        x =>
                            !x.IsDeleted
                            &&
                            x.BankAccountCode ==
                            linkedBank
                    )
                    .Select
                    (
                        x =>
                            x.BankAccountCode
                    )
                    .FirstOrDefaultAsync()
                ??
                await _context
                    .Set<BankAccountsEntity>()
                    .AsNoTracking()
                    .Where
                    (
                        x =>
                            !x.IsDeleted
                            &&
                            x.DisplayName ==
                            linkedBank
                    )
                    .Select
                    (
                        x =>
                            x.BankAccountCode
                    )
                    .FirstOrDefaultAsync();

            if
            (
                string.IsNullOrWhiteSpace(bankCode)
            )
            {
                throw new InvalidOperationException(
                    $"Linked Bank Account '{linkedBank}' was not found in Bank Accounts.");
            }

            linkedBank =
                bankCode;

            charges =
                Math.Round(
                    mfsCharges,
                    2,
                    MidpointRounding.AwayFromZero);

            if
            (
                charges <= 0m
                ||
                charges > MaxMfsCharges
            )
            {
                throw new InvalidOperationException(
                    $"MFS Charges must be greater than 0 and not more than {MaxMfsCharges}% for Merchant accounts.");
            }
        }

        //=======================================================
        // Display Name
        //=======================================================

        string displayName =
            $"{name} - {number}";

        if
        (
            displayName.Length >
            DisplayNameMaxLength
        )
        {
            throw new InvalidOperationException(
                $"Display Name cannot be longer than {DisplayNameMaxLength} characters.");
        }

        //=======================================================
        // Duplicate : same provider + number
        //=======================================================

        bool duplicate =
            await _context
                .Set<MFSAccountsEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (
                            excludeId == null
                            ||
                            x.MFSAccountId != excludeId
                        )
                        &&
                        x.MFSAccountName.ToUpper() ==
                        name
                        &&
                        x.MFSAccountNumber ==
                        number
                );

        if
        (
            duplicate
        )
        {
            throw new InvalidOperationException(
                $"MFS Account '{displayName}' already exists.");
        }

        return new MfsInput
        {
            MFSAccountName =
                name,

            MFSAccountNumber =
                number,

            AccountType =
                type,

            MFSCharges =
                charges,

            LinkedBankAccount =
                linkedBank,

            Branch =
                branchName,

            DisplayName =
                displayName,

            CollectionAccount =
                collectionAccount,

            PaymentAccount =
                paymentAccount,

            BranchExclusive =
                branchExclusive,

            Remarks =
                remarks?.Trim()
                ??
                string.Empty,

            Status =
                status
        };
    }


    //===========================================================
    // Apply Input To Entity
    //===========================================================

    private static void ApplyInput
    (
        MFSAccountsEntity entity,
        MfsInput input
    )
    {
        entity.MFSAccountName =
            input.MFSAccountName;

        entity.MFSAccountNumber =
            input.MFSAccountNumber;

        entity.AccountType =
            input.AccountType;

        entity.MFSCharges =
            input.MFSCharges;

        entity.LinkedBankAccount =
            input.LinkedBankAccount;

        entity.Branch =
            input.Branch;

        entity.DisplayName =
            input.DisplayName;

        entity.CollectionAccount =
            input.CollectionAccount;

        entity.PaymentAccount =
            input.PaymentAccount;

        entity.BranchExclusive =
            input.BranchExclusive;

        entity.Remarks =
            input.Remarks;

        entity.Status =
            input.Status;
    }


    //===========================================================
    // Add Activity History
    //===========================================================

    private void AddHistory
    (
        MFSAccountsEntity entity,
        string activityType,
        string verb,
        long userId,
        DateTime performedDate
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Account Settings",

                EntityName =
                    "MFSAccount",

                EntityId =
                    entity.MFSAccountId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"MFS Account {verb}",

                ActivityDescription =
                    $"MFS Account '{entity.DisplayName}' ({entity.MFSAccountCode}) {verb.ToLowerInvariant()}.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    performedDate
            }
        );
    }


    //===========================================================
    // Create
    //
    // Sub group is always the reserved SUB-002-002-003 and the
    // code is always generated here (values sent are ignored).
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateMFSAccountDto dto,
            long userId
        )
    {
        AccountSubGroupEntity subGroup =
            await ResolveReservedSubGroupAsync();

        MfsInput input =
            await NormalizeInputAsync
            (
                dto.MFSAccountName,
                dto.MFSAccountNumber,
                dto.AccountType,
                dto.MFSCharges,
                dto.LinkedBankAccount,
                dto.Branch,
                dto.CollectionAccount,
                dto.PaymentAccount,
                dto.BranchExclusive,
                dto.Remarks,
                dto.Status,
                null
            );

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            DateTime now =
                DateTime.UtcNow;

            MFSAccountsEntity entity =
                new MFSAccountsEntity
                {
                    AccountSubGroupsId =
                        subGroup.AccountSubGroupId,

                    MFSAccountCode =
                        await GetNextCodeAsync(
                            subGroup.AccountSubGroupId),

                    IsDeleted =
                        false,

                    CreatedBy =
                        userId,

                    CreatedDate =
                        now
                };

            ApplyInput(
                entity,
                input);

            _context
                .Set<MFSAccountsEntity>()
                .Add(entity);

            await _context.SaveChangesAsync();

            AddHistory(
                entity,
                "Create",
                "Created",
                userId,
                now);

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            return entity.MFSAccountId;
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // Update
    //
    // Account Sub Group and Code are locked after creation.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateMFSAccountDto dto,
            long userId
        )
    {
        MFSAccountsEntity? entity =
            await _context
                .Set<MFSAccountsEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MFSAccountId ==
                        dto.MFSAccountId
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
                "MFS Account not found.");
        }

        MfsInput input =
            await NormalizeInputAsync
            (
                dto.MFSAccountName,
                dto.MFSAccountNumber,
                dto.AccountType,
                dto.MFSCharges,
                dto.LinkedBankAccount,
                dto.Branch,
                dto.CollectionAccount,
                dto.PaymentAccount,
                dto.BranchExclusive,
                dto.Remarks,
                dto.Status,
                entity.MFSAccountId
            );

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            DateTime now =
                DateTime.UtcNow;

            ApplyInput(
                entity,
                input);

            entity.ModifiedBy =
                userId;

            entity.ModifiedDate =
                now;

            await _context.SaveChangesAsync();

            AddHistory(
                entity,
                "Update",
                "Updated",
                userId,
                now);

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
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
        MFSAccountsEntity? entity =
            await _context
                .Set<MFSAccountsEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MFSAccountId ==
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
                "MFS Account not found.");
        }

        //=======================================================
        // Dependency Check
        //
        // TODO: When receipts / payments / vouchers use MFS
        // accounts, count their non-deleted rows here and throw
        // InvalidOperationException (returned as HTTP 409).
        //=======================================================

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            DateTime now =
                DateTime.UtcNow;

            entity.IsDeleted =
                true;

            entity.DeletedBy =
                userId;

            entity.DeletedDate =
                now;

            await _context.SaveChangesAsync();

            AddHistory(
                entity,
                "Delete",
                "Deleted",
                userId,
                now);

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // Restore
    //
    // Blocked if the same provider + number was created again
    // after this record was deleted.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        MFSAccountsEntity? entity =
            await _context
                .Set<MFSAccountsEntity>()
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

        string name =
            (entity.MFSAccountName ?? string.Empty).ToUpper();

        bool duplicate =
            await _context
                .Set<MFSAccountsEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.MFSAccountId !=
                        entity.MFSAccountId
                        &&
                        x.MFSAccountName.ToUpper() ==
                        name
                        &&
                        x.MFSAccountNumber ==
                        entity.MFSAccountNumber
                );

        if
        (
            duplicate
        )
        {
            throw new InvalidOperationException(
                $"MFS Account '{entity.DisplayName}' cannot be restored because an active account with the same provider and number already exists.");
        }

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            DateTime now =
                DateTime.UtcNow;

            entity.IsDeleted =
                false;

            entity.DeletedBy =
                null;

            entity.DeletedDate =
                null;

            entity.ModifiedBy =
                userId;

            entity.ModifiedDate =
                now;

            await _context.SaveChangesAsync();

            AddHistory(
                entity,
                "Restore",
                "Restored",
                userId,
                now);

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            return true;
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
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
            .Set<MFSAccountsEntity>()
            .AnyAsync
            (
                x =>
                    x.MFSAccountId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}