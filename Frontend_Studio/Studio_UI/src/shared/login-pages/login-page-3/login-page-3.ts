//===============================================================
// Login Page 3
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
// Login Page 3 Promotional Image Light
//===============================================================

import
{
    LoginPagePromotionalImageLightComponent
}
from '../../components/login-page-3/promotional-image-light/promotional-image-light';


//===============================================================
// Login Page 3 Promotional Image Deep
//===============================================================

import
{
    LoginPagePromotionalImageDeepComponent
}
from '../../components/login-page-3/promotional-image-deep/promotional-image-deep';


//===============================================================
// Login Page 3 Branding
//===============================================================

import
{
    LoginPageBrandingComponent
}
from '../../components/login-page-3/branding/branding';


//===============================================================
// Login Page 3 Powered By
//===============================================================

import
{
    LoginPagePoweredByComponent
}
from '../../components/login-page-3/powered-by/powered-by';


//===============================================================
// Login Page 3 Login Panel
//===============================================================

import
{
    LoginPageLoginPanelComponent
}
from '../../components/login-page-3/login-panel/login-panel';


//===============================================================
// Login Page 3 Registration Panel
//===============================================================

import
{
    LoginPageRegistrationPanelComponent
}
from '../../components/login-page-3/registration-panel/registration-panel';


//===============================================================
// Login Page 3 Forget Password Panel
//===============================================================

import
{
    LoginPageForgetPasswordPanelComponent
}
from '../../components/login-page-3/forget-password/forget-password';


//===============================================================
// Login Page 3 Theme Selector
//===============================================================

import
{
    LoginPageThemeSelectorComponent
}
from '../../components/login-page-3/theme-selector/theme-selector';


//===============================================================
// Login Page 3 Component
//===============================================================

@Component
({
    selector:
        'app-login-page-3',

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

        LoginPageThemeSelectorComponent
    ],

    templateUrl:
        './login-page-3.html',

    styleUrls:
    [
        './login-page-3.css'
    ]
})


//===============================================================
// Login Page 3
//===============================================================

export class LoginPage3
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