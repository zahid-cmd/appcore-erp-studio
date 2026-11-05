//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ProductSettings;


//===============================================================
// Product Category
//===============================================================

public class ProductCategory
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long ProductCategoryId
    {
        get;
        set;
    }


    // The id used in links and API calls (uuid v7)
    public Guid PublicId { get; set; } = Guid.CreateVersion7();


    //===========================================================
    // Basic Information
    //===========================================================

    public string CategoryCode
    {
        get;
        set;
    } = string.Empty;


    // Built by the server : "<Brand Name> <Category Type>"
    public string CategoryName
    {
        get;
        set;
    } = string.Empty;


    // Motor Bikes / Spare Parts / Accessories
    public string CategoryType
    {
        get;
        set;
    } = string.Empty;


    // Brand Management (BrandManagements.BrandManagementId).
    // Nullable only for rows saved before this field existed.
    public long? BrandManagementId
    {
        get;
        set;
    }


    //===========================================================
    // Inventory Account Groups
    //===========================================================

    public string InventoryGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string WipGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string CogsGroupCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Inventory Account Group Names
    //===========================================================

    public string InventoryGroupName
    {
        get;
        set;
    } = string.Empty;


    public string WipGroupName
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
    // Sales Account Group (2026-11-04) : GRP-ccc-ggg in the
    // type's sales class (CLS-005 / 006 / 008)
    //===========================================================

    public string SalesGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string SalesGroupName
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