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
    Observable
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
    DepartmentDefaults,
    CreateDepartment,
    UpdateDepartment
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
        `${environment.apiUrl}/human-resource/human-resource-setup/department`;

    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<Department[]>
    {
        return this.http.get<Department[]>(
            this.apiUrl
        );
    }

    //===========================================================
    // Get By Id
    //===========================================================

    getById(
        id:number
    ):
        Observable<Department>
    {
        return this.http.get<Department>(
            `${this.apiUrl}/${id}`
        );
    }

    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<DepartmentDefaults>
    {
        return this.http.get<DepartmentDefaults>(
            `${this.apiUrl}/defaults`
        );
    }

    //===========================================================
    // Create
    //===========================================================

    create(
        model:CreateDepartment
    ):
        Observable<void>
    {
        return this.http.post<void>(
            this.apiUrl,
            model
        );
    }

    //===========================================================
    // Update
    //===========================================================

    update(
        model:UpdateDepartment
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${model.id}`,
            model
        );
    }

    //===========================================================
    // Delete
    //===========================================================

    delete(
        id:number
    ):
        Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/${id}`
        );
    }

    //===========================================================
    // Get List History
    //===========================================================

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`
        );
    }

    //===========================================================
    // Get Department History
    //===========================================================

    getDepartmentHistory(
        id:number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${id}/history`
        );
    }
}