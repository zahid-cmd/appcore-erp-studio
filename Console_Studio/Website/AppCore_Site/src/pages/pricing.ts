import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SiteService } from '../core/site.service';

@Component({
    selector: 'site-pricing',
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        .top { padding: 72px 0 140px; text-align: center; }
        .top h1 { margin: 16px auto 14px; max-width: 760px; color: #fff; font-size: clamp(34px, 4.4vw, 54px); font-weight: 800; letter-spacing: -0.04em; line-height: 1.06; }
        .top .lead { max-width: 600px; margin: 0 auto; }
        .plans { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: -100px; }
        .plan { position: relative; display: flex; flex-direction: column; gap: 18px; padding: 30px 28px; }
        .plan.hi { border: 0; background: linear-gradient(180deg, var(--s-carbon-2), var(--s-carbon)); color: var(--s-on-dark); box-shadow: var(--s-shadow-lg); transform: translateY(-12px); }
        .badge { position: absolute; top: -13px; left: 50%; padding: 5px 14px; border-radius: 999px; background: var(--s-brand); color: #fff; font-size: 11.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; transform: translateX(-50%); }
        .plan h3 { color: var(--s-text); font-size: 20px; font-weight: 800; }
        .plan.hi h3 { color: #fff; }
        .tag { margin-top: 4px; color: var(--s-muted); font-size: 14px; }
        .plan.hi .tag { color: var(--s-on-dark-2); }
        .price { display: flex; align-items: baseline; gap: 6px; }
        .price b { color: var(--s-text); font-size: 34px; font-weight: 800; letter-spacing: -0.03em; }
        .price b.req { font-size: 28px; }
        .plan.hi .price b { color: #fff; }
        .price span { color: var(--s-muted); font-size: 14px; }
        .setup { margin-top: -10px; color: var(--s-muted); font-size: 13px; }
        .limits { display: flex; gap: 10px; }
        .limits span { flex: 1; padding: 10px 12px; border: 1px solid var(--s-line-2); border-radius: 12px; font-size: 12.5px; }
        .limits b { display: block; color: var(--s-text); font-size: 14.5px; }
        .plan.hi .limits span { border-color: rgba(255, 255, 255, 0.1); color: var(--s-on-dark-2); }
        .plan.hi .limits b { color: #fff; }
        ul { display: flex; flex: 1; flex-direction: column; gap: 10px; margin: 0; padding: 0; list-style: none; }
        li { display: flex; gap: 10px; color: var(--s-text-2); font-size: 14.5px; }
        .plan.hi li { color: var(--s-on-dark); }
        li i { margin-top: 4px; color: var(--s-copper); font-size: 13px; }
        .plan.hi li i { color: var(--s-copper-2); }
        .note { margin-top: 26px; color: var(--s-muted); font-size: 13.5px; text-align: center; }
        .faq { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; max-width: 980px; margin: 0 auto; }
        .q { padding: 0; overflow: hidden; }
        .q button { display: flex; align-items: center; gap: 12px; width: 100%; padding: 18px 20px; border: 0; background: none; color: var(--s-text); font: inherit; font-weight: 700; text-align: left; cursor: pointer; }
        .q button i { margin-left: auto; color: var(--s-copper); transition: transform 0.2s; }
        .q.open button i { transform: rotate(45deg); }
        .q p { padding: 0 20px 18px; color: var(--s-muted); font-size: 14px; }
        .empty { padding: 40px; text-align: center; }
        @media (max-width: 760px) { .faq { grid-template-columns: minmax(0, 1fr); } .plan.hi { transform: none; } }
    `],
    template: `
        <section class="top dark grid-lines">
            <div class="container" style="position:relative">
                <span class="eyebrow rise">Pricing</span>
                <h1 class="rise d1">Simple plans that grow with your business.</h1>
                <p class="lead rise d2">Every plan includes your own web address, updates, daily backups and support from people who know your industry.</p>
            </div>
        </section>

        <div class="container">
            <div class="plans">
                @for (p of s().Plans; track p.Code)
                {
                    <div class="card plan" [class.hi]="p.Highlight">
                        @if (p.Highlight) { <span class="badge">Most popular</span> }
                        <div>
                            <h3>{{ p.Name }}</h3>
                            @if (p.Tagline) { <p class="tag">{{ p.Tagline }}</p> }
                        </div>

                        <div class="price">
                            <b [class.req]="p.MonthlyPrice === null">{{ site.price(p.MonthlyPrice) }}</b>
                            @if (p.MonthlyPrice !== null) { <span>/ month</span> }
                        </div>
                        @if (p.SetupFee !== null) { <span class="setup">+ {{ site.price(p.SetupFee) }} one-time setup</span> }

                        <div class="limits">
                            <span><b>{{ p.Branches || '-' }}</b>branches</span>
                            <span><b>{{ p.Users || '-' }}</b>users</span>
                        </div>

                        <ul>
                            @for (f of p.Features; track $index) { <li><i class="fas fa-check"></i>{{ f }}</li> }
                        </ul>

                        @if (s().AcceptRequests && s().PurchaseEnabled)
                        {
                            <a class="btn" [class.btn-primary]="p.Highlight" [class.btn-dark]="!p.Highlight" routerLink="/request" [queryParams]="{ type: 'Purchase', plan: p.Code }">
                                {{ p.MonthlyPrice === null ? 'Get a quote' : 'Choose ' + p.Name }} <i class="fas fa-arrow-right"></i>
                            </a>
                        }
                        @else
                        {
                            <a class="btn" routerLink="/contact">Talk to us</a>
                        }
                    </div>
                }
                @empty
                {
                    <div class="card empty">Plans are being updated. <a routerLink="/contact">Talk to us</a> for a quote.</div>
                }
            </div>

            @if (s().PricingNote) { <p class="note">{{ s().PricingNote }}</p> }
        </div>

        <section class="section">
            <div class="container">
                <div class="section-head">
                    <span class="eyebrow">Questions</span>
                    <h2 class="h2">Good to know.</h2>
                </div>
                <div class="faq">
                    @for (f of faq; track f.q; let i = $index)
                    {
                        <div class="card q" [class.open]="openQ() === i">
                            <button type="button" (click)="openQ.set(openQ() === i ? -1 : i)">{{ f.q }}<i class="fas fa-plus"></i></button>
                            @if (openQ() === i) { <p>{{ f.a }}</p> }
                        </div>
                    }
                </div>
            </div>
        </section>
    `
})
export class PricingPage
{
    readonly site = inject(SiteService);

    readonly s = this.site.settings;

    readonly openQ = signal(0);

    readonly faq =
    [
        { q: 'Do I need to install anything?', a: 'No. AppCore runs in the browser on your own address (yourname.appcoretech.net). Any computer, any branch.' },
        { q: 'Can you move my old data?', a: 'Yes. Setup includes moving your products, stock, customers and opening balances from your current system or spreadsheets.' },
        { q: 'Is my data separate from other companies?', a: 'Yes. Every company gets its own database; no other customer can see or touch it.' },
        { q: 'Can I add branches later?', a: 'Any time. Move up a plan and the new branch is ready the same day.' },
        { q: 'What about training?', a: 'We train your staff online during setup (on site where we can reach you), and support continues by phone, chat and email.' },
        { q: 'Can I try it first?', a: 'Send us an enquiry. We walk you through it with your own data before you decide.' }
    ];
}
