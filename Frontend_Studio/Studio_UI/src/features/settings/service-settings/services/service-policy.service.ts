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
    ServicePolicy,
    CreateServicePolicy,
    UpdateServicePolicy,
    ServicePolicyDefaults
}
from '../models/service-policy.model';


//===============================================================
// Service Policy Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class ServicePolicyService
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
        `${environment.apiUrl}/settings/service-settings/service-policy`;


    //===========================================================
    // Read a value in PascalCase or camelCase
    //===========================================================

    private pick
    (
        item:
            any,
        name:
            string
    ):
        any
    {
        if
        (
            item == null
        )
        {
            return undefined;
        }

        const camel =
            name.charAt(0).toLowerCase() + name.slice(1);

        return item[name] ?? item[camel];
    }


    //===========================================================
    // Normalize
    //===========================================================

    normalize
    (
        item:
            any
    ):
        ServicePolicy
    {
        const text =
            (name: string): string =>
                String(this.pick(item, name) ?? '');

        const num =
            (name: string): number =>
                Number(this.pick(item, name) ?? 0);

        return {
            ServicePolicyId:
                num('ServicePolicyId'),

            PolicyCode:
                text('PolicyCode'),

            BrandManagementId:
                num('BrandManagementId'),

            BrandName:
                text('BrandName'),

            WarrantyYears:
                num('WarrantyYears'),

            WarrantyKm:
                num('WarrantyKm'),

            FreeServiceCount:
                num('FreeServiceCount'),

            PaidServiceCount:
                num('PaidServiceCount'),

            Schedules:
                (this.pick(item, 'Schedules') ?? []).map(
                    (row: any) =>
                    ({
                        ServicePolicyScheduleId:
                            Number(this.pick(row, 'ServicePolicyScheduleId') ?? 0),

                        SequenceNo:
                            Number(this.pick(row, 'SequenceNo') ?? 0),

                        ServiceType:
                            String(this.pick(row, 'ServiceType') ?? 'Free'),

                        ServiceTypeNo:
                            Number(this.pick(row, 'ServiceTypeNo') ?? 0),

                        ServiceName:
                            String(this.pick(row, 'ServiceName') ?? ''),

                        IntervalDays:
                            Number(this.pick(row, 'IntervalDays') ?? 0),

                        IntervalKm:
                            Number(this.pick(row, 'IntervalKm') ?? 0),

                        GraceDays:
                            Number(this.pick(row, 'GraceDays') ?? 0)
                    })
                ),

            AssociatedSubGroupId:
                num('AssociatedSubGroupId'),

            AssociatedSubGroupCode:
                text('AssociatedSubGroupCode'),

            AssociatedSubGroupName:
                text('AssociatedSubGroupName'),

            AssociatedLedgerCode:
                text('AssociatedLedgerCode'),

            AssociatedLedgerName:
                text('AssociatedLedgerName'),

            Remarks:
                text('Remarks'),

            IsActive:
                Boolean(
                    this.pick(item, 'IsActive')
                    ??
                    true
                )
        };
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<ServicePolicy[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        (response ?? []).map(
                            item =>
                                this.normalize(
                                    item
                                )
                        )
                )
            );
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<ServicePolicyDefaults>
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
                            String(this.pick(response, 'Code') ?? ''),

                        DefaultSubGroupId:
                            Number(this.pick(response, 'DefaultSubGroupId') ?? 0),

                        IsSubGroupFixed:
                            Boolean(this.pick(response, 'IsSubGroupFixed') ?? false),

                        NextLedgerCode:
                            String(this.pick(response, 'NextLedgerCode') ?? ''),

                        SubGroups:
                            (this.pick(response, 'SubGroups') ?? []).map(
                                (x: any) =>
                                ({
                                    AccountSubGroupId:
                                        Number(this.pick(x, 'AccountSubGroupId') ?? 0),

                                    SubGroupCode:
                                        String(this.pick(x, 'SubGroupCode') ?? ''),

                                    SubGroupName:
                                        String(this.pick(x, 'SubGroupName') ?? ''),

                                    GroupName:
                                        String(this.pick(x, 'GroupName') ?? ''),

                                    ClassName:
                                        String(this.pick(x, 'ClassName') ?? '')
                                })
                            ),

                        Brands:
                            (this.pick(response, 'Brands') ?? []).map(
                                (x: any) =>
                                ({
                                    BrandManagementId:
                                        Number(this.pick(x, 'BrandManagementId') ?? 0),

                                    BrandName:
                                        String(this.pick(x, 'BrandName') ?? ''),

                                    BrandActive:
                                        Boolean(this.pick(x, 'BrandActive') ?? true),

                                    ServicePolicyId:
                                        this.pick(x, 'ServicePolicyId') == null
                                            ? null
                                            : Number(this.pick(x, 'ServicePolicyId'))
                                })
                            )
                    })
                )
            );
    }


    //===========================================================
    // Next Associated Ledger Code under a sub group (preview)
    //===========================================================

    getNextLedgerCode
    (
        subGroupId:
            number
    ):
        Observable<string>
    {
        return this.http.get(
            `${this.apiUrl}/next-ledger-code/${subGroupId}`,
            {
                responseType:'text'
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
        Observable<ServicePolicy>
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
            CreateServicePolicy
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
            UpdateServicePolicy
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