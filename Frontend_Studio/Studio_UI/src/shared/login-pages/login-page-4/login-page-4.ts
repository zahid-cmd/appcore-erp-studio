//===============================================================
// Login Page 4
//===============================================================

import
{
    Component,
    ViewChild
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';


//===============================================================
// Login Page 4 Promotional Image Light
//===============================================================



//===============================================================
// Login Page 4 Promotional Image Deep
//===============================================================


//===============================================================
// Login Page 4 Branding
//===============================================================



//===============================================================
// Login Page 4 Powered By
//===============================================================



//===============================================================
// Central Login Panel
//===============================================================

import
{
    LoginPageLoginPanelComponent
}
from '../../components/login-credentials/login-panel/login-panel';


//===============================================================
// Central Registration Panel
//===============================================================

import
{
    LoginPageRegistrationPanelComponent
}
from '../../components/login-credentials/registration-panel/registration-panel';


//===============================================================
// Central Forget Password Panel
//===============================================================

import
{
    LoginPageForgetPasswordPanelComponent
}
from '../../components/login-credentials/forget-password/forget-password';


//===============================================================
// Login Page 4 Theme Selector
//===============================================================


//===============================================================
// Central Notification Panel
//===============================================================

import
{
    LoginPageNotificationPanelComponent
}
from '../../components/login-credentials/notification-panel/notification-panel';


//===============================================================
// Login Page 4 Component
//===============================================================

@Component
({
    selector:
        'app-login-page-4',

    standalone:
        true,

    imports:
    [
        CommonModule,

        LoginPageLoginPanelComponent,

        LoginPageRegistrationPanelComponent,

        LoginPageForgetPasswordPanelComponent,

        LoginPageNotificationPanelComponent
    ],

    templateUrl:
        './login-page-4.html',

    styleUrls:
    [
        './login-page-4.css'
    ]
})


//===============================================================
// Login Page 4
//===============================================================

export class LoginPage4
{
    //===========================================================
    // Notification Panel Reference
    //===========================================================

    @ViewChild(
        LoginPageNotificationPanelComponent
    )
    private notificationPanel:
        LoginPageNotificationPanelComponent
        |
        undefined;


    //===========================================================
    // Panel State
    // ----------------------------------------------------------
    // false = Login Panel
    // true  = Registration Panel
    //===========================================================

    isRegistrationMode:
        boolean =
            false;


    //===========================================================
    // Forget Password State
    // ----------------------------------------------------------
    // false = Normal Login / Registration State
    // true  = Forget Password Panel
    //===========================================================

    isForgetPasswordMode:
        boolean =
            false;


    //===========================================================
    // Theme State
    //===========================================================

    isLightTheme:
        boolean =
            true;


    //===========================================================
    // Theme Selector
    //===========================================================

    onThemeChange
    (
        isLightTheme:
            boolean
    ):
        void
    {
        this.isLightTheme =
            isLightTheme;
    }


    //===========================================================
    // Forgot Password
    //===========================================================

    onForgotPassword():
        void
    {
        this.isRegistrationMode =
            false;

        this.isForgetPasswordMode =
            true;
    }


    //===========================================================
    // Password Reset Success
    // ----------------------------------------------------------
    // The Forget Password Panel does NOT display the successful
    // password-reset message.
    //
    // Instead Login Page 4:
    //
    //     1. Returns immediately to Login Panel.
    //     2. Creates a Password Changed notification.
    //     3. Keeps the notification UNREAD.
    //     4. Automatically opens the Notification Panel.
    //     5. Keeps it open for 5 seconds.
    //     6. Automatically closes the panel.
    //     7. Keeps the unread counter visible.
    //
    // The notification becomes READ only when the user manually
    // opens/interacts with the Notification Panel.
    //===========================================================

    onPasswordResetSuccess():
        void
    {
        //=======================================================
        // Return To Login Panel
        //=======================================================

        this.onBackToLogin();


        //=======================================================
        // Notification Panel Reference Check
        //=======================================================

        if(
            !this.notificationPanel
        )
        {
            return;
        }


        //=======================================================
        // Add Password Changed Notification
        // -------------------------------------------------------
        // The second argument controls automatic opening.
        //
        // 5000 milliseconds = 5 seconds.
        //
        // The notification itself remains UNREAD after the
        // automatic panel close.
        //=======================================================

        this.notificationPanel.addNotification
        (
            {
                visible:
                    true,

                isRead:
                    false,

                heading:
                    'Password Changed',

                message:
                    'Your password was changed successfully. You can now sign in using your new password.',

                icon:
                    'fas fa-key',

                type:
                    'success',

                dismissible:
                    true,

                autoHide:
                    false,

                displayDuration:
                    5000
            },

            5000
        );
    }


    //===========================================================
    // Registration
    //===========================================================

    onRegister():
        void
    {
        this.isForgetPasswordMode =
            false;

        this.isRegistrationMode =
            true;
    }


    //===========================================================
    // Back To Login
    //===========================================================

    onBackToLogin():
        void
    {
        this.isRegistrationMode =
            false;

        this.isForgetPasswordMode =
            false;
    }
}