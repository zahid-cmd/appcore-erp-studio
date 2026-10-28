//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.ActivityHistory.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Procurement.MotorBikePurchase;


//===============================================================
// IPurchaseAdjustmentsMbRepository
//===============================================================

public interface IPurchaseAdjustmentsMbRepository
{

    //===========================================================
    // Get All
    //===========================================================

    Task<IReadOnlyList<global::AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchaseAdjustmentsMb>>
        GetAllAsync();



    //===========================================================
    // Get By Id
    //===========================================================

    Task<global::AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchaseAdjustmentsMb?>
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
        global::AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchaseAdjustmentsMb entity
    );



    //===========================================================
    // Update
    //===========================================================

    Task
        UpdateAsync
    (
        global::AppCore.Domain.Entities.Procurement.MotorBikePurchase.PurchaseAdjustmentsMb entity
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