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
    AccountOrigin,
    AutoAccountCodes
}
from '../models/auto-accounts.model';


//===============================================================
// Helpers
//===============================================================

// Case-insensitive field read (PascalCase or camelCase API)
function readList
(
    item:
        any,
    name:
        string
):
    string[]
{
    if
    (
        item == null
        ||
        typeof item !== 'object'
    )
    {
        return [];
    }

    const key =
        Object.keys(item).find
        (
            k =>
                k.toLowerCase() ===
                name.toLowerCase()
        );

    const value =
        key !== undefined
            ? item[key]
            : undefined;

    return Array.isArray(value)
        ? value
        : [];
}

function toSet
(
    values:
        string[]
):
    Set<string>
{
    return new Set<string>(
        values
            .map
            (
                value =>
                    String(value ?? '')
                        .trim()
                        .toUpperCase()
            )
            .filter
            (
                value =>
                    !!value
            )
    );
}

export function emptyAutoAccountCodes():
    AutoAccountCodes
{
    return {
        InventoryGroupCodes:new Set<string>(),
        InventorySubGroupCodes:new Set<string>(),
        InventoryLedgerCodes:new Set<string>(),
        FinancialGroupCodes:new Set<string>(),
        FinancialSubGroupCodes:new Set<string>(),
        FinancialLedgerCodes:new Set<string>()
    };
}


//===============================================================
// Origin Of A Code
//===============================================================

function originOf
(
    code:
        string | null | undefined,
    inventory:
        Set<string>,
    financial:
        Set<string>
):
    AccountOrigin
{
    const key =
        String(code ?? '')
            .trim()
            .toUpperCase();

    if
    (
        key
        &&
        inventory.has(key)
    )
    {
        return 'inventory';
    }

    if
    (
        key
        &&
        financial.has(key)
    )
    {
        return 'financial';
    }

    return 'manual';
}

export function groupOrigin
(
    codes:
        AutoAccountCodes,
    groupCode:
        string | null | undefined
):
    AccountOrigin
{
    return originOf(
        groupCode,
        codes.InventoryGroupCodes,
        codes.FinancialGroupCodes
    );
}

export function subGroupOrigin
(
    codes:
        AutoAccountCodes,
    subGroupCode:
        string | null | undefined
):
    AccountOrigin
{
    return originOf(
        subGroupCode,
        codes.InventorySubGroupCodes,
        codes.FinancialSubGroupCodes
    );
}

export function ledgerOrigin
(
    codes:
        AutoAccountCodes,
    ledgerCode:
        string | null | undefined
):
    AccountOrigin
{
    return originOf(
        ledgerCode,
        codes.InventoryLedgerCodes,
        codes.FinancialLedgerCodes
    );
}


//===============================================================
// Auto Accounts Service (read-only, never cached)
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class AutoAccountsService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/settings/account-settings/auto-accounts`;

    getCodes():
        Observable<AutoAccountCodes>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/codes`
            )
            .pipe(
                map(
                    response =>
                    ({
                        InventoryGroupCodes:
                            toSet(readList(response, 'InventoryGroupCodes')),

                        InventorySubGroupCodes:
                            toSet(readList(response, 'InventorySubGroupCodes')),

                        InventoryLedgerCodes:
                            toSet(readList(response, 'InventoryLedgerCodes')),

                        FinancialGroupCodes:
                            toSet(readList(response, 'FinancialGroupCodes')),

                        FinancialSubGroupCodes:
                            toSet(readList(response, 'FinancialSubGroupCodes')),

                        FinancialLedgerCodes:
                            toSet(readList(response, 'FinancialLedgerCodes'))
                    })
                )
            );
    }
}