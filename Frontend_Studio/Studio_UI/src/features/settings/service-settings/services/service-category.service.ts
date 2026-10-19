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
    ServiceCategory,
    CreateServiceCategory,
    UpdateServiceCategory,
    ServiceCategoryDefaults
}
from '../models/service-category.model';


//===============================================================
// Service Category Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class ServiceCategoryService
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
        `${environment.apiUrl}/settings/service-settings/service-category`;


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
    // Normalize (PascalCase or camelCase API)
    //===========================================================

    normalize
    (
        item:
            any
    ):
        ServiceCategory
    {
        return {
            ServiceCategoryId:
                Number(
                    item?.ServiceCategoryId
                    ??
                    item?.serviceCategoryId
                    ??
                    0
                ),

            CategoryCode:
                item?.CategoryCode
                ??
                item?.categoryCode
                ??
                '',

            CategoryName:
                item?.CategoryName
                ??
                item?.categoryName
                ??
                '',

            CategoryType:
                item?.CategoryType
                ??
                item?.categoryType
                ??
                '',

            BrandManagementId:
                Number(
                    item?.BrandManagementId
                    ??
                    item?.brandManagementId
                    ??
                    0
                ),

            BrandName:
                item?.BrandName
                ??
                item?.brandName
                ??
                '',

            IncomeGroupCode:
                item?.IncomeGroupCode
                ??
                item?.incomeGroupCode
                ??
                '',

            IncomeGroupName:
                item?.IncomeGroupName
                ??
                item?.incomeGroupName
                ??
                '',

            SubCategoryCreationAllowed:
                Boolean(
                    item?.SubCategoryCreationAllowed
                    ??
                    item?.subCategoryCreationAllowed
                    ??
                    false
                ),

            Remarks:
                item?.Remarks
                ??
                item?.remarks
                ??
                '',

            IsActive:
                Boolean(
                    item?.IsActive
                    ??
                    item?.isActive
                    ??
                    true
                )
        };
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<ServiceCategory[]>
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
    // Get Next Code (per Category Type : BRS-nnn / DRS-nnn)
    //===========================================================

    getNextCode
    (
        categoryType:
            string
    ):
        Observable<string>
    {
        return this.http.get(
            `${this.apiUrl}/next-code`,
            {
                params:
                {
                    categoryType
                },
                responseType:'text'
            }
        );
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<ServiceCategoryDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    response =>
                    ({
                        BrandServicesCode:
                            response?.BrandServicesCode
                            ??
                            response?.brandServicesCode
                            ??
                            '',

                        DifferentialServicesCode:
                            response?.DifferentialServicesCode
                            ??
                            response?.differentialServicesCode
                            ??
                            '',

                        IncomeClassId:
                            Number(
                                response?.IncomeClassId
                                ??
                                response?.incomeClassId
                                ??
                                0
                            ),

                        IncomeClassCode:
                            response?.IncomeClassCode
                            ??
                            response?.incomeClassCode
                            ??
                            '',

                        IncomeClassName:
                            response?.IncomeClassName
                            ??
                            response?.incomeClassName
                            ??
                            '',

                        IncomeGroupCode:
                            response?.IncomeGroupCode
                            ??
                            response?.incomeGroupCode
                            ??
                            ''
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
        Observable<ServiceCategory>
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
            CreateServiceCategory
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
            UpdateServiceCategory
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