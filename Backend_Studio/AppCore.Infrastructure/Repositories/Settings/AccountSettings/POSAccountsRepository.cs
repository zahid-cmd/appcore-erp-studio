//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.POSAccounts.DTOs;

using POSAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.POSAccounts;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using BankAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.BankAccounts;

using BankSetupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.BankSetup;

using CardChargesEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.CardCharges;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;

using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.AccountSettings;


//===============================================================
// POS Accounts Repository
//===============================================================

public class POSAccountsRepository : IPOSAccountsRepository
{
    //===========================================================
    // Constants
    //===========================================================

    // POS Accounts are reserved to this Account Sub Group only.
    private const string ReservedSubGroupCode =
        "SUB-002-002-004";

    // Code prefix : POS-002-002-004-00001
    private const string CodePrefix =
        "POS";

    // Name prefix : POS - <Terminal> - <Bank Short Name>
    private const string NamePrefix =
        "POS";

    private const string ModuleName =
        "Account Settings";

    private const string EntityName =
        "POSAccount";

    private const int NameMaxLength =
        200;

    private const int TerminalMaxLength =
        100;

    private const int LinkedBankAccountMaxLength =
        100;

    private const int IssuingBankMaxLength =
        200;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public POSAccountsRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Normalized Input
    //
    // One shape for Create & Update after all rules are applied.
    //===========================================================

    private sealed class PosInput
    {
        public string POSAccountName { get; set; } = string.Empty;

        public string IssuingBank { get; set; } = string.Empty;

        public string TerminalNumber { get; set; } = string.Empty;

        public string LinkedBankAccount { get; set; } = string.Empty;

        public string Branch { get; set; } = string.Empty;

        public bool CollectionAccount { get; set; }

        public bool PaymentAccount { get; set; }

        public bool BranchExclusive { get; set; }

        public string Remarks { get; set; } = string.Empty;

        public bool Status { get; set; }
    }


    //===========================================================
    // POS Accounts Query
    //===========================================================

