/* ============================================================
   Authentication Interceptor
============================================================ */

import
{
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


        const token:
            string | null =
                authenticationStorageService.getToken();


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
        );
    };