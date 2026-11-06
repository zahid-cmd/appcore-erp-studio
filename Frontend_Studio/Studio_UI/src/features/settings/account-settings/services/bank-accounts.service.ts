// PAGE-CLONED : Cash Accounts -> Bank Accounts
// PAGE-CLONED : Wings -> Bank Accounts
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
    PagedResult,
    toPagedParams,
    toPagedResult
}
from '../../../../shared/paging/paged-result.model';

import
{
    BankAccount,
    CreateBankAccount,
    UpdateBankAccount
}
from '../models/bank-accounts.model';


//===============================================================
// BankAccount Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class BankAccountsService
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
        `${environment.apiUrl}/settings/account-settings/bank-accounts`;


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
        Observable<BankAccount[]>
    {
        return this.http

            .get<any[]>(
                this.apiUrl
            )

            .pipe(

                map(

                    response =>

                        response.map(

                            bankAccount =>

                            ({
                                ...bankAccount,

                                BankAccountId:
                                    Number(bankAccount.BankAccountId ?? bankAccount.bankAccountId ?? bankAccount.id ?? bankAccount.Id),

                                AccountSubGroupsId:
                                    Number(bankAccount.AccountSubGroupsId ?? bankAccount.accountSubGroupsId ?? 0),

                                BankAccountCode:
                                    bankAccount.BankAccountCode ?? bankAccount.bankAccountCode ?? '',

                                BankAccountName:
                                    bankAccount.BankAccountName ?? bankAccount.bankAccountName ?? '',

                                Remarks:
                                    bankAccount.Remarks ?? bankAccount.remarks ?? '',

                                Status:
                                    Boolean(bankAccount.Status ?? bankAccount.status ?? true),

                                Branch:
                                    bankAccount.Branch ?? bankAccount.branch ?? '',

                                DisplayName:
                                    bankAccount.DisplayName ?? bankAccount.displayName ?? '',

                                CollectionAccount:
                                    Boolean(bankAccount.CollectionAccount ?? bankAccount.collectionAccount ?? false),

                                PaymentAccount:
                                    Boolean(bankAccount.PaymentAccount ?? bankAccount.paymentAccount ?? false),

                                Bank:
                                    bankAccount.Bank ?? bankAccount.bank ?? '',

                                FullAccountNumber:
                                    bankAccount.FullAccountNumber ?? bankAccount.fullAccountNumber ?? '',

                                ShortAccountName:
                                    bankAccount.ShortAccountName ?? bankAccount.shortAccountName ?? '',

                                ShortAccountNumber:
                                    bankAccount.ShortAccountNumber ?? bankAccount.shortAccountNumber ?? '',

                                ShortBranchName:
                                    bankAccount.ShortBranchName ?? bankAccount.shortBranchName ?? '',

                                SwiftCode:
                                    bankAccount.SwiftCode ?? bankAccount.swiftCode ?? '',

                                RoutingNumber:
                                    bankAccount.RoutingNumber ?? bankAccount.routingNumber ?? '',

                                BranchExclusive:
                                    Boolean(bankAccount.BranchExclusive ?? bankAccount.branchExclusive ?? false),

                                BankBranchName:
                                    bankAccount.BankBranchName ?? bankAccount.bankBranchName ?? '',

                                SanctionLimit:
                                    (bankAccount.SanctionLimit ?? bankAccount.sanctionLimit ?? null) === null
                                        ? null
                                        : Number(bankAccount.SanctionLimit ?? bankAccount.sanctionLimit)
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
            string
    ):
        Observable<BankAccount>
    {
        return this.http.get<BankAccount>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateBankAccount
    ):
        Observable<string>
    {
        return this.http.post<string>(
            this.apiUrl,
            model
        );
    }


    //===========================================================
    // Update
    //===========================================================

    update
    (
        publicId:
            string,

        model:
            UpdateBankAccount
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${publicId}`,
            model
        );
    }


    //===========================================================
    // Delete
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
            string
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${id}/history`
        );
    }



    //===========================================================
    // One list page (server paging)
    //
    // query : page, pageSize, search, sort, dir and the list's
    //         filters; blanks are left out
    // counts: Total · Active · Inactive
    //===========================================================

    getPaged
    (
        query:
            Record<string, unknown>
    ):
        Observable<PagedResult<any>>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/paged`,
                { params:toPagedParams({ ...query }) }
            )
            .pipe(
                map(
                    raw =>
                        toPagedResult(raw, (x: any) => ([x] as any[]).map(
                            bankAccount =>

                            ({
                                ...bankAccount,

                                BankAccountId:
                                    Number(bankAccount.BankAccountId ?? bankAccount.bankAccountId ?? bankAccount.id ?? bankAccount.Id),

                                AccountSubGroupsId:
                                    Number(bankAccount.AccountSubGroupsId ?? bankAccount.accountSubGroupsId ?? 0),

                                BankAccountCode:
                                    bankAccount.BankAccountCode ?? bankAccount.bankAccountCode ?? '',

                                BankAccountName:
                                    bankAccount.BankAccountName ?? bankAccount.bankAccountName ?? '',

                                Remarks:
                                    bankAccount.Remarks ?? bankAccount.remarks ?? '',

                                Status:
                                    Boolean(bankAccount.Status ?? bankAccount.status ?? true),

                                Branch:
                                    bankAccount.Branch ?? bankAccount.branch ?? '',

                                DisplayName:
                                    bankAccount.DisplayName ?? bankAccount.displayName ?? '',

                                CollectionAccount:
                                    Boolean(bankAccount.CollectionAccount ?? bankAccount.collectionAccount ?? false),

                                PaymentAccount:
                                    Boolean(bankAccount.PaymentAccount ?? bankAccount.paymentAccount ?? false),

                                Bank:
                                    bankAccount.Bank ?? bankAccount.bank ?? '',

                                FullAccountNumber:
                                    bankAccount.FullAccountNumber ?? bankAccount.fullAccountNumber ?? '',

                                ShortAccountName:
                                    bankAccount.ShortAccountName ?? bankAccount.shortAccountName ?? '',

                                ShortAccountNumber:
                                    bankAccount.ShortAccountNumber ?? bankAccount.shortAccountNumber ?? '',

                                ShortBranchName:
                                    bankAccount.ShortBranchName ?? bankAccount.shortBranchName ?? '',

                                SwiftCode:
                                    bankAccount.SwiftCode ?? bankAccount.swiftCode ?? '',

                                RoutingNumber:
                                    bankAccount.RoutingNumber ?? bankAccount.routingNumber ?? '',

                                BranchExclusive:
                                    Boolean(bankAccount.BranchExclusive ?? bankAccount.branchExclusive ?? false),

                                BankBranchName:
                                    bankAccount.BankBranchName ?? bankAccount.bankBranchName ?? '',

                                SanctionLimit:
                                    (bankAccount.SanctionLimit ?? bankAccount.sanctionLimit ?? null) === null
                                        ? null
                                        : Number(bankAccount.SanctionLimit ?? bankAccount.sanctionLimit)
                            })
                        )[0])
                )
            );
    }
}
