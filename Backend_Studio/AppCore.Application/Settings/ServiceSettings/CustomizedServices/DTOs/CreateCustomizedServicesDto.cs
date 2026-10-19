//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Create Customized Services DTO
//===============================================================

public class CreateCustomizedServicesDto
{
    //===========================================================
    // Basic Information
    //===========================================================

    // Preview only : the server assigns OCS-...
    public string ServiceCode
    {
        get;
        set;
    } = string.Empty;


    public long ServiceSubCategoryId
    {
        get;
        set;
    }


    public string ServiceName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Rate & Time
    //===========================================================

    public int StandardMinutes
    {
        get;
        set;
    }


    public decimal ServiceCharge
    {
        get;
        set;
    }


    //===========================================================
    // Income Ledger (preview only)
    //===========================================================

    public string IncomeLedgerCode
    {
        get;
        set;
    } = string.Empty;


    public string IncomeLedgerName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Status & Control
    //===========================================================

    public string Remarks
    {
        get;
        set;
    } = string.Empty;


    public bool IsActive
    {
        get;
        set;
    } = true;
}