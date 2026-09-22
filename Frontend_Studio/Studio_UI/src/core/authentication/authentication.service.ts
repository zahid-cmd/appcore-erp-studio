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
    ForgotPasswordRequest,
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
       Forgot Password
    ======================================================== */

    forgotPassword
    (
        request:
            ForgotPasswordRequest
    ):
        Observable<LoginResponse>
    {
        return this.http.post<LoginResponse>
        (
            `${this.apiUrl}/forgot-password`,
            request
        );
    }
}