//===============================================================
// Login Page 1
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

import
{
    Router
}
from '@angular/router';

import
{
    AuthenticationService
}
from '../../../core/authentication/authentication.service';

import
{
    AuthenticationStorageService
}
from '../../../core/authentication/authentication-storage.service';

import
{
    LoginRequest
}
from '../../../core/authentication/authentication.model';


//===============================================================
// Login Page 1 Promotional Image Light
//===============================================================

import
{
    LoginPagePromotionalImageLightComponent
}
from '../../components/login-page-1/promotional-image-light/promotional-image-light';


//===============================================================
// Login Page 1 Promotional Image Deep
//===============================================================

import
{
    LoginPagePromotionalImageDeepComponent
}
from '../../components/login-page-1/promotional-image-deep/promotional-image-deep';


//===============================================================
// Login Page 1 Branding
//===============================================================

import
{
    LoginPageBrandingComponent
}
from '../../components/login-page-1/branding/branding';


//===============================================================
// Login Page 1 Powered By
//===============================================================

import
{
    LoginPagePoweredByComponent
}
from '../../components/login-page-1/powered-by/powered-by';


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
// Login Page 1 Theme Selector
//===============================================================

import
{
    LoginPageThemeSelectorComponent
}
from '../../components/login-page-1/theme-selector/theme-selector';


//===============================================================
// Login Page 1 Notification Panel
//===============================================================

import
{
    LoginPageNotificationPanelComponent
}
from '../../components/login-credentials/notification-panel/notification-panel';


//===============================================================
// Login Page 1 Component
//===============================================================

@Component
({
    selector:
        'app-login-page-1',

    standalone:
        true,

    imports:
    [
        CommonModule,

        LoginPagePromotionalImageLightComponent,

        LoginPagePromotionalImageDeepComponent,

        LoginPageBrandingComponent,

        LoginPagePoweredByComponent,

        LoginPageLoginPanelComponent,

        LoginPageRegistrationPanelComponent,

        LoginPageForgetPasswordPanelComponent,

        LoginPageThemeSelectorComponent,

        LoginPageNotificationPanelComponent
    ],

    templateUrl:
        './login-page-1.html',

    styleUrls:
    [
        './login-page-1.css'
    ]
})


//===============================================================
// Login Page 1
//===============================================================

export class LoginPage1
{
    //===========================================================
    // Notification Panel Reference
    // ----------------------------------------------------------
    // Used by Login Page 1 to create real application
    // notifications.
    //
    // IMPORTANT:
    //
    // The Notification Panel remains completely independent
    // from the Login / Registration / Forget Password panels.
    //===========================================================

    @ViewChild(
        LoginPageNotificationPanelComponent
    )
    private notificationPanel:
        LoginPageNotificationPanelComponent
        |
        undefined;


    //===========================================================
    // Authentication
    //===========================================================

    private readonly authenticationService:
        AuthenticationService;

    private readonly authenticationStorageService:
        AuthenticationStorageService;

    private readonly router:
        Router;


    //===========================================================
    // Login State
    //===========================================================

    isSigningIn:
        boolean =
            false;

    loginError:
        string =
            '';


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
    // Constructor
    //===========================================================

    constructor
    (
        authenticationService:
            AuthenticationService,

        authenticationStorageService:
            AuthenticationStorageService,

        router:
            Router
    )
    {
        this.authenticationService =
            authenticationService;

        this.authenticationStorageService =
            authenticationStorageService;

        this.router =
            router;
    }


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
    // Sign In
    //===========================================================

    onSignIn
    (
        event:
            {
                loginId:
                    string;

                password:
                    string;

                rememberMe:
                    boolean;
            }
    ):
        void
    {
        this.loginError =
            '';

        this.isSigningIn =
            true;


        const request:
            LoginRequest =
        {
            userName:
                event.loginId.trim(),

            password:
                event.password
        };


        this.authenticationService
            .login
            (
                request
            )
            .subscribe
            ({
                next:
                    response =>
                    {
                        this.isSigningIn =
                            false;


                        if
                        (
                            !response.success
                        )
                        {
                            this.loginError =
                                response.message;

                            return;
                        }


                        this.authenticationStorageService
                            .setAuthentication
                            (
                                response
                            );


                        this.router.navigate
                        (
                            [
                                '/dashboard'
                            ]
                        );
                    },


                error:
                    error =>
                    {
                        this.isSigningIn =
                            false;


                        this.loginError =
                            error?.error?.message
                            ||
                            'Unable to sign in. Please try again.';
                    }
            });
    }


    //===========================================================
    // Forgot Password
    //===========================================================

    onForgotPassword():
        void
    {
        this.loginError =
            '';

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
    // Instead Login Page 1:
    //
    //     1. Returns to Login Panel.
    //     2. Creates a real notification.
    //     3. Notification starts UNREAD.
    //     4. Unread counter immediately becomes visible.
    //     5. Notification Panel automatically opens.
    //     6. Panel remains open for 3 seconds.
    //     7. Panel automatically closes.
    //     8. Unread counter REMAINS visible.
    //
    // The notification becomes READ only when the user manually
    // opens/interacts with the Notification Panel.
    //===========================================================

    onPasswordResetSuccess():
        void
    {
        //=======================================================
        // Return To Login Panel
        // -------------------------------------------------------
        // Do this immediately so the user is returned to the
        // normal Sign In screen after successful password reset.
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
        // IMPORTANT:
        //
        // The second argument is 3000 milliseconds.
        //
        // Therefore the Notification Panel will:
        //
        //     OPEN IMMEDIATELY
        //
        //     remain OPEN for:
        //
        //         3000 ms = 3 seconds
        //
        //     then CLOSE automatically.
        //
        // The notification remains UNREAD.
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
        this.loginError =
            '';

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
        this.loginError =
            '';

        this.isRegistrationMode =
            false;

        this.isForgetPasswordMode =
            false;
    }
}