import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { ConsoleApi } from '../../core/console-api.service';
import { apiMessage } from '../../core/auth.interceptor';
import { TENANT_STATUSES, TenantDatabasePlan, TenantDatabaseResult, TenantDetail } from '../../core/models';
import { TenantFormComponent } from './tenant-form';
import { PageHeader } from '../../ui/page-header';
import { SelectBox, SelectOption } from '../../ui/select-box';
import { ToastService } from '../../ui/toast';

@Component({
    selector: 'ac-tenant-detail',
    imports: [FormsModule, RouterLink, DatePipe, TenantFormComponent, PageHeader, SelectBox],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'ac-page' },
    styles: [`
        .td-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 16px; align-items: start; }
        .td-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
        .td-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .td-fact { display: flex; flex-direction: column; gap: 4px; padding: 13px 18px; border-bottom: 1px solid var(--ac-border-2); }
        .td-fact:nth-child(odd) { border-right: 1px solid var(--ac-border-2); }
        .td-fact span { color: var(--ac-muted); font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
        .td-fact b { color: var(--ac-text); font-weight: 600; overflow-wrap: anywhere; }
        .td-remarks { padding: 13px 18px; color: var(--ac-text-2); }
        .td-domains { display: flex; flex-direction: column; gap: 8px; padding: 14px 18px; }
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
        @media (max-width: 1100px) { .td-grid { grid-template-columns: minmax(0, 1fr); } }
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
                        <button class="ac-btn ac-btn-primary" type="button" (click)="editOpen.set(true)"><i class="fas fa-pen"></i> Edit</button>
                    }
                </ng-container>
            </ac-page-header>

            <div class="ac-page-scroll ac-scroll">
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

                        <!-- Create database (onboarding) : only while the
                             tenant has none -->
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

                        <div class="td-once-warn">Takes about a minute. Two passwords are shown once at the end : keep that window open until you copy them.</div>

                        <div class="td-confirm-actions">
                            <button class="ac-btn" type="button" (click)="confirmOpen.set(false)">Cancel</button>
                            <button class="ac-btn ac-btn-primary" type="button" (click)="createDatabase(t)">
                                <i class="fas fa-database"></i> Create database
                            </button>
                        </div>
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
                            <b>Shown only now.</b> Copy both passwords before closing : the Console does not keep them.
                        </div>

                        <div class="td-secret"><span>ERP login</span><code>{{ r.AdminUser }}</code><span></span></div>
                        <div class="td-secret">
                            <span>Admin password</span><code>{{ r.AdminPassword }}</code>
                            <button class="ac-btn" type="button" (click)="copy(r.AdminPassword)"><i class="fas fa-copy"></i></button>
                        </div>
                        <div class="ac-sub">Give these to the client's administrator. Financial year : {{ r.FinancialYear }}.</div>

                        <div class="td-secret">
                            <span>ERP server setting</span><code>{{ r.SettingsSnippet }}</code>
                            <button class="ac-btn" type="button" (click)="copy(r.SettingsSnippet)"><i class="fas fa-copy"></i></button>
                        </div>
                        <div class="ac-sub">
                            Paste this line inside <b>"Tenancy" : "Credentials"</b> of the ERP server's appsettings.json
                            (database login {{ r.LoginName }}, key {{ r.CredentialKey }}), then restart the ERP.
                        </div>

                        <button class="ac-btn ac-btn-primary" type="button" (click)="closeCreated()">I have copied both</button>
                    </div>
                </div>
            }

            @if (editOpen())
            {
                <ac-tenant-form [tenant]="t" (closed)="editClosed($event)" />
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
    readonly editOpen = signal(false);

    readonly newStatus = signal('');
    readonly reason = signal('');

    // Create database
    readonly plan = signal<TenantDatabasePlan | null>(null);
    readonly creating = signal(false);
    readonly dbError = signal('');
    readonly created = signal<TenantDatabaseResult | null>(null);
    readonly fyStart = signal(7);
    readonly confirmOpen = signal(false);
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

            this.plan.set(t.DatabaseName ? null : await this.api.tenantDatabasePlan(t.PublicId).catch(() => null));
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

        this.creating.set(true);
        this.dbError.set('');

        try
        {
            this.created.set(await this.api.createTenantDatabase(t.PublicId, this.fyStart()));
        }
        catch (e)
        {
            this.dbError.set(apiMessage(e));
        }
        finally
        {
            this.creating.set(false);
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

    editClosed(saved: boolean): void
    {
        this.editOpen.set(false);

        if (saved)
        {
            this.toast.success('Tenant saved');

            void this.load();
        }
    }
}
