//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.MembershipManagement.MembershipSetup;

using MembershipCardEntity =
    AppCore.Domain.Entities.MembershipManagement.MembershipSetup.MembershipCards;

using MembershipServiceEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.MembershipServices;

using ServiceSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServiceSubCategory;

using MembershipPolicyEntity =
    AppCore.Domain.Entities.MembershipManagement.MembershipSetup.MembershipPolicies;

using AppCore.Infrastructure.Persistence;
using AppCore.Infrastructure.CodeMaster;
using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.MembershipManagement.MembershipSetup;


//===============================================================
// Membership Cards Repository
//
// Saving a card creates, in one transaction :
//   the card                 MCD-001 (central CodeGenerator)
//   its Fee Ledger           under SUB-009-001-001
//   its Discount Ledger      under SUB-004-002-002
//   its Membership Services row (Service Settings), Pending until
//   a Service Value is set there, with
//     an Income Ledger       under SUB-007-005-001
//     an Expense Ledger      under SUB-004-002-001
//
// Every ledger : "<Sub Group Name> - <Card Name>". All of them are
// renamed, (de)activated, deleted and restored with the card
// (shared logic : MembershipCardAccounts).
//
// Card Name : as typed (spaces trimmed), unique among live
//             cards ignoring case (max 50).
// Card Rank : 1..999, unique among live cards (1 = lowest).
// Locked    : Card Code and every ledger / service code.
//===============================================================

