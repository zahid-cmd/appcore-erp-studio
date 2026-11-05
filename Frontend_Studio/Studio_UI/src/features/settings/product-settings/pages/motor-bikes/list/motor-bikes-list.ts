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
    Subscription,
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
    MotorBikes,
    MotorBikesPageQuery
}
from '../../../models/motor-bikes.model';

import
{
    PagedResult
}
from '../../../../../../shared/paging/paged-result.model';


// List row : the motor bike plus its ready-to-show thumbnail URL
interface MotorBikeListRow
extends MotorBikes
{
    ImageUrl:
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
    MotorBikesService
}
from '../../../services/motor-bikes.service';

import
{
    ProductCategoryService
}
from '../../../services/product-category.service';

import
{
    ProductSubCategoryService
}
from '../../../services/product-sub-category.service';

import
{
    ColorManagementService
}
from '../../../services/color-management.service';

import
{
    SystemConfigurationsService
}
from '../../../../general-settings/services/system-configurations.service';

import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'motorBikes-list',

    standalone:true,

    imports:
    [
        CommonModule,

        PageHeaderComponent,

        PageToolbarComponent,

        ControlTabsComponent,

        SearchDropdownComponent,

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

    templateUrl:'./motor-bikes-list.html',

    styleUrl:'./motor-bikes-list.css'
})


//===============================================================
// Motor Bikes List
//===============================================================

