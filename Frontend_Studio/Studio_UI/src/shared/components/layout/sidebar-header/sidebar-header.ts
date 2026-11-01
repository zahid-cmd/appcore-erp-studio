/* ============================================================
   Sidebar Header : Dashboard link
============================================================ */

import
{
    Component,
    ChangeDetectorRef,
    DestroyRef,
    Input,
    OnInit,
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
    ShellService
}
from '../../../../core/shell/shell.service';


@Component(
{
    selector:
        'app-sidebar-header',

    standalone:
        true,

    imports:
    [
        RouterLink
    ],

    templateUrl:
        './sidebar-header.html',

    styleUrl:
        './sidebar-header.css'
})
export class SidebarHeaderComponent
implements
    OnInit
{

    /* ========================================================
       INPUTS
    ======================================================== */

    @Input()
    isCollapsed:
        boolean =
        false;


    /* ========================================================
       PROPERTIES
    ======================================================== */

    isActive:
        boolean =
        false;


    /* ========================================================
       DEPENDENCIES
    ======================================================== */

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);

    private readonly shellService =
        inject(ShellService);


    /* ========================================================
       LIFECYCLE
    ======================================================== */

    ngOnInit():
        void
    {
        this.updateActiveState(
            this.router.url
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
                    this.updateActiveState(
                        event.urlAfterRedirects
                    );

                    this.cdr.detectChanges();
                }
            );
    }


    /* ========================================================
       TOOLTIP (collapsed rail)
    ======================================================== */

    showTip
    (
        event:
            Event
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
            'Dashboard'
        );
    }


    hideTip():
        void
    {
        this.shellService.hideRailTip();
    }


    /* ========================================================
       ACTIVE STATE
    ======================================================== */

    private updateActiveState
    (
        url:
            string
    ):
        void
    {
        const currentUrl =
            url.split('?')[0];

        this.isActive =
            currentUrl === '/dashboard'
            ||
            currentUrl.startsWith(
                '/dashboard/'
            );
    }

}