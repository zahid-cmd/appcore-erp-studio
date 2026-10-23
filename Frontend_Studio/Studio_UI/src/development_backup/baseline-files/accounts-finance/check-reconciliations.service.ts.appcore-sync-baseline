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
    CheckReconciliations,

    CreateCheckReconciliations,

    UpdateCheckReconciliations
}
from '../models/check-reconciliations.model';


//===============================================================
// Check Reconciliations Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class CheckReconciliationsService
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
        `${environment.apiUrl}/accounts-finance/accounts-reconciliation/check-reconciliations`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<CheckReconciliations[]>
    {
        return this.http.get<CheckReconciliations[]>(
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
        Observable<CheckReconciliations>
    {
        return this.http.get<CheckReconciliations>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateCheckReconciliations
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
            UpdateCheckReconciliations
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