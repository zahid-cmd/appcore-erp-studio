//===============================================================
// Console layout : sidebar (collapsible) + topbar + content + footer.
// The page never scrolls : each page's canvas scrolls inside.
//===============================================================

import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../core/auth.service';
import { environment } from '../../environments/environment';
import { ThemeService } from '../../ui/theme.service';
import { ToastHost } from '../../ui/toast';
import { RequestBadge } from '../../ui/request-badge.service';
import { DevAgentService } from '../../core/dev-agent.service';

interface NavItem
{
    path: string;
    label: string;
    icon: string;
    group: string;
    soon?: boolean;
    badge?: boolean;
}

const NAV: NavItem[] =
[
    { path: '/dashboard', label: 'Dashboard', icon: 'fas fa-gauge-high', group: 'Overview' },
    { path: '/customers', label: 'Customers', icon: 'fas fa-building-user', group: 'Clients' },
    { path: '/tenants', label: 'Tenants', icon: 'fas fa-server', group: 'Clients' },
    { path: '/requests', label: 'Requests', icon: 'fas fa-inbox', group: 'Clients', badge: true },
    { path: '/settings/website', label: 'Website settings', icon: 'fas fa-globe', group: 'Settings' },
    { path: '/deployments', label: 'Deployments', icon: 'fas fa-rocket', group: 'Operations' },
    { path: '', label: 'Onboarding', icon: 'fas fa-wand-magic-sparkles', group: 'Coming next', soon: true },
    { path: '', label: 'Billing', icon: 'fas fa-file-invoice-dollar', group: 'Coming next', soon: true },
    { path: '', label: 'Support', icon: 'fas fa-headset', group: 'Coming next', soon: true },
    { path: '', label: 'Monitoring', icon: 'fas fa-heart-pulse', group: 'Coming next', soon: true }
];

const SIDE_KEY = 'appcore.console.side';

