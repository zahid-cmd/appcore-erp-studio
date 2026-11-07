//===============================================================
// Deployment Center List
//
// Deployments : New -> a Draft (release notes, commit); Deploy
//               runs from the record (check git, build here,
//               send, back up, install). Running / finished
//               rows open their record (live progress, log).
// Releases    : the releases kept on the server; "Roll back"
//               switches the live site to an older one.
//===============================================================

import
{
    Component,
    OnInit,
    OnDestroy,
    inject,
    ChangeDetectorRef,
    ViewChild,
    ElementRef
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
    DeploymentCenter,
    DeploymentProgress,
    DeploymentPreflight,
    DeploymentServerOption,
    ServerRelease
}
from '../../../models/deployment-center.model';

import
{
    PageHeaderComponent
}
from '../../../../../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    PageCanvasComponent,
    PageCanvasConfig
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    SearchBoxComponent
}
from '../../../../../../shared/components/utilities/search-box/search-box';

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
    ListTableComponent,
    ListTableColumn,
    ListTableRowAction,
    ListTableActions
}
from '../../../../../../shared/components/layout/list-table/list-table';

import
{
    PaginationComponent
}
from '../../../../../../shared/components/controls/pagination/pagination';

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
    DeploymentCenterService
}
from '../../../services/deployment-center.service';


// A deployment row with the display fields the table shows
interface DeploymentRow
    extends DeploymentCenter
{
    commitShort: string;

    startedText: string;

    durationText: string;
}

// A release row
interface ReleaseRow
    extends ServerRelease
{
    commitShort: string;

    createdText: string;

    liveText: string;
}


