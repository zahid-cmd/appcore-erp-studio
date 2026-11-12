import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

// Signed in, and the one-time password already changed
export const authGuard: CanActivateFn = () =>
{
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.signedIn())
    {
        return router.parseUrl('/login');
    }

    return auth.mustChangePassword()
        ? router.parseUrl('/change-password')
        : true;
};

export const signedInGuard: CanActivateFn = () =>
{
    const auth = inject(AuthService);

    return auth.signedIn() ? true : inject(Router).parseUrl('/login');
};