@Component({
    selector: 'ac-shell',
    imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe, ToastHost],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrl: './shell.css',
    host:
    {
        '(document:mousedown)': 'outside($event)',
        '(document:keydown.escape)': 'menuOpen.set(false)'
    },
    template: `
        <div class="sh" [class.mini]="mini()">

            <!-- ================= SIDEBAR ================= -->
            <aside class="sh-side">
                <div class="sh-brand">
                    <img class="sh-logo-full" src="/brand/appcore-logo-dark.svg" alt="AppCore Technologies" width="185" height="34">
                    <img class="sh-logo-mark" src="/brand/appcore-mark-dark.svg" alt="AppCore" width="46" height="30">
                </div>

                <nav class="sh-nav ac-scroll">
                    @for (g of groups; track g.name)
                    {
                        <span class="sh-group">{{ g.name }}</span>

                        @for (n of g.items; track n.label)
                        {
                            @if (n.soon)
                            {
                                <span class="sh-link soon" [attr.title]="n.label + ' : coming next'">
                                    <i [class]="n.icon"></i><span class="sh-label">{{ n.label }}</span><em>Soon</em>
                                </span>
                            }
                            @else
                            {
                                <a class="sh-link" [routerLink]="n.path" routerLinkActive="on" [attr.title]="mini() ? n.label : null">
                                    <i [class]="n.icon"></i><span class="sh-label">{{ n.label }}</span>
                                    @if (n.badge && badge.count() > 0) { <b class="sh-badge">{{ badge.count() }}</b> }
                                </a>
                            }
                        }
                    }
                </nav>

                <div class="sh-side-foot">
                    <div class="sh-me">
                        <span class="sh-avatar">{{ initials() }}</span>
                        <span class="sh-me-text">
                            <b>{{ auth.user()?.FullName }}</b>
                            <small>{{ auth.user()?.RoleName }}</small>
                        </span>
                    </div>
                    <button class="sh-collapse" type="button" (click)="toggleSide()" [attr.title]="mini() ? 'Expand menu' : 'Collapse menu'">
                        <i class="fas" [class.fa-angles-left]="!mini()" [class.fa-angles-right]="mini()"></i>
                    </button>
                </div>
            </aside>

            <!-- ================= MAIN ================= -->
            <div class="sh-main">
                <header class="sh-top">
                    <button class="ac-icon-btn sh-burger" type="button" (click)="toggleSide()" title="Menu"><i class="fas fa-bars-staggered"></i></button>

                    <div class="sh-crumb">
                        <span>Console</span>
                        <i class="fas fa-chevron-right"></i>
                        <span>{{ crumb().group }}</span>
                        <i class="fas fa-chevron-right"></i>
                        <b>{{ crumb().label }}</b>
                    </div>

                    <span class="sh-flex"></span>

                    <span class="sh-env" [class.prod]="isProd">
                        <i class="fas fa-circle"></i>{{ envName }}
                    </span>

                    <span class="sh-date"><i class="far fa-calendar"></i>{{ today | date: 'EEE, dd MMM yyyy' }}</span>

                    <button class="sh-tool" type="button" (click)="theme.toggle()" [attr.title]="theme.theme() === 'dark' ? 'Light theme' : 'Dark theme'">
                        <i class="fas" [class.fa-moon]="theme.theme() === 'light'" [class.fa-sun]="theme.theme() === 'dark'"></i>
                    </button>

                    <div class="sh-user" #userBox>
                        <button class="sh-user-btn" type="button" (click)="menuOpen.set(!menuOpen())">
                            <span class="sh-avatar sm">{{ initials() }}</span>
                            <span class="sh-user-text">
                                <b>{{ auth.user()?.FullName }}</b>
                                <small>{{ auth.user()?.RoleName }}</small>
                            </span>
                            <i class="fas fa-chevron-down"></i>
                        </button>

                        @if (menuOpen())
                        {
                            <div class="sh-menu">
                                <div class="sh-menu-head">
                                    <span class="sh-avatar">{{ initials() }}</span>
                                    <span>
                                        <b>{{ auth.user()?.FullName }}</b>
                                        <small>{{ auth.user()?.LoginId }} &middot; {{ auth.user()?.RoleName }}</small>
                                    </span>
                                </div>
                                <a class="sh-menu-item" routerLink="/change-password" (click)="menuOpen.set(false)"><i class="fas fa-key"></i> Change password</a>
                                <button class="sh-menu-item" type="button" (click)="theme.toggle()">
                                    <i class="fas" [class.fa-moon]="theme.theme() === 'light'" [class.fa-sun]="theme.theme() === 'dark'"></i>
                                    {{ theme.theme() === 'dark' ? 'Light theme' : 'Dark theme' }}
                                </button>
                                <button class="sh-menu-item danger" type="button" (click)="auth.logout()"><i class="fas fa-right-from-bracket"></i> Sign out</button>
                            </div>
                        }
                    </div>
                </header>

                <main class="sh-content">
                    <router-outlet />
                </main>

                <footer class="sh-foot">
                    <span class="sh-foot-brand"><b>AppCore</b> Technologies</span>
                    <span class="sh-dot"></span>
                    <span>Console v{{ version }}</span>
                    <span class="sh-dot"></span>
                    <span>&copy; {{ year }}</span>
                    <span class="sh-flex"></span>
                    <span class="sh-api" [class.up]="apiUp() === true && !agentBusy()" [class.down]="apiUp() === false && !agentBusy()" [class.dev]="agent.enabled"
                          [attr.role]="agent.enabled ? 'button' : null" [attr.title]="agent.enabled ? 'Build & Restart the Console API' : null" (click)="toggleDev()">
                        <i class="fas fa-circle"></i>
                        @if (agentBusy()) { {{ agentLabel() }} }
                        @else { {{ apiUp() === null ? 'Checking API' : apiUp() ? 'API online' : 'API offline' }} }
                        @if (apiUp() && apiMs() !== null && !agentBusy()) { <em>{{ apiMs() }} ms</em> }
                        @if (agent.enabled) { <i class="fas fa-screwdriver-wrench sh-api-tool"></i> }
                    </span>

                    @if (devOpen())
                    {
                        <div class="sh-dev">
                            <div class="sh-dev-head">
                                <b><i class="fas fa-screwdriver-wrench"></i> Console API on this PC</b>
                                <button class="ac-icon-btn" type="button" title="Close" (click)="devOpen.set(false)"><i class="fas fa-xmark"></i></button>
                            </div>

                            @if (agent.reachable() === false)
                            {
                                <p class="sh-dev-msg bad">The Console agent is not running. Close the old Console windows and double-click <code>start-console.cmd</code> in Console_Studio.</p>
                            }
                            @else
                            {
                                @if (agent.status(); as st)
                                {
                                    <p class="sh-dev-msg" [class.bad]="st.state === 'failed'" [class.good]="st.state === 'running' && !st.busy">
                                        @if (st.busy) { <i class="fas fa-spinner fa-spin"></i> }
                                        {{ st.step }}
                                        @if (st.buildMs && st.action === 'build-restart' && !st.busy) { <small>({{ (st.buildMs / 1000).toFixed(0) }} s)</small> }
                                    </p>

                                    @if (st.errorCount)
                                    {
                                        <p class="sh-dev-msg bad">{{ st.errorCount }} build error(s){{ st.oldVersionRestarted ? ' : the last good version is running' : '' }}</p>
                                        <ul class="sh-dev-errors ac-scroll">
                                            @for (e of st.errors; track $index)
                                            {
                                                <li><b>{{ e.file }}:{{ e.line }}</b> <code>{{ e.code }}</code> {{ e.message }}</li>
                                            }
                                        </ul>
                                    }
                                }
                                @else { <p class="sh-dev-msg">Asking the agent ...</p> }
                            }

                            <div class="sh-dev-actions">
                                <button class="ac-btn ac-btn-primary" type="button" [disabled]="agentBusy() || agent.reachable() === false" (click)="runAgent('build-restart')"><i class="fas fa-hammer"></i> Build &amp; Restart API</button>
                                <button class="ac-btn" type="button" [disabled]="agentBusy() || agent.reachable() === false" (click)="runAgent('restart')"><i class="fas fa-rotate-right"></i> Restart only</button>
                            </div>
                            <p class="sh-dev-note">After C# changes : Build &amp; Restart. The screen reloads by itself when the API is back.</p>
                        </div>
                    }
                </footer>
            </div>
        </div>

        <ac-toasts />
    `
})
export class ShellPage
{
    readonly auth = inject(AuthService);
    readonly theme = inject(ThemeService);
    readonly badge = inject(RequestBadge);
    private readonly router = inject(Router);

