//===============================================================
// Sidebar Footer
// --------------------------------------------------------------
// Working commands at the bottom of the sidebar:
//
//   Home       → /dashboard
//   Favorites  → panel, Favorites tab (count badge)
//   Recent     → panel, Recent tab (last 10 pages)
//   Settings   → Navigation Management (only when the user
//                can open it)
//
// The panel opens beside the footer and closes on Esc, a
// click outside, or any navigation.
//===============================================================

import
{
    Component,
    DestroyRef,
    ElementRef,
    HostListener,
    Input,
    OnInit,
    computed,
    inject,
    signal
}
from '@angular/core';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import
{
    NavigationEnd,
    Router,
    RouterLink
}
from '@angular/router';

import
{
    filter
}
from 'rxjs';

import
{
    ShellService
}
from '../../../../core/shell/shell.service';

import
{
    ShellPanelTab
}
from '../../../../core/shell/shell.models';


//===============================================================
// Items
//===============================================================

type SidebarFooterAction =
    'dashboard'
    |
    'favorites'
    |
    'recent'
    |
    'settings';


interface SidebarFooterItem
{
    action:
        SidebarFooterAction;

    label:
        string;

    tooltip:
        string;

    icon:
        string;

    activeIcon?:
        string;
}


const NAVIGATION_SETTINGS_PREFIX =
    '/infrastructure-control/navigation-management';


