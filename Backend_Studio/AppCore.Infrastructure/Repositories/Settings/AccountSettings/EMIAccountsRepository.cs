//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Settings.AccountSettings;

using AppCore.Domain.Common;

using AppCore.Infrastructure.CodeMaster;
using AppCore.Infrastructure.Persistence;

using EmiAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.EmiAccounts;

using AccountSubGroupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup;

using BankAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.BankAccounts;

using BankSetupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.BankSetup;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.AccountSettings;


//===============================================================
// EMI Accounts Repository
//
// Reserved sub group : SUB-002-002-005 Cash With EMI (by CODE)
// Code               : EMI-002-002-005-nnnnn (never reused)
// Name (UPPERCASE)   : EMI - <Platform> - <Linked Bank Short>
// Unique (live rows) : ONE account per Platform (and the name)
// The card used is chosen per sale (Payment Desk), not here.
// Flags              : Collection Account always Yes, Payment
//                      Account always No
//===============================================================

public class EmiAccountsRepository : IEmiAccountsRepository
{
    //===========================================================
    // Constants
    //===========================================================

    // EMI Accounts are reserved to this Account Sub Group only.
    private const string ReservedSubGroupCode =
        "SUB-002-002-005";

    // Code prefix : EMI-002-002-005-00001
    private const string CodePrefix =
        "EMI";

    // Name prefix : EMI - <Platform> - <Bank>
    private const string NamePrefix =
        "EMI";

    private const string ModuleName =
        "Account Settings";

    private const string EntityName =
        "EmiAccount";

    private const int NameMaxLength =
        200;

    private const int LinkedBankAccountMaxLength =
        100;

    private const int BranchMaxLength =
        200;

    private const int RemarksMaxLength =
        1000;

    // Allowed platforms, in display form
    private static readonly string[] Platforms =
    {
        "SSLCommerz",
        "ShurjoPay",
        "POS",
        "QR",
        "Online"
    };


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public EmiAccountsRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Normalized Input (Create & Update)
    //===========================================================

    private sealed class EmiInput
    {
        public string EmiAccountName { get; set; } = string.Empty;

        public string Platform { get; set; } = string.Empty;

        public string LinkedBankAccount { get; set; } = string.Empty;

        public string Branch { get; set; } = string.Empty;

        public bool BranchExclusive { get; set; }

        public string Remarks { get; set; } = string.Empty;

        public bool Status { get; set; }
    }


    //===========================================================
    // Get All
    //===========================================================

    public async Task<List<EmiAccountsDto>>
        GetAllAsync()
    {
        List<EmiAccountsEntity> rows =
            await _context
                .Set<EmiAccountsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .OrderBy(x => x.EmiAccountCode)
                .ToListAsync();

        return await ToDtosAsync(rows);
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<EmiAccountsDto?>
        GetByIdAsync
        (
            long id
        )
    {
        EmiAccountsEntity? row =
            await _context
                .Set<EmiAccountsEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.EmiAccountId == id
                        &&
                        !x.IsDeleted
                );

        if (row == null)
        {
            return null;
        }

        List<EmiAccountsDto> list =
            await ToDtosAsync(
                new List<EmiAccountsEntity> { row });

        return list.FirstOrDefault();
    }


    //===========================================================
    // To DTOs (adds sub group display values)
    //===========================================================

    private async Task<List<EmiAccountsDto>>
        ToDtosAsync
        (
            List<EmiAccountsEntity> rows
        )
    {
        List<long> subGroupIds =
            rows.Select(x => x.AccountSubGroupsId).Distinct().ToList();

        // Deleted sub groups are still shown by name
        Dictionary<long, AccountSubGroupEntity> subGroups =
            await _context
                .Set<AccountSubGroupEntity>()
                .AsNoTracking()
                .Where(x => subGroupIds.Contains(x.AccountSubGroupId))
                .ToDictionaryAsync(x => x.AccountSubGroupId);

        return rows
            .Select
            (
                x =>
                {
                    subGroups.TryGetValue(
                        x.AccountSubGroupsId,
                        out AccountSubGroupEntity? subGroup);

                    return new EmiAccountsDto
                    {
                        EmiAccountId = x.EmiAccountId,

                        AccountSubGroupsId = x.AccountSubGroupsId,

                        SubGroupCode = subGroup?.SubGroupCode ?? string.Empty,

                        SubGroupName = subGroup?.SubGroupName ?? string.Empty,

                        EmiAccountCode = x.EmiAccountCode,

                        EmiAccountName = x.EmiAccountName,

                        Platform = x.Platform,

                        LinkedBankAccount = x.LinkedBankAccount,

                        Branch = x.Branch,

                        CollectionAccount = x.CollectionAccount,

                        PaymentAccount = x.PaymentAccount,

                        BranchExclusive = x.BranchExclusive,

                        Remarks = x.Remarks,

                        Status = x.Status,

                        CreatedBy = x.CreatedBy,

                        CreatedDate = x.CreatedDate,

                        ModifiedBy = x.ModifiedBy,

                        ModifiedDate = x.ModifiedDate
                    };
                }
            )
            .ToList();
    }


