//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Procurement.MotorBikePurchase;


//===============================================================
// Purchase Orders Repository Interface (MB / SP / AC pages)
//===============================================================

public interface IPurchaseOrdersMbRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<PurchaseOrdersMbDto>> GetAllAsync(
        string pageType);

    Task<PurchaseOrdersMbDto?> GetByIdAsync(
        long id);

    Task<PurchaseOrdersMbDefaultsDto> GetDefaultsAsync(
        string pageType,
        long branchId,
        DateOnly orderDate);


    //===========================================================
    // Draft
    //===========================================================

    Task<PurchaseOrderSavedDto> CreateAsync(
        CreatePurchaseOrdersMbDto dto,
        long userId);

    Task UpdateAsync(
        UpdatePurchaseOrdersMbDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        string pageType,
        long userId);


    //===========================================================
    // Workflow
    //===========================================================

    Task ApproveAsync(
        long id,
        long userId);

    Task ReturnToDraftAsync(
        long id,
        long userId);

    Task PlaceAsync(
        long id,
        long userId);

    Task CloseShortAsync(
        long id,
        ClosePurchaseOrderDto dto,
        long userId);

    Task CancelAsync(
        long id,
        ClosePurchaseOrderDto dto,
        long userId);


    //===========================================================
    // Exists
    //===========================================================

    Task<bool> ExistsAsync(
        long id);
}