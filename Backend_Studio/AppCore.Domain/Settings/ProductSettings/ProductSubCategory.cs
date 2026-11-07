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


    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();


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
    // Sales Account Sub Group (2026-11-04) : SUB-ccc-ggg-sss
    // under the category's sales group
    //===========================================================

    public string SalesSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string SalesSubGroupName
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


    // Accessories categories only : For Sale (default) /
    // Additional Accessories / Promotional Accessories. Its
    // products take this use.
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