@Component(
{
    selector:'deploymentCenter-list',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        ControlTabsComponent,
        SearchBoxComponent,
        DropdownComponent,
        CommandCenterComponent,
        PageCanvasComponent,
        ListTableComponent,
        PaginationComponent,
        ConfirmDialogComponent,
        ToastComponent
    ],
    templateUrl:'./deployment-center-list.html',
    styleUrl:'./deployment-center-list.css'
})
export class DeploymentCenterList
implements OnInit, OnDestroy
{
    private readonly service =
        inject(DeploymentCenterService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly route =
        inject(ActivatedRoute);

    private readonly cdr =
        inject(ChangeDetectorRef);


    //===========================================================
    // Tabs / Server
    //===========================================================

    tabs:
        ControlTab[] =
    [
        { id:'deployments', label:'Deployments' },
        { id:'releases',    label:'Releases on Server' }
    ];

    selectedTab:
        string =
        'deployments';

    servers:
        DeploymentServerOption[] =
    [];

    serverItems:
        any[] =
    [];

    selectedServer:
        string | null =
        null;


    //===========================================================
    // Deployments
    //===========================================================

    deployments:
        DeploymentRow[] =
    [];

    filteredDeployments:
        DeploymentRow[] =
    [];

    pagedDeployments:
        DeploymentRow[] =
    [];

    searchText:
        string =
        '';

    loading:
        boolean =
        false;

    loadFailed:
        boolean =
        false;

    currentPage:
        number =
        1;

    pageSize:
        number =
        10;


    //===========================================================
    // Releases
    //===========================================================

    releases:
        ReleaseRow[] =
    [];

    releasesLoading:
        boolean =
        false;

    releasesFailed:
        boolean =
        false;

    releasesMessage:
        string =
        '';


    //===========================================================
    // Running job (the list refreshes while it runs)
    //===========================================================

    private refreshTimer?:
        ReturnType<typeof setInterval>;


    //===========================================================
    // Canvas / Columns
    //===========================================================

    readonly canvasConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:true,
        reserveFooterSpace:true,
        bodyScrollable:true,
        fixedHeight:true,
        visibleRows:10,
        rowHeight:32,
        headerHeight:36,
        footerHeight:56
    };

    readonly deploymentColumns:
        ListTableColumn[] =
    [
        { header:'#',        field:'serial',          type:'serial', width:'50px',  align:'center' },
        { header:'Release',  field:'code',            width:'90px',  align:'center' },
        { header:'Kind',     field:'kind',            width:'90px',  align:'center' },
        { header:'Title',    field:'name',            align:'left' },
        { header:'Server',   field:'serverName',      width:'140px', align:'left' },
        { header:'Commit',   field:'commitShort',     width:'90px',  align:'center' },
        { header:'Started',  field:'startedText',     width:'160px', align:'center' },
        { header:'Duration', field:'durationText',    width:'90px',  align:'center' },
        { header:'By',       field:'performedByName', width:'130px', align:'left' },
        { header:'Result',   field:'deployStatus',    type:'status', width:'120px', align:'center' },
        { header:'Actions',  field:'actions',         type:'actions', width:'150px', align:'center' }
    ];

    readonly deploymentActions:
        ListTableActions =
    {
        view:true,
        edit:false,
        delete:false
    };

    // only a Draft can be deployed, changed or deleted
    readonly deploymentRowActions:
        ListTableRowAction[] =
    [
        {
            key:'deploy',
            icon:'fas fa-rocket',
            title:'Deploy this draft',
            tone:'primary',
            visible:(row:any) => row.deployStatus === 'Draft'
        },
        {
            key:'edit',
            icon:'fas fa-pen',
            title:'Edit the draft',
            tone:'default',
            visible:(row:any) => row.deployStatus === 'Draft'
        },
        {
            key:'delete',
            icon:'fas fa-trash',
            title:'Delete the draft',
            tone:'danger',
            visible:(row:any) => row.deployStatus === 'Draft'
        }
    ];

    readonly releaseColumns:
        ListTableColumn[] =
    [
        { header:'#',           field:'serial',      type:'serial', width:'50px',  align:'center' },
        { header:'Release',     field:'release',     width:'110px', align:'center' },
        { header:'Commit',      field:'commitShort', width:'110px', align:'center' },
        { header:'Deployed By', field:'deployedBy',  align:'left' },
        { header:'Installed',   field:'createdText', width:'180px', align:'center' },
        { header:'Live',        field:'liveText',    type:'status', width:'110px', align:'center' },
        { header:'Actions',     field:'actions',     type:'actions', width:'90px', align:'center' }
    ];

    readonly releaseActions:
        ListTableActions =
    {
        view:false,
        edit:false,
        delete:false
    };

    readonly releaseRowActions:
        ListTableRowAction[] =
    [
        {
            key:'rollback',
            icon:'fas fa-clock-rotate-left',
            title:'Roll back to this release',
            tone:'danger',
            visible:(row:any) => !row.isCurrent
        }
    ];


    //===========================================================
    // Init / Destroy
    //===========================================================

    ngOnInit():
        void
    {
        this.loadServers();

        this.loadDeployments();
    }

    ngOnDestroy():
        void
    {
        this.stopRefresh();
    }


    //===========================================================
    // Servers
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
                            !this.selectedServer
                            &&
                            this.servers.length > 0
                        )
                        {
                            this.selectedServer =
                                this.servers[0].publicId;
                        }

                        if
                        (
                            this.selectedTab === 'releases'
                            &&
                            !this.releasesLoading
                        )
                        {
                            this.loadReleases();
                        }

                        this.cdr.detectChanges();
                    },
                error:
                    error =>
                    {
                        console.error('Load Servers Error', error);

                        this.toast.error(
                            'Servers',
                            'Unable to load the servers of Server Management.'
                        );
                    }
            });
    }

    get server():
        DeploymentServerOption | undefined
    {
        return this.servers.find(
            x => x.publicId === this.selectedServer
        );
    }

    onServerChange
    (
        value:
            string | null
    ):
        void
    {
        this.selectedServer =
            value;

        if (this.selectedTab === 'releases')
        {
            this.loadReleases();
        }
    }

    onTabChange
    (
        tab:
            string
    ):
        void
    {
        this.selectedTab =
            tab;

        if (tab === 'releases')
        {
            this.loadReleases();
        }
    }


    //===========================================================
    // Deployments
    //===========================================================

    loadDeployments
    (
        silent:
            boolean = false
    ):
        void
    {
        this.loading =
            !silent;

        this.loadFailed =
            false;

        this.service
            .getAll()
            .subscribe
            ({
                next:
                    rows =>
                    {
                        this.deployments =
                            (rows ?? []).map(x => this.toRow(x));

                        this.applyFilters();

                        this.loading =
                            false;

                        // a job runs : refresh every 3 seconds
                        if (this.running)
                        {
                            this.startRefresh();
                        }
                        else
                        {
                            this.stopRefresh();
                        }

                        this.cdr.detectChanges();
                    },
                error:
                    error =>
                    {
                        console.error('Load Deployments Error', error);

                        this.deployments = [];
                        this.filteredDeployments = [];
                        this.pagedDeployments = [];

                        this.loading = false;
                        this.loadFailed = true;

                        this.toast.error(
                            'Load Failed',
                            'Unable to load deployments.'
                        );

                        this.cdr.detectChanges();
                    }
            });
    }

    private toRow
    (
        x:
            DeploymentCenter
    ):
        DeploymentRow
    {
        return {
            ...x,
            commitShort:
                (x.commitHash ?? '').substring(0, 7),
            startedText:
                x.startedDate
                    ? new Date(x.startedDate).toLocaleString()
                    : 'not deployed',
            durationText:
                x.deployStatus === 'Running'
                    ? `${x.percent}%`
                    : x.deployStatus === 'Draft'
                        ? '-'
                        : this.durationText(x.durationSeconds)
        };
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

    applyFilters():
        void
    {
        const keyword =
            this.searchText
                .trim()
                .toLowerCase();

        this.filteredDeployments =
            this.deployments.filter
            (
                x =>
                    !keyword
                    ||
                    [
                        x.code,
                        x.kind,
                        x.name,
                        x.serverName,
                        x.commitHash,
                        x.commitMessage,
                        x.performedByName,
                        x.deployStatus,
                        x.remarks
                    ]
                    .some(value => (value ?? '').toLowerCase().includes(keyword))
            );

        this.currentPage =
            1;

        this.updatePagination();
    }

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText =
            value;

        this.applyFilters();
    }

    onSort
    (
        event:
        {
            field:
                string;

            direction:
                'asc' | 'desc';
        }
    ):
        void
    {
        const sign =
            event.direction === 'asc' ? 1 : -1;

        const field =
            event.field === 'startedText'
                ? 'startedDate'
                : event.field;

        this.filteredDeployments =
            [...this.filteredDeployments].sort
            (
                (a, b) =>
                    sign
                    *
                    String((a as any)[field] ?? '')
                        .localeCompare(
                            String((b as any)[field] ?? ''),
                            undefined,
                            { numeric:true }
                        )
            );

        this.currentPage =
            1;

        this.updatePagination();
    }

    updatePagination():
        void
    {
        const start =
            (this.currentPage - 1) * this.pageSize;

        this.pagedDeployments =
            this.filteredDeployments.slice(
                start,
                start + this.pageSize
            );
    }

    onPageChange
    (
        page:
            number
    ):
        void
    {
        this.currentPage =
            page;

        this.updatePagination();
    }

    onPageSizeChange
    (
        size:
            number
    ):
        void
    {
        this.pageSize =
            size;

        this.currentPage =
            1;

        this.updatePagination();
    }

    refresh():
        void
    {
        this.searchText =
            '';

        this.loadServers();

        this.loadDeployments();
    }

    view
    (
        item:
            DeploymentCenter
    ):
        void
    {
        void this.router.navigate(
            [ 'view', item.publicId ],
            { relativeTo:this.route.parent }
        );
    }


    //===========================================================
    // Releases on the server
    //===========================================================

    loadReleases():
        void
    {
        const server =
            this.server;

        this.releases =
            [];

        this.releasesFailed =
            false;

        this.releasesMessage =
            '';

        if (!server)
        {
            this.releasesMessage =
                'Choose a server.';

            return;
        }

        this.releasesLoading =
            true;

        this.service
            .getReleases(
                server.publicId
            )
            .subscribe
            ({
                next:
                    rows =>
                    {
                        this.releases =
                            (rows ?? []).map
                            (
                                x =>
                                ({
                                    ...x,
                                    commitShort:
                                        (x.commit ?? '').substring(0, 7),
                                    createdText:
                                        x.createdAt
                                            ? new Date(x.createdAt).toLocaleString()
                                            : '',
                                    liveText:
                                        x.isCurrent ? 'Live' : ''
                                })
                            );

                        this.releasesLoading =
                            false;

                        if (this.releases.length === 0)
                        {
                            this.releasesMessage =
                                `No release on ${server.name} yet. Deploy first.`;
                        }

                        this.cdr.detectChanges();
                    },
                error:
                    error =>
                    {
                        this.releasesLoading =
                            false;

                        this.releasesFailed =
                            true;

                        this.releasesMessage =
                            error?.error?.message
                            ??
                            `Unable to read the releases of ${server.name}.`;

                        this.cdr.detectChanges();
                    }
            });
    }

    onReleaseAction
    (
        event:
        {
            key:
                string;

            row:
                any;
        }
    ):
        void
    {
        if (event.key === 'rollback')
        {
            this.rollback(
                event.row as ReleaseRow
            );
        }
    }


    //===========================================================
    // New / Running job
    //===========================================================

    // the running job (if any)
    get running():
        DeploymentRow | undefined
    {
        return this.deployments.find(
            x => x.deployStatus === 'Running'
        );
    }

    // New : prepare a draft. A job runs : open it.
    add():
        void
    {
        const running =
            this.running;

        if (running)
        {
            this.view(running);

            return;
        }

        void this.router.navigate(
            [ 'add' ],
            { relativeTo:this.route.parent }
        );
    }

    get newText():
        string
    {
        const running =
            this.running;

        return running
            ? `${running.code}  ${running.percent}%`
            : 'New';
    }

    get newIcon():
        string
    {
        return this.running
            ? 'fas fa-spinner fa-spin'
            : 'fas fa-plus';
    }

    private startRefresh():
        void
    {
        if (!this.refreshTimer)
        {
            this.refreshTimer =
                setInterval(
                    () => this.loadDeployments(true),
                    3000
                );
        }
    }

    private stopRefresh():
        void
    {
        if (this.refreshTimer)
        {
            clearInterval(this.refreshTimer);

            this.refreshTimer =
                undefined;
        }
    }

    onDeploymentAction
    (
        event:
        {
            key:
                string;

            row:
                any;
        }
    ):
        void
    {
        const row =
            event.row as DeploymentRow;

        switch (event.key)
        {
            case 'deploy':
                // the record starts the check at once
                void this.router.navigate(
                    [ 'view', row.publicId ],
                    {
                        relativeTo:this.route.parent,
                        queryParams:{ deploy:1 }
                    }
                );
                break;

            case 'edit':
                void this.router.navigate(
                    [ 'edit', row.publicId ],
                    { relativeTo:this.route.parent }
                );
                break;

            case 'delete':
                this.deleteDraft(row);
                break;
        }
    }

    private deleteDraft
    (
        row:
            DeploymentRow
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Draft',
            `Delete the draft ${row.code} ? Nothing was deployed.`,
            (): void =>
            {
                this.service
                    .delete(
                        row.publicId
                    )
                    .subscribe
                    ({
                        next:
                            () =>
                            {
                                this.toast.success(
                                    'Deleted',
                                    `${row.code} deleted.`
                                );

                                this.loadDeployments();
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


    //===========================================================
    // Rollback
    //===========================================================

    private rollback
    (
        row:
            ReleaseRow
    ):
        void
    {
        const server =
            this.server;

        if (!server)
        {
            return;
        }

        const running =
            this.running;

        if (running)
        {
            this.toast.warning(
                'Roll back',
                `${running.code} is still running.`
            );

            return;
        }

        this.confirmDialog.open
        (
            `Roll back ${server.name} to ${row.release}`,
            `The live site switches to ${row.release} (about 1 minute offline). `
            + 'The database is NOT changed: if a newer release changed tables, '
            + 'restore the backup made before that deployment.',
            (): void =>
            {
                this.service
                    .rollback
                    ({
                        serverPublicId:server.publicId,
                        release:row.release,
                        remarks:''
                    })
                    .subscribe
                    ({
                        next:
                            job =>
                            {
                                // the record shows the live progress
                                void this.router.navigate(
                                    [ 'view', job.publicId ],
                                    { relativeTo:this.route.parent }
                                );
                            },
                        error:
                            error =>
                            {
                                console.error('Rollback Error', error);

                                this.toast.error(
                                    'Roll back',
                                    error?.error?.message
                                    ??
                                    'The rollback could not be started.'
                                );
                            }
                    });
            },
            'Roll back',
            'Cancel',
            'danger'
        );
    }


    //===========================================================
    // Summary
    //===========================================================

    get summaryTotal():
        number
    {
        return this.deployments
            .filter(x => x.kind === 'Deploy')
            .length;
    }

    get summarySucceeded():
        number
    {
        return this.deployments
            .filter(x => x.kind === 'Deploy' && x.deployStatus === 'Succeeded')
            .length;
    }

    get summaryFailed():
        number
    {
        return this.deployments
            .filter(x => x.deployStatus === 'Failed' || x.deployStatus === 'Rolled back')
            .length;
    }

    get lastSuccess():
        DeploymentRow | undefined
    {
        return this.deployments.find(
            x => x.kind === 'Deploy' && x.deployStatus === 'Succeeded'
        );
    }
}
