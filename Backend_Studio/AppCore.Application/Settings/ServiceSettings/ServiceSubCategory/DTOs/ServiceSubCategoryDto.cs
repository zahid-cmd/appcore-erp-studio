//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Service Sub Category DTO
//===============================================================

public class ServiceSubCategoryDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long ServiceSubCategoryId
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


    public string SubCategoryType
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
    // Service Category (display)
    //===========================================================

    public long ServiceCategoryId
    {
        get;
        set;
    }


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


    public string CategoryType
    {
        get;
        set;
    } = string.Empty;


    public string BrandName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Income Account Sub Group
    //===========================================================

    // The category's Income Group (GRP-ccc-ggg)
    public string IncomeGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string IncomeSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string IncomeSubGroupName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

    public bool ItemCreationAllowed
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
    }


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