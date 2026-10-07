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
                            ''
                    })
                )
            );
    }


    //===========================================================
    // Get By Id
    //===========================================================

    getById(
        id:
            number
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

    update(
        model:
            UpdateProductSubCategory
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

    delete(
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