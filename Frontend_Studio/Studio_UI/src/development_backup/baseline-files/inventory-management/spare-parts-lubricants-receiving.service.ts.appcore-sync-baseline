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
    SparePartsLubricantsReceiving,

    CreateSparePartsLubricantsReceiving,

    UpdateSparePartsLubricantsReceiving
}
from '../models/spare-parts-lubricants-receiving.model';


//===============================================================
// Spare Parts & Lubricants Receiving Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class SparePartsLubricantsReceivingService
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
        `${environment.apiUrl}/inventory-management/product-receiving/spare-parts-lubricants-receiving`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<SparePartsLubricantsReceiving[]>
    {
        return this.http.get<SparePartsLubricantsReceiving[]>(
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
        Observable<SparePartsLubricantsReceiving>
    {
        return this.http.get<SparePartsLubricantsReceiving>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreateSparePartsLubricantsReceiving
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
            UpdateSparePartsLubricantsReceiving
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