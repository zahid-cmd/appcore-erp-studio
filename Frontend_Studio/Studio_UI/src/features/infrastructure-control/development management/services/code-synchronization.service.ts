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
    HttpClient,
    HttpParams
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
// Code Synchronization File
//===============================================================

export interface CodeSynchronizationFile
{
    fileName:
        string;

    status:
        'Clean' | 'Modified';

    lastModified:
        string | Date | null;
}


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
        synchronizationType:
            string
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
        id:
            number
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
        id:
            number
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
    //
    // Existing synchronization-level rollback.
    //
    // This remains separate from file Restore.
    //
    //===========================================================

    rollback
    (
        id:
            number
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
        id:
            number
    ):
        Observable<CodeSynchronizationFile[]>
    {
        return this.http.get<CodeSynchronizationFile[]>
        (
            `${this.apiUrl}/${id}/files`
        );
    }



    //===========================================================
    // Restore File
    //===========================================================
    //
    // Restores one modified file to the version produced by
    // the last successful synchronization.
    //
    // The API expects fileName as a query parameter.
    //
    // This is NOT synchronization rollback.
    //
    //===========================================================

    restoreFile
    (
        id:
            number,

        fileName:
            string
    ):
        Observable<void>
    {
        const params =
            new HttpParams()
                .set(
                    'fileName',

                    fileName
                );


        return this.http.post<void>
        (
            `${this.apiUrl}/${id}/restore`,

            {},

            {
                params
            }
        );
    }



    //===========================================================
    // Restore All Modified Files
    //===========================================================
    //
    // Restores only files that have been modified after the
    // last successful synchronization.
    //
    // This is NOT synchronization rollback.
    //
    //===========================================================

    restoreAll
    (
        id:
            number
    ):
        Observable<void>
    {
        return this.http.post<void>
        (
            `${this.apiUrl}/${id}/restore-all`,

            {}
        );
    }

}