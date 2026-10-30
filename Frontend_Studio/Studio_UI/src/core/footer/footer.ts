//===============================================================
// App Footer
// --------------------------------------------------------------
// Version · Server status · Session time left · © · About · brand
//
// Server status : GET api/platform/health every 30 seconds
//                 green online · amber database down · red offline
// Session       : from the login token's expiry ("exp").
//                 5 minutes before the end a warning toast is
//                 shown once; at the end the user is signed out
//                 and taken to the login page.
//===============================================================

import
{
    Component,
    EventEmitter,
    OnDestroy,
    OnInit,
    Output,
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