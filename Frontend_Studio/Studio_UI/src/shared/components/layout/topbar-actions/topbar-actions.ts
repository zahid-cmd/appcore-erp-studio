//===============================================================
// Imports
//===============================================================

import
{
    Component,
    EventEmitter,
    HostListener,
    Input,
    OnInit,
    Output
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

import
{
    SearchBoxComponent
}
from '../../utilities/search-box/search-box';

import
{
    ConfirmDialogComponent
}
from '../../utilities/confirm-dialog/confirm-dialog';

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



//===============================================================
// Topbar Actions Component
//===============================================================

@Component
({
    selector:
        'app-topbar-actions',

    standalone:
        true,

    imports:
    [
        CommonModule,

        SearchBoxComponent,

        ConfirmDialogComponent
    ],

    templateUrl:
        './topbar-actions.html',

    styleUrls:
    [
        './topbar-actions.css'
    ]
})



//===============================================================
// Topbar Actions
//===============================================================

export class TopbarActionsComponent
    implements OnInit
{

    //===========================================================
    // Injection
    //===========================================================

    constructor
    (
        private readonly authenticationService:
            AuthenticationService,

        private readonly authenticationStorageService:
            AuthenticationStorageService,

        private readonly router:
            Router,

        private readonly confirmDialog:
            ConfirmDialogService
    )
    {
    }



    //===========================================================
    // User Name
    // ----------------------------------------------------------
    // The displayed user name is populated from the currently
    // authenticated user stored during successful login.
    //
    // Priority:
    //
    //     1. Full Name
    //     2. Display Name
    //     3. Login User Name
    //===========================================================

    @Input()
    userName:
        string =
            '';



    //===========================================================
    // User Role
    //===========================================================

    @Input()
    userRole:
        string =
            'System Administrator';



    //===========================================================
    // Avatar Icon
    //===========================================================

    @Input()
    avatarIcon:
        string =
            'fas fa-user-circle';



    //===========================================================
    // Search Placeholder
    //===========================================================

    @Input()
    searchPlaceholder:
        string =
            'Search anything...';



    //===========================================================
    // User Menu State
    // ----------------------------------------------------------
    // false = dropdown closed
    // true  = dropdown open
    //===========================================================

    isUserMenuOpen:
        boolean =
            false;



    //===========================================================
    // Search Event
    //===========================================================

    @Output()
    search:
        EventEmitter<string> =
            new EventEmitter<string>();



    //===========================================================
    // User Menu Event
    //===========================================================

    @Output()
    userMenuClick:
        EventEmitter<void> =
            new EventEmitter<void>();



    //===========================================================
    // Profile Event
    //===========================================================

    @Output()
    profileClick:
        EventEmitter<void> =
            new EventEmitter<void>();



    //===========================================================
    // Change Password Event
    //===========================================================

    @Output()
    changePasswordClick:
        EventEmitter<void> =
            new EventEmitter<void>();



    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadAuthenticatedUser();
    }



    //===========================================================
    // Document Click
    // ----------------------------------------------------------
    // Closes the user account dropdown whenever the user clicks
    // outside the User Account area.
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
            event.target as HTMLElement;



        //=======================================================
        // Ignore clicks inside the User Account area
        //=======================================================

        if
        (
            target.closest('.user-account')
        )
        {
            return;
        }



        //=======================================================
        // Close Dropdown
        //=======================================================

        this.isUserMenuOpen =
            false;
    }



    //===========================================================
    // Load Authenticated User
    //===========================================================

    private loadAuthenticatedUser():
        void
    {
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
            this.userName =
                '';

            return;
        }



        //=======================================================
        // Full Name
        //=======================================================

        this.userName =
            authenticatedUser.fullName?.trim()
            ||
            authenticatedUser.displayName?.trim()
            ||
            authenticatedUser.userName?.trim()
            ||
            '';
    }



    //===========================================================
    // Search
    //===========================================================

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.search.emit
        (
            value
        );
    }



    //===========================================================
    // User Menu Click
    //===========================================================

    onUserMenuClick():
        void
    {
        this.isUserMenuOpen =
            !this.isUserMenuOpen;

        this.userMenuClick.emit();
    }



    //===========================================================
    // Profile
    //===========================================================

    onProfileClick():
        void
    {
        this.isUserMenuOpen =
            false;

        this.profileClick.emit();
    }



    //===========================================================
    // Change Password
    //===========================================================

    onChangePasswordClick():
        void
    {
        this.isUserMenuOpen =
            false;

        this.changePasswordClick.emit();
    }



    //===========================================================
    // Logout
    // ----------------------------------------------------------
    // Opens the standard AppCore confirmation dialog before
    // clearing the authenticated session.
    //
    // The authentication session is cleared only after the user
    // confirms the Logout command.
    //===========================================================

    onLogout():
        void
    {
        //=======================================================
        // Close User Menu
        //=======================================================

        this.isUserMenuOpen =
            false;



        //=======================================================
        // Confirm Logout
        //=======================================================

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



    //===========================================================
    // Execute Logout
    // ----------------------------------------------------------
    // Centralized authentication logout:
    //
    //     Topbar Actions
    //          ↓
    //     AuthenticationService.logout()
    //          ↓
    //     AuthenticationStorageService.logout()
    //          ↓
    //     clearAuthentication()
    //          ↓
    //     localStorage cleared
    //     sessionStorage cleared
    //          ↓
    //     /login
    //
    // replaceUrl prevents the authenticated dashboard from
    // remaining as the previous browser history entry.
    //===========================================================

    private executeLogout():
        void
    {
        //=======================================================
        // Clear Authentication
        //=======================================================

        this.authenticationService
            .logout();



        //=======================================================
        // Navigate To Login
        // ------------------------------------------------------
        // replaceUrl prevents returning to the authenticated
        // dashboard through the browser Back button.
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