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
    LoginComponent3,

    CreateLoginComponent3,

    UpdateLoginComponent3,

    LoginComponent3Defaults
}
from '../models/login-component-3.model';


//===============================================================
// Login Component 3 Service
//===============================================================

@Injectable(
{
    providedIn:
        'root'
})


export class LoginComponent3Service
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
        `${environment.apiUrl}/infrastructure-control/login-components/login-component-3`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<LoginComponent3[]>
    {
        return this.http.get<LoginComponent3[]>(
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
        Observable<LoginComponent3>
    {
        return this.http.get<LoginComponent3>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<LoginComponent3Defaults>
    {
        return this.http.get<LoginComponent3Defaults>(
            `${this.apiUrl}/defaults`
        );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateLoginComponent3
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
            UpdateLoginComponent3
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