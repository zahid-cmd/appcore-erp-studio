//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.SecurityPermission.UserManagement.RoleAssignment.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.UserManagement;


//===============================================================
// IRoleAssignmentRepository
//===============================================================

public interface IRoleAssignmentRepository
{
    //===========================================================
    // Defaults
    //===========================================================

    Task<RoleAssignmentDefaultsDto>
        GetDefaultsAsync();


    //===========================================================
    // Role Assignment
    //===========================================================

    Task<List<RoleAssignmentDto>>
        GetAllAsync();


    Task<RoleAssignmentDto?>
        GetByIdAsync
        (
            long roleAssignmentId
        );


    Task<RoleAssignmentDto?>
        GetByUserProfileIdAsync
        (
            long userProfileId
        );


    //===========================================================
    // Check User Profile Assignment
    //===========================================================

    Task<bool>
        ExistsByUserProfileIdAsync
        (
            long userProfileId
        );


    //===========================================================
    // Create
    //===========================================================

    Task<long>
        CreateAsync
        (
            CreateRoleAssignmentDto dto
        );


    //===========================================================
    // Update
    //===========================================================

    Task<bool>
        UpdateAsync
        (
            UpdateRoleAssignmentDto dto
        );


    //===========================================================
    // Delete
    //===========================================================

    Task<bool>
        DeleteAsync
        (
            long roleAssignmentId
        );


    //===========================================================
    // Restore
    //===========================================================

    Task<bool>
        RestoreLastDeletedAsync();
}