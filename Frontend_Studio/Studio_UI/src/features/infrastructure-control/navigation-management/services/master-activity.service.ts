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
    MasterActivity,
    MasterActivityDefaults,
    CreateMasterActivity,
    UpdateMasterActivity
}
from '../models/master-activity.model';

//===============================================================
// Master Activity Service
//===============================================================

@Injectable(
{
    providedIn: 'root'
})

export class MasterActivityService
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
        `${environment.apiUrl}/infrastructure-control/navigation-management/master-activity`;

    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<MasterActivity[]>
    {
        return this.http.get<MasterActivity[]>(
            this.apiUrl
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
        Observable<MasterActivity>
    {
        return this.http.get<MasterActivity>(
            `${this.apiUrl}/${id}`
        );
    }

    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<MasterActivityDefaults>
    {
        return this.http.get<MasterActivityDefaults>(
            `${this.apiUrl}/defaults`
        );
    }

    //===========================================================
    // Create
    //===========================================================

    create(
        model: CreateMasterActivity
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
        model: UpdateMasterActivity
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