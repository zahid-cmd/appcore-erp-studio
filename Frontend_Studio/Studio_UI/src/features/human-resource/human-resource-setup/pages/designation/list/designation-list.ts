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
    DesignationService
}
from '../../../services/designation.service';

import
{
    Designation
}
from '../../../models/designation.model';

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
// Component
//===============================================================

@Component(
{
    selector:'app-designation-list',

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

        ConfirmDialogComponent,

        ToastComponent,

        HistoryDrawerComponent
    ],

    templateUrl:'./designation-list.html',

    styleUrl:'./designation-list.css'
})


//===============================================================
// Designation List Component
//===============================================================

export class DesignationListComponent
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly designationService =
        inject(DesignationService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Page Tabs
    //===========================================================

    tabs: ControlTab[] =
    [
        {
            id:'all',

            label:'All Designations'
        }
    ];

    selectedTab =
        'all';

    //===========================================================
    // Data Source
    //===========================================================

    designations: Designation[] =
    [];

    filteredDesignations: Designation[] =
    [];

    pagedDesignations: Designation[] =
    [];

    //===========================================================
    // Search & Loading
    //===========================================================

    searchText =
        '';

    loading =
        false;

    loadFailed =
        false;

    //===========================================================
    // Pagination
    //===========================================================

    currentPage =
        1;

    pageSize =
        10;

    //===========================================================
    // History Drawer
    //===========================================================

    historyOpened =
        false;

    historyTitle =
        'Designation Management History';

    historyItems:any[] =
    [];

    //===========================================================
    // Page Canvas Configuration
    //===========================================================

    readonly canvasConfig: PageCanvasConfig =
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
    // Table Columns Definition
    //===========================================================

    readonly columns: ListTableColumn[] =
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
            header:'Designation Name',
            field:'name',
            align:'left'
        },
        {
            header:'Status',
            field:'isActive',
            type:'status',
            width:'150px',
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
    // Component Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.loadDesignations();
    }
    //===========================================================
    // Load Designation Data
    //===========================================================

    loadDesignations():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        this.designationService
            .getAll()
            .subscribe(
            {
                next:(response) =>
                {
                    console.log('================================');
                    console.log('Designations Response');
                    console.log(response);
                    console.log('Total Records:', response.length);
                    console.log('================================');

                    this.designations =
                    [
                        ...response
                    ];

                    this.filteredDesignations =
                    [
                        ...response
                    ].sort(
                        (a,b) =>
                            a.code.localeCompare(b.code)
                    );

                    this.currentPage =
                        1;

                    this.updatePagination();

                    this.loading =
                        false;

                    this.loadFailed =
                        false;

                    this.cdr.detectChanges();

                    console.log('Change Detection Triggered');
                },

                error:(error) =>
                {
                    console.error('Load Designations Error');
                    console.error(error);

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

                    this.toast.error(
                        'Load Failed',
                        'Unable to load designations.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Search Designations
    //===========================================================

    onSearch
    (
        value:string
    ):
        void
    {
        this.searchText =
            value;

        const keyword =
            value
                .trim()
                .toLowerCase();

        if (!keyword)
        {
            this.filteredDesignations =
            [
                ...this.designations
            ];
        }
        else
        {
            this.filteredDesignations =
                this.designations.filter(x =>

                    x.code
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    x.name
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    x.remarks
                        ?.toLowerCase()
                        .includes(keyword)
                );
        }

        this.filteredDesignations.sort(
            (a,b) =>
                a.code.localeCompare(b.code)
        );

        this.currentPage =
            1;

        this.updatePagination();
    }

    //===========================================================
    // Sort Designation List
    //===========================================================

    onSort
    (
        event:
        {
            field:string;
            direction:'asc' | 'desc';
        }
    ):
        void
    {
        this.filteredDesignations =
        [
            ...this.filteredDesignations
        ];

        this.filteredDesignations.sort(
            (a:any,b:any) =>
            {
                const valueA =
                    a[event.field];

                const valueB =
                    b[event.field];

                if(valueA == null && valueB == null)
                {
                    return 0;
                }

                if(valueA == null)
                {
                    return -1;
                }

                if(valueB == null)
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
                        ? valueA.localeCompare(valueB)
                        : valueB.localeCompare(valueA);
                }

                if(valueA < valueB)
                {
                    return event.direction === 'asc'
                        ? -1
                        : 1;
                }

                if(valueA > valueB)
                {
                    return event.direction === 'asc'
                        ? 1
                        : -1;
                }

                return 0;
            });

        this.currentPage =
            1;

        this.updatePagination();
    }

    //===========================================================
    // Refresh Designation List
    //===========================================================

    refresh():
        void
    {
        this.searchText =
            '';

        this.currentPage =
            1;

        this.loadDesignations();
    }

    //===========================================================
    // Update Pagination Data
    //===========================================================

    updatePagination():
        void
    {
        const start =
            (this.currentPage - 1)
            *
            this.pageSize;

        this.pagedDesignations =
        [
            ...this.filteredDesignations.slice(
                start,
                start + this.pageSize
            )
        ];

        console.log('========================');
        console.log('Paged Designations');
        console.log(this.pagedDesignations);
        console.log('Paged Length:', this.pagedDesignations.length);
        console.log('========================');
    }

    //===========================================================
    // Page Change Event
    //===========================================================

    onPageChange
    (
        page:number
    ):
        void
    {
        this.currentPage =
            page;

        this.updatePagination();
    }

    //===========================================================
    // Page Size Change Event
    //===========================================================

    onPageSizeChange
    (
        size:number
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
    // Add Designation
    //===========================================================

    add():
        void
    {
        this.router.navigate(
        [
            '/human-resource/human-resource-setup/designation/new'
        ]);
    }

    //===========================================================
    // View Designation
    //===========================================================

    view
    (
        item:Designation
    ):
        void
    {
        this.router.navigate(
        [
            '/human-resource/human-resource-setup/designation/view',

            item.id
        ]);
    }

    //===========================================================
    // Edit Designation
    //===========================================================

    edit
    (
        item:Designation
    ):
        void
    {
        this.router.navigate(
        [
            '/human-resource/human-resource-setup/designation/edit',

            item.id
        ]);
    }

    //===========================================================
    // Delete Designation
    //===========================================================

    delete
    (
        item:Designation
    ):
        void
    {
        this.confirmDialog.open(

            'Delete Designation',

            `Are you sure you want to delete "${item.name}" ?`,

            () =>
            {
                this.designationService
                    .delete(item.id)
                    .subscribe(
                    {
                        next:() =>
                        {
                            this.toast.success(
                                'Delete Successful',
                                `"${item.name}" deleted successfully.`
                            );

                            this.loadDesignations();
                        },

                        error:(error) =>
                        {
                            console.error(
                                'Delete Designation Error',
                                error
                            );

                            this.toast.error(
                                'Delete Failed',
                                'Unable to delete designation.'
                            );
                        }
                    });
            }
        );
    }

    //===========================================================
    // Open History Drawer
    //===========================================================

    openHistory():
        void
    {
        this.designationService
            .getHistory()

            .subscribe(
            {
                next:(response:any[]) =>
                {
                    this.historyItems =
                        response.map(
                            item =>
                            ({
                                title:
                                    item.activityTitle,

                                description:
                                    item.activityDescription,

                                user:
                                    item.performedByName
                                    ??
                                    'System',

                                dateTime:
                                    new Date(
                                        item.performedDate
                                    )
                                    .toLocaleString(),

                                badge:
                                    item.activityType
                            })
                        );

                    this.historyTitle =
                        'Designation Management History';

                    this.historyOpened =
                        true;

                    this.cdr.detectChanges();
                },

                error:(error:any) =>
                {
                    console.error(
                        'History Load Failed',
                        error
                    );

                    this.toast.error(
                        'History',
                        'Failed to load designation history.'
                    );
                }
            });
    }

    //===========================================================
    // Close History Drawer
    //===========================================================

    closeHistory():
        void
    {
        this.historyOpened =
            false;
    }

}