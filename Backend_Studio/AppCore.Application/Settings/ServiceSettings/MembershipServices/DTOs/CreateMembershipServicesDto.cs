//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ServiceSettings;


//===============================================================
// Create Membership Services DTO
//===============================================================

public class CreateMembershipServicesDto
{
    //===========================================================
    // Basic Information
    //===========================================================

    // Preview only : the server assigns MSC-...
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


    public string MembershipType
    {
        get;
        set;
    } = string.Empty;


    public string ServiceName
    {
        get;
        set;
    } = string.Empty;


    // Preview only : built by the server
    public string DisplayName
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Service Value
    //===========================================================

    public decimal ServiceValue
    {
        get;
        set;
    }


    //===========================================================
    // Ledgers (preview only)
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


    public string ExpenseLedgerCode
    {
        get;
        set;
    } = string.Empty;


    public string ExpenseLedgerName
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