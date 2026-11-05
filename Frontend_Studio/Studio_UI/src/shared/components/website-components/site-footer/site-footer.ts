//===============================================================
// Website : Site footer
// --------------------------------------------------------------
// Company logo and about, social links, Explore (home sections),
// Policies (pages), Contact and payment methods, copyright and
// Back to top.
//===============================================================

import
{
    Component,
    ElementRef,
    computed,
    inject,
    input
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
    mailLink,
    scrollToTop,
    telLink
}
from '../../../../core/website/website-links';


@Component(
{
    selector:'app-site-footer',
    standalone:true,
    imports:
    [
        RouterLink
    ],
    templateUrl:'./site-footer.html',
    styleUrls:
    [
        '../website-section.css',
        './site-footer.css'
    ]
})
export class SiteFooterComponent
{
    readonly content =
        input.required<WebsiteContent>();

    private readonly router =
        inject(Router);

    private readonly host =
        inject<ElementRef<HTMLElement>>(ElementRef);

    private readonly themes =
        inject(WebsiteThemeService);

    readonly year =
        new Date().getFullYear();

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

    readonly call =
        computed(
            () =>
                telLink(this.company().hotline)
        );

    readonly mail =
        computed(
            () =>
                mailLink(this.company().email)
        );

    readonly socials =
        computed(
            () =>
            {
                const s =
                    this.content().social;

                return [
                    { key:'facebook', label:'Facebook', url:s.facebook },
                    { key:'youtube', label:'YouTube', url:s.youtube },
                    { key:'instagram', label:'Instagram', url:s.instagram },
                    { key:'tiktok', label:'TikTok', url:s.tiktok }
                ]
                .filter(x => x.url);
            }
        );

    readonly policies =
        computed(
            () =>
            {
                const p =
                    this.content().policies;

                return [
                    { path:'/warranty', label:'Warranty', on:!!p.warranty },
                    { path:'/terms', label:'Terms & conditions', on:!!p.terms },
                    { path:'/privacy', label:'Privacy policy', on:!!p.privacy }
                ]
                .filter(x => x.on);
            }
        );

    go
    (
        id:
            string
    ):
        void
    {
        goToSection(
            () => this.router.navigateByUrl('/'),
            this.router.url.split(/[?#]/)[0] === '/',
            id
        );
    }

    top():
        void
    {
        scrollToTop(this.host.nativeElement);
    }
}
