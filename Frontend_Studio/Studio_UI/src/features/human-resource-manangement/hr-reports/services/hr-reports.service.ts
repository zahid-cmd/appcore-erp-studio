//===============================================================
// Imports
//===============================================================

import
{
    Injectable,
    inject
}
from '@angular/core';

import
{
    HttpClient
}
from '@angular/common/http';

import
{
    Observable,
    map
}
from 'rxjs';

import
{
    environment
}
from '../../../../environments/environment';


//===============================================================
// HR Reports (Human Resource > HR Reports > Staff & Payroll
// Reports, hand-written page : NEVER run Code Sync for it; read
// only). Dates are yyyy-MM-dd ('' = none).
//===============================================================

export interface HrReportLookup
{
    Id: number;
    Name: string;
}

export interface HrReportLookups
{
    Branches: HrReportLookup[];
    Departments: HrReportLookup[];
    Years: number[];
}

export interface StaffListRow
{
    Code: string;
    FullName: string;
    DesignationName: string;
    DepartmentName: string;
    BranchName: string;
    ShiftName: string;
    EmploymentType: string;
    JoiningDate: string;
    ConfirmationDate: string;
    Gender: string;
    DateOfBirth: string;
    BloodGroup: string;
    MobileNo: string;
    NationalId: string;
    PaymentMode: string;
    PaymentAccount: string;
    GrossSalary: number;
    IsActive: boolean;
}

export interface LeaveBalanceType
{
    LeaveTypeId: number;
    Name: string;
    ShortName: string;
    // 0 = no limit
    DaysPerYear: number;
}

export interface LeaveBalanceCell
{
    Applies: boolean;
    Used: number;
    Remaining: number;
}

export interface LeaveBalanceRow
{
    Code: string;
    FullName: string;
    DesignationName: string;
    Cells: LeaveBalanceCell[];
    TotalUsed: number;
}

export interface LeaveBalanceReport
{
    Year: number;
    // The leave year is a financial year : its name and its days
    YearName: string;
    FromDate: string;
    ToDate: string;
    LeaveTypes: LeaveBalanceType[];
    Rows: LeaveBalanceRow[];
}

export interface SalaryRegisterRow
{
    Code: string;
    FullName: string;
    DesignationName: string;
    // January first (12 values)
    Net: number[];
    TotalGross: number;
    TotalEarned: number;
    TotalDeductions: number;
    TotalNet: number;
}

export interface SalaryRegisterReport
{
    Year: number;
    // '' / Draft / Approved / Posted / Mixed, January first
    MonthStatus: string[];
    Rows: SalaryRegisterRow[];
}


//===============================================================
// Read helpers (PascalCase or camelCase from the API)
//===============================================================

const pick =
    (x: any, name: string): any =>
        x?.[name] ?? x?.[name.charAt(0).toLowerCase() + name.slice(1)];

const text =
    (x: any, name: string): string =>
        String(pick(x, name) ?? '');

const num =
    (x: any, name: string): number =>
        Number(pick(x, name) ?? 0) || 0;

const list =
    (x: any, name: string): any[] =>
    {
        const value = pick(x, name);
        return Array.isArray(value) ? value : [];
    };

const lookups =
    (x: any, name: string): HrReportLookup[] =>
        list(x, name).map(l => ({ Id:num(l, 'Id'), Name:text(l, 'Name') }));


