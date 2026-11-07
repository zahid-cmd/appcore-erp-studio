//===============================================================
// Deployment Center : one deployment / rollback
//
// view/:id shows the details and the full log; while the job
// runs the page follows it (every 2 seconds). Deployments are
// started from the list (Deploy button), so add / edit go back
// to the list.
//===============================================================

import
{
    Component,
    OnInit,
    OnDestroy,
    inject,
    ChangeDetectorRef
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    PageHeaderComponent
}
from '../../../../../../shared/components/layout/page-header/page-header';

import
{
    PageCanvasComponent
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

import
{
    DeploymentCenter
}
from '../../../models/deployment-center.model';

import
{
    DeploymentCenterService
}
from '../../../services/deployment-center.service';


@Component(
{
    selector:'deploymentCenter-form',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageCanvasComponent,
        CommandCenterComponent,
        ToastComponent
    ],
    templateUrl:'./deployment-center-form.html',
    styleUrl:'./deployment-center-form.css'
})
export class DeploymentCenterForm
implements OnInit, OnDestroy
{
    private readonly service =
        inject(DeploymentCenterService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly route =
        inject(ActivatedRoute);

    private readonly cdr =
        inject(ChangeDetectorRef);

    item:
        DeploymentCenter | null =
        null;

    loading:
        boolean =
        true;

    loadFailed:
        boolean =
        false;

    // follow the end of the log
    followLog:
        boolean =
        true;

    private publicId:
        string =
        '';

    private timer?:
        ReturnType<typeof setInterval>;

    private busy:
        boolean =
        false;


    //===========================================================
    // Init / Destroy
    //===========================================================

    ngOnInit():
        void
    {
        this.publicId =
            (this.route.snapshot.paramMap.get('id') ?? '').trim();

        // add / edit : deployments start from the list
        if
        (
            !this.publicId
            ||
            this.router.url.includes('/edit/')
        )
        {
            this.onBackToList();

            return;
        }

        this.load();
    }

    ngOnDestroy():
        void
    {
        this.stop();
    }


    //===========================================================
    // Load
    //===========================================================

    load():
        void
    {
        if (this.busy)
        {
            return;
        }

        this.busy =
            true;

        this.service
            .getById(
                this.publicId
            )
            .subscribe
            ({
                next:
                    item =>
                    {
                        this.busy =
                            false;

                        this.item =
                            item;

                        this.loading =
                            false;

                        if (item.deployStatus === 'Running')
                        {
                            this.start();
                        }
                        else
                        {
                            this.stop();
                        }

                        this.cdr.detectChanges();

                        if (this.followLog)
                        {
                            setTimeout(() => this.scrollLogToEnd(), 0);
                        }
                    },
                error:
                    error =>
                    {
                        this.busy =
                            false;

                        this.loading =
                            false;

                        if (!this.item)
                        {
                            this.loadFailed =
                                true;

                            console.error('Load Deployment Error', error);

                            this.toast.error(
                                'Deployment',
                                'Unable to load this deployment.'
                            );
                        }

                        this.cdr.detectChanges();
                    }
            });
    }

    private start():
        void
    {
        if (!this.timer)
        {
            this.timer =
                setInterval(
                    () => this.load(),
                    2000
                );
        }
    }

    private stop():
        void
    {
        if (this.timer)
        {
            clearInterval(this.timer);

            this.timer =
                undefined;
        }
    }

    private scrollLogToEnd():
        void
    {
        const log =
            document.querySelector('.dc-log');

        if (log)
        {
            log.scrollTop =
                log.scrollHeight;
        }
    }


    //===========================================================
    // Display
    //===========================================================

    get title():
        string
    {
        if (!this.item)
        {
            return 'Deployment';
        }

        return this.item.kind === 'Rollback'
            ? `Roll back to ${this.item.code}`
            : `Deployment ${this.item.code}`;
    }

    get tone():
        string
    {
        switch (this.item?.deployStatus)
        {
            case 'Succeeded':   return 'ok';
            case 'Rolled back': return 'warn';
            case 'Failed':      return 'bad';
            default:            return 'run';
        }
    }

    dateText
    (
        value?:
            string | null
    ):
        string
    {
        return value
            ? new Date(value).toLocaleString()
            : '-';
    }

    durationText
    (
        seconds:
            number
    ):
        string
    {
        const s =
            Math.max(0, Math.round(seconds ?? 0));

        return s >= 60
            ? `${Math.floor(s / 60)}m ${s % 60}s`
            : `${s}s`;
    }

    copyLog():
        void
    {
        const text =
            this.item?.log ?? '';

        if (!text)
        {
            return;
        }

        navigator.clipboard
            ?.writeText(text)
            .then
            (
                () => this.toast.success('Log', 'The log is copied.'),
                () => this.toast.error('Log', 'The log could not be copied.')
            );
    }

    onBackToList():
        void
    {
        void this.router.navigate(
            [ 'list' ],
            { relativeTo:this.route.parent }
        );
    }
}
