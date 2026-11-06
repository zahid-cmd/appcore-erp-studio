//===============================================================
// Imports
//===============================================================

import { Injectable, inject } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import
{
    MenuSynchronization
}
from '../model/menu-synchronization.model';


//===============================================================
// Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class MenuSynchronizationService
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly http =
        inject(HttpClient);


    private readonly apiUrl =
        `${environment.apiUrl}/infrastructure-control/development-management/menu-synchronization`;



    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults
    (
        synchronizationType:string
    ):
        Observable<MenuSynchronization>
    {
        return this.http.get<MenuSynchronization>(
            `${this.apiUrl}/defaults?type=${synchronizationType}`);
    }



    //===========================================================
    // Get All
    //===========================================================

    getAll
    (
        synchronizationType:string
    ):
        Observable<MenuSynchronization[]>
    {
        return this.http.get<MenuSynchronization[]>(
            `${this.apiUrl}?type=${synchronizationType}`);
    }



    //===========================================================
    // Get By Id
    //===========================================================

    getById
    (
        id:number
    ):
        Observable<MenuSynchronization>
    {
        return this.http.get<MenuSynchronization>(
            `${this.apiUrl}/${id}`);
    }



    //===========================================================
    // Analyze
    //===========================================================

    analyze
    (
        moduleId:number,

        menuId:number,

        synchronizationType:string
    ):
        Observable<MenuSynchronization>
    {
        return this.http.get<MenuSynchronization>(
            `${this.apiUrl}/analyze/${moduleId}/${menuId}?type=${synchronizationType}`
        );
    }



    //===========================================================
    // Get List History
    //===========================================================

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`);
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
            `${this.apiUrl}/${id}/history`);
    }



    //===========================================================
    // Create
    //===========================================================

    create
    (
        synchronization:MenuSynchronization,

        synchronizationType:string
    ):
        Observable<number>
    {
        return this.http.post<number>(
            `${this.apiUrl}?type=${synchronizationType}`,
            synchronization);
    }



    //===========================================================
    // Update
    //===========================================================

    update
    (
        synchronization:MenuSynchronization
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/${synchronization.id}`,
            synchronization);
    }



    //===========================================================
    // Synchronize
    //===========================================================

    synchronize
    (
        id:number
    ):
        Observable<void>
    {
        return this.http.post<void>
        (
            `${this.apiUrl}/${id}/sync`,
            {}
        );
    }



    //===========================================================
    // Rollback Validation
    //===========================================================

    validateRollback
    (
        id:number
    ):
        Observable<MenuSynchronizationRollbackValidation>
    {
        return this.http.get<MenuSynchronizationRollbackValidation>
        (
            `${this.apiUrl}/${id}/rollback-validation`
        );
    }



    //===========================================================
    // Rollback
    //===========================================================

    rollback
    (
        id:number
    ):
        Observable<void>
    {
        return this.http.post<void>
        (
            `${this.apiUrl}/${id}/rollback`,
            {}
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
            `${this.apiUrl}/${id}`);
    }



    //===========================================================
    // Restore
    //===========================================================

    restore
    (
        synchronizationType:string
    ):
        Observable<void>
    {
        return this.http.put<void>(
            `${this.apiUrl}/restore?type=${synchronizationType}`,
            {}
        );
    }
}


//===============================================================
// Rollback Validation Result
//===============================================================

export interface MenuSynchronizationRollbackValidation
{
    canRollback:boolean;

    message:string;
}