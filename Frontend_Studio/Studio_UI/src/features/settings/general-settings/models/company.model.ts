/* ============================================================
   Company
============================================================ */

export interface Company
{
    CompanyId:
        number;


    CompanyCode:
        string;


    CompanyName:
        string;


    CompanyShortName:
        string;


    //===========================================================
    // Address & Contact Information
    //===========================================================

    AddressLine1:
        string;


    AddressLine2:
        string;


    Phone:
        string;


    Mobile:
        string;


    Email:
        string;


    Website:
        string;


    //===========================================================
    // Business Information
    //===========================================================

    BINNo:
        string;


    OwnershipType:
        string;


    EconomicActivity:
        string;


    TINNo:
        string;


    TradeLicenseNo:
        string;


    //===========================================================
    // Configuration
    //===========================================================

    CompanyLogoPath:
        string;


    Remarks:
        string;


    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}



/* ============================================================
   Create Company
============================================================ */

export interface CreateCompany
{
    CompanyCode:
        string;


    CompanyName:
        string;


    CompanyShortName:
        string;


    //===========================================================
    // Address & Contact Information
    //===========================================================

    AddressLine1:
        string;


    AddressLine2:
        string;


    Phone:
        string;


    Mobile:
        string;


    Email:
        string;


    Website:
        string;


    //===========================================================
    // Business Information
    //===========================================================

    BINNo:
        string;


    OwnershipType:
        string;


    EconomicActivity:
        string;


    TINNo:
        string;


    TradeLicenseNo:
        string;


    //===========================================================
    // Configuration
    //===========================================================

    CompanyLogoPath:
        string;


    Remarks:
        string;


    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}



/* ============================================================
   Update Company
============================================================ */

export interface UpdateCompany
{
    CompanyId:
        number;


    CompanyCode:
        string;


    CompanyName:
        string;


    CompanyShortName:
        string;


    //===========================================================
    // Address & Contact Information
    //===========================================================

    AddressLine1:
        string;


    AddressLine2:
        string;


    Phone:
        string;


    Mobile:
        string;


    Email:
        string;


    Website:
        string;


    //===========================================================
    // Business Information
    //===========================================================

    BINNo:
        string;


    OwnershipType:
        string;


    EconomicActivity:
        string;


    TINNo:
        string;


    TradeLicenseNo:
        string;


    //===========================================================
    // Configuration
    //===========================================================

    CompanyLogoPath:
        string;


    Remarks:
        string;


    //===========================================================
    // Status
    //===========================================================

    IsActive:
        boolean;
}



/* ============================================================
   Company Defaults
============================================================ */

export interface CompanyDefaults
{
    Code:
        string;
}