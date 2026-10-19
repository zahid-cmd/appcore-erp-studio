//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ServiceSettings;


//===============================================================
// Service Sub Category
//
// Second level of the service structure :
//
//   Service Category  (Account Group)
//    +- Service Sub Category  (Account Sub Group)  <- this
//        +- service items  (General Ledgers, later)
//
// Every sub category owns one Account Sub Group under its
// category's Income Group, created / renamed / (de)activated /
// deleted / restored together with it.
//===============================================================

public class ServiceSubCategory
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

    // <Category Code>-sss, e.g. BRS-001-001 / DRS-001-002
    public string SubCategoryCode
    {
        get;
        set;
    } = string.Empty;


    // Parent Service Category (locked after saving)
    public long ServiceCategoryId
    {
        get;
        set;
    }


    // Brand Services        : Labor Chart / Scheduled Services
    // Differential Services : Customized Services / Membership Services
    // (locked after saving)
    public string SubCategoryType
    {
        get;
        set;
    } = string.Empty;


    // Brand Services : "<Brand> <Sub Category Type>" (built, follows brand renames)
    // Differential Services : typed
    public string SubCategoryName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Income Account Sub Group
    //===========================================================

    // SUB-ccc-ggg-sss under the category's Income Group
    public string IncomeSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    // Always equal to the Sub Category Name
    public string IncomeSubGroupName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

    // Service items (Labor Chart / Scheduled / Customized /
    // Membership Services) may be created under it
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