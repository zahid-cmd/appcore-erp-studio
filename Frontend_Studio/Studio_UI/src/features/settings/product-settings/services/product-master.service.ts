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
    ProductMaster,
    CreateProductMaster,
    UpdateProductMaster,
    ProductMasterDefaults
}
from '../models/product-master.model';


//===============================================================
// Product Master Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class ProductMasterService
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
        `${environment.apiUrl}/settings/product-settings/product-master`;


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
        Observable<ProductMaster[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        response.map(
                            productMaster =>
                            ({
                                ...productMaster,

                                ProductMasterId:
                                    Number(
                                        productMaster.ProductMasterId
                                        ??
                                        productMaster.productMasterId
                                        ??
                                        productMaster.id
                                        ??
                                        productMaster.Id
                                    ),

                                ProductCategoryId:
                                    Number(
                                        productMaster.ProductCategoryId
                                        ??
                                        productMaster.productCategoryId
                                        ??
                                        0
                                    ),

                                ProductCategoryName:
                                    productMaster.ProductCategoryName
                                    ??
                                    productMaster.productCategoryName
                                    ??
                                    '',

                                ProductSubCategoryId:
                                    Number(
                                        productMaster.ProductSubCategoryId
                                        ??
                                        productMaster.productSubCategoryId
                                        ??
                                        0
                                    ),

                                ProductSubCategoryName:
                                    productMaster.ProductSubCategoryName
                                    ??
                                    productMaster.productSubCategoryName
                                    ??
                                    '',

                                SubCategoryCode:
                                    productMaster.SubCategoryCode
                                    ??
                                    productMaster.subCategoryCode
                                    ??
                                    '',

                                ProductCode:
                                    productMaster.ProductCode
                                    ??
                                    productMaster.productCode
                                    ??
                                    '',

                                ProductName:
                                    productMaster.ProductName
                                    ??
                                    productMaster.productName
                                    ??
                                    '',

                                InventoryLedgerCode:
                                    productMaster.InventoryLedgerCode
                                    ??
                                    productMaster.inventoryLedgerCode
                                    ??
                                    '',

                                WipLedgerCode:
                                    productMaster.WipLedgerCode
                                    ??
                                    productMaster.wipLedgerCode
                                    ??
                                    '',

                                CogsLedgerCode:
                                    productMaster.CogsLedgerCode
                                    ??
                                    productMaster.cogsLedgerCode
                                    ??
                                    '',

                                InventoryLedgerName:
                                    productMaster.InventoryLedgerName
                                    ??
                                    productMaster.inventoryLedgerName
                                    ??
                                    '',

                                WipLedgerName:
                                    productMaster.WipLedgerName
                                    ??
                                    productMaster.wipLedgerName
                                    ??
                                    '',

                                CogsLedgerName:
                                    productMaster.CogsLedgerName
                                    ??
                                    productMaster.cogsLedgerName
                                    ??
                                    '',

                                // TODO: Map Product Master specific configuration fields here

                                Remarks:
                                    productMaster.Remarks
                                    ??
                                    productMaster.remarks
                                    ??
                                    '',

                                IsActive:
                                    Boolean(
                                        productMaster.IsActive
                                        ??
                                        productMaster.isActive
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
        productSubCategoryId:
            number
    ):
        Observable<string>
    {
        return this.http.get(
            `${this.apiUrl}/next-code`,
            {
                params:
                {
                    productSubCategoryId:
                        productSubCategoryId
                },
                responseType:'text'
            }
        );
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults(
        productSubCategoryId:
            number
    ):
        Observable<ProductMasterDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`,
                {
                    params:
                    {
                        productSubCategoryId:
                            productSubCategoryId
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

                        InventoryLedgerCode:
                            response.inventoryLedgerCode
                            ??
                            response.InventoryLedgerCode
                            ??
                            '',

                        WipLedgerCode:
                            response.wipLedgerCode
                            ??
                            response.WipLedgerCode
                            ??
                            '',

                        CogsLedgerCode:
                            response.cogsLedgerCode
                            ??
                            response.CogsLedgerCode
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
        Observable<ProductMaster>
    {
        return this.http.get<ProductMaster>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create(
        model:
            CreateProductMaster
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
            UpdateProductMaster
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