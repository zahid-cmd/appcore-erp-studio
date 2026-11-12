import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SiteService } from '../core/site.service';

@Component({
    selector: 'site-contact',
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        .top { padding: 76px 0 130px; }
        .top h1 { max-width: 760px; margin: 16px 0 14px; color: #fff; font-size: clamp(34px, 4.6vw, 54px); font-weight: 800; letter-spacing: -0.04em; line-height: 1.06; }
        .grid { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; margin-top: -90px; }
        .way { display: flex; flex-direction: column; gap: 12px; padding: 26px; transition: transform 0.2s, box-shadow 0.2s; }
        a.way:hover { transform: translateY(-4px); box-shadow: var(--s-shadow-lg); }
        .way small { color: var(--s-muted); font-size: 12px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
        .way b { color: var(--s-text); font-size: 17px; font-weight: 800; overflow-wrap: anywhere; }
        .way span { color: var(--s-muted); font-size: 14px; }
        .form-cta { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 20px; margin-top: 28px; padding: 28px 30px; }
        .form-cta h3 { color: var(--s-text); font-size: 20px; font-weight: 800; }
        .form-cta p { color: var(--s-muted); }
        .none { padding: 26px; color: var(--s-muted); }
    `],
    template: `
        <section class="top dark grid-lines">
            <div class="container" style="position:relative">
                <span class="eyebrow rise">Contact</span>
                <h1 class="rise d1">Talk to the people who build it.</h1>
                <p class="lead rise d2">Questions about features, prices or moving your data : we are happy to help.</p>
            </div>
        </section>

        <section class="section" style="padding-top:0">
            <div class="container">
                <div class="grid">
                    @if (site.phoneUrl(); as tel)
                    {
                        <a class="card way" [href]="tel"><span class="icon-tile solid"><i class="fas fa-phone"></i></span><small>Call</small><b>{{ s().Phone }}</b><span>{{ s().OfficeHours }}</span></a>
                    }
                    @if (site.whatsAppUrl(); as wa)
                    {
                        <a class="card way" [href]="wa" target="_blank" rel="noopener"><span class="icon-tile"><i class="fab fa-whatsapp"></i></span><small>WhatsApp</small><b>Chat with us</b><span>Quick answers, any day</span></a>
                    }
                    @if (s().Email; as mail)
                    {
                        <a class="card way" [href]="'mailto:' + mail"><span class="icon-tile"><i class="fas fa-envelope"></i></span><small>Email</small><b>{{ mail }}</b><span>We reply within one working day</span></a>
                    }
                    @if (s().Address; as addr)
                    {
                        @if (s().MapUrl; as map)
                        {
                            <a class="card way" [href]="map" target="_blank" rel="noopener"><span class="icon-tile carbon"><i class="fas fa-location-dot"></i></span><small>Office</small><b>{{ addr }}</b><span>Open in Maps <i class="fas fa-arrow-up-right-from-square"></i></span></a>
                        }
                        @else
                        {
                            <div class="card way"><span class="icon-tile carbon"><i class="fas fa-location-dot"></i></span><small>Office</small><b>{{ addr }}</b><span>{{ s().OfficeHours }}</span></div>
                        }
                    }
                </div>

                @if (!s().Phone && !s().Email && !s().WhatsApp && !s().Address)
                {
                    <div class="card none">Our contact details are being updated. Please use the request form below.</div>
                }

                @if (s().AcceptRequests)
                {
                    <div class="card form-cta">
                        <div>
                            <h3>Prefer we call you?</h3>
                            <p>Send your details and pick a time for a demo.</p>
                        </div>
                        <a class="btn btn-primary" routerLink="/request"><i class="fas fa-paper-plane"></i> Send a request</a>
                    </div>
                }
            </div>
        </section>
    `
})
export class ContactPage
{
    readonly site = inject(SiteService);

    readonly s = this.site.settings;
}
