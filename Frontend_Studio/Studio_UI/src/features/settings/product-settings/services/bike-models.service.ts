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
    BikeModels,

    CreateBikeModels,

    UpdateBikeModels,

    BikeModelsDefaults
}
from '../models/bike-models.model';

import
{
    BikeModelsPageQuery
}
from '../models/bike-models.model';

import
{
    PagedResult,
    toPagedParams,
    toPagedResult
}
from '../../../../shared/paging/paged-result.model';


//===============================================================
// Bike Models Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class BikeModelsService
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
        `${environment.apiUrl}/settings/product-settings/bike-models`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<BikeModels[]>
    {
        return this.http

            .get<any[]>(
                this.apiUrl
            )

            .pipe(
                map(
                    response =>

                        response.map(
                            bikeModel =>
                            ({
                                ...bikeModel,

                                BikeModelId:
                                    Number(bikeModel.BikeModelId ?? bikeModel.bikeModelId ?? bikeModel.id ?? bikeModel.Id),


                                PublicId:

                                    String(bikeModel?.PublicId ?? bikeModel?.publicId ?? ''),

                                ModelCode:
                                    bikeModel.ModelCode ?? bikeModel.modelCode ?? '',

                                BrandManagementId:
                                    Number(bikeModel.BrandManagementId ?? bikeModel.brandManagementId ?? 0),

                                BrandCode:
                                    bikeModel.BrandCode ?? bikeModel.brandCode ?? '',

                                BrandName:
                                    bikeModel.BrandName ?? bikeModel.brandName ?? '',

                                ModelName:
                                    bikeModel.ModelName ?? bikeModel.modelName ?? '',

                                BikeType:
                                    bikeModel.BikeType ?? bikeModel.bikeType ?? '',

                                ShowOnWebsite:
                                    Boolean(bikeModel.ShowOnWebsite ?? bikeModel.showOnWebsite ?? false),

                                IsFeatured:
                                    Boolean(bikeModel.IsFeatured ?? bikeModel.isFeatured ?? false),

                                Tagline:
                                    bikeModel.Tagline ?? bikeModel.tagline ?? '',

                                Description:
                                    bikeModel.Description ?? bikeModel.description ?? '',

                                DisplayOrder:
                                    Number(bikeModel.DisplayOrder ?? bikeModel.displayOrder ?? 0),

                                Remarks:
                                    bikeModel.Remarks ?? bikeModel.remarks ?? '',

                                Status:
                                    Boolean(bikeModel.Status ?? bikeModel.status ?? true)
                            })
                        )
                )
            );
    }



    //===========================================================
    // Get Paged (the list page : one page from the server, with
    // the summary counts; rows are normalized by the list)
    //===========================================================

    getPaged
    (
        query:
            BikeModelsPageQuery
    ):
        Observable<PagedResult<any>>
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
                                item
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
        Observable<BikeModelsDefaults>
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
                            response.code
                            ??
                            response.Code
                            ??
                            '',
                        Brands:
                            ((response.brands ?? response.Brands ?? []) as any[])
                                .map(
                                    x =>
                                    ({
                                        BrandManagementId:
                                            Number(x.brandManagementId ?? x.BrandManagementId ?? 0),
                                        BrandCode:
                                            x.brandCode ?? x.BrandCode ?? '',
                                        BrandName:
                                            x.brandName ?? x.BrandName ?? '',
                                        Status:
                                            Boolean(x.status ?? x.Status ?? true)
                                    })
                                ),
                        BikeTypes:
                            ((response.bikeTypes ?? response.BikeTypes ?? []) as any[])
                                .map(x => String(x)),
                        LastBikeType:
                            response.lastBikeType
                            ??
                            response.LastBikeType
                            ??
                            ''
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
        Observable<BikeModels>
    {
        return this.http.get<BikeModels>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateBikeModels
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
            UpdateBikeModels
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



    //===========================================================
    // Get Entity History
    //===========================================================

    getEntityHistory
    (
        id:
            string
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${id}/history`
        );
    }

}