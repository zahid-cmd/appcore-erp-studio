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
    toPagedParams,
    toPagedResult
}
from '../../../../shared/paging/paged-result.model';

import
{
    GeneralLedger,
    CreateGeneralLedger,
    UpdateGeneralLedger,
    GeneralLedgerDefaults,
    GeneralLedgerPageQuery,
    GeneralLedgerPage
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
    // Get Paged (the list page : one page, server side)
    //
    // Rows come back raw; the list page normalizes them.
    //===========================================================

    getPaged
    (
        query:
            GeneralLedgerPageQuery
    ):
        Observable<GeneralLedgerPage>
    {
        const ids =
            (raw: any, name: string): number[] =>
            {
                const value =
                    raw?.[name]
                    ??
                    raw?.[name.charAt(0).toLowerCase() + name.slice(1)];

                return Array.isArray(value)
                    ? value.map((x: any) => Number(x))
                    : [];
            };

        return this.http
            .get<any>(
                `${this.apiUrl}/paged`,
                {
                    params:
                        toPagedParams(
                            query as unknown as Record<string, unknown>
                        )
                }
            )
            .pipe(
                map(
                    raw =>
                    ({
                        result:
                            toPagedResult(
                                raw,
                                (item: any) => item
                            ),

                        classIds:
                            ids(raw, 'ClassIds'),

                        groupIds:
                            ids(raw, 'GroupIds'),

                        subGroupIds:
                            ids(raw, 'SubGroupIds')
                    })
                )
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
            string
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

    update(
        publicId:
            string,

        model:
            UpdateGeneralLedger
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

    delete(
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