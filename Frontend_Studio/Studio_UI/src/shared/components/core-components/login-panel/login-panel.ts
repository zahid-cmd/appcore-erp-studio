//===============================================================
// Imports
//===============================================================

import
{
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    EventEmitter,
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
    FormsModule
}
from '@angular/forms';

import
{
    Router
}
from '@angular/router';

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

import
{
    LoginRequest
}
from '../../../../core/authentication/authentication.model';

import
{
    CompanyService
}
from '../../../../features/settings/general-settings/services/company.service';

import
{
    Company
}
from '../../../../features/settings/general-settings/models/company.model';

import
{
    environment
}
from '../../../../environments/environment';





//===============================================================
// Login Page 1 Login Panel
//===============================================================

export interface LoginPageLoginPanelConfig
{
    visible:
        boolean;

    heading:
        string;

    subtitle:
        string;

    secureLoginVisible:
        boolean;

    secureLoginText:
        string;

    loginIdLabel:
        string;

    loginIdPlaceholder:
        string;

    passwordLabel:
        string;

    passwordPlaceholder:
        string;

    rememberMeVisible:
        boolean;

    rememberMeText:
        string;

    forgotPasswordVisible:
        boolean;

    forgotPasswordText:
        string;

    signInButtonText:
        string;

    signInButtonIcon:
        string;

    signInButtonArrowIcon:
        string;

    orText:
        string;

    registrationVisible:
        boolean;

    registrationIcon:
        string;

    registrationHeading:
        string;

    registrationDescription:
        string;

    registrationButtonText:
        string;
}


//===============================================================
// Login Page 1 Login Panel Component
//===============================================================

@Component
({
    selector:
        'app-login-page-login-panel',

    standalone:
        true,

    imports:
    [
        CommonModule,

        FormsModule
    ],

    templateUrl:
        './login-panel.html',

    styleUrl:
        './login-panel.css',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})





//===============================================================
// Login Page 1 Login Panel
//===============================================================

