//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ClientSettings;


//===============================================================
// Supplier Profiles Defaults DTO
//===============================================================

public class SupplierProfilesDefaultsDto
{
    //===========================================================
    // Next codes (preview)
    //===========================================================

    public string NextSupplierCode
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
    // Payable sub group (SUB-003-002-001, display)
    //===========================================================

    public string PayableSubGroupCode
    {
        get;
        set;
    } = string.Empty;


    public string PayableSubGroupName
    {
        get;
        set;
    } = string.Empty;


    // Set when the sub group is missing / deleted
    public string PayableSubGroupMessage
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Supplier Types (fixed)
    //===========================================================

    public List<string> SupplierTypes
    {
        get;
        set;
    } = new();


    //===========================================================
    // Supply Types (fixed)
    //===========================================================

    public List<string> SupplyTypes
    {
        get;
        set;
    } = new();


    //===========================================================
    // Brands (live; inactive ones only for records that use them)
    //===========================================================

    public List<SupplierProfilesBrandOptionDto> Brands
    {
        get;
        set;
    } = new();
}


//===============================================================
// Supplier Profiles : one brand option
//===============================================================

public class SupplierProfilesBrandOptionDto
{
    //===========================================================
    // Brand
    //===========================================================

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


    public bool IsActive
    {
        get;
        set;
    }
}