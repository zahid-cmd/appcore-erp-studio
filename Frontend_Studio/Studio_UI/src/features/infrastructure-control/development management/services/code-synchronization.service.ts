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
    CodeSynchronization
}
from '../model/code-synchronization.model';


//===============================================================
// Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class CodeSynchronizationService
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly http =
        inject(HttpClient);


    private readonly apiUrl =
        `${environment.apiUrl}/infrastructure-control/development-management/code-synchronization`;



    //===========================================================
    // Get All
    //===========================================================

    getAll
    (
        synchronizationType:string
    ):
        Observable<CodeSynchronization[]>
    {
        return this.http.get<CodeSynchronization[]>
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
        Observable<CodeSynchronization>
    {
        return this.http.get<CodeSynchronization>
        (
            `${this.apiUrl}/${id}`
        );
    }



    //===========================================================
    // Get History
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
    // Synchronize Code
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
    // Rollback Code Synchronization
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
    // Get Generated Files
    //===========================================================

    getFiles
    (
        id:number
    ):
        Observable<any[]>
    {
        return this.http.get<any[]>
        (
            `${this.apiUrl}/${id}/files`
        );
    }

}