//===============================================================
// Light / dark : <html data-theme>, remembered in this browser
//===============================================================

import { Injectable, signal } from '@angular/core';

export type ConsoleTheme = 'light' | 'dark';

const KEY = 'appcore.console.theme';

@Injectable({ providedIn: 'root' })
export class ThemeService
{
    readonly theme = signal<ConsoleTheme>(this.initial());

    constructor()
    {
        this.apply(this.theme());
    }

    toggle(): void
    {
        this.set(this.theme() === 'dark' ? 'light' : 'dark');
    }

    set(theme: ConsoleTheme): void
    {
        this.theme.set(theme);
        this.apply(theme);

        try
        {
            localStorage.setItem(KEY, theme);
        }
        catch
        {
            // storage blocked : the choice lasts until reload
        }
    }

    private apply(theme: ConsoleTheme): void
    {
        document.documentElement.setAttribute('data-theme', theme);
    }

    private initial(): ConsoleTheme
    {
        try
        {
            const saved = localStorage.getItem(KEY);

            if (saved === 'dark' || saved === 'light')
            {
                return saved;
            }
        }
        catch
        {
            // storage blocked
        }

        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
}
