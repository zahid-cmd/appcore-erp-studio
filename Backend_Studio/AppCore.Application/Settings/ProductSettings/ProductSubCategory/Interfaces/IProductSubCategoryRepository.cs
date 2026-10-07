//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.ProductSettings.ProductSubCategory.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Product Sub Category Repository Interface
//===============================================================

public interface IProductSubCategoryRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<ProductSubCategoryDto>> GetAllAsync();


    //===========================================================
    // Get By Id
    //===========================================================

    Task<ProductSubCategoryDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateProductSubCategoryDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateProductSubCategoryDto dto,
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
    // Get Next Product Sub Category Code
    //===========================================================

    Task<string> GetNextCodeAsync(
        long productCategoryId);


    //===========================================================
    // Get Defaults
    //===========================================================

    Task<ProductSubCategoryDefaultsDto> GetDefaultsAsync(
        long productCategoryId);
}