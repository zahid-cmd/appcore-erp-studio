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
    Company,

    CreateCompany,

    UpdateCompany
}
from '../models/company.model';


//===============================================================
// Company Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class CompanyService
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
        `${environment.apiUrl}/settings/general-settings/company`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<Company[]>
    {
        return this.http.get<Company[]>(
            this.apiUrl
        );
    }



    //===========================================================
    // Get By Id
    //===========================================================

    getById
    (
        id:number
    ):
        Observable<Company>
    {
        return this.http.get<Company>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:CreateCompany
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
        model:UpdateCompany
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
        id:number
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
        id:number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${id}/history`
        );
    }

}