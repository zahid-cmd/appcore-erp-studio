//===============================================================
// Financial Year
//
// FinancialYearCode : system generated (FY-0001)
// FinancialYearName : system generated from the dates
//                     FY 2026-2027  (year crosses a calendar year)
//                     FY 2026       (January – December)
//
// StartDate / EndDate are plain dates "YYYY-MM-DD" (no time).
//===============================================================

export type FinancialYearStatus =
    | 'Open'
    | 'Closed'
    | 'Locked';

export interface FinancialYear
{
    FinancialYearId: number;

    FinancialYearCode: string;

    FinancialYearName: string;

    StartDate: string;

    EndDate: string;

    IsCurrent: boolean;

    YearStatus: FinancialYearStatus;

    Remarks: string;

    Status: boolean;
}


//===============================================================
// Create Financial Year
//===============================================================

export interface CreateFinancialYear
{
    FinancialYearCode: string;

    FinancialYearName: string;

    StartDate: string;

    EndDate: string;

    IsCurrent: boolean;

    YearStatus: FinancialYearStatus;

    Remarks: string;

    Status: boolean;
}


//===============================================================
// Update Financial Year
//===============================================================

export interface UpdateFinancialYear
extends CreateFinancialYear
{
    FinancialYearId: number;
}