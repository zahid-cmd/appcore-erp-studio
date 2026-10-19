//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Accessories Repository Interface
//===============================================================

public interface IAccessoriesRepository
{
    Task<List<AccessoriesDto>> GetAllAsync();

    Task<AccessoriesDto?> GetByIdAsync(
        long id);

    Task<long> CreateAsync(
        CreateAccessoriesDto dto,
        long userId);

    Task UpdateAsync(
        UpdateAccessoriesDto dto,
        long userId);

    Task DeleteAsync(
        long id,
        long userId);

    Task<bool> RestoreAsync(
        long userId);

    Task<bool> ExistsAsync(
        long id);


    //===========================================================
    // Code preview for a sub category ('' codes when none given)
    //===========================================================

    Task<AccessoriesDefaultsDto> GetDefaultsAsync(
        long productSubCategoryId);
}