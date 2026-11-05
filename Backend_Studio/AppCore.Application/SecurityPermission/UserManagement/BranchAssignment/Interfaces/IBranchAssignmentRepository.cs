//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.SecurityPermission.UserManagement.BranchAssignment.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.UserManagement;


//===============================================================
// IBranchAssignmentRepository
//===============================================================

public interface IBranchAssignmentRepository
{
    //===========================================================
    // Defaults
    //===========================================================

    Task<BranchAssignmentDefaultsDto>
        GetDefaultsAsync();


    //===========================================================
    // Branch Assignment
    //===========================================================

    Task<List<BranchAssignmentDto>>
        GetAllAsync();


    Task<BranchAssignmentDto?>
        GetByIdAsync
        (
            long branchAssignmentId
        );


    Task<BranchAssignmentDto?>
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
            CreateBranchAssignmentDto dto
        );


    //===========================================================
    // Update
    //===========================================================

    Task<bool>
        UpdateAsync
        (
            UpdateBranchAssignmentDto dto
        );


    //===========================================================
    // Delete
    //===========================================================

    Task<bool>
        DeleteAsync
        (
            long branchAssignmentId
        );


    //===========================================================
    // Restore
    //===========================================================

    Task<bool>
        RestoreLastDeletedAsync();


    // Public Id -> internal id (live rows only; null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);
}
