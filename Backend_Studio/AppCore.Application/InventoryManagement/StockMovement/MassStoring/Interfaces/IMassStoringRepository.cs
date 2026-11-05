//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.ActivityHistory.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.StockMovement;


//===============================================================
// Mass Storing repository
//===============================================================

public interface IMassStoringRepository
{
    // type '' = every type; deleted drafts included (Restore)
    Task<List<MassStoringListRowDto>> GetAllAsync(string? pageType);

    Task<MassStoringDto?> GetByIdAsync(long id);

    Task<MassStoringDefaultsDto> GetDefaultsAsync(string pageType, long currentBranchId);

    // Grid rows : products with stock in the warehouse (or every
    // live product), plus (includePlaced) every product placed in
    // the warehouse; rackId > 0 : only the products on that rack
    // (any stock). Each with its current place.
    Task<List<MassStoringProductDto>> GetProductsAsync(string pageType, long warehouseId, bool includeNoStock, bool includePlaced, long? rackId);

    // Saved places and the racks / shelves of a warehouse
    Task<MassStoringPlacesDto> GetPlacesAsync(string pageType, long warehouseId);

    // Draft : the new id
    Task<long> CreateAsync(CreateMassStoringDto dto, long userId);

    Task UpdateAsync(long id, UpdateMassStoringDto dto, long userId);

    Task DeleteAsync(long id, long userId);

    Task RestoreAsync(long id, long userId);

    // Every line applied at once : the new status
    Task<string> PostAsync(long id, long userId);

    Task CancelAsync(long id, CancelMassStoringDto dto, long userId);

    Task<IReadOnlyList<ActivityHistoryDto>> GetHistoryAsync();

    Task<IReadOnlyList<ActivityHistoryDto>> GetEntityHistoryAsync(long id);

    // Public Id -> internal id (null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);

    // One page of the list plus the tab / type counts
    Task<AppCore.Application.Common.Paging.PagedResult<MassStoringListRowDto>> GetPagedAsync(
        MassStoringPageRequest request);
}
