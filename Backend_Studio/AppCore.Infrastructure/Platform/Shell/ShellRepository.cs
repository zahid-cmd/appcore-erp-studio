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
//                   • website enquiries (Enquire Now / test ride /
//                     EMI) nobody has taken yet, login branch, for
//                     users who can open Sales Enquiries; and
//                     website repeats on the user's own enquiries
//                   • new user requests (registered, still
//                     Inactive, not reviewed yet) for users who
//                     can open User Profile
//                   • a welcome note for a registered user once
//                     their account is activated
// Context      : the financial year that covers today (Dhaka).
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Platform.DataManagement;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.Platform.Shell;
using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.SystemConfigurations.DTOs;

using AppCore.Domain.Entities.AccountsFinance.VoucherManagement;
using AppCore.Domain.Entities.EnquiryManagement.EnquiryProfiles;
using AppCore.Domain.Entities.InfrastructureControl.NavigationManagement;
using AppCore.Domain.Entities.SecurityPermission.UserManagement;
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

    // Sales Enquiries : access check and the page a website
    // enquiry opens (edit : saving it makes the user its executive)
    private const string SalesEnquiriesRoutePart =
        "sales-enquiries";

    private const string SalesEnquiryEditRoute =
        "/enquiry-management/enquiry-profiles/sales-enquiries/edit/";

    private const string ServiceEnquiriesRoutePart =
        "service-enquiries";

    private const string ServiceEnquiryEditRoute =
        "/enquiry-management/enquiry-profiles/service-enquiries/edit/";

    // Most website items shown in the bell
    private const int MaxWebsiteItems =
        15;

    // User Profile : access check and the page a new user
    // request opens (edit : activate the user, assign roles)
    private const string UserProfileRoutePart =
        "user-profile";

    private const string UserProfileEditRoute =
        "/security-permission/user-management/user-profile/edit/";


    //===========================================================
    // Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IEffectiveAccessRepository _effectiveAccess;

    private readonly ISystemConfigurationsRepository _configurations;

    private readonly IDataManagementService _dataManagement;

    private readonly IFinancialYearAutoCreateService _financialYearAuto;


    //===========================================================
    // Constructor
    //===========================================================

    public ShellRepository
    (
        AppDbContext context,

        IEffectiveAccessRepository effectiveAccess,

        ISystemConfigurationsRepository configurations,

        IDataManagementService dataManagement,

        IFinancialYearAutoCreateService financialYearAuto
    )
    {
        _financialYearAuto =
            financialYearAuto;

        _context =
            context;

        _effectiveAccess =
            effectiveAccess;

        _configurations =
            configurations;

        _dataManagement =
            dataManagement;
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

        items.AddRange(
            await WebsiteEnquiriesAsync(userId, branchId));

        items.AddRange(
            await WebsiteServiceEnquiriesAsync(userId, branchId));

        items.AddRange(
            await NewUserRequestsAsync(userId));

        ShellNotificationDto? welcome =
            await AccountApprovedAsync(userId);

        if (welcome != null)
        {
            items.Add(welcome);
        }

        ShellNotificationDto? backup =
            await BackupAlertAsync(userId);

        if (backup != null)
        {
            items.Add(backup);
        }

        ShellNotificationDto? financialYear =
            await FinancialYearAlertAsync(userId);

        if (financialYear != null)
        {
            items.Add(financialYear);
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


    //-----------------------------------------------------------
    // Website enquiries (one item each, newest first) :
    //   • new ones nobody has taken yet (executive 0), open, in
    //     the login branch → "New website enquiry" / "… test ride"
    //     / "… EMI plan";
    //   • the user's own open enquiries the same mobile asked
    //     about again on the website in the last 3 days.
    // The key holds the last change, so a repeat shows as new.
    // Shown to users who can open Sales Enquiries.
    //-----------------------------------------------------------

    private async Task<List<ShellNotificationDto>> WebsiteEnquiriesAsync
    (
        long userId,
        long? branchId
    )
    {
        List<ShellNotificationDto> none =
            new List<ShellNotificationDto>();

        if (!await CanOpenPageAsync(userId, SalesEnquiriesRoutePart))
        {
            return none;
        }

        List<long> openStatusIds =
            await _context.Set<EnquirySetups>()
                .AsNoTracking()
                .Where(x => x.SetupType == "Status" && x.Stage == "Open" && !x.IsDeleted)
                .Select(x => x.EnquirySetupId)
                .ToListAsync();

        DateTime since =
            DateTime.UtcNow.AddDays(-3);

        var query =
            _context.Set<SalesEnquiries>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted
                            && !x.IsMatured
                            && openStatusIds.Contains(x.StatusId)
                            && (
                                   (x.FromWebsite && x.ExecutiveUserId == 0)
                                   ||
                                   (x.ExecutiveUserId == userId
                                    && x.ModifiedBy == 0
                                    && x.ModifiedDate != null
                                    && x.ModifiedDate > since)
                               ));

        if (branchId.HasValue && branchId.Value > 0)
        {
            long branch =
                branchId.Value;

            // Own repeats show in any branch; new ones in the login branch
            query =
                query.Where(x => x.BranchId == branch || x.ExecutiveUserId == userId);
        }

        var rows =
            await query
                .OrderByDescending(x => x.ModifiedDate ?? x.CreatedDate)
                .Take(MaxWebsiteItems)
                .Select(x => new
                {
                    x.SalesEnquiryId,
                    x.EnquiryNo,
                    x.EnquirerName,
                    x.EnquirerMobile,
                    x.ModelName,
                    x.PreferredColor,
                    x.PaymentMode,
                    x.TestRideDate,
                    x.TestRideSlot,
                    x.ExecutiveUserId,
                    x.CreatedDate,
                    x.ModifiedDate
                })
                .ToListAsync();

        return rows
            .Select(x =>
            {
                bool repeat =
                    x.ExecutiveUserId != 0;

                string what =
                    x.TestRideDate.HasValue
                        ? "test ride request"
                        : x.PaymentMode == "EMI"
                            ? "EMI plan request"
                            : "enquiry";

                string title =
                    repeat
                        ? $"{x.EnquirerName} asked again on the website"
                        : $"New website {what}";

                string bike =
                    x.ModelName
                    + (string.IsNullOrWhiteSpace(x.PreferredColor) ? string.Empty : $" ({x.PreferredColor})");

                string ride =
                    x.TestRideDate.HasValue
                        ? $" · ride {x.TestRideDate.Value:dd-MMM}{(string.IsNullOrWhiteSpace(x.TestRideSlot) ? string.Empty : " " + x.TestRideSlot)}"
                        : string.Empty;

                DateTime changed =
                    x.ModifiedDate ?? x.CreatedDate;

                return new ShellNotificationDto
                {
                    Key = $"web-{x.SalesEnquiryId}-{changed.Ticks}",
                    Kind = "website",
                    Title = title,
                    Detail = $"{x.EnquirerName} · {x.EnquirerMobile} · {bike}{ride} · {x.EnquiryNo}",
                    Route = SalesEnquiryEditRoute + x.SalesEnquiryId,
                    Date = changed
                };
            })
            .ToList();
    }


    //-----------------------------------------------------------
    // Website service bookings / part requests : same rules as
    // the sales ones (new and unassigned in the login branch; the
    // user's own asked again in the last 3 days). Shown to users
    // who can open Service Enquiries.
    //-----------------------------------------------------------

    private async Task<List<ShellNotificationDto>> WebsiteServiceEnquiriesAsync
    (
        long userId,
        long? branchId
    )
    {
        if (!await CanOpenPageAsync(userId, ServiceEnquiriesRoutePart))
        {
            return new List<ShellNotificationDto>();
        }

        List<long> openStatusIds =
            await _context.Set<EnquirySetups>()
                .AsNoTracking()
                .Where(x => x.SetupType == "Status" && x.Stage == "Open" && !x.IsDeleted)
                .Select(x => x.EnquirySetupId)
                .ToListAsync();

        DateTime since =
            DateTime.UtcNow.AddDays(-3);

        var query =
            _context.Set<ServiceEnquiries>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted
                            && !x.IsConverted
                            && openStatusIds.Contains(x.StatusId)
                            && (
                                   (x.FromWebsite && x.ExecutiveUserId == 0)
                                   ||
                                   (x.ExecutiveUserId == userId
                                    && x.ModifiedBy == 0
                                    && x.ModifiedDate != null
                                    && x.ModifiedDate > since)
                               ));

        if (branchId.HasValue && branchId.Value > 0)
        {
            long branch =
                branchId.Value;

            query =
                query.Where(x => x.BranchId == branch || x.ExecutiveUserId == userId);
        }

        var rows =
            await query
                .OrderByDescending(x => x.ModifiedDate ?? x.CreatedDate)
                .Take(MaxWebsiteItems)
                .Select(x => new
                {
                    x.ServiceEnquiryId,
                    x.EnquiryNo,
                    x.EnquiryType,
                    x.EnquirerName,
                    x.EnquirerMobile,
                    x.ModelName,
                    x.RegistrationNo,
                    x.PreferredDate,
                    x.PreferredSlot,
                    x.ExecutiveUserId,
                    x.CreatedDate,
                    x.ModifiedDate
                })
                .ToListAsync();

        return rows
            .Select(x =>
            {
                bool repeat =
                    x.ExecutiveUserId != 0;

                bool parts =
                    x.EnquiryType == "Parts";

                string bike =
                    string.Join(" ", new[] { x.ModelName, x.RegistrationNo }.Where(s => !string.IsNullOrWhiteSpace(s)));

                string when =
                    x.PreferredDate.HasValue
                        ? $" · {x.PreferredDate.Value:dd-MMM}{(string.IsNullOrWhiteSpace(x.PreferredSlot) ? string.Empty : " " + x.PreferredSlot)}"
                        : string.Empty;

                DateTime changed =
                    x.ModifiedDate ?? x.CreatedDate;

                return new ShellNotificationDto
                {
                    Key = $"websvc-{x.ServiceEnquiryId}-{changed.Ticks}",
                    Kind = "website",
                    Title =
                        repeat
                            ? $"{x.EnquirerName} asked again on the website"
                            : parts
                                ? "New website part request"
                                : "New website service booking",
                    Detail = $"{x.EnquirerName} · {x.EnquirerMobile}{(bike.Length > 0 ? " · " + bike : string.Empty)}{when} · {x.EnquiryNo}",
                    Route = ServiceEnquiryEditRoute + x.ServiceEnquiryId,
                    Date = changed
                };
            })
            .ToList();
    }


    //-----------------------------------------------------------
    // New user requests : profiles made by Register on the
    // website / login page. They start Inactive and nobody has
    // saved them yet (ModifiedDate empty). Once someone opens and
    // saves the profile (activates it, or keeps it inactive on
    // purpose) the item goes away. One item each, newest first.
    // Shown to users who can open User Profile.
    //-----------------------------------------------------------

    private async Task<List<ShellNotificationDto>> NewUserRequestsAsync
    (
        long userId
    )
    {
        try
        {
            if (!await CanOpenPageAsync(userId, UserProfileRoutePart))
            {
                return new List<ShellNotificationDto>();
            }

            var rows =
                await _context.Set<UserProfile>()
                    .AsNoTracking()
                    .Where(x => !x.IsDeleted
                                && !x.IsActive
                                && x.ModifiedDate == null)
                    .OrderByDescending(x => x.CreatedDate)
                    .Take(MaxWebsiteItems)
                    .Select(x => new
                    {
                        x.PublicId,
                        x.ProfileCode,
                        x.UserName,
                        x.FullName,
                        x.MobileNo,
                        x.Email,
                        x.CreatedDate
                    })
                    .ToListAsync();

            return rows
                .Select(x =>
                {
                    string name =
                        string.IsNullOrWhiteSpace(x.FullName)
                            ? x.UserName
                            : x.FullName;

                    string contact =
                        !string.IsNullOrWhiteSpace(x.MobileNo)
                            ? x.MobileNo
                            : x.Email;

                    return new ShellNotificationDto
                    {
                        Key = $"user-{x.PublicId}",
                        Kind = "user-request",
                        Title = "New user request",
                        Detail = $"{name} ({x.UserName})"
                                 + (string.IsNullOrWhiteSpace(contact) ? string.Empty : $" · {contact}")
                                 + $" · {x.ProfileCode} · waiting for approval",
                        Route = UserProfileEditRoute + x.PublicId,
                        Date = x.CreatedDate
                    };
                })
                .ToList();
        }
        catch
        {
            // the bell never fails because of the user check
            return new List<ShellNotificationDto>();
        }
    }


    //-----------------------------------------------------------
    // Account approved (welcome) : for the user's own profile
    // when it was made by Register (CreatedBy 0), is Active now,
    // and someone else saved it in the last 7 days (the
    // activation). The key never changes, so once read it stays
    // read. No page to open.
    //-----------------------------------------------------------

    private async Task<ShellNotificationDto?> AccountApprovedAsync
    (
        long userId
    )
    {
        try
        {
            DateTime since =
                DateTime.UtcNow.AddDays(-7);

            var me =
                await _context.Set<UserProfile>()
                    .AsNoTracking()
                    .Where(x => x.UserProfileId == userId
                                && !x.IsDeleted
                                && x.IsActive
                                && x.CreatedBy == 0
                                && x.ModifiedBy != null
                                && x.ModifiedBy != userId
                                && x.ModifiedDate != null
                                && x.ModifiedDate > since)
                    .Select(x => new
                    {
                        x.UserProfileId,
                        x.DisplayName,
                        x.FullName,
                        x.UserName,
                        x.ModifiedDate
                    })
                    .FirstOrDefaultAsync();

            if (me == null)
            {
                return null;
            }

            string name =
                !string.IsNullOrWhiteSpace(me.DisplayName)
                    ? me.DisplayName
                    : !string.IsNullOrWhiteSpace(me.FullName)
                        ? me.FullName
                        : me.UserName;

            return new ShellNotificationDto
            {
                Key = $"welcome-{me.UserProfileId}",
                Kind = "welcome",
                Title = $"Welcome, {name}! Your account is approved",
                Detail = "You can now use the pages your roles allow. If a page you need is missing, please ask the administrator.",
                Route = string.Empty,
                Date = me.ModifiedDate!.Value
            };
        }
        catch
        {
            // the bell never fails because of the welcome check
            return null;
        }
    }


    //-----------------------------------------------------------
    // Nightly backup failed (or no good backup for a day) : for
    // AppCore Admin (opens Database Backups) and for users with
    // "Take Backup" on the Backup Center (opens the Backup Center)
    //-----------------------------------------------------------

    private async Task<ShellNotificationDto?> BackupAlertAsync
    (
        long userId
    )
    {
        try
        {
            DataNightlyStatusDto status =
                await _dataManagement.GetNightlyStatusAsync();

            if (!status.Failing)
            {
                return null;
            }

            bool admin =
                await _dataManagement.IsAppCoreAdminAsync(userId);

            bool client =
                !admin
                && await _effectiveAccess.HasActivityAsync(userId, "/settings/%/backup-center", "Take Backup");

            if (!admin && !client)
            {
                return null;
            }

            DateTime when =
                status.LastRunDate ?? DateTime.Now;

            return new ShellNotificationDto
            {
                Key = $"backup-{when:yyyyMMddHHmm}-{status.LastStatus}",
                Kind = "backup",
                Title = status.LastStatus == "Failed"
                    ? "Last night's backup failed"
                    : "No recent backup",
                Detail = status.Message,
                Route = admin
                    ? "/infrastructure-control/data-management/database-backups"
                    : "/settings/general-settings/backup-center",
                Date = when
            };
        }
        catch
        {
            // the bell never fails because of the backup check
            return null;
        }
    }


    //-----------------------------------------------------------
    // Next financial year (users who can open Financial Years) :
    //   • switch ON  : from 10 days before the create day, every
    //     day : "FY 2027-2028 will be created automatically on
    //     31-May-2027 · no action needed";
    //   • switch OFF : from (days + 10) before the year ends,
    //     every day : the next year is not created yet;
    //   • for 7 days after an automatic one : it was created.
    // The key holds today's date, so it shows as new each day.
    //-----------------------------------------------------------

    private const string FinancialYearsRoute =
        "/settings/general-settings/financial-years/list";

    private async Task<ShellNotificationDto?> FinancialYearAlertAsync
    (
        long userId
    )
    {
        try
        {
            FinancialYearAutoStatusDto s =
                await _financialYearAuto.GetStatusAsync();

            if (s.RecentlyAutoCreated)
            {
                if (!await CanOpenPageAsync(userId, "financial-years"))
                {
                    return null;
                }

                return new ShellNotificationDto
                {
                    Key = $"fy-made-{s.NextYearName}",
                    Kind = "financial-year",
                    Title = $"{s.NextYearName} was created automatically",
                    Detail = $"{s.NextStart:dd-MMM-yyyy} to {s.NextEnd:dd-MMM-yyyy} · Open, not set as current. No action needed.",
                    Route = FinancialYearsRoute,
                    Date = DateTime.UtcNow
                };
            }

            if (s.NextExists
                || s.NotifyFrom == null
                || s.CreateOn == null
                || s.NextStart == null
                || s.Today < s.NotifyFrom.Value)
            {
                return null;
            }

            if (!await CanOpenPageAsync(userId, "financial-years"))
            {
                return null;
            }

            if (s.AutoCreate)
            {
                bool due =
                    s.Today >= s.CreateOn.Value;

                int daysLeft =
                    s.CreateOn.Value.DayNumber - s.Today.DayNumber;

                return new ShellNotificationDto
                {
                    Key = $"fy-auto-{s.Today:yyyyMMdd}",
                    Kind = "financial-year",
                    Title = due
                        ? $"{s.NextYearName} is being created automatically today"
                        : $"{s.NextYearName} will be created automatically on {s.CreateOn:dd-MMM-yyyy}",
                    Detail = due
                        ? $"Starts {s.NextStart:dd-MMM-yyyy}. No action needed."
                        : $"In {daysLeft} day{(daysLeft == 1 ? "" : "s")} · starts {s.NextStart:dd-MMM-yyyy}. No action needed.",
                    Route = FinancialYearsRoute,
                    Date = DateTime.UtcNow
                };
            }

            int daysToStart =
                s.NextStart.Value.DayNumber - s.Today.DayNumber;

            return new ShellNotificationDto
            {
                Key = $"fy-missing-{s.Today:yyyyMMdd}",
                Kind = "financial-year",
                Title = $"{s.NextYearName} is not created yet",
                Detail = daysToStart > 0
                    ? $"It must exist before {s.NextStart:dd-MMM-yyyy} ({daysToStart} day{(daysToStart == 1 ? "" : "s")} left). Create it on Financial Years, or turn on Auto Create Next Financial Year."
                    : $"It should have started on {s.NextStart:dd-MMM-yyyy}. Vouchers dated in it cannot be saved until it is created.",
                Route = FinancialYearsRoute,
                Date = DateTime.UtcNow
            };
        }
        catch
        {
            // the bell never fails because of the year check
            return null;
        }
    }


    // The user can open a page whose route contains this part
    private async Task<bool> CanOpenPageAsync
    (
        long userId,
        string routePart
    )
    {
        List<long> pageIds =
            await _context.Set<NavigationSubmenu>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted
                            && x.IsActive
                            && x.Route.ToLower().Contains(routePart))
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