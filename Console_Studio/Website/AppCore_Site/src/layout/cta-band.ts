import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { productByCode } from '../core/products';
import { SiteService } from '../core/site.service';

// "See it with your own data" band near the end of a page
@Component({
    selector: 'site-cta',
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        :host { display: block; padding: 0 0 88px; }
        .band { position: relative; display: grid; grid-template-columns: minmax(0, 1.5fr) auto; align-items: center; gap: 32px; padding: 52px 56px; border-radius: 26px; }
        .band .h2 { max-width: 620px; }
        .band p { max-width: 560px; margin-top: 12px; }
        .actions { position: relative; display: flex; flex-wrap: wrap; gap: 12px; }
        @media (max-width: 860px) { .band { grid-template-columns: minmax(0, 1fr); padding: 38px 26px; } }
    `],
    template: `
        <div class="container">
            <div class="band dark grid-lines">
                <div style="position:relative">
                    <span class="eyebrow">Ready when you are</span>
                    <h2 class="h2" style="margin-top:12px">{{ title() }}</h2>
                    <p class="lead">Tell us how your business works. We reply within one working day, with a guided walk-through built around your own data. No commitment.</p>
                </div>
                <div class="actions">
                    @if (site.settings().AcceptRequests && site.settings().DemoEnabled)
                    {
                        <a class="btn btn-primary" routerLink="/request" [queryParams]="{ type: 'Demo', product: product() || null }"><i class="fas fa-calendar-check"></i> Book a free demo</a>
                    }
                    @else if (site.settings().AcceptRequests && site.settings().PurchaseEnabled)
                    {
                        <a class="btn btn-primary" routerLink="/request" [queryParams]="{ type: 'Purchase', product: product() || null }"><i class="fas fa-paper-plane"></i> Send an enquiry</a>
                    }
                    @if (site.phoneUrl(); as tel)
                    {
                        <a class="btn btn-ghost-dark" [href]="tel"><i class="fas fa-phone"></i> {{ site.settings().Phone }}</a>
                    }
                    @else
                    {
                        <a class="btn btn-ghost-dark" routerLink="/contact"><i class="fas fa-envelope"></i> Contact us</a>
                    }
                </div>
            </div>
        </div>
    `
})
export class CtaBand
{
    readonly site = inject(SiteService);

    // product code when the band sits on a product page
    readonly product = input<string>('');

    readonly title = computed(() =>
    {
        const p = productByCode(this.product());

        return p ? `See ${p.name} working for your business.` : 'See your business running on AppCore.';
    });
}
