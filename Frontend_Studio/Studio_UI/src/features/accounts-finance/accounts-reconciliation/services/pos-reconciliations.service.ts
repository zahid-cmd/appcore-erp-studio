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
    PosActionResult,
    PosAutoSettlementRun,
    PosCenterDefaults,
    PosReconciliationHistory,
    PosReconciliationVoucher,
    PosReconciliations,
    PosRejectRequest,
    PosSettleRequest,
    PosUndoRequest,
    PosBank
}
from '../models/pos-reconciliations.model';


//===============================================================
// POS Reconciliations Service
//
//   GET  /                     card receipts of posted RVs
//   GET  /line-history         one transaction's actions
//   GET  /defaults             next RRV preview
//   GET  /banks                linked bank accounts + their POS
//                              accounts (settlement batches)
//   GET  /vouchers/{id}        settlement / reject RRV (print)
//   GET  /auto-runs?days=      Auto Settlement log
//   POST settle / reject / undo
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class PosReconciliationsService
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
        `${environment.apiUrl}/accounts-finance/accounts-reconciliation/pos-reconciliations`;


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
        Observable<PosReconciliations[]>
    {
        return this.get$<PosReconciliations[]>(
            this.apiUrl
        );
    }

    getLineHistory
    (
        paymentId:
            number
    ):
        Observable<PosReconciliationHistory[]>
    {
        return this.get$<PosReconciliationHistory[]>(
            `${this.apiUrl}/line-history`,
            new HttpParams().set('paymentId', String(paymentId))
        );
    }

    // POS Settlement Center : next RRV preview
    getDefaults
    (
        branchId:
            number,
        date:
            string
    ):
        Observable<PosCenterDefaults>
    {
        return this.get$<PosCenterDefaults>(
            `${this.apiUrl}/defaults`,
            new HttpParams()
                .set('branchId', String(branchId))
                .set('date', date)
        );
    }

    getBanks():
        Observable<PosBank[]>
    {
        return this.get$<PosBank[]>(
            `${this.apiUrl}/banks`
        );
    }

    getVoucher
    (
        id:
            number
    ):
        Observable<PosReconciliationVoucher>
    {
        return this.get$<PosReconciliationVoucher>(
            `${this.apiUrl}/vouchers/${id}`
        );
    }

    getAutoRuns
    (
        days:
            number =
            30
    ):
        Observable<PosAutoSettlementRun[]>
    {
        return this.get$<PosAutoSettlementRun[]>(
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
            PosSettleRequest
    ):
        Observable<PosActionResult>
    {
        return this.post('settle', request);
    }

    reject
    (
        request:
            PosRejectRequest
    ):
        Observable<PosActionResult>
    {
        return this.post('reject', request);
    }

    undo
    (
        request:
            PosUndoRequest
    ):
        Observable<PosActionResult>
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
        Observable<PosActionResult>
    {
        return this.http
            .post<unknown>(
                `${this.apiUrl}/${action}`,
                body
            )
            .pipe(map(response => this.toPascal(response) as PosActionResult));
    }
}