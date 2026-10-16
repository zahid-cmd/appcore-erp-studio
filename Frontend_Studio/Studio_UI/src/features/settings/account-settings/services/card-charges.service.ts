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
    CardCharges,
    CardChargeLine,
    SaveCardCharges
}
from '../models/card-charges.model';


//===============================================================
// Case-Insensitive Field Reader
//
// ASP.NET Core camel-cases JSON names ("POSAccountId" →
// "posAccountId"). This reads a field regardless of casing.
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
// Normalize Line (API → Model)
//===============================================================

export function normalizeCardChargeLine
(
    item:
        any
):
    CardChargeLine
{
    return {
        CardChargeId:
            readNumber(item, 'CardChargeId'),

        CardSetupId:
            readNumber(item, 'CardSetupId'),

        CardCode:
            readText(item, 'CardCode'),

        CardName:
            readText(item, 'CardName'),

        ChargePercent:
            Math.round(
                readNumber(item, 'ChargePercent') * 100
            ) / 100
    };
}


//===============================================================
// Normalize Card Charges (API → Model)
//
// CardCount / CardNames fall back to the lines when the API
// does not send them.
//===============================================================

export function normalizeCardCharges
(
    item:
        any
):
    CardCharges
{
    const rawDetails =
        readField(item, 'Details');

    const details:
        CardChargeLine[] =
        Array.isArray(rawDetails)
            ? rawDetails.map
              (
                  line =>
                      normalizeCardChargeLine(
                          line
                      )
              )
            : [];

    const cardNames =
        readText(item, 'CardNames')
        ||
        details
            .map(line => line.CardName)
            .filter(name => !!name)
            .join(', ');

    const cardCount =
        readNumber(item, 'CardCount')
        ||
        details.length;

    return {
        POSAccountId:
            readNumber(item, 'POSAccountId'),

        POSAccountCode:
            readText(item, 'POSAccountCode'),

        POSAccountName:
            readText(item, 'POSAccountName'),

        Status:
            readBool(item, 'Status', true),

        CardCount:
            cardCount,

        CardNames:
            cardNames,

        Details:
            details
    };
}


//===============================================================
// Card Charges Service
//
// Every call is keyed by POS Account Id (the master record).
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class CardChargesService
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
        `${environment.apiUrl}/settings/account-settings/card-charges`;


    //===========================================================
    // Get All
    //
    // One row per POS Account that has card charges.
    //===========================================================

    getAll():
        Observable<CardCharges[]>
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
                                    normalizeCardCharges(
                                        item
                                    )
                            )
                )
            );
    }


    //===========================================================
    // Get By POS Account
    //
    // All card lines of one POS Account.
    //===========================================================

    getByPosAccount
    (
        posAccountId:
            number
    ):
        Observable<CardCharges>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/${posAccountId}`
            )
            .pipe(
                map(
                    response =>
                        normalizeCardCharges(
                            response
                        )
                )
            );
    }


    //===========================================================
    // Create
    //
    // For a POS Account that has no card charges yet.
    //===========================================================

    create
    (
        model:
            SaveCardCharges
    ):
        Observable<void>
    {
        return this.http.post<void>(
            this.apiUrl,
            model
        );
    }


    //===========================================================
    // Update
    //
    // Replaces all lines of the POS Account.
    //===========================================================

    update
    (
        model:
            SaveCardCharges
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
    //
    // Soft-deletes all card lines of the POS Account.
    //===========================================================

    delete
    (
        posAccountId:
            number
    ):
        Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/${posAccountId}`
        );
    }


    //===========================================================
    // Restore
    //
    // Restores the most recently deleted POS Account's lines.
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
    // Get POS Account History
    //===========================================================

    getEntityHistory
    (
        posAccountId:
            number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${posAccountId}/history`
        );
    }
}