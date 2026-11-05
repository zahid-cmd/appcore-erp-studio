//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.ActivityHistory.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.StockMovement;


//===============================================================
// Product Transfer repository
//===============================================================

public interface IProductTransferRepository
{
    // type '' = every type; deleted drafts included (Restore)
    Task<List<ProductTransferListRowDto>> GetAllAsync(string? pageType);

    // currentBranchId : the login's branch (CanReceive)
    Task<ProductTransferDto?> GetByIdAsync(long id, long currentBranchId);

    Task<ProductTransferDefaultsDto> GetDefaultsAsync(string pageType, long currentBranchId);

    // Products with stock on hand in a warehouse (batches, bikes)
    Task<List<ProductTransferStockProductDto>> GetStockAsync(string pageType, long warehouseId);

    // Saved places of the products and the racks of a warehouse
    Task<ProductTransferPlacesDto> GetPlacesAsync(string pageType, long warehouseId, string? productIds);

    // Draft : the new id
    Task<long> CreateAsync(CreateProductTransferDto dto, long userId);

    Task UpdateAsync(long id, UpdateProductTransferDto dto, long userId);

    Task DeleteAsync(long id, long userId);

    Task RestoreAsync(long id, long userId);

    // Same branch → Completed; other branch → In Transit (Send)
    Task<string> PostAsync(long id, long userId);

    // Destination branch only
    Task ReceiveAsync(long id, ReceiveProductTransferDto dto, long currentBranchId, long userId);

    Task CancelAsync(long id, CancelProductTransferDto dto, long userId);

    Task<IReadOnlyList<ActivityHistoryDto>> GetHistoryAsync();

    Task<IReadOnlyList<ActivityHistoryDto>> GetEntityHistoryAsync(long id);

    // Public Id -> internal id (null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);

    // One page of the list plus the tab / type counts
    Task<AppCore.Application.Common.Paging.PagedResult<ProductTransferListRowDto>> GetPagedAsync(
        ProductTransferPageRequest request);
}
