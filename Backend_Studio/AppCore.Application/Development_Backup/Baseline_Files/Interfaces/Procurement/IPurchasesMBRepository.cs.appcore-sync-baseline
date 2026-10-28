//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.ActivityHistory.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Procurement.MotorBikePurchase;


//===============================================================
// IPurchasesMbRepository
//===============================================================

public interface IPurchasesMbRepository
{

    //===========================================================
    // Get All
    //===========================================================

    Task<IReadOnlyList<global::AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchasesMb>>
        GetAllAsync();



    //===========================================================
    // Get By Id
    //===========================================================

    Task<global::AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchasesMb?>
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
        global::AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchasesMb entity
    );



    //===========================================================
    // Update
    //===========================================================

    Task
        UpdateAsync
    (
        global::AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchasesMb entity
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