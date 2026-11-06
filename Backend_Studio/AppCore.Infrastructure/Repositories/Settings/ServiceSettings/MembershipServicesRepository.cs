//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Infrastructure.Persistence.Paging;

using AppCore.Application.Common.Paging;

using AppCore.Application.Settings.ServiceSettings;

using MembershipServiceEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.MembershipServices;

using MembershipCardEntity =
    AppCore.Domain.Entities.MembershipManagement.MembershipSetup.MembershipCards;

using ServiceCategoryEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServiceCategory;

using ServiceSubCategoryEntity =
    AppCore.Domain.Entities.Settings.ServiceSettings.ServiceSubCategory;

using AppCore.Infrastructure.Configurations.MembershipManagement.MembershipSetup;
using AppCore.Infrastructure.Persistence;
using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Configurations.Settings.ServiceSettings;


//===============================================================
// Membership Services Repository (configure-only)
//
// One complimentary service row per membership card. Rows are
// CREATED by Membership Cards (with their Income Ledger under
// SUB-007-005-001 and Expense Ledger under SUB-004-002-001, each
// "<Sub Group Name> - <Card Name>") and are renamed, deleted and
// restored with the card (shared logic : MembershipCardAccounts).
//
// This page only sets :
//   Service Value  > 0 ; a row without one is Pending and is not
//                  invoiceable, with one it is Ready
//   Status         cannot be active while its card, sub category
//                  or category is inactive; its two ledgers follow
//   Remarks
//
// Invoiced, then discounted :
//   Dr Customer        / Cr Income Ledger   (Service Value)
//   Dr Expense Ledger  / Cr Customer        (the same amount)
//===============================================================

