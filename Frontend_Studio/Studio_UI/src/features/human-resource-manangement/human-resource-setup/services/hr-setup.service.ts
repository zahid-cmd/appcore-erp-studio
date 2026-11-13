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
    HrSetupPage,
    HrSetupRow
}
from '../models/hr-setup.model';


//===============================================================
// A row from the API : PascalCase names whatever the API sends
// (camelCase is turned into PascalCase)
//===============================================================

function normalizeRow
(
    x: any
):
    HrSetupRow
{
    const row:
        Record<string, any> = {};

    for (const key of Object.keys(x ?? {}))
    {
        row[key.charAt(0).toUpperCase() + key.slice(1)] = x[key];
    }

    row['PublicId'] = String(row['PublicId'] ?? '');
    row['Code'] = String(row['Code'] ?? '');
    row['Name'] = String(row['Name'] ?? '');
    row['Remarks'] = String(row['Remarks'] ?? '');
    row['IsActive'] = row['IsActive'] !== false;

    return row as HrSetupRow;
}


//===============================================================
// Human Resource Setup Service : the same calls for Shifts,
// Holidays, Leave Types and Salary Heads (page.api)
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class HrSetupService
{
    private readonly http =
        inject(HttpClient);

    private url(page: HrSetupPage): string
    {
        return `${environment.apiUrl}/${page.api}`;
    }

    getAll(page: HrSetupPage):
        Observable<HrSetupRow[]>
    {
        return this.http
            .get<any[]>(this.url(page))
            .pipe(map(rows => (Array.isArray(rows) ? rows : []).map(normalizeRow)));
    }

    getById(page: HrSetupPage, publicId: string):
        Observable<HrSetupRow>
    {
        return this.http
            .get<any>(`${this.url(page)}/${publicId}`)
            .pipe(map(normalizeRow));
    }

    getNextCode(page: HrSetupPage):
        Observable<string>
    {
        return this.http
            .get<any>(`${this.url(page)}/defaults`)
            .pipe(map(x => String(x?.NextCode ?? x?.nextCode ?? '')));
    }

    // The page's own fields + Name, Remarks, IsActive
    private body(page: HrSetupPage, row: HrSetupRow): any
    {
        const body:
            Record<string, any> =
        {
            Name:row.Name,
            Remarks:row.Remarks,
            IsActive:row.IsActive
        };

        // (an info box is worked out on the page : not sent)
        for (const field of page.fields.filter(f => f.type !== 'info'))
        {
            body[field.key] = row[field.key];
        }

        return body;
    }

    create(page: HrSetupPage, row: HrSetupRow):
        Observable<HrSetupRow>
    {
        return this.http
            .post<any>(this.url(page), this.body(page, row))
            .pipe(map(normalizeRow));
    }

    update(page: HrSetupPage, publicId: string, row: HrSetupRow):
        Observable<void>
    {
        return this.http.put<void>(`${this.url(page)}/${publicId}`, this.body(page, row));
    }

    delete(page: HrSetupPage, publicId: string):
        Observable<void>
    {
        return this.http.delete<void>(`${this.url(page)}/${publicId}`);
    }

    restore(page: HrSetupPage):
        Observable<string>
    {
        return this.http
            .put<any>(`${this.url(page)}/restore`, {})
            .pipe(map(x => String(x?.Code ?? x?.code ?? '')));
    }

    getHistory(page: HrSetupPage):
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.url(page)}/history`);
    }

    //===========================================================
    // The weekly holiday (Holidays > Weekly Holidays tab) : one
    // record
    //===========================================================

    private readonly weeklyUrl =
        `${environment.apiUrl}/human-resource-manangement/human-resource-setup/weekly-holiday`;

    private weekly(x: any): { WeeklyOffDays: string; Remarks: string; OwnCount: number }
    {
        return {
            WeeklyOffDays:String(x?.WeeklyOffDays ?? x?.weeklyOffDays ?? ''),
            Remarks:String(x?.Remarks ?? x?.remarks ?? ''),
            OwnCount:Number(x?.OwnCount ?? x?.ownCount ?? 0) || 0
        };
    }

    getWeeklyHoliday():
        Observable<{ WeeklyOffDays: string; Remarks: string; OwnCount: number }>
    {
        return this.http
            .get<any>(this.weeklyUrl)
            .pipe(map(x => this.weekly(x)));
    }

    saveWeeklyHoliday(weeklyOffDays: string, remarks: string):
        Observable<{ WeeklyOffDays: string; Remarks: string; OwnCount: number }>
    {
        return this.http
            .put<any>(this.weeklyUrl, { WeeklyOffDays:weeklyOffDays, Remarks:remarks })
            .pipe(map(x => this.weekly(x)));
    }
}
