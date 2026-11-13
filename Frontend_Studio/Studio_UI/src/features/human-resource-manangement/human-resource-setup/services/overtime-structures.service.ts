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
    OvertimeStructure,
    OvertimeStructureDefaults
}
from '../models/overtime-structures.model';


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

export function normalizeOvertimeRule(x: any)
{
    return {
        RateBase:text(x, 'RateBase') || 'Basic',
        FixedHourRate:num(x, 'FixedHourRate'),
        MonthDaysMode:text(x, 'MonthDaysMode') || 'Fixed',
        MonthDays:num(x, 'MonthDays'),
        PayExtraHours:!!pick(x, 'PayExtraHours'),
        HourMultiplier:num(x, 'HourMultiplier'),
        HolidayHourMultiplier:num(x, 'HolidayHourMultiplier'),
        PayExtraDays:!!pick(x, 'PayExtraDays'),
        DayMultiplier:num(x, 'DayMultiplier')
    };
}

function normalizeStructure
(
    x: any
):
    OvertimeStructure
{
    return {
        OvertimeStructureId:num(x, 'OvertimeStructureId'),
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        Name:text(x, 'Name'),
        ...normalizeOvertimeRule(x),
        IsDefault:!!pick(x, 'IsDefault'),
        Remarks:text(x, 'Remarks'),
        IsActive:pick(x, 'IsActive') !== false,
        EmployeeCount:num(x, 'EmployeeCount')
    };
}


//===============================================================
// Overtime Structures Service :
// api/human-resource-manangement/human-resource-setup/overtime-structures
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class OvertimeStructuresService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/human-resource-manangement/human-resource-setup/overtime-structures`;

    getAll():
        Observable<OvertimeStructure[]>
    {
        return this.http
            .get<any[]>(this.apiUrl)
            .pipe(map(rows => (Array.isArray(rows) ? rows : []).map(normalizeStructure)));
    }

    getById(publicId: string):
        Observable<OvertimeStructure>
    {
        return this.http
            .get<any>(`${this.apiUrl}/${publicId}`)
            .pipe(map(normalizeStructure));
    }

    getDefaults():
        Observable<OvertimeStructureDefaults>
    {
        return this.http
            .get<any>(`${this.apiUrl}/defaults`)
            .pipe(
                map(x => ({
                    NextCode:text(x, 'NextCode'),
                    NextName:text(x, 'NextName'),
                    ShiftName:text(x, 'ShiftName'),
                    ShiftHours:num(x, 'ShiftHours'),
                    DefaultCode:text(x, 'DefaultCode'),
                    DefaultPublicId:text(x, 'DefaultPublicId')
                })));
    }

    // The name is not sent : the server names a new structure from
    // its code
    private body(s: OvertimeStructure): any
    {
        return {
            RateBase:s.RateBase,
            FixedHourRate:Number(s.FixedHourRate) || 0,
            MonthDaysMode:s.MonthDaysMode,
            MonthDays:Number(s.MonthDays) || 0,
            PayExtraHours:s.PayExtraHours,
            HourMultiplier:Number(s.HourMultiplier) || 0,
            HolidayHourMultiplier:Number(s.HolidayHourMultiplier) || 0,
            PayExtraDays:s.PayExtraDays,
            DayMultiplier:Number(s.DayMultiplier) || 0,
            IsDefault:s.IsDefault,
            Remarks:s.Remarks,
            IsActive:s.IsActive
        };
    }

    create(s: OvertimeStructure):
        Observable<OvertimeStructure>
    {
        return this.http
            .post<any>(this.apiUrl, this.body(s))
            .pipe(map(normalizeStructure));
    }

    update(publicId: string, s: OvertimeStructure):
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${publicId}`, this.body(s));
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
