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
        // Master Activities:
        //   Module + Menu + Submenu scope
        //
        // Navigation Activities:
        //   Module scope
        //
        // The original hierarchy is retained here because
        // Activity Assignment stores the activities against
        // an Activity Assignment Detail.
        //
        // The central permission service will interpret the
        // NavigationActivityId as module-level permission.
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
        // Special / Navigation Activities are MODULE LEVEL.
        //
        // They are not restricted to a particular Menu or
        // Submenu. Therefore MenuId and SubMenuId are normalized
        // to zero.
        //
        // Example:
        //
        //   Infrastructure Control
        //       Pull
        //       Commit
        //       Push
        //       Refresh
        //       Sync
        //
        // applies to all menus and submenus under that module.
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
                        0,

                    SubMenuId =
                        0,

                    MasterActivityId =
                        null,

                    NavigationActivityId =
                        specialAssignmentPermission.NavigationActivityId
                };


        //=======================================================
        // Combine Effective Access
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
}