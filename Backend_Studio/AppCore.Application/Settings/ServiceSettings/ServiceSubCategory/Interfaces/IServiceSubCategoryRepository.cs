//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Service Sub Category Repository Interface
//===============================================================

public interface IServiceSubCategoryRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<ServiceSubCategoryDto>> GetAllAsync();


    //===========================================================
    // Get By Id
    //===========================================================

    Task<ServiceSubCategoryDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateServiceSubCategoryDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateServiceSubCategoryDto dto,
        long userId);


    //===========================================================
    // Delete
    //===========================================================

    Task DeleteAsync(
        long id,
        long userId);


    //===========================================================
    // Restore
    //===========================================================

    Task<bool> RestoreAsync(
        long userId);


    //===========================================================
    // Exists
    //===========================================================

    Task<bool> ExistsAsync(
        long id);


    //===========================================================
    // Get Defaults
    // (live Service Categories with the next codes under each)
    //===========================================================

    Task<ServiceSubCategoryDefaultsDto> GetDefaultsAsync();
}