//===============================================================
// Website Page Loader (the website frame)
// --------------------------------------------------------------
// Parent of every public website page :
//
//   /                 home (website-page-1)
//   /bikes/:slug      bike detail
//   /warranty /terms /privacy
//
//   0. The design : the default one (Website Configuration ›
//      Design), or a staff preview (WebsiteDesignService). Its
//      header, home page and token sheet come from its kit.
//   1. Loads the website content once (WebsiteDataService)
//   2. Site switched off, or no content → the login page
//   3. Otherwise : header, the page, footer, AppCore strip,
//      with the light / deep theme. Theme colours are CSS
//      variables set here and used by every website part.
//   4. Each new page starts at the top.
//===============================================================

import
{
    Component,
    DestroyRef,
    ElementRef,
    effect,
    inject
}
from '@angular/core';

import
{
    NavigationEnd,
    Router,
    RouterOutlet
}
from '@angular/router';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import
{
    filter
}
from 'rxjs';

import
{
    WebsiteDataService
}
from '../website/website-data.service';

import
{
    WebsiteThemeService
}
from '../website/website-theme.service';

import
{
    resetDocumentScroll,
    scrollToTop
}
from '../website/website-links';

import { NgComponentOutlet } from '@angular/common';
import { WebsiteDesignService } from '../website/website-design.service';
import { SiteFooterComponent } from '../../shared/components/website-components/site-footer/site-footer';
import { AppcoreStripComponent } from '../../shared/components/website-components/appcore-strip/appcore-strip';
import { VisitUsComponent } from '../../shared/components/website-components/visit-us/visit-us';
import { ScrollRailComponent } from '../../shared/components/website-components/scroll-rail/scroll-rail';


@Component(
{
    selector:'app-website-page-loader',
    standalone:true,
    imports:
    [
        RouterOutlet,
        NgComponentOutlet,
        SiteFooterComponent,
        AppcoreStripComponent,
        VisitUsComponent,
        ScrollRailComponent
    ],
    templateUrl:'./website-page-loader.html',
    styleUrl:'./website-page-loader.css'
})
export class WebsitePageLoader
{
    private readonly data =
        inject(WebsiteDataService);

    private readonly router =
        inject(Router);

    private readonly host =
        inject<ElementRef<HTMLElement>>(ElementRef);

    readonly themes =
        inject(WebsiteThemeService);

    readonly designs =
        inject(WebsiteDesignService);

    readonly content =
        this.data.content;

    readonly loaded =
        this.data.loaded;

    // The scrolling frame (this element) : the scroll rail
    // follows it
    get frame():
        HTMLElement
    {
        return this.host.nativeElement;
    }

    constructor()
    {
        this.data.load();

        // An older visit may have left html / body scrolled; the
        // ERP pages after the website need them at the top too
        resetDocumentScroll();

        inject(DestroyRef).onDestroy(() => resetDocumentScroll());

        effect(
            () =>
            {
                if
                (
                    !this.loaded()
                )
                {
                    return;
                }

                const content =
                    this.content();

                if
                (
                    !content
                    ||
                    !content.enabled
                )
                {
                    this.router.navigateByUrl('/login', { replaceUrl:true });

                    return;
                }

                this.themes.applyDefault(content.defaultTheme);

                // "Moto Zone · tagline" : browser tab and search results
                document.title =
                    (this.designs.preview() ? 'Preview · ' : '')
                    +
                    (
                        content.company.tagline
                            ? `${content.company.name} · ${content.company.tagline}`
                            : content.company.name
                    );
            }
        );

        this.router.events
            .pipe(
                filter(e => e instanceof NavigationEnd),
                takeUntilDestroyed(inject(DestroyRef))
            )
            .subscribe(
                () =>
                    scrollToTop(this.host.nativeElement)
            );
    }


    // Staff preview : back to the live (default) design
    exitPreview():
        void
    {
        this.designs.exitPreview();

        scrollToTop(this.host.nativeElement);
    }
}
