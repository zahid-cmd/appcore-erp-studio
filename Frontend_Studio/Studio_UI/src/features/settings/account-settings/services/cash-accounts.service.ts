// PAGE-CLONED : Wings -> Cash Accounts
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
    CashAccount,
    CreateCashAccount,
    UpdateCashAccount
}
from '../models/cash-accounts.model';


//===============================================================
// CashAccount Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class CashAccountsService
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
        `${environment.apiUrl}/settings/account-settings/cash-accounts`;


    //===========================================================
    // Get API Base URL
    //===========================================================

    getApiBaseUrl():
        string
    {
        return environment.apiUrl

            .replace(
                /\/api\/?$/,
                ''
            );
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<CashAccount[]>
    {
        return this.http

            .get<any[]>(
                this.apiUrl
            )

            .pipe(

                map(

                    response =>

                        response.map(

                            cashAccount =>

                            ({
                                ...cashAccount,

                                CashAccountId:
                                    Number(cashAccount.CashAccountId ?? cashAccount.cashAccountId ?? cashAccount.id ?? cashAccount.Id),

                                AccountSubGroupsId:
                                    Number(cashAccount.AccountSubGroupsId ?? cashAccount.accountSubGroupsId ?? 0),

                                CashAccountCode:
                                    cashAccount.CashAccountCode ?? cashAccount.cashAccountCode ?? '',

                                CashAccountName:
                                    cashAccount.CashAccountName ?? cashAccount.cashAccountName ?? '',

                                Remarks:
                                    cashAccount.Remarks ?? cashAccount.remarks ?? '',

                                IsActive:
                                    Boolean(cashAccount.IsActive ?? cashAccount.isActive ?? true)
                            })

                        )

                )

            );
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    getNextCode
    (
        accountSubGroupsId:
            number
    ):
        Observable<string>
    {
        return this.http.get(
            `${this.apiUrl}/next-code`,
            {
                params:
                {
                    accountSubGroupsId:
                        accountSubGroupsId
                },

                responseType:
                    'text'
            }
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
        Observable<CashAccount>
    {
        return this.http.get<CashAccount>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateCashAccount
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
            UpdateCashAccount
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
        Observable<boolean>
    {
        return this.http.put<boolean>(
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


    //===========================================================
    // Get Entity History
    //===========================================================

    getEntityHistory
    (
        id:
            number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${id}/history`
        );
    }
}