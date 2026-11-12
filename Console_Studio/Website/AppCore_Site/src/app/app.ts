import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { SiteService } from '../core/site.service';
import { SiteHeader } from '../layout/site-header';
import { SiteFooter } from '../layout/site-footer';

@Component({
    selector: 'site-root',
    imports: [RouterOutlet, RouterLink, SiteHeader, SiteFooter],
    styles: [`
        .announce { position: relative; z-index: 31; padding: 9px 16px; background: var(--s-brand); color: #fff; font-size: 13px; font-weight: 600; text-align: center; }
        .announce a { margin-left: 10px; color: #fff; text-decoration: underline; text-underline-offset: 3px; }
        main { min-height: 60vh; }
    `],
    template: `
        @if (site.settings().AnnouncementOn && site.settings().AnnouncementText)
        {
            <div class="announce">
                <i class="fas fa-bullhorn"></i> {{ site.settings().AnnouncementText }}
                @if (site.settings().AcceptRequests) { <a routerLink="/request">Book a demo</a> }
            </div>
        }

        <site-header />

        <main>
            <router-outlet />
        </main>

        <site-footer />
    `
})
export class App
{
    readonly site = inject(SiteService);
}
