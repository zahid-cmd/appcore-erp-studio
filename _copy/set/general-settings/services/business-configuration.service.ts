//===============================================================
// Business Configuration Service
//
// Extra business grants per branch, wing core business, today's
// branch overview and the warehouses allowed for a business line.
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
    AllowedWarehouse,
    BranchBusinessLines,
    BusinessConfiguration,
    CreateBusinessConfiguration,
    UpdateBusinessConfiguration,
    WingBusinessLines
}
from '../models/business-configuration.model';


@Injectable(
{
    providedIn:'root'
})
export class BusinessConfigurationService
{
    private readonly http =
        inject(HttpClient);


    private readonly apiUrl =
        `${environment.apiUrl}/settings/general-settings/business-configuration`;



    //===========================================================
    // Normalize (PascalCase / camelCase from the API)
    //===========================================================

    normalize
    (
        item:
            any
    ):
        BusinessConfiguration
    {
        return {
            BusinessConfigurationId:
                Number(item?.BusinessConfigurationId ?? item?.businessConfigurationId ?? 0),

            CompanyId:
                Number(item?.CompanyId ?? item?.companyId ?? 0),

            WingId:
                Number(item?.WingId ?? item?.wingId ?? 0),

            WingCode:
                item?.WingCode ?? item?.wingCode ?? '',

            WingName:
                item?.WingName ?? item?.wingName ?? '',

            BranchId:
                Number(item?.BranchId ?? item?.branchId ?? 0),

            BranchCode:
                item?.BranchCode ?? item?.branchCode ?? '',

            BranchName:
                item?.BranchName ?? item?.branchName ?? '',

            BusinessLine:
                item?.BusinessLine ?? item?.businessLine ?? '',

            AccessType:
                item?.AccessType ?? item?.accessType ?? 'Fixed',

            ValidFrom:
                item?.ValidFrom ?? item?.validFrom ?? null,

            ValidUntil:
                item?.ValidUntil ?? item?.validUntil ?? null,

            State:
                item?.State ?? item?.state ?? '',

            IsCurrentlyActive:
                Boolean(item?.IsCurrentlyActive ?? item?.isCurrentlyActive ?? false),

            Remarks:
                item?.Remarks ?? item?.remarks ?? '',

            IsActive:
                Boolean(item?.IsActive ?? item?.isActive ?? true)
        };
    }


    private normalizeOverview
    (
        item:
            any
    ):
        BranchBusinessLines
    {
        return {
            WingId:
                Number(item?.WingId ?? item?.wingId ?? 0),

            WingCode:
                item?.WingCode ?? item?.wingCode ?? '',

            WingName:
                item?.WingName ?? item?.wingName ?? '',

            BranchId:
                Number(item?.BranchId ?? item?.branchId ?? 0),

            BranchCode:
                item?.BranchCode ?? item?.branchCode ?? '',

            BranchName:
                item?.BranchName ?? item?.branchName ?? '',

            IsActive:
                Boolean(item?.IsActive ?? item?.isActive ?? true),

            ActiveLines:
                item?.ActiveLines ?? item?.activeLines ?? [],

            Lines:
                (item?.Lines ?? item?.lines ?? [])
                    .map(
                        (line: any) =>
                        ({
                            BusinessLine:
                                line?.BusinessLine ?? line?.businessLine ?? '',

                            Source:
                                line?.Source ?? line?.source ?? 'None',

                            IsActiveToday:
                                Boolean(line?.IsActiveToday ?? line?.isActiveToday ?? false),

                            AccessType:
                                line?.AccessType ?? line?.accessType ?? '',

                            ValidFrom:
                                line?.ValidFrom ?? line?.validFrom ?? null,

                            ValidUntil:
                                line?.ValidUntil ?? line?.validUntil ?? null,

                            BusinessConfigurationId:
                                Number(line?.BusinessConfigurationId ?? line?.businessConfigurationId ?? 0)
                        })
                    )
        };
    }



    //===========================================================
    // Extra grants
    //===========================================================

    getAll():
        Observable<BusinessConfiguration[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    rows =>
                        (rows ?? []).map(
                            row =>
                                this.normalize(row)
                        )
                )
            );
    }


    create
    (
        model:
            CreateBusinessConfiguration
    ):
        Observable<number>
    {
        return this.http.post<number>(
            this.apiUrl,
            model
        );
    }


    update
    (
        model:
            UpdateBusinessConfiguration
    ):
        Observable<void>
    {
        return this.http.put<void>(
            this.apiUrl,
            model
        );
    }


    // Revoke
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


    restore():
        Observable<boolean>
    {
        return this.http.put<boolean>(
            `${this.apiUrl}/restore`,
            {}
        );
    }



    //===========================================================
    // Wing core business
    //===========================================================

    getWingLines():
        Observable<WingBusinessLines[]>
    {
        return this.http
            .get<any[]>(
                `${this.apiUrl}/wing-lines`
            )
            .pipe(
                map(
                    rows =>
                        (rows ?? []).map(
                            row =>
                            ({
                                WingId:
                                    Number(row?.WingId ?? row?.wingId ?? 0),

                                WingCode:
                                    row?.WingCode ?? row?.wingCode ?? '',

                                WingName:
                                    row?.WingName ?? row?.wingName ?? '',

                                IsActive:
                                    Boolean(row?.IsActive ?? row?.isActive ?? true),

                                BusinessLines:
                                    row?.BusinessLines ?? row?.businessLines ?? []
                            })
                        )
                )
            );
    }


    updateWingLines
    (
        wingId:
            number,

        businessLines:
            string[]
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/wing-lines`,
            {
                WingId:
                    wingId,

                BusinessLines:
                    businessLines
            }
        );
    }



    //===========================================================
    // Today's view
    //===========================================================

    getBranchOverview():
        Observable<BranchBusinessLines[]>
    {
        return this.http
            .get<any[]>(
                `${this.apiUrl}/branch-overview`
            )
            .pipe(
                map(
                    rows =>
                        (rows ?? []).map(
                            row =>
                                this.normalizeOverview(row)
                        )
                )
            );
    }


    // Warehouses whose branch runs the business line today
    // (no line → every warehouse with its active lines)
    getAllowedWarehouses
    (
        businessLine?:
            string
    ):
        Observable<AllowedWarehouse[]>
    {
        let params =
            new HttpParams();

        if
        (
            businessLine
        )
        {
            params =
                params.set(
                    'businessLine',
                    businessLine
                );
        }

        return this.http
            .get<any[]>(
                `${this.apiUrl}/allowed-warehouses`,
                {
                    params
                }
            )
            .pipe(
                map(
                    rows =>
                        (rows ?? []).map(
                            row =>
                            ({
                                WarehouseId:
                                    Number(row?.WarehouseId ?? row?.warehouseId ?? 0),

                                BranchId:
                                    Number(row?.BranchId ?? row?.branchId ?? 0),

                                WingId:
                                    Number(row?.WingId ?? row?.wingId ?? 0),

                                ActiveLines:
                                    row?.ActiveLines ?? row?.activeLines ?? []
                            })
                        )
                )
            );
    }



    //===========================================================
    // History
    //===========================================================

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`
        );
    }
}