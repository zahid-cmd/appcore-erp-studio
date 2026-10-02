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
    Warehouses,
    CreateWarehouses,
    UpdateWarehouses
}
from '../models/warehouses.model';


//===============================================================
// Warehouses Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class WarehousesService
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
        `${environment.apiUrl}/settings/general-settings/warehouses`;



    //===========================================================
    // Get API Base URL
    //===========================================================

    getApiBaseUrl():

        string

    {
        return environment.apiUrl
            .replace(
                /\/api\/?$/,
                ''
            );
    }



    //===========================================================
    // Normalize Boolean
    //===========================================================

    private normalizeBoolean
    (
        value:
            unknown,

        fallback:
            boolean
    ):
        boolean

    {
        if
        (
            typeof value ===
            'boolean'
        )
        {
            return value;
        }

        if
        (
            typeof value ===
            'string'
        )
        {
            return value.toLowerCase()
                ===
                'true';
        }

        if
        (
            typeof value ===
            'number'
        )
        {
            return value !== 0;
        }

        return fallback;
    }



    //===========================================================
    // Get All
    //===========================================================

    getAll():

        Observable<Warehouses[]>

    {
        return this.http

            .get<any[]>(
                this.apiUrl
            )

            .pipe(

                map(

                    response =>

                        response.map(

                            warehouse =>

                            ({

                                ...warehouse,

                                WarehouseId:
                                    Number(
                                        warehouse.WarehouseId
                                        ??
                                        warehouse.warehouseId
                                        ??
                                        0
                                    ),

                                CompanyId:
                                    Number(
                                        warehouse.CompanyId
                                        ??
                                        warehouse.companyId
                                        ??
                                        0
                                    ),

                                WingId:
                                    Number(
                                        warehouse.WingId
                                        ??
                                        warehouse.wingId
                                        ??
                                        0
                                    ),

                                BranchId:
                                    Number(
                                        warehouse.BranchId
                                        ??
                                        warehouse.branchId
                                        ??
                                        0
                                    ),

                                WarehouseCode:
                                    warehouse.WarehouseCode
                                    ??
                                    warehouse.warehouseCode
                                    ??
                                    '',

                                WarehouseName:
                                    warehouse.WarehouseName
                                    ??
                                    warehouse.warehouseName
                                    ??
                                    '',

                                DisplayName:
                                    warehouse.DisplayName
                                    ??
                                    warehouse.displayName
                                    ??
                                    '',

                                Mobile:
                                    warehouse.Mobile
                                    ??
                                    warehouse.mobile
                                    ??
                                    '',

                                Email:
                                    warehouse.Email
                                    ??
                                    warehouse.email
                                    ??
                                    '',

                                Address:
                                    warehouse.Address
                                    ??
                                    warehouse.address
                                    ??
                                    '',

                                IsBranchGenerated:
                                    this.normalizeBoolean(
                                        warehouse.IsBranchGenerated
                                        ??
                                        warehouse.isBranchGenerated,

                                        false
                                    ),

                                IsDefault:
                                    this.normalizeBoolean(
                                        warehouse.IsDefault
                                        ??
                                        warehouse.isDefault,

                                        false
                                    ),

                                Remarks:
                                    warehouse.Remarks
                                    ??
                                    warehouse.remarks
                                    ??
                                    '',

                                IsActive:
                                    this.normalizeBoolean(
                                        warehouse.IsActive
                                        ??
                                        warehouse.isActive,

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

    getNextCode
    (
        branchId:
            number
    ):

        Observable<string>

    {
        return this.http.get(

            `${this.apiUrl}/next-code`,

            {
                params:
                {
                    branchId:
                        branchId
                },

                responseType:
                    'text'
            }
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

        Observable<Warehouses>

    {
        return this.http

            .get<any>(
                `${this.apiUrl}/${id}`
            )

            .pipe(

                map(

                    warehouse =>

                    ({

                        ...warehouse,

                        WarehouseId:
                            Number(
                                warehouse?.WarehouseId
                                ??
                                warehouse?.warehouseId
                                ??
                                0
                            ),

                        CompanyId:
                            Number(
                                warehouse?.CompanyId
                                ??
                                warehouse?.companyId
                                ??
                                0
                            ),

                        WingId:
                            Number(
                                warehouse?.WingId
                                ??
                                warehouse?.wingId
                                ??
                                0
                            ),

                        BranchId:
                            Number(
                                warehouse?.BranchId
                                ??
                                warehouse?.branchId
                                ??
                                0
                            ),

                        WarehouseCode:
                            warehouse?.WarehouseCode
                            ??
                            warehouse?.warehouseCode
                            ??
                            '',

                        WarehouseName:
                            warehouse?.WarehouseName
                            ??
                            warehouse?.warehouseName
                            ??
                            '',

                        DisplayName:
                            warehouse?.DisplayName
                            ??
                            warehouse?.displayName
                            ??
                            '',

                        Mobile:
                            warehouse?.Mobile
                            ??
                            warehouse?.mobile
                            ??
                            '',

                        Email:
                            warehouse?.Email
                            ??
                            warehouse?.email
                            ??
                            '',

                        Address:
                            warehouse?.Address
                            ??
                            warehouse?.address
                            ??
                            '',

                        IsBranchGenerated:
                            this.normalizeBoolean(
                                warehouse?.IsBranchGenerated
                                ??
                                warehouse?.isBranchGenerated,

                                false
                            ),

                        IsDefault:
                            this.normalizeBoolean(
                                warehouse?.IsDefault
                                ??
                                warehouse?.isDefault,

                                false
                            ),

                        Remarks:
                            warehouse?.Remarks
                            ??
                            warehouse?.remarks
                            ??
                            '',

                        IsActive:
                            this.normalizeBoolean(
                                warehouse?.IsActive
                                ??
                                warehouse?.isActive,

                                true
                            )

                    })

                )

            );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateWarehouses
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
            UpdateWarehouses
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