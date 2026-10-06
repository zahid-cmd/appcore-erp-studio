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
    Department
}
from '../../../models/department.model';


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
    DepartmentService
}
from '../../../services/department.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'department-list',

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

    templateUrl:'./department-list.html',

    styleUrl:'./department-list.css'
})


//===============================================================
// Department List
//===============================================================

export class DepartmentList
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly departmentservice =
        inject(DepartmentService);


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

            label:'All Departments'
        }
    ];


    selectedTab:
        string =
        'all';


    //===========================================================
    // Data
    //===========================================================

    departments:
        Department[] =
    [];


    filteredDepartments:
        Department[] =
    [];


    pagedDepartments:
        Department[] =
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
        'Department History';


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
            header:'Department Code',

            field:'DepartmentCode',

            width:'180px',

            align:'center'
        },

        {
            header:'Department Name',

            field:'DepartmentName',

            width:'280px',

            align:'left'
        },

        {
            header:'Short Name',

            field:'DepartmentShortName',

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

    private normalizeDepartment
    (
        item:
            any
    ):
        Department
    {
        return {
            DepartmentId:
                Number
                (
                    item?.DepartmentId
                    ??
                    item?.departmentId
                    ??
                    item?.id
                    ??
                    item?.Id
                    ??
                    0
                ),

        DepartmentCode:
            item?.DepartmentCode
            ??
            item?.departmentCode
            ??
            '',

        DepartmentName:
            item?.DepartmentName
            ??
            item?.departmentName
            ??
            '',

        DepartmentShortName:
            item?.DepartmentShortName
            ??
            item?.departmentShortName
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

    private normalizeDepartments
    (
        response:
            any
    ):
        Department[]
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
                this.normalizeDepartment(
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


        this.departmentservice
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        Department[]
                ):
                    void =>
                {
                    console.log
                    (
                        'Department API Response:',
                        response
                    );


                    this.departments =
                        this.normalizeDepartments(
                            response
                        );


                    console.log
                    (
                        'Normalized Departments:',
                        this.departments
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
                        'Load Departments Error:',
                        error
                    );


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


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load departments.'
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


        this.filteredDepartments =
            this.departments.filter
            (
                (
                    item:
                        Department
                ):
                    boolean =>
                {
                    const departmentCode =
                        item.DepartmentCode
                        ??
                        '';


                    const departmentName =
                        item.DepartmentName
                        ??
                        '';


                    const departmentShortName =
                        item.DepartmentShortName
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


                    const searchMatch =
                        !keyword
                        ||
                        departmentCode
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        departmentName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        departmentShortName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        remarks
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        status
                            .includes(keyword);


                    return searchMatch;
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
        this.filteredDepartments =
        [
            ...this.filteredDepartments
        ];


        this.filteredDepartments.sort
        (
            (
                a:
                    Department,

                b:
                    Department
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof Department
                    ];


                const valueB:
                    any =
                    b[
                        event.field as keyof Department
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


        this.pagedDepartments =
        [
            ...this.filteredDepartments.slice
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
            Department
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',

                item.DepartmentId
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
            Department
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',

                item.DepartmentId
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
            Department
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Department',

            `Are you sure you want to delete "${item.DepartmentName}" ?`,

            (): void =>
            {
                this.departmentservice
                    .delete
                    (
                        item.DepartmentId
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

                                `${item.DepartmentName} deleted successfully.`
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
                                'Delete Department Error:',
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
                                    'Department cannot be deleted because it is already configured.';


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

                                'Failed to delete department.'
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
            'Restore Department',

            'Are you sure you want to restore the most recently deleted department?',

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
        this.departmentservice
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

                        'The most recently deleted department has been restored.'
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
                        'Restore Department Error',

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

                            'There is no deleted department record to restore.'
                        );


                        return;
                    }


                    this.toast.error
                    (
                        'Restore Failed',

                        'Failed to restore department.'
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
        this.departmentservice
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
                        'Department Management History';


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

                        'Failed to load department history.'
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