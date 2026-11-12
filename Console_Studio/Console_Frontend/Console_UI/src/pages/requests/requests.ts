//===============================================================
// Requests : demo / purchase requests from the public website.
// Review, call, note, then Convert to customer -> Register tenant
// opens filled in from the request.
//===============================================================

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { ConsoleApi } from '../../core/console-api.service';
import { apiMessage } from '../../core/auth.interceptor';
import { REQUEST_STATUSES, REQUEST_STATUS_LABEL, SiteRequest, SiteRequestRow, TenantPrefill } from '../../core/models';
import { PageCanvas } from '../../ui/page-canvas';
import { PageHeader } from '../../ui/page-header';
import { Pagination, pageSlice } from '../../ui/pagination';
import { SelectBox, SelectOption } from '../../ui/select-box';
import { ToastService } from '../../ui/toast';
import { RequestBadge } from '../../ui/request-badge.service';
import { TenantFormComponent } from '../tenants/tenant-form';

@Component({
    selector: 'ac-requests',
    imports: [FormsModule, DatePipe, PageHeader, PageCanvas, Pagination, SelectBox, TenantFormComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'ac-page' },
    styles: [`
        .rq-type { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 7px; font-size: 11.5px; font-weight: 700; }
        .rq-type.Demo { background: var(--ac-sky-soft); color: var(--ac-sky); }
        .rq-type.Purchase { background: var(--ac-accent-soft); color: var(--ac-accent); }
        .ac-chip-New { background: var(--ac-accent-soft); color: var(--ac-accent); }
        .ac-chip-Contacted { background: var(--ac-sky-soft); color: var(--ac-sky); }
        .ac-chip-DemoBooked { background: var(--ac-amber-soft); color: var(--ac-amber); }
        .ac-chip-Converted { background: var(--ac-green-soft); color: var(--ac-green); }
        .ac-chip-Closed { background: var(--ac-hover); color: var(--ac-muted); }
        tr.is-new td:first-child b::after { display: inline-block; width: 7px; height: 7px; margin-left: 7px; border-radius: 50%; background: var(--ac-accent); vertical-align: middle; content: ''; }

        .rq-modal { width: min(960px, 100%); }
        .rq-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 18px; }
        .rq-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; border: 1px solid var(--ac-border-2); border-radius: 12px; overflow: hidden; }
        .rq-fact { display: flex; flex-direction: column; gap: 3px; padding: 10px 14px; border-bottom: 1px solid var(--ac-border-2); }
        .rq-fact:nth-child(odd) { border-right: 1px solid var(--ac-border-2); }
        .rq-fact.wide { grid-column: 1 / -1; border-right: 0; }
        .rq-fact span { color: var(--ac-muted); font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
        .rq-fact b { color: var(--ac-text); font-weight: 600; overflow-wrap: anywhere; white-space: pre-line; }
        .rq-fact a { font-weight: 600; }
        .rq-side { display: flex; flex-direction: column; gap: 14px; }
        .rq-box { display: flex; flex-direction: column; gap: 12px; padding: 14px; border: 1px solid var(--ac-border-2); border-radius: 12px; background: var(--ac-card-2); }
        .rq-converted { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border: 1px solid color-mix(in srgb, var(--ac-green) 30%, transparent); border-radius: 12px; background: var(--ac-green-soft); color: var(--ac-green); font-weight: 600; }
        .rq-meta { color: var(--ac-muted); font-size: 11.5px; }
        @media (max-width: 860px) { .rq-grid { grid-template-columns: minmax(0, 1fr); } }
    `],
    template: `
        <ac-page-header icon="fas fa-inbox" eyebrow="Clients" title="Requests"
            subtitle="Demo and purchase requests from the website : call, note, then convert to a customer">
            <button pageHeaderRight class="ac-btn" type="button" (click)="openSettings()"><i class="fas fa-sliders"></i> Website settings</button>
        </ac-page-header>

        <ac-page-canvas>
            <ng-container canvasToolbar>
                <div class="ac-search">
                    <i class="fas fa-magnifying-glass"></i>
                    <input class="ac-input" placeholder="Number, company, contact, phone or email" [ngModel]="search()" (ngModelChange)="search.set($event); page.set(1)">
                </div>
                <ac-select-box style="width:170px" [options]="typeOptions" [value]="type()" (valueChange)="type.set($any($event)); page.set(1)" />
                <ac-select-box style="width:180px" [options]="statusOptions" [value]="status()" (valueChange)="status.set($any($event)); page.set(1)" />
                <button class="ac-btn ac-btn-icon" type="button" title="Reload" (click)="load()"><i class="fas fa-rotate" [class.fa-spin]="loading()"></i></button>
            </ng-container>

            @if (error()) { <div class="ac-error" style="margin:12px">{{ error() }}</div> }

            <table class="ac-table">
                <thead><tr><th>Request</th><th>Company</th><th>Contact</th><th>Product</th><th>Demo date</th><th>Received</th><th>Status</th></tr></thead>
                <tbody>
                    @for (r of pageRows(); track r.PublicId)
                    {
                        <tr class="ac-click" [class.is-new]="r.Status === 'New'" (click)="open(r)">
                            <td><b class="ac-mono">{{ r.RequestNo }}</b><div><span [class]="'rq-type ' + r.RequestType">{{ r.RequestType }}</span></div></td>
                            <td><b>{{ r.LegalName }}</b>@if (r.City || r.Country) { <div class="ac-sub">{{ place(r) }}</div> }</td>
                            <td>{{ r.ContactName }}<div class="ac-sub">{{ r.Phone }}</div></td>
                            <td>{{ r.ProductName }}</td>
                            <td>{{ r.PreferredDate ? (r.PreferredDate | date: 'dd-MMM-yyyy') : '-' }}</td>
                            <td>{{ r.CreatedDate | date: 'dd-MMM-yyyy HH:mm' }}</td>
                            <td><span [class]="'ac-chip ac-chip-' + r.Status">{{ label(r.Status) }}</span></td>
                        </tr>
                    }
                </tbody>
            </table>

            @if (!pageRows().length)
            {
                <div class="ac-empty-fill">
                    <span class="ac-empty-icon"><i class="fas" [class.fa-spinner]="loading()" [class.fa-spin]="loading()" [class.fa-inbox]="!loading()"></i></span>
                    <b>{{ loading() ? 'Loading requests' : rows().length ? 'No match' : 'No requests yet' }}</b>
                    <span>{{ loading() ? 'One moment...' : rows().length ? 'No request matches the search or filters.' : 'Requests sent from the website appear here.' }}</span>
                </div>
            }

            <ac-pagination canvasFooter noun="requests" [total]="filtered().length" [page]="page()" [size]="size()"
                (pageChange)="page.set($event)" (sizeChange)="size.set($event); page.set(1)" />
        </ac-page-canvas>

        @if (current(); as r)
        {
            <div class="ac-backdrop">
                <div class="ac-modal rq-modal">
                    <div class="ac-modal-head">
                        <i class="fas fa-inbox"></i>
                        <h3>{{ r.RequestNo }} &middot; {{ r.LegalName }}</h3>
                        <span [class]="'rq-type ' + r.RequestType">{{ r.RequestType }}</span>
                        <button class="ac-icon-btn" type="button" (click)="current.set(null)"><i class="fas fa-xmark"></i></button>
                    </div>

                    <div class="ac-modal-body">
                        <div class="rq-grid">
                            <div class="rq-side">
                                <span class="ac-section-label">Company</span>
                                <div class="rq-facts">
                                    <div class="rq-fact"><span>Legal name</span><b>{{ r.LegalName }}</b></div>
                                    <div class="rq-fact"><span>Display name</span><b>{{ r.DisplayName || '-' }}</b></div>
                                    <div class="rq-fact"><span>VAT / tax no.</span><b class="ac-mono">{{ r.BinNo || '-' }}</b></div>
                                    <div class="rq-fact"><span>Company / tax ID</span><b class="ac-mono">{{ r.TinNo || '-' }}</b></div>
                                    <div class="rq-fact wide"><span>Address</span><b>{{ r.Address || '-' }}{{ r.City ? ', ' + r.City : '' }}{{ r.Country ? ', ' + r.Country : '' }}</b></div>
                                </div>

                                <span class="ac-section-label">Contact person</span>
                                <div class="rq-facts">
                                    <div class="rq-fact"><span>Name</span><b>{{ r.ContactName }}</b></div>
                                    <div class="rq-fact"><span>Designation</span><b>{{ r.Designation || '-' }}</b></div>
                                    <div class="rq-fact"><span>Phone</span><a [href]="'tel:' + r.Phone">{{ r.Phone }}</a></div>
                                    <div class="rq-fact"><span>Email</span><a [href]="'mailto:' + r.Email">{{ r.Email }}</a></div>
                                </div>

                                <span class="ac-section-label">What they need</span>
                                <div class="rq-facts">
                                    <div class="rq-fact"><span>Product</span><b>{{ r.ProductName }}</b></div>
                                    <div class="rq-fact"><span>Branches / users</span><b>{{ r.Branches ?? '-' }} / {{ r.Users ?? '-' }}</b></div>
                                    <div class="rq-fact"><span>Wanted address</span><b class="ac-mono">{{ r.PreferredHost || '-' }}</b></div>
                                    <div class="rq-fact"><span>Demo date</span><b>{{ r.PreferredDate ? (r.PreferredDate | date: 'dd-MMM-yyyy') : '-' }} {{ r.PreferredTime || '' }}</b></div>
                                    <div class="rq-fact wide"><span>Message</span><b>{{ r.Message || '-' }}</b></div>
                                    <div class="rq-fact wide"><span>Heard about us</span><b>{{ r.HeardFrom || '-' }}</b></div>
                                </div>
                            </div>

                            <div class="rq-side">
                                <span class="ac-section-label">Follow-up</span>
                                <div class="rq-box">
                                    <div class="ac-field">
                                        <label>Status</label>
                                        <ac-select-box [options]="editStatusOptions()" [value]="editStatus()" (valueChange)="editStatus.set($any($event))" />
                                    </div>
                                    <div class="ac-field">
                                        <label>Notes</label>
                                        <textarea class="ac-textarea" rows="5" placeholder="Called, demo fixed for..." [ngModel]="editNotes()" (ngModelChange)="editNotes.set($event)"></textarea>
                                    </div>
                                    <button class="ac-btn" type="button" [disabled]="busy()" (click)="save(r)"><i class="fas fa-floppy-disk"></i> Save follow-up</button>
                                </div>

                                <span class="ac-section-label">Customer</span>
                                @if (r.CustomerPublicId)
                                {
                                    <div class="rq-converted"><i class="fas fa-circle-check"></i> Converted to {{ r.CustomerCode }} : {{ r.CustomerName }}</div>
                                    @if (canManage)
                                    {
                                        <button class="ac-btn ac-btn-primary" type="button" [disabled]="busy()" (click)="convert(r)"><i class="fas fa-server"></i> Register tenant</button>
                                    }
                                }
                                @else if (canManage)
                                {
                                    <span class="ac-hint">Makes the customer from this request (company, tax numbers, country, phone, email, address), then opens Register tenant filled in.</span>
                                    <button class="ac-btn ac-btn-primary" type="button" [disabled]="busy()" (click)="convert(r)">
                                        <i class="fas" [class.fa-user-plus]="!busy()" [class.fa-spinner]="busy()" [class.fa-spin]="busy()"></i> Convert to customer
                                    </button>
                                }

                                <span class="rq-meta">Received {{ r.CreatedDate | date: 'dd-MMM-yyyy HH:mm' }}{{ r.IpAddress ? ' from ' + r.IpAddress : '' }}</span>
                            </div>
                        </div>

                        @if (formError()) { <div class="ac-error">{{ formError() }}</div> }
                    </div>
                </div>
            </div>
        }

        @if (prefill(); as p)
        {
            <ac-tenant-form [prefill]="p" (closed)="tenantClosed($event)" />
        }
    `
})
export class RequestsPage implements OnInit
{
    private readonly api = inject(ConsoleApi);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);
    private readonly badge = inject(RequestBadge);

    readonly canManage = this.auth.hasRole('OWNER', 'DEVELOPER');

    readonly label = (s: string): string => REQUEST_STATUS_LABEL[s] ?? s;

    readonly place = (r: SiteRequestRow): string => [r.City, r.Country].filter(x => !!x).join(', ');

    readonly typeOptions: SelectOption[] =
    [
        { value: '', label: 'All types', icon: 'fas fa-layer-group' },
        { value: 'Demo', label: 'Demo' },
        { value: 'Purchase', label: 'Purchase' }
    ];

    readonly statusOptions: SelectOption[] =
    [
        { value: '', label: 'All statuses', icon: 'fas fa-layer-group' },
        ...REQUEST_STATUSES.map(s => ({ value: s, label: REQUEST_STATUS_LABEL[s] ?? s }))
    ];

    readonly search = signal('');
    readonly type = signal('');
    readonly status = signal('');
    readonly page = signal(1);
    readonly size = signal(20);

    readonly rows = signal<SiteRequestRow[]>([]);
    readonly loading = signal(false);
    readonly error = signal('');

    readonly current = signal<SiteRequest | null>(null);
    readonly editStatus = signal('');
    readonly editNotes = signal('');
    readonly busy = signal(false);
    readonly formError = signal('');
    readonly prefill = signal<TenantPrefill | null>(null);

    // "Converted" is set by Convert only
    readonly editStatusOptions = computed<SelectOption[]>(() =>
        REQUEST_STATUSES
            .filter(s => s !== 'Converted' || this.current()?.Status === 'Converted')
            .map(s => ({ value: s, label: REQUEST_STATUS_LABEL[s] ?? s })));

    readonly filtered = computed(() =>
    {
        const q = this.search().trim().toLowerCase();
        const t = this.type();
        const s = this.status();

        return this.rows().filter(r =>
            (!t || r.RequestType === t)
            &&
            (!s || r.Status === s)
            &&
            (!q || [r.RequestNo, r.LegalName, r.ContactName, r.Phone, r.Email, r.City ?? '', r.Country ?? ''].some(x => x.toLowerCase().includes(q))));
    });

    readonly pageRows = computed(() => pageSlice(this.filtered(), this.page(), this.size()));

    ngOnInit(): void
    {
        void this.load();
    }

    openSettings(): void
    {
        void this.router.navigateByUrl('/settings/website');
    }

    async load(): Promise<void>
    {
        this.loading.set(true);
        this.error.set('');

        try
        {
            this.rows.set(await this.api.requests());

            void this.badge.refresh();
        }
        catch (e)
        {
            this.error.set(apiMessage(e));
        }
        finally
        {
            this.loading.set(false);
        }
    }

    async open(row: SiteRequestRow): Promise<void>
    {
        this.formError.set('');

        try
        {
            const r = await this.api.request(row.PublicId);

            this.editStatus.set(r.Status === 'New' ? 'Contacted' : r.Status);
            this.editNotes.set(r.StaffNotes ?? '');
            this.current.set(r);
        }
        catch (e)
        {
            this.toast.error('Could not open the request', apiMessage(e));
        }
    }

    async save(r: SiteRequest): Promise<void>
    {
        this.busy.set(true);
        this.formError.set('');

        try
        {
            await this.api.updateRequest(r.PublicId, this.editStatus(), this.editNotes().trim() || null);

            this.toast.success('Follow-up saved', `${r.RequestNo} is ${this.label(this.editStatus())}.`);
            this.current.set(null);

            await this.load();
        }
        catch (e)
        {
            this.formError.set(apiMessage(e));
        }
        finally
        {
            this.busy.set(false);
        }
    }

    async convert(r: SiteRequest): Promise<void>
    {
        this.busy.set(true);
        this.formError.set('');

        try
        {
            const p = await this.api.convertRequest(r.PublicId);

            if (!r.CustomerPublicId)
            {
                this.toast.success('Customer created', `${p.CustomerCode} : ${p.CustomerName}`);
            }

            this.current.set(null);
            this.prefill.set(p);

            await this.load();
        }
        catch (e)
        {
            this.formError.set(apiMessage(e));
        }
        finally
        {
            this.busy.set(false);
        }
    }

    tenantClosed(saved: boolean): void
    {
        this.prefill.set(null);

        if (saved)
        {
            this.toast.success('Tenant registered', 'Find it on the Tenants page.');
        }
    }
}
