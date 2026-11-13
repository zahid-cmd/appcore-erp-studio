//===============================================================
// Design 2 : Home
// --------------------------------------------------------------
// One large still photo with one headline (no slider), the brand
// row, then the bikes as a photo grid with a filter panel (brand,
// type, in stock only). The sections after it are the shared ones
// (why us, EMI, service, branches, FAQ, test ride), restyled by
// this design's token sheet. Section ids match the menu.
//===============================================================

import
{
    Component,
    computed,
    inject,
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
    WebsiteDataService
}
from '../../../core/website/website-data.service';

import
{
    STOCK_LABELS,
    priceLabel,
    scrollToSection
}
from '../../../core/website/website-links';

import { OfferStripComponent } from '../../components/website-components/offer-strip/offer-strip';
import { WhyUsComponent } from '../../components/website-components/why-us/why-us';
import { EmiEstimatorComponent } from '../../components/website-components/emi-estimator/emi-estimator';
import { ServiceStripComponent } from '../../components/website-components/service-strip/service-strip';
import { BranchListComponent } from '../../components/website-components/branch-list/branch-list';
import { FaqAccordionComponent } from '../../components/website-components/faq-accordion/faq-accordion';
import { ContactComponent } from '../../components/website-components/contact/contact';


@Component(
{
    selector:'app-website-home-2',
    standalone:true,
    imports:
    [
        RouterLink,
        OfferStripComponent,
        WhyUsComponent,
        EmiEstimatorComponent,
        ServiceStripComponent,
        BranchListComponent,
        FaqAccordionComponent,
        ContactComponent
    ],
    templateUrl:'./design-2-home.html',
    styleUrls:
    [
        '../../components/website-components/website-section.css',
        './design-2-home.css'
    ]
})
export class Design2Home
{
    private readonly data =
        inject(WebsiteDataService);

    readonly content =
        this.data.content;

    t
    (
        key:
            string
    ):
        string
    {
        return this.data.text(key);
    }

    // Offer shows until the end of its last day
    readonly offerActive =
        computed(
            () =>
            {
                const offer =
                    this.content()?.offer;

                if
                (
                    !offer
                )
                {
                    return false;
                }

                if
                (
                    !offer.endsOn
                )
                {
                    return true;
                }

                const end =
                    new Date(`${offer.endsOn}T23:59:59`);

                return isNaN(end.getTime()) || end.getTime() >= Date.now();
            }
        );

    //===========================================================
    // Hero : the showroom photo, else the first featured bike
    //===========================================================

    readonly hero =
        computed(
            () =>
            {
                const c =
                    this.content();

                if
                (
                    !c
                )
                {
                    return null;
                }

                const bike =
                    c.bikes.find(x => x.featured && x.photo)
                    ??
                    c.bikes.find(x => x.photo);

                const brands =
                    c.brands.filter(x => c.bikes.some(b => b.brand === x.name)).map(x => x.name);

                return {
                    photo:c.hero.photo || bike?.photo || '',
                    isBike:!c.hero.photo && !!bike,
                    kicker:brands.length
                        ? `Authorised dealer · ${joinNames(brands)}`
                        : c.company.tagline,
                    title:c.hero.title || c.company.tagline || c.company.name,
                    text:c.hero.text || c.company.about
                };
            }
        );

    readonly brandTiles =
        computed(
            () =>
                this.content()?.brands ?? []
        );

    //===========================================================
    // Bikes : filter panel + grid
    //===========================================================

    readonly pickedBrands =
        signal<string[]>([]);

    readonly pickedTypes =
        signal<string[]>([]);

    readonly inStockOnly =
        signal(false);

    readonly brandNames =
        computed(
            () =>
                [...new Set((this.content()?.bikes ?? []).map(x => x.brand).filter(Boolean))]
        );

    readonly typeNames =
        computed(
            () =>
                [...new Set((this.content()?.bikes ?? []).map(x => x.category).filter(Boolean))]
        );

    readonly cards =
        computed(
            () =>
            {
                const c =
                    this.content();

                if
                (
                    !c
                )
                {
                    return [];
                }

                const brands =
                    this.pickedBrands();

                const types =
                    this.pickedTypes();

                return c.bikes
                    .filter
                    (
                        b =>
                            (!brands.length || brands.includes(b.brand))
                            &&
                            (!types.length || types.includes(b.category))
                            &&
                            (!this.inStockOnly() || b.stock === 'in-stock' || b.stock === 'few-left')
                    )
                    .map
                    (
                        bike =>
                        ({
                            bike,
                            price:priceLabel(bike.price, bike.priceText, c.currency),
                            stock:STOCK_LABELS[bike.stock] ?? '',
                            dots:bike.colours.filter(x => x.hex).slice(0, 5),
                            line:[bike.category, bike.topSpeed].filter(Boolean).join(' · ')
                        })
                    );
            }
        );

    toggle
    (
        list:
            'brand' | 'type',
        name:
            string
    ):
        void
    {
        const target =
            list === 'brand'
                ? this.pickedBrands
                : this.pickedTypes;

        const now =
            target();

        target.set(
            now.includes(name)
                ? now.filter(x => x !== name)
                : [...now, name]);
    }

    clearFilters():
        void
    {
        this.pickedBrands.set([]);
        this.pickedTypes.set([]);
        this.inStockOnly.set(false);
    }

    goTo
    (
        id:
            string
    ):
        void
    {
        scrollToSection(id);
    }
}


// "A", "A & B", "A, B & C"
function joinNames
(
    names:
        string[]
):
    string
{
    return names.length < 2
        ? names.join('')
        : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}
