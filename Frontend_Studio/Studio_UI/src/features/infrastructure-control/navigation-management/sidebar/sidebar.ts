/* ============================================================
   IMPORTS
============================================================ */

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
    inject
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    Router,
    RouterLink,
    NavigationEnd
}
from '@angular/router';

import
{
    filter
}
from 'rxjs';

import
{
    SidebarModule,
    SidebarMenu
}
from '../models/sidebar.models';

import
{
    SidebarService,
    SidebarModuleDto
}
from '../services/sidebar.service';


/* ============================================================
   COMPONENT
============================================================ */

@Component(
{
    selector: 'app-sidebar',

    standalone: true,

    imports:
    [
        CommonModule,

        RouterLink
    ],

    templateUrl: './sidebar.html',

    styleUrl: './sidebar.css'
})

export class SidebarComponent
implements OnInit
{
    /* ========================================================
       DEPENDENCIES
    ======================================================== */

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly sidebarService =
        inject(SidebarService);

    /* ========================================================
       PROPERTIES
    ======================================================== */

    modules: SidebarModule[] = [];

    /* ========================================================
       LIFECYCLE
    ======================================================== */

    ngOnInit():
        void
    {
        this.loadSidebar();

        this.router.events

            .pipe(
                filter(
                    event =>
                        event instanceof NavigationEnd
                )
            )

            .subscribe(() =>
            {
                this.updateActivePage();

                this.cdr.detectChanges();
            });
    }

    /* ========================================================
       LOAD SIDEBAR
    ======================================================== */

    private loadSidebar():
        void
    {
        this.sidebarService

            .getSidebar()

            .subscribe(
            {
                next:(modules: SidebarModuleDto[]) =>
                {
                    this.modules =
                        this.mapModules(
                            modules
                        );

                    this.updateActivePage();

                    this.cdr.detectChanges();
                },

                error:error =>
                {
                    console.error(
                        'Failed to load sidebar.',
                        error
                    );
                }
            });
    }

    /* ========================================================
       MAP MODULES
    ======================================================== */

    private mapModules
    (
        modules: SidebarModuleDto[]
    ):
        SidebarModule[]
    {
        return modules.map(
            module =>
            ({
                id:
                    module.id,

                code:
                    module.code,

                title:
                    module.name,

                icon:
                    module.icon,

                expanded:
                    false,

                menus:
                    module.menus.map(
                        menu =>
                        ({
                            id:
                                menu.id,

                            code:
                                menu.code,

                            title:
                                menu.name,

                            icon:
                                menu.icon,

                            expanded:
                                false,

                            submenus:
                                menu.submenus.map(
                                    submenu =>
                                    ({
                                        id:
                                            submenu.id,

                                        code:
                                            submenu.code,

                                        title:
                                            submenu.name,

                                        icon:
                                            submenu.icon,

                                        route:
                                            submenu.route,

                                        active:
                                            false
                                    })
                                )
                        })
                    )
            }));
    }

    /* ========================================================
       MODULE
    ======================================================== */

    toggleModule
    (
        module: SidebarModule
    ):
        void
    {
        if (module.expanded)
        {
            module.expanded =
                false;

            return;
        }

        this.modules.forEach(
            x =>
            {
                x.expanded =
                    false;

                x.menus.forEach(
                    menu =>
                        menu.expanded =
                            false
                );
            });

        module.expanded =
            true;
    }

    /* ========================================================
       MENU
    ======================================================== */

    toggleMenu
    (
        menu: SidebarMenu
    ):
        void
    {
        const module =
            this.modules.find(
                x => x.menus.includes(menu)
            );

        if (!module)
        {
            return;
        }

        if (menu.expanded)
        {
            menu.expanded =
                false;

            return;
        }

        module.menus.forEach(
            x =>
                x.expanded =
                    false
        );

        menu.expanded =
            true;
    }

    /* ========================================================
       ACTIVE SUBMENU
    ======================================================== */

    private updateActivePage():
        void
    {
        const url =
            this.router.url.split('?')[0];

        this.modules.forEach(
            module =>
            {
                module.expanded =
                    false;

                module.menus.forEach(
                    menu =>
                    {
                        menu.expanded =
                            false;

                        let hasActiveSubmenu =
                            false;

                        menu.submenus.forEach(
                            submenu =>
                            {
                                submenu.active =
                                    false;

                                if
                                (
                                    url === submenu.route
                                    ||
                                    url.startsWith(
                                        submenu.route + '/'
                                    )
                                )
                                {
                                    submenu.active =
                                        true;

                                    hasActiveSubmenu =
                                        true;
                                }
                            }
                        );

                        if (hasActiveSubmenu)
                        {
                            menu.expanded =
                                true;

                            module.expanded =
                                true;
                        }
                    }
                );
            }
        );

        this.cdr.markForCheck();
    }
}