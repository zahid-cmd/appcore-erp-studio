//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
    DestroyRef,
    ElementRef,
    inject
}
from '@angular/core';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

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
    SidebarMenu,
    SidebarSubmenu
}
from './sidebar.models';

import
{
    SidebarService,
    SidebarModuleDto
}
from './sidebar.service';

import
{
    ShellService
}
from '../shell/shell.service';

import
{
    SidebarFooterComponent
}
from '../../shared/components/layout/sidebar-footer/sidebar-footer';

import
{
    SidebarHeaderComponent
}
from '../../shared/components/layout/sidebar-header/sidebar-header';


//===============================================================
// Auto-fit Width
// --------------------------------------------------------------
// Space around each kind of name, in px, read from sidebar.css
// (paddings + icon + gaps + chevron / star + body padding and
// scrollbar). Change these if the sidebar CSS spacing changes.
//
//   module : 12 + 18 icon + 12 gap + text + 6 + 8 chevron + 8
//   menu   : 29 indent + 12 + 18 + 11 + text + 6 + 8 + 8
//   page   : 29 + 12 indent + 14 + 16 + 10 + text + 34 star
//   body   : 12 left padding + 2 (no right padding / scrollbar
//            reserve: names end right before the chevron)
//
// The result is the tightest width that keeps every name on
// one line: the widest name ends right before its chevron.
//===============================================================

const FIT_BODY =
    14;

const FIT_MODULE =
    64 + FIT_BODY;

const FIT_MENU =
    92 + FIT_BODY;

const FIT_PAGE =
    115 + FIT_BODY;

