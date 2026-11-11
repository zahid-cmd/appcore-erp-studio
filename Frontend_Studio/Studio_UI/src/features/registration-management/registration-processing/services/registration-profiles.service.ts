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
    RegistrationProfileRow,
    RegistrationProfilesList
}
from '../models/registration-profiles.model';


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

const list =
    (x: any, name: string): any[] =>
        (pick(x, name) ?? []) as any[];


//===============================================================
// Registration Profiles service
//   GET api/registration-management/registration-processing/
//       registration-profiles?branchId=
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class RegistrationProfilesService
{
    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/registration-management/registration-processing/registration-profiles`;


    getList
    (
        branchId:
            number
    ):
        Observable<RegistrationProfilesList>
    {
        return this.http
            .get<any>(this.apiUrl, { params:{ branchId:String(branchId || 0) } })
            .pipe(
                map
                (
                    x =>
                    ({
                        Rows:list(x, 'Rows').map(r => toRow(r)),
                        Stages:
                            list(x, 'Stages').map
                            (
                                s =>
                                ({
                                    StageKey:text(s, 'StageKey'),
                                    StageName:text(s, 'StageName'),
                                    ExpectedDays:pick(s, 'ExpectedDays') == null ? null : num(s, 'ExpectedDays'),
                                    ColorCode:text(s, 'ColorCode')
                                })
                            )
                    })
                )
            );
    }
}


function toRow
(
    r:
        any
):
    RegistrationProfileRow
{
    return {
        RegistrationProfileId:num(r, 'RegistrationProfileId'),
        PublicId:text(r, 'PublicId'),
        ProfileNo:text(r, 'ProfileNo'),
        ProfileDate:text(r, 'ProfileDate').substring(0, 10),
        BranchId:num(r, 'BranchId'),
        BranchName:text(r, 'BranchName'),
        SalesInvoiceNo:text(r, 'SalesInvoiceNo'),
        SalesInvoiceDate:text(r, 'SalesInvoiceDate').substring(0, 10),
        CustomerFileNo:text(r, 'CustomerFileNo'),
        CustomerCode:text(r, 'CustomerCode'),
        CustomerName:text(r, 'CustomerName'),
        CustomerPhone:text(r, 'CustomerPhone'),
        SalesmanName:text(r, 'SalesmanName'),
        ModelName:text(r, 'ModelName'),
        ChassisNo:text(r, 'ChassisNo'),
        EngineNo:text(r, 'EngineNo'),
        ColorName:text(r, 'ColorName'),
        VehiclePower:text(r, 'VehiclePower'),
        RegistrationTypeName:text(r, 'RegistrationTypeName'),
        RegistrationPlan:text(r, 'RegistrationPlan'),
        RegistrationMode:text(r, 'RegistrationMode'),
        ValidityYears:num(r, 'ValidityYears'),
        Amount:num(r, 'Amount'),
        CollectedAmount:num(r, 'CollectedAmount'),
        BrtaFees:num(r, 'BrtaFees'),
        SubmissionCharges:num(r, 'SubmissionCharges'),
        BrtaTips:num(r, 'BrtaTips'),
        RegistrationCommission:num(r, 'RegistrationCommission'),
        TotalCost:num(r, 'TotalCost'),
        Surplus:num(r, 'Surplus'),
        Status:text(r, 'Status'),
        StatusDate:text(r, 'StatusDate').substring(0, 10),
        DaysInStatus:num(r, 'DaysInStatus'),
        Overdue:!!pick(r, 'Overdue'),
        CancelReason:text(r, 'CancelReason'),
        CreatedDate:text(r, 'CreatedDate')
    };
}
