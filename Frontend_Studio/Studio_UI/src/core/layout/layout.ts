//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    OnDestroy,
    ChangeDetectorRef,
    computed,
    inject,
    isDevMode
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
    RouterOutlet,
    NavigationEnd
}
from '@angular/router';

import
{
    filter,
    Subscription
}
from 'rxjs';

import
{
    TopbarComponent
}
from '../topbar/topbar';

import
{
    SidebarComponent
}
from '../sidebar/sidebar';

import
{
    FooterComponent
}
from '../footer/footer';

import
{
    TopbarNavComponent
}
from '../../shared/components/layout/topbar-nav/topbar-nav';

import
{
    BreadcrumbComponent
}
from '../../shared/components/layout/breadcrumb/breadcrumb';

import
{
    CalculatorWindowComponent
}
from '../../shared/components/layout/calculator-window/calculator-window';

import
{
    ToastComponent
}
from '../../shared/components/utilities/toast/toast';

import
{
    AboutAppCoreComponent
}
from '../../shared/components/utilities/about-appcore/about-appcore';

import
{
    SidebarService
}
from '../sidebar/sidebar.service';

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

import
{
    ShellService
}
from '../shell/shell.service';

import
{
    ScreenService
}
from './screen.service';

import
{
    VersionNoticeComponent
}
from '../../shared/components/layout/version-notice/version-notice';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'app-layout',

    standalone:
        true,

    imports:
    [
        CommonModule,

        RouterOutlet,

        TopbarComponent,

        SidebarComponent,

        FooterComponent,

        VersionNoticeComponent,

        TopbarNavComponent,

        BreadcrumbComponent,

        ToastComponent,

        CalculatorWindowComponent,

        AboutAppCoreComponent
    ],

    templateUrl:
        './layout.html',

    styleUrls:
    [
        './layout.css'
    ]
})


//===============================================================
// Layout Component
//===============================================================

export class LayoutComponent
implements
    OnInit,
    OnDestroy
{

    //===========================================================
    // Dependencies
    //===========================================================

    private readonly router =
        inject(Router);

    private readonly sidebarService =
        inject(SidebarService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly authenticationStorageService =
        inject(AuthenticationStorageService);

    private readonly effectiveAccessService =
        inject(EffectiveAccessService);

    private readonly shellService =
        inject(ShellService);

    // Screen tier (page canvas across monitors); the badge shows
    // it in development builds only
    readonly screen =
        inject(ScreenService);

    readonly showScreenBadge =
        isDevMode();


    //===========================================================
    // Properties
    //===========================================================

    isSidebarCollapsed =
        false;

    isDashboard =
        false;

    showAbout =
        false;


    //===========================================================
    // Sidebar Auto-fit Width
    // ----------------------------------------------------------
    // The sidebar measures its longest name and stores the
    // width in ShellService. It is set on .layout as
    // --sidebar-width, so the sidebar, the top bar logo block
    // and the footer version block all follow it. null = keep
    // the starting width from layout.css.
    //===========================================================

    // Side / Top layout and Deep / Light chrome (per user).
    readonly layoutMode =
        this.shellService.layoutMode;

    readonly appearance =
        this.shellService.appearance;


    readonly sidebarFitWidth =
        computed(
            () =>
            {
                const width =
                    this.shellService.sidebarWidth();

                return width
                    ? `${width}px`
                    : null;
            }
        );

    private readonly subscriptions =
        new Subscription();


    //===========================================================
    // Lifecycle
    //===========================================================

    ngOnInit():
        void
    {
        // Layout and appearance before the first paint.
        this.shellService.ensureUserState();

        this.loadUserPermissions();

        this.updateDashboardState(
            this.router.url
        );

        this.subscriptions.add(
            this.sidebarService.sidebarCollapsed$
                .subscribe(
                collapsed =>
                {
                    this.isSidebarCollapsed =
                        collapsed;

                    this.cdr.detectChanges();
                })
        );

        this.subscriptions.add(
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
                        this.updateDashboardState(
                            event.urlAfterRedirects
                        );

                        this.cdr.detectChanges();
                    }
                )
        );
    }


    //===========================================================
    // About
    //===========================================================

    openAbout():
        void
    {
        this.showAbout =
            true;
    }


    closeAbout():
        void
    {
        this.showAbout =
            false;
    }


    //===========================================================
    // Load User Permissions
    //===========================================================

    private loadUserPermissions():
        void
    {
        const user =
            this.authenticationStorageService
                .getUser();

        if
        (
            !user
        )
        {
            return;
        }

        const userProfileId =
            Number(
                user.userProfileId
            );

        if
        (
            !Number.isFinite(
                userProfileId
            )
            ||
            userProfileId <= 0
        )
        {
            return;
        }

        if
        (
            this.effectiveAccessService
                .isLoadedForUser(
                    userProfileId
                )
        )
        {
            return;
        }

        this.effectiveAccessService
            .loadPermissions(
                userProfileId
            )
            .subscribe(
            {
                next:
                    () =>
                    {
                        this.cdr.detectChanges();
                    },

                error:
                    () =>
                    {
                        this.cdr.detectChanges();
                    }
            });
    }


    //===========================================================
    // Dashboard State
    //===========================================================

    private updateDashboardState(
        url:
            string
    ):
        void
    {
        const currentUrl =
            url.split('?')[0];

        this.isDashboard =
            currentUrl === '/dashboard'
            ||
            currentUrl.startsWith(
                '/dashboard/'
            );
    }


    //===========================================================
    // Lifecycle
    //===========================================================

    ngOnDestroy():
        void
    {
        this.subscriptions.unsubscribe();
    }

}
