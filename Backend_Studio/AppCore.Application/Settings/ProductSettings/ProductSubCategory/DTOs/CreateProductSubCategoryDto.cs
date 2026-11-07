//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings.ProductSubCategory.DTOs;


//===============================================================
// Create Product Sub Category DTO
//===============================================================

public class CreateProductSubCategoryDto
{
    //===========================================================
    // Product Category
    //===========================================================

    public long ProductCategoryId
    {
        get;
        set;
    }


    //===========================================================
    // Bike Model (Motor Bikes categories only; the name is then
    // built as "Motor Bikes - <Brand> - <Model>")
    //===========================================================

    public long? BikeModelId
    {
        get;
        set;
    }


    //===========================================================
    // Basic Information
    //===========================================================

    public string SubCategoryCode
    {
        get;
        set;
    } = string.Empty;


    public string SubCategoryName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Inventory Sub Group
    //===========================================================

    public string InventorySubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string InventorySubGroupName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // WIP Sub Group
    //===========================================================

    public string WipSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string WipSubGroupName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // COGS Sub Group
    //===========================================================

    public string CogsSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string CogsSubGroupName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

    public bool SubCategoryCreationAllowed
    {
        get;
        set;
    }


    // Accessories only : For Sale / Additional Accessories /
    // Promotional Accessories
    public string AccessoryUse { get; set; } = "For Sale";

    public string Remarks
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Status
    //===========================================================

    public bool IsActive
    {
        get;
        set;
    } = true;
}