@Component(
{
    selector:
        'app-sidebar-footer',

    standalone:
        true,

    imports:
    [
        RouterLink
    ],

    templateUrl:
        './sidebar-footer.html',

    styleUrls:
    [
        './sidebar-footer.css'
    ]
})
export class SidebarFooterComponent
implements
    OnInit
{

    //===========================================================
    // Dependencies
    //===========================================================

    private readonly shellService =
        inject(ShellService);

    private readonly router =
        inject(Router);

    private readonly destroyRef =
        inject(DestroyRef);

    private readonly hostElement =
        inject<ElementRef<HTMLElement>>(ElementRef);


    //===========================================================
    // Inputs
    //===========================================================

    @Input()
    isCollapsed:
        boolean =
        false;


    //===========================================================
    // Items
    //===========================================================

    readonly items:
        SidebarFooterItem[] =
    [
        {
            action:
                'dashboard',

            label:
                'Home',

            tooltip:
                'Dashboard',

            icon:
                'fas fa-house'
        },
        {
            action:
                'favorites',

            label:
                'Favorites',

            tooltip:
                'Favorites',

            icon:
                'fa-regular fa-star',

            activeIcon:
                'fa-solid fa-star'
        },
        {
            action:
                'recent',

            label:
                'Recent',

            tooltip:
                'Recent pages',

            icon:
                'fas fa-clock-rotate-left'
        },
        {
            action:
                'settings',

            label:
                'Settings',

            tooltip:
                'Navigation settings',

            icon:
                'fas fa-gear'
        }
    ];


    //===========================================================
    // State
    //===========================================================

    readonly panel =
        this.shellService.panel;

    readonly favorites =
        this.shellService.visibleFavorites;

    readonly favoriteCount =
        this.shellService.favoriteCount;

    readonly recent =
        this.shellService.recent;

    private readonly currentUrl =
        signal<string>('');

    private readonly now =
        signal<number>(Date.now());


    // First Navigation Management page the user can open.
    readonly settingsRoute =
        computed(
            () =>
                this.shellService.pages()
                    .find(
                        x =>
                            x.route.startsWith(
                                NAVIGATION_SETTINGS_PREFIX
                            )
                    )
                    ?.route
                ??
                null
        );


    //===========================================================
    // Lifecycle
    //===========================================================

    ngOnInit():
        void
    {
        this.currentUrl.set(
            this.cleanUrl(
                this.router.url
            )
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
                (event: NavigationEnd) =>
                    this.currentUrl.set(
                        this.cleanUrl(
                            event.urlAfterRedirects
                        )
                    )
            );
    }


    //===========================================================
    // Close Panel On Outside Click / Esc
    //===========================================================

    @HostListener(
        'document:click',
        [
            '$event'
        ]
    )
    onDocumentClick
    (
        event:
            MouseEvent
    ):
        void
    {
        // composedPath() is taken when the click happened, so
        // a row removed by the click (unstar, Clear) still
        // counts as inside.
        if
        (
            this.panel()
            &&
            !event.composedPath()
                .includes(
                    this.hostElement.nativeElement
                )
        )
        {
            this.shellService.closePanel();
        }
    }


    @HostListener(
        'document:keydown.escape'
    )
    onEscape():
        void
    {
        if
        (
            this.panel()
        )
        {
            this.shellService.closePanel();
        }
    }


    //===========================================================
    // Commands
    //===========================================================

    onItemClick
    (
        action:
            SidebarFooterAction
    ):
        void
    {
        this.shellService.hideRailTip();

        switch
        (
            action
        )
        {
            case 'dashboard':

                this.shellService.closePanel();

                void this.router.navigate(
                [
                    '/dashboard'
                ]);

                break;

            case 'favorites':
            case 'recent':

                this.now.set(
                    Date.now()
                );

                this.shellService.togglePanel(
                    action
                );

                break;

            case 'settings':

                this.shellService.closePanel();

                if
                (
                    this.settingsRoute()
                )
                {
                    void this.router.navigateByUrl(
                        this.settingsRoute()!
                    );
                }

                break;
        }
    }


    setTab
    (
        tab:
            ShellPanelTab
    ):
        void
    {
        this.now.set(
            Date.now()
        );

        this.shellService.panel.set(
            tab
        );
    }


    removeFavorite
    (
        submenuId:
            number
    ):
        void
    {
        const page =
            this.shellService.pages()
                .find(
                    x =>
                        x.submenuId === submenuId
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


    clearRecent():
        void
    {
        this.shellService.clearRecent();
    }


    //===========================================================
    // Active State
    // ----------------------------------------------------------
    // An open panel wins; otherwise the page decides.
    //===========================================================

    isActive
    (
        action:
            SidebarFooterAction
    ):
        boolean
    {
        const panel =
            this.panel();

        if
        (
            action === 'favorites'
            ||
            action === 'recent'
        )
        {
            return panel === action;
        }

        if
        (
            panel
        )
        {
            return false;
        }

        const url =
            this.currentUrl();

        if
        (
            action === 'dashboard'
        )
        {
            return url === '/dashboard'
                ||
                url.startsWith(
                    '/dashboard/'
                );
        }

        return url.startsWith(
            NAVIGATION_SETTINGS_PREFIX
        );
    }


    isCurrent
    (
        route:
            string
    ):
        boolean
    {
        const url =
            this.currentUrl();

        return url === route
            ||
            url.startsWith(
                route + '/'
            );
    }


    //===========================================================
    // View Helpers
    //===========================================================

    iconFor
    (
        item:
            SidebarFooterItem
    ):
        string
    {
        if
        (
            item.activeIcon
            &&
            (
                this.isActive(
                    item.action
                )
                ||
                this.favoriteCount() > 0
            )
        )
        {
            return item.activeIcon;
        }

        return item.icon;
    }


    ariaLabel
    (
        item:
            SidebarFooterItem
    ):
        string
    {
        return item.action === 'favorites'
            ? `Favorites, ${this.favoriteCount()}`
            : item.tooltip;
    }


    showTip
    (
        event:
            Event,

        item:
            SidebarFooterItem
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
            item.action === 'favorites'
            ? `Favorites (${this.favoriteCount()})`
            : item.tooltip
        );
    }


    hideTip():
        void
    {
        this.shellService.hideRailTip();
    }


    timeAgo
    (
        visitedAt:
            number
    ):
        string
    {
        const minutes =
            Math.max(
                0,
                Math.floor(
                    (this.now() - visitedAt) / 60000
                )
            );

        if
        (
            minutes < 1
        )
        {
            return 'now';
        }

        if
        (
            minutes < 60
        )
        {
            return `${minutes} min`;
        }

        const hours =
            Math.floor(
                minutes / 60
            );

        if
        (
            hours < 24
        )
        {
            return `${hours} h`;
        }

        return `${Math.floor(hours / 24)} d`;
    }


    private cleanUrl
    (
        url:
            string
    ):
        string
    {
        return (url ?? '')
            .split('?')[0]
            .split('#')[0];
    }

}