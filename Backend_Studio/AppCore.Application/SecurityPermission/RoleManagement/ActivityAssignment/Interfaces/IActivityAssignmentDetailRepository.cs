//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.DTOs;

using AppCore.Domain.Entities.SecurityPermission.RoleManagement;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.RoleManagement.ActivityAssignment.Interfaces;

//===============================================================
// Interface
//===============================================================

public interface IActivityAssignmentDetailRepository
{
    //===========================================================
    // Get By Activity Assignment Id
    //===========================================================

    Task<List<ActivityAssignmentDetailDto>>
        GetByActivityAssignmentIdAsync(
            long activityAssignmentId);

    //===========================================================
    // Create
    //===========================================================

    Task CreateAsync(
        ActivityAssignmentDetail entity);

    //===========================================================
    // Create Range
    //===========================================================

    Task CreateRangeAsync(
        List<ActivityAssignmentDetail> entities);

    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        ActivityAssignmentDetail entity);

    //===========================================================
    // Delete
    //===========================================================

    Task DeleteAsync(
        long activityAssignmentDetailId);

    //===========================================================
    // Delete By Activity Assignment Id
    //===========================================================

    Task DeleteByActivityAssignmentIdAsync(
        long activityAssignmentId);
}