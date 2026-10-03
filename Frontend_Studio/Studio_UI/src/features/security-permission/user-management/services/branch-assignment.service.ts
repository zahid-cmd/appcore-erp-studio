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
    HttpErrorResponse
}
from '@angular/common/http';


import
{
    Observable,
    catchError,
    throwError
}
from 'rxjs';


import
{
    environment
}
from '../../../../environments/environment';


import
{
    BranchAssignment
}
from '../models/branch-assignment.model';


//===============================================================
// Service
//===============================================================

@Injectable(
{
    providedIn:
        'root'
})


export class BranchAssignmentService
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly http =
        inject(HttpClient);


    private readonly apiUrl =
        `${environment.apiUrl}/security-permission/user-management/branch-assignment`;


    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<BranchAssignment>
    {
        return this.http.get<BranchAssignment>(
            `${this.apiUrl}/defaults`
        );
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<BranchAssignment[]>
    {
        return this.http.get<BranchAssignment[]>(
            this.apiUrl
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
    // Get By Id
    //===========================================================

    getById
    (
        id:
            number
    ):
        Observable<BranchAssignment>
    {
        return this.http.get<BranchAssignment>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Get By User Profile Id
    //===========================================================

    getByUserProfileId
    (
        userProfileId:
            number
    ):
        Observable<BranchAssignment>
    {
        return this.http.get<BranchAssignment>(
            `${this.apiUrl}/user-profile/${userProfileId}`
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


    //===========================================================
    // Create
    //===========================================================

    create
    (
        branchAssignment:
            BranchAssignment
    ):
        Observable<number>
    {
        return this.http.post<number>(
            this.apiUrl,

            branchAssignment
        )
        .pipe(

            catchError(
                (
                    error:
                        HttpErrorResponse
                ) =>
                {
                    //===========================================
                    // Log complete API error
                    //===========================================

                    console.error(
                        'Branch Assignment Create API Error:',
                        error
                    );


                    console.error(
                        'Branch Assignment Create API Error Body:',
                        error.error
                    );


                    //===========================================
                    // Preserve original HttpErrorResponse
                    //===========================================

                    return throwError(
                        () =>
                            error
                    );
                }
            )
        );
    }


    //===========================================================
    // Update
    //===========================================================

    update
    (
        branchAssignment:
            BranchAssignment
    ):
        Observable<void>
    {
        return this.http.put<void>(
            this.apiUrl,

            branchAssignment
        )
        .pipe(

            catchError(
                (
                    error:
                        HttpErrorResponse
                ) =>
                {
                    //===========================================
                    // Log complete API error
                    //===========================================

                    console.error(
                        'Branch Assignment Update API Error:',
                        error
                    );


                    console.error(
                        'Branch Assignment Update API Error Body:',
                        error.error
                    );


                    //===========================================
                    // Preserve original HttpErrorResponse
                    //===========================================

                    return throwError(
                        () =>
                            error
                    );
                }
            )
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
        )
        .pipe(

            catchError(
                (
                    error:
                        HttpErrorResponse
                ) =>
                {
                    console.error(
                        'Branch Assignment Delete API Error:',
                        error
                    );


                    console.error(
                        'Branch Assignment Delete API Error Body:',
                        error.error
                    );


                    return throwError(
                        () =>
                            error
                    );
                }
            )
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
        )
        .pipe(

            catchError(
                (
                    error:
                        HttpErrorResponse
                ) =>
                {
                    console.error(
                        'Branch Assignment Restore API Error:',
                        error
                    );


                    console.error(
                        'Branch Assignment Restore API Error Body:',
                        error.error
                    );


                    return throwError(
                        () =>
                            error
                    );
                }
            )
        );
    }

}