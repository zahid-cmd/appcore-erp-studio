//===============================================================
// Imports
//===============================================================

import { Injectable, inject } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import
{
    SubmenuSynchronization
}
from '../model/submenu-synchronization.model';


//===============================================================
// Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class SubmenuSynchronizationService
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly http =
        inject(HttpClient);


    private readonly apiUrl =
        `${environment.apiUrl}/infrastructure-control/development-management/submenu-synchronization`;


    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults
    (
        synchronizationType:string
    ):
        Observable<SubmenuSynchronization>
    {
        return this.http.get<SubmenuSynchronization>
        (
            `${this.apiUrl}/defaults?type=${synchronizationType}`
        );
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll
    (
        synchronizationType:string
    ):
        Observable<SubmenuSynchronization[]>
    {
        return this.http.get<SubmenuSynchronization[]>
        (
            `${this.apiUrl}?type=${synchronizationType}`
        );
    }


    //===========================================================
    // Get By Id
    //===========================================================

    getById
    (
        id:number
    ):
        Observable<SubmenuSynchronization>
    {
        return this.http.get<SubmenuSynchronization>
        (
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Analyze
    //===========================================================

    analyze
    (
        moduleId:number,

        menuId:number,

        submenuId:number,

        synchronizationType:string
    ):
        Observable<SubmenuSynchronization>
    {
        return this.http.get<SubmenuSynchronization>
        (
            `${this.apiUrl}/analyze/${moduleId}/${menuId}/${submenuId}?type=${synchronizationType}`
        );
    }


    //===========================================================
    // Get List History
    //===========================================================

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>
        (
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
        return this.http.get<any[]>
        (
            `${this.apiUrl}/${id}/history`
        );
    }


    //===========================================================
    // Create
    //===========================================================

    create
    (
        synchronization:SubmenuSynchronization,

        synchronizationType:string
    ):
        Observable<number>
    {
        return this.http.post<number>
        (
            `${this.apiUrl}?type=${synchronizationType}`,

            synchronization
        );
    }


    //===========================================================
    // Update
    //===========================================================

    update
    (
        synchronization:SubmenuSynchronization
    ):
        Observable<void>
    {
        return this.http.put<void>
        (
            `${this.apiUrl}/${synchronization.id}`,

            synchronization
        );
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
        return this.http.delete<void>
        (
            `${this.apiUrl}/${id}`
        );
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
        return this.http.put<void>
        (
            `${this.apiUrl}/restore?type=${synchronizationType}`,

            {}
        );
    }

}