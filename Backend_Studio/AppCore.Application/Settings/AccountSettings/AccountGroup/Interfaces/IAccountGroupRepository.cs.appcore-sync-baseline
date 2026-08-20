//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.ActivityHistory.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// IAccountGroupRepository
//===============================================================

public interface IAccountGroupRepository
{

    //===========================================================
    // Get All
    //===========================================================

    Task<IReadOnlyList<global::AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup>>
        GetAllAsync();



    //===========================================================
    // Get By Id
    //===========================================================

    Task<global::AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup?>
        GetByIdAsync
    (
        long id
    );



    //===========================================================
    // Create
    //===========================================================

    Task<long>
        CreateAsync
    (
        global::AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup entity
    );



    //===========================================================
    // Update
    //===========================================================

    Task
        UpdateAsync
    (
        global::AppCore.Domain.Entities.Settings.AccountSettings.AccountGroup entity
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
    // Restore
    //===========================================================

    Task
        RestoreAsync
    (
        long id
    );



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