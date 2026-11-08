//===============================================================
// Imports
//===============================================================

import
{
    Component,
    inject
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    Router
}
from '@angular/router';


//===============================================================
// Layout Components
//===============================================================

import
{
    TopbarHeaderComponent
}
from '../../shared/components/layout/topbar-header/topbar-header';

import
{
    TopbarActionsComponent
}
from '../../shared/components/layout/topbar-actions/topbar-actions';

import
{
    TopbarSearchComponent
}
from '../../shared/components/layout/topbar-search/topbar-search';

import
{
    TopbarContextComponent
}
from '../../shared/components/layout/topbar-context/topbar-context';

import
{
    TopbarSwitchesComponent
}
from '../../shared/components/layout/topbar-switches/topbar-switches';

import
{
    TopbarCalculatorComponent
}
from '../../shared/components/layout/topbar-calculator/topbar-calculator';


//===============================================================
// Change Password
//===============================================================

import
{
    ChangePasswordComponent
}
from '../../shared/components/core-components/change-password/change-password';


//===============================================================
// Authentication
//===============================================================

import
{
    AuthenticationStorageService
}
from '../../core/authentication/authentication-storage.service';


//===============================================================
// User Profile (Profile menu : own profile's public id)
//===============================================================

import
{
    UserProfileService
}
from '../../features/security-permission/user-management/services/user-profile.service';


//===============================================================
// Toast Service
//===============================================================

import
{
    ToastService
}
from '../../shared/components/utilities/toast/toast.service';


//===============================================================
// Confirmation Dialog
//===============================================================

import
{
    ConfirmDialogComponent
}
from '../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ConfirmDialogService
}
from '../../shared/components/utilities/confirm-dialog/confirm-dialog.service';


//===============================================================
// Component
//===============================================================

@Component
({
    selector:
        'app-topbar',

    standalone:
        true,

    imports:
    [
        CommonModule,

        TopbarHeaderComponent,

        TopbarActionsComponent,

        TopbarSearchComponent,

        TopbarContextComponent,

        TopbarSwitchesComponent,

        TopbarCalculatorComponent,

        ChangePasswordComponent,

        ConfirmDialogComponent
    ],

    templateUrl:
        './topbar.html',

    styleUrls:
    [
        './topbar.css'
    ]
})


//===============================================================
// Topbar Component
//===============================================================

