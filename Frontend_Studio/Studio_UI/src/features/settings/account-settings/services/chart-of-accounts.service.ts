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
    CoaClassNode,
    CoaGroupNode,
    CoaSubGroupNode,
    CoaLedgerRow,
    CoaLedgerType
}
from '../models/chart-of-accounts.model';


//===============================================================
// Case-Insensitive Field Reader
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

function text
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

function num
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

function bool
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

function list
(
    item:
        any,
    name:
        string
):
    any[]
{
    const value =
        readField(item, name);

    return Array.isArray(value)
        ? value
        : [];
}


//===============================================================
// Normalizers (API → Model)
//===============================================================

function normalizeSubGroup
(
    item:
        any
):
    CoaSubGroupNode
{
    return {
        Id:
            num(item, 'Id'),

        Code:
            text(item, 'Code'),

        Name:
            text(item, 'Name'),

        Status:
            bool(item, 'Status', true),

        LedgerCount:
            num(item, 'LedgerCount'),

        ActiveLedgerCount:
            num(item, 'ActiveLedgerCount')
    };
}

function normalizeGroup
(
    item:
        any
):
    CoaGroupNode
{
    return {
        Id:
            num(item, 'Id'),

        Code:
            text(item, 'Code'),

        Name:
            text(item, 'Name'),

        Status:
            bool(item, 'Status', true),

        SubGroups:
            list(item, 'SubGroups').map(normalizeSubGroup)
    };
}

export function normalizeClass
(
    item:
        any
):
    CoaClassNode
{
    return {
        Id:
            num(item, 'Id'),

        Code:
            text(item, 'Code'),

        Name:
            text(item, 'Name'),

        Status:
            bool(item, 'Status', true),

        Groups:
            list(item, 'Groups').map(normalizeGroup)
    };
}

const LEDGER_TYPES:
    CoaLedgerType[] =
    ['GL', 'Cash', 'Bank', 'MFS', 'POS'];

export function normalizeLedger
(
    item:
        any
):
    CoaLedgerRow
{
    const type =
        text(item, 'Type');

    return {
        Id:
            num(item, 'Id'),

        SubGroupId:
            num(item, 'SubGroupId'),

        Code:
            text(item, 'Code'),

        Name:
            text(item, 'Name'),

        Type:
            LEDGER_TYPES.find
            (
                t =>
                    t.toLowerCase() === type.toLowerCase()
            )
            ??
            'GL',

        Branch:
            text(item, 'Branch'),

        Status:
            bool(item, 'Status', true)
    };
}


//===============================================================
// Chart of Accounts Service (read-only)
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class ChartOfAccountsService
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
        `${environment.apiUrl}/settings/account-settings/chart-of-accounts`;


    //===========================================================
    // Get Tree (Class → Group → Sub Group, with counts)
    //===========================================================

    getTree():
        Observable<CoaClassNode[]>
    {
        return this.http
            .get<any[]>(
                `${this.apiUrl}/tree`
            )
            .pipe(
                map(
                    response =>
                        (Array.isArray(response) ? response : [])
                            .map(normalizeClass)
                )
            );
    }


    //===========================================================
    // Get Ledgers Of One Sub Group
    //===========================================================

    getSubGroupLedgers
    (
        subGroupId:
            number
    ):
        Observable<CoaLedgerRow[]>
    {
        return this.http
            .get<any[]>(
                `${this.apiUrl}/sub-groups/${subGroupId}/ledgers`
            )
            .pipe(
                map(
                    response =>
                        (Array.isArray(response) ? response : [])
                            .map(normalizeLedger)
                )
            );
    }


    //===========================================================
    // Get All Ledgers (used for printing)
    //===========================================================

    getAllLedgers():
        Observable<CoaLedgerRow[]>
    {
        return this.http
            .get<any[]>(
                `${this.apiUrl}/ledgers`
            )
            .pipe(
                map(
                    response =>
                        (Array.isArray(response) ? response : [])
                            .map(normalizeLedger)
                )
            );
    }
}