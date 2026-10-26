/* ============================================================
   Authentication Interceptor
   ------------------------------------------------------------
   1. Adds the login token to every API request
      (Authorization: Bearer ...).

   2. When the API answers 401 (not logged in / token expired)
      to a request that carried a token, the login is cleared
      and the user is sent to the login page.

      Login, register and forgot-password requests are not
      redirected, so their own error messages still show.
============================================================ */

import
{
    HttpErrorResponse,
    HttpInterceptorFn
}
from '@angular/common/http';

import
{
    inject
}
from '@angular/core';

import
{
    Router
}
from '@angular/router';

import
{
    catchError,
    throwError
}
from 'rxjs';

import
{
    AuthenticationStorageService
}
from './authentication-storage.service';


/* ============================================================
   Authentication Interceptor
============================================================ */

export const authenticationInterceptor:
    HttpInterceptorFn =
    (
        request,
        next
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

        //=======================================================
        // No token : send as is (login page requests)
        //=======================================================

        if
        (
            !token
        )
        {
            return next
            (
                request
            );
        }

        //=======================================================
        // Add token
        //=======================================================

        const authenticatedRequest =
            request.clone
            ({
                setHeaders:
                {
                    Authorization:
                        `Bearer ${token}`
                }
            });

        return next
        (
            authenticatedRequest
        )
        .pipe
        (
            catchError
            (
                (error: unknown) =>
                {
                    //===============================================
                    // 401 : login expired → back to login page
                    //===============================================

                    if
                    (
                        error instanceof HttpErrorResponse &&
                        error.status === 401 &&
                        !request.url.includes('/authentication/')
                    )
                    {
                        authenticationStorageService.clearAuthentication();

                        if
                        (
                            !router.url.startsWith('/login')
                        )
                        {
                            router.navigateByUrl
                            (
                                '/login'
                            );
                        }
                    }

                    return throwError
                    (
                        () => error
                    );
                }
            )
        );
    };