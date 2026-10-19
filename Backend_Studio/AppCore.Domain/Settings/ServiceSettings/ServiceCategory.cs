//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ServiceSettings;


//===============================================================
// Service Category
//
// Two kinds :
//   Brand Services  : one per brand, name "<Brand> Services",
//                     sub categories Labor Chart / Scheduled Services
//   Dealer Services : no brand, typed name,
//                     sub categories Customized / Membership Services
//
// Every category owns one Account Group under the Income class
// (GRP-ccc-ggg), created / renamed / (de)activated / deleted /
// restored together with the category.
//===============================================================

public class ServiceCategory
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

    // SV-nnn
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


    // Brand Services / Dealer Services (locked after saving)
    public string CategoryType
    {
        get;
        set;
    } = string.Empty;


    // Brand Services only (null for Dealer Services)
    public long? BrandManagementId
    {
        get;
        set;
    }


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