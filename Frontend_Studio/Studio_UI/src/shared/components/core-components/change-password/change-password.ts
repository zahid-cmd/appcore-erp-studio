//===============================================================
// Imports
//===============================================================

import
{
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output
}
from '@angular/core';

import
{
    Router
}
from '@angular/router';

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
    Subscription,
    timeout
}
from 'rxjs';


//===============================================================
// Authentication Service
//===============================================================

import
{
    AuthenticationService
}
from '../../../../core/authentication/authentication.service';


//===============================================================
// Authentication Storage Service
//===============================================================

import
{
    AuthenticationStorageService
}
from '../../../../core/authentication/authentication-storage.service';


//===============================================================
// Authentication Model
//===============================================================

import
{
    ChangePasswordRequest,
    ValidateCurrentPasswordRequest
}
from '../../../../core/authentication/authentication.model';


//===============================================================
// Confirm Dialog Service
//===============================================================

import
{
    ConfirmDialogService
}
from '../../utilities/confirm-dialog/confirm-dialog.service';


//===============================================================
// Progress Dialog Component
//===============================================================

import
{
    ProgressDialogComponent
}
from '../../utilities/progress-dialog/progress-dialog';


//===============================================================
// Progress Dialog Service
//===============================================================

import
{
    ProgressDialogService
}
from '../../utilities/progress-dialog/progress-dialog.service';


//===============================================================
// Component
//===============================================================

@Component
({
    selector:
        'app-change-password',

    standalone:
        true,

    imports:
    [
        CommonModule,

        FormsModule,

        ProgressDialogComponent
    ],

    templateUrl:
        './change-password.html',

    styleUrls:
    [
        './change-password.css'
    ]
})


//===============================================================
// Change Password Component
//===============================================================

