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
    NavigationModule,
    NavigationModuleDefaults,
    CreateNavigationModule,
    UpdateNavigationModule
}
from '../models/navigation-module.model';


//===============================================================
// Navigation Module Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class ModuleService
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
        `${environment.apiUrl}/infrastructure-control/navigation-management/navigation-module`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<NavigationModule[]>
    {
        return this.http.get<NavigationModule[]>(
            this.apiUrl
        );
    }



    //===========================================================
    // Get By Id
    //===========================================================

    getById(
        id:number
    ):
        Observable<NavigationModule>
    {
        return this.http.get<NavigationModule>(
            `${this.apiUrl}/${id}`
        );
    }


    //===========================================================
    // Get List History
    //
    // Used by Module List Page History Drawer
    //===========================================================

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(
            `${this.apiUrl}/history`
        );
    }



    //===========================================================
    // Get Next Code
    //===========================================================

    getNextCode():
        Observable<string>
    {
        return this.http.get(
            `${this.apiUrl}/next-code`,
            {
                responseType:'text'
            }
        );
    }

    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<NavigationModuleDefaults>
    {
        return this.http.get<NavigationModuleDefaults>(
            `${this.apiUrl}/defaults`
        );
    }
    
    //===========================================================
    // Get Suggested Display Order
    //===========================================================

    getSuggestedDisplayOrder():
        Observable<number>
    {
        return this.http.get<number>(
            `${this.apiUrl}/suggested-display-order`
        );
    }

    //===========================================================
    // Create
    //===========================================================

    create(
        model:CreateNavigationModule
    ):
        Observable<void>
    {
        return this.http.post<void>(
            this.apiUrl,
            model
        );
    }



    //===========================================================
    // Update
    //===========================================================

    update(
        model:UpdateNavigationModule
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
        id:number
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