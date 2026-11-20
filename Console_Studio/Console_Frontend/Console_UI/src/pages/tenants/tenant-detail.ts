import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { ConsoleApi } from '../../core/console-api.service';
import { apiMessage } from '../../core/auth.interceptor';
import { TENANT_STATUSES, TenantDatabasePlan, TenantResetResult, TenantDatabaseResult, TenantDetail } from '../../core/models';
import { TenantModulesCard } from './tenant-modules';
import { PageHeader } from '../../ui/page-header';
import { SelectBox, SelectOption } from '../../ui/select-box';
import { ToastService } from '../../ui/toast';

@Component({
    selector: 'ac-tenant-detail',
    imports: [FormsModule, RouterLink, DatePipe, TenantModulesCard, PageHeader, SelectBox],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'ac-page' },
    styles: [`
        /* three columns, as tall as the longest one (not the whole page); a column scrolls on its own only if it must (2026-11-20) */
        .td-fit { display: flex; flex: 0 1 auto; min-height: 0; }
        .td-grid { display: grid; flex: 0 1 auto; min-height: 0; grid-template-columns: minmax(0, 1fr) minmax(0, 1.55fr) minmax(0, 0.9fr); gap: 16px; align-items: stretch; }
        .td-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; min-height: 0; overflow-y: auto; }
        .td-col > * { flex-shrink: 0; }
        /* same height for the three columns : each column's last card reaches the bottom */
        .td-col > :last-child { flex-grow: 1; }
        .td-grid > .ac-card { min-height: 0; overflow-y: auto; }
        .td-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .td-fact { display: flex; flex-direction: column; gap: 3px; padding: 10px 16px; border-bottom: 1px solid var(--ac-border-2); }
        .td-fact:nth-child(odd) { border-right: 1px solid var(--ac-border-2); }
        .td-fact span { color: var(--ac-muted); font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
        .td-fact b { color: var(--ac-text); font-weight: 600; overflow-wrap: anywhere; }
        .td-remarks { padding: 13px 18px; color: var(--ac-text-2); }
        .td-domains { display: flex; flex-direction: column; gap: 8px; padding: 12px 16px; }
        .td-domain { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--ac-border-2); border-radius: 11px; background: var(--ac-card-2); }
        .td-domain > i { color: var(--ac-accent); }
        .td-domain a { flex: 1; font-family: var(--ac-mono-font); font-size: 12.5px; overflow-wrap: anywhere; }
        .td-status { display: flex; flex-direction: column; gap: 10px; padding: 16px 18px; border-bottom: 1px solid var(--ac-border-2); }
        .td-status-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
        .td-history { position: relative; margin: 0; padding: 14px 18px 16px 40px; list-style: none; }
        .td-history::before { position: absolute; top: 22px; bottom: 26px; left: 25px; width: 2px; background: var(--ac-border-2); content: ''; }
        .td-history li { position: relative; padding: 6px 0 12px; }
        .td-history li::before { position: absolute; top: 10px; left: -20px; width: 10px; height: 10px; border: 2px solid var(--ac-card); border-radius: 50%; background: var(--ac-accent); box-shadow: 0 0 0 2px var(--ac-accent-ring); content: ''; }
        .td-history b { color: var(--ac-text); }
        .td-loading { display: flex; flex: 1; align-items: center; justify-content: center; gap: 10px; color: var(--ac-muted); }
        .td-db { display: flex; flex-direction: column; gap: 12px; padding: 14px 18px 16px; }
        .td-db-rows { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 6px 14px; font-size: 13px; }
        .td-db-rows span { color: var(--ac-muted); }
        .td-db-rows b { color: var(--ac-text); font-family: var(--ac-mono-font); font-weight: 600; overflow-wrap: anywhere; }
        .td-db-problems { margin: 0; padding-left: 18px; color: var(--ac-danger, #b42318); font-size: 12.5px; }
        .td-reset-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .td-db-actions { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; }
        .td-once { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(10, 10, 12, 0.55); }
        .td-once-box { display: flex; flex-direction: column; gap: 14px; width: min(640px, 100%); padding: 20px 22px; border: 1px solid var(--ac-border); border-radius: 14px; background: var(--ac-card); box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.5); }
        .td-once-box h3 { margin: 0; font-size: 16px; }
        .td-once-warn { padding: 10px 12px; border-radius: 10px; background: var(--ac-accent-soft, rgba(180, 85, 31, 0.1)); color: var(--ac-text); font-size: 12.5px; }
        .td-secret { display: grid; grid-template-columns: 150px minmax(0, 1fr) auto; gap: 8px; align-items: center; font-size: 13px; }
        .td-secret span { color: var(--ac-muted); }
        .td-secret code { padding: 7px 10px; border: 1px solid var(--ac-border-2); border-radius: 8px; background: var(--ac-card-2); font-family: var(--ac-mono-font); font-size: 12.5px; overflow-wrap: anywhere; }
        .td-confirm { width: min(480px, 100%); }
        .td-confirm-actions { display: flex; justify-content: flex-end; gap: 8px; }
        @media (max-width: 1400px) { .td-fit { overflow-y: auto; } .td-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); flex: none; } .td-col { overflow: visible; } }
        @media (max-width: 1000px) { .td-grid { grid-template-columns: minmax(0, 1fr); } }
    `],
    template: `
        @if (t(); as t)
        {
            <ac-page-header icon="fas fa-server" [eyebrow]="'Tenant ' + t.TenantCode" [title]="t.DisplayName"
                [subtitle]="t.ProductName + ' \u00b7 ' + t.CustomerName">
                <span pageHeaderTitle [class]="'ac-chip ac-chip-' + t.Status">{{ t.Status }}</span>
                <ng-container pageHeaderRight>
                    <a class="ac-btn" routerLink="/tenants"><i class="fas fa-arrow-left"></i> Tenants</a>
                    @if (canManage)
                    {
                        <a class="ac-btn ac-btn-primary" [routerLink]="['/tenants', t.PublicId, 'edit']"><i class="fas fa-pen"></i> Edit</a>
                    }
                </ng-container>
            </ac-page-header>

            <div class="td-fit ac-scroll">
                <div class="td-grid">
                    <div class="td-col">
                        <div class="ac-card">
                            <div class="ac-card-title"><i class="fas fa-circle-info"></i> Details</div>
                            <div class="td-facts">
                                <div class="td-fact"><span>Customer</span><b>{{ t.CustomerName }}</b></div>
                                <div class="td-fact"><span>Product</span><b>{{ t.ProductName }}</b></div>
                                <div class="td-fact"><span>Database</span><b class="ac-mono">{{ t.DatabaseName || 'Not set' }}</b></div>
                                <div class="td-fact"><span>Trial ends</span><b>{{ t.TrialEndsOn || '-' }}</b></div>
                                <div class="td-fact"><span>Companies allowed</span><b>{{ t.MaxCompanies }}</b></div>
                                <div class="td-fact"><span>Branches allowed</span><b>{{ t.MaxBranches || 'No limit' }}</b></div>
                                <div class="td-fact"><span>App version</span><b>{{ t.AppVersion || '-' }}</b></div>
                                <div class="td-fact"><span>Schema version</span><b>{{ t.SchemaVersion || '-' }}</b></div>
                                <div class="td-fact"><span>Time zone / currency</span><b>{{ t.TimeZone }} / {{ t.Currency }}</b></div>
                                <div class="td-fact"><span>Registered</span><b>{{ t.CreatedDate | date: 'dd-MMM-yyyy HH:mm' }}</b></div>
                            </div>
                            @if (t.Remarks) { <div class="td-remarks"><span class="ac-sub">Remarks : </span>{{ t.Remarks }}</div> }
                        </div>

                        <div class="ac-card">
                            <div class="ac-card-title"><i class="fas fa-globe"></i> Web addresses</div>
                            <div class="td-domains">
                                @for (d of t.Domains; track d.HostName)
                                {
                                    <div class="td-domain">
                                        <i class="fas fa-link"></i>
                                        <a [href]="'https://' + d.HostName" target="_blank" rel="noopener">{{ d.HostName }}</a>
                                        @if (d.IsPrimary) { <span class="ac-chip ac-chip-Active">Main</span> }
                                        <span class="ac-sub">{{ d.DomainType }}</span>
                                    </div>
                                }
                                @empty
                                {
                                    <span class="ac-sub">No address yet.</span>
                                }
                            </div>
                        </div>

                    </div>

                    <div class="td-col">
                        <!-- Package, modules and users (2026-11-20) -->
                        <ac-tenant-modules [publicId]="t.PublicId" [canManage]="canManage" />

                        <!-- Create database (onboarding) : only while the
                             tenant has none -->
                        @if (t.DatabaseName && canManage)
                        {
                            <div class="ac-card">
                                <div class="ac-card-title"><i class="fas fa-key"></i> Access</div>
                                <div class="td-db">
                                    <div class="td-reset-actions">
                                        <button class="ac-btn" type="button" [disabled]="resetting()" (click)="askReset('admin')">
                                            <i class="fas fa-user-shield"></i> Reset admin password
                                        </button>
                                        <button class="ac-btn" type="button" [disabled]="resetting()" (click)="askReset('login')">
                                            <i class="fas fa-database"></i> Reset database login
                                        </button>
                                    </div>
                                    <span class="ac-sub">Admin password : when the client's administrator lost it. Database login : after the ERP server's key was replaced, or if the password may have leaked.</span>
                                    @if (resetError()) { <div class="ac-error">{{ resetError() }}</div> }
                                </div>
                            </div>
                        }

                        @if (!t.DatabaseName && planError())
                        {
                            <div class="ac-card">
                                <div class="ac-card-title"><i class="fas fa-database"></i> Create database</div>
                                <div class="ac-error">The check before Create database failed : {{ planError() }} Refresh the page to try again.</div>
                            </div>
                        }

                        @if (!t.DatabaseName && plan(); as plan)
                        {
                            <div class="ac-card">
                                <div class="ac-card-title"><i class="fas fa-database"></i> Create database</div>
                                <div class="td-db">
                                    <div class="td-db-rows">
                                        <span>Database</span><b>{{ plan.DatabaseName || '-' }}</b>
                                        <span>Own login</span><b>{{ plan.LoginName || '-' }}</b>
                                        <span>Server</span><b>{{ plan.Server || '-' }}</b>
                                        <span>From template</span><b>{{ plan.Template || '-' }}{{ plan.TemplateVersion ? ' (' + plan.TemplateVersion + ')' : '' }}</b>
                                    </div>

                                    @if (plan.Problems.length)
                                    {
                                        <ul class="td-db-problems">
                                            @for (p of plan.Problems; track $index) { <li>{{ p }}</li> }
                                        </ul>
                                    }
                                    @else if (plan.LeftoverNote)
                                    {
                                        <div class="ac-error">{{ plan.LeftoverNote }}</div>
                                    }
                                    @else if (plan.Leftover)
                                    {
                                        <!-- left by a Create database that failed (2026-11-20) -->
                                        <div class="td-once-warn">
                                            A database named <b>{{ plan.DatabaseName }}</b> is already on the server, but this tenant has none recorded :
                                            it was left by a Create database that failed. Remove it, then create the database again.
                                        </div>

                                        @if (canManage)
                                        {
                                            <div class="td-db-actions">
                                                <button class="ac-btn" type="button" [disabled]="removing()" (click)="askRemoveLeftover()">
                                                    <i [class]="removing() ? 'fas fa-spinner fa-spin' : 'fas fa-broom'"></i>
                                                    {{ removing() ? 'Removing...' : 'Remove leftover' }}
                                                </button>
                                            </div>
                                        }
                                    }
                                    @else if (canManage)
                                    {
                                        <div class="td-db-actions">
                                            <ac-select-box [options]="fyOptions" [value]="fyStart()" (valueChange)="fyStart.set(+$any($event))" />
                                            <button class="ac-btn ac-btn-primary" type="button" [disabled]="creating()" (click)="askCreate()">
                                                <i [class]="creating() ? 'fas fa-spinner fa-spin' : 'fas fa-database'"></i>
                                                {{ creating() ? 'Creating...' : 'Create database' }}
                                            </button>
                                        </div>
                                        <span class="ac-sub">Company details come from the customer {{ t.CustomerName }}. The tenant becomes Trial. Takes about a minute.</span>
                                    }

                                    @if (dbError()) { <div class="ac-error">{{ dbError() }}</div> }
                                </div>
                            </div>
                        }
                    </div>

                    <div class="ac-card">
                        <div class="ac-card-title"><i class="fas fa-toggle-on"></i> Status</div>

                        @if (canManage)
                        {
                            <div class="td-status">
                                <div class="td-status-row">
                                    <ac-select-box [options]="statusOptions" [value]="newStatus()" (valueChange)="newStatus.set($any($event))" />
                                    <button class="ac-btn ac-btn-primary" type="button" [disabled]="busy() || newStatus() === t.Status || !reason().trim()" (click)="changeStatus(t)">
                                        Change
                                    </button>
                                </div>
                                <input class="ac-input" placeholder="Reason (required)" [ngModel]="reason()" (ngModelChange)="reason.set($event)">
                                @if (statusError()) { <div class="ac-error">{{ statusError() }}</div> }
                            </div>
                        }

                        <ul class="td-history">
                            @for (h of t.History; track $index)
                            {
                                <li>
                                    <b>{{ h.FromStatus ? h.FromStatus + ' \u2192 ' : '' }}{{ h.ToStatus }}</b>
                                    <div class="ac-sub">{{ h.ChangedDate | date: 'dd-MMM-yyyy HH:mm' }}{{ h.Reason ? ' \u00b7 ' + h.Reason : '' }}</div>
                                </li>
                            }
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Confirm before creating (our dialog, not the browser's) -->
            @if (confirmOpen() && plan(); as plan)
            {
                <div class="td-once" (click)="confirmOpen.set(false)">
                    <div class="td-once-box td-confirm" (click)="$event.stopPropagation()">
                        <h3><i class="fas fa-database"></i> Create the database?</h3>
                        <div class="ac-sub">For <b>{{ t.DisplayName }}</b>. This makes a new client database from the template.</div>

                        <div class="td-db-rows">
                            <span>Database</span><b>{{ plan.DatabaseName }}</b>
                            <span>Own login</span><b>{{ plan.LoginName }}</b>
                            <span>From template</span><b>{{ plan.Template }}</b>
                            <span>Financial year</span><b>{{ fyStart() === 1 ? 'From January' : 'From July' }}</b>
                        </div>

                        <div class="td-once-warn">Takes about a minute. The admin password is shown once at the end : keep that window open until you copy it.</div>

                        <div class="td-confirm-actions">
                            <button class="ac-btn" type="button" (click)="confirmOpen.set(false)">Cancel</button>
                            <button class="ac-btn ac-btn-primary" type="button" (click)="createDatabase(t)">
                                <i class="fas fa-database"></i> Create database
                            </button>
                        </div>
                    </div>
                </div>
            }

            <!-- Confirm Remove leftover : the name typed again -->
            @if (leftoverAsk() && plan(); as plan)
            {
                <div class="td-once" (click)="leftoverAsk.set(false)">
                    <div class="td-once-box td-confirm" (click)="$event.stopPropagation()">
                        <h3><i class="fas fa-broom"></i> Remove the leftover database?</h3>
                        <div class="ac-sub">For <b>{{ t.DisplayName }}</b>. The half-made database <b>{{ plan.DatabaseName }}</b> and its login are deleted from the server.</div>
                        <div class="td-once-warn">This cannot be undone. It is only for a database left by a Create database that failed : nothing of a client is in it.</div>
                        <input class="ac-input" [placeholder]="'Type ' + plan.DatabaseName + ' to confirm'" [ngModel]="leftoverTyped()" (ngModelChange)="leftoverTyped.set($event)">

                        <div class="td-confirm-actions">
                            <button class="ac-btn" type="button" (click)="leftoverAsk.set(false)">Cancel</button>
                            <button class="ac-btn ac-btn-primary" type="button" [disabled]="leftoverTyped().trim() !== plan.DatabaseName" (click)="removeLeftover(t)">
                                <i class="fas fa-broom"></i> Remove
                            </button>
                        </div>
                    </div>
                </div>
            }

            <!-- Confirm a reset -->
            @if (resetAsk(); as kind)
            {
                <div class="td-once" (click)="resetAsk.set(null)">
                    <div class="td-once-box td-confirm" (click)="$event.stopPropagation()">
                        @if (kind === 'admin')
                        {
                            <h3><i class="fas fa-user-shield"></i> Reset the admin password?</h3>
                            <div class="ac-sub">For <b>{{ t.DisplayName }}</b>. The user <b>admin</b> of this client gets a new password.</div>
                            <div class="td-once-warn">The present admin password stops working at once. The new one is shown once : keep the window open until you copy it.</div>
                        }
                        @else
                        {
                            <h3><i class="fas fa-database"></i> Reset the database login?</h3>
                            <div class="ac-sub">For <b>{{ t.DisplayName }}</b> ({{ t.DatabaseName }}). The client's own database login gets a new password, stored sealed for the ERP.</div>
                            <div class="td-once-warn">The client's ERP may show errors for up to a minute, until the ERP picks up the new password. Best done outside working hours.</div>
                        }

                        <div class="td-confirm-actions">
                            <button class="ac-btn" type="button" (click)="resetAsk.set(null)">Cancel</button>
                            <button class="ac-btn ac-btn-primary" type="button" (click)="doReset(t, kind)">
                                <i class="fas fa-rotate"></i> Reset
                            </button>
                        </div>
                    </div>
                </div>
            }

            <!-- The result of a reset -->
            @if (resetDone(); as r)
            {
                <div class="td-once">
                    <div class="td-once-box">
                        @if (r.Kind === 'admin')
                        {
                            <h3><i class="fas fa-circle-check"></i> New admin password</h3>
                            <div class="td-once-warn"><b>Shown only now.</b> Copy it before closing : the Console does not keep it.</div>

                            <div class="td-secret"><span>ERP login</span><code>{{ r.AdminUser }}</code><span></span></div>
                            <div class="td-secret">
                                <span>Admin password</span><code>{{ r.AdminPassword }}</code>
                                <button class="ac-btn" type="button" (click)="copy(r.AdminPassword!)"><i class="fas fa-copy"></i></button>
                            </div>
                            @if (r.PasswordBookSaved)
                            {
                                <div class="ac-sub"><i class="fas fa-book"></i> Also added to your {{ r.PasswordBook }} (Console PC; earlier entries kept).</div>
                            }
                            @else
                            {
                                <div class="ac-sub"><i class="fas fa-triangle-exclamation"></i> Not saved to the password book (not found on this computer) : copy it now.</div>
                            }

                            <button class="ac-btn ac-btn-primary" type="button" (click)="resetDone.set(null)">I have copied it</button>
                        }
                        @else
                        {
                            <h3><i class="fas fa-circle-check"></i> Database login reset</h3>
                            <div class="ac-sub">
                                <i class="fas fa-lock"></i> Login {{ r.LoginName }} has a new password, stored sealed : the ERP opens it itself.
                                Nothing to paste, no redeploy. The client works again within a minute.
                            </div>

                            <button class="ac-btn ac-btn-primary" type="button" (click)="resetDone.set(null)">Close</button>
                        }
                    </div>
                </div>
            }

            <!-- The passwords : shown once, never stored -->
            @if (created(); as r)
            {
                <div class="td-once">
                    <div class="td-once-box">
                        <h3><i class="fas fa-circle-check"></i> {{ r.DatabaseName }} is ready</h3>
                        <div class="td-once-warn">
                            <b>Shown only now.</b> Copy {{ r.SettingsSnippet ? 'both' : 'the admin password' }} before closing : the Console does not keep {{ r.SettingsSnippet ? 'them' : 'it' }}.
                        </div>

                        <div class="td-secret"><span>ERP login</span><code>{{ r.AdminUser }}</code><span></span></div>
                        <div class="td-secret">
                            <span>Admin password</span><code>{{ r.AdminPassword }}</code>
                            <button class="ac-btn" type="button" (click)="copy(r.AdminPassword)"><i class="fas fa-copy"></i></button>
                        </div>
                        <div class="ac-sub">Give these to the client's administrator. Financial year : {{ r.FinancialYear }}.</div>
                        @if (r.PasswordBookSaved)
                        {
                            <div class="ac-sub"><i class="fas fa-book"></i> Also added to your {{ r.PasswordBook }} (Console PC; earlier entries kept).</div>
                        }
                        @else
                        {
                            <div class="ac-sub"><i class="fas fa-triangle-exclamation"></i> Not saved to the password book (not found on this computer) : copy it now.</div>
                        }

                        @if (r.SettingsSnippet)
                        {
                            <div class="td-secret">
                                <span>ERP server setting</span><code>{{ r.SettingsSnippet }}</code>
                                <button class="ac-btn" type="button" (click)="copy(r.SettingsSnippet!)"><i class="fas fa-copy"></i></button>
                            </div>
                            <div class="ac-sub">
                                Paste this line inside <b>"Tenancy" : "Credentials"</b> of the ERP server's appsettings.json
                                (database login {{ r.LoginName }}, key {{ r.CredentialKey }}), then redeploy the ERP.
                            </div>
                        }
                        @else
                        {
                            <div class="ac-sub">
                                <i class="fas fa-lock"></i> Database login {{ r.LoginName }} is stored sealed : the ERP opens it itself.
                                Nothing to paste, no redeploy. The address works within a minute.
                            </div>
                        }

                        <button class="ac-btn ac-btn-primary" type="button" (click)="closeCreated()">{{ r.SettingsSnippet ? 'I have copied both' : 'I have copied it' }}</button>
                    </div>
                </div>
            }
        }
        @else if (error())
        {
            <div class="ac-error">{{ error() }}</div>
        }
        @else
        {
            <div class="td-loading"><i class="fas fa-spinner fa-spin"></i> Loading tenant...</div>
        }
    `
})
export class TenantDetailPage implements OnInit
{
    private readonly api = inject(ConsoleApi);
    private readonly auth = inject(AuthService);