public class MembershipServicesRepository :
    IMembershipServicesRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const decimal MaxAmount =
        99999999.99m;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;


    //===========================================================
    // Constructor
    //===========================================================

    public MembershipServicesRepository(
        AppDbContext context)
    {
        _context =
            context;
    }


    //===========================================================
    // List Page (server paging)
    //
    // Search : every word must match one of the list's columns
    // Counts : Total · Active · Inactive (search + filters, not
    //          the status filter)
    //===========================================================

    private SortMap<MembershipServicesDto> ListSorts()
    {
        return new SortMap<MembershipServicesDto>("CardRank")
            .Add("CardRank", x => x.CardRank)
            .Add("ServiceCode", x => x.ServiceCode)
            .Add("DisplayName", x => x.DisplayName)
            .Add("MembershipType", x => x.MembershipType)
            .Add("Readiness", x => x.Readiness)
            .Add("ServiceValueDisplay", x => x.ServiceValue)
            .Add("IncomeLedgerCode", x => x.IncomeLedgerCode)
            .Add("ExpenseLedgerCode", x => x.ExpenseLedgerCode)
            .Add("IsActive", x => x.IsActive)
            .Tie(x => x.ServiceCode);
    }


    public async Task<PagedResult<MembershipServicesDto>> GetPagedAsync(
        ServiceSettingsPageRequest request)
    {
        IQueryable<MembershipServicesDto> query =
            (await GetAllAsync()).AsQueryable();

        foreach
        (
            string word in request.SafeSearch
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        )
        {
            query =
                query.Where(
                    x =>
                        (x.ServiceCode ?? string.Empty).Contains(word, StringComparison.OrdinalIgnoreCase)
                        ||
                        (x.ServiceName ?? string.Empty).Contains(word, StringComparison.OrdinalIgnoreCase)
                        ||
                        (x.DisplayName ?? string.Empty).Contains(word, StringComparison.OrdinalIgnoreCase)
                        ||
                        (x.MembershipType ?? string.Empty).Contains(word, StringComparison.OrdinalIgnoreCase)
                        ||
                        (x.CardCode ?? string.Empty).Contains(word, StringComparison.OrdinalIgnoreCase)
                        ||
                        (x.Readiness ?? string.Empty).Contains(word, StringComparison.OrdinalIgnoreCase)
                        ||
                        (x.SubCategoryCode ?? string.Empty).Contains(word, StringComparison.OrdinalIgnoreCase)
                        ||
                        (x.SubCategoryName ?? string.Empty).Contains(word, StringComparison.OrdinalIgnoreCase)
                        ||
                        (x.IncomeLedgerCode ?? string.Empty).Contains(word, StringComparison.OrdinalIgnoreCase)
                        ||
                        (x.ExpenseLedgerCode ?? string.Empty).Contains(word, StringComparison.OrdinalIgnoreCase)
                        ||
                        (x.Remarks ?? string.Empty).Contains(word, StringComparison.OrdinalIgnoreCase));
        }

        if (request.CardId.HasValue) { long cardId = request.CardId.Value; query = query.Where(x => x.MembershipCardId == cardId); }

        if (!string.IsNullOrWhiteSpace(request.Readiness)) { string readiness = request.Readiness.Trim(); query = query.Where(x => x.Readiness == readiness); }

        // Summary counts (before the status filter)
        var statusCounts =
            query
                .GroupBy(x => x.IsActive)
                .Select(g => new { Active = g.Key, Count = g.Count() })
                .ToList();

        int activeCount =
            statusCounts.Where(x => x.Active).Sum(x => x.Count);

        int inactiveCount =
            statusCounts.Where(x => !x.Active).Sum(x => x.Count);

        string status =
            (request.Status ?? string.Empty).Trim().ToLowerInvariant();

        if (status == "active")
        {
            query = query.Where(x => x.IsActive);
        }
        else if (status == "inactive")
        {
            query = query.Where(x => !x.IsActive);
        }

        int total =
            query.Count();

        PagingQuery.FitPage(request, total);

        List<MembershipServicesDto> items =
            ListSorts()
                .Apply(query, request)
                .Page(request)
                .ToList();

        PagedResult<MembershipServicesDto> result = new()
        {
            Items = items,
            TotalCount = total,
            Page = request.SafePage,
            PageSize = request.SafePageSize
        };

        result.Counts["Total"] = activeCount + inactiveCount;
        result.Counts["Active"] = activeCount;
        result.Counts["Inactive"] = inactiveCount;

        return result;
    }



    //===========================================================
    // Get All (live rows, by card rank)
    //===========================================================

    public async Task<List<MembershipServicesDto>>
        GetAllAsync()
    {
        await MembershipCardAccounts.SyncNamesAsync(
            _context);

        List<MembershipServiceEntity> rows =
            await _context
                .Set<MembershipServiceEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                )
                .ToListAsync();

        return (await ToDtosAsync(rows))
            .OrderBy(x => x.CardRank)
            .ThenBy(x => x.ServiceCode)
            .ToList();
    }


    //===========================================================
    // Public Id -> internal id (live rows only)
    //===========================================================

    public async Task<long?>
        GetIdByPublicIdAsync
        (
            Guid publicId
        )
    {
        if
        (
            publicId == Guid.Empty
        )
        {
            return null;
        }

        return await _context
            .Set<MembershipServiceEntity>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted && x.PublicId == publicId)
            .Select(x => (long?)x.MembershipServiceId)
            .FirstOrDefaultAsync();
    }


    //===========================================================
    // Get By Id
    //===========================================================

    public async Task<MembershipServicesDto?>
        GetByIdAsync
        (
            long id
        )
    {
        MembershipServiceEntity? row =
            await _context
                .Set<MembershipServiceEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MembershipServiceId ==
                        id
                        &&
                        !x.IsDeleted
                );

        if
        (
            row == null
        )
        {
            return null;
        }

        return (await ToDtosAsync(
                new List<MembershipServiceEntity> { row }))
            .FirstOrDefault();
    }


    //===========================================================
    // Map rows (+ card / sub category) to DTOs
    //===========================================================

    private async Task<List<MembershipServicesDto>>
        ToDtosAsync
        (
            List<MembershipServiceEntity> rows
        )
    {
        List<long> cardIds =
            rows
                .Where(x => x.MembershipCardId != null)
                .Select(x => x.MembershipCardId!.Value)
                .Distinct()
                .ToList();

        Dictionary<long, MembershipCardEntity> cards =
            await _context
                .Set<MembershipCardEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        cardIds.Contains(x.MembershipCardId)
                )
                .ToDictionaryAsync
                (
                    x => x.MembershipCardId
                );

        List<long> subCategoryIds =
            rows
                .Select(x => x.ServiceSubCategoryId)
                .Distinct()
                .ToList();

        Dictionary<long, ServiceSubCategoryEntity> subCategories =
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
                    x => x.ServiceSubCategoryId
                );

        List<MembershipServicesDto> result =
            new List<MembershipServicesDto>();

        foreach
        (
            MembershipServiceEntity row
            in rows
        )
        {
            MembershipCardEntity? card =
                row.MembershipCardId == null
                    ? null
                    : cards.GetValueOrDefault(
                        row.MembershipCardId.Value);

            ServiceSubCategoryEntity? subCategory =
                subCategories.GetValueOrDefault(
                    row.ServiceSubCategoryId);

            result.Add(
                new MembershipServicesDto
                {
                    MembershipServiceId =
                        row.MembershipServiceId,

                    PublicId =
                        row.PublicId,

                    ServiceCode =
                        row.ServiceCode,

                    ServiceSubCategoryId =
                        row.ServiceSubCategoryId,

                    SubCategoryCode =
                        subCategory?.SubCategoryCode
                        ??
                        string.Empty,

                    SubCategoryName =
                        subCategory?.SubCategoryName
                        ??
                        string.Empty,

                    MembershipCardId =
                        row.MembershipCardId,

                    CardCode =
                        card?.CardCode
                        ??
                        string.Empty,

                    CardRank =
                        card?.CardRank
                        ??
                        0,

                    MembershipType =
                        row.MembershipType,

                    ServiceName =
                        row.ServiceName,

                    DisplayName =
                        row.DisplayName,

                    ServiceValue =
                        row.ServiceValue,

                    Readiness =
                        MembershipCardAccounts.Readiness(
                            row.ServiceValue),

                    IncomeSubGroupCode =
                        subCategory?.IncomeSubGroupCode
                        ??
                        string.Empty,

                    IncomeLedgerCode =
                        row.IncomeLedgerCode,

                    IncomeLedgerName =
                        row.IncomeLedgerName,

                    ExpenseSubGroupCode =
                        MembershipCardAccounts.ServiceExpenseSubGroupCode,

                    ExpenseLedgerCode =
                        row.ExpenseLedgerCode,

                    ExpenseLedgerName =
                        row.ExpenseLedgerName,

                    Remarks =
                        row.Remarks,

                    IsActive =
                        row.IsActive,

                    IsDeleted =
                        row.IsDeleted,

                    DeletedBy =
                        row.DeletedBy,

                    DeletedDate =
                        row.DeletedDate,

                    CreatedBy =
                        row.CreatedBy,

                    CreatedDate =
                        row.CreatedDate,

                    ModifiedBy =
                        row.ModifiedBy,

                    ModifiedDate =
                        row.ModifiedDate
                }
            );
        }

        return result;
    }


    //===========================================================
    // Get Defaults (list filter options)
    //===========================================================

    public async Task<MembershipServicesDefaultsDto>
        GetDefaultsAsync()
    {
        MembershipServicesDefaultsDto result =
            new MembershipServicesDefaultsDto
            {
                Cards =
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
                        .Select
                        (
                            x =>
                                new MembershipServicesCardOptionDto
                                {
                                    MembershipCardId =
                                        x.MembershipCardId,

                                    CardCode =
                                        x.CardCode,

                                    CardName =
                                        x.CardName,

                                    CardRank =
                                        x.CardRank,

                                    IsActive =
                                        x.IsActive
                                }
                        )
                        .ToListAsync(),

                SubCategories =
                    await _context
                        .Set<ServiceSubCategoryEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                x.SubCategoryType ==
                                MembershipCardAccounts.MembershipServicesType
                        )
                        .OrderBy
                        (
                            x =>
                                x.SubCategoryCode
                        )
                        .Select
                        (
                            x =>
                                new MembershipServicesSubCategoryOptionDto
                                {
                                    ServiceSubCategoryId =
                                        x.ServiceSubCategoryId,

                                    SubCategoryCode =
                                        x.SubCategoryCode,

                                    SubCategoryName =
                                        x.SubCategoryName
                                }
                        )
                        .ToListAsync(),

                ExpenseSubGroupCode =
                    MembershipCardAccounts.ServiceExpenseSubGroupCode
            };

        Dictionary<string, string> names =
            await MembershipCardAccounts.SubGroupNamesAsync(
                _context,
                new[]
                {
                    MembershipCardAccounts.ServiceExpenseSubGroupCode
                });

        result.ExpenseSubGroupName =
            names.GetValueOrDefault(
                MembershipCardAccounts.ServiceExpenseSubGroupCode)
            ??
            string.Empty;

        return result;
    }


    //===========================================================
    // Configure (Update)
    //
    // Only the Service Value, status and remarks change. Everything
    // else (codes, names, ledgers, card, sub category) is owned by
    // Membership Cards.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateMembershipServicesDto dto,
            long userId
        )
    {
        MembershipServiceEntity? row =
            await _context
                .Set<MembershipServiceEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.MembershipServiceId ==
                        dto.MembershipServiceId
                        &&
                        !x.IsDeleted
                );

        if
        (
            row == null
        )
        {
            throw new KeyNotFoundException(
                "Membership Service not found.");
        }

        MembershipCardEntity card =
            row.MembershipCardId == null
                ? throw new InvalidOperationException(
                    $"Membership Service '{row.DisplayName}' is not linked to a membership card.")
                : await _context
                    .Set<MembershipCardEntity>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync
                    (
                        x =>
                            x.MembershipCardId ==
                            row.MembershipCardId.Value
                            &&
                            !x.IsDeleted
                    )
                ??
                throw new InvalidOperationException(
                    $"The membership card of '{row.DisplayName}' was not found. It may have been deleted.");

        ServiceSubCategoryEntity subCategory =
            await _context
                .Set<ServiceSubCategoryEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ServiceSubCategoryId ==
                        row.ServiceSubCategoryId
                        &&
                        !x.IsDeleted
                )
            ??
            throw new InvalidOperationException(
                "The Service Sub Category of this row was not found. It may have been deleted.");

        ServiceCategoryEntity? category =
            await _context
                .Set<ServiceCategoryEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.ServiceCategoryId ==
                        subCategory.ServiceCategoryId
                        &&
                        !x.IsDeleted
                );

        decimal value =
            Math.Round(
                dto.ServiceValue,
                2);

        if
        (
            value <= 0
            ||
            value > MaxAmount
        )
        {
            throw new InvalidOperationException(
                $"Service Value must be more than 0 and not more than {MaxAmount:N2}.");
        }

        if
        (
            dto.IsActive
            &&
            !card.IsActive
        )
        {
            throw new InvalidOperationException(
                $"Membership Card '{card.CardName}' is inactive. Activate the card first.");
        }

        if
        (
            dto.IsActive
            &&
            (
                !subCategory.IsActive
                ||
                category == null
                ||
                !category.IsActive
            )
        )
        {
            throw new InvalidOperationException(
                $"Sub category '{subCategory.SubCategoryName}' (or its category) is inactive. Activate it first.");
        }

        MembershipLedgerParent incomeParent =
            await MembershipCardAccounts.ResolveParentAsync(
                _context,
                subCategory.IncomeSubGroupCode,
                "Membership Services income",
                false);

        MembershipLedgerParent expenseParent =
            await MembershipCardAccounts.ResolveParentAsync(
                _context,
                MembershipCardAccounts.ServiceExpenseSubGroupCode,
                "Membership Service Charges",
                false);

        row.ServiceValue =
            value;

        row.Remarks =
            dto.Remarks?.Trim()
            ??
            string.Empty;

        row.IsActive =
            dto.IsActive;

        row.ModifiedBy =
            userId;

        row.ModifiedDate =
            DateTime.UtcNow;


        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await MembershipCardAccounts.SyncLedgerAsync(
            _context,
            row.IncomeLedgerCode,
            row.IncomeLedgerName,
            row.IsActive,
            $"System generated from Membership Cards {card.CardCode} / Membership Services {row.ServiceCode} (billed service value).",
            incomeParent,
            userId);

        await MembershipCardAccounts.SyncLedgerAsync(
            _context,
            row.ExpenseLedgerCode,
            row.ExpenseLedgerName,
            row.IsActive,
            $"System generated from Membership Cards {card.CardCode} / Membership Services {row.ServiceCode} (complimentary discount).",
            expenseParent,
            userId);

        await _context.SaveChangesAsync();

        AddHistory(
            row,
            "Update",
            "Configured",
            userId);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }


    //===========================================================
    // Activity History
    //===========================================================

    private void AddHistory
    (
        MembershipServiceEntity entity,
        string activityType,
        string verb,
        long userId
    )
    {
        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Service Settings",

                EntityName =
                    "Membership Services",

                EntityId =
                    entity.MembershipServiceId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    $"Membership Service {verb}",

                ActivityDescription =
                    $"Membership Service '{entity.DisplayName}' ({entity.ServiceCode}) {verb.ToLower()}.",

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
            .Set<MembershipServiceEntity>()
            .AnyAsync
            (
                x =>
                    x.MembershipServiceId ==
                    id
                    &&
                    !x.IsDeleted
            );
    }
}