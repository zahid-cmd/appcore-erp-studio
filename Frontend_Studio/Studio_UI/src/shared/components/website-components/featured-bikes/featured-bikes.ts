//===============================================================
// Website : "Find your ride" (model grid with category filter)
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
    STOCK_LABELS,
    priceLabel,
    whatsAppLink
}
from '../../../../core/website/website-links';


@Component(
{
    selector:'app-featured-bikes',
    standalone:true,
    imports:
    [
        RouterLink
    ],
    templateUrl:'./featured-bikes.html',
    styleUrls:
    [
        '../website-section.css',
        './featured-bikes.css'
    ]
})
export class FeaturedBikesComponent
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

    // Leave out one bike (the one on its own detail page)
    readonly exclude =
        input('');

    readonly limit =
        input(0);

    readonly showFilter =
        input(true);

    readonly kicker =
        input('');

    readonly heading =
        input('');

    readonly category =
        signal('All');

    readonly brand =
        signal('All');

    // Brand filter only for a multi-brand company
    readonly brandNames =
        computed(
            () =>
            {
                const names =
                    this.content().brands.map(x => x.name);

                return names.length > 1
                    ? ['All', ...names]
                    : [];
            }
        );

    readonly multiBrand =
        computed(
            () =>
                this.content().brands.length > 1
        );

    readonly categories =
        computed(
            () =>
            {
                const names =
                    [...new Set(this.content().bikes.map(x => x.category).filter(Boolean))];

                return names.length > 1
                    ? ['All', ...names]
                    : [];
            }
        );

    readonly cards =
        computed(
            () =>
            {
                const c =
                    this.content();

                const cat =
                    this.category();

                const brand =
                    this.brand();

                let bikes =
                    c.bikes.filter
                    (
                        x =>
                            x.slug !== this.exclude()
                            &&
                            (cat === 'All' || x.category === cat)
                            &&
                            (brand === 'All' || x.brand === brand)
                    );

                if
                (
                    this.limit() > 0
                )
                {
                    bikes = bikes.slice(0, this.limit());
                }

                return bikes.map
                (
                    bike =>
                    ({
                        bike,
                        tag:[this.multiBrand() ? bike.brand : '', bike.category].filter(Boolean).join(' · '),
                        price:priceLabel(bike.price, bike.priceText, c.currency),
                        stock:STOCK_LABELS[bike.stock] ?? '',
                        ask:whatsAppLink(c.company.whatsApp, `I'm interested in ${bike.model}`)
                    })
                );
            }
        );
}
