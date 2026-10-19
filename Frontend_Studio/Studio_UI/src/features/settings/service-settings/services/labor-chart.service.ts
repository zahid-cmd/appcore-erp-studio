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
    LaborChart,
    CreateLaborChart,
    UpdateLaborChart,
    LaborChartDefaults,
    LaborChartSubCategoryOption,
    LABOR_CHART_SECTIONS
}
from '../models/labor-chart.model';


//===============================================================
// Labor Chart Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class LaborChartService
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
        `${environment.apiUrl}/settings/service-settings/labor-chart`;


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
        LaborChart
    {
        const text =
            (name: string): string =>
                String(this.pick(item, name) ?? '');

        const num =
            (name: string): number =>
                Number(this.pick(item, name) ?? 0);

        return {
            LaborChartId:
                num('LaborChartId'),

            LaborCode:
                text('LaborCode'),

            ServiceSubCategoryId:
                num('ServiceSubCategoryId'),

            SubCategoryCode:
                text('SubCategoryCode'),

            SubCategoryName:
                text('SubCategoryName'),

            BrandManagementId:
                num('BrandManagementId'),

            BrandName:
                text('BrandName'),

            Section:
                text('Section'),

            OperationName:
                text('OperationName'),

            AppliesTo:
                text('AppliesTo'),

            StandardMinutes:
                num('StandardMinutes'),

            ServiceCharge:
                num('ServiceCharge'),

            ServiceName:
                text('ServiceName'),

            IncomeLedgerCode:
                text('IncomeLedgerCode'),

            IncomeLedgerName:
                text('IncomeLedgerName'),

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
    // Normalize Sub Category Option
    //===========================================================

    private normalizeOption
    (
        item:
            any
    ):
        LaborChartSubCategoryOption
    {
        const text =
            (name: string): string =>
                String(this.pick(item, name) ?? '');

        return {
            ServiceSubCategoryId:
                Number(this.pick(item, 'ServiceSubCategoryId') ?? 0),

            SubCategoryCode:
                text('SubCategoryCode'),

            SubCategoryName:
                text('SubCategoryName'),

            BrandManagementId:
                Number(this.pick(item, 'BrandManagementId') ?? 0),

            BrandName:
                text('BrandName'),

            IsActive:
                Boolean(this.pick(item, 'IsActive') ?? false),

            ItemCreationAllowed:
                Boolean(this.pick(item, 'ItemCreationAllowed') ?? false),

            NextLaborCode:
                text('NextLaborCode'),

            NextIncomeLedgerCode:
                text('NextIncomeLedgerCode'),

            Message:
                text('Message')
        };
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<LaborChart[]>
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
    // Get Defaults (Service Categories + next codes)
    //===========================================================

    getDefaults():
        Observable<LaborChartDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    response =>
                    {
                        const sections =
                            (this.pick(response, 'Sections') ?? [])
                                .map(
                                    (item: any) =>
                                        String(item ?? '')
                                )
                                .filter(
                                    (item: string) =>
                                        !!item
                                );

                        return {
                            SubCategories:
                                (this.pick(response, 'SubCategories') ?? []).map(
                                    (item: any) =>
                                        this.normalizeOption(
                                            item
                                        )
                                ),

                            Sections:
                                sections.length > 0
                                    ? sections
                                    : [...LABOR_CHART_SECTIONS]
                        };
                    }
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
        Observable<LaborChart>
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
            CreateLaborChart
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
            UpdateLaborChart
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