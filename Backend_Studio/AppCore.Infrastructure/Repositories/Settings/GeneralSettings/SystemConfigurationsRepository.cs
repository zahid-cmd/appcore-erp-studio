//===============================================================
// Namespaces
//===============================================================

using System.Globalization;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

using AppCore.Application.Platform.EffectiveAccess.DTOs;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;
using AppCore.Application.Settings.GeneralSettings;
using AppCore.Application.Settings.GeneralSettings.SystemConfigurations.DTOs;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;

using SystemConfigurationRequestsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurationRequests;

using NavigationModuleEntity =
    AppCore.Domain.Entities.InfrastructureControl.NavigationManagement.NavigationModule;

using NavigationMenuEntity =
    AppCore.Domain.Entities.InfrastructureControl.NavigationManagement.NavigationMenu;

using NavigationSubmenuEntity =
    AppCore.Domain.Entities.InfrastructureControl.NavigationManagement.NavigationSubmenu;

using MasterActivityEntity =
    AppCore.Domain.Entities.InfrastructureControl.NavigationManagement.MasterActivity;

using AppCore.Infrastructure.Persistence;

using AppCore.Domain.Common;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.Settings.GeneralSettings;


//===============================================================
// System Configurations Repository
//
// Who may do what (looked up by CODE from Effective Access) :
//
//   Manage Configurations (ACT-0006) on the System
//   Configurations page (SUB-003-001-005) = admin :
//     sees and changes every switch, adds / edits / deletes
//     switches, approves or rejects requests. A critical change
//     applies at once with a reason.
//
//   Change Configuration (ACT-0007) on a page (submenu) :
//     sees and changes only that page's switches (ScopeType
//     Submenu). A critical change becomes a Pending request.
//
//   Module / Menu switches : admin only.
//
// Every check runs here on the server; the page only hides what
// it may not show.
//===============================================================

public class SystemConfigurationsRepository : ISystemConfigurationsRepository
{
    //===========================================================
    // Constants
    //===========================================================

    private const string ModuleName =
        "General Settings";

    private const string EntityName =
        "SystemConfiguration";

    // Permission codes (Navigation Activities / Submenus)
    private const string ManageActivityCode =
        "ACT-0006";

    private const string ChangeActivityCode =
        "ACT-0007";

    private const string ConfigurationPageCode =
        "SUB-003-001-005";

    // Scope types
    private const string ScopeModule = "Module";

    private const string ScopeMenu = "Menu";

    private const string ScopeSubmenu = "Submenu";

    // Value types
    private const string ValueNone = "None";

    private const string ValueNumber = "Number";

    private const string ValueText = "Text";

    // Request status
    private const string StatusPending = "Pending";

    private const string StatusApproved = "Approved";

    private const string StatusRejected = "Rejected";

    private const string StatusStale = "Stale";

    private const string StatusCancelled = "Cancelled";

    // Code : CFG-<ModuleCode>-0001
    private const string CodePrefix =
        "CFG";

    private const int CodeDigits =
        4;

    private const int CodeMaxLength =
        50;

    private const int NameMaxLength =
        200;

    private const int DescriptionMaxLength =
        300;

    private const int RemarksMaxLength =
        1000;

    private const int ValueMaxLength =
        100;

    private const int UnitMaxLength =
        30;

    private const int EmptyTextMaxLength =
        40;

    private const int ReasonMaxLength =
        500;

    private const int RecentCount =
        8;

    // ActivityHistories column sizes
    private const int HistoryTitleMaxLength =
        200;

    private const int HistoryDescriptionMaxLength =
        1000;

    // Parent chain walked when checking for a loop
    private const int ParentChainLimit =
        20;


    //===========================================================
    // Private Fields
    //===========================================================

    private readonly AppDbContext _context;

    private readonly IEffectiveAccessRepository _effectiveAccess;


    //===========================================================
    // Constructor
    //===========================================================

    public SystemConfigurationsRepository(
        AppDbContext context,
        IEffectiveAccessRepository effectiveAccess)
    {
        _context =
            context;

        _effectiveAccess =
            effectiveAccess;
    }


    //===========================================================
    // ACCESS
    //===========================================================

    private sealed class ConfigurationAccess
    {
        public bool CanManage { get; init; }

        public HashSet<string> ChangeSubmenuCodes { get; init; } =
            new(StringComparer.OrdinalIgnoreCase);

        public bool HasAny =>
            CanManage || ChangeSubmenuCodes.Count > 0;

        public bool CanChange(
            SystemConfigurationsEntity entity)
        {
            if (CanManage)
            {
                return true;
            }

            return entity.ScopeType == ScopeSubmenu
                   &&
                   !string.IsNullOrWhiteSpace(entity.NavigationSubmenuCode)
                   &&
                   ChangeSubmenuCodes.Contains(entity.NavigationSubmenuCode);
        }
    }


    //===========================================================
    // Get Access (for any user)
    //===========================================================

    private async Task<ConfigurationAccess>
        GetAccessAsync
        (
            long userId
        )
    {
        if (userId <= 0)
        {
            return new ConfigurationAccess();
        }

        List<EffectiveAccessDto> rows =
            await _effectiveAccess.GetEffectiveAccessAsync(
                userId);

        if (rows.Count == 0)
        {
            return new ConfigurationAccess();
        }

        var activities =
            await _context
                .Set<MasterActivityEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.IsActive
                        &&
                        (x.Code == ManageActivityCode || x.Code == ChangeActivityCode)
                )
                .Select(x => new { x.Id, x.Code })
                .ToListAsync();

        long? manageId =
            activities.FirstOrDefault(x => x.Code == ManageActivityCode)?.Id;

        long? changeId =
            activities.FirstOrDefault(x => x.Code == ChangeActivityCode)?.Id;

