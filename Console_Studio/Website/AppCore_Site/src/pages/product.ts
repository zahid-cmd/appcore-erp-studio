import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PRODUCTS, productBySlug } from '../core/products';
import { SiteService } from '../core/site.service';
import { CtaBand } from '../layout/cta-band';

// One page per product : /automobiles, /two-wheelers, /real-estate, /consultancy
@Component({
    selector: 'site-product',
    imports: [RouterLink, CtaBand],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        .top { padding: 76px 0 84px; }
        .top-in { position: relative; display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); align-items: end; gap: 40px; }
        .top h1 { margin: 16px 0 16px; color: #fff; font-size: clamp(34px, 4.6vw, 56px); font-weight: 800; letter-spacing: -0.04em; line-height: 1.05; }
        .top-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
        .trust { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 22px; color: var(--s-on-dark-2); font-size: 13.5px; }
        .trust i { margin-right: 6px; color: #6fe3b0; }
        .trust a { color: #f0b88c; font-weight: 700; }
        .chips { position: relative; display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
        .chips span { padding: 9px 14px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; background: rgba(255, 255, 255, 0.04); color: var(--s-on-dark); font-size: 13.5px; font-weight: 600; }
        .chips i { margin-right: 8px; color: var(--s-copper-2); }

        .jump { position: sticky; top: 72px; z-index: 5; border-bottom: 1px solid var(--s-line); background: rgba(246, 245, 242, 0.92); backdrop-filter: blur(10px); }
        .jump-in { display: flex; gap: 6px; padding: 10px 0; overflow-x: auto; }
        .jump a { padding: 7px 14px; border-radius: 999px; color: var(--s-text-2); font-size: 13.5px; font-weight: 700; white-space: nowrap; }
        .jump a:hover { background: var(--s-copper-soft); color: var(--s-copper); }

        .mod { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: 48px; align-items: start; padding: 64px 0; border-bottom: 1px solid var(--s-line); scroll-margin-top: 130px; }
        .mod:last-child { border-bottom: 0; }
        .mod-head { position: sticky; top: 150px; display: flex; flex-direction: column; gap: 14px; }
        .mod-head h2 { color: var(--s-text); font-size: 28px; font-weight: 800; letter-spacing: -0.02em; }
        .mod-head p { color: var(--s-muted); }
        .points { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .point { display: flex; gap: 12px; padding: 18px; }
        .point i { margin-top: 3px; color: var(--s-copper); }
        .point b { display: block; color: var(--s-text); font-size: 14.5px; }
        .point span { color: var(--s-muted); font-size: 13.5px; }

        .local { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
        .local-card { display: flex; flex-direction: column; gap: 10px; padding: 22px; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; background: rgba(255, 255, 255, 0.03); }
        .local-card b { color: #fff; font-size: 16px; }
        .local-card span { color: var(--s-on-dark-2); font-size: 14px; }

        .others { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
        .other { display: flex; align-items: center; gap: 14px; padding: 20px; color: inherit; transition: border-color 0.15s, transform 0.15s; }
        .other:hover { border-color: var(--s-copper); transform: translateY(-2px); }
        .other b { display: block; color: var(--s-text); font-size: 15.5px; }
        .other span { color: var(--s-muted); font-size: 13px; }
        .other > i { margin-left: auto; color: var(--s-copper); }

        @media (max-width: 960px) { .top-in, .mod { grid-template-columns: minmax(0, 1fr); } .chips { justify-content: flex-start; } .mod-head { position: static; } .local { grid-template-columns: repeat(2, minmax(0, 1fr)); } .others { grid-template-columns: minmax(0, 1fr); } }
        @media (max-width: 560px) { .points, .local { grid-template-columns: minmax(0, 1fr); } }
    `],
    template: `
        <section class="top dark grid-lines">
            <div class="container top-in">
                <div>
                    <span class="eyebrow rise">{{ p().name }}</span>
                    <h1 class="rise d1">{{ p().heroTitle }}</h1>
                    <p class="lead rise d2">{{ p().heroText }}</p>
                    <div class="top-actions rise d3">
                        @if (s().AcceptRequests && s().DemoEnabled)
                        {
                            <a class="btn btn-primary" routerLink="/request" [queryParams]="{ type: 'Demo', product: p().code }"><i class="fas fa-calendar-check"></i> Book a free demo</a>
                        }
                        @else if (s().AcceptRequests && s().PurchaseEnabled)
                        {
                            <a class="btn btn-primary" routerLink="/request" [queryParams]="{ type: 'Purchase', product: p().code }"><i class="fas fa-paper-plane"></i> Send an enquiry</a>
                        }
                        @if (s().ShowPricing) { <a class="btn btn-ghost-dark" routerLink="/pricing">See plans</a> }
                    </div>
                    <div class="trust rise d3">
                        <span><i class="fas fa-shield-halved"></i>Separate database</span>
                        <span><i class="fas fa-lock"></i>Encrypted</span>
                        <span><i class="fas fa-clock-rotate-left"></i>Backed up nightly</span>
                        <a routerLink="/security">Security & privacy <i class="fas fa-arrow-right"></i></a>
                    </div>
                </div>
                <div class="chips rise d2">
                    @for (m of p().modules; track m.id) { <span><i [class]="m.icon"></i>{{ m.title }}</span> }
                </div>
            </div>
        </section>

        <div class="jump">
            <div class="container jump-in">
                @for (m of p().modules; track m.id) { <a [href]="'/' + p().slug + '#' + m.id" (click)="go($event, m.id)">{{ m.title }}</a> }
            </div>
        </div>

        <div class="container">
            @for (m of p().modules; track m.id)
            {
                <section class="mod" [id]="m.id">
                    <div class="mod-head">
                        <span class="icon-tile solid"><i [class]="m.icon"></i></span>
                        <h2>{{ m.title }}</h2>
                        <p>{{ m.text }}</p>
                    </div>
                    <div class="points">
                        @for (pt of m.points; track pt.t)
                        {
                            <div class="card point"><i class="fas fa-circle-check"></i><div><b>{{ pt.t }}</b><span>{{ pt.d }}</span></div></div>
                        }
                    </div>
                </section>
            }
        </div>

        <section class="section dark grid-lines">
            <div class="container" style="position:relative">
                <div class="section-head">
                    <span class="eyebrow">Your country, your rules</span>
                    <h2 class="h2">{{ p().localTitle }}</h2>
                    <p class="lead">{{ p().localText }}</p>
                </div>
                <div class="local">
                    @for (c of p().local; track c.title)
                    {
                        <div class="local-card"><span class="icon-tile carbon"><i [class]="c.icon"></i></span><b>{{ c.title }}</b><span>{{ c.text }}</span></div>
                    }
                </div>
            </div>
        </section>

        <section class="section">
            <div class="container">
                <div class="section-head">
                    <span class="eyebrow">More from AppCore</span>
                    <h2 class="h2">One platform, four industries.</h2>
                </div>
                <div class="others">
                    @for (o of others(); track o.slug)
                    {
                        <a class="card other" [routerLink]="'/' + o.slug">
                            <span class="icon-tile"><i [class]="o.icon"></i></span>
                            <span><b>{{ o.name }}</b><span>{{ o.industry }}</span></span>
                            <i class="fas fa-arrow-right"></i>
                        </a>
                    }
                </div>
            </div>
        </section>

        <site-cta [product]="p().code" />
    `
})
export class ProductPage
{
    readonly site = inject(SiteService);

    readonly s = this.site.settings;

    // from the route's data
    readonly slug = input<string>();

    readonly p = computed(() => productBySlug(this.slug()));

    readonly others = computed(() => PRODUCTS.filter(x => x.slug !== this.p().slug));

    go(e: Event, id: string): void
    {
        e.preventDefault();

        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
