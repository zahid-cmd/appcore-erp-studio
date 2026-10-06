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
            string
    ):
        Observable<string>
    {
        return this.http.get(
            `${this.apiUrl}/next-code/${encodeURIComponent(classType)}`,
            {
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
            UpdateAccountClass
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