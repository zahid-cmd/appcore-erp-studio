//===============================================================
// Website : Offer strip (hidden after its end date)
//===============================================================

import
{
    Component,
    computed,
    input
}
from '@angular/core';

import
{
    WebsiteCompany,
    WebsiteOffer
}
from '../../../../core/website/website.models';

import
{
    whatsAppLink
}
from '../../../../core/website/website-links';


@Component(
{
    selector:'app-offer-strip',
    standalone:true,
    templateUrl:'./offer-strip.html',
    styleUrl:'./offer-strip.css'
})
export class OfferStripComponent
{
    readonly offer =
        input.required<WebsiteOffer>();

    readonly company =
        input.required<WebsiteCompany>();

    readonly endsText =
        computed(
            () =>
            {
                const value =
                    this.offer().endsOn;

                const date =
                    new Date(`${value}T00:00:00`);

                return value && !isNaN(date.getTime())
                    ? date.toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })
                    : '';
            }
        );

    readonly askLink =
        computed(
            () =>
                whatsAppLink(this.company().whatsApp, `About your offer: ${this.offer().title}`)
        );
}
