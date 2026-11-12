//===============================================================
// Settings > Website settings
// --------------------------------------------------------------
// Everything the public website shows : company and contact,
// home page, request switches, pricing plans, about. Saved in
// AppCore_Control (SiteSettings 'website'); the website reads it
// on every visit. Owner saves; other staff can look.
//===============================================================

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/auth.service';
import { ConsoleApi } from '../../core/console-api.service';
import { apiMessage } from '../../core/auth.interceptor';
import { WebsitePlan, WebsiteSettings } from '../../core/models';
import { environment } from '../../environments/environment';
import { PageHeader } from '../../ui/page-header';
import { ToastService } from '../../ui/toast';

type Tab = 'company' | 'home' | 'requests' | 'pricing' | 'about';

@Component({
    selector: 'ac-website-settings',
    imports: [FormsModule, DatePipe, PageHeader],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'ac-page' },
    styles: [`
        .ws { display: grid; flex: 1; grid-template-columns: 240px minmax(0, 1fr); gap: 16px; min-height: 0; }
        .ws-tabs { display: flex; flex-direction: column; gap: 4px; align-self: stretch; padding: 8px; overflow-y: auto; }
        .ws-tab { display: flex; align-items: center; gap: 11px; width: 100%; padding: 11px 12px; border: 0; border-radius: 10px; background: transparent; color: var(--ac-text-2); font: inherit; font-weight: 600; text-align: left; cursor: pointer; }
        .ws-tab i { width: 18px; color: var(--ac-faint); text-align: center; }
        .ws-tab small { display: block; color: var(--ac-muted); font-size: 11px; font-weight: 500; }
        .ws-tab:hover { background: var(--ac-hover); }
        .ws-tab.on { background: var(--ac-accent-soft); color: var(--ac-accent); }
        .ws-tab.on i { color: var(--ac-accent); }
        .ws-body { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
        .ws-scroll { display: flex; flex: 1; flex-direction: column; gap: 18px; min-height: 0; padding: 20px 22px 26px; overflow-y: auto; }
        .ws-foot { display: flex; flex: none; align-items: center; gap: 10px; padding: 12px 18px; border-top: 1px solid var(--ac-border-2); background: var(--ac-card-2); color: var(--ac-muted); font-size: 12px; }
        .ws-foot .dirty { color: var(--ac-amber); font-weight: 700; }
        .ws-flex { flex: 1; }
        .ws-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .ws-grid .wide { grid-column: 1 / -1; }

        .sw { display: flex; align-items: flex-start; gap: 14px; padding: 14px 16px; border: 1px solid var(--ac-border-2); border-radius: 12px; background: var(--ac-card-2); cursor: pointer; }
        .sw input { position: absolute; opacity: 0; pointer-events: none; }
        .sw-track { position: relative; flex: none; width: 40px; height: 22px; margin-top: 1px; border-radius: 999px; background: var(--ac-border); transition: background 0.2s; }
        .sw-track::after { position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); transition: transform 0.2s; content: ''; }
        .sw input:checked + .sw-track { background: var(--ac-accent); }
        .sw input:checked + .sw-track::after { transform: translateX(18px); }
        .sw input:focus-visible + .sw-track { box-shadow: 0 0 0 3px var(--ac-accent-ring); }
        .sw b { display: block; color: var(--ac-text); font-size: 13px; }
        .sw span.t { color: var(--ac-muted); font-size: 12px; }

        .row-list { display: flex; flex-direction: column; gap: 8px; }
        .row-item { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) auto; gap: 8px; align-items: center; }

        .plans { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
        .plan { position: relative; display: flex; flex-direction: column; gap: 12px; padding: 16px; border: 1px solid var(--ac-border); border-radius: 14px; background: var(--ac-card); }
        .plan.hi { border-color: var(--ac-accent); box-shadow: 0 0 0 3px var(--ac-accent-ring); }
        .plan-head { display: flex; align-items: center; gap: 8px; }
        .plan-head b { flex: 1; color: var(--ac-text); font-size: 14px; }
        .plan-tools { display: flex; gap: 2px; }
        .money { position: relative; }
        .money span { position: absolute; top: 50%; left: 12px; color: var(--ac-faint); font-size: 11.5px; font-weight: 700; transform: translateY(-50%); }
        .money input { padding-left: 46px; }
        .add-plan { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 200px; border: 1.5px dashed var(--ac-border); border-radius: 14px; background: transparent; color: var(--ac-muted); font: inherit; font-weight: 700; cursor: pointer; }
        .add-plan:hover { border-color: var(--ac-accent); color: var(--ac-accent); }
        .add-plan i { font-size: 20px; }
        .ws-loading { display: flex; flex: 1; align-items: center; justify-content: center; gap: 10px; color: var(--ac-muted); }
        .ws-readonly { padding: 10px 12px; border-radius: 10px; background: var(--ac-amber-soft); color: var(--ac-amber); font-weight: 600; }
        @media (max-width: 1000px) { .ws { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); } .ws-tabs { flex-direction: row; overflow-x: auto; align-self: start; } .ws-tab small { display: none; } .ws-grid { grid-template-columns: minmax(0, 1fr); } }
    `],
    template: `
        <ac-page-header icon="fas fa-globe" eyebrow="Settings" title="Website settings"
            subtitle="What appcoretech.net shows : company, contact, home page, requests, pricing and about">
            <ng-container pageHeaderRight>
                <a class="ac-btn" [href]="siteUrl" target="_blank" rel="noopener"><i class="fas fa-arrow-up-right-from-square"></i> Open website</a>
                @if (canSave)
                {
                    <button class="ac-btn ac-btn-primary" type="button" [disabled]="saving() || !model()" (click)="save()">
                        <i class="fas" [class.fa-floppy-disk]="!saving()" [class.fa-spinner]="saving()" [class.fa-spin]="saving()"></i> Save
                    </button>
                }
            </ng-container>
        </ac-page-header>

        @if (model(); as m)
        {
            <div class="ws">
                <nav class="ac-card ws-tabs">
                    @for (t of tabs; track t.id)
                    {
                        <button class="ws-tab" type="button" [class.on]="tab() === t.id" (click)="tab.set(t.id)">
                            <i [class]="t.icon"></i><span>{{ t.label }}<small>{{ t.hint }}</small></span>
                        </button>
                    }
                </nav>

                <div class="ac-card ws-body">
                    <div class="ws-scroll ac-scroll" (input)="dirty.set(true)" (change)="dirty.set(true)">
                        @if (!canSave) { <div class="ws-readonly"><i class="fas fa-lock"></i> Only the Owner can change the website settings.</div> }
                        @if (error()) { <div class="ac-error">{{ error() }}</div> }

                        @switch (tab())
                        {
                            @case ('company')
                            {
                                <span class="ac-section-label">Company</span>
                                <div class="ws-grid">
                                    <div class="ac-field"><label>Company name <b>*</b></label><input class="ac-input" [(ngModel)]="m.CompanyName"></div>
                                    <div class="ac-field"><label>Tagline</label><input class="ac-input" [(ngModel)]="m.Tagline"></div>
                                </div>

                                <span class="ac-section-label">Contact</span>
                                <div class="ws-grid">
                                    <div class="ac-field"><label>Phone</label><input class="ac-input" [(ngModel)]="m.Phone" placeholder="+44 20 0000 0000"></div>
                                    <div class="ac-field"><label>WhatsApp</label><input class="ac-input" [(ngModel)]="m.WhatsApp" placeholder="Country code + number, digits only"></div>
                                    <div class="ac-field"><label>Email</label><input class="ac-input" type="email" [(ngModel)]="m.Email" placeholder="hello@appcoretech.net"></div>
                                    <div class="ac-field"><label>Office hours</label><input class="ac-input" [(ngModel)]="m.OfficeHours"></div>
                                    <div class="ac-field wide"><label>Address</label><textarea class="ac-textarea" [(ngModel)]="m.Address"></textarea></div>
                                    <div class="ac-field wide"><label>Google Maps link</label><input class="ac-input" [(ngModel)]="m.MapUrl" placeholder="https://maps.google.com/..."></div>
                                </div>

                                <span class="ac-section-label">Social pages</span>
                                <div class="ws-grid">
                                    <div class="ac-field"><label>Facebook</label><input class="ac-input" [(ngModel)]="m.Facebook" placeholder="https://facebook.com/..."></div>
                                    <div class="ac-field"><label>LinkedIn</label><input class="ac-input" [(ngModel)]="m.LinkedIn" placeholder="https://linkedin.com/company/..."></div>
                                    <div class="ac-field"><label>YouTube</label><input class="ac-input" [(ngModel)]="m.YouTube" placeholder="https://youtube.com/@..."></div>
                                </div>
                            }

                            @case ('home')
                            {
                                <span class="ac-section-label">Top banner</span>
                                <label class="sw">
                                    <input type="checkbox" [(ngModel)]="m.AnnouncementOn"><span class="sw-track"></span>
                                    <span><b>Show an announcement bar</b><span class="t">A thin line above the menu, e.g. an offer or new release.</span></span>
                                </label>
                                @if (m.AnnouncementOn)
                                {
                                    <div class="ac-field"><label>Announcement</label><input class="ac-input" [(ngModel)]="m.AnnouncementText" placeholder="Book a free demo this month"></div>
                                }

                                <span class="ac-section-label">Hero (first screen)</span>
                                <div class="ws-grid">
                                    <div class="ac-field"><label>Small line above the title</label><input class="ac-input" [(ngModel)]="m.HeroEyebrow"></div>
                                    <div class="ac-field"><label>Title <b>*</b></label><input class="ac-input" [(ngModel)]="m.HeroTitle"></div>
                                    <div class="ac-field wide"><label>Text under the title</label><textarea class="ac-textarea" [(ngModel)]="m.HeroText"></textarea></div>
                                </div>

                                <span class="ac-section-label">Highlights strip</span>
                                <div class="row-list">
                                    @for (st of m.Stats; track $index)
                                    {
                                        <div class="row-item">
                                            <input class="ac-input" [(ngModel)]="st.Value" placeholder="Multi-branch">
                                            <input class="ac-input" [(ngModel)]="st.Label" placeholder="Every branch in one system">
                                            <button class="ac-icon-btn" type="button" title="Remove" (click)="m.Stats.splice($index, 1); dirty.set(true)"><i class="fas fa-trash-can"></i></button>
                                        </div>
                                    }
                                </div>
                                @if (m.Stats.length < 6)
                                {
                                    <button class="ac-btn" type="button" style="align-self:flex-start" (click)="m.Stats.push({ Value: '', Label: '' }); dirty.set(true)"><i class="fas fa-plus"></i> Add highlight</button>
                                }
                            }

                            @case ('requests')
                            {
                                <span class="ac-section-label">Online requests</span>
                                <label class="sw">
                                    <input type="checkbox" [(ngModel)]="m.AcceptRequests"><span class="sw-track"></span>
                                    <span><b>Accept requests from the website</b><span class="t">Off : the form is replaced by the phone number and email.</span></span>
                                </label>
                                <label class="sw">
                                    <input type="checkbox" [(ngModel)]="m.DemoEnabled" [disabled]="!m.AcceptRequests"><span class="sw-track"></span>
                                    <span><b>Demo requests</b><span class="t">Visitors can ask for a demo and pick a date.</span></span>
                                </label>
                                <label class="sw">
                                    <input type="checkbox" [(ngModel)]="m.PurchaseEnabled" [disabled]="!m.AcceptRequests"><span class="sw-track"></span>
                                    <span><b>Purchase requests</b><span class="t">Visitors can ask to buy and reserve their web address.</span></span>
                                </label>
                                <div class="ac-field"><label>Thank-you message after sending</label><textarea class="ac-textarea" [(ngModel)]="m.RequestThanks"></textarea></div>
                                <span class="ac-hint">Requests arrive at Clients &gt; Requests.</span>
                            }

                            @case ('pricing')
                            {
                                <span class="ac-section-label">Pricing page</span>
                                <label class="sw">
                                    <input type="checkbox" [(ngModel)]="m.ShowPricing"><span class="sw-track"></span>
                                    <span><b>Show the Pricing page</b><span class="t">Off : the menu hides Pricing.</span></span>
                                </label>
                                <div class="ws-grid">
                                    <div class="ac-field"><label>Currency</label><input class="ac-input" [(ngModel)]="m.Currency" placeholder="USD, GBP, BDT..."></div>
                                    <div class="ac-field"><label>Note under the plans</label><input class="ac-input" [(ngModel)]="m.PricingNote"></div>
                                </div>

                                <span class="ac-section-label">Plans</span>
                                <span class="ac-hint">Leave the monthly price empty to show "On request". One feature per line.</span>
                                <div class="plans">
                                    @for (p of m.Plans; track $index; let i = $index; let last = $last)
                                    {
                                        <div class="plan" [class.hi]="p.Highlight">
                                            <div class="plan-head">
                                                <b>{{ p.Name || 'New plan' }}</b>
                                                <div class="plan-tools">
                                                    <button class="ac-icon-btn" type="button" title="Move left" [disabled]="i === 0" (click)="move(i, -1)"><i class="fas fa-arrow-left"></i></button>
                                                    <button class="ac-icon-btn" type="button" title="Move right" [disabled]="last" (click)="move(i, 1)"><i class="fas fa-arrow-right"></i></button>
                                                    <button class="ac-icon-btn" type="button" title="Remove" (click)="m.Plans.splice(i, 1); dirty.set(true)"><i class="fas fa-trash-can"></i></button>
                                                </div>
                                            </div>
                                            <div class="ws-grid">
                                                <div class="ac-field"><label>Name</label><input class="ac-input" [(ngModel)]="p.Name"></div>
                                                <div class="ac-field"><label>Code</label><input class="ac-input ac-mono" [(ngModel)]="p.Code"></div>
                                                <div class="ac-field wide"><label>Tagline</label><input class="ac-input" [(ngModel)]="p.Tagline"></div>
                                                <div class="ac-field"><label>Monthly price</label><div class="money"><span>{{ m.Currency }}</span><input class="ac-input" type="number" min="0" [(ngModel)]="p.MonthlyPrice" placeholder="On request"></div></div>
                                                <div class="ac-field"><label>Setup fee</label><div class="money"><span>{{ m.Currency }}</span><input class="ac-input" type="number" min="0" [(ngModel)]="p.SetupFee"></div></div>
                                                <div class="ac-field"><label>Branches</label><input class="ac-input" [(ngModel)]="p.Branches" placeholder="Up to 5"></div>
                                                <div class="ac-field"><label>Users</label><input class="ac-input" [(ngModel)]="p.Users" placeholder="Up to 25"></div>
                                                <div class="ac-field wide"><label>Features</label><textarea class="ac-textarea" rows="5" [ngModel]="p.Features.join('\\n')" (ngModelChange)="p.Features = $event.split('\\n')"></textarea></div>
                                            </div>
                                            <label class="sw">
                                                <input type="checkbox" [(ngModel)]="p.Highlight"><span class="sw-track"></span>
                                                <span><b>Most popular</b><span class="t">Shown raised with a badge.</span></span>
                                            </label>
                                        </div>
                                    }
                                    @if (m.Plans.length < 5)
                                    {
                                        <button class="add-plan" type="button" (click)="addPlan()"><i class="fas fa-plus"></i> Add plan</button>
                                    }
                                </div>
                            }

                            @case ('about')
                            {
                                <span class="ac-section-label">About page</span>
                                <div class="ac-field"><label>Title</label><input class="ac-input" [(ngModel)]="m.AboutTitle"></div>
                                <div class="ac-field"><label>Text</label><textarea class="ac-textarea" rows="8" [(ngModel)]="m.AboutText"></textarea></div>
                                <span class="ac-hint">Blank lines start a new paragraph.</span>
                            }
                        }
                    </div>

                    <div class="ws-foot">
                        @if (dirty()) { <span class="dirty"><i class="fas fa-circle-exclamation"></i> Not saved yet</span> }
                        @else if (modified()) { <span>Last saved {{ modified() | date: 'dd-MMM-yyyy HH:mm' }}</span> }
                        @else { <span>Showing the starting text : save once to keep it.</span> }
                        <span class="ws-flex"></span>
                        <span>The website reads these on every visit.</span>
                    </div>
                </div>
            </div>
        }
        @else
        {
            <div class="ws-loading">
                @if (error()) { <div class="ac-error">{{ error() }}</div> }
                @else { <i class="fas fa-spinner fa-spin"></i> Loading website settings... }
            </div>
        }
    `
})
export class WebsiteSettingsPage implements OnInit
{
    private readonly api = inject(ConsoleApi);
    private readonly auth = inject(AuthService);
    private readonly toast = inject(ToastService);

