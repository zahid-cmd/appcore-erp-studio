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
    FinancialYear,
    FinancialYearStatus,
    CreateFinancialYear,
    UpdateFinancialYear
}
from '../models/financial-years.model';


//===============================================================
// Case-Insensitive Field Reader
//
// ASP.NET Core camel-cases JSON names :
//   FinancialYearId → "financialYearId"
// This reads a field regardless of its casing.
//===============================================================

function readField
(
    item:
        any,
    name:
        string
):
    any
{
    if
    (
        item == null
        ||
        typeof item !== 'object'
    )
    {
        return undefined;
    }

    if
    (
        name in item
    )
    {
        return item[name];
    }

    const target =
        name.toLowerCase();

    const key =
        Object.keys(item).find
        (
            k =>
                k.toLowerCase() ===
                target
        );

    return key !== undefined
        ? item[key]
        : undefined;
}


//===============================================================
// Typed Readers
//===============================================================

function readText
(
    item:
        any,
    name:
        string
):
    string
{
    return String(
        readField(item, name)
        ??
        ''
    ).trim();
}

function readNumber
(
    item:
        any,
    name:
        string
):
    number
{
    const value =
        Number(
            readField(item, name)
            ??
            0
        );

    return Number.isFinite(value)
        ? value
        : 0;
}

function readBool
(
    item:
        any,
    name:
        string,
    fallback:
        boolean
):
    boolean
{
    const value =
        readField(item, name);

    return value == null
        ? fallback
        : Boolean(value);
}

//===============================================================
// Date Reader
//
// The API may send "2026-07-01" or "2026-07-01T00:00:00".
// Only the date part "YYYY-MM-DD" is kept.
//===============================================================

function readDate
(
    item:
        any,
    name:
        string
):
    string
{
    const value =
        readText(item, name);

    return /^\d{4}-\d{2}-\d{2}/.test(value)
        ? value.substring(0, 10)
        : '';
}

//===============================================================
// Year Status Reader
//===============================================================

function readYearStatus
(
    item:
        any
):
    FinancialYearStatus
{
    const value =
        readText(item, 'YearStatus').toLowerCase();

    switch
    (
        value
    )
    {
        case 'closed':
            return 'Closed';

        case 'locked':
            return 'Locked';

        default:
            return 'Open';
    }
}


//===============================================================
// Normalize Financial Year (API → Model)
//===============================================================

export function normalizeFinancialYear
(
    item:
        any
):
    FinancialYear
{
    return {
        FinancialYearId:
            readNumber(item, 'FinancialYearId'),

        FinancialYearCode:
            readText(item, 'FinancialYearCode'),

        FinancialYearName:
            readText(item, 'FinancialYearName'),

        StartDate:
            readDate(item, 'StartDate'),

        EndDate:
            readDate(item, 'EndDate'),

        IsCurrent:
            readBool(item, 'IsCurrent', false),

        YearStatus:
            readYearStatus(item),

        Remarks:
            readText(item, 'Remarks'),

        Status:
            readBool(item, 'Status', true)
    };
}


//===============================================================
// Financial Years Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class FinancialYearsService
{
    //===========================================================
    // Injection
    //===========================================================

    private readonly http =
        inject(HttpClient);


    //===========================================================
    // API
    //===========================================================

    private readonly apiUrl =
        `${environment.apiUrl}/settings/general-settings/financial-years`;


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<FinancialYear[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        (Array.isArray(response) ? response : [])
                            .map(
                                item =>
                                    normalizeFinancialYear(
                                        item
                                    )
                            )
                )
            );
    }


    //===========================================================
    // Get Next Code
    //
    // The API returns a plain string; quotes are stripped in
    // case it arrives JSON-encoded ("\"FY-0001\"").
    //===========================================================

    getNextCode():
        Observable<string>
    {
        return this.http
            .get(
                `${this.apiUrl}/next-code`,
                {
                    responseType:
                        'text'
                }
            )
            .pipe(
                map(
                    code =>
                        String(code ?? '')
                            .trim()
                            .replace(/^"+|"+$/g, '')
                )
            );
    }


    //===========================================================
    // Get Current
    //
    // The financial year marked as current (null if none).
    // Used by vouchers / reports for their default dates.
    //===========================================================

    getCurrent():
        Observable<FinancialYear | null>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/current`
            )
            .pipe(
                map(
                    response =>
                        response
                            ? normalizeFinancialYear(
                                response
                            )
                            : null
                )
            );
    }


    //===========================================================
    // Get By Id
    //===========================================================

    getById
    (
        id:
            number
    ):
        Observable<FinancialYear>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/${id}`
            )
            .pipe(
                map(
                    response =>
                        normalizeFinancialYear(
                            response
                        )
                )
            );
    }


    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateFinancialYear
    ):
        Observable<number>
    {
        return this.http.post<number>(
            this.apiUrl,
            model
        );
    }


    //===========================================================
    // Update
    //===========================================================

    update
    (
        model:
            UpdateFinancialYear
    ):
        Observable<void>
    {
        return this.http.put<void>(
            this.apiUrl,
            model
        );
    }


    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        id:
            number
    ):
        Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Restore
    //===========================================================

    restore():
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/restore`,
            {}
        );
    }


    //===========================================================
    // Get History
    //===========================================================

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`
        );
    }
}