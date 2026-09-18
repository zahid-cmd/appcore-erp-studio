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
    ActivityAssignment
}
from '../models/activity-assignment.model';


//===============================================================
// Service
//===============================================================

@Injectable(
{
    providedIn:
        'root'
})


export class ActivityAssignmentService
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly http =
        inject(HttpClient);


    private readonly apiUrl =
        `${environment.apiUrl}/security-permission/role-management/activity-assignment`;


    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<ActivityAssignment>
    {
        return this.http.get<ActivityAssignment>(
            `${this.apiUrl}/defaults`
        );
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<ActivityAssignment[]>
    {
        return this.http.get<ActivityAssignment[]>(
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
        Observable<ActivityAssignment>
    {
        return this.http.get<ActivityAssignment>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Get By Role Profile Id
    //===========================================================

    getByRoleProfileId
    (
        roleProfileId:
            number
    ):
        Observable<ActivityAssignment>
    {
        return this.http.get<ActivityAssignment>(
            `${this.apiUrl}/role-profile/${roleProfileId}`
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
        activityAssignment:
            ActivityAssignment
    ):
        Observable<number>
    {
        return this.http.post<number>(
            this.apiUrl,

            activityAssignment
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
                        'Activity Assignment Create API Error:',
                        error
                    );


                    console.error(
                        'Activity Assignment Create API Error Body:',
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
        activityAssignment:
            ActivityAssignment
    ):
        Observable<void>
    {
        return this.http.put<void>(
            this.apiUrl,

            activityAssignment
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
                        'Activity Assignment Update API Error:',
                        error
                    );


                    console.error(
                        'Activity Assignment Update API Error Body:',
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
                        'Activity Assignment Delete API Error:',
                        error
                    );


                    console.error(
                        'Activity Assignment Delete API Error Body:',
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
                        'Activity Assignment Restore API Error:',
                        error
                    );


                    console.error(
                        'Activity Assignment Restore API Error Body:',
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