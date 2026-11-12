import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../environments/environment';
import { AuthService } from './auth.service';

// Adds the staff token to Console API calls; a 401 signs out
export const authInterceptor: HttpInterceptorFn = (request, next) =>
{
    const auth = inject(AuthService);

    const token = auth.currentToken();

    const isApi = request.url.startsWith(environment.apiUrl);

    const sent =
        isApi && token
            ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
            : request;

    return next(sent).pipe(
        catchError((error: HttpErrorResponse) =>
        {
            if (isApi && error.status === 401 && !request.url.endsWith('/auth/login'))
            {
                auth.logout();
            }

            return throwError(() => error);
        }));
};

// The API's message, or a plain fallback
export function apiMessage(error: unknown, fallback = 'Something went wrong. Try again.'): string
{
    const e = error as HttpErrorResponse;

    if (e?.status === 0)
    {
        return 'The Console API is not reachable (is it running on port 5300?).';
    }

    return e?.error?.message ?? e?.error?.title ?? fallback;
}
