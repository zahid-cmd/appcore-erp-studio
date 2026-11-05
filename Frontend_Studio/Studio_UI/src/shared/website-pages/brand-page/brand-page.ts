//===============================================================
// Website : Brand page  ( /brands/:slug?tab=bikes|prices|parts )
// --------------------------------------------------------------
// One brand of the company :
//   Bikes       that brand's models (the bike grid, type filter)
//   Price list  model · colours · MRP · availability, printable
//   Parts       the brand's spare parts, lubricants and
//               accessories from the ERP : part no, name, unit,
//               MRP, availability. Search and kind filter.
// Opened from the header's Brands menu.
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
    WebsiteContent,
    WebsitePart
}
from '../../../core/website/website.models';

import
{
    STOCK_LABELS,
    formatPrice,
    priceLabel
}
from '../../../core/website/website-links';

import { FeaturedBikesComponent } from '../../components/website-components/featured-bikes/featured-bikes';
import { ContactComponent } from '../../components/website-components/contact/contact';


type BrandTab =
    'bikes'
    | 'prices'
    | 'parts';


const PAGE_SIZE =
    60;


@Component(
{
    selector:'app-brand-page',
    standalone:true,
    imports:
    [
        RouterLink,
        FeaturedBikesComponent,
        ContactComponent
    ],
    templateUrl:'./brand-page.html',
    styleUrls:
    [
        '../../components/website-components/website-section.css',
        './brand-page.css'
    ]
})
export class BrandPage
{
    private readonly route =
        inject(ActivatedRoute);

    readonly data =
        inject(WebsiteDataService);

    readonly slug =
        toSignal(
            this.route.paramMap.pipe(
                map(p => p.get('slug') ?? '')
            ),
            {
                initialValue:''
            }
        );

    private readonly tabParam =
        toSignal(
            this.route.queryParamMap.pipe(
                map(p => p.get('tab') ?? '')
            ),
            {
                initialValue:''
            }
        );

    readonly content =
        this.data.content;

    // Null when unknown or its brand page is switched off
    readonly brand =
        computed(
            () =>
            {
                const b =
                    this.content()
                        ? this.data.brand(this.slug())
                        : null;

                return b && b.page ? b : null;
            }
        );

    readonly bikes =
        computed(
            () =>
            {
                const b =
                    this.brand();

                return b
                    ? (this.content()?.bikes ?? []).filter(x => x.brand === b.name)
                    : [];
            }
        );

    // The site narrowed to this brand, for the bike grid
    readonly brandSite =
        computed<WebsiteContent | null>(
            () =>
            {
                const c =
                    this.content();

                const b =
                    this.brand();

                return c && b
                    ? { ...c, bikes:this.bikes(), brands:[b] }
                    : null;
            }
        );

    readonly tab =
        computed<BrandTab>(
            () =>
            {
                const t =
                    this.tabParam();

                if
                (
                    t === 'prices' || t === 'parts'
                )
                {
                    return t;
                }

                return this.bikes().length
                    ? 'bikes'
                    : 'parts';
            }
        );

    readonly priceRows =
        computed(
            () =>
            {
                const currency =
                    this.content()?.currency ?? '';

                return this.bikes().map
                (
                    x =>
                    ({
                        slug:x.slug,
                        model:x.model,
                        colours:x.colours.map(c => c.name).join(', '),
                        price:priceLabel(x.price, x.priceText, currency) || 'Call for price',
                        stock:x.stock,
                        stockText:STOCK_LABELS[x.stock] ?? ''
                    })
                );
            }
        );

    // Parts : loaded from the ERP when the tab opens
    readonly search =
        signal('');

    readonly kind =
        signal('All');

    readonly shown =
        signal(PAGE_SIZE);

    readonly partsState =
        computed(
            () =>
            {
                const code =
                    this.brand()?.code ?? '';

                return code
                    ? this.data.parts()[code] ?? 'loading'
                    : 'failed';
            }
        );

    private readonly allParts =
        computed<WebsitePart[]>(
            () =>
            {
                const state =
                    this.partsState();

                return Array.isArray(state)
                    ? state
                    : [];
            }
        );

    readonly kinds =
        computed(
            () =>
            {
                const names =
                    [...new Set(this.allParts().map(x => x.kind).filter(Boolean))];

                return names.length > 1
                    ? ['All', ...names]
                    : [];
            }
        );

    readonly filteredParts =
        computed(
            () =>
            {
                const words =
                    this.search().trim().toLowerCase().split(/\s+/).filter(Boolean);

                const kind =
                    this.kind();

                return this.allParts().filter
                (
                    x =>
                        (kind === 'All' || x.kind === kind)
                        &&
                        words.every
                        (
                            w =>
                                x.name.toLowerCase().includes(w)
                                ||
                                x.partNumber.toLowerCase().includes(w)
                        )
                );
            }
        );

    readonly visibleParts =
        computed(
            () =>
                this.filteredParts().slice(0, this.shown())
        );

    constructor()
    {
        effect(
            () =>
            {
                const b =
                    this.brand();

                if
                (
                    b && this.tab() === 'parts'
                )
                {
                    this.data.loadParts(b.code);
                }
            }
        );

        effect(
            () =>
            {
                const b =
                    this.brand();

                const c =
                    this.content();

                if
                (
                    b && c
                )
                {
                    document.title = `${b.name} · ${c.company.name}`;
                }
            }
        );
    }

    partPrice
    (
        p:
            WebsitePart
    ):
        string
    {
        return p.price !== null
            ? `${this.content()?.currency ?? ''} ${formatPrice(p.price)}`
            : 'Ask';
    }

    setSearch
    (
        value:
            string
    ):
        void
    {
        this.search.set(value);

        this.shown.set(PAGE_SIZE);
    }

    setKind
    (
        value:
            string
    ):
        void
    {
        this.kind.set(value);

        this.shown.set(PAGE_SIZE);
    }

    more():
        void
    {
        this.shown.set(this.shown() + PAGE_SIZE);
    }

    // The ERP keeps html / body at overflow:hidden and the
    // website scrolls in its frame : open both up while printing
    print():
        void
    {
        const targets =
            [document.documentElement, document.body];

        const saved =
            targets.map(x => [x.style.overflow, x.style.height]);

        for (const x of targets)
        {
            x.style.overflow = 'visible';
            x.style.height = 'auto';
        }

        window.print();

        targets.forEach(
            (x, i) =>
            {
                x.style.overflow = saved[i][0];
                x.style.height = saved[i][1];
            }
        );
    }
}
