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
    EmployeeMovement,
    EmployeeMovementDefaults,
    MovementEmployeeState,
    MovementLookup,
    MovementSalaryLine
}
from '../models/employee-movements.model';


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
    (x: any, name: string): MovementLookup[] =>
        list(x, name).map(l => ({ Id:num(l, 'Id'), Name:text(l, 'Name') }));

const salaryLines =
    (x: any): MovementSalaryLine[] =>
        list(x, 'SalaryLines').map(l => ({
            SalaryHeadId:num(l, 'SalaryHeadId'),
            HeadName:text(l, 'HeadName'),
            HeadType:text(l, 'HeadType'),
            OldAmount:num(l, 'OldAmount'),
            NewAmount:num(l, 'NewAmount'),
            Percent:num(l, 'Percent'),
            IsBasic:!!pick(l, 'IsBasic'),
            Basis:text(l, 'Basis') || 'Gross',
            FixedAmount:num(l, 'FixedAmount')
        }));

function normalizeMovement
(
    x: any
):
    EmployeeMovement
{
    return {
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        EmployeeId:num(x, 'EmployeeId'),
        EmployeeCode:text(x, 'EmployeeCode'),
        EmployeeName:text(x, 'EmployeeName'),
        MovementType:text(x, 'MovementType'),
        EffectiveDate:text(x, 'EffectiveDate'),
        OldBranchId:num(x, 'OldBranchId'),
        OldBranchName:text(x, 'OldBranchName'),
        NewBranchId:num(x, 'NewBranchId'),
        NewBranchName:text(x, 'NewBranchName'),
        OldDepartmentId:num(x, 'OldDepartmentId'),
        OldDepartmentName:text(x, 'OldDepartmentName'),
        NewDepartmentId:num(x, 'NewDepartmentId'),
        NewDepartmentName:text(x, 'NewDepartmentName'),
        OldDesignationId:num(x, 'OldDesignationId'),
        OldDesignationName:text(x, 'OldDesignationName'),
        NewDesignationId:num(x, 'NewDesignationId'),
        NewDesignationName:text(x, 'NewDesignationName'),
        OldShiftId:num(x, 'OldShiftId'),
        OldShiftName:text(x, 'OldShiftName'),
        NewShiftId:num(x, 'NewShiftId'),
        NewShiftName:text(x, 'NewShiftName'),
        OldEmploymentType:text(x, 'OldEmploymentType'),
        NewEmploymentType:text(x, 'NewEmploymentType'),
        OldSalaryStructureId:num(x, 'OldSalaryStructureId'),
        OldSalaryStructureName:text(x, 'OldSalaryStructureName'),
        NewSalaryStructureId:num(x, 'NewSalaryStructureId'),
        NewSalaryStructureName:text(x, 'NewSalaryStructureName'),
        OldGrossSalary:num(x, 'OldGrossSalary'),
        NewGrossSalary:num(x, 'NewGrossSalary'),
        SalaryLines:salaryLines(x),
        SeparationType:text(x, 'SeparationType'),
        SettlementAmount:num(x, 'SettlementAmount'),
        SettlementNote:text(x, 'SettlementNote'),
        Remarks:text(x, 'Remarks'),
        Summary:text(x, 'Summary'),
        IsLatest:!!pick(x, 'IsLatest')
    };
}


