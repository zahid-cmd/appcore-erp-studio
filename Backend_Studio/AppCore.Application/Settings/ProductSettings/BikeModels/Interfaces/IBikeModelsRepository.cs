//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Bike Models Repository Interface
//===============================================================

public interface IBikeModelsRepository
{
    // Every live model (dropdowns, lookups)
    Task<List<BikeModelsDto>> GetAllAsync();

    // The list page : one page, filtered, sorted, with the counts
    Task<PagedResult<BikeModelsDto>> GetPagedAsync(
        BikeModelsPageRequest request);

    // Public Id -> internal id (live rows only; null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);

    Task<BikeModelsDto?> GetByIdAsync(
        long id);

    Task<long> CreateAsync(
        CreateBikeModelsDto dto,
        long userId);

    Task UpdateAsync(
        UpdateBikeModelsDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    // The most recently deleted model; false when none
    Task<bool> RestoreAsync(
        long userId);

    Task<bool> ExistsAsync(
        long id);

    Task<string> GetNextCodeAsync();

    Task<BikeModelsDefaultsDto> GetDefaultsAsync();
}
