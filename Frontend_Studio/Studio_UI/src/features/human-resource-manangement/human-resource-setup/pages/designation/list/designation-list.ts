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
    Designation
}
from '../../../models/designation.model';

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
    DesignationService
}
from '../../../services/designation.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'designation-list',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        ControlTabsComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        PageCanvasComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ConfirmDialogComponent,
        ToastComponent
    ],
    templateUrl:'./designation-list.html',
    styleUrl:'./designation-list.css'
})

//===============================================================
// Designation List
//===============================================================

export class DesignationList
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly designationservice =
        inject(DesignationService);
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
            label:'All Designations'
        }
    ];
    selectedTab:
        string =
        'all';

    //===========================================================
    // Data
    //===========================================================

    designations:
        Designation[] =
    [];
    filteredDesignations:
        Designation[] =
    [];
    pagedDesignations:
        Designation[] =
    [];

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
        'Designation History';
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
            header:'Designation Code',
            field:'DesignationCode',
            width:'180px',
            align:'center'
        },
        {
            header:'Designation Name',
            field:'DesignationName',
            width:'280px',
            align:'left'
        },
        {
            header:'Short Name',
            field:'DesignationShortName',
            width:'180px',
            align:'left'
        },
        {
            header:'Status',
            field:'IsActive',
            width:'120px',
            align:'center',
            type:'status'
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

    private normalizeDesignation
    (
        item:
            any
    ):
        Designation
    {
        return {
            DesignationId:
                Number
                (
                    item?.DesignationId
                    ??
                    item?.designationId
                    ??
                    item?.id
                    ??
                    item?.Id
                    ??
                    0
                ),
            DesignationCode:
                item?.DesignationCode
                ??
                item?.designationCode
                ??
                '',
            DesignationName:
                item?.DesignationName
                ??
                item?.designationName
                ??
                '',
            DesignationShortName:
                item?.DesignationShortName
                ??
                item?.designationShortName
                ??
                '',
            Remarks:
                item?.Remarks
                ??
                item?.remarks
                ??
                '',
            IsActive:
                Boolean
                (
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

    private normalizeDesignations
    (
        response:
            any
    ):
        Designation[]
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
                this.normalizeDesignation(
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
        this.designationservice
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        Designation[]
                ):
                    void =>
                {
                    console.log
                    (
                        'Designation API Response:',
                        response
                    );
                    this.designations =
                        this.normalizeDesignations(
                            response
                        );
                    console.log
                    (
                        'Normalized Designations:',
                        this.designations
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
                        'Load Designations Error:',
                        error
                    );
                    this.designations =
                        [];
                    this.filteredDesignations =
                        [];
                    this.pagedDesignations =
                        [];
                    this.loading =
                        false;
                    this.loadFailed =
                        true;
                    this.toast.error
                    (
                        'Load Failed',
                        'Unable to load designations.'
                    );
                    this.cdr.detectChanges();
                }
            });
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
        this.filteredDesignations =
            this.designations.filter
            (
                (
                    item:
                        Designation
                ):
                    boolean =>
                {
                    const designationCode =
                        item.DesignationCode
                        ??
                        '';
                    const designationName =
                        item.DesignationName
                        ??
                        '';
                    const designationShortName =
                        item.DesignationShortName
                        ??
                        '';
                    const remarks =
                        item.Remarks
                        ??
                        '';
                    const status =
                        item.IsActive
                            ? 'active'
                            : 'inactive';
                    return (
                        !keyword
                        ||
                        designationCode
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        designationName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        designationShortName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        remarks
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        status
                            .includes(keyword)
                    );
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
        this.filteredDesignations =
        [
            ...this.filteredDesignations
        ];
        this.filteredDesignations.sort
        (
            (
                a:
                    Designation,
                b:
                    Designation
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof Designation
                    ];
                const valueB:
                    any =
                    b[
                        event.field as keyof Designation
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
        this.pagedDesignations =
        [
            ...this.filteredDesignations.slice
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
                'add'
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
            Designation
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',
                item.DesignationId
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
            Designation
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',
                item.DesignationId
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
            Designation
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Designation',
            `Are you sure you want to delete "${item.DesignationName}" ?`,
            (): void =>
            {
                this.designationservice
                    .delete
                    (
                        item.DesignationId
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
                                `${item.DesignationName} deleted successfully.`
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
                                'Delete Designation Error:',
                                error
                            );

                            //===================================================
                            // Deletion Blocked
                            //===================================================

                            if
                            (
                                error instanceof HttpErrorResponse
                                &&
                                error.status === 409
                            )
                            {
                                let message =
                                    'Designation cannot be deleted because it is already configured.';
                                if
                                (
                                    typeof error.error === 'string'
                                    &&
                                    error.error.trim()
                                )
                                {
                                    message =
                                        error.error;
                                }
                                else if
                                (
                                    error.error?.message
                                )
                                {
                                    message =
                                        error.error.message;
                                }
                                else if
                                (
                                    error.error?.title
                                )
                                {
                                    message =
                                        error.error.title;
                                }
                                this.toast.info
                                (
                                    'Delete Blocked',
                                    message
                                );
                                return;
                            }

                            //===================================================
                            // Delete Failed
                            //===================================================

                            this.toast.error
                            (
                                'Delete Failed',
                                'Failed to delete designation.'
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
            'Restore Designation',
            'Are you sure you want to restore the most recently deleted designation?',
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
        this.designationservice
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
                        'The most recently deleted designation has been restored.'
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
                        'Restore Designation Error',
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
                            'There is no deleted designation record to restore.'
                        );
                        return;
                    }
                    this.toast.error
                    (
                        'Restore Failed',
                        'Failed to restore designation.'
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
        this.designationservice
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
                        'Designation Management History';
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
                        'Failed to load designation history.'
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
