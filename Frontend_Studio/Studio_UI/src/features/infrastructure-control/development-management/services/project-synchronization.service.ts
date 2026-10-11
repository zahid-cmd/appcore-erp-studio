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
    ProjectSynchronization,
    ProjectSynchronizationDefaults,
    CreateProjectSynchronization,
    UpdateProjectSynchronization,
    Module,
    Menu,
    Submenu,
    ActivityHistory
}
from '../model/project-synchronization.model';


//===============================================================
// Project Synchronization Service
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class ProjectSynchronizationService
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly http =
        inject(HttpClient);

    //===========================================================
    // API
    //===========================================================

    private readonly apiUrl =
        `${environment.apiUrl}/infrastructure-control/development-management/project-synchronization`;

    //===========================================================
    // Get All
    //===========================================================

    getAll():
        Observable<ProjectSynchronization[]>
    {
        return this.http.get<ProjectSynchronization[]>(
            this.apiUrl
        );
    }

    //===========================================================
    // Get By Id
    //===========================================================

    getById
    (
        id:number
    ):
        Observable<ProjectSynchronization>
    {
        return this.http.get<ProjectSynchronization>(
            `${this.apiUrl}/${id}`
        );
    }

    //===========================================================
    // Get History
    //===========================================================

    getHistory():
        Observable<ActivityHistory[]>
    {
        return this.http.get<ActivityHistory[]>(
            `${this.apiUrl}/history`
        );
    }

    //===========================================================
    // Get Defaults
    //===========================================================

    getDefaults():
        Observable<ProjectSynchronizationDefaults>
    {
        return this.http.get<ProjectSynchronizationDefaults>(
            `${this.apiUrl}/defaults`
        );
    }

    //===========================================================
    // Create
    //===========================================================

    create
    (
        model:CreateProjectSynchronization
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

    update
    (
        model:UpdateProjectSynchronization
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

    delete
    (
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

    //===========================================================
    // Get Modules
    //===========================================================

    getModules():
        Observable<Module[]>
    {
        return this.http.get<Module[]>(
            `${this.apiUrl}/modules`
        );
    }

    //===========================================================
    // Get Menus
    //===========================================================

    getMenus
    (
        moduleId:number
    ):
        Observable<Menu[]>
    {
        return this.http.get<Menu[]>(
            `${this.apiUrl}/modules/${moduleId}/menus`
        );
    }


    //===========================================================
    // Get Submenus
    //===========================================================

    getSubmenus
    (
        menuId:number
    ):
        Observable<Submenu[]>
    {
        return this.http.get<Submenu[]>(
            `${this.apiUrl}/menus/${menuId}/submenus`
        );
    }


    //===========================================================
    // Get All Modules
    //===========================================================

    getAllModules():
        Observable<Module[]>
    {
        return this.http.get<Module[]>(
            `${this.apiUrl}/modules/all`
        );
    }


    //===========================================================
    // Get All Menus
    //===========================================================

    getAllMenus():
        Observable<Menu[]>
    {
        return this.http.get<Menu[]>(
            `${this.apiUrl}/menus/all`
        );
    }


    //===========================================================
    // Get All Submenus
    //===========================================================

    getAllSubmenus():
        Observable<Submenu[]>
    {
        return this.http.get<Submenu[]>(
            `${this.apiUrl}/submenus/all`
        );
    }
    //===========================================================
    // Synchronization Engine
    //===========================================================

    // Future synchronization operations:
    //
    // synchronizeFrontend()
    // synchronizeBackend()
    // synchronizeAll()
    // getSynchronizationStatus()

}