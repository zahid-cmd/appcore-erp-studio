//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Bike Accessory Schemes Repository Interface
//===============================================================

public interface IBikeAccessorySchemesRepository
{
    // Every live scheme (lookups)
    Task<List<BikeAccessorySchemesDto>> GetAllAsync();

    // The list page : one page, filtered, sorted, with the counts
    Task<PagedResult<BikeAccessorySchemesDto>> GetPagedAsync(
        BikeAccessorySchemesPageRequest request);

    // Public Id -> internal id (live rows only; null = not found)
    Task<long?> GetIdByPublicIdAsync(
        Guid publicId);

    // With its models and items
    Task<BikeAccessorySchemesDto?> GetByIdAsync(
        long id);

    Task<long> CreateAsync(
        CreateBikeAccessorySchemesDto dto,
        long userId);

    Task UpdateAsync(
        UpdateBikeAccessorySchemesDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    // The most recently deleted scheme; false when none
    Task<bool> RestoreAsync(
        long userId);

    Task<string> GetNextCodeAsync();

    Task<BikeAccessorySchemesDefaultsDto> GetDefaultsAsync();
}
