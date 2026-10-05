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
    Router
}
from '@angular/router';

import
{
    Observable,
    BehaviorSubject,
    switchMap,
    map,
    of
}
from 'rxjs';

import
{
    environment
}
from '../../environments/environment';

import
{
    AuthenticationStorageService
}
from '../authentication/authentication-storage.service';

import
{
    EffectiveAccessService
}
from '../effective-access/effective-access.service';


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
// Current Navigation Context
//===============================================================

export interface CurrentNavigationContext
{
    moduleId: number | null;

    menuId: number | null;

    subMenuId: number | null;
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
    // Dependencies
    //===========================================================

    private readonly http =
        inject(HttpClient);

    private readonly router =
        inject(Router);

    private readonly authenticationStorageService =
        inject(AuthenticationStorageService);

    private readonly effectiveAccessService =
        inject(EffectiveAccessService);


    //===========================================================
    // API URL
    //===========================================================

    private readonly apiUrl =
        `${environment.apiUrl}/infrastructure-control/navigation-management/sidebar`;


    //===========================================================
    // Subjects
    //===========================================================

    private readonly sidebarCollapsedSubject =
        new BehaviorSubject<boolean>(false);

    private readonly currentNavigationContextSubject =
        new BehaviorSubject<CurrentNavigationContext>(
        {
            moduleId: null,

            menuId: null,

            subMenuId: null
        });


    //===========================================================
    // Constructor
    //===========================================================

    constructor()
    {
    }


    //===========================================================
    // Sidebar State
    //===========================================================

    readonly sidebarCollapsed$ =
        this.sidebarCollapsedSubject.asObservable();


    //===========================================================
    // Current Navigation Context
    //===========================================================

    readonly currentNavigationContext$ =
        this.currentNavigationContextSubject.asObservable();


    //===========================================================
    // Get Current Navigation Context
    //===========================================================

    getCurrentNavigationContext():
        CurrentNavigationContext
    {
        return this.currentNavigationContextSubject.value;
    }


    //===========================================================
    // Set Current Navigation Context
    //===========================================================

    setCurrentNavigationContext
    (
        moduleId: number | null,

        menuId: number | null,

        subMenuId: number | null
    ):
        void
    {
        this.currentNavigationContextSubject.next(
        {
            moduleId,

            menuId,

            subMenuId
        });
    }


    //===========================================================
    // Clear Current Navigation Context
    //===========================================================

    clearCurrentNavigationContext():
        void
    {
        this.currentNavigationContextSubject.next(
        {
            moduleId: null,

            menuId: null,

            subMenuId: null
        });
    }


    //===========================================================
    // Toggle Sidebar
    //===========================================================

    toggleSidebar():
        void
    {
        this.sidebarCollapsedSubject.next(
            !this.sidebarCollapsedSubject.value
        );
    }


    //===========================================================
    // Get Sidebar
    //===========================================================

    getSidebar():
        Observable<SidebarModuleDto[]>
    {
        const user =
            this.authenticationStorageService.getUser();

        const userProfileId =
            user?.userProfileId;

        if
        (
            !userProfileId
        )
        {
            this.clearCurrentNavigationContext();

            return of([]);
        }

        return this.effectiveAccessService
            .loadPermissions(userProfileId)
            .pipe(
                switchMap(
                    () =>
                        this.http.get<SidebarModuleDto[]>(
                            this.apiUrl
                        )
                ),
                map(
                    sidebar =>
                    {
                        const filteredSidebar =
                            this.filterSidebarByAccess(
                                sidebar
                            );

                        this.restoreNavigationContext(
                            filteredSidebar
                        );

                        return filteredSidebar;
                    }
                )
            );
    }


    //===========================================================
    // Restore Navigation Context
    //===========================================================

    private restoreNavigationContext
    (
        sidebar: SidebarModuleDto[]
    ):
        void
    {
        const currentUrl =
            this.router.url
                .split('?')[0]
                .split('#')[0];

        for
        (
            const module of sidebar
        )
        {
            for
            (
                const menu of module.menus
            )
            {
                for
                (
                    const submenu of menu.submenus
                )
                {
                    const submenuRoute =
                        submenu.route
                            ?.split('?')[0]
                            .split('#')[0];

                    if
                    (
                        !submenuRoute
                    )
                    {
                        continue;
                    }

                    if
                    (
                        currentUrl ===
                        submenuRoute
                    )
                    {
                        this.setCurrentNavigationContext(
                            module.id,

                            menu.id,

                            submenu.id
                        );

                        return;
                    }
                }
            }
        }

        this.clearCurrentNavigationContext();
    }


    //===========================================================
    // Filter Sidebar By Effective Access
    //===========================================================

    private filterSidebarByAccess
    (
        sidebar: SidebarModuleDto[]
    ):
        SidebarModuleDto[]
    {
        const effectiveAccess =
            this.effectiveAccessService
                .getCachedEffectiveAccess();

        const filteredModules:
            SidebarModuleDto[] = [];

        for
        (
            const module of sidebar
        )
        {
            const filteredMenus:
                SidebarMenuDto[] = [];

            for
            (
                const menu of module.menus
            )
            {
                const filteredSubmenus:
                    SidebarSubmenuDto[] =
                    menu.submenus.filter(
                        submenu =>
                            effectiveAccess.some(
                                access =>
                                    access.moduleId
                                    ===
                                    module.id

                                    &&

                                    access.menuId
                                    ===
                                    menu.id

                                    &&

                                    access.subMenuId
                                    ===
                                    submenu.id
                            )
                    );

                if
                (
                    filteredSubmenus.length
                    ===
                    0
                )
                {
                    continue;
                }

                filteredMenus.push(
                {
                    ...menu,

                    submenus:
                        filteredSubmenus
                });
            }

            if
            (
                filteredMenus.length
                ===
                0
            )
            {
                continue;
            }

            const moduleAccess =
                effectiveAccess.some(
                    access =>
                        access.moduleId
                        ===
                        module.id
                );

            if
            (
                !moduleAccess
            )
            {
                continue;
            }

            filteredModules.push(
            {
                ...module,

                menus:
                    filteredMenus
            });
        }

        return filteredModules;
    }
}