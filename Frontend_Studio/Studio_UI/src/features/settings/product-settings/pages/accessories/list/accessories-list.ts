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
    Accessories
}
from '../../../models/accessories.model';


// List row : the accessory plus its display name
// ("AB-1234 - Helmet", or "Helmet" when there is no part number)
interface AccessoryListRow
extends Accessories
{
    DisplayName:
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
    AccessoriesService
}
from '../../../services/accessories.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'accessories-list',

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

    templateUrl:'./accessories-list.html',

    styleUrl:'./accessories-list.css'
})


//===============================================================
// Accessories List
//===============================================================

export class AccessoriesList
implements OnInit, OnDestroy
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly accessoriesService =
        inject(AccessoriesService);


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

            label:'All Accessories'
        }
    ];


    selectedTab:
        string =
        'all';



    //===========================================================
    // Data
    //===========================================================

    accessories:
        AccessoryListRow[] =
    [];


    filteredAccessories:
        AccessoryListRow[] =
    [];


    pagedAccessories:
        AccessoryListRow[] =
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
        'Accessories History';


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
            header:'Product Code',

            field:'ProductCode',

            width:'170px',

            align:'center'
        },

        {
            header:'Part Number',

            field:'PartNumber',

            width:'200px',

            align:'left'
        },

        {
            header:'Accessory Name',

            field:'AccessoryName',

            width:'190px',

            align:'left'
        },

        {
            header:'Category',

            field:'CategoryName',

            width:'180px',

            align:'left'
        },

        {
            header:'Unit',

            field:'Unit',

            width:'80px',

            align:'center'
        },

        {
            header:'Locations',

            field:'LocationsText',

            align:'left'
        },

        {
            header:'Re-order',

            field:'ReorderLevel',

            width:'100px',

            align:'center'
        },

        {
            header:'Red',

            field:'RedLevel',

            width:'80px',

            align:'center'
        },

        {
            header:'Status',

            field:'IsActive',

            width:'150px',

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

    private normalizeAccessory
    (
        item:
            any
    ):
        AccessoryListRow
    {
        const accessory:
            Accessories =
            this.accessoriesService.normalize(
                item
            );


        return {
            ...accessory,

            DisplayName:
                accessory.PartNumber
                    ? `${accessory.PartNumber} - ${accessory.AccessoryName}`
                    : accessory.AccessoryName
        };
    }



    //===========================================================
    // Normalize API Response List
    //===========================================================

    private normalizeAccessories
    (
        response:
            any
    ):
        AccessoryListRow[]
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
                this.normalizeAccessory(
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


        this.accessoriesService
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
                    this.accessories =
                        this.normalizeAccessories(
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
                        'Load Accessories Error:',
                        error
                    );


                    this.accessories =
                        [];


                    this.filteredAccessories =
                        [];


                    this.pagedAccessories =
                        [];


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load accessories.'
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


        this.filteredAccessories =
            this.accessories.filter
            (
                (
                    item:
                        AccessoryListRow
                ):
                    boolean =>
                {
                    const values:
                        unknown[] =
                    [
                        item.ProductCode,
                        item.PartNumber,
                        item.AccessoryName,
                        item.CategoryName,
                        item.BrandName,
                        item.SubCategoryName,
                        item.Unit,
                        item.LocationsText,
                        item.InventoryLedgerCode
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
                        (item.IsActive ? 'active' : 'inactive')
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
        this.filteredAccessories =
        [
            ...this.filteredAccessories
        ];


        this.filteredAccessories.sort
        (
            (
                a:
                    AccessoryListRow,

                b:
                    AccessoryListRow
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof AccessoryListRow
                    ];


                const valueB:
                    any =
                    b[
                        event.field as keyof AccessoryListRow
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


        this.pagedAccessories =
        [
            ...this.filteredAccessories.slice
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
            AccessoryListRow
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',

                item.AccessoryId
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
            AccessoryListRow
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',

                item.AccessoryId
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
            AccessoryListRow
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
            'Delete Accessory',

            `Are you sure you want to delete "${item.DisplayName}" ?`,

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
            AccessoryListRow
    ):
        void
    {
        this.startProgress(
            'Deleting Accessory',

            `Please wait while "${item.DisplayName}" is being deleted...`
        );


        this.withMinimumDuration(
            this.accessoriesService.delete(
                item.AccessoryId
            )
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(

                        'Accessory deleted.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',

                                `${item.DisplayName} deleted successfully.`
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
                        'Delete Accessory Error:',
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
                                    'Accessory cannot be deleted because it is already in use.';


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

                                'Failed to delete accessory.'
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
            'Restore Accessory',

            'Are you sure you want to restore the most recently deleted accessory?',

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
            'Restoring Accessory',

            'Please wait while the most recently deleted accessory is being restored...'
        );


        this.withMinimumDuration(
            this.accessoriesService.restore()
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(

                        'Accessory restored.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Restore Successful',

                                'The most recently deleted accessory has been restored.'
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
                        'Restore Accessory Error',

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

                                    'There is no deleted accessory record to restore.'
                                );


                                return;
                            }


                            this.toast.error
                            (
                                'Restore Failed',

                                'Failed to restore accessory.'
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
        this.accessoriesService
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
                        'Accessories History';


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

                        'Failed to load accessory history.'
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