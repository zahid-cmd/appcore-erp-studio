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
    CoreComponents,

    CreateCoreComponents,

    UpdateCoreComponents,

    CoreComponentsDefaults
}
from '../models/core-components.model';


//===============================================================
// Core Components Service
//===============================================================

@Injectable(
{
    providedIn:
        'root'
})


//===============================================================
// Service
//===============================================================

export class CoreComponentsService
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
        `${environment.apiUrl}/infrastructure-control/login-components/core-components`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<CoreComponents[]>
    {
        return this.http.get<CoreComponents[]>(
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
        Observable<CoreComponents>
    {
        return this.http.get<CoreComponents>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<CoreComponentsDefaults>
    {
        return this.http.get<CoreComponentsDefaults>(
            `${this.apiUrl}/defaults`
        );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateCoreComponents
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
            UpdateCoreComponents
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