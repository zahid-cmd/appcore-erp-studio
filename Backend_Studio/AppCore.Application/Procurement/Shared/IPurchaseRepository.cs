//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Procurement.Shared;


//===============================================================
// Purchases repository : one engine for Purchases - MB / SP / AC
//
// Draft    : Create / Update / Delete / Restore
// Approve  : Draft → Approved (Post On Approval ON : → Posted)
// Return   : Approved → Draft
// Post     : Approved → Posted (journal, stock batches, VAT
//            register, PO billed)
// Cancel   : Approved / Posted, nothing received out / returned,
//            supplier payable still covers it → Cancelled
//            (reversing journal)
//===============================================================

public interface IPurchaseRepository
{
    Task<List<PurchaseDto>> GetAllAsync(
        string pageType);

    Task<PurchaseDto?> GetByIdAsync(
        long id);

    Task<PurchaseDefaultsDto> GetDefaultsAsync(
        string pageType,
        long branchId,
        DateOnly purchaseDate);

    Task<List<PurchaseOpenOrderDto>> GetOpenOrdersAsync(
        string pageType,
        string supplierCode,
        long? keepOrderId);

    Task<List<PurchaseOrderLastTermsDto>> GetLastTermsAsync(
        string pageType,
        string supplierCode);

    // Mushak 6.3 No : once per supplier in the financial year of
    // the purchase date
    Task<PurchaseMushakCheckDto> CheckMushakAsync(
        string supplierCode,
        string mushakNo,
        long branchId,
        DateOnly purchaseDate,
        long? purchaseId);

    // Unit Desk : bike numbers already on another purchase
    Task<List<PurchaseUnitTakenDto>> CheckUnitsAsync(
        PurchaseUnitCheckDto dto);

    // MB draft : the free accessories due on the bikes on the page
    Task<List<PurchaseAccessoryLineDto>> PreviewAccessoriesAsync(
        PurchaseAccessoryPreviewDto dto);

    Task<PurchaseSavedDto> CreateAsync(
        CreatePurchaseDto dto,
        long userId);

    Task UpdateAsync(
        UpdatePurchaseDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        string pageType,
        long userId);

    Task ApproveAsync(
        long id,
        long userId);

    Task ReturnToDraftAsync(
        long id,
        long userId);

    Task PostAsync(
        long id,
        long userId);

    Task CancelAsync(
        long id,
        CancelPurchaseDto dto,
        long userId);

    Task<bool> ExistsAsync(
        long id);


    //===========================================================
    // List page (server paging) and Public Id
    //===========================================================

    // One page of the list plus the tab counts
    Task<AppCore.Application.Common.Paging.PagedResult<PurchaseDto>> GetPagedAsync(
        string pageType,
        PurchasePageRequest request);

    // The suppliers on this page's live documents (filter options)
    Task<List<PurchaseListSupplierDto>> GetListSuppliersAsync(
        string pageType);

    // Public Id -> internal id (live rows; null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);
}
