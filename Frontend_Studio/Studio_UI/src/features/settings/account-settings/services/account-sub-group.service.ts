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
    AccountSubGroup,
    CreateAccountSubGroup,
    UpdateAccountSubGroup,
    AccountSubGroupDefaults
}
from '../models/account-sub-group.model';


//===============================================================
// Account Sub Group Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class AccountSubGroupService
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
        `${environment.apiUrl}/settings/account-settings/account-sub-group`;


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
        Observable<AccountSubGroup[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        response.map(
                            accountSubGroup =>
                            ({
                                ...accountSubGroup,

                                AccountSubGroupId:
                                    Number(
                                        accountSubGroup.AccountSubGroupId
                                        ??
                                        accountSubGroup.accountSubGroupId
                                        ??
                                        accountSubGroup.id
                                        ??
                                        accountSubGroup.Id
                                        ??
                                        0
                                    ),

                                AccountClassId:
                                    Number(
                                        accountSubGroup.AccountClassId
                                        ??
                                        accountSubGroup.accountClassId
                                        ??
                                        0
                                    ),

                                AccountClassName:
                                    accountSubGroup.AccountClassName
                                    ??
                                    accountSubGroup.accountClassName
                                    ??
                                    '',

                                AccountGroupId:
                                    Number(
                                        accountSubGroup.AccountGroupId
                                        ??
                                        accountSubGroup.accountGroupId
                                        ??
                                        0
                                    ),

                                AccountGroupName:
                                    accountSubGroup.AccountGroupName
                                    ??
                                    accountSubGroup.accountGroupName
                                    ??
                                    '',

                                ClassCode:
                                    accountSubGroup.ClassCode
                                    ??
                                    accountSubGroup.classCode
                                    ??
                                    '',

                                Mode:
                                    accountSubGroup.Mode
                                    ??
                                    accountSubGroup.mode
                                    ??
                                    '',

                                GroupCode:
                                    accountSubGroup.GroupCode
                                    ??
                                    accountSubGroup.groupCode
                                    ??
                                    '',

                                SubGroupCode:
                                    accountSubGroup.SubGroupCode
                                    ??
                                    accountSubGroup.subGroupCode
                                    ??
                                    '',

                                SubGroupName:
                                    accountSubGroup.SubGroupName
                                    ??
                                    accountSubGroup.subGroupName
                                    ??
                                    '',

                                AllowManualLedger:
                                    Boolean(
                                        accountSubGroup.AllowManualLedger
                                        ??
                                        accountSubGroup.allowManualLedger
                                        ??
                                        false
                                    ),

                                Remarks:
                                    accountSubGroup.Remarks
                                    ??
                                    accountSubGroup.remarks
                                    ??
                                    '',

                                IsActive:
                                    Boolean(
                                        accountSubGroup.IsActive
                                        ??
                                        accountSubGroup.isActive
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
        accountGroupId:
            number
    ):
        Observable<string>
    {
        return this.http.get(
            `${this.apiUrl}/next-code/${accountGroupId}`,
            {
                responseType:'text'
            }
        );
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<AccountSubGroupDefaults>
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
        Observable<AccountSubGroup>
    {
        return this.http.get<AccountSubGroup>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create(
        model:
            CreateAccountSubGroup
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
            UpdateAccountSubGroup
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