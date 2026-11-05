//===============================================================
// Website : EMI estimate
// --------------------------------------------------------------
// Pick a down payment and months; the monthly amount updates.
// On the home page the visitor picks a bike (bikes with a
// price); on a bike page the price is given. With no price at
// all the company's example price is used. Plain division : an
// estimate, clearly labelled.
//===============================================================

import
{
    Component,
    computed,
    inject,
    input,
    signal
}
from '@angular/core';

import
{
    RouterLink
}
from '@angular/router';

import
{
    WebsiteContent
}
from '../../../../core/website/website.models';

import
{
    WebsiteDataService
}
from '../../../../core/website/website-data.service';

import
{
    formatPrice,
    scrollToSection,
    whatsAppLink
}
from '../../../../core/website/website-links';


@Component(
{
    selector:'app-emi-estimator',
    standalone:true,
    imports:
    [
        RouterLink
    ],
    templateUrl:'./emi-estimator.html',
    styleUrls:
    [
        '../website-section.css',
        './emi-estimator.css'
    ]
})
export class EmiEstimatorComponent
{
    // Section wording (Website Configuration › Texts & Offer)
    private readonly wording =
        inject(WebsiteDataService);

    t
    (
        key:
            string
    ):
        string
    {
        return this.wording.text(key);
    }

    readonly content =
        input.required<WebsiteContent>();

    // Fixed bike (detail page); empty = let the visitor pick
    readonly bikeSlug =
        input('');

    readonly downIndex =
        signal(1);

    readonly monthIndex =
        signal(2);

    readonly picked =
        signal('');

    // Bikes that have a price
    readonly priced =
        computed(
            () =>
                this.content().bikes.filter(x => x.price !== null)
        );

    readonly bike =
        computed(
            () =>
            {
                const slug =
                    this.bikeSlug() || this.picked();

                return this.content().bikes.find(x => x.slug === slug && x.price !== null)
                    ?? (this.bikeSlug() ? null : this.priced()[0] ?? null);
            }
        );

    readonly price =
        computed(
            () =>
                this.bike()?.price ?? this.content().emi.examplePrice
        );

    readonly downs =
        computed(
            () =>
                this.content().emi.downPercents
        );

    readonly months =
        computed(
            () =>
                this.content().emi.months
        );

    readonly down =
        computed(
            () =>
            {
                const pct =
                    this.downs()[Math.min(this.downIndex(), this.downs().length - 1)] ?? 0;

                return Math.round(this.price() * pct / 100);
            }
        );

    readonly tenure =
        computed(
            () =>
                this.months()[Math.min(this.monthIndex(), this.months().length - 1)] ?? 12
        );

    readonly monthly =
        computed(
            () =>
                Math.round((this.price() - this.down()) / this.tenure())
        );

    readonly ask =
        computed(
            () =>
            {
                const model =
                    this.bike()?.model ?? 'a bike';

                return whatsAppLink(
                    this.content().company.whatsApp,
                    `I'd like an EMI plan for ${model}: ${this.tenure()} months`);
            }
        );

    // Ask for an EMI plan : the Enquire form (bike + plan), when
    // the bike comes from the ERP; else WhatsApp (ask)
    readonly downPercent =
        computed(
            () =>
                this.downs()[Math.min(this.downIndex(), this.downs().length - 1)] ?? 0
        );

    readonly enquire =
        computed(
            () =>
            {
                const b =
                    this.bike();

                return b?.code
                    ? { bike:b.slug, emi:`${this.downPercent()}-${this.tenure()}` }
                    : null;
            }
        );

    readonly money =
        formatPrice;

    pickBike
    (
        event:
            Event
    ):
        void
    {
        this.picked.set((event.target as HTMLSelectElement).value);
    }

    testRide():
        void
    {
        scrollToSection('test-ride');
    }
}
