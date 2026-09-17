//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.RoleManagement;


//===============================================================
// IActivityAssignmentRepository
//===============================================================

public interface IActivityAssignmentRepository
{
    //===========================================================
    // Defaults
    //===========================================================

    Task<ActivityAssignmentDefaultsDto>
        GetDefaultsAsync();


    //===========================================================
    // Activity Assignment
    //===========================================================

    Task<List<ActivityAssignmentDto>>
        GetAllAsync();


    Task<ActivityAssignmentDto?>
        GetByIdAsync
        (
            long activityAssignmentId
        );


    Task<ActivityAssignmentDto?>
        GetByRoleProfileIdAsync
        (
            long roleProfileId
        );


    Task<long>
        CreateAsync
        (
            CreateActivityAssignmentDto dto
        );


    Task<bool>
        UpdateAsync
        (
            UpdateActivityAssignmentDto dto
        );


    Task<bool>
        DeleteAsync
        (
            long activityAssignmentId
        );


    Task<bool>
        RestoreLastDeletedAsync();
}