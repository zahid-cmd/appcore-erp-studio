//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Create Service Policy DTO
//===============================================================

public class CreateServicePolicyDto
{
    //===========================================================
    // Basic Information
    //===========================================================

    // SVP-nnn (preview only, built by the server)
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

    // Number of Free rows (preview only)
    public int FreeServiceCount
    {
        get;
        set;
    }


    // Number of Paid rows (preview only)
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


    // GLR-ccc-ggg-sss-nnnnn, General Ledger pattern (preview only)
    public string AssociatedLedgerCode
    {
        get;
        set;
    } = string.Empty;


    // "<Sub Group Name> - <Brand Name>" (preview only)
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
    // Service Schedule (in order; row 1 is due after purchase)
    //===========================================================

    public List<ServicePolicyScheduleDto> Schedules
    {
        get;
        set;
    } = new();
}