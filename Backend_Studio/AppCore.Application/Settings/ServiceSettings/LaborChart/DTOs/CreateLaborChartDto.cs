//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Create Labor Chart DTO
//===============================================================

public class CreateLaborChartDto
{
    //===========================================================
    // Basic Information
    //===========================================================

    // Preview only : the server assigns BLC-...
    public string LaborCode
    {
        get;
        set;
    } = string.Empty;


    public long ServiceSubCategoryId
    {
        get;
        set;
    }


    public string Section
    {
        get;
        set;
    } = string.Empty;


    public string OperationName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Rate & Time
    //===========================================================

    public string AppliesTo
    {
        get;
        set;
    } = string.Empty;


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


    // Preview only : built by the server
    public string ServiceName
    {
        get;
        set;
    } = string.Empty;


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