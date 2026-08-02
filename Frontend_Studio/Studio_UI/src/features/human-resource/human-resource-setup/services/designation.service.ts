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
    Designation,
    DesignationDefaults,
    CreateDesignation,
    UpdateDesignation
}
from '../models/designation.model';

//===============================================================
// Designation Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class DesignationService
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
        `${environment.apiUrl}/human-resource/human-resource-setup/designation`;

    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<Designation[]>
    {
        return this.http.get<Designation[]>(
            this.apiUrl
        );
    }

    //===========================================================
    // Get By Id
    //===========================================================

    getById(
        id:number
    ):
        Observable<Designation>
    {
        return this.http.get<Designation>(
            `${this.apiUrl}/${id}`
        );
    }

    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<DesignationDefaults>
    {
        return this.http.get<DesignationDefaults>(
            `${this.apiUrl}/defaults`
        );
    }

    //===========================================================
    // Create
    //===========================================================

    create(
        model:CreateDesignation
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
        model:UpdateDesignation
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
    // Get Designation History
    //===========================================================

    getDesignationHistory(
        id:number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/${id}/history`
        );
    }
}