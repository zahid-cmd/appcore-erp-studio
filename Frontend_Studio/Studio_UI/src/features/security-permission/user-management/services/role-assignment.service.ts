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
    RoleAssignment
}
from '../models/role-assignment.model';


//===============================================================
// Service
//===============================================================

@Injectable(
{
    providedIn:
        'root'
})


export class RoleAssignmentService
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly http =
        inject(HttpClient);


    private readonly apiUrl =
        `${environment.apiUrl}/security-permission/user-management/role-assignment`;


    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<RoleAssignment>
    {
        return this.http.get<RoleAssignment>(
            `${this.apiUrl}/defaults`
        );
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<RoleAssignment[]>
    {
        return this.http.get<RoleAssignment[]>(
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
        Observable<RoleAssignment>
    {
        return this.http.get<RoleAssignment>(
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
        Observable<RoleAssignment>
    {
        return this.http.get<RoleAssignment>(
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
        roleAssignment:
            RoleAssignment
    ):
        Observable<number>
    {
        return this.http.post<number>(
            this.apiUrl,

            roleAssignment
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
                        'Role Assignment Create API Error:',
                        error
                    );


                    console.error(
                        'Role Assignment Create API Error Body:',
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
        roleAssignment:
            RoleAssignment
    ):
        Observable<void>
    {
        return this.http.put<void>(
            this.apiUrl,

            roleAssignment
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
                        'Role Assignment Update API Error:',
                        error
                    );


                    console.error(
                        'Role Assignment Update API Error Body:',
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
                        'Role Assignment Delete API Error:',
                        error
                    );


                    console.error(
                        'Role Assignment Delete API Error Body:',
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
                        'Role Assignment Restore API Error:',
                        error
                    );


                    console.error(
                        'Role Assignment Restore API Error Body:',
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