    private IQueryable<POSAccountDto> POSAccountsQuery()
    {
        return _context
            .Set<POSAccountsEntity>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .Select
            (
                x =>
                    new POSAccountDto
                    {
                        POSAccountId =
                            x.POSAccountId,

                        AccountSubGroupsId =
                            x.AccountSubGroupsId,

                        POSAccountCode =
                            x.POSAccountCode,

                        POSAccountName =
                            x.POSAccountName,

                        IssuingBank =
                            x.IssuingBank,

                        TerminalNumber =
                            x.TerminalNumber,

                        LinkedBankAccount =
                            x.LinkedBankAccount,

                        Branch =
                            x.Branch,

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

    public async Task<List<POSAccountDto>>
        GetAllAsync()
    {
        return await POSAccountsQuery()
            .OrderBy(x => x.POSAccountCode)
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<POSAccountDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await POSAccountsQuery()
            .FirstOrDefaultAsync(x => x.POSAccountId == id);
    }


    //===========================================================
    // Get Next Code
    //
    // Deleted rows are included, because the unique index on
    // POSAccountCode covers them too. A code is never reused.
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
                        x.AccountSubGroupId == accountSubGroupsId
                        &&
                        !x.IsDeleted
                );

        if (parent == null)
        {
            throw new KeyNotFoundException(
                "Account Sub Group not found.");
        }

        // POS Accounts live under the reserved sub group only
        if (!string.Equals(
                parent.SubGroupCode?.Trim(),
                ReservedSubGroupCode,
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"POS Accounts can only be created under Account Sub Group {ReservedSubGroupCode}.");
        }

        string[] parentParts =
            (parent.SubGroupCode?.Trim() ?? string.Empty)
                .Split('-', StringSplitOptions.RemoveEmptyEntries);

        if (parentParts.Length != 4)
        {
            throw new InvalidOperationException(
                "Invalid account sub group code.");
        }

        int[] seg = new int[3];

        for (int i = 0; i < 3; i++)
        {
            if (!int.TryParse(parentParts[i + 1].Trim(), out seg[i]) || seg[i] < 1)
            {
                throw new InvalidOperationException(
                    "Invalid account sub group sequence number.");
            }
        }

        List<string> existingCodes =
            await _context
                .Set<POSAccountsEntity>()
                .AsNoTracking()
                .Where(x => x.AccountSubGroupsId == accountSubGroupsId)
                .Select(x => x.POSAccountCode)
                .ToListAsync();

        int highest = 0;

        foreach (string code in existingCodes)
        {
            if (string.IsNullOrWhiteSpace(code))
            {
                continue;
            }

            string[] parts =
                code.Split('-', StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length != 5)
            {
                continue;
            }

            if (!string.Equals(parts[0].Trim(), CodePrefix, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            bool same = true;

            for (int i = 0; i < 3; i++)
            {
                if (!int.TryParse(parts[i + 1].Trim(), out int v) || v != seg[i])
                {
                    same = false;

                    break;
                }
            }

            if (!same)
            {
                continue;
            }

            if (int.TryParse(parts[4].Trim(), out int sequenceNo) && sequenceNo > highest)
            {
                highest = sequenceNo;
            }
        }

        return CodeGenerator.GeneratePOSAccountsCode(
            seg[0],
            seg[1],
            seg[2],
            highest + 1);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<POSAccountsDefaultsDto>
        GetDefaultsAsync
        (
            long accountSubGroupsId
        )
    {
        return new POSAccountsDefaultsDto
        {
            Code =
                await GetNextCodeAsync(
                    accountSubGroupsId)
        };
    }


    //===========================================================
    // Resolve Reserved Sub Group (SUB-002-002-004)
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
                        x.SubGroupCode == ReservedSubGroupCode
                        &&
                        !x.IsDeleted
                );

        if (subGroup == null)
        {
            throw new KeyNotFoundException(
                $"Reserved Account Sub Group {ReservedSubGroupCode} was not found.");
        }

        return subGroup;
    }


    //===========================================================
    // Resolve Bank Short Name (Bank Setup)
    //
    // Bank Name → BankSetup.ShortName (falls back to Bank Name)
    //
    // requireActive : the bank must be Active, unless it equals
    //                 allowedInactiveName (the value already saved
    //                 on the record being edited).
    //===========================================================

    private async Task<string>
        ResolveBankSetupShortNameAsync
        (
            string bankName,
            string roleLabel,
            bool requireActive,
            string? allowedInactiveName
        )
    {
        string key =
            bankName.Trim().ToUpper();

        BankSetupEntity? bank =
            await _context
                .Set<BankSetupEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.BankName.Trim().ToUpper() == key
                );

        if (bank == null)
        {
            throw new InvalidOperationException(
                $"{roleLabel} '{bankName}' was not found in Bank Setup.");
        }

        bool keepsSavedValue =
            !string.IsNullOrWhiteSpace(allowedInactiveName)
            &&
            string.Equals(
                allowedInactiveName.Trim(),
                bankName.Trim(),
                StringComparison.OrdinalIgnoreCase);

        if (requireActive && !bank.Status && !keepsSavedValue)
        {
            throw new InvalidOperationException(
                $"{roleLabel} '{bankName}' is inactive in Bank Setup.");
        }

        string shortName =
            (bank.ShortName ?? string.Empty).Trim();

        return string.IsNullOrWhiteSpace(shortName)
            ? bank.BankName.Trim()
            : shortName;
    }


    //===========================================================
    // Resolve Linked Bank Short Name
    //
    // Linked Bank Account (Display Name)
    //   → BankAccounts.Bank (Bank Name)
    //   → BankSetup.ShortName (falls back to Bank Name)
    //===========================================================

    private async Task<string>
        ResolveLinkedBankShortNameAsync
        (
            string linkedBankAccount
        )
    {
        BankAccountsEntity? bankAccount =
            await _context
                .Set<BankAccountsEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.DisplayName == linkedBankAccount
                );

        if (bankAccount == null)
        {
            throw new InvalidOperationException(
                $"Linked Bank Account '{linkedBankAccount}' was not found in Bank Accounts.");
        }

        string bankName =
            (bankAccount.Bank ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(bankName))
        {
            throw new InvalidOperationException(
                $"Linked Bank Account '{linkedBankAccount}' has no bank selected.");
        }

        return await ResolveBankSetupShortNameAsync(
            bankName,
            "Bank of the linked bank account",
            requireActive: false,
            allowedInactiveName: null);
    }


    //===========================================================
    // Build POS Account Name
    //
    // POS - <Issuing Bank Short> - <Terminal> - <Linked Bank Short>
    //===========================================================

    private static string BuildPOSAccountName
    (
        string issuingBankShortName,
        string terminalNumber,
        string linkedBankShortName
    )
    {
        return $"{NamePrefix} - {issuingBankShortName.Trim()} - {terminalNumber.Trim()} - {linkedBankShortName.Trim()}"
            .ToUpperInvariant();
    }


    //===========================================================
    // Normalize & Validate Input
    //
    // savedIssuingBank : the record's current Issuing Bank (Update
    //                    only), so an inactive bank that is already
    //                    saved can be kept.
    //===========================================================