    //===========================================================
    // Get Defaults (Add form)
    //===========================================================

    public async Task<EmiAccountsDefaultsDto>
        GetDefaultsAsync()
    {
        AccountSubGroupEntity? subGroup =
            await FindReservedSubGroupAsync();

        if (subGroup == null)
        {
            return new EmiAccountsDefaultsDto
            {
                Message =
                    $"Account Sub Group {ReservedSubGroupCode} (Cash With EMI) was not found. Create it on the Account Sub Groups page first."
            };
        }

        return new EmiAccountsDefaultsDto
        {
            AccountSubGroupsId =
                subGroup.AccountSubGroupId,

            SubGroupCode =
                subGroup.SubGroupCode,

            SubGroupName =
                subGroup.SubGroupName,

            Code =
                await NextCodeAsync(subGroup)
        };
    }


    //===========================================================
    // Reserved Sub Group (SUB-002-002-005, by code)
    //===========================================================

    private async Task<AccountSubGroupEntity?>
        FindReservedSubGroupAsync()
    {
        return await _context
            .Set<AccountSubGroupEntity>()
            .AsNoTracking()
            .FirstOrDefaultAsync
            (
                x =>
                    x.SubGroupCode == ReservedSubGroupCode
                    &&
                    !x.IsDeleted
            );
    }

    private async Task<AccountSubGroupEntity>
        ResolveReservedSubGroupAsync()
    {
        AccountSubGroupEntity? subGroup =
            await FindReservedSubGroupAsync();

        if (subGroup == null)
        {
            throw new InvalidOperationException(
                $"Account Sub Group {ReservedSubGroupCode} (Cash With EMI) was not found. Create it on the Account Sub Groups page first.");
        }

        return subGroup;
    }


    //===========================================================
    // Next Code : EMI-ccc-ggg-sss-nnnnn
    //
    // Deleted rows are included, because the unique index on
    // EmiAccountCode covers them too. A code is never reused.
    //===========================================================

    private async Task<string>
        NextCodeAsync
        (
            AccountSubGroupEntity subGroup
        )
    {
        string[] parentParts =
            (subGroup.SubGroupCode ?? string.Empty)
                .Trim()
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

        string codeStart =
            $"{CodePrefix}-{seg[0]:D3}-{seg[1]:D3}-{seg[2]:D3}-";

        List<string> existingCodes =
            await _context
                .Set<EmiAccountsEntity>()
                .AsNoTracking()
                .Where(x => x.EmiAccountCode.StartsWith(codeStart))
                .Select(x => x.EmiAccountCode)
                .ToListAsync();

        int highest = 0;

        foreach (string code in existingCodes)
        {
            string last =
                code.Substring(codeStart.Length);

            if (int.TryParse(last, out int number) && number > highest)
            {
                highest = number;
            }
        }

        if (highest >= 99999)
        {
            throw new InvalidOperationException(
                "EMI account codes for this sub group are exhausted (99999).");
        }

        return CodeGenerator.GenerateEmiAccountsCode(
            seg[0],
            seg[1],
            seg[2],
            highest + 1);
    }


    //===========================================================
    // Platform : SSLCommerz / ShurjoPay / POS / QR / Online
    // (case ignored on input)
    //===========================================================

    private static string NormalizePlatform
    (
        string? platform
    )
    {
        string value =
            (platform ?? string.Empty).Trim();

        string? match =
            Platforms.FirstOrDefault
            (
                x =>
                    string.Equals(
                        x,
                        value,
                        StringComparison.OrdinalIgnoreCase)
            );

        if (match == null)
        {
            throw new InvalidOperationException(
                "Platform must be SSLCommerz, ShurjoPay, POS, QR or Online.");
        }

        return match;
    }


    //===========================================================
    // Linked Bank Short Name
    //
    // Linked Bank Account (Display Name)
    //   → BankAccounts.Bank (Bank Name)
    //   → BankSetup.ShortName (falls back to Bank Name)
    //===========================================================

