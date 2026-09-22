/* ============================================================
   Authentication Guard
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


        if
        (
            authenticationStorageService.isAuthenticated()
        )
        {
            return true;
        }


        return router.createUrlTree
        (
            [
                '/login'
            ]
        );
    };