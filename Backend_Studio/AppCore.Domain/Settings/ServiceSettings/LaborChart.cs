//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ServiceSettings;


//===============================================================
// Labor Chart
//
// One brand-controlled labour operation at one rate (another rate,
// e.g. for another CC range, is another row). Lives under the brand's
// "Labor Chart" Service Sub Category and owns one income General
// Ledger, created / renamed / (de)activated / deleted / restored
// with it.
//===============================================================

public class LaborChart
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long LaborChartId
    {
        get;
        set;
    }


    //===========================================================
    // Basic Information
    //===========================================================

    // BLC-001-001-00001 (central CodeGenerator), assigned on create
    public string LaborCode
    {
        get;
        set;
    } = string.Empty;


    // The brand's Labor Chart sub category (locked after saving)
    public long ServiceSubCategoryId
    {
        get;
        set;
    }


    // Brand of that sub category (for filters / names)
    public long BrandManagementId
    {
        get;
        set;
    }


    // Engine, Electrical, Brakes ... (fixed list)
    public string Section
    {
        get;
        set;
    } = string.Empty;


    // e.g. "Valve Clearance Adjustment"
    public string OperationName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Rate & Time
    //===========================================================

    // Model or CC range, e.g. "100-125cc", "All Models"
    public string AppliesTo
    {
        get;
        set;
    } = string.Empty;


    // Standard Time (Minutes), 1 - 1440
    public int StandardMinutes
    {
        get;
        set;
    }


    // Fixed charge for the operation
    public decimal ServiceCharge
    {
        get;
        set;
    }


    // "<Operation> (<Applies To>) - <Brand>" (built; follows brand renames)
    public string ServiceName
    {
        get;
        set;
    } = string.Empty;


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