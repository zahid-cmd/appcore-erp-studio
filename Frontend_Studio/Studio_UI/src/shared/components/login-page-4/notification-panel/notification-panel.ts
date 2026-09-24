//===============================================================
// Login Page 1 — Notification Panel
//===============================================================

import
{
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output
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
{
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
        [
            {
                id:
                    1,

                visible:
                    true,

                heading:
                    'Notification',

                message:
                    'Welcome to AppCore Technologies.',

                icon:
                    'fas fa-info-circle',

                type:
                    'info',

                dismissible:
                    true,

                autoHide:
                    false,

                displayDuration:
                    5000
            },

            {
                id:
                    2,

                visible:
                    true,

                heading:
                    'System Ready',

                message:
                    'Your AppCore workspace is ready to use.',

                icon:
                    'fas fa-check-circle',

                type:
                    'success',

                dismissible:
                    true,

                autoHide:
                    false,

                displayDuration:
                    5000
            },

            {
                id:
                    3,

                visible:
                    true,

                heading:
                    'Security Notice',

                message:
                    'Please make sure your account information is secure.',

                icon:
                    'fas fa-shield-alt',

                type:
                    'warning',

                dismissible:
                    true,

                autoHide:
                    false,

                displayDuration:
                    5000
            }
        ]
    };


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

        this.configChange.emit(
            this.config
        );
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
    }


    //===========================================================
    // DISMISS INDIVIDUAL NOTIFICATION
    //===========================================================
    //
    // Only the selected notification is hidden.
    //
    // The other notifications remain unchanged.
    //
    //===========================================================

    dismiss(
        index:number
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
                        visible:
                            false
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

        const notification:
            LoginPageNotification =
            this.config.notifications[index];

        this.dismissed.emit(
            notification.id
        );
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

        switch(
            notification.type
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
    // HAS VISIBLE NOTIFICATIONS
    //===========================================================

    get hasVisibleNotifications():boolean
    {
        return this.visibleNotifications.length > 0;
    }


    //===========================================================
    // TRACK NOTIFICATION
    //===========================================================

    trackNotification(
        index:number,
        notification:
            LoginPageNotification
    ):string
    {
        return `${notification.id}-${index}`;
    }
}