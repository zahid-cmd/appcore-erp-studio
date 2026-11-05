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

   3. When the API answers 429 (too many requests, see the API's
      rate limits) a warning toast says how long to wait, at most
      one every 5 seconds. Login pages show the message
      themselves.
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

import
{
    ToastService
}
from '../../shared/components/utilities/toast/toast.service';


/* ============================================================
   429 toast : not more than one every 5 seconds
============================================================ */

let lastTooManyToastAt =
    0;


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

        const toastService:
            ToastService =
                inject
                (
                    ToastService
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

                    //===============================================
                    // 429 : too many requests → wait message
                    //===============================================

                    if
                    (
                        error instanceof HttpErrorResponse &&
                        error.status === 429 &&
                        !request.url.includes('/authentication/')
                    )
                    {
                        const now =
                            Date.now();

                        if
                        (
                            now - lastTooManyToastAt > 5000
                        )
                        {
                            lastTooManyToastAt =
                                now;

                            const message:
                                string =
                                    error.error?.message
                                    ||
                                    'Too many requests. Please wait a moment and try again.';

                            toastService.warning
                            (
                                'Please wait',
                                message
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