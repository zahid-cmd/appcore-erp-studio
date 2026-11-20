//===============================================================
// One website request as a full page (/requests/:publicId).
// Review, call, note, then Convert to customer -> Register tenant
// opens filled in from the request (2026-11-20).
//===============================================================

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth.service';
import { ConsoleApi } from '../../core/console-api.service';
import { apiMessage } from '../../core/auth.interceptor';
import { CustomerMatch, CustomerRow, REQUEST_STATUSES, REQUEST_STATUS_LABEL, SiteRequest } from '../../core/models';
import { PageHeader } from '../../ui/page-header';
import { SelectBox, SelectOption } from '../../ui/select-box';
import { ToastService } from '../../ui/toast';
import { RequestBadge } from '../../ui/request-badge.service';

@Component({
    selector: 'ac-request-detail',
    imports: [FormsModule, DatePipe, RouterLink, PageHeader, SelectBox],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'ac-page' },
    styles: [`
        .rq-type { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 7px; font-size: 11.5px; font-weight: 700; }
        .rq-type.Demo { background: var(--ac-sky-soft); color: var(--ac-sky); }
        .rq-type.Purchase { background: var(--ac-accent-soft); color: var(--ac-accent); }
        .rq-wrap { flex: 0 1 auto; min-height: 0; overflow-y: auto; }
        .rq-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 16px; align-items: stretch; }
        .rq-card { display: flex; flex-direction: column; gap: 12px; padding: 18px 20px; }
        .rq-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0; border: 1px solid var(--ac-border-2); border-radius: 12px; overflow: hidden; }
        .rq-fact { display: flex; flex-direction: column; gap: 3px; padding: 10px 14px; border-bottom: 1px solid var(--ac-border-2); }
        .rq-fact:nth-child(odd) { border-right: 1px solid var(--ac-border-2); }
        .rq-fact.wide { grid-column: 1 / -1; border-right: 0; }
        .rq-fact span { color: var(--ac-muted); font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
        .rq-fact b { color: var(--ac-text); font-weight: 600; overflow-wrap: anywhere; white-space: pre-line; }
        .rq-fact a { font-weight: 600; }
        .rq-box { display: flex; flex-direction: column; gap: 12px; padding: 14px; border: 1px solid var(--ac-border-2); border-radius: 12px; background: var(--ac-card-2); }
        .rq-converted { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border: 1px solid color-mix(in srgb, var(--ac-green) 30%, transparent); border-radius: 12px; background: var(--ac-green-soft); color: var(--ac-green); font-weight: 600; }
        .rq-match { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border: 1px solid var(--ac-border-2); border-radius: 10px; background: var(--ac-card-2); }
        .rq-match b { font-weight: 600; }
        .rq-match span { color: var(--ac-muted); font-size: 12px; }
        .rq-match .ac-btn { margin-left: auto; }
        .rq-meta { margin-top: auto; color: var(--ac-muted); font-size: 11.5px; }
        @media (max-width: 1000px) { .rq-grid { grid-template-columns: minmax(0, 1fr); } }
    `],
    template: `
        <ac-page-header icon="fas fa-inbox" [eyebrow]="'Request ' + (r()?.RequestNo ?? '')"
            [title]="r()?.LegalName ?? 'Request'" [subtitle]="r() ? 'Received ' + (r()!.CreatedDate | date: 'dd-MMM-yyyy HH:mm') : 'One moment...'">
            @if (r(); as r) { <span pageHeaderTitle [class]="'rq-type ' + r.RequestType">{{ r.RequestType }}</span> }
            <a pageHeaderRight class="ac-btn" routerLink="/requests"><i class="fas fa-arrow-left"></i> Requests</a>
        </ac-page-header>

        @if (loadError())
        {
            <div class="ac-error">{{ loadError() }}</div>
        }
        @else if (r(); as r)
        {
            <div class="rq-wrap ac-scroll">
                <div class="rq-grid">
                    <div class="ac-card rq-card">
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

                    <div class="ac-card rq-card">
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
                        @else if (canManage && r.Status === 'Closed')
                        {
                            <span class="ac-hint">A Closed request cannot be converted. Set its status back to New or Contacted first.</span>
                        }
                        @else if (canManage)
                        {
                            <span class="ac-hint">Makes the customer from this request (company, tax numbers, country, phone, email, address) or uses one the Console already has, then opens Register tenant filled in.</span>
                            <button class="ac-btn ac-btn-primary" type="button" [disabled]="busy()" (click)="askConvert(r)">
                                <i class="fas" [class.fa-user-plus]="!busy()" [class.fa-spinner]="busy()" [class.fa-spin]="busy()"></i> Convert to customer
                            </button>
                        }

                        @if (formError()) { <div class="ac-error">{{ formError() }}</div> }

                        <span class="rq-meta">Received {{ r.CreatedDate | date: 'dd-MMM-yyyy HH:mm' }}{{ r.IpAddress ? ' from ' + r.IpAddress : '' }}</span>
                    </div>
                </div>
            </div>

            <!-- Convert : asked first (2026-11-20, review B5) -->
            @if (asking())
            {
                <div class="ac-backdrop">
                    <div class="ac-modal">
                        <div class="ac-modal-head">
                            <i class="fas fa-user-plus"></i>
                            <h3>Convert {{ r.RequestNo }} to a customer?</h3>
                            <button class="ac-icon-btn" type="button" [disabled]="busy()" (click)="asking.set(false)"><i class="fas fa-xmark"></i></button>
                        </div>

                        <div class="ac-modal-body">
                            @if (matches().length)
                            {
                                <span class="ac-section-label">Looks like a customer you already have</span>
                                @for (m of matches(); track m.PublicId)
                                {
                                    <div class="rq-match">
                                        <b>{{ m.CustomerCode }} : {{ m.DisplayName }}</b>
                                        <span>same {{ m.Same }}</span>
                                        <button class="ac-btn" type="button" (click)="useCustomer.set(m.PublicId)">Use this one</button>
                                    </div>
                                }
                            }

                            <div class="ac-field">
                                <label>Customer</label>
                                <ac-select-box [options]="customerOptions()" [value]="useCustomer()" (valueChange)="useCustomer.set($any($event) || '')" />
                                <span class="ac-hint">{{ useCustomer() ? 'The request is linked to this customer. No new customer is made.' : 'A new customer is made from ' + r.LegalName + '.' }}</span>
                            </div>

                            @if (formError()) { <div class="ac-error">{{ formError() }}</div> }
                        </div>

                        <div class="ac-modal-foot">
                            <button class="ac-btn" type="button" [disabled]="busy()" (click)="asking.set(false)">Cancel</button>
                            <button class="ac-btn ac-btn-primary" type="button" [disabled]="busy()" (click)="convert(r, useCustomer() || null)">
                                <i class="fas" [class.fa-check]="!busy()" [class.fa-spinner]="busy()" [class.fa-spin]="busy()"></i>
                                {{ useCustomer() ? 'Use this customer' : 'Create customer' }}
                            </button>
                        </div>
                    </div>
                </div>
            }
        }
    `
})
export class RequestDetailPage implements OnInit
{
    private readonly api = inject(ConsoleApi);
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);
    private readonly badge = inject(RequestBadge);

    // from the route (withComponentInputBinding)
    readonly publicId = input.required<string>();

    readonly canManage = this.auth.hasRole('OWNER', 'DEVELOPER');

    readonly label = (s: string): string => REQUEST_STATUS_LABEL[s] ?? s;

    readonly r = signal<SiteRequest | null>(null);
    readonly loadError = signal('');
    readonly editStatus = signal('');
    readonly editNotes = signal('');
    readonly busy = signal(false);
    readonly formError = signal('');

    // Convert box : '' = a new customer, else the customer to use
    readonly asking = signal(false);
    readonly useCustomer = signal('');
    readonly matches = signal<CustomerMatch[]>([]);
    readonly customers = signal<CustomerRow[]>([]);

    readonly customerOptions = computed<SelectOption[]>(() =>
    [
        { value: '', label: 'New customer (from this request)' },
        ...this.customers().map(c => ({ value: c.PublicId, label: c.DisplayName, hint: c.CustomerCode }))
    ]);

    // "Converted" is set by Convert only
    readonly editStatusOptions = computed<SelectOption[]>(() =>
        REQUEST_STATUSES
            .filter(s => s !== 'Converted' || this.r()?.Status === 'Converted')
            .map(s => ({ value: s, label: REQUEST_STATUS_LABEL[s] ?? s })));

    async ngOnInit(): Promise<void>
    {
        try
        {
            const r = await this.api.request(this.publicId());

            this.editStatus.set(r.Status === 'New' ? 'Contacted' : r.Status);
            this.editNotes.set(r.StaffNotes ?? '');
            this.r.set(r);
        }
        catch (e)
        {
            this.loadError.set(apiMessage(e));
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

            void this.badge.refresh();
            void this.router.navigate(['/requests']);
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

    // Convert asks first : a new customer, or one the Console has
    async askConvert(r: SiteRequest): Promise<void>
    {
        this.busy.set(true);
        this.formError.set('');

        try
        {
            const [matches, customers] =
                await Promise.all([this.api.requestCustomerMatches(r.PublicId), this.api.customers()]);

            this.matches.set(matches);
            this.customers.set(customers);
            this.useCustomer.set('');
            this.asking.set(true);
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

    // customerPublicId : undefined = the request has its customer
    // (Register tenant); null = a new customer; else the one to use
    async convert(r: SiteRequest, customerPublicId?: string | null): Promise<void>
    {
        if (this.busy())
        {
            return;
        }

        this.busy.set(true);
        this.formError.set('');

        try
        {
            const p = await this.api.convertRequest(r.PublicId, customerPublicId);

            if (!r.CustomerPublicId)
            {
                this.toast.success(customerPublicId ? 'Customer linked' : 'Customer created', `${p.CustomerCode} : ${p.CustomerName}`);
            }

            this.asking.set(false);

            void this.badge.refresh();

            // Register tenant opens as its own page, filled in from the request
            void this.router.navigate(['/tenants/new'], { state: { prefill: p } });
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
}