//===============================================================
// Employee Movements Service :
// api/human-resource-manangement/employee-management/employee-movements
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class EmployeeMovementsService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/human-resource-manangement/employee-management/employee-movements`;

    getAll():
        Observable<EmployeeMovement[]>
    {
        return this.http
            .get<any[]>(this.apiUrl)
            .pipe(map(rows => (Array.isArray(rows) ? rows : []).map(normalizeMovement)));
    }

    getById(publicId: string):
        Observable<EmployeeMovement>
    {
        return this.http
            .get<any>(`${this.apiUrl}/${publicId}`)
            .pipe(map(normalizeMovement));
    }

    getDefaults():
        Observable<EmployeeMovementDefaults>
    {
        return this.http
            .get<any>(`${this.apiUrl}/defaults`)
            .pipe(
                map(x => ({
                    NextCode:text(x, 'NextCode'),
                    Employees:list(x, 'Employees').map(e => ({ Id:num(e, 'Id'), Code:text(e, 'Code'), Name:text(e, 'Name') })),
                    Branches:lookups(x, 'Branches'),
                    Departments:lookups(x, 'Departments'),
                    Designations:lookups(x, 'Designations'),
                    Shifts:lookups(x, 'Shifts'),
                    SalaryStructures:list(x, 'SalaryStructures').map(st => ({
                        Id:num(st, 'Id'),
                        Name:text(st, 'Name'),
                        IsDefault:!!pick(st, 'IsDefault'),
                        Lines:list(st, 'Lines').map(l => ({
                            SalaryHeadId:num(l, 'SalaryHeadId'),
                            HeadName:text(l, 'HeadName'),
                            HeadType:text(l, 'HeadType'),
                            OldAmount:0,
                            NewAmount:0,
                            Percent:num(l, 'Percent'),
                            IsBasic:!!pick(l, 'IsBasic'),
                            Basis:text(l, 'Basis') || 'Gross',
                            FixedAmount:num(l, 'FixedAmount')
                        }))
                    }))
                })));
    }

    // The employee as now
    getEmployeeState(employeeId: number):
        Observable<MovementEmployeeState>
    {
        return this.http
            .get<any>(`${this.apiUrl}/employee/${employeeId}`)
            .pipe(
                map(x => ({
                    EmployeeId:num(x, 'EmployeeId'),
                    Code:text(x, 'Code'),
                    FullName:text(x, 'FullName'),
                    JoiningDate:text(x, 'JoiningDate'),
                    ConfirmationDate:text(x, 'ConfirmationDate'),
                    IsActive:pick(x, 'IsActive') !== false,
                    BranchId:num(x, 'BranchId'),
                    BranchName:text(x, 'BranchName'),
                    DepartmentId:num(x, 'DepartmentId'),
                    DepartmentName:text(x, 'DepartmentName'),
                    DesignationId:num(x, 'DesignationId'),
                    DesignationName:text(x, 'DesignationName'),
                    ShiftId:num(x, 'ShiftId'),
                    ShiftName:text(x, 'ShiftName'),
                    EmploymentType:text(x, 'EmploymentType'),
                    SalaryStructureId:num(x, 'SalaryStructureId'),
                    SalaryStructureName:text(x, 'SalaryStructureName'),
                    GrossSalary:num(x, 'GrossSalary'),
                    SalaryLines:salaryLines(x),
                    LastMovementDate:text(x, 'LastMovementDate'),
                    AdvanceBalance:num(x, 'AdvanceBalance'),
                    LastSalaryMonth:text(x, 'LastSalaryMonth'),
                    HasLogin:!!pick(x, 'HasLogin')
                })));
    }

    // The new gross salary and salary structure go only with a
    // movement that changes the salary (Increment; Promotion when
    // asked)
    create(m: EmployeeMovement, withSalary: boolean):
        Observable<EmployeeMovement>
    {
        const body =
        {
            EmployeeId:m.EmployeeId,
            MovementType:m.MovementType,
            EffectiveDate:m.EffectiveDate,
            NewBranchId:m.NewBranchId,
            NewDepartmentId:m.NewDepartmentId,
            NewDesignationId:m.NewDesignationId,
            NewShiftId:m.NewShiftId,
            NewSalaryStructureId:withSalary ? m.NewSalaryStructureId : 0,
            NewGrossSalary:withSalary ? Number(m.NewGrossSalary) || 0 : 0,
            SeparationType:m.SeparationType,
            SettlementAmount:Number(m.SettlementAmount) || 0,
            SettlementNote:m.SettlementNote,
            Remarks:m.Remarks
        };

        return this.http
            .post<any>(this.apiUrl, body)
            .pipe(map(normalizeMovement));
    }

    delete(publicId: string):
        Observable<void>
    {
        return this.http.delete<void>(`${this.apiUrl}/${publicId}`);
    }

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/history`);
    }
}
