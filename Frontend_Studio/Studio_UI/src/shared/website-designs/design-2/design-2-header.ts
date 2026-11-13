//===============================================================
// Design 2 : Site Header
// --------------------------------------------------------------
// Thin top bar (hours · address · hotline · Light / Deep · Office
// Login), then the company logo centred with a bikes-and-parts
// search on the left and Book a test ride on the right, and the
// menu centred under it. The menu, Brands panel and Office Login
// work exactly as in the built-in header (same class).
//===============================================================

import
{
    Component,
    computed
}
from '@angular/core';

import
{
    RouterLink
}
from '@angular/router';

import
{
    SiteHeaderComponent
}
from '../../components/website-components/site-header/site-header';


@Component(
{
    selector:'app-site-header-2',
    standalone:true,
    imports:
    [
        RouterLink
    ],
    templateUrl:'./design-2-header.html',
    styleUrls:
    [
        '../../components/website-components/website-section.css',
        '../../components/website-components/site-header/site-header.css',
        './design-2-header.css'
    ]
})
export class Design2Header
    extends SiteHeaderComponent
{
    // Last two parts of the address : "Uttara, Dhaka"
    readonly place =
        computed(
            () =>
            {
                const parts =
                    this.company().address
                        .split(',')
                        .map(x => x.trim())
                        .filter(Boolean);

                return parts.slice(-2).join(', ');
            }
        );

    // What the search offers : models, then brands
    readonly searchOptions =
        computed(
            () =>
            {
                const c =
                    this.content();

                return [
                    ...c.bikes.map(x => x.model),
                    ...c.brands.filter(x => x.page).map(x => x.name)
                ];
            }
        );

    // A model opens its page, a brand its page (parts and price
    // list), anything else goes to the bikes on the home page
    search
    (
        event:
            Event,
        value:
            string
    ):
        void
    {
        event.preventDefault();

        const q =
            (value || '').trim().toLowerCase();

        const c =
            this.content();

        this.closeAll();

        if
        (
            !q
        )
        {
            this.go('models');

            return;
        }

        const bike =
            c.bikes.find(x => x.model.toLowerCase() === q)
            ??
            c.bikes.find(x => x.model.toLowerCase().includes(q));

        if
        (
            bike
        )
        {
            this.navigate(['/bikes', bike.slug]);

            return;
        }

        const brand =
            c.brands.find(x => x.page && x.name.toLowerCase().includes(q));

        if
        (
            brand
        )
        {
            this.navigate(['/brands', brand.slug], { tab:'parts' });

            return;
        }

        this.go('models');
    }
}
