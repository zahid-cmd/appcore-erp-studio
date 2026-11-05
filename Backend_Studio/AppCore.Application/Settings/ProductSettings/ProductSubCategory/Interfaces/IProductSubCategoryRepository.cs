//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.ProductSettings.ProductSubCategory.DTOs;


//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


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


    // The list page : one page, filtered, sorted, with the counts

    Task<PagedResult<ProductSubCategoryDto>> GetPagedAsync(

        ProductSubCategoryPageRequest request);


    // Public Id -> internal id (live rows only; null = not found)

    Task<long?> GetIdByPublicIdAsync(

        Guid publicId);


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