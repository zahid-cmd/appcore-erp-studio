//===============================================================
// Screen Service (page canvas across monitors, 2026-11-07)
// --------------------------------------------------------------
// The screen tier the app is drawn on, from the CSS viewport
// (screen size ÷ Windows scaling, minus browser and taskbar).
// The same limits as the media queries in layout.css:
//
//   width  : compact < 1440 · standard 1440–1919
//            · wide 1920–2399 · ultra ≥ 2400
//   height : short < 720 · regular 720–999 · tall ≥ 1000
//
// CSS needs nothing from here (layout.css reads the media
// queries itself). TypeScript reads it where a size decides
// behaviour, e.g. a list's Auto page size, and the dev-only
// screen badge in the layout shows it.
//===============================================================

import
{
    Injectable,
    computed,
    signal
}
from '@angular/core';


export type ScreenWidthTier =
    | 'compact'
    | 'standard'
    | 'wide'
    | 'ultra';


export type ScreenHeightTier =
    | 'short'
    | 'regular'
    | 'tall';


// Shared limits (keep equal to layout.css)
export const SCREEN_LIMITS =
{
    standard:1440,
    wide:1920,
    ultra:2400,
    regular:720,
    tall:1000
};


@Injectable(
{
    providedIn:'root'
})
export class ScreenService
{
    // The CSS viewport, kept current on resize
    readonly width =
        signal<number>(ScreenService.readWidth());

    readonly height =
        signal<number>(ScreenService.readHeight());


    readonly widthTier =
        computed<ScreenWidthTier>(
            () =>
            {
                const w = this.width();

                return w >= SCREEN_LIMITS.ultra
                    ? 'ultra'
                    : w >= SCREEN_LIMITS.wide
                        ? 'wide'
                        : w >= SCREEN_LIMITS.standard
                            ? 'standard'
                            : 'compact';
            });


    readonly heightTier =
        computed<ScreenHeightTier>(
            () =>
            {
                const h = this.height();

                return h >= SCREEN_LIMITS.tall
                    ? 'tall'
                    : h >= SCREEN_LIMITS.regular
                        ? 'regular'
                        : 'short';
            });


    // "1366 × 593 · Compact · Short" (the dev badge)
    readonly label =
        computed<string>(
            () =>
                `${this.width()} × ${this.height()} · ${ScreenService.title(this.widthTier())} · ${ScreenService.title(this.heightTier())}`);


    private frame = 0;


    constructor()
    {
        if (typeof window === 'undefined')
        {
            return;
        }

        window.addEventListener(
            'resize',
            () =>
            {
                if (this.frame)
                {
                    return;
                }

                this.frame =
                    requestAnimationFrame(
                        () =>
                        {
                            this.frame = 0;

                            this.width.set(ScreenService.readWidth());

                            this.height.set(ScreenService.readHeight());
                        });
            });
    }


    private static readWidth(): number
    {
        return typeof window === 'undefined'
            ? 1920
            : Math.round(window.innerWidth);
    }


    private static readHeight(): number
    {
        return typeof window === 'undefined'
            ? 905
            : Math.round(window.innerHeight);
    }


    private static title
    (
        tier: string
    ):
        string
    {
        return tier.charAt(0).toUpperCase() + tier.slice(1);
    }
}
