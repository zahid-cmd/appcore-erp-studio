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
    PurchaseAdjustmentsMb,

    CreatePurchaseAdjustmentsMb,

    UpdatePurchaseAdjustmentsMb
}
from '../models/purchase-adjustments-mb.model';


//===============================================================
// Purchase Adjustments - MB Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})


export class PurchaseAdjustmentsMbService
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
        `${environment.apiUrl}/procurement/motor-bike-purchase/purchase-adjustments-mb`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<PurchaseAdjustmentsMb[]>
    {
        return this.http.get<PurchaseAdjustmentsMb[]>(
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
        Observable<PurchaseAdjustmentsMb>
    {
        return this.http.get<PurchaseAdjustmentsMb>(
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:
            CreatePurchaseAdjustmentsMb
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
            UpdatePurchaseAdjustmentsMb
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