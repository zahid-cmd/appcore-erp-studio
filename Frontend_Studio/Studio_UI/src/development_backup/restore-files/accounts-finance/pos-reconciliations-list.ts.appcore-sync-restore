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
    PosReconciliations
}
from '../../../models/pos-reconciliations.model';


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
    PosReconciliationsService
}
from '../../../services/pos-reconciliations.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'posReconciliations-list',

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

    templateUrl:'./pos-reconciliations-list.html',

    styleUrl:'./pos-reconciliations-list.css'
})


//===============================================================
// POS Reconciliations List Component
//===============================================================

export class PosReconciliationsList
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly posreconciliationsservice =
        inject(PosReconciliationsService);


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

            label:'All PosReconciliationses'
        }
    ];


    selectedTab:
        string =
        'all';



    //===========================================================
    // Status Filter
    //===========================================================

    statusItems:
        any[] =
    [
        {
            value:null,

            text:'All Status'
        },

        {
            value:'Active',

            text:'Active'
        },

        {
            value:'Inactive',

            text:'Inactive'
        }
    ];


    selectedStatus:
        string | null =
        null;



    //===========================================================
    // Data Source
    //===========================================================

    posreconciliationses:
        PosReconciliations[] =
    [];


    filteredPosReconciliationses:
        PosReconciliations[] =
    [];


    pagedPosReconciliationses:
        PosReconciliations[] =
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
        'POS Reconciliations History';


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

            width:'60px',

            align:'center'
        },

        {
            header:'Code',

            field:'code',

            width:'180px',

            align:'center'
        },

        {
            header:'Name',

            field:'name',

            align:'left'
        },

        {
            header:'Status',

            field:'status',

            type:'status',

            width:'120px',

            align:'center'
        },

        {
            header:'Actions',

            field:'actions',

            type:'actions',

            width:'180px',

            align:'center'
        }
    ];



    //===========================================================
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.loadItems();
    }



    //===========================================================
    // Load PosReconciliationses
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;


        this.loadFailed =
            false;


        this.posreconciliationsservice
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        PosReconciliations[]
                ): void =>
                {
                    this.posreconciliationses =
                    [
                        ...response
                    ];


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
                ): void =>
                {
                    console.error
                    (
                        'Load PosReconciliationses Error',

                        error
                    );


                    this.posreconciliationses =
                    [];


                    this.filteredPosReconciliationses =
                    [];


                    this.pagedPosReconciliationses =
                    [];


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load posreconciliationses.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Status Filter Changed
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


        this.filteredPosReconciliationses =
            this.posreconciliationses
                .filter
                (
                    (
                        x:
                            PosReconciliations
                    ):
                        boolean =>
                    {
                        const statusMatch =
                            this.selectedStatus === null
                            ||
                            x.status ===
                            this.selectedStatus;


                        const searchMatch =
                            !keyword
                            ||
                            x.code
                                ?.toLowerCase()
                                .includes(keyword)
                            ||
                            x.name
                                ?.toLowerCase()
                                .includes(keyword)
                            ||
                            x.sampleField
                                ?.toLowerCase()
                                .includes(keyword)
                            ||
                            x.remarks
                                ?.toLowerCase()
                                .includes(keyword);


                        return statusMatch
                            &&
                            searchMatch;
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
            value;


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
        this.filteredPosReconciliationses =
        [
            ...this.filteredPosReconciliationses
        ];


        this.filteredPosReconciliationses.sort
        (
            (
                a:
                    PosReconciliations,

                b:
                    PosReconciliations
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof PosReconciliations
                    ];


                const valueB:
                    any =
                    b[
                        event.field as keyof PosReconciliations
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


        this.pagedPosReconciliationses =
        [
            ...this.filteredPosReconciliationses
                .slice
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
            PosReconciliations
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',

                item.id
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
            PosReconciliations
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',

                item.id
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
            PosReconciliations
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete POS Reconciliations',

            `Are you sure you want to delete "${item.name}" ?`,

            (): void =>
            {
                this.posreconciliationsservice
                    .delete
                    (
                        item.id
                    )
                    .subscribe
                    ({
                        next:
                        (): void =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',

                                `${item.name} deleted successfully.`
                            );


                            this.loadItems();
                        },


                        error:
                        (
                            error:
                                unknown
                        ): void =>
                        {
                            console.error
                            (
                                'Delete POS Reconciliations Error',

                                error
                            );


                            this.toast.error
                            (
                                'Delete Failed',

                                'Failed to delete posReconciliations.'
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
            'Restore POS Reconciliations',

            'Are you sure you want to restore the most recently deleted posReconciliations?',

            (): void =>
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
        this.posreconciliationsservice
            .restore()
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.toast.success
                    (
                        'Restore Successful',

                        'The most recently deleted posReconciliations has been restored.'
                    );


                    this.loadItems();
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error
                    (
                        'Restore POS Reconciliations Error',

                        error
                    );


                    this.toast.error
                    (
                        'Restore Failed',

                        'Failed to restore posReconciliations.'
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
        this.posreconciliationsservice
            .getHistory()
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ): void =>
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
                                    history.performedByName
                                    ??
                                    'System',


                                dateTime:
                                    new Date
                                    (
                                        history.performedDate
                                    )
                                    .toLocaleString(),


                                badge:
                                    history.activityType
                            })
                        );


                    this.historyTitle =
                        'POS Reconciliations Management History';


                    this.historyOpened =
                        true;


                    this.cdr.detectChanges();
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error
                    (
                        'History Load Failed',

                        error
                    );


                    this.toast.error
                    (
                        'History',

                        'Failed to load posReconciliations history.'
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