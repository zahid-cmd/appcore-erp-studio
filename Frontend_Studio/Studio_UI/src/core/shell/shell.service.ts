//===============================================================
// App Shell Service
// --------------------------------------------------------------
// One place for everything the shell (top bar, sidebar, sidebar
// footer, app footer) shares:
//
//   Page index      built from the sidebar when it loads
//   Page search     Ctrl K palette
//   Favorites       database, per user   (api/platform/shell)
//   Recent pages    browser, per user, last 10
//   Panel           Favorites / Recent panel beside the
//                   sidebar footer
//   Notifications   api/platform/shell/notifications
//                   read state = browser, per user, by Key
//   Context         business date + financial year
//   Server health   api/platform/health
//   Session         expiry read from the login token
//
// State is kept in signals so the views update on their own.
//===============================================================

import
{
    Injectable,
    computed,
    inject,
    signal
}
from '@angular/core';

import
{
    HttpClient,
    HttpErrorResponse
}
from '@angular/common/http';

import
{
    NavigationEnd,
    Router
}
from '@angular/router';

import
{
    filter
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
    ToastService
}
from '../../shared/components/utilities/toast/toast.service';

import
{
    SidebarModuleDto
}
from '../sidebar/sidebar.service';

import
{
    ShellAppearance,
    ShellContextDto,
    ShellFavoriteDto,
    ShellLayoutMode,
    ShellNotification,
    ShellNotificationDto,
    ShellPage,
    ShellPanelTab,
    ShellRecentPage,
    ShellSearchResult,
    ShellServerStatus,
    ShellTextPart
}
from './shell.models';


//===============================================================
// Constants
//===============================================================

const RECENT_LIMIT =
    10;

const SEARCH_LIMIT =
    20;

const READ_KEYS_LIMIT =
    200;

const RECENT_STORAGE_KEY =
    'appcore_shell_recent_';

const READ_STORAGE_KEY =
    'appcore_shell_read_';

const LAYOUT_STORAGE_KEY =
    'appcore_shell_layout_';

const APPEARANCE_STORAGE_KEY =
    'appcore_shell_appearance_';

const BADGE_SKIP_WORDS =
    new Set<string>(
    [
        'of',
        'and',
        'the',
        'for',
        'to',
        'in',
        '&',
        '-'
    ]);


//===============================================================
// Service
//===============================================================

