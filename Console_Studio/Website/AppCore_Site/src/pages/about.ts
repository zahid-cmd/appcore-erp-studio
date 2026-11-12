import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { SiteService } from '../core/site.service';
import { CtaBand } from '../layout/cta-band';

@Component({
    selector: 'site-about',
    imports: [CtaBand],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        .top { padding: 76px 0 80px; }
        .top h1 { max-width: 820px; margin: 16px 0 0; color: #fff; font-size: clamp(34px, 4.6vw, 56px); font-weight: 800; letter-spacing: -0.04em; line-height: 1.06; }
        .story { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 56px; align-items: start; }
        .story-text { display: flex; flex-direction: column; gap: 18px; color: var(--s-text-2); font-size: 17px; line-height: 1.8; }
        .facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
        .fact { padding: 22px; }
        .fact b { display: block; color: var(--s-text); font-size: 24px; font-weight: 800; letter-spacing: -0.02em; }
        .fact span { color: var(--s-muted); font-size: 13.5px; }
        .values { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
        .value { display: flex; flex-direction: column; gap: 12px; padding: 24px; }
        .value h3 { color: var(--s-text); font-size: 16.5px; font-weight: 800; }
        .value p { color: var(--s-muted); font-size: 14px; }
        @media (max-width: 960px) { .story { grid-template-columns: minmax(0, 1fr); } .values { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 560px) { .values, .facts { grid-template-columns: minmax(0, 1fr); } }
    `],
    template: `
        <section class="top dark grid-lines">
            <div class="container" style="position:relative">
                <span class="eyebrow rise">About {{ s().CompanyName }}</span>
                <h1 class="rise d1">{{ s().AboutTitle }}</h1>
            </div>
        </section>

        <section class="section">
            <div class="container story">
                <div class="story-text">
                    @for (p of paragraphs(); track $index) { <p>{{ p }}</p> }
                </div>
                <div class="facts">
                    <div class="card fact"><b>4</b><span>Products : automobiles, two wheelers, real estate, consultancy</span></div>
                    <div class="card fact"><b>1</b><span>Database per client : yours alone</span></div>
                    <div class="card fact"><b>Any country</b><span>Tax, currency and registration set up for yours</span></div>
                    <div class="card fact"><b>Web</b><span>Runs in the browser : any branch, any computer</span></div>
                </div>
            </div>
        </section>

        <section class="section" style="padding-top:0">
            <div class="container">
                <div class="section-head">
                    <span class="eyebrow">How we work</span>
                    <h2 class="h2">What you can expect from us.</h2>
                </div>
                <div class="values">
                    @for (v of values; track v.title)
                    {
                        <div class="card value">
                            <span class="icon-tile"><i [class]="v.icon"></i></span>
                            <h3>{{ v.title }}</h3>
                            <p>{{ v.text }}</p>
                        </div>
                    }
                </div>
            </div>
        </section>

        <site-cta />
    `
})
export class AboutPage
{
    readonly site = inject(SiteService);

    readonly s = this.site.settings;

    readonly paragraphs = computed(() => this.s().AboutText.split(/\n\s*\n/).map(x => x.trim()).filter(x => !!x));

    readonly values =
    [
        { icon: 'fas fa-store', title: 'Shop-floor first', text: 'Features come from real counters and real accounts desks, not a slide deck.' },
        { icon: 'fas fa-lock', title: 'Your data, kept apart', text: 'Each client has its own database, backed up and never shared.' },
        { icon: 'fas fa-headset', title: 'People who answer', text: 'Support that knows your industry, your tax and your paperwork.' },
        { icon: 'fas fa-rocket', title: 'Always improving', text: 'Updates arrive on your address without reinstalling anything.' }
    ];
}
