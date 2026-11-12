import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { apiMessage } from '../../core/auth.interceptor';
import { ThemeService } from '../../ui/theme.service';

const REMEMBER_KEY = 'appcore.console.loginId';

@Component({
    selector: 'ac-login',
    imports: [FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrl: './login.css',
    template: `
        <div class="lg">

            <!-- ================= SHOWCASE ================= -->
            <section class="lg-show">
                <span class="lg-orb o1"></span>
                <span class="lg-orb o2"></span>
                <span class="lg-orb o3"></span>
                <span class="lg-grid"></span>

                <header class="lg-brand">
                    <img class="lg-logo-full" src="/brand/appcore-logo-dark.svg" alt="AppCore Technologies" width="239" height="44">
                </header>

                <div class="lg-hero">
                    <span class="lg-pill"><i></i> Staff back office</span>
                    <h1>Console<span>.</span></h1>
                    <p>One place to run every AppCore product and every client company : customers, tenants, databases, web addresses and releases.</p>

                    <div class="lg-products">
                        @for (p of products; track p.name)
                        {
                            <div class="lg-product" [class.live]="p.live">
                                <i [class]="p.icon"></i>
                                <span><b>{{ p.name }}</b><small>{{ p.live ? 'Live' : 'In development' }}</small></span>
                            </div>
                        }
                    </div>
                </div>

                <footer class="lg-trust">
                    <span><i class="fas fa-shield-halved"></i> Every sign-in is logged</span>
                    <span><i class="fas fa-lock"></i> Locks after 5 failed tries</span>
                    <span><i class="fas fa-key"></i> Encrypted session</span>
                </footer>
            </section>

            <!-- ================= SIGN IN ================= -->
            <section class="lg-side">
                <button class="lg-theme" type="button" (click)="theme.toggle()" [attr.title]="theme.theme() === 'dark' ? 'Light theme' : 'Dark theme'">
                    <i class="fas" [class.fa-moon]="theme.theme() === 'light'" [class.fa-sun]="theme.theme() === 'dark'"></i>
                </button>

                <form class="lg-card" [class.shake]="shake()" (ngSubmit)="submit()">
                    <img class="lg-card-logo" src="/brand/appcore-icon.svg" alt="AppCore" width="52" height="52">
                    <span class="lg-eyebrow">Staff access</span>
                    <h2>Welcome back</h2>
                    <p class="lg-lead">Sign in to the AppCore Console.</p>

                    <div class="lg-field">
                        <label for="lg-id">Login ID</label>
                        <div class="lg-box">
                            <i class="fas fa-user"></i>
                            <input id="lg-id" name="loginId" autocomplete="username" placeholder="Your login ID" [(ngModel)]="loginId" required autofocus>
                        </div>
                    </div>

                    <div class="lg-field">
                        <label for="lg-pw">Password</label>
                        <div class="lg-box">
                            <i class="fas fa-lock"></i>
                            <input id="lg-pw" name="password" [type]="showPw() ? 'text' : 'password'" autocomplete="current-password" placeholder="Your password"
                                [(ngModel)]="password" (keyup)="caps($event)" (keydown)="caps($event)" required>
                            <button class="lg-eye" type="button" tabindex="-1" (click)="showPw.set(!showPw())" [attr.title]="showPw() ? 'Hide password' : 'Show password'">
                                <i class="fas" [class.fa-eye]="!showPw()" [class.fa-eye-slash]="showPw()"></i>
                            </button>
                        </div>
                        @if (capsOn()) { <span class="lg-caps"><i class="fas fa-triangle-exclamation"></i> Caps Lock is on</span> }
                    </div>

                    <label class="lg-remember">
                        <input type="checkbox" name="remember" [(ngModel)]="remember">
                        <span class="lg-check"><i class="fas fa-check"></i></span>
                        Remember my login ID on this computer
                    </label>

                    @if (error()) { <div class="ac-error">{{ error() }}</div> }

                    <button class="lg-submit" type="submit" [disabled]="busy() || !loginId || !password">
                        @if (busy())
                        {
                            <i class="fas fa-spinner fa-spin"></i> Signing in
                        }
                        @else
                        {
                            Sign in <i class="fas fa-arrow-right"></i>
                        }
                    </button>

                    <p class="lg-note"><i class="fas fa-circle-info"></i> For AppCore Technologies staff only. Client users sign in to their own ERP address.</p>
                </form>

                <span class="lg-foot">&copy; {{ year }} AppCore Technologies &middot; Console v0.2.0</span>
            </section>
        </div>
    `
})
export class LoginPage
{
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    readonly theme = inject(ThemeService);

    readonly year = new Date().getFullYear();

    readonly products =
    [
        { name: 'Automobiles', icon: 'fas fa-car', live: false },
        { name: 'Two Wheelers', icon: 'fas fa-motorcycle', live: true },
        { name: 'Real Estate', icon: 'fas fa-building', live: false },
        { name: 'Consultancy', icon: 'fas fa-briefcase', live: false }
    ];

    loginId = this.readRemembered();
    password = '';
    remember = !!this.loginId;

    readonly busy = signal(false);
    readonly error = signal('');
    readonly showPw = signal(false);
    readonly capsOn = signal(false);
    readonly shake = signal(false);

    caps(e: KeyboardEvent): void
    {
        this.capsOn.set(!!e.getModifierState?.('CapsLock'));
    }

    async submit(): Promise<void>
    {
        if (this.busy())
        {
            return;
        }

        this.busy.set(true);
        this.error.set('');

        try
        {
            await this.auth.login(this.loginId.trim(), this.password);

            this.saveRemembered();

            await this.router.navigateByUrl(this.auth.mustChangePassword() ? '/change-password' : '/dashboard');
        }
        catch (e)
        {
            this.error.set(apiMessage(e, 'Sign in failed.'));
            this.password = '';

            this.shake.set(true);
            setTimeout(() => this.shake.set(false), 500);
        }
        finally
        {
            this.busy.set(false);
        }
    }

    private readRemembered(): string
    {
        try
        {
            return localStorage.getItem(REMEMBER_KEY) ?? '';
        }
        catch
        {
            return '';
        }
    }

    private saveRemembered(): void
    {
        try
        {
            if (this.remember)
            {
                localStorage.setItem(REMEMBER_KEY, this.loginId.trim());
            }
            else
            {
                localStorage.removeItem(REMEMBER_KEY);
            }
        }
        catch
        {
            // storage blocked
        }
    }
}
