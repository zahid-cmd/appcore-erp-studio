// PAGE-CLONED : Bank Setup -> Card Setup
// PAGE-CLONED : Wings -> Card Setup
//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.CardSetup.DTOs;

using CardSetupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.CardSetup;

using CardChargesEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.CardCharges;

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
// CardSetup Repository
//===============================================================

public class CardSetupRepository : ICardSetupRepository
{
    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public CardSetupRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // CardSetup Query
    //===========================================================

    private IQueryable<CardSetupDto> CardSetupQuery()
    {
        return _context
            .Set<CardSetupEntity>()

            .AsNoTracking()

            .Where
            (
                x =>
                    !x.IsDeleted
            )

            .Select
            (
                x =>
                    new CardSetupDto
                    {
                        CardSetupId =
                            x.CardSetupId,

                        CardCode =
                            x.CardCode,

                        CardName =
                            x.CardName,

                        Remarks =
                            x.Remarks,

                        Status =
                            x.Status,

                        ShortName =
                            x.ShortName,

                        IssuingBank =
                            x.IssuingBank,

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

    public async Task<List<CardSetupDto>>
        GetAllAsync()
    {
        return await CardSetupQuery()

            .OrderBy
            (
                x =>
                    x.CardCode
            )

            .ToListAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<CardSetupDto?>
        GetByIdAsync
        (
            long id
        )
    {
        return await CardSetupQuery()

            .FirstOrDefaultAsync
            (
                x =>
                    x.CardSetupId ==
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
            await _context.Set<CardSetupEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => x.CardCode)
                .ToListAsync();

        int highest = 0;

        foreach (string code in existingCodes)
        {
            if (string.IsNullOrWhiteSpace(code)) continue;

            string[] parts = code.Split('-', StringSplitOptions.RemoveEmptyEntries);

            if (parts.Length != 2) continue;

            if (!string.Equals(parts[0].Trim(), "CRD", StringComparison.OrdinalIgnoreCase)) continue;

            if (int.TryParse(parts[1].Trim(), out int sequenceNo) && sequenceNo > highest)
                highest = sequenceNo;
        }

        return CodeGenerator.GenerateCardSetupCode(highest + 1);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<CardSetupDefaultsDto>
        GetDefaultsAsync()
    {
        return new CardSetupDefaultsDto
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
            CreateCardSetupDto dto,

            long userId
        )
    {

        //===========================================================
        // Resolve CardSetup Code
        //===========================================================

        string cardSetupCode =
            dto.CardCode?.Trim()
            ??
            string.Empty;


        if
        (
            string.IsNullOrWhiteSpace(cardSetupCode)
        )
        {
            cardSetupCode =
                await GetNextCodeAsync();
        }


        //===========================================================
        // Create Entity
        //===========================================================

        CardSetupEntity entity =
            new CardSetupEntity
            {
                CardCode =
                    cardSetupCode,

                CardName =
                    dto.CardName?.Trim()
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

                IssuingBank =
                    dto.IssuingBank?.Trim()
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
            .Set<CardSetupEntity>()
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
                    "CardSetup",

                EntityId =
                    entity.CardSetupId,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "CardSetup Created",

                ActivityDescription =
                    $"CardSetup '{entity.CardName}' created.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );


        await _context.SaveChangesAsync();


        return entity.CardSetupId;
    }


    //===========================================================
    // Update
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateCardSetupDto dto,

            long userId
        )
    {
        //===========================================================
        // Resolve CardSetup
        //===========================================================

        CardSetupEntity? entity =

            await _context
                .Set<CardSetupEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.CardSetupId ==
                        dto.CardSetupId

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
                "CardSetup not found."
            );
        }



        entity.CardCode =
            dto.CardCode?.Trim()
            ??
            string.Empty;

        entity.CardName =
            dto.CardName?.Trim()
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

        entity.IssuingBank =
            dto.IssuingBank?.Trim()
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
                    "CardSetup",

                EntityId =
                    entity.CardSetupId,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "CardSetup Updated",

                ActivityDescription =
                    $"CardSetup '{entity.CardName}' updated.",

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
    //
    // Blocked (409) while the card is used in Card Charges.
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,

            long userId
        )
    {
        //===========================================================
        // Resolve CardSetup
        //===========================================================

        CardSetupEntity? entity =

            await _context
                .Set<CardSetupEntity>()

                .FirstOrDefaultAsync
                (
                    x =>

                        x.CardSetupId ==
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
                "CardSetup not found."
            );
        }


        //===========================================================
        // Dependency Check : Card Charges
        //
        // A card cannot be deleted while it is used in active POS
        // card charges (returned as HTTP 409).
        //===========================================================

        int cardChargeCount =

            await _context
                .Set<CardChargesEntity>()

                .AsNoTracking()

                .CountAsync
                (
                    x =>

                        x.CardSetupId ==
                        entity.CardSetupId

                        &&

                        !x.IsDeleted
                );


        if
        (
            cardChargeCount >
            0
        )
        {
            throw new InvalidOperationException(
                $"Card '{entity.CardName}' cannot be deleted because it is used in {cardChargeCount} POS card charge(s). Remove it from those card charges first."
            );
        }


        //===========================================================
        // Soft Delete CardSetup
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
                    "CardSetup",

                EntityId =
                    entity.CardSetupId,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "CardSetup Deleted",

                ActivityDescription =
                    $"CardSetup '{entity.CardName}' deleted.",

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
    // Blocked (409) when:
    //   • the issuing bank was deleted, or
    //   • an active card now has the same name or code.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        CardSetupEntity? entity =

            await _context
                .Set<CardSetupEntity>()

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
        // Parent : Issuing Bank must still be active
        //===========================================================

        string issuingBank =
            entity.IssuingBank?.Trim()
            ??
            string.Empty;


        if
        (
            !string.IsNullOrWhiteSpace(issuingBank)
        )
        {
            string bankKey =
                issuingBank.ToUpper();


            bool bankExists =

                await _context
                    .Set<BankSetupEntity>()

                    .AsNoTracking()

                    .AnyAsync
                    (
                        x =>

                            !x.IsDeleted

                            &&

                            x.BankName.Trim().ToUpper() ==
                            bankKey
                    );


            if
            (
                !bankExists
            )
            {
                throw new InvalidOperationException(
                    $"Card '{entity.CardName}' cannot be restored because its issuing bank '{issuingBank}' has been deleted."
                );
            }
        }


        //===========================================================
        // Duplicates : Card Name / Card Code
        //===========================================================

        string nameKey =
            entity.CardName?.Trim().ToUpper()
            ??
            string.Empty;

        string codeKey =
            entity.CardCode?.Trim().ToUpper()
            ??
            string.Empty;


        bool duplicateExists =

            await _context
                .Set<CardSetupEntity>()

                .AsNoTracking()

                .AnyAsync
                (
                    x =>

                        !x.IsDeleted

                        &&

                        x.CardSetupId !=
                        entity.CardSetupId

                        &&

                        (
                            x.CardName.Trim().ToUpper() ==
                            nameKey

                            ||

                            x.CardCode.Trim().ToUpper() ==
                            codeKey
                        )
                );


        if
        (
            duplicateExists
        )
        {
            throw new InvalidOperationException(
                $"Card '{entity.CardName}' ({entity.CardCode}) cannot be restored because an active card with the same name or code already exists."
            );
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
                    "CardSetup",

                EntityId =
                    entity.CardSetupId,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "CardSetup Restored",

                ActivityDescription =
                    $"CardSetup '{entity.CardName}' restored.",

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
            .Set<CardSetupEntity>()

            .AnyAsync
            (
                x =>

                    x.CardSetupId ==
                    id

                    &&

                    !x.IsDeleted
            );
    }
}