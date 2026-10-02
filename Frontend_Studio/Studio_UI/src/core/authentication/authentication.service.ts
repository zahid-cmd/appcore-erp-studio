/* ============================================================
   Authentication Service
============================================================ */

import
{
    Injectable,
    inject
}
from '@angular/core';

import
{
    HttpClient
}
from '@angular/common/http';

import
{
    Observable
}
from 'rxjs';

import
{
    environment
}
from '../../environments/environment';

import
{
    AuthenticationStorageService
}
from './authentication-storage.service';

import
{
    ForgotPasswordCheckRequest,
    ForgotPasswordCheckResponse,
    ForgotPasswordConfirmRequest,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    ChangePasswordRequest,
    ChangePasswordResponse,
    ValidateCurrentPasswordRequest,
    ValidateCurrentPasswordResponse
}
from './authentication.model';



/* ============================================================
   Authentication Service
============================================================ */

@Injectable
({
    providedIn:
        'root'
})

export class AuthenticationService
{
    //===========================================================
    // HTTP
    //===========================================================

    private readonly http:
        HttpClient =
            inject(HttpClient);



    //===========================================================
    // Authentication Storage
    //===========================================================

    private readonly authenticationStorageService:
        AuthenticationStorageService =
            inject(AuthenticationStorageService);



    //===========================================================
    // API URL
    //===========================================================

    private readonly apiUrl:
        string =
            `${environment.apiUrl}/authentication`;



    /* ========================================================
       Login
    ======================================================== */

    login
    (
        request:
            LoginRequest
    ):
        Observable<LoginResponse>
    {
        return this.http.post<LoginResponse>
        (
            `${this.apiUrl}/login`,

            request
        );
    }



    /* ========================================================
       Logout
       --------------------------------------------------------
       Clears the current authentication state from both:

           - localStorage
           - sessionStorage

       The remembered Login ID is intentionally preserved.

       Navigation is NOT performed here.

       The component that initiates Logout is responsible
       for navigating to /login.
    ======================================================== */

    logout():
        void
    {
        this.authenticationStorageService
            .logout();
    }



    /* ========================================================
       Register
    ======================================================== */

    register
    (
        request:
            RegisterRequest
    ):
        Observable<LoginResponse>
    {
        return this.http.post<LoginResponse>
        (
            `${this.apiUrl}/register`,

            request
        );
    }



    /* ========================================================
       Check Forgot Password
       --------------------------------------------------------
       Step 1:

       Login ID → Account Check → Verification Code
    ======================================================== */

    checkForgotPassword
    (
        request:
            ForgotPasswordCheckRequest
    ):
        Observable<ForgotPasswordCheckResponse>
    {
        return this.http.post<ForgotPasswordCheckResponse>
        (
            `${this.apiUrl}/forgot-password/check`,

            request
        );
    }



    /* ========================================================
       Confirm Forgot Password
       --------------------------------------------------------
       Step 2:

       Login ID + Verification Code + New Password
    ======================================================== */

    confirmForgotPassword
    (
        request:
            ForgotPasswordConfirmRequest
    ):
        Observable<LoginResponse>
    {
        return this.http.post<LoginResponse>
        (
            `${this.apiUrl}/forgot-password/confirm`,

            request
        );
    }



    /* ========================================================
       Validate Current Password
       --------------------------------------------------------
       Live validation:

       Current Password
            ↓
       Backend Verification
            ↓
       Valid / Invalid

       This does NOT change the password.
    ======================================================== */

    validateCurrentPassword
    (
        request:
            ValidateCurrentPasswordRequest
    ):
        Observable<ValidateCurrentPasswordResponse>
    {
        return this.http.post<ValidateCurrentPasswordResponse>
        (
            `${this.apiUrl}/validate-current-password`,

            request
        );
    }



    /* ========================================================
       Change Password
       --------------------------------------------------------
       Final password update:

       Login ID
           ↓
       Current Password
           ↓
       New Password
           ↓
       Save New Password
    ======================================================== */

    changePassword
    (
        request:
            ChangePasswordRequest
    ):
        Observable<ChangePasswordResponse>
    {
        return this.http.post<ChangePasswordResponse>
        (
            `${this.apiUrl}/change-password`,

            request
        );
    }
}