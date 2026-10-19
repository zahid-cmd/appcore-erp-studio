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
    CreateMembershipService,
    UpdateMembershipService,
    MembershipServicesDefaults,
    MembershipServiceSubCategoryOption,
    MEMBERSHIP_TYPES
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

            MembershipType:
                text('MembershipType'),

            ServiceName:
                text('ServiceName'),

            DisplayName:
                text('DisplayName'),

            ServiceValue:
                num('ServiceValue'),

            IncomeLedgerCode:
                text('IncomeLedgerCode'),

            IncomeLedgerName:
                text('IncomeLedgerName'),

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
    // Normalize Sub Category Option
    //===========================================================

    private normalizeOption
    (
        item:
            any
    ):
        MembershipServiceSubCategoryOption
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

            CategoryName:
                text('CategoryName'),

            IsActive:
                Boolean(this.pick(item, 'IsActive') ?? false),

            ItemCreationAllowed:
                Boolean(this.pick(item, 'ItemCreationAllowed') ?? false),

            NextServiceCode:
                text('NextServiceCode'),

            NextIncomeLedgerCode:
                text('NextIncomeLedgerCode'),

            NextExpenseLedgerCode:
                text('NextExpenseLedgerCode'),

            Message:
                text('Message')
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
    // Get Defaults (Service Categories + next codes)
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
                    {
                        const types =
                            (this.pick(response, 'MembershipTypes') ?? [])
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

                            MembershipTypes:
                                types.length > 0
                                    ? types
                                    : [...MEMBERSHIP_TYPES],

                            ExpenseSubGroupCode:
                                String(this.pick(response, 'ExpenseSubGroupCode') ?? ''),

                            ExpenseSubGroupName:
                                String(this.pick(response, 'ExpenseSubGroupName') ?? ''),

                            ExpenseSubGroupMessage:
                                String(this.pick(response, 'ExpenseSubGroupMessage') ?? '')
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
    // Create
    //===========================================================

    create
    (
        model:
            CreateMembershipService
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