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
    MembershipService,
    UpdateMembershipService,
    MembershipServicesDefaults,
    MembershipServiceCardOption,
    MembershipServiceSubCategoryOption
}
from '../models/membership-services.model';


//===============================================================
// Membership Services Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class MembershipServicesService
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
        `${environment.apiUrl}/settings/service-settings/membership-services`;


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
        MembershipService
    {
        const text =
            (name: string): string =>
                String(this.pick(item, name) ?? '');

        const num =
            (name: string): number =>
                Number(this.pick(item, name) ?? 0);

        return {
            MembershipServiceId:
                num('MembershipServiceId'),

            ServiceCode:
                text('ServiceCode'),

            ServiceSubCategoryId:
                num('ServiceSubCategoryId'),

            SubCategoryCode:
                text('SubCategoryCode'),

            SubCategoryName:
                text('SubCategoryName'),

            MembershipCardId:
                this.pick(item, 'MembershipCardId') == null
                    ? null
                    : Number(this.pick(item, 'MembershipCardId')),

            CardCode:
                text('CardCode'),

            CardRank:
                num('CardRank'),

            MembershipType:
                text('MembershipType'),

            ServiceName:
                text('ServiceName'),

            DisplayName:
                text('DisplayName'),

            ServiceValue:
                num('ServiceValue'),

            Readiness:
                text('Readiness')
                ||
                (
                    num('ServiceValue') > 0
                        ? 'Ready'
                        : 'Pending'
                ),

            IncomeSubGroupCode:
                text('IncomeSubGroupCode'),

            IncomeLedgerCode:
                text('IncomeLedgerCode'),

            IncomeLedgerName:
                text('IncomeLedgerName'),

            ExpenseSubGroupCode:
                text('ExpenseSubGroupCode'),

            ExpenseLedgerCode:
                text('ExpenseLedgerCode'),

            ExpenseLedgerName:
                text('ExpenseLedgerName'),

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
    // Normalize filter options
    //===========================================================

    private normalizeCard
    (
        item:
            any
    ):
        MembershipServiceCardOption
    {
        return {
            MembershipCardId:
                Number(this.pick(item, 'MembershipCardId') ?? 0),

            CardCode:
                String(this.pick(item, 'CardCode') ?? ''),

            CardName:
                String(this.pick(item, 'CardName') ?? ''),

            CardRank:
                Number(this.pick(item, 'CardRank') ?? 0),

            IsActive:
                Boolean(this.pick(item, 'IsActive') ?? true)
        };
    }


    private normalizeSubCategory
    (
        item:
            any
    ):
        MembershipServiceSubCategoryOption
    {
        return {
            ServiceSubCategoryId:
                Number(this.pick(item, 'ServiceSubCategoryId') ?? 0),

            SubCategoryCode:
                String(this.pick(item, 'SubCategoryCode') ?? ''),

            SubCategoryName:
                String(this.pick(item, 'SubCategoryName') ?? '')
        };
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<MembershipService[]>
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
    // Get Defaults (list filter options)
    //===========================================================

    getDefaults():
        Observable<MembershipServicesDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    response =>
                    ({
                        Cards:
                            (this.pick(response, 'Cards') ?? []).map(
                                (item: any) =>
                                    this.normalizeCard(
                                        item
                                    )
                            ),

                        SubCategories:
                            (this.pick(response, 'SubCategories') ?? []).map(
                                (item: any) =>
                                    this.normalizeSubCategory(
                                        item
                                    )
                            ),

                        ExpenseSubGroupCode:
                            String(this.pick(response, 'ExpenseSubGroupCode') ?? ''),

                        ExpenseSubGroupName:
                            String(this.pick(response, 'ExpenseSubGroupName') ?? '')
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
        Observable<MembershipService>
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
    // Configure (Service Value, status, remarks)
    //
    // There is no create / delete / restore : rows come from
    // Membership Cards.
    //===========================================================

    update
    (
        model:
            UpdateMembershipService
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