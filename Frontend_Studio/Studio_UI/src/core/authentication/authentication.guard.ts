/* ============================================================
   Authentication Guard
   ------------------------------------------------------------
   Lets the user into the application only when a login token
   exists AND it has not expired.

   An expired token (8 hours, or 30 days with Remember Me) is
   cleared and the user is sent back to the login page, instead
   of opening pages whose API calls would all be refused.
============================================================ */

import
{
    inject
}
from '@angular/core';

import
{
    CanActivateFn,
    Router
}
from '@angular/router';

import
{
    AuthenticationStorageService
}
from './authentication-storage.service';


/* ============================================================
   Is Token Expired
   ------------------------------------------------------------
   Reads the "exp" value (seconds since 1970, UTC) from the
   JWT payload. A token that cannot be read counts as expired.
   A token without "exp" counts as valid (the API decides).
============================================================ */

export function isTokenExpired
(
    token: string | null
): boolean
{
    if
    (
        !token
    )
    {
        return true;
    }

    try
    {
        const parts:
            string[] =
                token.split('.');

        if
        (
            parts.length !== 3
        )
        {
            return true;
        }

        const base64:
            string =
                parts[1]
                    .replace(/-/g, '+')
                    .replace(/_/g, '/');

        const padded:
            string =
                base64 +
                '='.repeat((4 - base64.length % 4) % 4);

        const payload:
            { exp?: number } =
                JSON.parse
                (
                    atob(padded)
                );

        if
        (
            typeof payload.exp !== 'number'
        )
        {
            return false;
        }

        return payload.exp * 1000 <= Date.now();
    }
    catch
    {
        return true;
    }
}


/* ============================================================
   Authentication Guard
============================================================ */

export const authenticationGuard:
    CanActivateFn =
    (
        route,
        state
    ) =>
    {
        const authenticationStorageService:
            AuthenticationStorageService =
                inject
                (
                    AuthenticationStorageService
                );

        const router:
            Router =
                inject
                (
                    Router
                );

        const token:
            string | null =
                authenticationStorageService.getToken();

        if
        (
            token &&
            !isTokenExpired(token)
        )
        {
            return true;
        }

        //=======================================================
        // No token / expired token
        //=======================================================

        authenticationStorageService.clearAuthentication();

        return router.createUrlTree
        (
            [
                '/login'
            ]
        );
    };