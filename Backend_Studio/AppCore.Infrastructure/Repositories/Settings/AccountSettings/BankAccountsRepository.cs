// PAGE-CLONED : Cash Accounts -> Bank Accounts
// PAGE-CLONED : Wings -> Bank Accounts
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
// BankAccounts Repository
//===============================================================

public class BankAccountsRepository : IBankAccountsRepository
{
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
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync(
            long accountSubGroupsId)
    {
        var parent =
            await _context.Set<global::AppCore.Domain.Entities.Settings.AccountSettings.AccountSubGroup>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.AccountSubGroupId == accountSubGroupsId && !x.IsDeleted);

        if (parent == null)
            throw new KeyNotFoundException("Account Sub Group not found.");

        string[] parentParts =
            (parent.SubGroupCode?.Trim() ?? string.Empty)
                .Split('-', StringSplitOptions.RemoveEmptyEntries);

        if (parentParts.Length != 4)
            throw new InvalidOperationException("Invalid account sub group code.");

        int[] seg = new int[3];

        for (int i = 0; i < 3; i++)
        {
            if (!int.TryParse(parentParts[i + 1].Trim(), out seg[i]) || seg[i] < 1)
                throw new InvalidOperationException("Invalid account sub group sequence number.");
        }

        List<string> existingCodes =
            await _context.Set<BankAccountsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.AccountSubGroupsId == accountSubGroupsId)
                .Select(x => x.BankAccountCode)
                .ToListAsync();

        int highest = 0;

        foreach (string code in existingCodes)
        {
            if (string.IsNullOrWhiteSpace(code)) continue;

            string[] parts = code.Split('-', StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length != 5) continue;

            if (!string.Equals(parts[0].Trim(), "BNK", StringComparison.OrdinalIgnoreCase)) continue;

            bool same = true;

            for (int i = 0; i < 3; i++)
            {
                if (!int.TryParse(parts[i + 1].Trim(), out int v) || v != seg[i]) { same = false; break; }
            }

            if (!same) continue;

            if (int.TryParse(parts[4].Trim(), out int sequenceNo) && sequenceNo > highest)
                highest = sequenceNo;
        }

        return CodeGenerator.GenerateBankAccountsCode(seg[0], seg[1], seg[2], highest + 1);
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
        // Resolve AccountSubGroup
        //===========================================================

        AccountSubGroupEntity? accountSubGroup =

            await _context
                .Set<AccountSubGroupEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.AccountSubGroupId ==
                        dto.AccountSubGroupsId

                        &&

                        !x.IsDeleted
                );


        if
        (
            accountSubGroup ==
            null
        )
        {
            throw new KeyNotFoundException(
                "AccountSubGroup not found."
            );
        }


        //===========================================================
        // Resolve BankAccount Code
        //===========================================================

        string bankAccountCode =
            dto.BankAccountCode?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(bankAccountCode)
        )
        {
            bankAccountCode =
                await GetNextCodeAsync(
                    dto.AccountSubGroupsId);
        }


        //===========================================================
        // Create Entity
        //===========================================================

        BankAccountsEntity entity =
            new BankAccountsEntity
            {
                AccountSubGroupsId =
                    dto.AccountSubGroupsId,

                BankAccountCode =
                    bankAccountCode,

                BankAccountName =
                    dto.BankAccountName?.Trim()
                    ??
                    string.Empty,

                Remarks =
                    dto.Remarks?.Trim()
                    ??
                    string.Empty,

                Status =
                    dto.Status,

                Branch =
                    dto.Branch?.Trim()
                    ??
                    string.Empty,

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
                    $"BankAccount '{entity.BankAccountName}' created.",

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
        // Resolve AccountSubGroup
        //===========================================================

        AccountSubGroupEntity? accountSubGroup =

            await _context
                .Set<AccountSubGroupEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.AccountSubGroupId ==
                        dto.AccountSubGroupsId

                        &&

                        !x.IsDeleted
                );


        if
        (
            accountSubGroup ==
            null
        )
        {
            throw new KeyNotFoundException(
                "AccountSubGroup not found."
            );
        }


        entity.AccountSubGroupsId =
            dto.AccountSubGroupsId;

        entity.BankAccountCode =
            dto.BankAccountCode?.Trim()
            ??
            string.Empty;

        entity.BankAccountName =
            dto.BankAccountName?.Trim()
            ??
            string.Empty;

        entity.Remarks =
            dto.Remarks?.Trim()
            ??
            string.Empty;

        entity.Status =
            dto.Status;

        entity.Branch =
            dto.Branch?.Trim()
            ??
            string.Empty;

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
                    $"BankAccount '{entity.BankAccountName}' updated.",

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
                    $"BankAccount '{entity.BankAccountName}' restored.",

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