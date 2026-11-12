import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/auth.service';
import { ConsoleApi } from '../../core/console-api.service';
import { apiMessage } from '../../core/auth.interceptor';
import { CustomerRow, CustomerSave } from '../../core/models';
import { PageCanvas } from '../../ui/page-canvas';
import { PageHeader } from '../../ui/page-header';
import { Pagination, pageSlice } from '../../ui/pagination';
import { SelectBox, SelectOption } from '../../ui/select-box';
import { ToastService } from '../../ui/toast';

@Component({
    selector: 'ac-customers',
    imports: [FormsModule, PageHeader, PageCanvas, Pagination, SelectBox],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'ac-page' },
    template: `
        <ac-page-header icon="fas fa-building-user" eyebrow="Clients" title="Customers"
            subtitle="The businesses AppCore serves; each can use one or more products (tenants)">
            @if (canManage)
            {
                <button pageHeaderRight class="ac-btn ac-btn-primary" type="button" (click)="open(null)"><i class="fas fa-plus"></i> New customer</button>
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

        @if (editing())
        {
            <div class="ac-backdrop">
                <form class="ac-modal" (ngSubmit)="save()">
                    <div class="ac-modal-head">
                        <i class="fas fa-building-user"></i>
                        <h3>{{ editId ? 'Edit customer ' + editCode : 'New customer' }}</h3>
                        <button class="ac-icon-btn" type="button" (click)="editing.set(false)"><i class="fas fa-xmark"></i></button>
                    </div>

                    <div class="ac-modal-body">
                        <span class="ac-section-label">Company</span>
                        <div class="ac-grid-2">
                            <div class="ac-field">
                                <label>Legal name <b>*</b></label>
                                <input class="ac-input" name="legal" [(ngModel)]="form.LegalName" placeholder="As on the trade licence" required>
                            </div>
                            <div class="ac-field">
                                <label>Display name</label>
                                <input class="ac-input" name="display" [(ngModel)]="form.DisplayName" placeholder="Same as legal name">
                            </div>
                            <div class="ac-field">
                                <label>VAT / tax number</label>
                                <input class="ac-input ac-mono" name="bin" [(ngModel)]="form.BinNo">
                            </div>
                            <div class="ac-field">
                                <label>Company / tax ID</label>
                                <input class="ac-input ac-mono" name="tin" [(ngModel)]="form.TinNo">
                            </div>
                        </div>

                        <span class="ac-section-label">Contact</span>
                        <div class="ac-grid-2">
                            <div class="ac-field">
                                <label>Phone</label>
                                <input class="ac-input" name="phone" [(ngModel)]="form.Phone">
                            </div>
                            <div class="ac-field">
                                <label>Email</label>
                                <input class="ac-input" name="email" type="email" [(ngModel)]="form.Email">
                            </div>
                        </div>
                        <div class="ac-field">
                            <label>Address</label>
                            <textarea class="ac-textarea" name="address" [(ngModel)]="form.Address"></textarea>
                        </div>
                        <div class="ac-grid-2">
                            <div class="ac-field">
                                <label>Country</label>
                                <input class="ac-input" name="country" [(ngModel)]="form.Country" placeholder="Bangladesh">
                            </div>
                        </div>

                        <span class="ac-section-label">Account</span>
                        <div class="ac-grid-2">
                            <div class="ac-field">
                                <label>Status</label>
                                <ac-select-box [options]="editStatusOptions" [value]="form.Status" (valueChange)="form.Status = $any($event)" />
                            </div>
                            <div class="ac-field">
                                <label>Remarks</label>
                                <input class="ac-input" name="remarks" [(ngModel)]="form.Remarks">
                            </div>
                        </div>

                        @if (formError()) { <div class="ac-error">{{ formError() }}</div> }
                    </div>

                    <div class="ac-modal-foot">
                        <button class="ac-btn" type="button" (click)="editing.set(false)">Cancel</button>
                        <button class="ac-btn ac-btn-primary" type="submit" [disabled]="saving() || !form.LegalName">
                            <i class="fas" [class.fa-floppy-disk]="!saving()" [class.fa-spinner]="saving()" [class.fa-spin]="saving()"></i> Save
                        </button>
                    </div>
                </form>
            </div>
        }
    `
})
export class CustomersPage implements OnInit
{
    private readonly api = inject(ConsoleApi);
    private readonly auth = inject(AuthService);
    private readonly toast = inject(ToastService);

    readonly canManage = this.auth.hasRole('OWNER', 'DEVELOPER');

    readonly statusOptions: SelectOption[] =
    [
        { value: '', label: 'All statuses', icon: 'fas fa-layer-group' },
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' }
    ];

    readonly editStatusOptions: SelectOption[] =
    [
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

    readonly editing = signal(false);
    readonly saving = signal(false);
    readonly formError = signal('');

    editId: string | null = null;
    editCode = '';
    form: CustomerSave = this.blank();

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

    async open(row: CustomerRow | null): Promise<void>
    {
        this.formError.set('');
        this.editId = row?.PublicId ?? null;
        this.editCode = row?.CustomerCode ?? '';
        this.form = this.blank();

        if (row)
        {
            try
            {
                const c = await this.api.customer(row.PublicId);

                this.form =
                {
                    LegalName: c.LegalName,
                    DisplayName: c.DisplayName,
                    Phone: c.Phone,
                    Email: c.Email,
                    Address: c.Address,
                    Country: c.Country,
                    BinNo: c.BinNo,
                    TinNo: c.TinNo,
                    Remarks: c.Remarks,
                    Status: c.Status
                };
            }
            catch (e)
            {
                this.toast.error('Could not open the customer', apiMessage(e));

                return;
            }
        }

        this.editing.set(true);
    }

    async save(): Promise<void>
    {
        this.saving.set(true);
        this.formError.set('');

        try
        {
            if (this.editId)
            {
                await this.api.updateCustomer(this.editId, this.form);

                this.toast.success('Customer saved', `${this.editCode} is updated.`);
            }
            else
            {
                const r = await this.api.createCustomer(this.form);

                this.toast.success('Customer added', `${r.CustomerCode} : ${this.form.DisplayName || this.form.LegalName}`);
            }

            this.editing.set(false);

            await this.load();
        }
        catch (e)
        {
            this.formError.set(apiMessage(e));
        }
        finally
        {
            this.saving.set(false);
        }
    }

    private blank(): CustomerSave
    {
        return { LegalName: '', DisplayName: null, Phone: null, Email: null, Address: null, Country: 'Bangladesh', BinNo: null, TinNo: null, Remarks: null, Status: 'Active' };
    }
}
