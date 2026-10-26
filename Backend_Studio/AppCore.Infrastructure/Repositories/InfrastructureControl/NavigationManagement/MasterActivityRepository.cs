//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.InfrastructureControl.NavigationManagement.MasterActivity.DTOs;
using AppCore.Application.InfrastructureControl.NavigationManagement.MasterActivity.Interfaces;

using AppCore.Domain.Common;

using Microsoft.EntityFrameworkCore;

using AppCore.Infrastructure.CodeMaster;
using AppCore.Infrastructure.Persistence;

//===============================================================
// Entity Aliases
//===============================================================

using MasterActivityEntity =
    AppCore.Domain.Entities.InfrastructureControl.NavigationManagement.MasterActivity;

using MasterActivityPagesEntity =
    AppCore.Domain.Entities.InfrastructureControl.NavigationManagement.MasterActivityPages;

using NavigationSubmenuEntity =
    AppCore.Domain.Entities.InfrastructureControl.NavigationManagement.NavigationSubmenu;

using SystemConfigurationsEntity =
    AppCore.Domain.Entities.Settings.GeneralSettings.SystemConfigurations;

using ActivityAssignmentPermissionEntity =
    AppCore.Domain.Entities.SecurityPermission.RoleManagement.ActivityAssignmentPermission;

using SpecialAssignmentPermissionEntity =
    AppCore.Domain.Entities.SecurityPermission.UserManagement.SpecialAssignmentPermission;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Repositories.InfrastructureControl.NavigationManagement.MasterActivity;

//===============================================================
// Master Activity Repository
//
// Two kinds of activity :
//   Common : on every page (View, Add, Update, Delete, Restore).
//   Page   : only on its linked pages (Approve, Post, ...).
//            Links are kept by code in MasterActivityPages; with
//            LinkToSwitchPages the activity is also on every page
//            that has page switches.
//===============================================================

public class MasterActivityRepository : IMasterActivityRepository
{
    //===============================================================
    // Constants
    //===============================================================

    private const string ScopeCommon = "Common";

    private const string ScopePage = "Page";

    // System Configurations : scope of a page switch
    private const string SwitchScopeSubmenu = "Submenu";

    //===============================================================
    // Private Fields
    //===============================================================

    private readonly AppDbContext _context;

    //===============================================================
    // Constructor
    //===============================================================

    public MasterActivityRepository(
        AppDbContext context)
    {
        _context = context;
    }

    //===============================================================
    // Get All
    //===============================================================

    public async Task<List<MasterActivityDto>> GetAllAsync()
    {
        List<MasterActivityDto> activities =
            await _context.MasterActivities
                .AsNoTracking()
                .Where(x =>
                    !x.IsDeleted)
                .OrderBy(x =>
                    x.DisplayOrder)
                .ThenBy(x =>
                    x.Name)
                .Select(x => new MasterActivityDto
                {
                    Id = x.Id,
                    Code = x.Code,
                    Name = x.Name,
                    DisplayOrder = x.DisplayOrder,
                    Remarks = x.Remarks,
                    ActivityScope = x.ActivityScope,
                    LinkToSwitchPages = x.LinkToSwitchPages,
                    IsActive = x.IsActive
                })
                .ToListAsync();

        await FillPagesAsync(activities);

        return activities;
    }

    //===============================================================
    // Get By Id
    //===============================================================

    public async Task<MasterActivityDto?> GetByIdAsync(
        long id)
    {
        MasterActivityDto? activity =
            await _context.MasterActivities
                .AsNoTracking()
                .Where(x =>
                    x.Id == id &&
                    !x.IsDeleted)
                .Select(x => new MasterActivityDto
                {
                    Id = x.Id,
                    Code = x.Code,
                    Name = x.Name,
                    DisplayOrder = x.DisplayOrder,
                    Remarks = x.Remarks,
                    ActivityScope = x.ActivityScope,
                    LinkToSwitchPages = x.LinkToSwitchPages,
                    IsActive = x.IsActive
                })
                .FirstOrDefaultAsync();

        if (activity != null)
        {
            await FillPagesAsync(
                new List<MasterActivityDto> { activity });
        }

        return activity;
    }

    //===============================================================
    // Create
    //===============================================================

