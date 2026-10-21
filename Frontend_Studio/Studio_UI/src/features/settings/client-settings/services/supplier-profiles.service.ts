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
    Supplier,
    CreateSupplier,
    UpdateSupplier,
    SupplierProfilesDefaults
}
from '../models/supplier-profiles.model';


//===============================================================
// Supplier Profiles Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class SupplierProfilesService
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
        `${environment.apiUrl}/settings/client-settings/supplier-profiles`;


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
        Supplier
    {
        const text =
            (name: string): string =>
                String(this.pick(item, name) ?? '');

        return {
            SupplierId:
                Number(this.pick(item, 'SupplierId') ?? 0),

            SupplierCode:
                text('SupplierCode'),

            SupplierType:
                text('SupplierType'),

            SupplierName:
                text('SupplierName'),

            DisplayName:
                text('DisplayName'),

            BrandManagementId:
                this.pick(item, 'BrandManagementId') == null || Number(this.pick(item, 'BrandManagementId')) <= 0
                    ? null
                    : Number(this.pick(item, 'BrandManagementId')),

            ContactPerson:
                text('ContactPerson'),

            Phone1:
                text('Phone1'),

            Phone2:
                text('Phone2'),

            Email:
                text('Email'),

            Address:
                text('Address'),

            TradeLicenseNo:
                text('TradeLicenseNo'),

            BinNo:
                text('BinNo'),

            TinNo:
                text('TinNo'),

            PayableLedgerCode:
                text('PayableLedgerCode'),

            PayableLedgerName:
                text('PayableLedgerName'),

            CreditDays:
                Number(this.pick(item, 'CreditDays') ?? 0),

            Remarks:
                text('Remarks'),

            IsActive:
                Boolean(
                    this.pick(item, 'IsActive')
                    ??
                    true
                ),

            BrandName:
                text('BrandName')
        };
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<Supplier[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        (response ?? []).map(
                            item =>
                                this.normalize(
                                    item
                                )
                        )
                )
            );
    }


    //===========================================================
    // Get Defaults (next codes, payable sub group, types, brands)
    //===========================================================

    getDefaults():
        Observable<SupplierProfilesDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    response =>
                    {
                        const text =
                            (name: string): string =>
                                String(this.pick(response, name) ?? '');

                        return {
                            NextSupplierCode:
                                text('NextSupplierCode'),

                            NextLedgerCode:
                                text('NextLedgerCode'),

                            PayableSubGroupCode:
                                text('PayableSubGroupCode'),

                            PayableSubGroupName:
                                text('PayableSubGroupName'),

                            PayableSubGroupMessage:
                                text('PayableSubGroupMessage'),

                            SupplierTypes:
                                (this.pick(response, 'SupplierTypes') ?? []).map(
                                    (item: any) =>
                                        String(item ?? '')
                                ),

                            Brands:
                                (this.pick(response, 'Brands') ?? []).map(
                                    (item: any) =>
                                    ({
                                        BrandManagementId:
                                            Number(this.pick(item, 'BrandManagementId') ?? 0),

                                        BrandName:
                                            String(this.pick(item, 'BrandName') ?? ''),

                                        IsActive:
                                            Boolean(this.pick(item, 'IsActive') ?? true)
                                    })
                                )
                        };
                    }
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
        Observable<Supplier>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/${id}`
            )
            .pipe(
                map(
                    response =>
                        this.normalize(
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
            CreateSupplier
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
            UpdateSupplier
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