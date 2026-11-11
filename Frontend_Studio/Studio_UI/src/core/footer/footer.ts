//===============================================================
// App Footer
// --------------------------------------------------------------
// Version · Server status · Session time left · © · About · brand
//
// Server status : GET api/platform/health every 30 seconds
//                 green online · amber database down · red offline
// Dev server    : development build on localhost, developer
//                 users only : click the server status for
//                 Build & Restart API / Restart only (through the
//                 dev agent, Backend_Studio\dev-agent). After a
//                 good build + restart the page reloads itself.
// Session       : from the login token's expiry ("exp").
//                 5 minutes before the end a warning toast is
//                 shown once; at the end the user is signed out
//                 and taken to the login page.
//===============================================================

import
{
    Component,
    ElementRef,
    EventEmitter,
    OnDestroy,
    OnInit,
    Output,
    ViewChild,
    computed,
    inject,
    signal
}
from '@angular/core';

import
{
    Router
}
from '@angular/router';

import
{
    FooterVersionComponent
}
from '../../shared/components/layout/footer-version/footer-version';

import
{
    FooterBrandComponent
}
from '../../shared/components/layout/footer-brand/footer-brand';

import
{
    ShellService
}
from '../shell/shell.service';

import
{
    AuthenticationStorageService
}
from '../authentication/authentication-storage.service';

import
{
    ToastService
}
from '../../shared/components/utilities/toast/toast.service';

import
{
    DevAgentService,
    DevAgentStatus
}
from '../dev-agent/dev-agent.service';

import
{
    FeedbackService
}
from '../feedback/feedback.service';


//===============================================================
// Constants
//===============================================================

const HEALTH_EVERY_MS =
    30 * 1000;

const SESSION_WARNING_MS =
    5 * 60 * 1000;


