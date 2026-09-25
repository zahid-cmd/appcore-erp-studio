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
    ForgotPasswordCheckRequest,
    ForgotPasswordCheckResponse,
    ForgotPasswordConfirmRequest,
    LoginRequest,
    LoginResponse,
    RegisterRequest
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
    private readonly http:
        HttpClient =
            inject(HttpClient);


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
    ========================================================
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
    ========================================================
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
}