export class MotorBikesList
implements OnInit, OnDestroy
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly motorBikesService =
        inject(MotorBikesService);

    private readonly productCategoryService =
        inject(ProductCategoryService);

    private readonly productSubCategoryService =
        inject(ProductSubCategoryService);

    private readonly colorService =
        inject(ColorManagementService);

    private readonly systemConfigurations =
        inject(SystemConfigurationsService);


    //===========================================================
    // Switch CFG-MOD-003-0101 Row Image Preview (missing = ON)
    //===========================================================

    private static readonly ImagePreviewSwitch =
        'CFG-MOD-003-0101';

    imagePreviewEnabled:
        boolean =
        true;


    //===========================================================
    // Toolbar Filters : Category → Sub Category, Color
    //===========================================================

    categoryFilterItems:
        any[] =
        [{ label:'All Categories', value:null }];

    subCategoryFilterItems:
        any[] =
        [{ label:'All Sub Categories', value:null }];

    colorFilterItems:
        any[] =
        [{ label:'All Colors', value:null }];

    selectedCategoryId:
        number | null =
        null;

    selectedSubCategoryId:
        number | null =
        null;

    selectedColorId:
        number | null =
        null;

    // Motor Bikes sub categories (all categories)
    private filterSubCategories:
        any[] =
        [];

    private motorBikeCategoryIds:
        Set<number> =
        new Set<number>();


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

            label:'All Motor Bikes'
        }
    ];


    selectedTab:
        string =
        'all';



    //===========================================================
    // Data
    //===========================================================

    // The page shown (the server sends one page at a time)
    motorBikes:
        MotorBikeListRow[] =
    [];


    // Rows matching the search, all pages
    totalRecords:
        number =
        0;


    // Summary line below the canvas (filled by each load)
    summaryItems:
        {
            label:string;
            value:string;
            tone:'' | 'ok' | 'bad';
        }[] =
    [];


    private loadSubscription?:
        Subscription;



    //===========================================================
    // Sort & Search Delay
    //===========================================================

    // '' = the server's default (Product Code)
    private sortField:
        string =
        '';


    private sortDirection:
        'asc' | 'desc' =
        'asc';


    private searchTimer?:
        number;


    private readonly SEARCH_DELAY_MS:
        number =
        300;



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
        'Motor Bikes History';


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

            width:'70px',

            align:'center'
        },


        {
            header:'Product Code',

            field:'ProductCode',

            width:'170px',

            align:'center'
        },

        {
            header:'Product Name',

            field:'ProductName',

            align:'left'
        },

        {
            header:'Category',

            field:'CategoryName',

            width:'200px',

            align:'left'
        },

        {
            header:'Product Sub Category',

            field:'SubCategoryName',

            width:'260px',

            align:'left'
        },

        {
            header:'Re-order',

            field:'ReorderLevel',

            width:'110px',

            align:'center'
        },

        {
            header:'Red',

            field:'RedLevel',

            width:'90px',

            align:'center'
        },

        {
            header:'Max',

            field:'MaxStockLevel',

            width:'90px',

            align:'center'
        },

        {
            header:'Image',

            field:'ImageUrl',

            // Hover preview header : name + the three stock levels
            previewTitleField:'ProductName',

            previewDetails:
            [
                { label:'Re-order', field:'ReorderLevel' },
                { label:'Red', field:'RedLevel' },
                { label:'Max', field:'MaxStockLevel' }
            ],
            sortable:false,

            type:'image',

            width:'90px',

            align:'center'
        },
        
        {
            header:'Status',

            field:'IsActive',

            width:'130px',

            type:'status',

            align:'center'
        },

        {
            header:'Actions',

            field:'actions',

            type:'actions',

            width:'140px',

            align:'center'
        }
    ];



    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadSwitches();

        this.loadFilterLookups();

        this.loadItems();
    }



    //===========================================================
    // Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        this.clearProgressTimer();

        this.clearSearchTimer();

        this.loadSubscription?.unsubscribe();


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
    // Switches
    //===========================================================

    private loadSwitches():
        void
    {
        this.systemConfigurations
            .getValues()
            .subscribe
            ({
                next:
                (
                    values
                ): void =>
                {
                    const row =
                        values.find(
                            x =>
                                x.ConfigurationCode ===
                                MotorBikesList.ImagePreviewSwitch
                        );

                    this.imagePreviewEnabled =
                        row ? row.IsEnabled : true;

                    this.cdr.detectChanges();
                },

                error:
                (): void =>
                {
                    // Unreadable : keep the default (ON)
                }
            });
    }


    //===========================================================
    // Filter Lookups
    //===========================================================

    private loadFilterLookups():
        void
    {
        this.productCategoryService
            .getAll()
            .subscribe
            ({
                next:
                (
                    list:
                        any[]
                ): void =>
                {
                    const categories =
                        (list ?? [])
                            .filter(
                                x =>
                                    String(x?.CategoryType ?? '').trim().toLowerCase() ===
                                    'motor bikes'
                            );

                    this.motorBikeCategoryIds =
                        new Set<number>(
                            categories.map(x => Number(x?.ProductCategoryId ?? 0))
                        );

                    this.categoryFilterItems =
                    [
                        { label:'All Categories', value:null },
                        ...categories
                            .map(
                                x =>
                                ({
                                    label:`${x.CategoryCode} - ${x.CategoryName}`,
                                    value:Number(x.ProductCategoryId)
                                })
                            )
                            .sort((a, b) => a.label.localeCompare(b.label))
                    ];

                    this.buildSubCategoryFilterItems();

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error('Load Category Filter Error', error);
                }
            });

        this.productSubCategoryService
            .getAll()
            .subscribe
            ({
                next:
                (
                    list:
                        any[]
                ): void =>
                {
                    this.filterSubCategories =
                        list ?? [];

                    this.buildSubCategoryFilterItems();

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error('Load Sub Category Filter Error', error);
                }
            });

        this.colorService
            .getAll()
            .subscribe
            ({
                next:
                (
                    list:
                        any[]
                ): void =>
                {
                    this.colorFilterItems =
                    [
                        { label:'All Colors', value:null, swatch:'' },
                        ...(list ?? [])
                            .map(
                                x =>
                                ({
                                    label:String(x?.ColorName ?? ''),
                                    value:Number(x?.ColorManagementId ?? 0),
                                    swatch:this.cssColor(x?.ColorName)
                                })
                            )
                            .filter(x => x.value > 0)
                            .sort((a, b) => a.label.localeCompare(b.label))
                    ];

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error('Load Color Filter Error', error);
                }
            });
    }


    // Sub categories of the chosen category (or of every Motor
    // Bikes category when none is chosen)
    private buildSubCategoryFilterItems():
        void
    {
        const categoryId =
            this.selectedCategoryId;

        this.subCategoryFilterItems =
        [
            { label:'All Sub Categories', value:null },
            ...this.filterSubCategories
                .filter(
                    x =>
                        categoryId
                            ? Number(x?.ProductCategoryId) === categoryId
                            : this.motorBikeCategoryIds.has(Number(x?.ProductCategoryId))
                )
                .map(
                    x =>
                    ({
                        label:`${x.SubCategoryCode} - ${x.SubCategoryName}`,
                        value:Number(x.ProductSubCategoryId)
                    })
                )
                .sort((a, b) => a.label.localeCompare(b.label))
        ];
    }


    // "Sky Blue" -> "skyblue" when the browser knows it, else ''
    private cssColor
    (
        name:
            string
    ):
        string
    {
        const css =
            String(name ?? '')
                .toLowerCase()
                .replace(/[^a-z]/g, '');

        return css && CSS.supports('color', css)
            ? css
            : '';
    }


    onCategoryFilterChange
    (
        value:
            number | null
    ):
        void
    {
        this.selectedCategoryId =
            Number(value) > 0 ? Number(value) : null;

        // The sub category must belong to the category
        this.selectedSubCategoryId =
            null;

        this.buildSubCategoryFilterItems();

        this.reload();
    }


    onSubCategoryFilterChange
    (
        value:
            number | null
    ):
        void
    {
        this.selectedSubCategoryId =
            Number(value) > 0 ? Number(value) : null;

        this.reload();
    }


    onColorFilterChange
    (
        value:
            number | null
    ):
        void
    {
        this.selectedColorId =
            Number(value) > 0 ? Number(value) : null;

        this.reload();
    }



    //===========================================================
    // Normalize API Response
    //===========================================================

    private normalizeMotorBike
    (
        item:
            any
    ):
        MotorBikeListRow
    {
        const motorBike:
            MotorBikes =
            this.motorBikesService.normalize(
                item
            );


        return {
            ...motorBike,

            ImageUrl:
                this.motorBikesService.getImageUrl(
                    motorBike.ImagePath
                )
        };
    }



    //===========================================================
    // Load Items (one page from the server)
    //
    // The server filters (search), sorts and pages; the answer
    // also carries the summary counts.
    //===========================================================

    loadItems():
        void
    {
        this.loadSubscription?.unsubscribe();

        this.loading =
            true;

        this.loadFailed =
            false;

        this.cdr.detectChanges();


        const query:
            MotorBikesPageQuery =
        {
            page:
                this.currentPage,

            pageSize:
                this.pageSize,

            search:
                this.searchText.trim(),

            sort:
                this.sortField,

            dir:
                this.sortDirection,

            status:
                null,

            productCategoryId:
                this.selectedCategoryId,

            productSubCategoryId:
                this.selectedSubCategoryId,

            colorManagementId:
                this.selectedColorId
        };


        this.loadSubscription =
            this.motorBikesService
                .getPaged(
                    query
                )
                .subscribe
                ({
                    next:
                    (
                        response:
                            PagedResult<MotorBikes>
                    ):
                        void =>
                    {
                        this.motorBikes =
                            response.items.map(
                                item =>
                                    this.normalizeMotorBike(
                                        item
                                    )
                            );

                        this.totalRecords =
                            response.totalCount;

                        // The server pulls the page back when rows got
                        // fewer (e.g. the last row of a page deleted)
                        this.currentPage =
                            response.page;

                        this.updateSummary(
                            response.counts
                        );

                        this.loading =
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
                            'Load Motor Bikes Error:',
                            error
                        );

                        this.motorBikes =
                            [];

                        this.totalRecords =
                            0;

                        this.loading =
                            false;

                        this.loadFailed =
                            true;

                        this.toast.error
                        (
                            'Load Failed',
                            'Unable to load motor bikes.'
                        );

                        this.cdr.detectChanges();
                    }
                });
    }



    //===========================================================
    // Reload from page 1 (search, sort or page size changed)
    //===========================================================

    private reload():
        void
    {
        this.currentPage =
            1;

        this.loadItems();
    }



    //===========================================================
    // Summary Line (below the canvas) : Total / Active / Inactive
    // (search applied)
    //===========================================================

    private updateSummary
    (
        counts:
            Record<string, number>
    ):
        void
    {
        const value =
            (
                key:
                    string
            ):
                string =>
                    Number(counts[key] ?? 0).toLocaleString('en-US');

        this.summaryItems =
        [
            { label:'Total', value:value('Total'), tone:'' },
            { label:'Active', value:value('Active'), tone:'ok' },
            { label:'Inactive', value:value('Inactive'), tone:'bad' }
        ];
    }



    //===========================================================
    // Search (asks the server 300 ms after the last key)
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

        this.clearSearchTimer();

        this.searchTimer =
            window.setTimeout(
                () =>
                {
                    this.searchTimer =
                        undefined;

                    this.reload();
                },

                this.SEARCH_DELAY_MS
            );
    }


    private clearSearchTimer():
        void
    {
        if
        (
            this.searchTimer
        )
        {
            clearTimeout(
                this.searchTimer
            );

            this.searchTimer =
                undefined;
        }
    }



    //===========================================================
    // Sort (the server sorts)
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
        this.sortField =
            event.field;

        this.sortDirection =
            event.direction === 'desc'
                ? 'desc'
                : 'asc';

        this.reload();
    }



    //===========================================================
    // Refresh
    //===========================================================

    refresh():
        void
    {
        this.clearSearchTimer();

        this.searchText =
            '';

        this.sortField =
            '';

        // Filters back to "All"
        this.selectedCategoryId =
            null;

        this.selectedSubCategoryId =
            null;

        this.selectedColorId =
            null;

        this.buildSubCategoryFilterItems();

        this.sortDirection =
            'asc';

        this.reload();
    }



    //===========================================================
    // Pagination
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

        this.loadItems();
    }


    onPageSizeChange
    (
        size:
            number
    ):
        void
    {
        this.pageSize =
            size;

        this.reload();
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
            MotorBikeListRow
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',

                item.PublicId
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
            MotorBikeListRow
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',

                item.PublicId
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
            MotorBikeListRow
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
            'Delete Motor Bike',

            `Are you sure you want to delete "${item.ProductName}" ?`,

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
            MotorBikeListRow
    ):
        void
    {
        this.startProgress(
            'Deleting Motor Bike',

            `Please wait while "${item.ProductName}" is being deleted...`
        );


        this.withMinimumDuration(
            this.motorBikesService.delete(
                item.PublicId
            )
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(

                        'Motor Bike deleted.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',

                                `${item.ProductName} deleted successfully.`
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
                        'Delete Motor Bike Error:',
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
                                    'Motor Bike cannot be deleted because it is already in use.';


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

                                'Failed to delete motor bike.'
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
            'Restore Motor Bike',

            'Are you sure you want to restore the most recently deleted motor bike?',

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
            'Restoring Motor Bike',

            'Please wait while the most recently deleted motor bike is being restored...'
        );


        this.withMinimumDuration(
            this.motorBikesService.restore()
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(

                        'Motor Bike restored.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Restore Successful',

                                'The most recently deleted motor bike has been restored.'
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
                        'Restore Motor Bike Error',

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

                                    'There is no deleted motor bike record to restore.'
                                );


                                return;
                            }


                            this.toast.error
                            (
                                'Restore Failed',

                                'Failed to restore motor bike.'
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
        this.motorBikesService
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
                        'Motor Bikes History';


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

                        'Failed to load motor bike history.'
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