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
    ScheduledService,
    ConfigureScheduledService
}
from '../models/scheduled-services.model';


//===============================================================
// Scheduled Service Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class ScheduledServicesService
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
        `${environment.apiUrl}/settings/service-settings/scheduled-services`;


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
        ScheduledService
    {
        const text =
            (name: string): string =>
                String(this.pick(item, name) ?? '');

        const num =
            (name: string): number =>
                Number(this.pick(item, name) ?? 0);

        const flag =
            (name: string, fallback: boolean): boolean =>
                Boolean(this.pick(item, name) ?? fallback);

        const subCategoryId =
            this.pick(item, 'ServiceSubCategoryId');

        return {
            ScheduledServiceId:
                num('ScheduledServiceId'),

            ServicePolicyId:
                num('ServicePolicyId'),

            PolicyCode:
                text('PolicyCode'),

            BrandManagementId:
                num('BrandManagementId'),

            BrandName:
                text('BrandName'),

            SequenceNo:
                num('SequenceNo'),

            ServiceType:
                text('ServiceType'),

            ServiceTypeNo:
                num('ServiceTypeNo'),

            PositionName:
                text('PositionName'),

            ServiceName:
                text('ServiceName'),

            IntervalDays:
                num('IntervalDays'),

            IntervalKm:
                num('IntervalKm'),

            GraceDays:
                num('GraceDays'),

            InPolicy:
                flag('InPolicy', true),

            IsConfigured:
                flag('IsConfigured', false),

            ServiceSubCategoryId:
                subCategoryId == null
                    ? null
                    : Number(subCategoryId),

            SubCategoryCode:
                text('SubCategoryCode'),

            SubCategoryName:
                text('SubCategoryName'),

            SubCategoryMessage:
                text('SubCategoryMessage'),

            ServiceCode:
                text('ServiceCode'),

            CustomerCharge:
                num('CustomerCharge'),

            BrandReimbursement:
                num('BrandReimbursement'),

            IncomeLedgerCode:
                text('IncomeLedgerCode'),

            IncomeLedgerName:
                text('IncomeLedgerName'),

            NextServiceCode:
                text('NextServiceCode'),

            NextIncomeLedgerCode:
                text('NextIncomeLedgerCode'),

            Remarks:
                text('Remarks'),

            Readiness:
                text('Readiness'),

            IsInvoiceable:
                flag('IsInvoiceable', false),

            IsActive:
                flag('IsActive', true)
        };
    }


    //===========================================================
    // Get All (the server syncs every Service Policy first)
    //===========================================================

    getAll():
        Observable<ScheduledService[]>
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
    // Get By Id (with the sub category / code preview)
    //===========================================================

    getById
    (
        id:
            number
    ):
        Observable<ScheduledService>
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
    // Configure (price)
    //===========================================================

    configure
    (
        model:
            ConfigureScheduledService
    ):
        Observable<void>
    {
        return this.http.put<void>(
            this.apiUrl,
            model
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