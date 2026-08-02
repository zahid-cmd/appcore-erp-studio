//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.Interfaces;

//===============================================================
// Interface
//===============================================================

public interface IActivityAssignmentRepository
{
    //===========================================================
    // Get Defaults
    //===========================================================

    Task<ActivityAssignmentDto> GetDefaultsAsync();

    //===========================================================
    // Get All
    //===========================================================

    Task<List<ActivityAssignmentDto>> GetAllAsync();

    //===========================================================
    // Get By Id
    //===========================================================

    Task<ActivityAssignmentDto?> GetByIdAsync(
        long activityAssignmentId);

    //===========================================================
    // Get By Role Profile Id
    //===========================================================

    Task<ActivityAssignmentDto?> GetByRoleProfileIdAsync(
        long roleProfileId);

    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateActivityAssignmentDto dto);

    //===========================================================
    // Update
    //===========================================================

    Task<bool> UpdateAsync(
        UpdateActivityAssignmentDto dto);

    //===========================================================
    // Delete
    //===========================================================

    Task<bool> DeleteAsync(
        long activityAssignmentId);

    //===========================================================
    // Restore Last Deleted
    //===========================================================

    Task<bool> RestoreLastDeletedAsync();
}