    // from the route (withComponentInputBinding)
    readonly publicId = input.required<string>();

    readonly canManage = this.auth.hasRole('OWNER', 'DEVELOPER');
    readonly statusOptions: SelectOption[] = TENANT_STATUSES.map(s => ({ value: s, label: s }));

    private readonly toast = inject(ToastService);

    readonly t = signal<TenantDetail | null>(null);
    readonly error = signal('');
    readonly busy = signal(false);
    readonly statusError = signal('');

    readonly newStatus = signal('');
    readonly reason = signal('');

    // Create database
    readonly plan = signal<TenantDatabasePlan | null>(null);
    readonly creating = signal(false);
    readonly dbError = signal('');
    readonly planError = signal('');
    readonly created = signal<TenantDatabaseResult | null>(null);
    readonly fyStart = signal(7);
    readonly confirmOpen = signal(false);

    // Remove what a failed Create database left (2026-11-20)
    readonly leftoverAsk = signal(false);
    readonly leftoverTyped = signal('');
    readonly removing = signal(false);

    // Reset admin password / database login (2026-11-20)
    readonly resetAsk = signal<'admin' | 'login' | null>(null);
    readonly resetting = signal(false);
    readonly resetError = signal('');
    readonly resetDone = signal<TenantResetResult | null>(null);
    readonly fyOptions: SelectOption[] =
    [
        { value: 7, label: 'Financial year from July' },
        { value: 1, label: 'Financial year from January' }
    ];

