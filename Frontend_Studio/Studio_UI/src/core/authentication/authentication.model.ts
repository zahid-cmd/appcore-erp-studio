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
   Forgot Password Request
============================================================ */

export interface ForgotPasswordRequest
{
    userName:
        string;

    newPassword:
        string;
}