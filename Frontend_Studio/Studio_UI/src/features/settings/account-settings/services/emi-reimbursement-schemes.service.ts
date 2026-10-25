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
    EmiReimbursementSchemes,
    CreateEmiReimbursementSchemes,
    UpdateEmiReimbursementSchemes,
    EmiReimbursementSchemesDefaults,
    EmiSchemeBasis
}
from '../models/emi-reimbursement-schemes.model';


//===============================================================
// EMI Reimbursement Schemes Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class EmiReimbursementSchemesService
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
        `${environment.apiUrl}/settings/account-settings/emi-reimbursement-schemes`;


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
        EmiReimbursementSchemes
    {
        const text =
            (name: string): string =>
                String(this.pick(item, name) ?? '');

        const num =
            (name: string): number =>
                Number(this.pick(item, name) ?? 0) || 0;

        const cap =
            (name: string): number | null =>
            {
                const value =
                    this.pick(item, name);

                return value == null || value === ''
                    ? null
                    : Number(value);
            };

        const basis =
            (name: string): EmiSchemeBasis =>
                text(name) === 'Fixed'
                    ? 'Fixed'
                    : 'Percent';

        return {
            EmiReimbursementSchemeId:
                num('EmiReimbursementSchemeId'),

            SchemeCode:
                text('SchemeCode'),

            BrandCode:
                text('BrandCode'),

            BrandName:
                text('BrandName'),

            SupplierCode:
                text('SupplierCode'),

            SupplierName:
                text('SupplierName'),

            ValidFrom:
                text('ValidFrom').substring(0, 10),

            ValidTo:
                text('ValidTo').substring(0, 10),

            TenureMonths:
                num('TenureMonths'),

            IsExpired:
                Boolean(this.pick(item, 'IsExpired')),

            IsUpcoming:
                Boolean(this.pick(item, 'IsUpcoming')),

            SwapBasis:
                basis('SwapBasis'),

            SwapValue:
                num('SwapValue'),

            SwapCap:
                cap('SwapCap'),

            EmiBasis:
                basis('EmiBasis'),

            EmiValue:
                num('EmiValue'),

            EmiCap:
                cap('EmiCap'),

            TotalCap:
                cap('TotalCap'),

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
        Observable<EmiReimbursementSchemes[]>
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
        Observable<EmiReimbursementSchemes>
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
    // Get Defaults (next code, brands, tenures, bases)
    //===========================================================

    getDefaults():
        Observable<EmiReimbursementSchemesDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    item =>
                    ({
                        Code:
                            String(this.pick(item, 'Code') ?? ''),

                        Brands:
                            ((this.pick(item, 'Brands') ?? []) as any[]).map
                            (
                                brand =>
                                ({
                                    BrandCode:
                                        String(this.pick(brand, 'BrandCode') ?? ''),

                                    BrandName:
                                        String(this.pick(brand, 'BrandName') ?? ''),

                                    IsActive:
                                        Boolean(this.pick(brand, 'IsActive') ?? true),

                                    SupplierCode:
                                        String(this.pick(brand, 'SupplierCode') ?? ''),

                                    SupplierName:
                                        String(this.pick(brand, 'SupplierName') ?? '')
                                })
                            ),

                        Tenures:
                            ((this.pick(item, 'Tenures') ?? []) as any[]).map(Number),

                        Bases:
                            ((this.pick(item, 'Bases') ?? []) as any[]).map(String),

                        Today:
                            String(this.pick(item, 'Today') ?? '').substring(0, 10)
                    })
                )
            );
    }


    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateEmiReimbursementSchemes
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
            UpdateEmiReimbursementSchemes
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