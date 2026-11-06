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
    forkJoin,
    of,
    timer,
    throwError,
    Subscription
}
from 'rxjs';

import
{
    catchError,
    delayWhen,
    switchMap
}
from 'rxjs/operators';

//===============================================================
// Models
//===============================================================

import
{
    ProductSubCategory
}
from '../../../models/product-sub-category.model';

import
{
    ProductSubCategoryPageQuery
}
from '../../../models/product-sub-category.model';

import
{
    PagedResult
}
from '../../../../../../shared/paging/paged-result.model';

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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

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

//===============================================================
// Services
//===============================================================

import
{
    ProductSubCategoryService
}
from '../../../services/product-sub-category.service';

import
{
    ProductCategoryService
}
from '../../../services/product-category.service';

//===============================================================
// Local Types
//===============================================================

type ProductSubCategoryRow =
    ProductSubCategory &
    {
        ProductCategoryName:
            string;
    };

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'product-sub-category-list',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        ControlTabsComponent,
        SearchBoxComponent,
        SearchDropdownComponent,
        CommandCenterComponent,
        PageCanvasComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ConfirmDialogComponent,
        ToastComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./product-sub-category-list.html',

    styleUrl:'./product-sub-category-list.css'
})

//===============================================================
// Product Sub Category List
//===============================================================

