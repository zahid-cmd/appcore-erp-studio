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
    EmiAccounts,
    CreateEmiAccounts,
    UpdateEmiAccounts,
    EmiAccountsDefaults
}
from '../models/emi-accounts.model';


//===============================================================
// EMI Accounts Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class EmiAccountsService
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
        `${environment.apiUrl}/settings/account-settings/emi-accounts`;


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
        EmiAccounts
    {
        const text =
            (name: string): string =>
                String(this.pick(item, name) ?? '');

        const num =
            (name: string): number =>
                Number(this.pick(item, name) ?? 0);

        const flag =
            (name: string, fallback: boolean): boolean =>
            {
                const value =
                    this.pick(item, name);

                return value == null
                    ? fallback
                    : Boolean(value);
            };

        return {
            EmiAccountId:
                num('EmiAccountId'),

            AccountSubGroupsId:
                num('AccountSubGroupsId'),

            SubGroupCode:
                text('SubGroupCode'),

            SubGroupName:
                text('SubGroupName'),

            EmiAccountCode:
                text('EmiAccountCode'),

            EmiAccountName:
                text('EmiAccountName'),

            Platform:
                text('Platform'),

            LinkedBankAccount:
                text('LinkedBankAccount'),

            // Display name of the linked bank (stored by code);
            // an older API without it falls back to the stored value
            LinkedBankAccountName:
                text('LinkedBankAccountName')
                ||
                text('LinkedBankAccount'),

            Branch:
                text('Branch'),

            CollectionAccount:
                flag('CollectionAccount', true),

            PaymentAccount:
                flag('PaymentAccount', false),

            BranchExclusive:
                flag('BranchExclusive', false),

            Remarks:
                text('Remarks'),

            Status:
                flag('Status', true)
        };
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<EmiAccounts[]>
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
    // Get By Id
    //===========================================================

    getById
    (
        id:
            number
    ):
        Observable<EmiAccounts>
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
    // Get Defaults (reserved sub group + next code)
    //===========================================================

    getDefaults():
        Observable<EmiAccountsDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    item =>
                    ({
                        AccountSubGroupsId:
                            Number(this.pick(item, 'AccountSubGroupsId') ?? 0),

                        SubGroupCode:
                            String(this.pick(item, 'SubGroupCode') ?? ''),

                        SubGroupName:
                            String(this.pick(item, 'SubGroupName') ?? ''),

                        Code:
                            String(this.pick(item, 'Code') ?? ''),

                        Message:
                            String(this.pick(item, 'Message') ?? '')
                    })
                )
            );
    }


    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateEmiAccounts
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
            UpdateEmiAccounts
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
    // Restore (most recently deleted)
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