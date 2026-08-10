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
    ModuleSynchronization
}
from '../model/module-synchronization.model';


//===============================================================
// Rollback Validation Result
//===============================================================

export interface ModuleSynchronizationRollbackValidation
{
    canRollback:boolean;

    message:string;
}


//===============================================================
// Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class ModuleSynchronizationService
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly http =
        inject(HttpClient);


    private readonly apiUrl =
        `${environment.apiUrl}/infrastructure-control/development-management/module-synchronization`;



    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults
    (
        synchronizationType:string
    ):
        Observable<ModuleSynchronization>
    {
        return this.http.get<ModuleSynchronization>
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
        Observable<ModuleSynchronization[]>
    {
        return this.http.get<ModuleSynchronization[]>
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
        Observable<ModuleSynchronization>
    {
        return this.http.get<ModuleSynchronization>
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

        synchronizationType:string
    ):
        Observable<ModuleSynchronization>
    {
        return this.http.get<ModuleSynchronization>
        (
            `${this.apiUrl}/analyze/${moduleId}?type=${synchronizationType}`
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
        synchronization:ModuleSynchronization,

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
        synchronization:ModuleSynchronization
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
    // Rollback Validation
    //===========================================================
    //
    // Checks whether the Module can be rolled back.
    //
    // This does NOT execute rollback.
    //
    // The backend checks for dependent Menu
    // Synchronization data.
    //
    //===========================================================

    validateRollback
    (
        id:number
    ):
        Observable<ModuleSynchronizationRollbackValidation>
    {
        return this.http.get<ModuleSynchronizationRollbackValidation>
        (
            `${this.apiUrl}/${id}/rollback-validation`
        );
    }



    //===========================================================
    // Rollback
    //===========================================================
    //
    // Executes the actual rollback.
    //
    // Validation is performed before this call.
    //
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