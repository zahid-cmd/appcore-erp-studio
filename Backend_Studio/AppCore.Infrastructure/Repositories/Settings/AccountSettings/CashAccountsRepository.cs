// PAGE-CLONED : Wings -> Cash Accounts
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
// CashAccounts Repository
//===============================================================

public class CashAccountsRepository : ICashAccountsRepository
{
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
            await _context.Set<CashAccountsEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.AccountSubGroupsId == accountSubGroupsId)
                .Select(x => x.CashAccountCode)
                .ToListAsync();

        int highest = 0;

        foreach (string code in existingCodes)
        {
            if (string.IsNullOrWhiteSpace(code)) continue;

            string[] parts = code.Split('-', StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length != 5) continue;

            if (!string.Equals(parts[0].Trim(), "CSH", StringComparison.OrdinalIgnoreCase)) continue;

            bool same = true;

            for (int i = 0; i < 3; i++)
            {
                if (!int.TryParse(parts[i + 1].Trim(), out int v) || v != seg[i]) { same = false; break; }
            }

            if (!same) continue;

            if (int.TryParse(parts[4].Trim(), out int sequenceNo) && sequenceNo > highest)
                highest = sequenceNo;
        }

        return CodeGenerator.GenerateCashAccountsCode(seg[0], seg[1], seg[2], highest + 1);
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
        // Resolve CashAccount Code
        //===========================================================

        string cashAccountCode =
            dto.CashAccountCode?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(cashAccountCode)
        )
        {
            cashAccountCode =
                await GetNextCodeAsync(
                    dto.AccountSubGroupsId);
        }


        //===========================================================
        // Create Entity
        //===========================================================

        CashAccountsEntity entity =
            new CashAccountsEntity
            {
                AccountSubGroupsId =
                    dto.AccountSubGroupsId,

                CashAccountCode =
                    cashAccountCode,

                CashAccountName =
                    dto.CashAccountName?.Trim()
                    ??
                    string.Empty,

                Remarks =
                    dto.Remarks?.Trim()
                    ??
                    string.Empty,

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
                    $"CashAccount '{entity.CashAccountName}' created.",

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

        entity.CashAccountCode =
            dto.CashAccountCode?.Trim()
            ??
            string.Empty;

        entity.CashAccountName =
            dto.CashAccountName?.Trim()
            ??
            string.Empty;

        entity.Remarks =
            dto.Remarks?.Trim()
            ??
            string.Empty;

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
                    "CashAccount",

                EntityId =
                    entity.CashAccountId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "CashAccount Updated",

                ActivityDescription =
                    $"CashAccount '{entity.CashAccountName}' updated.",

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
                    $"CashAccount '{entity.CashAccountName}' deleted.",

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
                    $"CashAccount '{entity.CashAccountName}' restored.",

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