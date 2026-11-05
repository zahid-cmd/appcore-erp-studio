//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.ProductSettings.ProductCategory.DTOs;


//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Common.Paging;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Product Category Repository Interface
//===============================================================

public interface IProductCategoryRepository
{
    //===========================================================
    // Get All
    //===========================================================

    Task<List<ProductCategoryDto>> GetAllAsync();


    // The list page : one page, filtered, sorted, with the counts

    Task<PagedResult<ProductCategoryDto>> GetPagedAsync(

        ProductCategoryPageRequest request);


    // Public Id -> internal id (live rows only; null = not found)

    Task<long?> GetIdByPublicIdAsync(

        Guid publicId);


    //===========================================================
    // Get By Id
    //===========================================================

    Task<ProductCategoryDto?> GetByIdAsync(
        long id);


    //===========================================================
    // Create
    //===========================================================

    Task<long> CreateAsync(
        CreateProductCategoryDto dto,
        long userId);


    //===========================================================
    // Update
    //===========================================================

    Task UpdateAsync(
        UpdateProductCategoryDto dto,
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
    // Get Next Product Category Code (MB-/SP-/AC-nnn per type;
    // '' when no Category Type is given)
    //===========================================================

    Task<string> GetNextCodeAsync(
        string? categoryType);


    //===========================================================
    // Get Defaults
    //===========================================================

    Task<ProductCategoryDefaultsDto> GetDefaultsAsync(
        string? categoryType);
}