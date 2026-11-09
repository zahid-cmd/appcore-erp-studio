//===============================================================
// Topbar Actions
// --------------------------------------------------------------
// Clock, notifications bell and the profile menu.
//
// Profile button : photo (initials when none), name, role
//                  (role = PrimaryRoleName from the user's
//                  profile; falls back to the login name)
//                  Same width as the dropdown below it.
// Photo          : UserPhotoData from the user's profile
//                  (same source as the Welcome widget)
// Profile menu   : Profile, Change Password, Switch Branch (only
//                  for a user assigned to two or more active
//                  branches, setting ON; 2026-11-07), Logout
//
// The confirm dialog used by Logout lives in topbar.html
// (one instance for the whole shell).
//===============================================================

import
{
    Component,
    EventEmitter,
    HostListener,
    OnDestroy,
    OnInit,
    Output,
    computed,
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
    ConfirmDialogService
}
from '../../utilities/confirm-dialog/confirm-dialog.service';

import
{
    AuthenticationService
}
from '../../../../core/authentication/authentication.service';

import
{
    AuthenticationStorageService
}
from '../../../../core/authentication/authentication-storage.service';

import
{
    UserProfileService
}
from '../../../../features/security-permission/user-management/services/user-profile.service';

import
{
    TopbarNotificationsComponent
}
from '../topbar-notifications/topbar-notifications';

import
{
    BranchSwitchService
}
from '../../../../core/authentication/branch-switch.service';

import
{
    TopbarFeedbackComponent
}
from '../topbar-feedback/topbar-feedback';


