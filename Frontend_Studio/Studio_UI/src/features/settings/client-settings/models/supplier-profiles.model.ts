/* ============================================================
   Supplier Profiles
   (brand distributors, local vendors, service providers)
============================================================ */

export interface Supplier
{
    SupplierId:
        number;

    // SUP-000001 (central code generator)
    SupplierCode:
        string;

    // Brand Distributor / Local Vendor / Service Provider
    SupplierType:
        string;

    // Motor Bikes / Spare Parts / Accessories / General
    SupplyType:
        string;

    // CAPITAL LETTERS
    SupplierName:
        string;

    // "<SUPPLIER NAME> - <BRAND> - <SUPPLY TYPE> - <PHONE 1>" (brand part only when set)
    DisplayName:
        string;

    // Optional, a Brand (Product Settings)
    BrandManagementId:
        number | null;

    ContactPerson:
        string;

    // 11 digits starting 01, unique among suppliers
    Phone1:
        string;

    Phone2:
        string;

    Email:
        string;

    Address:
        string;

    TradeLicenseNo:
        string;

    // Optional, 9 - 13 digits, unique
    BinNo:
        string;

    // Optional, 12 digits, unique
    TinNo:
        string;

    // GLR-... under SUB-003-002-001 Liability For Purchase
    PayableLedgerCode:
        string;

    PayableLedgerName:
        string;

    // Required, 0 = pay on purchase
    CreditDays:
        number;

    Remarks:
        string;

    IsActive:
        boolean;

    // Brand name (from the server)
    BrandName?:
        string;
}


/* ============================================================
   Create / Update Supplier
   (code, display name and ledger are previews : the server
   builds them)
============================================================ */

export interface CreateSupplier
{
    // SUP-000001 (central code generator)
    SupplierCode:
        string;

    // Brand Distributor / Local Vendor / Service Provider
    SupplierType:
        string;

    // Motor Bikes / Spare Parts / Accessories / General
    SupplyType:
        string;

    // CAPITAL LETTERS
    SupplierName:
        string;

    // "<SUPPLIER NAME> - <BRAND> - <SUPPLY TYPE> - <PHONE 1>" (brand part only when set)
    DisplayName:
        string;

    // Optional, a Brand (Product Settings)
    BrandManagementId:
        number | null;

    ContactPerson:
        string;

    // 11 digits starting 01, unique among suppliers
    Phone1:
        string;

    Phone2:
        string;

    Email:
        string;

    Address:
        string;

    TradeLicenseNo:
        string;

    // Optional, 9 - 13 digits, unique
    BinNo:
        string;

    // Optional, 12 digits, unique
    TinNo:
        string;

    // GLR-... under SUB-003-002-001 Liability For Purchase
    PayableLedgerCode:
        string;

    PayableLedgerName:
        string;

    // Required, 0 = pay on purchase
    CreditDays:
        number;

    Remarks:
        string;

    IsActive:
        boolean;
}


export interface UpdateSupplier
extends CreateSupplier
{
    SupplierId:
        number;
}


/* ============================================================
   Brand option (from the defaults call)
============================================================ */

export interface SupplierBrandOption
{
    BrandManagementId:
        number;

    BrandName:
        string;

    IsActive:
        boolean;
}


/* ============================================================
   Supplier Profiles Defaults
============================================================ */

export interface SupplierProfilesDefaults
{
    NextSupplierCode:
        string;

    NextLedgerCode:
        string;

    PayableSubGroupCode:
        string;

    PayableSubGroupName:
        string;

    // Set when SUB-003-002-001 is missing / deleted
    PayableSubGroupMessage:
        string;

    SupplierTypes:
        string[];

    SupplyTypes:
        string[];

    Brands:
        SupplierBrandOption[];
}