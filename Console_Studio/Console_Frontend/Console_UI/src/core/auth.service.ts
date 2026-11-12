//===============================================================
// Staff session : token in sessionStorage (closes with the tab)
//===============================================================

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../environments/environment';
import { LoginResult, StaffMe } from './models';

const TOKEN_KEY = 'appcore.console.token';
const USER_KEY = 'appcore.console.user';

@Injectable({ providedIn: 'root' })
export class AuthService
{
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);

    readonly user = signal<StaffMe | null>(this.read<StaffMe>(USER_KEY));

    readonly signedIn = computed(() => !!this.user() && !!this.currentToken());

    readonly mustChangePassword = computed(() => !!this.user()?.MustChangePassword);

    get token(): string | null
    {
        try
        {
            return sessionStorage.getItem(TOKEN_KEY);
        }
        catch
        {
            return null;
        }
    }

    hasRole(...roles: string[]): boolean
    {
        const role = this.user()?.RoleCode ?? '';

        return roles.includes(role);
    }

    async login(loginId: string, password: string): Promise<void>
    {
        const result =
            await firstValueFrom(this.http.post<LoginResult>(`${environment.apiUrl}/auth/login`, { loginId, password }));

        this.store(result);
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<void>
    {
        const result =
            await firstValueFrom(this.http.post<LoginResult>(`${environment.apiUrl}/auth/change-password`, { currentPassword, newPassword }));

        this.store(result);
    }

    logout(): void
    {
        try
        {
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(USER_KEY);
        }
        catch
        {
            // storage blocked
        }

        this.user.set(null);

        void this.router.navigateByUrl('/login');
    }

    private store(result: LoginResult): void
    {
        try
        {
            sessionStorage.setItem(TOKEN_KEY, result.token);
            sessionStorage.setItem(USER_KEY, JSON.stringify(result.user));
        }
        catch
        {
            // storage blocked : the session lives until the page reloads
        }

        this.memoryToken = result.token;

        this.user.set(result.user);
    }

    // used when sessionStorage is blocked
    memoryToken: string | null = null;

    currentToken(): string | null
    {
        return this.token ?? this.memoryToken;
    }

    private read<T>(key: string): T | null
    {
        try
        {
            const raw = sessionStorage.getItem(key);

            return raw ? JSON.parse(raw) as T : null;
        }
        catch
        {
            return null;
        }
    }
}
