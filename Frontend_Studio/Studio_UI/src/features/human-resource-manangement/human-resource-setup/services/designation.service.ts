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
    Designation,
    CreateDesignation,
    UpdateDesignation,
    DesignationDefaults
}
from '../models/designation.model';


//===============================================================
// Designation Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class DesignationService
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
        `${environment.apiUrl}/human-resource-manangement/human-resource-setup/designation`;


    //===========================================================
    // Get API Base URL
    //===========================================================

    getApiBaseUrl():
        string
    {
        return environment.apiUrl
            .replace(
                /\/$/,
                ''
            );
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<Designation[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        response.map(
                            designation =>
                            ({
                                ...designation,

                                DesignationId:
                                    Number(
                                        designation.DesignationId
                                        ??
                                        designation.designationId
                                        ??
                                        designation.id
                                        ??
                                        designation.Id
                                    ),

                                DesignationCode:
                                    designation.DesignationCode
                                    ??
                                    designation.designationCode
                                    ??
                                    '',

                                DesignationName:
                                    designation.DesignationName
                                    ??
                                    designation.designationName
                                    ??
                                    '',

                                DesignationShortName:
                                    designation.DesignationShortName
                                    ??
                                    designation.designationShortName
                                    ??
                                    '',

                                Remarks:
                                    designation.Remarks
                                    ??
                                    designation.remarks
                                    ??
                                    '',

                                IsActive:
                                    Boolean(
                                        designation.IsActive
                                        ??
                                        designation.isActive
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

    getNextCode():
        Observable<string>
    {
        return this.http.get<string>(
            `${this.apiUrl}/next-code`
        );
    }


    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<DesignationDefaults>
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
        Observable<Designation>
    {
        return this.http.get<Designation>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create(
        model:
            CreateDesignation
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
            UpdateDesignation
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
}