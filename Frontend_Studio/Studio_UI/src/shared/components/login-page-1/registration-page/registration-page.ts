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
// Login Page 1 Registration Page
//===============================================================

export interface RegistrationPageConfig
{
    visible: boolean;

    heading: string;

    subtitle: string;

    userNameLabel: string;

    userNamePlaceholder: string;

    displayNameLabel: string;

    displayNamePlaceholder: string;

    fullNameLabel: string;

    fullNamePlaceholder: string;

    emailLabel: string;

    emailPlaceholder: string;

    mobileNoLabel: string;

    mobileNoPlaceholder: string;

    passwordLabel: string;

    passwordPlaceholder: string;

    confirmPasswordLabel: string;

    confirmPasswordPlaceholder: string;

    registrationButtonText: string;

    registrationButtonIcon: string;

    backToLoginVisible: boolean;

    backToLoginText: string;

    backToLoginIcon: string;
}


//===============================================================
// Login Page 1 Registration Page Component
//===============================================================

@Component(
{
    selector:
        'app-login-page-registration-page',

    standalone:
        true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './registration-page.html',

    styleUrl:
        './registration-page.css',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})


//===============================================================
// Login Page 1 Registration Page
//===============================================================

export class RegistrationPageComponent
{
    @Input()
    config:
        RegistrationPageConfig =
    {
        visible:
            true,

        heading:
            'Create Account',

        subtitle:
            'Create your AppCore account to get started',

        userNameLabel:
            'User Name',

        userNamePlaceholder:
            'Enter your user name',

        displayNameLabel:
            'Display Name',

        displayNamePlaceholder:
            'Enter your display name',

        fullNameLabel:
            'Full Name',

        fullNamePlaceholder:
            'Enter your full name',

        emailLabel:
            'Email',

        emailPlaceholder:
            'Enter your email address',

        mobileNoLabel:
            'Mobile No',

        mobileNoPlaceholder:
            'Enter your mobile number',

        passwordLabel:
            'Password',

        passwordPlaceholder:
            'Create your password',

        confirmPasswordLabel:
            'Confirm Password',

        confirmPasswordPlaceholder:
            'Confirm your password',

        registrationButtonText:
            'Create Account',

        registrationButtonIcon:
            'fas fa-user-plus',

        backToLoginVisible:
            true,

        backToLoginText:
            'Back to Sign In',

        backToLoginIcon:
            'fas fa-arrow-left'
    };


    @Output()
    configChange:
        EventEmitter<RegistrationPageConfig> =
            new EventEmitter<RegistrationPageConfig>();


    //===========================================================
    // Runtime Registration State
    //===========================================================

    userName:
        string =
            '';

    displayName:
        string =
            '';

    fullName:
        string =
            '';

    email:
        string =
            '';

    mobileNo:
        string =
            '';

    password:
        string =
            '';

    confirmPassword:
        string =
            '';


    //===========================================================
    // Password Visibility
    //===========================================================

    passwordVisible:
        boolean =
            false;

    confirmPasswordVisible:
        boolean =
            false;


    //===========================================================
    // Configuration Update
    //===========================================================

    updateConfig(
        changes:
            Partial<RegistrationPageConfig>
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
    // User Name Change
    //===========================================================

    onUserNameChange(
        value:
            string
    ):
        void
    {
        this.userName =
            value;
    }


    //===========================================================
    // Display Name Change
    //===========================================================

    onDisplayNameChange(
        value:
            string
    ):
        void
    {
        this.displayName =
            value;
    }


    //===========================================================
    // Full Name Change
    //===========================================================

    onFullNameChange(
        value:
            string
    ):
        void
    {
        this.fullName =
            value;
    }


    //===========================================================
    // Email Change
    //===========================================================

    onEmailChange(
        value:
            string
    ):
        void
    {
        this.email =
            value;
    }


    //===========================================================
    // Mobile No Change
    //===========================================================

    onMobileNoChange(
        value:
            string
    ):
        void
    {
        this.mobileNo =
            value;
    }


    //===========================================================
    // Password Change
    //===========================================================

    onPasswordChange(
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

    onConfirmPasswordChange(
        value:
            string
    ):
        void
    {
        this.confirmPassword =
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
    // authentication layer.
    //===========================================================

    @Output()
    register:
        EventEmitter<
            {
                userName:
                    string;

                displayName:
                    string;

                fullName:
                    string;

                email:
                    string;

                mobileNo:
                    string;

                password:
                    string;

                confirmPassword:
                    string;
            }
        > =
            new EventEmitter<
                {
                    userName:
                        string;

                    displayName:
                        string;

                    fullName:
                        string;

                    email:
                        string;

                    mobileNo:
                        string;

                    password:
                        string;

                    confirmPassword:
                        string;
                }
            >();


    onRegister():
        void
    {
        this.register.emit(
        {
            userName:
                this.userName,

            displayName:
                this.displayName,

            fullName:
                this.fullName,

            email:
                this.email,

            mobileNo:
                this.mobileNo,

            password:
                this.password,

            confirmPassword:
                this.confirmPassword
        });
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