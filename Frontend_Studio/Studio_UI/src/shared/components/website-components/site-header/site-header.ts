//===============================================================
// Website : Site Header
// --------------------------------------------------------------
// Contact line, company logo, menu (sections of the home page,
// reachable from every website page), ☀ / ☾ switch, Office
// Login ("Open ERP" when signed in) and Book a test ride.
//
// Brands : with 2 or more brands a "Brands" menu item opens a
// panel on hover (click / tap on touch screens) with one card per
// brand. A card opens the brand's page (/brands/<slug>) : Bikes,
// Price list and Parts catalogue. A single-brand company has no
// Brands item at all; nor when the Brands menu is switched off.
//===============================================================

import
{
    Component,
    ElementRef,
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
    WebsiteContent
}
from '../../../../core/website/website.models';

import
{
    WebsiteThemeService
}
from '../../../../core/website/website-theme.service';

import
{
    goToSection,
    priceLabel,
    scrollToSection,
    scrollToTop,
    telLink
}
from '../../../../core/website/website-links';

import
{
    AuthenticationStorageService
}
from '../../../../core/authentication/authentication-storage.service';

import
{
    isTokenExpired
}
from '../../../../core/authentication/authentication.guard';


interface MenuItem
{
    id:string;

    label:string;
}


@Component(
{
    selector:'app-site-header',
    standalone:true,
    imports:
    [
        RouterLink
    ],
    templateUrl:'./site-header.html',
    styleUrls:
    [
        '../website-section.css',
        './site-header.css'
    ]
})
export class SiteHeaderComponent
{
    readonly content =
        input.required<WebsiteContent>();

    readonly themes =
        inject(WebsiteThemeService);

    private readonly router =
        inject(Router);

    private readonly host =
        inject<ElementRef<HTMLElement>>(ElementRef);

    private readonly authStorage =
        inject(AuthenticationStorageService);

    readonly menuOpen =
        signal(false);

    readonly brandsOpen =
        signal(false);

    private closeTimer:
        ReturnType<typeof setTimeout> | null = null;

    // One card per brand : bike count and lowest price
    readonly brandCards =
        computed(
            () =>
            {
                const c =
                    this.content();

                // Menu off, or brands whose page is off : no card
                if
                (
                    !c.brandsMenu
                )
                {
                    return [];
                }

                return c.brands
                    .filter(b => b.page)
                    .map
                (
                    b =>
                    {
                        const bikes =
                            c.bikes.filter(x => x.brand === b.name);

                        const prices =
                            bikes
                                .map(x => x.price)
                                .filter((x): x is number => x !== null);

                        return {
                            ...b,
                            initial:b.name.charAt(0).toUpperCase(),
                            models:bikes.length,
                            from:prices.length
                                ? priceLabel(Math.min(...prices), '', c.currency)
                                : ''
                        };
                    }
                );
            }
        );

    readonly signedIn =
        signal(
            !isTokenExpired(this.authStorage.getToken())
        );

    readonly company =
        computed(
            () =>
                this.content().company
        );

    readonly logo =
        computed(
            () =>
                this.themes.theme() === 'light'
                    ? this.company().logoLight
                    : this.company().logoDeep
        );

    readonly hotlineLink =
        computed(
            () =>
                telLink(this.company().hotline)
        );

    readonly menu =
        computed<MenuItem[]>(
            () =>
            {
                const c =
                    this.content();

                return [
                    ...(c.bikes.length ? [{ id:'models', label:'Bikes' }] : []),
                    ...(c.why.points.length ? [{ id:'why', label:'Why us' }] : []),
                    ...(c.emi.enabled ? [{ id:'emi', label:'EMI' }] : []),
                    ...(c.services.length ? [{ id:'service', label:'Service' }] : []),
                    ...(c.branches.length ? [{ id:'branches', label:'Branches' }] : []),
                    ...(c.faq.length ? [{ id:'faq', label:'FAQ' }] : [])
                ];
            }
        );

    private onHome():
        boolean
    {
        return this.router.url.split(/[?#]/)[0] === '/';
    }

    openBrands():
        void
    {
        if
        (
            this.closeTimer
        )
        {
            clearTimeout(this.closeTimer);

            this.closeTimer = null;
        }

        this.brandsOpen.set(true);
    }

    // Small delay : the pointer can cross the gap to the panel
    closeBrandsSoon():
        void
    {
        this.closeTimer =
            setTimeout(() => this.brandsOpen.set(false), 160);
    }

    // Home / logo : already on the home page → back to the top
    // (the router does not navigate to the same address)
    home
    (
        event:
            Event
    ):
        void
    {
        this.closeAll();

        if
        (
            this.onHome()
        )
        {
            event.preventDefault();

            scrollToTop(this.host.nativeElement);
        }
    }

    // The Visit us section sits above the footer of every page
    contact():
        void
    {
        this.closeAll();

        scrollToSection('visit');
    }

    // For the design headers (Designs 2 and 3 extend this class)
    protected navigate
    (
        commands:
            unknown[],
        queryParams?:
            Record<string, string>
    ):
        void
    {
        this.router.navigate(
            commands,
            queryParams ? { queryParams } : undefined);
    }

    closeAll():
        void
    {
        this.brandsOpen.set(false);

        this.menuOpen.set(false);
    }

    go
    (
        id:
            string
    ):
        void
    {
        this.brandsOpen.set(false);
        this.menuOpen.set(false);

        goToSection(
            () => this.router.navigateByUrl('/'),
            this.onHome(),
            id
        );
    }
}
