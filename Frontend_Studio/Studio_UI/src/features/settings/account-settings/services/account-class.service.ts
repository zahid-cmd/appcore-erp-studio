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
    AccountClass,
    CreateAccountClass,
    UpdateAccountClass,
    AccountClassDefaults
}
from '../models/account-class.model';


//===============================================================
// Account Class Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class AccountClassService
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
        `${environment.apiUrl}/settings/account-settings/account-class`;


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
        Observable<AccountClass[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        response.map(
                            accountClass =>
                            ({
                                ...accountClass,

                                AccountClassId:
                                    Number(
                                        accountClass.AccountClassId
                                        ??
                                        accountClass.accountClassId
                                        ??
                                        accountClass.id
                                        ??
                                        accountClass.Id
                                    ),

                                ClassType:
                                    accountClass.ClassType
                                    ??
                                    accountClass.classType
                                    ??
                                    '',

                                ClassCode:
                                    accountClass.ClassCode
                                    ??
                                    accountClass.classCode
                                    ??
                                    '',

                                ClassName:
                                    accountClass.ClassName
                                    ??
                                    accountClass.className
                                    ??
                                    '',

                                Mode:
                                    accountClass.Mode
                                    ??
                                    accountClass.mode
                                    ??
                                    '',

                                ClassPrefix:
                                    accountClass.ClassPrefix
                                    ??
                                    accountClass.classPrefix
                                    ??
                                    '',

                                AllowManualGroupCreation:
                                    Boolean(
                                        accountClass.AllowManualGroupCreation
                                        ??
                                        accountClass.allowManualGroupCreation
                                        ??
                                        false
                                    ),

                                Remarks:
                                    accountClass.Remarks
                                    ??
                                    accountClass.remarks
                                    ??
                                    '',

                                IsActive:
                                    Boolean(
                                        accountClass.IsActive
                                        ??
                                        accountClass.isActive
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
        classType:
            string,
        classPrefix:
            string
    ):
        Observable<string>
    {
        return this.http.get(
            `${this.apiUrl}/next-code`,
            {
                params:
                {
                    classType,
                    classPrefix
                },

                responseType:'text'
            }
        );
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<AccountClassDefaults>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`
            )
            .pipe(
                map(
                    response =>
                    ({
                        ClassPrefix:
                            response?.classPrefix
                            ??
                            response?.ClassPrefix
                            ??
                            '',

                        Code:
                            response?.code
                            ??
                            response?.Code
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
        Observable<AccountClass>
    {
        return this.http.get<AccountClass>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create(
        model:
            CreateAccountClass
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
            UpdateAccountClass
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
                            accountClass =>
                            ({
                                ...accountClass,

                                AccountClassId:
                                    Number(
                                        accountClass.AccountClassId
                                        ??
                                        accountClass.accountClassId
                                        ??
                                        accountClass.id
                                        ??
                                        accountClass.Id
                                    ),

                                ClassType:
                                    accountClass.ClassType
                                    ??
                                    accountClass.classType
                                    ??
                                    '',

                                ClassCode:
                                    accountClass.ClassCode
                                    ??
                                    accountClass.classCode
                                    ??
                                    '',

                                ClassName:
                                    accountClass.ClassName
                                    ??
                                    accountClass.className
                                    ??
                                    '',

                                Mode:
                                    accountClass.Mode
                                    ??
                                    accountClass.mode
                                    ??
                                    '',

                                ClassPrefix:
                                    accountClass.ClassPrefix
                                    ??
                                    accountClass.classPrefix
                                    ??
                                    '',

                                AllowManualGroupCreation:
                                    Boolean(
                                        accountClass.AllowManualGroupCreation
                                        ??
                                        accountClass.allowManualGroupCreation
                                        ??
                                        false
                                    ),

                                Remarks:
                                    accountClass.Remarks
                                    ??
                                    accountClass.remarks
                                    ??
                                    '',

                                IsActive:
                                    Boolean(
                                        accountClass.IsActive
                                        ??
                                        accountClass.isActive
                                        ??
                                        true
                                    )
                            })
                        )[0])
                )
            );
    }
}
