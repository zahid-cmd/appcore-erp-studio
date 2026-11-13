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
    SalaryStructure,
    SalaryStructureDefaults
}
from '../models/salary-structures.model';


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

function normalizeStructure
(
    x: any
):
    SalaryStructure
{
    return {
        SalaryStructureId:num(x, 'SalaryStructureId'),
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        Name:text(x, 'Name'),
        EarningPercent:num(x, 'EarningPercent'),
        DeductionPercent:num(x, 'DeductionPercent'),
        IsDefault:!!pick(x, 'IsDefault'),
        Remarks:text(x, 'Remarks'),
        IsActive:pick(x, 'IsActive') !== false,
        EmployeeCount:num(x, 'EmployeeCount'),
        Lines:list(x, 'Lines').map(l => ({
            SalaryHeadId:num(l, 'SalaryHeadId'),
            HeadName:text(l, 'HeadName'),
            HeadType:text(l, 'HeadType'),
            IsBasic:!!pick(l, 'IsBasic'),
            Percent:num(l, 'Percent'),
            Basis:text(l, 'Basis') || 'Gross',
            FixedAmount:num(l, 'FixedAmount')
        }))
    };
}


//===============================================================
// Salary Structures Service :
// api/human-resource-manangement/human-resource-setup/salary-structures
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class SalaryStructuresService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/human-resource-manangement/human-resource-setup/salary-structures`;

    getAll():
        Observable<SalaryStructure[]>
    {
        return this.http
            .get<any[]>(this.apiUrl)
            .pipe(map(rows => (Array.isArray(rows) ? rows : []).map(normalizeStructure)));
    }

    getById(publicId: string):
        Observable<SalaryStructure>
    {
        return this.http
            .get<any>(`${this.apiUrl}/${publicId}`)
            .pipe(map(normalizeStructure));
    }

    getDefaults():
        Observable<SalaryStructureDefaults>
    {
        return this.http
            .get<any>(`${this.apiUrl}/defaults`)
            .pipe(
                map(x => ({
                    NextCode:text(x, 'NextCode'),
                    NextName:text(x, 'NextName'),
                    SalaryHeads:list(x, 'SalaryHeads').map(h => ({
                        SalaryHeadId:num(h, 'SalaryHeadId'),
                        Name:text(h, 'Name'),
                        HeadType:text(h, 'HeadType'),
                        IsBasic:!!pick(h, 'IsBasic')
                    })),
                    DefaultCode:text(x, 'DefaultCode'),
                    DefaultPublicId:text(x, 'DefaultPublicId')
                })));
    }

    // Lines without a percent or an amount are not sent. The name is
    // not sent : the server names a new structure from its code.
    private body(s: SalaryStructure): any
    {
        return {
            IsDefault:s.IsDefault,
            Remarks:s.Remarks,
            IsActive:s.IsActive,
            Lines:s.Lines
                .filter(l => (Number(l.Percent) || 0) !== 0 || (Number(l.FixedAmount) || 0) !== 0)
                .map(l => ({
                    SalaryHeadId:l.SalaryHeadId,
                    Percent:Number(l.Percent) || 0,
                    Basis:l.Basis || 'Gross',
                    FixedAmount:Number(l.FixedAmount) || 0
                }))
        };
    }

    create(s: SalaryStructure):
        Observable<SalaryStructure>
    {
        return this.http
            .post<any>(this.apiUrl, this.body(s))
            .pipe(map(normalizeStructure));
    }

    update(publicId: string, s: SalaryStructure):
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
