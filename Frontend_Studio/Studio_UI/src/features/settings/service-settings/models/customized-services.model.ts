/* ============================================================
   Customized Service
   (dealer level, any brand; one fixed charge)
============================================================ */

export interface CustomizedService
{
    CustomizedServiceId:
        number;

    // OCS-001-001-00001
    ServiceCode:
        string;

    //===========================================================
    // Sub Category (locked after saving)
    //===========================================================

    ServiceSubCategoryId:
        number;

    SubCategoryCode?:
        string;

    SubCategoryName?:
        string;

    //===========================================================
    // Service
    //===========================================================

    // Typed, unique
    ServiceName:
        string;

    StandardMinutes:
        number;

    ServiceCharge:
        number;

    //===========================================================
    // Income Ledger
    //===========================================================

    IncomeLedgerCode:
        string;

    IncomeLedgerName:
        string;

    Remarks:
        string;

    IsActive:
        boolean;
}


/* ============================================================
   Create / Update Customized Service
============================================================ */

export interface CreateCustomizedService
{
    ServiceCode:
        string;

    ServiceSubCategoryId:
        number;

    ServiceName:
        string;

    StandardMinutes:
        number;

    ServiceCharge:
        number;

    IncomeLedgerCode:
        string;

    IncomeLedgerName:
        string;

    Remarks:
        string;

    IsActive:
        boolean;
}


export interface UpdateCustomizedService
extends CreateCustomizedService
{
    CustomizedServiceId:
        number;
}


/* ============================================================
   Customized Services sub category option (with the next codes)
============================================================ */

export interface CustomizedServiceSubCategoryOption
{
    ServiceSubCategoryId:
        number;

    SubCategoryCode:
        string;

    SubCategoryName:
        string;

    CategoryName:
        string;

    IsActive:
        boolean;

    ItemCreationAllowed:
        boolean;

    NextServiceCode:
        string;

    NextIncomeLedgerCode:
        string;

    // Why no service can be added under it ('' when it can)
    Message:
        string;
}


/* ============================================================
   Customized Services Defaults
============================================================ */

export interface CustomizedServicesDefaults
{
    SubCategories:
        CustomizedServiceSubCategoryOption[];
}