    private async Task<PosInput>
        NormalizeInputAsync
        (
            string? issuingBank,
            string? terminalNumber,
            string? linkedBankAccount,
            string? branch,
            bool collectionAccount,
            bool paymentAccount,
            bool branchExclusive,
            string? remarks,
            bool status,
            long? excludeId,
            string? savedIssuingBank
        )
    {
        //=======================================================
        // Branch
        //=======================================================

        string branchName =
            (branch ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(branchName))
        {
            throw new InvalidOperationException(
                "Branch is required.");
        }

        //=======================================================
        // Issuing Bank
        //=======================================================

        string issuing =
            (issuingBank ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(issuing))
        {
            throw new InvalidOperationException(
                "Issuing Bank is required.");
        }

        if (issuing.Length > IssuingBankMaxLength)
        {
            throw new InvalidOperationException(
                $"Issuing Bank cannot be longer than {IssuingBankMaxLength} characters.");
        }

        //=======================================================
        // Terminal Number
        //=======================================================

        string terminal =
            (terminalNumber ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(terminal))
        {
            throw new InvalidOperationException(
                "Terminal Number is required.");
        }

        if (terminal.Length > TerminalMaxLength)
        {
            throw new InvalidOperationException(
                $"Terminal Number cannot be longer than {TerminalMaxLength} characters.");
        }

        //=======================================================
        // Linked Bank Account
        //=======================================================

        string linkedBank =
            (linkedBankAccount ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(linkedBank))
        {
            throw new InvalidOperationException(
                "Linked Bank Account is required.");
        }

        if (linkedBank.Length > LinkedBankAccountMaxLength)
        {
            throw new InvalidOperationException(
                $"Linked Bank Account cannot be longer than {LinkedBankAccountMaxLength} characters.");
        }

        //=======================================================
        // POS Account Name (generated)
        //=======================================================

        string issuingShortName =
            await ResolveBankSetupShortNameAsync(
                issuing,
                "Issuing Bank",
                requireActive: true,
                allowedInactiveName: savedIssuingBank);

        string linkedShortName =
            await ResolveLinkedBankShortNameAsync(
                linkedBank);

        string name =
            BuildPOSAccountName(
                issuingShortName,
                terminal,
                linkedShortName);

        if (name.Length > NameMaxLength)
        {
            throw new InvalidOperationException(
                $"POS Account Name cannot be longer than {NameMaxLength} characters.");
        }

        //=======================================================
        // Duplicates
        //=======================================================

        await EnsureUniqueAsync(
            terminal,
            name,
            excludeId);

        return new PosInput
        {
            POSAccountName =
                name,

            IssuingBank =
                issuing,

            TerminalNumber =
                terminal,

            LinkedBankAccount =
                linkedBank,

            Branch =
                branchName,

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
    // Ensure Unique
    //
    // Terminal Number and POS Account Name must be unique among
    // active (non-deleted) POS accounts.
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            string terminalNumber,
            string posAccountName,
            long? excludeId
        )
    {
        string terminalKey =
            terminalNumber.Trim().ToUpper();

        bool terminalExists =
            await _context
                .Set<POSAccountsEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (excludeId == null || x.POSAccountId != excludeId)
                        &&
                        x.TerminalNumber.Trim().ToUpper() == terminalKey
                );

        if (terminalExists)
        {
            throw new InvalidOperationException(
                $"Terminal Number '{terminalNumber}' is already used by another POS account.");
        }

        string nameKey =
            posAccountName.Trim().ToUpper();

        bool nameExists =
            await _context
                .Set<POSAccountsEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (excludeId == null || x.POSAccountId != excludeId)
                        &&
                        x.POSAccountName.Trim().ToUpper() == nameKey
                );

