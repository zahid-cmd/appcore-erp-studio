import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ConsoleApi } from '../../core/console-api.service';
import { apiMessage } from '../../core/auth.interceptor';
import { CustomerSave } from '../../core/models';
import { PageHeader } from '../../ui/page-header';
import { SelectBox, SelectOption } from '../../ui/select-box';
import { ToastService } from '../../ui/toast';

// New customer (/customers/new) or edit one (/customers/:publicId/edit) as a full page (2026-11-20)
@Component({
    selector: 'ac-customer-edit',
    imports: [FormsModule, RouterLink, PageHeader, SelectBox],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'ac-page' },
    styles: [`
        .ce-page { display: flex; flex: 0 1 auto; flex-direction: column; gap: 16px; min-height: 0; }
        .ce-cols { display: grid; flex: 0 1 auto; min-height: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: stretch; }
        .ce-col { display: flex; flex-direction: column; gap: 14px; min-height: 0; padding: 18px 20px; overflow-y: auto; }
        .ce-col .ac-textarea { min-height: 110px; }
        .ce-foot { display: flex; flex: none; align-items: center; gap: 10px; padding: 12px 18px; }
        .ce-spacer { flex: 1; }
        .ce-error { margin: 0; }
        @media (max-width: 1000px) { .ce-cols { grid-template-columns: minmax(0, 1fr); } }
    `],
    template: `
        <ac-page-header icon="fas fa-building-user"
            [eyebrow]="publicId() ? 'Customer ' + code() : 'Clients'"
            [title]="publicId() ? 'Edit customer' : 'New customer'"
            [subtitle]="publicId() ? (name() || 'One moment...') : 'A business AppCore serves; add its tenants after saving'">
            <a pageHeaderRight class="ac-btn" routerLink="/customers"><i class="fas fa-arrow-left"></i> Customers</a>
        </ac-page-header>

        @if (loadError())
        {
            <div class="ac-error">{{ loadError() }}</div>
        }
        @else if (ready())
        {
            <form class="ce-page" (ngSubmit)="save()">
                <div class="ce-cols">
                    <div class="ac-card ce-col">
                        <span class="ac-section-label">Company</span>
                        <div class="ac-field">
                            <label>Legal name <b>*</b></label>
                            <input class="ac-input" name="legal" [(ngModel)]="form.LegalName" placeholder="As on the trade licence" required>
                        </div>
                        <div class="ac-field">
                            <label>Display name</label>
                            <input class="ac-input" name="display" [(ngModel)]="form.DisplayName" placeholder="Same as legal name">
                        </div>
                        <div class="ac-grid-2">
                            <div class="ac-field">
                                <label>VAT / tax number</label>
                                <input class="ac-input ac-mono" name="bin" [(ngModel)]="form.BinNo">
                            </div>
                            <div class="ac-field">
                                <label>Company / tax ID</label>
                                <input class="ac-input ac-mono" name="tin" [(ngModel)]="form.TinNo">
                            </div>
                        </div>

                        <span class="ac-section-label">Account</span>
                        <div class="ac-grid-2">
                            <div class="ac-field">
                                <label>Status</label>
                                <ac-select-box [options]="statusOptions" [value]="form.Status" (valueChange)="form.Status = $any($event)" />
                            </div>
                            <div class="ac-field">
                                <label>Remarks</label>
                                <input class="ac-input" name="remarks" [(ngModel)]="form.Remarks">
                            </div>
                        </div>
                    </div>

                    <div class="ac-card ce-col">
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
                        <div class="ac-field">
                            <label>Country</label>
                            <input class="ac-input" name="country" [(ngModel)]="form.Country" placeholder="Bangladesh">
                        </div>
                    </div>
                </div>

                <div class="ac-card ce-foot">
                    @if (formError()) { <div class="ac-error ce-error">{{ formError() }}</div> }
                    <span class="ce-spacer"></span>
                    <a class="ac-btn" routerLink="/customers">Cancel</a>
                    <button class="ac-btn ac-btn-primary" type="submit" [disabled]="saving() || !form.LegalName">
                        <i class="fas" [class.fa-floppy-disk]="!saving()" [class.fa-spinner]="saving()" [class.fa-spin]="saving()"></i> Save
                    </button>
                </div>
            </form>
        }
    `
})
export class CustomerEditPage implements OnInit
{
    private readonly api = inject(ConsoleApi);
    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);

    // from the route (withComponentInputBinding); empty for a new customer
    readonly publicId = input<string>();

    readonly statusOptions: SelectOption[] =
    [
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' }
    ];

    readonly ready = signal(false);
    readonly loadError = signal('');
    readonly saving = signal(false);
    readonly formError = signal('');
    readonly code = signal('');
    readonly name = signal('');

    form: CustomerSave = { LegalName: '', DisplayName: null, Phone: null, Email: null, Address: null, Country: 'Bangladesh', BinNo: null, TinNo: null, Remarks: null, Status: 'Active' };

    async ngOnInit(): Promise<void>
    {
        const id = this.publicId();

        if (!id)
        {
            this.ready.set(true);

            return;
        }

        try
        {
            const c = await this.api.customer(id);

            this.code.set(c.CustomerCode);
            this.name.set(c.DisplayName);
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
            this.ready.set(true);
        }
        catch (e)
        {
            this.loadError.set(apiMessage(e));
        }
    }

    async save(): Promise<void>
    {
        this.saving.set(true);
        this.formError.set('');

        try
        {
            const id = this.publicId();

            if (id)
            {
                await this.api.updateCustomer(id, this.form);

                this.toast.success('Customer saved', `${this.code()} is updated.`);
            }
            else
            {
                const r = await this.api.createCustomer(this.form);

                this.toast.success('Customer added', `${r.CustomerCode} : ${this.form.DisplayName || this.form.LegalName}`);
            }

            void this.router.navigate(['/customers']);
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
}
