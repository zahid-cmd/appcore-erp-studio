//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings.ProductMaster.DTOs;


//===============================================================
// Update Product Master DTO
//===============================================================

public class UpdateProductMasterDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long ProductMasterId
    {
        get;
        set;
    }


    //===========================================================
    // Product Category
    //===========================================================

    public long ProductCategoryId
    {
        get;
        set;
    }


    //===========================================================
    // Product Sub Category
    //===========================================================

    public long ProductSubCategoryId
    {
        get;
        set;
    }


    public string SubCategoryCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Basic Information
    //===========================================================

    public string ProductCode
    {
        get;
        set;
    } = string.Empty;


    public string ProductName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Inventory Ledger
    //===========================================================

    public string InventoryLedgerCode
    {
        get;
        set;
    } = string.Empty;


    public string InventoryLedgerName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // WIP Ledger
    //===========================================================

    public string WipLedgerCode
    {
        get;
        set;
    } = string.Empty;


    public string WipLedgerName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // COGS Ledger
    //===========================================================

    public string CogsLedgerCode
    {
        get;
        set;
    } = string.Empty;


    public string CogsLedgerName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

    // TODO: Add Product Master specific configuration fields here


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