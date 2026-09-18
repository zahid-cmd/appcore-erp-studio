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
    SpecialAssignment
}
from '../models/special-assignment.model';


//===============================================================
// Save Payload
//===============================================================

interface SpecialAssignmentSavePayload
{
    specialAssignmentId?: number;

    userProfileId: number;

    isActive: boolean;

    details:
        SpecialAssignmentSaveDetail[];
}


interface SpecialAssignmentSaveDetail
{
    specialAssignmentDetailId?: number;

    specialAssignmentId?: number;

    moduleId: number;

    menuId: number;

    subMenuId: number;

    isActive: boolean;

    permissions:
        SpecialAssignmentSavePermission[];
}


interface SpecialAssignmentSavePermission
{
    specialAssignmentPermissionId?: number;

    masterActivityId: number | null;

    navigationActivityId: number | null;

    isActive: boolean;
}


//===============================================================
// Service
//===============================================================

@Injectable(
{
    providedIn:
        'root'
})


export class SpecialAssignmentService
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly http =
        inject(HttpClient);


    private readonly apiUrl =
        `${environment.apiUrl}/security-permission/user-management/special-assignment`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<SpecialAssignment[]>
    {
        return this.http.get<SpecialAssignment[]>(
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
        Observable<SpecialAssignment>
    {
        return this.http.get<SpecialAssignment>(
            `${this.apiUrl}/${id}`
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
        specialAssignment:
            SpecialAssignmentSavePayload
    ):
        Observable<number>
    {
        return this.http.post<number>(
            this.apiUrl,

            specialAssignment
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
                        'Special Assignment Create API Error:',
                        error
                    );


                    console.error(
                        'Special Assignment Create API Error Body:',
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
        specialAssignment:
            SpecialAssignmentSavePayload
    ):
        Observable<void>
    {
        if
        (
            specialAssignment.specialAssignmentId == null
            ||
            specialAssignment.specialAssignmentId <= 0
        )
        {
            return throwError(
                () =>
                    new Error(
                        'Special Assignment ID is required for update.'
                    )
            );
        }


        return this.http.put<void>(
            `${this.apiUrl}/${specialAssignment.specialAssignmentId}`,

            specialAssignment
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
                        'Special Assignment Update API Error:',
                        error
                    );


                    console.error(
                        'Special Assignment Update API Error Body:',
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
                        'Special Assignment Delete API Error:',
                        error
                    );


                    console.error(
                        'Special Assignment Delete API Error Body:',
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
    // Restore Last Deleted
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
                        'Special Assignment Restore API Error:',
                        error
                    );


                    console.error(
                        'Special Assignment Restore API Error Body:',
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