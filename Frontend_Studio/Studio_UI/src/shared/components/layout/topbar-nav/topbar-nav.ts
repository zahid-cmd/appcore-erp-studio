//===============================================================
// Topbar Nav  (Top layout)
// --------------------------------------------------------------
// The modules bar under the top bar, Windows-style menus:
//
//   point at / click a module  → its menus drop down under it
//   point at a menu            → its pages fly out to the right
//                                (to the left near the edge)
//
// Data: ShellService.navModules (the sidebar's own tree, already
// filtered by access). The sidebar stays loaded but hidden.
//
// Narrow screens: under 1280px module names hide (icons stay,
// name on hover); modules that still don't fit go under More.
//
// Keys: ← → between modules, ↓ / Enter opens, → into pages,
//       ← back, Esc closes, Alt 1…9 opens module 1…9.
//===============================================================

import
{
    Component,
    DestroyRef,
    ElementRef,
    HostListener,
    computed,
    effect,
    inject,
    signal,
    viewChild
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
// View Models
//===============================================================

interface NavPage
{
    id:
        number;

    title:
        string;

    icon:
        string;

    route:
        string;
}


interface NavMenu
{
    id:
        number;

    title:
        string;

    icon:
        string;

    pages:
        NavPage[];
}


interface NavModule
{
    id:
        number;

    title:
        string;

    icon:
        string;

    menus:
        NavMenu[];
}


//===============================================================
// Constants
//===============================================================

const OPEN_DELAY_MS =
    120;

const CLOSE_DELAY_MS =
    280;

const MENU_SWITCH_DELAY_MS =
    140;

const MORE_RESERVE_PX =
    96;

const FLYOUT_WIDTH_PX =
    300;


@Component(
{
    selector:
        'app-topbar-nav',

    standalone:
        true,

    imports:
    [
        RouterLink
    ],

    templateUrl:
        './topbar-nav.html',

    styleUrls:
    [
        './topbar-nav.css'
    ]
})
export class TopbarNavComponent
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
    // View
    //===========================================================

    private readonly rowRef =
        viewChild<ElementRef<HTMLElement>>(
            'moduleRow'
        );


    //===========================================================
    // Data
    //===========================================================

    readonly modules =
        computed<NavModule[]>(
            () =>
                this.shellService.navModules()
                    .map(
                        module =>
                        ({
                            id:
                                Number(
                                    module.id
                                ),

                            title:
                                module.name ?? '',

                            icon:
                                module.icon ?? '',

                            menus:
                                (module.menus ?? [])
                                    .map(
                                        menu =>
                                        ({
                                            id:
                                                Number(
                                                    menu.id
                                                ),

                                            title:
                                                menu.name ?? '',

                                            icon:
                                                menu.icon ?? '',

                                            pages:
                                                (menu.submenus ?? [])
                                                    .filter(
                                                        page =>
                                                            !!page.route
                                                    )
                                                    .map(
                                                        page =>
                                                        ({
                                                            id:
                                                                Number(
                                                                    page.id
                                                                ),

                                                            title:
                                                                page.name ?? '',

                                                            icon:
                                                                page.icon ?? '',

                                                            route:
                                                                page.route
                                                        })
                                                    )
                                        })
                                    )
                                    .filter(
                                        menu =>
                                            menu.pages.length > 0
                                    )
                        })
                    )
                    .filter(
                        module =>
                            module.menus.length > 0
                    )
        );

    readonly favoriteCount =
        this.shellService.favoriteCount;

    readonly favorites =
        this.shellService.visibleFavorites;

    readonly recent =
        this.shellService.recent;

    private readonly currentUrl =
        signal<string>('');

    // Page / module of the page that is open now.
    readonly currentPageId =
        computed(
            () =>
                this.shellService.findPageByUrl(
                    this.currentUrl()
                )
                ?.submenuId
                ??
                null
        );

    readonly activeModuleId =
        computed(
            () =>
            {
                const pageId =
                    this.currentPageId();

                if
                (
                    pageId === null
                )
                {
                    return null;
                }

                return this.modules()
                    .find(
                        module =>
                            module.menus.some(
                                menu =>
                                    menu.pages.some(
                                        page =>
                                            page.id === pageId
                                    )
                            )
                    )
                    ?.id
                    ??
                    null;
            }
        );


    //===========================================================
    // Open State
    //===========================================================

    readonly openModuleId =
        signal<number | null>(null);

    readonly openMenuId =
        signal<number | null>(null);

    readonly flyoutLeft =
        signal<boolean>(false);

    readonly moreOpen =
        signal<boolean>(false);

    readonly moreModuleId =
        signal<number | null>(null);

    readonly quickPanel =
        signal<ShellPanelTab | null>(null);

    readonly openModule =
        computed(
            () =>
                this.modules()
                    .find(
                        x =>
                            x.id === this.openModuleId()
                    )
                ??
                null
        );

    private openTimer:
        ReturnType<typeof setTimeout> | null =
        null;

    private closeTimer:
        ReturnType<typeof setTimeout> | null =
        null;

    private menuTimer:
        ReturnType<typeof setTimeout> | null =
        null;


    //===========================================================
    // Overflow (More)
    //===========================================================

    readonly measuring =
        signal<boolean>(true);

    readonly visibleCount =
        signal<number>(999);

    readonly overflowModules =
        computed(
            () =>
                this.modules()
                    .slice(
                        this.visibleCount()
                    )
        );

    readonly moreModule =
        computed(
            () =>
                this.overflowModules()
                    .find(
                        x =>
                            x.id === this.moreModuleId()
                    )
                ??
                null
        );

    private resizeObserver:
        ResizeObserver | null =
        null;


    //===========================================================
    // Sliding Underline
    //===========================================================

    readonly indicatorLeft =
        signal<number>(0);

    readonly indicatorWidth =
        signal<number>(0);


    //===========================================================
    // Constructor
    //===========================================================

    constructor()
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
                {
                    this.currentUrl.set(
                        this.cleanUrl(
                            event.urlAfterRedirects
                        )
                    );

                    this.closeAll();

                    setTimeout(
                        () =>
                            this.moveIndicatorToActive(),
                        0
                    );
                }
            );

        // Re-measure when the modules change.
        effect(
            () =>
            {
                this.modules();

                setTimeout(
                    () =>
                        this.measure(),
                    0
                );
            }
        );

        // Watch the bar's own width.
        setTimeout(
            () =>
            {
                const row =
                    this.rowRef()
                        ?.nativeElement;

                if
                (
                    row
                    &&
                    typeof ResizeObserver !== 'undefined'
                )
                {
                    this.resizeObserver =
                        new ResizeObserver(
                            () =>
                                this.measure()
                        );

                    this.resizeObserver.observe(
                        row
                    );
                }
            },
            0
        );

        this.destroyRef.onDestroy(
            () =>
            {
                this.resizeObserver?.disconnect();

                this.clearTimers();
            }
        );
    }


    //===========================================================
    // Module Hover / Click
    //===========================================================

    onModuleEnter
    (
        module:
            NavModule,

        event:
            Event
    ):
        void
    {
        this.cancelClose();

        this.moveIndicatorTo(
            event.currentTarget as HTMLElement
        );

        // Something already open: switch straight away.
        if
        (
            this.openModuleId() !== null
            ||
            this.moreOpen()
            ||
            this.quickPanel()
        )
        {
            this.openModuleNow(
                module.id
            );

            return;
        }

        this.clearOpenTimer();

        this.openTimer =
            setTimeout(
                () =>
                    this.openModuleNow(
                        module.id
                    ),
                OPEN_DELAY_MS
            );
    }


    onModuleClick
    (
        module:
            NavModule
    ):
        void
    {
        this.clearOpenTimer();

        if
        (
            this.openModuleId() === module.id
        )
        {
            this.closeAll();

            return;
        }

        this.openModuleNow(
            module.id
        );
    }


    private openModuleNow
    (
        moduleId:
            number
    ):
        void
    {
        this.clearOpenTimer();

        this.moreOpen.set(
            false
        );

        this.quickPanel.set(
            null
        );

        if
        (
            this.openModuleId() !== moduleId
        )
        {
            this.openMenuId.set(
                null
            );
        }

        this.openModuleId.set(
            moduleId
        );
    }


    //===========================================================
    // Menu Hover → Pages Fly-out
    //===========================================================

    onMenuEnter
    (
        menu:
            NavMenu,

        event:
            Event
    ):
        void
    {
        const row =
            event.currentTarget as HTMLElement;

        const apply =
            () =>
            {
                const rect =
                    row.getBoundingClientRect();

                this.flyoutLeft.set(
                    rect.right + FLYOUT_WIDTH_PX + 12 > window.innerWidth
                );

                this.openMenuId.set(
                    menu.id
                );
            };

        this.clearMenuTimer();

        // First fly-out opens at once; switching waits a little
        // so a diagonal move into the open fly-out does not
        // switch menus on the way.
        if
        (
            this.openMenuId() === null
        )
        {
            apply();

            return;
        }

        this.menuTimer =
            setTimeout(
                apply,
                MENU_SWITCH_DELAY_MS
            );
    }


    onFlyoutEnter():
        void
    {
        this.clearMenuTimer();

        this.cancelClose();
    }


    //===========================================================
    // More (modules that do not fit)
    //===========================================================

    onMoreClick():
        void
    {
        const next =
            !this.moreOpen();

        this.closeAll();

        this.moreOpen.set(
            next
        );
    }


    onMoreModuleEnter
    (
        module:
            NavModule,

        event:
            Event
    ):
        void
    {
        const row =
            event.currentTarget as HTMLElement;

        this.clearMenuTimer();

        this.menuTimer =
            setTimeout(
                () =>
                {
                    const rect =
                        row.getBoundingClientRect();

                    this.flyoutLeft.set(
                        rect.right + FLYOUT_WIDTH_PX + 12 > window.innerWidth
                    );

                    this.moreModuleId.set(
                        module.id
                    );
                },
                this.moreModuleId() === null
                ? 0
                : MENU_SWITCH_DELAY_MS
            );
    }


    //===========================================================
    // Home · Favorites · Recent
    //===========================================================

    toggleQuick
    (
        tab:
            ShellPanelTab
    ):
        void
    {
        const next =
            this.quickPanel() === tab
            ? null
            : tab;

        this.closeAll();

        this.quickPanel.set(
            next
        );
    }


    goHome():
        void
    {
        this.closeAll();

        void this.router.navigate(
        [
            '/dashboard'
        ]);
    }


    clearRecent():
        void
    {
        this.shellService.clearRecent();
    }


    //===========================================================
    // Favorites (★ on a page)
    //===========================================================

    isFavorite
    (
        pageId:
            number
    ):
        boolean
    {
        return this.shellService.isFavorite(
            pageId
        );
    }


    onStarClick
    (
        event:
            MouseEvent,

        pageId:
            number
    ):
        void
    {
        event.preventDefault();

        event.stopPropagation();

        const page =
            this.shellService.pages()
                .find(
                    x =>
                        x.submenuId === pageId
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
    // Leaving / Closing
    //===========================================================

    onNavLeave():
        void
    {
        this.clearOpenTimer();

        this.moveIndicatorToActive();

        // Panels opened by a click stay until a click outside.
        if
        (
            this.quickPanel()
            ||
            this.moreOpen()
        )
        {
            return;
        }

        this.cancelClose();

        this.closeTimer =
            setTimeout(
                () =>
                    this.closeAll(),
                CLOSE_DELAY_MS
            );
    }


    onNavEnter():
        void
    {
        this.cancelClose();
    }


    closeAll():
        void
    {
        this.clearTimers();

        this.openModuleId.set(
            null
        );

        this.openMenuId.set(
            null
        );

        this.moreOpen.set(
            false
        );

        this.moreModuleId.set(
            null
        );

        this.quickPanel.set(
            null
        );
    }


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
        if
        (
            !event.composedPath()
                .includes(
                    this.hostElement.nativeElement
                )
        )
        {
            this.closeAll();
        }
    }


    //===========================================================
    // Keyboard
    //===========================================================

    @HostListener(
        'document:keydown',
        [
            '$event'
        ]
    )
    onDocumentKeydown
    (
        event:
            KeyboardEvent
    ):
        void
    {
        // Esc closes whatever is open.
        if
        (
            event.key === 'Escape'
            &&
            (
                this.openModuleId() !== null
                ||
                this.moreOpen()
                ||
                this.quickPanel()
            )
        )
        {
            this.closeAll();

            return;
        }

        // Alt 1…9 opens module 1…9 and focuses it.
        if
        (
            event.altKey
            &&
            !event.ctrlKey
            &&
            !event.metaKey
            &&
            /^[1-9]$/.test(
                event.key
            )
        )
        {
            const module =
                this.modules()[
                    Number(
                        event.key
                    ) - 1
                ];

            if
            (
                module
            )
            {
                event.preventDefault();

                this.openModuleNow(
                    module.id
                );

                this.focusModule(
                    module.id
                );
            }
        }
    }


    onModuleKeydown
    (
        event:
            KeyboardEvent,

        index:
            number,

        module:
            NavModule
    ):
        void
    {
        switch
        (
            event.key
        )
        {
            case 'ArrowRight':
            case 'ArrowLeft':
            {
                event.preventDefault();

                const list =
                    this.modules()
                        .slice(
                            0,
                            Math.min(
                                this.visibleCount(),
                                this.modules().length
                            )
                        );

                const next =
                    list[
                        (
                            index
                            +
                            (event.key === 'ArrowRight' ? 1 : -1)
                            +
                            list.length
                        )
                        % list.length
                    ];

                if
                (
                    next
                )
                {
                    if
                    (
                        this.openModuleId() !== null
                    )
                    {
                        this.openModuleNow(
                            next.id
                        );
                    }

                    this.focusModule(
                        next.id
                    );
                }

                break;
            }

            case 'ArrowDown':
            case 'Enter':
            case ' ':
            {
                event.preventDefault();

                this.openModuleNow(
                    module.id
                );

                setTimeout(
                    () =>
                        this.focusFirst(
                            '.tn-dropdown .tn-menu-row'
                        ),
                    0
                );

                break;
            }
        }
    }


    onMenuKeydown
    (
        event:
            KeyboardEvent,

        menu:
            NavMenu
    ):
        void
    {
        const rows =
            Array.from(
                this.hostElement.nativeElement
                    .querySelectorAll<HTMLElement>(
                        '.tn-dropdown .tn-menu-row'
                    )
            );

        const index =
            rows.indexOf(
                event.currentTarget as HTMLElement
            );

        switch
        (
            event.key
        )
        {
            case 'ArrowDown':
            case 'ArrowUp':

                event.preventDefault();

                rows[
                    (
                        index
                        +
                        (event.key === 'ArrowDown' ? 1 : -1)
                        +
                        rows.length
                    )
                    % rows.length
                ]
                ?.focus();

                break;

            case 'ArrowRight':
            case 'Enter':
            case ' ':

                event.preventDefault();

                this.clearMenuTimer();

                this.openMenuId.set(
                    menu.id
                );

                setTimeout(
                    () =>
                        this.focusFirst(
                            '.tn-flyout .tn-page-link'
                        ),
                    0
                );

                break;

            case 'ArrowLeft':

                event.preventDefault();

                this.openMenuId.set(
                    null
                );

                if
                (
                    this.openModuleId() !== null
                )
                {
                    this.focusModule(
                        this.openModuleId()!
                    );
                }

                break;
        }
    }


    onPageKeydown
    (
        event:
            KeyboardEvent
    ):
        void
    {
        const links =
            Array.from(
                this.hostElement.nativeElement
                    .querySelectorAll<HTMLElement>(
                        '.tn-flyout .tn-page-link'
                    )
            );

        const index =
            links.indexOf(
                event.currentTarget as HTMLElement
            );

        switch
        (
            event.key
        )
        {
            case 'ArrowDown':
            case 'ArrowUp':

                event.preventDefault();

                links[
                    (
                        index
                        +
                        (event.key === 'ArrowDown' ? 1 : -1)
                        +
                        links.length
                    )
                    % links.length
                ]
                ?.focus();

                break;

            case 'ArrowLeft':
            {
                event.preventDefault();

                const menuId =
                    this.openMenuId();

                this.openMenuId.set(
                    null
                );

                this.hostElement.nativeElement
                    .querySelector<HTMLElement>(
                        `.tn-menu-row[data-menu-id="${menuId}"]`
                    )
                    ?.focus();

                break;
            }
        }
    }


    //===========================================================
    // Overflow Measuring
    // ----------------------------------------------------------
    // Shows every module for one frame, measures where each
    // one ends, then hides the ones past the room left for
    // the More button.
    //===========================================================

    private measure():
        void
    {
        this.measuring.set(
            true
        );

        requestAnimationFrame(
            () =>
            {
                const row =
                    this.rowRef()
                        ?.nativeElement;

                if
                (
                    !row
                )
                {
                    this.measuring.set(
                        false
                    );

                    return;
                }

                const items =
                    Array.from(
                        row.querySelectorAll<HTMLElement>(
                            '.tn-item'
                        )
                    );

                const available =
                    row.clientWidth;

                const ends =
                    items.map(
                        item =>
                            item.offsetLeft + item.offsetWidth
                    );

                const last =
                    ends.length > 0
                    ? ends[ends.length - 1]
                    : 0;

                let count =
                    items.length;

                if
                (
                    last > available
                )
                {
                    count =
                        ends.filter(
                            end =>
                                end <= available - MORE_RESERVE_PX
                        )
                        .length;
                }

                this.visibleCount.set(
                    count
                );

                this.measuring.set(
                    false
                );

                setTimeout(
                    () =>
                        this.moveIndicatorToActive(),
                    0
                );
            }
        );
    }


    isHidden
    (
        index:
            number
    ):
        boolean
    {
        return !this.measuring()
            &&
            index >= this.visibleCount();
    }


    //===========================================================
    // Sliding Underline
    //===========================================================

    private moveIndicatorTo
    (
        element:
            HTMLElement | null
    ):
        void
    {
        if
        (
            !element
        )
        {
            this.indicatorWidth.set(
                0
            );

            return;
        }

        this.indicatorLeft.set(
            element.offsetLeft + 10
        );

        this.indicatorWidth.set(
            Math.max(
                0,
                element.offsetWidth - 20
            )
        );
    }


    private moveIndicatorToActive():
        void
    {
        const id =
            this.activeModuleId();

        const element =
            id === null
            ? null
            : this.hostElement.nativeElement
                .querySelector<HTMLElement>(
                    `.tn-item[data-module-id="${id}"]:not(.hidden)`
                );

        this.moveIndicatorTo(
            element
        );
    }


    //===========================================================
    // Helpers
    //===========================================================

    private focusModule
    (
        moduleId:
            number
    ):
        void
    {
        setTimeout(
            () =>
                this.hostElement.nativeElement
                    .querySelector<HTMLElement>(
                        `.tn-item[data-module-id="${moduleId}"] .tn-module`
                    )
                    ?.focus(),
            0
        );
    }


    private focusFirst
    (
        selector:
            string
    ):
        void
    {
        this.hostElement.nativeElement
            .querySelector<HTMLElement>(
                selector
            )
            ?.focus();
    }


    private cancelClose():
        void
    {
        if
        (
            this.closeTimer
        )
        {
            clearTimeout(
                this.closeTimer
            );

            this.closeTimer =
                null;
        }
    }


    private clearOpenTimer():
        void
    {
        if
        (
            this.openTimer
        )
        {
            clearTimeout(
                this.openTimer
            );

            this.openTimer =
                null;
        }
    }


    private clearMenuTimer():
        void
    {
        if
        (
            this.menuTimer
        )
        {
            clearTimeout(
                this.menuTimer
            );

            this.menuTimer =
                null;
        }
    }


    private clearTimers():
        void
    {
        this.cancelClose();

        this.clearOpenTimer();

        this.clearMenuTimer();
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
