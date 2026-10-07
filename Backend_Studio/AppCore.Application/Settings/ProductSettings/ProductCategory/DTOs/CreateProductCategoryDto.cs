//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings.ProductCategory.DTOs;


//===============================================================
// Create Product Category DTO
//===============================================================

public class CreateProductCategoryDto
{
    //===========================================================
    // Basic Information
    //===========================================================

    public string CategoryCode
    {
        get;
        set;
    } = string.Empty;


    public string CategoryName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Inventory Group
    //===========================================================

    public string InventoryGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string InventoryGroupName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // WIP Group
    //===========================================================

    public string WipGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string WipGroupName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // COGS Group
    //===========================================================

    public string CogsGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string CogsGroupName
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