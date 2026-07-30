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
    NavigationSubmenu,
    NavigationSubmenuDefaults,
    CreateNavigationSubmenu,
    UpdateNavigationSubmenu
}
from '../models/navigation-submenu.model';


//===============================================================
// Navigation Submenu Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class NavigationSubmenuService
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
        `${environment.apiUrl}/infrastructure-control/navigation-management/navigation-submenu`;



    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<NavigationSubmenu[]>
    {
        return this.http.get<NavigationSubmenu[]>(
            this.apiUrl
        );
    }



    //===========================================================
    // Get By Id
    //===========================================================

    getById(
        id:number
    ):
        Observable<NavigationSubmenu>
    {
        return this.http.get<NavigationSubmenu>(
            `${this.apiUrl}/${id}`
        );
    }

    //===========================================================
    // Get By Menu
    //===========================================================

    getByMenu(
        navigationMenuId:number
    ):
        Observable<NavigationSubmenu[]>
    {
        return this.http.get<NavigationSubmenu[]>(
            `${this.apiUrl}/menu/${navigationMenuId}`
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
        navigationMenuId:number
    ):
        Observable<string>
    {
        return this.http.get(
            `${this.apiUrl}/next-code/${navigationMenuId}`,
            {
                responseType:'text'
            }
        );
    }



    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults(
        navigationMenuId:number
    ):
        Observable<NavigationSubmenuDefaults>
    {
        return this.http.get<NavigationSubmenuDefaults>(
            `${this.apiUrl}/defaults/${navigationMenuId}`
        );
    }



    //===========================================================
    // Get Suggested Display Order
    //===========================================================

    getSuggestedDisplayOrder(
        navigationMenuId:number
    ):
        Observable<number>
    {
        return this.http.get<number>(
            `${this.apiUrl}/suggested-display-order/${navigationMenuId}`
        );
    }



    //===========================================================
    // Create
    //===========================================================

    create(
        model:CreateNavigationSubmenu
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
        model:UpdateNavigationSubmenu
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