//===============================================================
// Login Page 1
//===============================================================

import
{
    Component
}
from '@angular/core';

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
// Login Page 1 Background
//===============================================================

import
{
    LoginPageBackgroundComponent
}
from '../../components/login-page-1/background/background';


//===============================================================
// Login Page 1 Branding
//===============================================================

import
{
    LoginPageBrandingComponent
}
from '../../components/login-page-1/branding/branding';


//===============================================================
// Login Page 1 Promotional Panel
//===============================================================

import
{
    LoginPagePromotionalPanelComponent
}
from '../../components/login-page-1/promotional-panel/promotional-panel';


//===============================================================
// Login Page 1 Promotional Image
//===============================================================

import
{
    LoginPagePromotionalImageComponent
}
from '../../components/login-page-1/promotional-image/promotional-image';


//===============================================================
// Login Page 1 Client Logo
//===============================================================

import
{
    LoginPageClientLogoComponent
}
from '../../components/login-page-1/client-logo/client-logo';


//===============================================================
// Login Page 1 Login Panel
//===============================================================

import
{
    LoginPageLoginPanelComponent
}
from '../../components/login-page-1/login-panel/login-panel';


//===============================================================
// Login Page 1 Registration Page
//===============================================================

import
{
    RegistrationPageComponent
}
from '../../components/login-page-1/registration-page/registration-page';


//===============================================================
// Login Page 1 Powered By
//===============================================================

import
{
    LoginPagePoweredByComponent
}
from '../../components/login-page-1/powered-by/powered-by';


//===============================================================
// Login Page 1 Notification Panel
//===============================================================

import
{
    LoginPageNotificationPanelComponent
}
from '../../components/login-page-1/notification-panel/notification-panel';


//===============================================================
// Login Page 1 Footer
//===============================================================

import
{
    LoginPageFooterComponent
}
from '../../components/login-page-1/footer/footer';


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
        LoginPageBackgroundComponent,

        LoginPageBrandingComponent,

        LoginPagePromotionalPanelComponent,

        LoginPagePromotionalImageComponent,

        LoginPageClientLogoComponent,

        LoginPagePoweredByComponent,

        LoginPageNotificationPanelComponent,

        LoginPageFooterComponent,

        LoginPageLoginPanelComponent,

        RegistrationPageComponent
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
    // Registration State
    //===========================================================

    isRegistrationPage:
        boolean =
            false;



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
            'Forgot Password is not available yet.';
    }



    //===========================================================
    // Registration
    //===========================================================

    onRegister():
        void
    {
        this.loginError =
            '';

        this.isRegistrationPage =
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

        this.isRegistrationPage =
            false;
    }
}