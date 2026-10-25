//===============================================================
// Namespace
//===============================================================

namespace AppCore.Application.Settings.ClientSettings;


//===============================================================
// Update Supplier Profiles DTO
//===============================================================

public class UpdateSupplierProfilesDto
{
    //===========================================================
    // Primary Key
    //===========================================================

    public long SupplierId
    {
        get;
        set;
    }


    //===========================================================
    // Supplier Information
    //===========================================================

    // SUP-000001 (central CodeGenerator), assigned on create
    public string SupplierCode
    {
        get;
        set;
    } = string.Empty;


    // Brand Distributor / Local Vendor / Service Provider
    public string SupplierType
    {
        get;
        set;
    } = string.Empty;


    // Motor Bikes / Spare Parts / Accessories / General : what this
    // supplier code supplies
    public string SupplyType
    {
        get;
        set;
    } = string.Empty;


    // CAPITAL LETTERS
    public string SupplierName
    {
        get;
        set;
    } = string.Empty;


    // "<SUPPLIER NAME> - <BRAND> - <PHONE 1>" (brand part only when a brand is set);
    // shown everywhere, the ledger's name
    public string DisplayName
    {
        get;
        set;
    } = string.Empty;


    // Optional, a Brand (Product Settings)
    public long? BrandManagementId
    {
        get;
        set;
    }


    //===========================================================
    // Contact
    //===========================================================

    // CAPITAL LETTERS, optional
    public string ContactPerson
    {
        get;
        set;
    } = string.Empty;


    // 11 digits starting 01, digits only; unique among live suppliers
    public string Phone1
    {
        get;
        set;
    } = string.Empty;


    // Optional, same format, not unique
    public string Phone2
    {
        get;
        set;
    } = string.Empty;


    // Optional
    public string Email
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Address & Legal
    //===========================================================

    // Required, CAPITAL LETTERS
    public string Address
    {
        get;
        set;
    } = string.Empty;


    // Optional
    public string TradeLicenseNo
    {
        get;
        set;
    } = string.Empty;


    // Optional, digits only, unique among live suppliers when given
    public string BinNo
    {
        get;
        set;
    } = string.Empty;


    // Optional, 12 digits, unique among live suppliers when given
    public string TinNo
    {
        get;
        set;
    } = string.Empty;


    //===========================================================
    // Accounts
    //===========================================================

    // GLR-ccc-ggg-sss-nnnnn under SUB-003-002-001 Liability For Purchase
    public string PayableLedgerCode
    {
        get;
        set;
    } = string.Empty;


    // Always equal to the Display Name
    public string PayableLedgerName
    {
        get;
        set;
    } = string.Empty;


    // Required, 0 = pay on purchase
    public int CreditDays
    {
        get;
        set;
    }


    //===========================================================
    // Remarks & Status
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