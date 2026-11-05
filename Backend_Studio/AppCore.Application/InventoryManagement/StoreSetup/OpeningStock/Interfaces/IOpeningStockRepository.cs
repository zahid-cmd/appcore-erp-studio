using AppCore.Application.Common.ActivityHistory.DTOs;

//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.InventoryManagement.StoreSetup;


//===============================================================
// Opening Stock repository
//===============================================================

public interface IOpeningStockRepository
{
    // type '' = every type
    Task<List<OpeningStockDto>> GetAllAsync(string? pageType);

    Task<OpeningStockDto?> GetByIdAsync(long id);

    Task<OpeningStockDefaultsDto> GetDefaultsAsync(string pageType);

    Task<List<OpeningStockUnitTakenDto>> CheckUnitsAsync(OpeningStockUnitCheckDto dto);

    Task<OpeningStockSavedDto> CreateAsync(CreateOpeningStockDto dto, long userId);

    Task<OpeningStockSavedDto> UpdateAsync(long id, UpdateOpeningStockDto dto, long userId);

    Task DeleteAsync(long id, long userId);

    Task<OpeningStockSavedDto> PostAsync(long id, long userId);

    Task CancelAsync(long id, CancelOpeningStockDto dto, long userId);

    // The most recently deleted draft back (false = none)
    Task<bool> RestoreAsync(long userId);

    Task<IReadOnlyList<ActivityHistoryDto>> GetHistoryAsync();

    Task<IReadOnlyList<ActivityHistoryDto>> GetEntityHistoryAsync(long id);

    // Public Id -> internal id (null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);
}
