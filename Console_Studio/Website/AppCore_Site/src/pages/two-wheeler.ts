import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SiteService } from '../core/site.service';
import { CtaBand } from '../layout/cta-band';

@Component({
    selector: 'site-two-wheeler',
    imports: [RouterLink, CtaBand],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        .top { padding: 76px 0 84px; }
        .top-in { position: relative; display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); align-items: end; gap: 40px; }
        .top h1 { margin: 16px 0 16px; color: #fff; font-size: clamp(34px, 4.6vw, 56px); font-weight: 800; letter-spacing: -0.04em; line-height: 1.05; }
        .top-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
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
        @media (max-width: 960px) { .top-in, .mod { grid-template-columns: minmax(0, 1fr); } .chips { justify-content: flex-start; } .mod-head { position: static; } .local { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 560px) { .points, .local { grid-template-columns: minmax(0, 1fr); } }
    `],
    template: `
        <section class="top dark grid-lines">
            <div class="container top-in">
                <div>
                    <span class="eyebrow rise">AppCore Two Wheeler</span>
                    <h1 class="rise d1">Dealer management software for motorcycle and scooter dealers.</h1>
                    <p class="lead rise d2">Built inside a working motorcycle dealership : every screen follows how bikes are really booked, sold, delivered, registered and accounted for, in one showroom or fifty.</p>
                    <div class="top-actions rise d3">
                        @if (s().AcceptRequests && s().DemoEnabled)
                        {
                            <a class="btn btn-primary" routerLink="/request" [queryParams]="{ type: 'Demo', product: 'TWO-WHEELER' }"><i class="fas fa-calendar-check"></i> Book a free demo</a>
                        }
                        @if (s().ShowPricing) { <a class="btn btn-ghost-dark" routerLink="/pricing">See plans</a> }
                    </div>
                </div>
                <div class="chips rise d2">
                    @for (m of modules; track m.id) { <span><i [class]="m.icon"></i>{{ m.title }}</span> }
                </div>
            </div>
        </section>

        <div class="jump">
            <div class="container jump-in">
                @for (m of modules; track m.id) { <a [href]="'/two-wheeler#' + m.id" (click)="go($event, m.id)">{{ m.title }}</a> }
            </div>
        </div>

        <div class="container">
            @for (m of modules; track m.id)
            {
                <section class="mod" [id]="m.id">
                    <div class="mod-head">
                        <span class="icon-tile solid"><i [class]="m.icon"></i></span>
                        <h2>{{ m.title }}</h2>
                        <p>{{ m.text }}</p>
                    </div>
                    <div class="points">
                        @for (p of m.points; track p.t)
                        {
                            <div class="card point"><i class="fas fa-circle-check"></i><div><b>{{ p.t }}</b><span>{{ p.d }}</span></div></div>
                        }
                    </div>
                </section>
            }
        </div>

        <section class="section dark grid-lines">
            <div class="container" style="position:relative">
                <div class="section-head">
                    <span class="eyebrow">Your country, your rules</span>
                    <h2 class="h2">Set up for the way business is done where you are.</h2>
                    <p class="lead">Tax, vehicle registration, currency and document layouts are configured for your country during setup, so your invoices and returns look the way your authorities expect.</p>
                </div>
                <div class="local">
                    <div class="local-card"><span class="icon-tile carbon"><i class="fas fa-receipt"></i></span><b>VAT, GST or sales tax</b><span>Tax invoices, tax payable and tax payments posted with each sale, in your country's format.</span></div>
                    <div class="local-card"><span class="icon-tile carbon"><i class="fas fa-id-card"></i></span><b>Vehicle registration</b><span>The forms and papers your registration authority asks for, tracked for every chassis.</span></div>
                    <div class="local-card"><span class="icon-tile carbon"><i class="fas fa-building-columns"></i></span><b>Tax numbers</b><span>Business and tax registration numbers on customers, suppliers and every document that needs them.</span></div>
                    <div class="local-card"><span class="icon-tile carbon"><i class="fas fa-coins"></i></span><b>Your currency</b><span>Prices, instalments and accounts in your own currency and number format.</span></div>
                </div>
            </div>
        </section>

        <div style="height:88px"></div>
        <site-cta />
    `
})
export class TwoWheelerPage
{
    readonly site = inject(SiteService);

    readonly s = this.site.settings;

    readonly modules =
    [
        {
            id: 'sales', icon: 'fas fa-file-invoice-dollar', title: 'Sales & bookings',
            text: 'Sell motorcycles, scooters, spare parts and accessories from one screen, with the right price card, discounts and gifts.',
            points:
            [
                { t: 'One invoice for everything', d: 'Bikes, spare parts and accessories together.' },
                { t: 'Quotations and returns', d: 'Quote, convert to a sale, return with stock back.' },
                { t: 'Bookings', d: 'Advances, collections and cancellations.' },
                { t: 'Instalments', d: 'Instalment sales with schedules and dues.' },
                { t: 'Discounts and gifts', d: 'Campaign and special discounts, free accessories.' },
                { t: 'Corporate sales', d: 'Companies, fleets and institutions.' }
            ]
        },
        {
            id: 'stock', icon: 'fas fa-truck-ramp-box', title: 'Purchase & stock',
            text: 'Receive bikes with chassis and engine numbers and always know what is where.',
            points:
            [
                { t: 'Receiving', d: 'Against the purchase, unit by unit.' },
                { t: 'CKD kits', d: 'Knocked-down kits and their documents.' },
                { t: 'PDI and deliveries', d: 'Pre-delivery inspection before a bike leaves.' },
                { t: 'Branch transfers', d: 'Stock moved between showrooms and stores.' },
                { t: 'Models and specifications', d: 'Every model, colour and spec in one catalogue.' },
                { t: 'Live stock', d: 'By branch, model and colour, at any moment.' }
            ]
        },
        {
            id: 'parts', icon: 'fas fa-gears', title: 'Spare parts',
            text: 'A parts counter that knows which part fits which bike.',
            points:
            [
                { t: 'Parts catalogue', d: 'Part numbers, prices and pictures.' },
                { t: 'Fitments', d: 'Which part fits which model.' },
                { t: 'Counter sales', d: 'Fast sales for walk-in customers and mechanics.' },
                { t: 'Stock by branch', d: 'Reorder before you run out.' }
            ]
        },
        {
            id: 'registration', icon: 'fas fa-id-card', title: 'Registration',
            text: 'From sale to number plate : every step and every paper, per chassis.',
            points:
            [
                { t: 'Registration forms', d: 'Filled from the sale, ready to print.' },
                { t: 'Documents portal', d: 'Tax documents, letters and receipts in one place.' },
                { t: 'Registration on sale', d: 'Fees collected with the invoice.' },
                { t: 'Status at a glance', d: 'What is pending, with whom, since when.' }
            ]
        },
        {
            id: 'accounts', icon: 'fas fa-scale-balanced', title: 'Accounts & tax',
            text: 'Every sale, purchase and payment posts its own journal : the books are always up to date.',
            points:
            [
                { t: 'Vouchers and journals', d: 'Receipts, payments, transfers and journals.' },
                { t: 'Trial balance', d: 'Live, by branch and financial year.' },
                { t: 'Tax payable', d: 'Posted with each sale; payments recorded.' },
                { t: 'Other income', d: 'Kept apart from sales, correctly.' }
            ]
        },
        {
            id: 'customers', icon: 'fas fa-users', title: 'Customers',
            text: 'Know every buyer and every enquiry, and follow up on time.',
            points:
            [
                { t: 'Customer files', d: 'Papers and history in one file.' },
                { t: 'Enquiries', d: 'Walk-ins and calls saved as leads.' },
                { t: 'Follow-ups', d: 'Reminders so no lead goes cold.' },
                { t: 'Team chat', d: 'Talk inside the system, by branch.' }
            ]
        },
        {
            id: 'control', icon: 'fas fa-shield-halved', title: 'Control',
            text: 'The owner decides how the business runs; the system makes it stick.',
            points:
            [
                { t: 'Roles', d: 'Each person sees only their own work.' },
                { t: 'Business rules', d: 'Turn rules on or off without new software.' },
                { t: 'Branches', d: 'Switch branch in one click, or see all at once.' },
                { t: 'Activity history', d: 'Who changed what, and when.' }
            ]
        }
    ];

    go(e: Event, id: string): void
    {
        e.preventDefault();

        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
