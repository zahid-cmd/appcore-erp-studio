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
    MfsActionResult,
    MfsAutoSettlementRun,
    MfsCenterDefaults,
    MfsReconciliationHistory,
    MfsReconciliationVoucher,
    MfsReconciliations,
    MfsRejectRequest,
    MfsSettleRequest,
    MfsUndoRequest,
    MfsWallet
}
from '../models/mfs-reconciliations.model';


//===============================================================
// MFS Reconciliations Service
//
//   GET  /                     MFS receipts of posted RVs
//   GET  /line-history         one transaction's actions
//   GET  /defaults             next RRV preview
//   GET  /wallets              MFS accounts + linked bank
//   GET  /vouchers/{id}        settlement / reject RRV (print)
//   GET  /auto-runs?days=      Auto Settlement log
//   POST settle / reject / undo
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class MfsReconciliationsService
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
        `${environment.apiUrl}/accounts-finance/accounts-reconciliation/mfs-reconciliations`;


    //===========================================================
    // Response keys : the API sends camelCase; the models use
    // PascalCase. Every key is turned to PascalCase, nested lists
    // included (voucher Lines / Sources).
    //===========================================================

    private toPascal
    (
        value:
            any
    ):
        any
    {
        if
        (
            Array.isArray(value)
        )
        {
            return value.map(item => this.toPascal(item));
        }

        if
        (
            value === null
            ||
            typeof value !== 'object'
        )
        {
            return value;
        }

        const result:
            Record<string, any> =
            {};

        for
        (
            const key of Object.keys(value)
        )
        {
            result[key.charAt(0).toUpperCase() + key.slice(1)] =
                this.toPascal(value[key]);
        }

        return result;
    }

    private get$<T>
    (
        url:
            string,
        params?:
            HttpParams
    ):
        Observable<T>
    {
        return this.http
            .get<unknown>(url, params ? { params } : {})
            .pipe(map(response => this.toPascal(response) as T));
    }


    //===========================================================
    // Read
    //===========================================================

    getAll():
        Observable<MfsReconciliations[]>
    {
        return this.get$<MfsReconciliations[]>(
            this.apiUrl
        );
    }

    getLineHistory
    (
        paymentId:
            number
    ):
        Observable<MfsReconciliationHistory[]>
    {
        return this.get$<MfsReconciliationHistory[]>(
            `${this.apiUrl}/line-history`,
            new HttpParams().set('paymentId', String(paymentId))
        );
    }

    // MFS Settlement Center : next RRV preview
    getDefaults
    (
        branchId:
            number,
        date:
            string
    ):
        Observable<MfsCenterDefaults>
    {
        return this.get$<MfsCenterDefaults>(
            `${this.apiUrl}/defaults`,
            new HttpParams()
                .set('branchId', String(branchId))
                .set('date', date)
        );
    }

    getWallets():
        Observable<MfsWallet[]>
    {
        return this.get$<MfsWallet[]>(
            `${this.apiUrl}/wallets`
        );
    }

    getVoucher
    (
        id:
            number
    ):
        Observable<MfsReconciliationVoucher>
    {
        return this.get$<MfsReconciliationVoucher>(
            `${this.apiUrl}/vouchers/${id}`
        );
    }

    getAutoRuns
    (
        days:
            number =
            30
    ):
        Observable<MfsAutoSettlementRun[]>
    {
        return this.get$<MfsAutoSettlementRun[]>(
            `${this.apiUrl}/auto-runs`,
            new HttpParams().set('days', String(days))
        );
    }


    //===========================================================
    // Actions
    //===========================================================

    settle
    (
        request:
            MfsSettleRequest
    ):
        Observable<MfsActionResult>
    {
        return this.post('settle', request);
    }

    reject
    (
        request:
            MfsRejectRequest
    ):
        Observable<MfsActionResult>
    {
        return this.post('reject', request);
    }

    undo
    (
        request:
            MfsUndoRequest
    ):
        Observable<MfsActionResult>
    {
        return this.post('undo', request);
    }


    //===========================================================
    // History (activity)
    //===========================================================

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`
        );
    }


    //===========================================================
    // Helpers
    //===========================================================

    private post
    (
        action:
            string,
        body:
            unknown
    ):
        Observable<MfsActionResult>
    {
        return this.http
            .post<unknown>(
                `${this.apiUrl}/${action}`,
                body
            )
            .pipe(map(response => this.toPascal(response) as MfsActionResult));
    }
}