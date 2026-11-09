/* ============================================================
   Customer Profiles
   Inbound : bought a bike from us   (CIB-000001)
   Outside : takes services only     (COS-000001)
============================================================ */

export type CustomerType =
    | 'Inbound'
    | 'Outside';


export interface Customer
{
    CustomerId:
        number;

    // The id used in links and API calls (uuid); '' before save
    PublicId:
        string;

    // Inbound / Outside
    CustomerType:
        CustomerType;

    // CIB-000001 (Inbound) / COS-000001 (Outside)
    CustomerCode:
        string;

    // COS code of an Outside customer converted to Inbound
    PreviousCode:
        string;

    CustomerName:
        string;

    // "<Customer Name> - <Phone 1>" : shown everywhere, the ledger name
    DisplayName:
        string;

    FatherName:
        string;

    MotherName:
        string;

    // "YYYY-MM-DD" or '' (Inbound only)
    DateOfBirth:
        string;

    // /uploads/customer-photos/... ('' when none)
    PhotoPath:
        string;

    // 11 digits starting 01, unique
    Phone1:
        string;

    Phone2:
        string;

    Email:
        string;

    // Inbound : 10 / 13 / 17 digits, unique
    NidNo:
        string;

    DrivingLicenseNo:
        string;

    PresentAddress:
        string;

    PermanentAddress:
        string;

    RegistrationAddress:
        string;

    // Optional, a Location (General Settings)
    LocationId:
        number | null;

    // GLR-... under SUB-002-002-005 Trade Receivables
    ReceivableLedgerCode:
        string;

    ReceivableLedgerName:
        string;

    // 0 = cash only
    CreditLimit:
        number;

    Remarks:
        string;

    IsActive:
        boolean;

    // Outside customer added at a sales counter (Add Customer on
    // Sales Invoices); shown as a "Walk-in" tag, can be cleared
    IsWalkIn:
        boolean;

    // Corporate / Institution (Inbound only) : no NID, Date of
    // Birth, Father's / Mother's Name; TIN / BIN instead
    IsCorporate:
        boolean;

    // 12 digits, optional (Corporate)
    TinNo:
        string;

    // 9 or 13 digits, optional (Corporate)
    BinNo:
        string;

    // Location display name (from the server)
    LocationName?:
        string;
}


/* ============================================================
   Create / Update Customer
   (code, display name and ledger are previews : the server
   builds them)
============================================================ */

export interface CreateCustomer
{
    // Inbound / Outside
    CustomerType:
        CustomerType;

    // CIB-000001 (Inbound) / COS-000001 (Outside)
    CustomerCode:
        string;

    // COS code of an Outside customer converted to Inbound
    PreviousCode:
        string;

    CustomerName:
        string;

    // "<Customer Name> - <Phone 1>" : shown everywhere, the ledger name
    DisplayName:
        string;

    FatherName:
        string;

    MotherName:
        string;

    // "YYYY-MM-DD" or '' (Inbound only)
    DateOfBirth:
        string;

    // /uploads/customer-photos/... ('' when none)
    PhotoPath:
        string;

    // 11 digits starting 01, unique
    Phone1:
        string;

    Phone2:
        string;

    Email:
        string;

    // Inbound : 10 / 13 / 17 digits, unique
    NidNo:
        string;

    DrivingLicenseNo:
        string;

    PresentAddress:
        string;

    PermanentAddress:
        string;

    RegistrationAddress:
        string;

    // Optional, a Location (General Settings)
    LocationId:
        number | null;

    // GLR-... under SUB-002-002-005 Trade Receivables
    ReceivableLedgerCode:
        string;

    ReceivableLedgerName:
        string;

    // 0 = cash only
    CreditLimit:
        number;

    Remarks:
        string;

    IsActive:
        boolean;

    // Create : kept only for Outside customers (normally false)
    // Update : false = clear the tag; null / missing = keep it
    IsWalkIn?:
        boolean | null;

    // Corporate / Institution (Inbound only), TIN, BIN
    IsCorporate:
        boolean;

    TinNo:
        string;

    BinNo:
        string;
}


/* ============================================================
   List page query (server-side pagination)
============================================================ */

export interface CustomerPageQuery
{
    page:number;

    pageSize:number;

    search:string;

    sort:string;

    dir:'asc' | 'desc';

    // Inbound / Outside (the tab)
    type:CustomerType;

    locationId:number | null;

    // true = Active, false = Inactive, null = all
    status:boolean | null;
}


export interface UpdateCustomer
extends CreateCustomer
{
    CustomerId:
        number;
}


/* ============================================================
   Location option (from the defaults call)
============================================================ */

export interface CustomerLocationOption
{
    LocationId:
        number;

    DisplayName:
        string;

    IsActive:
        boolean;
}


/* ============================================================
   Customer Profiles Defaults
============================================================ */

export interface CustomerProfilesDefaults
{
    NextInboundCode:
        string;

    NextOutsideCode:
        string;

    NextLedgerCode:
        string;

    ReceivableSubGroupCode:
        string;

    ReceivableSubGroupName:
        string;

    // Set when SUB-002-002-005 is missing / deleted
    ReceivableSubGroupMessage:
        string;

    Locations:
        CustomerLocationOption[];
}