    public async Task<long> CreateAsync(
        CreateMasterActivityDto dto,
        long userId)
    {
        string name =
            (dto.Name ?? string.Empty).Trim();

        string scope =
            NormalizeScope(dto.ActivityScope);

        List<string> pageCodes =
            scope == ScopePage
                ? await CleanPageCodesAsync(dto.PageSubmenuCodes)
                : new List<string>();

        bool linkToSwitchPages =
            scope == ScopePage && dto.LinkToSwitchPages;

        await ValidateAsync(
            0,
            name,
            scope,
            pageCodes,
            linkToSwitchPages);

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        int nextSequenceNo =
            await GetNextSequenceNoAsync();

        MasterActivityEntity entity =
            new()
            {
                SequenceNo =
                    nextSequenceNo,

                Code =
                    GetNextCode(nextSequenceNo),

                Name =
                    name,

                DisplayOrder =
                    dto.DisplayOrder,

                Remarks =
                    dto.Remarks,

                ActivityScope =
                    scope,

                LinkToSwitchPages =
                    linkToSwitchPages,

                IsActive =
                    dto.IsActive,

                IsDeleted =
                    false,

                CreatedBy =
                    userId,

                CreatedDate =
                    DateTime.UtcNow
            };

        _context.MasterActivities.Add(entity);

        await _context.SaveChangesAsync();

        await ReplacePagesAsync(
            entity.Code,
            pageCodes,
            userId);

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Navigation Management",

                EntityName =
                    "Master Activity",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Create",

                ActivityTitle =
                    "Master Activity Created",

                ActivityDescription =
                    $"Master Activity '{entity.Name}' created ({DescribeScope(scope, pageCodes.Count, linkToSwitchPages)}).",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        return entity.Id;
    }

    //===============================================================
    // Update
    //===============================================================

    public async Task UpdateAsync(
        UpdateMasterActivityDto dto,
        long userId)
    {
        MasterActivityEntity? entity =
            await _context.MasterActivities
                .FirstOrDefaultAsync(x =>
                    x.Id == dto.Id &&
                    !x.IsDeleted);

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Master Activity not found.");
        }

        string name =
            (dto.Name ?? string.Empty).Trim();

        string scope =
            NormalizeScope(dto.ActivityScope);

        List<string> pageCodes =
            scope == ScopePage
                ? await CleanPageCodesAsync(dto.PageSubmenuCodes)
                : new List<string>();

        bool linkToSwitchPages =
            scope == ScopePage && dto.LinkToSwitchPages;

        await ValidateAsync(
            entity.Id,
            name,
            scope,
            pageCodes,
            linkToSwitchPages);

        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        entity.Name =
            name;

        entity.DisplayOrder =
            dto.DisplayOrder;

        entity.Remarks =
            dto.Remarks;

        entity.ActivityScope =
            scope;

        entity.LinkToSwitchPages =
            linkToSwitchPages;

        entity.IsActive =
            dto.IsActive;

        entity.ModifiedBy =
            userId;

        entity.ModifiedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await ReplacePagesAsync(
            entity.Code,
            pageCodes,
            userId);

        //===========================================================
        // A Page activity may no longer be held on pages it is not
        // linked to : those permissions are removed from roles and
        // special assignments, so nobody keeps a hidden right.
        //===========================================================

        int removed =
            scope == ScopePage
                ? await RemoveUnlinkedPermissionsAsync(
                    entity.Id,
                    pageCodes,
                    linkToSwitchPages,
                    userId)
                : 0;

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Navigation Management",

                EntityName =
                    "Master Activity",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Update",

                ActivityTitle =
                    "Master Activity Updated",

