//===============================================================
// Deployment Center : one deployment
//
//   add       New deployment : server, title, release notes
//             (commit messages since the last release) -> Draft
//   edit/:id  change a Draft (or take the latest commit)
//   view/:id  the record. A Draft has Deploy : check git ->
//             confirm -> live progress in a popup. A running
//             job opens its popup; a finished one shows the
//             result and the full log.
//
// view/:id?deploy=1 (from the list) starts the check at once.
//===============================================================

import
{
    Component,
    OnInit,
    OnDestroy,
    inject,
    ChangeDetectorRef,
    ViewChild,
    ElementRef,
    HostListener
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
    Observable
}
from 'rxjs';

import
{
    PageHeaderComponent
}
from '../../../../../../shared/components/layout/page-header/page-header';

import
{
    PageCanvasComponent,
    PageCanvasConfig
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    TextboxComponent
}
from '../../../../../../shared/components/controls/textbox/textbox';

import
{
    DropdownComponent
}
from '../../../../../../shared/components/controls/dropdown/dropdown';

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
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    ConfirmDialogComponent
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    DeploymentCenter,
    DeploymentDraftDefaults,
    DeploymentPreflight,
    DeploymentProgress,
    DeploymentServerOption
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
        TextboxComponent,
        DropdownComponent,
        CommandCenterComponent,
        ToastComponent,
        ConfirmDialogComponent
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

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly router =
        inject(Router);

    private readonly route =
        inject(ActivatedRoute);

    private readonly cdr =
        inject(ChangeDetectorRef);


    //===========================================================
    // Mode / Data
    //===========================================================

    mode:
        'add' | 'edit' | 'view' =
        'view';

    publicId:
        string =
        '';

    item:
        DeploymentCenter | null =
        null;

    loading:
        boolean =
        true;

    loadFailed:
        boolean =
        false;

    saving:
        boolean =
        false;

    servers:
        DeploymentServerOption[] =
    [];

    serverItems:
        any[] =
    [];

    // add / edit
    serverPublicId:
        string | null =
        null;

    title:
        string =
        '';

    releaseNotes:
        string =
        '';

    remarks:
        string =
        '';

    // what the next release would contain (add / edit)
    draft:
        DeploymentDraftDefaults | null =
        null;

    draftLoading:
        boolean =
        false;

    // edit : take the latest pushed commit on save
    updateCommit:
        boolean =
        false;

    // view : follow the end of the saved log
    followSavedLog:
        boolean =
        true;


    //===========================================================
    // Popup (check -> confirm -> live job)
    //===========================================================

    liveOpen:
        boolean =
        false;

    popupMode:
        'check' | 'confirm' | 'problems' | 'job' =
        'job';

    preflight:
        DeploymentPreflight | null =
        null;

    preflightError:
        string =
        '';

    checking:
        boolean =
        false;

    starting:
        boolean =
        false;

    live:
        DeploymentProgress | null =
        null;

    followLog:
        boolean =
        true;

    private lastPercent:
        number =
        0;

    private pollTimer?:
        ReturnType<typeof setInterval>;

    private polling:
        boolean =
        false;

    @ViewChild('logBox')
    logBox?:
        ElementRef<HTMLElement>;

    @ViewChild('savedLog')
    savedLog?:
        ElementRef<HTMLElement>;


    //===========================================================
    // Init / Destroy
    //===========================================================

    ngOnInit():
        void
    {
        const url =
            this.router.url;

        this.publicId =
            (this.route.snapshot.paramMap.get('id') ?? '').trim();

        this.mode =
            !this.publicId
                ? 'add'
                : url.includes('/edit/')
                    ? 'edit'
                    : 'view';

        this.loadServers();

        if (this.mode === 'add')
        {
            this.loading =
                false;

            return;
        }

        this.load(
            this.route.snapshot.queryParamMap.get('deploy') === '1'
        );
    }

    ngOnDestroy():
        void
    {
        this.stopPolling();
    }


    //===========================================================
    // Load
    //===========================================================

    private loadServers():
        void
    {
        this.service
            .getServers()
            .subscribe
            ({
                next:
                    servers =>
                    {
                        this.servers =
                            servers ?? [];

                        this.serverItems =
                            this.servers.map
                            (
                                x =>
                                ({
                                    value:x.publicId,
                                    text:`${x.code} - ${x.name}`
                                })
                            );

                        if
                        (
                            this.mode === 'add'
                            &&
                            !this.serverPublicId
                            &&
                            this.servers.length > 0
                        )
                        {
                            this.serverPublicId =
                                this.servers[0].publicId;
                        }

                        if (this.mode === 'add')
                        {
                            this.loadDraftDefaults(true);
                        }

                        this.cdr.detectChanges();
                    },
                error:
                    () =>
                    {
                        this.toast.error(
                            'Servers',
                            'Unable to load the servers of Server Management.'
                        );
                    }
            });
    }

    load
    (
        startDeploy:
            boolean = false
    ):
        void
    {
        this.service
            .getById(
                this.publicId
            )
            .subscribe
            ({
                next:
                    item =>
                    {
                        this.item =
                            item;

                        this.loading =
                            false;

                        if (this.mode === 'edit')
                        {
                            if (item.deployStatus !== 'Draft')
                            {
                                this.toast.warning(
                                    item.code,
                                    `${item.code} is ${item.deployStatus}: only a draft can be changed.`
                                );

                                this.goView();

                                return;
                            }

                            this.serverPublicId =
                                item.serverPublicId ?? null;

                            this.title =
                                item.name;

                            this.releaseNotes =
                                item.releaseNotes;

                            this.remarks =
                                item.remarks;

                            this.loadDraftDefaults(false);
                        }

                        // a running job : show its progress
                        if
                        (
                            this.mode === 'view'
                            &&
                            item.deployStatus === 'Running'
                            &&
                            !this.pollTimer
                        )
                        {
                            this.follow(item.publicId);
                        }

                        if
                        (
                            startDeploy
                            &&
                            item.deployStatus === 'Draft'
                        )
                        {
                            this.runPreflight();
                        }

                        this.cdr.detectChanges();

                        if (this.followSavedLog)
                        {
                            setTimeout(() => this.scrollToEnd(this.savedLog), 0);
                        }
                    },
                error:
                    error =>
                    {
                        this.loading =
                            false;

                        this.loadFailed =
                            true;

                        console.error('Load Deployment Error', error);

                        this.toast.error(
                            'Deployment',
                            'Unable to load this deployment.'
                        );

                        this.cdr.detectChanges();
                    }
            });
    }

    // next release, commit and release notes for the chosen server
    loadDraftDefaults
    (
        fillNotes:
            boolean
    ):
        void
    {
        this.draftLoading =
            true;

        this.service
            .getDraftDefaults(
                this.serverPublicId
            )
            .subscribe
            ({
                next:
                    draft =>
                    {
                        this.draft =
                            draft;

                        this.draftLoading =
                            false;

                        if (fillNotes)
                        {
                            this.releaseNotes =
                                draft.releaseNotes;

                            if (!this.title)
                            {
                                this.title =
                                    draft.commitMessage;
                            }
                        }

                        this.cdr.detectChanges();
                    },
                error:
                    () =>
                    {
                        this.draftLoading =
                            false;

                        this.toast.error(
                            'Repository',
                            'Unable to read the repository (Source Control).'
                        );

                        this.cdr.detectChanges();
                    }
            });
    }

    onServerChange
    (
        value:
            string | null
    ):
        void
    {
        this.serverPublicId =
            value;

        // notes are "since the last release on this server"
        if (this.mode === 'add')
        {
            this.loadDraftDefaults(true);
        }
    }

    refillNotes():
        void
    {
        if (this.draft)
        {
            this.releaseNotes =
                this.draft.releaseNotes;
        }
    }

    onNotesInput
    (
        event:
            Event
    ):
        void
    {
        this.releaseNotes =
            (event.target as HTMLTextAreaElement).value;
    }

    onRemarksInput
    (
        event:
            Event
    ):
        void
    {
        this.remarks =
            (event.target as HTMLTextAreaElement).value;
    }

    toggleUpdateCommit():
        void
    {
        this.updateCommit =
            !this.updateCommit;
    }


    //===========================================================
    // Save (add / edit)
    //===========================================================

    save():
        void
    {
        if (this.saving)
        {
            return;
        }

        if (!this.serverPublicId)
        {
            this.toast.warning(
                'Deployment',
                'Choose a server.'
            );

            return;
        }

        const dto =
        {
            serverPublicId:this.serverPublicId,
            name:this.title.trim(),
            releaseNotes:this.releaseNotes.trim(),
            remarks:this.remarks.trim(),
            updateCommit:this.updateCommit
        };

        this.saving =
            true;

        // one type for both (create answers the new id)
        const request:
            Observable<any> =
            this.mode === 'add'
                ? this.service.create(dto)
                : this.service.update(this.publicId, dto);

        request.subscribe
        ({
            next:
                (result:any) =>
                {
                    this.saving =
                        false;

                    const id =
                        result?.publicId ?? this.publicId;

                    this.toast.success(
                        'Saved',
                        this.mode === 'add'
                            ? `${result?.code ?? 'The deployment'} is saved as a draft. Press Deploy when ready.`
                            : 'The draft is updated.'
                    );

                    void this.router.navigate(
                        [ 'view', id ],
                        { relativeTo:this.route.parent }
                    );
                },
            error:
                (error:any) =>
                {
                    this.saving =
                        false;

                    this.toast.error(
                        'Save',
                        error?.error?.message
                        ??
                        'The deployment could not be saved.'
                    );
                }
        });
    }

    deleteDraft():
        void
    {
        if (this.item?.deployStatus !== 'Draft')
        {
            return;
        }

        this.confirmDialog.open
        (
            'Delete Draft',
            `Delete the draft ${this.item.code} ? Nothing was deployed.`,
            (): void =>
            {
                this.service
                    .delete(
                        this.publicId
                    )
                    .subscribe
                    ({
                        next:
                            () =>
                            {
                                this.toast.success(
                                    'Deleted',
                                    `${this.item?.code} deleted.`
                                );

                                this.onBackToList();
                            },
                        error:
                            error =>
                            {
                                this.toast.error(
                                    'Delete',
                                    error?.error?.message
                                    ??
                                    'The draft could not be deleted.'
                                );
                            }
                    });
            }
        );
    }


    //===========================================================
    // Deploy : check -> confirm -> start
    //===========================================================

    deploy():
        void
    {
        if (this.item?.deployStatus === 'Running')
        {
            this.popupMode =
                'job';

            this.liveOpen =
                true;

            return;
        }

        if
        (
            this.item?.deployStatus !== 'Draft'
            ||
            this.checking
        )
        {
            return;
        }

        this.runPreflight();
    }

    runPreflight():
        void
    {
        this.live =
            null;

        this.preflight =
            null;

        this.preflightError =
            '';

        this.popupMode =
            'check';

        this.liveOpen =
            true;

        this.checking =
            true;

        this.service
            .getPreflight()
            .subscribe
            ({
                next:
                    check =>
                    {
                        this.checking =
                            false;

                        this.preflight =
                            check;

                        this.popupMode =
                            check.ready
                                ? 'confirm'
                                : 'problems';

                        this.cdr.detectChanges();
                    },
                error:
                    error =>
                    {
                        this.checking =
                            false;

                        this.preflightError =
                            error?.error?.message
                            ??
                            'The repository check could not be run. Is the API running?';

                        this.popupMode =
                            'problems';

                        this.cdr.detectChanges();
                    }
            });
    }

    // the draft was saved with an older commit than GitHub has now
    get commitChanged():
        boolean
    {
        return !!this.preflight
            &&
            !!this.item
            &&
            !!this.item.commitHash
            &&
            this.preflight.commitHash !== this.item.commitHash;
    }

    confirmDeploy():
        void
    {
        if (this.starting)
        {
            return;
        }

        this.starting =
            true;

        this.service
            .deploy(
                this.publicId
            )
            .subscribe
            ({
                next:
                    job =>
                    {
                        this.starting =
                            false;

                        this.follow(job.publicId);
                    },
                error:
                    error =>
                    {
                        this.starting =
                            false;

                        this.preflightError =
                            error?.error?.message
                            ??
                            'The deployment could not be started.';

                        this.preflight =
                            null;

                        this.popupMode =
                            'problems';

                        this.cdr.detectChanges();
                    }
            });
    }

    cancelPopup():
        void
    {
        if (this.checking)
        {
            return;
        }

        this.liveOpen =
            false;

        this.preflight =
            null;

        this.popupMode =
            'job';
    }


    //===========================================================
    // Live job (poll every second)
    //===========================================================

    private follow
    (
        publicId:
            string
    ):
        void
    {
        this.stopPolling();

        this.live =
            null;

        this.popupMode =
            'job';

        this.preflight =
            null;

        this.followLog =
            true;

        this.lastPercent =
            0;

        this.liveOpen =
            true;

        this.pollOnce(publicId);

        this.pollTimer =
            setInterval(
                () => this.pollOnce(publicId),
                1000
            );
    }

    private pollOnce
    (
        publicId:
            string
    ):
        void
    {
        if (this.polling)
        {
            return;
        }

        this.polling =
            true;

        this.service
            .getProgress(
                publicId,
                300
            )
            .subscribe
            ({
                next:
                    progress =>
                    {
                        this.polling =
                            false;

                        if
                        (
                            !progress.finished
                            ||
                            this.lastPercent === 0
                        )
                        {
                            this.lastPercent =
                                progress.percent;
                        }

                        this.live =
                            progress;

                        if (progress.finished)
                        {
                            this.stopPolling();

                            if (!this.liveOpen)
                            {
                                this.announce(progress);
                            }

                            // the record : result + full log
                            this.load();
                        }

                        this.cdr.detectChanges();

                        if (this.followLog)
                        {
                            setTimeout(() => this.scrollToEnd(this.logBox), 0);
                        }
                    },
                error:
                    () =>
                    {
                        // the API may be busy: try again next second
                        this.polling =
                            false;
                    }
            });
    }

    private announce
    (
        progress:
            DeploymentProgress
    ):
        void
    {
        switch (progress.deployStatus)
        {
            case 'Succeeded':
                this.toast.success(`${progress.code} succeeded`, progress.step);
                break;

            case 'Rolled back':
                this.toast.warning(`${progress.code} was rolled back`, progress.step);
                break;

            default:
                this.toast.error(`${progress.code} failed`, progress.step);
                break;
        }
    }

    private stopPolling():
        void
    {
        if (this.pollTimer)
        {
            clearInterval(this.pollTimer);

            this.pollTimer =
                undefined;
        }

        this.polling =
            false;
    }

    // finished : back to the list (the record behind shows the
    // same result; it stays one click away there)
    closeLive():
        void
    {
        if
        (
            this.live
            &&
            !this.live.finished
        )
        {
            this.hideLive();

            return;
        }

        this.liveOpen =
            false;

        this.popupMode =
            'job';

        this.onBackToList();
    }

    // running : back to the list; the job continues there (the
    // New button shows its progress and opens it again)
    hideLive():
        void
    {
        this.liveOpen =
            false;

        this.stopPolling();

        this.onBackToList();
    }

    onLogScroll():
        void
    {
        const box =
            this.logBox?.nativeElement;

        if (box)
        {
            this.followLog =
                box.scrollHeight - box.scrollTop - box.clientHeight < 30;
        }
    }

    onSavedLogScroll():
        void
    {
        const box =
            this.savedLog?.nativeElement;

        if (box)
        {
            this.followSavedLog =
                box.scrollHeight - box.scrollTop - box.clientHeight < 30;
        }
    }

    private scrollToEnd
    (
        ref?:
            ElementRef<HTMLElement>
    ):
        void
    {
        const box =
            ref?.nativeElement;

        if (box)
        {
            box.scrollTop =
                box.scrollHeight;
        }
    }

    get stages():
        { label: string; icon: string; state: string }[]
    {
        const deploy =
        [
            { label:'Check',  icon:'fas fa-code-branch',   from:0,  to:5 },
            { label:'API',    icon:'fas fa-server',        from:5,  to:35 },
            { label:'UI',     icon:'fas fa-display',       from:35, to:65 },
            { label:'Send',   icon:'fas fa-paper-plane',   from:65, to:80 },
            { label:'Server', icon:'fas fa-shield-halved', from:80, to:100 }
        ];

        const rollback =
        [
            { label:'Ask server', icon:'fas fa-paper-plane',       from:0,  to:10 },
            { label:'Switch',     icon:'fas fa-clock-rotate-left', from:10, to:100 }
        ];

        const live =
            this.live;

        const list =
            live?.kind === 'Rollback'
                ? rollback
                : deploy;

        const percent =
            live?.percent ?? 0;

        let failedAt =
            -1;

        if
        (
            live?.finished
            &&
            live.deployStatus !== 'Succeeded'
        )
        {
            failedAt =
                list.findIndex(x => this.lastPercent < x.to);

            if (failedAt < 0)
            {
                failedAt =
                    list.length - 1;
            }
        }

        return list.map
        (
            (x, i) =>
            {
                let state =
                    'waiting';

                if (live?.finished)
                {
                    state =
                        failedAt < 0 || i < failedAt
                            ? 'done'
                            : i === failedAt
                                ? 'failed'
                                : 'waiting';
                }
                else if (percent >= x.to)
                {
                    state =
                        'done';
                }
                else if (percent >= x.from)
                {
                    state =
                        'current';
                }

                return {
                    label:x.label,
                    icon:x.icon,
                    state
                };
            }
        );
    }


    //===========================================================
    // Display
    //===========================================================

    get server():
        DeploymentServerOption | undefined
    {
        const id =
            this.mode === 'view'
                ? this.item?.serverPublicId
                : this.serverPublicId;

        return this.servers.find(
            x => x.publicId === id
        );
    }

    get pageTitle():
        string
    {
        switch (this.mode)
        {
            case 'add':
                return 'New Deployment';

            case 'edit':
                return `Edit ${this.item?.code ?? ''}`;

            default:
                return this.item
                    ? (this.item.kind === 'Rollback' ? `Roll back to ${this.item.code}` : `Deployment ${this.item.code}`)
                    : 'Deployment';
        }
    }

    get pageSubtitle():
        string
    {
        switch (this.mode)
        {
            case 'add':
                return 'Prepare a release : it is saved as a draft and deployed from its record';

            case 'edit':
                return 'Change the draft before it is deployed';

            default:
                return this.item?.deployStatus === 'Draft'
                    ? 'Draft : review it, then press Deploy'
                    : 'Details, release notes and log';
        }
    }

    get liveTitle():
        string
    {
        if (this.popupMode !== 'job')
        {
            return `Deploy ${this.item?.code ?? ''}`;
        }

        if (!this.live)
        {
            return 'Starting ...';
        }

        return this.live.kind === 'Rollback'
            ? `Roll back to ${this.live.code}`
            : `Deploy ${this.live.code}`;
    }

    get liveLogText():
        string
    {
        return (this.live?.log ?? []).join('\n');
    }

    liveTone():
        string
    {
        if (this.popupMode === 'problems')
        {
            return 'bad';
        }

        if (this.popupMode !== 'job')
        {
            return 'run';
        }

        return this.toneOf(this.live?.deployStatus);
    }

    toneOf
    (
        status?:
            string
    ):
        string
    {
        switch (status)
        {
            case 'Succeeded':   return 'ok';
            case 'Rolled back': return 'warn';
            case 'Failed':      return 'bad';
            case 'Draft':       return 'draft';
            default:            return 'run';
        }
    }

    short
    (
        hash?:
            string | null
    ):
        string
    {
        return (hash ?? '').substring(0, 7);
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

    get notesLines():
        string[]
    {
        return (this.item?.releaseNotes ?? '')
            .split('\n')
            .map(x => x.trim())
            .filter(x => x.length > 0);
    }


    //===========================================================
    // Canvas : footer (repository status) on New / Edit
    //===========================================================

    private readonly formCanvas:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:true,
        reserveFooterSpace:true,
        bodyScrollable:false,
        fixedHeight:true
    };

    private readonly viewCanvas:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:false,
        reserveFooterSpace:false,
        bodyScrollable:false,
        fixedHeight:true
    };

    get canvasConfig():
        PageCanvasConfig
    {
        return this.mode === 'view'
            ? this.viewCanvas
            : this.formCanvas;
    }

    get footerTone():
        string
    {
        if (!this.draft)
        {
            return 'run';
        }

        return this.draft.problems.length > 0
            ? 'warn'
            : 'ok';
    }


    //===========================================================
    // Source Control (new browser tab) and back
    //===========================================================

    // the Source Control page in a new tab : this page (and what
    // was typed) stays; coming back re-checks the repository
    openSourceControl():
        void
    {
        const tree =
            this.router.createUrlTree(
                [ '../source-control' ],
                { relativeTo:this.route.parent }
            );

        this.awayToSourceControl =
            true;

        window.open(
            this.router.serializeUrl(tree),
            '_blank'
        );
    }

    private awayToSourceControl:
        boolean =
        false;

    @HostListener('window:focus')
    onWindowFocus():
        void
    {
        if (!this.awayToSourceControl)
        {
            return;
        }

        this.awayToSourceControl =
            false;

        if (this.mode !== 'view')
        {
            // empty notes are filled; typed notes are kept
            this.loadDraftDefaults(
                !this.releaseNotes.trim()
            );

            return;
        }

        if
        (
            this.liveOpen
            &&
            this.popupMode === 'problems'
        )
        {
            this.runPreflight();
        }
    }


    //===========================================================
    // Commands
    //===========================================================

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

    openSite():
        void
    {
        const url =
            this.server?.appUrl;

        if (url)
        {
            window.open(url, '_blank', 'noopener');
        }
    }

    edit():
        void
    {
        void this.router.navigate(
            [ 'edit', this.publicId ],
            { relativeTo:this.route.parent }
        );
    }

    goView():
        void
    {
        void this.router.navigate(
            [ 'view', this.publicId ],
            { relativeTo:this.route.parent }
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
