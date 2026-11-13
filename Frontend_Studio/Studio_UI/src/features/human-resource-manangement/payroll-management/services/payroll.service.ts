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

import
{
    GenerateSalarySheet,
    SalaryAdvance,
    SalaryAdvanceDefaults,
    SalarySheet,
    SalarySheetDefaults,
    SalarySheetLine,
    SalarySheetListItem
}
from '../models/payroll.model';


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

function normalizeAdvance
(
    x: any
):
    SalaryAdvance
{
    return {
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        EmployeeId:num(x, 'EmployeeId'),
        EmployeeCode:text(x, 'EmployeeCode'),
        EmployeeName:text(x, 'EmployeeName'),
        DesignationName:text(x, 'DesignationName'),
        BranchName:text(x, 'BranchName'),
        AdvanceType:text(x, 'AdvanceType') || 'Advance',
        AdvanceDate:text(x, 'AdvanceDate'),
        Amount:num(x, 'Amount'),
        InstallmentAmount:num(x, 'InstallmentAmount'),
        StartYear:num(x, 'StartYear'),
        StartMonth:num(x, 'StartMonth'),
        Reason:text(x, 'Reason'),
        VoucherNo:text(x, 'VoucherNo'),
        IsClosed:!!pick(x, 'IsClosed'),
        Recovered:num(x, 'Recovered'),
        Balance:num(x, 'Balance'),
        Status:text(x, 'Status') || 'Running'
    };
}

function normalizeSheetItem
(
    x: any
):
    SalarySheetListItem
{
    return {
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        Year:num(x, 'Year'),
        Month:num(x, 'Month'),
        BranchId:num(x, 'BranchId'),
        BranchName:text(x, 'BranchName'),
        Status:text(x, 'Status') || 'Draft',
        EmployeeCount:num(x, 'EmployeeCount'),
        PaidCount:num(x, 'PaidCount'),
        TotalGross:num(x, 'TotalGross'),
        TotalEarned:num(x, 'TotalEarned'),
        TotalDeductions:num(x, 'TotalDeductions'),
        TotalNet:num(x, 'TotalNet'),
        JournalVoucherNo:text(x, 'JournalVoucherNo')
    };
}

function normalizeLine
(
    l: any
):
    SalarySheetLine
{
    return {
        SalarySheetLineId:num(l, 'SalarySheetLineId'),
        EmployeeId:num(l, 'EmployeeId'),
        EmployeeCode:text(l, 'EmployeeCode'),
        EmployeeName:text(l, 'EmployeeName'),
        DesignationName:text(l, 'DesignationName'),
        DepartmentName:text(l, 'DepartmentName'),
        PaymentMode:text(l, 'PaymentMode'),
        PaymentAccount:text(l, 'PaymentAccount'),
        MonthDays:num(l, 'MonthDays'),
        PayableDays:num(l, 'PayableDays'),
        UnpaidDays:num(l, 'UnpaidDays'),
        LateDays:num(l, 'LateDays'),
        OvertimeHours:num(l, 'OvertimeHours'),
        OvertimeDays:num(l, 'OvertimeDays'),
        BasicSalary:num(l, 'BasicSalary'),
        GrossSalary:num(l, 'GrossSalary'),
        AbsenceDeduction:num(l, 'AbsenceDeduction'),
        LateDeduction:num(l, 'LateDeduction'),
        OvertimeAmount:num(l, 'OvertimeAmount'),
        OtherEarning:num(l, 'OtherEarning'),
        OtherDeduction:num(l, 'OtherDeduction'),
        EarnedSalary:num(l, 'EarnedSalary'),
        StructureDeduction:num(l, 'StructureDeduction'),
        AdvanceDeduction:num(l, 'AdvanceDeduction'),
        PfEmployee:num(l, 'PfEmployee'),
        PfCompany:num(l, 'PfCompany'),
        PfLoan:num(l, 'PfLoan'),
        NetPay:num(l, 'NetPay'),
        Remarks:text(l, 'Remarks'),
        IsPaid:!!pick(l, 'IsPaid'),
        PaidDate:text(l, 'PaidDate'),
        PaidNote:text(l, 'PaidNote'),
        Heads:list(l, 'Heads').map(h => ({
            HeadName:text(h, 'HeadName'),
            HeadType:text(h, 'HeadType'),
            Amount:num(h, 'Amount')
        }))
    };
}

function normalizeSheet
(
    x: any
):
    SalarySheet
{
    return {
        ...normalizeSheetItem(x),
        LateDaysPerCut:num(x, 'LateDaysPerCut'),
        Remarks:text(x, 'Remarks'),
        ApprovedDate:text(x, 'ApprovedDate'),
        PostedDate:text(x, 'PostedDate'),
        NoSalaryCount:num(x, 'NoSalaryCount'),
        Lines:list(x, 'Lines').map(normalizeLine)
    };
}


