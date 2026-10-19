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
    ServiceSubCategory,
    CreateServiceSubCategory,
    UpdateServiceSubCategory,
    ServiceSubCategoryDefaults,
    ServiceSubCategoryCategoryOption
}
from '../models/service-sub-category.model';


//===============================================================
// Service Sub Category Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class ServiceSubCategoryService
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
        `${environment.apiUrl}/settings/service-settings/service-sub-category`;


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
        ServiceSubCategory
    {
        const text =
            (name: string): string =>
                String(this.pick(item, name) ?? '');

        const num =
            (name: string): number =>
                Number(this.pick(item, name) ?? 0);

        return {
            ServiceSubCategoryId:
                num('ServiceSubCategoryId'),

            SubCategoryCode:
                text('SubCategoryCode'),

            ServiceCategoryId:
                num('ServiceCategoryId'),

            CategoryCode:
                text('CategoryCode'),

            CategoryName:
                text('CategoryName'),

            CategoryType:
                text('CategoryType'),

            BrandName:
                text('BrandName'),

            SubCategoryType:
                text('SubCategoryType'),

            SubCategoryName:
                text('SubCategoryName'),

            IncomeGroupCode:
                text('IncomeGroupCode'),

            IncomeSubGroupCode:
                text('IncomeSubGroupCode'),

            IncomeSubGroupName:
                text('IncomeSubGroupName'),

            ItemCreationAllowed:
                Boolean(
                    this.pick(item, 'ItemCreationAllowed')
                    ??
                    true
                ),

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
    // Normalize Category Option
    //===========================================================

    private normalizeOption
    (
        item:
            any
    ):
        ServiceSubCategoryCategoryOption
    {
        const text =
            (name: string): string =>
                String(this.pick(item, name) ?? '');

        return {
            ServiceCategoryId:
                Number(this.pick(item, 'ServiceCategoryId') ?? 0),

            CategoryCode:
                text('CategoryCode'),

            CategoryName:
                text('CategoryName'),

            CategoryType:
                text('CategoryType'),

            BrandName:
                text('BrandName'),

            IsActive:
                Boolean(this.pick(item, 'IsActive') ?? false),

            SubCategoryCreationAllowed:
                Boolean(this.pick(item, 'SubCategoryCreationAllowed') ?? false),

            IncomeClassCode:
                text('IncomeClassCode'),

            IncomeClassName:
                text('IncomeClassName'),

            IncomeGroupCode:
                text('IncomeGroupCode'),

            IncomeGroupName:
                text('IncomeGroupName'),

            NextSubCategoryCode:
                text('NextSubCategoryCode'),

            NextSubGroupCode:
                text('NextSubGroupCode'),

            UsedSubCategoryTypes:
                (this.pick(item, 'UsedSubCategoryTypes') ?? [])
                    .map(
                        (type: any) =>
                            String(type ?? '')
                    )
        };
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<ServiceSubCategory[]>
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
        Observable<ServiceSubCategoryDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    response =>
                    ({
                        Categories:
                            (this.pick(response, 'Categories') ?? []).map(
                                (item: any) =>
                                    this.normalizeOption(
                                        item
                                    )
                            )
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
        Observable<ServiceSubCategory>
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
            CreateServiceSubCategory
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
            UpdateServiceSubCategory
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