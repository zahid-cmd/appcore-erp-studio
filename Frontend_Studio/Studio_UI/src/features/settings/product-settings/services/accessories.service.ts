//===============================================================
// Accessories Service (no image for accessories)
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
    Accessories,

    CreateAccessories,

    UpdateAccessories,

    AccessoriesDefaults
}
from '../models/accessories.model';


//===============================================================
// Accessories Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class AccessoriesService
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
        `${environment.apiUrl}/settings/product-settings/accessories`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<Accessories[]>
    {
        return this.http

            .get<any[]>(
                this.apiUrl
            )

            .pipe(
                map(
                    response =>

                        response.map(
                            item =>
                                this.normalize(
                                    item
                                )
                        )
                )
            );
    }



    //===========================================================
    // Normalize (PascalCase or camelCase from the API)
    //===========================================================

    normalize
    (
        item:
            any
    ):
        Accessories
    {
        return {
            AccessoryId:
                Number(item?.AccessoryId ?? item?.accessoryId ?? 0),

            ProductCategoryId:
                Number(item?.ProductCategoryId ?? item?.productCategoryId ?? 0),

            ProductSubCategoryId:
                Number(item?.ProductSubCategoryId ?? item?.productSubCategoryId ?? 0),

            PartNumber:
                item?.PartNumber ?? item?.partNumber ?? '',

            AccessoryName:
                item?.AccessoryName ?? item?.accessoryName ?? '',

            Unit:
                item?.Unit ?? item?.unit ?? '',

            ProductCode:
                item?.ProductCode ?? item?.productCode ?? '',

            InventoryLedgerCode:
                item?.InventoryLedgerCode ?? item?.inventoryLedgerCode ?? '',

            WipLedgerCode:
                item?.WipLedgerCode ?? item?.wipLedgerCode ?? '',

            CogsLedgerCode:
                item?.CogsLedgerCode ?? item?.cogsLedgerCode ?? '',

            ReorderLevel:
                Number(item?.ReorderLevel ?? item?.reorderLevel ?? 0),

            RedLevel:
                Number(item?.RedLevel ?? item?.redLevel ?? 0),

            Remarks:
                item?.Remarks ?? item?.remarks ?? '',

            IsActive:
                Boolean(item?.IsActive ?? item?.isActive ?? true),

            Locations:
                (
                    Array.isArray(item?.Locations ?? item?.locations)
                        ? (item?.Locations ?? item?.locations)
                        : []
                )
                .map(
                    (location: any) =>
                    ({
                        WarehouseId:
                            Number(location?.WarehouseId ?? location?.warehouseId ?? 0),

                        RackManagementId:
                            Number(location?.RackManagementId ?? location?.rackManagementId ?? 0),

                        ShelfNumber:
                            Number(location?.ShelfNumber ?? location?.shelfNumber ?? 0),

                        WarehouseCode:
                            location?.WarehouseCode ?? location?.warehouseCode ?? '',

                        WarehouseName:
                            location?.WarehouseName ?? location?.warehouseName ?? '',

                        RackCode:
                            location?.RackCode ?? location?.rackCode ?? '',

                        RackName:
                            location?.RackName ?? location?.rackName ?? '',

                        LocationText:
                            location?.LocationText ?? location?.locationText ?? ''
                    })
                ),

            LocationsText:
                item?.LocationsText ?? item?.locationsText ?? '',

            CategoryCode:
                item?.CategoryCode ?? item?.categoryCode ?? '',

            CategoryName:
                item?.CategoryName ?? item?.categoryName ?? '',

            BrandName:
                item?.BrandName ?? item?.brandName ?? '',

            SubCategoryCode:
                item?.SubCategoryCode ?? item?.subCategoryCode ?? '',

            SubCategoryName:
                item?.SubCategoryName ?? item?.subCategoryName ?? ''
        };
    }



    //===========================================================
    // Get Defaults (code preview for a sub category)
    //===========================================================

    getDefaults
    (
        productSubCategoryId:
            number
    ):
        Observable<AccessoriesDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`,
                {
                    params:
                    {
                        productSubCategoryId:
                            String(productSubCategoryId ?? 0)
                    }
                }
            )
            .pipe(
                map(
                    response =>
                    ({
                        Code:
                            response?.code ?? response?.Code ?? '',

                        InventoryLedgerCode:
                            response?.inventoryLedgerCode ?? response?.InventoryLedgerCode ?? '',

                        WipLedgerCode:
                            response?.wipLedgerCode ?? response?.WipLedgerCode ?? '',

                        CogsLedgerCode:
                            response?.cogsLedgerCode ?? response?.CogsLedgerCode ?? ''
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
        Observable<Accessories>
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
            CreateAccessories
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
            UpdateAccessories
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
            number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${id}/history`
        );
    }

}