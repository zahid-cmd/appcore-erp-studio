//===============================================================
// Website Preview entry ( /website-preview/:design?theme= )
// --------------------------------------------------------------
// Staff only (behind the ERP login, see app.routes.ts). Marks the
// design to preview for this browser tab, sets the theme for the
// visit (not remembered) and opens the website home. The site
// shows a "Preview, not live" bar until Exit preview or a reload.
//===============================================================

import
{
    Component,
    inject
}
from '@angular/core';

import
{
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    WebsiteDesignService,
    websiteDesignKey
}
from '../../../core/website/website-design.service';

import
{
    WebsiteThemeService
}
from '../../../core/website/website-theme.service';


@Component(
{
    selector:'app-website-preview',
    standalone:true,
    template:''
})
export class WebsitePreviewEntry
{
    constructor()
    {
        const route =
            inject(ActivatedRoute);

        const designs =
            inject(WebsiteDesignService);

        const themes =
            inject(WebsiteThemeService);

        designs.preview.set(
            websiteDesignKey(route.snapshot.paramMap.get('design')));

        const theme =
            route.snapshot.queryParamMap.get('theme');

        if
        (
            theme === 'light' || theme === 'deep'
        )
        {
            // This visit only : the visitor's saved choice stays
            themes.preview(theme);
        }

        inject(Router).navigateByUrl('/', { replaceUrl:true });
    }
}
