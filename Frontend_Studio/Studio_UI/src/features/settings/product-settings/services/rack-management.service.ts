// Rack Management Service
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
    RackManagement,

    CreateRackManagement,

    UpdateRackManagement,

    RackManagementDefaults
}
from '../models/rack-management.model';


//===============================================================
// Rack Management Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class RackManagementService
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
        `${environment.apiUrl}/settings/product-settings/rack-management`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<RackManagement[]>
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
        RackManagement
    {
        return {
            RackManagementId:
                Number(item?.RackManagementId ?? item?.rackManagementId ?? 0),

            BranchId:
                Number(item?.BranchId ?? item?.branchId ?? 0),

            WarehouseId:
                Number(item?.WarehouseId ?? item?.warehouseId ?? 0),

            RackCode:
                item?.RackCode ?? item?.rackCode ?? '',

            RackName:
                item?.RackName ?? item?.rackName ?? '',

            ShelfCount:
                Number(item?.ShelfCount ?? item?.shelfCount ?? 0),

            ZoneAisle:
                item?.ZoneAisle ?? item?.zoneAisle ?? '',

            RackType:
                item?.RackType ?? item?.rackType ?? '',

            Remarks:
                item?.Remarks ?? item?.remarks ?? '',

            IsActive:
                Boolean(item?.IsActive ?? item?.isActive ?? true),

            BranchName:
                item?.BranchName ?? item?.branchName ?? '',

            WarehouseCode:
                item?.WarehouseCode ?? item?.warehouseCode ?? '',

            WarehouseName:
                item?.WarehouseName ?? item?.warehouseName ?? '',

            FullRackCode:
                item?.FullRackCode ?? item?.fullRackCode ?? '',

            PartsPlaced:
                Number(item?.PartsPlaced ?? item?.partsPlaced ?? 0)
        };
    }



    //===========================================================
    // Get Defaults (next rack code for a warehouse)
    //===========================================================

    getDefaults
    (
        warehouseId:
            number
    ):
        Observable<RackManagementDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`,
                {
                    params:
                    {
                        warehouseId:
                            String(warehouseId ?? 0)
                    }
                }
            )
            .pipe(
                map(
                    response =>
                    ({
                        Code:
                            response?.code ?? response?.Code ?? '',

                        FullCode:
                            response?.fullCode ?? response?.FullCode ?? '',

                        Name:
                            response?.name ?? response?.Name ?? ''
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
        Observable<RackManagement>
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
            CreateRackManagement
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
            UpdateRackManagement
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