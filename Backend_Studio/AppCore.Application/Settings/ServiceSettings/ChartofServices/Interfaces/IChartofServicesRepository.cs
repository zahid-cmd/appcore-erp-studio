//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Settings.ServiceSettings.ChartOfServices.DTOs;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Chart of Services Repository Interface (read-only)
//===============================================================

public interface IChartOfServicesRepository
{
    //===========================================================
    // Tree : Category Type → Category → Sub Category, with
    // service counts
    //===========================================================

    Task<List<ChartOfServicesTypeDto>> GetTreeAsync();


    //===========================================================
    // Services of one Sub Category
    //===========================================================

    Task<List<ChartOfServicesDto>> GetSubCategoryServicesAsync(
        long subCategoryId);


    //===========================================================
    // All Services (printing)
    //===========================================================

    Task<List<ChartOfServicesDto>> GetAllServicesAsync();


    //===========================================================
    // Link Issues (broken / inconsistent links)
    //===========================================================

    Task<List<ChartOfServicesIssueDto>> GetIssuesAsync();


    //===========================================================
    // Sub Category Exists
    //===========================================================

    Task<bool> SubCategoryExistsAsync(
        long subCategoryId);
}