@Component
({
    selector:
        'app-topbar-actions',

    standalone:
        true,

    imports:
    [
        TopbarFeedbackComponent,

        TopbarNotificationsComponent
    ],

    templateUrl:
        './topbar-actions.html',

    styleUrls:
    [
        './topbar-actions.css'
    ]
})
export class TopbarActionsComponent
implements
    OnInit,
    OnDestroy
{

    //===========================================================
    // Dependencies
    //===========================================================

    private readonly authenticationService =
        inject(AuthenticationService);

    private readonly authenticationStorageService =
        inject(AuthenticationStorageService);

    private readonly userProfileService =
        inject(UserProfileService);

    private readonly router =
        inject(Router);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    // Switch Branch : the menu item shows when canSwitch()
    readonly branchSwitch =
        inject(BranchSwitchService);


    //===========================================================
    // Outputs
    //===========================================================

    @Output()
    userMenuClick =
        new EventEmitter<void>();

    @Output()
    profileClick =
        new EventEmitter<void>();

    @Output()
    changePasswordClick =
        new EventEmitter<void>();


    //===========================================================
    // User
    //===========================================================

    readonly userName =
        signal<string>('');

    readonly loginName =
        signal<string>('');

    readonly branchName =
        signal<string>('');

    readonly userRole =
        signal<string>('');

    readonly photoUrl =
        signal<string>('');

    readonly initials =
        computed(
            () =>
            {
                const words =
                    this.userName()
                        .replace(
                            /\b(md|mohammad|mohammed|muhammad)\.?\s+/i,
                            ''
                        )
                        .split(
                            /\s+/
                        )
                        .filter(
                            x =>
                                /[A-Za-z0-9]/.test(
                                    x
                                )
                        );

                if
                (
                    words.length === 0
                )
                {
                    return '?';
                }

                const first =
                    words[0].charAt(0);

                const last =
                    words.length > 1
                    ? words[words.length - 1].charAt(0)
                    : words[0].charAt(1);

                return (
                    first + last
                )
                .toUpperCase();
            }
        );


    //===========================================================
    // Menu
    //===========================================================

    readonly isUserMenuOpen =
        signal<boolean>(false);


    //===========================================================
    // Clock
    //===========================================================

    private readonly now =
        signal<Date>(new Date());

    private clockTimer:
        ReturnType<typeof setInterval> | null =
        null;

    readonly clockTime =
        computed(
            () =>
                this.now()
                    .toLocaleTimeString(
                        'en-US',
                        {
                            hour:
                                'numeric',

                            minute:
                                '2-digit'
                        }
                    )
        );

    readonly clockDate =
        computed(
            () =>
                this.now()
                    .toLocaleDateString(
                        'en-GB',
                        {
                            weekday:
                                'short',

                            day:
                                '2-digit',

                            month:
                                'short',

                            year:
                                'numeric'
                        }
                    )
                    .replace(
                        /^(\w+)\s/,
                        '$1, '
                    )
        );

    readonly clockTitle =
        computed(
            () =>
                this.now()
                    .toLocaleString(
                        'en-GB',
                        {
                            dateStyle:
                                'full',

                            timeStyle:
                                'medium'
                        }
                    )
        );


    //===========================================================
    // Lifecycle
    //===========================================================

    ngOnInit():
        void
    {
        this.loadAuthenticatedUser();

        this.branchSwitch.load();

        this.clockTimer =
            setInterval(
                () =>
                    this.now.set(
                        new Date()
                    ),
                1000
            );
    }


    ngOnDestroy():
        void
    {
        if
        (
            this.clockTimer
        )
        {
            clearInterval(
                this.clockTimer
            );
        }
    }


    //===========================================================
    // Close Menu On Outside Click / Esc
    //===========================================================

    @HostListener
    (
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
        const target =
            event.target as HTMLElement | null;

        if
        (
            target?.closest(
                '.user-account'
            )
        )
        {
            return;
        }

        this.isUserMenuOpen.set(
            false
        );
    }


    @HostListener(
        'document:keydown.escape'
    )
    onEscape():
        void
    {
        this.isUserMenuOpen.set(
            false
        );
    }


    //===========================================================
    // Load Authenticated User
    //===========================================================

    private loadAuthenticatedUser():
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
            this.userName.set(
                ''
            );

            return;
        }

        this.userName.set(
            user.fullName?.trim()
            ||
            user.displayName?.trim()
            ||
            user.userName?.trim()
            ||
            ''
        );

        this.loginName.set(
            user.userName?.trim()
            ||
            ''
        );

        this.branchName.set(
            user.branchName?.trim()
            ||
            ''
        );

        // Until the role arrives, show the login name.
        this.userRole.set(
            this.loginName()
        );

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

        this.userProfileService
            .getByInternalId(
                userProfileId
            )
            .subscribe(
            {
                next:
                    profile =>
                    {
                        const role =
                            (
                                profile?.PrimaryRoleName
                                ??
                                ''
                            )
                            .trim();

                        if
                        (
                            role.length > 0
                        )
                        {
                            this.userRole.set(
                                role
                            );
                        }

                        const photo =
                            (
                                profile?.UserPhotoData
                                ??
                                ''
                            )
                            .trim();

                        this.photoUrl.set(
                            photo
                        );
                    },

                error:
                    () =>
                    {
                        // Keep the login name.
                    }
            });
    }


    onPhotoError():
        void
    {
        // Broken photo: fall back to the initials.
        this.photoUrl.set(
            ''
        );
    }


    //===========================================================
    // User Menu
    //===========================================================

    onUserMenuClick():
        void
    {
        this.isUserMenuOpen.set(
            !this.isUserMenuOpen()
        );

        this.userMenuClick.emit();
    }


    onProfileClick():
        void
    {
        this.isUserMenuOpen.set(
            false
        );

        this.profileClick.emit();
    }


    onChangePasswordClick():
        void
    {
        this.isUserMenuOpen.set(
            false
        );

        this.changePasswordClick.emit();
    }


    //===========================================================
    // Switch Branch (pop-up in app.html)
    //===========================================================

    onSwitchBranchClick():
        void
    {
        this.isUserMenuOpen.set(
            false
        );

        this.branchSwitch.open();
    }


    //===========================================================
    // Logout
    //===========================================================

    onLogout():
        void
    {
        this.isUserMenuOpen.set(
            false
        );

        this.confirmDialog.open
        (
            'Confirm Logout',
            'Are you sure you want to logout from AppCore ERP?',
            () =>
            {
                this.executeLogout();
            },
            'Logout',
            'Cancel',
            'danger'
        );
    }


    private executeLogout():
        void
    {
        this.authenticationService
            .logout();

        void this.router.navigate
        (
            [
                '/login'
            ],
            {
                replaceUrl:
                    true
            }
        );
    }

}
