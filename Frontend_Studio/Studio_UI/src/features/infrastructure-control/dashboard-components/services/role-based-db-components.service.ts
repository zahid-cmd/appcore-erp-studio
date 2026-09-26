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
    RoleBasedDashboardComponents,

    CreateRoleBasedDashboardComponents,

    UpdateRoleBasedDashboardComponents,

    RoleBasedDashboardComponentsDefaults
}
from '../models/role-based-db-components.model';


//===============================================================
// Role-Based Dashboard Components Service
//===============================================================

@Injectable(
{
    providedIn:
        'root'
})


//===============================================================
// Service
//===============================================================

export class RoleBasedDashboardComponentsService
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
        `${environment.apiUrl}/infrastructure-control/dashboard-components/role-based-dashboard-components`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<RoleBasedDashboardComponents[]>
    {
        return this.http.get<RoleBasedDashboardComponents[]>(
            this.apiUrl
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
        Observable<RoleBasedDashboardComponents>
    {
        return this.http.get<RoleBasedDashboardComponents>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<RoleBasedDashboardComponentsDefaults>
    {
        return this.http.get<RoleBasedDashboardComponentsDefaults>(
            `${this.apiUrl}/defaults`
        );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateRoleBasedDashboardComponents
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
            UpdateRoleBasedDashboardComponents
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