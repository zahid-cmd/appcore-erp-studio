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
    NavigationMenu,
    NavigationMenuDefaults,
    CreateNavigationMenu,
    UpdateNavigationMenu
}
from '../models/navigation-menu.model';


//===============================================================
// Navigation Menu Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class NavigationMenuService
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
        `${environment.apiUrl}/infrastructure-control/navigation-management/navigation-menu`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<NavigationMenu[]>
    {
        return this.http.get<NavigationMenu[]>(
            this.apiUrl
        );
    }



    //===========================================================
    // Get By Id
    //===========================================================

    getById(
        id:number
    ):
        Observable<NavigationMenu>
    {
        return this.http.get<NavigationMenu>(
            `${this.apiUrl}/${id}`
        );
    }

    //===========================================================
    // Get By Module
    //===========================================================

    getByModule(
        navigationModuleId:number
    ):
        Observable<NavigationMenu[]>
    {
        return this.http.get<NavigationMenu[]>(
            `${this.apiUrl}/module/${navigationModuleId}`
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
    // Get Next Code
    //===========================================================

    getNextCode(
        navigationModuleId:number
    ):
        Observable<string>
    {
        return this.http.get(
            `${this.apiUrl}/next-code/${navigationModuleId}`,
            {
                responseType:'text'
            }
        );
    }

    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults(
        navigationModuleId:number
    ):
        Observable<NavigationMenuDefaults>
    {
        return this.http.get<NavigationMenuDefaults>(
            `${this.apiUrl}/defaults/${navigationModuleId}`
        );
    }

    //===========================================================
    // Get Suggested Display Order
    //===========================================================

    getSuggestedDisplayOrder(
        navigationModuleId:number
    ):
        Observable<number>
    {
        return this.http.get<number>(
            `${this.apiUrl}/suggested-display-order/${navigationModuleId}`
        );
    }

    //===========================================================
    // Create
    //===========================================================

    create(
        model:CreateNavigationMenu
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
        model:UpdateNavigationMenu
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