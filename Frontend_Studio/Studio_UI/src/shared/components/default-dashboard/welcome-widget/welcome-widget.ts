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


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'app-welcome-widget',

    standalone:
        true,

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

    userFirstName:
        string =
        'John';


    userLastName:
        string =
        'Doe';



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
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
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