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
    GeneralLedger,
    CreateGeneralLedger,
    UpdateGeneralLedger,
    GeneralLedgerDefaults
}
from '../models/general-ledgers.model';


//===============================================================
// General Ledger Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class GeneralLedgerService
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
        `${environment.apiUrl}/settings/account-settings/general-ledger`;


    //===========================================================
    // Get API Base URL
    //===========================================================

    getApiBaseUrl():
        string
    {
        return environment.apiUrl
            .replace(
                /\/+$/,
                ''
            );
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<GeneralLedger[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        response.map(
                            generalLedger =>
                            ({
                                ...generalLedger,

                                GeneralLedgerId:
                                    Number(
                                        generalLedger.GeneralLedgerId
                                        ??
                                        generalLedger.generalLedgerId
                                        ??
                                        generalLedger.id
                                        ??
                                        generalLedger.Id
                                        ??
                                        0
                                    ),

                                AccountClassId:
                                    Number(
                                        generalLedger.AccountClassId
                                        ??
                                        generalLedger.accountClassId
                                        ??
                                        0
                                    ),

                                AccountClassName:
                                    generalLedger.AccountClassName
                                    ??
                                    generalLedger.accountClassName
                                    ??
                                    '',

                                AccountGroupId:
                                    Number(
                                        generalLedger.AccountGroupId
                                        ??
                                        generalLedger.accountGroupId
                                        ??
                                        0
                                    ),

                                AccountGroupName:
                                    generalLedger.AccountGroupName
                                    ??
                                    generalLedger.accountGroupName
                                    ??
                                    '',

                                AccountSubGroupId:
                                    Number(
                                        generalLedger.AccountSubGroupId
                                        ??
                                        generalLedger.accountSubGroupId
                                        ??
                                        0
                                    ),

                                AccountSubGroupName:
                                    generalLedger.AccountSubGroupName
                                    ??
                                    generalLedger.accountSubGroupName
                                    ??
                                    '',

                                ClassCode:
                                    generalLedger.ClassCode
                                    ??
                                    generalLedger.classCode
                                    ??
                                    '',

                                Mode:
                                    generalLedger.Mode
                                    ??
                                    generalLedger.mode
                                    ??
                                    '',

                                GroupCode:
                                    generalLedger.GroupCode
                                    ??
                                    generalLedger.groupCode
                                    ??
                                    '',

                                SubGroupCode:
                                    generalLedger.SubGroupCode
                                    ??
                                    generalLedger.subGroupCode
                                    ??
                                    '',

                                LedgerCode:
                                    generalLedger.LedgerCode
                                    ??
                                    generalLedger.ledgerCode
                                    ??
                                    '',

                                LedgerName:
                                    generalLedger.LedgerName
                                    ??
                                    generalLedger.ledgerName
                                    ??
                                    '',

                                // TODO: Map General Ledger specific configuration fields here

                                Remarks:
                                    generalLedger.Remarks
                                    ??
                                    generalLedger.remarks
                                    ??
                                    '',

                                IsActive:
                                    Boolean(
                                        generalLedger.IsActive
                                        ??
                                        generalLedger.isActive
                                        ??
                                        true
                                    )
                            })
                        )
                )
            );
    }


    //===========================================================
    // Get Next Code
    //===========================================================

    getNextCode(
        accountSubGroupId:
            number
    ):
        Observable<string>
    {
        return this.http.get(
            `${this.apiUrl}/next-code/${accountSubGroupId}`,
            {
                responseType:'text'
            }
        );
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<GeneralLedgerDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    response =>
                    ({
                        Code:
                            response.code
                            ??
                            response.Code
                            ??
                            ''
                    })
                )
            );
    }


    //===========================================================
    // Get By Id
    //===========================================================

    getById(
        id:
            number
    ):
        Observable<GeneralLedger>
    {
        return this.http.get<GeneralLedger>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create(
        model:
            CreateGeneralLedger
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

    update(
        model:
            UpdateGeneralLedger
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

    delete(
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