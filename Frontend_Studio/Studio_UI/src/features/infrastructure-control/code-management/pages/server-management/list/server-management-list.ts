//===============================================================
// Server Management List
//
// Live servers for the Deployment Center. Each row can be
// checked at once with the plug button (Test Connection : asks
// the server's Deploy Agent).
//===============================================================

import
{
    Component,
    OnInit,
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
    ServerManagement
}
from '../../../models/server-management.model';

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
    ListTableRowAction
}
from '../../../../../../shared/components/layout/list-table/list-table';

import
{
    PaginationComponent
}
from '../../../../../../shared/components/controls/pagination/pagination';

import
{
    HistoryDrawerComponent
}
from '../../../../../../shared/components/utilities/history-drawer/history-drawer';

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
    ServerManagementService
}
from '../../../services/server-management.service';


// A row with the display fields the table shows
interface ServerRow
    extends ServerManagement
{
    endpoint: string;

    checkText: string;

    lastCheckedText: string;
}


@Component(
{
    selector:'serverManagement-list',
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
        HistoryDrawerComponent,
        ConfirmDialogComponent,
        ToastComponent
    ],
    templateUrl:'./server-management-list.html',
    styleUrl:'./server-management-list.css'
})
export class ServerManagementList
implements OnInit
{
    private readonly servermanagementservice =
        inject(ServerManagementService);

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
    // Tabs / Filters
    //===========================================================

    tabs:
        ControlTab[] =
    [
        {
            id:'all',
            label:'All Servers'
        }
    ];

    selectedTab:
        string =
        'all';

    statusItems:
        any[] =
    [
        { value:null,  text:'All Status' },
        { value:true,  text:'Active' },
        { value:false, text:'Inactive' }
    ];

    selectedStatus:
        boolean | null =
        null;


    //===========================================================
    // Data
    //===========================================================

    servers:
        ServerRow[] =
    [];

    filteredServers:
        ServerRow[] =
    [];

    pagedServers:
        ServerRow[] =
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

    // the server being tested (one at a time)
    testingId:
        number =
        0;


    //===========================================================
    // History
    //===========================================================

    historyOpened:
        boolean =
        false;

    historyTitle:
        string =
        'Server Management History';

    historyItems:
        any[] =
    [];


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

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#',            field:'serial',          type:'serial', width:'50px',  align:'center' },
        { header:'Code',         field:'code',            width:'100px', align:'center' },
        { header:'Name',         field:'name',            align:'left' },
        { header:'Agent',        field:'endpoint',        width:'190px', align:'left' },
        { header:'App URL',      field:'appUrl',          width:'230px', align:'left' },
        { header:'Environment',  field:'environment',     width:'110px', align:'center' },
        { header:'Live Release', field:'currentRelease',  width:'110px', align:'center' },
        { header:'Last Check',   field:'checkText',       type:'status', width:'130px', align:'center' },
        { header:'Checked',      field:'lastCheckedText', width:'150px', align:'center' },
        { header:'Status',       field:'status',          type:'status', width:'90px',  align:'center' },
        { header:'Actions',      field:'actions',         type:'actions', width:'170px', align:'center' }
    ];

    readonly rowActions:
        ListTableRowAction[] =
    [
        {
            key:'test',
            icon:'fas fa-plug',
            title:'Test Connection',
            tone:'primary'
        }
    ];


    //===========================================================
    // Init / Load
    //===========================================================

    ngOnInit():
        void
    {
        this.loadItems();
    }

    loadItems():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        this.servermanagementservice
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        ServerManagement[]
                ): void =>
                {
                    this.servers =
                        (response ?? []).map(x => this.toRow(x));

                    this.applyFilters();

                    this.loading =
                        false;

                    this.cdr.detectChanges();
                },
                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error('Load Servers Error', error);

                    this.servers = [];
                    this.filteredServers = [];
                    this.pagedServers = [];

                    this.loading = false;
                    this.loadFailed = true;

                    this.toast.error(
                        'Load Failed',
                        'Unable to load servers.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    private toRow
    (
        x:
            ServerManagement
    ):
        ServerRow
    {
        return {
            ...x,
            endpoint:
                x.hostAddress
                    ? `${x.hostAddress}:${x.agentPort}`
                    : '',
            // Online (green) / Offline, Token rejected (red);
            // blank = never checked
            checkText:
                x.lastCheckStatus ?? '',
            lastCheckedText:
                x.lastCheckedDate
                    ? new Date(x.lastCheckedDate).toLocaleString()
                    : 'Never'
        };
    }


    //===========================================================
    // Filters / Search / Sort
    //===========================================================

    onStatusFilterChange
    (
        value:
            boolean | null
    ):
        void
    {
        this.selectedStatus =
            value;

        this.applyFilters();
    }

    applyFilters():
        void
    {
        const keyword =
            this.searchText
                .trim()
                .toLowerCase();

        this.filteredServers =
            this.servers.filter
            (
                x =>
                    (
                        this.selectedStatus === null
                        ||
                        x.status === this.selectedStatus
                    )
                    &&
                    (
                        !keyword
                        ||
                        [
                            x.code,
                            x.name,
                            x.hostAddress,
                            x.appUrl,
                            x.environment,
                            x.currentRelease,
                            x.lastCheckStatus,
                            x.remarks
                        ]
                        .some(value => (value ?? '').toLowerCase().includes(keyword))
                    )
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

        this.filteredServers =
            [...this.filteredServers].sort
            (
                (a, b) =>
                    sign
                    *
                    String((a as any)[event.field] ?? '')
                        .localeCompare(
                            String((b as any)[event.field] ?? ''),
                            undefined,
                            { numeric:true }
                        )
            );

        this.currentPage =
            1;

        this.updatePagination();
    }

    refresh():
        void
    {
        this.searchText =
            '';

        this.selectedStatus =
            null;

        this.loadItems();
    }


    //===========================================================
    // Pagination
    //===========================================================

    updatePagination():
        void
    {
        const start =
            (this.currentPage - 1) * this.pageSize;

        this.pagedServers =
            this.filteredServers.slice(
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


    //===========================================================
    // Row actions
    //===========================================================

    onRowAction
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
        if (event.key === 'test')
        {
            this.testConnection(
                event.row as ServerRow
            );
        }
    }

    private testConnection
    (
        row:
            ServerRow
    ):
        void
    {
        if
        (
            this.testingId
            ||
            !row.publicId
        )
        {
            return;
        }

        this.testingId =
            row.id;

        this.toast.info(
            'Test Connection',
            `Asking ${row.hostAddress}:${row.agentPort} ...`
        );

        this.servermanagementservice
            .testConnection(
                row.publicId
            )
            .subscribe
            ({
                next:
                    result =>
                    {
                        this.testingId =
                            0;

                        if (result.success)
                        {
                            this.toast.success(
                                `${row.name} is online`,
                                result.message
                            );
                        }
                        else
                        {
                            this.toast.error(
                                `${row.name} : ${result.status}`,
                                result.message
                            );
                        }

                        this.loadItems();
                    },
                error:
                    error =>
                    {
                        this.testingId =
                            0;

                        console.error('Test Connection Error', error);

                        this.toast.error(
                            'Test Connection',
                            error?.error?.message
                            ??
                            'The test could not be run.'
                        );
                    }
            });
    }


    //===========================================================
    // Navigation
    //===========================================================

    add():
        void
    {
        void this.router.navigate(
            [ 'add' ],
            { relativeTo:this.route.parent }
        );
    }

    view
    (
        item:
            ServerManagement
    ):
        void
    {
        void this.router.navigate(
            [ 'view', item.publicId ],
            { relativeTo:this.route.parent }
        );
    }

    edit
    (
        item:
            ServerManagement
    ):
        void
    {
        void this.router.navigate(
            [ 'edit', item.publicId ],
            { relativeTo:this.route.parent }
        );
    }


    //===========================================================
    // Delete / Restore
    //===========================================================

    delete
    (
        item:
            ServerManagement
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Server',
            `Are you sure you want to delete "${item.code} - ${item.name}" ? Deployments to it will no longer be possible.`,
            (): void =>
            {
                this.servermanagementservice
                    .delete(
                        item.publicId ?? ''
                    )
                    .subscribe
                    ({
                        next:
                            () =>
                            {
                                this.toast.success(
                                    'Delete Successful',
                                    `${item.name} deleted.`
                                );

                                this.loadItems();
                            },
                        error:
                            error =>
                            {
                                console.error('Delete Server Error', error);

                                this.toast.error(
                                    'Delete Failed',
                                    'Failed to delete the server.'
                                );
                            }
                    });
            }
        );
    }

    restore():
        void
    {
        this.confirmDialog.open
        (
            'Restore Server',
            'Are you sure you want to restore the most recently deleted server?',
            (): void =>
            {
                this.servermanagementservice
                    .restore()
                    .subscribe
                    ({
                        next:
                            () =>
                            {
                                this.toast.success(
                                    'Restore Successful',
                                    'The most recently deleted server has been restored.'
                                );

                                this.loadItems();
                            },
                        error:
                            error =>
                            {
                                this.toast.error(
                                    'Restore',
                                    error?.error?.message
                                    ??
                                    'Failed to restore the server.'
                                );
                            }
                    });
            },
            'Restore',
            'Cancel',
            'primary'
        );
    }


    //===========================================================
    // History
    //===========================================================

    openHistory():
        void
    {
        this.servermanagementservice
            .getHistory()
            .subscribe
            ({
                next:
                    response =>
                    {
                        this.historyItems =
                            response.map
                            (
                                history =>
                                ({
                                    title:
                                        history.activityTitle,
                                    description:
                                        history.activityDescription,
                                    user:
                                        history.performedByName ?? 'System',
                                    dateTime:
                                        new Date(history.performedDate).toLocaleString(),
                                    badge:
                                        history.activityType
                                })
                            );

                        this.historyTitle =
                            'Server Management History';

                        this.historyOpened =
                            true;

                        this.cdr.detectChanges();
                    },
                error:
                    error =>
                    {
                        console.error('History Load Failed', error);

                        this.toast.error(
                            'History',
                            'Failed to load the server history.'
                        );
                    }
            });
    }

    closeHistory():
        void
    {
        this.historyOpened =
            false;
    }


    //===========================================================
    // Summary
    //===========================================================

    get summaryTotal():
        number
    {
        return this.servers.length;
    }

    get summaryActive():
        number
    {
        return this.servers
            .filter(x => x.status)
            .length;
    }

    get summaryOnline():
        number
    {
        return this.servers
            .filter(x => x.lastCheckStatus === 'Online')
            .length;
    }

    summaryText
    (
        value:
            number
    ):
        string
    {
        return value.toLocaleString('en-US');
    }
}
