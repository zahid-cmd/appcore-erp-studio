/* ============================================================
   Login Request
============================================================ */

export interface LoginRequest
{
    userName:
        string;

    password:
        string;

    rememberMe:
        boolean;
}



/* ============================================================
   Login Response
============================================================ */

export interface LoginResponse
{
    success:
        boolean;

    message:
        string;

    token:
        string;

    userProfileId:
        number;

    userName:
        string;

    displayName:
        string;

    fullName:
        string;
}



/* ============================================================
   Register Request
============================================================ */

export interface RegisterRequest
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
}



/* ============================================================
   Forgot Password Check Request
============================================================ */

export interface ForgotPasswordCheckRequest
{
    userName:
        string;
}



/* ============================================================
   Forgot Password Check Response
============================================================ */

export interface ForgotPasswordCheckResponse
{
    success:
        boolean;

    message:
        string;

    verificationCode:
        string;

    expiresAt:
        string | null;

    userProfileId:
        number;
}



/* ============================================================
   Forgot Password Confirm Request
============================================================ */

export interface ForgotPasswordConfirmRequest
{
    userName:
        string;

    verificationCode:
        string;

    newPassword:
        string;
}



/* ============================================================
   Validate Current Password Request
   ------------------------------------------------------------
   Used for live validation when the user leaves the
   Current Password field.
============================================================ */

export interface ValidateCurrentPasswordRequest
{
    userName:
        string;

    currentPassword:
        string;
}



/* ============================================================
   Validate Current Password Response
   ------------------------------------------------------------
   Returns whether the entered Current Password is valid.
============================================================ */

export interface ValidateCurrentPasswordResponse
{
    success:
        boolean;

    message:
        string;
}



/* ============================================================
   Change Password Request
   ------------------------------------------------------------
   Sent to the authenticated password-change API.

   NOTE:
   confirmPassword is intentionally NOT included here.
   It is only used by the frontend for validation.
============================================================ */

export interface ChangePasswordRequest
{
    userName:
        string;

    currentPassword:
        string;

    newPassword:
        string;
}



/* ============================================================
   Change Password Response
============================================================ */

export interface ChangePasswordResponse
{
    success:
        boolean;

    message:
        string;
}