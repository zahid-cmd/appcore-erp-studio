//===============================================================
// Topbar Notifications
// --------------------------------------------------------------
// Bell + drop-down. Items come from
// GET api/platform/shell/notifications (loaded on start, every
// 2 minutes, and each time the drop-down opens).
//
// Opening an item marks it read and goes to its page.
//===============================================================

import
{
    Component,
    ElementRef,
    HostListener,
    OnDestroy,
    OnInit,
    inject,
    signal
}
from '@angular/core';

import
{
    Router
}
from '@angular/router';

import
{
    ShellService
}
from '../../../../core/shell/shell.service';

import
{
    ShellNotification,
    ShellNotificationKind
}
from '../../../../core/shell/shell.models';


//===============================================================
// Constants
//===============================================================

const REFRESH_EVERY_MS =
    2 * 60 * 1000;


@Component(
{
    selector:
        'app-topbar-notifications',

    standalone:
        true,

    imports:
    [
    ],

    templateUrl:
        './topbar-notifications.html',

    styleUrls:
    [
        './topbar-notifications.css'
    ]
})
export class TopbarNotificationsComponent
implements
    OnInit,
    OnDestroy
{

    //===========================================================
    // Dependencies
    //===========================================================

    private readonly shellService =
        inject(ShellService);

    private readonly router =
        inject(Router);

    private readonly hostElement =
        inject<ElementRef<HTMLElement>>(ElementRef);


    //===========================================================
    // State
    //===========================================================

    readonly isOpen =
        signal<boolean>(false);

    readonly notifications =
        this.shellService.notifications;

    readonly unreadCount =
        this.shellService.unreadCount;

    private readonly now =
        signal<number>(Date.now());

    private refreshTimer:
        ReturnType<typeof setInterval> | null =
        null;


    //===========================================================
    // Lifecycle
    //===========================================================

    ngOnInit():
        void
    {
        this.shellService.loadNotifications();

        this.refreshTimer =
            setInterval(
                () =>
                {
                    this.now.set(
                        Date.now()
                    );

                    if
                    (
                        !document.hidden
                    )
                    {
                        this.shellService.loadNotifications();
                    }
                },
                REFRESH_EVERY_MS
            );
    }


    ngOnDestroy():
        void
    {
        if
        (
            this.refreshTimer
        )
        {
            clearInterval(
                this.refreshTimer
            );
        }
    }


    //===========================================================
    // Open / Close
    //===========================================================

    toggle():
        void
    {
        const next =
            !this.isOpen();

        this.isOpen.set(
            next
        );

        if
        (
            next
        )
        {
            this.now.set(
                Date.now()
            );

            this.shellService.loadNotifications();
        }
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
            this.isOpen()
            &&
            !this.hostElement.nativeElement.contains(
                event.target as Node
            )
        )
        {
            this.isOpen.set(
                false
            );
        }
    }


    @HostListener(
        'document:keydown.escape'
    )
    onEscape():
        void
    {
        this.isOpen.set(
            false
        );
    }


    //===========================================================
    // Actions
    //===========================================================

    openItem
    (
        item:
            ShellNotification
    ):
        void
    {
        this.shellService.markRead(
            item.key
        );

        this.isOpen.set(
            false
        );

        if
        (
            item.route
        )
        {
            void this.router.navigateByUrl(
                item.route
            );
        }
    }


    markAllRead():
        void
    {
        this.shellService.markAllRead();
    }


    refresh():
        void
    {
        this.now.set(
            Date.now()
        );

        this.shellService.loadNotifications();
    }


    //===========================================================
    // View Helpers
    //===========================================================

    iconFor
    (
        kind:
            ShellNotificationKind
    ):
        string
    {
        switch
        (
            kind
        )
        {
            case 'approval':
                return 'fa-solid fa-sliders';

            case 'cheque':
                return 'fa-solid fa-money-check';

            case 'website':
                return 'fa-solid fa-globe';

            case 'backup':
                return 'fa-solid fa-triangle-exclamation';

            case 'financial-year':
                return 'fa-solid fa-calendar-plus';

            case 'user-request':
                return 'fa-solid fa-user-plus';

            case 'welcome':
                return 'fa-solid fa-user-check';

            default:
                return 'fa-regular fa-bell';
        }
    }


    timeAgo
    (
        value:
            string
    ):
        string
    {
        const time =
            new Date(
                value
            )
            .getTime();

        if
        (
            !Number.isFinite(
                time
            )
        )
        {
            return '';
        }

        const minutes =
            Math.max(
                0,
                Math.floor(
                    (this.now() - time) / 60000
                )
            );

        if
        (
            minutes < 1
        )
        {
            return 'Just now';
        }

        if
        (
            minutes < 60
        )
        {
            return `${minutes} min ago`;
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
            return `${hours} h ago`;
        }

        const days =
            Math.floor(
                hours / 24
            );

        if
        (
            days === 1
        )
        {
            return 'Yesterday';
        }

        if
        (
            days < 7
        )
        {
            return `${days} days ago`;
        }

        return new Date(
                time
            )
            .toLocaleDateString(
                'en-GB',
                {
                    day:
                        '2-digit',

                    month:
                        'short',

                    year:
                        'numeric'
                }
            );
    }

}