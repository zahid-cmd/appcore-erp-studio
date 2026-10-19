//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Service Policy DTO
//===============================================================

public class ServicePolicyDto
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


    public string BrandName
    {
        get;
        set;
    } = string.Empty;


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


    public string AssociatedSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string AssociatedSubGroupName
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
    // Service Schedule (in order; row 1 is due after purchase)
    //===========================================================

    public List<ServicePolicyScheduleDto> Schedules
    {
        get;
        set;
    } = new();


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