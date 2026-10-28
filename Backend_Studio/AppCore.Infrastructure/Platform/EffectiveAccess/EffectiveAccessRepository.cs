//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;

using AppCore.Application.Platform.EffectiveAccess.DTOs;
using AppCore.Application.Platform.EffectiveAccess.Interfaces;

using AppCore.Infrastructure.Persistence;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.EffectiveAccess;


//===============================================================
// Effective Access Repository
//===============================================================

public class EffectiveAccessRepository
    : IEffectiveAccessRepository
{

    //===========================================================
    // Database Context
    //===========================================================

    private readonly AppDbContext
        _context;


    //===========================================================
    // Constructor
    //===========================================================

    public EffectiveAccessRepository
    (
        AppDbContext context
    )
    {
        _context =
            context;
    }


    //===========================================================
    // Get Effective Access
    //===========================================================

    public async Task<List<EffectiveAccessDto>>
        GetEffectiveAccessAsync
        (
            long userProfileId
        )
    {

        //=======================================================
        // Validate User Profile
        //=======================================================

        bool
            userExists =
                await _context
                    .UserProfiles
                    .AnyAsync
                    (
                        userProfile =>
                            userProfile.UserProfileId
                            ==
                            userProfileId

                            &&

                            userProfile.IsActive

                            &&

                            !userProfile.IsDeleted
                    );

        if
        (
            !userExists
        )
        {
            return
                new List<EffectiveAccessDto>();
        }


        //=======================================================
        // Role Based Effective Access
        //=======================================================
        //
        // Role Assignment provides the user's normal ERP access.
        //
        // The complete hierarchy is retained:
        //
        //   Module
        //      Menu
        //          Submenu
        //              Master Activity
        //              Navigation Activity
        //=======================================================

        var
            roleBasedAccess =
                from roleAssignment
                    in _context.RoleAssignments

                from roleAssignmentDetail
                    in roleAssignment.Details

                join roleProfile
                    in _context.RoleProfiles
                    on roleAssignmentDetail.RoleProfileId
                    equals roleProfile.RoleProfileId

                join activityAssignment
                    in _context.ActivityAssignments
                    on roleProfile.RoleProfileId
                    equals activityAssignment.RoleProfileId

                from activityAssignmentDetail
                    in activityAssignment.Details

                from activityAssignmentPermission
                    in activityAssignmentDetail
                        .ActivityAssignmentPermissions

                where
                    roleAssignment.UserProfileId
                    ==
                    userProfileId

                    &&

                    roleAssignment.IsActive

                    &&

                    !roleAssignment.IsDeleted

                    &&

                    roleAssignmentDetail.IsActive

                    &&

                    !roleAssignmentDetail.IsDeleted

                    &&

                    roleProfile.IsActive

                    &&

                    !roleProfile.IsDeleted

                    &&

                    activityAssignment.IsActive

                    &&

                    !activityAssignment.IsDeleted

                    &&

                    activityAssignmentDetail.IsActive

                    &&

                    !activityAssignmentDetail.IsDeleted

                    &&

                    activityAssignmentPermission.IsActive

                    &&

                    !activityAssignmentPermission.IsDeleted

                select new EffectiveAccessDto
                {
                    UserProfileId =
                        userProfileId,

                    ModuleId =
                        activityAssignmentDetail.ModuleId,

                    MenuId =
                        activityAssignmentDetail.MenuId,

                    SubMenuId =
                        activityAssignmentDetail.SubMenuId,

                    MasterActivityId =
                        activityAssignmentPermission.MasterActivityId,

                    NavigationActivityId =
                        activityAssignmentPermission.NavigationActivityId
                };


        //=======================================================
        // Special Assignment Effective Access
        //=======================================================
        //
        // Special Assignment adds additional ERP access to the
        // user's existing Role Assignment.
        //
        // Therefore the complete hierarchy must be retained:
        //
        //   Module
        //      Menu
        //          Submenu
        //              Master Activity
        //              Navigation Activity
        //
        // Example:
        //
        //   Role Assignment
        //       Code Management
        //           Repository Management
        //
        //   Special Assignment
        //       Code Management
        //           Source Control
        //
        // The Special Assignment submenu is therefore an
        // additional effective submenu for the user.
        //=======================================================

        var
            specialAssignmentAccess =
                from specialAssignment
                    in _context.SpecialAssignments

                from specialAssignmentDetail
                    in specialAssignment.Details

                from specialAssignmentPermission
                    in specialAssignmentDetail
                        .SpecialAssignmentPermissions

                where
                    specialAssignment.UserProfileId
                    ==
                    userProfileId

                    &&

                    specialAssignment.IsActive

                    &&

                    !specialAssignment.IsDeleted

                    &&

                    specialAssignmentDetail.IsActive

                    &&

                    !specialAssignmentDetail.IsDeleted

                    &&

                    specialAssignmentPermission.IsActive

                    &&

                    !specialAssignmentPermission.IsDeleted

                select new EffectiveAccessDto
                {
                    UserProfileId =
                        userProfileId,

                    ModuleId =
                        specialAssignmentDetail.ModuleId,

                    MenuId =
                        specialAssignmentDetail.MenuId,

                    SubMenuId =
                        specialAssignmentDetail.SubMenuId,

                    MasterActivityId =
                        specialAssignmentPermission.MasterActivityId,

                    NavigationActivityId =
                        specialAssignmentPermission.NavigationActivityId
                };


        //=======================================================
        // Combine Effective Access
        //=======================================================
        //
        // Effective access is the additive union of:
        //
        //   Role Assignment
        //   +
        //   Special Assignment
        //
        // Special Assignment never replaces the Role Assignment.
        //=======================================================

        return await
            roleBasedAccess
                .Union
                (
                    specialAssignmentAccess
                )
                .AsNoTracking()
                .ToListAsync();
    }


    //===========================================================
    // Has Activity (one activity on one page)
    //===========================================================

    public async Task<bool>
        HasActivityAsync
        (
            long userProfileId,
            string submenuRoutePattern,
            string activityName
        )
    {
        string
            pattern =
                (submenuRoutePattern ?? string.Empty).Trim();

        string
            name =
                (activityName ?? string.Empty).Trim().ToLower();

        if
        (
            userProfileId <= 0
            ||
            pattern.Length == 0
            ||
            name.Length == 0
        )
        {
            return false;
        }

        //=======================================================
        // The page(s) and the activity
        //=======================================================

        List<long>
            subMenuIds =
                await _context
                    .NavigationSubmenus
                    .AsNoTracking()
                    .Where
                    (
                        submenu =>
                            !submenu.IsDeleted
                            &&
                            EF.Functions.ILike(
                                submenu.Route,
                                pattern)
                    )
                    .Select(submenu => submenu.Id)
                    .ToListAsync();

        List<long>
            activityIds =
                await _context
                    .MasterActivities
                    .AsNoTracking()
                    .Where
                    (
                        activity =>
                            activity.IsActive
                            &&
                            !activity.IsDeleted
                            &&
                            activity.Name.Trim().ToLower() == name
                    )
                    .Select(activity => activity.Id)
                    .ToListAsync();

        if
        (
            subMenuIds.Count == 0
            ||
            activityIds.Count == 0
        )
        {
            return false;
        }

        //=======================================================
        // Role Assignment + Special Assignment
        //=======================================================

        List<EffectiveAccessDto>
            access =
                await GetEffectiveAccessAsync(
                    userProfileId);

        return access.Any
        (
            row =>
                subMenuIds.Contains(row.SubMenuId)
                &&
                row.MasterActivityId.HasValue
                &&
                activityIds.Contains(row.MasterActivityId.Value)
        );
    }
}