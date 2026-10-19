//===============================================================
// Namespace
//===============================================================

namespace AppCore.Domain.Entities.Settings.ServiceSettings;


//===============================================================
// Service Policy
//
// One policy per brand, declared FIRST : only brands with a policy
// can get a Brand Services category. It holds the warranty limit
// for free services (years or km, whichever comes first) and the
// template of free and paid services (ServicePolicySchedule rows,
// required). After a sale, each vehicle's own schedule will be
// built from it, starting at the sale date; a service taken late
// moves the later services forward from that date.
//
// Saving it creates the brand's Associated Ledger (free service
// claim receivable, "<Sub Group Name> - <Brand Name>") under the
// Associated Sub Group, which is the same for every policy.
// Warranty claims themselves belong to Warranty Management.
//===============================================================

public class ServicePolicy
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long ServicePolicyId
    {
        get;
        set;
    }


    //===========================================================
    // Basic Information
    //===========================================================

    // SVP-nnn
    public string PolicyCode
    {
        get;
        set;
    } = string.Empty;


    // One policy per brand
    public long BrandManagementId
    {
        get;
        set;
    }


    //===========================================================
    // Warranty Limit : every FREE service must be taken within
    // this period or this km, whichever comes first
    //===========================================================

    // Warranty period in years (industry standard), e.g. 3
    public int WarrantyYears
    {
        get;
        set;
    }


    // e.g. 40000
    public int WarrantyKm
    {
        get;
        set;
    }


    //===========================================================
    // Schedule Summary (counted from the schedule rows)
    //===========================================================

    // Number of Free rows
    public int FreeServiceCount
    {
        get;
        set;
    }


    // Number of Paid rows
    public int PaidServiceCount
    {
        get;
        set;
    }


    //===========================================================
    // Associated Ledger (the brand's free service claim receivable)
    //===========================================================

    // Associated Sub Group : one for ALL policies (fixed by the first policy)
    public long AssociatedSubGroupId
    {
        get;
        set;
    }


    // GLR-ccc-ggg-sss-nnnnn, General Ledger pattern
    public string AssociatedLedgerCode
    {
        get;
        set;
    } = string.Empty;


    // "<Sub Group Name> - <Brand Name>" (built live from the current names)
    public string AssociatedLedgerName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Configuration
    //===========================================================

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