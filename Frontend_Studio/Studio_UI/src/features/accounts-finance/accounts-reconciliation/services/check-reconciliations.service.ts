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
    CheckActionResult,
    CheckBankAccount,
    CheckCenterDefaults,
    CheckClearRequest,
    CheckClearingVoucher,
    CheckDepositRequest,
    CheckDepositSlip,
    CheckDirection,
    CheckDishonourRequest,
    CheckReconciliationHistory,
    CheckReconciliations,
    CheckUndoRequest,
    CheckVoidRequest
}
from '../models/check-reconciliations.model';


//===============================================================
// Check Reconciliations Service
//
//   GET  /?direction=          checks of posted RV / PV
//   GET  /check-history        one check's actions
//   GET  /deposit-accounts     bank accounts a branch deposits to
//   GET  /vouchers/{id}        RRV / RRP (print)
//   GET  /deposit-slips/{id}   deposit slip (print)
//   POST deposit / undo-deposit / clear / undo-clear /
//        dishonour / undo-dishonour / re-present / void /
//        undo-void
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class CheckReconciliationsService
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
        `${environment.apiUrl}/accounts-finance/accounts-reconciliation/check-reconciliations`;


    //===========================================================
    // Response keys : the API may send camelCase (status) or
    // PascalCase (Status); the models use PascalCase. Every key
    // is turned to PascalCase, nested lists included (voucher
    // Lines, slip Checks).
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

    getAll
    (
        direction:
            CheckDirection | '' =
            ''
    ):
        Observable<CheckReconciliations[]>
    {
        const params =
            direction
                ? new HttpParams().set('direction', direction)
                : new HttpParams();

        return this.get$<CheckReconciliations[]>(
            this.apiUrl,
            params
        );
    }

    getCheckHistory
    (
        direction:
            CheckDirection,
        paymentId:
            number
    ):
        Observable<CheckReconciliationHistory[]>
    {
        return this.get$<CheckReconciliationHistory[]>(
            `${this.apiUrl}/check-history`,
            new HttpParams()
                .set('direction', direction)
                .set('paymentId', String(paymentId))
        );
    }

    // Check Clearing Center : next number preview
    //   mode : deposit (DS-…) / clear, dishonour (RRV-… / RRP-…)
    getDefaults
    (
        direction:
            CheckDirection,
        mode:
            string,
        branchId:
            number,
        date:
            string
    ):
        Observable<CheckCenterDefaults>
    {
        return this.get$<CheckCenterDefaults>(
            `${this.apiUrl}/defaults`,
            new HttpParams()
                .set('direction', direction)
                .set('mode', mode)
                .set('branchId', String(branchId))
                .set('date', date)
        );
    }

    getDepositAccounts
    (
        branchId:
            number
    ):
        Observable<CheckBankAccount[]>
    {
        return this.get$<CheckBankAccount[]>(
            `${this.apiUrl}/deposit-accounts`,
            new HttpParams().set('branchId', String(branchId))
        );
    }

    getVoucher
    (
        id:
            number
    ):
        Observable<CheckClearingVoucher>
    {
        return this.get$<CheckClearingVoucher>(
            `${this.apiUrl}/vouchers/${id}`
        );
    }

    getDepositSlip
    (
        id:
            number
    ):
        Observable<CheckDepositSlip>
    {
        return this.get$<CheckDepositSlip>(
            `${this.apiUrl}/deposit-slips/${id}`
        );
    }


    //===========================================================
    // Actions
    //===========================================================

    deposit
    (
        request:
            CheckDepositRequest
    ):
        Observable<CheckActionResult>
    {
        return this.post('deposit', request);
    }

    undoDeposit
    (
        request:
            CheckUndoRequest
    ):
        Observable<CheckActionResult>
    {
        return this.post('undo-deposit', request);
    }

    clear
    (
        request:
            CheckClearRequest
    ):
        Observable<CheckActionResult>
    {
        return this.post('clear', request);
    }

    undoClear
    (
        request:
            CheckUndoRequest
    ):
        Observable<CheckActionResult>
    {
        return this.post('undo-clear', request);
    }

    dishonour
    (
        request:
            CheckDishonourRequest
    ):
        Observable<CheckActionResult>
    {
        return this.post('dishonour', request);
    }

    undoDishonour
    (
        request:
            CheckUndoRequest
    ):
        Observable<CheckActionResult>
    {
        return this.post('undo-dishonour', request);
    }

    represent
    (
        request:
            CheckUndoRequest
    ):
        Observable<CheckActionResult>
    {
        return this.post('re-present', request);
    }

    voidCheck
    (
        request:
            CheckVoidRequest
    ):
        Observable<CheckActionResult>
    {
        return this.post('void', request);
    }

    undoVoid
    (
        request:
            CheckUndoRequest
    ):
        Observable<CheckActionResult>
    {
        return this.post('undo-void', request);
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
        Observable<CheckActionResult>
    {
        return this.http
            .post<unknown>(
                `${this.apiUrl}/${action}`,
                body
            )
            .pipe(map(response => this.toPascal(response) as CheckActionResult));
    }
}