    readonly version = '0.2.0';
    readonly year = new Date().getFullYear();
    readonly today = new Date();
    readonly isProd = environment.production;
    readonly envName = environment.production ? 'Live' : 'Development';

    readonly groups =
        [...new Set(NAV.map(n => n.group))].map(name => ({ name, items: NAV.filter(n => n.group === name) }));

    readonly mini = signal(this.readSide());
    readonly menuOpen = signal(false);
    readonly url = signal(this.router.url);
    readonly apiUp = signal<boolean | null>(null);
    readonly apiMs = signal<number | null>(null);

    // Build & Restart (development PC only)
    readonly agent = inject(DevAgentService);
    readonly devOpen = signal(false);
    readonly agentBusy = computed(() => !!this.agent.status()?.busy);
    readonly agentLabel = computed(() =>
    {
        const s = this.agent.status()?.state;

        return s === 'stopping' ? 'Stopping API' : s === 'building' ? 'Building API' : s === 'starting' ? 'Starting API' : 'Working';
    });
    private agentTimer: ReturnType<typeof setInterval> | null = null;

    readonly initials = computed(() =>
    {
        const name = this.auth.user()?.FullName ?? '';

        return name.split(/\s+/).filter(x => !!x).slice(0, 2).map(x => x[0]!.toUpperCase()).join('') || 'AC';
    });

