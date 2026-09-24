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
    OnDestroy,
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
    AuthenticationService
}
from '../../../../core/authentication/authentication.service';

import
{
    RegisterRequest
}
from '../../../../core/authentication/authentication.model';

import
{
    ConfirmationDialogComponent
}
from '../confirmation-dialog/confirmation-dialog';

import
{
    OrbitLoaderComponent
}
from '../../utilities/orbit-loader/orbit-loader';


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

    mobileNoLabel:
        string;

    mobileNoPlaceholder:
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
        CommonModule,

        FormsModule,

        ConfirmationDialogComponent,

        OrbitLoaderComponent
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
    implements OnDestroy
{
    //===========================================================
    // Authentication
    //===========================================================

    private readonly authenticationService:
        AuthenticationService;


    //===========================================================
    // Change Detection
    //===========================================================

    private readonly changeDetectorRef:
        ChangeDetectorRef;


    //===========================================================
    // Registration Loader
    //===========================================================

    private registrationLoaderStartedAt:
        number =
            0;

    private registrationLoaderTimer:
        ReturnType<typeof setTimeout> |
        null =
            null;


    //===========================================================
    // Configuration
    //===========================================================

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

        mobileNoLabel:
            'Mobile Number',

        mobileNoPlaceholder:
            'Enter your mobile number',

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


    //===========================================================
    // Constructor
    //===========================================================

    constructor
    (
        authenticationService:
            AuthenticationService,

        changeDetectorRef:
            ChangeDetectorRef
    )
    {
        this.authenticationService =
            authenticationService;

        this.changeDetectorRef =
            changeDetectorRef;
    }


    //===========================================================
    // Configuration Change
    //===========================================================

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

    mobileNo:
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
    // Registration State
    //===========================================================

    isRegistering:
        boolean =
            false;

    registrationError:
        string =
            '';

    registrationSuccess:
        string =
            '';


    //===========================================================
    // Registration Loader State
    //===========================================================

    showRegistrationLoader:
        boolean =
            false;


    //===========================================================
    // Confirmation Dialog State
    //===========================================================

    showConfirmationDialog:
        boolean =
            false;

    confirmationFullName:
        string =
            '';

    confirmationDisplayName:
        string =
            '';

    confirmationMobileNo:
        string =
            '';

    confirmationLoginId:
        string =
            '';


    //===========================================================
    // Field Validation State
    //===========================================================

    fullNameError:
        string =
            '';

    displayNameError:
        string =
            '';

    emailError:
        string =
            '';

    mobileNoError:
        string =
            '';

    loginIdError:
        string =
            '';

    passwordError:
        string =
            '';

    confirmPasswordError:
        string =
            '';

    termsError:
        string =
            '';


    //===========================================================
    // Field Interaction State
    //===========================================================

    fullNameTouched:
        boolean =
            false;

    displayNameTouched:
        boolean =
            false;

    emailTouched:
        boolean =
            false;

    mobileNoTouched:
        boolean =
            false;

    loginIdTouched:
        boolean =
            false;

    passwordTouched:
        boolean =
            false;

    confirmPasswordTouched:
        boolean =
            false;

    termsTouched:
        boolean =
            false;


    //===========================================================
    // Validation Rules
    //===========================================================

    readonly fullNameMinLength:
        number =
            2;

    readonly fullNameMaxLength:
        number =
            100;

    readonly displayNameMinLength:
        number =
            3;

    readonly displayNameMaxLength:
        number =
            10;

    readonly mobileNoMinLength:
        number =
            7;

    readonly mobileNoMaxLength:
        number =
            20;

    readonly loginIdMinLength:
        number =
            4;

    readonly loginIdMaxLength:
        number =
            20;

    readonly passwordMinLength:
        number =
            8;

    readonly passwordMaxLength:
        number =
            32;


    //===========================================================
    // Validation Patterns
    //===========================================================

    private readonly fullNamePattern:
        RegExp =
            /^[\p{L}]+(?: [\p{L}]+)*$/u;

    private readonly displayNamePattern:
        RegExp =
            /^[\p{L}]{3,10}$/u;

    private readonly emailPattern:
        RegExp =
            /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    private readonly mobileNoPattern:
        RegExp =
            /^\d{7,20}$/;

    private readonly loginIdPattern:
        RegExp =
            /^[A-Za-z][A-Za-z0-9_]{3,19}$/;

    private readonly passwordUppercasePattern:
        RegExp =
            /[A-Z]/;

    private readonly passwordLowercasePattern:
        RegExp =
            /[a-z]/;

    private readonly passwordNumberPattern:
        RegExp =
            /[0-9]/;

    private readonly passwordSpecialCharacterPattern:
        RegExp =
            /[^A-Za-z0-9\s]/;

    private readonly passwordSpacePattern:
        RegExp =
            /\s/;


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

        this.fullNameTouched =
            true;

        this.clearRegistrationMessages();

        this.validateFullName();
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
            value
                .replace(
                    /[^\p{L}]/gu,
                    ''
                )
                .slice(
                    0,
                    this.displayNameMaxLength
                );

        this.displayNameTouched =
            true;

        this.clearRegistrationMessages();

        this.validateDisplayName();
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

        this.emailTouched =
            true;

        this.clearRegistrationMessages();

        this.validateEmail();
    }


    //===========================================================
    // Mobile Number Change
    //===========================================================

    onMobileNoChange
    (
        value:
            string
    ):
        void
    {
        this.mobileNo =
            value
                .replace(
                    /\D/g,
                    ''
                )
                .slice(
                    0,
                    this.mobileNoMaxLength
                );

        this.mobileNoTouched =
            true;

        this.clearRegistrationMessages();

        this.validateMobileNo();
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
        let filteredValue:
            string =
                value
                    .replace(
                        /[^A-Za-z0-9_]/g,
                        ''
                    );


        if
        (
            filteredValue.length >
            0
            &&
            !/^[A-Za-z]/.test(
                filteredValue
            )
        )
        {
            filteredValue =
                filteredValue.replace(
                    /^[^A-Za-z]+/,
                    ''
                );
        }


        this.loginId =
            filteredValue
                .slice(
                    0,
                    this.loginIdMaxLength
                );

        this.loginIdTouched =
            true;

        this.clearRegistrationMessages();

        this.validateLoginId();
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

        this.passwordTouched =
            true;

        this.clearRegistrationMessages();

        this.validatePassword();


        if
        (
            this.confirmPasswordTouched
        )
        {
            this.validateConfirmPassword();
        }
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

        this.confirmPasswordTouched =
            true;

        this.clearRegistrationMessages();

        this.validateConfirmPassword();
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

        this.termsTouched =
            true;

        this.clearRegistrationMessages();

        this.validateTerms();
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
    // Full Name Blur
    //===========================================================

    onFullNameBlur():
        void
    {
        this.fullNameTouched =
            true;

        this.validateFullName();
    }


    //===========================================================
    // Display Name Blur
    //===========================================================

    onDisplayNameBlur():
        void
    {
        this.displayNameTouched =
            true;

        this.validateDisplayName();
    }


    //===========================================================
    // Email Blur
    //===========================================================

    onEmailBlur():
        void
    {
        this.emailTouched =
            true;

        this.validateEmail();
    }


    //===========================================================
    // Mobile Number Blur
    //===========================================================

    onMobileNoBlur():
        void
    {
        this.mobileNoTouched =
            true;

        this.validateMobileNo();
    }


    //===========================================================
    // Login ID Blur
    //===========================================================

    onLoginIdBlur():
        void
    {
        this.loginIdTouched =
            true;

        this.validateLoginId();
    }


    //===========================================================
    // Password Blur
    //===========================================================

    onPasswordBlur():
        void
    {
        this.passwordTouched =
            true;

        this.validatePassword();
    }


    //===========================================================
    // Confirm Password Blur
    //===========================================================

    onConfirmPasswordBlur():
        void
    {
        this.confirmPasswordTouched =
            true;

        this.validateConfirmPassword();
    }


    //===========================================================
    // Terms Blur
    //===========================================================

    onTermsBlur():
        void
    {
        this.termsTouched =
            true;

        this.validateTerms();
    }


    //===========================================================
    // Full Name Validation
    //===========================================================

    private validateFullName():
        boolean
    {
        const value:
            string =
                this.fullName.trim();


        if
        (
            !value
        )
        {
            this.fullNameError =
                'Full Name is required.';

            return false;
        }


        if
        (
            value.length <
            this.fullNameMinLength
        )
        {
            this.fullNameError =
                `Full Name must contain at least ${this.fullNameMinLength} characters.`;

            return false;
        }


        if
        (
            value.length >
            this.fullNameMaxLength
        )
        {
            this.fullNameError =
                `Full Name must not exceed ${this.fullNameMaxLength} characters.`;

            return false;
        }


        if
        (
            !this.fullNamePattern.test(
                value
            )
        )
        {
            this.fullNameError =
                'Full Name may contain letters and spaces only.';

            return false;
        }


        this.fullNameError =
            '';

        return true;
    }


    //===========================================================
    // Display Name Validation
    //===========================================================

    private validateDisplayName():
        boolean
    {
        const value:
            string =
                this.displayName;


        if
        (
            !value
        )
        {
            this.displayNameError =
                'Display Name is required.';

            return false;
        }


        if
        (
            value.length <
            this.displayNameMinLength
        )
        {
            this.displayNameError =
                `Display Name must contain at least ${this.displayNameMinLength} letters.`;

            return false;
        }


        if
        (
            value.length >
            this.displayNameMaxLength
        )
        {
            this.displayNameError =
                `Display Name must not exceed ${this.displayNameMaxLength} letters.`;

            return false;
        }


        if
        (
            !this.displayNamePattern.test(
                value
            )
        )
        {
            this.displayNameError =
                'Display Name may contain letters only. No spaces, numbers or special characters are allowed.';

            return false;
        }


        this.displayNameError =
            '';

        return true;
    }


    //===========================================================
    // Email Validation
    //===========================================================

    private validateEmail():
        boolean
    {
        const value:
            string =
                this.email.trim();


        if
        (
            !value
        )
        {
            this.emailError =
                'Email Address is required.';

            return false;
        }


        if
        (
            !this.emailPattern.test(
                value
            )
        )
        {
            this.emailError =
                'Please enter a valid email address, for example name@example.com.';

            return false;
        }


        this.emailError =
            '';

        return true;
    }


    //===========================================================
    // Mobile Number Validation
    //===========================================================

    private validateMobileNo():
        boolean
    {
        const value:
            string =
                this.mobileNo;


        if
        (
            !value
        )
        {
            this.mobileNoError =
                'Mobile Number is required.';

            return false;
        }


        if
        (
            !/^\d+$/.test(
                value
            )
        )
        {
            this.mobileNoError =
                'Mobile Number may contain digits only.';

            return false;
        }


        if
        (
            value.length <
            this.mobileNoMinLength
        )
        {
            this.mobileNoError =
                `Mobile Number must contain at least ${this.mobileNoMinLength} digits.`;

            return false;
        }


        if
        (
            value.length >
            this.mobileNoMaxLength
        )
        {
            this.mobileNoError =
                `Mobile Number must not exceed ${this.mobileNoMaxLength} digits.`;

            return false;
        }


        if
        (
            !this.mobileNoPattern.test(
                value
            )
        )
        {
            this.mobileNoError =
                'Mobile Number must contain digits only.';

            return false;
        }


        this.mobileNoError =
            '';

        return true;
    }


    //===========================================================
    // Login ID Validation
    //===========================================================

    private validateLoginId():
        boolean
    {
        const value:
            string =
                this.loginId;


        if
        (
            !value
        )
        {
            this.loginIdError =
                'Login ID is required.';

            return false;
        }


        if
        (
            value.length <
            this.loginIdMinLength
        )
        {
            this.loginIdError =
                `Login ID must contain at least ${this.loginIdMinLength} characters.`;

            return false;
        }


        if
        (
            value.length >
            this.loginIdMaxLength
        )
        {
            this.loginIdError =
                `Login ID must not exceed ${this.loginIdMaxLength} characters.`;

            return false;
        }


        if
        (
            !/^[A-Za-z]/.test(
                value
            )
        )
        {
            this.loginIdError =
                'Login ID must start with a letter.';

            return false;
        }


        if
        (
            !this.loginIdPattern.test(
                value
            )
        )
        {
            this.loginIdError =
                'Login ID may contain letters, numbers and underscore only.';

            return false;
        }


        this.loginIdError =
            '';

        return true;
    }


    //===========================================================
    // Password Validation
    //===========================================================

    private validatePassword():
        boolean
    {
        const value:
            string =
                this.password;


        if
        (
            !value
        )
        {
            this.passwordError =
                'Password is required.';

            return false;
        }


        if
        (
            value.length <
            this.passwordMinLength
        )
        {
            this.passwordError =
                `Password must contain at least ${this.passwordMinLength} characters.`;

            return false;
        }


        if
        (
            value.length >
            this.passwordMaxLength
        )
        {
            this.passwordError =
                `Password must not exceed ${this.passwordMaxLength} characters.`;

            return false;
        }


        if
        (
            this.passwordSpacePattern.test(
                value
            )
        )
        {
            this.passwordError =
                'Password must not contain spaces.';

            return false;
        }


        if
        (
            !this.passwordUppercasePattern.test(
                value
            )
        )
        {
            this.passwordError =
                'Password must contain at least one uppercase letter.';

            return false;
        }


        if
        (
            !this.passwordLowercasePattern.test(
                value
            )
        )
        {
            this.passwordError =
                'Password must contain at least one lowercase letter.';

            return false;
        }


        if
        (
            !this.passwordNumberPattern.test(
                value
            )
        )
        {
            this.passwordError =
                'Password must contain at least one number.';

            return false;
        }


        if
        (
            !this.passwordSpecialCharacterPattern.test(
                value
            )
        )
        {
            this.passwordError =
                'Password must contain at least one special character.';

            return false;
        }


        this.passwordError =
            '';

        return true;
    }


    //===========================================================
    // Confirm Password Validation
    //===========================================================

    private validateConfirmPassword():
        boolean
    {
        const value:
            string =
                this.confirmPassword;


        if
        (
            !value
        )
        {
            this.confirmPasswordError =
                'Confirm Password is required.';

            return false;
        }


        if
        (
            value !==
            this.password
        )
        {
            this.confirmPasswordError =
                'Confirm Password must exactly match Password.';

            return false;
        }


        this.confirmPasswordError =
            '';

        return true;
    }


    //===========================================================
    // Terms Validation
    //===========================================================

    private validateTerms():
        boolean
    {
        if
        (
            !this.termsAccepted
        )
        {
            this.termsError =
                'You must accept the Terms of Service and Privacy Policy.';

            return false;
        }


        this.termsError =
            '';

        return true;
    }


    //===========================================================
    // Validate All Fields
    //===========================================================

    private validateAllFields():
        boolean
    {
        this.fullNameTouched =
            true;

        this.displayNameTouched =
            true;

        this.emailTouched =
            true;

        this.mobileNoTouched =
            true;

        this.loginIdTouched =
            true;

        this.passwordTouched =
            true;

        this.confirmPasswordTouched =
            true;

        this.termsTouched =
            true;


        const fullNameValid:
            boolean =
                this.validateFullName();

        const displayNameValid:
            boolean =
                this.validateDisplayName();

        const emailValid:
            boolean =
                this.validateEmail();

        const mobileNoValid:
            boolean =
                this.validateMobileNo();

        const loginIdValid:
            boolean =
                this.validateLoginId();

        const passwordValid:
            boolean =
                this.validatePassword();

        const confirmPasswordValid:
            boolean =
                this.validateConfirmPassword();

        const termsValid:
            boolean =
                this.validateTerms();


        if
        (
            !fullNameValid
            ||
            !displayNameValid
            ||
            !emailValid
            ||
            !mobileNoValid
            ||
            !loginIdValid
            ||
            !passwordValid
            ||
            !confirmPasswordValid
            ||
            !termsValid
        )
        {
            return false;
        }


        return true;
    }


    //===========================================================
    // Registration
    // ----------------------------------------------------------
    // Validates the registration form and saves the registration
    // through the Authentication API.
    //===========================================================

    onRegister():
        void
    {
        this.registrationError =
            '';

        this.registrationSuccess =
            '';


        //=======================================================
        // Validate All Fields
        //=======================================================

        const isValid:
            boolean =
                this.validateAllFields();


        if
        (
            !isValid
        )
        {
            this.registrationError =
                'Please correct the highlighted fields before creating your account.';

            this.changeDetectorRef.markForCheck();

            return;
        }


        //=======================================================
        // Registration State
        //=======================================================

        this.isRegistering =
            true;

        this.showRegistrationLoader =
            true;

        this.registrationLoaderStartedAt =
            Date.now();

        this.changeDetectorRef.markForCheck();


        //=======================================================
        // Registration Request
        // ------------------------------------------------------
        // Frontend-only fields:
        //
        //     confirmPassword
        //     termsAccepted
        //
        // are intentionally not sent to the backend.
        //=======================================================

        const request:
            RegisterRequest =
        {
            userName:
                this.loginId.trim(),

            displayName:
                this.displayName.trim(),

            fullName:
                this.fullName.trim(),

            email:
                this.email.trim(),

            mobileNo:
                this.mobileNo.trim(),

            password:
                this.password
        };


        //=======================================================
        // Save Registration
        //=======================================================

        this.authenticationService
            .register
            (
                request
            )
            .subscribe
            ({
                next:
                    response =>
                    {
                        this.isRegistering =
                            false;


                        if
                        (
                            !response.success
                        )
                        {
                            this.showRegistrationLoader =
                                false;

                            this.registrationError =
                                response.message
                                ||
                                'Unable to complete registration. Please try again.';

                            this.changeDetectorRef.markForCheck();

                            return;
                        }


                        //===================================================
                        // Registration Success
                        //===================================================

                        this.registrationError =
                            '';

                        this.registrationSuccess =
                            '';


                        //===================================================
                        // Confirmation Dialog Data
                        //===================================================

                        this.confirmationFullName =
                            this.fullName.trim();

                        this.confirmationDisplayName =
                            this.displayName.trim();

                        this.confirmationMobileNo =
                            this.mobileNo.trim();

                        this.confirmationLoginId =
                            this.loginId.trim();


                        //===================================================
                        // Complete Minimum Loader Duration
                        //===================================================

                        const elapsedTime:
                            number =
                                Date.now() -
                                this.registrationLoaderStartedAt;

                        const minimumLoaderDuration:
                            number =
                                10000;

                        const remainingTime:
                            number =
                                Math.max(
                                    0,
                                    minimumLoaderDuration -
                                    elapsedTime
                                );


                        this.registrationLoaderTimer =
                            setTimeout
                            (
                                () =>
                                {
                                    this.registrationLoaderTimer =
                                        null;


                                    //=======================================
                                    // Close Orbit Loader
                                    //=======================================

                                    this.showRegistrationLoader =
                                        false;


                                    //=======================================
                                    // Open Confirmation Dialog
                                    //=======================================

                                    this.showConfirmationDialog =
                                        true;


                                    //=======================================
                                    // Refresh OnPush View
                                    //=======================================

                                    this.changeDetectorRef.markForCheck();
                                },

                                remainingTime
                            );


                        //===================================================
                        // Refresh OnPush View
                        //===================================================

                        this.changeDetectorRef.markForCheck();
                    },


                error:
                    error =>
                    {
                        this.isRegistering =
                            false;

                        this.showRegistrationLoader =
                            false;

                        this.registrationSuccess =
                            '';

                        this.registrationError =
                            error?.error?.message
                            ||
                            'Unable to complete registration. Please try again.';


                        //===================================================
                        // Refresh OnPush View
                        //===================================================

                        this.changeDetectorRef.markForCheck();
                    }
            });
    }


    //===========================================================
    // Confirmation Dialog Okay
    //===========================================================

    onConfirmationOkay():
        void
    {
        this.showConfirmationDialog =
            false;

        this.changeDetectorRef.markForCheck();

        this.onBackToLogin();
    }


    //===========================================================
    // Clear Registration Messages
    //===========================================================

    private clearRegistrationMessages():
        void
    {
        this.registrationError =
            '';

        this.registrationSuccess =
            '';
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
        this.showConfirmationDialog =
            false;

        this.showRegistrationLoader =
            false;


        if
        (
            this.registrationLoaderTimer !==
            null
        )
        {
            clearTimeout(
                this.registrationLoaderTimer
            );

            this.registrationLoaderTimer =
                null;
        }


        this.clearRegistrationMessages();

        this.fullNameError =
            '';

        this.displayNameError =
            '';

        this.emailError =
            '';

        this.mobileNoError =
            '';

        this.loginIdError =
            '';

        this.passwordError =
            '';

        this.confirmPasswordError =
            '';

        this.termsError =
            '';

        this.fullNameTouched =
            false;

        this.displayNameTouched =
            false;

        this.emailTouched =
            false;

        this.mobileNoTouched =
            false;

        this.loginIdTouched =
            false;

        this.passwordTouched =
            false;

        this.confirmPasswordTouched =
            false;

        this.termsTouched =
            false;

        this.changeDetectorRef.markForCheck();

        this.backToLogin.emit();
    }


    //===========================================================
    // Component Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        if
        (
            this.registrationLoaderTimer !==
            null
        )
        {
            clearTimeout(
                this.registrationLoaderTimer
            );

            this.registrationLoaderTimer =
                null;
        }
    }
}