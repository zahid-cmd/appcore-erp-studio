//===============================================================
// Imports
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
    HttpErrorResponse
}
from '@angular/common/http';

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

//===============================================================
// Models
//===============================================================

import
{
    PageCloning
}
from '../../../model/page-cloning.model';

//===============================================================
// Shared Components
//===============================================================

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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

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
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    ListTableComponent,
    ListTableColumn
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

//===============================================================
// Service
//===============================================================

import
{
    PageCloningService
}
from '../../../services/page-cloning.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'page-cloning-list',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        ControlTabsComponent,
        SearchBoxComponent,
        SearchDropdownComponent,
        CommandCenterComponent,
        PageCanvasComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ConfirmDialogComponent,
        ToastComponent
    ],
    templateUrl:'./page-cloning-list.html',
    styleUrl:'./page-cloning-list.css'
})
//===============================================================
// Page Cloning List
//===============================================================

export class PageCloningListComponent
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================
    private readonly pageCloningService =
        inject(PageCloningService);
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
    // Page Tabs
    //===========================================================
    tabs:
        ControlTab[] =
    [
        {
            id:'all',
            label:'Page Cloning'
        }
    ];
    selectedTab:
        string =
        'all';
    //===========================================================
    // Data
    //===========================================================
    pageClonings:
        PageCloning[] =
    [];
    filteredPageClonings:
        PageCloning[] =
    [];
    pagedPageClonings:
        PageCloning[] =
    [];
    //===========================================================
    // Run Status Filter
    //===========================================================
    statusFilterItems:
        any[] =
    [
        {
            label:'All Run Status',
            value:null
        },
        {
            label:'Draft',
            value:'Draft'
        },
        {
            label:'Previewed',
            value:'Previewed'
        },
        {
            label:'Applied',
            value:'Applied'
        },
        {
            label:'Build Failed',
            value:'BuildFailed'
        },
        {
            label:'Restored',
            value:'Restored'
        }
    ];
    selectedStatus:
        string | null =
        null;
    //===========================================================
    // Search & Loading
    //===========================================================
    searchText:
        string =
        '';
    loading:
        boolean =
        false;
    loadFailed:
        boolean =
        false;
    //===========================================================
    // Pagination
    //===========================================================
    currentPage:
        number =
        1;
    pageSize:
        number =
        10;
    //===========================================================
    // History
    //===========================================================
    historyOpened:
        boolean =
        false;
    historyTitle:
        string =
        'Page Cloning History';
    historyItems:
        any[] =
    [];
    //===========================================================
    // Page Canvas Configuration
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
    //===========================================================
    // Table Columns
    //===========================================================
    readonly columns:
        ListTableColumn[] =
    [
        {
            header:'#',
            field:'serial',
            type:'serial',
            width:'50px',
            align:'center'
        },
        {
            header:'Clone From',
            field:'CloneFromName',
            width:'240px',
            align:'left'
        },
        {
            header:'Clone To',
            field:'CloneToName',
            width:'240px',
            align:'left'
        },
        {
            header:'Entity',
            field:'EntityName',
            width:'200px',
            align:'left'
        },
        {
            header:'Files',
            field:'NumberOfFiles',
            width:'80px',
            align:'center'
        },
        {
            header:'Run Status',
            field:'RunStatus',
            width:'140px',
            align:'center'
        },
        {
            header:'Last Run',
            field:'LastRunText',
            width:'180px',
            align:'center'
        },
        {
            header:'Actions',
            field:'actions',
            type:'actions',
            width:'80px',
            align:'center'
        }
    ];
    //===========================================================
    // Initialize
    //===========================================================
    ngOnInit():
        void
    {
        this.loadItems();
    }
    //===========================================================
    // Normalize API Response
    //===========================================================
    private normalizePageCloning
    (
        item:
            any
    ):
        PageCloning & { LastRunText: string }
    {
        const lastRun =
            item?.LastRunDate
            ??
            item?.lastRunDate
            ??
            null;
        return {
            PageCloningId:
                Number(
                    item?.PageCloningId
                    ??
                    item?.pageCloningId
                    ??
                    item?.id
                    ??
                    item?.Id
                    ??
                    0
                ),
            CloneFromId:
                Number(
                    item?.CloneFromId
                    ??
                    item?.cloneFromId
                    ??
                    0
                ),
            CloneFromCode:
                item?.CloneFromCode
                ??
                item?.cloneFromCode
                ??
                '',
            CloneFromName:
                item?.CloneFromName
                ??
                item?.cloneFromName
                ??
                '',
            CloneToId:
                Number(
                    item?.CloneToId
                    ??
                    item?.cloneToId
                    ??
                    0
                ),
            CloneToCode:
                item?.CloneToCode
                ??
                item?.cloneToCode
                ??
                '',
            CloneToName:
                item?.CloneToName
                ??
                item?.cloneToName
                ??
                '',
            EntityName:
                item?.EntityName
                ??
                item?.entityName
                ??
                '',
            BlueprintJson:
                item?.BlueprintJson
                ??
                item?.blueprintJson
                ??
                '',
            NumberOfFiles:
                Number(
                    item?.NumberOfFiles
                    ??
                    item?.numberOfFiles
                    ??
                    15
                ),
            RunStatus:
                item?.RunStatus
                ??
                item?.runStatus
                ??
                'Draft',
            LastRunDate:
                lastRun,
            LastRunText:
                lastRun
                    ? new Date(lastRun).toLocaleString()
                    : '-',
            BuildOutput:
                item?.BuildOutput
                ??
                item?.buildOutput
                ??
                '',
            Remarks:
                item?.Remarks
                ??
                item?.remarks
                ??
                '',
            IsActive:
                Boolean(
                    item?.IsActive
                    ??
                    item?.isActive
                    ??
                    true
                )
        };
    }
    //===========================================================
    // Normalize API Response List
    //===========================================================
    private normalizePageClonings
    (
        response:
            any
    ):
        PageCloning[]
    {
        if
        (
            !Array.isArray(response)
        )
        {
            return [];
        }
        return response.map
        (
            item =>
                this.normalizePageCloning(
                    item
                )
        );
    }
    //===========================================================
    // Load Items
    //===========================================================
    loadItems():
        void
    {
        this.loading =
            true;
        this.loadFailed =
            false;
        this.pageCloningService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        PageCloning[]
                ):
                    void =>
                {
                    this.pageClonings =
                        this.normalizePageClonings(
                            response
                        );
                    this.applyFilters();
                    this.loading =
                        false;
                    this.loadFailed =
                        false;
                    this.cdr.detectChanges();
                },
                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error
                    (
                        'Load Page Clonings Error:',
                        error
                    );
                    this.pageClonings =
                        [];
                    this.filteredPageClonings =
                        [];
                    this.pagedPageClonings =
                        [];
                    this.loading =
                        false;
                    this.loadFailed =
                        true;
                    this.toast.error
                    (
                        'Load Failed',
                        'Unable to load page cloning records.'
                    );
                    this.cdr.detectChanges();
                }
            });
    }
    //===========================================================
    // Status Filter Change
    //===========================================================
    onStatusFilterChange
    (
        value:
            string | null
    ):
        void
    {
        this.selectedStatus =
            value;
        this.applyFilters();
    }
    //===========================================================
    // Apply Filters
    //===========================================================
    applyFilters():
        void
    {
        const keyword =
            this.searchText
                .trim()
                .toLowerCase();
        this.filteredPageClonings =
            this.pageClonings.filter
            (
                (
                    item:
                        PageCloning
                ):
                    boolean =>
                {
                    const statusMatches =
                        this.selectedStatus === null
                        ||
                        item.RunStatus ===
                            this.selectedStatus;
                    const text =
                        [
                            item.CloneFromCode,
                            item.CloneFromName,
                            item.CloneToCode,
                            item.CloneToName,
                            item.EntityName,
                            item.RunStatus,
                            item.Remarks
                        ]
                            .join(' ')
                            .toLowerCase();
                    const keywordMatches =
                        !keyword
                        ||
                        text.includes(keyword);
                    return keywordMatches
                        &&
                        statusMatches;
                }
            );
        this.currentPage =
            1;
        this.updatePagination();
    }
    //===========================================================
    // Search
    //===========================================================
    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText =
            value
            ??
            '';
        this.applyFilters();
    }
    //===========================================================
    // Sort
    //===========================================================
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
        this.filteredPageClonings =
        [
            ...this.filteredPageClonings
        ];
        this.filteredPageClonings.sort
        (
            (
                a:
                    PageCloning,
                b:
                    PageCloning
            ):
                number =>
            {
                const valueA:
                    any =
                    (a as any)[
                        event.field
                    ];
                const valueB:
                    any =
                    (b as any)[
                        event.field
                    ];
                if
                (
                    valueA == null
                    &&
                    valueB == null
                )
                {
                    return 0;
                }
                if
                (
                    valueA == null
                )
                {
                    return -1;
                }
                if
                (
                    valueB == null
                )
                {
                    return 1;
                }
                if
                (
                    typeof valueA === 'string'
                    &&
                    typeof valueB === 'string'
                )
                {
                    return event.direction === 'asc'
                        ?
                            valueA.localeCompare(valueB)
                        :
                            valueB.localeCompare(valueA);
                }
                if
                (
                    valueA < valueB
                )
                {
                    return event.direction === 'asc'
                        ?
                            -1
                        :
                            1;
                }
                if
                (
                    valueA > valueB
                )
                {
                    return event.direction === 'asc'
                        ?
                            1
                        :
                            -1;
                }
                return 0;
            }
        );
        this.currentPage =
            1;
        this.updatePagination();
    }
    //===========================================================
    // Refresh
    //===========================================================
    refresh():
        void
    {
        this.searchText =
            '';
        this.selectedStatus =
            null;
        this.currentPage =
            1;
        this.loadItems();
    }
    //===========================================================
    // Update Pagination
    //===========================================================
    updatePagination():
        void
    {
        const start:
            number =
            (
                this.currentPage - 1
            )
            *
            this.pageSize;
        this.pagedPageClonings =
        [
            ...this.filteredPageClonings.slice
            (
                start,
                start + this.pageSize
            )
        ];
    }
    //===========================================================
    // Page Change
    //===========================================================
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
    //===========================================================
    // Page Size Change
    //===========================================================
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
    // Add
    //===========================================================
    add():
        void
    {
        void this.router.navigate
        (
            [
                'source'
            ],
            {
                relativeTo:
                    this.route.parent
            }
        );
    }
    //===========================================================
    // View
    //===========================================================
    view
    (
        item:
            PageCloning
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',
                item.PageCloningId
            ],
            {
                relativeTo:
                    this.route.parent
            }
        );
    }
    //===========================================================
    // Edit
    //===========================================================
    edit
    (
        item:
            PageCloning
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',
                item.PageCloningId
            ],
            {
                relativeTo:
                    this.route.parent
            }
        );
    }
    //===========================================================
    // Delete
    //===========================================================
    delete
    (
        item:
            PageCloning
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Page Cloning',
            `Are you sure you want to delete the clone "${item.CloneFromName}" to "${item.CloneToName}" ? Generated code files are not affected.`,
            ():
                void =>
            {
                this.pageCloningService
                    .delete
                    (
                        item.PageCloningId
                    )
                    .subscribe
                    ({
                        next:
                        ():
                            void =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',
                                'Page cloning record deleted successfully.'
                            );
                            this.loadItems();
                        },
                        error:
                        (
                            error:
                                unknown
                        ):
                            void =>
                        {
                            console.error
                            (
                                'Delete Page Cloning Error:',
                                error
                            );
                            if
                            (
                                error instanceof HttpErrorResponse
                                &&
                                error.status === 409
                            )
                            {
                                this.toast.info
                                (
                                    'Delete Blocked',
                                    typeof error.error === 'string'
                                    &&
                                    error.error.trim()
                                        ? error.error
                                        : 'Page cloning record cannot be deleted.'
                                );
                                return;
                            }
                            this.toast.error
                            (
                                'Delete Failed',
                                'Failed to delete page cloning record.'
                            );
                        }
                    });
            }
        );
    }
    //===========================================================
    // Restore
    //===========================================================
    restore():
        void
    {
        this.confirmDialog.open
        (
            'Restore Page Cloning',
            'Are you sure you want to restore the most recently deleted page cloning record?',
            ():
                void =>
            {
                this.restoreItem();
            },
            'Restore',
            'Cancel',
            'primary'
        );
    }
    //===========================================================
    // Restore Item
    //===========================================================
    private restoreItem():
        void
    {
        this.pageCloningService
            .restore()
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.toast.success
                    (
                        'Restore Successful',
                        'The most recently deleted page cloning record has been restored.'
                    );
                    this.loadItems();
                },
                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error
                    (
                        'Restore Page Cloning Error:',
                        error
                    );
                    if
                    (
                        error instanceof HttpErrorResponse
                        &&
                        error.status === 404
                    )
                    {
                        this.toast.info
                        (
                            'No Data to Restore',
                            'There is no deleted page cloning record to restore.'
                        );
                        return;
                    }
                    this.toast.error
                    (
                        'Restore Failed',
                        'Failed to restore page cloning record.'
                    );
                }
            });
    }
    //===========================================================
    // Open History
    //===========================================================
    openHistory():
        void
    {
        this.pageCloningService
            .getHistory()
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ):
                    void =>
                {
                    this.historyItems =
                        response.map
                        (
                            history =>
                            ({
                                title:
                                    history.activityTitle
                                    ??
                                    history.ActivityTitle,
                                description:
                                    history.activityDescription
                                    ??
                                    history.ActivityDescription,
                                user:
                                    history.performedByName
                                    ??
                                    history.PerformedByName
                                    ??
                                    'System',
                                dateTime:
                                    new Date
                                    (
                                        history.performedDate
                                        ??
                                        history.PerformedDate
                                    )
                                    .toLocaleString(),
                                badge:
                                    history.activityType
                                    ??
                                    history.ActivityType
                            })
                        );
                    this.historyTitle =
                        'Page Cloning Management History';
                    this.historyOpened =
                        true;
                    this.cdr.detectChanges();
                },
                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error
                    (
                        'History Load Failed:',
                        error
                    );
                    this.toast.error
                    (
                        'History',
                        'Failed to load page cloning history.'
                    );
                }
            });
    }
    //===========================================================
    // Close History
    //===========================================================
    closeHistory():
        void
    {
        this.historyOpened =
            false;
    }
}