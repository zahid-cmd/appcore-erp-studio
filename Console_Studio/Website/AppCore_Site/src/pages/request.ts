//===============================================================
// Request a demo / purchase. Saved in the Console (Clients >
// Requests) through api/public/requests. The fields match the
// Console's customer registration, so a request converts into a
// Customer (and then a Tenant) without retyping.
//===============================================================

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { RequestSubmit, SiteService, errorMessage } from '../core/site.service';

const ICONS: Record<string, string> =
{
    'TWO-WHEELER': 'fa-motorcycle',
    'AUTOMOBILE': 'fa-car',
    'REAL-ESTATE': 'fa-building',
    'CONSULTANCY': 'fa-briefcase'
};

@Component({
    selector: 'site-request',
    imports: [FormsModule, RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        .top { padding: 64px 0 120px; }
        .top h1 { max-width: 760px; margin: 16px 0 12px; color: #fff; font-size: clamp(32px, 4.2vw, 50px); font-weight: 800; letter-spacing: -0.04em; line-height: 1.06; }
        .wrap { position: relative; z-index: 2; display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 24px; align-items: start; margin: -84px auto 88px; }

        form { display: flex; flex-direction: column; gap: 0; padding: 0; overflow: hidden; }
        .block { display: flex; flex-direction: column; gap: 18px; padding: 28px 30px; border-bottom: 1px solid var(--s-line-2); }
        .block-head { display: flex; align-items: center; gap: 12px; }
        .block-head .no { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 9px; background: var(--s-carbon); color: #f0b88c; font-size: 13px; font-weight: 800; }
        .block-head h2 { color: var(--s-text); font-size: 18px; font-weight: 800; }
        .block-head span.opt { margin-left: auto; color: var(--s-faint); font-size: 12.5px; }
        .grid2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
        .grid2 .wide { grid-column: 1 / -1; }

        .types { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .type { position: relative; display: flex; gap: 14px; padding: 18px; border: 1.5px solid var(--s-line); border-radius: 14px; background: var(--s-card); text-align: left; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; font: inherit; }
        .type:hover:not(:disabled) { border-color: var(--s-faint); }
        .type.on { border-color: var(--s-copper); box-shadow: 0 0 0 4px var(--s-copper-ring); }
        .type:disabled { opacity: 0.5; cursor: not-allowed; }
        .type b { display: block; color: var(--s-text); font-size: 15.5px; }
        .type .t > span { display: block; color: var(--s-muted); font-size: 13px; }
        .type .tick { position: absolute; top: 12px; right: 12px; color: var(--s-copper); opacity: 0; }
        .type.on .tick { opacity: 1; }

        .prods { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .prod { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1.5px solid var(--s-line); border-radius: 12px; background: var(--s-card); text-align: left; cursor: pointer; font: inherit; transition: border-color 0.15s; }
        .prod:hover { border-color: var(--s-faint); }
        .prod.on { border-color: var(--s-copper); background: var(--s-copper-soft); }
        .prod i { width: 20px; color: var(--s-copper); text-align: center; }
        .prod b { flex: 1; color: var(--s-text); font-size: 14px; }
        .prod small { color: var(--s-brass); font-size: 11px; font-weight: 700; }

        .sub { display: flex; align-items: stretch; border: 1px solid var(--s-line); border-radius: 12px; overflow: hidden; transition: border-color 0.15s, box-shadow 0.15s; }
        .sub:focus-within { border-color: var(--s-copper); box-shadow: 0 0 0 4px var(--s-copper-ring); }
        .sub input { flex: 1; min-width: 0; height: 48px; padding: 0 14px; border: 0; outline: none; background: var(--s-card); color: var(--s-text); font: inherit; font-family: var(--s-mono); font-size: 14px; }
        .sub span { display: inline-flex; align-items: center; padding: 0 14px; border-left: 1px solid var(--s-line); background: var(--s-card-2); color: var(--s-muted); font-family: var(--s-mono); font-size: 13.5px; }
        .sub-state { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; }
        .sub-state.ok { color: var(--s-green); }
        .sub-state.bad { color: var(--s-red); }
        .sub-state.wait { color: var(--s-muted); }

        .is-bad .input, .is-bad .textarea { border-color: var(--s-red); }
        .err { color: var(--s-red); font-size: 12.5px; font-weight: 600; }

        .consent { display: flex; gap: 12px; color: var(--s-text-2); font-size: 14px; cursor: pointer; }
        .consent input { width: 18px; height: 18px; margin-top: 2px; accent-color: var(--s-copper); }
        .hp { position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden; }
        .send { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px; padding: 22px 30px; background: var(--s-card-2); }

        aside { position: sticky; top: 96px; display: flex; flex-direction: column; gap: 16px; }
        .next { padding: 26px; border-radius: var(--s-radius); }
        .next h3 { position: relative; margin-bottom: 18px; color: #fff; font-size: 17px; font-weight: 800; }
        .next ol { position: relative; display: flex; flex-direction: column; gap: 16px; margin: 0; padding: 0; list-style: none; counter-reset: s; }
        .next li { display: flex; gap: 12px; color: var(--s-on-dark-2); font-size: 14px; counter-increment: s; }
        .next li::before { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 26px; height: 26px; border: 1px solid rgba(216, 131, 74, 0.4); border-radius: 50%; color: #f0b88c; font-size: 12px; font-weight: 800; content: counter(s); }
        .next li b { display: block; color: #fff; }
        .help { padding: 22px; }
        .help b { display: block; margin-bottom: 8px; color: var(--s-text); }
        .help a { display: flex; align-items: center; gap: 10px; padding: 6px 0; color: var(--s-text-2); font-weight: 600; }
        .help a i { width: 18px; color: var(--s-copper); }
        .safe { display: flex; gap: 10px; padding: 0 4px; color: var(--s-muted); font-size: 12.5px; }
        .safe i { margin-top: 3px; color: var(--s-green); }

        .done { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 64px 30px; text-align: center; }
        .done-icon { display: inline-flex; align-items: center; justify-content: center; width: 76px; height: 76px; border-radius: 22px; background: var(--s-green-soft); color: var(--s-green); font-size: 32px; animation: pop 0.5s cubic-bezier(0.2, 1.4, 0.4, 1); }
        .done h2 { color: var(--s-text); font-size: 26px; font-weight: 800; letter-spacing: -0.02em; }
        .done .no { padding: 8px 16px; border-radius: 10px; background: var(--s-carbon); color: #f0b88c; font-family: var(--s-mono); font-size: 16px; font-weight: 600; letter-spacing: 0.04em; }
        .done p { max-width: 460px; color: var(--s-muted); }
        .closed { display: flex; flex-direction: column; gap: 14px; padding: 40px 30px; }
        @keyframes pop { from { transform: scale(0.4); opacity: 0; } to { transform: none; opacity: 1; } }
        @media (max-width: 980px) { .wrap { grid-template-columns: minmax(0, 1fr); } aside { position: static; } }
        @media (max-width: 620px) { .grid2, .types, .prods { grid-template-columns: minmax(0, 1fr); } .block, .send { padding-left: 18px; padding-right: 18px; } }
    `],
    template: `
        <section class="top dark grid-lines">
            <div class="container" style="position:relative">
                <span class="eyebrow rise">{{ form.RequestType === 'Purchase' ? 'Buy AppCore' : 'Free demo' }}</span>
                <h1 class="rise d1">{{ form.RequestType === 'Purchase' ? 'Get your business on AppCore.' : 'See AppCore working with your own data.' }}</h1>
                <p class="lead rise d2">Tell us about your business. It takes about two minutes.</p>
            </div>
        </section>

        <div class="container wrap">
            @if (requestNo(); as no)
            {
                <div class="card done">
                    <span class="done-icon"><i class="fas fa-check"></i></span>
                    <h2>Request sent</h2>
                    <span class="no">{{ no }}</span>
                    <p>{{ s().RequestThanks }}</p>
                    <p class="hint">Please keep this number if you call us.</p>
                    <a class="btn btn-dark" routerLink="/"><i class="fas fa-house"></i> Back to home</a>
                </div>
            }
            @else if (!s().AcceptRequests)
            {
                <div class="card closed">
                    <h2 class="h2" style="font-size:26px">Online requests are paused.</h2>
                    <p class="lead">Please call or email us and we will set up your demo.</p>
                    <a class="btn btn-dark" routerLink="/contact" style="align-self:flex-start"><i class="fas fa-phone"></i> Contact us</a>
                </div>
            }
            @else
            {
                <form class="card" (ngSubmit)="submit()" novalidate>
                    <!-- 1 -->
                    <div class="block">
                        <div class="block-head"><span class="no">1</span><h2>What do you need?</h2></div>
                        <div class="types">
                            <button type="button" class="type" [class.on]="form.RequestType === 'Demo'" [disabled]="!s().DemoEnabled" (click)="form.RequestType = 'Demo'">
                                <span class="icon-tile"><i class="fas fa-desktop"></i></span>
                                <span class="t"><b>A free demo</b><span>A guided walk-through with your own data.</span></span>
                                <i class="fas fa-circle-check tick"></i>
                            </button>
                            <button type="button" class="type" [class.on]="form.RequestType === 'Purchase'" [disabled]="!s().PurchaseEnabled" (click)="form.RequestType = 'Purchase'">
                                <span class="icon-tile"><i class="fas fa-cart-shopping"></i></span>
                                <span class="t"><b>To buy</b><span>Price, setup and your web address.</span></span>
                                <i class="fas fa-circle-check tick"></i>
                            </button>
                        </div>
                        <div class="field">
                            <label>Product <b>*</b></label>
                            <div class="prods">
                                @for (p of site.products(); track p.ProductCode)
                                {
                                    <button type="button" class="prod" [class.on]="form.ProductCode === p.ProductCode" (click)="form.ProductCode = p.ProductCode">
                                        <i [class]="'fas ' + icon(p.ProductCode)"></i>
                                        <b>{{ p.ProductName }}</b>
                                    </button>
                                }
                            </div>
                        </div>
                    </div>

                    <!-- 2 -->
                    <div class="block">
                        <div class="block-head"><span class="no">2</span><h2>Your company</h2></div>
                        <div class="grid2">
                            <div class="field" [class.is-bad]="tried() && !form.LegalName.trim()">
                                <label for="f-legal">Company name <b>*</b></label>
                                <input id="f-legal" class="input" name="legal" [(ngModel)]="form.LegalName" placeholder="As on your trade licence" autocomplete="organization">
                                @if (tried() && !form.LegalName.trim()) { <span class="err">Please enter the company name.</span> }
                            </div>
                            <div class="field">
                                <label for="f-display">Trading / brand name</label>
                                <input id="f-display" class="input" name="display" [(ngModel)]="form.DisplayName" placeholder="If different">
                            </div>
                            <div class="field">
                                <label for="f-bin">VAT / tax number</label>
                                <input id="f-bin" class="input" name="bin" [(ngModel)]="form.BinNo" placeholder="VAT, GST or BIN">
                            </div>
                            <div class="field">
                                <label for="f-tin">Company / tax ID</label>
                                <input id="f-tin" class="input" name="tin" [(ngModel)]="form.TinNo" placeholder="Company number, EIN or TIN">
                            </div>
                            <div class="field wide">
                                <label for="f-address">Address</label>
                                <input id="f-address" class="input" name="address" [(ngModel)]="form.Address" placeholder="House, road, area" autocomplete="street-address">
                            </div>
                            <div class="field">
                                <label for="f-city">City / district</label>
                                <input id="f-city" class="input" name="city" [(ngModel)]="form.City" placeholder="City" autocomplete="address-level2">
                            </div>
                            <div class="field" [class.is-bad]="tried() && !form.Country.trim()">
                                <label for="f-country">Country <b>*</b></label>
                                <input id="f-country" class="input" name="country" list="f-countries" [(ngModel)]="form.Country" placeholder="Start typing" autocomplete="country-name">
                                <datalist id="f-countries">@for (c of countries; track c) { <option [value]="c"></option> }</datalist>
                                @if (tried() && !form.Country.trim()) { <span class="err">Please choose your country.</span> }
                            </div>
                        </div>
                    </div>

                    <!-- 3 -->
                    <div class="block">
                        <div class="block-head"><span class="no">3</span><h2>Contact person</h2></div>
                        <div class="grid2">
                            <div class="field" [class.is-bad]="tried() && !form.ContactName.trim()">
                                <label for="f-name">Full name <b>*</b></label>
                                <input id="f-name" class="input" name="name" [(ngModel)]="form.ContactName" autocomplete="name">
                                @if (tried() && !form.ContactName.trim()) { <span class="err">Please enter your name.</span> }
                            </div>
                            <div class="field">
                                <label for="f-desig">Designation</label>
                                <input id="f-desig" class="input" name="desig" [(ngModel)]="form.Designation" placeholder="Owner, Manager...">
                            </div>
                            <div class="field" [class.is-bad]="tried() && !phoneOk()">
                                <label for="f-phone">Mobile <b>*</b></label>
                                <input id="f-phone" class="input" name="phone" type="tel" [(ngModel)]="form.Phone" placeholder="With country code, e.g. +44 7700 900123" autocomplete="tel">
                                @if (tried() && !phoneOk()) { <span class="err">Please enter a valid mobile number.</span> }
                            </div>
                            <div class="field" [class.is-bad]="tried() && !emailOk()">
                                <label for="f-email">Email <b>*</b></label>
                                <input id="f-email" class="input" name="email" type="email" [(ngModel)]="form.Email" placeholder="you@company.com" autocomplete="email">
                                @if (tried() && !emailOk()) { <span class="err">Please enter a valid email.</span> }
                            </div>
                        </div>
                    </div>

                    <!-- 4 -->
                    <div class="block">
                        <div class="block-head"><span class="no">4</span><h2>Your setup</h2><span class="opt">Helps us prepare</span></div>
                        <div class="grid2">
                            <div class="field">
                                <label for="f-br">Branches / offices</label>
                                <input id="f-br" class="input" name="branches" type="number" min="1" max="500" [(ngModel)]="form.Branches" placeholder="1">
                            </div>
                            <div class="field">
                                <label for="f-us">People who will use it</label>
                                <input id="f-us" class="input" name="users" type="number" min="1" max="5000" [(ngModel)]="form.Users" placeholder="5">
                            </div>
                            <div class="field wide">
                                <label for="f-sub">Your web address</label>
                                <div class="sub">
                                    <input id="f-sub" name="sub" [ngModel]="sub()" (ngModelChange)="subChanged($event)" placeholder="yourname" autocomplete="off" spellcheck="false">
                                    <span>.appcoretech.net</span>
                                </div>
                                @switch (subState())
                                {
                                    @case ('checking') { <span class="sub-state wait"><i class="fas fa-spinner fa-spin"></i> Checking...</span> }
                                    @case ('ok') { <span class="sub-state ok"><i class="fas fa-circle-check"></i> {{ sub() }}.appcoretech.net is free</span> }
                                    @case ('bad') { <span class="sub-state bad"><i class="fas fa-circle-xmark"></i> {{ subReason() }}</span> }
                                    @default { <span class="hint">Where your team will open AppCore. We reserve it for you.</span> }
                                }
                            </div>
                            @if (form.RequestType === 'Demo')
                            {
                                <div class="field">
                                    <label for="f-date">Preferred demo date</label>
                                    <input id="f-date" class="input" name="date" type="date" [min]="today" [max]="maxDate" [(ngModel)]="form.PreferredDate">
                                </div>
                                <div class="field">
                                    <label for="f-time">Preferred time</label>
                                    <select id="f-time" class="select" name="time" [(ngModel)]="form.PreferredTime">
                                        <option [ngValue]="null">Any time</option>
                                        <option value="Morning">Morning (your time)</option>
                                        <option value="Afternoon">Afternoon (your time)</option>
                                        <option value="Evening">Evening (your time)</option>
                                    </select>
                                </div>
                            }
                            <div class="field wide">
                                <label for="f-msg">Anything we should know?</label>
                                <textarea id="f-msg" class="textarea" name="msg" [(ngModel)]="form.Message" maxlength="2000" placeholder="Brands you sell, the system you use today, what you want to fix..."></textarea>
                            </div>
                            <div class="field">
                                <label for="f-heard">How did you hear about us?</label>
                                <select id="f-heard" class="select" name="heard" [(ngModel)]="form.HeardFrom">
                                    <option [ngValue]="null">Choose</option>
                                    @for (h of heard; track h) { <option [value]="h">{{ h }}</option> }
                                </select>
                            </div>
                        </div>

                        <!-- people never see this; bots fill it -->
                        <div class="hp" aria-hidden="true">
                            <label for="f-website">Website</label>
                            <input id="f-website" name="website" tabindex="-1" autocomplete="off" [(ngModel)]="form.Website">
                        </div>
                    </div>

                    <div class="send">
                        <label class="consent">
                            <input type="checkbox" name="consent" [(ngModel)]="form.Consent">
                            <span>{{ s().CompanyName }} may call or email me about this request. Your details are kept private and never shared (<a routerLink="/security" target="_blank">security & privacy</a>).</span>
                        </label>
                        @if (error()) { <div class="error-box" style="width:100%"><i class="fas fa-circle-exclamation"></i>{{ error() }}</div> }
                        <button class="btn btn-primary" type="submit" [disabled]="busy()">
                            @if (busy()) { <i class="fas fa-spinner fa-spin"></i> Sending }
                            @else { <i class="fas fa-paper-plane"></i> Send request }
                        </button>
                    </div>
                </form>
            }

            <aside>
                <div class="next dark grid-lines">
                    <h3>What happens next</h3>
                    <ol>
                        <li><span><b>We call you</b>Within one working day, to understand your business.</span></li>
                        <li><span><b>Your demo</b>Built around your own business and data.</span></li>
                        <li><span><b>Your address</b>{{ sub() ? sub() + '.appcoretech.net' : 'yourname.appcoretech.net' }}, ready for your team.</span></li>
                    </ol>
                </div>

                @if (site.phoneUrl() || s().Email || site.whatsAppUrl())
                {
                    <div class="card help">
                        <b>Rather talk now?</b>
                        @if (site.phoneUrl(); as tel) { <a [href]="tel"><i class="fas fa-phone"></i>{{ s().Phone }}</a> }
                        @if (site.whatsAppUrl(); as wa) { <a [href]="wa" target="_blank" rel="noopener"><i class="fab fa-whatsapp"></i>WhatsApp</a> }
                        @if (s().Email; as mail) { <a [href]="'mailto:' + mail"><i class="fas fa-envelope"></i>{{ mail }}</a> }
                    </div>
                }

                <div class="safe"><i class="fas fa-shield-halved"></i><span>Your details are used only to answer this request. We never share them.</span></div>
            </aside>
        </div>
    `
})
export class RequestPage implements OnInit
{
    readonly site = inject(SiteService);

    readonly s = this.site.settings;

    // from the address : /request?type=Demo&product=TWO-WHEELER&plan=BUSINESS
    readonly type = input<string>();
    readonly product = input<string>();
    readonly plan = input<string>();

    readonly countries =
    [
        'Bangladesh', 'India', 'Pakistan', 'Sri Lanka', 'Nepal', 'Bhutan', 'Maldives',
        'United Kingdom', 'United States', 'Canada', 'Australia', 'New Zealand', 'Ireland',
        'United Arab Emirates', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Oman', 'Bahrain',
        'Malaysia', 'Singapore', 'Indonesia', 'Thailand', 'Vietnam', 'Philippines',
        'Kenya', 'Nigeria', 'South Africa', 'Egypt', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands'
    ];

    readonly heard = ['Facebook', 'Google search', 'A friend or another business', 'Brand / distributor', 'Our sales team', 'Other'];

    readonly today = this.isoDate(new Date());
    readonly maxDate = this.isoDate(new Date(Date.now() + 120 * 86400000));

    readonly busy = signal(false);
    readonly error = signal('');
    readonly tried = signal(false);
    readonly requestNo = signal<string | null>(null);

    readonly sub = signal('');
    readonly subState = signal<'' | 'checking' | 'ok' | 'bad'>('');
    readonly subReason = signal('');

    form: RequestSubmit =
    {
        RequestType: 'Demo',
        ProductCode: 'TWO-WHEELER',
        LegalName: '',
        DisplayName: null,
        BinNo: null,
        TinNo: null,
        Address: null,
        City: null,
        Country: '',
        ContactName: '',
        Designation: null,
        Phone: '',
        Email: '',
        Branches: null,
        Users: null,
        PreferredSubdomain: null,
        PreferredDate: null,
        PreferredTime: null,
        Message: null,
        HeardFrom: null,
        Consent: true,
        Website: ''
    };

    readonly phoneOk = (): boolean => /^\+?[0-9][0-9 \-]{6,18}[0-9]$/.test(this.form.Phone.trim());
    readonly emailOk = (): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(this.form.Email.trim());

    private subTimer: ReturnType<typeof setTimeout> | null = null;

    readonly planName = computed(() => this.s().Plans.find(p => p.Code === (this.plan() ?? '').toUpperCase())?.Name ?? null);

    ngOnInit(): void
    {
        const t = (this.type() ?? '').toLowerCase();

        this.form.RequestType = t === 'purchase' ? 'Purchase' : 'Demo';

        if (this.form.RequestType === 'Demo' && !this.s().DemoEnabled && this.s().PurchaseEnabled)
        {
            this.form.RequestType = 'Purchase';
        }

        const p = (this.product() ?? '').toUpperCase();

        if (p && this.site.products().some(x => x.ProductCode === p))
        {
            this.form.ProductCode = p;
        }

        if (this.plan())
        {
            this.form.Message = `Interested in the ${this.planName() ?? this.plan()} plan.`;
        }
    }

    icon(code: string): string
    {
        return ICONS[code] ?? 'fa-cube';
    }

    subChanged(value: string): void
    {
        const v = (value ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30);

        this.sub.set(v);
        this.subState.set('');

        if (this.subTimer)
        {
            clearTimeout(this.subTimer);
        }

        if (!v)
        {
            return;
        }

        if (v.length < 3)
        {
            this.subState.set('bad');
            this.subReason.set('At least 3 letters or digits.');

            return;
        }

        this.subState.set('checking');

        this.subTimer = setTimeout(async () =>
        {
            try
            {
                const r = await this.site.checkSubdomain(v);

                if (this.sub() !== v)
                {
                    return;
                }

                this.subState.set(r.Available ? 'ok' : 'bad');
                this.subReason.set(r.Reason ?? '');
            }
            catch
            {
                // could not check : the server checks again on send
                this.subState.set('');
            }
        }, 450);
    }

    async submit(): Promise<void>
    {
        this.tried.set(true);
        this.error.set('');

        if (!this.form.LegalName.trim() || !this.form.ContactName.trim() || !this.form.Country.trim() || !this.phoneOk() || !this.emailOk())
        {
            this.error.set('Please fill in the marked fields.');

            return;
        }

        if (this.subState() === 'bad')
        {
            this.error.set('Please choose another web address, or leave it empty.');

            return;
        }

        if (!this.form.Consent)
        {
            this.error.set('Please tick the box so we may contact you.');

            return;
        }

        this.busy.set(true);

        try
        {
            const body: RequestSubmit =
            {
                ...this.form,
                Phone: this.form.Phone.trim(),
                Email: this.form.Email.trim(),
                PreferredSubdomain: this.sub() || null,
                PreferredDate: this.form.RequestType === 'Demo' ? (this.form.PreferredDate || null) : null,
                PreferredTime: this.form.RequestType === 'Demo' ? this.form.PreferredTime : null,
                Branches: this.num(this.form.Branches),
                Users: this.num(this.form.Users)
            };

            const r = await this.site.submit(body);

            this.requestNo.set(r.RequestNo);

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        catch (e)
        {
            this.error.set(errorMessage(e));
        }
        finally
        {
            this.busy.set(false);
        }
    }

    private num(v: unknown): number | null
    {
        const n = Number(v);

        return v === null || v === '' || !Number.isFinite(n) ? null : Math.round(n);
    }

    private isoDate(d: Date): string
    {
        const p = (n: number): string => String(n).padStart(2, '0');

        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }
}
