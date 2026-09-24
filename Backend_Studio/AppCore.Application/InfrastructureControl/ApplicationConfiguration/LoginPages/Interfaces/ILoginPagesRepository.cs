//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.ActivityHistory.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InfrastructureControl.ApplicationConfiguration;


//===============================================================
// ILoginPagesRepository
//===============================================================

public interface ILoginPagesRepository
{

    //===========================================================
    // Get All
    //===========================================================

    Task<IReadOnlyList<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages>>
        GetAllAsync();



    //===========================================================
    // Get By Id
    //===========================================================

    Task<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages?>
        GetByIdAsync
    (
        long id
    );



    //===========================================================
    // Get Active
    //===========================================================

    Task<global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages?>
        GetActiveAsync();



    //===========================================================
    // Get Defaults
    //===========================================================

    Task<LoginPagesDefaultsDto>
        GetDefaultsAsync();



    //===========================================================
    // Create
    //===========================================================

    Task<long>
        CreateAsync
    (
        global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages entity
    );



    //===========================================================
    // Update
    //===========================================================

    Task
        UpdateAsync
    (
        global::AppCore.Domain.Entities.InfrastructureControl.ApplicationConfiguration.LoginPages entity
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

    Task<bool>
        RestoreAsync();



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