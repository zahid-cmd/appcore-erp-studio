//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.ActivityHistory.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.AccountSettings;


//===============================================================
// ICashAccountsRepository
//===============================================================

public interface ICashAccountsRepository
{

    //===========================================================
    // Get All
    //===========================================================

    Task<IReadOnlyList<global::AppCore.Domain.Entities.Settings.AccountSettings.CashAccounts>>
        GetAllAsync();



    //===========================================================
    // Get By Id
    //===========================================================

    Task<global::AppCore.Domain.Entities.Settings.AccountSettings.CashAccounts?>
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
        global::AppCore.Domain.Entities.Settings.AccountSettings.CashAccounts entity
    );



    //===========================================================
    // Update
    //===========================================================

    Task
        UpdateAsync
    (
        global::AppCore.Domain.Entities.Settings.AccountSettings.CashAccounts entity
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