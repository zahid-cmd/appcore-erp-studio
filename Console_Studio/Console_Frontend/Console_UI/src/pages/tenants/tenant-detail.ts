import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { ConsoleApi } from '../../core/console-api.service';
import { apiMessage } from '../../core/auth.interceptor';
import { TENANT_STATUSES, TenantDetail } from '../../core/models';
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
