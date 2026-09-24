//===============================================================
// Imports
//===============================================================

import
{
    AfterViewChecked,
    Component,
    ElementRef,
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
    HttpErrorResponse
}
from '@angular/common/http';

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
    LoginPages
}
from '../../../models/login-pages.model';


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
    LoginPagesService
}
from '../../../services/login-pages.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:
        'loginPages-list',

    standalone:
        true,

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

    templateUrl:
        './login-pages-list.html',

    styleUrl:
        './login-pages-list.css'
})


//===============================================================
// Login Pages List Component
//===============================================================

export class LoginPagesList
implements
    OnInit,
    AfterViewChecked
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly loginpagesservice =
        inject(LoginPagesService);


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


    private readonly elementRef =
        inject(ElementRef);



    //===========================================================
    // Page Tabs
    //===========================================================

    tabs:
        ControlTab[] =
    [
        {
            id:
                'all',

            label:
                'All Login Pages'
        }
    ];


    selectedTab:
        string =
        'all';



    //===========================================================
    // Status Filter
    //===========================================================

    statusItems:
        {
            value:
                boolean | null;

            text:
                string;
        }[] =
    [
        {
            value:
                null,

            text:
                'All Status'
        },

        {
            value:
                true,

            text:
                'Active'
        },

        {
            value:
                false,

            text:
                'Inactive'
        }
    ];


    selectedStatus:
        boolean | null =
        null;



    //===========================================================
    // Data Source
    //===========================================================

    loginpages:
        LoginPages[] =
    [];


    filteredLoginPages:
        LoginPages[] =
    [];


    pagedLoginPages:
        LoginPages[] =
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
        'Login Pages History';


    historyItems:
        any[] =
    [];



    //===========================================================
    // Page Canvas Configuration
    //===========================================================

    readonly canvasConfig:
        PageCanvasConfig =
    {
        mode:
            'list',

        showHeader:
            false,

        showFooter:
            true,

        reserveFooterSpace:
            true,

        bodyScrollable:
            true,

        fixedHeight:
            true,

        visibleRows:
            10,

        rowHeight:
            32,

        headerHeight:
            36,

        footerHeight:
            56
    };



    //===========================================================
    // Table Columns
    //===========================================================

    readonly columns:
        ListTableColumn[] =
    [
        {
            header:
                '#',

            field:
                'serial',

            type:
                'serial',

            width:
                '60px',

            align:
                'center'
        },

        {
            header:
                'Code',

            field:
                'code',

            width:
                '150px',

            align:
                'center'
        },

        {
            header:
                'Name',

            field:
                'name',

            width:
                '220px',

            align:
                'left'
        },

        {
            header:
                'Page Key',

            field:
                'pageKey',

            width:
                '180px',

            align:
                'left'
        },

        {
            header:
                'Title',

            field:
                'title',

            width:
                '200px',

            align:
                'left'
        },

        {
            header:
                'Subtitle',

            field:
                'subtitle',

            align:
                'left'
        },

        {
            header:
                'Status',

            field:
                'status',

            type:
                'status',

            width:
                '180px',

            align:
                'center'
        },

        {
            header:
                'Operation',

            field:
                'operation',

            type:
                'operation',

            width:
                '180px',

            align:
                'center'
        },

        {
            header:
                'Actions',

            field:
                'actions',

            type:
                'actions',

            width:
                '180px',

            align:
                'center'
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
    // PAGE-SPECIFIC OPERATION TOOLTIP
    //
    // The shared ListTableComponent uses "Synchronize".
    //
    // Login Pages uses the same operation button for
    // Preview.
    //
    // This change is restricted to this page only.
    //===========================================================

    ngAfterViewChecked():
        void
    {
        this.updateLoginPagesOperationTooltip();
    }



    //===========================================================
    // LOGIN PAGES OPERATION MOUSE OVER
    //
    // This is triggered by the page-specific wrapper in
    // login-pages-list.html.
    //
    // It immediately changes the native browser tooltip
    // from "Synchronize" to "Preview".
    //===========================================================

    onLoginPagesOperationMouseOver
    (
        event:
            MouseEvent
    ):
        void
    {
        if
        (
            !(event.target instanceof HTMLElement)
        )
        {
            return;
        }


        const operationButton =
            event.target.closest(
                '.action-btn.sync'
            );


        if
        (
            !(operationButton instanceof HTMLButtonElement)
        )
        {
            return;
        }


        operationButton.title =
            'Preview';
    }



    //===========================================================
    // UPDATE LOGIN PAGES OPERATION TOOLTIP
    //
    // Page-specific DOM correction.
    //
    // No shared component is modified.
    //===========================================================

    private updateLoginPagesOperationTooltip():
        void
    {
        const host =
            this.elementRef.nativeElement as HTMLElement;


        const operationButtons =
            host.querySelectorAll
            (
                '.login-pages-operation-table .action-btn.sync'
            );


        operationButtons.forEach
        (
            (
                button:
                    Element
            ):
                void =>
            {
                if
                (
                    button instanceof HTMLButtonElement
                )
                {
                    button.title =
                        'Preview';
                }
            }
        );
    }



    //===========================================================
    // Load Login Pages
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;


        this.loadFailed =
            false;


        this.loginpagesservice
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        LoginPages[]
                ):
                    void =>
                {
                    this.loginpages =
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
                ):
                    void =>
                {
                    console.error
                    (
                        'Load Login Pages Error',

                        error
                    );


                    this.loginpages =
                    [];


                    this.filteredLoginPages =
                    [];


                    this.pagedLoginPages =
                    [];


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load login pages.'
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
            boolean | null
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


        this.filteredLoginPages =
            this.loginpages
                .filter
                (
                    (
                        x:
                            LoginPages
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
                            x.pageKey
                                ?.toLowerCase()
                                .includes(keyword)
                            ||
                            x.title
                                ?.toLowerCase()
                                .includes(keyword)
                            ||
                            x.subtitle
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
                'asc'
                |
                'desc';
        }
    ):
        void
    {
        this.filteredLoginPages =
        [
            ...this.filteredLoginPages
        ];


        this.filteredLoginPages.sort
        (
            (
                a:
                    LoginPages,

                b:
                    LoginPages
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof LoginPages
                    ];


                const valueB:
                    any =
                    b[
                        event.field as keyof LoginPages
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
                        valueA.localeCompare(
                            valueB
                        )
                        :
                        valueB.localeCompare(
                            valueA
                        );
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


        this.pagedLoginPages =
        [
            ...this.filteredLoginPages
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
            LoginPages
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
            LoginPages
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
    // Preview
    //===========================================================

    preview
    (
        item:
            LoginPages
    ):
        void
    {
        void this.router.navigate
        (
            [
                'preview',

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
            LoginPages
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Login Page',

            `Are you sure you want to delete "${item.name}" ?`,

            ():
                void =>
            {
                this.loginpagesservice
                    .delete
                    (
                        item.id
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

                                `${item.name} deleted successfully.`
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
                                'Delete Login Page Error',

                                error
                            );


                            this.toast.error
                            (
                                'Delete Failed',

                                'Failed to delete login page.'
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
            'Restore Login Page',

            'Are you sure you want to restore the most recently deleted login page.',

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
        this.loginpagesservice
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

                        'The most recently deleted login page has been restored.'
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
                        'Restore Login Page Error',

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

                            'There is no deleted login page record to restore.'
                        );


                        return;
                    }


                    this.toast.error
                    (
                        'Restore Failed',

                        'Failed to restore login page.'
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
        this.loginpagesservice
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
                                    history.activityTitle,


                                description:
                                    history.activityDescription,


                                user:
                                    history.performedByName
                                    ??
                                    'System',


                                dateTime:
                                    new Date(
                                        history.performedDate
                                    )
                                    .toLocaleString(),


                                badge:
                                    history.activityType
                            })
                        );


                    this.historyTitle =
                        'Login Pages Management History';


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
                        'History Load Failed',

                        error
                    );


                    this.toast.error
                    (
                        'History',

                        'Failed to load login pages history.'
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