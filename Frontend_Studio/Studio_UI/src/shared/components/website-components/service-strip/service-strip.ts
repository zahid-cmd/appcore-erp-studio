//===============================================================
// Website : Service, parts & care (image cards)
// "Book a service" / "Ask for a part" open the enquire form
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
    telLink
}
from '../../../../core/website/website-links';


@Component(
{
    selector:'app-service-strip',
    standalone:true,
    imports:
    [
        RouterLink
    ],
    templateUrl:'./service-strip.html',
    styleUrls:
    [
        '../website-section.css',
        './service-strip.css'
    ]
})
export class ServiceStripComponent
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

    readonly call =
        computed(
            () =>
                telLink(this.content().company.hotline)
        );
}
