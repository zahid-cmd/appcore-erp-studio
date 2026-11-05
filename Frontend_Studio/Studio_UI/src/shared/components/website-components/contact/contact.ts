//===============================================================
// Website : Test-ride band ("Feel it before you buy it")
// --------------------------------------------------------------
// Book online (the Enquire form in test ride mode, saved in the
// ERP as a sales enquiry), WhatsApp and call.
//===============================================================

import
{
    Component,
    computed,
    inject,
    input
}
from '@angular/core';

import
{
    RouterLink
}
from '@angular/router';

import
{
    WebsiteCompany
}
from '../../../../core/website/website.models';

import
{
    WebsiteDataService
}
from '../../../../core/website/website-data.service';

import
{
    telLink,
    whatsAppLink
}
from '../../../../core/website/website-links';


@Component(
{
    selector:'app-contact',
    standalone:true,
    imports:
    [
        RouterLink
    ],
    templateUrl:'./contact.html',
    styleUrls:
    [
        '../website-section.css',
        './contact.css'
    ]
})
export class ContactComponent
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

    readonly company =
        input.required<WebsiteCompany>();

    // Model to name in the message (bike pages)
    readonly model =
        input('');

    // Bike page : its slug, so the form opens on that bike
    readonly bikeSlug =
        input('');

    readonly rideQuery =
        computed(
            () =>
            ({
                type:'test-ride',
                bike:this.bikeSlug() || null
            })
        );

    readonly book =
        computed(
            () =>
                whatsAppLink(
                    this.company().whatsApp,
                    this.model()
                        ? `I'd like a test ride of ${this.model()}`
                        : `I'd like to book a test ride`)
        );

    readonly call =
        computed(
            () =>
                telLink(this.company().hotline)
        );
}