    private async Task<string>
        ResolveLinkedBankShortNameAsync
        (
            string linkedBankAccount,
            string? savedLinkedBankAccount
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

        // Must be Active, unless it is the account already saved
        if (!bankAccount.Status && savedLinkedBankAccount != linkedBankAccount)
        {
            throw new InvalidOperationException(
                $"Linked Bank Account '{linkedBankAccount}' is inactive in Bank Accounts.");
        }

        string bankName =
            (bankAccount.Bank ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(bankName))
        {
            throw new InvalidOperationException(
                $"Linked Bank Account '{linkedBankAccount}' has no bank selected.");
        }

        string key =
            bankName.ToUpper();

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
                $"Bank '{bankName}' of the linked bank account was not found in Bank Setup.");
        }

        string shortName =
            (bank.ShortName ?? string.Empty).Trim();

        return string.IsNullOrWhiteSpace(shortName)
            ? bank.BankName.Trim()
            : shortName;
    }


    //===========================================================
    // Build EMI Account Name (UPPERCASE)
    //===========================================================

    private static string BuildEmiAccountName
    (
        string platform,
        string linkedBankShortName
    )
    {
        return $"{NamePrefix} - {platform.Trim()} - {linkedBankShortName.Trim()}"
            .ToUpperInvariant();
    }


    //===========================================================
    // Normalize & Validate Input
    //===========================================================

    private async Task<EmiInput>
        NormalizeInputAsync
        (
            string? platform,
            string? linkedBankAccount,
            string? branch,
            bool branchExclusive,
            string? remarks,
            bool status,
            long? excludeId,
            string? savedLinkedBankAccount
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

        if (branchName.Length > BranchMaxLength)
        {
            throw new InvalidOperationException(
                $"Branch cannot be longer than {BranchMaxLength} characters.");
        }

        //=======================================================
        // Platform
        //=======================================================

        string platformName =
            NormalizePlatform(platform);

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

        string linkedShortName =
            await ResolveLinkedBankShortNameAsync(
                linkedBank,
                savedLinkedBankAccount);

        //=======================================================
        // Remarks
        //=======================================================

        string remarksText =
            (remarks ?? string.Empty).Trim();

        if (remarksText.Length > RemarksMaxLength)
        {
            throw new InvalidOperationException(
                $"Remarks cannot be longer than {RemarksMaxLength} characters.");
        }

        //=======================================================
        // Name (generated)
        //=======================================================

        string name =
            BuildEmiAccountName(
                platformName,
                linkedShortName);

        if (name.Length > NameMaxLength)
        {
            throw new InvalidOperationException(
                $"EMI Account Name cannot be longer than {NameMaxLength} characters.");
        }

        //=======================================================
        // Duplicates
        //=======================================================

        await EnsureUniqueAsync(
            platformName,
            linkedBank,
            name,
            excludeId);

        return new EmiInput
        {
            EmiAccountName = name,

            Platform = platformName,

            LinkedBankAccount = linkedBank,

            Branch = branchName,

            BranchExclusive = branchExclusive,

            Remarks = remarksText,

            Status = status
        };
    }


    //===========================================================
    // Ensure Unique (live rows)
    //
    //   • Platform : one EMI account per platform
    //   • EMI Account Name
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            string platform,
            string linkedBankAccount,
            string emiAccountName,
            long? excludeId
        )
    {
        EmiAccountsEntity? samePlatform =
            await _context
                .Set<EmiAccountsEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (excludeId == null || x.EmiAccountId != excludeId)
                        &&
                        x.Platform == platform
                );

        if (samePlatform != null)
        {
            throw new InvalidOperationException(
                $"{platform} already has an EMI account ({samePlatform.EmiAccountCode} - {samePlatform.EmiAccountName}). Only one EMI account is allowed per platform.");
        }

        string nameKey =
            emiAccountName.Trim().ToUpper();

        bool nameExists =
            await _context
                .Set<EmiAccountsEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (excludeId == null || x.EmiAccountId != excludeId)
                        &&
                        x.EmiAccountName.Trim().ToUpper() == nameKey
                );

        if (nameExists)
        {
            throw new InvalidOperationException(
                $"EMI Account '{emiAccountName}' already exists. Give the bank a different short name.");
        }
    }


    //===========================================================
    // Apply Input To Entity
    //===========================================================

    private static void ApplyInput
    (
        EmiAccountsEntity entity,
        EmiInput input
    )
    {
        entity.EmiAccountName = input.EmiAccountName;

        entity.Platform = input.Platform;

        entity.LinkedBankAccount = input.LinkedBankAccount;

        entity.Branch = input.Branch;

        // Fixed : EMI accounts only collect
        entity.CollectionAccount = true;

        entity.PaymentAccount = false;

        entity.BranchExclusive = input.BranchExclusive;

        entity.Remarks = input.Remarks;

        entity.Status = input.Status;
    }


    //===========================================================
    // Add Activity History
    //===========================================================

    private void AddHistory
    (
        EmiAccountsEntity entity,
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
                    entity.EmiAccountId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"EMI Account {verb}",

                ActivityDescription =
                    $"EMI Account '{entity.EmiAccountName}' ({entity.EmiAccountCode}) {verb.ToLowerInvariant()}.",

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
    // Sub group is always SUB-002-002-005; code and name are
    // always generated here.
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateEmiAccountsDto dto,
            long userId
        )
    {
        AccountSubGroupEntity subGroup =
            await ResolveReservedSubGroupAsync();

        EmiInput input =
            await NormalizeInputAsync
            (
                dto.Platform,
                dto.LinkedBankAccount,
                dto.Branch,
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

            EmiAccountsEntity entity =
                new EmiAccountsEntity
                {
                    AccountSubGroupsId =
                        subGroup.AccountSubGroupId,

                    EmiAccountCode =
                        await NextCodeAsync(subGroup),

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
                .Set<EmiAccountsEntity>()
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

            return entity.EmiAccountId;
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
    // Account Sub Group, Code and Platform are locked after
    // creation.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateEmiAccountsDto dto,
            long userId
        )
    {
        EmiAccountsEntity? entity =
            await _context
                .Set<EmiAccountsEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.EmiAccountId == dto.EmiAccountId
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "EMI Account not found.");
        }

        // Platform is locked after creation
        if (!string.Equals(
                NormalizePlatform(dto.Platform),
                entity.Platform,
                StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"Platform cannot be changed after the EMI account is created (it is {entity.Platform}).");
        }

        EmiInput input =
            await NormalizeInputAsync
            (
                dto.Platform,
                dto.LinkedBankAccount,
                dto.Branch,
                dto.BranchExclusive,
                dto.Remarks,
                dto.Status,
                entity.EmiAccountId,
                entity.LinkedBankAccount
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
    // Delete (soft)
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        EmiAccountsEntity? entity =
            await _context
                .Set<EmiAccountsEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.EmiAccountId == id
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "EMI Account not found.");
        }

        //=======================================================
        // TODO: When receipt vouchers / EMI reconciliation use
        // EMI accounts, count their non-deleted rows here and
        // throw InvalidOperationException (returned as HTTP 409).
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
    // Restore (most recently deleted)
    //
    // Blocked (409) when the linked bank account was deleted, or
    // its platform / name is now used by another live EMI
    // account.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        EmiAccountsEntity? entity =
            await _context
                .Set<EmiAccountsEntity>()
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        //=======================================================
        // Parents
        //=======================================================

        bool bankAccountExists =
            await _context
                .Set<BankAccountsEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.DisplayName == entity.LinkedBankAccount
                );

        if (!bankAccountExists)
        {
            throw new InvalidOperationException(
                $"EMI Account '{entity.EmiAccountName}' cannot be restored because its linked bank account '{entity.LinkedBankAccount}' has been deleted.");
        }

        //=======================================================
        // Rebuild the name (short names may have changed while
        // the account was deleted)
        //=======================================================

        string linkedShortName;

        try
        {
            linkedShortName =
                await ResolveLinkedBankShortNameAsync(
                    entity.LinkedBankAccount,
                    entity.LinkedBankAccount);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException(
                $"EMI Account '{entity.EmiAccountName}' cannot be restored. {ex.Message}");
        }

        entity.EmiAccountName =
            BuildEmiAccountName(
                entity.Platform,
                linkedShortName);

        //=======================================================
        // Duplicates
        //=======================================================

        try
        {
            await EnsureUniqueAsync(
                entity.Platform,
                entity.LinkedBankAccount,
                entity.EmiAccountName,
                entity.EmiAccountId);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException(
                $"EMI Account '{entity.EmiAccountName}' cannot be restored. {ex.Message}");
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
            .Set<EmiAccountsEntity>()
            .AnyAsync
            (
                x =>
                    x.EmiAccountId == id
                    &&
                    !x.IsDeleted
            );
    }
}