//===============================================================
// Design 3 : Home
// --------------------------------------------------------------
// Words on the left, the photo in an arched frame on the right
// with an opening-hours card, a row of trust points (the first
// Why us points), then the range as numbered catalogue rows and
// two quick bars (service, EMI). The sections after it are the
// shared ones, restyled by this design's token sheet. Section ids
// match the menu.
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
    scrollToSection,
    telLink
}
from '../../../core/website/website-links';

import { OfferStripComponent } from '../../components/website-components/offer-strip/offer-strip';
import { WhyUsComponent } from '../../components/website-components/why-us/why-us';
import { EmiEstimatorComponent } from '../../components/website-components/emi-estimator/emi-estimator';
import { ServiceStripComponent } from '../../components/website-components/service-strip/service-strip';
import { BranchListComponent } from '../../components/website-components/branch-list/branch-list';
import { FaqAccordionComponent } from '../../components/website-components/faq-accordion/faq-accordion';
import { ContactComponent } from '../../components/website-components/contact/contact';


// Rows shown before "View full range"
const FIRST_ROWS = 6;


@Component(
{
    selector:'app-website-home-3',
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
    templateUrl:'./design-3-home.html',
    styleUrls:
    [
        '../../components/website-components/website-section.css',
        './design-3-home.css'
    ]
})
export class Design3Home
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
    // Hero
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
                    text:c.hero.text || c.company.about,
                    hours:c.company.hours,
                    // The first four Why us points, title and a short line
                    facts:c.why.points
                        .filter(x => x.title)
                        .slice(0, 4)
                        .map(x => ({ title:x.title, text:shortText(x.text) }))
                };
            }
        );

    // Phones : the Call button of the bottom bar
    readonly callLink =
        computed(
            () =>
                telLink(this.content()?.company.hotline ?? '')
        );

    //===========================================================
    // The range : numbered rows
    //===========================================================

    readonly brand =
        signal('All');

    readonly showAll =
        signal(false);

    readonly brandNames =
        computed(
            () =>
            {
                const names =
                    [...new Set((this.content()?.bikes ?? []).map(x => x.brand).filter(Boolean))];

                return names.length > 1
                    ? ['All', ...names]
                    : [];
            }
        );

    private readonly picked =
        computed(
            () =>
                (this.content()?.bikes ?? [])
                    .filter(b => this.brand() === 'All' || b.brand === this.brand())
        );

    readonly moreCount =
        computed(
            () =>
                Math.max(0, this.picked().length - FIRST_ROWS)
        );

    readonly rows =
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

                const bikes =
                    this.showAll()
                        ? this.picked()
                        : this.picked().slice(0, FIRST_ROWS);

                return bikes.map
                (
                    (bike, i) =>
                    ({
                        bike,
                        no:String(i + 1).padStart(2, '0'),
                        line:[bike.brand, bike.category, bike.topSpeed].filter(Boolean).join(' · '),
                        price:priceLabel(bike.price, bike.priceText, c.currency),
                        stock:STOCK_LABELS[bike.stock] ?? ''
                    })
                );
            }
        );

    pickBrand
    (
        name:
            string
    ):
        void
    {
        this.brand.set(name);
        this.showAll.set(false);
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


// The first sentence, at most 60 letters
function shortText
(
    value:
        string
):
    string
{
    const first =
        (value || '').split(/(?<=[.!?])\s/)[0].trim();

    return first.length > 60
        ? `${first.slice(0, 57).trimEnd()}…`
        : first;
}
