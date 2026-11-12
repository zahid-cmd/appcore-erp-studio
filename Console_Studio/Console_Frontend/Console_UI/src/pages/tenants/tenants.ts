import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { ConsoleApi } from '../../core/console-api.service';
import { apiMessage } from '../../core/auth.interceptor';
import { ProductRow, TENANT_STATUSES, TenantRow, productIcon } from '../../core/models';
import { PageCanvas } from '../../ui/page-canvas';
import { PageHeader } from '../../ui/page-header';
import { Pagination, pageSlice } from '../../ui/pagination';
import { SelectBox, SelectOption } from '../../ui/select-box';
import { ToastService } from '../../ui/toast';
import { TenantFormComponent } from './tenant-form';

@Component({
    selector: 'ac-tenants',
    imports: [FormsModule, PageHeader, PageCanvas, Pagination, SelectBox, TenantFormComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'ac-page' },
    template: `
        <ac-page-header icon="fas fa-server" eyebrow="Clients" title="Tenants"
            subtitle="One per customer and product : its own database and web address">
            @if (canManage)
            {
                <button pageHeaderRight class="ac-btn ac-btn-primary" type="button" (click)="formOpen.set(true)"><i class="fas fa-plus"></i> Register tenant</button>
            }
        </ac-page-header>

        <ac-page-canvas>
            <ng-container canvasToolbar>
                <div class="ac-search">
                    <i class="fas fa-magnifying-glass"></i>
                    <input class="ac-input" placeholder="Code, name, customer or address" [ngModel]="search()" (ngModelChange)="search.set($event); page.set(1)">
                </div>
                <ac-select-box style="width:210px" [options]="productOptions()" [value]="product()" (valueChange)="product.set($any($event)); page.set(1)" />
                <ac-select-box style="width:170px" [options]="statusOptions" [value]="status()" (valueChange)="status.set($any($event)); page.set(1)" />
                <button class="ac-btn ac-btn-icon" type="button" title="Reload" (click)="load()"><i class="fas fa-rotate" [class.fa-spin]="loading()"></i></button>
            </ng-container>

            @if (error()) { <div class="ac-error" style="margin:12px">{{ error() }}</div> }

            <table class="ac-table">
                <thead><tr><th>Tenant</th><th>Customer</th><th>Product</th><th>Web address</th><th>Database</th><th>Status</th></tr></thead>
                <tbody>
                    @for (t of pageRows(); track t.PublicId)
                    {
                        <tr class="ac-click" (click)="openTenant(t)">
                            <td>
                                <div class="ac-cell">
                                    <span class="ac-avatar"><i [class]="'fas ' + icon(t.ProductCode)"></i></span>
                                    <span><b>{{ t.DisplayName }}</b><div class="ac-sub ac-mono">{{ t.TenantCode }}</div></span>
                                </div>
                            </td>
                            <td>{{ t.CustomerName }}</td>
                            <td>{{ t.ProductName }}</td>
                            <td class="ac-mono">{{ t.PrimaryHost || '-' }}</td>
                            <td class="ac-mono">{{ t.DatabaseName || '-' }}</td>
                            <td>
                                <span [class]="'ac-chip ac-chip-' + t.Status">{{ t.Status }}</span>
                                @if (t.TrialEndsOn) { <div class="ac-sub">Trial until {{ t.TrialEndsOn }}</div> }
                            </td>
                        </tr>
                    }
                </tbody>
            </table>

            @if (!pageRows().length)
            {
                <div class="ac-empty-fill">
                    <span class="ac-empty-icon"><i class="fas" [class.fa-spinner]="loading()" [class.fa-spin]="loading()" [class.fa-server]="!loading()"></i></span>
                    <b>{{ loading() ? 'Loading tenants' : rows().length ? 'No match' : 'No tenants yet' }}</b>
                    <span>{{ loading() ? 'One moment...' : rows().length ? 'No tenant matches the search or filters.' : 'Add the customer first, then Register tenant.' }}</span>
                </div>
            }

            <ac-pagination canvasFooter noun="tenants" [total]="filtered().length" [page]="page()" [size]="size()"
                (pageChange)="page.set($event)" (sizeChange)="size.set($event); page.set(1)" />
        </ac-page-canvas>

        @if (formOpen())
        {
            <ac-tenant-form (closed)="formClosed($event)" />
        }
    `
})
export class TenantsPage implements OnInit
{
    private readonly api = inject(ConsoleApi);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);

    readonly canManage = this.auth.hasRole('OWNER', 'DEVELOPER');

    readonly statusOptions: SelectOption[] =
    [
        { value: '', label: 'All statuses', icon: 'fas fa-layer-group' },
        ...TENANT_STATUSES.map(s => ({ value: s, label: s }))
    ];

    readonly search = signal('');
    readonly product = signal('');
    readonly status = signal('');
    readonly page = signal(1);
    readonly size = signal(20);

    readonly rows = signal<TenantRow[]>([]);
    readonly products = signal<ProductRow[]>([]);
    readonly loading = signal(false);
    readonly error = signal('');
    readonly formOpen = signal(false);

    readonly productOptions = computed<SelectOption[]>(() =>
    [
        { value: '', label: 'All products', icon: 'fas fa-cubes' },
        ...this.products().map(p => ({ value: p.ProductCode, label: p.ProductName, icon: 'fas ' + productIcon(p.ProductCode) }))
    ]);

    readonly filtered = computed(() =>
    {
        const q = this.search().trim().toLowerCase();
        const p = this.product();
        const s = this.status();

        return this.rows().filter(t =>
            (!p || t.ProductCode === p)
            &&
            (!s || t.Status === s)
            &&
            (!q || [t.TenantCode, t.DisplayName, t.CustomerName, t.PrimaryHost ?? '', t.DatabaseName ?? ''].some(x => x.toLowerCase().includes(q))));
    });

    readonly pageRows = computed(() => pageSlice(this.filtered(), this.page(), this.size()));

    readonly icon = productIcon;

    async ngOnInit(): Promise<void>
    {
        try
        {
            this.products.set(await this.api.products());
        }
        catch
        {
            // the list shows its own error
        }

        await this.load();
    }

    async load(): Promise<void>
    {
        this.loading.set(true);
        this.error.set('');

        try
        {
            this.rows.set(await this.api.tenants());
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

    openTenant(t: TenantRow): void
    {
        void this.router.navigate(['/tenants', t.PublicId]);
    }

    formClosed(saved: boolean): void
    {
        this.formOpen.set(false);

        if (saved)
        {
            this.toast.success('Tenant registered', 'It is now listed below.');

            void this.load();
        }
    }
}