export class ProductSubCategoryList
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly productSubCategoryService =
        inject(ProductSubCategoryService);

    private readonly productCategoryService =
        inject(ProductCategoryService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    private readonly router =
        inject(Router);

    private readonly route =
        inject(ActivatedRoute);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Progress Configuration
    //===========================================================

    private readonly minimumActionDurationMs:
        number =
        3000;

    private readonly progressCeiling:
        number =
        90;

    private readonly progressEaseFactor:
        number =
        0.06;

    private readonly progressIntervalMs:
        number =
        100;

    private readonly progressCompleteHoldMs:
        number =
        600;

    private readonly confirmCloseDelayMs:
        number =
        150;

    //===========================================================
    // Progress State
    //===========================================================

    private progressTimer:
        ReturnType<typeof setInterval> | null =
        null;

    private progressValue:
        number =
        0;

    isProcessing:
        boolean =
        false;

    //===========================================================
    // Page Tabs
    //===========================================================

    tabs:
        ControlTab[] =
    [
        {
            id:'all',
            label:'All Product Sub Categories'
        }
    ];

    selectedTab:
        string =
        'all';

    //===========================================================
    // Data
    //===========================================================

    productSubCategories:
        ProductSubCategoryRow[] =
        [];

    // Rows matching the filters and search, all pages
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

    // '' = the server's default sort
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
    // Status Filter
    //===========================================================

    statusFilterItems:
        any[] =
    [
        {
            label:'All Status',
            value:null
        },
        {
            label:'Active',
            value:true
        },
        {
            label:'Inactive',
            value:false
        }
    ];

    selectedStatus:
        boolean | null =
        null;

    //===========================================================
    // Product Category Filter
    //===========================================================

    categoryFilterItems:
        any[] =
    [
        {
            label:'All Categories',
            value:null
        }
    ];

    selectedCategoryId:
        number | null =
        null;

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
        'Product Sub Category History';

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
            header:'Sub Category Code',
            field:'SubCategoryCode',
            width:'170px',
            align:'center'
        },
        {
            header:'Sub Category Name',
            field:'SubCategoryName',
            width:'220px',
            align:'left'
        },
        {
            header:'Product Category',
            field:'ProductCategoryName',
            width:'180px',
            align:'left'
        },
        {
            header:'Inventory Sub Group',
            field:'InventorySubGroupCode',
            width:'170px',
            align:'center'
        },
        {
            header:'WIP Sub Group',
            field:'WipSubGroupCode',
            width:'170px',
            align:'center'
        },
        {
            header:'COGS Sub Group',
            field:'CogsSubGroupCode',
            width:'170px',
            align:'center'
        },
        {
            header:'Status',
            field:'IsActive',
            type:'status',
            width:'110px',
            align:'center'
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
        this.loadCategoryFilter();

        this.loadItems();
    }

    //===========================================================
    // Product Category Filter Items
    //===========================================================

    private loadCategoryFilter():
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
                ):
                    void =>
                {
                    const items =
                        (Array.isArray(list) ? list : [])
                            .map(
                                x =>
                                ({
                                    label:
                                        `${x?.CategoryCode ?? x?.categoryCode ?? ''} - ${x?.CategoryName ?? x?.categoryName ?? ''}`,
                                    value:
                                        Number(x?.ProductCategoryId ?? x?.productCategoryId ?? 0)
                                })
                            )
                            .filter(x => x.value > 0)
                            .sort((a, b) => a.label.localeCompare(b.label));

                    this.categoryFilterItems =
                    [
                        {
                            label:'All Categories',
                            value:null
                        },
                        ...items
                    ];

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Product Category Filter Error',
                        error
                    );
                }
            });
    }

    //===========================================================
    // Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        this.clearSearchTimer();

        this.loadSubscription?.unsubscribe();

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
    // Normalize API Response
    //===========================================================

    private normalizeProductSubCategory
    (
        item:
            any,
        categoryNames:
            Map<number, string>
    ):
        ProductSubCategoryRow
    {
        const productCategoryId =
            Number(
                item?.ProductCategoryId
                ??
                item?.productCategoryId
                ??
                0
            );

        return {
            ProductSubCategoryId:
                Number(
                    item?.ProductSubCategoryId
                    ??
                    item?.productSubCategoryId
                    ??
                    item?.id
                    ??
                    item?.Id
                    ??
                    0
                ),

            PublicId:
                String(item?.PublicId ?? item?.publicId ?? ''),
            ProductCategoryId:
                productCategoryId,
            ProductCategoryName:
                item?.ProductCategoryName
                ??
                item?.productCategoryName
                ??
                categoryNames.get(
                    productCategoryId
                )
                ??
                String(productCategoryId),
            SubCategoryCode:
                item?.SubCategoryCode
                ??
                item?.subCategoryCode
                ??
                '',
            SubCategoryName:
                item?.SubCategoryName
                ??
                item?.subCategoryName
                ??
                '',
            InventorySubGroupCode:
                item?.InventorySubGroupCode
                ??
                item?.inventorySubGroupCode
                ??
                '',
            WipSubGroupCode:
                item?.WipSubGroupCode
                ??
                item?.wipSubGroupCode
                ??
                '',
            CogsSubGroupCode:
                item?.CogsSubGroupCode
                ??
                item?.cogsSubGroupCode
                ??
                '',
            InventorySubGroupName:
                item?.InventorySubGroupName
                ??
                item?.inventorySubGroupName
                ??
                '',
            WipSubGroupName:
                item?.WipSubGroupName
                ??
                item?.wipSubGroupName
                ??
                '',
            CogsSubGroupName:
                item?.CogsSubGroupName
                ??
                item?.cogsSubGroupName
                ??
                '',
            SubCategoryCreationAllowed:
                Boolean(
                    item?.SubCategoryCreationAllowed
                    ??
                    item?.subCategoryCreationAllowed
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
                Boolean(
                    item?.IsActive
                    ??
                    item?.isActive
                    ??
                    true
                )
        };
    }

    //===========================================================
    // Build Category Name Map
    //===========================================================

    private buildCategoryNameMap
    (
        response:
            any
    ):
        Map<number, string>
    {
        const map =
            new Map<number, string>();

        if
        (
            !Array.isArray(response)
        )
        {
            return map;
        }

        for
        (
            const item
            of response
        )
        {
            const id =
                Number(
                    item?.ProductCategoryId
                    ??
                    item?.productCategoryId
                    ??
                    0
                );

            const name =
                item?.CategoryName
                ??
                item?.categoryName
                ??
                '';

            if
            (
                id > 0
            )
            {
                map.set(
                    id,
                    name
                );
            }
        }

        return map;
    }

    //===========================================================
    // Load Items (one page from the server)
    //
    // The server filters, searches, sorts and pages; the answer
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
            ProductSubCategoryPageQuery =
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
                this.selectedStatus,

            productCategoryId:
                this.selectedCategoryId
        };

        this.loadSubscription =
            this.productSubCategoryService
                .getPaged(
                    query
                )
                .subscribe
                ({
                    next:
                    (
                        response:
                            PagedResult<any>
                    ):
                        void =>
                    {
                        this.productSubCategories =
                            response.items.map(item => this.normalizeProductSubCategory(item, new Map<number, string>()));

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
                            'Load Product Sub Categories Error:',
                            error
                        );

                        this.productSubCategories =
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
                            'Unable to load product sub categories.'
                        );

                        this.cdr.detectChanges();
                    }
                });
    }

    //===========================================================
    // Reload from page 1 (a filter, search, sort or page size
    // changed)
    //===========================================================

    private reload():
        void
    {
        this.currentPage =
            1;

        this.loadItems();
    }

    //===========================================================
    // Summary Line (below the canvas)
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
    // Product Category Filter Change
    //===========================================================

    onCategoryFilterChange
    (
        value:
            number | null
    ):
        void
    {
        this.selectedCategoryId =
            Number(value) > 0
                ? Number(value)
                : null;

        this.reload();
    }

    //===========================================================
    // Status Filter Change
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

        this.reload();
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

        this.selectedStatus =
            null;

        this.sortField =
            '';

        // Filters back to "All"
        this.selectedCategoryId =
            null;

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
        if
        (
            this.isProcessing
        )
        {
            return;
        }

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
            ProductSubCategoryRow
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
            ProductSubCategoryRow
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
            ProductSubCategoryRow
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
            'Delete Product Sub Category',
            `Deleting "${item.SubCategoryName}" will also delete its auto-generated Inventory, WIP and COGS Account Sub Groups. Do you want to continue?`,
            ():
                void =>
            {
                //===============================================
                // Let the confirm dialog close first
                //===============================================

                setTimeout
                (
                    ():
                        void =>
                        this.deleteItem(
                            item
                        ),
                    this.confirmCloseDelayMs
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
            ProductSubCategoryRow
    ):
        void
    {
        this.isProcessing =
            true;

        this.startProgress(
            'Deleting Product Sub Category',
            `Deleting "${item.SubCategoryName}" and its auto-generated Account Sub Groups...`
        );

        this.withMinimumDuration(
            this.productSubCategoryService.delete(
                item.PublicId ?? ''
            ),
            this.minimumActionDurationMs
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Product Sub Category deleted successfully.',
                    ():
                        void =>
                    {
                        this.isProcessing =
                            false;

                        this.toast.success(
                            'Delete Successful',
                            `${item.SubCategoryName} and its auto-generated Account Sub Groups deleted successfully.`
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
                console.error(
                    'Delete Product Sub Category Error:',
                    error
                );

                this.failProgress(
                    ():
                        void =>
                    {
                        this.isProcessing =
                            false;

                        //=======================================
                        // Deletion Blocked (409)
                        //=======================================

                        if
                        (
                            error instanceof HttpErrorResponse
                            &&
                            error.status === 409
                        )
                        {
                            this.toast.info(
                                'Delete Blocked',
                                this.extractErrorMessage(
                                    error,
                                    'Product Sub Category cannot be deleted because products are created under it.'
                                )
                            );

                            this.cdr.detectChanges();

                            return;
                        }

                        //=======================================
                        // Not Found (404)
                        //=======================================

                        if
                        (
                            error instanceof HttpErrorResponse
                            &&
                            error.status === 404
                        )
                        {
                            this.toast.info(
                                'Not Found',
                                'This product sub category no longer exists. The list has been refreshed.'
                            );

                            this.loadItems();

                            return;
                        }

                        //=======================================
                        // Delete Failed
                        //=======================================

                        this.toast.error(
                            'Delete Failed',
                            'Failed to delete product sub category and its auto-generated Account Sub Groups.'
                        );

                        this.cdr.detectChanges();
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
            'Restore Product Sub Category',
            'Restoring the most recently deleted product sub category will also restore its auto-generated Inventory, WIP and COGS Account Sub Groups. Do you want to continue?',
            ():
                void =>
            {
                //===============================================
                // Let the confirm dialog close first
                //===============================================

                setTimeout
                (
                    ():
                        void =>
                        this.restoreItem(),
                    this.confirmCloseDelayMs
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
        this.isProcessing =
            true;

        this.startProgress(
            'Restoring Product Sub Category',
            'Restoring the most recently deleted product sub category and its Account Sub Groups...'
        );

        this.withMinimumDuration(
            this.productSubCategoryService.restore(),
            this.minimumActionDurationMs
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Product Sub Category restored successfully.',
                    ():
                        void =>
                    {
                        this.isProcessing =
                            false;

                        this.toast.success(
                            'Restore Successful',
                            'The Product Sub Category and its auto-generated Account Sub Groups have been restored successfully.'
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
                console.error(
                    'Restore Product Sub Category Error:',
                    error
                );

                this.failProgress(
                    ():
                        void =>
                    {
                        this.isProcessing =
                            false;

                        //=======================================
                        // Nothing To Restore (404)
                        //=======================================

                        if
                        (
                            error instanceof HttpErrorResponse
                            &&
                            error.status === 404
                        )
                        {
                            this.toast.info(
                                'No Data to Restore',
                                'There is no deleted product sub category record to restore.'
                            );

                            this.cdr.detectChanges();

                            return;
                        }

                        //=======================================
                        // Restore Blocked (409)
                        //=======================================

                        if
                        (
                            error instanceof HttpErrorResponse
                            &&
                            error.status === 409
                        )
                        {
                            this.toast.info(
                                'Restore Blocked',
                                this.extractErrorMessage(
                                    error,
                                    'The product sub category cannot be restored.'
                                )
                            );

                            this.cdr.detectChanges();

                            return;
                        }

                        //=======================================
                        // Restore Failed
                        //=======================================

                        this.toast.error(
                            'Restore Failed',
                            'Failed to restore the product sub category and its auto-generated Account Sub Groups.'
                        );

                        this.cdr.detectChanges();
                    }
                );
            }
        });
    }

    //===========================================================
    // Progress : Start (animated easing toward ceiling)
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
        this.clearProgressTimer();

        this.progressValue =
            0;

        this.progressDialog.show(
            title,
            message,
            false
        );

        this.progressDialog.update(
            0,
            message
        );

        this.progressTimer =
            setInterval
            (
                ():
                    void =>
                {
                    const step =
                        Math.max(
                            0.4,
                            (
                                this.progressCeiling -
                                this.progressValue
                            )
                            *
                            this.progressEaseFactor
                        );

                    this.progressValue =
                        Math.min(
                            this.progressCeiling,
                            this.progressValue + step
                        );

                    this.progressDialog.update(
                        Math.round(
                            this.progressValue
                        )
                    );
                },
                this.progressIntervalMs
            );
    }

    //===========================================================
    // Progress : Complete
    //===========================================================

    private completeProgress
    (
        message:
            string,
        callback:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressValue =
            100;

        this.progressDialog.update(
            100,
            message
        );

        setTimeout
        (
            ():
                void =>
            {
                this.progressDialog.close();

                callback();
            },
            this.progressCompleteHoldMs
        );
    }

    //===========================================================
    // Progress : Fail
    //===========================================================

    private failProgress
    (
        callback:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressDialog.close();

        callback();
    }

    //===========================================================
    // Progress : Clear Timer
    //===========================================================

    private clearProgressTimer():
        void
    {
        if
        (
            this.progressTimer !== null
        )
        {
            clearInterval(
                this.progressTimer
            );

            this.progressTimer =
                null;
        }
    }

    //===========================================================
    // Minimum Duration Wrapper
    //===========================================================

    private withMinimumDuration<T>
    (
        source:
            Observable<T>,
        minimumMs:
            number
    ):
        Observable<T>
    {
        return defer
        (
            ():
                Observable<T> =>
            {
                const startedAt =
                    Date.now();

                const remaining =
                    ():
                        number =>
                        Math.max(
                            0,
                            minimumMs -
                            (
                                Date.now() -
                                startedAt
                            )
                        );

                return source.pipe
                (
                    delayWhen
                    (
                        () =>
                            timer(
                                remaining()
                            )
                    ),

                    catchError
                    (
                        error =>
                            timer(
                                remaining()
                            )
                            .pipe
                            (
                                switchMap
                                (
                                    () =>
                                        throwError(
                                            () => error
                                        )
                                )
                            )
                    )
                );
            }
        );
    }

    //===========================================================
    // Extract Error Message
    //===========================================================

    private extractErrorMessage
    (
        error:
            unknown,
        fallback:
            string
    ):
        string
    {
        if
        (
            error instanceof HttpErrorResponse
        )
        {
            if
            (
                typeof error.error === 'string'
                &&
                error.error.trim()
            )
            {
                return error.error;
            }

            if
            (
                error.error?.message
            )
            {
                return error.error.message;
            }

            if
            (
                error.error?.title
            )
            {
                return error.error.title;
            }
        }

        return fallback;
    }

    //===========================================================
    // Open History
    //===========================================================

    openHistory():
        void
    {
        this.productSubCategoryService
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
                                    new Date(
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
                        'Product Sub Category Management History';

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
                    console.error(
                        'History Load Failed:',
                        error
                    );

                    this.toast.error(
                        'History',
                        'Failed to load product sub category history.'
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