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
    HttpClient,
    HttpParams
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
// Leave Encashments and Festival Bonus (Payroll Management).
// Dates : yyyy-MM-dd.
//===============================================================

// A leave type of an encashment
export interface LeaveEncashmentLine
{
    LeaveTypeId: number;
    LeaveTypeName: string;
    Entitled: number;
    // Taken and applied for
    Used: number;
    Days: number;
    Amount: number;
}

export interface LeaveEncashment
{
    // The leave types it covers (all that can be encashed)
    Lines: LeaveEncashmentLine[];
    PublicId: string;
    Code: string;
    EmployeeId: number;
    EmployeeCode: string;
    EmployeeName: string;
    BranchId: number;
    BranchName: string;
    LeaveTypeId: number;
    LeaveTypeName: string;
    // The leave year the days belong to : a financial year, by the
    // calendar year it starts in, and its name
    LeaveYear: number;
    LeaveYearName: string;
    EncashDate: string;
    Days: number;
    // Basic / Gross
    RateBase: string;
    MonthDays: number;
    DayRate: number;
    Amount: number;
    // The leave encashment policy it was worked out with
    PolicyName: string;
    // Pending / Approved / Rejected
    Status: string;
    RejectReason: string;
    // Paid on Payroll Payments so far
    PaidAmount: number;
    Remarks: string;
    JournalVoucherNo: string;
}

export interface EncashEmployee
{
    Id: number;
    Code: string;
    Name: string;
    DesignationName: string;
    BasicSalary: number;
    GrossSalary: number;
}

export interface LeaveEncashmentDefaults
{
    NextCode: string;
    Year: number;
    // Day rate = salary / this
    MonthDays: number;
    Employees: EncashEmployee[];
}

// An encashable leave of an employee's year
export interface EncashBalance
{
    LeaveTypeId: number;
    Name: string;
    Entitled: number;
    Used: number;
    Pending: number;
    Encashed: number;
    Remaining: number;
    // What the policy lets encash of it now, and the money of that
    Encashable: number;
    Amount: number;
    // Why nothing can be encashed ('' : it can)
    Note: string;
}

// The leave an employee can encash for a leave year, by the
// employee's leave encashment policy (the profile's own, otherwise
// the Default)
export interface EncashEligibility
{
    Year: number;
    YearName: string;
    // The leave years (financial years) the policy lets encash now,
    // and their names
    Years: number[];
    YearNames: string[];
    LeaveEncashPolicyId: number;
    PolicyName: string;
    // The profile names it (false : it is the Default)
    IsOwnPolicy: boolean;
    RateBase: string;
    MonthDays: number;
    Salary: number;
    DayRate: number;
    // The policy in words
    Rules: string[];
    // Why the employee cannot encash at all ('' : the employee can)
    Problem: string;
    Rows: EncashBalance[];
}

export interface BonusSheetListItem
{
    PublicId: string;
    Code: string;
    Title: string;
    BranchId: number;
    BranchName: string;
    BonusDate: string;
    // The bonus structure it was made with (and what that said)
    BonusStructureId: number;
    StructureName: string;
    // Basic / Gross
    RateBase: string;
    // Joining / Confirmation
    ServiceFrom: string;
    BonusPercent: number;
    MinServiceMonths: number;
    // Draft / Posted
    Status: string;
    EmployeeCount: number;
    TotalAmount: number;
    // Paid on Payroll Payments so far
    PaidAmount: number;
    Remarks: string;
    JournalVoucherNo: string;
}

export interface BonusSheetLine
{
    BonusSheetLineId: number;
    EmployeeId: number;
    EmployeeCode: string;
    EmployeeName: string;
    DesignationName: string;
    BasicSalary: number;
    GrossSalary: number;
    ServiceMonths: number;
    // The percent of the slab the service fell in
    BonusPercent: number;
    // The bonus structure of the employee (the profile's own,
    // otherwise the Default)
    StructureName: string;
    Amount: number;
    PaidAmount: number;
}

export interface BonusSheet
extends BonusSheetListItem
{
    Lines: BonusSheetLine[];
}

// A bonus structure that can be picked, with its rule in words
export interface BonusStructureChoice
{
    Id: number;
    Name: string;
    IsDefault: boolean;
    RateBase: string;
    ServiceFrom: string;
    ConfirmedOnly: boolean;
    // "6 month(s) and above : 50 %"
    Slabs: string[];
}

export interface BonusSheetDefaults
{
    NextCode: string;
    Branches: { Id: number; Name: string }[];
    Structures: BonusStructureChoice[];
}

// Unpaid / Part 5,000.00 / Paid
export function payStatusText(amount: number, paid: number): string
{
    return paid <= 0 ? 'Unpaid' : paid >= amount ? 'Paid' : 'Partly paid';
}

export function payStatusColor(amount: number, paid: number): string
{
    return paid <= 0 ? '#b45309' : paid >= amount ? '#047857' : '#1d4ed8';
}


