// PAGE-CLONED : Wings -> Bank Setup
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
    BankSetup,
    CreateBankSetup,
    UpdateBankSetup
}
from '../models/bank-setup.model';


//===============================================================
// BankSetup Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class BankSetupService
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
        `${environment.apiUrl}/settings/account-settings/bank-setup`;


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
        Observable<BankSetup[]>
    {
        return this.http

            .get<any[]>(
                this.apiUrl
            )

            .pipe(

                map(

                    response =>

                        response.map(

                            bankSetup =>

                            ({
                                ...bankSetup,

                                BankSetupId:
                                    Number(bankSetup.BankSetupId ?? bankSetup.bankSetupId ?? bankSetup.id ?? bankSetup.Id),

                                BankCode:
                                    bankSetup.BankCode ?? bankSetup.bankCode ?? '',

                                BankName:
                                    bankSetup.BankName ?? bankSetup.bankName ?? '',

                                Remarks:
                                    bankSetup.Remarks ?? bankSetup.remarks ?? '',

                                Status:
                                    Boolean(bankSetup.Status ?? bankSetup.status ?? true),

                                ShortName:
                                    bankSetup.ShortName ?? bankSetup.shortName ?? ''
                            })

                        )

                )

            );
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    getNextCode():
        Observable<string>
    {
        return this.http.get(
            `${this.apiUrl}/next-code`,
            {
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
        Observable<BankSetup>
    {
        return this.http.get<BankSetup>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateBankSetup
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
            UpdateBankSetup
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