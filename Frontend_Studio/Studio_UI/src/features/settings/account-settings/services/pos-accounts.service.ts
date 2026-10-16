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
    POSAccount,
    CreatePOSAccount,
    UpdatePOSAccount
}
from '../models/pos-accounts.model';


//===============================================================
// Case-Insensitive Field Reader
//
// ASP.NET Core camel-cases JSON names :
//   POSAccountId   → "posAccountId"
//   POSAccountCode → "posAccountCode"
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
// Normalize POS Account (API → Model)
//===============================================================

export function normalizePOSAccount
(
    item:
        any
):
    POSAccount
{
    return {
        POSAccountId:
            readNumber(item, 'POSAccountId'),

        AccountSubGroupsId:
            readNumber(item, 'AccountSubGroupsId'),

        POSAccountCode:
            readText(item, 'POSAccountCode'),

        POSAccountName:
            readText(item, 'POSAccountName'),

        IssuingBank:
            readText(item, 'IssuingBank'),

        TerminalNumber:
            readText(item, 'TerminalNumber'),

        LinkedBankAccount:
            readText(item, 'LinkedBankAccount'),

        Branch:
            readText(item, 'Branch'),

        CollectionAccount:
            readBool(item, 'CollectionAccount', false),

        PaymentAccount:
            readBool(item, 'PaymentAccount', false),

        BranchExclusive:
            readBool(item, 'BranchExclusive', false),

        Remarks:
            readText(item, 'Remarks'),

        Status:
            readBool(item, 'Status', true)
    };
}


//===============================================================
// POS Accounts Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class POSAccountsService
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
        `${environment.apiUrl}/settings/account-settings/pos-accounts`;


    //===========================================================
    // Get API Base URL
    //===========================================================

    getApiBaseUrl():
        string
    {
        return environment.apiUrl
            .replace(
                /\/api\/?$/,
                ''
            );
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<POSAccount[]>
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
                                    normalizePOSAccount(
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
    // case it arrives JSON-encoded ("\"POS-003-002-004-00001\"").
    //===========================================================

    getNextCode
    (
        accountSubGroupsId:
            number
    ):
        Observable<string>
    {
        return this.http
            .get(
                `${this.apiUrl}/next-code`,
                {
                    params:
                    {
                        accountSubGroupsId:
                            accountSubGroupsId
                    },

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
    // Get By Id
    //===========================================================

    getById
    (
        id:
            number
    ):
        Observable<POSAccount>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/${id}`
            )
            .pipe(
                map(
                    response =>
                        normalizePOSAccount(
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
            CreatePOSAccount
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
            UpdatePOSAccount
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


    //===========================================================
    // Get Entity History
    //===========================================================

    getEntityHistory
    (
        id:
            number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${id}/history`
        );
    }
}