//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    OnDestroy,
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


import
{
    Observable,
    defer,
    timer,
    throwError,
    delayWhen,
    catchError,
    switchMap
}
from 'rxjs';


//===============================================================
// Models
//===============================================================

import
{
    AccountClass
}
from '../../../models/account-class.model';


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
    ProgressDialogComponent
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';


import
{
    ProgressDialogService
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';


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
    AccountClassService
}
from '../../../services/account-class.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'account-class-list',
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
        ProgressDialogComponent,
        ToastComponent
    ],
    templateUrl:'./account-class-list.html',
    styleUrl:'./account-class-list.css'
})


//===============================================================
// Account Class List
//===============================================================

export class AccountClassList
implements OnInit, OnDestroy
{


    //===========================================================
    // Dependency Injection
    //===========================================================


    private readonly accountClassService =
        inject(AccountClassService);


    private readonly confirmDialog =
        inject(ConfirmDialogService);


    private readonly progressDialog =
        inject(ProgressDialogService);


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
            label:'All Account Classes'
        }
    ];


    selectedTab:
        string =

        'all';


    //===========================================================
    // Data
    //===========================================================


    accountClasses:
        AccountClass[] =

    [];


    filteredAccountClasses:
        AccountClass[] =

    [];


    pagedAccountClasses:
        AccountClass[] =

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


    // Prevents a second Delete / Restore while one is running
    isProcessing:
        boolean =

        false;


    //===========================================================
    // Progress Dialog Settings
    //===========================================================


    // Minimum time the dialog stays open
    private readonly MIN_PROGRESS_MS:
        number =

        3000;


    // Animation tick
    private readonly PROGRESS_TICK_MS:
        number =

        100;


    // Highest % reached before the server answers
    private readonly PROGRESS_CEILING:
        number =

        90;


    // How long 100% is shown before closing
    private readonly PROGRESS_COMPLETE_HOLD_MS:
        number =

        600;


    private progressTimer?:
        number;


    private progressValue:
        number =

        0;


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

        'Account Class History';


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
            header:'Class Type',
            field:'ClassType',
            width:'160px',
            align:'left'
        },
        {
            header:'Class Code',
            field:'ClassCode',
            width:'150px',
            align:'center'
        },
        {
            header:'Class Name',
            field:'ClassName',
            width:'240px',
            align:'left'
        },
        {
            header:'Mode',
            field:'Mode',
            width:'120px',
            align:'center'
        },
        {
            header:'Class Prefix',
            field:'ClassPrefix',
            width:'130px',
            align:'center'
        },
        {
            header:'Manual Group Creation',
            field:'AllowManualGroupCreation',
            width:'180px',
            align:'center',
            type:'boolean'
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
    // Destroy
    //===========================================================


    ngOnDestroy():
        void
    {
        this.clearProgressTimer();


        if
        (
            this.isProcessing
        )
        {
            this.progressDialog.close();
        }
    }


    //===========================================================
    // Progress Dialog (Animated)
    //
    // The bar eases from 0% toward 90% while the request runs,
    // then jumps to 100% on success before closing.
    //===========================================================


    private startProgress
    (
        title:
            string,

        message:
            string
    ):
        void
    {
        this.isProcessing =
            true;


        this.progressValue =
            0;


        // Determinate : we drive the percentage ourselves
        this.progressDialog.show(
            title,

            message,

            false
        );


        this.clearProgressTimer();


        this.progressTimer =
            window.setInterval(
                () =>
                {
                    // Ease-out : big steps first, smaller near the ceiling
                    const step =
                        Math.max(
                            0.4,
                            (this.PROGRESS_CEILING - this.progressValue) * 0.06
                        );


                    this.progressValue =
                        Math.min(
                            this.PROGRESS_CEILING,
                            this.progressValue + step
                        );


                    this.progressDialog.update(
                        Math.round(
                            this.progressValue
                        )
                    );
                },

                this.PROGRESS_TICK_MS
            );


        this.cdr.detectChanges();
    }


    //-----------------------------------------------------------
    // Success : show 100%, pause briefly, then close
    //-----------------------------------------------------------


    private completeProgress
    (
        message:
            string,

        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();


        this.progressDialog.update(
            100,

            message
        );


        window.setTimeout(
            () =>
            {
                this.progressDialog.close();


                this.isProcessing =
                    false;


                this.cdr.detectChanges();


                done();
            },

            this.PROGRESS_COMPLETE_HOLD_MS
        );
    }


    //-----------------------------------------------------------
    // Error : close immediately, then report
    //-----------------------------------------------------------


    private failProgress
    (
        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();


        this.progressDialog.close();


        this.isProcessing =
            false;


        this.cdr.detectChanges();


        done();
    }


    private clearProgressTimer():
        void
    {
        if
        (
            this.progressTimer
        )
        {
            clearInterval(
                this.progressTimer
            );


            this.progressTimer =
                undefined;
        }
    }


    //===========================================================
    // Minimum Progress Duration
    //
    // Keeps the progress dialog visible for at least
    // MIN_PROGRESS_MS, on both success and error.
    //===========================================================


    private withMinimumDuration<T>
    (
        source$:
            Observable<T>
    ):
        Observable<T>
    {
        return defer(
            () =>
            {
                const startedAt:
                    number =
                    Date.now();


                const remaining =
                    (): number =>
                        Math.max(
                            0,
                            this.MIN_PROGRESS_MS - (Date.now() - startedAt)
                        );


                return source$.pipe(

                    delayWhen(
                        () =>
                            timer(remaining())
                    ),

                    catchError(
                        error =>
                            timer(remaining()).pipe(
                                switchMap(
                                    () =>
                                        throwError(() => error)
                                )
                            )
                    )
                );
            }
        );
    }


    //===========================================================
    // Normalize API Response
    //===========================================================


    private normalizeAccountClass
    (
        item:
            any
    ):
        AccountClass
    {
        return {

            AccountClassId:
                Number
                (
                    item?.AccountClassId
                    ??
                    item?.accountClassId
                    ??
                    item?.id
                    ??
                    item?.Id
                    ??
                    0
                ),

            ClassType:
                item?.ClassType
                ??
                item?.classType
                ??
                '',

            ClassCode:
                item?.ClassCode
                ??
                item?.classCode
                ??
                '',

            ClassName:
                item?.ClassName
                ??
                item?.className
                ??
                '',

            Mode:
                item?.Mode
                ??
                item?.mode
                ??
                '',

            ClassPrefix:
                item?.ClassPrefix
                ??
                item?.classPrefix
                ??
                '',

            AllowManualGroupCreation:
                Boolean
                (
                    item?.AllowManualGroupCreation
                    ??
                    item?.allowManualGroupCreation
                    ??
                    false
                ),

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


    private normalizeAccountClasses
    (
        response:
            any
    ):
        AccountClass[]
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

                this.normalizeAccountClass(
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

        this.accountClassService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        AccountClass[]
                ):
                    void =>
                {
                    console.log
                    (
                        'Account Class API Response:',
                        response
                    );

                    this.accountClasses =
                        this.normalizeAccountClasses(
                            response
                        );

                    console.log
                    (
                        'Normalized Account Classes:',
                        this.accountClasses
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
                        'Load Account Classes Error:',
                        error
                    );

                    this.accountClasses =
                        [];

                    this.filteredAccountClasses =
                        [];

                    this.pagedAccountClasses =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error
                    (
                        'Load Failed',
                        'Unable to load account classes.'
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

        this.filteredAccountClasses =
            this.accountClasses.filter
            (
                (
                    item:
                        AccountClass
                ):
                    boolean =>
                {
                    const classType =
                        item.ClassType
                        ??
                        '';

                    const classCode =
                        item.ClassCode
                        ??
                        '';

                    const className =
                        item.ClassName
                        ??
                        '';

                    const classPrefix =
                        item.ClassPrefix
                        ??
                        '';

                    const mode =
                        item.Mode
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

                        classType
                            .toLowerCase()
                            .includes(keyword)

                        ||

                        classCode
                            .toLowerCase()
                            .includes(keyword)

                        ||

                        className
                            .toLowerCase()
                            .includes(keyword)

                        ||

                        classPrefix
                            .toLowerCase()
                            .includes(keyword)

                        ||

                        mode
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
        this.filteredAccountClasses =
        [
            ...this.filteredAccountClasses
        ];

        this.filteredAccountClasses.sort
        (
            (
                a:
                    AccountClass,

                b:
                    AccountClass
            ):
                number =>
            {
                const valueA:
                    any =

                    a[
                        event.field as keyof AccountClass
                    ];

                const valueB:
                    any =

                    b[
                        event.field as keyof AccountClass
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

        this.pagedAccountClasses =
        [
            ...this.filteredAccountClasses.slice
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
            AccountClass
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',
                item.AccountClassId
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
            AccountClass
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',
                item.AccountClassId
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
            AccountClass
    ):
        void
    {
        if
        (
            this.isProcessing
        )
        {
            return;
        }


        this.confirmDialog.open
        (
            'Delete Account Class',
            `Are you sure you want to delete "${item.ClassName}" ?`,
            ():
                void =>
            {
                // Next tick : let the confirm dialog close first,
                // so it cannot hide the progress dialog.
                setTimeout(
                    () =>
                        this.deleteItem(
                            item
                        )
                );
            }
        );
    }


    //===========================================================
    // Delete Item
    //===========================================================


    private deleteItem
    (
        item:
            AccountClass
    ):
        void
    {
        this.startProgress(
            'Deleting Account Class',

            `Please wait while "${item.ClassName}" is being deleted...`
        );


        this.withMinimumDuration(
            this.accountClassService.delete(
                item.AccountClassId
            )
        )
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.completeProgress(

                        'Account class deleted.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',
                                `${item.ClassName} deleted successfully.`
                            );

                            this.loadItems();
                        }
                    );
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
                        'Delete Account Class Error:',
                        error
                    );


                    this.failProgress(
                        () =>
                        {
                            //===========================================
                            // Deletion Blocked
                            //===========================================

                            if
                            (
                                error instanceof HttpErrorResponse
                                &&
                                error.status === 409
                            )
                            {
                                let message =
                                    'Account Class cannot be deleted because it is already configured.';

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


                            //===========================================
                            // Delete Failed
                            //===========================================

                            this.toast.error
                            (
                                'Delete Failed',
                                'Failed to delete account class.'
                            );
                        }
                    );
                }
            });
    }


    //===========================================================
    // Restore
    //===========================================================


    restore():
        void
    {
        if
        (
            this.isProcessing
        )
        {
            return;
        }


        this.confirmDialog.open
        (
            'Restore Account Class',
            'Are you sure you want to restore the most recently deleted account class?',
            ():
                void =>
            {
                // Next tick : same as Delete, for consistency.
                setTimeout(
                    () =>
                        this.restoreItem()
                );
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
        this.startProgress(
            'Restoring Account Class',

            'Please wait while the most recently deleted account class is being restored...'
        );


        this.withMinimumDuration(
            this.accountClassService.restore()
        )
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.completeProgress(

                        'Account class restored.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Restore Successful',
                                'The most recently deleted account class has been restored.'
                            );

                            this.loadItems();
                        }
                    );
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
                        'Restore Account Class Error',
                        error
                    );


                    this.failProgress(
                        () =>
                        {
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
                                    'There is no deleted account class record to restore.'
                                );

                                return;
                            }

                            this.toast.error
                            (
                                'Restore Failed',
                                'Failed to restore account class.'
                            );
                        }
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
        this.accountClassService
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
                        'Account Class Management History';

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
                        'Failed to load account class history.'
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