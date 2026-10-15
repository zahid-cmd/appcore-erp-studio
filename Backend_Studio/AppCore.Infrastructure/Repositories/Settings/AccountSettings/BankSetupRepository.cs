// PAGE-CLONED : Wings -> Bank Setup
//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.BankSetup.DTOs;

using BankSetupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.BankSetup;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;

using AppCore.Infrastructure.CodeMaster;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.AccountSettings;


//===============================================================
// BankSetup Repository
//===============================================================

public class BankSetupRepository : IBankSetupRepository
{
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
    // BankSetup Query
    //===========================================================

    private IQueryable<BankSetupDto> BankSetupQuery()
    {
        return _context
            .Set<BankSetupEntity>()

            .AsNoTracking()

            .Where
            (
                x =>
                    !x.IsDeleted
            )

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

    public async Task<List<BankSetupDto>>
        GetAllAsync()
    {
        return await BankSetupQuery()

            .OrderBy
            (
                x =>
                    x.BankCode
            )

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

            .FirstOrDefaultAsync
            (
                x =>
                    x.BankSetupId ==
                    id
            );
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    public async Task<string>
        GetNextCodeAsync()
    {
        List<string> existingCodes =
            await _context.Set<BankSetupEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => x.BankCode)
                .ToListAsync();

        int highest = 0;

        foreach (string code in existingCodes)
        {
            if (string.IsNullOrWhiteSpace(code)) continue;

            string[] parts = code.Split('-', StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length != 2) continue;

            if (!string.Equals(parts[0].Trim(), "BAN", StringComparison.OrdinalIgnoreCase)) continue;

            if (int.TryParse(parts[1].Trim(), out int sequenceNo) && sequenceNo > highest)
                highest = sequenceNo;
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

        //===========================================================
        // Resolve BankSetup Code
        //===========================================================

        string bankSetupCode =
            dto.BankCode?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(bankSetupCode)
        )
        {
            bankSetupCode =
                await GetNextCodeAsync();
        }


        //===========================================================
        // Create Entity
        //===========================================================

        BankSetupEntity entity =
            new BankSetupEntity
            {
                BankCode =
                    dto.BankCode?.Trim()
                    ??
                    string.Empty,

                BankName =
                    dto.BankName?.Trim()
                    ??
                    string.Empty,

                Remarks =
                    dto.Remarks?.Trim()
                    ??
                    string.Empty,

                Status =
                    dto.Status,

                ShortName =
                    dto.ShortName?.Trim()
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
            .Set<BankSetupEntity>()
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
                    "BankSetup",

                EntityId =
                    entity.BankSetupId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "BankSetup Created",

                ActivityDescription =
                    $"BankSetup '{entity.BankName}' created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


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
        //===========================================================
        // Resolve BankSetup
        //===========================================================

        BankSetupEntity? entity =

            await _context
                .Set<BankSetupEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.BankSetupId ==
                        dto.BankSetupId

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
                "BankSetup not found."
            );
        }



        entity.BankCode =
            dto.BankCode?.Trim()
            ??
            string.Empty;

        entity.BankName =
            dto.BankName?.Trim()
            ??
            string.Empty;

        entity.Remarks =
            dto.Remarks?.Trim()
            ??
            string.Empty;

        entity.Status =
            dto.Status;

        entity.ShortName =
            dto.ShortName?.Trim()
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
                    "BankSetup",

                EntityId =
                    entity.BankSetupId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "BankSetup Updated",

                ActivityDescription =
                    $"BankSetup '{entity.BankName}' updated.",

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
        // Resolve BankSetup
        //===========================================================

        BankSetupEntity? entity =

            await _context
                .Set<BankSetupEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.BankSetupId ==
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
                "BankSetup not found."
            );
        }


        //===========================================================
        // Soft Delete BankSetup
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
                    "BankSetup",

                EntityId =
                    entity.BankSetupId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "BankSetup Deleted",

                ActivityDescription =
                    $"BankSetup '{entity.BankName}' deleted.",

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
        BankSetupEntity? entity =

            await _context
                .Set<BankSetupEntity>()

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
                    "BankSetup",

                EntityId =
                    entity.BankSetupId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "BankSetup Restored",

                ActivityDescription =
                    $"BankSetup '{entity.BankName}' restored.",

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
            .Set<BankSetupEntity>()

            .AnyAsync
            (
                x =>

                    x.BankSetupId ==
                    id

                    &&

                    !x.IsDeleted
            );
    }
}