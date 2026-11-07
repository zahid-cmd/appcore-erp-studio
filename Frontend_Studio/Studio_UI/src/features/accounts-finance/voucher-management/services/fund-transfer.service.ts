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
    VoucherPageQuery
}
from '../models/voucher-page-query.model';

import
{
    PagedResult,

    toPagedParams,

    toPagedResult
}
from '../../../../shared/paging/paged-result.model';

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

            PublicId:
                this.text(item, 'PublicId'),

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
    // Get Paged (the list page : one page from the server, with
    // the status counts)
    //===========================================================

    getPaged
    (
        query:
            VoucherPageQuery
    ):
        Observable<PagedResult<FundTransfer>>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/paged`,
                {
                    params:
                        toPagedParams(
                            { ...query }
                        )
                }
            )
            .pipe(
                map(
                    response =>
                        toPagedResult(
                            response,
                            item =>
                                this.normalize(item)
                        )
                )
            );
    }


    //===========================================================
    // Get By Id (header + debits + credits)
    //===========================================================

    // By internal id : the reconciliation print documents load
    // a source voucher by it (links use the uuid)
    getByInternalId
    (
        id:
            number
    ):
        Observable<FundTransfer>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/by-id/${id}`
            )
            .pipe(
                map(
                    item =>
                        this.normalize(item)
                )
            );
    }


    // Print Engine : a uuid (from a link) or an internal id (the
    // reconciliation documents)
    getForPrint
    (
        id:
            number | string
    ):
        Observable<FundTransfer>
    {
        return typeof id === 'number' || /^\d+$/.test(String(id))
            ? this.getByInternalId(Number(id))
            : this.getById(String(id));
    }


    getById
    (
        id:
            string
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

                        PublicId:
                            this.text(item, 'PublicId'),

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
        publicId:
            string,

        model:
            UpdateFundTransfer
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${publicId}`,
            model
        );
    }


    //===========================================================
    // Delete (Draft only)
    //===========================================================

    delete
    (
        id:
            string
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
        publicId:
            string
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${publicId}/approve`,
            {}
        );
    }

    returnToDraft
    (
        publicId:
            string
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${publicId}/return-to-draft`,
            {}
        );
    }

    post
    (
        publicId:
            string
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${publicId}/post`,
            {}
        );
    }

    cancel
    (
        publicId:
            string,
        model:
            CancelFundTransfer
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${publicId}/cancel`,
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