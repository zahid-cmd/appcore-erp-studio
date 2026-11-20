import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { ConsoleApi } from '../../core/console-api.service';
import { apiMessage } from '../../core/auth.interceptor';
import { CustomerRow } from '../../core/models';
import { PageCanvas } from '../../ui/page-canvas';
import { PageHeader } from '../../ui/page-header';
import { Pagination, pageSlice } from '../../ui/pagination';
import { SelectBox, SelectOption } from '../../ui/select-box';

@Component({
    selector: 'ac-customers',
    imports: [FormsModule, RouterLink, PageHeader, PageCanvas, Pagination, SelectBox],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'ac-page' },
    template: `
        <ac-page-header icon="fas fa-building-user" eyebrow="Clients" title="Customers"
            subtitle="The businesses AppCore serves; each can use one or more products (tenants)">
            @if (canManage)
            {
                <a pageHeaderRight class="ac-btn ac-btn-primary" routerLink="/customers/new"><i class="fas fa-plus"></i> New customer</a>
            }
        </ac-page-header>

        <ac-page-canvas>
            <ng-container canvasToolbar>
                <div class="ac-search">
                    <i class="fas fa-magnifying-glass"></i>
                    <input class="ac-input" placeholder="Code, name, phone or email" [ngModel]="search()" (ngModelChange)="search.set($event); page.set(1)">
                </div>
                <ac-select-box style="width:170px" [options]="statusOptions" [value]="status()" (valueChange)="status.set($any($event)); page.set(1)" />
                <button class="ac-btn ac-btn-icon" type="button" title="Reload" (click)="load()"><i class="fas fa-rotate" [class.fa-spin]="loading()"></i></button>
            </ng-container>

            @if (error()) { <div class="ac-error" style="margin:12px">{{ error() }}</div> }

            <table class="ac-table">
                <thead><tr><th>Customer</th><th>Code</th><th>Phone</th><th>Email</th><th>Tenants</th><th>Status</th></tr></thead>
                <tbody>
                    @for (c of pageRows(); track c.PublicId)
                    {
                        <tr [class.ac-click]="canManage" (click)="canManage && open(c)">
                            <td>
                                <div class="ac-cell">
                                    <span class="ac-avatar">{{ initials(c.DisplayName) }}</span>
                                    <span><b>{{ c.DisplayName }}</b>@if (c.LegalName !== c.DisplayName) { <div class="ac-sub">{{ c.LegalName }}</div> }</span>
                                </div>
                            </td>
                            <td class="ac-mono">{{ c.CustomerCode }}</td>
                            <td>{{ c.Phone || '-' }}</td>
                            <td>{{ c.Email || '-' }}</td>
                            <td><b>{{ c.Tenants }}</b></td>
                            <td><span [class]="'ac-chip ac-chip-' + c.Status">{{ c.Status }}</span></td>
                        </tr>
                    }
                </tbody>
            </table>

            @if (!pageRows().length)
            {
                <div class="ac-empty-fill">
                    <span class="ac-empty-icon"><i class="fas" [class.fa-spinner]="loading()" [class.fa-spin]="loading()" [class.fa-building-user]="!loading()"></i></span>
                    <b>{{ loading() ? 'Loading customers' : rows().length ? 'No match' : 'No customers yet' }}</b>
                    <span>{{ loading() ? 'One moment...' : rows().length ? 'No customer matches the search or filter.' : 'Add the first one with New customer.' }}</span>
                </div>
            }

            <ac-pagination canvasFooter noun="customers" [total]="filtered().length" [page]="page()" [size]="size()"
                (pageChange)="page.set($event)" (sizeChange)="size.set($event); page.set(1)" />
        </ac-page-canvas>
    `
})
export class CustomersPage implements OnInit
{
    private readonly api = inject(ConsoleApi);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    readonly canManage = this.auth.hasRole('OWNER', 'DEVELOPER');

    readonly statusOptions: SelectOption[] =
    [
        { value: '', label: 'All statuses', icon: 'fas fa-layer-group' },
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' }
    ];

    readonly search = signal('');
    readonly status = signal('');
    readonly page = signal(1);
    readonly size = signal(20);

    readonly rows = signal<CustomerRow[]>([]);
    readonly loading = signal(false);
    readonly error = signal('');

    readonly filtered = computed(() =>
    {
        const q = this.search().trim().toLowerCase();
        const s = this.status();

        return this.rows().filter(c =>
            (!s || c.Status === s)
            &&
            (!q || [c.CustomerCode, c.DisplayName, c.LegalName, c.Phone ?? '', c.Email ?? ''].some(x => x.toLowerCase().includes(q))));
    });

    readonly pageRows = computed(() => pageSlice(this.filtered(), this.page(), this.size()));

    ngOnInit(): void
    {
        void this.load();
    }

    initials(name: string): string
    {
        return name.split(/\s+/).filter(x => !!x).slice(0, 2).map(x => x[0]!.toUpperCase()).join('');
    }

    async load(): Promise<void>
    {
        this.loading.set(true);
        this.error.set('');

        try
        {
            this.rows.set(await this.api.customers());
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

    open(row: CustomerRow): void
    {
        void this.router.navigate(['/customers', row.PublicId, 'edit']);
    }
}
