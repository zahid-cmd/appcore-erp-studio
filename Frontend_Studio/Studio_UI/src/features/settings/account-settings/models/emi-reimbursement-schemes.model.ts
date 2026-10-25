/* ============================================================
   EMI Reimbursement Schemes

   Per brand : how much of the showroom's share of the EMI-sale
   charges the brand's Motor Bikes Supplier pays back.
     Swap / EMI charge : Basis Percent (% of the showroom's share)
                         or Fixed (Tk per sale) + Value [+ Cap]
     Total Cap         : swap + EMI claim together, per sale
   Caps : null = no limit. Tenure : 0 = all tenures.
============================================================ */

export type EmiSchemeBasis =
    'Percent'
    |
    'Fixed';

export interface EmiReimbursementSchemes
{
    EmiReimbursementSchemeId:
        number;

    // ERS-0001
    SchemeCode:
        string;

    // Brand Management → BrandCode
    BrandCode:
        string;

    BrandName:
        string;

    // The brand's Motor Bikes Supplier (read only)
    SupplierCode:
        string;

    SupplierName:
        string;

    // yyyy-MM-dd; ValidTo '' = open ended
    ValidFrom:
        string;

    ValidTo:
        string;

    // 0 = all tenures
    TenureMonths:
        number;

    IsExpired:
        boolean;

    IsUpcoming:
        boolean;

    SwapBasis:
        EmiSchemeBasis;

    SwapValue:
        number;

    SwapCap:
        number | null;

    EmiBasis:
        EmiSchemeBasis;

    EmiValue:
        number;

    EmiCap:
        number | null;

    TotalCap:
        number | null;

    Remarks:
        string;

    Status:
        boolean;
}


/* ============================================================
   Create / Update (code is set by the server; brand locked
   after saving)
============================================================ */

export interface CreateEmiReimbursementSchemes
{
    BrandCode:
        string;

    ValidFrom:
        string;

    ValidTo:
        string;

    TenureMonths:
        number;

    SwapBasis:
        EmiSchemeBasis;

    SwapValue:
        number;

    SwapCap:
        number | null;

    EmiBasis:
        EmiSchemeBasis;

    EmiValue:
        number;

    EmiCap:
        number | null;

    TotalCap:
        number | null;

    Remarks:
        string;

    Status:
        boolean;
}

export interface UpdateEmiReimbursementSchemes
extends CreateEmiReimbursementSchemes
{
    EmiReimbursementSchemeId:
        number;
}


/* ============================================================
   Defaults
============================================================ */

export interface EmiSchemeBrandOption
{
    BrandCode:
        string;

    BrandName:
        string;

    IsActive:
        boolean;

    // '' when the brand has no Motor Bikes Supplier
    SupplierCode:
        string;

    SupplierName:
        string;
}

export interface EmiReimbursementSchemesDefaults
{
    Code:
        string;

    Brands:
        EmiSchemeBrandOption[];

    // 0 = All
    Tenures:
        number[];

    Bases:
        string[];

    // Asia/Dhaka, yyyy-MM-dd
    Today:
        string;
}