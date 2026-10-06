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
    Department,
    CreateDepartment,
    UpdateDepartment,
    DepartmentDefaults
}
from '../models/department.model';


//===============================================================
// Department Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class DepartmentService
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
        `${environment.apiUrl}/human-resource-manangement/human-resource-setup/department`;


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
        Observable<Department[]>
    {
        return this.http
            .get<any[]>(
                this.apiUrl
            )
            .pipe(
                map(
                    response =>
                        response.map(
                            department =>
                            ({
                                ...department,

                                DepartmentId:
                                    Number(
                                        department.DepartmentId
                                        ??
                                        department.departmentId
                                        ??
                                        department.id
                                        ??
                                        department.Id
                                    ),

                                DepartmentCode:
                                    department.DepartmentCode
                                    ??
                                    department.departmentCode
                                    ??
                                    '',

                                DepartmentName:
                                    department.DepartmentName
                                    ??
                                    department.departmentName
                                    ??
                                    '',

                                DepartmentShortName:
                                    department.DepartmentShortName
                                    ??
                                    department.departmentShortName
                                    ??
                                    '',

                                Remarks:
                                    department.Remarks
                                    ??
                                    department.remarks
                                    ??
                                    '',

                                IsActive:
                                    Boolean(
                                        department.IsActive
                                        ??
                                        department.isActive
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
        Observable<DepartmentDefaults>
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
        Observable<Department>
    {
        return this.http.get<Department>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create(
        model:
            CreateDepartment
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
            UpdateDepartment
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