//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings.ProductSubCategory.DTOs;


//===============================================================
// Product Sub Category Defaults DTO
//===============================================================

public class ProductSubCategoryDefaultsDto
{
    //===========================================================
    // Product Sub Category Code
    //===========================================================

    public string Code
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Inventory Sub Group Code
    //===========================================================

    public string InventorySubGroupCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // WIP Sub Group Code
    //===========================================================

    public string WipSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // COGS Sub Group Code
    //===========================================================

    public string CogsSubGroupCode
    {
        get;
        set;
    } = string.Empty;
}