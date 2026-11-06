//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.ActivityHistory.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.PricingLabels;


//===============================================================
// Product Pricing (Price Change) repository
//===============================================================

public interface IProductPricingRepository
{
    // type '' = every type
    Task<List<ProductPricingDto>> GetAllAsync(string? pageType);

    // One list page : tab, type, search, sort on the server
    Task<AppCore.Application.Common.Paging.PagedResult<ProductPricingDto>> GetPagedAsync(
        AppCore.Application.InventoryManagement.InventoryDocumentPageRequest request);

    Task<ProductPricingDto?> GetByIdAsync(long id);

    Task<ProductPricingDefaultsDto> GetDefaultsAsync(string pageType);

    // Price List : the current MRP of every product of the type
    // (with or without stock), its cost and stock
    Task<PriceListDto> GetPriceListAsync(string pageType);

    // The in-stock batches of a product with the suggested MRP
    Task<ProductPricingBatchListDto> GetBatchesAsync(string pageType, long productId);

    // Excel import : the in-stock batches and last MRP of many
    // products at once (no suggestions)
    Task<List<ProductPricingBatchListDto>> GetStocksAsync(string pageType, List<long> productIds);

    // Excel import (Spare Parts / Lubricants) : groups, sub-groups,
    // units and the current branch's racks for parts not in the
    // database
    Task<NewItemSetupDto> GetNewItemSetupAsync(string pageType, long branchId);

    // New Pricing : the purchase invoices with received lines / one
    // invoice's received lines
    Task<List<ProductPricingInvoiceDto>> GetInvoicesAsync(string pageType);

    Task<ProductPricingInvoiceLinesDto> GetInvoiceAsync(string pageType, long purchaseId);

    Task<ProductPricingSavedDto> CreateAsync(CreateProductPricingDto dto, long userId);

    Task<ProductPricingSavedDto> UpdateAsync(long id, UpdateProductPricingDto dto, long userId);

    Task DeleteAsync(long id, long userId);

    Task<ProductPricingSavedDto> PostAsync(long id, long userId);

    Task CancelAsync(long id, CancelProductPricingDto dto, long userId);

    // The most recently deleted draft; false = none
    Task<bool> RestoreAsync(long userId);

    Task<IReadOnlyList<ActivityHistoryDto>> GetHistoryAsync();

    Task<IReadOnlyList<ActivityHistoryDto>> GetEntityHistoryAsync(long id);

    // Public Id -> internal id (null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);
}
