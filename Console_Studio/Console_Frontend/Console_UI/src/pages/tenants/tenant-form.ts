import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ConsoleApi } from '../../core/console-api.service';
import { apiMessage } from '../../core/auth.interceptor';
import { CustomerRow, ProductRow, ServerRow, TENANT_STATUSES, TenantDetail, TenantPrefill, TenantSave, productIcon } from '../../core/models';
import { SelectBox, SelectOption } from '../../ui/select-box';

// New / edit tenant (pop-up). Phase 1 registers an EXISTING
// database; onboarding (new database from the template) comes next.
@Component({
    selector: 'ac-tenant-form',
    imports: [FormsModule, SelectBox],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="ac-backdrop">
            <form class="ac-modal" (ngSubmit)="save()">
                <div class="ac-modal-head">
                    <i class="fas fa-server"></i>
                    <h3>{{ tenant() ? 'Edit tenant ' + tenant()!.TenantCode : 'Register a tenant' }}</h3>
                    <button class="ac-icon-btn" type="button" (click)="closed.emit(false)"><i class="fas fa-xmark"></i></button>
                </div>

                <div class="ac-modal-body">
                    <span class="ac-section-label">Client and product</span>
                    <div class="ac-grid-2">
                        <div class="ac-field">
                            <label>Customer <b>*</b></label>
                            <ac-select-box placeholder="Pick the customer" [options]="customerOptions()" [value]="form.CustomerPublicId || null" (valueChange)="form.CustomerPublicId = $any($event)" />
                        </div>
                        <div class="ac-field">
                            <label>Product <b>*</b></label>
                            <ac-select-box [options]="productOptions()" [value]="form.ProductCode" (valueChange)="form.ProductCode = $any($event)" />
                        </div>
                        <div class="ac-field">
                            <label>Tenant code <b>*</b></label>
                            <input class="ac-input ac-mono" name="code" [(ngModel)]="form.TenantCode" placeholder="MOTOZONE" (input)="suggestHost()" required>
                            <span class="ac-hint">Letters, digits and '-'; never shown to the client.</span>
                        </div>
                        <div class="ac-field">
                            <label>Display name <b>*</b></label>
                            <input class="ac-input" name="display" [(ngModel)]="form.DisplayName" placeholder="Moto Zone" required>
                        </div>
                    </div>

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
                            <ac-select-box [options]="serverOptions()" [value]="form.DatabaseServerId" (valueChange)="form.DatabaseServerId = $any($event)" />
                        </div>
                        <div class="ac-field">
                            <label>Database name</label>
                            <input class="ac-input ac-mono" name="db" [(ngModel)]="form.DatabaseName" placeholder="AppCoreERP_Studio">
                        </div>
                        @if (!tenant())
                        {
                            <div class="ac-field">
                                <label>Status</label>
                                <ac-select-box [options]="statusOptions" [value]="form.Status" (valueChange)="form.Status = $any($event)" />
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

                    @if (error()) { <div class="ac-error">{{ error() }}</div> }
                </div>

                <div class="ac-modal-foot">
                    <button class="ac-btn" type="button" (click)="closed.emit(false)">Cancel</button>
                    <button class="ac-btn ac-btn-primary" type="submit" [disabled]="saving()">
                        <i class="fas" [class.fa-floppy-disk]="!saving()" [class.fa-spinner]="saving()" [class.fa-spin]="saving()"></i> Save
                    </button>
                </div>
            </form>
        </div>
    `
})
export class TenantFormComponent implements OnInit
{
    private readonly api = inject(ConsoleApi);

    readonly tenant = input<TenantDetail | null>(null);

    // a new tenant filled from a converted website request
    readonly prefill = input<TenantPrefill | null>(null);

    readonly closed = output<boolean>();

    readonly statusOptions: SelectOption[] = TENANT_STATUSES.map(s => ({ value: s, label: s }));

    readonly customers = signal<CustomerRow[]>([]);
    readonly products = signal<ProductRow[]>([]);
    readonly servers = signal<ServerRow[]>([]);
    readonly saving = signal(false);

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

    form: TenantSave =
    {
        TenantCode: '',
        CustomerPublicId: '',
        ProductCode: 'TWO-WHEELER',
        DisplayName: '',
        DatabaseServerId: null,
        DatabaseName: null,
        Status: 'Active',
        TrialEndsOn: null,
        Remarks: null,
        HostNames: []
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
                HostNames: []
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
        }
        catch (e)
        {
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
