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
    NavigationActivity,
    NavigationActivityDefaults,
    CreateNavigationActivity,
    UpdateNavigationActivity
}
from '../models/navigation-activity.model';

//===============================================================
// Navigation Activity Service
//===============================================================

@Injectable(
{
    providedIn: 'root'
})

export class NavigationActivityService
{
    //===========================================================
    // Injection
    //===========================================================

    private readonly http =
        inject(HttpClient);

    //===========================================================
    // API
    //===========================================================

    private readonly apiUrl =
        `${environment.apiUrl}/infrastructure-control/navigation-management/navigation-activity`;

    //===========================================================
    // Get All
    //===========================================================

    getAll(
        navigationModuleId?: number
    ):
        Observable<NavigationActivity[]>
    {
        return this.http.get<NavigationActivity[]>(
            this.apiUrl,
            {
                params:
                {
                    navigationModuleId:
                        navigationModuleId?.toString() ?? ''
                }
            }
        );
    }

    //===========================================================
    // Get History
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

    getById(
        id: number
    ):
        Observable<NavigationActivity>
    {
        return this.http.get<NavigationActivity>(
            `${this.apiUrl}/${id}`
        );
    }

    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults(
        navigationModuleId?: number
    ):
        Observable<NavigationActivityDefaults>
    {
        return this.http.get<NavigationActivityDefaults>(
            `${this.apiUrl}/defaults`,
            {
                params:
                {
                    navigationModuleId:
                        navigationModuleId?.toString() ?? ''
                }
            }
        );
    }

    //===========================================================
    // Create
    //===========================================================

    create(
        model: CreateNavigationActivity
    ):
        Observable<number>
    {
        return this.http.post<number>(
            this.apiUrl,
            model
        );
    }

    //===========================================================
    // Update
    //===========================================================

    update(
        model: UpdateNavigationActivity
    ):
        Observable<void>
    {
        return this.http.put<void>(
            this.apiUrl,
            model
        );
    }

    //===========================================================
    // Delete
    //===========================================================

    delete(
        id: number
    ):
        Observable<void>
    {
        return this.http.delete<void>(
            `${this.apiUrl}/${id}`
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
        );
    }
}