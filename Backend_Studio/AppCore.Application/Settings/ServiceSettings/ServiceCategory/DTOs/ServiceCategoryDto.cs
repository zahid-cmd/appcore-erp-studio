//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Service Category DTO
//===============================================================

public class ServiceCategoryDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long ServiceCategoryId
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


    // Brand Services / Dealer Services
    public string CategoryType
    {
        get;
        set;
    } = string.Empty;


    public long? BrandManagementId
    {
        get;
        set;
    }


    public string BrandName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Income Account Group
    //===========================================================

    public string IncomeGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string IncomeGroupName
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