    readonly canSave = this.auth.hasRole('OWNER');
    readonly siteUrl = environment.siteUrl;

    readonly tabs: { id: Tab; label: string; hint: string; icon: string }[] =
    [
        { id: 'company', label: 'Company & contact', hint: 'Name, phone, email, address', icon: 'fas fa-building' },
        { id: 'home', label: 'Home page', hint: 'Banner, title, highlights', icon: 'fas fa-house' },
        { id: 'requests', label: 'Requests', hint: 'Demo and purchase form', icon: 'fas fa-inbox' },
        { id: 'pricing', label: 'Pricing', hint: 'Plans and prices', icon: 'fas fa-tags' },
        { id: 'about', label: 'About', hint: 'Company story', icon: 'fas fa-circle-info' }
    ];

    readonly tab = signal<Tab>('company');
    readonly saving = signal(false);
    readonly dirty = signal(false);
    readonly error = signal('');
    readonly modified = signal<string | null>(null);

    // the form : a signal so the page shows it once loaded (zoneless);
    // the template edits the object inside directly
    readonly model = signal<WebsiteSettings | null>(null);

    async ngOnInit(): Promise<void>
    {
        try
        {
            const r = await this.api.websiteSettings();

            this.modified.set(r.Saved ? r.ModifiedDate : null);
            this.model.set(r.Settings);
        }
        catch (e)
        {
            this.error.set(apiMessage(e));
        }
    }

