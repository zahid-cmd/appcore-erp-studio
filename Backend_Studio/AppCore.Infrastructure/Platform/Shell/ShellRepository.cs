//===============================================================
// App Shell Repository
//
// Favorites     : per user, table UserFavorites. Only active
//                 pages (and their active menu / module) are
//                 returned, like the sidebar itself.
// Notifications : built from data that already exists (nothing
//                 is stored) :
//                   • configuration changes waiting for this
//                     user's approval (same rules as the System
//                     Configurations page; own requests left out)
//                   • received cheques due for clearing today or
//                     earlier, in the login branch, for users who
//                     can open Check Reconciliation
// Context       : the financial year that covers today (Dhaka).
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.Platform.Shell;
using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.SystemConfigurations.DTOs;

using AppCore.Domain.Entities.AccountsFinance.VoucherManagement;
using AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;
using AppCore.Domain.Entities.Settings.GeneralSettings;
using AppCore.Domain.Platform.Accounting;
using AppCore.Domain.Platform.Shell;

using AppCore.Infrastructure.Persistence;


namespace AppCore.Infrastructure.Platform.Shell;


public class ShellRepository : IShellRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const int MaxFavorites =
        30;

    private const string ConfigurationsRoute =
        "/settings/general-settings/system-configurations/list";

    private const string CheckReconciliationRoute =
        "/accounts-finance/accounts-reconciliation/check-reconciliations/list";

    // Part of the Check Reconciliation page's route (access check)
    private const string CheckReconciliationRoutePart =
        "check-reconciliations";


    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ISystemConfigurationsRepository _configurations;


    //===========================================================
    // Constructor
    //===========================================================

    public ShellRepository
    (
        AppDbContext context,

        IEffectiveAccessRepository effectiveAccess,

        ISystemConfigurationsRepository configurations
    )
    {
        _context =
            context;

        _effectiveAccess =
            effectiveAccess;

        _configurations =
            configurations;
    }


    //===========================================================
    // Favorites : list
    //===========================================================

    public async Task<List<ShellFavoriteDto>> GetFavoritesAsync
    (
        long userId
    )
    {
        return await
        (
            from f in _context.Set<UserFavorites>().AsNoTracking()

            join s in _context.Set<NavigationSubmenu>().AsNoTracking()
                on f.NavigationSubmenuId equals s.Id

            join m in _context.Set<NavigationMenu>().AsNoTracking()
                on s.NavigationMenuId equals m.Id

            join d in _context.Set<NavigationModule>().AsNoTracking()
                on m.NavigationModuleId equals d.Id

            where f.UserProfileId == userId
                  && s.IsActive && !s.IsDeleted
                  && m.IsActive && !m.IsDeleted
                  && d.IsActive && !d.IsDeleted

            orderby f.SortOrder, f.CreatedDate, f.UserFavoriteId

            select new ShellFavoriteDto
            {
                SubmenuId = s.Id,
                Code = s.Code,
                Name = s.Name,
                Icon = s.Icon,
                Route = s.Route,
                MenuName = m.Name,
                ModuleName = d.Name,
                SortOrder = f.SortOrder
            }
        )
        .ToListAsync();
    }


    //===========================================================
    // Favorites : add
    //===========================================================

    public async Task<List<ShellFavoriteDto>> AddFavoriteAsync
    (
        long userId,
        long submenuId
    )
    {
        bool pageExists =
            await _context.Set<NavigationSubmenu>()
                .AsNoTracking()
                .AnyAsync(x => x.Id == submenuId && x.IsActive && !x.IsDeleted);

        if (!pageExists)
        {
            throw new KeyNotFoundException(
                "The page was not found. It may have been removed from the menu.");
        }

        List<UserFavorites> mine =
            await _context.Set<UserFavorites>()
                .Where(x => x.UserProfileId == userId)
                .ToListAsync();

        if (mine.Any(x => x.NavigationSubmenuId == submenuId))
        {
            return await GetFavoritesAsync(userId);
        }

        if (mine.Count >= MaxFavorites)
        {
            throw new InvalidOperationException(
                $"You can keep up to {MaxFavorites} favorite pages. Remove one first.");
        }

        _context.Set<UserFavorites>().Add(
            new UserFavorites
            {
                UserProfileId = userId,
                NavigationSubmenuId = submenuId,
                SortOrder = mine.Count == 0 ? 1 : mine.Max(x => x.SortOrder) + 1,
                CreatedDate = DateTime.UtcNow
            });

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Two clicks at once : the unique index kept one row.
            _context.ChangeTracker.Clear();
        }

        return await GetFavoritesAsync(userId);
    }


    //===========================================================
    // Favorites : remove
    //===========================================================

    public async Task<List<ShellFavoriteDto>> RemoveFavoriteAsync
    (
        long userId,
        long submenuId
    )
    {
        List<UserFavorites> rows =
            await _context.Set<UserFavorites>()
                .Where(x => x.UserProfileId == userId && x.NavigationSubmenuId == submenuId)
                .ToListAsync();

        if (rows.Count > 0)
        {
            _context.Set<UserFavorites>().RemoveRange(rows);

            await _context.SaveChangesAsync();
        }

        return await GetFavoritesAsync(userId);
    }


    //===========================================================
    // Favorites : reorder
    //===========================================================

    public async Task<List<ShellFavoriteDto>> ReorderFavoritesAsync
    (
        long userId,
        List<long> submenuIds
    )
    {
        List<UserFavorites> mine =
            await _context.Set<UserFavorites>()
                .Where(x => x.UserProfileId == userId)
                .OrderBy(x => x.SortOrder)
                .ThenBy(x => x.CreatedDate)
                .ToListAsync();

        List<long> order =
            (submenuIds ?? new List<long>())
                .Distinct()
                .ToList();

        // Given ids first (in the given order), then the rest as they were
        List<UserFavorites> sorted =
            mine.OrderBy(x =>
                {
                    int index = order.IndexOf(x.NavigationSubmenuId);

                    return index < 0 ? int.MaxValue : index;
                })
                .ThenBy(x => x.SortOrder)
                .ToList();

        for (int i = 0; i < sorted.Count; i++)
        {
            sorted[i].SortOrder = i + 1;
        }

        await _context.SaveChangesAsync();

        return await GetFavoritesAsync(userId);
    }


    //===========================================================
    // Notifications
    //===========================================================

    public async Task<List<ShellNotificationDto>> GetNotificationsAsync
    (
        long userId,
        long? branchId
    )
    {
        List<ShellNotificationDto> items =
            new List<ShellNotificationDto>();

        items.AddRange(
            await ConfigurationApprovalsAsync(userId));

        ShellNotificationDto? cheques =
            await ChequesDueAsync(userId, branchId);

        if (cheques != null)
        {
            items.Add(cheques);
        }

        return items
            .OrderByDescending(x => x.Date)
            .ToList();
    }


    //-----------------------------------------------------------
    // Configuration changes waiting for this user's approval.
    // GetRequestsAsync applies the page's own rule ('Manage
    // Configurations' on System Configurations); anyone else
    // gets nothing. Own requests are left out (no self-approval).
    //-----------------------------------------------------------

    private async Task<List<ShellNotificationDto>> ConfigurationApprovalsAsync
    (
        long userId
    )
    {
        List<SystemConfigurationRequestDto> requests;

        try
        {
            requests =
                await _configurations.GetRequestsAsync(userId);
        }
        catch (UnauthorizedAccessException)
        {
            return new List<ShellNotificationDto>();
        }

        return requests
            .Where(x => x.RequestedBy != userId)
            .Select(x => new ShellNotificationDto
            {
                Key = $"cfg-{x.SystemConfigurationRequestId}",
                Kind = "approval",
                Title = "Configuration change waiting for approval",
                Detail = $"{x.ConfigurationName} · requested by {x.RequestedByName}",
                Route = ConfigurationsRoute,
                Date = x.RequestedDate
            })
            .ToList();
    }


    //-----------------------------------------------------------
    // Received cheques due for clearing : posted Receipt
    // Vouchers, payment mode Check, not deposited / cleared yet,
    // cheque date today or earlier, login branch only.
    // Shown to users who can open Check Reconciliation.
    // One summary item; its key changes with the date and count.
    //-----------------------------------------------------------

    private async Task<ShellNotificationDto?> ChequesDueAsync
    (
        long userId,
        long? branchId
    )
    {
        if (!await CanOpenCheckReconciliationAsync(userId))
        {
            return null;
        }

        DateOnly today =
            BusinessToday();

        var query =
            from p in _context.Set<ReceiptVoucherPayments>().AsNoTracking()

            join v in _context.Set<ReceiptVoucher>().AsNoTracking()
                on p.ReceiptVoucherId equals v.ReceiptVoucherId

            where p.Mode == "Check"
                  && (p.CheckStatus == "" || p.CheckStatus == "Pending")
                  && p.CheckDate != null
                  && p.CheckDate <= today
                  && v.Status == VoucherStatuses.Posted
                  && !v.IsDeleted

            select new { v.BranchId, p.Amount, p.CheckDate };

        if (branchId.HasValue && branchId.Value > 0)
        {
            query =
                query.Where(x => x.BranchId == branchId.Value);
        }

        var due =
            await query.ToListAsync();

        if (due.Count == 0)
        {
            return null;
        }

        decimal total =
            due.Sum(x => x.Amount);

        DateOnly oldest =
            due.Min(x => x.CheckDate!.Value);

        return new ShellNotificationDto
        {
            Key = $"chq-{today:yyyyMMdd}-{due.Count}-{total:0.00}",
            Kind = "cheque",
            Title = due.Count == 1
                ? "1 received cheque due for clearing"
                : $"{due.Count} received cheques due for clearing",
            Detail = $"Tk {total:N2} · oldest cheque date {oldest:dd-MMM-yyyy}",
            Route = CheckReconciliationRoute,
            Date = DateTime.UtcNow
        };
    }


    private async Task<bool> CanOpenCheckReconciliationAsync
    (
        long userId
    )
    {
        List<long> pageIds =
            await _context.Set<NavigationSubmenu>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted
                            && x.IsActive
                            && x.Route.ToLower().Contains(CheckReconciliationRoutePart))
                .Select(x => x.Id)
                .ToListAsync();

        if (pageIds.Count == 0)
        {
            return false;
        }

        var access =
            await _effectiveAccess.GetEffectiveAccessAsync(userId);

        return access.Any(x => pageIds.Contains(x.SubMenuId));
    }


    //===========================================================
    // Context (top bar chips)
    //===========================================================

    public async Task<ShellContextDto> GetContextAsync()
    {
        DateOnly today =
            BusinessToday();

        FinancialYears? year =
            await _context.Set<FinancialYears>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted
                            && x.Status
                            && x.StartDate <= today
                            && x.EndDate >= today)
                .OrderByDescending(x => x.IsCurrent)
                .ThenByDescending(x => x.StartDate)
                .FirstOrDefaultAsync();

        return new ShellContextDto
        {
            Today = today.ToString("yyyy-MM-dd"),
            FinancialYearCode = year?.FinancialYearCode ?? string.Empty,
            FinancialYearName = year?.FinancialYearName ?? string.Empty,
            YearStatus = year?.YearStatus ?? string.Empty
        };
    }


    //===========================================================
    // Business Today (Asia/Dhaka)
    //===========================================================

    private static DateOnly BusinessToday()
    {
        TimeZoneInfo zone;

        try
        {
            zone =
                TimeZoneInfo.FindSystemTimeZoneById("Asia/Dhaka");
        }
        catch (TimeZoneNotFoundException)
        {
            zone =
                TimeZoneInfo.FindSystemTimeZoneById("Bangladesh Standard Time");
        }

        return DateOnly.FromDateTime(
            TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.UtcNow,
                zone));
    }
}