    ngOnInit(): void
    {
        void this.load();
    }

    async load(): Promise<void>
    {
        try
        {
            const t = await this.api.tenant(this.publicId());

            this.t.set(t);
            this.newStatus.set(t.Status);
            this.reason.set('');

            // a failed check is shown, not hidden (2026-11-20)
            this.planError.set('');

            this.plan.set(t.DatabaseName
                ? null
                : await this.api.tenantDatabasePlan(t.PublicId).catch(e =>
                {
                    this.planError.set(apiMessage(e));

                    return null;
                }));
        }
        catch (e)
        {
            this.error.set(apiMessage(e));
        }
    }

    async changeStatus(t: TenantDetail): Promise<void>
    {
        this.busy.set(true);
        this.statusError.set('');

        try
        {
            await this.api.changeTenantStatus(t.PublicId, this.newStatus(), this.reason().trim());

            this.toast.success('Status changed', `${t.TenantCode} is now ${this.newStatus()}.`);

            await this.load();
        }
        catch (e)
        {
            this.statusError.set(apiMessage(e));
        }
        finally
        {
            this.busy.set(false);
        }
    }

    askCreate(): void
    {
        this.dbError.set('');
        this.confirmOpen.set(true);
    }

    async createDatabase(t: TenantDetail): Promise<void>
    {
        this.confirmOpen.set(false);

        // one at a time (a second click is ignored; the API refuses it too)
        if (this.creating())
        {
            return;
        }

        this.creating.set(true);
        this.dbError.set('');

        try
        {
            this.created.set(await this.api.createTenantDatabase(t.PublicId, this.fyStart()));
        }
        catch (e)
        {
            const message = apiMessage(e);

            // the check again : a leftover of this try shows at once
            await this.load();

            this.dbError.set(message);
        }
        finally
        {
            this.creating.set(false);
        }
    }

