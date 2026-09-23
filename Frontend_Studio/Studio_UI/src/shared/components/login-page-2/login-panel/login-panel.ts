//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';


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
        CommonModule
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
{
    @Input()
    config:
        LoginPageLoginPanelConfig =
    {
        visible:
            true,

        heading:
            'Sign In',

        subtitle:
            'Access your AppCore workspace and continue building a better tomorrow.',

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


    @Output()
    configChange:
        EventEmitter<LoginPageLoginPanelConfig> =
            new EventEmitter<LoginPageLoginPanelConfig>();


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

        this.configChange.emit(
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
    // Authentication will be connected by the application
    // authentication layer.
    //===========================================================

    @Output()
    signIn:
        EventEmitter<
            {
                loginId:
                    string;

                password:
                    string;

                rememberMe:
                    boolean;
            }
        > =
            new EventEmitter<
                {
                    loginId:
                        string;

                    password:
                        string;

                    rememberMe:
                        boolean;
                }
            >();


    onSignIn():
        void
    {
        this.signIn.emit(
        {
            loginId:
                this.loginId,

            password:
                this.password,

            rememberMe:
                this.rememberMe
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
        this.register.emit();
    }
}