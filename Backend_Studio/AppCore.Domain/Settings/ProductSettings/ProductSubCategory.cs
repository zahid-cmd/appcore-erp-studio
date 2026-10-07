//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ProductSettings;


//===============================================================
// Product Sub Category
//===============================================================

public class ProductSubCategory
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long ProductSubCategoryId
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
    // Inventory Account Sub Groups
    //===========================================================

    public string InventorySubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string WipSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string CogsSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Inventory Account Sub Group Names
    //===========================================================

    public string InventorySubGroupName
    {
        get;
        set;
    } = string.Empty;


    public string WipSubGroupName
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
    } = true;


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