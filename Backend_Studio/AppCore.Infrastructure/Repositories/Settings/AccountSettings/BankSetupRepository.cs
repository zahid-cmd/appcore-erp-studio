//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.BankSetup.DTOs;

using BankSetupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.BankSetup;

using BankAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.BankAccounts;

using CardSetupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.CardSetup;

using MFSAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.MFSAccounts;

using POSAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.POSAccounts;

using EmiAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.EmiAccounts;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;

using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.AccountSettings;


//===============================================================
// Bank Setup Repository
//===============================================================

public class BankSetupRepository : IBankSetupRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Account Settings";

    private const string EntityName =
        "BankSetup";

    private const string CodePrefix =
        "BAN";


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public BankSetupRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Bank Setup Query
    //===========================================================

    private IQueryable<BankSetupDto> BankSetupQuery()
    {
        return _context
            .Set<BankSetupEntity>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .Select
            (
                x =>
                    new BankSetupDto
                    {
                        BankSetupId =
                            x.BankSetupId,

                        BankCode =
                            x.BankCode,

                        BankName =
                            x.BankName,

                        Remarks =
                            x.Remarks,

                        Status =
                            x.Status,

                        ShortName =
                            x.ShortName,

                        IsDeleted =
                            x.IsDeleted,

                        //===============================================
                        // Soft Delete
                        //===============================================

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

    public async Task<List<BankSetupDto>>
        GetAllAsync()
    {
        return await BankSetupQuery()
            .OrderBy(x => x.BankCode)
            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<BankSetupDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await BankSetupQuery()
            .FirstOrDefaultAsync(x => x.BankSetupId == id);
    }


    //===========================================================
    // Get Next Code
    //
    // Deleted rows are included so a new code never collides
    // with a soft-deleted record that may be restored later.
    //===========================================================

    public async Task<string>
        GetNextCodeAsync()
    {
        List<string> existingCodes =
            await _context.Set<BankSetupEntity>()
                .AsNoTracking()
                .Select(x => x.BankCode)
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

            if (parts.Length != 2)
            {
                continue;
            }

            if (!string.Equals(parts[0].Trim(), CodePrefix, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (int.TryParse(parts[1].Trim(), out int sequenceNo) && sequenceNo > highest)
            {
                highest = sequenceNo;
            }
        }

        return CodeGenerator.GenerateBankSetupCode(highest + 1);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<BankSetupDefaultsDto>
        GetDefaultsAsync()
    {
        return new BankSetupDefaultsDto
        {
            Code =
                await GetNextCodeAsync()
        };
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateBankSetupDto dto,
            long userId
        )
    {
        string bankName =
            Clean(dto.BankName);

        string shortName =
            Clean(dto.ShortName);

        if (string.IsNullOrWhiteSpace(bankName))
        {
            throw new InvalidOperationException(
                "Bank Name is required.");
        }

        await EnsureUniqueAsync(
            bankName,
            shortName,
            excludeId: null);

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        //=======================================================
        // Resolve Code
        //
        // Always generated on the server, so two users saving
        // at the same time cannot get the same code.
        //=======================================================

        string bankCode =
            await GetNextCodeAsync();

        //=======================================================
        // Create Entity
        //=======================================================

        BankSetupEntity entity =
            new BankSetupEntity
            {
                BankCode =
                    bankCode,

                BankName =
                    bankName,

                Remarks =
                    Clean(dto.Remarks),

                Status =
                    dto.Status,

                ShortName =
                    shortName,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };

        _context
            .Set<BankSetupEntity>()
            .Add(entity);

        await _context.SaveChangesAsync();

        //=======================================================
        // Activity History
        //=======================================================

        AddHistory(
            entity.BankSetupId,
            "Create",
            "Bank Setup Created",
            $"Bank Setup '{entity.BankName}' ({entity.BankCode}) created.",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.BankSetupId;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateBankSetupDto dto,
            long userId
        )
    {
        BankSetupEntity? entity =
            await _context
                .Set<BankSetupEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.BankSetupId == dto.BankSetupId
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Bank Setup not found.");
        }

        string bankName =
            Clean(dto.BankName);

        string shortName =
            Clean(dto.ShortName);

        if (string.IsNullOrWhiteSpace(bankName))
        {
            throw new InvalidOperationException(
                "Bank Name is required.");
        }

        await EnsureUniqueAsync(
            bankName,
            shortName,
            excludeId: entity.BankSetupId);

        //=======================================================
        // Rename Guard
        //
        // Bank Accounts and Card Setup store the Bank Name.
        // Renaming a bank that is in use would orphan them.
        //=======================================================

        bool nameChanged =
            !string.Equals(
                entity.BankName?.Trim(),
                bankName,
                StringComparison.OrdinalIgnoreCase);

        if (nameChanged)
        {
            List<string> usages =
                await GetUsagesAsync(entity.BankName ?? string.Empty);

            if (usages.Count > 0)
            {
                throw new InvalidOperationException(
                    $"Bank Name of '{entity.BankName}' cannot be changed because it is used by " +
                    $"{string.Join(", ", usages)}.");
            }
        }

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        // Bank Code is system generated and never changes on update.

        entity.BankName =
            bankName;

        entity.Remarks =
            Clean(dto.Remarks);

        entity.Status =
            dto.Status;

        entity.ShortName =
            shortName;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        AddHistory(
            entity.BankSetupId,
            "Update",
            "Bank Setup Updated",
            $"Bank Setup '{entity.BankName}' ({entity.BankCode}) updated.",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
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
        BankSetupEntity? entity =
            await _context
                .Set<BankSetupEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.BankSetupId == id
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Bank Setup not found.");
        }

        //=======================================================
        // Dependency Validation
        //=======================================================

        List<string> usages =
            await GetUsagesAsync(entity.BankName ?? string.Empty);

        if (usages.Count > 0)
        {
            throw new InvalidOperationException(
                $"'{entity.BankName}' cannot be deleted because it is used by " +
                $"{string.Join(", ", usages)}. Delete or reassign those records first.");
        }

        //=======================================================
        // Soft Delete
        //=======================================================

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            DateTime.UtcNow;

        AddHistory(
            entity.BankSetupId,
            "Delete",
            "Bank Setup Deleted",
            $"Bank Setup '{entity.BankName}' ({entity.BankCode}) deleted.",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
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
        BankSetupEntity? entity =
            await _context
                .Set<BankSetupEntity>()
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        //=======================================================
        // Restore Validation
        //=======================================================

        string bankName =
            (entity.BankName ?? string.Empty).Trim().ToUpper();

        string bankCode =
            (entity.BankCode ?? string.Empty).Trim().ToUpper();

        bool nameTaken =
            await _context
                .Set<BankSetupEntity>()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.BankSetupId != entity.BankSetupId
                        &&
                        x.BankName.Trim().ToUpper() == bankName
                );

        if (nameTaken)
        {
            throw new InvalidOperationException(
                $"'{entity.BankName}' cannot be restored because another active bank already uses this Bank Name.");
        }

        bool codeTaken =
            await _context
                .Set<BankSetupEntity>()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.BankSetupId != entity.BankSetupId
                        &&
                        x.BankCode.Trim().ToUpper() == bankCode
                );

        if (codeTaken)
        {
            throw new InvalidOperationException(
                $"'{entity.BankName}' cannot be restored because Bank Code '{entity.BankCode}' is already in use.");
        }

        //=======================================================
        // Restore
        //=======================================================

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

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

        AddHistory(
            entity.BankSetupId,
            "Restore",
            "Bank Setup Restored",
            $"Bank Setup '{entity.BankName}' ({entity.BankCode}) restored.",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

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
            .Set<BankSetupEntity>()
            .AnyAsync
            (
                x =>
                    x.BankSetupId == id
                    &&
                    !x.IsDeleted
            );
    }


    //===========================================================
    // Get Usages
    //
    // Returns a readable list of active records that use the
    // bank, e.g. "2 Bank Account(s), 1 Card Setup(s)".
    //
    // Bank Accounts  : BankAccounts.Bank        = Bank Name
    // Card Setup     : CardSetup.IssuingBank    = Bank Name
    // MFS Accounts   : MFSAccounts.LinkedBankAccount
    //                  = BankAccountCode of a bank account of this
    //                    bank (stored by code)
    // POS Accounts   : POSAccounts.IssuingBank   = Bank Name, or
    //                  POSAccounts.LinkedBankAccount
    //                  = BankAccountCode of a bank account of this
    //                    bank (stored by code)
    // EMI Accounts   : EmiAccounts.LinkedBankAccount
    //                  = BankAccountCode of a bank account of this
    //                    bank (stored by code)
    //===========================================================

    private async Task<List<string>>
        GetUsagesAsync
        (
            string bankName
        )
    {
        List<string> usages =
            new List<string>();

        string key =
            (bankName ?? string.Empty).Trim().ToUpper();

        if (string.IsNullOrWhiteSpace(key))
        {
            return usages;
        }

        //=======================================================
        // Bank Accounts
        //=======================================================

        var bankAccounts =
            await _context
                .Set<BankAccountsEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.Bank.Trim().ToUpper() == key
                )
                .Select
                (
                    x =>
                        new
                        {
                            x.DisplayName,
                            x.BankAccountCode
                        }
                )
                .ToListAsync();

        List<string> bankAccountDisplayNames =
            bankAccounts
                .Select(x => x.DisplayName)
                .ToList();

        List<string> bankAccountCodes =
            bankAccounts
                .Select(x => x.BankAccountCode)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .ToList();

        if (bankAccountDisplayNames.Count > 0)
        {
            usages.Add(
                $"{bankAccountDisplayNames.Count} Bank Account(s)");
        }

        //=======================================================
        // Card Setup
        //=======================================================

        int cardSetupCount =
            await _context
                .Set<CardSetupEntity>()
                .AsNoTracking()
                .CountAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.IssuingBank.Trim().ToUpper() == key
                );

        if (cardSetupCount > 0)
        {
            usages.Add(
                $"{cardSetupCount} Card Setup(s)");
        }

        //=======================================================
        // MFS Accounts (linked by CODE to this bank's bank
        // accounts)
        //=======================================================

        if (bankAccountCodes.Count > 0)
        {
            int mfsCount =
                await _context
                    .Set<MFSAccountsEntity>()
                    .AsNoTracking()
                    .CountAsync
                    (
                        x =>
                            !x.IsDeleted
                            &&
                            bankAccountCodes.Contains(x.LinkedBankAccount)
                    );

            if (mfsCount > 0)
            {
                usages.Add(
                    $"{mfsCount} MFS Account(s)");
            }
        }

        //=======================================================
        // POS Accounts
        //   • Issuing Bank = this bank, or
        //   • linked to one of this bank's bank accounts
        //=======================================================

        int posCount =
            await _context
                .Set<POSAccountsEntity>()
                .AsNoTracking()
                .CountAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (
                            x.IssuingBank.Trim().ToUpper() == key
                            ||
                            bankAccountCodes.Contains(x.LinkedBankAccount)
                            ||
                            // a row not yet converted to the code
                            bankAccountDisplayNames.Contains(x.LinkedBankAccount)
                        )
                );

        if (posCount > 0)
        {
            usages.Add(
                $"{posCount} POS Account(s)");
        }

        //=======================================================
        // EMI Accounts (linked to one of this bank's bank
        // accounts)
        //=======================================================

        int emiCount =
            await _context
                .Set<EmiAccountsEntity>()
                .AsNoTracking()
                .CountAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (
                            bankAccountCodes.Contains(x.LinkedBankAccount)
                            ||
                            // a row not yet converted to the code
                            bankAccountDisplayNames.Contains(x.LinkedBankAccount)
                        )
                );

        if (emiCount > 0)
        {
            usages.Add(
                $"{emiCount} EMI Account(s)");
        }

        return usages;
    }


    //===========================================================
    // Ensure Unique
    //===========================================================

    private async Task
        EnsureUniqueAsync
        (
            string bankName,
            string shortName,
            long? excludeId
        )
    {
        string nameKey =
            bankName.Trim().ToUpper();

        bool nameExists =
            await _context
                .Set<BankSetupEntity>()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (excludeId == null || x.BankSetupId != excludeId)
                        &&
                        x.BankName.Trim().ToUpper() == nameKey
                );

        if (nameExists)
        {
            throw new InvalidOperationException(
                $"Bank Name '{bankName}' already exists.");
        }

        if (string.IsNullOrWhiteSpace(shortName))
        {
            return;
        }

        string shortKey =
            shortName.Trim().ToUpper();

        bool shortExists =
            await _context
                .Set<BankSetupEntity>()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        (excludeId == null || x.BankSetupId != excludeId)
                        &&
                        x.ShortName.Trim().ToUpper() == shortKey
                );

        if (shortExists)
        {
            throw new InvalidOperationException(
                $"Short Name '{shortName}' already exists.");
        }
    }


    //===========================================================
    // Add History
    //===========================================================

    private void AddHistory
    (
        long entityId,
        string activityType,
        string title,
        string description,
        long userId
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
                    entityId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    title,

                ActivityDescription =
                    description,

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });
    }


    //===========================================================
    // Clean
    //===========================================================

    private static string Clean
    (
        string? value
    )
    {
        return value?.Trim()
            ??
            string.Empty;
    }
}