const FIT_SAFETY =
    2;


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'app-sidebar',

    standalone:
        true,

    imports:
    [
        RouterLink,

        SidebarHeaderComponent,

        SidebarFooterComponent
    ],

    templateUrl:
        './sidebar.html',

    styleUrl:
        './sidebar.css'
})
export class SidebarComponent
implements
    OnInit
{

    //===========================================================
    // Dependencies
    //===========================================================

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);

    private readonly sidebarService =
        inject(SidebarService);

    private readonly shellService =
        inject(ShellService);

    private readonly hostElement =
        inject<ElementRef<HTMLElement>>(ElementRef);


    //===========================================================
    // Properties
    //===========================================================

    modules:
        SidebarModule[] =
        [];

    isCollapsed =
        false;

    readonly railTip =
        this.shellService.railTip;


    //===========================================================
    // Lifecycle
    //===========================================================

    ngOnInit():
        void
    {
        this.loadSidebar();

        this.sidebarService.sidebarCollapsed$
            .pipe(
                takeUntilDestroyed(
                    this.destroyRef
                )
            )
            .subscribe(
                collapsed =>
                {
                    this.isCollapsed =
                        collapsed;

                    this.shellService.hideRailTip();

                    this.cdr.detectChanges();
                }
            );

        this.router.events
            .pipe(
                filter(
                    event =>
                        event instanceof NavigationEnd
                ),

                takeUntilDestroyed(
                    this.destroyRef
                )
            )
            .subscribe(
                () =>
                {
                    this.updateActivePage();

                    this.cdr.detectChanges();
                }
            );
    }


    //===========================================================
    // Load Sidebar
    // ----------------------------------------------------------
    // The same list feeds page search, Favorites and Recent
    // (ShellService.setPages).
    //===========================================================

    private loadSidebar():
        void
    {
        this.sidebarService
            .getSidebar()
            .subscribe(
            {
                next:
                    (modules: SidebarModuleDto[]) =>
                    {
                        this.modules =
                            this.mapModules(
                                modules
                            );

                        this.shellService.setPages(
                            modules
                        );

                        this.fitWidth();

                        this.updateActivePage();

                        this.cdr.detectChanges();
                    },

                error:
                    error =>
                    {
                        console.error(
                            'Failed to load sidebar.',
                            error
                        );
                    }
            });
    }


    //===========================================================
    // Map Modules
    //===========================================================

    private mapModules
    (
        modules:
            SidebarModuleDto[]
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


    //===========================================================
    // Auto-fit Width
    // ----------------------------------------------------------
    // Measures every module, menu and page name (in the
    // sidebar's own font, bold for the open page) and sets the
    // open sidebar to the widest one, so every name stays on a
    // single line. Kept between --sidebar-min-width and
    // --sidebar-max-width (layout.css).
    //===========================================================

    private fitWidth():
        void
    {
        this.measureAndSet();

        // Measure again once web / system fonts are ready.
        const fonts =
            (document as Document & { fonts?: FontFaceSet })
                .fonts;

        fonts?.ready
            .then(
                () =>
                    this.measureAndSet()
            )
            .catch(
                () =>
                {
                }
            );
    }


    private measureAndSet():
        void
    {
        if
        (
            this.modules.length === 0
        )
        {
            return;
        }

        const style =
            getComputedStyle(
                this.hostElement.nativeElement
            );

        const minWidth =
            parseFloat(
                style.getPropertyValue(
                    '--sidebar-min-width'
                )
            )
            ||
            260;

        const maxWidth =
            Math.max(
                minWidth,
                parseFloat(
                    style.getPropertyValue(
                        '--sidebar-max-width'
                    )
                )
                ||
                480
            );

        const fontFamily =
            style.fontFamily
            ||
            '"Segoe UI", Tahoma, sans-serif';

        const context =
            document
                .createElement(
                    'canvas'
                )
                .getContext(
                    '2d'
                );

        if
        (
            !context
        )
        {
            return;
        }

        const measure =
            (
                text: string,
                size: number,
                weight: number
            ): number =>
            {
                context.font =
                    `${weight} ${size}px ${fontFamily}`;

                return context.measureText(
                    (text ?? '').trim()
                )
                .width;
            };

        // Widest row so far, and which name it was (for the
        // console note below).
        let needed =
            0;

        let widest =
            '';

        const consider =
            (
                kind: string,
                text: string,
                rowWidth: number
            ): void =>
            {
                if
                (
                    rowWidth > needed
                )
                {
                    needed =
                        rowWidth;

                    widest =
                        `${kind} "${text}"`;
                }
            };

        for
        (
            const module of this.modules
        )
        {
            consider(
                'Module',
                module.title,
                FIT_MODULE +
                measure(
                    module.title,
                    14,
                    600
                )
            );

            for
            (
                const menu of module.menus
            )
            {
                consider(
                    'Menu',
                    `${module.title} › ${menu.title}`,
                    FIT_MENU +
                    measure(
                        menu.title,
                        14,
                        500
                    )
                );

                for
                (
                    const submenu of menu.submenus
                )
                {
                    // Bold: the open page is drawn at 700.
                    consider(
                        'Page',
                        `${module.title} › ${menu.title} › ${submenu.title}`,
                        FIT_PAGE +
                        measure(
                            submenu.title,
                            13.5,
                            700
                        )
                    );
                }
            }
        }

        const width =
            Math.ceil(
                Math.min(
                    maxWidth,
                    Math.max(
                        minWidth,
                        needed + FIT_SAFETY
                    )
                )
            );

        if
        (
            this.shellService.sidebarWidth() !== width
        )
        {
            this.shellService.sidebarWidth.set(
                width
            );

            // Shows which name sets the width (F12 › Console).
            console.info(
                `SIDEBAR WIDTH: ${width}px, set by ${widest}`
                +
                (
                    width === maxWidth
                    ? ' (capped at --sidebar-max-width)'
                    : width === minWidth
                        ? ' (raised to --sidebar-min-width)'
                        : ''
                )
            );
        }
    }


    //===========================================================
    // Module
    //===========================================================

    toggleModule
    (
        module:
            SidebarModule
    ):
        void
    {
        //=======================================================
        // Open Sidebar When Clicking Collapsed Icon
        //=======================================================

        if
        (
            this.isCollapsed
        )
        {
            this.shellService.hideRailTip();

            this.sidebarService.toggleSidebar();

            return;
        }

        if
        (
            module.expanded
        )
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
            }
        );

        module.expanded =
            true;
    }


    //===========================================================
    // Menu
    //===========================================================

    toggleMenu
    (
        menu:
            SidebarMenu
    ):
        void
    {
        const module =
            this.modules.find(
                x =>
                    x.menus.includes(
                        menu
                    )
            );

        if
        (
            !module
        )
        {
            return;
        }

        if
        (
            menu.expanded
        )
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


    //===========================================================
    // Active Module (collapsed rail highlight)
    //===========================================================

    hasActivePage
    (
        module:
            SidebarModule
    ):
        boolean
    {
        return module.menus.some(
            menu =>
                menu.submenus.some(
                    submenu =>
                        submenu.active
                )
        );
    }


    //===========================================================
    // Favorites
    //===========================================================

    isFavorite
    (
        submenuId:
            number
    ):
        boolean
    {
        return this.shellService.isFavorite(
            submenuId
        );
    }


    onStarClick
    (
        event:
            MouseEvent,

        submenu:
            SidebarSubmenu
    ):
        void
    {
        event.preventDefault();

        event.stopPropagation();

        const page =
            this.shellService.pages()
                .find(
                    x =>
                        x.submenuId === Number(
                            submenu.id
                        )
                );

        if
        (
            page
        )
        {
            this.shellService.toggleFavorite(
                page
            );
        }
    }


    //===========================================================
    // Rail Tooltip (collapsed only)
    //===========================================================

    showRailTip
    (
        event:
            Event,

        text:
            string
    ):
        void
    {
        if
        (
            !this.isCollapsed
        )
        {
            return;
        }

        this.shellService.showRailTip(
            event.currentTarget as HTMLElement,
            text
        );
    }


    hideRailTip():
        void
    {
        this.shellService.hideRailTip();
    }


    //===========================================================
    // Active Submenu
    //===========================================================

    private updateActivePage():
        void
    {
        const url =
            this.router.url.split('?')[0];

        let currentModuleId:
            number | null =
            null;

        let currentMenuId:
            number | null =
            null;

        let currentSubMenuId:
            number | null =
            null;

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

                                    currentModuleId =
                                        module.id;

                                    currentMenuId =
                                        menu.id;

                                    currentSubMenuId =
                                        submenu.id;
                                }
                            }
                        );

                        if
                        (
                            hasActiveSubmenu
                        )
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

        //=======================================================
        // Update Central Navigation Context
        //=======================================================

        this.sidebarService
            .setCurrentNavigationContext(
                currentModuleId,
                currentMenuId,
                currentSubMenuId
            );

        this.cdr.markForCheck();
    }

}