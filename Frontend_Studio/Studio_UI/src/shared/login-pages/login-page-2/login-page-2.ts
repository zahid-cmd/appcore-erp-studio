//===============================================================
// Login Page 2
//===============================================================

import
{
    Component
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
// Login Page 2 Background
//===============================================================

import
{
    LoginPageBackgroundComponent
}
from '../../components/login-page-2/background/background';


//===============================================================
// Login Page 2 Promotional Image Light
//===============================================================

import
{
    LoginPagePromotionalImageLightComponent
}
from '../../components/login-page-2/promotional-image-light/promotional-image-light';


//===============================================================
// Login Page 2 Promotional Image Deep
//===============================================================

import
{
    LoginPagePromotionalImageDeepComponent
}
from '../../components/login-page-2/promotional-image-deep/promotional-image-deep';


//===============================================================
// Login Page 2 Client Logo
//===============================================================

import
{
    LoginPageClientLogoComponent
}
from '../../components/login-page-2/client-logo/client-logo';


//===============================================================
// Login Page 2 Powered By
//===============================================================

import
{
    LoginPagePoweredByComponent
}
from '../../components/login-page-2/powered-by/powered-by';


//===============================================================
// Login Page 2 Login Panel
//===============================================================

import
{
    LoginPageLoginPanelComponent
}
from '../../components/login-page-2/login-panel/login-panel';


//===============================================================
// Login Page 2 Component
//===============================================================

@Component
({
    selector:
        'app-login-page-2',

    standalone:
        true,

    imports:
    [
        CommonModule,

        LoginPageBackgroundComponent,

        LoginPagePromotionalImageLightComponent,

        LoginPagePromotionalImageDeepComponent,

        LoginPageClientLogoComponent,

        LoginPagePoweredByComponent,

        LoginPageLoginPanelComponent
    ],

    templateUrl:
        './login-page-2.html',

    styleUrls:
    [
        './login-page-2.css'
    ]
})


//===============================================================
// Login Page 2
//===============================================================

export class LoginPage2
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
    }



    //===========================================================
    // Back To Login
    //===========================================================

    onBackToLogin():
        void
    {
        this.loginError =
            '';
    }
}