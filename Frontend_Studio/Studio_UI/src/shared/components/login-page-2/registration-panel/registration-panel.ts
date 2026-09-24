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
// Login Page Registration Panel
//===============================================================

export interface LoginPageRegistrationPanelConfig
{
    visible:
        boolean;

    heading:
        string;

    subtitle:
        string;

    fullNameLabel:
        string;

    fullNamePlaceholder:
        string;

    displayNameLabel:
        string;

    displayNamePlaceholder:
        string;

    emailLabel:
        string;

    emailPlaceholder:
        string;

    loginIdLabel:
        string;

    loginIdPlaceholder:
        string;

    passwordLabel:
        string;

    passwordPlaceholder:
        string;

    confirmPasswordLabel:
        string;

    confirmPasswordPlaceholder:
        string;

    termsPrefixText:
        string;

    termsText:
        string;

    termsMiddleText:
        string;

    privacyText:
        string;

    createAccountButtonText:
        string;

    createAccountButtonIcon:
        string;

    createAccountButtonArrowIcon:
        string;

    orText:
        string;

    loginVisible:
        boolean;

    loginIcon:
        string;

    loginHeading:
        string;

    loginDescription:
        string;

    loginButtonText:
        string;
}


//===============================================================
// Login Page Registration Panel Component
//===============================================================

@Component
({
    selector:
        'app-login-page-registration-panel',

    standalone:
        true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './registration-panel.html',

    styleUrl:
        './registration-panel.css',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})


//===============================================================
// Login Page Registration Panel
//===============================================================

export class LoginPageRegistrationPanelComponent
{
    @Input()
    config:
        LoginPageRegistrationPanelConfig =
    {
        visible:
            true,

        heading:
            'Create Account',

        subtitle:
            'Join and get started with your workspace today.',

        fullNameLabel:
            'Full Name',

        fullNamePlaceholder:
            'Enter your full name',

        displayNameLabel:
            'Display Name',

        displayNamePlaceholder:
            'Enter your display name',

        emailLabel:
            'Email Address',

        emailPlaceholder:
            'Enter your email address',

        loginIdLabel:
            'Login ID',

        loginIdPlaceholder:
            'Choose a login ID',

        passwordLabel:
            'Password',

        passwordPlaceholder:
            'Create a password',

        confirmPasswordLabel:
            'Confirm Password',

        confirmPasswordPlaceholder:
            'Confirm your password',

        termsPrefixText:
            'I agree to the',

        termsText:
            'Terms of Service',

        termsMiddleText:
            'and',

        privacyText:
            'Privacy Policy',

        createAccountButtonText:
            'Create Account',

        createAccountButtonIcon:
            'fas fa-user-plus',

        createAccountButtonArrowIcon:
            'fas fa-arrow-right',

        orText:
            'OR',

        loginVisible:
            true,

        loginIcon:
            'fas fa-user-plus',

        loginHeading:
            'Already have an account?',

        loginDescription:
            'Sign in to your account to continue.',

        loginButtonText:
            'Sign In'
    };


    @Output()
    configChange:
        EventEmitter<LoginPageRegistrationPanelConfig> =
            new EventEmitter<LoginPageRegistrationPanelConfig>();


    //===========================================================
    // Runtime Registration State
    //===========================================================

    fullName:
        string =
            '';

    displayName:
        string =
            '';

    email:
        string =
            '';

    loginId:
        string =
            '';

    password:
        string =
            '';

    confirmPassword:
        string =
            '';

    termsAccepted:
        boolean =
            false;

    passwordVisible:
        boolean =
            false;

    confirmPasswordVisible:
        boolean =
            false;


    //===========================================================
    // Configuration Update
    //===========================================================

    updateConfig
    (
        changes:
            Partial<LoginPageRegistrationPanelConfig>
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
    // Full Name Change
    //===========================================================

    onFullNameChange
    (
        value:
            string
    ):
        void
    {
        this.fullName =
            value;
    }


    //===========================================================
    // Display Name Change
    //===========================================================

    onDisplayNameChange
    (
        value:
            string
    ):
        void
    {
        this.displayName =
            value;
    }


    //===========================================================
    // Email Change
    //===========================================================

    onEmailChange
    (
        value:
            string
    ):
        void
    {
        this.email =
            value;
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
    // Confirm Password Change
    //===========================================================

    onConfirmPasswordChange
    (
        value:
            string
    ):
        void
    {
        this.confirmPassword =
            value;
    }


    //===========================================================
    // Terms Accepted Change
    //===========================================================

    onTermsAcceptedChange
    (
        value:
            boolean
    ):
        void
    {
        this.termsAccepted =
            value;
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
    // Confirm Password Visibility
    //===========================================================

    toggleConfirmPasswordVisibility():
        void
    {
        this.confirmPasswordVisible =
            !this.confirmPasswordVisible;
    }


    //===========================================================
    // Registration
    // ----------------------------------------------------------
    // Registration will be connected by the application
    // authentication / registration layer.
    //===========================================================

    @Output()
    register:
        EventEmitter<
            {
                fullName:
                    string;

                displayName:
                    string;

                email:
                    string;

                loginId:
                    string;

                password:
                    string;

                confirmPassword:
                    string;

                termsAccepted:
                    boolean;
            }
        > =
            new EventEmitter<
                {
                    fullName:
                        string;

                    displayName:
                        string;

                    email:
                        string;

                    loginId:
                        string;

                    password:
                        string;

                    confirmPassword:
                        string;

                    termsAccepted:
                        boolean;
                }
            >();


    onRegister():
        void
    {
        this.register.emit(
        {
            fullName:
                this.fullName,

            displayName:
                this.displayName,

            email:
                this.email,

            loginId:
                this.loginId,

            password:
                this.password,

            confirmPassword:
                this.confirmPassword,

            termsAccepted:
                this.termsAccepted
        });
    }


    //===========================================================
    // Terms Of Service
    //===========================================================

    @Output()
    termsOfService:
        EventEmitter<void> =
            new EventEmitter<void>();


    onTermsOfService():
        void
    {
        this.termsOfService.emit();
    }


    //===========================================================
    // Privacy Policy
    //===========================================================

    @Output()
    privacyPolicy:
        EventEmitter<void> =
            new EventEmitter<void>();


    onPrivacyPolicy():
        void
    {
        this.privacyPolicy.emit();
    }


    //===========================================================
    // Back To Login
    //===========================================================

    @Output()
    backToLogin:
        EventEmitter<void> =
            new EventEmitter<void>();


    onBackToLogin():
        void
    {
        this.backToLogin.emit();
    }
}