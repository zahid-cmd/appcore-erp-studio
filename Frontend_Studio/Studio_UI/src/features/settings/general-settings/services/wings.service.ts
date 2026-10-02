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
    Wing,
    CreateWing,
    UpdateWing
}
from '../models/wings.model';


//===============================================================
// Wing Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class WingsService
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
        `${environment.apiUrl}/settings/general-settings/wings`;


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
        Observable<Wing[]>
    {
        return this.http

            .get<any[]>(
                this.apiUrl
            )

            .pipe(

                map(

                    response =>

                        response.map(

                            wing =>

                            ({
                                ...wing,

                                WingId:
                                    Number
                                    (
                                        wing.WingId
                                        ??
                                        wing.wingId
                                        ??
                                        wing.id
                                        ??
                                        wing.Id
                                    ),

                                CompanyId:
                                    Number
                                    (
                                        wing.CompanyId
                                        ??
                                        wing.companyId
                                        ??
                                        0
                                    ),

                                WingCode:
                                    wing.WingCode
                                    ??
                                    wing.wingCode
                                    ??
                                    '',

                                WingName:
                                    wing.WingName
                                    ??
                                    wing.wingName
                                    ??
                                    '',

                                Remarks:
                                    wing.Remarks
                                    ??
                                    wing.remarks
                                    ??
                                    '',

                                IsActive:
                                    Boolean
                                    (
                                        wing.IsActive
                                        ??
                                        wing.isActive
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

    getNextCode
    (
        companyId:
            number
    ):
        Observable<string>
    {
        return this.http.get(
            `${this.apiUrl}/next-code`,
            {
                params:
                {
                    companyId:
                        companyId
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
        Observable<Wing>
    {
        return this.http.get<Wing>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateWing
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
            UpdateWing
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