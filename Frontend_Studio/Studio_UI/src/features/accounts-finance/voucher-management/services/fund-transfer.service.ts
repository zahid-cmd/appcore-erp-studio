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
    FundTransfer,
    FundTransferSaved,
    FundTransferDefaults,
    CreateFundTransfer,
    UpdateFundTransfer,
    CancelFundTransfer
}
from '../models/fund-transfer.model';

import
{
    TransferLine,
    TransferSide
}
from '../../../../shared/components/accounting/transfer-entry/transfer-entry.models';


//===============================================================
// Fund Transfer Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class FundTransferService
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
        `${environment.apiUrl}/accounts-finance/voucher-management/fund-transfer`;


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

    private normalizeLine
    (
        item:
            any
    ):
        TransferLine
    {
        return {
            Side:
                (this.text(item, 'Side') === 'To' ? 'To' : 'From') as TransferSide,

            AccountType:
                this.text(item, 'AccountType'),

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

            AccountBranch:
                this.text(item, 'AccountBranch'),

            Amount:
                this.num(item, 'Amount'),

            ShortNotes:
                this.text(item, 'ShortNotes'),

            Method:
                this.text(item, 'Method'),

            Reference:
                this.text(item, 'Reference'),

            CheckNo:
                this.text(item, 'CheckNo'),

            CheckDate:
                this.text(item, 'CheckDate').substring(0, 10),

            ChargeAmount:
                this.num(item, 'ChargeAmount')
        };
    }

    normalize
    (
        item:
            any
    ):
        FundTransfer
    {
        const lines =
            this.pick(item, 'Lines');

        return {
            FundTransferId:
                this.num(item, 'FundTransferId'),

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

            TransferType:
                this.text(item, 'TransferType'),

            PartyName:
                this.text(item, 'PartyName'),

            Narration:
                this.text(item, 'Narration'),

            TotalAmount:
                this.num(item, 'TotalAmount'),

            Charges:
                this.num(item, 'Charges'),

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

            Lines:
                Array.isArray(lines)
                    ? lines.map(line => this.normalizeLine(line))
                    : []
        };
    }


    //===========================================================
    // Get All (header only)
    //===========================================================

    getAll():
        Observable<FundTransfer[]>
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
        Observable<FundTransfer>
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
        Observable<FundTransferDefaults>
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
            CreateFundTransfer
    ):
        Observable<FundTransferSaved>
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
                        FundTransferId:
                            this.num(item, 'FundTransferId'),

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
            UpdateFundTransfer
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
            CancelFundTransfer
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