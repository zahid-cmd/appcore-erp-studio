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
    BikeAccessorySchemes,

    BikeAccessorySchemesDefaults,

    BikeAccessorySchemesPageQuery,

    CreateBikeAccessorySchemes,

    UpdateBikeAccessorySchemes
}
from '../models/bike-accessory-schemes.model';

import
{
    normalizeAccessoryUse
}
from '../models/accessories.model';

import
{
    PagedResult,
    toPagedParams,
    toPagedResult
}
from '../../../../shared/paging/paged-result.model';


//===============================================================
// Read helpers (PascalCase or camelCase from the API)
//===============================================================

const pick =
    (
        x: any,
        name: string
    ): any =>
        x?.[name] ?? x?.[name.charAt(0).toLowerCase() + name.slice(1)];

const text =
    (
        x: any,
        name: string
    ): string =>
        String(pick(x, name) ?? '');

const num =
    (
        x: any,
        name: string
    ): number =>
        Number(pick(x, name) ?? 0) || 0;

// '2026-11-06' (DateOnly) / '2026-11-06T00:00:00' → '2026-11-06'
const day =
    (
        value: any
    ): string =>
        String(value ?? '').slice(0, 10);


//===============================================================
// Normalize one scheme (list rows and the form)
//===============================================================

export function normalizeBikeAccessoryScheme
(
    x: any
):
    BikeAccessorySchemes
{
    const validTo =
        day(pick(x, 'ValidTo'));

    return {
        BikeAccessorySchemeId:
            num(x, 'BikeAccessorySchemeId'),
        PublicId:
            text(x, 'PublicId'),
        SchemeCode:
            text(x, 'SchemeCode'),
        SchemeName:
            text(x, 'SchemeName'),
        SchemeKind:
            text(x, 'SchemeKind') || 'Additional',
        SchemeSource:
            text(x, 'SchemeSource') || 'Supplier',
        BrandManagementId:
            num(x, 'BrandManagementId') || null,
        BrandName:
            text(x, 'BrandName'),
        ValidFrom:
            day(pick(x, 'ValidFrom')),
        ValidTo:
            validTo || null,
        Validity:
            text(x, 'Validity'),
        ModelsText:
            text(x, 'ModelsText'),
        ItemsText:
            text(x, 'ItemsText'),
        ModelCount:
            num(x, 'ModelCount'),
        ItemCount:
            num(x, 'ItemCount'),
        Models:
            ((pick(x, 'Models') ?? []) as any[])
                .map(
                    m =>
                    ({
                        BikeModelId: num(m, 'BikeModelId'),
                        ModelCode: text(m, 'ModelCode'),
                        ModelName: text(m, 'ModelName')
                    })
                ),
        Items:
            ((pick(x, 'Items') ?? []) as any[])
                .map(
                    i =>
                    ({
                        AccessoryId: num(i, 'AccessoryId'),
                        ProductCode: text(i, 'ProductCode'),
                        AccessoryName: text(i, 'AccessoryName'),
                        AccessoryUse: normalizeAccessoryUse(pick(i, 'AccessoryUse')),
                        QuantityPerBike: num(i, 'QuantityPerBike') || 1
                    })
                ),
        Remarks:
            text(x, 'Remarks'),
        Status:
            Boolean(pick(x, 'Status') ?? true)
    };
}


//===============================================================
// Bike Accessory Schemes Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class BikeAccessorySchemesService
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
        `${environment.apiUrl}/settings/product-settings/bike-accessory-schemes`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<BikeAccessorySchemes[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        (response ?? []).map(
                            x =>
                                normalizeBikeAccessoryScheme(x)
                        )
                )
            );
    }



    //===========================================================
    // Get Paged (the list page : one page with the summary counts)
    //===========================================================

    getPaged
    (
        query:
            BikeAccessorySchemesPageQuery
    ):
        Observable<PagedResult<BikeAccessorySchemes>>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/paged`,
                {
                    params:
                        toPagedParams(
                            { ...query }
                        )
                }
            )
            .pipe(
                map(
                    response =>
                        toPagedResult(
                            response,
                            item =>
                                normalizeBikeAccessoryScheme(item)
                        )
                )
            );
    }



    //===========================================================
    // Get Next Code
    //===========================================================

    getNextCode():
        Observable<string>
    {
        return this.http.get<string>(
            `${this.apiUrl}/next-code`
        );
    }



    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<BikeAccessorySchemesDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    response =>
                    ({
                        Code:
                            text(response, 'Code'),
                        Kinds:
                            ((pick(response, 'Kinds') ?? []) as any[]).map(x => String(x)),
                        Sources:
                            ((pick(response, 'Sources') ?? []) as any[]).map(x => String(x)),
                        Brands:
                            ((pick(response, 'Brands') ?? []) as any[])
                                .map(
                                    x =>
                                    ({
                                        BrandManagementId: num(x, 'BrandManagementId'),
                                        BrandName: text(x, 'BrandName'),
                                        Status: Boolean(pick(x, 'Status') ?? true)
                                    })
                                ),
                        Models:
                            ((pick(response, 'Models') ?? []) as any[])
                                .map(
                                    x =>
                                    ({
                                        BikeModelId: num(x, 'BikeModelId'),
                                        BrandManagementId: num(x, 'BrandManagementId'),
                                        ModelCode: text(x, 'ModelCode'),
                                        ModelName: text(x, 'ModelName'),
                                        Status: Boolean(pick(x, 'Status') ?? true)
                                    })
                                ),
                        Accessories:
                            ((pick(response, 'Accessories') ?? []) as any[])
                                .map(
                                    x =>
                                    ({
                                        AccessoryId: num(x, 'AccessoryId'),
                                        ProductCode: text(x, 'ProductCode'),
                                        AccessoryName: text(x, 'AccessoryName'),
                                        AccessoryUse: normalizeAccessoryUse(pick(x, 'AccessoryUse')),
                                        SubCategoryName: text(x, 'SubCategoryName'),
                                        IsActive: Boolean(pick(x, 'IsActive') ?? true)
                                    })
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
            string
    ):
        Observable<BikeAccessorySchemes>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/${id}`
            )
            .pipe(
                map(
                    x =>
                        normalizeBikeAccessoryScheme(x)
                )
            );
    }



    //===========================================================
    // Create : returns the Public Id
    //===========================================================

    create
    (
        model:
            CreateBikeAccessorySchemes
    ):
        Observable<string>
    {
        return this.http.post<string>(
            this.apiUrl,

            model
        );
    }



    //===========================================================
    // Update
    //===========================================================

    update
    (
        publicId:
            string,

        model:
            UpdateBikeAccessorySchemes
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${publicId}`,

            model
        );
    }



    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        id:
            string
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
        Observable<boolean>
    {
        return this.http.put<boolean>(
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
