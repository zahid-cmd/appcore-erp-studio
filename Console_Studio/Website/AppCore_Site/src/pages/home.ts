import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PRODUCTS } from '../core/products';
import { SiteService } from '../core/site.service';
import { CtaBand } from '../layout/cta-band';

@Component({
    selector: 'site-home',
    imports: [RouterLink, CtaBand],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        /* ---------- hero ---------- */
        .hero { padding: 84px 0 96px; }
        .hero-in { position: relative; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); align-items: center; gap: 56px; }
        .hero-pill { display: inline-flex; align-items: center; gap: 10px; padding: 7px 14px 7px 10px; border: 1px solid rgba(216, 131, 74, 0.3); border-radius: 999px; background: rgba(216, 131, 74, 0.08); color: #f0b88c; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        .hero-pill i { width: 7px; height: 7px; border-radius: 50%; background: var(--s-copper-2); box-shadow: 0 0 0 4px rgba(216, 131, 74, 0.2); }
        .hero h1 { margin: 22px 0 18px; color: #fff; font-size: clamp(38px, 5.2vw, 66px); font-weight: 800; letter-spacing: -0.045em; line-height: 1.02; }
        .hero h1 em { background: linear-gradient(120deg, #f3c9a5, #d8834a 60%, #b4551f); -webkit-background-clip: text; background-clip: text; color: transparent; font-style: normal; }
        .hero .lead { max-width: 540px; }
        .hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
        .hero-note { display: flex; flex-wrap: wrap; gap: 8px 20px; margin-top: 26px; color: var(--s-on-dark-2); font-size: 13.5px; }
        .hero-note i { margin-right: 6px; color: #6fe3b0; }

        /* app window */
        .win { position: relative; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; background: linear-gradient(180deg, #1d2027, #15171c); box-shadow: 0 50px 100px -40px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(0, 0, 0, 0.4); overflow: hidden; transform: perspective(1400px) rotateY(-8deg) rotateX(3deg); }
        .win-bar { display: flex; align-items: center; gap: 7px; padding: 12px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); }
        .win-bar span { width: 10px; height: 10px; border-radius: 50%; background: #3a3e47; }
        .win-bar em { margin-left: 12px; padding: 3px 12px; border-radius: 7px; background: rgba(255, 255, 255, 0.05); color: #8a8e97; font-family: var(--s-mono); font-size: 11.5px; font-style: normal; }
        .win-body { display: grid; grid-template-columns: 64px minmax(0, 1fr); min-height: 330px; }
        .win-side { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 16px 0; border-right: 1px solid rgba(255, 255, 255, 0.05); color: #5f636c; }
        .win-side i.on { color: #e9a06a; }
        .win-main { display: flex; flex-direction: column; gap: 14px; padding: 18px; }
        .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .kpi { padding: 12px; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; background: rgba(255, 255, 255, 0.03); }
        .kpi small { color: #7d8189; font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
        .kpi b { display: block; margin-top: 3px; color: #fff; font-size: 18px; }
        .kpi em { color: #6fe3b0; font-size: 11px; font-style: normal; font-weight: 700; }
        .bars { display: flex; align-items: flex-end; gap: 8px; height: 120px; padding: 14px; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; background: rgba(255, 255, 255, 0.02); }
        .bars span { flex: 1; border-radius: 6px 6px 2px 2px; background: linear-gradient(180deg, #d8834a, rgba(180, 85, 31, 0.35)); animation: grow 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) both; transform-origin: bottom; }
        .bars span:nth-child(odd) { background: linear-gradient(180deg, #4d525c, #2a2e36); }
        .rows { display: flex; flex-direction: column; gap: 7px; }
        .row { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; background: rgba(255, 255, 255, 0.025); color: #c7c8cc; font-size: 12px; }
        .row b { flex: 1; font-weight: 600; }
        .row em { padding: 2px 8px; border-radius: 999px; background: rgba(61, 220, 151, 0.12); color: #6fe3b0; font-size: 10.5px; font-style: normal; font-weight: 700; }
        .row em.warn { background: rgba(245, 180, 84, 0.12); color: #f5b454; }
        .float { position: absolute; right: -18px; bottom: 36px; display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 1px solid var(--s-line); border-radius: 14px; background: #fff; color: var(--s-text); box-shadow: var(--s-shadow-lg); animation: bob 5s ease-in-out infinite; }
        .float i { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; background: var(--s-green-soft); color: var(--s-green); }
        .float b { display: block; font-size: 13px; }
        .float small { color: var(--s-muted); font-size: 11.5px; }
        @keyframes grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

        /* ---------- stats ---------- */
        .stats { position: relative; z-index: 2; margin-top: -44px; }
        .stats-in { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); padding: 8px; }
        .stat { display: flex; flex-direction: column; gap: 4px; padding: 18px 22px; }
        .stat + .stat { border-left: 1px solid var(--s-line-2); }
        .stat b { color: var(--s-text); font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
        .stat span { color: var(--s-muted); font-size: 13.5px; }

        /* ---------- products ---------- */
        .prods { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px; scroll-margin-top: 96px; }
        .prod { position: relative; display: flex; flex-direction: column; gap: 16px; padding: 30px; overflow: hidden; transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s; }
        .prod:hover { border-color: rgba(180, 85, 31, 0.45); transform: translateY(-3px); box-shadow: var(--s-shadow-lg); }
        .prod-top { display: flex; align-items: center; gap: 14px; }
        .prod-no { margin-left: auto; color: var(--s-line); font-family: var(--s-mono); font-size: 34px; font-weight: 600; line-height: 1; }
        .prod h3 { color: var(--s-text); font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
        .prod-ind { display: block; margin-top: 2px; color: var(--s-copper); font-size: 12.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
        .prod p { color: var(--s-muted); font-size: 14.5px; }
        .prod ul { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; margin: 0; padding: 0; list-style: none; }
        .prod li { display: flex; gap: 8px; color: var(--s-text-2); font-size: 13.5px; }
        .prod li i { margin-top: 3px; color: var(--s-copper); font-size: 12px; }
        .prod-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: auto; padding-top: 6px; }

        /* ---------- features ---------- */
        .features { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
        .feature { display: flex; flex-direction: column; gap: 12px; padding: 24px; }
        .feature h3 { color: var(--s-text); font-size: 16px; font-weight: 800; }
        .feature p { color: var(--s-muted); font-size: 14px; }

        /* ---------- safe ---------- */
        .safe { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: 48px; align-items: center; padding: 44px; }
        .safe-head { display: flex; flex-direction: column; gap: 14px; }
        .safe-head .h2 { margin: 0; }
        .safe-head p { color: var(--s-muted); }
        .safe-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .safe-item { display: flex; gap: 12px; padding: 16px; border: 1px solid var(--s-line-2); border-radius: 14px; background: var(--s-card-2); }
        .safe-item > i { margin-top: 3px; color: var(--s-copper); }
        .safe-item b { display: block; color: var(--s-text); font-size: 14.5px; }
        .safe-item span { color: var(--s-muted); font-size: 13px; }
        @media (max-width: 960px) { .safe { grid-template-columns: minmax(0, 1fr); padding: 28px; } }
        @media (max-width: 560px) { .safe-list { grid-template-columns: minmax(0, 1fr); } .safe { padding: 22px; } }

        /* ---------- steps ---------- */
        .steps { position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 22px; }
        .steps::before { position: absolute; top: 27px; left: 12%; right: 12%; height: 2px; background: linear-gradient(90deg, transparent, rgba(216, 131, 74, 0.5), transparent); content: ''; }
        .step { position: relative; display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
        .step-no { display: inline-flex; align-items: center; justify-content: center; width: 56px; height: 56px; border: 1px solid rgba(216, 131, 74, 0.4); border-radius: 50%; background: var(--s-carbon); color: #f0b88c; font-size: 18px; font-weight: 800; box-shadow: 0 0 0 8px rgba(216, 131, 74, 0.06); }
        .step h3 { color: #fff; font-size: 16.5px; font-weight: 800; }
        .step p { max-width: 240px; color: var(--s-on-dark-2); font-size: 14px; }

        @media (max-width: 1080px) { .features { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 960px)
        {
            .hero-in { grid-template-columns: minmax(0, 1fr); }
            .win { transform: none; }
            .float { right: 12px; }
            .stats-in { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .stat:nth-child(3) { border-left: 0; }
            .steps { grid-template-columns: repeat(2, minmax(0, 1fr)); row-gap: 36px; }
            .steps::before { display: none; }
        }
        @media (max-width: 860px) { .prods { grid-template-columns: minmax(0, 1fr); } }
        @media (max-width: 560px) { .prod { padding: 22px; } .prod ul { grid-template-columns: minmax(0, 1fr); } .features, .stats-in { grid-template-columns: minmax(0, 1fr); } .stat + .stat { border-left: 0; border-top: 1px solid var(--s-line-2); } .kpis { grid-template-columns: repeat(2, 1fr); } .kpi:last-child { display: none; } }
    `],
    template: `
        <!-- ================= HERO ================= -->
        <section class="hero dark grid-lines">
            <div class="container hero-in">
                <div>
                    <span class="hero-pill rise"><i></i>{{ s().HeroEyebrow }}</span>
                    <h1 class="rise d1">{{ titleStart() }} <em>{{ titleEnd() }}</em></h1>
                    <p class="lead rise d2">{{ s().HeroText }}</p>

                    <div class="hero-actions rise d3">
                        @if (s().AcceptRequests && s().DemoEnabled)
                        {
                            <a class="btn btn-primary" routerLink="/request" [queryParams]="{ type: 'Demo' }"><i class="fas fa-calendar-check"></i> Book a free demo</a>
                        }
                        <a class="btn btn-ghost-dark" href="/#products" (click)="toProducts($event)">Explore our products <i class="fas fa-arrow-right"></i></a>
                    </div>

                    <div class="hero-note rise d3">
                        <span><i class="fas fa-circle-check"></i>Your own web address</span>
                        <span><i class="fas fa-circle-check"></i>Data moved for you</span>
                        <span><i class="fas fa-circle-check"></i>Staff trained with you</span>
                    </div>
                </div>

                <div style="position:relative" class="rise d2" aria-hidden="true">
                    <div class="win">
                        <div class="win-bar"><span></span><span></span><span></span><em>yourname.appcoretech.net</em></div>
                        <div class="win-body">
                            <div class="win-side">
                                <i class="fas fa-gauge-high on"></i><i class="fas fa-car"></i><i class="fas fa-motorcycle"></i><i class="fas fa-building"></i><i class="fas fa-briefcase"></i><i class="fas fa-scale-balanced"></i>
                            </div>
                            <div class="win-main">
                                <div class="kpis">
                                    <div class="kpi"><small>Sales this month</small><b>$412k</b><em>+12%</em></div>
                                    <div class="kpi"><small>Collections</small><b>$286k</b><em>+8%</em></div>
                                    <div class="kpi"><small>Branches</small><b>6 live</b><em>all synced</em></div>
                                </div>
                                <div class="bars">
                                    @for (h of bars; track $index) { <span [style.height.%]="h" [style.animation-delay.ms]="$index * 60"></span> }
                                </div>
                                <div class="rows">
                                    <div class="row"><i class="fas fa-file-invoice"></i><b>Sales invoice : City branch</b><em>Posted</em></div>
                                    <div class="row"><i class="fas fa-calendar-days"></i><b>Instalments : 14 customers</b><em class="warn">Due today</em></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="float"><i class="fas fa-receipt"></i><span><b>Tax posted</b><small>Tax invoice ready to print</small></span></div>
                </div>
            </div>
        </section>

        <!-- ================= STATS ================= -->
        @if (s().Stats.length)
        {
            <div class="container stats">
                <div class="card stats-in">
                    @for (st of s().Stats; track $index)
                    {
                        <div class="stat"><b>{{ st.Value }}</b><span>{{ st.Label }}</span></div>
                    }
                </div>
            </div>
        }

        <!-- ================= PRODUCTS ================= -->
        <section class="section">
            <div class="container">
                <div class="section-head">
                    <span class="eyebrow">Our products</span>
                    <h2 class="h2">Software made for the way your industry works.</h2>
                    <p class="lead">Four products, each shaped around one kind of business, all standing on the same proven platform for accounts, tax, branches and control.</p>
                </div>

                <div class="prods" id="products">
                    @for (p of products; track p.slug; let i = $index)
                    {
                        <div class="card prod">
                            <div class="prod-top">
                                <span class="icon-tile solid"><i [class]="p.icon"></i></span>
                                <span class="prod-no">0{{ i + 1 }}</span>
                            </div>
                            <div>
                                <h3>{{ p.name }}</h3>
                                <span class="prod-ind">{{ p.industry }}</span>
                            </div>
                            <p>{{ p.short }}</p>
                            <ul>
                                @for (h of p.highlights; track h) { <li><i class="fas fa-circle-check"></i>{{ h }}</li> }
                            </ul>
                            <div class="prod-actions">
                                <a class="btn btn-dark btn-sm" [routerLink]="'/' + p.slug">Explore <i class="fas fa-arrow-right"></i></a>
                                @if (s().AcceptRequests)
                                {
                                    <a class="btn btn-sm" routerLink="/request" [queryParams]="{ type: s().DemoEnabled ? 'Demo' : 'Purchase', product: p.code }">Send an enquiry</a>
                                }
                            </div>
                        </div>
                    }
                </div>
            </div>
        </section>

        <!-- ================= PLATFORM ================= -->
        <section class="section" style="padding-top:0">
            <div class="container">
                <div class="section-head">
                    <span class="eyebrow">One platform underneath</span>
                    <h2 class="h2">What every AppCore product gives you.</h2>
                    <p class="lead">Whichever product you choose, the foundations are the same : your own address, your own database, and books that keep themselves.</p>
                </div>

                <div class="features">
                    @for (f of features; track f.title)
                    {
                        <div class="card feature">
                            <span class="icon-tile"><i [class]="f.icon"></i></span>
                            <h3>{{ f.title }}</h3>
                            <p>{{ f.text }}</p>
                        </div>
                    }
                </div>
            </div>
        </section>

        <!-- ================= YOUR DATA IS SAFE ================= -->
        <section class="section" style="padding-top:0">
            <div class="container">
                <div class="card safe">
                    <div class="safe-head">
                        <span class="icon-tile solid"><i class="fas fa-shield-halved"></i></span>
                        <span class="eyebrow">Security & privacy</span>
                        <h2 class="h2">Your data is safe with us.</h2>
                        <p>Every client has a database of its own, every connection is encrypted, and your data is never sold or shared. It belongs to you, and you can take a full copy whenever you want.</p>
                        <a class="btn btn-dark btn-sm" routerLink="/security" style="align-self:flex-start">How we protect your data <i class="fas fa-arrow-right"></i></a>
                    </div>
                    <div class="safe-list">
                        @for (x of safe; track x.title)
                        {
                            <div class="safe-item"><i [class]="x.icon"></i><div><b>{{ x.title }}</b><span>{{ x.text }}</span></div></div>
                        }
                    </div>
                </div>
            </div>
        </section>

        <!-- ================= HOW IT WORKS ================= -->
        <section class="section dark grid-lines">
            <div class="container" style="position:relative">
                <div class="section-head">
                    <span class="eyebrow">How it works</span>
                    <h2 class="h2">From first call to go-live.</h2>
                </div>
                <div class="steps">
                    @for (st of steps; track st.title; let i = $index)
                    {
                        <div class="step">
                            <span class="step-no">{{ i + 1 }}</span>
                            <h3>{{ st.title }}</h3>
                            <p>{{ st.text }}</p>
                        </div>
                    }
                </div>
            </div>
        </section>

        <div style="height:88px"></div>
        <site-cta />
    `
})
export class HomePage
{
    readonly site = inject(SiteService);

    readonly s = this.site.settings;

    readonly bars = [42, 58, 50, 72, 64, 80, 70, 92, 76, 88, 66, 96];

    readonly products = PRODUCTS;

    readonly features =
    [
        { icon: 'fas fa-code-branch', title: 'Every branch, one system', text: 'All showrooms, offices and sites in one place; switch branch in one click or see them all at once.' },
        { icon: 'fas fa-scale-balanced', title: 'Accounts that post themselves', text: 'Every sale, purchase and payment posts its own journal. Trial balance live, any day.' },
        { icon: 'fas fa-receipt', title: 'Tax for your country', text: 'VAT, GST or sales tax : tax invoices and tax payable in the format your authorities expect.' },
        { icon: 'fas fa-shield-halved', title: 'Roles and control', text: 'Each person sees only their own work. Approvals and a full history of who changed what.' },
        { icon: 'fas fa-globe', title: 'Your own web address', text: 'yourname.appcoretech.net : in the browser, on any computer, nothing to install.' },
        { icon: 'fas fa-database', title: 'Your own database', text: 'Every client has a database of its own, backed up every night and never shared.' },
        { icon: 'fas fa-comments', title: 'Team chat built in', text: 'Talk to colleagues inside the system, branch by branch.' },
        { icon: 'fas fa-rocket', title: 'Always improving', text: 'New features arrive on your address without reinstalling anything.' }
    ];

    readonly safe =
    [
        { icon: 'fas fa-database', title: 'Your own database', text: 'Never mixed with another company.' },
        { icon: 'fas fa-lock', title: 'Encrypted connection', text: 'HTTPS on every page and file.' },
        { icon: 'fas fa-key', title: 'Passwords never stored', text: 'Only a salted one-way hash.' },
        { icon: 'fas fa-user-lock', title: 'Login lock', text: 'Repeated wrong passwords are stopped.' },
        { icon: 'fas fa-user-shield', title: 'Roles and history', text: 'Who changed what, and when.' },
        { icon: 'fas fa-clock-rotate-left', title: 'Nightly backups', text: 'Restorable if anything goes wrong.' }
    ];

    readonly steps =
    [
        { title: 'Request', text: 'Send the form or call us. We reply within one working day.' },
        { title: 'Walk-through', text: 'A guided online session built around your own business and data.' },
        { title: 'Setup', text: 'Your address yourname.appcoretech.net, your data moved, your staff trained.' },
        { title: 'Go live', text: 'Start working on day one, with a support team that knows your industry.' }
    ];

    toProducts(e: Event): void
    {
        e.preventDefault();

        document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // the last two words of the title in copper
    titleStart(): string
    {
        const w = this.s().HeroTitle.trim().split(/\s+/);

        return w.length > 3 ? w.slice(0, -2).join(' ') : '';
    }

    titleEnd(): string
    {
        const w = this.s().HeroTitle.trim().split(/\s+/);

        return w.length > 3 ? w.slice(-2).join(' ') : w.join(' ');
    }
}
