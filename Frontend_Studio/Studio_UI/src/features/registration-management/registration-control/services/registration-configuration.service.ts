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
    RegistrationConfiguration,
    RegistrationConfigurationDefaults,
    RegistrationType,
    RegistrationFee,
    RegistrationCost,
    RegistrationStageTiming,
    RegistrationPlan,
    RegistrationMode,
    RegistrationPower,
    RegistrationRateState,
    SaveRegistrationType,
    SaveRegistrationFee,
    SaveRegistrationCost,
    SaveRegistrationStageTiming
}
from '../models/registration-configuration.model';


//===============================================================
// Read helpers (PascalCase or camelCase from the API)
//===============================================================

const pick =
    (x: any, name: string): any =>
        x?.[name] ?? x?.[name.charAt(0).toLowerCase() + name.slice(1)];

const text =
    (x: any, name: string): string =>
        String(pick(x, name) ?? '');

const num =
    (x: any, name: string): number =>
        Number(pick(x, name) ?? 0) || 0;

const flag =
    (x: any, name: string, fallback: boolean): boolean =>
        Boolean(pick(x, name) ?? fallback);

const list =
    (x: any, name: string): any[] =>
        (pick(x, name) ?? []) as any[];


function toType(x: any): RegistrationType
{
    return {
        RegistrationTypeId:num(x, 'RegistrationTypeId'),
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        RegistrationPlan:text(x, 'RegistrationPlan') as RegistrationPlan,
        PlanName:text(x, 'PlanName'),
        ValidityYears:num(x, 'ValidityYears'),
        RegistrationMode:text(x, 'RegistrationMode') as RegistrationMode,
        VehiclePower:(text(x, 'VehiclePower') || 'Fuel') as RegistrationPower,
        Name:text(x, 'Name'),
        DisplayOrder:num(x, 'DisplayOrder'),
        IsDefault:flag(x, 'IsDefault', false),
        IsSystem:flag(x, 'IsSystem', false),
        Remarks:text(x, 'Remarks'),
        IsActive:flag(x, 'IsActive', true),
        FeeCount:num(x, 'FeeCount'),
        CostCount:num(x, 'CostCount'),
        Usable:flag(x, 'Usable', false)
    };
}


function toFee(x: any): RegistrationFee
{
    return {
        RegistrationFeeId:num(x, 'RegistrationFeeId'),
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        RegistrationTypeId:num(x, 'RegistrationTypeId'),
        RegistrationTypePublicId:text(x, 'RegistrationTypePublicId'),
        RegistrationTypeName:text(x, 'RegistrationTypeName'),
        RegistrationMode:text(x, 'RegistrationMode'),
        EffectiveFrom:text(x, 'EffectiveFrom').slice(0, 10),
        MinimumCollection:num(x, 'MinimumCollection'),
        MaximumCollection:num(x, 'MaximumCollection'),
        RateState:(text(x, 'RateState') || 'Old') as RegistrationRateState,
        Remarks:text(x, 'Remarks'),
        IsActive:flag(x, 'IsActive', true)
    };
}


function toCost(x: any): RegistrationCost
{
    return {
        RegistrationCostId:num(x, 'RegistrationCostId'),
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        RegistrationTypeId:num(x, 'RegistrationTypeId'),
        RegistrationTypePublicId:text(x, 'RegistrationTypePublicId'),
        RegistrationTypeName:text(x, 'RegistrationTypeName'),
        RegistrationMode:text(x, 'RegistrationMode'),
        EffectiveFrom:text(x, 'EffectiveFrom').slice(0, 10),
        BrtaFees:num(x, 'BrtaFees'),
        SubmissionCharges:num(x, 'SubmissionCharges'),
        BrtaTips:num(x, 'BrtaTips'),
        RegistrationCommission:num(x, 'RegistrationCommission'),
        TotalCost:num(x, 'TotalCost'),
        RateState:(text(x, 'RateState') || 'Old') as RegistrationRateState,
        Remarks:text(x, 'Remarks'),
        IsActive:flag(x, 'IsActive', true)
    };
}


function toStage(x: any): RegistrationStageTiming
{
    const days =
        pick(x, 'ExpectedDays');

    return {
        RegistrationStageTimingId:num(x, 'RegistrationStageTimingId'),
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        StageKey:text(x, 'StageKey'),
        StageName:text(x, 'StageName'),
        StageOrder:num(x, 'StageOrder'),
        ExpectedDays:days == null ? null : Number(days),
        ColorCode:text(x, 'ColorCode'),
        Remarks:text(x, 'Remarks')
    };
}


//===============================================================
// Registration Configuration Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class RegistrationConfigurationService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/registration-management/registration-control/registration-configuration`;


    //===========================================================
    // Read : every tab in one call
    //===========================================================

    getAll():
        Observable<RegistrationConfiguration>
    {
        return this.http
            .get<any>(this.apiUrl)
            .pipe(
                map(
                    x =>
                    ({
                        Types:list(x, 'Types').map(toType),
                        Fees:list(x, 'Fees').map(toFee),
                        Costs:list(x, 'Costs').map(toCost),
                        Stages:list(x, 'Stages').map(toStage),
                        Today:text(x, 'Today').slice(0, 10)
                    })
                )
            );
    }


    getDefaults():
        Observable<RegistrationConfigurationDefaults>
    {
        return this.http
            .get<any>(`${this.apiUrl}/defaults`)
            .pipe(
                map(
                    x =>
                    ({
                        TypeCode:text(x, 'TypeCode'),
                        NextTypeOrder:num(x, 'NextTypeOrder') || 1,
                        FeeCode:text(x, 'FeeCode'),
                        CostCode:text(x, 'CostCode')
                    })
                )
            );
    }


    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/history`);
    }


    //===========================================================
    // Save (create returns the Public Id) / Delete / Restore
    // path : types / fees / costs / stages
    //===========================================================

    create
    (
        path:string,
        body:SaveRegistrationType | SaveRegistrationFee | SaveRegistrationCost
    ):
        Observable<string>
    {
        return this.http.post<string>(`${this.apiUrl}/${path}`, body);
    }


    update
    (
        path:string,
        publicId:string,
        body:SaveRegistrationType | SaveRegistrationFee | SaveRegistrationCost | SaveRegistrationStageTiming
    ):
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${path}/${publicId}`, body);
    }


    delete
    (
        path:string,
        publicId:string
    ):
        Observable<void>
    {
        return this.http.delete<void>(`${this.apiUrl}/${path}/${publicId}`);
    }


    restore
    (
        path:string
    ):
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${path}/restore`, {});
    }
}
