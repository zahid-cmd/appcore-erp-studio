//=============================================================== 
// Namespaces 
//=============================================================== 
 
using AppCore.Application.Common.ActivityHistory.DTOs; 
 
 
//=============================================================== 
// Namespace 
//=============================================================== 
 
namespace AppCore.Application.InfrastructureControl.ComponentManagement; 
 
 
//=============================================================== 
// IControlComponentsRepository 
//=============================================================== 
 
public interface IControlComponentsRepository 
{ 
 
    //=========================================================== 
    // Get All 
    //=========================================================== 
 
    Task<IReadOnlyList<global::AppCore.Domain.Entities.InfrastructureControl.ComponentManagement.ControlComponents>> 
        GetAllAsync(); 
 
 
 
    //=========================================================== 
    // Get By Id 
    //=========================================================== 
 
    Task<global::AppCore.Domain.Entities.InfrastructureControl.ComponentManagement.ControlComponents?> 
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
        global::AppCore.Domain.Entities.InfrastructureControl.ComponentManagement.ControlComponents entity 
    ); 
 
 
 
    //=========================================================== 
    // Update 
    //=========================================================== 
 
    Task 
        UpdateAsync 
    ( 
        global::AppCore.Domain.Entities.InfrastructureControl.ComponentManagement.ControlComponents entity 
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