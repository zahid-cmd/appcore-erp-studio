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
    MembershipPolicy,
    CreateMembershipPolicy,
    UpdateMembershipPolicy,
    MembershipPoliciesDefaults,
    MembershipPolicyCardOption,
    INTERVAL_UNITS
}
from '../models/membership-policies.model';


//===============================================================
// Membership Services Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class MembershipPoliciesService
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
        `${environment.apiUrl}/membership-management/membership-setup/membership-policies`;


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
        MembershipPolicy
    {
        const text =
            (name: string): string =>
                String(this.pick(item, name) ?? '');

        const num =
            (name: string): number =>
                Number(this.pick(item, name) ?? 0);

        return {
            MembershipPolicyId:
                num('MembershipPolicyId'),

            PolicyCode:
                text('PolicyCode'),

            MembershipCardId:
                num('MembershipCardId'),

            CardCode:
                text('CardCode'),

            CardName:
                text('CardName'),

            CardRank:
                num('CardRank'),

            CardIsActive:
                Boolean(this.pick(item, 'CardIsActive') ?? true),

            ValidityMonths:
                num('ValidityMonths'),

            EnrollmentFee:
                num('EnrollmentFee'),

            RenewalFee:
                num('RenewalFee'),

            SparePartsDiscountPercent:
                num('SparePartsDiscountPercent'),

            AccessoriesDiscountPercent:
                num('AccessoriesDiscountPercent'),

            ServiceChargeDiscountPercent:
                num('ServiceChargeDiscountPercent'),

            FreeServiceCount:
                num('FreeServiceCount'),

            ServiceInterval:
                num('ServiceInterval'),

            ServiceIntervalUnit:
                text('ServiceIntervalUnit'),

            MissedServiceGraceDays:
                num('MissedServiceGraceDays'),

            MaxMissedServices:
                num('MaxMissedServices'),

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
    // Normalize Card Option
    //===========================================================

    private normalizeCard
    (
        item:
            any
    ):
        MembershipPolicyCardOption
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


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<MembershipPolicy[]>
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
    // Get Defaults (next code + cards without a policy)
    //===========================================================

    getDefaults():
        Observable<MembershipPoliciesDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    response =>
                    {
                        const units =
                            (this.pick(response, 'IntervalUnits') ?? [])
                                .map(
                                    (item: any) =>
                                        String(item ?? '')
                                )
                                .filter(
                                    (item: string) =>
                                        !!item
                                );

                        return {
                            NextPolicyCode:
                                String(this.pick(response, 'NextPolicyCode') ?? ''),

                            Cards:
                                (this.pick(response, 'Cards') ?? []).map(
                                    (item: any) =>
                                        this.normalizeCard(
                                            item
                                        )
                                ),

                            IntervalUnits:
                                units.length > 0
                                    ? units
                                    : [...INTERVAL_UNITS]
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
        Observable<MembershipPolicy>
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
            CreateMembershipPolicy
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
            UpdateMembershipPolicy
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