export class LoginPageLoginPanelComponent
    implements
        OnInit,
        AfterViewInit
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

        private readonly companyService:
            CompanyService,

        private readonly changeDetectorRef:
            ChangeDetectorRef
    )
    {
    }





    //===========================================================
    // Configuration
    //===========================================================

    @Input()
    config:
        LoginPageLoginPanelConfig =
    {
        visible:
            true,

        heading:
            'Sign In',

        subtitle:
            'Access your AppCore Workspace to build a better tomorrow.',

        secureLoginVisible:
            true,

        secureLoginText:
            'Secure Login',

        loginIdLabel:
            'Login ID',

        loginIdPlaceholder:
            'Enter your login ID',

        passwordLabel:
            'Password',

        passwordPlaceholder:
            'Enter your password',

        rememberMeVisible:
            true,

        rememberMeText:
            'Remember me',

        forgotPasswordVisible:
            true,

        forgotPasswordText:
            'Forgot password?',

        signInButtonText:
            'Sign In',

        signInButtonIcon:
            'fas fa-arrow-right-to-bracket',

        signInButtonArrowIcon:
            'fas fa-arrow-right',

        orText:
            'OR',

        registrationVisible:
            true,

        registrationIcon:
            'fas fa-user-plus',

        registrationHeading:
            'Don’t have an account?',

        registrationDescription:
            'Create a new account to get started with AppCore.',

        registrationButtonText:
            'Register Now'
    };





    //===========================================================
    // Configuration Change
    //===========================================================

    @Output()
    configChange:
        EventEmitter<LoginPageLoginPanelConfig> =
            new EventEmitter<LoginPageLoginPanelConfig>();





    //===========================================================
    // Client Branding
    //===========================================================

    clientCompanyName:
        string =
            '';

    clientLogoUrl:
        string =
            '';





    //===========================================================
    // Runtime Login State
    //===========================================================

    loginId:
        string =
            '';

    password:
        string =
            '';

    rememberMe:
        boolean =
            false;

    passwordVisible:
        boolean =
            false;





    //===========================================================
    // Authentication State
    //===========================================================

    isSigningIn:
        boolean =
            false;

    loginError:
        string =
            '';





    //===========================================================
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
        console.log(
            'LOGIN PANEL - ngOnInit'
        );


        //=======================================================
        // Restore Remember Me
        //=======================================================

        this.loadRememberedLogin();


        console.log(
            'LOGIN PANEL - state after loadRememberedLogin:',
            {
                loginId:
                    this.loginId,

                rememberMe:
                    this.rememberMe
            }
        );


        //=======================================================
        // Load Client Branding
        //=======================================================

        this.loadClientBranding();
    }





    //===========================================================
    // After View Initialization
    //===========================================================

    ngAfterViewInit():
        void
    {
        console.log(
            'LOGIN PANEL - ngAfterViewInit'
        );


        console.log(
            'LOGIN PANEL - FINAL VIEW STATE:',
            {
                loginId:
                    this.loginId,

                rememberMe:
                    this.rememberMe
            }
        );


        //=======================================================
        // Ensure OnPush Component Checks Its View
        //=======================================================

        this.changeDetectorRef.markForCheck();

        this.changeDetectorRef.detectChanges();
    }





    //===========================================================
    // Load Remembered Login
    //===========================================================

    private loadRememberedLogin():
        void
    {
        const rememberedLoginId:
            string | null =
                this.authenticationStorageService
                    .getRememberedLoginId();


        console.log(
            'LOGIN PANEL - rememberedLoginId read:',
            rememberedLoginId
        );


        //=======================================================
        // No Remembered Login ID
        //=======================================================

        if
        (
            !rememberedLoginId
            ||
            !rememberedLoginId.trim()
        )
        {
            this.loginId =
                '';

            this.rememberMe =
                false;


            this.changeDetectorRef.markForCheck();

            this.changeDetectorRef.detectChanges();

            return;
        }


        //=======================================================
        // Restore Login ID
        //=======================================================

        this.loginId =
            rememberedLoginId.trim();


        //=======================================================
        // Restore Remember Me
        //=======================================================

        this.rememberMe =
            true;


        console.log(
            'LOGIN PANEL - REMEMBERED LOGIN RESTORED:',
            {
                loginId:
                    this.loginId,

                rememberMe:
                    this.rememberMe
            }
        );


        this.changeDetectorRef.markForCheck();

        this.changeDetectorRef.detectChanges();
    }





    //===========================================================
    // Load Client Branding
    //===========================================================

    private loadClientBranding():
        void
    {
        this.companyService
            .getAll()
            .subscribe
            ({
                next:
                    (companies: Company[]) =>
                    {
                        const activeCompany =
                            companies.find
                            (
                                company =>
                                    company.IsActive === true
                                    &&
                                    (
                                        !!company.CompanyShortName?.trim()
                                        ||
                                        !!company.CompanyName?.trim()
                                    )
                            );


                        //===================================================
                        // No Active Company
                        //===================================================

                        if
                        (
                            !activeCompany
                        )
                        {
                            this.clientCompanyName =
                                '';

                            this.clientLogoUrl =
                                '';

                            this.changeDetectorRef.markForCheck();

                            this.changeDetectorRef.detectChanges();

                            return;
                        }


                        //===================================================
                        // Login Display Name
                        //===================================================

                        this.clientCompanyName =
                            activeCompany.CompanyShortName?.trim()
                            ||
                            activeCompany.CompanyName?.trim()
                            ||
                            '';


                        //===================================================
                        // Company Logo
                        //===================================================

                        this.clientLogoUrl =
                            this.buildLogoUrl
                            (
                                activeCompany.CompanyLogoPath
                            );


                        this.changeDetectorRef.markForCheck();

                        this.changeDetectorRef.detectChanges();
                    },

                error:
                    (
                        error:
                            unknown
                    ) =>
                    {
                        console.error
                        (
                            'Load Client Branding Error',

                            error
                        );


                        this.clientCompanyName =
                            '';

                        this.clientLogoUrl =
                            '';


                        this.changeDetectorRef.markForCheck();

                        this.changeDetectorRef.detectChanges();
                    }
            });
    }





    //===========================================================
    // Build Company Logo URL
    //===========================================================

    private buildLogoUrl
    (
        logoPath:
            string
    ):
        string
    {
        if
        (
            !logoPath
            ||
            !logoPath.trim()
        )
        {
            return '';
        }


        const normalizedPath:
            string =
                logoPath.trim();


        //=======================================================
        // Already Absolute URL
        //=======================================================

        if
        (
            normalizedPath.startsWith('http://')
            ||
            normalizedPath.startsWith('https://')
            ||
            normalizedPath.startsWith('data:')
            ||
            normalizedPath.startsWith('blob:')
        )
        {
            return normalizedPath;
        }


        //=======================================================
        // API Root
        //=======================================================

        const apiUrl:
            string =
                environment.apiUrl
                    .replace
                    (
                        /\/+$/,
                        ''
                    );


        const serverUrl:
            string =
                apiUrl.endsWith('/api')
                    ? apiUrl.substring
                      (
                          0,
                          apiUrl.length - 4
                      )
                    : apiUrl;


        const cleanPath:
            string =
                normalizedPath.startsWith('/')
                    ? normalizedPath
                    : `/${normalizedPath}`;


        return `${serverUrl}${cleanPath}`;
    }





    //===========================================================
    // Configuration Update
    //===========================================================

    updateConfig
    (
        changes:
            Partial<LoginPageLoginPanelConfig>
    ):
        void
    {
        this.config =
        {
            ...this.config,

            ...changes
        };


        this.configChange.emit
        (
            this.config
        );
    }





    //===========================================================
    // Password Visibility
    //===========================================================

    togglePasswordVisibility():
        void
    {
        this.passwordVisible =
            !this.passwordVisible;
    }





    //===========================================================
    // Login ID Change
    //===========================================================

    onLoginIdChange
    (
        value:
            string
    ):
        void
    {
        this.loginId =
            value;

        this.loginError =
            '';
    }





    //===========================================================
    // Password Change
    //===========================================================

    onPasswordChange
    (
        value:
            string
    ):
        void
    {
        this.password =
            value;

        this.loginError =
            '';
    }





    //===========================================================
    // Remember Me Change
    //===========================================================

    onRememberMeChange
    (
        value:
            boolean
    ):
        void
    {
        this.rememberMe =
            value;


        //=======================================================
        // When Remember Me Is Manually Unchecked
        //=======================================================

        if
        (
            !value
        )
        {
            this.authenticationStorageService
                .clearRememberedLogin();


            console.log(
                'LOGIN PANEL - Remembered Login ID removed.'
            );
        }
    }





    //===========================================================
    // Sign In
    //===========================================================

    onSignIn():
        void
    {
        //=======================================================
        // Prevent Duplicate Login Requests
        //=======================================================

        if
        (
            this.isSigningIn
        )
        {
            return;
        }


        //=======================================================
        // Clear Previous Error
        //=======================================================

        this.loginError =
            '';


        //=======================================================
        // Normalize Login ID
        //=======================================================

        const normalizedLoginId:
            string =
                this.loginId.trim();


        //=======================================================
        // Validate Login ID
        //=======================================================

        if
        (
            !normalizedLoginId
        )
        {
            this.loginError =
                'Login ID is required.';

            this.changeDetectorRef.markForCheck();

            this.changeDetectorRef.detectChanges();

            return;
        }


        //=======================================================
        // Validate Password
        //=======================================================

        if
        (
            !this.password
        )
        {
            this.loginError =
                'Password is required.';

            this.changeDetectorRef.markForCheck();

            this.changeDetectorRef.detectChanges();

            return;
        }


        //=======================================================
        // CAPTURE REMEMBER ME STATE
        //
        // The HTTP request is asynchronous.
        // Capture the checkbox state now so the authentication
        // response cannot change the value used for persistence.
        //=======================================================

        const rememberMe:
            boolean =
                this.rememberMe;


        //=======================================================
        // Login State
        //=======================================================

        this.isSigningIn =
            true;

        this.changeDetectorRef.markForCheck();

        this.changeDetectorRef.detectChanges();


        //=======================================================
        // Login Request
        //=======================================================

        const request:
            LoginRequest =
        {
            userName:
                normalizedLoginId,

            password:
                this.password,

            rememberMe:
                rememberMe
        };


        //=======================================================
        // Authenticate
        //=======================================================

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
                        //===================================================
                        // Login Request Completed
                        //===================================================

                        this.isSigningIn =
                            false;


                        //===================================================
                        // Authentication Failure
                        //===================================================

                        if
                        (
                            !response.success
                        )
                        {
                            this.loginError =
                                response.message
                                ||
                                'Unable to sign in. Please try again.';


                            this.changeDetectorRef.markForCheck();

                            this.changeDetectorRef.detectChanges();

                            return;
                        }


                        //===================================================
                        // Store Authentication
                        //
                        // AuthenticationStorageService is now the SINGLE
                        // owner of Remember Me persistence.
                        //
                        // If rememberMe = true:
                        //     Login ID -> localStorage
                        //
                        // If rememberMe = false:
                        //     Remembered Login ID is removed
                        //     Authentication -> sessionStorage
                        //===================================================

                        this.authenticationStorageService
                            .setAuthentication
                            (
                                response,

                                rememberMe,

                                normalizedLoginId
                            );


                        //===================================================
                        // Verify Remember Me State After Storage
                        //===================================================

                        console.log(
                            'LOGIN PANEL - Authentication stored:',
                            {
                                rememberMe:
                                    rememberMe,

                                rememberedLoginId:
                                    this.authenticationStorageService
                                        .getRememberedLoginId()
                            }
                        );


                        //===================================================
                        // Navigate To Dashboard
                        //===================================================

                        void this.router
                            .navigate
                            (
                                [
                                    '/dashboard'
                                ]
                            );
                    },

                error:
                    error =>
                    {
                        //===================================================
                        // Login Request Completed With HTTP Error
                        //===================================================

                        this.isSigningIn =
                            false;


                        //===================================================
                        // Extract Backend Error Message
                        //===================================================

                        this.loginError =
                            error?.error?.message
                            ||
                            error?.error?.Message
                            ||
                            'Unable to sign in. Please try again.';


                        this.changeDetectorRef.markForCheck();

                        this.changeDetectorRef.detectChanges();
                    }
            });
    }





    //===========================================================
    // Forgot Password
    //===========================================================

    @Output()
    forgotPassword:
        EventEmitter<void> =
            new EventEmitter<void>();


    onForgotPassword():
        void
    {
        if
        (
            this.isSigningIn
        )
        {
            return;
        }


        this.loginError =
            '';


        this.forgotPassword.emit();
    }





    //===========================================================
    // Registration
    //===========================================================

    @Output()
    register:
        EventEmitter<void> =
            new EventEmitter<void>();


    onRegister():
        void
    {
        if
        (
            this.isSigningIn
        )
        {
            return;
        }


        this.loginError =
            '';


        this.register.emit();
    }

}