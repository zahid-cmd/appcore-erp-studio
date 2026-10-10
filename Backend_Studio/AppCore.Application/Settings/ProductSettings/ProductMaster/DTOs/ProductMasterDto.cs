//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings.ProductMaster.DTOs;


//===============================================================
// Product Master DTO
//===============================================================

public class ProductMasterDto
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


    public string ProductCategoryName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Product Sub Category
    //===========================================================

    public long ProductSubCategoryId
    {
        get;
        set;
    }


    public string ProductSubCategoryName
    {
        get;
        set;
    } = string.Empty;


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


    //===========================================================
    // Soft Delete
    //===========================================================

    public bool IsDeleted
    {
        get;
        set;
    }


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