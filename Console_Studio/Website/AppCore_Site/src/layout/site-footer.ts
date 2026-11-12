import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PRODUCTS } from '../core/products';
import { SiteService } from '../core/site.service';

@Component({
    selector: 'site-footer',
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        footer { padding: 64px 0 28px; }
        .ft { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1.2fr; gap: 40px; }
        .brand { display: inline-block; margin-bottom: 18px; }
        .brand img { display: block; width: auto; height: 44px; }
        .about { max-width: 320px; color: var(--s-on-dark-2); font-size: 14px; }
        h4 { margin-bottom: 14px; color: #f0b88c; font-size: 11.5px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; }
        ul { display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 0; list-style: none; }
        li, li a { color: var(--s-on-dark-2); font-size: 14px; }
        li a:hover { color: #fff; }
        li i { width: 18px; margin-right: 8px; color: var(--s-copper-2); }
        .social { display: flex; gap: 10px; margin-top: 18px; }
        .social a { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 11px; color: var(--s-on-dark); transition: background 0.15s, border-color 0.15s; }
        .social a:hover { border-color: var(--s-copper-2); background: rgba(216, 131, 74, 0.12); }
        .bottom { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; margin-top: 48px; padding-top: 22px; border-top: 1px solid rgba(255, 255, 255, 0.08); color: #7d8189; font-size: 13px; }
        @media (max-width: 900px) { .ft { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 560px) { .ft { grid-template-columns: 1fr; } }
    `],
    template: `
        <footer class="dark">
            <div class="container">
                <div class="ft">
                    <div>
                        <a class="brand" routerLink="/"><img src="/brand/appcore-logo-dark.svg" [alt]="site.settings().CompanyName" width="239" height="44"></a>
                        <p class="about">{{ site.settings().Tagline }}</p>
                        <div class="social">
                            @if (site.settings().Facebook; as u) { <a [href]="u" target="_blank" rel="noopener" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a> }
                            @if (site.settings().LinkedIn; as u) { <a [href]="u" target="_blank" rel="noopener" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a> }
                            @if (site.settings().YouTube; as u) { <a [href]="u" target="_blank" rel="noopener" aria-label="YouTube"><i class="fab fa-youtube"></i></a> }
                            @if (site.whatsAppUrl(); as u) { <a [href]="u" target="_blank" rel="noopener" aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a> }
                        </div>
                    </div>

                    <div>
                        <h4>Products</h4>
                        <ul>
                            @for (p of products; track p.slug) { <li><a [routerLink]="'/' + p.slug">{{ p.name }}</a></li> }
                        </ul>
                    </div>

                    <div>
                        <h4>Company</h4>
                        <ul>
                            <li><a routerLink="/about">About</a></li>
                            <li><a routerLink="/security">Security & privacy</a></li>
                            @if (site.settings().ShowPricing) { <li><a routerLink="/pricing">Pricing</a></li> }
                            <li><a routerLink="/contact">Contact</a></li>
                            @if (site.settings().AcceptRequests) { <li><a routerLink="/request">Book a demo</a></li> }
                        </ul>
                    </div>

                    <div>
                        <h4>Reach us</h4>
                        <ul>
                            @if (site.settings().Phone; as v) { <li><i class="fas fa-phone"></i><a [href]="site.phoneUrl()">{{ v }}</a></li> }
                            @if (site.settings().Email; as v) { <li><i class="fas fa-envelope"></i><a [href]="'mailto:' + v">{{ v }}</a></li> }
                            @if (site.settings().Address; as v) { <li><i class="fas fa-location-dot"></i>{{ v }}</li> }
                            @if (site.settings().OfficeHours; as v) { <li><i class="fas fa-clock"></i>{{ v }}</li> }
                        </ul>
                    </div>
                </div>

                <div class="bottom">
                    <span>&copy; {{ site.year }} {{ site.settings().CompanyName }}. All rights reserved.</span>
                    <span>Business software, across borders</span>
                </div>
            </div>
        </footer>
    `
})
export class SiteFooter
{
    readonly site = inject(SiteService);

    readonly products = PRODUCTS;
}
