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
    BrandManagement
}
from '../../../models/brand-management.model';


// List row : the brand plus its ready-to-show thumbnail URL
interface BrandListRow
extends BrandManagement
{
    BrandImageUrl:
        string;
}


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
    BrandManagementService
}
from '../../../services/brand-management.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'brand-management-list',

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

    templateUrl:'./brand-management-list.html',

    styleUrl:'./brand-management-list.css'
})


//===============================================================
// Brand Management List
//===============================================================

export class BrandManagementList
implements OnInit, OnDestroy
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly brandManagementservice =
        inject(BrandManagementService);


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

            label:'All Brands'
        }
    ];


    selectedTab:
        string =
        'all';



    //===========================================================
    // Data
    //===========================================================

    brands:
        BrandListRow[] =
    [];


    filteredBrands:
        BrandListRow[] =
    [];


    pagedBrands:
        BrandListRow[] =
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
        'Brand Management History';


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

            width:'80px',

            align:'center'
        },


        {
            header:'Brand Code',

            field:'BrandCode',

            width:'280px',

            align:'center'
        },

        {
            header:'Brand Name',

            field:'BrandName',

            align:'left'
        },
        {
            header:'Brand Image',

            field:'BrandImageUrl',

            type:'image',

            width:'130px',

            align:'center'
        },
        {
            header:'Status',

            field:'Status',

            width:'200px',

            type:'status',

            align:'center'
        },

        {
            header:'Actions',

            field:'actions',

            type:'actions',

            width:'150px',

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

    private normalizeBrand
    (
        item:
            any
    ):
        BrandListRow
    {
        const imagePath:
            string =
            item?.BrandImagePath ?? item?.brandImagePath ?? '';


        return {
            BrandManagementId:
                Number(item?.BrandManagementId ?? item?.brandManagementId ?? 0),

            BrandCode:
                item?.BrandCode ?? item?.brandCode ?? '',

            BrandName:
                item?.BrandName ?? item?.brandName ?? '',

            BrandImagePath:
                imagePath,

            BrandImageUrl:
                this.brandManagementservice.getImageUrl(
                    imagePath
                ),

            Remarks:
                item?.Remarks ?? item?.remarks ?? '',

            Status:
                Boolean(item?.Status ?? item?.status ?? true)
        };
    }



    //===========================================================
    // Normalize API Response List
    //===========================================================

    private normalizeBrands
    (
        response:
            any
    ):
        BrandListRow[]
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
                this.normalizeBrand(
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


        this.brandManagementservice
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        any
                ):
                    void =>
                {
                    this.brands =
                        this.normalizeBrands(
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
                        'Load Brands Error:',
                        error
                    );


                    this.brands =
                        [];


                    this.filteredBrands =
                        [];


                    this.pagedBrands =
                        [];


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load brands.'
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


        this.filteredBrands =
            this.brands.filter
            (
                (
                    item:
                        BrandListRow
                ):
                    boolean =>
                {
                    const values:
                        unknown[] =
                    [
                        item.BrandCode,
                        item.BrandName
                    ];

                    const searchMatch =
                        !keyword
                        ||
                        values.some(
                            value =>
                                String(value ?? '')
                                    .toLowerCase()
                                    .includes(keyword)
                        )
                        ||
                        (item.Status ? 'active' : 'inactive')
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
        this.filteredBrands =
        [
            ...this.filteredBrands
        ];


        this.filteredBrands.sort
        (
            (
                a:
                    BrandListRow,

                b:
                    BrandListRow
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof BrandListRow
                    ];


                const valueB:
                    any =
                    b[
                        event.field as keyof BrandListRow
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


        this.pagedBrands =
        [
            ...this.filteredBrands.slice
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
            BrandListRow
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',

                item.BrandManagementId
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
            BrandListRow
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',

                item.BrandManagementId
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
            BrandListRow
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
            'Delete Brand',

            `Are you sure you want to delete "${item.BrandName}" ?`,

            (): void =>
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
            BrandListRow
    ):
        void
    {
        this.startProgress(
            'Deleting Brand',

            `Please wait while "${item.BrandName}" is being deleted...`
        );


        this.withMinimumDuration(
            this.brandManagementservice.delete(
                item.BrandManagementId
            )
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(

                        'Brand deleted.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',

                                `${item.BrandName} deleted successfully.`
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
                        'Delete Brand Error:',
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
                                    'Brand cannot be deleted because it is already in use.';


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

                                'Failed to delete brand.'
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
            'Restore Brand',

            'Are you sure you want to restore the most recently deleted brand?',

            (): void =>
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
            'Restoring Brand',

            'Please wait while the most recently deleted brand is being restored...'
        );


        this.withMinimumDuration(
            this.brandManagementservice.restore()
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(

                        'Brand restored.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Restore Successful',

                                'The most recently deleted brand has been restored.'
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
                        'Restore Brand Error',

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

                                    'There is no deleted brand record to restore.'
                                );


                                return;
                            }


                            this.toast.error
                            (
                                'Restore Failed',

                                'Failed to restore brand.'
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
        this.brandManagementservice
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
                        'Brand Management History';


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

                        'Failed to load brand history.'
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