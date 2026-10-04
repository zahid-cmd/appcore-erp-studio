//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

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


//===============================================================
// Component
//===============================================================

@Component({
    selector:
        'app-welcome-widget',

    standalone:
        true,

    imports:
        [
            CommonModule
        ],

    templateUrl:
        './welcome-widget.html',

    styleUrl:
        './welcome-widget.css'
})


//===============================================================
// Welcome Widget Component
//===============================================================

export class WelcomeWidgetComponent
    implements OnInit, OnDestroy
{
    //===========================================================
    // User Information
    //===========================================================

    userDisplayName =
        '';

    userFullName =
        '';

    userDesignation =
        '';

    userFirstName =
        '';

    userLastName =
        '';


    //===========================================================
    // Logged In Branch
    //===========================================================

    userBranchName =
        '';


    //===========================================================
    // User Profile Photo
    //===========================================================

    userPhotoUrl =
        '';


    //===========================================================
    // Greeting
    //===========================================================

    greeting =
        'Good Morning';


    //===========================================================
    // Current Date & Time
    //===========================================================

    currentDate =
        new Date();

    currentTime =
        new Date();


    //===========================================================
    // Statistics
    //===========================================================

    statistics =
    {
        tasks:
        {
            value:
                12,

            label:
                'Tasks',

            icon:
                'fas fa-file-lines',

            progress:
                72
        },

        messages:
        {
            value:
                5,

            label:
                'Messages',

            icon:
                'fas fa-envelope',

            progress:
                58
        },

        meetings:
        {
            value:
                3,

            label:
                'Meetings',

            icon:
                'fas fa-calendar-days',

            progress:
                46
        },

        notifications:
        {
            value:
                8,

            label:
                'Notifications',

            icon:
                'fas fa-bell',

            progress:
                68
        }
    };


    //===========================================================
    // Quote
    //===========================================================

    quoteText =
        'Small steps every day lead to big';

    quoteHighlight =
        'results.';

    quoteFooter =
        "Keep going, you're doing great!";


    //===========================================================
    // Clock Timer
    //===========================================================

    private clockTimer:
        ReturnType<typeof setInterval>
        |
        null =
        null;


    //===========================================================
    // Constructor
    //===========================================================

    constructor(
        private readonly authenticationStorageService:
            AuthenticationStorageService,

        private readonly userProfileService:
            UserProfileService,

        private readonly changeDetectorRef:
            ChangeDetectorRef
    )
    {}


    //===========================================================
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.loadAuthenticatedUser();

        this.updateDateTime();

        this.startClock();
    }


    //===========================================================
    // Load Authenticated User
    //===========================================================

    private loadAuthenticatedUser():
        void
    {
        const user =
            this.authenticationStorageService.getUser();


        if
        (
            !user
        )
        {
            this.clearUserInformation();

            return;
        }


        //=======================================================
        // Initial Display Name
        // ------------------------------------------------------
        // This is used immediately while the latest User Profile
        // is being loaded from the server.
        //=======================================================

        this.userDisplayName =
            (
                user.displayName
                ??
                user.fullName
                ??
                user.userName
                ??
                ''
            )
            .trim();


        //=======================================================
        // Initial Full Name
        //=======================================================

        this.userFullName =
            (
                user.fullName
                ??
                this.userDisplayName
                ??
                ''
            )
            .trim();


        //=======================================================
        // Initial Logged In Branch
        // ------------------------------------------------------
        // The branch name is stored during authentication from
        // the selected branch contained in the login response.
        //=======================================================

        this.userBranchName =
            (
                user.branchName
                ??
                ''
            )
            .trim();


        //=======================================================
        // Initial Name Split
        //=======================================================

        this.updateNameParts();


        //=======================================================
        // User Profile ID
        //=======================================================

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
            console.warn(
                'WELCOME WIDGET: Invalid User Profile ID:',
                user.userProfileId
            );

            return;
        }


        //=======================================================
        // Load Latest User Profile
        //=======================================================

        this.loadUserProfile(
            userProfileId
        );
    }


    //===========================================================
    // Load User Profile
    //===========================================================

    private loadUserProfile(
        userProfileId:
            number
    ):
        void
    {
        this.userProfileService
            .getById(
                userProfileId
            )
            .subscribe
            ({
                next:
                    profile =>
                    {
                        //========================================
                        // Display Name
                        //========================================
                        //
                        // IMPORTANT:
                        //
                        // The authenticated user object can contain
                        // an older Display Name because it was loaded
                        // when the user logged in.
                        //
                        // The User Profile API contains the latest
                        // Display Name, so use it here.
                        //
                        //========================================

                        const displayName =
                            profile.DisplayName?.trim()
                            ??
                            '';


                        if
                        (
                            displayName.length > 0
                        )
                        {
                            this.userDisplayName =
                                displayName;

                            this.updateNameParts();
                        }


                        //========================================
                        // Full Name
                        //========================================

                        const fullName =
                            profile.FullName?.trim()
                            ??
                            '';


                        if
                        (
                            fullName.length > 0
                        )
                        {
                            this.userFullName =
                                fullName;
                        }


                        //========================================
                        // Designation
                        //========================================
                        //
                        // PrimaryRoleName is used as the current
                        // designation source because the current
                        // UserProfile DTO does not contain a
                        // separate Designation property.
                        //
                        //========================================

                        const designation =
                            profile.PrimaryRoleName?.trim()
                            ??
                            '';


                        this.userDesignation =
                            designation;


                        //========================================
                        // User Photo Data
                        //========================================

                        const userPhotoData =
                            profile.UserPhotoData?.trim()
                            ??
                            '';


                        //========================================
                        // Set Profile Photo
                        //========================================

                        if
                        (
                            userPhotoData.length > 0
                        )
                        {
                            this.userPhotoUrl =
                                userPhotoData;
                        }
                        else
                        {
                            this.userPhotoUrl =
                                '';
                        }


                        //========================================
                        // Change Detection
                        //========================================

                        this.changeDetectorRef.detectChanges();


                        //========================================
                        // Debug
                        //========================================

                        console.log(
                            'WELCOME WIDGET - USER PROFILE LOADED'
                        );

                        console.log(
                            'WELCOME WIDGET - USER PROFILE ID:',
                            userProfileId
                        );

                        console.log(
                            'WELCOME WIDGET - DISPLAY NAME:',
                            this.userDisplayName
                        );

                        console.log(
                            'WELCOME WIDGET - FULL NAME:',
                            this.userFullName
                        );

                        console.log(
                            'WELCOME WIDGET - DESIGNATION:',
                            this.userDesignation
                        );

                        console.log(
                            'WELCOME WIDGET - BRANCH NAME:',
                            this.userBranchName
                        );

                        console.log(
                            'WELCOME WIDGET - PHOTO DATA AVAILABLE:',
                            this.userPhotoUrl.length > 0
                        );

                        console.log(
                            'WELCOME WIDGET - PHOTO DATA LENGTH:',
                            this.userPhotoUrl.length
                        );
                    },

                error:
                    error =>
                    {
                        console.error(
                            'WELCOME WIDGET - PROFILE LOAD ERROR:',
                            error
                        );

                        this.userPhotoUrl =
                            '';

                        this.userDesignation =
                            '';

                        this.changeDetectorRef.detectChanges();
                    }
            });
    }


    //===========================================================
    // Update Name Parts
    //===========================================================

    private updateNameParts():
        void
    {
        const nameParts =
            this.userDisplayName
                .split(/\s+/)
                .filter(
                    part =>
                        part.length > 0
                );


        this.userFirstName =
            nameParts.length > 0
                ? nameParts[0]
                : '';


        this.userLastName =
            nameParts.length > 1
                ? nameParts
                    .slice(1)
                    .join(' ')
                : '';
    }


    //===========================================================
    // Profile Photo Error
    //===========================================================

    onUserPhotoError():
        void
    {
        console.error(
            'WELCOME WIDGET - PROFILE PHOTO FAILED'
        );
    }


    //===========================================================
    // Clear User Information
    //===========================================================

    private clearUserInformation():
        void
    {
        this.userDisplayName =
            '';

        this.userFullName =
            '';

        this.userDesignation =
            '';

        this.userFirstName =
            '';

        this.userLastName =
            '';

        this.userBranchName =
            '';

        this.userPhotoUrl =
            '';
    }


    //===========================================================
    // Start Clock
    //===========================================================

    private startClock():
        void
    {
        if
        (
            this.clockTimer !==
            null
        )
        {
            return;
        }


        this.clockTimer =
            setInterval
            (
                () =>
                {
                    this.updateDateTime();

                    this.changeDetectorRef.detectChanges();
                },

                1000
            );
    }


    //===========================================================
    // Update Date & Time
    //===========================================================

    private updateDateTime():
        void
    {
        const now =
            new Date();


        this.currentDate =
            now;

        this.currentTime =
            now;


        this.updateGreeting(
            now
        );
    }


    //===========================================================
    // Update Greeting
    //===========================================================

    private updateGreeting(
        date:
            Date
    ):
        void
    {
        const hour =
            date.getHours();


        if
        (
            hour >= 5
            &&
            hour < 12
        )
        {
            this.greeting =
                'Good Morning';

            return;
        }


        if
        (
            hour >= 12
            &&
            hour < 17
        )
        {
            this.greeting =
                'Good Afternoon';

            return;
        }


        if
        (
            hour >= 17
            &&
            hour < 21
        )
        {
            this.greeting =
                'Good Evening';

            return;
        }


        this.greeting =
            'Good Night';
    }


    //===========================================================
    // First Name Display
    //===========================================================

    get userFirstNameDisplay():
        string
    {
        return this.userFirstName;
    }


    //===========================================================
    // Last Name Display
    //===========================================================

    get userLastNameDisplay():
        string
    {
        return this.userLastName;
    }


    //===========================================================
    // Formatted Date
    //===========================================================

    get formattedDate():
        string
    {
        return this.currentDate.toLocaleDateString(
            'en-US',
            {
                weekday:
                    'long',

                month:
                    'long',

                day:
                    'numeric',

                year:
                    'numeric'
            }
        );
    }


    //===========================================================
    // Formatted Time
    //===========================================================

    get formattedTime():
        string
    {
        return this.currentTime.toLocaleTimeString(
            'en-US',
            {
                hour:
                    'numeric',

                minute:
                    '2-digit',

                hour12:
                    true
            }
        );
    }


    //===========================================================
    // Time Value
    //===========================================================

    get timeValue():
        string
    {
        return this.currentTime
            .toLocaleTimeString(
                'en-US',
                {
                    hour:
                        'numeric',

                    minute:
                        '2-digit',

                    hour12:
                        true
                }
            )
            .replace(
                /\s?(AM|PM)$/i,
                ''
            );
    }


    //===========================================================
    // Time Period
    //===========================================================

    get timePeriod():
        string
    {
        return this.currentTime
            .toLocaleTimeString(
                'en-US',
                {
                    hour:
                        'numeric',

                    hour12:
                        true
                }
            )
            .split(' ')
            .pop()
            ??
            '';
    }


    //===========================================================
    // Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        if
        (
            this.clockTimer !==
            null
        )
        {
            clearInterval(
                this.clockTimer
            );

            this.clockTimer =
                null;
        }
    }
}