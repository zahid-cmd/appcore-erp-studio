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
// Login Page Forget Password Panel
//===============================================================

export interface LoginPageForgetPasswordPanelConfig
{
    visible:
        boolean;

    heading:
        string;

    subtitle:
        string;

    loginIdLabel:
        string;

    loginIdPlaceholder:
        string;

    newPasswordLabel:
        string;

    newPasswordPlaceholder:
        string;

    confirmPasswordLabel:
        string;

    confirmPasswordPlaceholder:
        string;

    resetPasswordButtonText:
        string;

    resetPasswordButtonIcon:
        string;

    resetPasswordButtonArrowIcon:
        string;

    orText:
        string;

    signInVisible:
        boolean;

    signInIcon:
        string;

    signInHeading:
        string;

    signInDescription:
        string;

    signInButtonText:
        string;
}


//===============================================================
// Login Page Forget Password Panel Component
//===============================================================

@Component
({
    selector:
        'app-login-page-forget-password-panel',

    standalone:
        true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './forget-password.html',

    styleUrl:
        './forget-password.css',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})


//===============================================================
// Login Page Forget Password Panel
//===============================================================

export class LoginPageForgetPasswordPanelComponent
{
    @Input()
    config:
        LoginPageForgetPasswordPanelConfig =
    {
        visible:
            true,

        heading:
            'Forgot Password?',

        subtitle:
            'Enter your details below to reset your password and regain access to your account.',

        loginIdLabel:
            'Login ID',

        loginIdPlaceholder:
            'Enter your login ID',

        newPasswordLabel:
            'New Password',

        newPasswordPlaceholder:
            'Enter your new password',

        confirmPasswordLabel:
            'Confirm New Password',

        confirmPasswordPlaceholder:
            'Confirm your new password',

        resetPasswordButtonText:
            'Reset Password',

        resetPasswordButtonIcon:
            'fas fa-key',

        resetPasswordButtonArrowIcon:
            'fas fa-arrow-right',

        orText:
            'OR',

        signInVisible:
            true,

        signInIcon:
            'fas fa-arrow-left',

        signInHeading:
            'Back to Sign In',

        signInDescription:
            'Remember your password? Sign in to continue.',

        signInButtonText:
            'Sign In'
    };


    @Output()
    configChange:
        EventEmitter<LoginPageForgetPasswordPanelConfig> =
            new EventEmitter<LoginPageForgetPasswordPanelConfig>();


    //===========================================================
    // Runtime Forget Password State
    //===========================================================

    loginId:
        string =
            '';

    newPassword:
        string =
            '';

    confirmPassword:
        string =
            '';

    newPasswordVisible:
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
            Partial<LoginPageForgetPasswordPanelConfig>
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
    // New Password Change
    //===========================================================

    onNewPasswordChange
    (
        value:
            string
    ):
        void
    {
        this.newPassword =
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
    // New Password Visibility
    //===========================================================

    toggleNewPasswordVisibility():
        void
    {
        this.newPasswordVisible =
            !this.newPasswordVisible;
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
    // Reset Password
    // ----------------------------------------------------------
    // Password reset will be connected by the application
    // authentication / password reset layer.
    //===========================================================

    @Output()
    resetPassword:
        EventEmitter<
            {
                loginId:
                    string;

                newPassword:
                    string;

                confirmPassword:
                    string;
            }
        > =
            new EventEmitter<
                {
                    loginId:
                        string;

                    newPassword:
                        string;

                    confirmPassword:
                        string;
                }
            >();


    onResetPassword():
        void
    {
        this.resetPassword.emit(
        {
            loginId:
                this.loginId,

            newPassword:
                this.newPassword,

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