    addPlan(): void
    {
        const plan: WebsitePlan = { Code: '', Name: '', Tagline: null, MonthlyPrice: null, SetupFee: null, Branches: null, Users: null, Highlight: false, Features: [] };

        this.model()?.Plans.push(plan);
        this.dirty.set(true);
    }

    move(i: number, step: number): void
    {
        const plans = this.model()?.Plans;

        if (!plans)
        {
            return;
        }

        const [plan] = plans.splice(i, 1);

        plans.splice(i + step, 0, plan!);
        this.dirty.set(true);
    }

    async save(): Promise<void>
    {
        const m = this.model();

        if (!m)
        {
            return;
        }

        this.saving.set(true);
        this.error.set('');

        try
        {
            // an emptied number box gives '' or null : keep null
            for (const p of m.Plans)
            {
                p.MonthlyPrice = p.MonthlyPrice === null || (p.MonthlyPrice as unknown) === '' ? null : Number(p.MonthlyPrice);
                p.SetupFee = p.SetupFee === null || (p.SetupFee as unknown) === '' ? null : Number(p.SetupFee);
            }

            const r = await this.api.saveWebsiteSettings(m);

            this.modified.set(r.ModifiedDate);
            this.dirty.set(false);
            this.toast.success('Website settings saved', 'The website shows them on the next visit.');
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