    readonly crumb = computed(() =>
    {
        const url = this.url().split('?')[0]!;

        if (url.startsWith('/tenants/'))
        {
            return { group: 'Clients', label: 'Tenant details' };
        }

        if (url.startsWith('/change-password'))
        {
            return { group: 'Account', label: 'Change password' };
        }

        const item = NAV.find(n => !n.soon && url.startsWith(n.path));

        return item ? { group: item.group, label: item.label } : { group: 'Overview', label: 'Dashboard' };
    });

    constructor()
    {
        const destroy = inject(DestroyRef);

        const sub = this.router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe(e => this.url.set((e as NavigationEnd).urlAfterRedirects));

        void this.ping();
        void this.badge.refresh();

        const timer = setInterval(() =>
        {
            void this.ping();
            void this.badge.refresh();
        }, 60000);

        destroy.onDestroy(() =>
        {
            sub.unsubscribe();
            clearInterval(timer);

            if (this.agentTimer)
            {
                clearInterval(this.agentTimer);
            }
        });
    }

    toggleSide(): void
    {
        this.mini.update(x => !x);

        try
        {
            localStorage.setItem(SIDE_KEY, this.mini() ? 'mini' : 'full');
        }
        catch
        {
            // storage blocked
        }
    }

    toggleDev(): void
    {
        if (!this.agent.enabled)
        {
            return;
        }

        this.devOpen.update(x => !x);

        if (this.devOpen())
        {
            void this.agent.refresh();
        }
    }

    async runAgent(action: 'build-restart' | 'restart'): Promise<void>
    {
        if (!await this.agent.start(action))
        {
            return;
        }

        const before = this.agent.status()?.jobId ?? 0;

        if (this.agentTimer)
        {
            clearInterval(this.agentTimer);
        }

        // follow the job; when the API runs again, reload the screen
        this.agentTimer = setInterval(async () =>
        {
            const st = await this.agent.refresh();

            if (!st || st.busy || st.jobId === before)
            {
                return;
            }

            clearInterval(this.agentTimer!);
            this.agentTimer = null;

            if (st.state === 'running' && st.errorCount === 0)
            {
                await this.waitForApi();
                location.reload();
            }
            else
            {
                void this.ping();
            }
        }, 1000);
    }

    private async waitForApi(): Promise<void>
    {
        for (let i = 0; i < 40; i++)
        {
            try
            {
                const r = await fetch(`${environment.apiUrl}/health`, { cache: 'no-store', signal: AbortSignal.timeout(2000) });

                if (r.ok)
                {
                    return;
                }
            }
            catch
            {
                // not yet
            }

            await new Promise(r => setTimeout(r, 1000));
        }
    }

    outside(e: MouseEvent): void
    {
        if (this.devOpen() && !(e.target as HTMLElement)?.closest?.('.sh-dev, .sh-api'))
        {
            this.devOpen.set(false);
        }

        if (this.menuOpen() && !(e.target as HTMLElement)?.closest?.('.sh-user'))
        {
            this.menuOpen.set(false);
        }
    }

    private async ping(): Promise<void>
    {
        const started = performance.now();

        try
        {
            const response = await fetch(`${environment.apiUrl}/health`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });

            this.apiUp.set(response.ok);
            this.apiMs.set(Math.round(performance.now() - started));
        }
        catch
        {
            this.apiUp.set(false);
            this.apiMs.set(null);
        }
    }

    private readSide(): boolean
    {
        try
        {
            return localStorage.getItem(SIDE_KEY) === 'mini';
        }
        catch
        {
            return false;
        }
    }
}