                ActivityDescription =
                    $"Master Activity '{entity.Name}' updated ({DescribeScope(scope, pageCodes.Count, linkToSwitchPages)})."
                    +
                    (removed > 0
                        ? $" {removed} permission(s) on pages it is no longer used on were removed."
                        : string.Empty),

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();
    }

    //===============================================================
    // Delete
    //===============================================================

    public async Task DeleteAsync(
        long id,
        long userId)
    {
        MasterActivityEntity? entity =
            await _context.MasterActivities
                .FirstOrDefaultAsync(x =>
                    x.Id == id &&
                    !x.IsDeleted);

        if (entity == null)
        {
            throw new KeyNotFoundException(
                "Master Activity not found.");
        }

        entity.IsDeleted =
            true;

        entity.DeletedBy =
            userId;

        entity.DeletedDate =
            DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _context.ActivityHistories.Add(
            new ActivityHistory
            {
                Module =
                    "Navigation Management",

                EntityName =
                    "Master Activity",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Delete",

                ActivityTitle =
                    "Master Activity Deleted",

                ActivityDescription =
                    $"Master Activity '{entity.Name}' deleted.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();
    }

    //===============================================================
    // Restore
    //===============================================================

    public async Task<bool> RestoreAsync(
        long userId)
    {
        MasterActivityEntity? entity =
            await _context.MasterActivities
                .Where(x =>
                    x.IsDeleted)
                .OrderByDescending(x =>
                    x.DeletedDate)
                .FirstOrDefaultAsync();

        if (entity == null)
        {
            return false;
        }

        //===========================================================
        // A live activity took the same name meanwhile
        //===========================================================

        string key =
            entity.Name.Trim().ToLower();

        bool nameTaken =
            await _context.MasterActivities
                .AnyAsync(x =>
                    !x.IsDeleted &&
                    x.Id != entity.Id &&
                    x.Name.Trim().ToLower() == key);

        if (nameTaken)
        {
            throw new InvalidOperationException(
                $"An activity named '{entity.Name}' already exists, so the deleted one cannot be restored.");
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
                    "Navigation Management",

                EntityName =
                    "Master Activity",

                EntityId =
                    entity.Id,

                ActivityType =
                    "Restore",

                ActivityTitle =
                    "Master Activity Restored",

                ActivityDescription =
                    $"Master Activity '{entity.Name}' restored.",

                PerformedBy =
                    userId,

                PerformedByName =
                    "System",

                PerformedDate =
                    DateTime.UtcNow
            });

        await _context.SaveChangesAsync();

        return true;
    }

    //===============================================================
    // Get Defaults
    //===============================================================

    public async Task<MasterActivityDefaultsDto> GetDefaultsAsync()
    {
        int nextSequenceNo =
            await GetNextSequenceNoAsync();

        MasterActivityDefaultsDto defaults =
            new()
            {
                Code =
                    GetNextCode(nextSequenceNo),

                DisplayOrder =
                    await GetNextDisplayOrderAsync(),

                IsActive =
                    true
            };

        return defaults;
    }

    //===============================================================
    // Exists
    //===============================================================

    public async Task<bool> ExistsAsync(
        long id)
    {
        return await _context.MasterActivities
            .AnyAsync(x =>
                x.Id == id &&
                !x.IsDeleted);
    }

    //===============================================================
    // Validate
    //===============================================================

    private async Task ValidateAsync(
        long id,
        string name,
        string scope,
        List<string> pageCodes,
        bool linkToSwitchPages)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new InvalidOperationException(
                "Activity name is required.");
        }

        if (name.Length > 100)
        {
            throw new InvalidOperationException(
                "Activity name can have at most 100 characters.");
        }

        string key =
            name.ToLower();

        bool nameTaken =
            await _context.MasterActivities
                .AnyAsync(x =>
                    !x.IsDeleted &&
                    x.Id != id &&
                    x.Name.Trim().ToLower() == key);

        if (nameTaken)
        {
            throw new InvalidOperationException(
                $"An activity named '{name}' already exists.");
        }

        if
        (
            scope == ScopePage
            &&
            pageCodes.Count == 0
            &&
            !linkToSwitchPages
        )
        {
            throw new InvalidOperationException(
                "A page activity needs at least one page, or 'Pages with switches'.");
        }
    }

    //===============================================================
    // Normalize Scope
    //===============================================================

    private static string NormalizeScope(
        string? scope)
    {
        string value =
            (scope ?? string.Empty).Trim();

        if (string.Equals(value, ScopePage, StringComparison.OrdinalIgnoreCase))
        {
            return ScopePage;
        }

        if
        (
            value.Length == 0
            ||
            string.Equals(value, ScopeCommon, StringComparison.OrdinalIgnoreCase)
        )
        {
            return ScopeCommon;
        }

        throw new InvalidOperationException(
            "Activity scope must be Common or Page.");
    }

    //===============================================================
    // Clean Page Codes : distinct, live submenus only
    //===============================================================

    private async Task<List<string>> CleanPageCodesAsync(
        List<string>? codes)
    {
        List<string> wanted =
            (codes ?? new List<string>())
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Select(x => x.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

        if (wanted.Count == 0)
        {
            return wanted;
        }

        List<string> existing =
            await _context.Set<NavigationSubmenuEntity>()
                .AsNoTracking()
                .Where(x =>
                    !x.IsDeleted &&
                    wanted.Contains(x.Code))
                .Select(x => x.Code)
                .ToListAsync();

        List<string> missing =
            wanted
                .Where(x => !existing.Contains(x, StringComparer.OrdinalIgnoreCase))
                .ToList();

        if (missing.Count > 0)
        {
            throw new InvalidOperationException(
                $"Page not found : {string.Join(", ", missing)}.");
        }

        return existing
            .OrderBy(x => x)
            .ToList();
    }

    //===============================================================
    // Replace Pages
    //===============================================================

    private async Task ReplacePagesAsync(
        string activityCode,
        List<string> pageCodes,
        long userId)
    {
        List<MasterActivityPagesEntity> current =
            await _context.Set<MasterActivityPagesEntity>()
                .Where(x =>
                    x.MasterActivityCode == activityCode)
                .ToListAsync();

        List<MasterActivityPagesEntity> remove =
            current
                .Where(x => !pageCodes.Contains(x.NavigationSubmenuCode))
                .ToList();

        _context.Set<MasterActivityPagesEntity>()
            .RemoveRange(remove);

        foreach
        (
            string code in pageCodes
                .Where(x => !current.Any(c => c.NavigationSubmenuCode == x))
        )
        {
            _context.Set<MasterActivityPagesEntity>().Add(
                new MasterActivityPagesEntity
                {
                    MasterActivityCode =
                        activityCode,

                    NavigationSubmenuCode =
                        code,

                    CreatedBy =
                        userId,

                    CreatedDate =
                        DateTime.UtcNow
                });
        }

        await _context.SaveChangesAsync();
    }

    //===============================================================
    // Pages With Switches : submenu codes that have page switches
    //===============================================================

    public async Task<List<string>> GetSwitchPageCodesAsync()
    {
        return await _context.Set<SystemConfigurationsEntity>()
            .AsNoTracking()
            .Where(x =>
                !x.IsDeleted &&
                x.ScopeType == SwitchScopeSubmenu &&
                x.NavigationSubmenuCode != null &&
                x.NavigationSubmenuCode != "")
            .Select(x => x.NavigationSubmenuCode!)
            .Distinct()
            .OrderBy(x => x)
            .ToListAsync();
    }

    //===============================================================
    // Fill Pages : hand links + resolved submenu ids
    //===============================================================

    private async Task FillPagesAsync(
        List<MasterActivityDto> activities)
    {
        List<MasterActivityDto> pageActivities =
            activities
                .Where(x => x.ActivityScope == ScopePage)
                .ToList();

        if (pageActivities.Count == 0)
        {
            return;
        }

        List<string> activityCodes =
            pageActivities
                .Select(x => x.Code)
                .ToList();

        List<MasterActivityPagesEntity> links =
            await _context.Set<MasterActivityPagesEntity>()
                .AsNoTracking()
                .Where(x =>
                    activityCodes.Contains(x.MasterActivityCode))
                .ToListAsync();

        List<string> switchCodes =
            pageActivities.Any(x => x.LinkToSwitchPages)
                ? await GetSwitchPageCodesAsync()
                : new List<string>();

        Dictionary<string, long> submenuIds =
            await _context.Set<NavigationSubmenuEntity>()
                .AsNoTracking()
                .Where(x => !x.IsDeleted)
                .Select(x => new { x.Code, x.Id })
                .ToDictionaryAsync(
                    x => x.Code,
                    x => x.Id);

        foreach (MasterActivityDto activity in pageActivities)
        {
            activity.PageSubmenuCodes =
                links
                    .Where(x => x.MasterActivityCode == activity.Code)
                    .Select(x => x.NavigationSubmenuCode)
                    .OrderBy(x => x)
                    .ToList();

            IEnumerable<string> allCodes =
                activity.LinkToSwitchPages
                    ? activity.PageSubmenuCodes.Concat(switchCodes)
                    : activity.PageSubmenuCodes;

            activity.PageSubmenuIds =
                allCodes
                    .Distinct()
                    .Where(code => submenuIds.ContainsKey(code))
                    .Select(code => submenuIds[code])
                    .OrderBy(x => x)
                    .ToList();
        }
    }

    //===============================================================
    // Remove Unlinked Permissions
    //
    // Roles (Activity Assignment) and users (Special Assignment)
    // lose this activity on pages it is no longer linked to.
    //===============================================================

    private async Task<int> RemoveUnlinkedPermissionsAsync(
        long activityId,
        List<string> pageCodes,
        bool linkToSwitchPages,
        long userId)
    {
        List<string> keepCodes =
            linkToSwitchPages
                ? pageCodes
                    .Concat(await GetSwitchPageCodesAsync())
                    .Distinct()
                    .ToList()
                : pageCodes;

        List<long> keepIds =
            await _context.Set<NavigationSubmenuEntity>()
                .AsNoTracking()
                .Where(x =>
                    keepCodes.Contains(x.Code))
                .Select(x => x.Id)
                .ToListAsync();

        DateTime now =
            DateTime.UtcNow;

        List<ActivityAssignmentPermissionEntity> rolePermissions =
            await _context.Set<ActivityAssignmentPermissionEntity>()
                .Where(x =>
                    !x.IsDeleted &&
                    x.MasterActivityId == activityId &&
                    !keepIds.Contains(x.ActivityAssignmentDetail.SubMenuId))
                .ToListAsync();

        foreach (ActivityAssignmentPermissionEntity permission in rolePermissions)
        {
            permission.IsDeleted = true;
            permission.DeletedBy = userId;
            permission.DeletedDate = now;
        }

        List<SpecialAssignmentPermissionEntity> userPermissions =
            await _context.Set<SpecialAssignmentPermissionEntity>()
                .Where(x =>
                    !x.IsDeleted &&
                    x.MasterActivityId == activityId &&
                    !keepIds.Contains(x.SpecialAssignmentDetail.SubMenuId))
                .ToListAsync();

        foreach (SpecialAssignmentPermissionEntity permission in userPermissions)
        {
            permission.IsDeleted = true;
            permission.DeletedBy = userId;
            permission.DeletedDate = now;
        }

        await _context.SaveChangesAsync();

        return rolePermissions.Count + userPermissions.Count;
    }

    //===============================================================
    // Describe Scope (history text)
    //===============================================================

    private static string DescribeScope(
        string scope,
        int pageCount,
        bool linkToSwitchPages)
    {
        if (scope != ScopePage)
        {
            return "Common, every page";
        }

        string pages =
            pageCount == 1
                ? "1 page"
                : $"{pageCount} pages";

        return linkToSwitchPages
            ? $"Page, {pages} + pages with switches"
            : $"Page, {pages}";
    }

    //===============================================================
    // Get Next Code
    //===============================================================

    private string GetNextCode(
        int sequenceNo)
    {
        return CodeGenerator.GenerateMasterActivityCode(
            sequenceNo);
    }

    //===============================================================
    // Get Next Display Order
    //===============================================================

    private async Task<int> GetNextDisplayOrderAsync()
    {
        List<int> usedDisplayOrders =
            await _context.MasterActivities
                .AsNoTracking()
                .Where(x =>
                    !x.IsDeleted)
                .Select(x =>
                    x.DisplayOrder)
                .OrderBy(x =>
                    x)
                .ToListAsync();

        int suggestedDisplayOrder = 1;

        foreach (int displayOrder in usedDisplayOrders)
        {
            if (displayOrder == suggestedDisplayOrder)
            {
                suggestedDisplayOrder++;

                continue;
            }

            if (displayOrder > suggestedDisplayOrder)
            {
                break;
            }
        }

        return suggestedDisplayOrder;
    }

    //===============================================================
    // Get Next Sequence Number
    //
    // Deleted rows count too : SequenceNo and Code are unique, so a
    // number is never reused.
    //===============================================================

    private async Task<int> GetNextSequenceNoAsync()
    {
        int? lastSequenceNo =
            await _context.MasterActivities
                .MaxAsync(x =>
                    (int?)x.SequenceNo);

        return (lastSequenceNo ?? 0) + 1;
    }
}