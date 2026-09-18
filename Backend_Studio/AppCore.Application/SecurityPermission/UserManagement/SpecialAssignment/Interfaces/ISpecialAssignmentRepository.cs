//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.ActivityHistory.DTOs;

using AppCore.Domain.Entities.SecurityPermission.UserManagement;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SecurityPermission.UserManagement;


//===============================================================
// ISpecialAssignmentRepository
//===============================================================

public interface ISpecialAssignmentRepository
{

    //===========================================================
    // Get All
    //===========================================================

    Task<IReadOnlyList<SpecialAssignment>>
        GetAllAsync();



    //===========================================================
    // Get By Id
    //===========================================================

    Task<SpecialAssignment?>
        GetByIdAsync
    (
        long id
    );



    //===========================================================
    // Exists By User Profile Id
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
        SpecialAssignment entity
    );



    //===========================================================
    // Update
    //===========================================================

    Task
        UpdateAsync
    (
        SpecialAssignment entity
    );



    //===========================================================
    // Delete
    //===========================================================

    Task
        DeleteAsync
    (
        long id
    );



    //===========================================================
    // Restore Last Deleted
    //===========================================================

    Task<bool>
        RestoreLastDeletedAsync();



    //===========================================================
    // Get History
    //===========================================================

    Task<IReadOnlyList<ActivityHistoryDto>>
        GetHistoryAsync();



    //===========================================================
    // Get Entity History
    //===========================================================

    Task<IReadOnlyList<ActivityHistoryDto>>
        GetEntityHistoryAsync
    (
        long id
    );

}