    askRemoveLeftover(): void
    {
        this.dbError.set('');
        this.leftoverTyped.set('');
        this.leftoverAsk.set(true);
    }

    async removeLeftover(t: TenantDetail): Promise<void>
    {
        this.leftoverAsk.set(false);

        // one at a time (a second click is ignored; the API locks too)
        if (this.removing())
        {
            return;
        }

        this.removing.set(true);
        this.dbError.set('');

        try
        {
            const r = await this.api.removeTenantDatabaseLeftover(t.PublicId, this.leftoverTyped().trim());

            this.toast.success(
                r.DatabaseRemoved ? 'Leftover removed' : 'Nothing to remove',
                r.Note || `${r.DatabaseName} is gone. Create database can be tried again.`);

            await this.load();
        }
        catch (e)
        {
            this.dbError.set(apiMessage(e));

            // the page shows what is on the server now
            await this.load();
        }
        finally
        {
            this.removing.set(false);
        }
    }

    askReset(kind: 'admin' | 'login'): void
    {
        this.resetError.set('');
        this.resetAsk.set(kind);
    }

    async doReset(t: TenantDetail, kind: 'admin' | 'login'): Promise<void>
    {
        this.resetAsk.set(null);

        // one at a time (a second click is ignored)
        if (this.resetting())
        {
            return;
        }

        this.resetting.set(true);
        this.resetError.set('');

        try
        {
            this.resetDone.set(kind === 'admin'
                ? await this.api.resetTenantAdminPassword(t.PublicId)
                : await this.api.resetTenantDatabaseLogin(t.PublicId));
        }
        catch (e)
        {
            this.resetError.set(apiMessage(e));
        }
        finally
        {
            this.resetting.set(false);
        }
    }

    copy(text: string): void
    {
        void navigator.clipboard?.writeText(text).then(() => this.toast.success('Copied'));
    }

    closeCreated(): void
    {
        this.created.set(null);

        void this.load();
    }
}
