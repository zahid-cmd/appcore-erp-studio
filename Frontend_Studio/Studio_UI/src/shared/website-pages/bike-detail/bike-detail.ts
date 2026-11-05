//===============================================================
// Website : Bike detail page  ( /bikes/:slug )
// --------------------------------------------------------------
// Big photo with a colour switcher, model, price and stock, key
// spec tiles, test-ride / WhatsApp / call, highlights, the full
// spec table by group, gallery, EMI estimate for this bike and
// other bikes.
//===============================================================

import
{
    Component,
    computed,
    effect,
    inject,
    signal
}
from '@angular/core';

import
{
    ActivatedRoute,
    RouterLink
}
from '@angular/router';

import
{
    toSignal
}
from '@angular/core/rxjs-interop';

import
{
    map
}
from 'rxjs';

import
{
    WebsiteDataService
}
from '../../../core/website/website-data.service';

import
{
    STOCK_LABELS,
    priceLabel,
    telLink,
    whatsAppLink
}
from '../../../core/website/website-links';

import { EmiEstimatorComponent } from '../../components/website-components/emi-estimator/emi-estimator';
import { FeaturedBikesComponent } from '../../components/website-components/featured-bikes/featured-bikes';
import { ContactComponent } from '../../components/website-components/contact/contact';


@Component(
{
    selector:'app-bike-detail',
    standalone:true,
    imports:
    [
        RouterLink,
        EmiEstimatorComponent,
        FeaturedBikesComponent,
        ContactComponent
    ],
    templateUrl:'./bike-detail.html',
    styleUrls:
    [
        '../../components/website-components/website-section.css',
        './bike-detail.css'
    ]
})
export class BikeDetailPage
{
    // /bikes/:slug (updates when moving between bikes)
    readonly slug =
        toSignal(
            inject(ActivatedRoute).paramMap.pipe(
                map(p => p.get('slug') ?? '')
            ),
            {
                initialValue:''
            }
        );

    private readonly data =
        inject(WebsiteDataService);

    readonly content =
        this.data.content;

    readonly colourIndex =
        signal(0);

    readonly photoOverride =
        signal('');

    readonly bike =
        computed(
            () =>
                this.content()
                    ? this.data.bike(this.slug())
                    : null
        );

    readonly photo =
        computed(
            () =>
            {
                const b =
                    this.bike();

                if
                (
                    !b
                )
                {
                    return '';
                }

                return this.photoOverride()
                    || b.colours[this.colourIndex()]?.photo
                    || b.photo;
            }
        );

    readonly price =
        computed(
            () =>
            {
                const b =
                    this.bike();

                return b
                    ? priceLabel(b.price, b.priceText, this.content()!.currency)
                    : '';
            }
        );

    readonly stock =
        computed(
            () =>
                STOCK_LABELS[this.bike()?.stock ?? ''] ?? ''
        );

    readonly links =
        computed(
            () =>
            {
                const c =
                    this.content();

                const b =
                    this.bike();

                if
                (
                    !c || !b
                )
                {
                    return { ride:'', ask:'', call:'' };
                }

                return {
                    ride:whatsAppLink(c.company.whatsApp, `I'd like a test ride of ${b.model}`),
                    ask:whatsAppLink(c.company.whatsApp, `I'm interested in ${b.model}`),
                    call:telLink(c.company.hotline)
                };
            }
        );

    constructor()
    {
        // A new bike starts on its first colour and main photo
        effect(
            () =>
            {
                this.bike();

                this.colourIndex.set(0);

                this.photoOverride.set('');
            }
        );

        effect(
            () =>
            {
                const b =
                    this.bike();

                const c =
                    this.content();

                if
                (
                    b && c
                )
                {
                    document.title = `${b.model} · ${c.company.name}`;
                }
            }
        );
    }

    pickColour
    (
        i:
            number
    ):
        void
    {
        this.colourIndex.set(i);

        this.photoOverride.set('');
    }

    showPhoto
    (
        url:
            string
    ):
        void
    {
        this.photoOverride.set(url);
    }
}