@Component(
{
    selector:
        'app-footer',

    standalone:
        true,

    imports:
    [
        FooterVersionComponent,

        FooterBrandComponent
    ],

    templateUrl:
        './footer.html',

    styleUrls:
    [
        './footer.css'
    ]
})
export class FooterComponent
implements
    OnInit,
    OnDestroy
{

    //===========================================================
    // Dependencies
    //===========================================================

    private readonly shellService =
        inject(ShellService);

    private readonly authenticationStorageService =
        inject(AuthenticationStorageService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly devAgent =
        inject(DevAgentService);

    private readonly feedbackService =
        inject(FeedbackService);


    //===========================================================
    // Outputs
    //===========================================================

    @Output()
    aboutClick =
        new EventEmitter<void>();


    //===========================================================
    // State
    //===========================================================

    readonly year =
        new Date().getFullYear();

    readonly server =
        this.shellService.serverStatus;

    private readonly now =
        signal<number>(Date.now());

    private readonly expiresAt =
        signal<number | null>(null);

    private healthTimer:
        ReturnType<typeof setInterval> | null =
        null;

    private secondTimer:
        ReturnType<typeof setInterval> | null =
        null;

    private warnedFor:
        number | null =
        null;

    private signingOut =
        false;


    //===========================================================
    // Dev server (Build & Restart from the footer)
    //===========================================================

    // development build + localhost + developer user
    readonly devMode =
        signal(false);

    readonly devOpen =
        signal(false);

    readonly devStatus =
        signal<DevAgentStatus | null>(null);

    // the agent did not answer the last call
    readonly devAgentDown =
        signal(false);

    // this tab started a job and waits for it (then reloads)
    readonly devWaiting =
        signal(false);

    readonly devReloading =
        signal(false);

    readonly devMessage =
        signal('');

    readonly devPanelLeft =
        signal(0);

    readonly devPanelBottom =
        signal(0);

    private devJobId =
        0;

    // The footer clips (and a parent layer may sit under the page) :
    // the panel is moved to <body> so it floats above everything.
    // Angular still removes it when the panel closes.
    @ViewChild('devPanel')
    set devPanelRef(ref: ElementRef<HTMLElement> | undefined)
    {
        const el =
            ref?.nativeElement;

        if (el && el.parentElement !== document.body)
        {
            document.body.appendChild(el);
        }
    }

    private devTimer:
        ReturnType<typeof setInterval> | null =
        null;

    readonly devBusy =
        computed(
            () =>
                this.devWaiting()
                ||
                this.devReloading()
                ||
                !!this.devStatus()?.busy
        );

    // Footer label while a job runs / after a failed build
    readonly devLabel =
        computed(
            () =>
            {
                if (!this.devMode())
                {
                    return '';
                }

                if (this.devReloading())
                {
                    return 'Reloading…';
                }

                const status =
                    this.devStatus();

                if (!status)
                {
                    return '';
                }

                if (status.busy)
                {
                    switch (status.state)
                    {
                        case 'stopping':
                            return 'Stopping…';

                        case 'building':
                            return 'Building…';

                        default:
                            return 'Restarting…';
                    }
                }

                if (status.state === 'failed' && status.errorCount > 0)
                {
                    return `Build failed – ${status.errorCount} error${status.errorCount === 1 ? '' : 's'}`;
                }

                return '';
            }
        );

    readonly devFailed =
        computed(
            () =>
                !this.devBusy()
                &&
                this.devStatus()?.state === 'failed'
        );


    //===========================================================
    // Server
    //===========================================================

    readonly serverLabel =
        computed(
            () =>
            {
                switch
                (
                    this.server().state
                )
                {
                    case 'online':
                        return 'Server online';

                    case 'degraded':
                        return 'Database offline';

                    case 'offline':
                        return 'Server offline';

                    default:
                        return 'Checking server…';
                }
            }
        );

    readonly serverTitle =
        computed(
            () =>
            {
                const status =
                    this.server();

                const checked =
                    status.checkedAt
                    ? ' · checked ' +
                        new Date(
                            status.checkedAt
                        )
                        .toLocaleTimeString()
                    : '';

                switch
                (
                    status.state
                )
                {
                    case 'online':
                        return `The server and database are answering${checked}`;

                    case 'degraded':
                        return `The server is up but cannot reach the database${checked}`;

                    case 'offline':
                        return `The server is not answering${checked}. Checking again every 30 seconds.`;

                    default:
                        return 'Checking the server…';
                }
            }
        );


    //===========================================================
    // Session
    //===========================================================

    readonly sessionLeft =
        computed(
            () =>
            {
                const expiresAt =
                    this.expiresAt();

                return expiresAt === null
                    ? null
                    : Math.max(
                        0,
                        expiresAt - this.now()
                    );
            }
        );

    readonly sessionWarning =
        computed(
            () =>
            {
                const left =
                    this.sessionLeft();

                return left !== null
                    &&
                    left <= SESSION_WARNING_MS;
            }
        );

    readonly sessionLabel =
        computed(
            () =>
            {
                const left =
                    this.sessionLeft();

                if
                (
                    left === null
                )
                {
                    return '';
                }

                const totalSeconds =
                    Math.floor(
                        left / 1000
                    );

                const days =
                    Math.floor(
                        totalSeconds / 86400
                    );

                const hours =
                    Math.floor(
                        (totalSeconds % 86400) / 3600
                    );

                const minutes =
                    Math.floor(
                        (totalSeconds % 3600) / 60
                    );

                const seconds =
                    totalSeconds % 60;

                if
                (
                    days > 0
                )
                {
                    return `${days}d ${hours}h`;
                }

                if
                (
                    hours > 0
                )
                {
                    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
                }

                if
                (
                    left > SESSION_WARNING_MS
                )
                {
                    return `${minutes}m`;
                }

                return `${minutes}:${String(seconds).padStart(2, '0')}`;
            }
        );

    readonly sessionTitle =
        computed(
            () =>
            {
                const expiresAt =
                    this.expiresAt();

                return expiresAt === null
                    ? ''
                    : 'You will be signed out at ' +
                        new Date(
                            expiresAt
                        )
                        .toLocaleString(
                            'en-GB',
                            {
                                dateStyle:
                                    'medium',

                                timeStyle:
                                    'short'
                            }
                        );
            }
        );


    //===========================================================
    // Lifecycle
    //===========================================================

    ngOnInit():
        void
    {
        this.expiresAt.set(
            this.shellService.sessionExpiresAt()
        );

        this.shellService.checkHealth();

        this.healthTimer =
            setInterval(
                () =>
                {
                    if
                    (
                        !document.hidden
                    )
                    {
                        this.shellService.checkHealth();
                    }
                },
                HEALTH_EVERY_MS
            );

        this.secondTimer =
            setInterval(
                () =>
                    this.tick(),
                1000
            );

        this.initDevMode();
    }


    ngOnDestroy():
        void
    {
        if
        (
            this.healthTimer
        )
        {
            clearInterval(
                this.healthTimer
            );
        }

        if
        (
            this.secondTimer
        )
        {
            clearInterval(
                this.secondTimer
            );
        }

        this.stopDevPolling();
    }


    //===========================================================
    // Dev server
    //===========================================================

    private initDevMode():
        void
    {
        if (!this.devAgent.available)
        {
            return;
        }

        this.feedbackService
            .me()
            .subscribe(
            {
                next:
                    me =>
                    {
                        this.devMode.set(!!me?.isDeveloper);

                        if (me?.isDeveloper)
                        {
                            void this.refreshDev();
                        }
                    },

                error:
                    () =>
                        this.devMode.set(false)
            });
    }

    toggleDev(event: MouseEvent):
        void
    {
        if (!this.devMode())
        {
            return;
        }

        if (this.devOpen())
        {
            this.devOpen.set(false);

            if (!this.devWaiting())
            {
                this.stopDevPolling();
            }

            return;
        }

        const box =
            (event.currentTarget as HTMLElement).getBoundingClientRect();

        this.devPanelLeft.set(Math.max(8, Math.round(box.left - 10)));

        this.devPanelBottom.set(Math.round(window.innerHeight - box.top + 10));

        this.devMessage.set('');

        this.devOpen.set(true);

        void this.refreshDev();

        this.startDevPolling();
    }

    closeDev():
        void
    {
        this.devOpen.set(false);

        if (!this.devWaiting())
        {
            this.stopDevPolling();
        }
    }

    async runDev(action: 'build-restart' | 'restart'):
        Promise<void>
    {
        if (this.devBusy())
        {
            return;
        }

        this.devMessage.set('');

        const result =
            await this.devAgent.start(action);

        if (!result.ok)
        {
            this.devAgentDown.set(result.error === 'The dev agent is not running');

            this.devMessage.set(result.error);

            return;
        }

        this.devJobId =
            result.jobId;

        this.devWaiting.set(true);

        this.startDevPolling();

        void this.refreshDev();
    }

    private startDevPolling():
        void
    {
        if (this.devTimer)
        {
            return;
        }

        this.devTimer =
            setInterval(
                () =>
                    void this.refreshDev(),
                1000
            );
    }

    private stopDevPolling():
        void
    {
        if (this.devTimer)
        {
            clearInterval(
                this.devTimer
            );

            this.devTimer =
                null;
        }
    }

    private async refreshDev():
        Promise<void>
    {
        const status =
            await this.devAgent.status();

        this.devAgentDown.set(status === null);

        if (status)
        {
            this.devStatus.set(status);
        }

        // our job has finished
        if
        (
            this.devWaiting()
            &&
            status
            &&
            status.jobId >= this.devJobId
            &&
            !status.busy
        )
        {
            this.devWaiting.set(false);

            if (status.state === 'running')
            {
                await this.reloadWhenApiAnswers();

                return;
            }

            // failed : keep the panel open with the errors
            this.devOpen.set(true);

            this.shellService.checkHealth();
        }

        if (!this.devOpen() && !this.devWaiting())
        {
            this.stopDevPolling();
        }
    }

    // Build + restart went well : reload the UI once the API answers
    private async reloadWhenApiAnswers():
        Promise<void>
    {
        this.stopDevPolling();

        this.devReloading.set(true);

        for (let i = 0; i < 60; i++)
        {
            if (await this.devAgent.apiHealthy())
            {
                window.location.reload();

                return;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        this.devReloading.set(false);

        this.devMessage.set('The API started but does not answer yet. Reload the page when it does.');

        this.shellService.checkHealth();
    }

    devSeconds(ms: number | null | undefined):
        string
    {
        return ms === null || ms === undefined
            ? ''
            : `${Math.max(1, Math.round(ms / 1000))} s`;
    }


    //===========================================================
    // About
    //===========================================================

    openAbout():
        void
    {
        this.aboutClick.emit();
    }


    //===========================================================
    // Every Second
    //===========================================================

    private tick():
        void
    {
        this.now.set(
            Date.now()
        );

        // The token can change (e.g. a new login in another tab).
        const expiresAt =
            this.shellService.sessionExpiresAt();

        if
        (
            expiresAt !== this.expiresAt()
        )
        {
            this.expiresAt.set(
                expiresAt
            );
        }

        const left =
            this.sessionLeft();

        if
        (
            left === null
            ||
            expiresAt === null
        )
        {
            return;
        }

        //=======================================================
        // 5-minute warning (once per token)
        //=======================================================

        if
        (
            left > 0
            &&
            left <= SESSION_WARNING_MS
            &&
            this.warnedFor !== expiresAt
        )
        {
            this.warnedFor =
                expiresAt;

            this.toast.warning(
                'Session ending soon',
                'You will be signed out in about 5 minutes. Save your work, then sign in again.',
                10000
            );
        }

        //=======================================================
        // Expired: sign out
        //=======================================================

        if
        (
            left <= 0
            &&
            !this.signingOut
        )
        {
            this.signingOut =
                true;

            this.toast.warning(
                'Session ended',
                'Your session has ended. Please sign in again.'
            );

            this.authenticationStorageService
                .clearAuthentication();

            void this.router.navigate(
                [
                    '/login'
                ],
                {
                    replaceUrl:
                        true
                }
            );
        }
    }

}