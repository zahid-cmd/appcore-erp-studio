//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.SalesOperations.MotorBikeSales;


//===============================================================
// Bike Deliveries repository (hand-written page, 2026-11-10)
//===============================================================

public interface IBikeDeliveriesRepository
{
    Task<BikeDeliveryDefaultsDto> GetDefaultsAsync();

    // tab : Pending / Delivered / Undone / All; branch : the login
    // branch (null = every branch)
    Task<BikeDeliveryListDto> GetListAsync(long? branchId, string tab, string search);

    // A new delivery of one sold bike
    Task<BikeDeliverySheetDto> GetSheetAsync(long salesInvoiceLineId, long? branchId);

    Task<BikeDeliveryDto> GetAsync(Guid publicId);

    Task<BikeDeliveryDto> CreateAsync(SaveBikeDeliveryDto dto, long? branchId, long userId);

    Task UndoAsync(Guid publicId, string reason, long userId);
}
