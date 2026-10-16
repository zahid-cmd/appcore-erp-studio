//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Settings.AccountSettings;
using AppCore.Application.Settings.AccountSettings.CardCharges.DTOs;

using CardChargesEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.CardCharges;

using POSAccountsEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.POSAccounts;

using CardSetupEntity =
    AppCore.Domain.Entities.Settings.AccountSettings.CardSetup;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.AccountSettings;


//===============================================================
// Card Charges Repository
//
// Master : POS Account. Every operation is keyed by POSAccountId.
//
// Delete  : soft-deletes all lines of the POS Account, stamped
//           with the same DeletedDate (one "batch").
// Restore : restores the most recently deleted batch.
// Update  : lines removed during an edit are removed physically
//           (they are part of the edit, not a restorable delete).
//===============================================================

public class CardChargesRepository : ICardChargesRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "Account Settings";

    private const string EntityName =
        "CardCharges";

    private const decimal MinChargePercent =
        0m;

    private const decimal MaxChargePercent =
        100m;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public CardChargesRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Line Row (query projection)
    //===========================================================

    private sealed class LineRow
    {
        public long CardChargeId { get; set; }

        public long POSAccountId { get; set; }

        public long CardSetupId { get; set; }

        public string CardCode { get; set; } = string.Empty;

        public string CardName { get; set; } = string.Empty;

        public decimal ChargePercent { get; set; }
    }


    //===========================================================
    // Active Lines Query (joined with Card Setup)
    //===========================================================

    private IQueryable<LineRow> ActiveLinesQuery()
    {
        return
            from charge in _context.Set<CardChargesEntity>().AsNoTracking()
            join card in _context.Set<CardSetupEntity>().AsNoTracking()
                on charge.CardSetupId equals card.CardSetupId
            where !charge.IsDeleted
            select new LineRow
            {
                CardChargeId =
                    charge.CardChargeId,

                POSAccountId =
                    charge.POSAccountId,

                CardSetupId =
                    charge.CardSetupId,

                CardCode =
                    card.CardCode,

                CardName =
                    card.CardName,

                ChargePercent =
                    charge.ChargePercent
            };
    }


    //===========================================================
    // Build DTO (one POS Account)
    //===========================================================

    private static CardChargesDto BuildDto
    (
        long posAccountId,
        POSAccountsEntity? posAccount,
        IEnumerable<LineRow> lines
    )
    {
        List<CardChargeLineDto> details =
            lines
                .OrderBy(x => x.CardName)
                .Select
                (
                    x =>
                        new CardChargeLineDto
                        {
                            CardChargeId =
                                x.CardChargeId,

                            CardSetupId =
                                x.CardSetupId,

                            CardCode =
                                x.CardCode,

                            CardName =
                                x.CardName,

                            ChargePercent =
                                x.ChargePercent
                        }
                )
                .ToList();

        return new CardChargesDto
        {
            POSAccountId =
                posAccountId,

            POSAccountCode =
                posAccount?.POSAccountCode ?? string.Empty,

            POSAccountName =
                posAccount?.POSAccountName ?? string.Empty,

            Status =
                posAccount?.Status ?? false,

            CardCount =
                details.Count,

            CardNames =
                string.Join(
                    ", ",
                    details.Select(x => x.CardName)),

            Details =
                details
        };
    }


    //===========================================================
    // Get All
    //
    // One row per POS Account that has active card charges.
    //===========================================================

    public async Task<List<CardChargesDto>>
        GetAllAsync()
    {
        List<LineRow> lines =
            await ActiveLinesQuery()
                .ToListAsync();

        if (lines.Count == 0)
        {
            return new List<CardChargesDto>();
        }

        List<long> posIds =
            lines
                .Select(x => x.POSAccountId)
                .Distinct()
                .ToList();

        Dictionary<long, POSAccountsEntity> posAccounts =
            await _context
                .Set<POSAccountsEntity>()
                .AsNoTracking()
                .Where(x => posIds.Contains(x.POSAccountId))
                .ToDictionaryAsync(x => x.POSAccountId);

        return lines
            .GroupBy(x => x.POSAccountId)
            .Select
            (
                group =>
                    BuildDto(
                        group.Key,
                        posAccounts.GetValueOrDefault(group.Key),
                        group)
            )
            .OrderBy(x => x.POSAccountName)
            .ToList();
    }


    //===========================================================
    // Get By POS Account
    //===========================================================

    public async Task<CardChargesDto?>
        GetByPosAccountAsync
        (
            long posAccountId
        )
    {
        List<LineRow> lines =
            await ActiveLinesQuery()
                .Where(x => x.POSAccountId == posAccountId)
                .ToListAsync();

        if (lines.Count == 0)
        {
            return null;
        }

        POSAccountsEntity? posAccount =
            await _context
                .Set<POSAccountsEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.POSAccountId == posAccountId);

        return BuildDto(
            posAccountId,
            posAccount,
            lines);
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<CardChargesDefaultsDto>
        GetDefaultsAsync()
    {
        List<long> usedPosIds =
            await _context
                .Set<CardChargesEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => x.POSAccountId)
                .Distinct()
                .ToListAsync();

        int available =
            await _context
                .Set<POSAccountsEntity>()
                .AsNoTracking()
                .CountAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.Status
                        &&
                        !usedPosIds.Contains(x.POSAccountId)
                );

        return new CardChargesDefaultsDto
        {
            MinChargePercent =
                MinChargePercent,

            MaxChargePercent =
                MaxChargePercent,

            AvailablePOSAccountCount =
                available
        };
    }


    //===========================================================
    // Exists
    //===========================================================

    public async Task<bool>
        ExistsAsync
        (
            long posAccountId
        )
    {
        return await _context
            .Set<CardChargesEntity>()
            .AnyAsync
            (
                x =>
                    x.POSAccountId == posAccountId
                    &&
                    !x.IsDeleted
            );
    }


    //===========================================================
    // Resolve POS Account (must exist and not be deleted)
    //===========================================================

    private async Task<POSAccountsEntity>
        ResolvePosAccountAsync
        (
            long posAccountId,
            bool requireActive
        )
    {
        POSAccountsEntity? posAccount =
            await _context
                .Set<POSAccountsEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.POSAccountId == posAccountId
                        &&
                        !x.IsDeleted
                );

        if (posAccount == null)
        {
            throw new InvalidOperationException(
                "The selected POS Account was not found.");
        }

        if (requireActive && !posAccount.Status)
        {
            throw new InvalidOperationException(
                $"POS Account '{posAccount.POSAccountName}' is inactive.");
        }

        return posAccount;
    }


    //===========================================================
    // Validate Lines
    //
    // • at least one line
    // • each card exists in Card Setup (not deleted)
    // • a card only once
    // • charge between 0 and 100 (rounded to 2 decimals)
    //
    // New cards must be active; cards already saved on this POS
    // Account may stay even if the card was made inactive later.
    //===========================================================

    private async Task<List<SaveCardChargeLineDto>>
        ValidateLinesAsync
        (
            List<SaveCardChargeLineDto>? details,
            HashSet<long> existingCardIds
        )
    {
        List<SaveCardChargeLineDto> lines =
            details ?? new List<SaveCardChargeLineDto>();

        if (lines.Count == 0)
        {
            throw new InvalidOperationException(
                "Please add at least one card charge.");
        }

        //=======================================================
        // Duplicate Cards
        //=======================================================

        bool hasDuplicate =
            lines
                .GroupBy(x => x.CardSetupId)
                .Any(g => g.Count() > 1);

        if (hasDuplicate)
        {
            throw new InvalidOperationException(
                "The same card cannot be added more than once for a POS Account.");
        }

        //=======================================================
        // Cards exist
        //=======================================================

        List<long> cardIds =
            lines
                .Select(x => x.CardSetupId)
                .ToList();

        Dictionary<long, CardSetupEntity> cards =
            await _context
                .Set<CardSetupEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        cardIds.Contains(x.CardSetupId)
                        &&
                        !x.IsDeleted
                )
                .ToDictionaryAsync(x => x.CardSetupId);

        List<SaveCardChargeLineDto> result =
            new List<SaveCardChargeLineDto>();

        foreach (SaveCardChargeLineDto line in lines)
        {
            if (!cards.TryGetValue(line.CardSetupId, out CardSetupEntity? card))
            {
                throw new InvalidOperationException(
                    "One of the selected cards was not found in Card Setup.");
            }

            if (!card.Status && !existingCardIds.Contains(card.CardSetupId))
            {
                throw new InvalidOperationException(
                    $"Card '{card.CardName}' is inactive and cannot be added.");
            }

            decimal charge =
                Math.Round(
                    line.ChargePercent,
                    2,
                    MidpointRounding.AwayFromZero);

            if (charge < MinChargePercent || charge > MaxChargePercent)
            {
                throw new InvalidOperationException(
                    $"Charge for '{card.CardName}' must be between {MinChargePercent} and {MaxChargePercent}.");
            }

            result.Add(
                new SaveCardChargeLineDto
                {
                    CardChargeId =
                        line.CardChargeId,

                    CardSetupId =
                        line.CardSetupId,

                    ChargePercent =
                        charge
                });
        }

        return result;
    }


    //===========================================================
    // Add History
    //===========================================================

    private void AddHistory
    (
        long posAccountId,
        string activityType,
        string title,
        string description,
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
                    posAccountId,

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
                    performedDate
            });
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task
        CreateAsync
        (
            CreateCardChargesDto dto,
            long userId
        )
    {
        POSAccountsEntity posAccount =
            await ResolvePosAccountAsync(
                dto.POSAccountId,
                requireActive: true);

        //=======================================================
        // One set of card charges per POS Account
        //=======================================================

        if (await ExistsAsync(dto.POSAccountId))
        {
            throw new InvalidOperationException(
                $"POS Account '{posAccount.POSAccountName}' already has card charges. Use Edit to change them.");
        }

        List<SaveCardChargeLineDto> lines =
            await ValidateLinesAsync(
                dto.Details,
                new HashSet<long>());

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            DateTime now =
                DateTime.UtcNow;

            foreach (SaveCardChargeLineDto line in lines)
            {
                _context
                    .Set<CardChargesEntity>()
                    .Add(
                        new CardChargesEntity
                        {
                            POSAccountId =
                                posAccount.POSAccountId,

                            CardSetupId =
                                line.CardSetupId,

                            ChargePercent =
                                line.ChargePercent,

                            IsDeleted =
                                false,

                            CreatedBy =
                                userId,

                            CreatedDate =
                                now
                        });
            }

            AddHistory(
                posAccount.POSAccountId,
                "Create",
                "Card Charges Created",
                $"{lines.Count} card charge(s) created for POS Account '{posAccount.POSAccountName}'.",
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
    // Update
    //
    // Lines with CardChargeId > 0 are updated, lines with 0 are
    // inserted, and active lines not sent are removed.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateCardChargesDto dto,
            long userId
        )
    {
        List<CardChargesEntity> existing =
            await _context
                .Set<CardChargesEntity>()
                .Where
                (
                    x =>
                        x.POSAccountId == dto.POSAccountId
                        &&
                        !x.IsDeleted
                )
                .ToListAsync();

        if (existing.Count == 0)
        {
            throw new KeyNotFoundException(
                "Card charges for this POS Account were not found.");
        }

        POSAccountsEntity posAccount =
            await ResolvePosAccountAsync(
                dto.POSAccountId,
                requireActive: false);

        List<SaveCardChargeLineDto> lines =
            await ValidateLinesAsync(
                dto.Details,
                existing
                    .Select(x => x.CardSetupId)
                    .ToHashSet());

        Dictionary<long, CardChargesEntity> existingById =
            existing.ToDictionary(x => x.CardChargeId);

        HashSet<long> keptIds =
            lines
                .Where(x => x.CardChargeId > 0 && existingById.ContainsKey(x.CardChargeId))
                .Select(x => x.CardChargeId)
                .ToHashSet();

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            DateTime now =
                DateTime.UtcNow;

            //===================================================
            // 1. Remove lines that were taken out
            //    (saved first, so the unique card index is free
            //     before a card is re-added)
            //===================================================

            List<CardChargesEntity> removed =
                existing
                    .Where(x => !keptIds.Contains(x.CardChargeId))
                    .ToList();

            if (removed.Count > 0)
            {
                _context
                    .Set<CardChargesEntity>()
                    .RemoveRange(removed);

                await _context.SaveChangesAsync();
            }

            //===================================================
            // 2. Update kept lines / insert new lines
            //===================================================

            int updatedCount = 0;

            int addedCount = 0;

            foreach (SaveCardChargeLineDto line in lines)
            {
                if (keptIds.Contains(line.CardChargeId))
                {
                    CardChargesEntity entity =
                        existingById[line.CardChargeId];

                    if
                    (
                        entity.CardSetupId != line.CardSetupId
                        ||
                        entity.ChargePercent != line.ChargePercent
                    )
                    {
                        entity.CardSetupId =
                            line.CardSetupId;

                        entity.ChargePercent =
                            line.ChargePercent;

                        entity.ModifiedBy =
                            userId;

                        entity.ModifiedDate =
                            now;

                        updatedCount++;
                    }

                    continue;
                }

                _context
                    .Set<CardChargesEntity>()
                    .Add(
                        new CardChargesEntity
                        {
                            POSAccountId =
                                posAccount.POSAccountId,

                            CardSetupId =
                                line.CardSetupId,

                            ChargePercent =
                                line.ChargePercent,

                            IsDeleted =
                                false,

                            CreatedBy =
                                userId,

                            CreatedDate =
                                now
                        });

                addedCount++;
            }

            AddHistory(
                posAccount.POSAccountId,
                "Update",
                "Card Charges Updated",
                $"Card charges of POS Account '{posAccount.POSAccountName}' updated " +
                $"({addedCount} added, {updatedCount} changed, {removed.Count} removed).",
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
    // Soft-deletes all lines of the POS Account with the same
    // DeletedDate, so Restore can bring the whole set back.
    //===========================================================

    public async Task
        DeleteAsync
        (
            long posAccountId,
            long userId
        )
    {
        List<CardChargesEntity> lines =
            await _context
                .Set<CardChargesEntity>()
                .Where
                (
                    x =>
                        x.POSAccountId == posAccountId
                        &&
                        !x.IsDeleted
                )
                .ToListAsync();

        if (lines.Count == 0)
        {
            throw new KeyNotFoundException(
                "Card charges for this POS Account were not found.");
        }

        //=======================================================
        // Dependency Check
        //
        // TODO: When POS receipts / settlements use card charges,
        // count their non-deleted rows here and throw
        // InvalidOperationException (returned as HTTP 409).
        //=======================================================

        string posName =
            await _context
                .Set<POSAccountsEntity>()
                .AsNoTracking()
                .Where(x => x.POSAccountId == posAccountId)
                .Select(x => x.POSAccountName)
                .FirstOrDefaultAsync()
            ??
            $"#{posAccountId}";

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            DateTime now =
                DateTime.UtcNow;

            foreach (CardChargesEntity line in lines)
            {
                line.IsDeleted =
                    true;

                line.DeletedBy =
                    userId;

                line.DeletedDate =
                    now;
            }

            AddHistory(
                posAccountId,
                "Delete",
                "Card Charges Deleted",
                $"{lines.Count} card charge(s) of POS Account '{posName}' deleted.",
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
    // Restores the most recently deleted batch (one POS Account).
    //
    // Blocked (409) when:
    //   • the POS Account was deleted,
    //   • the POS Account already has card charges again,
    //   • one of the cards was deleted from Card Setup.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        CardChargesEntity? latest =
            await _context
                .Set<CardChargesEntity>()
                .AsNoTracking()
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .FirstOrDefaultAsync();

        if (latest == null)
        {
            return false;
        }

        List<CardChargesEntity> batch =
            await _context
                .Set<CardChargesEntity>()
                .Where
                (
                    x =>
                        x.IsDeleted
                        &&
                        x.POSAccountId == latest.POSAccountId
                        &&
                        x.DeletedDate == latest.DeletedDate
                )
                .ToListAsync();

        //=======================================================
        // Parent : POS Account must still exist
        //=======================================================

        POSAccountsEntity? posAccount =
            await _context
                .Set<POSAccountsEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.POSAccountId == latest.POSAccountId
                        &&
                        !x.IsDeleted
                );

        if (posAccount == null)
        {
            throw new InvalidOperationException(
                "The card charges cannot be restored because their POS Account has been deleted.");
        }

        //=======================================================
        // POS Account must not have card charges again
        //=======================================================

        if (await ExistsAsync(posAccount.POSAccountId))
        {
            throw new InvalidOperationException(
                $"The card charges cannot be restored because POS Account '{posAccount.POSAccountName}' already has card charges.");
        }

        //=======================================================
        // Cards must still exist
        //=======================================================

        List<long> cardIds =
            batch
                .Select(x => x.CardSetupId)
                .Distinct()
                .ToList();

        int liveCards =
            await _context
                .Set<CardSetupEntity>()
                .AsNoTracking()
                .CountAsync
                (
                    x =>
                        cardIds.Contains(x.CardSetupId)
                        &&
                        !x.IsDeleted
                );

        if (liveCards != cardIds.Count)
        {
            throw new InvalidOperationException(
                $"The card charges of POS Account '{posAccount.POSAccountName}' cannot be restored because one or more cards were deleted from Card Setup.");
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

            foreach (CardChargesEntity line in batch)
            {
                line.IsDeleted =
                    false;

                line.DeletedBy =
                    null;

                line.DeletedDate =
                    null;

                line.ModifiedBy =
                    userId;

                line.ModifiedDate =
                    now;
            }

            AddHistory(
                posAccount.POSAccountId,
                "Restore",
                "Card Charges Restored",
                $"{batch.Count} card charge(s) of POS Account '{posAccount.POSAccountName}' restored.",
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
}