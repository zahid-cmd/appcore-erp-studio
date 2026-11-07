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
    WarrantyConfiguration,
    WarrantyConfigurationDefaults,
    WarrantyPart,
    WarrantyPolicy,
    WarrantyCoverage,
    WarrantyLookup,
    WarrantyPeriodUnit,
    WarrantyPolicyState,
    SaveWarrantyPart,
    SaveWarrantyPolicy,
    SaveWarrantyCoverage
}
from '../models/warranty-configuration.model';


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

// null stays null (empty period / no km limit)
const optional =
    (x: any, name: string): number | null =>
    {
        const value = pick(x, name);

        return value == null || value === '' ? null : Number(value);
    };

const flag =
    (x: any, name: string, fallback: boolean): boolean =>
        Boolean(pick(x, name) ?? fallback);

const list =
    (x: any, name: string): any[] =>
        (pick(x, name) ?? []) as any[];


function toPart(x: any): WarrantyPart
{
    return {
        WarrantyPartId:num(x, 'WarrantyPartId'),
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        Name:text(x, 'Name'),
        DisplayOrder:num(x, 'DisplayOrder'),
        Remarks:text(x, 'Remarks'),
        IsActive:flag(x, 'IsActive', true),
        CoverageCount:num(x, 'CoverageCount')
    };
}


function toPolicy(x: any): WarrantyPolicy
{
    return {
        WarrantyPolicyId:num(x, 'WarrantyPolicyId'),
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        Name:text(x, 'Name'),
        BrandPublicId:text(x, 'BrandPublicId'),
        BrandName:text(x, 'BrandName'),
        BikeModelPublicId:text(x, 'BikeModelPublicId'),
        ModelName:text(x, 'ModelName'),
        EffectiveFrom:text(x, 'EffectiveFrom').slice(0, 10),
        EffectiveTo:text(x, 'EffectiveTo').slice(0, 10),
        PeriodValue:num(x, 'PeriodValue'),
        PeriodUnit:(text(x, 'PeriodUnit') || 'Years') as WarrantyPeriodUnit,
        KmLimit:optional(x, 'KmLimit'),
        Terms:text(x, 'Terms'),
        Exclusions:text(x, 'Exclusions'),
        Remarks:text(x, 'Remarks'),
        IsActive:flag(x, 'IsActive', true),
        PolicyState:(text(x, 'PolicyState') || 'Current') as WarrantyPolicyState,
        CoverageCount:num(x, 'CoverageCount')
    };
}


function toCoverage(x: any): WarrantyCoverage
{
    return {
        WarrantyCoverageId:num(x, 'WarrantyCoverageId'),
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        PolicyPublicId:text(x, 'PolicyPublicId'),
        PolicyCode:text(x, 'PolicyCode'),
        PolicyName:text(x, 'PolicyName'),
        ScopeText:text(x, 'ScopeText'),
        PolicyState:(text(x, 'PolicyState') || 'Current') as WarrantyPolicyState,
        PartPublicId:text(x, 'PartPublicId'),
        PartName:text(x, 'PartName'),
        PeriodValue:num(x, 'PeriodValue'),
        PeriodUnit:(text(x, 'PeriodUnit') || 'Months') as WarrantyPeriodUnit,
        KmLimit:optional(x, 'KmLimit'),
        Notes:text(x, 'Notes'),
        IsActive:flag(x, 'IsActive', true)
    };
}


function toLookup(x: any): WarrantyLookup
{
    return {
        PublicId:text(x, 'PublicId'),
        Code:text(x, 'Code'),
        Name:text(x, 'Name'),
        ParentPublicId:text(x, 'ParentPublicId'),
        IsActive:flag(x, 'IsActive', true)
    };
}


//===============================================================
// Warranty Configuration Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class WarrantyConfigurationService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/warranty-management/warranty-control/warranty-configuration`;


    //===========================================================
    // Read : every tab in one call
    //===========================================================

    getAll():
        Observable<WarrantyConfiguration>
    {
        return this.http
            .get<any>(this.apiUrl)
            .pipe(
                map(
                    x =>
                    ({
                        Parts:list(x, 'Parts').map(toPart),
                        Policies:list(x, 'Policies').map(toPolicy),
                        Coverages:list(x, 'Coverages').map(toCoverage),
                        Brands:list(x, 'Brands').map(toLookup),
                        Models:list(x, 'Models').map(toLookup),
                        Today:text(x, 'Today').slice(0, 10)
                    })
                )
            );
    }


    getDefaults():
        Observable<WarrantyConfigurationDefaults>
    {
        return this.http
            .get<any>(`${this.apiUrl}/defaults`)
            .pipe(
                map(
                    x =>
                    ({
                        PartCode:text(x, 'PartCode'),
                        NextPartOrder:num(x, 'NextPartOrder') || 1,
                        PolicyCode:text(x, 'PolicyCode'),
                        CoverageCode:text(x, 'CoverageCode')
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
    // path : parts / policies / coverages
    //===========================================================

    create
    (
        path:string,
        body:SaveWarrantyPart | SaveWarrantyPolicy | SaveWarrantyCoverage
    ):
        Observable<string>
    {
        return this.http.post<string>(`${this.apiUrl}/${path}`, body);
    }


    update
    (
        path:string,
        publicId:string,
        body:SaveWarrantyPart | SaveWarrantyPolicy | SaveWarrantyCoverage
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
