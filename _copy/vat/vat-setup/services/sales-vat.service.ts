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
    SalesVat,
    CreateSalesVat,
    UpdateSalesVat,
    ExtendSalesVat,
    SalesVatDefaults
}
from '../models/sales-vat.model';


//===============================================================
// Sales VAT Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class SalesVatService
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
        `${environment.apiUrl}/vat-management/vat-setup/sales-vat`;


    //===========================================================
    // Read a value in PascalCase or camelCase
    //===========================================================

    private pick
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
        )
        {
            return undefined;
        }

        const camel =
            name.charAt(0).toLowerCase() + name.slice(1);

        return item[name] ?? item[camel];
    }


    //===========================================================
    // Normalize
    //===========================================================

    normalize
    (
        item:
            any
    ):
        SalesVat
    {
        const text =
            (name: string): string =>
                String(this.pick(item, name) ?? '');

        return {
            SalesVatId:
                Number(this.pick(item, 'SalesVatId') ?? 0) || 0,

            VatCode:
                text('VatCode'),

            VatType:
                text('VatType'),

            VatRate:
                Number(this.pick(item, 'VatRate') ?? 0) || 0,

            PriceIncludesVat:
                Boolean(this.pick(item, 'PriceIncludesVat') ?? true),

            EffectiveFrom:
                text('EffectiveFrom').substring(0, 10),

            ValidTo:
                text('ValidTo').substring(0, 10),

            RateState:
                text('RateState'),

            DaysToExpiry:
                Number(this.pick(item, 'DaysToExpiry') ?? 0) || 0,

            LedgerCode:
                text('LedgerCode'),

            LedgerName:
                text('LedgerName'),

            Remarks:
                text('Remarks'),

            Status:
                Boolean(this.pick(item, 'Status') ?? true)
        };
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<SalesVat[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        (response ?? []).map
                        (
                            item =>
                                this.normalize(item)
                        )
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
        Observable<SalesVat>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/${id}`
            )
            .pipe(
                map(
                    item =>
                        this.normalize(item)
                )
            );
    }


    //===========================================================
    // Get Rate : the rule in force for a VAT Type on a date
    // (yyyy-MM-dd); 404 when none
    //===========================================================

    getRate
    (
        vatType:
            string,
        date:
            string
    ):
        Observable<SalesVat>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/rate`,
                {
                    params:
                    {
                        vatType,
                        date
                    }
                }
            )
            .pipe(
                map(
                    item =>
                        this.normalize(item)
                )
            );
    }


    //===========================================================
    // Get Defaults (next code, VAT types, ledgers, today)
    //===========================================================

    getDefaults():
        Observable<SalesVatDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    item =>
                    {
                        const suggested =
                            this.pick(item, 'SuggestedLedgers') ?? {};

                        return {
                            Code:
                                String(this.pick(item, 'Code') ?? ''),

                            VatTypes:
                                ((this.pick(item, 'VatTypes') ?? []) as any[]).map(String),

                            Ledgers:
                                ((this.pick(item, 'Ledgers') ?? []) as any[]).map
                                (
                                    ledger =>
                                    ({
                                        LedgerCode:
                                            String(this.pick(ledger, 'LedgerCode') ?? ''),

                                        LedgerName:
                                            String(this.pick(ledger, 'LedgerName') ?? ''),

                                        IsActive:
                                            Boolean(this.pick(ledger, 'IsActive') ?? true)
                                    })
                                ),

                            SuggestedLedgers:
                                Object.fromEntries(
                                    Object.entries(suggested)
                                        .map(([type, code]) => [type, String(code ?? '')])
                                ),

                            Today:
                                String(this.pick(item, 'Today') ?? '').substring(0, 10),

                            DefaultValidTo:
                                String(this.pick(item, 'DefaultValidTo') ?? '').substring(0, 10),

                            ReminderDays:
                                Number(this.pick(item, 'ReminderDays') ?? 30) || 30
                        };
                    }
                )
            );
    }


    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateSalesVat
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
            UpdateSalesVat
    ):
        Observable<void>
    {
        return this.http.put<void>(
            this.apiUrl,
            model
        );
    }


    //===========================================================
    // Extend (same rate, later Valid To)
    //===========================================================

    extend
    (
        model:
            ExtendSalesVat
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/extend`,
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
    // Restore (most recently deleted)
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
    // History
    //===========================================================

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`
        );
    }
}