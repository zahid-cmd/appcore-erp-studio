//===============================================================
// Website : Hero (model slider)
// --------------------------------------------------------------
// Featured bikes (or the first six) as slides : big model name,
// tagline, three spec tiles, price and photo over a faint
// company monogram.
//
//   Switching : a glowing vertical line sweeps across the hero
//               (left → right going forward, right → left going
//               back) and the new slide is revealed behind it.
//   Autoplay  : the active tab's vertical line fills over 7 s,
//               and when it is full the next slide opens. The
//               fill pauses while the mouse or focus is on the
//               hero; with "reduce motion" there is no autoplay.
//   Controls  : tabs, arrows, ← / → keys on the tabs, swipe.
//   Tabs      : 4 at a time (welcome included), equal width. The
//               row follows the active slide : going past the
//               last tab brings the next one in (one at a time),
//               wrapping to the start goes back to the first 4.
//   Brands    : with 2 or more brands a brand bar sits on top :
//               "All brands" (default) slides every bike;
//               a brand slides only that brand's bikes. Which
//               bikes slide will come from the ERP's Website
//               Settings / Hero Slides; until then : featured
//               bikes, else all.
//   Hero photo: (Website Configuration › Hero) the showroom photo
//               can open the slider as a "welcome" slide (photo,
//               welcome text, address, directions) and / or sit
//               behind the bike slides, dimmed to the chosen
//               strength. A brand tab skips the welcome slide.
//               No photo = the hero as before.
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
    Router,
    RouterLink
}
from '@angular/router';

import
{
    WebsiteBike,
    WebsiteContent
}
from '../../../../core/website/website.models';

import
{
    priceLabel,
    telLink
}
from '../../../../core/website/website-links';


const SWIPE_PX =
    50;

// A slide : the welcome slide or a bike
type HeroSlide =
    { kind:'welcome' }
    | { kind:'bike'; bike:WebsiteBike };

// Background photo visibility for strength 1 … 5
const PHOTO_OPACITY =
    [0, .16, .26, .38, .52, .68];


@Component(
{
    selector:'app-hero',
    standalone:true,
    imports:
    [
        RouterLink
    ],
    templateUrl:'./hero.html',
    styleUrls:
    [
        '../website-section.css',
        './hero.css'
    ]
})
export class HeroComponent
{
    readonly content =
        input.required<WebsiteContent>();

    readonly index =
        signal(0);

    // Tabs shown at a time, and the first one shown
    private readonly tabCount =
        4;

    readonly tabStart =
        signal(0);

    // The tabs in view, with their slide number
    readonly visibleTabs =
        computed(
            () =>
            {
                const start =
                    this.tabStart();

                return this.slides()
                    .map((slide, i) => ({ slide, i }))
                    .slice(start, start + this.tabCount);
            }
        );

    // Go to a slide and keep its tab in view
    private show
    (
        i:
            number
    ):
        void
    {
        this.index.set(i);

        const start =
            this.tabStart();

        if
        (
            i < start
        )
        {
            this.tabStart.set(i);
        }
        else if
        (
            i > start + this.tabCount - 1
        )
        {
            this.tabStart.set(i - this.tabCount + 1);
        }
    }

    // 1 forward, -1 back : sets the sweep direction
    readonly direction =
        signal(1);

    private swipeX:
        number | null = null;

    // Selected brand name ('' = all brands)
    readonly brand =
        signal('');

    // Bikes the hero may show, all brands
    private readonly pool =
        computed<WebsiteBike[]>(
            () =>
            {
                const bikes =
                    this.content().bikes;

                const featured =
                    bikes.filter(x => x.featured);

                return featured.length ? featured : bikes;
            }
        );

    // Brand bar : only brands with bikes in the hero, 2 or more
    readonly brandTabs =
        computed(
            () =>
            {
                const tabs =
                    this.content().brands
                        .filter(b => this.pool().some(x => x.brand === b.name));

                return tabs.length > 1
                    ? tabs
                    : [];
            }
        );

    readonly hero =
        computed(
            () =>
                this.content().hero
        );

    // Welcome slide : photo set, switched on, all brands
    readonly showWelcome =
        computed(
            () =>
                !!this.hero().photo && this.hero().welcome && !this.brand()
        );

    readonly showBackground =
        computed(
            () =>
                !!this.hero().photo && this.hero().background
        );

    // Round image in the circle (bike slides only)
    readonly roundOpacity =
        computed(
            () =>
                [0, .14, .22, .32, .44, .58][this.hero().roundStrength] ?? .22
        );

    readonly photoOpacity =
        computed(
            () =>
                PHOTO_OPACITY[this.hero().strength] ?? PHOTO_OPACITY[2]
        );

    readonly welcomeTitle =
        computed(
            () =>
                this.hero().title || ('Welcome to ' + this.content().company.name)
        );

