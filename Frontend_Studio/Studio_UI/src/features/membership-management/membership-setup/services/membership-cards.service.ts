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
    MembershipCard,
    CreateMembershipCard,
    UpdateMembershipCard,
    MembershipCardsDefaults,
    MembershipCardAccountOption
}
from '../models/membership-cards.model';


//===============================================================
// Membership Services Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class MembershipCardsService
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
        `${environment.apiUrl}/membership-management/membership-setup/membership-cards`;


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
        MembershipCard
    {
        const text =
            (name: string): string =>
                String(this.pick(item, name) ?? '');

        const num =
            (name: string): number =>
                Number(this.pick(item, name) ?? 0);

        return {
            MembershipCardId:
                num('MembershipCardId'),

            CardCode:
                text('CardCode'),

            CardName:
                text('CardName'),

            CardRank:
                num('CardRank'),

            FeeSubGroupCode:
                text('FeeSubGroupCode'),

            FeeSubGroupName:
                text('FeeSubGroupName'),

            FeeLedgerCode:
                text('FeeLedgerCode'),

            FeeLedgerName:
                text('FeeLedgerName'),

            DiscountSubGroupCode:
                text('DiscountSubGroupCode'),

            DiscountSubGroupName:
                text('DiscountSubGroupName'),

            DiscountLedgerCode:
                text('DiscountLedgerCode'),

            DiscountLedgerName:
                text('DiscountLedgerName'),

            MembershipServiceId:
                this.pick(item, 'MembershipServiceId') == null
                    ? null
                    : num('MembershipServiceId'),

            ServiceCode:
                text('ServiceCode'),

            ServiceName:
                text('ServiceName'),

            ServiceValue:
                num('ServiceValue'),

            Readiness:
                text('Readiness'),

            ServiceIncomeSubGroupCode:
                text('ServiceIncomeSubGroupCode'),

            ServiceIncomeLedgerCode:
                text('ServiceIncomeLedgerCode'),

            ServiceIncomeLedgerName:
                text('ServiceIncomeLedgerName'),

            ServiceExpenseSubGroupCode:
                text('ServiceExpenseSubGroupCode'),

            ServiceExpenseLedgerCode:
                text('ServiceExpenseLedgerCode'),

            ServiceExpenseLedgerName:
                text('ServiceExpenseLedgerName'),

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
    // Normalize Account Option
    //===========================================================

    private normalizeAccount
    (
        item:
            any
    ):
        MembershipCardAccountOption
    {
        return {
            SubGroupCode:
                String(this.pick(item, 'SubGroupCode') ?? ''),

            SubGroupName:
                String(this.pick(item, 'SubGroupName') ?? ''),

            NextLedgerCode:
                String(this.pick(item, 'NextLedgerCode') ?? ''),

            Message:
                String(this.pick(item, 'Message') ?? '')
        };
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<MembershipCard[]>
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
    // Get Defaults (preview of the next card)
    //===========================================================

    getDefaults():
        Observable<MembershipCardsDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    response =>
                    ({
                        NextCardCode:
                            String(this.pick(response, 'NextCardCode') ?? ''),

                        NextCardRank:
                            Number(this.pick(response, 'NextCardRank') ?? 1),

                        FeeAccount:
                            this.normalizeAccount(
                                this.pick(response, 'FeeAccount')
                            ),

                        DiscountAccount:
                            this.normalizeAccount(
                                this.pick(response, 'DiscountAccount')
                            ),

                        ServiceIncomeAccount:
                            this.normalizeAccount(
                                this.pick(response, 'ServiceIncomeAccount')
                            ),

                        ServiceExpenseAccount:
                            this.normalizeAccount(
                                this.pick(response, 'ServiceExpenseAccount')
                            ),

                        ServiceSubCategoryCode:
                            String(this.pick(response, 'ServiceSubCategoryCode') ?? ''),

                        ServiceSubCategoryName:
                            String(this.pick(response, 'ServiceSubCategoryName') ?? ''),

                        NextServiceCode:
                            String(this.pick(response, 'NextServiceCode') ?? ''),

                        ServiceMessage:
                            String(this.pick(response, 'ServiceMessage') ?? '')
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
        Observable<MembershipCard>
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
            CreateMembershipCard
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
            UpdateMembershipCard
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