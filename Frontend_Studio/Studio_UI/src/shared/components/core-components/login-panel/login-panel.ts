//===============================================================
// Imports
//===============================================================

import
{
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
    implements OnInit
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
    // ----------------------------------------------------------
    // The Login Panel is the single source of client branding
    // for all Login Pages.
    //
    // Company Short Name is used as the Login Page Display Name.
    // Company Name remains available in Company Setup as the
    // legal/full company name.
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
        this.loadClientBranding();
    }



    //===========================================================
    // Load Client Branding
    // ----------------------------------------------------------
    // Loads the active company from Company Setup.
    //
    // The same Login Panel is reused by:
    //
    //     Login Page 1
    //     Login Page 2
    //     Login Page 3
    //     Login Page 4
    //
    // Therefore company branding is intentionally handled
    // here instead of inside individual Login Pages or
    // Login Page Loader.
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

                            this.changeDetectorRef.detectChanges();

                            return;
                        }



                        //===================================================
                        // Login Display Name
                        //
                        // Priority:
                        //
                        //     1. Company Short Name
                        //     2. Company Name
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
        //
        // environment.apiUrl:
        //
        //     http://localhost:5100/api
        //
        // Static files:
        //
        //     http://localhost:5100/uploads/...
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
    }



    //===========================================================
    // Sign In
    // ----------------------------------------------------------
    // The Login Panel is the authentication owner.
    //
    // Login Page 1, 2, 3 and 4 do not authenticate the user.
    //
    // The Login Panel:
    //
    //     1. Validates the Login ID.
    //     2. Validates the Password.
    //     3. Sends Remember Me to the backend.
    //     4. Receives the authentication response.
    //     5. Stores the authentication.
    //     6. Navigates to the Dashboard.
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

            this.changeDetectorRef.detectChanges();

            return;
        }



        //=======================================================
        // Login State
        //=======================================================

        this.isSigningIn =
            true;

        this.changeDetectorRef.detectChanges();



        //=======================================================
        // Login Request
        // ------------------------------------------------------
        // Remember Me is sent directly to the backend.
        //
        // The backend controls the authentication lifetime.
        //=======================================================

        const request:
            LoginRequest =
        {
            userName:
                normalizedLoginId,

            password:
                this.password,

            rememberMe:
                this.rememberMe
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

                            this.changeDetectorRef.detectChanges();

                            return;
                        }



                        //===================================================
                        // Store Authentication
                        //===================================================
                        // The storage service stores the authentication
                        // returned by the backend.
                        //
                        // Remember Me itself is already handled by the
                        // backend through the JWT lifetime.
                        //===================================================

                        this.authenticationStorageService
                            .setAuthentication
                            (
                                response
                            );



                        //===================================================
                        // Navigate To Dashboard
                        //===================================================

                        this.router
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