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
    Membership,
    MembershipServiceWindow,
    CreateMembership,
    UpdateMembership,
    MembershipStatusDefaults,
    MEMBERSHIP_STATUSES
}
from '../models/membership-status.model';


//===============================================================
// Membership Services Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class MembershipStatusService
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
        `${environment.apiUrl}/membership-management/membership-assignment/membership-status`;


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
    // Value helpers
    //===========================================================

    private text
    (
        item:
            any,
        name:
            string
    ):
        string
    {
        return String(this.pick(item, name) ?? '');
    }


    private num
    (
        item:
            any,
        name:
            string
    ):
        number
    {
        return Number(this.pick(item, name) ?? 0);
    }


    private bool
    (
        item:
            any,
        name:
            string
    ):
        boolean
    {
        return Boolean(this.pick(item, name) ?? false);
    }


    // "2026-10-21T00:00:00" or "2026-10-21" -> "2026-10-21"
    private date
    (
        item:
            any,
        name:
            string
    ):
        string
    {
        return this.text(item, name).slice(0, 10);
    }


    //===========================================================
    // Normalize Window
    //===========================================================

    private normalizeWindow
    (
        item:
            any
    ):
        MembershipServiceWindow
    {
        return {
            MembershipServiceWindowId:
                this.num(item, 'MembershipServiceWindowId'),

            WindowNo:
                this.num(item, 'WindowNo'),

            FromDate:
                this.date(item, 'FromDate'),

            ToDate:
                this.date(item, 'ToDate'),

            IsCarriedOver:
                this.bool(item, 'IsCarriedOver'),

            State:
                this.text(item, 'State'),

            UsedDate:
                this.date(item, 'UsedDate'),

            UsedReference:
                this.text(item, 'UsedReference'),

            IsApproved:
                this.bool(item, 'IsApproved'),

            ApprovedDate:
                this.date(item, 'ApprovedDate'),

            ApprovalReason:
                this.text(item, 'ApprovalReason'),

            CanUse:
                this.bool(item, 'CanUse'),

            CanUndo:
                this.bool(item, 'CanUndo'),

            CanApprove:
                this.bool(item, 'CanApprove')
        };
    }


    //===========================================================
    // Normalize Membership
    //===========================================================

    normalize
    (
        item:
            any
    ):
        Membership
    {
        const vehicle =
            this.pick(item, 'CustomerVehicleId');

        return {
            MembershipId:
                this.num(item, 'MembershipId'),

            MembershipNo:
                this.text(item, 'MembershipNo'),

            EntryType:
                this.text(item, 'EntryType'),

            MembershipCardId:
                this.num(item, 'MembershipCardId'),

            MembershipPolicyId:
                this.num(item, 'MembershipPolicyId'),

            CustomerId:
                this.num(item, 'CustomerId'),

            CardCode:
                this.text(item, 'CardCode'),

            CardName:
                this.text(item, 'CardName'),

            PolicyCode:
                this.text(item, 'PolicyCode'),

            CustomerCode:
                this.text(item, 'CustomerCode'),

            CustomerName:
                this.text(item, 'CustomerName'),

            CustomerType:
                this.text(item, 'CustomerType'),

            MotorBikeName:
                this.text(item, 'MotorBikeName'),

            UsedCount:
                this.num(item, 'UsedCount'),

            MissedCount:
                this.num(item, 'MissedCount'),

            ApprovedCount:
                this.num(item, 'ApprovedCount'),

            IsEditable:
                this.bool(item, 'IsEditable'),

            Windows:
                (this.pick(item, 'Windows') ?? []).map(
                    (window: any) =>
                        this.normalizeWindow(
                            window
                        )
                ),

            CustomerVehicleId:
                vehicle == null
                    ? null
                    : Number(vehicle),

            MotorBikeId:
                this.num(item, 'MotorBikeId'),

            ChassisNo:
                this.text(item, 'ChassisNo'),

            EngineNo:
                this.text(item, 'EngineNo'),

            EnrollmentDate:
                this.date(item, 'EnrollmentDate'),

            StartDate:
                this.date(item, 'StartDate'),

            ExpiryDate:
                this.date(item, 'ExpiryDate'),

            FeeAmount:
                this.num(item, 'FeeAmount'),

            FeeCollected:
                this.bool(item, 'FeeCollected'),

            ValidityMonths:
                this.num(item, 'ValidityMonths'),

            SparePartsDiscountPercent:
                this.num(item, 'SparePartsDiscountPercent'),

            AccessoriesDiscountPercent:
                this.num(item, 'AccessoriesDiscountPercent'),

            ServiceChargeDiscountPercent:
                this.num(item, 'ServiceChargeDiscountPercent'),

            FreeServiceCount:
                this.num(item, 'FreeServiceCount'),

            CarriedServiceCount:
                this.num(item, 'CarriedServiceCount'),

            ServiceInterval:
                this.num(item, 'ServiceInterval'),

            ServiceIntervalUnit:
                this.text(item, 'ServiceIntervalUnit'),

            MissedServiceGraceDays:
                this.num(item, 'MissedServiceGraceDays'),

            MaxMissedServices:
                this.num(item, 'MaxMissedServices'),

            Status:
                this.text(item, 'Status'),

            StatusReason:
                this.text(item, 'StatusReason'),

            StatusDate:
                this.date(item, 'StatusDate'),

            Remarks:
                this.text(item, 'Remarks')
        };
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<Membership[]>
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
    // Get Defaults (next number, cards, customers, bikes)
    //===========================================================

    getDefaults():
        Observable<MembershipStatusDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    response =>
                    {
                        const statuses =
                            (this.pick(response, 'Statuses') ?? [])
                                .map(
                                    (item: any) =>
                                        String(item ?? '')
                                )
                                .filter(
                                    (item: string) =>
                                        !!item
                                );

                        return {
                            NextMembershipNo:
                                this.text(response, 'NextMembershipNo'),

                            Today:
                                this.date(response, 'Today'),

                            Cards:
                                (this.pick(response, 'Cards') ?? []).map(
                                    (item: any) =>
                                    ({
                                        MembershipCardId:
                                            this.num(item, 'MembershipCardId'),

                                        CardCode:
                                            this.text(item, 'CardCode'),

                                        CardName:
                                            this.text(item, 'CardName'),

                                        CardRank:
                                            this.num(item, 'CardRank'),

                                        MembershipPolicyId:
                                            this.num(item, 'MembershipPolicyId'),

                                        PolicyCode:
                                            this.text(item, 'PolicyCode'),

                                        ValidityMonths:
                                            this.num(item, 'ValidityMonths'),

                                        EnrollmentFee:
                                            this.num(item, 'EnrollmentFee'),

                                        SparePartsDiscountPercent:
                                            this.num(item, 'SparePartsDiscountPercent'),

                                        AccessoriesDiscountPercent:
                                            this.num(item, 'AccessoriesDiscountPercent'),

                                        ServiceChargeDiscountPercent:
                                            this.num(item, 'ServiceChargeDiscountPercent'),

                                        FreeServiceCount:
                                            this.num(item, 'FreeServiceCount'),

                                        ServiceInterval:
                                            this.num(item, 'ServiceInterval'),

                                        ServiceIntervalUnit:
                                            this.text(item, 'ServiceIntervalUnit'),

                                        MissedServiceGraceDays:
                                            this.num(item, 'MissedServiceGraceDays'),

                                        MaxMissedServices:
                                            this.num(item, 'MaxMissedServices')
                                    })
                                ),

                            Customers:
                                (this.pick(response, 'Customers') ?? []).map(
                                    (item: any) =>
                                    ({
                                        CustomerId:
                                            this.num(item, 'CustomerId'),

                                        CustomerCode:
                                            this.text(item, 'CustomerCode'),

                                        DisplayName:
                                            this.text(item, 'DisplayName'),

                                        CustomerType:
                                            this.text(item, 'CustomerType')
                                    })
                                ),

                            MotorBikes:
                                (this.pick(response, 'MotorBikes') ?? []).map(
                                    (item: any) =>
                                    ({
                                        MotorBikeId:
                                            this.num(item, 'MotorBikeId'),

                                        ProductCode:
                                            this.text(item, 'ProductCode'),

                                        ProductName:
                                            this.text(item, 'ProductName')
                                    })
                                ),

                            Statuses:
                                statuses.length > 0
                                    ? statuses
                                    : [...MEMBERSHIP_STATUSES]
                        };
                    }
                )
            );
    }


    //===========================================================
    // Get By Id (with the free service windows)
    //===========================================================

    getById
    (
        id:
            number
    ):
        Observable<Membership>
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
    // Create (Enroll) / Update / Delete / Restore
    //===========================================================

    create
    (
        model:
            CreateMembership
    ):
        Observable<number>
    {
        return this.http.post<number>(
            this.apiUrl,
            model
        );
    }


    update
    (
        model:
            UpdateMembership
    ):
        Observable<void>
    {
        return this.http.put<void>(
            this.apiUrl,
            model
        );
    }


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


    restore():
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/restore`,
            {}
        );
    }


    //===========================================================
    // Free Service Windows
    //===========================================================

    useWindow
    (
        membershipId:
            number,
        windowId:
            number,
        usedDate:
            string,
        reference:
            string
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${membershipId}/windows/${windowId}/use`,
            {
                UsedDate:
                    usedDate,

                Reference:
                    reference
            }
        );
    }


    undoUseWindow
    (
        membershipId:
            number,
        windowId:
            number
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${membershipId}/windows/${windowId}/undo-use`,
            {}
        );
    }


    approveWindow
    (
        membershipId:
            number,
        windowId:
            number,
        reason:
            string
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${membershipId}/windows/${windowId}/approve`,
            {
                Reason:
                    reason
            }
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