    readonly welcomeText =
        computed(
            () =>
                this.hero().text || this.content().company.tagline
        );

    readonly directions =
        computed(
            () =>
            {
                const c =
                    this.content().company;

                const q =
                    c.mapQuery || [c.name, c.address].filter(Boolean).join(', ');

                return q
                    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`
                    : '';
            }
        );

    private readonly bikeSlides =
        computed<WebsiteBike[]>(
            () =>
            {
                const brand =
                    this.brand();

                return this.pool()
                    .filter(x => !brand || x.brand === brand)
                    .slice(0, 8);
            }
        );

    readonly slides =
        computed<HeroSlide[]>(
            () =>
                [
                    ...(this.showWelcome() ? [{ kind:'welcome' } as HeroSlide] : []),
                    ...this.bikeSlides().map(bike => ({ kind:'bike', bike }) as HeroSlide)
                ]
        );

    readonly current =
        computed<HeroSlide | null>(
            () =>
                this.slides()[this.index()] ?? this.slides()[0] ?? null
        );

    readonly onWelcome =
        computed(
            () =>
                this.current()?.kind === 'welcome'
        );

    // Re-creates the slide (and its sweep) on brand or slide change
    readonly slideKey =
        computed(
            () =>
                `${this.brand()}|${this.index()}`
        );

    // The bike on screen (null on the welcome slide)
    readonly slide =
        computed<WebsiteBike | null>(
            () =>
            {
                const c =
                    this.current();

                return c && c.kind === 'bike' ? c.bike : null;
            }
        );

    tabTitle
    (
        item:
            HeroSlide
    ):
        string
    {
        return item.kind === 'bike' ? item.bike.model : 'Welcome';
    }

    tabSub
    (
        item:
            HeroSlide
    ):
        string
    {
        return item.kind === 'bike' ? item.bike.engine : this.content().company.name;
    }

    readonly price =
        computed(
            () =>
            {
                const s =
                    this.slide();

                return s
                    ? priceLabel(s.price, s.priceText, this.content().currency)
                    : '';
            }
        );

    // The slide bike's own brand (+ type when known)
    readonly badge =
        computed(
            () =>
            {
                const s =
                    this.slide();

                return [s?.brand, s?.category]
                    .filter(Boolean)
                    .join(' · ')
                    || 'Featured';
            }
        );

    // Enquiry bar : call the hotline (Website Configuration)
    readonly hotline =
        computed(
            () =>
                this.content().company.hotline ?? ''
        );

    readonly callLink =
        computed(
            () =>
                telLink(this.hotline())
        );

    readonly monogram =
        computed(
            () =>
                (this.content().company.name.match(/[A-Za-z]/)?.[0] ?? 'A').toUpperCase()
        );

    pickBrand
    (
        name:
            string
    ):
        void
    {
        if
        (
            name === this.brand()
        )
        {
            return;
        }

        this.direction.set(1);

        this.brand.set(name);

        this.tabStart.set(0);

        this.index.set(0);
    }

    pick
    (
        i:
            number
    ):
        void
    {
        const current =
            this.index();

        if
        (
            i === current
        )
        {
            return;
        }

        this.direction.set(i > current ? 1 : -1);

        this.show(i);
    }

    next():
        void
    {
        const count =
            this.slides().length;

        if
        (
            count < 2
        )
        {
            return;
        }

        this.direction.set(1);

        this.show((this.index() + 1) % count);
    }

    prev():
        void
    {
        const count =
            this.slides().length;

        if
        (
            count < 2
        )
        {
            return;
        }

        this.direction.set(-1);

        this.show((this.index() - 1 + count) % count);
    }

    swipeStart
    (
        event:
            PointerEvent
    ):
        void
    {
        this.swipeX =
            event.pointerType === 'mouse' ? null : event.clientX;
    }

    swipeEnd
    (
        event:
            PointerEvent
    ):
        void
    {
        if
        (
            this.swipeX === null
        )
        {
            return;
        }

        const dx =
            event.clientX - this.swipeX;

        this.swipeX =
            null;

        if
        (
            dx <= -SWIPE_PX
        )
        {
            this.next();
        }
        else if
        (
            dx >= SWIPE_PX
        )
        {
            this.prev();
        }
    }

    pad
    (
        n:
            number
    ):
        string
    {
        return String(n).padStart(2, '0');
    }

    private readonly router =
        inject(Router);


    // Book a test ride : the form in test ride mode, with the bike
    // on screen when it comes from the ERP
    testRide():
        void
    {
        const bike =
            this.slide();

        this.router.navigate(
            ['/enquire'],
            {
                queryParams:
                {
                    type:'test-ride',
                    bike:bike?.code ? bike.slug : null
                }
            }
        );
    }
}
