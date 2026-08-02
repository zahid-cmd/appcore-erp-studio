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
from '../../environments/environment';


//===============================================================
// DTOs
//===============================================================

export interface SidebarSubmenuDto
{
    id: number;

    code: string;

    name: string;

    icon: string;

    route: string;

    displayOrder: number;
}

export interface SidebarMenuDto
{
    id: number;

    code: string;

    name: string;

    icon: string;

    route: string;

    displayOrder: number;

    submenus: SidebarSubmenuDto[];
}

export interface SidebarModuleDto
{
    id: number;

    code: string;

    name: string;

    icon: string;

    displayOrder: number;

    menus: SidebarMenuDto[];
}


//===============================================================
// Sidebar Service
//===============================================================

@Injectable({
    providedIn: 'root'
})

export class SidebarService
{
    //===========================================================
    // Fields
    //===========================================================

    private readonly http =
        inject(HttpClient);

    private readonly apiUrl =
        `${environment.apiUrl}/infrastructure-control/navigation-management/sidebar`;


    //===========================================================
    // Get Sidebar
    //===========================================================

    getSidebar(): Observable<SidebarModuleDto[]>
    {
        return this.http.get<SidebarModuleDto[]>(
            this.apiUrl);
    }
}