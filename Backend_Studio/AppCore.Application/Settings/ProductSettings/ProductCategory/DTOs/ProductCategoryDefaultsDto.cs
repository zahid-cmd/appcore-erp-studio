//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings.ProductCategory.DTOs;


//===============================================================
// Product Category Defaults DTO
//===============================================================

public class ProductCategoryDefaultsDto
{
    //===========================================================
    // Product Category Code
    //===========================================================

    public string Code
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Inventory Group Code
    //===========================================================

    public string InventoryGroupCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // WIP Group Code
    //===========================================================

    public string WipGroupCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // COGS Group Code
    //===========================================================

    public string CogsGroupCode
    {
        get;
        set;
    } = string.Empty;
}