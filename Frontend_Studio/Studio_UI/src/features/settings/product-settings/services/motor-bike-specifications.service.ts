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
    MotorBikeSpecifications,

    MotorBikeSpecificationItem,

    MotorBikeSpecificationsDefaults,

    MotorBikeSpecificationsPageQuery,

    CreateMotorBikeSpecifications,

    UpdateMotorBikeSpecifications
}
from '../models/motor-bike-specifications.model';

import
{
    PagedResult,
    toPagedParams,
    toPagedResult
}
from '../../../../shared/paging/paged-result.model';


//===============================================================
// Read helpers (PascalCase or camelCase from the API)
//===============================================================

const pick =
    (
        x: any,
        name: string
    ): any =>
        x?.[name] ?? x?.[name.charAt(0).toLowerCase() + name.slice(1)];

const text =
    (
        x: any,
        name: string
    ): string =>
        String(pick(x, name) ?? '');

const num =
    (
        x: any,
        name: string
    ): number =>
        Number(pick(x, name) ?? 0) || 0;

const list =
    (
        x: any,
        name: string
    ): any[] =>
        (pick(x, name) ?? []) as any[];


function normalizeItem
(
    i: any
):
    MotorBikeSpecificationItem
{
    return {
        Section: text(i, 'Section'),
        LineNo: num(i, 'LineNo'),
        Label: text(i, 'Label'),
        Value: text(i, 'Value')
    };
}


//===============================================================
// Normalize one specification (list rows and the form)
//===============================================================

export function normalizeMotorBikeSpecification
(
    x: any
):
    MotorBikeSpecifications
{
    return {
        MotorBikeSpecificationId:
            num(x, 'MotorBikeSpecificationId'),
        PublicId:
            text(x, 'PublicId'),
        SpecificationCode:
            text(x, 'SpecificationCode'),
        BikeModelId:
            num(x, 'BikeModelId') || null,
        ModelCode:
            text(x, 'ModelCode'),
        ModelName:
            text(x, 'ModelName'),
        BrandManagementId:
            num(x, 'BrandManagementId'),
        BrandName:
            text(x, 'BrandName'),
        EngineCc:
            num(x, 'EngineCc'),
        MotorPowerWatts:
            num(x, 'MotorPowerWatts'),
        FuelType:
            text(x, 'FuelType') || 'Petrol',
        Cylinders:
            num(x, 'Cylinders'),
        VehicleClass:
            text(x, 'VehicleClass'),
        BodyType:
            text(x, 'BodyType'),
        SeatingCapacity:
            num(x, 'SeatingCapacity'),
        UnladenWeightKg:
            num(x, 'UnladenWeightKg'),
        LadenWeightKg:
            num(x, 'LadenWeightKg'),
        Maker:
            text(x, 'Maker'),
        CountryOfOrigin:
            text(x, 'CountryOfOrigin'),
        HorsePower:
            text(x, 'HorsePower'),
        Rpm:
            num(x, 'Rpm'),
        Mileage:
            text(x, 'Mileage'),
        TopSpeedKmh:
            num(x, 'TopSpeedKmh'),
        WheelBaseMm:
            num(x, 'WheelBaseMm'),
        LengthMm:
            num(x, 'LengthMm'),
        WidthMm:
            num(x, 'WidthMm'),
        HeightMm:
            num(x, 'HeightMm'),
        TyreCount:
            num(x, 'TyreCount') || 2,
        FrontTyreSize:
            text(x, 'FrontTyreSize'),
        RearTyreSize:
            text(x, 'RearTyreSize'),
        AxleCount:
            num(x, 'AxleCount') || 1,
        ItemCount:
            num(x, 'ItemCount'),
        Items:
            list(x, 'Items').map(i => normalizeItem(i)),
        ShowOnWebsite:
            Boolean(pick(x, 'ShowOnWebsite') ?? true),
        Remarks:
            text(x, 'Remarks'),
        Status:
            Boolean(pick(x, 'Status') ?? true)
    };
}


//===============================================================
// Motor Bike Specifications Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class MotorBikeSpecificationsService
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
        `${environment.apiUrl}/settings/product-settings/motor-bike-specifications`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<MotorBikeSpecifications[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        (response ?? []).map(
                            x =>
                                normalizeMotorBikeSpecification(x)
                        )
                )
            );
    }



    //===========================================================
    // Get Paged (the list page : one page with the summary counts)
    //===========================================================

    getPaged
    (
        query:
            MotorBikeSpecificationsPageQuery
    ):
        Observable<PagedResult<MotorBikeSpecifications>>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/paged`,
                {
                    params:
                        toPagedParams(
                            { ...query }
                        )
                }
            )
            .pipe(
                map(
                    response =>
                        toPagedResult(
                            response,
                            item =>
                                normalizeMotorBikeSpecification(item)
                        )
                )
            );
    }



    //===========================================================
    // Get Next Code
    //===========================================================

    getNextCode():
        Observable<string>
    {
        return this.http.get<string>(
            `${this.apiUrl}/next-code`
        );
    }



    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<MotorBikeSpecificationsDefaults>
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
                            text(response, 'Code'),
                        FuelTypes:
                            list(response, 'FuelTypes').map(x => String(x)),
                        VehicleClasses:
                            list(response, 'VehicleClasses').map(x => String(x)),
                        Sections:
                            list(response, 'Sections').map(x => String(x)),
                        SuggestedItems:
                            list(response, 'SuggestedItems').map(x => normalizeItem(x)),
                        Brands:
                            list(response, 'Brands')
                                .map(
                                    x =>
                                    ({
                                        BrandManagementId: num(x, 'BrandManagementId'),
                                        BrandName: text(x, 'BrandName'),
                                        Status: Boolean(pick(x, 'Status') ?? true)
                                    })
                                ),
                        Models:
                            list(response, 'Models')
                                .map(
                                    x =>
                                    ({
                                        BikeModelId: num(x, 'BikeModelId'),
                                        BrandManagementId: num(x, 'BrandManagementId'),
                                        BrandName: text(x, 'BrandName'),
                                        MakerName: text(x, 'MakerName'),
                                        ModelCode: text(x, 'ModelCode'),
                                        ModelName: text(x, 'ModelName'),
                                        Status: Boolean(pick(x, 'Status') ?? true),
                                        SpecificationPublicId: text(x, 'SpecificationPublicId'),
                                        SpecificationCode: text(x, 'SpecificationCode')
                                    })
                                )
                    })
                )
            );
    }



    //===========================================================
    // Get By Id (Public Id)
    //===========================================================

    getById
    (
        id:
            string
    ):
        Observable<MotorBikeSpecifications>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/${id}`
            )
            .pipe(
                map(
                    x =>
                        normalizeMotorBikeSpecification(x)
                )
            );
    }



    //===========================================================
    // Get For Model (the model's active specification; 404 = none)
    //===========================================================

    getForModel
    (
        bikeModelId:
            number
    ):
        Observable<MotorBikeSpecifications>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/by-model/${bikeModelId}`
            )
            .pipe(
                map(
                    x =>
                        normalizeMotorBikeSpecification(x)
                )
            );
    }



    //===========================================================
    // Create : returns the Public Id
    //===========================================================

    create
    (
        model:
            CreateMotorBikeSpecifications
    ):
        Observable<string>
    {
        return this.http.post<string>(
            this.apiUrl,

            model
        );
    }



    //===========================================================
    // Update
    //===========================================================

    update
    (
        publicId:
            string,

        model:
            UpdateMotorBikeSpecifications
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${publicId}`,

            model
        );
    }



    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        id:
            string
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

}
