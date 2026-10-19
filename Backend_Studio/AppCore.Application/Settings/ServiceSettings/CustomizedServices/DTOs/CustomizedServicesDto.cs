//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Customized Services DTO
//===============================================================

public class CustomizedServicesDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long CustomizedServiceId
    {
        get;
        set;
    }


    //===========================================================
    // Basic Information
    //===========================================================

    // OCS-001-001-00001 (central CodeGenerator), assigned on create
    public string ServiceCode
    {
        get;
        set;
    } = string.Empty;


    // A Customized Services sub category (locked after saving)
    public long ServiceSubCategoryId
    {
        get;
        set;
    }


    // Typed, unique among live rows (no brand : dealer level)
    public string ServiceName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Sub Category (display)
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
    // Rate & Time
    //===========================================================

    // Standard Time (Minutes), 1 - 1440
    public int StandardMinutes
    {
        get;
        set;
    }


    // Fixed charge for the service
    public decimal ServiceCharge
    {
        get;
        set;
    }


    //===========================================================
    // Income Ledger (General Ledger under the sub category's sub group)
    //===========================================================

    // GLR-ccc-ggg-sss-nnnnn, created on create
    public string IncomeLedgerCode
    {
        get;
        set;
    } = string.Empty;


    // Always equal to the Service Name
    public string IncomeLedgerName
    {
        get;
        set;
    } = string.Empty;


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