@Injectable(
{
    providedIn:
        'root'
})
export class ShellService
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

    private readonly toast =
        inject(ToastService);


    //===========================================================
    // API
    //===========================================================

    private readonly shellApiUrl =
        `${environment.apiUrl}/platform/shell`;

    private readonly healthApiUrl =
        `${environment.apiUrl}/platform/health`;


    //===========================================================
    // State
    //===========================================================

    readonly pages =
        signal<ShellPage[]>([]);

    // The sidebar's own module › menu › page tree (already
    // filtered by access). The top navigation bar draws it.
    readonly navModules =
        signal<SidebarModuleDto[]>([]);

    // Side (sidebar) or Top (modules bar under the top bar).
    readonly layoutMode =
        signal<ShellLayoutMode>('side');

    // Deep (navy) or Light chrome: top bar, sidebar, footer.
    readonly appearance =
        signal<ShellAppearance>('deep');

    readonly favorites =
        signal<ShellFavoriteDto[]>([]);

    readonly recent =
        signal<ShellRecentPage[]>([]);

    readonly panel =
        signal<ShellPanelTab | null>(null);

    readonly searchOpen =
        signal<boolean>(false);

    // Open sidebar width (px) fitted to the longest menu name;
    // null until the sidebar has measured it.
    readonly sidebarWidth =
        signal<number | null>(null);

    readonly context =
        signal<ShellContextDto | null>(null);

    readonly serverStatus =
        signal<ShellServerStatus>(
        {
            state:
                'checking',

            responseMs:
                null,

            checkedAt:
                null
        });

    // Tooltip for the collapsed sidebar rail. Drawn once by the
    // sidebar with position:fixed, so it is never clipped.
    readonly railTip =
        signal<{ text: string; top: number } | null>(null);

    private readonly notificationRows =
        signal<ShellNotificationDto[]>([]);

    private readonly readKeys =
        signal<string[]>([]);

    private readonly favoriteBusy =
        new Set<number>();

    private loadedForUserId:
        number | null =
        null;


    //===========================================================
    // Derived State
    //===========================================================

    readonly favoriteIds =
        computed(
            () =>
                new Set<number>(
                    this.favorites()
                        .map(
                            x =>
                                x.submenuId
                        )
                )
        );


    // Favorites the user can still open (the sidebar is filtered
    // by access; favorites are filtered the same way).
    readonly visibleFavorites =
        computed(
            () =>
            {
                const pages =
                    this.pages();

                if
                (
                    pages.length === 0
                )
                {
                    return this.favorites();
                }

                const allowed =
                    new Set<number>(
                        pages.map(
                            x =>
                                x.submenuId
                        )
                    );

                return this.favorites()
                    .filter(
                        x =>
                            allowed.has(
                                x.submenuId
                            )
                    );
            }
        );


    readonly favoriteCount =
        computed(
            () =>
                this.visibleFavorites().length
        );


    readonly notifications =
        computed<ShellNotification[]>(
            () =>
            {
                const read =
                    new Set<string>(
                        this.readKeys()
                    );

                return this.notificationRows()
                    .map(
                        row =>
                        ({
                            ...row,

                            isRead:
                                read.has(
                                    row.key
                                )
                        })
                    );
            }
        );


    readonly unreadCount =
        computed(
            () =>
                this.notifications()
                    .filter(
                        x =>
                            !x.isRead
                    )
                    .length
        );


    //===========================================================
    // Constructor
    // ----------------------------------------------------------
    // Every finished navigation:
    //   - is added to Recent pages (when it is a sidebar page)
    //   - closes the Favorites / Recent panel and the search
    //===========================================================

    constructor()
    {
        this.router.events
            .pipe(
                filter(
                    event =>
                        event instanceof NavigationEnd
                )
            )
            .subscribe(
                (event: NavigationEnd) =>
                {
                    this.trackRecent(
                        event.urlAfterRedirects
                    );

                    this.panel.set(
                        null
                    );

                    this.searchOpen.set(
                        false
                    );

                    this.railTip.set(
                        null
                    );
                }
            );
    }


    //===========================================================
    // Current User
    //===========================================================

    currentUserId():
        number | null
    {
        const user =
            this.authenticationStorageService
                .getUser();

        const userProfileId =
            Number(
                user?.userProfileId
            );

        return Number.isFinite(
                userProfileId
            )
            &&
            userProfileId > 0
            ? userProfileId
            : null;
    }


    //===========================================================
    // Page Index
    // ----------------------------------------------------------
    // Called by the sidebar after it has loaded (already
    // filtered by the user's access).
    //===========================================================

    setPages
    (
        modules:
            SidebarModuleDto[]
    ):
        void
    {
        const pages:
            ShellPage[] =
            [];

        for
        (
            const module of modules ?? []
        )
        {
            for
            (
                const menu of module.menus ?? []
            )
            {
                for
                (
                    const submenu of menu.submenus ?? []
                )
                {
                    if
                    (
                        !submenu.route
                    )
                    {
                        continue;
                    }

                    pages.push(
                    {
                        submenuId:
                            Number(
                                submenu.id
                            ),

                        code:
                            submenu.code ?? '',

                        title:
                            submenu.name ?? '',

                        icon:
                            submenu.icon ?? '',

                        route:
                            this.normalizeRoute(
                                submenu.route
                            ),

                        moduleTitle:
                            module.name ?? '',

                        menuTitle:
                            menu.name ?? '',

                        path:
                            `${module.name ?? ''} › ${menu.name ?? ''}`
                    });
                }
            }
        }

        this.pages.set(
            pages
        );

        this.navModules.set(
            modules ?? []
        );

        this.ensureUserState();

        this.trackRecent(
            this.router.url
        );
    }


    //===========================================================
    // User State
    // ----------------------------------------------------------
    // Loads favorites, recent pages and read keys for the
    // signed-in user. Runs again when a different user signs in.
    //===========================================================

    ensureUserState():
        void
    {
        const userId =
            this.currentUserId();

        if
        (
            userId === this.loadedForUserId
        )
        {
            return;
        }

        this.loadedForUserId =
            userId;

        this.favorites.set(
            []
        );

        this.notificationRows.set(
            []
        );

        this.context.set(
            null
        );

        this.recent.set(
            this.readStorage<ShellRecentPage[]>(
                RECENT_STORAGE_KEY,
                []
            )
        );

        this.readKeys.set(
            this.readStorage<string[]>(
                READ_STORAGE_KEY,
                []
            )
        );

        this.loadPreferences();

        if
        (
            userId !== null
        )
        {
            this.loadFavorites();
        }
    }


    //===========================================================
    // Layout and Appearance
    // ----------------------------------------------------------
    // Both are remembered per user in this browser and never
    // change on their own.
    //===========================================================

    private loadPreferences():
        void
    {
        const layout =
            this.readStorage<string>(
                LAYOUT_STORAGE_KEY,
                'side'
            );

        this.layoutMode.set(
            layout === 'top'
            ? 'top'
            : 'side'
        );

        const appearance =
            this.readStorage<string>(
                APPEARANCE_STORAGE_KEY,
                'deep'
            );

        this.appearance.set(
            appearance === 'light'
            ? 'light'
            : 'deep'
        );
    }


    setLayoutMode
    (
        mode:
            ShellLayoutMode
    ):
        void
    {
        if
        (
            mode === this.layoutMode()
        )
        {
            return;
        }

        this.panel.set(
            null
        );

        this.railTip.set(
            null
        );

        this.withTransition(
            () =>
                this.layoutMode.set(
                    mode
                )
        );

        this.writeStorage(
            LAYOUT_STORAGE_KEY,
            mode
        );
    }


    toggleLayoutMode():
        void
    {
        this.setLayoutMode(
            this.layoutMode() === 'top'
            ? 'side'
            : 'top'
        );
    }


    setAppearance
    (
        appearance:
            ShellAppearance
    ):
        void
    {
        if
        (
            appearance === this.appearance()
        )
        {
            return;
        }

        this.withTransition(
            () =>
                this.appearance.set(
                    appearance
                )
        );

        this.writeStorage(
            APPEARANCE_STORAGE_KEY,
            appearance
        );
    }


    toggleAppearance():
        void
    {
        this.setAppearance(
            this.appearance() === 'light'
            ? 'deep'
            : 'light'
        );
    }


    // Smooth change where the browser supports View
    // Transitions (and the user has not asked for less motion).
    private withTransition
    (
        change:
            () => void
    ):
        void
    {
        const doc =
            document as Document &
            {
                startViewTransition?:
                    (callback: () => Promise<void> | void) => unknown;
            };

        const reduceMotion =
            typeof window.matchMedia === 'function'
            &&
            window.matchMedia(
                '(prefers-reduced-motion: reduce)'
            )
            .matches;

        if
        (
            !doc.startViewTransition
            ||
            reduceMotion
        )
        {
            change();

            return;
        }

        doc.startViewTransition(
            () =>
            {
                change();

                // Let Angular draw the new state before the
                // browser takes the "after" picture.
                return new Promise<void>(
                    resolve =>
                        setTimeout(
                            resolve,
                            40
                        )
                );
            }
        );
    }


    //===========================================================
    // Favorites
    //===========================================================

    loadFavorites():
        void
    {
        this.http
            .get<ShellFavoriteDto[]>(
                `${this.shellApiUrl}/favorites`
            )
            .subscribe(
            {
                next:
                    rows =>
                        this.favorites.set(
                            rows ?? []
                        ),

                error:
                    error =>
                        console.error(
                            'SHELL: Failed to load favorites.',
                            error
                        )
            });
    }


    isFavorite
    (
        submenuId:
            number
    ):
        boolean
    {
        return this.favoriteIds()
            .has(
                Number(
                    submenuId
                )
            );
    }


    toggleFavorite
    (
        page:
            ShellPage
    ):
        void
    {
        const submenuId =
            Number(
                page.submenuId
            );

        if
        (
            this.favoriteBusy.has(
                submenuId
            )
        )
        {
            return;
        }

        const before =
            this.favorites();

        const adding =
            !this.isFavorite(
                submenuId
            );

        // Show the change straight away; the server list
        // replaces it when the call returns.
        if
        (
            adding
        )
        {
            this.favorites.set(
            [
                ...before,
                {
                    submenuId:
                        submenuId,

                    code:
                        page.code,

                    name:
                        page.title,

                    icon:
                        page.icon,

                    route:
                        page.route,

                    menuName:
                        page.menuTitle,

                    moduleName:
                        page.moduleTitle,

                    sortOrder:
                        before.length + 1
                }
            ]);
        }
        else
        {
            this.favorites.set(
                before.filter(
                    x =>
                        x.submenuId !== submenuId
                )
            );
        }

        this.favoriteBusy.add(
            submenuId
        );

        const request =
            adding
            ? this.http.post<ShellFavoriteDto[]>(
                `${this.shellApiUrl}/favorites/${submenuId}`,
                {}
            )
            : this.http.delete<ShellFavoriteDto[]>(
                `${this.shellApiUrl}/favorites/${submenuId}`
            );

        request.subscribe(
        {
            next:
                rows =>
                {
                    this.favoriteBusy.delete(
                        submenuId
                    );

                    this.favorites.set(
                        rows ?? []
                    );
                },

            error:
                (error: HttpErrorResponse) =>
                {
                    this.favoriteBusy.delete(
                        submenuId
                    );

                    this.favorites.set(
                        before
                    );

                    const message =
                        typeof error?.error === 'string'
                        &&
                        error.error.trim().length > 0
                        ? error.error
                        : adding
                            ? 'The page could not be added to Favorites.'
                            : 'The page could not be removed from Favorites.';

                    this.toast.warning(
                        'Favorites',
                        message
                    );
                }
        });
    }


    //===========================================================
    // Recent Pages
    //===========================================================

    clearRecent():
        void
    {
        this.recent.set(
            []
        );

        this.writeStorage(
            RECENT_STORAGE_KEY,
            []
        );
    }


    private trackRecent
    (
        url:
            string
    ):
        void
    {
        if
        (
            this.currentUserId() === null
        )
        {
            return;
        }

        const page =
            this.findPageByUrl(
                url
            );

        if
        (
            !page
        )
        {
            return;
        }

        const entry:
            ShellRecentPage =
        {
            submenuId:
                page.submenuId,

            title:
                page.title,

            route:
                page.route,

            path:
                page.path,

            visitedAt:
                Date.now()
        };

        const rows =
            [
                entry,
                ...this.recent()
                    .filter(
                        x =>
                            x.submenuId !== page.submenuId
                    )
            ]
            .slice(
                0,
                RECENT_LIMIT
            );

        this.recent.set(
            rows
        );

        this.writeStorage(
            RECENT_STORAGE_KEY,
            rows
        );
    }


    findPageByUrl
    (
        url:
            string
    ):
        ShellPage | null
    {
        const current =
            this.normalizeRoute(
                url
            );

        let best:
            ShellPage | null =
            null;

        for
        (
            const page of this.pages()
        )
        {
            const matches =
                current === page.route
                ||
                current.startsWith(
                    page.route + '/'
                );

            if
            (
                matches
                &&
                (
                    !best
                    ||
                    page.route.length > best.route.length
                )
            )
            {
                best =
                    page;
            }
        }

        return best;
    }


    //===========================================================
    // Favorites / Recent Panel
    //===========================================================

    togglePanel
    (
        tab:
            ShellPanelTab
    ):
        void
    {
        this.panel.set(
            this.panel() === tab
            ? null
            : tab
        );
    }


    closePanel():
        void
    {
        this.panel.set(
            null
        );
    }


    //===========================================================
    // Rail Tooltip  (collapsed sidebar)
    //===========================================================

    showRailTip
    (
        element:
            HTMLElement,

        text:
            string
    ):
        void
    {
        const rect =
            element.getBoundingClientRect();

        this.railTip.set(
        {
            text,

            top:
                Math.round(
                    rect.top + rect.height / 2
                )
        });
    }


    hideRailTip():
        void
    {
        this.railTip.set(
            null
        );
    }


    //===========================================================
    // Page Search
    //===========================================================

    openSearch():
        void
    {
        this.panel.set(
            null
        );

        this.searchOpen.set(
            true
        );
    }


    closeSearch():
        void
    {
        this.searchOpen.set(
            false
        );
    }


    search
    (
        query:
            string
    ):
        ShellSearchResult[]
    {
        const text =
            (query ?? '')
                .trim()
                .toLowerCase();

        const pages =
            this.pages();

        //=======================================================
        // Nothing typed: Favorites then Recent
        //=======================================================

        if
        (
            text.length === 0
        )
        {
            const results:
                ShellSearchResult[] =
                [];

            const used =
                new Set<number>();

            for
            (
                const favorite of this.visibleFavorites()
                    .slice(
                        0,
                        6
                    )
            )
            {
                const page =
                    pages.find(
                        x =>
                            x.submenuId === favorite.submenuId
                    );

                if
                (
                    page
                )
                {
                    used.add(
                        page.submenuId
                    );

                    results.push(
                        this.toResult(
                            page,
                            'Favorites',
                            []
                        )
                    );
                }
            }

            for
            (
                const recent of this.recent()
            )
            {
                if
                (
                    used.has(
                        recent.submenuId
                    )
                    ||
                    results.length >= 12
                )
                {
                    continue;
                }

                const page =
                    pages.find(
                        x =>
                            x.submenuId === recent.submenuId
                    );

                if
                (
                    page
                )
                {
                    used.add(
                        page.submenuId
                    );

                    results.push(
                        this.toResult(
                            page,
                            'Recent',
                            []
                        )
                    );
                }
            }

            return results;
        }

        //=======================================================
        // Typed: every word must match title, path or code
        //=======================================================

        const tokens =
            text
                .split(
                    /\s+/
                )
                .filter(
                    x =>
                        x.length > 0
                );

        const scored =
            pages
                .map(
                    page =>
                    {
                        const title =
                            page.title.toLowerCase();

                        const haystack =
                            `${title} ${page.path.toLowerCase()} ${page.code.toLowerCase()}`;

                        if
                        (
                            !tokens.every(
                                token =>
                                    haystack.includes(
                                        token
                                    )
                            )
                        )
                        {
                            return null;
                        }

                        let score =
                            3;

                        if
                        (
                            title.startsWith(
                                text
                            )
                        )
                        {
                            score =
                                0;
                        }
                        else if
                        (
                            title
                                .split(
                                    /\s+/
                                )
                                .some(
                                    word =>
                                        word.startsWith(
                                            tokens[0]
                                        )
                                )
                        )
                        {
                            score =
                                1;
                        }
                        else if
                        (
                            title.includes(
                                tokens[0]
                            )
                        )
                        {
                            score =
                                2;
                        }

                        return {
                            page,
                            score
                        };
                    }
                )
                .filter(
                    (x): x is { page: ShellPage; score: number } =>
                        x !== null
                )
                .sort(
                    (a, b) =>
                        a.score - b.score
                        ||
                        a.page.title.localeCompare(
                            b.page.title
                        )
                )
                .slice(
                    0,
                    SEARCH_LIMIT
                );

        return scored.map(
            x =>
                this.toResult(
                    x.page,
                    'Pages',
                    tokens
                )
        );
    }


    private toResult
    (
        page:
            ShellPage,

        group:
            string,

        tokens:
            string[]
    ):
        ShellSearchResult
    {
        return {
            page,

            group,

            titleParts:
                this.highlight(
                    page.title,
                    tokens
                ),

            badge:
                this.badge(
                    page.title
                )
        };
    }


    // Splits text into plain / matched parts (no innerHTML).
    highlight
    (
        text:
            string,

        tokens:
            string[]
    ):
        ShellTextPart[]
    {
        if
        (
            !text
            ||
            tokens.length === 0
        )
        {
            return [
            {
                text:
                    text ?? '',

                hit:
                    false
            }];
        }

        const lower =
            text.toLowerCase();

        const marks =
            new Array<boolean>(
                text.length
            )
            .fill(
                false
            );

        for
        (
            const token of tokens
        )
        {
            let index =
                lower.indexOf(
                    token
                );

            while
            (
                index >= 0
                &&
                token.length > 0
            )
            {
                for
                (
                    let i = index;
                    i < index + token.length;
                    i++
                )
                {
                    marks[i] =
                        true;
                }

                index =
                    lower.indexOf(
                        token,
                        index + token.length
                    );
            }
        }

        const parts:
            ShellTextPart[] =
            [];

        for
        (
            let i = 0;
            i < text.length;
            i++
        )
        {
            const last =
                parts[parts.length - 1];

            if
            (
                last
                &&
                last.hit === marks[i]
            )
            {
                last.text +=
                    text[i];
            }
            else
            {
                parts.push(
                {
                    text:
                        text[i],

                    hit:
                        marks[i]
                });
            }
        }

        return parts;
    }


    // "Receipt Voucher" → "RV", "Chart of Services" → "CS"
    badge
    (
        title:
            string
    ):
        string
    {
        const words =
            (title ?? '')
                .split(
                    /[\s/]+/
                )
                .filter(
                    x =>
                        x.length > 0
                        &&
                        !BADGE_SKIP_WORDS.has(
                            x.toLowerCase()
                        )
                );

        const letters =
            words
                .map(
                    x =>
                        x.replace(
                            /[^A-Za-z0-9]/g,
                            ''
                        )
                        .charAt(
                            0
                        )
                )
                .filter(
                    x =>
                        x.length > 0
                )
                .slice(
                    0,
                    2
                )
                .join('');

        return (
            letters
            ||
            (title ?? '?').charAt(0)
        )
        .toUpperCase();
    }


    //===========================================================
    // Notifications
    //===========================================================

    loadNotifications():
        void
    {
        if
        (
            this.currentUserId() === null
        )
        {
            return;
        }

        this.ensureUserState();

        this.http
            .get<ShellNotificationDto[]>(
                `${this.shellApiUrl}/notifications`
            )
            .subscribe(
            {
                next:
                    rows =>
                    {
                        const list =
                            rows ?? [];

                        this.notificationRows.set(
                            list
                        );

                        // Forget read keys that no longer exist,
                        // so the stored list stays small.
                        const current =
                            new Set<string>(
                                list.map(
                                    x =>
                                        x.key
                                )
                            );

                        const kept =
                            this.readKeys()
                                .filter(
                                    x =>
                                        current.has(
                                            x
                                        )
                                );

                        if
                        (
                            kept.length !== this.readKeys().length
                        )
                        {
                            this.saveReadKeys(
                                kept
                            );
                        }
                    },

                error:
                    error =>
                        console.error(
                            'SHELL: Failed to load notifications.',
                            error
                        )
            });
    }


    markRead
    (
        key:
            string
    ):
        void
    {
        if
        (
            this.readKeys()
                .includes(
                    key
                )
        )
        {
            return;
        }

        this.saveReadKeys(
        [
            ...this.readKeys(),
            key
        ]);
    }


    markAllRead():
        void
    {
        const keys =
            new Set<string>(
                this.readKeys()
            );

        for
        (
            const row of this.notificationRows()
        )
        {
            keys.add(
                row.key
            );
        }

        this.saveReadKeys(
            Array.from(
                keys
            )
        );
    }


    private saveReadKeys
    (
        keys:
            string[]
    ):
        void
    {
        const rows =
            keys.slice(
                -READ_KEYS_LIMIT
            );

        this.readKeys.set(
            rows
        );

        this.writeStorage(
            READ_STORAGE_KEY,
            rows
        );
    }


    //===========================================================
    // Context  (business date + financial year)
    //===========================================================

    loadContext():
        void
    {
        if
        (
            this.currentUserId() === null
        )
        {
            return;
        }

        this.ensureUserState();

        this.http
            .get<ShellContextDto>(
                `${this.shellApiUrl}/context`
            )
            .subscribe(
            {
                next:
                    row =>
                        this.context.set(
                            row ?? null
                        ),

                error:
                    error =>
                        console.error(
                            'SHELL: Failed to load context.',
                            error
                        )
            });
    }


    //===========================================================
    // Server Health
    // ----------------------------------------------------------
    //   200            online   (green)
    //   503            degraded (amber: API up, database down)
    //   no answer      offline  (red)
    //===========================================================

    checkHealth():
        void
    {
        const started =
            performance.now();

        this.http
            .get(
                this.healthApiUrl
            )
            .subscribe(
            {
                next:
                    () =>
                        this.serverStatus.set(
                        {
                            state:
                                'online',

                            responseMs:
                                Math.round(
                                    performance.now() - started
                                ),

                            checkedAt:
                                Date.now()
                        }),

                error:
                    (error: HttpErrorResponse) =>
                        this.serverStatus.set(
                        {
                            state:
                                error?.status === 503
                                ? 'degraded'
                                : 'offline',

                            responseMs:
                                error?.status === 503
                                ? Math.round(
                                    performance.now() - started
                                )
                                : null,

                            checkedAt:
                                Date.now()
                        })
            });
    }


    //===========================================================
    // Session
    // ----------------------------------------------------------
    // Reads "exp" from the login token. Returns epoch ms, or
    // null when there is no token or it cannot be read.
    //===========================================================

    sessionExpiresAt():
        number | null
    {
        const token =
            this.authenticationStorageService
                .getToken();

        if
        (
            !token
        )
        {
            return null;
        }

        try
        {
            const part =
                token.split('.')[1] ?? '';

            const base64 =
                part
                    .replace(
                        /-/g,
                        '+'
                    )
                    .replace(
                        /_/g,
                        '/'
                    );

            const padded =
                base64 +
                '='.repeat(
                    (4 - base64.length % 4) % 4
                );

            const payload =
                JSON.parse(
                    atob(
                        padded
                    )
                );

            const exp =
                Number(
                    payload?.exp
                );

            return Number.isFinite(
                    exp
                )
                &&
                exp > 0
                ? exp * 1000
                : null;
        }
        catch
        {
            return null;
        }
    }


    //===========================================================
    // Helpers
    //===========================================================

    private normalizeRoute
    (
        route:
            string
    ):
        string
    {
        let value =
            (route ?? '')
                .split('?')[0]
                .split('#')[0]
                .trim();

        if
        (
            !value.startsWith(
                '/'
            )
        )
        {
            value =
                '/' + value;
        }

        if
        (
            value.length > 1
            &&
            value.endsWith(
                '/'
            )
        )
        {
            value =
                value.slice(
                    0,
                    -1
                );
        }

        return value;
    }


    private readStorage<T>
    (
        prefix:
            string,

        fallback:
            T
    ):
        T
    {
        const userId =
            this.currentUserId();

        if
        (
            userId === null
        )
        {
            return fallback;
        }

        try
        {
            const raw =
                localStorage.getItem(
                    prefix + userId
                );

            if
            (
                !raw
            )
            {
                return fallback;
            }

            const value =
                JSON.parse(
                    raw
                );

            return Array.isArray(
                    fallback
                )
                &&
                !Array.isArray(
                    value
                )
                ? fallback
                : value as T;
        }
        catch
        {
            return fallback;
        }
    }


    private writeStorage
    (
        prefix:
            string,

        value:
            unknown
    ):
        void
    {
        const userId =
            this.currentUserId();

        if
        (
            userId === null
        )
        {
            return;
        }

        try
        {
            localStorage.setItem(
                prefix + userId,
                JSON.stringify(
                    value
                )
            );
        }
        catch
        {
            // Storage full or blocked: the shell keeps working
            // without saving.
        }
    }

}