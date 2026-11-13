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
    Employee,
    EmployeeDefaults,
    EmployeeListItem,
    EmployeeLookup
}
from '../models/employees.model';

import
{
    normalizeOvertimeRule
}
from '../../human-resource-setup/services/overtime-structures.service';


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
    (x: any, name: string): EmployeeLookup[] =>
        list(x, name).map(l => ({ Id:num(l, 'Id'), Name:text(l, 'Name'), Note:text(l, 'Note'), Hours:num(l, 'Hours') }));

function normalizeEmployee
(
    x: any
):
    Employee
{
    return {
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        FullName:text(x, 'FullName'),
        FatherName:text(x, 'FatherName'),
        MotherName:text(x, 'MotherName'),
        Gender:text(x, 'Gender'),
        DateOfBirth:text(x, 'DateOfBirth'),
        BloodGroup:text(x, 'BloodGroup'),
        MaritalStatus:text(x, 'MaritalStatus'),
        NationalId:text(x, 'NationalId'),
        MobileNo:text(x, 'MobileNo'),
        Email:text(x, 'Email'),
        PresentAddress:text(x, 'PresentAddress'),
        PermanentAddress:text(x, 'PermanentAddress'),
        EmergencyContactName:text(x, 'EmergencyContactName'),
        EmergencyContactPhone:text(x, 'EmergencyContactPhone'),
        BranchId:num(x, 'BranchId'),
        BranchName:text(x, 'BranchName'),
        DepartmentId:num(x, 'DepartmentId'),
        DepartmentName:text(x, 'DepartmentName'),
        DesignationId:num(x, 'DesignationId'),
        DesignationName:text(x, 'DesignationName'),
        ShiftId:num(x, 'ShiftId'),
        ShiftName:text(x, 'ShiftName'),
        WeeklyOffDays:text(x, 'WeeklyOffDays'),
        EmploymentType:text(x, 'EmploymentType') || 'Permanent',
        JoiningDate:text(x, 'JoiningDate'),
        ConfirmationDate:text(x, 'ConfirmationDate'),
        UserProfileId:num(x, 'UserProfileId'),
        LoginName:text(x, 'LoginName'),
        GrossSalary:num(x, 'GrossSalary'),
        SalaryStructureId:num(x, 'SalaryStructureId'),
        SalaryStructureName:text(x, 'SalaryStructureName'),
        SalaryLines:list(x, 'SalaryLines').map(l => ({
            SalaryHeadId:num(l, 'SalaryHeadId'),
            HeadName:text(l, 'HeadName'),
            HeadType:text(l, 'HeadType'),
            Amount:num(l, 'Amount')
        })),
        OvertimeAllowed:!!pick(x, 'OvertimeAllowed'),
        OvertimeStructureId:num(x, 'OvertimeStructureId'),
        OvertimeStructureName:text(x, 'OvertimeStructureName'),
        OvertimeRate:num(x, 'OvertimeRate'),
        PaymentMode:text(x, 'PaymentMode') || 'Cash',
        BankName:text(x, 'BankName'),
        BankAccountNo:text(x, 'BankAccountNo'),
        MfsName:text(x, 'MfsName'),
        MfsNo:text(x, 'MfsNo'),
        Remarks:text(x, 'Remarks'),
        IsActive:pick(x, 'IsActive') !== false
    };
}


//===============================================================
// Employees Service :
// api/human-resource-manangement/employee-management/employees
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class EmployeesService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/human-resource-manangement/employee-management/employees`;

    getAll():
        Observable<EmployeeListItem[]>
    {
        return this.http
            .get<any[]>(this.apiUrl)
            .pipe(
                map(rows =>
                    (Array.isArray(rows) ? rows : []).map(x => ({
                        PublicId:text(x, 'PublicId'),
                        Code:text(x, 'Code'),
                        FullName:text(x, 'FullName'),
                        MobileNo:text(x, 'MobileNo'),
                        BranchId:num(x, 'BranchId'),
                        BranchName:text(x, 'BranchName'),
                        DepartmentId:num(x, 'DepartmentId'),
                        DepartmentName:text(x, 'DepartmentName'),
                        DesignationName:text(x, 'DesignationName'),
                        ShiftName:text(x, 'ShiftName'),
                        EmploymentType:text(x, 'EmploymentType'),
                        JoiningDate:text(x, 'JoiningDate'),
                        GrossSalary:num(x, 'GrossSalary'),
                        HasLogin:!!pick(x, 'HasLogin'),
                        IsActive:pick(x, 'IsActive') !== false
                    }))));
    }

    getById(publicId: string):
        Observable<Employee>
    {
        return this.http
            .get<any>(`${this.apiUrl}/${publicId}`)
            .pipe(map(normalizeEmployee));
    }

    getDefaults():
        Observable<EmployeeDefaults>
    {
        return this.http
            .get<any>(`${this.apiUrl}/defaults`)
            .pipe(
                map(x => ({
                    NextCode:text(x, 'NextCode'),
                    DefaultWeeklyOffDays:text(x, 'DefaultWeeklyOffDays'),
                    Branches:lookups(x, 'Branches'),
                    Departments:lookups(x, 'Departments'),
                    Designations:lookups(x, 'Designations'),
                    Shifts:lookups(x, 'Shifts'),
                    Users:lookups(x, 'Users'),
                    OvertimeStructures:list(x, 'OvertimeStructures').map(ot => ({
                        Id:num(ot, 'Id'),
                        Code:text(ot, 'Code'),
                        Name:text(ot, 'Name'),
                        IsDefault:!!pick(ot, 'IsDefault'),
                        ...normalizeOvertimeRule(ot)
                    })),
                    SalaryStructures:list(x, 'SalaryStructures').map(st => ({
                        Id:num(st, 'Id'),
                        Code:text(st, 'Code'),
                        Name:text(st, 'Name'),
                        IsDefault:!!pick(st, 'IsDefault'),
                        Lines:list(st, 'Lines').map(l => ({
                            SalaryHeadId:num(l, 'SalaryHeadId'),
                            HeadName:text(l, 'HeadName'),
                            HeadType:text(l, 'HeadType'),
                            IsBasic:!!pick(l, 'IsBasic'),
                            Percent:num(l, 'Percent'),
                            Basis:text(l, 'Basis') || 'Gross',
                            FixedAmount:num(l, 'FixedAmount')
                        }))
                    }))
                })));
    }

    // The salary goes as the gross salary and the structure picked :
    // the lines on the profile are worked out and are not sent
    private body(e: Employee): any
    {
        // A new employee has no PublicId yet : '' cannot be read
        // as a Guid by the server (the save then failed with a 400
        // and no message), so send the empty Guid instead
        return {
            ...e,
            PublicId:e.PublicId || '00000000-0000-0000-0000-000000000000',
            SalaryLines:[]
        };
    }

    create(e: Employee):
        Observable<Employee>
    {
        return this.http
            .post<any>(this.apiUrl, this.body(e))
            .pipe(map(normalizeEmployee));
    }

    update(publicId: string, e: Employee):
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${publicId}`, this.body(e));
    }

    delete(publicId: string):
        Observable<void>
    {
        return this.http.delete<void>(`${this.apiUrl}/${publicId}`);
    }

    restore():
        Observable<string>
    {
        return this.http
            .put<any>(`${this.apiUrl}/restore`, {})
            .pipe(map(x => String(x?.Code ?? x?.code ?? '')));
    }

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/history`);
    }
}
