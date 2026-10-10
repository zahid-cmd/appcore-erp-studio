//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ProductSettings;


//===============================================================
// Product Master
//===============================================================

public class ProductMaster
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


    //===========================================================
    // Basic Information
    //===========================================================

    public string SubCategoryCode
    {
        get;
        set;
    } = string.Empty;


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
    // Auto General Ledger Codes
    //===========================================================

    public string InventoryLedgerCode
    {
        get;
        set;
    } = string.Empty;


    public string WipLedgerCode
    {
        get;
        set;
    } = string.Empty;


    public string CogsLedgerCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Auto General Ledger Names
    //===========================================================

    public string InventoryLedgerName
    {
        get;
        set;
    } = string.Empty;


    public string WipLedgerName
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
    // (e.g. UnitId, Barcode, SalePrice, PurchasePrice, ReorderLevel)


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


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted
    {
        get;
        set;
    } = false;


    public long? DeletedBy
    {
        get;
        set;
    }


    public DateTime? DeletedDate
    {
        get;
        set;
    }


    //===========================================================
    // Audit Information
    //===========================================================

    public long CreatedBy
    {
        get;
        set;
    }


    public DateTime CreatedDate
    {
        get;
        set;
    }


    public long? ModifiedBy
    {
        get;
        set;
    }


    public DateTime? ModifiedDate
    {
        get;
        set;
    }
}