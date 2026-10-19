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
    CustomizedService,
    CreateCustomizedService,
    UpdateCustomizedService,
    CustomizedServicesDefaults,
    CustomizedServiceSubCategoryOption
}
from '../models/customized-services.model';


//===============================================================
// Customized Services Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class CustomizedServicesService
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
        `${environment.apiUrl}/settings/service-settings/customized-services`;


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
        CustomizedService
    {
        const text =
            (name: string): string =>
                String(this.pick(item, name) ?? '');

        const num =
            (name: string): number =>
                Number(this.pick(item, name) ?? 0);

        return {
            CustomizedServiceId:
                num('CustomizedServiceId'),

            ServiceCode:
                text('ServiceCode'),

            ServiceSubCategoryId:
                num('ServiceSubCategoryId'),

            SubCategoryCode:
                text('SubCategoryCode'),

            SubCategoryName:
                text('SubCategoryName'),

            ServiceName:
                text('ServiceName'),

            StandardMinutes:
                num('StandardMinutes'),

            ServiceCharge:
                num('ServiceCharge'),

            IncomeLedgerCode:
                text('IncomeLedgerCode'),

            IncomeLedgerName:
                text('IncomeLedgerName'),

            Remarks:
                text('Remarks'),

            IsActive:
                Boolean(
                    this.pick(item, 'IsActive')
                    ??
                    true
                )
        };
    }


    //===========================================================
    // Normalize Sub Category Option
    //===========================================================

    private normalizeOption
    (
        item:
            any
    ):
        CustomizedServiceSubCategoryOption
    {
        const text =
            (name: string): string =>
                String(this.pick(item, name) ?? '');

        return {
            ServiceSubCategoryId:
                Number(this.pick(item, 'ServiceSubCategoryId') ?? 0),

            SubCategoryCode:
                text('SubCategoryCode'),

            SubCategoryName:
                text('SubCategoryName'),

            CategoryName:
                text('CategoryName'),

            IsActive:
                Boolean(this.pick(item, 'IsActive') ?? false),

            ItemCreationAllowed:
                Boolean(this.pick(item, 'ItemCreationAllowed') ?? false),

            NextServiceCode:
                text('NextServiceCode'),

            NextIncomeLedgerCode:
                text('NextIncomeLedgerCode'),

            Message:
                text('Message')
        };
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<CustomizedService[]>
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
    // Get Defaults (Service Categories + next codes)
    //===========================================================

    getDefaults():
        Observable<CustomizedServicesDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    response =>
                    ({
                        SubCategories:
                            (this.pick(response, 'SubCategories') ?? []).map(
                                (item: any) =>
                                    this.normalizeOption(
                                        item
                                    )
                            )
                    })
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
        Observable<CustomizedService>
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
            CreateCustomizedService
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
            UpdateCustomizedService
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