// camelCase from the API -> PascalCase of the pages
function pascal(x: any): any
{
    const row: Record<string, any> = {};

    for (const key of Object.keys(x ?? {}))
    {
        row[key.charAt(0).toUpperCase() + key.slice(1)] = x[key];
    }

    return row;
}

const rows =
    (x: any): any[] => (Array.isArray(x) ? x : []).map(pascal);


@Injectable(
{
    providedIn:'root'
})
export class PayrollExtrasService
{
    private readonly http =
        inject(HttpClient);

    private readonly base =
        `${environment.apiUrl}/human-resource-manangement/payroll-management`;

    private readonly encash =
        `${this.base}/leave-encashments`;

    private readonly bonus =
        `${this.base}/festival-bonus`;

    //===========================================================
    // Leave Encashments
    //===========================================================

    getEncashments():
        Observable<LeaveEncashment[]>
    {
        return this.http.get<any[]>(this.encash).pipe(map(x => rows(x).map(e => ({ ...e, Lines:rows(e.Lines) })) as LeaveEncashment[]));
    }

    getEncashment(publicId: string):
        Observable<LeaveEncashment>
    {
        return this.http
            .get<any>(`${this.encash}/${publicId}`)
            .pipe(map(x =>
            {
                const e = pascal(x);

                return { ...e, Lines:rows(e.Lines) } as LeaveEncashment;
            }));
    }

    getEncashDefaults():
        Observable<LeaveEncashmentDefaults>
    {
        return this.http
            .get<any>(`${this.encash}/defaults`)
            .pipe(map(x =>
            {
                const d = pascal(x);

                return { ...d, Employees:rows(d.Employees) } as LeaveEncashmentDefaults;
            }));
    }

    // The leave an employee can encash for a leave year, by the
    // employee's leave encashment policy
    getEncashBalance(employeeId: number, year: number):
        Observable<EncashEligibility>
    {
        return this.http
            .get<any>(`${this.encash}/balance`, { params:new HttpParams().set('employeeId', String(employeeId)).set('year', String(year)) })
            .pipe(map(x =>
            {
                const e = pascal(x);

                return {
                    ...e,
                    Years:Array.isArray(e.Years) ? e.Years : [],
                    YearNames:Array.isArray(e.YearNames) ? e.YearNames : [],
                    Rules:Array.isArray(e.Rules) ? e.Rules : [],
                    Problem:String(e.Problem ?? ''),
                    Rows:rows(e.Rows)
                } as EncashEligibility;
            }));
    }

    createEncashment(body: any):
        Observable<LeaveEncashment>
    {
        return this.http.post<any>(this.encash, body).pipe(map(x => pascal(x) as LeaveEncashment));
    }

    // Pending -> Approved : posts the Journal Voucher
    approveEncashment(publicId: string):
        Observable<void>
    {
        return this.http.put<void>(`${this.encash}/${publicId}/approve`, {});
    }

    // Pending -> Rejected : the days go back
    rejectEncashment(publicId: string, reason: string):
        Observable<void>
    {
        return this.http.put<void>(`${this.encash}/${publicId}/reject`, { Reason:reason });
    }

    deleteEncashment(publicId: string):
        Observable<void>
    {
        return this.http.delete<void>(`${this.encash}/${publicId}`);
    }

    //===========================================================
    // Festival Bonus
    //===========================================================

    getBonusSheets():
        Observable<BonusSheetListItem[]>
    {
        return this.http.get<any[]>(this.bonus).pipe(map(x => rows(x) as BonusSheetListItem[]));
    }

    getBonusSheet(publicId: string):
        Observable<BonusSheet>
    {
        return this.http
            .get<any>(`${this.bonus}/${publicId}`)
            .pipe(map(x =>
            {
                const s = pascal(x);

                return { ...s, Lines:rows(s.Lines) } as BonusSheet;
            }));
    }

    getBonusDefaults():
        Observable<BonusSheetDefaults>
    {
        return this.http
            .get<any>(`${this.bonus}/defaults`)
            .pipe(map(x =>
            {
                const d = pascal(x);

                return { ...d, Branches:rows(d.Branches), Structures:rows(d.Structures) } as BonusSheetDefaults;
            }));
    }

    generateBonus(body: any):
        Observable<BonusSheet>
    {
        return this.http.post<any>(this.bonus, body).pipe(map(x => pascal(x) as BonusSheet));
    }

    saveBonus(publicId: string, lines: { BonusSheetLineId: number; Amount: number }[]):
        Observable<void>
    {
        return this.http.put<void>(`${this.bonus}/${publicId}`, { Lines:lines });
    }

    postBonus(publicId: string):
        Observable<void>
    {
        return this.http.put<void>(`${this.bonus}/${publicId}/post`, {});
    }

    unpostBonus(publicId: string, reason: string):
        Observable<void>
    {
        return this.http.put<void>(`${this.bonus}/${publicId}/unpost`, { Reason:reason });
    }

    deleteBonus(publicId: string):
        Observable<void>
    {
        return this.http.delete<void>(`${this.bonus}/${publicId}`);
    }
}
