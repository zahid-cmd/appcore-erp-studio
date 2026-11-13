//===============================================================
// Website Design Service
// --------------------------------------------------------------
// The dealer website comes in three designs (blueprint-dealer-
// website-designs). Website Configuration › Design marks one as
// the default : only that one is live.
//
//   website-page-1   Design 1 (built in, the fallback)
//   website-page-2   Design 2 (own chunk, loaded only when shown)
//   website-page-3   Design 3 (own chunk, loaded only when shown)
//
// Visitors : always the default design. No address, parameter
// or switch on the public site picks another one.
//
// Staff preview : /website-preview/<key>?theme=light|deep, behind
// the ERP login, sets `preview` for this browser tab only (memory,
// never stored). The site then shows that design with a
// "Preview, not live" bar until Exit preview or a reload.
//===============================================================

import
{
    Injectable,
    Type,
    computed,
    effect,
    inject,
    signal,
    untracked
}
from '@angular/core';

import
{
    WebsiteDataService
}
from './website-data.service';

import
{
    SiteHeaderComponent
}
from '../../shared/components/website-components/site-header/site-header';

import
{
    WebsitePage1
}
from '../../shared/website-pages/website-page-1/website-page-1';


export type WebsiteDesignKey =
    'website-page-1'
    | 'website-page-2'
    | 'website-page-3';


// What a design brings : its header, its home page and (Designs
// 2 and 3) a token sheet that recolours the shared parts
export interface WebsiteDesignKit
{
    key:WebsiteDesignKey;

    // 1, 2 or 3 : the frame's data-design attribute
    no:number;

    header:Type<unknown>;

    home:Type<unknown>;

    tokens:Type<unknown> | null;
}


const DESIGN_1:
    WebsiteDesignKit =
{
    key:'website-page-1',
    no:1,
    header:SiteHeaderComponent,
    home:WebsitePage1,
    tokens:null
};


// Anything unknown or empty : Design 1
export function websiteDesignKey
(
    value:
        unknown
):
    WebsiteDesignKey
{
    const key =
        String(value ?? '').trim().toLowerCase();

    return key === 'website-page-2' || key === 'website-page-3'
        ? key
        : 'website-page-1';
}


@Injectable(
{
    providedIn:'root'
})
export class WebsiteDesignService
{
    private readonly data =
        inject(WebsiteDataService);

    // Staff preview (this tab only); null = the live design
    readonly preview =
        signal<WebsiteDesignKey | null>(null);

    // The design to show : the preview, else the default
    readonly active =
        computed<WebsiteDesignKey>(
            () =>
                this.preview()
                ??
                websiteDesignKey(this.data.content()?.template)
        );

    // The loaded kit of the active design (null while its chunk loads)
    readonly kit =
        signal<WebsiteDesignKit | null>(null);

    constructor()
    {
        effect(
            () =>
            {
                // Wait for the content : it names the default
                if
                (
                    !this.data.content()
                )
                {
                    return;
                }

                const key =
                    this.active();

                untracked(() => this.load(key));
            }
        );
    }

    exitPreview():
        void
    {
        this.preview.set(null);
    }

    private load
    (
        key:
            WebsiteDesignKey
    ):
        void
    {
        if
        (
            this.kit()?.key === key
        )
        {
            return;
        }

        if
        (
            key === 'website-page-1'
        )
        {
            this.kit.set(DESIGN_1);

            return;
        }

        // Hide the old design while the new one loads
        this.kit.set(null);

        const chunk =
            key === 'website-page-2'
                ? import('../../shared/website-designs/design-2/design-2-kit').then(m => m.DESIGN_2)
                : import('../../shared/website-designs/design-3/design-3-kit').then(m => m.DESIGN_3);

        chunk
            .then(
                kit =>
                {
                    // Still the wanted design (a quick switch may
                    // have changed it meanwhile)
                    if
                    (
                        this.active() === key
                    )
                    {
                        this.kit.set(kit);
                    }
                }
            )
            .catch(
                () =>
                {
                    // Chunk could not load : the built-in design
                    if
                    (
                        this.active() === key
                    )
                    {
                        this.kit.set(DESIGN_1);
                    }
                }
            );
    }
}
