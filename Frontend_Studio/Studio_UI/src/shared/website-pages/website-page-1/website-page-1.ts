//===============================================================
// Website Page 1 : home (template)
// --------------------------------------------------------------
// One scrolling page : model slider, offer, selling points,
// "Find your ride", why us, EMI, service, branches, FAQ and the
// test-ride band. The frame (header and footer) comes from the
// website page loader.
//===============================================================

import
{
    Component,
    computed,
    inject
}
from '@angular/core';

import
{
    WebsiteDataService
}
from '../../../core/website/website-data.service';

import { HeroComponent } from '../../components/website-components/hero/hero';
import { OfferStripComponent } from '../../components/website-components/offer-strip/offer-strip';
import { MarqueeStripComponent } from '../../components/website-components/marquee-strip/marquee-strip';
import { FeaturedBikesComponent } from '../../components/website-components/featured-bikes/featured-bikes';
import { WhyUsComponent } from '../../components/website-components/why-us/why-us';
import { EmiEstimatorComponent } from '../../components/website-components/emi-estimator/emi-estimator';
import { ServiceStripComponent } from '../../components/website-components/service-strip/service-strip';
import { BranchListComponent } from '../../components/website-components/branch-list/branch-list';
import { FaqAccordionComponent } from '../../components/website-components/faq-accordion/faq-accordion';
import { ContactComponent } from '../../components/website-components/contact/contact';


@Component(
{
    selector:'app-website-page-1',
    standalone:true,
    imports:
    [
        HeroComponent,
        OfferStripComponent,
        MarqueeStripComponent,
        FeaturedBikesComponent,
        WhyUsComponent,
        EmiEstimatorComponent,
        ServiceStripComponent,
        BranchListComponent,
        FaqAccordionComponent,
        ContactComponent
    ],
    templateUrl:'./website-page-1.html',
    styleUrl:'./website-page-1.css'
})
export class WebsitePage1
{
    readonly content =
        inject(WebsiteDataService).content;

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
}
