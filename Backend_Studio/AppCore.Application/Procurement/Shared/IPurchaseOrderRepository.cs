//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Procurement.Shared;


//===============================================================
// Purchase Orders Repository Interface : one for every Purchase
// Order page (MB / SP / AC); each page's interface inherits it
//===============================================================

public interface IPurchaseOrderRepository
{
    //===========================================================
    // Read
    //===========================================================

    Task<List<PurchaseOrderDto>> GetAllAsync(
        string pageType);

    Task<PurchaseOrderDto?> GetByIdAsync(
        long id);

    Task<PurchaseOrderDefaultsDto> GetDefaultsAsync(
        string pageType,
        long branchId,
        DateOnly orderDate);

    Task<List<PurchaseOrderLastTermsDto>> GetLastTermsAsync(
        string pageType,
        string supplierCode);


    //===========================================================
    // Draft
    //===========================================================

    Task<PurchaseOrderSavedDto> CreateAsync(
        CreatePurchaseOrderDto dto,
        long userId);

    Task UpdateAsync(
        UpdatePurchaseOrderDto dto,
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


    //===========================================================
    // List page (server paging) and Public Id
    //===========================================================

    // One page of the list plus the tab counts
    Task<AppCore.Application.Common.Paging.PagedResult<PurchaseOrderDto>> GetPagedAsync(
        string pageType,
        PurchaseOrderPageRequest request);

    // The suppliers on this page's live documents (filter options)
    Task<List<PurchaseOrderListSupplierDto>> GetListSuppliersAsync(
        string pageType);

    // Public Id -> internal id (live rows; null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);
}
