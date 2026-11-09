//===============================================================
// Version Service  (2026-11-09)
//
// version.json is written into every release by the Deployment
// Center (version, release, date, What's new). This service:
//
//   * reads it once when the app starts  -> the running version
//     (footer) and the What's new pop-up (once per user/browser)
//   * reads it again every 5 minutes and when the tab comes back
//     -> a newer release on the server shows the
//        "new version" banner (never reloads by itself)
//   * loads the version history (api/platform/versions)
//
// No version.json (localhost / builds before 2026-11-09) : the
// footer shows "dev" on localhost, the old fixed text elsewhere,
// and nothing pops up.
//===============================================================

import
{
    Injectable,
    computed,
    inject,
    signal
}
from '@angular/core';

import
{
    HttpClient
}
from '@angular/common/http';

import
{
    environment
}
from '../../environments/environment';


export interface AppVersionInfo
{
    version:
        string;

    release:
        string;

    changeType?:
        string;

    date?:
        string;

    whatsNew:
        string[];
}

export interface AppVersionHistoryItem
{
    version:
        string;

    release:
        string;

    changeType:
        string;

    date?:
        string | null;

    whatsNew:
        string[];
}


// shown when there is no version.json (older builds)
const FALLBACK_VERSION =
    'v1.0.0';

const SEEN_KEY =
    'appcore.seenVersion';

const CHECK_EVERY_MS =
    5 * 60 * 1000;


@Injectable(
{
    providedIn:'root'
})
export class VersionService
{
    private readonly http =
        inject(HttpClient);

    private started =
        false;

    private timer:
        any =
        null;


    //===========================================================
    // State
    //===========================================================

    // the version this page was loaded with
    readonly current =
        signal<AppVersionInfo | null>(null);

    // the newest version seen on the server
    readonly latest =
        signal<AppVersionInfo | null>(null);

    // the user closed the banner (comes back on the next check)
    readonly bannerClosed =
        signal(false);

    readonly showWhatsNew =
        signal(false);

    readonly showHistory =
        signal(false);

    readonly history =
        signal<AppVersionHistoryItem[]>([]);

    readonly historyLoading =
        signal(false);

    readonly historyError =
        signal('');

    readonly label =
        computed(
            () =>
            {
                const v =
                    this.current()?.version;

                if (v)
                {
                    return 'v' + v;
                }

                return this.isLocal()
                    ? 'dev'
                    : FALLBACK_VERSION;
            }
        );

    readonly updateAvailable =
        computed(
            () =>
            {
                const now =
                    this.current();

                const next =
                    this.latest();

                return !!now
                    && !!next
                    && !!next.release
                    && next.release !== now.release;
            }
        );

    readonly showBanner =
        computed(
            () =>
                this.updateAvailable()
                && !this.bannerClosed()
        );


    //===========================================================
    // Start (once, from the layout)
    //===========================================================

    start():
        void
    {
        if (this.started)
        {
            return;
        }

        this.started =
            true;

        this.read()
            .then(
                info =>
                {
                    if (!info)
                    {
                        return;
                    }

                    this.current.set(info);

                    this.latest.set(info);

                    this.maybeShowWhatsNew(info);
                }
            );

        this.timer =
            setInterval(
                () => this.check(),
                CHECK_EVERY_MS
            );

        document.addEventListener(
            'visibilitychange',
            () =>
            {
                if (document.visibilityState === 'visible')
                {
                    this.check();
                }
            }
        );
    }

    // look for a newer release on the server
    check():
        void
    {
        if (!this.current())
        {
            return;
        }

        this.read()
            .then(
                info =>
                {
                    if (!info)
                    {
                        return;
                    }

                    const before =
                        this.latest()?.release;

                    this.latest.set(info);

                    // a newer release than the one closed : show again
                    if (before !== info.release)
                    {
                        this.bannerClosed.set(false);
                    }
                }
            );
    }

    reload():
        void
    {
        window.location.reload();
    }

    closeBanner():
        void
    {
        this.bannerClosed.set(true);
    }


    //===========================================================
    // What's new (once per version, per browser)
    //===========================================================

    private maybeShowWhatsNew
    (
        info:
            AppVersionInfo
    ):
        void
    {
        if (!info.version || !info.whatsNew?.length)
        {
            return;
        }

        let seen =
            '';

        try
        {
            seen =
                localStorage.getItem(SEEN_KEY) ?? '';
        }
        catch
        {
            seen =
                '';
        }

        if (seen !== info.version)
        {
            this.showWhatsNew.set(true);
        }
    }

    closeWhatsNew():
        void
    {
        this.showWhatsNew.set(false);

        try
        {
            localStorage.setItem(
                SEEN_KEY,
                this.current()?.version ?? ''
            );
        }
        catch
        {
            // storage off : it may show again next time
        }
    }


    //===========================================================
    // Version history
    //===========================================================

    openHistory():
        void
    {
        this.showWhatsNew.set(false);

        this.showHistory.set(true);

        this.historyLoading.set(true);

        this.historyError.set('');

        this.http
            .get<AppVersionHistoryItem[]>(
                `${environment.apiUrl}/platform/versions`
            )
            .subscribe
            ({
                next:
                    rows =>
                    {
                        this.history.set(Array.isArray(rows) ? rows : []);

                        this.historyLoading.set(false);
                    },
                error:
                    () =>
                    {
                        this.history.set([]);

                        this.historyError.set('Unable to load the version history.');

                        this.historyLoading.set(false);
                    }
            });
    }

    closeHistory():
        void
    {
        this.showHistory.set(false);
    }


    //===========================================================
    // Helpers
    //===========================================================

    // version.json next to index.html; never from the cache
    private async read():
        Promise<AppVersionInfo | null>
    {
        try
        {
            const url =
                new URL('version.json', document.baseURI);

            url.searchParams.set('t', String(Date.now()));

            const response =
                await fetch(url.toString(), { cache:'no-store' });

            if (!response.ok)
            {
                return null;
            }

            const type =
                response.headers.get('content-type') ?? '';

            // a missing file can come back as index.html
            if (!type.includes('json'))
            {
                return null;
            }

            const data =
                await response.json();

            if (!data?.version)
            {
                return null;
            }

            return {
                version:String(data.version),
                release:String(data.release ?? ''),
                changeType:String(data.changeType ?? ''),
                date:data.date ?? undefined,
                whatsNew:Array.isArray(data.whatsNew) ? data.whatsNew.map((x:any) => String(x)) : []
            };
        }
        catch
        {
            return null;
        }
    }

    private isLocal():
        boolean
    {
        const host =
            window.location.hostname;

        return host === 'localhost'
            || host === '127.0.0.1';
    }
}