//===============================================================
// HR Reports Service :
// api/human-resource-manangement/hr-reports/staff-payroll-reports
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class HrReportsService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/human-resource-manangement/hr-reports/staff-payroll-reports`;

    getLookups():
        Observable<HrReportLookups>
    {
        return this.http
            .get<any>(`${this.apiUrl}/lookups`)
            .pipe(
                map(x => ({
                    Branches:lookups(x, 'Branches'),
                    Departments:lookups(x, 'Departments'),
                    Years:list(x, 'Years').map(y => Number(y) || 0).filter(y => y > 0)
                })));
    }

    getStaffList(branchId: number, departmentId: number, status: string):
        Observable<StaffListRow[]>
    {
        const params =
        {
            branchId:String(branchId || 0),
            departmentId:String(departmentId || 0),
            status
        };

        return this.http
            .get<any[]>(`${this.apiUrl}/staff-list`, { params })
            .pipe(
                map(rows =>
                    (Array.isArray(rows) ? rows : []).map(x => ({
                        Code:text(x, 'Code'),
                        FullName:text(x, 'FullName'),
                        DesignationName:text(x, 'DesignationName'),
                        DepartmentName:text(x, 'DepartmentName'),
                        BranchName:text(x, 'BranchName'),
                        ShiftName:text(x, 'ShiftName'),
                        EmploymentType:text(x, 'EmploymentType'),
                        JoiningDate:text(x, 'JoiningDate'),
                        ConfirmationDate:text(x, 'ConfirmationDate'),
                        Gender:text(x, 'Gender'),
                        DateOfBirth:text(x, 'DateOfBirth'),
                        BloodGroup:text(x, 'BloodGroup'),
                        MobileNo:text(x, 'MobileNo'),
                        NationalId:text(x, 'NationalId'),
                        PaymentMode:text(x, 'PaymentMode'),
                        PaymentAccount:text(x, 'PaymentAccount'),
                        GrossSalary:num(x, 'GrossSalary'),
                        IsActive:pick(x, 'IsActive') !== false
                    }))));
    }

    getLeaveBalance(year: number, branchId: number):
        Observable<LeaveBalanceReport>
    {
        const params =
        {
            year:String(year),
            branchId:String(branchId || 0)
        };

        return this.http
            .get<any>(`${this.apiUrl}/leave-balance`, { params })
            .pipe(
                map(x => ({
                    Year:num(x, 'Year'),
                    YearName:text(x, 'YearName'),
                    FromDate:text(x, 'FromDate'),
                    ToDate:text(x, 'ToDate'),
                    LeaveTypes:list(x, 'LeaveTypes').map(t => ({
                        LeaveTypeId:num(t, 'LeaveTypeId'),
                        Name:text(t, 'Name'),
                        ShortName:text(t, 'ShortName'),
                        DaysPerYear:num(t, 'DaysPerYear')
                    })),
                    Rows:list(x, 'Rows').map(r => ({
                        Code:text(r, 'Code'),
                        FullName:text(r, 'FullName'),
                        DesignationName:text(r, 'DesignationName'),
                        Cells:list(r, 'Cells').map(c => ({
                            Applies:pick(c, 'Applies') !== false,
                            Used:num(c, 'Used'),
                            Remaining:num(c, 'Remaining')
                        })),
                        TotalUsed:num(r, 'TotalUsed')
                    }))
                })));
    }

    getSalaryRegister(year: number, branchId: number, postedOnly: boolean):
        Observable<SalaryRegisterReport>
    {
        const params =
        {
            year:String(year),
            branchId:String(branchId || 0),
            postedOnly:String(postedOnly)
        };

        return this.http
            .get<any>(`${this.apiUrl}/salary-register`, { params })
            .pipe(
                map(x => ({
                    Year:num(x, 'Year'),
                    MonthStatus:list(x, 'MonthStatus').map(s => String(s ?? '')),
                    Rows:list(x, 'Rows').map(r => ({
                        Code:text(r, 'Code'),
                        FullName:text(r, 'FullName'),
                        DesignationName:text(r, 'DesignationName'),
                        Net:list(r, 'Net').map(n => Number(n) || 0),
                        TotalGross:num(r, 'TotalGross'),
                        TotalEarned:num(r, 'TotalEarned'),
                        TotalDeductions:num(r, 'TotalDeductions'),
                        TotalNet:num(r, 'TotalNet')
                    }))
                })));
    }
}
