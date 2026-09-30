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
    Output,
    inject
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    AuthenticationService
}
from '../../../../core/authentication/authentication.service';

import
{
    ForgotPasswordCheckRequest,
    ForgotPasswordCheckResponse,
    ForgotPasswordConfirmRequest,
    LoginResponse
}
from '../../../../core/authentication/authentication.model';


//===============================================================
// Login Page Forget Password Panel Configuration
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
    //===========================================================
    // Private Services
    //===========================================================

    private readonly authenticationService:
        AuthenticationService =
            inject(
                AuthenticationService
            );


    private readonly changeDetectorRef:
        ChangeDetectorRef =
            inject(
                ChangeDetectorRef
            );


    //===========================================================
    // Configuration
    //===========================================================

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


    //===========================================================
    // Configuration Change
    //===========================================================

    @Output()
    configChange:
        EventEmitter<LoginPageForgetPasswordPanelConfig> =
            new EventEmitter<LoginPageForgetPasswordPanelConfig>();


    //===========================================================
    // Password Reset Success Event
    //===========================================================

    @Output()
    passwordResetSuccess:
        EventEmitter<void> =
            new EventEmitter<void>();


    //===========================================================
    // Back To Login Event
    //===========================================================

    @Output()
    backToLogin:
        EventEmitter<void> =
            new EventEmitter<void>();


    //===========================================================
    // Runtime Forget Password State
    //===========================================================

    loginId:
        string =
            '';

    verificationCode:
        string =
            '';

    confirmVerificationCode:
        string =
            '';

    newPassword:
        string =
            '';

    confirmPassword:
        string =
            '';


    //===========================================================
    // Runtime UI State
    //===========================================================

    verificationCodeVisible:
        boolean =
            false;

    newPasswordVisible:
        boolean =
            false;

    confirmPasswordVisible:
        boolean =
            false;


    //===========================================================
    // Field Validation State
    //===========================================================

    verificationCodeTouched:
        boolean =
            false;

    confirmVerificationCodeTouched:
        boolean =
            false;

    confirmPasswordTouched:
        boolean =
            false;


    //===========================================================
    // Processing State
    //===========================================================

    isCheckingLoginId:
        boolean =
            false;

    isChangingPassword:
        boolean =
            false;


    //===========================================================
    // Password Reset State
    //===========================================================

    passwordResetStarted:
        boolean =
            false;

    passwordResetCompleted:
        boolean =
            false;


    //===========================================================
    // Message State
    //===========================================================

    message:
        string =
            '';

    messageType:
        'error' |
        'info' |
        '' =
            '';


    //===========================================================
    // Verification Expiration
    //===========================================================

    verificationExpiresAt:
        string |
        null =
            null;


    //===========================================================
    // User Profile ID
    //===========================================================

    userProfileId:
        number =
            0;


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


        this.changeDetectorRef.markForCheck();
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


        this.message =
            '';

        this.messageType =
            '';


        this.passwordResetStarted =
            false;

        this.passwordResetCompleted =
            false;


        this.verificationCode =
            '';

        this.confirmVerificationCode =
            '';

        this.verificationExpiresAt =
            null;

        this.userProfileId =
            0;


        this.newPassword =
            '';

        this.confirmPassword =
            '';


        this.verificationCodeVisible =
            false;

        this.newPasswordVisible =
            false;

        this.confirmPasswordVisible =
            false;


        //=======================================================
        // Reset Field Validation State
        //=======================================================

        this.verificationCodeTouched =
            false;

        this.confirmVerificationCodeTouched =
            false;

        this.confirmPasswordTouched =
            false;


        this.changeDetectorRef.markForCheck();
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


        this.message =
            '';

        this.messageType =
            '';


        this.changeDetectorRef.markForCheck();
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


        this.message =
            '';

        this.messageType =
            '';


        this.changeDetectorRef.markForCheck();
    }


    //===========================================================
    // Verification Code Change
    //===========================================================

    onVerificationCodeChange
    (
        value:
            string
    ):
        void
    {
        this.verificationCode =
            value;


        this.changeDetectorRef.markForCheck();
    }


    //===========================================================
    // Verification Code Blur
    //===========================================================

    onVerificationCodeBlur():
        void
    {
        this.verificationCodeTouched =
            true;


        this.changeDetectorRef.markForCheck();
    }


    //===========================================================
    // Confirm Verification Code Change
    //===========================================================

    onConfirmVerificationCodeChange
    (
        value:
            string
    ):
        void
    {
        this.confirmVerificationCode =
            value;


        this.message =
            '';

        this.messageType =
            '';


        this.changeDetectorRef.markForCheck();
    }


    //===========================================================
    // Confirm Verification Code Blur
    //===========================================================

    onConfirmVerificationCodeBlur():
        void
    {
        this.confirmVerificationCodeTouched =
            true;


        this.changeDetectorRef.markForCheck();
    }


    //===========================================================
    // Confirm Password Blur
    //===========================================================

    onConfirmPasswordBlur():
        void
    {
        this.confirmPasswordTouched =
            true;


        this.changeDetectorRef.markForCheck();
    }


    //===========================================================
    // New Password Visibility
    //===========================================================

    toggleNewPasswordVisibility():
        void
    {
        this.newPasswordVisible =
            !this.newPasswordVisible;


        this.changeDetectorRef.markForCheck();
    }


    //===========================================================
    // Confirm Password Visibility
    //===========================================================

    toggleConfirmPasswordVisibility():
        void
    {
        this.confirmPasswordVisible =
            !this.confirmPasswordVisible;


        this.changeDetectorRef.markForCheck();
    }


    //===========================================================
    // Verification Code Invalid State
    //===========================================================

    get isVerificationCodeInvalid():
        boolean
    {
        if
        (
            !this.verificationCodeTouched
        )
        {
            return false;
        }


        const code:
            string =
                this.verificationCode.trim();


        return (
            code.length !==
            6
            ||
            !/^\d{6}$/.test(
                code
            )
        );
    }


    //===========================================================
    // Confirm Verification Code Invalid State
    //===========================================================

    get isConfirmVerificationCodeInvalid():
        boolean
    {
        if
        (
            !this.confirmVerificationCodeTouched
        )
        {
            return false;
        }


        const confirmationCode:
            string =
                this.confirmVerificationCode.trim();

        const originalCode:
            string =
                this.verificationCode.trim();


        if
        (
            confirmationCode.length !==
            6
        )
        {
            return true;
        }


        if
        (
            !/^\d{6}$/.test(
                confirmationCode
            )
        )
        {
            return true;
        }


        return (
            confirmationCode !==
            originalCode
        );
    }


    //===========================================================
    // Confirm Password Invalid State
    //===========================================================

    get isConfirmPasswordInvalid():
        boolean
    {
        if
        (
            !this.confirmPasswordTouched
        )
        {
            return false;
        }


        if
        (
            !this.confirmPassword
        )
        {
            return true;
        }


        return (
            this.confirmPassword !==
            this.newPassword
        );
    }


    //===========================================================
    // Form Submit
    //===========================================================

    onFormSubmit
    (
        event:
            Event
    ):
        void
    {
        event.preventDefault();

        event.stopPropagation();


        //=======================================================
        // Prevent Submit After Successful Reset
        //=======================================================

        if
        (
            this.passwordResetCompleted
        )
        {
            return;
        }


        //=======================================================
        // Current Recovery Stage
        //=======================================================

        if
        (
            this.passwordResetStarted
        )
        {
            this.onResetPassword();

            return;
        }


        //=======================================================
        // Stage 1
        //=======================================================

        this.onCheckLoginId();
    }


    //===========================================================
    // Check Login ID
    //===========================================================

    onCheckLoginId():
        void
    {
        if
        (
            this.isCheckingLoginId
        )
        {
            return;
        }


        if
        (
            this.passwordResetCompleted
        )
        {
            return;
        }


        this.message =
            '';

        this.messageType =
            '';


        const userName:
            string =
                this.loginId.trim();


        if
        (
            !userName
        )
        {
            this.message =
                'Login ID is required.';

            this.messageType =
                'error';

            this.changeDetectorRef.markForCheck();

            return;
        }


        //=======================================================
        // Reset Recovery Stage
        //=======================================================

        this.passwordResetStarted =
            false;

        this.passwordResetCompleted =
            false;

        this.verificationCode =
            '';

        this.confirmVerificationCode =
            '';

        this.verificationExpiresAt =
            null;

        this.userProfileId =
            0;

        this.newPassword =
            '';

        this.confirmPassword =
            '';

        this.verificationCodeVisible =
            false;

        this.newPasswordVisible =
            false;

        this.confirmPasswordVisible =
            false;


        //=======================================================
        // Reset Field Validation State
        //=======================================================

        this.verificationCodeTouched =
            false;

        this.confirmVerificationCodeTouched =
            false;

        this.confirmPasswordTouched =
            false;


        //=======================================================
        // Set Processing State
        //=======================================================

        this.isCheckingLoginId =
            true;

        this.changeDetectorRef.markForCheck();


        //=======================================================
        // Request
        //=======================================================

        const request:
            ForgotPasswordCheckRequest =
        {
            userName:
                userName
        };


        //=======================================================
        // API Call
        //=======================================================

        this.authenticationService
            .checkForgotPassword(
                request
            )
            .subscribe
            ({
                next:
                    (
                        response:
                            ForgotPasswordCheckResponse
                    ) =>
                    {
                        this.isCheckingLoginId =
                            false;


                        //=======================================
                        // Diagnostic Information
                        //=======================================

                        console.log(
                            'FORGOT PASSWORD CHECK RESPONSE:',
                            {
                                success:
                                    response.success,

                                userProfileId:
                                    response.userProfileId,

                                verificationCodeReceived:
                                    !!response.verificationCode,

                                verificationCodeLength:
                                    response.verificationCode?.length
                                    ||
                                    0,

                                expiresAt:
                                    response.expiresAt
                            }
                        );


                        //=======================================
                        // Failed Response
                        //=======================================

                        if
                        (
                            !response.success
                        )
                        {
                            this.passwordResetStarted =
                                false;

                            this.passwordResetCompleted =
                                false;

                            this.message =
                                response.message
                                ||
                                'Unable to verify the Login ID.';

                            this.messageType =
                                'error';

                            this.changeDetectorRef.markForCheck();

                            return;
                        }


                        //=======================================
                        // Validate Verification Response
                        //=======================================

                        if
                        (
                            !response.verificationCode ||
                            response.verificationCode.length !== 6
                        )
                        {
                            this.passwordResetStarted =
                                false;

                            this.passwordResetCompleted =
                                false;

                            this.message =
                                'Verification code was not generated correctly. Please try again.';

                            this.messageType =
                                'error';

                            this.changeDetectorRef.markForCheck();

                            return;
                        }


                        //=======================================
                        // Store Login ID
                        //=======================================

                        this.loginId =
                            userName;


                        //=======================================
                        // Store Verification Information
                        //=======================================

                        this.verificationCode =
                            response.verificationCode;

                        this.confirmVerificationCode =
                            '';

                        this.verificationExpiresAt =
                            response.expiresAt;

                        this.userProfileId =
                            response.userProfileId;


                        //=======================================
                        // Reset Field Validation State
                        //=======================================

                        this.verificationCodeTouched =
                            false;

                        this.confirmVerificationCodeTouched =
                            false;

                        this.confirmPasswordTouched =
                            false;


                        //=======================================
                        // Enable Password Reset Stage
                        //=======================================

                        this.passwordResetStarted =
                            true;

                        this.passwordResetCompleted =
                            false;


                        this.message =
                            '';

                        this.messageType =
                            '';


                        //=======================================
                        // Refresh OnPush View
                        //=======================================

                        this.changeDetectorRef.markForCheck();
                    },

                error:
                    (
                        error:
                            unknown
                    ) =>
                    {
                        this.isCheckingLoginId =
                            false;

                        this.passwordResetStarted =
                            false;

                        this.passwordResetCompleted =
                            false;


                        const backendMessage:
                            string =
                                this.getBackendErrorMessage(
                                    error
                                );


                        this.message =
                            backendMessage
                            ||
                            'Unable to process the password recovery request. Please try again.';

                        this.messageType =
                            'error';


                        console.error(
                            'FORGOT PASSWORD CHECK ERROR:',
                            error
                        );


                        this.changeDetectorRef.markForCheck();
                    }
            });
    }


    //===========================================================
    // Change Password
    //===========================================================

    onResetPassword():
        void
    {
        if
        (
            this.isChangingPassword
        )
        {
            return;
        }


        if
        (
            this.passwordResetCompleted
        )
        {
            return;
        }


        this.message =
            '';

        this.messageType =
            '';


        //=======================================================
        // Mark User-Editable Confirmation Fields As Touched
        //=======================================================

        this.confirmVerificationCodeTouched =
            true;

        this.confirmPasswordTouched =
            true;


        //=======================================================
        // Validate Login ID
        //=======================================================

        const userName:
            string =
                this.loginId.trim();


        if
        (
            !userName
        )
        {
            this.message =
                'Login ID is required.';

            this.messageType =
                'error';

            this.changeDetectorRef.markForCheck();

            return;
        }


        //=======================================================
        // Validate Verification Code
        //=======================================================

        const verificationCode:
            string =
                this.verificationCode.trim();


        if
        (
            !verificationCode
        )
        {
            this.message =
                'Verification code is required.';

            this.messageType =
                'error';

            this.changeDetectorRef.markForCheck();

            return;
        }


        if
        (
            verificationCode.length !==
            6
            ||
            !/^\d{6}$/.test(
                verificationCode
            )
        )
        {
            this.message =
                'Verification code must be a valid 6-digit code.';

            this.messageType =
                'error';

            this.changeDetectorRef.markForCheck();

            return;
        }


        //=======================================================
        // Validate Confirm Verification Code
        // -------------------------------------------------------
        // This is a frontend-only confirmation field.
        //
        // It is intentionally NOT sent to the backend.
        //
        // A mismatch stops the process here, before any API
        // request is made.
        //
        // Therefore a mismatch does NOT consume one of the
        // backend verification attempts.
        //=======================================================

        const confirmVerificationCode:
            string =
                this.confirmVerificationCode.trim();


        if
        (
            !confirmVerificationCode
        )
        {
            this.message =
                'Please confirm the verification code.';

            this.messageType =
                'error';

            this.changeDetectorRef.markForCheck();

            return;
        }


        if
        (
            confirmVerificationCode.length !==
            6
            ||
            !/^\d{6}$/.test(
                confirmVerificationCode
            )
        )
        {
            this.message =
                'Confirmation verification code must be a valid 6-digit code.';

            this.messageType =
                'error';

            this.changeDetectorRef.markForCheck();

            return;
        }


        if
        (
            confirmVerificationCode !==
            verificationCode
        )
        {
            this.message =
                'Verification codes do not match.';

            this.messageType =
                'error';

            this.changeDetectorRef.markForCheck();

            return;
        }


        //=======================================================
        // Validate New Password
        //=======================================================

        if
        (
            !this.newPassword
        )
        {
            this.message =
                'New password is required.';

            this.messageType =
                'error';

            this.changeDetectorRef.markForCheck();

            return;
        }


        if
        (
            this.newPassword.length <
            8
        )
        {
            this.message =
                'Password must be at least 8 characters long.';

            this.messageType =
                'error';

            this.changeDetectorRef.markForCheck();

            return;
        }


        if
        (
            !this.confirmPassword
        )
        {
            this.message =
                'Please confirm your new password.';

            this.messageType =
                'error';

            this.changeDetectorRef.markForCheck();

            return;
        }


        if
        (
            this.newPassword !==
            this.confirmPassword
        )
        {
            this.message =
                'New password and confirmation password do not match.';

            this.messageType =
                'error';

            this.changeDetectorRef.markForCheck();

            return;
        }


        //=======================================================
        // Diagnostic Information
        // -------------------------------------------------------
        // Never log the actual password or verification code.
        //=======================================================

        console.log(
            'RESET PASSWORD CLICKED:',
            {
                userName:
                    userName,

                verificationCodePresent:
                    !!verificationCode,

                verificationCodeLength:
                    verificationCode.length,

                confirmVerificationCodePresent:
                    !!confirmVerificationCode,

                confirmVerificationCodeLength:
                    confirmVerificationCode.length,

                newPasswordLength:
                    this.newPassword.length,

                confirmPasswordLength:
                    this.confirmPassword.length
            }
        );


        //=======================================================
        // Set Processing State
        //=======================================================

        this.isChangingPassword =
            true;

        this.changeDetectorRef.markForCheck();


        //=======================================================
        // Request
        // -------------------------------------------------------
        // IMPORTANT:
        //
        // confirmVerificationCode is intentionally NOT included.
        //
        // The backend receives only the original verificationCode.
        //=======================================================

        const request:
            ForgotPasswordConfirmRequest =
        {
            userName:
                userName,

            verificationCode:
                verificationCode,

            newPassword:
                this.newPassword
        };


        //=======================================================
        // API Call
        //=======================================================

        this.authenticationService
            .confirmForgotPassword(
                request
            )
            .subscribe
            ({
                next:
                    (
                        response:
                            LoginResponse
                    ) =>
                    {
                        this.isChangingPassword =
                            false;


                        //=======================================
                        // Diagnostic Information
                        //=======================================

                        console.log(
                            'PASSWORD RESET RESPONSE:',
                            {
                                success:
                                    response.success,

                                message:
                                    response.message
                            }
                        );


                        //=======================================
                        // Failed Response
                        //=======================================

                        if
                        (
                            !response.success
                        )
                        {
                            this.message =
                                response.message
                                ||
                                'Unable to change the password.';

                            this.messageType =
                                'error';

                            this.changeDetectorRef.markForCheck();

                            return;
                        }


                        //=======================================
                        // Password Reset Complete
                        //=======================================

                        this.passwordResetCompleted =
                            true;


                        //=======================================
                        // Clear Sensitive Runtime Values
                        //=======================================

                        this.verificationCode =
                            '';

                        this.confirmVerificationCode =
                            '';

                        this.newPassword =
                            '';

                        this.confirmPassword =
                            '';

                        this.verificationExpiresAt =
                            null;

                        this.verificationCodeVisible =
                            false;

                        this.newPasswordVisible =
                            false;

                        this.confirmPasswordVisible =
                            false;


                        //=======================================
                        // Clear Field Validation State
                        //=======================================

                        this.verificationCodeTouched =
                            false;

                        this.confirmVerificationCodeTouched =
                            false;

                        this.confirmPasswordTouched =
                            false;


                        //=======================================
                        // Clear Local Message
                        //=======================================

                        this.message =
                            '';

                        this.messageType =
                            '';


                        //=======================================
                        // Notify Parent Login Page
                        //=======================================

                        console.log(
                            'PASSWORD RESET SUCCESS EVENT EMITTED'
                        );


                        this.passwordResetSuccess.emit();


                        //=======================================
                        // Refresh OnPush View
                        //=======================================

                        this.changeDetectorRef.markForCheck();
                    },

                error:
                    (
                        error:
                            unknown
                    ) =>
                    {
                        this.isChangingPassword =
                            false;

                        this.passwordResetCompleted =
                            false;


                        const backendMessage:
                            string =
                                this.getBackendErrorMessage(
                                    error
                                );


                        this.message =
                            backendMessage
                            ||
                            'Unable to change the password. Please try again.';

                        this.messageType =
                            'error';


                        console.error(
                            'PASSWORD RESET ERROR:',
                            error
                        );


                        this.changeDetectorRef.markForCheck();
                    }
            });
    }


    //===========================================================
    // Get Backend Error Message
    //===========================================================

    private getBackendErrorMessage
    (
        error:
            unknown
    ):
        string
    {
        if
        (
            !error ||
            typeof error !==
            'object'
        )
        {
            return '';
        }


        const httpError:
            {
                error?:
                    {
                        message?:
                            string;

                        title?:
                            string;
                    };

                message?:
                    string;
            } =
                error as
                {
                    error?:
                        {
                            message?:
                                string;

                            title?:
                                string;
                        };

                    message?:
                        string;
                };


        return (
            httpError.error?.message
            ||
            httpError.error?.title
            ||
            httpError.message
            ||
            ''
        );
    }


    //===========================================================
    // Back To Login
    //===========================================================

    onBackToLogin():
        void
    {
        this.backToLogin.emit();
    }
}