//===============================================================
// Requests : demo / purchase requests from the public website.
// A row opens the request page (/requests/:publicId).
//===============================================================

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { ConsoleApi } from '../../core/console-api.service';
import { apiMessage } from '../../core/auth.interceptor';
import { REQUEST_STATUSES, REQUEST_STATUS_LABEL, SiteRequestRow } from '../../core/models';
import { PageCanvas } from '../../ui/page-canvas';
import { PageHeader } from '../../ui/page-header';
import { Pagination, pageSlice } from '../../ui/pagination';
import { SelectBox, SelectOption } from '../../ui/select-box';
import { RequestBadge } from '../../ui/request-badge.service';

@Component({
    selector: 'ac-requests',
    imports: [FormsModule, DatePipe, PageHeader, PageCanvas, Pagination, SelectBox],
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
    `
})
export class RequestsPage implements OnInit
{
    private readonly api = inject(ConsoleApi);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
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

    open(row: SiteRequestRow): void
    {
        void this.router.navigate(['/requests', row.PublicId]);
    }
}
