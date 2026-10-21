//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ClientSettings;


//===============================================================
// Customer Profiles Defaults DTO
//===============================================================

public class CustomerProfilesDefaultsDto
{
    //===========================================================
    // Next codes (preview)
    //===========================================================

    public string NextInboundCode
    {
        get;
        set;
    } = string.Empty;


    public string NextOutsideCode
    {
        get;
        set;
    } = string.Empty;


    public string NextLedgerCode
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Receivable sub group (SUB-002-002-005, display)
    //===========================================================

    public string ReceivableSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string ReceivableSubGroupName
    {
        get;
        set;
    } = string.Empty;


    // Set when the sub group is missing / deleted
    public string ReceivableSubGroupMessage
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Locations (live; inactive ones only for records that use them)
    //===========================================================

    public List<CustomerProfilesLocationOptionDto> Locations
    {
        get;
        set;
    } = new();
}


//===============================================================
// Customer Profiles : one location option
//===============================================================

public class CustomerProfilesLocationOptionDto
{
    //===========================================================
    // Location
    //===========================================================

    public long LocationId
    {
        get;
        set;
    }


    public string DisplayName
    {
        get;
        set;
    } = string.Empty;


    public bool IsActive
    {
        get;
        set;
    }
}