export class TopbarComponent
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly router =
        inject(Router);


    private readonly authenticationStorageService =
        inject(
            AuthenticationStorageService
        );


    private readonly toast =
        inject(
            ToastService
        );


    private readonly userProfileService =
        inject(
            UserProfileService
        );


    private readonly confirmDialog =
        inject(
            ConfirmDialogService
        );


    //===========================================================
    // Change Password
    // ----------------------------------------------------------
    // IMPORTANT:
    //
    // changePasswordMounted
    //
    //     Keeps the ChangePasswordComponent alive so that its
    //     form values are preserved when the confirmation dialog
    //     is cancelled.
    //
    // changePasswordOpened
    //
    //     Controls whether the Change Password overlay should
    //     currently be visible.
    //
    // The HTML will use these two states separately.
    //===========================================================

    changePasswordMounted:
        boolean =
        false;


    changePasswordOpened:
        boolean =
        false;


    //===========================================================
    // Profile
    // ----------------------------------------------------------
    // Opens the currently authenticated user's User Profile
    // directly in Edit Mode.
    //
    // Flow:
    //
    //     Topbar
    //         ↓
    //     Profile
    //         ↓
    //     Logged-in User Profile ID
    //         ↓
    //     User Profile Edit
    //         ↓
    //     Back
    //         ↓
    //     Dashboard
    //===========================================================

    onProfileClick():
        void
    {
        //=======================================================
        // Get Authenticated User
        //=======================================================

        const authenticatedUser =
            this.authenticationStorageService
                .getUser();


        //=======================================================
        // No Authenticated User
        //=======================================================

        if
        (
            !authenticatedUser
        )
        {
            return;
        }


        //=======================================================
        // Get User Profile ID
        //=======================================================

        const userProfileId =
            Number(
                authenticatedUser.userProfileId
            );


        //=======================================================
        // Validate User Profile ID
        //=======================================================

        if
        (
            !Number.isFinite(
                userProfileId
            )
            ||
            userProfileId <= 0
        )
        {
            console.warn(
                'TOPBAR: Invalid authenticated User Profile ID.',
                authenticatedUser.userProfileId
            );

            return;
        }


        //=======================================================
        // Navigate To User Profile Edit
        // The edit page takes the public id (uuid), not the
        // internal number : look it up first.
        //=======================================================

        this.userProfileService
            .getByInternalId(
                userProfileId
            )
            .subscribe(
            {
                next:
                    profile =>
                    {
                        const publicId =
                            String(
                                (profile as any)?.publicId
                                ??
                                (profile as any)?.PublicId
                                ??
                                ''
                            )
                            .trim();

                        if
                        (
                            publicId.length === 0
                        )
                        {
                            this.toast.error(
                                'Error',
                                'Could not open your profile.'
                            );

                            return;
                        }

                        void this.router.navigate
                        (
                            [
                                '/security-permission',

                                'user-management',

                                'user-profile',

                                'edit',

                                publicId
                            ],
                            {
                                queryParams:
                                {
                                    source:
                                        'profile'
                                }
                            }
                        );
                    },

                error:
                    () =>
                    {
                        this.toast.error(
                            'Error',
                            'Could not open your profile.'
                        );
                    }
            });
    }


    //===========================================================
    // Change Password Click
    // ----------------------------------------------------------
    // The Change Password panel must NOT open immediately.
    //
    // First:
    //
    //     Change Password
    //           ↓
    //     Confirmation Dialog
    //
    // Only after the user confirms:
    //
    //     Confirm
    //       ↓
    //     Change Password Panel
    //===========================================================

    onChangePasswordClick():
        void
    {
        this.confirmDialog.open
        (
            'Change Password',

            'Are you sure you want to open the Change Password panel?',

            () =>
            {
                this.openChangePassword();
            },

            'Continue',

            'Cancel',

            'primary'
        );
    }


    //===========================================================
    // Open Change Password
    // ----------------------------------------------------------
    // First opening:
    //
    //     Mount component
    //     Show component
    //
    // Subsequent opening:
    //
    //     Reuse existing component
    //     Preserve its state
    //===========================================================

    private openChangePassword():
        void
    {
        this.changePasswordMounted =
            true;

        this.changePasswordOpened =
            true;
    }


    //===========================================================
    // Change Password Close
    // ----------------------------------------------------------
    // IMPORTANT:
    //
    // Do NOT unmount the component here.
    //
    // The ChangePasswordComponent emits close immediately before
    // opening its confirmation dialog.
    //
    // The component must remain mounted so that:
    //
    //     Confirm → execute update
    //
    // and:
    //
    //     Cancel → reopen
    //
    // can both operate on the same component instance.
    //
    // The HTML visibility state will be handled separately.
    //===========================================================

    onChangePasswordClose():
        void
    {
        this.changePasswordOpened =
            false;
    }


    //===========================================================
    // Change Password Reopen
    // ----------------------------------------------------------
    // Called when the confirmation dialog is cancelled.
    //
    // IMPORTANT:
    //
    // The ChangePasswordComponent remains mounted, therefore
    // the same form instance is restored with all entered values.
    //===========================================================

    onChangePasswordReopen():
        void
    {
        this.changePasswordMounted =
            true;

        this.changePasswordOpened =
            true;
    }


    //===========================================================
    // Change Password Update
    // ----------------------------------------------------------
    // The ChangePasswordComponent emits this event only after
    // the backend has successfully changed the password and
    // the minimum progress-dialog display time has completed.
    //
    // Successful flow:
    //
    //     Password Updated
    //           ↓
    //     Success Toast
    //           ↓
    //     Clear Authentication
    //           ↓
    //     Close Modal
    //           ↓
    //     Login Page
    //===========================================================

    onChangePasswordUpdate():
        void
    {
        //=======================================================
        // Show Success Toast
        //=======================================================

        this.toast.success
        (
            'Success',

            'Password changed successfully.'
        );


        //=======================================================
        // Clear Authentication
        // ------------------------------------------------------
        // The existing authentication session is cleared so
        // the user must authenticate again using the new
        // password.
        //=======================================================

        this.authenticationStorageService
            .clearAuthentication();


        //=======================================================
        // Close Change Password
        //=======================================================

        this.changePasswordOpened =
            false;


        //=======================================================
        // Unmount Change Password
        // ------------------------------------------------------
        // At this point the complete operation has finished.
        // It is now safe to destroy the component.
        //=======================================================

        this.changePasswordMounted =
            false;


        //=======================================================
        // Navigate To Login
        //=======================================================

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
