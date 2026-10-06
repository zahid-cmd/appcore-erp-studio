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
    AccountGroup,
    CreateAccountGroup,
    UpdateAccountGroup,
    AccountGroupDefaults
}
from '../models/account-group.model';


//===============================================================
// Account Group Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class AccountGroupService
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
        `${environment.apiUrl}/settings/account-settings/account-group`;


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
        Observable<AccountGroup[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        response.map(
                            accountGroup =>
                            ({
                                ...accountGroup,

                                AccountGroupId:
                                    Number(
                                        accountGroup.AccountGroupId
                                        ??
                                        accountGroup.accountGroupId
                                        ??
                                        accountGroup.id
                                        ??
                                        accountGroup.Id
                                    ),

                                AccountClassId:
                                    Number(
                                        accountGroup.AccountClassId
                                        ??
                                        accountGroup.accountClassId
                                        ??
                                        0
                                    ),

                                AccountClassName:
                                    accountGroup.AccountClassName
                                    ??
                                    accountGroup.accountClassName
                                    ??
                                    '',

                                ClassCode:
                                    accountGroup.ClassCode
                                    ??
                                    accountGroup.classCode
                                    ??
                                    '',

                                Mode:
                                    accountGroup.Mode
                                    ??
                                    accountGroup.mode
                                    ??
                                    '',

                                GroupCode:
                                    accountGroup.GroupCode
                                    ??
                                    accountGroup.groupCode
                                    ??
                                    '',

                                GroupName:
                                    accountGroup.GroupName
                                    ??
                                    accountGroup.groupName
                                    ??
                                    '',

                                AllowManualSubGroup:
                                    Boolean(
                                        accountGroup.AllowManualSubGroup
                                        ??
                                        accountGroup.allowManualSubGroup
                                        ??
                                        false
                                    ),

                                Remarks:
                                    accountGroup.Remarks
                                    ??
                                    accountGroup.remarks
                                    ??
                                    '',

                                IsActive:
                                    Boolean(
                                        accountGroup.IsActive
                                        ??
                                        accountGroup.isActive
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
        accountClassId:
            number
    ):
        Observable<string>
    {
        return this.http.get(
            `${this.apiUrl}/next-code/${accountClassId}`,
            {
                responseType:'text'
            }
        );
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<AccountGroupDefaults>
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
        Observable<AccountGroup>
    {
        return this.http.get<AccountGroup>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create(
        model:
            CreateAccountGroup
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
            UpdateAccountGroup
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