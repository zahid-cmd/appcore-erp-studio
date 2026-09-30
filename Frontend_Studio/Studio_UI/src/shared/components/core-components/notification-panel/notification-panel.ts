//===============================================================
// Login Page — Notification Panel
//===============================================================

import
{
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    Input,
    OnDestroy,
    Output,
    inject
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';


//===============================================================
// NOTIFICATION TYPE
//===============================================================

export type LoginPageNotificationType =
    'info'
    |
    'success'
    |
    'warning'
    |
    'error';


//===============================================================
// NOTIFICATION CONFIGURATION
//===============================================================

export interface LoginPageNotification
{
    id:number;

    visible:boolean;

    isRead:boolean;

    heading:string;

    message:string;

    icon:string;

    type:
        LoginPageNotificationType;

    dismissible:boolean;

    autoHide:boolean;

    displayDuration:number;
}


//===============================================================
// NEW NOTIFICATION INPUT
// ---------------------------------------------------------------
// Used when another component wants to add a notification.
//
// The ID is generated internally by the Notification Panel.
//===============================================================

export type LoginPageNotificationInput =
    Omit<
        LoginPageNotification,
        'id'
    >;


//===============================================================
// NOTIFICATION PANEL CONFIGURATION
//===============================================================

export interface LoginPageNotificationPanelConfig
{
    visible:boolean;

    notifications:
        LoginPageNotification[];
}


//===============================================================
// COMPONENT
//===============================================================

@Component
({
    selector:
        'app-login-page-notification-panel',

    standalone:
        true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './notification-panel.html',

    styleUrl:
        './notification-panel.css',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})
export class LoginPageNotificationPanelComponent
    implements OnDestroy
{
    //===========================================================
    // PRIVATE SERVICES
    //===========================================================

    private readonly elementRef:
        ElementRef<HTMLElement> =
            inject(
                ElementRef<HTMLElement>
            );


    private readonly changeDetectorRef:
        ChangeDetectorRef =
            inject(
                ChangeDetectorRef
            );


    //===========================================================
    // AUTOMATIC CLOSE TIMER
    //===========================================================

    private autoCloseTimer:
        ReturnType<typeof setTimeout> |
        null =
            null;


    //===========================================================
    // AUTOMATIC OPEN STATE
    // ----------------------------------------------------------
    // TRUE:
    //
    //     Panel is currently being displayed automatically.
    //
    // FALSE:
    //
    //     Panel is being displayed because of manual user
    //     interaction.
    //===========================================================

    private isAutoOpened:
        boolean =
            false;


    //===========================================================
    // CONFIGURATION
    //===========================================================

    @Input()
    config:
        LoginPageNotificationPanelConfig =
    {
        visible:
            true,

        notifications:
        []
    };


    //===========================================================
    // PANEL STATE
    //===========================================================

    isPanelOpen:boolean =
        false;


    //===========================================================
    // CONFIGURATION CHANGE EVENT
    //===========================================================

    @Output()
    configChange:
        EventEmitter<LoginPageNotificationPanelConfig> =
        new EventEmitter<LoginPageNotificationPanelConfig>();


    //===========================================================
    // DISMISS EVENT
    //===========================================================

    @Output()
    dismissed:
        EventEmitter<number> =
        new EventEmitter<number>();


    //===========================================================
    // PANEL OPEN EVENT
    //===========================================================

    @Output()
    opened:
        EventEmitter<void> =
        new EventEmitter<void>();


    //===========================================================
    // PANEL CLOSE EVENT
    //===========================================================

    @Output()
    closed:
        EventEmitter<void> =
        new EventEmitter<void>();


    //===========================================================
    // NOTIFICATION VIEWED EVENT
    //===========================================================

    @Output()
    notificationViewed:
        EventEmitter<number> =
        new EventEmitter<number>();


    //===========================================================
    // COMPONENT DESTROY
    //===========================================================

    ngOnDestroy():void
    {
        this.clearAutoCloseTimer();
    }


    //===========================================================
    // OUTSIDE CLICK DETECTION
    // ----------------------------------------------------------
    // Clicking outside the Notification Panel closes it.
    //
    // IMPORTANT:
    //
    // Closing by outside click DOES NOT mark notifications
    // as read.
    //
    // This preserves the unread counter until the user
    // intentionally opens the panel.
    //===========================================================

    @HostListener(
        'document:click',
        [
            '$event'
        ]
    )
    onDocumentClick(
        event:
            MouseEvent
    ):void
    {
        if(
            !this.isPanelOpen
        )
        {
            return;
        }


        const target:
            Node | null =
            event.target as Node | null;


        if(
            !target
        )
        {
            return;
        }


        const clickedInside:
            boolean =
            this.elementRef.nativeElement.contains(
                target
            );


        if(
            clickedInside
        )
        {
            return;
        }


        this.closePanel();
    }


    //===========================================================
    // TOGGLE NOTIFICATION PANEL
    //===========================================================

    togglePanel():void
    {
        if(
            !this.config.visible
        )
        {
            return;
        }


        //=======================================================
        // PANEL IS ALREADY OPEN
        // -------------------------------------------------------
        // If automatically opened:
        //
        //     User has now intentionally interacted with it.
        //
        // Therefore:
        //
        //     1. Mark visible unread notifications as read.
        //     2. Clear unread counter.
        //     3. Close the panel.
        //=======================================================

        if(
            this.isPanelOpen
        )
        {
            if(
                this.isAutoOpened
            )
            {
                this.isAutoOpened =
                    false;

                this.clearAutoCloseTimer();

                this.markVisibleNotificationsAsRead();
            }


            this.closePanel();

            return;
        }


        //=======================================================
        // MANUAL OPEN
        //=======================================================

        this.openPanel();
    }


    //===========================================================
    // OPEN NOTIFICATION PANEL — MANUAL
    // ----------------------------------------------------------
    // Called when the user intentionally clicks the bell while
    // the panel is closed.
    //
    // MANUAL OPEN:
    //
    //     unread notifications become read.
    //===========================================================

    openPanel():void
    {
        if(
            !this.config.visible
        )
        {
            return;
        }


        //=======================================================
        // Cancel Automatic Timer
        //=======================================================

        this.clearAutoCloseTimer();


        //=======================================================
        // Mark As Manual
        //=======================================================

        this.isAutoOpened =
            false;


        //=======================================================
        // Open Panel
        //=======================================================

        this.isPanelOpen =
            true;


        //=======================================================
        // Manual Open = Read
        //=======================================================

        this.markVisibleNotificationsAsRead();


        //=======================================================
        // Emit Open Event
        //=======================================================

        this.opened.emit();


        //=======================================================
        // Refresh OnPush View
        //=======================================================

        this.changeDetectorRef.markForCheck();
    }


    //===========================================================
    // OPEN NOTIFICATION PANEL — AUTOMATIC
    // ----------------------------------------------------------
    // Opens the panel for a fixed duration.
    //
    // IMPORTANT:
    //
    //     Automatic opening NEVER marks notifications as read.
    //
    // Therefore:
    //
    //     Counter remains visible.
    //
    //     Notification remains unread.
    //
    //     Panel closes automatically.
    //
    //     Counter remains after automatic close.
    //===========================================================

    openPanelForDuration(
        duration:
            number
    ):void
    {
        if(
            !this.config.visible
        )
        {
            return;
        }


        //=======================================================
        // Validate Duration
        //=======================================================

        if(
            duration <= 0
        )
        {
            return;
        }


        //=======================================================
        // Cancel Existing Automatic Timer
        //=======================================================

        this.clearAutoCloseTimer();


        //=======================================================
        // Mark As Automatic
        //=======================================================

        this.isAutoOpened =
            true;


        //=======================================================
        // Open Panel
        // -------------------------------------------------------
        // IMPORTANT:
        //
        // Do NOT call openPanel().
        //
        // openPanel() is specifically for manual interaction
        // and would mark notifications as read.
        //=======================================================

        this.isPanelOpen =
            true;


        //=======================================================
        // Emit Open Event
        //=======================================================

        this.opened.emit();


        //=======================================================
        // Refresh View
        //=======================================================

        this.changeDetectorRef.markForCheck();


        //=======================================================
        // Automatic Close Timer
        //=======================================================

        this.autoCloseTimer =
            setTimeout(
                ():void =>
                {
                    //===========================================
                    // Clear Timer Reference
                    //===========================================

                    this.autoCloseTimer =
                        null;


                    //===========================================
                    // Automatic Display Finished
                    //
                    // IMPORTANT:
                    //
                    // DO NOT mark notifications as read here.
                    //===========================================

                    this.isAutoOpened =
                        false;


                    //===========================================
                    // Close Only
                    //===========================================

                    if(
                        this.isPanelOpen
                    )
                    {
                        this.isPanelOpen =
                            false;


                        this.closed.emit();
                    }


                    //===========================================
                    // Refresh View
                    //===========================================

                    this.changeDetectorRef.markForCheck();
                },

                duration
            );
    }


    //===========================================================
    // CLOSE NOTIFICATION PANEL
    // ----------------------------------------------------------
    // Closes the panel WITHOUT changing unread/read state.
    //
    // This is important for:
    //
    //     - Automatic close
    //     - Outside click
    //     - Close button
    //
    // Read state changes only through intentional user viewing.
    //===========================================================

    closePanel():void
    {
        //=======================================================
        // Cancel Automatic Timer
        //=======================================================

        this.clearAutoCloseTimer();


        //=======================================================
        // Panel Already Closed
        //=======================================================

        if(
            !this.isPanelOpen
        )
        {
            this.isAutoOpened =
                false;

            return;
        }


        //=======================================================
        // Close Panel
        //=======================================================

        this.isPanelOpen =
            false;


        this.isAutoOpened =
            false;


        //=======================================================
        // Emit Close Event
        //=======================================================

        this.closed.emit();


        //=======================================================
        // Refresh View
        //=======================================================

        this.changeDetectorRef.markForCheck();
    }


    //===========================================================
    // CLEAR AUTOMATIC CLOSE TIMER
    //===========================================================

    private clearAutoCloseTimer():void
    {
        if(
            this.autoCloseTimer === null
        )
        {
            return;
        }


        clearTimeout(
            this.autoCloseTimer
        );


        this.autoCloseTimer =
            null;
    }


    //===========================================================
    // ADD NOTIFICATION
    // ----------------------------------------------------------
    // Adds a new notification to the TOP of the list.
    //
    // New notifications are ALWAYS:
    //
    //     visible = true
    //     isRead  = false
    //
    // If openForDuration is supplied:
    //
    //     1. Notification is added.
    //     2. Counter immediately increases.
    //     3. Panel immediately opens.
    //     4. Notification remains unread.
    //     5. Panel closes after requested duration.
    //     6. Counter remains visible.
    //
    // The notification becomes read only when the user manually
    // interacts with the Notification Panel.
    //===========================================================

    addNotification(
        notification:
            LoginPageNotificationInput,

        openForDuration:
            number =
                0
    ):number
    {
        //=======================================================
        // Generate Next Notification ID
        //=======================================================

        const nextId:
            number =
            this.config.notifications.length > 0
                ? Math.max(
                    ...this.config.notifications.map(
                        (
                            currentNotification:
                                LoginPageNotification
                        ):number =>
                            currentNotification.id
                    )
                ) + 1
                : 1;


        //=======================================================
        // Create New Notification
        //=======================================================

        const newNotification:
            LoginPageNotification =
        {
            id:
                nextId,

            visible:
                true,

            isRead:
                false,

            heading:
                notification.heading,

            message:
                notification.message,

            icon:
                notification.icon
                ||
                this.getDefaultIcon(
                    notification.type
                ),

            type:
                notification.type,

            dismissible:
                notification.dismissible,

            autoHide:
                notification.autoHide,

            displayDuration:
                notification.displayDuration
        };


        //=======================================================
        // Add To Beginning Of List
        //=======================================================

        this.config =
        {
            ...this.config,

            notifications:
            [
                newNotification,

                ...this.config.notifications
            ]
        };


        //=======================================================
        // Notify Parent
        //=======================================================

        this.configChange.emit(
            this.config
        );


        //=======================================================
        // Refresh View
        //=======================================================

        this.changeDetectorRef.markForCheck();


        //=======================================================
        // AUTOMATIC DISPLAY
        // -------------------------------------------------------
        // This is intentionally executed AFTER adding the
        // notification so the counter is already updated.
        //=======================================================

        if(
            openForDuration > 0
        )
        {
            this.openPanelForDuration(
                openForDuration
            );
        }


        //=======================================================
        // Return Generated ID
        //=======================================================

        return nextId;
    }


    //===========================================================
    // UPDATE PANEL CONFIGURATION
    //===========================================================

    updateConfig(
        changes:
            Partial<LoginPageNotificationPanelConfig>
    ):void
    {
        this.config =
        {
            ...this.config,

            ...changes
        };


        //=======================================================
        // Panel Disabled
        //=======================================================

        if(
            !this.config.visible
        )
        {
            this.closePanel();

            this.configChange.emit(
                this.config
            );

            this.changeDetectorRef.markForCheck();

            return;
        }


        //=======================================================
        // Notify Parent
        //=======================================================

        this.configChange.emit(
            this.config
        );


        //=======================================================
        // Refresh View
        //=======================================================

        this.changeDetectorRef.markForCheck();
    }


    //===========================================================
    // UPDATE INDIVIDUAL NOTIFICATION
    //===========================================================

    updateNotification(
        index:number,
        changes:
            Partial<LoginPageNotification>
    ):void
    {
        if(
            index < 0
            ||
            index >= this.config.notifications.length
        )
        {
            return;
        }


        const notifications:
            LoginPageNotification[] =
            this.config.notifications.map(
                (
                    notification:
                        LoginPageNotification,

                    notificationIndex:
                        number
                ):
                    LoginPageNotification =>
                {
                    if(
                        notificationIndex !== index
                    )
                    {
                        return notification;
                    }


                    return {
                        ...notification,

                        ...changes
                    };
                }
            );


        this.config =
        {
            ...this.config,

            notifications:
                notifications
        };


        this.configChange.emit(
            this.config
        );


        this.changeDetectorRef.markForCheck();
    }


    //===========================================================
    // MARK NOTIFICATION AS READ BY ID
    // ----------------------------------------------------------
    // This is the preferred method for the HTML notification
    // item click.
    //
    // It avoids index problems when notifications are filtered
    // through visibleNotifications.
    //===========================================================

    markAsReadById(
        notificationId:
            number
    ):void
    {
        const notification:
            LoginPageNotification | undefined =
            this.config.notifications.find(
                (
                    currentNotification:
                        LoginPageNotification
                ):boolean =>
                    currentNotification.id ===
                    notificationId
            );


        if(
            !notification
        )
        {
            return;
        }


        if(
            notification.isRead
        )
        {
            return;
        }


        this.config =
        {
            ...this.config,

            notifications:
                this.config.notifications.map(
                    (
                        currentNotification:
                            LoginPageNotification
                    ):
                        LoginPageNotification =>
                    {
                        if(
                            currentNotification.id !==
                            notificationId
                        )
                        {
                            return currentNotification;
                        }


                        return {
                            ...currentNotification,

                            isRead:
                                true
                        };
                    }
                )
        };


        this.configChange.emit(
            this.config
        );


        this.notificationViewed.emit(
            notificationId
        );


        this.changeDetectorRef.markForCheck();
    }


    //===========================================================
    // MARK NOTIFICATION AS READ
    // ----------------------------------------------------------
    // Kept for compatibility with existing code.
    //
    // The index refers to the COMPLETE notification array.
    // For visible notification HTML, use markAsReadById().
    //===========================================================

    markAsRead(
        index:
            number
    ):void
    {
        if(
            index < 0
            ||
            index >= this.config.notifications.length
        )
        {
            return;
        }


        const notification:
            LoginPageNotification =
            this.config.notifications[index];


        this.markAsReadById(
            notification.id
        );
    }


    //===========================================================
    // MARK VISIBLE NOTIFICATIONS AS READ
    // ----------------------------------------------------------
    // Used ONLY by manual user viewing.
    //
    // NEVER called during automatic display.
    //===========================================================

    private markVisibleNotificationsAsRead():void
    {
        const unreadNotifications:
            LoginPageNotification[] =
            this.config.notifications.filter(
                (
                    notification:
                        LoginPageNotification
                ):boolean =>
                    notification.visible
                    &&
                    !notification.isRead
            );


        if(
            unreadNotifications.length === 0
        )
        {
            return;
        }


        const unreadIds:
            Set<number> =
            new Set(
                unreadNotifications.map(
                    (
                        notification:
                            LoginPageNotification
                    ):number =>
                        notification.id
                )
            );


        const notifications:
            LoginPageNotification[] =
            this.config.notifications.map(
                (
                    notification:
                        LoginPageNotification
                ):
                    LoginPageNotification =>
                {
                    if(
                        unreadIds.has(
                            notification.id
                        )
                    )
                    {
                        return {
                            ...notification,

                            isRead:
                                true
                        };
                    }


                    return notification;
                }
            );


        this.config =
        {
            ...this.config,

            notifications:
                notifications
        };


        //=======================================================
        // Emit Viewed Events
        //=======================================================

        unreadNotifications.forEach(
            (
                notification:
                    LoginPageNotification
            ):void =>
            {
                this.notificationViewed.emit(
                    notification.id
                );
            }
        );


        //=======================================================
        // Notify Parent
        //=======================================================

        this.configChange.emit(
            this.config
        );


        //=======================================================
        // Refresh View
        //=======================================================

        this.changeDetectorRef.markForCheck();
    }


    //===========================================================
    // MARK ALL NOTIFICATIONS AS READ
    //===========================================================

    markAllAsRead():void
    {
        const unreadNotifications:
            LoginPageNotification[] =
            this.config.notifications.filter(
                (
                    notification:
                        LoginPageNotification
                ):boolean =>
                    notification.visible
                    &&
                    !notification.isRead
            );


        if(
            unreadNotifications.length === 0
        )
        {
            return;
        }


        const unreadIds:
            Set<number> =
            new Set(
                unreadNotifications.map(
                    (
                        notification:
                            LoginPageNotification
                    ):number =>
                        notification.id
                )
            );


        const notifications:
            LoginPageNotification[] =
            this.config.notifications.map(
                (
                    notification:
                        LoginPageNotification
                ):
                    LoginPageNotification =>
                {
                    if(
                        unreadIds.has(
                            notification.id
                        )
                    )
                    {
                        return {
                            ...notification,

                            isRead:
                                true
                        };
                    }


                    return notification;
                }
            );


        this.config =
        {
            ...this.config,

            notifications:
                notifications
        };


        //=======================================================
        // Emit Viewed Events
        //=======================================================

        unreadNotifications.forEach(
            (
                notification:
                    LoginPageNotification
            ):void =>
            {
                this.notificationViewed.emit(
                    notification.id
                );
            }
        );


        //=======================================================
        // Notify Parent
        //=======================================================

        this.configChange.emit(
            this.config
        );


        //=======================================================
        // Refresh View
        //=======================================================

        this.changeDetectorRef.markForCheck();
    }


    //===========================================================
    // DISMISS NOTIFICATION BY ID
    // ----------------------------------------------------------
    // Preferred method for the notification HTML.
    //===========================================================

    dismissById(
        notificationId:
            number
    ):void
    {
        const notification:
            LoginPageNotification | undefined =
            this.config.notifications.find(
                (
                    currentNotification:
                        LoginPageNotification
                ):boolean =>
                    currentNotification.id ===
                    notificationId
            );


        if(
            !notification
        )
        {
            return;
        }


        this.config =
        {
            ...this.config,

            notifications:
                this.config.notifications.map(
                    (
                        currentNotification:
                            LoginPageNotification
                    ):
                        LoginPageNotification =>
                    {
                        if(
                            currentNotification.id !==
                            notificationId
                        )
                        {
                            return currentNotification;
                        }


                        return {
                            ...currentNotification,

                            visible:
                                false
                        };
                    }
                )
        };


        this.configChange.emit(
            this.config
        );


        this.dismissed.emit(
            notificationId
        );


        this.changeDetectorRef.markForCheck();


        //=======================================================
        // Close Panel If Nothing Remains
        //=======================================================

        if(
            this.visibleNotifications.length === 0
        )
        {
            this.closePanel();
        }
    }


    //===========================================================
    // DISMISS INDIVIDUAL NOTIFICATION
    // ----------------------------------------------------------
    // Kept for compatibility with existing code.
    //===========================================================

    dismiss(
        index:
            number
    ):void
    {
        if(
            index < 0
            ||
            index >= this.config.notifications.length
        )
        {
            return;
        }


        const notification:
            LoginPageNotification =
            this.config.notifications[index];


        this.dismissById(
            notification.id
        );
    }


    //===========================================================
    // GET DEFAULT NOTIFICATION ICON
    //===========================================================

    private getDefaultIcon(
        type:
            LoginPageNotificationType
    ):string
    {
        switch(
            type
        )
        {
            case 'success':

                return 'fas fa-check-circle';


            case 'warning':

                return 'fas fa-exclamation-triangle';


            case 'error':

                return 'fas fa-times-circle';


            case 'info':
            default:

                return 'fas fa-info-circle';
        }
    }


    //===========================================================
    // NOTIFICATION TYPE CLASS
    //===========================================================

    getNotificationTypeClass(
        notification:
            LoginPageNotification
    ):string
    {
        return `notification-type-${notification.type}`;
    }


    //===========================================================
    // NOTIFICATION ICON
    //===========================================================

    getNotificationIcon(
        notification:
            LoginPageNotification
    ):string
    {
        if(
            notification.icon
        )
        {
            return notification.icon;
        }


        return this.getDefaultIcon(
            notification.type
        );
    }


    //===========================================================
    // VISIBLE NOTIFICATIONS
    //===========================================================

    get visibleNotifications():
        LoginPageNotification[]
    {
        return this.config.notifications.filter(
            (
                notification:
                    LoginPageNotification
            ):boolean =>
                notification.visible
        );
    }


    //===========================================================
    // UNREAD NOTIFICATIONS
    //===========================================================

    get unreadNotifications():
        LoginPageNotification[]
    {
        return this.config.notifications.filter(
            (
                notification:
                    LoginPageNotification
            ):boolean =>
                notification.visible
                &&
                !notification.isRead
        );
    }


    //===========================================================
    // UNREAD NOTIFICATION COUNT
    //===========================================================

    get unreadNotificationCount():number
    {
        return this.unreadNotifications.length;
    }


    //===========================================================
    // HAS VISIBLE NOTIFICATIONS
    //===========================================================

    get hasVisibleNotifications():boolean
    {
        return this.visibleNotifications.length > 0;
    }


    //===========================================================
    // HAS UNREAD NOTIFICATIONS
    //===========================================================

    get hasUnreadNotifications():boolean
    {
        return this.unreadNotificationCount > 0;
    }


    //===========================================================
    // TRACK NOTIFICATION
    //===========================================================

    trackNotification(
        index:
            number,

        notification:
            LoginPageNotification
    ):string
    {
        return `${notification.id}-${index}`;
    }
}