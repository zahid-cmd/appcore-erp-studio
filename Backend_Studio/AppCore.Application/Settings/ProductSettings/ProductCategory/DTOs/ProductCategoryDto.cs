//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ProductSettings.ProductCategory.DTOs;


//===============================================================
// Product Category DTO
//===============================================================

public class ProductCategoryDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long ProductCategoryId
    {
        get;
        set;
    }


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