export class ChangePasswordComponent
    implements OnInit, OnDestroy
{
    //===========================================================
    // Services
    //===========================================================

    constructor
    (
        private readonly authenticationService:
            AuthenticationService,

        private readonly authenticationStorageService:
            AuthenticationStorageService,

        private readonly confirmDialog:
            ConfirmDialogService,

        private readonly progressDialog:
            ProgressDialogService,

        private readonly router:
            Router
    )
    {
    }


    //===========================================================
    // Visibility
    // ----------------------------------------------------------
    // Controls only the Change Password shell visibility.
    //
    // The component itself remains mounted while the confirmation
    // dialog or progress dialog is active. This preserves the
    // current form state and prevents the component from being
    // destroyed before the confirmation callback executes.
    //===========================================================

    @Input()
    visible:
        boolean =
        true;


    //===========================================================
    // Outputs
    //===========================================================

    @Output()
    close =
        new EventEmitter<void>();


    @Output()
    update =
        new EventEmitter
        <
            {
                loginId:
                    string;

                currentPassword:
                    string;

                newPassword:
                    string;

                confirmPassword:
                    string;
            }
        >();


    //===========================================================
    // Reopen
    // ----------------------------------------------------------
    // Used when the confirmation dialog is cancelled.
    //
    // Flow:
    //
    //     Change Password
    //          ↓
    //     Close
    //          ↓
    //     Confirm Dialog
    //          ↓
    //     Cancel
    //          ↓
    //     Reopen Change Password
    //
    // The parent component can listen to this event and restore
    // the Change Password overlay.
    //===========================================================

    @Output()
    reopen =
        new EventEmitter<void>();


    //===========================================================
    // Form Values
    //===========================================================

    loginId:
        string =
        '';


    currentPassword:
        string =
        '';


    newPassword:
        string =
        '';


    confirmPassword:
        string =
        '';


    //===========================================================
    // Password Visibility
    //===========================================================

    showCurrentPassword:
        boolean =
        false;


    showNewPassword:
        boolean =
        false;


    showConfirmPassword:
        boolean =
        false;


    //===========================================================
    // Password Requirements Tooltip
    //===========================================================

    showPasswordRequirements:
        boolean =
        false;


    //===========================================================
    // Form State
    //===========================================================

    isUpdating:
        boolean =
        false;


    submitted:
        boolean =
        false;


    //===========================================================
    // Current Password Validation State
    //===========================================================

    currentPasswordVerified:
        boolean |
        null =
        null;


    currentPasswordValidating:
        boolean =
        false;


    currentPasswordError:
        string =
        '';


    currentPasswordSuccess:
        string =
        '';


    //===========================================================
    // Validation Request Tracking
    //===========================================================

    private currentPasswordValidationRequestId:
        number =
        0;


    //===========================================================
    // Validation Subscription
    //===========================================================

    private currentPasswordValidationSubscription:
        Subscription |
        null =
        null;


    //===========================================================
    // Validation Debounce Timer
    //===========================================================

    private currentPasswordValidationTimer:
        ReturnType<typeof setTimeout> |
        null =
        null;


    //===========================================================
    // PASSWORD UPDATE PROGRESS TIMING
    // ----------------------------------------------------------
    // The progress dialog must remain visible for at least
    // 5 seconds after the password update begins.
    //===========================================================

    private passwordUpdateStartedAt:
        number |
        null =
        null;


    private passwordUpdateCompletionTimer:
        ReturnType<typeof setTimeout> |
        null =
        null;


    //===========================================================
    // API Error
    //===========================================================

    errorMessage:
        string =
        '';


    //===========================================================
    // New Password Validation Rules
    //
    // These rules are intentionally identical to the
    // Registration Panel password rules.
    //===========================================================

    readonly passwordMinLength:
        number =
        8;


    readonly passwordMaxLength:
        number =
        32;


    //===========================================================
    // New Password Validation Patterns
    //===========================================================

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
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.loadAuthenticatedUser();
    }


    //===========================================================
    // Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        this.cancelCurrentPasswordValidationTimer();

        this.cancelCurrentPasswordValidation();

        this.cancelPasswordUpdateCompletionTimer();
    }


    //===========================================================
    // Load Authenticated User
    //===========================================================

    private loadAuthenticatedUser():
        void
    {
        const authenticatedUser =
            this.authenticationStorageService
                .getUser();


        //=======================================================
        // No Authenticated User
        //=======================================================

        if
        (
            !authenticatedUser
        )
        {
            this.loginId =
                '';

            return;
        }


        //=======================================================
        // Login ID
        //=======================================================

        this.loginId =
            (
                authenticatedUser.userName
                ??
                ''
            )
            .trim();
    }


    //===========================================================
    // Current Password Input Type
    //===========================================================

    get currentPasswordType():
        string
    {
        return this.showCurrentPassword
            ? 'text'
            : 'password';
    }


    //===========================================================
    // New Password Input Type
    //===========================================================

    get newPasswordType():
        string
    {
        return this.showNewPassword
            ? 'text'
            : 'password';
    }


    //===========================================================
    // Confirm Password Input Type
    //===========================================================

    get confirmPasswordType():
        string
    {
        return this.showConfirmPassword
            ? 'text'
            : 'password';
    }


    //===========================================================
    // Password Strength
    //
    // Strength is calculated from the SAME five requirements
    // used by the Registration Panel:
    //
    //     1. Minimum 8 characters
    //     2. Uppercase letter
    //     3. Lowercase letter
    //     4. Number
    //     5. Special character
    //
    // Score:
    //
    //     0 = Empty
    //     1–2 = Weak
    //     3–4 = Strong
    //     5 = Very Strong
    //
    // IMPORTANT:
    //
    // A score of 3 or 4 does NOT mean the password is valid.
    // The password is valid only when ALL registration rules
    // are satisfied, including:
    //
    //     - Maximum 32 characters
    //     - No spaces
    //
    //===========================================================

    get passwordStrength():
        number
    {
        const password =
            this.newPassword ||
            '';


        if
        (
            !password
        )
        {
            return 0;
        }


        let strength:
            number =
            0;


        //=======================================================
        // Minimum Length
        //=======================================================

        if
        (
            password.length >=
            this.passwordMinLength
        )
        {
            strength++;
        }


        //=======================================================
        // Uppercase
        //=======================================================

        if
        (
            this.passwordUppercasePattern.test(
                password
            )
        )
        {
            strength++;
        }


        //=======================================================
        // Lowercase
        //=======================================================

        if
        (
            this.passwordLowercasePattern.test(
                password
            )
        )
        {
            strength++;
        }


        //=======================================================
        // Number
        //=======================================================

        if
        (
            this.passwordNumberPattern.test(
                password
            )
        )
        {
            strength++;
        }


        //=======================================================
        // Special Character
        //=======================================================

        if
        (
            this.passwordSpecialCharacterPattern.test(
                password
            )
        )
        {
            strength++;
        }


        return strength;
    }


    //===========================================================
    // Password Strength Text
    //===========================================================

    get passwordStrengthText():
        string
    {
        switch
        (
            this.passwordStrength
        )
        {
            case 1:
            case 2:
                return 'Weak';

            case 3:
            case 4:
                return 'Strong';

            case 5:
                return 'Very Strong';

            default:
                return 'Enter a new password';
        }
    }


    //===========================================================
    // Password Strength Class
    //
    // Used by the HTML/CSS to apply:
    //
    //     weak        → orange
    //     strong      → blue
    //     very-strong → green
    //
    //===========================================================

    get passwordStrengthClass():
        string
    {
        switch
        (
            this.passwordStrength
        )
        {
            case 1:
            case 2:
                return 'weak';

            case 3:
            case 4:
                return 'strong';

            case 5:
                return 'very-strong';

            default:
                return '';
        }
    }


    //===========================================================
    // Password Strength Validity
    //
    // This checks the COMPLETE Registration password policy.
    //
    //===========================================================

    get newPasswordValid():
        boolean
    {
        const password =
            this.newPassword;


        //=======================================================
        // Required
        //=======================================================

        if
        (
            !password
        )
        {
            return false;
        }


        //=======================================================
        // Minimum Length
        //=======================================================

        if
        (
            password.length <
            this.passwordMinLength
        )
        {
            return false;
        }


        //=======================================================
        // Maximum Length
        //=======================================================

        if
        (
            password.length >
            this.passwordMaxLength
        )
        {
            return false;
        }


        //=======================================================
        // No Spaces
        //=======================================================

        if
        (
            this.passwordSpacePattern.test(
                password
            )
        )
        {
            return false;
        }


        //=======================================================
        // Uppercase
        //=======================================================

        if
        (
            !this.passwordUppercasePattern.test(
                password
            )
        )
        {
            return false;
        }


        //=======================================================
        // Lowercase
        //=======================================================

        if
        (
            !this.passwordLowercasePattern.test(
                password
            )
        )
        {
            return false;
        }


        //=======================================================
        // Number
        //=======================================================

        if
        (
            !this.passwordNumberPattern.test(
                password
            )
        )
        {
            return false;
        }


        //=======================================================
        // Special Character
        //=======================================================

        if
        (
            !this.passwordSpecialCharacterPattern.test(
                password
            )
        )
        {
            return false;
        }


        return true;
    }


    //===========================================================
    // Password Match
    //===========================================================

    get passwordsMatch():
        boolean
    {
        if
        (
            !this.confirmPassword
        )
        {
            return false;
        }


        return (
            this.newPassword ===
            this.confirmPassword
        );
    }


    //===========================================================
    // Form Has Changes
    //===========================================================

    get hasChanges():
        boolean
    {
        return (
            this.currentPassword.trim().length > 0
            ||
            this.newPassword.trim().length > 0
            ||
            this.confirmPassword.trim().length > 0
        );
    }


    //===========================================================
    // New Password Readonly
    //===========================================================

    get newPasswordReadonly():
        boolean
    {
        return (
            this.isUpdating
            ||
            this.currentPasswordValidating
            ||
            this.currentPasswordVerified !== true
        );
    }


    //===========================================================
    // Confirm Password Readonly
    //===========================================================

    get confirmPasswordReadonly():
        boolean
    {
        return (
            this.isUpdating
            ||
            this.currentPasswordValidating
            ||
            this.currentPasswordVerified !== true
        );
    }


    //===========================================================
    // Form Valid
    //
    // New Password MUST satisfy the complete Registration
    // password policy.
    //
    //===========================================================

    get isFormValid():
        boolean
    {
        return (
            this.loginId.trim().length > 0
            &&
            this.currentPassword.trim().length > 0
            &&
            this.currentPasswordVerified === true
            &&
            this.newPasswordValid
            &&
            this.confirmPassword.trim().length > 0
            &&
            this.passwordsMatch
        );
    }


    //===========================================================
    // Current Password Invalid
    //===========================================================

    get currentPasswordInvalid():
        boolean
    {
        return (
            this.submitted
            &&
            !this.currentPassword.trim()
        )
        ||
        (
            this.currentPasswordVerified === false
        );
    }


    //===========================================================
    // New Password Invalid
    //===========================================================

    get newPasswordInvalid():
        boolean
    {
        return (
            this.submitted
            &&
            !this.newPasswordValid
        );
    }


    //===========================================================
    // Confirm Password Invalid
    //
    // LIVE VALIDATION
    //
    // The Confirm Password field becomes red immediately when
    // the user has entered a value that does not match the
    // New Password field.
    //
    // No Update button click is required.
    //
    //===========================================================

    get confirmPasswordInvalid():
        boolean
    {
        return (
            this.confirmPassword.trim().length > 0
            &&
            !this.passwordsMatch
        );
    }


    //===========================================================
    // Toggle Current Password
    //===========================================================

    toggleCurrentPassword():
        void
    {
        if
        (
            this.isUpdating
            ||
            this.currentPasswordValidating
        )
        {
            return;
        }


        this.showCurrentPassword =
            !this.showCurrentPassword;
    }


    //===========================================================
    // Toggle New Password
    //===========================================================

    toggleNewPassword():
        void
    {
        if
        (
            this.newPasswordReadonly
        )
        {
            return;
        }


        this.showNewPassword =
            !this.showNewPassword;
    }


    //===========================================================
    // Toggle Confirm Password
    //===========================================================

    toggleConfirmPassword():
        void
    {
        if
        (
            this.confirmPasswordReadonly
        )
        {
            return;
        }


        this.showConfirmPassword =
            !this.showConfirmPassword;
    }


    //===========================================================
    // Toggle Password Requirements
    //===========================================================

    togglePasswordRequirements():
        void
    {
        if
        (
            this.isUpdating
        )
        {
            return;
        }


        this.showPasswordRequirements =
            !this.showPasswordRequirements;
    }


    //===========================================================
    // Current Password Changed
    //===========================================================

    onCurrentPasswordChanged():
        void
    {
        //=======================================================
        // Cancel Existing Timer
        //=======================================================

        this.cancelCurrentPasswordValidationTimer();


        //=======================================================
        // Cancel Existing HTTP Request
        //=======================================================

        this.cancelCurrentPasswordValidation();


        //=======================================================
        // Invalidate Previous Request
        //=======================================================

        this.currentPasswordValidationRequestId++;


        //=======================================================
        // Reset Validation State
        //=======================================================

        this.currentPasswordVerified =
            null;

        this.currentPasswordValidating =
            false;

        this.currentPasswordError =
            '';

        this.currentPasswordSuccess =
            '';

        this.errorMessage =
            '';


        //=======================================================
        // No Login ID
        //=======================================================

        if
        (
            !this.loginId.trim()
        )
        {
            this.currentPasswordVerified =
                false;

            this.currentPasswordError =
                'Authenticated Login ID could not be determined.';

            return;
        }


        //=======================================================
        // Empty Current Password
        //=======================================================

        if
        (
            !this.currentPassword.trim()
        )
        {
            return;
        }


        //=======================================================
        // Schedule Automatic Validation
        //=======================================================

        this.currentPasswordValidationTimer =
            setTimeout
            (
                () =>
                {
                    this.currentPasswordValidationTimer =
                        null;

                    this.validateCurrentPassword();
                },

                400
            );
    }


    //===========================================================
    // Validate Current Password
    //===========================================================

    validateCurrentPassword():
        void
    {
        //=======================================================
        // Prevent Validation While Updating
        //=======================================================

        if
        (
            this.isUpdating
        )
        {
            return;
        }


        //=======================================================
        // Cancel Pending Debounce Timer
        //=======================================================

        this.cancelCurrentPasswordValidationTimer();


        //=======================================================
        // Do Not Start Another Request While One Is Running
        //=======================================================

        if
        (
            this.currentPasswordValidating
        )
        {
            return;
        }


        //=======================================================
        // Do Not Revalidate Already Verified Password
        //=======================================================

        if
        (
            this.currentPasswordVerified === true
        )
        {
            return;
        }


        //=======================================================
        // Validate Login ID
        //=======================================================

        if
        (
            !this.loginId.trim()
        )
        {
            this.currentPasswordVerified =
                false;

            this.currentPasswordValidating =
                false;

            this.currentPasswordError =
                'Authenticated Login ID could not be determined.';

            this.currentPasswordSuccess =
                '';

            return;
        }


        //=======================================================
        // Validate Current Password
        //=======================================================

        if
        (
            !this.currentPassword.trim()
        )
        {
            this.currentPasswordVerified =
                null;

            this.currentPasswordValidating =
                false;

            this.currentPasswordError =
                '';

            this.currentPasswordSuccess =
                '';

            return;
        }


        //=======================================================
        // Create New Request ID
        //=======================================================

        this.currentPasswordValidationRequestId++;


        const validationRequestId =
            this.currentPasswordValidationRequestId;


        //=======================================================
        // Clear Previous Messages
        //=======================================================

        this.currentPasswordError =
            '';

        this.currentPasswordSuccess =
            '';


        //=======================================================
        // Reset Verification
        //=======================================================

        this.currentPasswordVerified =
            null;


        //=======================================================
        // Start Validation
        //=======================================================

        this.currentPasswordValidating =
            true;


        //=======================================================
        // Build Request
        //=======================================================

        const request:
            ValidateCurrentPasswordRequest =
        {
            userName:
                this.loginId.trim(),

            currentPassword:
                this.currentPassword
        };


        //=======================================================
        // Call Validation API
        //=======================================================

        this.currentPasswordValidationSubscription =
            this.authenticationService
                .validateCurrentPassword(
                    request
                )
                .pipe
                (
                    timeout(
                        {
                            each:
                                10000
                        }
                    )
                )
                .subscribe
                ({
                    //=================================================
                    // Success
                    //=================================================

                    next:
                        response =>
                    {
                        //=========================================
                        // Ignore Obsolete Response
                        //=========================================

                        if
                        (
                            validationRequestId !==
                            this.currentPasswordValidationRequestId
                        )
                        {
                            return;
                        }


                        //=========================================
                        // Validation Finished
                        //=========================================

                        this.currentPasswordValidating =
                            false;

                        this.currentPasswordValidationSubscription =
                            null;


                        //=========================================
                        // Invalid
                        //=========================================

                        if
                        (
                            !response.success
                        )
                        {
                            this.currentPasswordVerified =
                                false;

                            this.currentPasswordError =
                                response.message
                                ||
                                'Current password is incorrect.';

                            this.currentPasswordSuccess =
                                '';

                            return;
                        }


                        //=========================================
                        // Valid
                        //=========================================

                        this.currentPasswordVerified =
                            true;

                        this.currentPasswordError =
                            '';

                        this.currentPasswordSuccess =
                            response.message
                            ||
                            'Current password verified successfully.';
                    },


                    //=================================================
                    // HTTP / Network / Timeout Error
                    //=================================================

                    error:
                        error =>
                    {
                        //=========================================
                        // Ignore Obsolete Response
                        //=========================================

                        if
                        (
                            validationRequestId !==
                            this.currentPasswordValidationRequestId
                        )
                        {
                            return;
                        }


                        //=========================================
                        // Validation Finished
                        //=========================================

                        this.currentPasswordValidating =
                            false;

                        this.currentPasswordValidationSubscription =
                            null;


                        //=========================================
                        // Invalid State
                        //=========================================

                        this.currentPasswordVerified =
                            false;

                        this.currentPasswordSuccess =
                            '';


                        //=========================================
                        // Error Message
                        //=========================================

                        this.currentPasswordError =
                            this.getCurrentPasswordApiErrorMessage(
                                error
                            );
                    }
                });
    }


    //===========================================================
    // Cancel Validation Timer
    //===========================================================

    private cancelCurrentPasswordValidationTimer():
        void
    {
        if
        (
            this.currentPasswordValidationTimer !==
            null
        )
        {
            clearTimeout(
                this.currentPasswordValidationTimer
            );

            this.currentPasswordValidationTimer =
                null;
        }
    }


    //===========================================================
    // Cancel Current Password Validation
    //===========================================================

    private cancelCurrentPasswordValidation():
        void
    {
        if
        (
            this.currentPasswordValidationSubscription !==
            null
        )
        {
            this.currentPasswordValidationSubscription.unsubscribe();

            this.currentPasswordValidationSubscription =
                null;
        }


        this.currentPasswordValidating =
            false;
    }


    //===========================================================
    // Extract Current Password Validation Error
    //===========================================================

    private getCurrentPasswordApiErrorMessage(
        error:
            any
    ):
        string
    {
        const backendMessage =
            error?.error?.message;


        if
        (
            typeof backendMessage ===
            'string'
            &&
            backendMessage.trim().length > 0
        )
        {
            return backendMessage.trim();
        }


        if
        (
            error?.status ===
            401
        )
        {
            return 'Your authentication session has expired. Please sign in again.';
        }


        if
        (
            error?.name ===
            'TimeoutError'
        )
        {
            return 'Password verification is taking too long. Please try again.';
        }


        return 'Unable to verify the current password. Please try again.';
    }


    //===========================================================
    // Update Password
    //
    // This method validates the form and then opens the central
    // confirmation dialog.
    //
    // IMPORTANT OVERLAY FLOW:
    //
    //     1. Change Password is closed.
    //     2. Confirmation dialog is opened.
    //     3. Cancel reopens Change Password.
    //     4. Confirm executes the password update.
    //
    // The password update API is NOT called until the user
    // explicitly confirms the operation.
    //===========================================================

    onUpdatePassword():
        void
    {
        //=======================================================
        // Prevent Duplicate Submission
        //=======================================================

        if
        (
            this.isUpdating
        )
        {
            return;
        }


        //=======================================================
        // Clear Previous Error
        //=======================================================

        this.errorMessage =
            '';


        //=======================================================
        // Mark Form Submitted
        //=======================================================

        this.submitted =
            true;


        //=======================================================
        // Current Password Still Being Validated
        //=======================================================

        if
        (
            this.currentPasswordValidating
        )
        {
            this.currentPasswordError =
                'Please wait for current password verification to complete.';

            return;
        }


        //=======================================================
        // Current Password Not Verified
        //=======================================================

        if
        (
            this.currentPasswordVerified !==
            true
        )
        {
            this.currentPasswordError =
                this.currentPassword.trim()
                    ? 'Please enter the correct current password.'
                    : 'Current password is required.';

            return;
        }


        //=======================================================
        // Validate New Password
        //=======================================================

        if
        (
            !this.newPasswordValid
        )
        {
            return;
        }


        //=======================================================
        // Validate Confirm Password
        //=======================================================

        if
        (
            !this.confirmPassword.trim()
            ||
            !this.passwordsMatch
        )
        {
            return;
        }


        //=======================================================
        // Validate Form
        //=======================================================

        if
        (
            !this.isFormValid
        )
        {
            return;
        }


        //=======================================================
        // Validate Login ID
        //=======================================================

        if
        (
            !this.loginId.trim()
        )
        {
            this.errorMessage =
                'Authenticated Login ID could not be determined.';

            return;
        }


        //=======================================================
        // OPEN CONFIRMATION DIALOG
        //
        // IMPORTANT:
        //
        // The parent hides the Change Password shell through the
        // visibility input. The component itself remains mounted.
        //
        // This preserves the component instance so the Cancel
        // callback can reopen the same form without losing values.
        //
        //=======================================================

        this.close.emit();


        //=======================================================
        // OPEN CONFIRMATION
        //
        // Confirm:
        //     → Confirmation closes
        //     → executePasswordUpdate()
        //
        // Cancel:
        //     → Confirmation closes
        //     → Change Password is reopened
        //
        //=======================================================

        this.confirmDialog.open
        (
            'Confirm Password Change',

            'Are you sure you want to update your password?',

            () =>
            {
                this.executePasswordUpdate();
            },

            'Confirm',

            'Cancel',

            'primary',

            () =>
            {
                this.reopen.emit();
            }
        );
    }


    //===========================================================
    // EXECUTE PASSWORD UPDATE
    // ----------------------------------------------------------
    // Called only after the confirmation dialog is confirmed.
    //===========================================================

    private executePasswordUpdate():
        void
    {
        //=======================================================
        // Prevent Duplicate Execution
        //=======================================================

        if
        (
            this.isUpdating
        )
        {
            return;
        }


        //=======================================================
        // Set Updating State
        //=======================================================

        this.isUpdating =
            true;


        //=======================================================
        // Record Start Time
        //
        // Used to guarantee that the progress dialog remains
        // visible for a minimum of 5 seconds.
        //=======================================================

        this.passwordUpdateStartedAt =
            Date.now();


        this.cancelPasswordUpdateCompletionTimer();


        //=======================================================
        // Show Progress Dialog
        //=======================================================

        this.progressDialog.show
        (
            'Updating Password',

            'Please wait while your password is being updated...',

            true
        );


        //=======================================================
        // Build Change Password Request
        //=======================================================

        const request:
            ChangePasswordRequest =
        {
            userName:
                this.loginId.trim(),

            currentPassword:
                this.currentPassword,

            newPassword:
                this.newPassword
        };


        //=======================================================
        // Call Change Password API
        //=======================================================

        this.authenticationService
            .changePassword(
                request
            )
            .subscribe
            ({
                //=================================================
                // Success
                //=================================================

                next:
                    response =>
                {
                    //=========================================
                    // Backend Failure
                    //=========================================

                    if
                    (
                        !response.success
                    )
                    {
                        this.progressDialog.close();

                        this.isUpdating =
                            false;

                        this.passwordUpdateStartedAt =
                            null;

                        this.errorMessage =
                            response.message
                            ||
                            'Unable to change password.';

                        return;
                    }


                    //=========================================
                    // Password Successfully Changed
                    //=========================================

                    this.progressDialog.update
                    (
                        100,

                        'Password updated successfully. Returning to login...'
                    );


                    //=========================================
                    // Clear Password Values Immediately
                    //=========================================

                    this.currentPassword =
                        '';

                    this.newPassword =
                        '';

                    this.confirmPassword =
                        '';

                    this.currentPasswordVerified =
                        null;

                    this.currentPasswordValidating =
                        false;

                    this.currentPasswordValidationRequestId++;

                    this.currentPasswordError =
                        '';

                    this.currentPasswordSuccess =
                        '';

                    this.submitted =
                        false;

                    this.showCurrentPassword =
                        false;

                    this.showNewPassword =
                        false;

                    this.showConfirmPassword =
                        false;

                    this.showPasswordRequirements =
                        false;


                    //=========================================
                    // Complete After Minimum 5 Seconds
                    //=========================================

                    this.schedulePasswordUpdateCompletion();
                },


                //=================================================
                // HTTP / Network Error
                //=================================================

                error:
                    error =>
                {
                    //=========================================
                    // Close Progress Dialog
                    //=========================================

                    this.progressDialog.close();


                    //=========================================
                    // Stop Updating State
                    //=========================================

                    this.isUpdating =
                        false;

                    this.passwordUpdateStartedAt =
                        null;


                    //=========================================
                    // API Error
                    //=========================================

                    this.errorMessage =
                        this.getApiErrorMessage(
                            error
                        );
                }
            });
    }


    //===========================================================
    // SCHEDULE PASSWORD UPDATE COMPLETION
    // ----------------------------------------------------------
    // Redirect happens only after:
    //
    //     1. API succeeds
    //     2. Progress dialog has been visible for >= 5 seconds
    //
    //===========================================================

    private schedulePasswordUpdateCompletion():
        void
    {
        const startedAt =
            this.passwordUpdateStartedAt;


        if
        (
            startedAt ===
            null
        )
        {
            return;
        }


        const minimumDisplayTime =
            5000;


        const elapsedTime =
            Date.now() -
            startedAt;


        const remainingTime =
            Math.max
            (
                0,

                minimumDisplayTime -
                elapsedTime
            );


        this.cancelPasswordUpdateCompletionTimer();


        this.passwordUpdateCompletionTimer =
            setTimeout
            (
                () =>
                {
                    this.passwordUpdateCompletionTimer =
                        null;

                    this.completePasswordUpdate();
                },

                remainingTime
            );
    }


    //===========================================================
    // COMPLETE PASSWORD UPDATE
    //===========================================================

    private completePasswordUpdate():
        void
    {
        //=======================================================
        // Close Progress Dialog
        //=======================================================

        this.progressDialog.close();


        //=======================================================
        // Stop Updating State
        //=======================================================

        this.isUpdating =
            false;

        this.passwordUpdateStartedAt =
            null;


        //=======================================================
        // Notify Parent
        //=======================================================

        this.update.emit
        ({
            loginId:
                this.loginId,

            currentPassword:
                '',

            newPassword:
                '',

            confirmPassword:
                ''
        });


        //=======================================================
        // Clear Authentication
        //
        // The user must sign in again after changing the
        // password.
        //=======================================================

        this.authenticationStorageService.logout();


        //=======================================================
        // Return To Login Page
        //=======================================================

        void this.router.navigate
        (
            [
                '/login'
            ],

            {
                replaceUrl:
                    true
            }
        );
    }


    //===========================================================
    // CANCEL PASSWORD UPDATE COMPLETION TIMER
    //===========================================================

    private cancelPasswordUpdateCompletionTimer():
        void
    {
        if
        (
            this.passwordUpdateCompletionTimer !==
            null
        )
        {
            clearTimeout
            (
                this.passwordUpdateCompletionTimer
            );

            this.passwordUpdateCompletionTimer =
                null;
        }
    }


    //===========================================================
    // Extract API Error Message
    //===========================================================

    private getApiErrorMessage(
        error:
            any
    ):
        string
    {
        const backendMessage =
            error?.error?.message;


        if
        (
            typeof backendMessage ===
            'string'
            &&
            backendMessage.trim().length > 0
        )
        {
            return backendMessage.trim();
        }


        if
        (
            error?.status ===
            401
        )
        {
            return 'Your authentication session has expired. Please sign in again.';
        }


        if
        (
            error?.status ===
            400
        )
        {
            return 'Unable to change password. Please verify the information entered.';
        }


        return 'Unable to change password. Please try again.';
    }


    //===========================================================
    // Set Updating State
    //===========================================================

    setUpdating
    (
        updating:
            boolean
    ):
        void
    {
        this.isUpdating =
            updating;
    }


    //===========================================================
    // Close
    //===========================================================

    onClose():
        void
    {
        if
        (
            this.isUpdating
        )
        {
            return;
        }


        this.close.emit();
    }


    //===========================================================
    // Reset
    //===========================================================

    reset():
        void
    {
        //=======================================================
        // Cancel Pending Validation
        //=======================================================

        this.cancelCurrentPasswordValidationTimer();

        this.cancelCurrentPasswordValidation();


        //=======================================================
        // Invalidate Previous Request
        //=======================================================

        this.currentPasswordValidationRequestId++;


        //=======================================================
        // Clear Password Values
        //=======================================================

        this.currentPassword =
            '';

        this.newPassword =
            '';

        this.confirmPassword =
            '';


        //=======================================================
        // Reset Visibility
        //=======================================================

        this.showCurrentPassword =
            false;

        this.showNewPassword =
            false;

        this.showConfirmPassword =
            false;


        //=======================================================
        // Reset Password Requirements Tooltip
        //=======================================================

        this.showPasswordRequirements =
            false;


        //=======================================================
        // Reset Validation State
        //=======================================================

        this.currentPasswordVerified =
            null;

        this.currentPasswordValidating =
            false;

        this.currentPasswordError =
            '';

        this.currentPasswordSuccess =
            '';


        //=======================================================
        // Reset Form State
        //=======================================================

        this.isUpdating =
            false;

        this.submitted =
            false;

        this.errorMessage =
            '';


        //=======================================================
        // Reload Authenticated User
        //=======================================================

        this.loadAuthenticatedUser();
    }
}