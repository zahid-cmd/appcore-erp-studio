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
    ProductCategory,
    CreateProductCategory,
    UpdateProductCategory,
    ProductCategoryDefaults
}
from '../models/product-category.model';


//===============================================================
// Product Category Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class ProductCategoryService
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
        `${environment.apiUrl}/settings/product-settings/product-category`;


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
        Observable<ProductCategory[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        response.map(
                            productCategory =>
                            ({
                                ...productCategory,

                                ProductCategoryId:
                                    Number(
                                        productCategory.ProductCategoryId
                                        ??
                                        productCategory.productCategoryId
                                        ??
                                        productCategory.id
                                        ??
                                        productCategory.Id
                                    ),

                                CategoryCode:
                                    productCategory.CategoryCode
                                    ??
                                    productCategory.categoryCode
                                    ??
                                    '',

                                CategoryName:
                                    productCategory.CategoryName
                                    ??
                                    productCategory.categoryName
                                    ??
                                    '',

                                InventoryGroupCode:
                                    productCategory.InventoryGroupCode
                                    ??
                                    productCategory.inventoryGroupCode
                                    ??
                                    '',

                                WipGroupCode:
                                    productCategory.WipGroupCode
                                    ??
                                    productCategory.wipGroupCode
                                    ??
                                    '',

                                CogsGroupCode:
                                    productCategory.CogsGroupCode
                                    ??
                                    productCategory.cogsGroupCode
                                    ??
                                    '',

                                InventoryGroupName:
                                    productCategory.InventoryGroupName
                                    ??
                                    productCategory.inventoryGroupName
                                    ??
                                    '',

                                WipGroupName:
                                    productCategory.WipGroupName
                                    ??
                                    productCategory.wipGroupName
                                    ??
                                    '',

                                CogsGroupName:
                                    productCategory.CogsGroupName
                                    ??
                                    productCategory.cogsGroupName
                                    ??
                                    '',

                                SubCategoryCreationAllowed:
                                    Boolean(
                                        productCategory.SubCategoryCreationAllowed
                                        ??
                                        productCategory.subCategoryCreationAllowed
                                        ??
                                        false
                                    ),

                                Remarks:
                                    productCategory.Remarks
                                    ??
                                    productCategory.remarks
                                    ??
                                    '',

                                IsActive:
                                    Boolean(
                                        productCategory.IsActive
                                        ??
                                        productCategory.isActive
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

    getNextCode():
        Observable<string>
    {
        return this.http.get(
            `${this.apiUrl}/next-code`,
            {
                responseType:'text'
            }
        );
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<ProductCategoryDefaults>
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

                        InventoryGroupCode:
                            response.inventoryGroupCode
                            ??
                            response.InventoryGroupCode
                            ??
                            '',

                        WipGroupCode:
                            response.wipGroupCode
                            ??
                            response.WipGroupCode
                            ??
                            '',

                        CogsGroupCode:
                            response.cogsGroupCode
                            ??
                            response.CogsGroupCode
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
        Observable<ProductCategory>
    {
        return this.http.get<ProductCategory>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create(
        model:
            CreateProductCategory
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
            UpdateProductCategory
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