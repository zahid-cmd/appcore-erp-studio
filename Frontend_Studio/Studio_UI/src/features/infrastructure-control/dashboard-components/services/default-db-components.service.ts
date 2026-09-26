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
    DefaultDashboardComponents,

    CreateDefaultDashboardComponents,

    UpdateDefaultDashboardComponents,

    DefaultDashboardComponentsDefaults
}
from '../models/default-db-components.model';


//===============================================================
// Default Dashboard Components Service
//===============================================================

@Injectable(
{
    providedIn:
        'root'
})


//===============================================================
// Service
//===============================================================

export class DefaultDashboardComponentsService
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
        `${environment.apiUrl}/infrastructure-control/dashboard-components/default-dashboard-components`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<DefaultDashboardComponents[]>
    {
        return this.http.get<DefaultDashboardComponents[]>(
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
        Observable<DefaultDashboardComponents>
    {
        return this.http.get<DefaultDashboardComponents>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<DefaultDashboardComponentsDefaults>
    {
        return this.http.get<DefaultDashboardComponentsDefaults>(
            `${this.apiUrl}/defaults`
        );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateDefaultDashboardComponents
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
            UpdateDefaultDashboardComponents
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