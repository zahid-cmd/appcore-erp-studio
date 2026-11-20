import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ConsoleApi } from '../../core/console-api.service';
import { apiMessage } from '../../core/auth.interceptor';
import { CustomerRow, PackageRow, ProductRow, ServerRow, TENANT_STATUSES, TenantDetail, TenantPrefill, TenantSave, productIcon } from '../../core/models';
import { SelectBox, SelectOption } from '../../ui/select-box';

// New / edit tenant. asPage : a full page (Register tenant and Edit
// open /tenants/new and /tenants/<id>/edit, 2026-11-20); otherwise
// the pop-up (kept for other callers).
@Component({
    selector: 'ac-tenant-form',
    imports: [FormsModule, NgTemplateOutlet, SelectBox],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        :host { display: contents; }
        .tf-page { display: flex; flex: 0 1 auto; flex-direction: column; gap: 16px; min-height: 0; }
        .tf-cols { display: grid; flex: 0 1 auto; min-height: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: stretch; }
        .tf-col { display: flex; flex-direction: column; gap: 14px; min-height: 0; padding: 18px 20px; overflow-y: auto; }
        .tf-foot { display: flex; flex: none; align-items: center; gap: 10px; padding: 12px 18px; }
        .tf-spacer { flex: 1; }
        .tf-error { margin: 0; }
        @media (max-width: 1000px) { .tf-cols { grid-template-columns: minmax(0, 1fr); } }
    `],
    template: `
        <ng-template #partA>
                    <span class="ac-section-label">Client and product</span>
                    <div class="ac-grid-2">
                        <div class="ac-field">
                            <label>Customer <b>*</b></label>
                            <ac-select-box placeholder="Pick the customer" [options]="customerOptions()" [value]="form.CustomerPublicId || null" (valueChange)="form.CustomerPublicId = $any($event)" />
                        </div>
                        <div class="ac-field">
                            <label>Product <b>*</b></label>
                            <ac-select-box [options]="productOptions()" [value]="form.ProductCode" [disabled]="locked()" (valueChange)="chooseProduct($any($event))" />
                        </div>
                        <div class="ac-field">
                            <label>Tenant code <b>*</b></label>
                            <input class="ac-input ac-mono" name="code" [(ngModel)]="form.TenantCode" placeholder="MOTOZONE" (input)="suggestHost()" [disabled]="locked()" required>
                            <span class="ac-hint">{{ locked() ? 'Fixed : the database was created with this code.' : "Starts with a letter; letters, digits and '-'; never shown to the client." }}</span>
                        </div>
                        <div class="ac-field">
                            <label>Display name <b>*</b></label>
                            <input class="ac-input" name="display" [(ngModel)]="form.DisplayName" placeholder="Moto Zone" required>
                            <span class="ac-hint">Only for the Console; the client sets his company name in the ERP.</span>
                        </div>
                    </div>

                    <span class="ac-section-label">Limits in the ERP</span>
                    <div class="ac-grid-2">
                        <div class="ac-field">
                            <label>Companies allowed <b>*</b></label>
                            <input class="ac-input" type="number" min="1" max="100" name="maxCompanies" [(ngModel)]="form.MaxCompanies" required>
                            <span class="ac-hint">The client creates and edits his own company in the ERP.</span>
                        </div>
                        <div class="ac-field">
                            <label>Branches allowed</label>
                            <input class="ac-input" type="number" min="1" name="maxBranches" [(ngModel)]="form.MaxBranches" placeholder="No limit">
                            <span class="ac-hint">Empty = no limit. Takes effect in the ERP within a minute.</span>
                        </div>
                        @if (!tenant())
                        {
                            <div class="ac-field">
                                <label>Package @if (packages().length) { <b>*</b> }</label>
                                <ac-select-box placeholder="Pick the package" [options]="packageOptions()" [value]="form.PackageCode || null" [disabled]="!packages().length" (valueChange)="form.PackageCode = $any($event)" />
                                <span class="ac-hint">{{ packageHint() }}</span>
                            </div>
                            <div class="ac-field">
                                <label>Users allowed</label>
                                <input class="ac-input" type="number" min="1" name="maxUsers" [(ngModel)]="form.MaxUsers" placeholder="No limit">
                                <span class="ac-hint">Empty = no limit. Both can be changed later on the tenant page.</span>
                            </div>
                        }
                    </div>

        </ng-template>

        <ng-template #partB>
                    <span class="ac-section-label">Web addresses</span>
                    <div class="ac-field">
                        <label>Addresses <b>*</b></label>
                        <textarea class="ac-textarea ac-mono" name="hosts" [(ngModel)]="hostsText" (input)="hostTouched = true" placeholder="motozone.appcoretech.net"></textarea>
                        <span class="ac-hint">One per line; the first is the main address. Older addresses (e.g. erp.appcoretech.net) can stay listed so they keep working.</span>
                    </div>

                    <span class="ac-section-label">Database and status</span>
                    <div class="ac-grid-2">
                        <div class="ac-field">
                            <label>Database server</label>
                            <ac-select-box [options]="serverOptions()" [value]="form.DatabaseServerId" [disabled]="locked()" (valueChange)="form.DatabaseServerId = $any($event)" />
                        </div>
                        <div class="ac-field">
                            <label>Database name</label>
                            <input class="ac-input ac-mono" name="db" [(ngModel)]="form.DatabaseName" [disabled]="locked()" [placeholder]="tenant() ? '' : 'Leave empty : Create database fills it'">
                            @if (locked()) { <span class="ac-hint">Fixed : created by the Console.</span> }
                        </div>
                        @if (!tenant())
                        {
                            <div class="ac-field">
                                <label>Status</label>
                                <ac-select-box [options]="statusOptions" [value]="form.Status" (valueChange)="form.Status = $any($event)" />
                                <span class="ac-hint">Keep Provisioning : Create database is offered on the tenant page.</span>
                            </div>
                        }
                        <div class="ac-field">
                            <label>Trial ends on</label>
                            <input class="ac-input" type="date" name="trial" [(ngModel)]="form.TrialEndsOn">
                        </div>
                    </div>

                    <div class="ac-field">
                        <label>Remarks</label>
                        <input class="ac-input" name="remarks" [(ngModel)]="form.Remarks">
                    </div>

        </ng-template>

        <ng-template #buttons>
            <button class="ac-btn" type="button" (click)="closed.emit(false)">Cancel</button>
            <button class="ac-btn ac-btn-primary" type="submit" [disabled]="saving()">
                <i class="fas" [class.fa-floppy-disk]="!saving()" [class.fa-spinner]="saving()" [class.fa-spin]="saving()"></i> Save
            </button>
        </ng-template>

        @if (asPage())
        {
            <!-- full page (Register tenant / Edit, 2026-11-20) : two columns, no scrolling -->
            <form class="tf-page" (ngSubmit)="save()">
                <div class="tf-cols">
                    <div class="ac-card tf-col"><ng-container [ngTemplateOutlet]="partA"></ng-container></div>
                    <div class="ac-card tf-col"><ng-container [ngTemplateOutlet]="partB"></ng-container></div>
                </div>
                <div class="ac-card tf-foot">
                    @if (error()) { <div class="ac-error tf-error">{{ error() }}</div> }
                    <span class="tf-spacer"></span>
                    <ng-container [ngTemplateOutlet]="buttons"></ng-container>
                </div>
            </form>
        }
        @else
        {
            <div class="ac-backdrop">
                <form class="ac-modal" (ngSubmit)="save()">
                    <div class="ac-modal-head">
                        <i class="fas fa-server"></i>
                        <h3>{{ tenant() ? 'Edit tenant ' + tenant()!.TenantCode : 'Register a tenant' }}</h3>
                        <button class="ac-icon-btn" type="button" (click)="closed.emit(false)"><i class="fas fa-xmark"></i></button>
                    </div>

                    <div class="ac-modal-body">
                        <ng-container [ngTemplateOutlet]="partA"></ng-container>
                        <ng-container [ngTemplateOutlet]="partB"></ng-container>
                        @if (error()) { <div class="ac-error">{{ error() }}</div> }
                    </div>

                    <div class="ac-modal-foot">
                        <ng-container [ngTemplateOutlet]="buttons"></ng-container>
                    </div>
                </form>
            </div>
        }
    `
})
export class TenantFormComponent implements OnInit
{
    private readonly api = inject(ConsoleApi);

    readonly tenant = input<TenantDetail | null>(null);

    // a new tenant filled from a converted website request
    readonly prefill = input<TenantPrefill | null>(null);

    // full page instead of the pop-up
    readonly asPage = input(false);

    readonly closed = output<boolean>();

    readonly statusOptions: SelectOption[] = TENANT_STATUSES.map(s => ({ value: s, label: s }));

    readonly customers = signal<CustomerRow[]>([]);
    readonly products = signal<ProductRow[]>([]);
    readonly servers = signal<ServerRow[]>([]);

    // the packages of the chosen product (a new tenant only)
    readonly packages = signal<PackageRow[]>([]);
    readonly saving = signal(false);

    readonly packageOptions = computed<SelectOption[]>(() =>
        this.packages().map(k => ({ value: k.PackageCode, label: k.PackageName })));

    readonly customerOptions = computed<SelectOption[]>(() =>
        this.customers().map(c => ({ value: c.PublicId, label: c.DisplayName, hint: c.CustomerCode })));

    readonly productOptions = computed<SelectOption[]>(() =>
        this.products().map(p => ({ value: p.ProductCode, label: p.ProductName + (p.Status !== 'Active' ? ' (' + p.Status + ')' : ''), icon: 'fas ' + productIcon(p.ProductCode) })));

    readonly serverOptions = computed<SelectOption[]>(() =>
    [
        { value: null, label: 'Not set yet' },
        ...this.servers().map(s => ({ value: s.DatabaseServerId, label: s.ServerName, hint: s.Host + ':' + s.Port, icon: 'fas fa-database' }))
    ]);
    readonly error = signal('');

    // the Console created this tenant's database : code, product,
    // server and database name can no longer change (the API
    // refuses it too)
    readonly locked = computed(() => !!this.tenant()?.DatabaseLocked);

    form: TenantSave =
    {
        TenantCode: '',
        CustomerPublicId: '',
        ProductCode: 'TWO-WHEELER',
        DisplayName: '',
        DatabaseServerId: null,
        DatabaseName: null,

        // Provisioning : the tenant page then offers Create database.
        // Pick another status only when registering a client whose
        // database already exists.
        Status: 'Provisioning',
        TrialEndsOn: null,
        Remarks: null,
        HostNames: [],
        MaxCompanies: 1,
        MaxBranches: null,
        PackageCode: null,
        MaxUsers: null
    };

    hostsText = '';

    hostTouched = false;

    async ngOnInit(): Promise<void>
    {
        const t = this.tenant();

        if (t)
        {
            this.form =
            {
                TenantCode: t.TenantCode,
                CustomerPublicId: t.CustomerPublicId,
                ProductCode: t.ProductCode,
                DisplayName: t.DisplayName,
                DatabaseServerId: t.DatabaseServerId,
                DatabaseName: t.DatabaseName,
                Status: null,
                TrialEndsOn: t.TrialEndsOn,
                Remarks: t.Remarks,
                HostNames: [],
                MaxCompanies: t.MaxCompanies ?? 1,
                MaxBranches: t.MaxBranches ?? null
            };

            this.hostsText = t.Domains.map(x => x.HostName).join('\n');
            this.hostTouched = true;
        }
        else if (this.prefill())
        {
            const p = this.prefill()!;

            this.form.CustomerPublicId = p.CustomerPublicId;
            this.form.ProductCode = p.ProductCode;
            this.form.TenantCode = p.TenantCode;
            this.form.DisplayName = p.DisplayName;
            this.form.Status = p.Status;

            // what the client asked for on the website
            this.form.MaxBranches = p.MaxBranches ?? null;
            this.form.MaxUsers = p.MaxUsers ?? null;
            this.hostsText = p.HostName;
            this.hostTouched = true;
        }

        try
        {
            const [customers, products, servers] =
                await Promise.all([this.api.customers(), this.api.products(), this.api.servers()]);

            this.customers.set(customers);
            this.products.set(products);
            this.servers.set(servers);

            if (!t)
            {
                await this.loadPackages();
            }
        }
        catch (e)
        {
            this.error.set(apiMessage(e));
        }
    }

    // what the chosen package holds, or why there is none to pick
    packageHint(): string
    {
        if (!this.packages().length)
        {
            return 'This product has no packages : every module is on.';
        }

        return this.packages().find(k => k.PackageCode === this.form.PackageCode)?.Description
            ?? 'Decides the modules the client gets.';
    }

    // another product has other packages
    chooseProduct(code: string): void
    {
        if (code === this.form.ProductCode)
        {
            return;
        }

        this.form.ProductCode = code;
        this.form.PackageCode = null;

        if (!this.tenant())
        {
            void this.loadPackages();
        }
    }

    private async loadPackages(): Promise<void>
    {
        const product = this.form.ProductCode;

        try
        {
            const rows = await this.api.tenantPackages(product);

            // the product may have been changed while this loaded
            if (product === this.form.ProductCode)
            {
                this.packages.set(rows);
            }
        }
        catch (e)
        {
            this.packages.set([]);
            this.error.set(apiMessage(e));
        }
    }

    // A new tenant : suggest <code>.appcoretech.net until the
    // addresses are typed by hand
    suggestHost(): void
    {
        if (this.tenant() || (this.hostsText && this.hostTouched))
        {
            return;
        }

        const code = this.form.TenantCode.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

        this.hostsText = code ? `${code}.appcoretech.net` : '';
    }

    async save(): Promise<void>
    {
        this.saving.set(true);
        this.error.set('');

        this.form.HostNames =
            this.hostsText.split(/[\r\n,]+/).map(x => x.trim()).filter(x => !!x);

        // an empty date box sends '' : the API wants null
        this.form.TrialEndsOn = this.form.TrialEndsOn || null;
        this.form.DatabaseName = this.form.DatabaseName?.trim() || null;

        // an empty number box sends '' or null : 1 company, no branch limit
        this.form.MaxCompanies = Number(this.form.MaxCompanies) || 1;
        this.form.MaxBranches = Number(this.form.MaxBranches) || null;
        this.form.MaxUsers = Number(this.form.MaxUsers) || null;

        if (!this.tenant() && this.packages().length && !this.form.PackageCode)
        {
            this.error.set('Pick the package.');
            this.saving.set(false);
            return;
        }

        try
        {
            const t = this.tenant();

            if (t)
            {
                await this.api.updateTenant(t.PublicId, this.form);
            }
            else
            {
                await this.api.createTenant(this.form);
            }

            this.closed.emit(true);
        }
        catch (e)
        {
            this.error.set(apiMessage(e));
        }
        finally
        {
            this.saving.set(false);
        }
    }
}
