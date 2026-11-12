import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { apiMessage } from '../../core/auth.interceptor';
import { ToastService, ToastHost } from '../../ui/toast';

@Component({
    selector: 'ac-change-password',
    imports: [FormsModule, ToastHost],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        .cp { position: relative; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px 16px; background: radial-gradient(700px 360px at 50% 0%, var(--ac-accent-ring), transparent 70%), var(--ac-bg); }
        .cp form { position: relative; display: flex; flex-direction: column; gap: 16px; width: min(440px, 100%); padding: 32px 30px 26px; border: 1px solid var(--ac-border); border-radius: 22px; background: var(--ac-card); box-shadow: var(--ac-shadow-lg); animation: ac-rise 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
        .cp form::before { position: absolute; top: 0; left: 30px; right: 30px; height: 3px; border-radius: 0 0 4px 4px; background: var(--ac-brand); content: ''; }
        .cp-icon { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 14px; background: var(--ac-gradient); color: #fff; font-size: 18px; box-shadow: 0 12px 26px -12px rgba(20, 16, 12, 0.95); }
        .cp-eyebrow { margin-bottom: -10px; color: var(--ac-gold); font-size: 10.5px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; }
        .cp h2 { color: var(--ac-text); font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
        .cp-meter { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-top: 2px; }
        .cp-meter span { height: 5px; border-radius: 999px; background: var(--ac-border-2); transition: background 0.2s; }
        .cp-meter.s1 span:nth-child(-n+1) { background: var(--ac-red); }
        .cp-meter.s2 span:nth-child(-n+2) { background: var(--ac-amber); }
        .cp-meter.s3 span:nth-child(-n+3) { background: var(--ac-sky); }
        .cp-meter.s4 span { background: var(--ac-green); }
        .cp-rules { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 12px; margin: 0; padding: 0; list-style: none; color: var(--ac-muted); font-size: 12px; }
        .cp-rules li.ok { color: var(--ac-green); }
        .cp-rules i { width: 14px; margin-right: 5px; }
        .cp .ac-btn { height: 44px; }
        .cp-row { display: flex; gap: 8px; }
        .cp-row .ac-btn { flex: 1; }
    `],
    template: `
        <div class="cp">
            <form (ngSubmit)="submit()">
                <span class="cp-icon"><i class="fas fa-key"></i></span>
                <span class="cp-eyebrow">Account security</span>
                <h2>{{ auth.mustChangePassword() ? 'Set your own password' : 'Change password' }}</h2>
                <span class="ac-hint">
                    {{ auth.mustChangePassword() ? 'You signed in with a one-time password. Choose your own to continue.' : 'Choose a new password for ' + (auth.user()?.LoginId ?? 'your account') + '.' }}
                </span>

                <div class="ac-field">
                    <label for="cp-old">Current password</label>
                    <input id="cp-old" class="ac-input" type="password" name="current" autocomplete="current-password" [(ngModel)]="current" required>
                </div>

                <div class="ac-field">
                    <label for="cp-new">New password</label>
                    <input id="cp-new" class="ac-input" type="password" name="next" autocomplete="new-password" [ngModel]="next()" (ngModelChange)="next.set($event)" required>
                    <div class="cp-meter" [class]="'cp-meter s' + strength()"><span></span><span></span><span></span><span></span></div>
                </div>

                <ul class="cp-rules">
                    <li [class.ok]="next().length >= 10"><i class="fas" [class.fa-circle-check]="next().length >= 10" [class.fa-circle]="next().length < 10"></i>10 characters or more</li>
                    <li [class.ok]="hasLetter()"><i class="fas" [class.fa-circle-check]="hasLetter()" [class.fa-circle]="!hasLetter()"></i>Letters</li>
                    <li [class.ok]="hasDigit()"><i class="fas" [class.fa-circle-check]="hasDigit()" [class.fa-circle]="!hasDigit()"></i>Digits</li>
                    <li [class.ok]="hasSymbol()"><i class="fas" [class.fa-circle-check]="hasSymbol()" [class.fa-circle]="!hasSymbol()"></i>A symbol (better)</li>
                </ul>

                <div class="ac-field">
                    <label for="cp-again">New password again</label>
                    <input id="cp-again" class="ac-input" type="password" name="again" autocomplete="new-password" [(ngModel)]="again" required>
                </div>

                @if (error()) { <div class="ac-error">{{ error() }}</div> }

                <button class="ac-btn ac-btn-primary" type="submit" [disabled]="busy() || !current || !next() || !again">
                    <i class="fas" [class.fa-shield-halved]="!busy()" [class.fa-spinner]="busy()" [class.fa-spin]="busy()"></i> Save password
                </button>

                <div class="cp-row">
                    @if (!auth.mustChangePassword())
                    {
                        <button class="ac-btn" type="button" (click)="back()"><i class="fas fa-arrow-left"></i> Back</button>
                    }
                    <button class="ac-btn" type="button" (click)="auth.logout()"><i class="fas fa-right-from-bracket"></i> Sign out</button>
                </div>
            </form>
        </div>

        <ac-toasts />
    `
})
export class ChangePasswordPage
{
    readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);

    current = '';
    again = '';

    readonly next = signal('');
    readonly busy = signal(false);
    readonly error = signal('');

    readonly hasLetter = computed(() => /[A-Za-z]/.test(this.next()));
    readonly hasDigit = computed(() => /\d/.test(this.next()));
    readonly hasSymbol = computed(() => /[^A-Za-z0-9]/.test(this.next()));

    readonly strength = computed(() =>
    {
        const p = this.next();

        if (!p)
        {
            return 0;
        }

        let score = 0;

        if (p.length >= 10) score++;
        if (this.hasLetter() && this.hasDigit()) score++;
        if (this.hasSymbol()) score++;
        if (p.length >= 14) score++;

        return Math.max(score, 1);
    });

    back(): void
    {
        void this.router.navigateByUrl('/dashboard');
    }

    async submit(): Promise<void>
    {
        if (this.next() !== this.again)
        {
            this.error.set('The two new passwords are not the same.');

            return;
        }

        this.busy.set(true);
        this.error.set('');

        try
        {
            await this.auth.changePassword(this.current, this.next());

            this.toast.success('Password changed', 'Use the new password from now on.');

            await this.router.navigateByUrl('/dashboard');
        }
        catch (e)
        {
            this.error.set(apiMessage(e));
        }
        finally
        {
            this.busy.set(false);
        }
    }
}