public class MembershipCardsRepository :
    IMembershipCardsRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string CardPrefix =
        "MCD-";

    private const int MaxCardNameLength =
        50;

    private const int MaxCardRank =
        999;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public MembershipCardsRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // Get All (live cards, by rank)
    //===========================================================

    public async Task<List<MembershipCardsDto>>
        GetAllAsync()
    {
        await MembershipCardAccounts.SyncNamesAsync(
            _context);

        List<MembershipCardEntity> cards =
            await _context
                .Set<MembershipCardEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                )
                .OrderBy
                (
                    x =>
                        x.CardRank
                )
                .ToListAsync();

        return await ToDtosAsync(
            cards);
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<MembershipCardsDto?>
        GetByIdAsync
        (
            long id
        )
    {
        MembershipCardEntity? card =
            await _context
                .Set<MembershipCardEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MembershipCardId ==
                        id
                        &&
                        !x.IsDeleted
                );

        if
        (
            card == null
        )
        {
            return null;
        }

        return (await ToDtosAsync(
                new List<MembershipCardEntity> { card }))
            .FirstOrDefault();
    }


    //===========================================================
    // Map cards (+ their service rows) to DTOs
    //===========================================================

    private async Task<List<MembershipCardsDto>>
        ToDtosAsync
        (
            List<MembershipCardEntity> cards
        )
    {
        List<long> cardIds =
            cards
                .Select(x => x.MembershipCardId)
                .ToList();

        List<MembershipServiceEntity> rows =
            await _context
                .Set<MembershipServiceEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.MembershipCardId != null
                        &&
                        cardIds.Contains(x.MembershipCardId.Value)
                )
                .ToListAsync();

        List<long> subCategoryIds =
            rows
                .Select(x => x.ServiceSubCategoryId)
                .Distinct()
                .ToList();

        Dictionary<long, string> incomeSubGroupBySubCategory =
            await _context
                .Set<ServiceSubCategoryEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        subCategoryIds.Contains(x.ServiceSubCategoryId)
                )
                .ToDictionaryAsync
                (
                    x => x.ServiceSubCategoryId,
                    x => x.IncomeSubGroupCode
                );

        Dictionary<string, string> subGroupNames =
            await MembershipCardAccounts.SubGroupNamesAsync(
                _context,
                new[]
                {
                    MembershipCardAccounts.FeeSubGroupCode,
                    MembershipCardAccounts.DiscountSubGroupCode
                });

        List<MembershipCardsDto> result =
            new List<MembershipCardsDto>();

        foreach
        (
            MembershipCardEntity card
            in cards
        )
        {
            MembershipServiceEntity? row =
                rows.FirstOrDefault
                (
                    x =>
                        x.MembershipCardId ==
                        card.MembershipCardId
                );

            MembershipCardsDto dto =
                new MembershipCardsDto
                {
                    MembershipCardId =
                        card.MembershipCardId,

                    CardCode =
                        card.CardCode,

                    CardName =
                        card.CardName,

                    CardRank =
                        card.CardRank,

                    FeeSubGroupCode =
                        MembershipCardAccounts.FeeSubGroupCode,

                    FeeSubGroupName =
                        subGroupNames.GetValueOrDefault(
                            MembershipCardAccounts.FeeSubGroupCode)
                        ??
                        string.Empty,

                    FeeLedgerCode =
                        card.FeeLedgerCode,

                    FeeLedgerName =
                        card.FeeLedgerName,

                    DiscountSubGroupCode =
                        MembershipCardAccounts.DiscountSubGroupCode,

                    DiscountSubGroupName =
                        subGroupNames.GetValueOrDefault(
                            MembershipCardAccounts.DiscountSubGroupCode)
                        ??
                        string.Empty,

                    DiscountLedgerCode =
                        card.DiscountLedgerCode,

                    DiscountLedgerName =
                        card.DiscountLedgerName,

                    Remarks =
                        card.Remarks,

                    IsActive =
                        card.IsActive,

                    IsDeleted =
                        card.IsDeleted,

                    DeletedBy =
                        card.DeletedBy,

                    DeletedDate =
                        card.DeletedDate,

                    CreatedBy =
                        card.CreatedBy,

                    CreatedDate =
                        card.CreatedDate,

                    ModifiedBy =
                        card.ModifiedBy,

                    ModifiedDate =
                        card.ModifiedDate
                };

            if
            (
                row != null
            )
            {
                dto.MembershipServiceId =
                    row.MembershipServiceId;

                dto.ServiceCode =
                    row.ServiceCode;

                dto.ServiceName =
                    row.ServiceName;

                dto.ServiceValue =
                    row.ServiceValue;

                dto.Readiness =
                    MembershipCardAccounts.Readiness(
                        row.ServiceValue);

                dto.ServiceIncomeSubGroupCode =
                    incomeSubGroupBySubCategory.GetValueOrDefault(
                        row.ServiceSubCategoryId)
                    ??
                    string.Empty;

                dto.ServiceIncomeLedgerCode =
                    row.IncomeLedgerCode;

                dto.ServiceIncomeLedgerName =
                    row.IncomeLedgerName;

                dto.ServiceExpenseSubGroupCode =
                    MembershipCardAccounts.ServiceExpenseSubGroupCode;

                dto.ServiceExpenseLedgerCode =
                    row.ExpenseLedgerCode;

                dto.ServiceExpenseLedgerName =
                    row.ExpenseLedgerName;
            }

            result.Add(
                dto);
        }

        return result;
    }


    //===========================================================
    // Get Defaults (preview of the next card)
    //===========================================================

    public async Task<MembershipCardsDefaultsDto>
        GetDefaultsAsync()
    {
        MembershipCardsDefaultsDto result =
            new MembershipCardsDefaultsDto
            {
                NextCardCode =
                    await NextCardCodeAsync(),

                NextCardRank =
                    await NextCardRankAsync(),

                FeeAccount =
                    await AccountOptionAsync(
                        MembershipCardAccounts.FeeSubGroupCode,
                        "Membership Fees"),

                DiscountAccount =
                    await AccountOptionAsync(
                        MembershipCardAccounts.DiscountSubGroupCode,
                        "Membership Discount"),

                ServiceExpenseAccount =
                    await AccountOptionAsync(
                        MembershipCardAccounts.ServiceExpenseSubGroupCode,
                        "Membership Service Charges")
            };

        try
        {
            ServiceSubCategoryEntity subCategory =
                await MembershipCardAccounts.ResolveServiceSubCategoryAsync(
                    _context,
                    true);

            result.ServiceSubCategoryCode =
                subCategory.SubCategoryCode;

            result.ServiceSubCategoryName =
                subCategory.SubCategoryName;

            result.NextServiceCode =
                await MembershipCardAccounts.NextServiceCodeAsync(
                    _context,
                    subCategory);

            result.ServiceIncomeAccount =
                await AccountOptionAsync(
                    subCategory.IncomeSubGroupCode,
                    "Membership Services income");
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            result.ServiceMessage =
                ex.Message;

            result.ServiceIncomeAccount =
                new MembershipCardsAccountOptionDto
                {
                    SubGroupCode =
                        MembershipCardAccounts.ServiceIncomeSubGroupCode,

                    Message =
                        ex.Message
                };
        }

        return result;
    }


    private async Task<MembershipCardsAccountOptionDto>
        AccountOptionAsync
        (
            string subGroupCode,
            string purpose
        )
    {
        MembershipCardsAccountOptionDto option =
            new MembershipCardsAccountOptionDto
            {
                SubGroupCode =
                    subGroupCode
            };

        try
        {
            MembershipLedgerParent parent =
                await MembershipCardAccounts.ResolveParentAsync(
                    _context,
                    subGroupCode,
                    purpose,
                    true);

            option.SubGroupName =
                parent.SubGroup.SubGroupName;

            option.NextLedgerCode =
                await MembershipCardAccounts.NextLedgerCodeAsync(
                    _context,
                    parent);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            option.Message =
                ex.Message;
        }

        return option;
    }


    //===========================================================
    // Codes
    //===========================================================

    // Highest MCD number used (deleted cards included) + 1
    private async Task<string>
        NextCardCodeAsync()
    {
        List<string> codes =
            await _context
                .Set<MembershipCardEntity>()
                .AsNoTracking()
                .Select
                (
                    x =>
                        x.CardCode
                )
                .ToListAsync();

        int highest =
            codes
                .Where
                (
                    code =>
                        (code ?? string.Empty).StartsWith(
                            CardPrefix,
                            StringComparison.OrdinalIgnoreCase)
                )
                .Select
                (
                    code =>
                        int.TryParse(
                            code.Substring(CardPrefix.Length),
                            out int number)
                            ? number
                            : 0
                )
                .DefaultIfEmpty(0)
                .Max();

        if
        (
            highest >= MaxCardRank
        )
        {
            throw new InvalidOperationException(
                "All card codes MCD-001 to MCD-999 are used.");
        }

        return CodeGenerator.GenerateMembershipCardCode(
            highest + 1);
    }


    // Suggestion only : highest live rank + 1
    private async Task<int>
        NextCardRankAsync()
    {
        int highest =
            await _context
                .Set<MembershipCardEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                )
                .Select
                (
                    x =>
                        (int?)x.CardRank
                )
                .MaxAsync()
            ??
            0;

        return Math.Min(
            highest + 1,
            MaxCardRank);
    }


    //===========================================================
    // Validation
    //===========================================================

    private static (string Name, int Rank) ValidateInput
    (
        string? cardName,
        int cardRank
    )
    {
        string name =
            MembershipCardAccounts
                .Clean(cardName);

        if
        (
            string.IsNullOrWhiteSpace(name)
        )
        {
            throw new InvalidOperationException(
                "Card Name is required.");
        }

        if
        (
            name.Length > MaxCardNameLength
        )
        {
            throw new InvalidOperationException(
                $"Card Name cannot be longer than {MaxCardNameLength} characters.");
        }

        if
        (
            cardRank < 1
            ||
            cardRank > MaxCardRank
        )
        {
            throw new InvalidOperationException(
                $"Card Rank must be a whole number from 1 to {MaxCardRank}.");
        }

        return (name, cardRank);
    }


    private async Task
        EnsureUniqueAsync
        (
            string cardName,
            int cardRank,
            long excludeId
        )
    {
        string lowerName =
            cardName.ToLower();

        MembershipCardEntity? sameName =
            await _context
                .Set<MembershipCardEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.MembershipCardId !=
                        excludeId
                        &&
                        x.CardName.ToLower() ==
                        lowerName
                );

        if
        (
            sameName != null
        )
        {
            throw new InvalidOperationException(
                $"Card Name '{cardName}' already exists ({sameName.CardCode}).");
        }

        MembershipCardEntity? sameRank =
            await _context
                .Set<MembershipCardEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.MembershipCardId !=
                        excludeId
                        &&
                        x.CardRank ==
                        cardRank
                );

        if
        (
            sameRank != null
        )
        {
            throw new InvalidOperationException(
                $"Card Rank {cardRank} is already used by '{sameRank.CardName}' ({sameRank.CardCode}).");
        }
    }


    private static string CheckedLedgerName
    (
        string subGroupName,
        string cardName
    )
    {
        string name =
            MembershipCardAccounts.LedgerName(
                subGroupName,
                cardName);

        if
        (
            name.Length >
            MembershipCardAccounts.MaxLedgerNameLength
        )
        {
            throw new InvalidOperationException(
                $"Ledger name '{name}' would be longer than {MembershipCardAccounts.MaxLedgerNameLength} characters. Use a shorter Card Name.");
        }

        return name;
    }


    //===========================================================
    // The four ledger parents of a card
    //===========================================================

    private sealed class CardParents
    {
        public MembershipLedgerParent Fee { get; set; } = null!;

        public MembershipLedgerParent Discount { get; set; } = null!;

        public MembershipLedgerParent ServiceIncome { get; set; } = null!;

        public MembershipLedgerParent ServiceExpense { get; set; } = null!;
    }


    private async Task<CardParents>
        ResolveParentsAsync
        (
            ServiceSubCategoryEntity subCategory,
            bool requireActive
        )
    {
        return new CardParents
        {
            Fee =
                await MembershipCardAccounts.ResolveParentAsync(
                    _context,
                    MembershipCardAccounts.FeeSubGroupCode,
                    "Membership Fees",
                    requireActive),

            Discount =
                await MembershipCardAccounts.ResolveParentAsync(
                    _context,
                    MembershipCardAccounts.DiscountSubGroupCode,
                    "Membership Discount",
                    requireActive),

            ServiceIncome =
                await MembershipCardAccounts.ResolveParentAsync(
                    _context,
                    subCategory.IncomeSubGroupCode,
                    "Membership Services income",
                    requireActive),

            ServiceExpense =
                await MembershipCardAccounts.ResolveParentAsync(
                    _context,
                    MembershipCardAccounts.ServiceExpenseSubGroupCode,
                    "Membership Service Charges",
                    requireActive)
        };
    }


    private async Task<ServiceSubCategoryEntity>
        LoadSubCategoryAsync
        (
            long serviceSubCategoryId
        )
    {
        return await _context
                .Set<ServiceSubCategoryEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ServiceSubCategoryId ==
                        serviceSubCategoryId
                        &&
                        !x.IsDeleted
                )
            ??
            throw new InvalidOperationException(
                "The Membership Services sub category of this card's service was not found. It may have been deleted.");
    }


    //===========================================================
    // New service row for a card (Pending : no Service Value yet)
    //===========================================================

    private async Task<MembershipServiceEntity>
        NewServiceRowAsync
        (
            MembershipCardEntity card,
            ServiceSubCategoryEntity subCategory,
            CardParents parents,
            long userId
        )
    {
        string serviceName =
            MembershipCardAccounts.Clean(
                subCategory.SubCategoryName);

        return new MembershipServiceEntity
        {
            ServiceCode =
                await MembershipCardAccounts.NextServiceCodeAsync(
                    _context,
                    subCategory),

            ServiceSubCategoryId =
                subCategory.ServiceSubCategoryId,

            MembershipCardId =
                card.MembershipCardId,

            MembershipType =
                card.CardName,

            ServiceName =
                serviceName,

            DisplayName =
                $"{serviceName} - {card.CardName}",

            ServiceValue =
                0,

            IncomeLedgerCode =
                await MembershipCardAccounts.NextLedgerCodeAsync(
                    _context,
                    parents.ServiceIncome),

            IncomeLedgerName =
                CheckedLedgerName(
                    parents.ServiceIncome.SubGroup.SubGroupName,
                    card.CardName),

            ExpenseLedgerCode =
                await MembershipCardAccounts.NextLedgerCodeAsync(
                    _context,
                    parents.ServiceExpense),

            ExpenseLedgerName =
                CheckedLedgerName(
                    parents.ServiceExpense.SubGroup.SubGroupName,
                    card.CardName),

            Remarks =
                string.Empty,

            IsActive =
                card.IsActive,

            IsDeleted =
                false,

            CreatedBy =
                userId,

            CreatedDate =
                DateTime.UtcNow
        };
    }


    //===========================================================
    // Sync the four ledgers of a card (create / rename / status)
    //===========================================================

    private async Task
        SyncLedgersAsync
        (
            MembershipCardEntity card,
            MembershipServiceEntity row,
            CardParents parents,
            long userId
        )
    {
        await MembershipCardAccounts.SyncLedgerAsync(
            _context,
            card.FeeLedgerCode,
            card.FeeLedgerName,
            card.IsActive,
            $"System generated from Membership Cards {card.CardCode} (membership fee income).",
            parents.Fee,
            userId);

        await MembershipCardAccounts.SyncLedgerAsync(
            _context,
            card.DiscountLedgerCode,
            card.DiscountLedgerName,
            card.IsActive,
            $"System generated from Membership Cards {card.CardCode} (member discounts).",
            parents.Discount,
            userId);

        await MembershipCardAccounts.SyncLedgerAsync(
            _context,
            row.IncomeLedgerCode,
            row.IncomeLedgerName,
            row.IsActive,
            $"System generated from Membership Cards {card.CardCode} / Membership Services {row.ServiceCode} (billed service value).",
            parents.ServiceIncome,
            userId);

        await MembershipCardAccounts.SyncLedgerAsync(
            _context,
            row.ExpenseLedgerCode,
            row.ExpenseLedgerName,
            row.IsActive,
            $"System generated from Membership Cards {card.CardCode} / Membership Services {row.ServiceCode} (complimentary discount).",
            parents.ServiceExpense,
            userId);
    }


    //===========================================================
    // Create
    //
    // Codes and ledgers are always built here; the form's values
    // are only a preview.
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateMembershipCardsDto dto,
            long userId
        )
    {
        (string cardName, int cardRank) =
            ValidateInput(
                dto.CardName,
                dto.CardRank);

        await EnsureUniqueAsync(
            cardName,
            cardRank,
            0);

        ServiceSubCategoryEntity subCategory =
            await MembershipCardAccounts.ResolveServiceSubCategoryAsync(
                _context,
                true);

        CardParents parents =
            await ResolveParentsAsync(
                subCategory,
                true);

        MembershipCardEntity card =
            new MembershipCardEntity
            {
                CardCode =
                    await NextCardCodeAsync(),

                CardName =
                    cardName,

                CardRank =
                    cardRank,

                FeeLedgerCode =
                    await MembershipCardAccounts.NextLedgerCodeAsync(
                        _context,
                        parents.Fee),

                FeeLedgerName =
                    CheckedLedgerName(
                        parents.Fee.SubGroup.SubGroupName,
                        cardName),

                DiscountLedgerCode =
                    await MembershipCardAccounts.NextLedgerCodeAsync(
                        _context,
                        parents.Discount),

                DiscountLedgerName =
                    CheckedLedgerName(
                        parents.Discount.SubGroup.SubGroupName,
                        cardName),

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


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        _context
            .Set<MembershipCardEntity>()
            .Add(
                card);

        // The card id is needed by its service row
        await _context.SaveChangesAsync();

        MembershipServiceEntity row =
            await NewServiceRowAsync(
                card,
                subCategory,
                parents,
                userId);

        _context
            .Set<MembershipServiceEntity>()
            .Add(
                row);

        await SyncLedgersAsync(
            card,
            row,
            parents,
            userId);

        await _context.SaveChangesAsync();

        AddHistory(
            card,
            "Create",
            "Created",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return card.MembershipCardId;
    }


    //===========================================================
    // Update
    //
    // Name, rank, remarks and status. Every ledger and the service
    // row follow the name. A status change of the card is applied
    // to its service row too; an inactive card never has an active
    // service row.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateMembershipCardsDto dto,
            long userId
        )
    {
        MembershipCardEntity? card =
            await _context
                .Set<MembershipCardEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MembershipCardId ==
                        dto.MembershipCardId
                        &&
                        !x.IsDeleted
                );

        if
        (
            card == null
        )
        {
            throw new KeyNotFoundException(
                "Membership Card not found.");
        }

        (string cardName, int cardRank) =
            ValidateInput(
                dto.CardName,
                dto.CardRank);

        await EnsureUniqueAsync(
            cardName,
            cardRank,
            card.MembershipCardId);

        MembershipServiceEntity? row =
            await _context
                .Set<MembershipServiceEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MembershipCardId ==
                        card.MembershipCardId
                        &&
                        !x.IsDeleted
                );

        // A card without a service row (should not happen) gets one now
        ServiceSubCategoryEntity subCategory =
            row == null
                ? await MembershipCardAccounts.ResolveServiceSubCategoryAsync(
                    _context,
                    true)
                : await LoadSubCategoryAsync(
                    row.ServiceSubCategoryId);

        CardParents parents =
            await ResolveParentsAsync(
                subCategory,
                false);

        bool statusChanged =
            card.IsActive !=
            dto.IsActive;

        card.CardName =
            cardName;

        card.CardRank =
            cardRank;

        card.FeeLedgerName =
            CheckedLedgerName(
                parents.Fee.SubGroup.SubGroupName,
                cardName);

        card.DiscountLedgerName =
            CheckedLedgerName(
                parents.Discount.SubGroup.SubGroupName,
                cardName);

        card.Remarks =
            dto.Remarks?.Trim()
            ??
            string.Empty;

        card.IsActive =
            dto.IsActive;

        card.ModifiedBy =
            userId;

        card.ModifiedDate =
            DateTime.UtcNow;


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        if
        (
            row == null
        )
        {
            row =
                await NewServiceRowAsync(
                    card,
                    subCategory,
                    parents,
                    userId);

            _context
                .Set<MembershipServiceEntity>()
                .Add(
                    row);
        }
        else
        {
            string serviceName =
                MembershipCardAccounts.Clean(
                    subCategory.SubCategoryName);

            row.MembershipType =
                cardName;

            row.ServiceName =
                serviceName;

            row.DisplayName =
                $"{serviceName} - {cardName}";

            row.IncomeLedgerName =
                CheckedLedgerName(
                    parents.ServiceIncome.SubGroup.SubGroupName,
                    cardName);

            row.ExpenseLedgerName =
                CheckedLedgerName(
                    parents.ServiceExpense.SubGroup.SubGroupName,
                    cardName);

            if
            (
                statusChanged
                ||
                !card.IsActive
            )
            {
                row.IsActive =
                    card.IsActive;
            }

            row.ModifiedBy =
                userId;

            row.ModifiedDate =
                DateTime.UtcNow;
        }

        // An inactive card never has an active policy
        if
        (
            !card.IsActive
        )
        {
            foreach
            (
                MembershipPolicyEntity policy
                in await _context
                    .Set<MembershipPolicyEntity>()
                    .Where
                    (
                        x =>
                            x.MembershipCardId ==
                            card.MembershipCardId
                            &&
                            !x.IsDeleted
                            &&
                            x.IsActive
                    )
                    .ToListAsync()
            )
            {
                policy.IsActive =
                    false;

                policy.ModifiedBy =
                    userId;

                policy.ModifiedDate =
                    DateTime.UtcNow;
            }
        }

        await SyncLedgersAsync(
            card,
            row,
            parents,
            userId);

        await _context.SaveChangesAsync();

        AddHistory(
            card,
            "Update",
            "Updated",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    //===========================================================
    // Delete (card + its service row + its four ledgers)
    //
    // Blocked (409) while the card has a live Membership Policy.
    // Enrollment / posting checks come with those modules.
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId
        )
    {
        MembershipCardEntity? card =
            await _context
                .Set<MembershipCardEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MembershipCardId ==
                        id
                        &&
                        !x.IsDeleted
                );

        if
        (
            card == null
        )
        {
            throw new KeyNotFoundException(
                "Membership Card not found.");
        }

        // A card with a live policy cannot be deleted (409)
        MembershipPolicyEntity? policy =
            await _context
                .Set<MembershipPolicyEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MembershipCardId ==
                        card.MembershipCardId
                        &&
                        !x.IsDeleted
                );

        if
        (
            policy != null
        )
        {
            throw new InvalidOperationException(
                $"Membership Card '{card.CardName}' has the policy {policy.PolicyCode}. Delete the policy first.");
        }

        DateTime now =
            DateTime.UtcNow;

        List<string> ledgerCodes =
            new List<string>
            {
                card.FeeLedgerCode,
                card.DiscountLedgerCode
            };

        foreach
        (
            MembershipServiceEntity row
            in await _context
                .Set<MembershipServiceEntity>()
                .Where
                (
                    x =>
                        x.MembershipCardId ==
                        card.MembershipCardId
                        &&
                        !x.IsDeleted
                )
                .ToListAsync()
        )
        {
            row.IsDeleted =
                true;

            row.DeletedBy =
                userId;

            row.DeletedDate =
                now;

            ledgerCodes.Add(
                row.IncomeLedgerCode);

            ledgerCodes.Add(
                row.ExpenseLedgerCode);
        }

        card.IsDeleted =
            true;

        card.DeletedBy =
            userId;

        card.DeletedDate =
            now;


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await MembershipCardAccounts.SetLedgersDeletedAsync(
            _context,
            ledgerCodes,
            true,
            userId);

        await _context.SaveChangesAsync();

        AddHistory(
            card,
            "Delete",
            "Deleted",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    //===========================================================
    // Restore (most recently deleted card + its service row + its
    // four ledgers)
    //
    // Blocked (409) while its name or rank is taken, or one of its
    // sub groups / its sub category is deleted.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId
        )
    {
        MembershipCardEntity? card =
            await _context
                .Set<MembershipCardEntity>()
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
            card == null
        )
        {
            return false;
        }

        MembershipServiceEntity? row =
            await _context
                .Set<MembershipServiceEntity>()
                .Where
                (
                    x =>
                        x.MembershipCardId ==
                        card.MembershipCardId
                        &&
                        x.IsDeleted
                )
                .OrderByDescending
                (
                    x =>
                        x.DeletedDate
                )
                .FirstOrDefaultAsync();

        try
        {
            await EnsureUniqueAsync(
                card.CardName,
                card.CardRank,
                card.MembershipCardId);

            ServiceSubCategoryEntity subCategory =
                row == null
                    ? await MembershipCardAccounts.ResolveServiceSubCategoryAsync(
                        _context,
                        false)
                    : await LoadSubCategoryAsync(
                        row.ServiceSubCategoryId);

            await ResolveParentsAsync(
                subCategory,
                false);
        }
        catch
        (
            InvalidOperationException ex
        )
        {
            throw new InvalidOperationException(
                $"Membership Card '{card.CardName}' cannot be restored. {ex.Message}");
        }

        DateTime now =
            DateTime.UtcNow;

        List<string> ledgerCodes =
            new List<string>
            {
                card.FeeLedgerCode,
                card.DiscountLedgerCode
            };

        card.IsDeleted =
            false;

        card.DeletedBy =
            null;

        card.DeletedDate =
            null;

        card.ModifiedBy =
            userId;

        card.ModifiedDate =
            now;

        if
        (
            row != null
        )
        {
            row.IsDeleted =
                false;

            row.DeletedBy =
                null;

            row.DeletedDate =
                null;

            if
            (
                !card.IsActive
            )
            {
                row.IsActive =
                    false;
            }

            row.ModifiedBy =
                userId;

            row.ModifiedDate =
                now;

            ledgerCodes.Add(
                row.IncomeLedgerCode);

            ledgerCodes.Add(
                row.ExpenseLedgerCode);
        }


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await MembershipCardAccounts.SetLedgersDeletedAsync(
            _context,
            ledgerCodes,
            false,
            userId);

        await _context.SaveChangesAsync();

        AddHistory(
            card,
            "Restore",
            "Restored",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        // Names follow any sub group rename made while it was deleted;
        // a card restored without a service row gets one on its next Update
        await MembershipCardAccounts.SyncNamesAsync(
            _context);

        return true;
    }


    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory
    (
        MembershipCardEntity card,
        string activityType,
        string verb,
        long userId
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Membership Management",

                EntityName =
                    "Membership Cards",

                EntityId =
                    card.MembershipCardId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Membership Card {verb}",

                ActivityDescription =
                    $"Membership Card '{card.CardName}' ({card.CardCode}) {verb.ToLower()}.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            }
        );
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
            .Set<MembershipCardEntity>()
            .AnyAsync
            (
                x =>
                    x.MembershipCardId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}