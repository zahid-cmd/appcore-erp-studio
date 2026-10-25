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
    HttpClient,
    HttpParams
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
    PaymentVoucher,
    PaymentVoucherSaved,
    PaymentVoucherDefaults,
    CreatePaymentVoucher,
    UpdatePaymentVoucher,
    CancelPaymentVoucher
}
from '../models/payment-voucher.model';

import
{
    PaymentMode,
    ChargeBorneBy,
    VoucherDebitLine,
    VoucherCreditLine
}
from '../../../../shared/components/accounting/accounting.models';


//===============================================================
// Payment Voucher Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class PaymentVoucherService
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
        `${environment.apiUrl}/accounts-finance/voucher-management/payment-voucher`;


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
        return Number(this.pick(item, name) ?? 0) || 0;
    }

    private dateOrNull
    (
        item:
            any,
        name:
            string
    ):
        string | null
    {
        const value =
            this.pick(item, name);

        return value == null || value === ''
            ? null
            : String(value);
    }


    //===========================================================
    // Normalize
    //===========================================================

    private normalizeCredit
    (
        item:
            any
    ):
        VoucherCreditLine
    {
        return {
            LedgerType:
                this.text(item, 'LedgerType'),

            SubGroupCode:
                this.text(item, 'SubGroupCode'),

            SubGroupName:
                this.text(item, 'SubGroupName'),

            LedgerCode:
                this.text(item, 'LedgerCode'),

            LedgerName:
                this.text(item, 'LedgerName'),

            PartyCode:
                this.text(item, 'PartyCode'),

            Amount:
                this.num(item, 'Amount'),

            ShortNotes:
                this.text(item, 'ShortNotes')
        };
    }

    private normalizeDebit
    (
        item:
            any
    ):
        VoucherDebitLine
    {
        return {
            Mode:
                this.text(item, 'Mode') as PaymentMode,

            LedgerType:
                this.text(item, 'LedgerType'),

            SubGroupCode:
                this.text(item, 'SubGroupCode'),

            SubGroupName:
                this.text(item, 'SubGroupName'),

            LedgerCode:
                this.text(item, 'LedgerCode'),

            LedgerName:
                this.text(item, 'LedgerName'),

            AccountId:
                this.num(item, 'AccountId'),

            Amount:
                this.num(item, 'Amount'),

            ShortNotes:
                this.text(item, 'ShortNotes'),

            ChargePercent:
                this.num(item, 'ChargePercent'),

            ChargeAmount:
                this.num(item, 'ChargeAmount'),

            ChargeBorneBy:
                this.text(item, 'ChargeBorneBy') as ChargeBorneBy | '',

            CardSetupId:
                this.num(item, 'CardSetupId'),

            CardName:
                this.text(item, 'CardName'),

            TransactionRef:
                this.text(item, 'TransactionRef'),

            TenureMonths:
                this.num(item, 'TenureMonths'),

            InterestPercent:
                this.num(item, 'InterestPercent'),

            InterestAmount:
                this.num(item, 'InterestAmount'),

            TotalCharged:
                this.num(item, 'TotalCharged'),

            CheckNo:
                this.text(item, 'CheckNo'),

            CheckDate:
                this.text(item, 'CheckDate').substring(0, 10),

            CheckBank:
                this.text(item, 'CheckBank'),

            // Check : name on the check; MFS : payee wallet
            PayeeName:
                this.text(item, 'PayeeName'),

            PayeeAccount:
                this.text(item, 'PayeeAccount'),

            CheckStatus:
                this.text(item, 'CheckStatus'),

            ClearedVoucherNo:
                this.text(item, 'ClearedVoucherNo')
        };
    }

    normalize
    (
        item:
            any
    ):
        PaymentVoucher
    {
        const debits =
            this.pick(item, 'Debits');

        const credits =
            this.pick(item, 'Credits');

        return {
            PaymentVoucherId:
                this.num(item, 'PaymentVoucherId'),

            VoucherNo:
                this.text(item, 'VoucherNo'),

            VoucherDate:
                this.text(item, 'VoucherDate').substring(0, 10),

            BranchId:
                this.num(item, 'BranchId'),

            BranchCode:
                this.text(item, 'BranchCode'),

            BranchName:
                this.text(item, 'BranchName'),

            FinancialYearId:
                this.num(item, 'FinancialYearId'),

            LedgerType:
                this.text(item, 'LedgerType'),

            PartyName:
                this.text(item, 'PartyName'),

            Narration:
                this.text(item, 'Narration'),

            TotalAmount:
                this.num(item, 'TotalAmount'),

            CompanyCharges:
                this.num(item, 'CompanyCharges'),

            PaymentModes:
                this.text(item, 'PaymentModes'),

            Status:
                this.text(item, 'Status') || 'Draft',

            CancelReason:
                this.text(item, 'CancelReason'),

            CancelDate:
                this.text(item, 'CancelDate').substring(0, 10),

            ApprovedDate:
                this.dateOrNull(item, 'ApprovedDate'),

            PostedDate:
                this.dateOrNull(item, 'PostedDate'),

            CancelledDate:
                this.dateOrNull(item, 'CancelledDate'),

            CreatedDate:
                this.dateOrNull(item, 'CreatedDate'),

            ModifiedDate:
                this.dateOrNull(item, 'ModifiedDate'),

            // Pay To rows (account shape)
            Debits:
                Array.isArray(debits)
                    ? debits.map(line => this.normalizeCredit(line))
                    : [],

            // Payment Mode rows (money shape)
            Credits:
                Array.isArray(credits)
                    ? credits.map(line => this.normalizeDebit(line))
                    : []
        };
    }


    //===========================================================
    // Get All (header only)
    //===========================================================

    getAll():
        Observable<PaymentVoucher[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        (response ?? []).map
                        (
                            item =>
                                this.normalize(item)
                        )
                )
            );
    }


    //===========================================================
    // Get By Id (header + debits + credits)
    //===========================================================

    getById
    (
        id:
            number
    ):
        Observable<PaymentVoucher>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/${id}`
            )
            .pipe(
                map(
                    item =>
                        this.normalize(item)
                )
            );
    }


    //===========================================================
    // Get Defaults (Add form) : next voucher number preview
    //===========================================================

    getDefaults
    (
        branchId:
            number,
        date:
            string
    ):
        Observable<PaymentVoucherDefaults>
    {
        const params =
            new HttpParams()
                .set('branchId', String(branchId))
                .set('date', date);

        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`,
                {
                    params
                }
            )
            .pipe(
                map(
                    item =>
                    ({
                        VoucherNo:
                            this.text(item, 'VoucherNo'),

                        BranchId:
                            this.num(item, 'BranchId'),

                        BranchName:
                            this.text(item, 'BranchName'),

                        FinancialYearId:
                            this.num(item, 'FinancialYearId'),

                        FinancialYearName:
                            this.text(item, 'FinancialYearName'),

                        FinancialYearCode:
                            this.text(item, 'FinancialYearCode'),

                        PeriodMonth:
                            this.num(item, 'PeriodMonth'),

                        Message:
                            this.text(item, 'Message')
                    })
                )
            );
    }


    //===========================================================
    // Create (Draft) → id + the number actually taken
    //===========================================================

    create
    (
        model:
            CreatePaymentVoucher
    ):
        Observable<PaymentVoucherSaved>
    {
        return this.http
            .post<any>(
                this.apiUrl,
                model
            )
            .pipe(
                map(
                    item =>
                    ({
                        PaymentVoucherId:
                            this.num(item, 'PaymentVoucherId'),

                        VoucherNo:
                            this.text(item, 'VoucherNo')
                    })
                )
            );
    }


    //===========================================================
    // Update (Draft only)
    //===========================================================

    update
    (
        model:
            UpdatePaymentVoucher
    ):
        Observable<void>
    {
        return this.http.put<void>(
            this.apiUrl,
            model
        );
    }


    //===========================================================
    // Delete (Draft only)
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
    // Restore (most recently deleted draft)
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
    // Workflow
    //===========================================================

    approve
    (
        id:
            number
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${id}/approve`,
            {}
        );
    }

    returnToDraft
    (
        id:
            number
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${id}/return-to-draft`,
            {}
        );
    }

    post
    (
        id:
            number
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${id}/post`,
            {}
        );
    }

    cancel
    (
        id:
            number,
        model:
            CancelPaymentVoucher
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${id}/cancel`,
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