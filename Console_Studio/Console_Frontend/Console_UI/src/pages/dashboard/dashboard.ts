import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { ConsoleApi } from '../../core/console-api.service';
import { apiMessage } from '../../core/auth.interceptor';
import { CustomerRow, ProductRow, TenantRow, productIcon } from '../../core/models';
import { PageHeader } from '../../ui/page-header';

@Component({
    selector: 'ac-dashboard',
    imports: [RouterLink, PageHeader],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'ac-page' },
    styles: [`
        .db-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
        .db-kpi { position: relative; display: flex; align-items: center; gap: 14px; padding: 16px 18px; overflow: hidden; }
        .db-kpi::after { position: absolute; right: -30px; bottom: -40px; width: 120px; height: 120px; border-radius: 50%; background: var(--k-soft); content: ''; opacity: 0.7; }
        .db-kpi > i { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 13px; background: var(--k-soft); color: var(--k); font-size: 17px; }
        .db-kpi b { display: block; color: var(--ac-text); font-size: 24px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; }
        .db-kpi span { color: var(--ac-muted); font-size: 12px; font-weight: 600; }
        .k-violet { --k: var(--ac-accent); --k-soft: var(--ac-accent-soft); }
        .k-green { --k: var(--ac-green); --k-soft: var(--ac-green-soft); }
        .k-sky { --k: var(--ac-sky); --k-soft: var(--ac-sky-soft); }
        .k-gold { --k: var(--ac-gold); --k-soft: var(--ac-gold-soft); }

        .db-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
        .db-product { position: relative; display: flex; flex-direction: column; gap: 12px; padding: 18px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s; }
        .db-product:hover { transform: translateY(-2px); box-shadow: var(--ac-shadow-lg); }
        .db-product.live::before { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--ac-brand); content: ''; }
        .db-product-head { display: flex; align-items: flex-start; gap: 12px; }
        .db-product-icon { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 13px; background: var(--ac-accent-soft); color: var(--ac-accent); font-size: 18px; }
        .live .db-product-icon { background: var(--ac-brand); color: #fff; box-shadow: 0 10px 20px -12px rgba(20, 16, 12, 0.9); }
        .db-product-name { flex: 1; min-width: 0; }
        .db-product-name b { display: block; color: var(--ac-text); font-size: 14.5px; font-weight: 800; }
        .db-product p { flex: 1; margin: 0; color: var(--ac-muted); font-size: 12.5px; line-height: 1.55; }
        .db-count { display: flex; gap: 22px; padding-top: 12px; border-top: 1px dashed var(--ac-border); }
        .db-count b { display: block; color: var(--ac-text); font-size: 20px; font-weight: 800; }
        .db-count span { color: var(--ac-muted); font-size: 11.5px; }
        .db-dim { opacity: 0.72; }

        .db-latest { display: flex; flex: 1 0 auto; flex-direction: column; min-height: 260px; overflow: hidden; }
        .db-table-head { display: flex; align-items: center; justify-content: space-between; }
        .db-table-head a { margin-right: 14px; font-size: 12.5px; font-weight: 700; }
        @media (max-width: 1200px) { .db-grid, .db-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 640px) { .db-grid, .db-kpis { grid-template-columns: minmax(0, 1fr); } }
    `],
    template: `
        <ac-page-header icon="fas fa-gauge-high" [eyebrow]="greeting()" title="Dashboard"
            subtitle="Products, client companies and their tenants at a glance" />

        <div class="ac-page-scroll ac-scroll">
            @if (error()) { <div class="ac-error">{{ error() }}</div> }

            <div class="db-kpis">
                <div class="ac-card db-kpi k-violet"><i class="fas fa-building-user"></i><div><b>{{ customers().length }}</b><span>Customers</span></div></div>
                <div class="ac-card db-kpi k-green"><i class="fas fa-circle-check"></i><div><b>{{ count('Active') }}</b><span>Active tenants</span></div></div>
                <div class="ac-card db-kpi k-sky"><i class="fas fa-hourglass-half"></i><div><b>{{ count('Trial') }}</b><span>On trial</span></div></div>
                <div class="ac-card db-kpi k-gold"><i class="fas fa-cubes"></i><div><b>{{ liveProducts() }} / {{ products().length }}</b><span>Products live</span></div></div>
            </div>

            <span class="ac-section-label">Products</span>

            <div class="db-grid">
                @for (p of products(); track p.ProductCode)
                {
                    <div class="ac-card db-product" [class.live]="p.Status === 'Active'" [class.db-dim]="p.Status !== 'Active'">
                        <div class="db-product-head">
                            <span class="db-product-icon"><i [class]="'fas ' + icon(p.ProductCode)"></i></span>
                            <span class="db-product-name"><b>{{ p.ProductName }}</b><span class="ac-sub">{{ p.Industry }}</span></span>
                            <span [class]="'ac-chip ac-chip-' + p.Status">{{ p.Status }}</span>
                        </div>
                        <p>{{ p.Description }}</p>
                        <div class="db-count">
                            <span><b>{{ p.Tenants }}</b><span>Tenants</span></span>
                            <span><b>{{ p.Modules }}</b><span>Modules</span></span>
                        </div>
                    </div>
                }
            </div>

            <div class="ac-card db-latest">
                <div class="db-table-head">
                    <div class="ac-card-title" style="border:0"><i class="fas fa-clock-rotate-left"></i> Latest tenants</div>
                    <a routerLink="/tenants">All tenants <i class="fas fa-arrow-right"></i></a>
                </div>
                <table class="ac-table">
                    <thead><tr><th>Tenant</th><th>Customer</th><th>Product</th><th>Address</th><th>Status</th></tr></thead>
                    <tbody>
                        @for (t of tenants(); track t.PublicId)
                        {
                            <tr class="ac-click" [routerLink]="['/tenants', t.PublicId]">
                                <td>
                                    <div class="ac-cell">
                                        <span class="ac-avatar"><i [class]="'fas ' + icon(t.ProductCode)"></i></span>
                                        <span><b>{{ t.DisplayName }}</b><div class="ac-sub ac-mono">{{ t.TenantCode }}</div></span>
                                    </div>
                                </td>
                                <td>{{ t.CustomerName }}</td>
                                <td>{{ t.ProductName }}</td>
                                <td class="ac-mono">{{ t.PrimaryHost || '-' }}</td>
                                <td><span [class]="'ac-chip ac-chip-' + t.Status">{{ t.Status }}</span></td>
                            </tr>
                        }
                    </tbody>
                </table>

                @if (!tenants().length)
                {
                    <div class="ac-empty-fill">
                        <span class="ac-empty-icon"><i class="fas" [class.fa-spinner]="loading()" [class.fa-spin]="loading()" [class.fa-server]="!loading()"></i></span>
                        <b>{{ loading() ? 'Loading' : 'No tenants yet' }}</b>
                        <span>{{ loading() ? 'One moment...' : 'Add the customer first, then the tenant.' }}</span>
                    </div>
                }
            </div>
        </div>
    `
})
export class DashboardPage implements OnInit
{
    private readonly api = inject(ConsoleApi);
    private readonly auth = inject(AuthService);

    readonly products = signal<ProductRow[]>([]);
    readonly customers = signal<CustomerRow[]>([]);
    readonly allTenants = signal<TenantRow[]>([]);
    readonly error = signal('');
    readonly loading = signal(true);

    readonly tenants = computed(() => this.allTenants().slice(0, 8));

    readonly liveProducts = computed(() => this.products().filter(p => p.Status === 'Active').length);

    readonly greeting = computed(() =>
    {
        const h = new Date().getHours();
        const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
        const first = (this.auth.user()?.FullName ?? '').split(/\s+/)[0] ?? '';

        return first ? `${part}, ${first}` : part;
    });

    readonly icon = productIcon;

    async ngOnInit(): Promise<void>
    {
        try
        {
            const [products, customers, tenants] = await Promise.all([this.api.products(), this.api.customers(), this.api.tenants()]);

            this.products.set(products);
            this.customers.set(customers);
            this.allTenants.set(tenants);
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

    count(status: string): number
    {
        return this.allTenants().filter(t => t.Status === status).length;
    }
}
