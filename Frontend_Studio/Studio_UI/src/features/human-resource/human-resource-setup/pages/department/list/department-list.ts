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
    DepartmentService
}
from '../../../services/department.service';

import
{
    Department
}
from '../../../models/department.model';

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
    selector:'app-department-list',

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

    templateUrl:'./department-list.html',

    styleUrl:'./department-list.css'
})

//===============================================================
// Department List Component
//===============================================================

export class DepartmentListComponent
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly departmentService =
        inject(DepartmentService);

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

            label:'All Departments'
        }
    ];

    selectedTab =
        'all';

    //===========================================================
    // Data Source
    //===========================================================

    departments: Department[] =
    [];

    filteredDepartments: Department[] =
    [];

    pagedDepartments: Department[] =
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
        'Department Management History';

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
            header:'Department Name',
            field:'name',
            align:'left'
        },
        {
            header:'Short Name',
            field:'shortName',
            width:'180px',
            align:'left'
        },
        {
            header:'Department Head',
            field:'departmentHead',
            width:'220px',
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
        this.loadDepartments();
    }
    //===========================================================
    // Load Department Data
    //===========================================================

    loadDepartments():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        this.departmentService
            .getAll()
            .subscribe(
            {
                next:(response) =>
                {
                    console.log('================================');
                    console.log('Departments Response');
                    console.log(response);
                    console.log('Total Records:', response.length);
                    console.log('================================');

                    this.departments =
                    [
                        ...response
                    ];

                    this.filteredDepartments =
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
                    console.error('Load Departments Error');
                    console.error(error);

                    this.departments =
                    [];

                    this.filteredDepartments =
                    [];

                    this.pagedDepartments =
                    [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error(
                        'Load Failed',
                        'Unable to load departments.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Search Departments
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
            this.filteredDepartments =
            [
                ...this.departments
            ];
        }
        else
        {
            this.filteredDepartments =
                this.departments.filter(x =>

                    x.code
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    x.name
                        .toLowerCase()
                        .includes(keyword)

                    ||

                    x.shortName
                        ?.toLowerCase()
                        .includes(keyword)

                    ||

                    x.departmentHead
                        ?.toLowerCase()
                        .includes(keyword)

                    ||

                    x.remarks
                        ?.toLowerCase()
                        .includes(keyword)
                );
        }

        this.filteredDepartments.sort(
            (a,b) =>
                a.code.localeCompare(b.code)
        );

        this.currentPage =
            1;

        this.updatePagination();
    }

    //===========================================================
    // Sort Department List
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
        this.filteredDepartments =
        [
            ...this.filteredDepartments
        ];

        this.filteredDepartments.sort(
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
    // Refresh Department List
    //===========================================================

    refresh():
        void
    {
        this.searchText =
            '';

        this.currentPage =
            1;

        this.loadDepartments();
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

        this.pagedDepartments =
        [
            ...this.filteredDepartments.slice(
                start,
                start + this.pageSize
            )
        ];

        console.log('========================');
        console.log('Paged Departments');
        console.log(this.pagedDepartments);
        console.log('Paged Length:', this.pagedDepartments.length);
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
    // Add Department
    //===========================================================

    add():
        void
    {
        this.router.navigate(
        [
            '/human-resource/human-resource-setup/department/new'
        ]);
    }

    //===========================================================
    // View Department
    //===========================================================

    view
    (
        item:Department
    ):
        void
    {
        this.router.navigate(
        [
            '/human-resource/human-resource-setup/department/view',

            item.id
        ]);
    }

    //===========================================================
    // Edit Department
    //===========================================================

    edit
    (
        item:Department
    ):
        void
    {
        this.router.navigate(
        [
            '/human-resource/human-resource-setup/department/edit',

            item.id
        ]);
    }

    //===========================================================
    // Delete Department
    //===========================================================

    delete
    (
        item:Department
    ):
        void
    {
        this.confirmDialog.open(

            'Delete Department',

            `Are you sure you want to delete "${item.name}" ?`,

            () =>
            {
                this.departmentService
                    .delete(item.id)
                    .subscribe(
                    {
                        next:() =>
                        {
                            this.toast.success(
                                'Delete Successful',
                                `"${item.name}" deleted successfully.`
                            );

                            this.loadDepartments();
                        },

                        error:(error) =>
                        {
                            console.error(
                                'Delete Department Error',
                                error
                            );

                            this.toast.error(
                                'Delete Failed',
                                'Unable to delete department.'
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
        this.departmentService
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
                        'Department Management History';

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
                        'Failed to load department history.'
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