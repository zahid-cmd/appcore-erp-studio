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
    // authenticated user stored by the Login Panel.
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
    // Controls the visibility of the authenticated user's
    // account dropdown menu.
    //
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
    // ----------------------------------------------------------
    // Reads the user information saved during successful login.
    //
    // AuthenticationStorageService stores:
    //
    //     userProfileId
    //     userName
    //     displayName
    //     fullName
    //
    // The Topbar uses Full Name as the primary displayed value.
    // If Full Name is unavailable, Display Name is used.
    // If Display Name is also unavailable, User Name is used.
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
    // ----------------------------------------------------------
    // Opens or closes the authenticated user's account
    // dropdown menu.
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
    // ----------------------------------------------------------
    // Closes the account dropdown and raises the Profile event
    // for the parent component.
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
    // ----------------------------------------------------------
    // Closes the account dropdown and raises the Change Password
    // event for the parent component.
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
    // Clears the authenticated session and returns the user
    // to the Login Page.
    //
    // AuthenticationStorageService removes:
    //
    //     Authentication Token
    //     Authenticated User Information
    //===========================================================

    private executeLogout():
        void
    {
        this.authenticationStorageService
            .clearAuthentication();

        this.router.navigate
        (
            [
                '/login'
            ]
        );
    }

}