//===============================================================
// Payroll Service :
// api/human-resource-manangement/payroll-management/...
//   salary-advances, salary-sheets
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class PayrollService
{
    private readonly http =
        inject(HttpClient);

    private readonly baseUrl =
        `${environment.apiUrl}/human-resource-manangement/payroll-management`;

    private readonly advanceUrl =
        `${this.baseUrl}/salary-advances`;

    private readonly sheetUrl =
        `${this.baseUrl}/salary-sheets`;

    //===========================================================
    // Salary Advances
    //===========================================================

    getAdvances():
        Observable<SalaryAdvance[]>
    {
        return this.http
            .get<any[]>(this.advanceUrl)
            .pipe(map(rows => (Array.isArray(rows) ? rows : []).map(normalizeAdvance)));
    }

    getAdvance(publicId: string):
        Observable<SalaryAdvance>
    {
        return this.http
            .get<any>(`${this.advanceUrl}/${publicId}`)
            .pipe(map(normalizeAdvance));
    }

    getAdvanceDefaults():
        Observable<SalaryAdvanceDefaults>
    {
        return this.http
            .get<any>(`${this.advanceUrl}/defaults`)
            .pipe(
                map(x => ({
                    NextCode:text(x, 'NextCode'),
                    Employees:list(x, 'Employees').map(e => ({
                        Id:num(e, 'Id'),
                        Code:text(e, 'Code'),
                        Name:text(e, 'Name'),
                        DesignationName:text(e, 'DesignationName'),
                        GrossSalary:num(e, 'GrossSalary')
                    }))
                })));
    }

    createAdvance(a: SalaryAdvance):
        Observable<SalaryAdvance>
    {
        return this.http
            .post<any>(this.advanceUrl, a)
            .pipe(map(normalizeAdvance));
    }

    updateAdvance(publicId: string, a: SalaryAdvance):
        Observable<void>
    {
        return this.http.put<void>(`${this.advanceUrl}/${publicId}`, a);
    }

    deleteAdvance(publicId: string):
        Observable<void>
    {
        return this.http.delete<void>(`${this.advanceUrl}/${publicId}`);
    }

    restoreAdvance():
        Observable<string>
    {
        return this.http
            .put<any>(`${this.advanceUrl}/restore`, {})
            .pipe(map(x => String(x?.Code ?? x?.code ?? '')));
    }

    getAdvanceHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.advanceUrl}/history`);
    }

    //===========================================================
    // Salary Sheets
    //===========================================================

    getSheets():
        Observable<SalarySheetListItem[]>
    {
        return this.http
            .get<any[]>(this.sheetUrl)
            .pipe(map(rows => (Array.isArray(rows) ? rows : []).map(normalizeSheetItem)));
    }

    getSheet(publicId: string):
        Observable<SalarySheet>
    {
        return this.http
            .get<any>(`${this.sheetUrl}/${publicId}`)
            .pipe(map(normalizeSheet));
    }

    getSheetDefaults():
        Observable<SalarySheetDefaults>
    {
        return this.http
            .get<any>(`${this.sheetUrl}/defaults`)
            .pipe(
                map(x => ({
                    NextCode:text(x, 'NextCode'),
                    Year:num(x, 'Year'),
                    Month:num(x, 'Month'),
                    LateDaysPerCut:num(x, 'LateDaysPerCut'),
                    Branches:list(x, 'Branches').map(b => ({ Id:num(b, 'Id'), Name:text(b, 'Name') }))
                })));
    }

    generateSheet(request: GenerateSalarySheet):
        Observable<SalarySheet>
    {
        return this.http
            .post<any>(this.sheetUrl, request)
            .pipe(map(normalizeSheet));
    }

    // Draft : the typed amounts (the sheet is worked out again)
    saveSheet(sheet: SalarySheet):
        Observable<void>
    {
        const body =
        {
            Remarks:sheet.Remarks,
            Lines:sheet.Lines.map(l => ({
                SalarySheetLineId:l.SalarySheetLineId,
                OtherEarning:Number(l.OtherEarning) || 0,
                OtherDeduction:Number(l.OtherDeduction) || 0,
                Remarks:l.Remarks
            }))
        };

        return this.http.put<void>(`${this.sheetUrl}/${sheet.PublicId}`, body);
    }

    // recalculate / approve / return-to-draft / post
    stepSheet(publicId: string, step: 'recalculate' | 'approve' | 'return-to-draft' | 'post'):
        Observable<void>
    {
        return this.http.put<void>(`${this.sheetUrl}/${publicId}/${step}`, {});
    }

    unpostSheet(publicId: string, reason: string):
        Observable<void>
    {
        return this.http.put<void>(`${this.sheetUrl}/${publicId}/unpost`, { Reason:reason });
    }

    // lineIds empty = every line that can change
    paySheet(publicId: string, lineIds: number[], paid: boolean, paidDate: string, note: string):
        Observable<number>
    {
        return this.http
            .put<any>(`${this.sheetUrl}/${publicId}/pay`, { LineIds:lineIds, Paid:paid, PaidDate:paidDate, Note:note })
            .pipe(map(x => Number(x?.Changed ?? x?.changed ?? 0) || 0));
    }

    deleteSheet(publicId: string):
        Observable<void>
    {
        return this.http.delete<void>(`${this.sheetUrl}/${publicId}`);
    }

    restoreSheet():
        Observable<string>
    {
        return this.http
            .put<any>(`${this.sheetUrl}/restore`, {})
            .pipe(map(x => String(x?.Code ?? x?.code ?? '')));
    }

    getSheetHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.sheetUrl}/history`);
    }
}
