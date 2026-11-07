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
    ProductSubCategory,
    CreateProductSubCategory,
    UpdateProductSubCategory,
    ProductSubCategoryDefaults
}
from '../models/product-sub-category.model';

import
{
    ProductSubCategoryPageQuery
}
from '../models/product-sub-category.model';

import
{
    PagedResult,
    toPagedParams,
    toPagedResult
}
from '../../../../shared/paging/paged-result.model';


//===============================================================
// Product Sub Category Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class ProductSubCategoryService
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
        `${environment.apiUrl}/settings/product-settings/product-sub-category`;


    //===========================================================
    // Get API Base URL
    //===========================================================

    getApiBaseUrl():
        string
    {
        return environment.apiUrl
            .replace(
                /\/+$/,
                ''
            );
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<ProductSubCategory[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        response.map(
                            productSubCategory =>
                            ({
                                ...productSubCategory,

                                ProductSubCategoryId:
                                    Number(
                                        productSubCategory.ProductSubCategoryId
                                        ??
                                        productSubCategory.productSubCategoryId
                                        ??
                                        productSubCategory.id
                                        ??
                                        productSubCategory.Id
                                    ),

                                ProductCategoryId:
                                    Number(
                                        productSubCategory.ProductCategoryId
                                        ??
                                        productSubCategory.productCategoryId
                                        ??
                                        0
                                    ),

                                BikeModelId:
                                    Number(
                                        productSubCategory.BikeModelId
                                        ??
                                        productSubCategory.bikeModelId
                                        ??
                                        0
                                    ) || null,

                                SubCategoryCode:
                                    productSubCategory.SubCategoryCode
                                    ??
                                    productSubCategory.subCategoryCode
                                    ??
                                    '',

                                SubCategoryName:
                                    productSubCategory.SubCategoryName
                                    ??
                                    productSubCategory.subCategoryName
                                    ??
                                    '',

                                InventorySubGroupCode:
                                    productSubCategory.InventorySubGroupCode
                                    ??
                                    productSubCategory.inventorySubGroupCode
                                    ??
                                    '',

                                WipSubGroupCode:
                                    productSubCategory.WipSubGroupCode
                                    ??
                                    productSubCategory.wipSubGroupCode
                                    ??
                                    '',

                                CogsSubGroupCode:
                                    productSubCategory.CogsSubGroupCode
                                    ??
                                    productSubCategory.cogsSubGroupCode
                                    ??
                                    '',

                                SalesSubGroupCode:
                                    productSubCategory.SalesSubGroupCode ?? productSubCategory.salesSubGroupCode ?? '',

                                SalesSubGroupName:
                                    productSubCategory.SalesSubGroupName ?? productSubCategory.salesSubGroupName ?? '',

                                InventorySubGroupName:
                                    productSubCategory.InventorySubGroupName
                                    ??
                                    productSubCategory.inventorySubGroupName
                                    ??
                                    '',

                                WipSubGroupName:
                                    productSubCategory.WipSubGroupName
                                    ??
                                    productSubCategory.wipSubGroupName
                                    ??
                                    '',

                                CogsSubGroupName:
                                    productSubCategory.CogsSubGroupName
                                    ??
                                    productSubCategory.cogsSubGroupName
                                    ??
                                    '',

                                SubCategoryCreationAllowed:
                                    Boolean(
                                        productSubCategory.SubCategoryCreationAllowed
                                        ??
                                        productSubCategory.subCategoryCreationAllowed
                                        ??
                                        false
                                    ),

                                AccessoryUse:
                                    productSubCategory.AccessoryUse
                                    ??
                                    productSubCategory.accessoryUse
                                    ??
                                    'For Sale',

                                Remarks:
                                    productSubCategory.Remarks
                                    ??
                                    productSubCategory.remarks
                                    ??
                                    '',

                                IsActive:
                                    Boolean(
                                        productSubCategory.IsActive
                                        ??
                                        productSubCategory.isActive
                                        ??
                                        true
                                    )
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
            ProductSubCategoryPageQuery
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

    getNextCode(
        productCategoryId:
            number
    ):
        Observable<string>
    {
        return this.http.get(
            `${this.apiUrl}/next-code`,
            {
                params:
                {
                    productCategoryId:
                        productCategoryId
                },
                responseType:'text'
            }
        );
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults(
        productCategoryId:
            number
    ):
        Observable<ProductSubCategoryDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`,
                {
                    params:
                    {
                        productCategoryId:
                            productCategoryId
                    }
                }
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

                        InventorySubGroupCode:
                            response.inventorySubGroupCode
                            ??
                            response.InventorySubGroupCode
                            ??
                            '',

                        WipSubGroupCode:
                            response.wipSubGroupCode
                            ??
                            response.WipSubGroupCode
                            ??
                            '',

                        CogsSubGroupCode:
                            response.cogsSubGroupCode
                            ??
                            response.CogsSubGroupCode
                            ??
                            '',

                        SalesSubGroupCode:
                            response.salesSubGroupCode ?? response.SalesSubGroupCode ?? ''
                    })
                )
            );
    }


    //===========================================================
    // Get By Id
    //===========================================================

    getById(
        id:
            string
    ):
        Observable<ProductSubCategory>
    {
        return this.http.get<ProductSubCategory>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create(
        model:
            CreateProductSubCategory
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

    update(
        publicId:
            string,

        model:
            UpdateProductSubCategory
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

    delete(
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