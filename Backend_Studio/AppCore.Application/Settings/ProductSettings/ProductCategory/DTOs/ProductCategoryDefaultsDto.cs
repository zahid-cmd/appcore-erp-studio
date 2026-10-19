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
    // Next Category Code of every Category Type
    // { "Motor Bikes": "MB-001", "Spare Parts": "SP-001",
    //   "Accessories": "AC-001" } — lets the form switch the code
    // instantly when the type changes.
    //===========================================================

    public Dictionary<string, string> TypeCodes
    {
        get;
        set;
    } = new();


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