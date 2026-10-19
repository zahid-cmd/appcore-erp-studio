//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.ProductSettings.ChartOfInventory.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings;


//===============================================================
// Chart of Inventory Repository Interface (read-only)
//===============================================================

public interface IChartOfInventoryRepository
{
    //===========================================================
    // Tree : Category Type → Category → Sub Category, with
    // product counts
    //===========================================================

    Task<List<ChartOfInventoryTypeDto>> GetTreeAsync();


    //===========================================================
    // Products of one Sub Category
    //===========================================================

    Task<List<ChartOfInventoryDto>> GetSubCategoryProductsAsync(
        long subCategoryId);


    //===========================================================
    // All Products (printing)
    //===========================================================

    Task<List<ChartOfInventoryDto>> GetAllProductsAsync();


    //===========================================================
    // Link Issues (broken / inconsistent links)
    //===========================================================

    Task<List<ChartOfInventoryIssueDto>> GetIssuesAsync();


    //===========================================================
    // Sub Category Exists
    //===========================================================

    Task<bool> SubCategoryExistsAsync(
        long subCategoryId);
}