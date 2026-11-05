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
    HttpClient,
    HttpParams
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
    PartsOnboardingAnalysis,
    PartsOnboardingCategory,
    PartsOnboardingDefaults,
    PartsOnboardingExisting,
    PartsOnboardingLevels,
    PartsOnboardingRequest,
    PartsOnboardingResult,
    PartsOnboardingStatus,
    PartsOnboardingType
}
from '../models/parts-onboarding.model';


//===============================================================
// Parts & Accessories Onboarding Service
//===============================================================

const pick =
    (item: any, name: string): any =>
        item?.[name] ?? item?.[name.charAt(0).toLowerCase() + name.slice(1)];

const text =
    (item: any, name: string): string =>
        String(pick(item, name) ?? '');

const num =
    (item: any, name: string): number =>
        Number(pick(item, name) ?? 0) || 0;

const levels =
    (item: any): PartsOnboardingLevels =>
    ({
        ReorderLevel: num(item, 'ReorderLevel'),
        RedLevel: num(item, 'RedLevel'),
        MaxStockLevel: num(item, 'MaxStockLevel'),
        Unit: text(item, 'Unit') || 'Pcs',
        MovementClass: text(item, 'MovementClass') || 'Slow'
    });


@Injectable(
{
    providedIn:'root'
})
export class PartsOnboardingService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/settings/product-settings/parts-onboarding`;


    getDefaults():
        Observable<PartsOnboardingDefaults>
    {
        return this.http
            .get<any>(`${this.apiUrl}/defaults`)
            .pipe(
                map(
                    r =>
                    ({
                        Units:
                            ((pick(r, 'Units') ?? []) as any[]).map(x => String(x)),

                        MovementClasses:
                            ((pick(r, 'MovementClasses') ?? []) as any[]).map(x => String(x)),

                        Categories:
                            ((pick(r, 'Categories') ?? []) as any[])
                                .map(
                                    (c): PartsOnboardingCategory =>
                                    ({
                                        ProductCategoryId: num(c, 'ProductCategoryId'),
                                        CategoryCode: text(c, 'CategoryCode'),
                                        CategoryName: text(c, 'CategoryName'),
                                        CategoryType: text(c, 'CategoryType'),
                                        ProductType: text(c, 'ProductType') as PartsOnboardingType,
                                        SubCategories:
                                            ((pick(c, 'SubCategories') ?? []) as any[])
                                                .map(
                                                    s =>
                                                    ({
                                                        ProductSubCategoryId: num(s, 'ProductSubCategoryId'),
                                                        SubCategoryCode: text(s, 'SubCategoryCode'),
                                                        SubCategoryName: text(s, 'SubCategoryName'),
                                                        ItemCount: num(s, 'ItemCount')
                                                    })
                                                )
                                    })
                                ),

                        SpareParts:
                            levels(pick(r, 'SpareParts')),

                        Accessories:
                            levels(pick(r, 'Accessories'))
                    })
                )
            );
    }


    getExisting
    (
        productType:
            PartsOnboardingType,

        productSubCategoryId:
            number
    ):
        Observable<PartsOnboardingExisting[]>
    {
        const params =
            new HttpParams()
                .set('productType', productType)
                .set('productSubCategoryId', String(productSubCategoryId));

        return this.http
            .get<any[]>(`${this.apiUrl}/existing`, { params })
            .pipe(
                map(
                    list =>
                        (list ?? []).map(
                            x =>
                            ({
                                ProductCode: text(x, 'ProductCode'),
                                PartNumber: text(x, 'PartNumber'),
                                Name: text(x, 'Name'),
                                Unit: text(x, 'Unit'),
                                ReorderLevel: num(x, 'ReorderLevel'),
                                RedLevel: num(x, 'RedLevel'),
                                MaxStockLevel: num(x, 'MaxStockLevel'),
                                MovementClass: text(x, 'MovementClass')
                            })
                        )
                )
            );
    }


    analyze
    (
        request:
            PartsOnboardingRequest
    ):
        Observable<PartsOnboardingAnalysis>
    {
        return this.http
            .post<any>(`${this.apiUrl}/analyze`, request)
            .pipe(
                map(
                    r =>
                    ({
                        Rows:
                            ((pick(r, 'Rows') ?? []) as any[])
                                .map(
                                    x =>
                                    ({
                                        Row: num(x, 'Row'),
                                        Status: text(x, 'Status') as PartsOnboardingStatus,
                                        Message: text(x, 'Message'),
                                        ProductCode: text(x, 'ProductCode'),
                                        PartNumber: text(x, 'PartNumber'),
                                        Name: text(x, 'Name'),
                                        Unit: text(x, 'Unit'),
                                        MovementClass: text(x, 'MovementClass')
                                    })
                                ),

                        ReadyCount: num(r, 'ReadyCount'),

                        LinkCount: num(r, 'LinkCount'),

                        Message: text(r, 'Message')
                    })
                )
            );
    }


    onboard
    (
        request:
            PartsOnboardingRequest
    ):
        Observable<PartsOnboardingResult>
    {
        return this.http
            .post<any>(this.apiUrl, request)
            .pipe(
                map(
                    r =>
                    ({
                        ProductType: text(r, 'ProductType') as PartsOnboardingType,
                        SubCategoryCode: text(r, 'SubCategoryCode'),
                        SubCategoryName: text(r, 'SubCategoryName'),
                        Items:
                            ((pick(r, 'Items') ?? []) as any[])
                                .map(
                                    x =>
                                    ({
                                        Row: num(x, 'Row'),
                                        PublicId: text(x, 'PublicId'),
                                        ProductCode: text(x, 'ProductCode'),
                                        PartNumber: text(x, 'PartNumber'),
                                        Name: text(x, 'Name')
                                    })
                                ),

                        Linked:
                            ((pick(r, 'Linked') ?? []) as any[])
                                .map(
                                    x =>
                                    ({
                                        Row: num(x, 'Row'),
                                        PublicId: text(x, 'PublicId'),
                                        ProductCode: text(x, 'ProductCode'),
                                        PartNumber: text(x, 'PartNumber'),
                                        Name: text(x, 'Name')
                                    })
                                )
                    })
                )
            );
    }
}
