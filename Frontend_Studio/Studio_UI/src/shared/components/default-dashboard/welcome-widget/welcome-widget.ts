//===============================================================
// Imports
//===============================================================

import
{
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


import
{
    environment
}
from '../../../../environments/environment';



//===============================================================
// Component
//===============================================================

@Component(
{
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
// Welcome Widget
//===============================================================

export class WelcomeWidgetComponent
implements
    OnInit,
    OnDestroy
{

    //===========================================================
    // User Information
    //===========================================================

    userDisplayName:
        string =
        '';



    //===========================================================
    // User First Name
    //===========================================================

    userFirstName:
        string =
        '';



    //===========================================================
    // User Last Name
    //===========================================================

    userLastName:
        string =
        '';



    //===========================================================
    // User Profile Photo
    //===========================================================

    userPhotoUrl:
        string =
        '';



    //===========================================================
    // Greeting
    //===========================================================

    greeting:
        string =
        'Good Morning';



    //===========================================================
    // Current Date
    //===========================================================

    currentDate:
        Date =
        new Date();



    //===========================================================
    // Current Time
    //===========================================================

    currentTime:
        Date =
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

    quoteText:
        string =
        'Small steps every day lead to big';


    quoteHighlight:
        string =
        'results.';


    quoteFooter:
        string =
        "Keep going, you're doing great!";



    //===========================================================
    // Timer
    //===========================================================

    private clockTimer:
        ReturnType<typeof setInterval>
        |
        null =
        null;



    //===========================================================
    // Constructor
    //===========================================================

    constructor
    (
        private readonly authenticationStorageService:
            AuthenticationStorageService,

        private readonly userProfileService:
            UserProfileService
    )
    {
    }



    //===========================================================
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.loadAuthenticatedUser();

        this.updateDateTime();


        this.clockTimer =
            setInterval(
                () =>
                {
                    this.updateDateTime();
                },
                1000
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
            this.userDisplayName =
                '';

            this.userFirstName =
                '';

            this.userLastName =
                '';

            this.userPhotoUrl =
                '';

            return;
        }


        //=======================================================
        // Display Name
        //=======================================================

        this.userDisplayName =
            user.displayName?.trim()
            ??
            '';


        //=======================================================
        // First Name
        //=======================================================

        const nameParts =
            this.userDisplayName
                .split(/\s+/)
                .filter(
                    part =>
                        part.length > 0
                );


        this.userFirstName =
            nameParts.length > 0
                ?
                nameParts[0]
                :
                '';


        //=======================================================
        // Last Name
        //=======================================================

        this.userLastName =
            nameParts.length > 1
                ?
                nameParts
                    .slice(1)
                    .join(' ')
                :
                '';


        //=======================================================
        // Load User Profile Photo
        //=======================================================

        if
        (
            !user.userProfileId
        )
        {
            this.userPhotoUrl =
                '';

            return;
        }


        this.userProfileService
            .getById(
                user.userProfileId
            )
            .subscribe(
                profile =>
                {
                    //================================================
                    // Build Photo URL
                    //================================================

                    this.userPhotoUrl =
                        this.buildUserPhotoUrl(
                            profile.UserPhotoPath
                        );
                },

                () =>
                {
                    this.userPhotoUrl =
                        '';
                }
            );
    }



    //===========================================================
    // Build User Photo URL
    //===========================================================

    private buildUserPhotoUrl(
        photoPath:
            string
            |
            undefined
    ):
        string
    {
        if
        (
            !photoPath
            ||
            !photoPath.trim()
        )
        {
            return '';
        }


        const normalizedPath =
            photoPath.trim();


        //=======================================================
        // Absolute URL
        //=======================================================

        if
        (
            normalizedPath.startsWith(
                'http://'
            )
            ||
            normalizedPath.startsWith(
                'https://'
            )
            ||
            normalizedPath.startsWith(
                'data:'
            )
            ||
            normalizedPath.startsWith(
                'blob:'
            )
        )
        {
            return normalizedPath;
        }


        //=======================================================
        // API Base URL
        //=======================================================

        const apiBaseUrl =
            environment.apiUrl.replace(
                /\/api\/?$/,
                ''
            );


        //=======================================================
        // Relative Upload Path
        //=======================================================

        if
        (
            normalizedPath.startsWith('/')
        )
        {
            return `${apiBaseUrl}${normalizedPath}`;
        }


        return `${apiBaseUrl}/${normalizedPath}`;
    }



    //===========================================================
    // User Photo Load Error
    //===========================================================

    onUserPhotoError():
        void
    {
        this.userPhotoUrl =
            '';
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


        //=======================================================
        // Morning
        //=======================================================

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


        //=======================================================
        // Afternoon
        //=======================================================

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


        //=======================================================
        // Evening
        //=======================================================

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


        //=======================================================
        // Night
        //=======================================================

        this.greeting =
            'Good Night';
    }



    //===========================================================
    // First Name
    //===========================================================

    get userFirstNameDisplay():
        string
    {
        return this.userFirstName;
    }



    //===========================================================
    // Last Name
    //===========================================================

    get userLastNameDisplay():
        string
    {
        return this.userLastName;
    }



    //===========================================================
    // Date Display
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
    // Time Display
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