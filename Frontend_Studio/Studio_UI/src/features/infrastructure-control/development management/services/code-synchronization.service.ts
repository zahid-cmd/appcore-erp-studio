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
// Backend Database Result
//===============================================================

export interface BackendDatabaseResult
{
    success:
        boolean;

    message:
        string;

    totalOperations?:
        number;

    successfulOperations?:
        number;

    failedOperations?:
        number;

    created?:
        boolean;

    removed?:
        boolean;

    migrationName?:
        string;
}


//===============================================================
// Service
//===============================================================

@Injectable(
{
    providedIn:
        'root'
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


    private readonly frontendRebuildUrl =
        `${environment.apiUrl}/infrastructure-control/rebuild-engine/frontend`;


    private readonly backendRebuildUrl =
        `${environment.apiUrl}/infrastructure-control/development-management/backend-rebuild`;


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
        const params =
            new HttpParams()
                .set(
                    'type',

                    synchronizationType
                );


        return this.http.get<CodeSynchronization[]>
        (
            this.apiUrl,

            {
                params
            }
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
    // Backend Registration
    //===========================================================

    register
    (
        id:
            number
    ):
        Observable<void>
    {
        return this.http.post<void>
        (
            `${this.apiUrl}/${id}/register`,

            {}
        );
    }


    //===========================================================
    // Backend Registration Rollback
    //===========================================================

    rollbackRegistration
    (
        id:
            number
    ):
        Observable<void>
    {
        return this.http.post<void>
        (
            `${this.apiUrl}/${id}/register/rollback`,

            {}
        );
    }


    //===========================================================
    // Backend Database Create
    //===========================================================

    createDatabase
    (
        id:
            number
    ):
        Observable<BackendDatabaseResult>
    {
        return this.http.post<BackendDatabaseResult>
        (
            `${this.apiUrl}/${id}/database`,

            {}
        );
    }


    //===========================================================
    // Backend Database Remove
    //===========================================================

    removeDatabase
    (
        id:
            number
    ):
        Observable<BackendDatabaseResult>
    {
        return this.http.post<BackendDatabaseResult>
        (
            `${this.apiUrl}/${id}/database/rollback`,

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


    //===========================================================
    // Frontend Rebuild
    //===========================================================

    rebuildFrontend():
        Observable<void>
    {
        return this.http.post<void>
        (
            `${this.frontendRebuildUrl}/rebuild`,

            {}
        );
    }


    //===========================================================
    // Backend Rebuild
    //===========================================================

    rebuildBackend():
        Observable<void>
    {
        return this.http.post<void>
        (
            `${this.backendRebuildUrl}/rebuild`,

            {}
        );
    }

}