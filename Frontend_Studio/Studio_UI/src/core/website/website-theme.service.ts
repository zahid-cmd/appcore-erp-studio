//===============================================================
// Website Theme Service
// --------------------------------------------------------------
// Light / Deep on the public website.
//   1. The visitor's own choice (remembered in this browser)
//   2. else the company's default (site-content.json)
//   3. else the device setting (dark mode → Deep)
//===============================================================

import
{
    Injectable,
    signal
}
from '@angular/core';

import
{
    WebsiteTheme
}
from './website.models';


const STORAGE_KEY =
    'appcore.website.theme';


@Injectable(
{
    providedIn:'root'
})
export class WebsiteThemeService
{
    readonly theme =
        signal<WebsiteTheme>('deep');

    private chosen =
        false;

    constructor()
    {
        try
        {
            const saved =
                localStorage.getItem(STORAGE_KEY);

            if
            (
                saved === 'light' || saved === 'deep'
            )
            {
                this.theme.set(saved);

                this.chosen = true;

                return;
            }
        }
        catch
        {
            // Storage blocked : fall through
        }

        this.theme.set(deviceTheme());
    }

    // Company default : used only when the visitor never chose
    applyDefault
    (
        value:
            'auto' | WebsiteTheme
    ):
        void
    {
        if
        (
            this.chosen
        )
        {
            return;
        }

        this.theme.set(
            value === 'auto'
                ? deviceTheme()
                : value
        );
    }

    set
    (
        value:
            WebsiteTheme
    ):
        void
    {
        this.theme.set(value);

        this.chosen = true;

        try
        {
            localStorage.setItem(STORAGE_KEY, value);
        }
        catch
        {
            // Storage blocked : lasts for this visit
        }
    }

    toggle():
        void
    {
        this.set(
            this.theme() === 'light'
                ? 'deep'
                : 'light'
        );
    }
}


function deviceTheme():
    WebsiteTheme
{
    try
    {
        return window.matchMedia('(prefers-color-scheme: light)').matches
            ? 'light'
            : 'deep';
    }
    catch
    {
        return 'deep';
    }
}