        long? configurationPageId =
            await _context
                .Set<NavigationSubmenuEntity>()
                .AsNoTracking()
                .Where
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.Code == ConfigurationPageCode
                )
                .Select(x => (long?)x.Id)
                .FirstOrDefaultAsync();

        bool canManage =
            manageId.HasValue
            &&
            configurationPageId.HasValue
            &&
            rows.Any
            (
                x =>
                    x.MasterActivityId == manageId.Value
                    &&
                    x.SubMenuId == configurationPageId.Value
            );

        HashSet<string> changeCodes =
            new(StringComparer.OrdinalIgnoreCase);

        if (changeId.HasValue)
        {
            List<long> submenuIds =
                rows
                    .Where(x => x.MasterActivityId == changeId.Value)
                    .Select(x => x.SubMenuId)
                    .Distinct()
                    .ToList();

            if (submenuIds.Count > 0)
            {
                List<string> codes =
                    await _context
                        .Set<NavigationSubmenuEntity>()
                        .AsNoTracking()
                        .Where
                        (
                            x =>
                                !x.IsDeleted
                                &&
                                submenuIds.Contains(x.Id)
                        )
                        .Select(x => x.Code)
                        .ToListAsync();

                foreach (string code in codes)
                {
                    if (!string.IsNullOrWhiteSpace(code))
                    {
                        changeCodes.Add(code);
                    }
                }
            }
        }

        return new ConfigurationAccess
        {
            CanManage =
                canManage,

            ChangeSubmenuCodes =
                changeCodes
        };
    }


    //===========================================================
    // Ensure Admin
    //===========================================================

    private async Task<ConfigurationAccess>
        EnsureCanManageAsync
        (
            long userId
        )
    {
        ConfigurationAccess access =
            await GetAccessAsync(userId);

        if (!access.CanManage)
        {
            throw new UnauthorizedAccessException(
                "Only users with 'Manage Configurations' on the System Configurations page can do this.");
        }

        return access;
    }


    //===========================================================
    // TEXT HELPERS
    //===========================================================

    private static string FormatState
    (
        bool isEnabled,
        string? value,
        SystemConfigurationsEntity entity
    )
    {
        string state =
            isEnabled ? "ON" : "OFF";

        if (entity.ValueType == ValueNone)
        {
            return state;
        }

        string clean =
            (value ?? string.Empty).Trim();

        if (clean.Length == 0)
        {
            return string.IsNullOrWhiteSpace(entity.ValueEmptyText)
                ? state
                : $"{state} · {entity.ValueEmptyText}";
        }

        return string.IsNullOrWhiteSpace(entity.ValueUnit)
            ? $"{state} · {clean}"
            : $"{state} · {clean} {entity.ValueUnit}";
    }

    private static string CleanName
    (
        string? userName
    )
    {
        string clean =
            (userName ?? string.Empty).Trim();

        return clean.Length == 0
            ? "System"
            : clean.Length > 150
                ? clean.Substring(0, 150)
                : clean;
    }

    private static string NormalizeReason
    (
        string? reason
    )
    {
        string clean =
            (reason ?? string.Empty).Trim();

        if (clean.Length > ReasonMaxLength)
        {
            throw new InvalidOperationException(
                $"Reason cannot be longer than {ReasonMaxLength} characters.");
        }

        return clean;
    }


    //===========================================================
    // Validate a Value against the switch's value definition
    //
    // An unchanged value is accepted as it is (older rows).
    //===========================================================

    private static string NormalizeSwitchValue
    (
        SystemConfigurationsEntity entity,
        string? value
    )
    {
        string current =
            entity.Value ?? string.Empty;

        if (entity.ValueType == ValueNone)
        {
            // Plain ON / OFF switch : the value never changes here
            return current;
        }

        string clean =
            (value ?? string.Empty).Trim();

        if (clean == current)
        {
            return current;
        }

        if (entity.ValueType == ValueText)
        {
            if (clean.Length > ValueMaxLength)
            {
                throw new InvalidOperationException(
                    $"'{entity.ConfigurationName}' : the value cannot be longer than {ValueMaxLength} characters.");
            }

            return clean;
        }

        // Number
        if (clean.Length == 0)
        {
            if (string.IsNullOrWhiteSpace(entity.ValueEmptyText))
            {
                throw new InvalidOperationException(
                    $"'{entity.ConfigurationName}' needs a number.");
            }

            return string.Empty;
        }

        if (!int.TryParse(clean, NumberStyles.Integer, CultureInfo.InvariantCulture, out int number))
        {
            throw new InvalidOperationException(
                $"'{entity.ConfigurationName}' needs a whole number.");
        }

        if (entity.ValueMin.HasValue && number < entity.ValueMin.Value)
        {
            throw new InvalidOperationException(
                $"'{entity.ConfigurationName}' cannot be less than {entity.ValueMin.Value}.");
        }

        if (entity.ValueMax.HasValue && number > entity.ValueMax.Value)
        {
            throw new InvalidOperationException(
                $"'{entity.ConfigurationName}' cannot be more than {entity.ValueMax.Value}.");
        }

        return number.ToString(CultureInfo.InvariantCulture);
    }


    //===========================================================
    // Add Activity History
    //
    // The database uses the WIN1252 character set, so history
    // text is kept to characters it can store ("->", not an
    // arrow symbol).
    //===========================================================

    private void AddHistory
    (
        SystemConfigurationsEntity entity,
        string activityType,
        string title,
        string description,
        long userId,
        string userName,
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
                    entity.SystemConfigurationId,

                ActivityType =
                    activityType,

                ActivityTitle =
                    title.Length > HistoryTitleMaxLength
                        ? title.Substring(0, HistoryTitleMaxLength)
                        : title,

                ActivityDescription =
                    description.Length > HistoryDescriptionMaxLength
                        ? description.Substring(0, HistoryDescriptionMaxLength)
                        : description,

                PerformedBy =
                    userId,

                PerformedByName =
                    CleanName(userName),

                PerformedDate =
                    performedDate
            });
    }


    //===========================================================
    // Code -> Name of menus / submenus (live rows)
    //===========================================================

    private static Dictionary<string, string> ToNameMap
    (
        IEnumerable<(string Code, string Name)> rows
    )
    {
        return rows
            .Where(x => !string.IsNullOrWhiteSpace(x.Code))
            .GroupBy(x => x.Code, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().Name ?? string.Empty, StringComparer.OrdinalIgnoreCase);
    }

    private async Task<Dictionary<string, string>> LoadMenuNamesAsync()
    {
        var rows =
            await _context
                .Set<NavigationMenuEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => new { x.Code, x.Name })
                .ToListAsync();

        return ToNameMap(rows.Select(x => (x.Code, x.Name)));
    }

    private async Task<Dictionary<string, string>> LoadSubmenuNamesAsync()
    {
        var rows =
            await _context
                .Set<NavigationSubmenuEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => new { x.Code, x.Name })
                .ToListAsync();

        return ToNameMap(rows.Select(x => (x.Code, x.Name)));
    }


    //===========================================================
    // READ
    //===========================================================

    //===========================================================
    // Runtime Values (every logged-in user)
    //===========================================================

    public async Task<List<SystemConfigurationValueDto>>
        GetValuesAsync()
    {
        return await _context
            .Set<SystemConfigurationsEntity>()
            .AsNoTracking()
            .Where(x => !x.IsDeleted)
            .OrderBy(x => x.ConfigurationCode)
            .Select
            (
                x =>
                    new SystemConfigurationValueDto
                    {
                        ConfigurationCode =
                            x.ConfigurationCode,

                        IsEnabled =
                            x.IsEnabled,

                        Value =
                            x.Value
                    }
            )
            .ToListAsync();
    }


    //===========================================================
    // Build the switch list for one user
    //===========================================================

    private async Task<List<SystemConfigurationsDto>>
        BuildSwitchesAsync
        (
            ConfigurationAccess access,
            long? onlyId
        )
    {
        if (!access.HasAny)
        {
            return new List<SystemConfigurationsDto>();
        }

        var rows =
            await
            (
                from x in _context.Set<SystemConfigurationsEntity>().AsNoTracking()

                join m in _context.Set<NavigationModuleEntity>().AsNoTracking()
                    on x.NavigationModuleId equals m.Id

                where !x.IsDeleted
                      &&
                      (onlyId == null || x.SystemConfigurationId == onlyId)

                select new { Entity = x, Module = m }
            )
            .ToListAsync();

        List<SystemConfigurationsEntity> visible =
            rows
                .Select(x => x.Entity)
                .Where(access.CanChange)
                .ToList();

        if (visible.Count == 0)
        {
            return new List<SystemConfigurationsDto>();
        }

        Dictionary<string, string> menuNames =
            await LoadMenuNamesAsync();

        Dictionary<string, string> submenuNames =
            await LoadSubmenuNamesAsync();

        Dictionary<string, SystemConfigurationRequestsEntity> pending =
            (
                await _context
                    .Set<SystemConfigurationRequestsEntity>()
                    .AsNoTracking()
                    .Where(x => x.Status == StatusPending)
                    .ToListAsync()
            )
            .GroupBy(x => x.ConfigurationCode)
            .ToDictionary(g => g.Key, g => g.First());

        Dictionary<long, NavigationModuleEntity> modules =
            rows
                .GroupBy(x => x.Module.Id)
                .ToDictionary(g => g.Key, g => g.First().Module);

        return visible
            .Select
            (
                x =>
                {
                    NavigationModuleEntity module =
                        modules[x.NavigationModuleId];

                    pending.TryGetValue(
                        x.ConfigurationCode,
                        out SystemConfigurationRequestsEntity? request);

                    return new SystemConfigurationsDto
                    {
                        SystemConfigurationId = x.SystemConfigurationId,
                        NavigationModuleId = x.NavigationModuleId,
                        ModuleCode = module.Code ?? string.Empty,
                        ModuleName = module.Name ?? string.Empty,
                        ModuleIcon = module.Icon ?? string.Empty,

                        ScopeType = x.ScopeType,
                        NavigationMenuCode = x.NavigationMenuCode ?? string.Empty,
                        MenuName =
                            x.NavigationMenuCode != null && menuNames.TryGetValue(x.NavigationMenuCode, out string? menuName)
                                ? menuName
                                : string.Empty,
                        NavigationSubmenuCode = x.NavigationSubmenuCode ?? string.Empty,
                        SubmenuName =
                            x.NavigationSubmenuCode != null && submenuNames.TryGetValue(x.NavigationSubmenuCode, out string? submenuName)
                                ? submenuName
                                : string.Empty,

                        ConfigurationCode = x.ConfigurationCode,
                        ConfigurationName = x.ConfigurationName,
                        OnDescription = x.OnDescription,
                        OffDescription = x.OffDescription,
                        IsEnabled = x.IsEnabled,
                        Value = x.Value ?? string.Empty,
                        ValueType = x.ValueType,
                        ValueUnit = x.ValueUnit,
                        ValueMin = x.ValueMin,
                        ValueMax = x.ValueMax,
                        ValueEmptyText = x.ValueEmptyText,
                        DefaultEnabled = x.DefaultEnabled,
                        DefaultValue = x.DefaultValue,
                        ParentConfigurationCode = x.ParentConfigurationCode ?? string.Empty,
                        IsCritical = x.IsCritical,
                        IsSystemDefined = x.IsSystemDefined,
                        DisplayOrder = x.DisplayOrder,
                        Remarks = x.Remarks ?? string.Empty,

                        CanChange = true,
                        IsPending = request != null,
                        PendingEnabled = request?.ToEnabled ?? false,
                        PendingValue = request?.ToValue ?? string.Empty,
                        PendingByName = request?.RequestedByName ?? string.Empty,

                        IsDeleted = x.IsDeleted,
                        DeletedBy = x.DeletedBy,
                        DeletedDate = x.DeletedDate,
                        CreatedBy = x.CreatedBy,
                        CreatedDate = x.CreatedDate,
                        ModifiedBy = x.ModifiedBy,
                        ModifiedDate = x.ModifiedDate
                    };
                }
            )
            .OrderBy(x => x.ModuleName)
            .ThenBy(x => x.ScopeType == ScopeModule ? 0 : x.ScopeType == ScopeMenu ? 1 : 2)
            .ThenBy(x => x.NavigationSubmenuCode)
            .ThenBy(x => x.DisplayOrder)
            .ThenBy(x => x.ConfigurationCode)
            .ToList();
    }


    //===========================================================
    // Workspace (the whole page for this user)
    //===========================================================

    public async Task<SystemConfigurationWorkspaceDto>
        GetWorkspaceAsync
        (
            long userId
        )
    {
        ConfigurationAccess access =
            await GetAccessAsync(userId);

        SystemConfigurationWorkspaceDto workspace =
            new SystemConfigurationWorkspaceDto
            {
                CanManage =
                    access.CanManage
            };

        //=======================================================
        // Modules : every active module (left panel)
        //=======================================================

        workspace.Modules =
            await _context
                .Set<NavigationModuleEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.Code)
                .Select
                (
                    x =>
                        new ConfigurationModuleDto
                        {
                            NavigationModuleId = x.Id,
                            Code = x.Code,
                            Name = x.Name,
                            Icon = x.Icon,
                            DisplayOrder = x.DisplayOrder
                        }
                )
                .ToListAsync();

        if (!access.HasAny)
        {
            return workspace;
        }

        //=======================================================
        // Menus / Submenus (names; admin gets all for the form)
        //=======================================================

        workspace.Menus =
            await _context
                .Set<NavigationMenuEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted && x.IsActive)
                .OrderBy(x => x.DisplayOrder)
                .ThenBy(x => x.Code)
                .Select
                (
                    x =>
                        new ConfigurationMenuDto
                        {
                            NavigationModuleId = x.NavigationModuleId,
                            Code = x.Code,
                            Name = x.Name,
                            DisplayOrder = x.DisplayOrder
                        }
                )
                .ToListAsync();

        List<ConfigurationSubmenuDto> submenus =
            await
            (
                from s in _context.Set<NavigationSubmenuEntity>().AsNoTracking()

                join me in _context.Set<NavigationMenuEntity>().AsNoTracking()
                    on s.NavigationMenuId equals me.Id

                where !s.IsDeleted && s.IsActive && !me.IsDeleted

                orderby me.DisplayOrder, s.DisplayOrder, s.Code

                select new ConfigurationSubmenuDto
                {
                    NavigationModuleId = me.NavigationModuleId,
                    MenuCode = me.Code,
                    Code = s.Code,
                    Name = s.Name,
                    DisplayOrder = s.DisplayOrder
                }
            )
            .ToListAsync();

        workspace.Submenus =
            access.CanManage
                ? submenus
                : submenus
                    .Where(x => access.ChangeSubmenuCodes.Contains(x.Code))
                    .ToList();

        //=======================================================
        // Switches
        //=======================================================

        workspace.Switches =
            await BuildSwitchesAsync(
                access,
                null);

        //=======================================================
        // Pending count : all (admin) / this user's own
        //=======================================================

        workspace.PendingCount =
            access.CanManage
                ? await _context
                    .Set<SystemConfigurationRequestsEntity>()
                    .CountAsync(x => x.Status == StatusPending)
                : await _context
                    .Set<SystemConfigurationRequestsEntity>()
                    .CountAsync(x => x.Status == StatusPending && x.RequestedBy == userId);

        //=======================================================
        // Recent changes of the switches this user can see
        //=======================================================

        Dictionary<long, SystemConfigurationsDto> visibleById =
            workspace.Switches.ToDictionary(x => x.SystemConfigurationId);

        string[] changeTypes =
            { "Change", "Approve", "Update", "Request", "Reject" };

        List<ActivityHistory> history =
            await _context
                .ActivityHistories
                .AsNoTracking()
                .Where
                (
                    x =>
                        x.Module == ModuleName
                        &&
                        x.EntityName == EntityName
                        &&
                        changeTypes.Contains(x.ActivityType)
                )
                .OrderByDescending(x => x.PerformedDate)
                .Take(200)
                .ToListAsync();

        workspace.Recent =
            history
                .Where(x => visibleById.ContainsKey(x.EntityId))
                .Take(RecentCount)
                .Select
                (
                    x =>
                        new ConfigurationRecentChangeDto
                        {
                            ConfigurationCode = visibleById[x.EntityId].ConfigurationCode,
                            ConfigurationName = visibleById[x.EntityId].ConfigurationName,
                            Description = x.ActivityTitle,
                            PerformedByName = x.PerformedByName,
                            PerformedDate = x.PerformedDate
                        }
                )
                .ToList();

        return workspace;
    }


    //===========================================================
    // Switch ids this user may see (null = all, for admins)
    //===========================================================

    public async Task<HashSet<long>?>
        GetVisibleIdsAsync
        (
            long userId
        )
    {
        ConfigurationAccess access =
            await GetAccessAsync(userId);

        if (access.CanManage)
        {
            return null;
        }

        if (!access.HasAny)
        {
            return new HashSet<long>();
        }

        List<SystemConfigurationsEntity> rows =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => x.ScopeType == ScopeSubmenu && x.NavigationSubmenuCode != null)
                .ToListAsync();

        return rows
            .Where(access.CanChange)
            .Select(x => x.SystemConfigurationId)
            .ToHashSet();
    }


    //===========================================================
    // Get All (switches this user may see)
    //===========================================================

    public async Task<List<SystemConfigurationsDto>>
        GetAllAsync
        (
            long userId
        )
    {
        return await BuildSwitchesAsync(
            await GetAccessAsync(userId),
            null);
    }


    //===========================================================
    // Get By Id (only when this user may see it)
    //===========================================================

    public async Task<SystemConfigurationsDto?>
        GetByIdAsync
        (
            long id,
            long userId
        )
    {
        List<SystemConfigurationsDto> list =
            await BuildSwitchesAsync(
                await GetAccessAsync(userId),
                id);

        return list.FirstOrDefault();
    }


    //===========================================================
    // CHANGES (Review & Apply)
    //===========================================================

    private sealed class PlannedChange
    {
        public SystemConfigurationsEntity Entity { get; init; } = null!;

        public bool NewEnabled { get; init; }

        public string NewValue { get; init; } = string.Empty;

        public string Reason { get; init; } = string.Empty;

        public bool AsRequest { get; init; }
    }


    //===========================================================
    // Parent rule : a child switch can be changed only while its
    // parent is ON (turning the child OFF is always allowed).
    //===========================================================

    private async Task EnsureParentAllowsAsync
    (
        SystemConfigurationsEntity entity,
        bool newEnabled,
        IReadOnlyDictionary<string, bool> finalStates
    )
    {
        if (string.IsNullOrWhiteSpace(entity.ParentConfigurationCode) || !newEnabled)
        {
            return;
        }

        string parentCode =
            entity.ParentConfigurationCode;

        bool parentOn;

        string parentName =
            parentCode;

        if (finalStates.TryGetValue(parentCode, out bool finalOn))
        {
            parentOn = finalOn;
        }
        else
        {
            var parent =
                await _context
                    .Set<SystemConfigurationsEntity>()
                    .AsNoTracking()
                    .Where(x => x.ConfigurationCode == parentCode && !x.IsDeleted)
                    .Select(x => new { x.IsEnabled, x.ConfigurationName })
                    .FirstOrDefaultAsync();

            // A missing parent never blocks
            parentOn = parent == null || parent.IsEnabled;

            if (parent != null)
            {
                parentName = parent.ConfigurationName;
            }
        }

        if (!parentOn)
        {
            throw new InvalidOperationException(
                $"'{entity.ConfigurationName}' works only while '{parentName}' is ON. Turn that on first.");
        }
    }


    //===========================================================
    // Apply
    //===========================================================

    public async Task<ApplySystemConfigurationResultDto>
        ApplyAsync
        (
            ApplySystemConfigurationChangesDto dto,
            long userId,
            string userName
        )
    {
        ConfigurationAccess access =
            await GetAccessAsync(userId);

        if (!access.HasAny)
        {
            throw new UnauthorizedAccessException(
                "You do not have permission to change configurations.");
        }

        List<SystemConfigurationChangeDto> changes =
            (dto?.Changes ?? new List<SystemConfigurationChangeDto>())
                .Where(x => !string.IsNullOrWhiteSpace(x.ConfigurationCode))
                .ToList();

        ApplySystemConfigurationResultDto result =
            new ApplySystemConfigurationResultDto();

        if (changes.Count == 0)
        {
            return result;
        }

        List<string> codes =
            changes
                .Select(x => x.ConfigurationCode.Trim())
                .ToList();

        if (codes.Distinct(StringComparer.OrdinalIgnoreCase).Count() != codes.Count)
        {
            throw new InvalidOperationException(
                "The same switch appears twice in one apply.");
        }

        Dictionary<string, SystemConfigurationsEntity> entities =
            await _context
                .Set<SystemConfigurationsEntity>()
                .Where(x => codes.Contains(x.ConfigurationCode) && !x.IsDeleted)
                .ToDictionaryAsync(x => x.ConfigurationCode, StringComparer.OrdinalIgnoreCase);

        HashSet<string> pendingCodes =
            (
                await _context
                    .Set<SystemConfigurationRequestsEntity>()
                    .AsNoTracking()
                    .Where(x => x.Status == StatusPending && codes.Contains(x.ConfigurationCode))
                    .Select(x => x.ConfigurationCode)
                    .ToListAsync()
            )
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        //=======================================================
        // 1. Check everything first (nothing saved on an error)
        //=======================================================

        List<PlannedChange> plan =
            new List<PlannedChange>();

        foreach (SystemConfigurationChangeDto change in changes)
        {
            string code =
                change.ConfigurationCode.Trim();

            if (!entities.TryGetValue(code, out SystemConfigurationsEntity? entity))
            {
                throw new KeyNotFoundException(
                    $"Configuration '{code}' was not found.");
            }

            if (!access.CanChange(entity))
            {
                throw new UnauthorizedAccessException(
                    $"You do not have permission to change '{entity.ConfigurationName}'.");
            }

            string newValue =
                NormalizeSwitchValue(
                    entity,
                    change.Value);

            if (entity.IsEnabled == change.IsEnabled && (entity.Value ?? string.Empty) == newValue)
            {
                result.Unchanged++;

                continue;
            }

            if (pendingCodes.Contains(code))
            {
                throw new InvalidOperationException(
                    $"'{entity.ConfigurationName}' has a change waiting for approval. Approve or reject it first.");
            }

            string reason =
                NormalizeReason(change.Reason);

            if (entity.IsCritical && reason.Length == 0)
            {
                throw new InvalidOperationException(
                    $"Give a reason for changing '{entity.ConfigurationName}'.");
            }

            plan.Add(
                new PlannedChange
                {
                    Entity = entity,
                    NewEnabled = change.IsEnabled,
                    NewValue = newValue,
                    Reason = reason,
                    AsRequest = entity.IsCritical && !access.CanManage
                });
        }

        if (plan.Count == 0)
        {
            return result;
        }

        // ON / OFF after this apply (requests do not change it)
        Dictionary<string, bool> finalStates =
            plan
                .Where(x => !x.AsRequest)
                .ToDictionary
                (
                    x => x.Entity.ConfigurationCode,
                    x => x.NewEnabled,
                    StringComparer.OrdinalIgnoreCase
                );

        foreach (PlannedChange item in plan)
        {
            await EnsureParentAllowsAsync(
                item.Entity,
                item.NewEnabled,
                finalStates);
        }

        //=======================================================
        // 2. Save in one transaction
        //=======================================================

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            DateTime now =
                DateTime.UtcNow;

            string name =
                CleanName(userName);

            foreach (PlannedChange item in plan)
            {
                SystemConfigurationsEntity entity =
                    item.Entity;

                string fromText =
                    FormatState(entity.IsEnabled, entity.Value, entity);

                string toText =
                    FormatState(item.NewEnabled, item.NewValue, entity);

                string reasonText =
                    item.Reason.Length == 0 ? string.Empty : $" Reason: {item.Reason}";

                if (item.AsRequest)
                {
                    _context
                        .Set<SystemConfigurationRequestsEntity>()
                        .Add(
                            new SystemConfigurationRequestsEntity
                            {
                                SystemConfigurationId = entity.SystemConfigurationId,
                                ConfigurationCode = entity.ConfigurationCode,
                                FromEnabled = entity.IsEnabled,
                                FromValue = entity.Value ?? string.Empty,
                                ToEnabled = item.NewEnabled,
                                ToValue = item.NewValue,
                                Reason = item.Reason,
                                Status = StatusPending,
                                RequestedBy = userId,
                                RequestedByName = name,
                                RequestedDate = now
                            });

                    AddHistory(
                        entity,
                        "Request",
                        $"Change requested : {fromText} -> {toText}",
                        $"Configuration '{entity.ConfigurationName}' ({entity.ConfigurationCode}) : {fromText} -> {toText} requested; waiting for approval.{reasonText}",
                        userId,
                        name,
                        now);

                    result.SentForApproval++;

                    continue;
                }

                entity.IsEnabled =
                    item.NewEnabled;

                entity.Value =
                    item.NewValue;

                entity.ModifiedBy =
                    userId;

                entity.ModifiedDate =
                    now;

                AddHistory(
                    entity,
                    "Change",
                    $"{fromText} -> {toText}",
                    $"Configuration '{entity.ConfigurationName}' ({entity.ConfigurationCode}) : {fromText} -> {toText}.{reasonText}",
                    userId,
                    name,
                    now);

                result.Applied++;
            }

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            return result;
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is Npgsql.PostgresException { SqlState: "23505" })
        {
            await transaction.RollbackAsync();

            throw new InvalidOperationException(
                "Another change to one of these switches was saved at the same time. Refresh and try again.");
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // Set Enabled (one switch; same rules as Apply)
    //===========================================================

    public async Task
        SetEnabledAsync
        (
            long id,
            bool isEnabled,
            string reason,
            long userId,
            string userName
        )
    {
        var entity =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => x.SystemConfigurationId == id && !x.IsDeleted)
                .Select(x => new { x.ConfigurationCode, x.Value })
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Configuration not found.");
        }

        await ApplyAsync(
            new ApplySystemConfigurationChangesDto
            {
                Changes =
                    new List<SystemConfigurationChangeDto>
                    {
                        new SystemConfigurationChangeDto
                        {
                            ConfigurationCode = entity.ConfigurationCode,
                            IsEnabled = isEnabled,
                            Value = entity.Value ?? string.Empty,
                            Reason = reason ?? string.Empty
                        }
                    }
            },
            userId,
            userName);
    }


    //===========================================================
    // APPROVALS (admin)
    //===========================================================

    public async Task<List<SystemConfigurationRequestDto>>
        GetRequestsAsync
        (
            long userId
        )
    {
        await EnsureCanManageAsync(userId);

        var rows =
            await
            (
                from r in _context.Set<SystemConfigurationRequestsEntity>().AsNoTracking()

                join x in _context.Set<SystemConfigurationsEntity>().AsNoTracking()
                    on r.SystemConfigurationId equals x.SystemConfigurationId

                join m in _context.Set<NavigationModuleEntity>().AsNoTracking()
                    on x.NavigationModuleId equals m.Id

                where r.Status == StatusPending

                orderby r.RequestedDate

                select new { Request = r, Switch = x, ModuleName = m.Name }
            )
            .ToListAsync();

        Dictionary<string, string> submenuNames =
            await LoadSubmenuNamesAsync();

        return rows
            .Select
            (
                x =>
                    new SystemConfigurationRequestDto
                    {
                        SystemConfigurationRequestId = x.Request.SystemConfigurationRequestId,
                        ConfigurationCode = x.Request.ConfigurationCode,
                        ConfigurationName = x.Switch.ConfigurationName,
                        ModuleName = x.ModuleName ?? string.Empty,
                        SubmenuName =
                            x.Switch.NavigationSubmenuCode != null && submenuNames.TryGetValue(x.Switch.NavigationSubmenuCode, out string? page)
                                ? page
                                : string.Empty,
                        ValueUnit = x.Switch.ValueUnit,
                        ValueEmptyText = x.Switch.ValueEmptyText,
                        FromEnabled = x.Request.FromEnabled,
                        FromValue = x.Request.FromValue,
                        ToEnabled = x.Request.ToEnabled,
                        ToValue = x.Request.ToValue,
                        Reason = x.Request.Reason,
                        Status = x.Request.Status,
                        IsStale =
                            x.Switch.IsDeleted
                            ||
                            x.Switch.IsEnabled != x.Request.FromEnabled
                            ||
                            (x.Switch.Value ?? string.Empty) != x.Request.FromValue,
                        RequestedBy = x.Request.RequestedBy,
                        RequestedByName = x.Request.RequestedByName,
                        RequestedDate = x.Request.RequestedDate
                    }
            )
            .ToList();
    }


    //===========================================================
    // Load a Pending request (tracked)
    //===========================================================

    private async Task<SystemConfigurationRequestsEntity>
        LoadPendingRequestAsync
        (
            long requestId
        )
    {
        SystemConfigurationRequestsEntity? request =
            await _context
                .Set<SystemConfigurationRequestsEntity>()
                .FirstOrDefaultAsync(x => x.SystemConfigurationRequestId == requestId);

        if (request == null)
        {
            throw new KeyNotFoundException(
                "Request not found.");
        }

        if (request.Status != StatusPending)
        {
            throw new InvalidOperationException(
                $"This request is already {request.Status.ToLowerInvariant()}.");
        }

        return request;
    }


    //===========================================================
    // Approve
    //
    // Refused (and closed) when the switch changed since the
    // request (Stale) or the requester lost the permission
    // (Cancelled). Nobody approves their own request.
    //===========================================================

    public async Task
        ApproveRequestAsync
        (
            long requestId,
            string note,
            long userId,
            string userName
        )
    {
        await EnsureCanManageAsync(userId);

        string cleanNote =
            NormalizeReason(note);

        SystemConfigurationRequestsEntity request =
            await LoadPendingRequestAsync(requestId);

        if (request.RequestedBy == userId)
        {
            throw new InvalidOperationException(
                "You cannot approve your own request.");
        }

        SystemConfigurationsEntity? entity =
            await _context
                .Set<SystemConfigurationsEntity>()
                .FirstOrDefaultAsync(x => x.SystemConfigurationId == request.SystemConfigurationId);

        DateTime now =
            DateTime.UtcNow;

        string name =
            CleanName(userName);

        //=======================================================
        // Stale : the switch changed since the request
        //=======================================================

        if
        (
            entity == null
            ||
            entity.IsDeleted
            ||
            entity.IsEnabled != request.FromEnabled
            ||
            (entity.Value ?? string.Empty) != request.FromValue
        )
        {
            request.Status = StatusStale;
            request.DecidedBy = userId;
            request.DecidedByName = name;
            request.DecidedDate = now;
            request.DecisionNote = "The switch changed after the request was made.";

            await _context.SaveChangesAsync();

            throw new InvalidOperationException(
                "This switch changed after the request was made, so the request was closed as stale. Ask for a new request if the change is still needed.");
        }

        //=======================================================
        // Requested value must still fit the switch's definition
        //=======================================================

        string approvedValue;

        try
        {
            approvedValue =
                NormalizeSwitchValue(
                    entity,
                    request.ToValue);
        }
        catch (InvalidOperationException ex)
        {
            request.Status = StatusStale;
            request.DecidedBy = userId;
            request.DecidedByName = name;
            request.DecidedDate = now;
            request.DecisionNote = "The switch's value rules changed after the request was made.";

            await _context.SaveChangesAsync();

            throw new InvalidOperationException(
                $"The requested value no longer fits this switch, so the request was closed as stale. {ex.Message}");
        }

        //=======================================================
        // Requester must still have the permission
        //=======================================================

        ConfigurationAccess requesterAccess =
            await GetAccessAsync(request.RequestedBy);

        if (!requesterAccess.CanChange(entity))
        {
            request.Status = StatusCancelled;
            request.DecidedBy = userId;
            request.DecidedByName = name;
            request.DecidedDate = now;
            request.DecisionNote = "The requester no longer has permission to change this switch.";

            await _context.SaveChangesAsync();

            throw new InvalidOperationException(
                "The requester no longer has permission to change this switch, so the request was cancelled.");
        }

        await EnsureParentAllowsAsync(
            entity,
            request.ToEnabled,
            new Dictionary<string, bool>());

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            string fromText =
                FormatState(entity.IsEnabled, entity.Value, entity);

            string toText =
                FormatState(request.ToEnabled, approvedValue, entity);

            entity.IsEnabled = request.ToEnabled;
            entity.Value = approvedValue;
            entity.ModifiedBy = userId;
            entity.ModifiedDate = now;

            request.Status = StatusApproved;
            request.DecidedBy = userId;
            request.DecidedByName = name;
            request.DecidedDate = now;
            request.DecisionNote = cleanNote.Length == 0 ? null : cleanNote;

            AddHistory(
                entity,
                "Approve",
                $"{fromText} -> {toText} (approved)",
                $"Configuration '{entity.ConfigurationName}' ({entity.ConfigurationCode}) : {fromText} -> {toText}. Requested by {request.RequestedByName}, approved by {name}. Reason: {request.Reason}" +
                (cleanNote.Length == 0 ? string.Empty : $" Note: {cleanNote}"),
                userId,
                name,
                now);

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync();

            throw new InvalidOperationException(
                "This request was decided by someone else just now. Refresh to see it.");
        }
        catch
        {
            await transaction.RollbackAsync();

            throw;
        }
    }


    //===========================================================
    // Reject
    //===========================================================

    public async Task
        RejectRequestAsync
        (
            long requestId,
            string note,
            long userId,
            string userName
        )
    {
        await EnsureCanManageAsync(userId);

        string cleanNote =
            NormalizeReason(note);

        SystemConfigurationRequestsEntity request =
            await LoadPendingRequestAsync(requestId);

        SystemConfigurationsEntity? entity =
            await _context
                .Set<SystemConfigurationsEntity>()
                .FirstOrDefaultAsync(x => x.SystemConfigurationId == request.SystemConfigurationId);

        DateTime now =
            DateTime.UtcNow;

        string name =
            CleanName(userName);

        request.Status = StatusRejected;
        request.DecidedBy = userId;
        request.DecidedByName = name;
        request.DecidedDate = now;
        request.DecisionNote = cleanNote.Length == 0 ? null : cleanNote;

        if (entity != null)
        {
            AddHistory(
                entity,
                "Reject",
                "Change request rejected",
                $"Configuration '{entity.ConfigurationName}' ({entity.ConfigurationCode}) : request by {request.RequestedByName} rejected by {name}." +
                (cleanNote.Length == 0 ? string.Empty : $" Note: {cleanNote}"),
                userId,
                name,
                now);
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new InvalidOperationException(
                "This request was decided by someone else just now. Refresh to see it.");
        }
    }


    //===========================================================
    // DEFINITIONS (admin)
    //===========================================================

    //===========================================================
    // Resolve Module
    //
    // requireActive : new settings need an active module.
    //===========================================================

    private async Task<NavigationModuleEntity>
        ResolveModuleAsync
        (
            long navigationModuleId,
            bool requireActive
        )
    {
        if (navigationModuleId <= 0)
        {
            throw new InvalidOperationException(
                "Module is required.");
        }

        NavigationModuleEntity? module =
            await _context
                .Set<NavigationModuleEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id == navigationModuleId
                        &&
                        !x.IsDeleted
                );

        if (module == null)
        {
            throw new InvalidOperationException(
                "The selected module was not found in Navigation Management.");
        }

        if (requireActive && !module.IsActive)
        {
            throw new InvalidOperationException(
                $"Module '{module.Name}' is inactive. Activate it in Navigation Management first.");
        }

        return module;
    }


    //===========================================================
    // Code Prefix For Module : "CFG-<ModuleCode>-"
    //===========================================================

    private static string CodePrefixFor
    (
        NavigationModuleEntity module
    )
    {
        string moduleCode =
            (module.Code ?? string.Empty).Trim().ToUpperInvariant();

        if (string.IsNullOrWhiteSpace(moduleCode))
        {
            moduleCode =
                $"M{module.Id}";
        }

        return $"{CodePrefix}-{moduleCode}-";
    }


    //===========================================================
    // Get Next Code
    //
    // Deleted rows are included, because the unique index on
    // ConfigurationCode covers them too. A code is never reused.
    //===========================================================

    public async Task<string>
        GetNextCodeAsync
        (
            long navigationModuleId
        )
    {
        NavigationModuleEntity module =
            await ResolveModuleAsync(
                navigationModuleId,
                requireActive: false);

        return await BuildNextCodeAsync(
            module);
    }

    private async Task<string>
        BuildNextCodeAsync
        (
            NavigationModuleEntity module
        )
    {
        string prefix =
            CodePrefixFor(module);

        List<string> existingCodes =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .Where(x => x.ConfigurationCode.StartsWith(prefix))
                .Select(x => x.ConfigurationCode)
                .ToListAsync();

        int highest = 0;

        foreach (string code in existingCodes)
        {
            string tail =
                code.Substring(prefix.Length);

            if (int.TryParse(tail, out int sequenceNo) && sequenceNo > highest)
            {
                highest = sequenceNo;
            }
        }

        string next =
            $"{prefix}{(highest + 1).ToString().PadLeft(CodeDigits, '0')}";

        if (next.Length > CodeMaxLength)
        {
            throw new InvalidOperationException(
                "The generated configuration code is too long. Shorten the module code.");
        }

        return next;
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    public async Task<SystemConfigurationsDefaultsDto>
        GetDefaultsAsync
        (
            long navigationModuleId
        )
    {
        NavigationModuleEntity module =
            await ResolveModuleAsync(
                navigationModuleId,
                requireActive: false);

        return new SystemConfigurationsDefaultsDto
        {
            NavigationModuleId =
                module.Id,

            ModuleName =
                module.Name,

            Code =
                await BuildNextCodeAsync(module),

            IsEnabled =
                true
        };
    }


    //===========================================================
    // Normalized definition (from the admin form)
    //===========================================================

    private sealed class Definition
    {
        public string Name { get; init; } = string.Empty;

        public string ScopeType { get; init; } = ScopeModule;

        public string? MenuCode { get; init; }

        public string? SubmenuCode { get; init; }

        public string OnDescription { get; init; } = string.Empty;

        public string OffDescription { get; init; } = string.Empty;

        public string ValueType { get; init; } = ValueNone;

        public string ValueUnit { get; init; } = string.Empty;

        public int? ValueMin { get; init; }

        public int? ValueMax { get; init; }

        public string ValueEmptyText { get; init; } = string.Empty;

        public string? ParentCode { get; init; }

        public string Remarks { get; init; } = string.Empty;

        public string ScopeKey =>
            SubmenuCode ?? MenuCode ?? string.Empty;
    }

    private static string Limit
    (
        string? text,
        int max,
        string label
    )
    {
        string clean =
            (text ?? string.Empty).Trim();

        if (clean.Length > max)
        {
            throw new InvalidOperationException(
                $"{label} cannot be longer than {max} characters.");
        }

        return clean;
    }

    private async Task<Definition>
        NormalizeDefinitionAsync
        (
            CreateSystemConfigurationsDto dto,
            NavigationModuleEntity module,
            string? ownCode
        )
    {
        //=======================================================
        // Name / texts
        //=======================================================

        string name =
            Limit(dto.ConfigurationName, NameMaxLength, "Configuration Name");

        if (name.Length == 0)
        {
            throw new InvalidOperationException(
                "Configuration Name is required.");
        }

        //=======================================================
        // Scope (by code, inside the module)
        //=======================================================

        string scope =
            (dto.ScopeType ?? string.Empty).Trim();

        scope =
            string.Equals(scope, ScopeSubmenu, StringComparison.OrdinalIgnoreCase) ? ScopeSubmenu
            : string.Equals(scope, ScopeMenu, StringComparison.OrdinalIgnoreCase) ? ScopeMenu
            : string.Equals(scope, ScopeModule, StringComparison.OrdinalIgnoreCase) ? ScopeModule
            : throw new InvalidOperationException("Scope must be Module, Menu or Submenu.");

        string? menuCode = null;

        string? submenuCode = null;

        if (scope == ScopeMenu)
        {
            string code =
                (dto.NavigationMenuCode ?? string.Empty).Trim();

            NavigationMenuEntity? menu =
                await _context
                    .Set<NavigationMenuEntity>()
                    .AsNoTracking()
                    .FirstOrDefaultAsync(x => x.Code == code && !x.IsDeleted);

            if (menu == null || menu.NavigationModuleId != module.Id)
            {
                throw new InvalidOperationException(
                    $"Choose a menu of {module.Name}.");
            }

            menuCode = menu.Code;
        }
        else if (scope == ScopeSubmenu)
        {
            string code =
                (dto.NavigationSubmenuCode ?? string.Empty).Trim();

            var page =
                await
                (
                    from s in _context.Set<NavigationSubmenuEntity>().AsNoTracking()

                    join me in _context.Set<NavigationMenuEntity>().AsNoTracking()
                        on s.NavigationMenuId equals me.Id

                    where s.Code == code && !s.IsDeleted && !me.IsDeleted

                    select new { SubmenuCode = s.Code, MenuCode = me.Code, me.NavigationModuleId }
                )
                .FirstOrDefaultAsync();

            if (page == null || page.NavigationModuleId != module.Id)
            {
                throw new InvalidOperationException(
                    $"Choose a page (submenu) of {module.Name}.");
            }

            submenuCode = page.SubmenuCode;

            menuCode = page.MenuCode;
        }

        //=======================================================
        // Value definition
        //=======================================================

        string valueType =
            (dto.ValueType ?? string.Empty).Trim();

        valueType =
            string.Equals(valueType, ValueNumber, StringComparison.OrdinalIgnoreCase) ? ValueNumber
            : string.Equals(valueType, ValueText, StringComparison.OrdinalIgnoreCase) ? ValueText
            : ValueNone;

        int? min = valueType == ValueNumber ? dto.ValueMin : null;

        int? max = valueType == ValueNumber ? dto.ValueMax : null;

        if (min.HasValue && max.HasValue && min.Value > max.Value)
        {
            throw new InvalidOperationException(
                "Value Min cannot be more than Value Max.");
        }

        //=======================================================
        // Parent : another live switch, never itself
        //=======================================================

        string? parentCode =
            string.IsNullOrWhiteSpace(dto.ParentConfigurationCode)
                ? null
                : dto.ParentConfigurationCode.Trim();

        if (parentCode != null)
        {
            if (ownCode != null && string.Equals(parentCode, ownCode, StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "A switch cannot be its own parent.");
            }

            bool parentExists =
                await _context
                    .Set<SystemConfigurationsEntity>()
                    .AnyAsync(x => x.ConfigurationCode == parentCode && !x.IsDeleted);

            if (!parentExists)
            {
                throw new InvalidOperationException(
                    $"Parent switch '{parentCode}' was not found.");
            }

            // No loops : walk up from the parent; this switch must
            // not appear in its chain
            if (ownCode != null)
            {
                Dictionary<string, string?> parents =
                    (
                        await _context
                            .Set<SystemConfigurationsEntity>()
                            .AsNoTracking()
                            .Where(x => !x.IsDeleted)
                            .Select(x => new { x.ConfigurationCode, x.ParentConfigurationCode })
                            .ToListAsync()
                    )
                    .GroupBy(x => x.ConfigurationCode, StringComparer.OrdinalIgnoreCase)
                    .ToDictionary(g => g.Key, g => g.First().ParentConfigurationCode, StringComparer.OrdinalIgnoreCase);

                string? current = parentCode;

                for (int step = 0; step < ParentChainLimit && !string.IsNullOrWhiteSpace(current); step++)
                {
                    if (string.Equals(current, ownCode, StringComparison.OrdinalIgnoreCase))
                    {
                        throw new InvalidOperationException(
                            "That parent would make a loop (this switch is already above it).");
                    }

                    current = parents.TryGetValue(current, out string? next) ? next : null;
                }
            }
        }

        return new Definition
        {
            Name = name,
            ScopeType = scope,
            MenuCode = menuCode,
            SubmenuCode = submenuCode,
            OnDescription = Limit(dto.OnDescription, DescriptionMaxLength, "ON text"),
            OffDescription = Limit(dto.OffDescription, DescriptionMaxLength, "OFF text"),
            ValueType = valueType,
            ValueUnit = valueType == ValueNone ? string.Empty : Limit(dto.ValueUnit, UnitMaxLength, "Unit"),
            ValueMin = min,
            ValueMax = max,
            ValueEmptyText = valueType == ValueNumber ? Limit(dto.ValueEmptyText, EmptyTextMaxLength, "Empty value text") : string.Empty,
            ParentCode = parentCode,
            Remarks = Limit(dto.Remarks, RemarksMaxLength, "Remarks")
        };
    }


    //===========================================================
    // Ensure Unique Name (module + page / menu, active rows)
    //===========================================================

    private async Task
        EnsureUniqueNameAsync
        (
            long navigationModuleId,
            string scopeKey,
            string name,
            long? excludeId
        )
    {
        string key =
            name.Trim().ToUpper();

        bool exists =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AsNoTracking()
                .AnyAsync
                (
                    x =>
                        !x.IsDeleted
                        &&
                        x.NavigationModuleId == navigationModuleId
                        &&
                        (x.NavigationSubmenuCode ?? x.NavigationMenuCode ?? "") == scopeKey
                        &&
                        (excludeId == null || x.SystemConfigurationId != excludeId)
                        &&
                        x.ConfigurationName.Trim().ToUpper() == key
                );

        if (exists)
        {
            throw new InvalidOperationException(
                $"'{name}' already exists on this page.");
        }
    }


    //===========================================================
    // Value check for a new definition (temporary entity)
    //===========================================================

    private static string CheckValueForDefinition
    (
        Definition definition,
        string? value,
        string label
    )
    {
        SystemConfigurationsEntity probe =
            new SystemConfigurationsEntity
            {
                ConfigurationName = $"{definition.Name} ({label})",
                ValueType = definition.ValueType,
                ValueMin = definition.ValueMin,
                ValueMax = definition.ValueMax,
                ValueEmptyText = definition.ValueEmptyText,
                Value = "\u0001"
            };

        return definition.ValueType == ValueNone
            ? string.Empty
            : NormalizeSwitchValue(probe, value);
    }


    //===========================================================
    // Create
    //===========================================================

    public async Task<long>
        CreateAsync
        (
            CreateSystemConfigurationsDto dto,
            long userId,
            string userName
        )
    {
        await EnsureCanManageAsync(userId);

        NavigationModuleEntity module =
            await ResolveModuleAsync(
                dto.NavigationModuleId,
                requireActive: true);

        Definition definition =
            await NormalizeDefinitionAsync(
                dto,
                module,
                null);

        string value =
            CheckValueForDefinition(definition, dto.Value, "value");

        string defaultValue =
            CheckValueForDefinition(definition, dto.DefaultValue, "default value");

        await EnsureUniqueNameAsync(
            module.Id,
            definition.ScopeKey,
            definition.Name,
            null);

        await using IDbContextTransaction transaction =
            await _context.Database.BeginTransactionAsync();

        try
        {
            DateTime now =
                DateTime.UtcNow;

            SystemConfigurationsEntity entity =
                new SystemConfigurationsEntity
                {
                    NavigationModuleId = module.Id,
                    ConfigurationCode = await BuildNextCodeAsync(module),
                    ConfigurationName = definition.Name,
                    ScopeType = definition.ScopeType,
                    NavigationMenuCode = definition.MenuCode,
                    NavigationSubmenuCode = definition.SubmenuCode,
                    OnDescription = definition.OnDescription,
                    OffDescription = definition.OffDescription,
                    IsEnabled = dto.IsEnabled,
                    Value = value,
                    ValueType = definition.ValueType,
                    ValueUnit = definition.ValueUnit,
                    ValueMin = definition.ValueMin,
                    ValueMax = definition.ValueMax,
                    ValueEmptyText = definition.ValueEmptyText,
                    DefaultEnabled = dto.DefaultEnabled,
                    DefaultValue = defaultValue,
                    ParentConfigurationCode = definition.ParentCode,
                    IsCritical = dto.IsCritical,
                    IsSystemDefined = false,
                    DisplayOrder = dto.DisplayOrder,
                    Remarks = definition.Remarks,
                    IsDeleted = false,
                    CreatedBy = userId,
                    CreatedDate = now
                };

            _context
                .Set<SystemConfigurationsEntity>()
                .Add(entity);

            await _context.SaveChangesAsync();

            AddHistory(
                entity,
                "Create",
                "Configuration Created",
                $"Configuration '{entity.ConfigurationName}' ({entity.ConfigurationCode}) created in {module.Name} as {FormatState(entity.IsEnabled, entity.Value, entity)}.",
                userId,
                userName,
                now);

            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            return entity.SystemConfigurationId;
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
    // Module and Code are locked after creation. When ON / OFF
    // or Value changes on a critical switch, Reason is required.
    // A Pending request for the switch blocks that change.
    //===========================================================

    public async Task
        UpdateAsync
        (
            UpdateSystemConfigurationsDto dto,
            long userId,
            string userName
        )
    {
        await EnsureCanManageAsync(userId);

        SystemConfigurationsEntity? entity =
            await _context
                .Set<SystemConfigurationsEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.SystemConfigurationId == dto.SystemConfigurationId
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Configuration not found.");
        }

        if (dto.NavigationModuleId > 0 && dto.NavigationModuleId != entity.NavigationModuleId)
        {
            throw new InvalidOperationException(
                "The module of a configuration cannot be changed. Create a new configuration in the other module instead.");
        }

        NavigationModuleEntity module =
            await ResolveModuleAsync(
                entity.NavigationModuleId,
                requireActive: false);

        Definition definition =
            await NormalizeDefinitionAsync(
                dto,
                module,
                entity.ConfigurationCode);

        // Check the new value against the NEW definition
        SystemConfigurationsEntity probe =
            new SystemConfigurationsEntity
            {
                ConfigurationName = definition.Name,
                ValueType = definition.ValueType,
                ValueMin = definition.ValueMin,
                ValueMax = definition.ValueMax,
                ValueEmptyText = definition.ValueEmptyText,
                Value = entity.ValueType == definition.ValueType ? entity.Value : "\u0001"
            };

        string value =
            definition.ValueType == ValueNone
                ? (entity.ValueType == ValueNone ? entity.Value ?? string.Empty : string.Empty)
                : NormalizeSwitchValue(probe, dto.Value);

        string defaultValue =
            CheckValueForDefinition(definition, dto.DefaultValue, "default value");

        await EnsureUniqueNameAsync(
            module.Id,
            definition.ScopeKey,
            definition.Name,
            entity.SystemConfigurationId);

        bool stateChanged =
            entity.IsEnabled != dto.IsEnabled
            ||
            (entity.Value ?? string.Empty) != value;

        string reason =
            NormalizeReason(dto.Reason);

        bool critical =
            entity.IsCritical || dto.IsCritical;

        if (stateChanged)
        {
            bool pending =
                await _context
                    .Set<SystemConfigurationRequestsEntity>()
                    .AnyAsync(x => x.ConfigurationCode == entity.ConfigurationCode && x.Status == StatusPending);

            if (pending)
            {
                throw new InvalidOperationException(
                    $"'{entity.ConfigurationName}' has a change waiting for approval. Approve or reject it first.");
            }

            if (critical && reason.Length == 0)
            {
                throw new InvalidOperationException(
                    $"Give a reason for changing '{entity.ConfigurationName}'.");
            }

            await EnsureParentAllowsAsync(
                new SystemConfigurationsEntity
                {
                    ConfigurationName = definition.Name,
                    ParentConfigurationCode = definition.ParentCode
                },
                dto.IsEnabled,
                new Dictionary<string, bool>());
        }

        string fromText =
            FormatState(entity.IsEnabled, entity.Value, entity);

        DateTime now =
            DateTime.UtcNow;

        entity.ConfigurationName = definition.Name;
        entity.ScopeType = definition.ScopeType;
        entity.NavigationMenuCode = definition.MenuCode;
        entity.NavigationSubmenuCode = definition.SubmenuCode;
        entity.OnDescription = definition.OnDescription;
        entity.OffDescription = definition.OffDescription;
        entity.IsEnabled = dto.IsEnabled;
        entity.Value = value;
        entity.ValueType = definition.ValueType;
        entity.ValueUnit = definition.ValueUnit;
        entity.ValueMin = definition.ValueMin;
        entity.ValueMax = definition.ValueMax;
        entity.ValueEmptyText = definition.ValueEmptyText;
        entity.DefaultEnabled = dto.DefaultEnabled;
        entity.DefaultValue = defaultValue;
        entity.ParentConfigurationCode = definition.ParentCode;
        entity.IsCritical = dto.IsCritical;
        entity.DisplayOrder = dto.DisplayOrder;
        entity.Remarks = definition.Remarks;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = now;

        string toText =
            FormatState(entity.IsEnabled, entity.Value, entity);

        AddHistory(
            entity,
            "Update",
            stateChanged ? $"Updated · {fromText} -> {toText}" : "Configuration Updated",
            $"Configuration '{entity.ConfigurationName}' ({entity.ConfigurationCode}) updated" +
            (stateChanged ? $"; {fromText} -> {toText}." : ".") +
            (reason.Length == 0 ? string.Empty : $" Reason: {reason}"),
            userId,
            userName,
            now);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Delete
    //
    // Blocked (409) for switches the system reads by code, for a
    // parent of other switches, and while a request is pending.
    //===========================================================

    public async Task
        DeleteAsync
        (
            long id,
            long userId,
            string userName
        )
    {
        await EnsureCanManageAsync(userId);

        SystemConfigurationsEntity? entity =
            await _context
                .Set<SystemConfigurationsEntity>()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.SystemConfigurationId == id
                        &&
                        !x.IsDeleted
                );

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Configuration not found.");
        }

        if (entity.IsSystemDefined)
        {
            throw new InvalidOperationException(
                $"'{entity.ConfigurationName}' is used by the system and cannot be deleted. Turn it OFF instead.");
        }

        bool isParent =
            await _context
                .Set<SystemConfigurationsEntity>()
                .AnyAsync(x => !x.IsDeleted && x.ParentConfigurationCode == entity.ConfigurationCode);

        if (isParent)
        {
            throw new InvalidOperationException(
                $"'{entity.ConfigurationName}' is the parent of other switches. Change those first.");
        }

        bool pending =
            await _context
                .Set<SystemConfigurationRequestsEntity>()
                .AnyAsync(x => x.ConfigurationCode == entity.ConfigurationCode && x.Status == StatusPending);

        if (pending)
        {
            throw new InvalidOperationException(
                $"'{entity.ConfigurationName}' has a change waiting for approval. Approve or reject it first.");
        }

        DateTime now =
            DateTime.UtcNow;

        entity.IsDeleted = true;
        entity.DeletedBy = userId;
        entity.DeletedDate = now;

        AddHistory(
            entity,
            "Delete",
            "Configuration Deleted",
            $"Configuration '{entity.ConfigurationName}' ({entity.ConfigurationCode}) deleted.",
            userId,
            userName,
            now);

        await _context.SaveChangesAsync();
    }


    //===========================================================
    // Restore
    //
    // Blocked (409) when the module was deleted, or the name is
    // now used by another setting on the same page.
    //===========================================================

    public async Task<bool>
        RestoreAsync
        (
            long userId,
            string userName
        )
    {
        await EnsureCanManageAsync(userId);

        SystemConfigurationsEntity? entity =
            await _context
                .Set<SystemConfigurationsEntity>()
                .Where(x => x.IsDeleted)
                .OrderByDescending(x => x.DeletedDate)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        NavigationModuleEntity? module =
            await _context
                .Set<NavigationModuleEntity>()
                .AsNoTracking()
                .FirstOrDefaultAsync
                (
                    x =>
                        x.Id == entity.NavigationModuleId
                        &&
                        !x.IsDeleted
                );

        if (module == null)
        {
            throw new InvalidOperationException(
                $"Configuration '{entity.ConfigurationName}' cannot be restored because its module has been deleted.");
        }

        try
        {
            await EnsureUniqueNameAsync(
                module.Id,
                entity.NavigationSubmenuCode ?? entity.NavigationMenuCode ?? string.Empty,
                entity.ConfigurationName ?? string.Empty,
                entity.SystemConfigurationId);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException(
                $"Configuration '{entity.ConfigurationName}' cannot be restored. {ex.Message}");
        }

        DateTime now =
            DateTime.UtcNow;

        entity.IsDeleted = false;
        entity.DeletedBy = null;
        entity.DeletedDate = null;
        entity.ModifiedBy = userId;
        entity.ModifiedDate = now;

        AddHistory(
            entity,
            "Restore",
            "Configuration Restored",
            $"Configuration '{entity.ConfigurationName}' ({entity.ConfigurationCode}) restored.",
            userId,
            userName,
            now);

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
            .Set<SystemConfigurationsEntity>()
            .AnyAsync
            (
                x =>
                    x.SystemConfigurationId == id
                    &&
                    !x.IsDeleted
            );
    }
}