        if (nameExists)
        {
            throw new InvalidOperationException(
                $"POS Account '{posAccountName}' already exists.");
        }
    }


    //===========================================================
    // Apply Input To Entity
    //===========================================================

    private static void ApplyInput
    (
        POSAccountsEntity entity,
        PosInput input
    )
    {
        entity.POSAccountName =
            input.POSAccountName;

        entity.IssuingBank =
            input.IssuingBank;

        entity.TerminalNumber =
            input.TerminalNumber;

        entity.LinkedBankAccount =
            input.LinkedBankAccount;

        entity.Branch =
            input.Branch;

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
        POSAccountsEntity entity,
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
                    ModuleName,

                EntityName =
                    EntityName,

                EntityId =
                    entity.POSAccountId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"POS Account {verb}",

                ActivityDescription =
                    $"POS Account '{entity.POSAccountName}' ({entity.POSAccountCode}) {verb.ToLowerInvariant()}.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    performedDate
            });
    }


    //===========================================================
    // Create
    //
    // Sub group is always the reserved SUB-002-002-004, and the
    // code and name are always generated here (values sent by
    // the client are ignored).
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreatePOSAccountDto dto,
            long userId
        )
    {
        AccountSubGroupEntity subGroup =
            await ResolveReservedSubGroupAsync();

        PosInput input =
            await NormalizeInputAsync
            (
                dto.IssuingBank,
                dto.TerminalNumber,
                dto.LinkedBankAccount,
                dto.Branch,
                dto.CollectionAccount,
                dto.PaymentAccount,
                dto.BranchExclusive,
                dto.Remarks,
                dto.Status,
                null,
                null
            );

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            DateTime now =
                DateTime.UtcNow;

            string code =
                await GetNextCodeAsync(
                    subGroup.AccountSubGroupId);

            POSAccountsEntity entity =
                new POSAccountsEntity
                {
                    AccountSubGroupsId =
                        subGroup.AccountSubGroupId,

                    POSAccountCode =
                        code,

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
                .Set<POSAccountsEntity>()
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

            return entity.POSAccountId;
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
            UpdatePOSAccountDto dto,
            long userId
        )
    {
        POSAccountsEntity? entity =
            await _context
                .Set<POSAccountsEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.POSAccountId == dto.POSAccountId
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "POS Account not found.");
        }

        PosInput input =
            await NormalizeInputAsync
            (
                dto.IssuingBank,
                dto.TerminalNumber,
                dto.LinkedBankAccount,
                dto.Branch,
                dto.CollectionAccount,
                dto.PaymentAccount,
                dto.BranchExclusive,
                dto.Remarks,
                dto.Status,
                entity.POSAccountId,
                entity.IssuingBank
            );

        await using IDbContextTransaction transaction =
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
    //
    // Blocked (409) while the POS Account has card charges.
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        POSAccountsEntity? entity =
            await _context
                .Set<POSAccountsEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.POSAccountId == id
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "POS Account not found.");
        }

        //=======================================================
        // Dependency Check : Card Charges
        //
        // A POS Account cannot be deleted while it still has
        // active card charges (returned as HTTP 409).
        //=======================================================

        int cardChargeCount =
            await _context
                .Set<CardChargesEntity>()
                .AsNoTracking()
                .CountAsync
                (
                    x =>
                        x.POSAccountId == entity.POSAccountId
                        &&
                        !x.IsDeleted
                );

        if (cardChargeCount > 0)
        {
            throw new InvalidOperationException(
                $"POS Account '{entity.POSAccountName}' cannot be deleted because it has {cardChargeCount} card charge(s). Delete its card charges first.");
        }

        //=======================================================
        // TODO: When receipts / payments / vouchers use POS
        // accounts, count their non-deleted rows here and throw
        // InvalidOperationException (returned as HTTP 409).
        //=======================================================

        await using IDbContextTransaction transaction =
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
    // Blocked (409) when:
    //   • the linked bank account was deleted, or
    //   • the issuing bank was deleted, or
    //   • the terminal number / name is now used by another
    //     active POS account.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        POSAccountsEntity? entity =
            await _context
                .Set<POSAccountsEntity>()
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        //=======================================================
        // Parent : Linked Bank Account must still be active
        //=======================================================

        string linkedBank =
            (entity.LinkedBankAccount ?? string.Empty).Trim();

        bool bankAccountExists =
            await _context
                .Set<BankAccountsEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.DisplayName == linkedBank
                );

        if (!bankAccountExists)
        {
            throw new InvalidOperationException(
                $"POS Account '{entity.POSAccountName}' cannot be restored because its linked bank account '{linkedBank}' has been deleted.");
        }

        //=======================================================
        // Parent : Issuing Bank must still exist in Bank Setup
        // (older records saved before Issuing Bank are skipped)
        //=======================================================

        string issuingBank =
            (entity.IssuingBank ?? string.Empty).Trim();

        if (!string.IsNullOrWhiteSpace(issuingBank))
        {
            string issuingKey =
                issuingBank.ToUpper();

            bool issuingBankExists =
                await _context
                    .Set<BankSetupEntity>()
                    .AsNoTracking()
                    .AnyAsync
                    (
                        x =>
                            !x.IsDeleted
                            &&
                            x.BankName.Trim().ToUpper() == issuingKey
                    );

            if (!issuingBankExists)
            {
                throw new InvalidOperationException(
                    $"POS Account '{entity.POSAccountName}' cannot be restored because its issuing bank '{issuingBank}' has been deleted.");
            }
        }

        //=======================================================
        // Duplicates
        //=======================================================

        try
        {
            await EnsureUniqueAsync(
                entity.TerminalNumber ?? string.Empty,
                entity.POSAccountName ?? string.Empty,
                entity.POSAccountId);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException(
                $"POS Account '{entity.POSAccountName}' cannot be restored. {ex.Message}");
        }

        //=======================================================
        // Restore
        //=======================================================

        await using IDbContextTransaction transaction =
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
            .Set<POSAccountsEntity>()
            .AnyAsync
            (
                x =>
                    x.POSAccountId == id
                    &&
                    !x.IsDeleted
            );
    }
}