/* ============================================================
   Authentication Storage Service
============================================================ */

import
{
    Injectable
}
from '@angular/core';

import
{
    LoginResponse
}
from './authentication.model';



/* ============================================================
   Authentication Storage Service
============================================================ */

@Injectable
({
    providedIn:
        'root'
})

export class AuthenticationStorageService
{
    private readonly tokenKey:
        string =
            'appcore_authentication_token';

    private readonly userKey:
        string =
            'appcore_authentication_user';



    /* ========================================================
       Set Authentication
    ======================================================== */

    setAuthentication
    (
        response:
            LoginResponse
    ):
        void
    {
        localStorage.setItem
        (
            this.tokenKey,
            response.token
        );

        localStorage.setItem
        (
            this.userKey,
            JSON.stringify
            ({
                userProfileId:
                    response.userProfileId,

                userName:
                    response.userName,

                displayName:
                    response.displayName
            })
        );
    }



    /* ========================================================
       Get Token
    ======================================================== */

    getToken():
        string | null
    {
        return localStorage.getItem
        (
            this.tokenKey
        );
    }



    /* ========================================================
       Get User
    ======================================================== */

    getUser():
        {
            userProfileId:
                number;

            userName:
                string;

            displayName:
                string;
        }
        | null
    {
        const user:
            string | null =
                localStorage.getItem
                (
                    this.userKey
                );

        if
        (
            !user
        )
        {
            return null;
        }

        try
        {
            return JSON.parse
            (
                user
            );
        }
        catch
        {
            return null;
        }
    }



    /* ========================================================
       Is Authenticated
    ======================================================== */

    isAuthenticated():
        boolean
    {
        const token:
            string | null =
                this.getToken();

        return !!token;
    }



    /* ========================================================
       Clear Authentication
    ======================================================== */

    clearAuthentication():
        void
    {
        localStorage.removeItem
        (
            this.tokenKey
        );

        localStorage.removeItem
        (
            this.userKey
        );
    }
}