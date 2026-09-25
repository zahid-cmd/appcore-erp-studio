/* ============================================================
   Login Request
============================================================ */

export interface LoginRequest
{
    userName:
        string;

    password:
        string;
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