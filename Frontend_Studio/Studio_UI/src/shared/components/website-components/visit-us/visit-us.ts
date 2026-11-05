//===============================================================
// Website : Visit us (opening hours, contact, Google map)
// --------------------------------------------------------------
// Sits above the footer on every website page (id "visit"; the
// header's Contact item scrolls here). Left : opening hours
// (day by day, else the one-line hours), address, hotline,
// WhatsApp, email and Get directions. Right : a Google map of
// the company (mapQuery, else name + address).
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
    DomSanitizer,
    SafeResourceUrl
}
from '@angular/platform-browser';

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
    mailLink,
    telLink,
    whatsAppLink
}
from '../../../../core/website/website-links';


@Component(
{
    selector:'app-visit-us',
    standalone:true,
    templateUrl:'./visit-us.html',
    styleUrls:
    [
        '../website-section.css',
        './visit-us.css'
    ]
})
export class VisitUsComponent
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

    private readonly sanitizer =
        inject(DomSanitizer);

    readonly company =
        computed(
            () =>
                this.content().company
        );

    // Day by day, else the one-line hours as a single row
    readonly hours =
        computed(
            () =>
            {
                const c =
                    this.company();

                if
                (
                    c.openingHours.length
                )
                {
                    return c.openingHours;
                }

                return c.hours
                    ? [{ days:'Opening hours', time:c.hours }]
                    : [];
            }
        );

    private readonly query =
        computed(
            () =>
            {
                const c =
                    this.company();

                return c.mapQuery
                    || [c.name, c.address].filter(Boolean).join(', ');
            }
        );

    // Google's keyless embed; trusted because the address is ours
    readonly mapSrc =
        computed<SafeResourceUrl | null>(
            () =>
            {
                const q =
                    this.query();

                return q
                    ? this.sanitizer.bypassSecurityTrustResourceUrl(
                        `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`
                    )
                    : null;
            }
        );

    readonly links =
        computed(
            () =>
            {
                const c =
                    this.company();

                const q =
                    this.query();

                return {
                    call:telLink(c.hotline),
                    whatsApp:whatsAppLink(c.whatsApp, 'Hello'),
                    mail:mailLink(c.email),
                    directions:q
                        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`
                        : ''
                };
            }
        );
}
