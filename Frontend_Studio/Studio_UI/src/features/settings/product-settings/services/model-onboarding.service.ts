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
    ModelOnboardingDefaults,
    ModelOnboardingRequest,
    ModelOnboardingResult
}
from '../models/model-onboarding.model';


//===============================================================
// Model Onboarding Service
//===============================================================

const pick =
    (item: any, name: string): any =>
        item?.[name] ?? item?.[name.charAt(0).toLowerCase() + name.slice(1)];


@Injectable(
{
    providedIn:'root'
})
export class ModelOnboardingService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/settings/product-settings/model-onboarding`;


    getDefaults():
        Observable<ModelOnboardingDefaults>
    {
        return this.http
            .get<any>(`${this.apiUrl}/defaults`)
            .pipe(
                map(
                    r =>
                    ({
                        Brands:
                            ((pick(r, 'Brands') ?? []) as any[])
                                .map(
                                    b =>
                                    ({
                                        BrandManagementId: Number(pick(b, 'BrandManagementId') ?? 0),
                                        BrandName: String(pick(b, 'BrandName') ?? ''),
                                        ProductCategoryId: Number(pick(b, 'ProductCategoryId') ?? 0),
                                        CategoryCode: String(pick(b, 'CategoryCode') ?? ''),
                                        CategoryName: String(pick(b, 'CategoryName') ?? ''),
                                        NextSubCategoryCode: String(pick(b, 'NextSubCategoryCode') ?? ''),
                                        ExistingModels: ((pick(b, 'ExistingModels') ?? []) as any[]).map(x => String(x))
                                    })
                                ),

                        BikeTypes:
                            ((pick(r, 'BikeTypes') ?? []) as any[]).map(x => String(x)),

                        Colors:
                            ((pick(r, 'Colors') ?? []) as any[])
                                .map(
                                    c =>
                                    ({
                                        ColorManagementId: Number(pick(c, 'ColorManagementId') ?? 0),
                                        ColorName: String(pick(c, 'ColorName') ?? '')
                                    })
                                ),

                        NextModelCode: String(pick(r, 'NextModelCode') ?? ''),

                        LastBikeType: String(pick(r, 'LastBikeType') ?? ''),

                        ReorderLevel: Number(pick(r, 'ReorderLevel') ?? 0),

                        RedLevel: Number(pick(r, 'RedLevel') ?? 0),

                        MaxStockLevel: Number(pick(r, 'MaxStockLevel') ?? 0)
                    })
                )
            );
    }


    onboard
    (
        request:
            ModelOnboardingRequest
    ):
        Observable<ModelOnboardingResult>
    {
        return this.http
            .post<any>(this.apiUrl, request)
            .pipe(
                map(
                    r =>
                    ({
                        BikeModelId: Number(pick(r, 'BikeModelId') ?? 0),
                        ModelCode: String(pick(r, 'ModelCode') ?? ''),
                        ProductSubCategoryId: Number(pick(r, 'ProductSubCategoryId') ?? 0),
                        SubCategoryCode: String(pick(r, 'SubCategoryCode') ?? ''),
                        SubCategoryName: String(pick(r, 'SubCategoryName') ?? ''),
                        Bikes:
                            ((pick(r, 'Bikes') ?? []) as any[])
                                .map(
                                    b =>
                                    ({
                                        ColorManagementId: Number(pick(b, 'ColorManagementId') ?? 0),
                                        PublicId: String(pick(b, 'PublicId') ?? ''),
                                        ProductCode: String(pick(b, 'ProductCode') ?? ''),
                                        ProductName: String(pick(b, 'ProductName') ?? '')
                                    })
                                )
                    })
                )
            );
    }
}
