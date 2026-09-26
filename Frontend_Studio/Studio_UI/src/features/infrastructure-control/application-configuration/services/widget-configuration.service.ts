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
    WidgetConfiguration
}
from '../models/widget-configuration.model';


//===============================================================
// Service
//===============================================================

@Injectable(
{
    providedIn:
        'root'
})


export class WidgetConfigurationService
{

    //===========================================================
    // Fields
    //===========================================================

    private readonly http =
        inject(HttpClient);


    private readonly apiUrl =
        `${environment.apiUrl}/infrastructure-control/application-configuration/widget-configuration`;


    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<WidgetConfiguration>
    {
        return this.http.get<WidgetConfiguration>(
            `${this.apiUrl}/defaults`
        );
    }


    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<WidgetConfiguration[]>
    {
        return this.http.get<WidgetConfiguration[]>(
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
        Observable<WidgetConfiguration>
    {
        return this.http.get<WidgetConfiguration>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Get By Dashboard Id
    //===========================================================

    getByDashboardId
    (
        dashboardId:
            number
    ):
        Observable<WidgetConfiguration>
    {
        return this.http.get<WidgetConfiguration>(
            `${this.apiUrl}/dashboard/${dashboardId}`
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
        widgetConfiguration:
            WidgetConfiguration
    ):
        Observable<number>
    {
        return this.http.post<number>(
            this.apiUrl,

            widgetConfiguration
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
                        'Widget Configuration Create API Error:',
                        error
                    );


                    console.error(
                        'Widget Configuration Create API Error Body:',
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
        widgetConfiguration:
            WidgetConfiguration
    ):
        Observable<void>
    {
        return this.http.put<void>(
            this.apiUrl,

            widgetConfiguration
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
                        'Widget Configuration Update API Error:',
                        error
                    );


                    console.error(
                        'Widget Configuration Update API Error Body:',
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
                        'Widget Configuration Delete API Error:',
                        error
                    );


                    console.error(
                        'Widget Configuration Delete API Error Body:',
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
                        'Widget Configuration Restore API Error:',
                        error
                    );


                    console.error(
                        'Widget Configuration Restore API Error Body:',
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