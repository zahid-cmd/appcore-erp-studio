//===============================================================
// Design 3 : Site Header
// --------------------------------------------------------------
// Company name (or logo) with its town under it, the menu, the
// hotline shown as a number, Light / Deep, Office Login and Book
// a test ride. The menu, Brands panel and Office Login work as in
// the built-in header (same class).
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
    selector:'app-site-header-3',
    standalone:true,
    imports:
    [
        RouterLink
    ],
    templateUrl:'./design-3-header.html',
    styleUrls:
    [
        '../../components/website-components/website-section.css',
        '../../components/website-components/site-header/site-header.css',
        './design-3-header.css'
    ]
})
export class Design3Header
    extends SiteHeaderComponent
{
    // Last two parts of the address : "Uttara, Dhaka"
    readonly place =
        computed(
            () =>
                this.company().address
                    .split(',')
                    .map(x => x.trim())
                    .filter(Boolean)
                    .slice(-2)
                    .join(' · ')
        );
}
