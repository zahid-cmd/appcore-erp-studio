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
    throwError
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
    ProductCategory
}
from '../../../models/product-category.model';

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
// Service
//===============================================================

import
{
    ProductCategoryService
}
from '../../../services/product-category.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'product-category-list',

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

    templateUrl:'./product-category-list.html',

    styleUrl:'./product-category-list.css'
})

//===============================================================
// Product Category List
//===============================================================

export class ProductCategoryList
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

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
            label:'All Product Categories'
        }
    ];

    selectedTab:
        string =
        'all';

    //===========================================================
    // Data
    //===========================================================

    productCategories:
        ProductCategory[] =
        [];

    filteredProductCategories:
        ProductCategory[] =
        [];

    pagedProductCategories:
        ProductCategory[] =
        [];

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
        'Product Category History';

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
            header:'Category Code',
            field:'CategoryCode',
            width:'140px',
            align:'center'
        },
        {
            header:'Category Name',
            field:'CategoryName',
            width:'220px',
            align:'left'
        },
        {
            header:'Inventory Group',
            field:'InventoryGroupCode',
            width:'160px',
            align:'center'
        },
        {
            header:'WIP Group',
            field:'WipGroupCode',
            width:'160px',
            align:'center'
        },
        {
            header:'COGS Group',
            field:'CogsGroupCode',
            width:'160px',
            align:'center'
        },
        {
            header:'Sub Category',
            field:'SubCategoryCreationAllowed',
            width:'150px',
            align:'center',
            type:'boolean'
        },
        {
            header:'Status',
            field:'IsActive',
            type:'status',
            width:'120px',
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
    // Normalize API Response
    //===========================================================

    private normalizeProductCategory
    (
        item:
            any
    ):
        ProductCategory
    {
        return {
            ProductCategoryId:
                Number(
                    item?.ProductCategoryId
                    ??
                    item?.productCategoryId
                    ??
                    item?.id
                    ??
                    item?.Id
                    ??
                    0
                ),
            CategoryCode:
                item?.CategoryCode
                ??
                item?.categoryCode
                ??
                '',
            CategoryName:
                item?.CategoryName
                ??
                item?.categoryName
                ??
                '',
            InventoryGroupCode:
                item?.InventoryGroupCode
                ??
                item?.inventoryGroupCode
                ??
                '',
            WipGroupCode:
                item?.WipGroupCode
                ??
                item?.wipGroupCode
                ??
                '',
            CogsGroupCode:
                item?.CogsGroupCode
                ??
                item?.cogsGroupCode
                ??
                '',
            InventoryGroupName:
                item?.InventoryGroupName
                ??
                item?.inventoryGroupName
                ??
                '',
            WipGroupName:
                item?.WipGroupName
                ??
                item?.wipGroupName
                ??
                '',
            CogsGroupName:
                item?.CogsGroupName
                ??
                item?.cogsGroupName
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
    // Normalize API Response List
    //===========================================================

    private normalizeProductCategories
    (
        response:
            any
    ):
        ProductCategory[]
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
                this.normalizeProductCategory(
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

        this.productCategoryService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        ProductCategory[]
                ):
                    void =>
                {
                    this.productCategories =
                        this.normalizeProductCategories(
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
                    console.error(
                        'Load Product Categories Error:',
                        error
                    );

                    this.productCategories =
                        [];

                    this.filteredProductCategories =
                        [];

                    this.pagedProductCategories =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error(
                        'Load Failed',
                        'Unable to load product categories.'
                    );

                    this.cdr.detectChanges();
                }
            });
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

        this.filteredProductCategories =
            this.productCategories.filter
            (
                (
                    item:
                        ProductCategory
                ):
                    boolean =>
                {
                    const statusMatches =
                        this.selectedStatus === null
                        ||
                        item.IsActive ===
                        this.selectedStatus;

                    if
                    (
                        !keyword
                    )
                    {
                        return statusMatches;
                    }

                    const searchable:
                        string[] =
                    [
                        item.CategoryCode ?? '',
                        item.CategoryName ?? '',
                        item.InventoryGroupCode ?? '',
                        item.InventoryGroupName ?? '',
                        item.WipGroupCode ?? '',
                        item.WipGroupName ?? '',
                        item.CogsGroupCode ?? '',
                        item.CogsGroupName ?? '',
                        item.Remarks ?? '',
                        item.IsActive
                            ? 'active'
                            : 'inactive'
                    ];

                    const keywordMatches =
                        searchable.some
                        (
                            value =>
                                value
                                    .toLowerCase()
                                    .includes(keyword)
                        );

                    return keywordMatches
                        &&
                        statusMatches;
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
        this.filteredProductCategories =
        [
            ...this.filteredProductCategories
        ];

        this.filteredProductCategories.sort
        (
            (
                a:
                    ProductCategory,
                b:
                    ProductCategory
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof ProductCategory
                    ];

                const valueB:
                    any =
                    b[
                        event.field as keyof ProductCategory
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
                        ? valueA.localeCompare(valueB)
                        : valueB.localeCompare(valueA);
                }

                if
                (
                    valueA < valueB
                )
                {
                    return event.direction === 'asc'
                        ? -1
                        : 1;
                }

                if
                (
                    valueA > valueB
                )
                {
                    return event.direction === 'asc'
                        ? 1
                        : -1;
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
        if
        (
            this.isProcessing
        )
        {
            return;
        }

        this.searchText =
            '';

        this.selectedStatus =
            null;

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

        this.pagedProductCategories =
        [
            ...this.filteredProductCategories.slice
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
            ProductCategory
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
                item.ProductCategoryId
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
            ProductCategory
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
                item.ProductCategoryId
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
            ProductCategory
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
            'Delete Product Category',
            `Deleting "${item.CategoryName}" will also delete its auto-generated Inventory, WIP and COGS Account Groups. Do you want to continue?`,
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
            ProductCategory
    ):
        void
    {
        this.isProcessing =
            true;

        this.startProgress(
            'Deleting Product Category',
            `Deleting "${item.CategoryName}" and its auto-generated Account Groups...`
        );

        this.withMinimumDuration(
            this.productCategoryService.delete(
                item.ProductCategoryId
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
                    'Product Category deleted successfully.',
                    ():
                        void =>
                    {
                        this.isProcessing =
                            false;

                        this.toast.success(
                            'Delete Successful',
                            `${item.CategoryName} and its auto-generated Account Groups deleted successfully.`
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
                    'Delete Product Category Error:',
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
                                    'Product Category cannot be deleted because product sub categories or products are created under it.'
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
                                'This product category no longer exists. The list has been refreshed.'
                            );

                            this.loadItems();

                            return;
                        }

                        //=======================================
                        // Delete Failed
                        //=======================================

                        this.toast.error(
                            'Delete Failed',
                            'Failed to delete product category and its auto-generated Account Groups.'
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
            'Restore Product Category',
            'Restoring the most recently deleted product category will also restore its auto-generated Inventory, WIP and COGS Account Groups. Do you want to continue?',
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
            'Restoring Product Category',
            'Restoring the most recently deleted product category and its Account Groups...'
        );

        this.withMinimumDuration(
            this.productCategoryService.restore(),
            this.minimumActionDurationMs
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Product Category restored successfully.',
                    ():
                        void =>
                    {
                        this.isProcessing =
                            false;

                        this.toast.success(
                            'Restore Successful',
                            'The Product Category and its auto-generated Account Groups have been restored successfully.'
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
                    'Restore Product Category Error:',
                    error
                );

                this.failProgress(
                    ():
                        void =>
                    {
                        this.isProcessing =
                            false;

                        if
                        (
                            error instanceof HttpErrorResponse
                            &&
                            error.status === 404
                        )
                        {
                            this.toast.info(
                                'No Data to Restore',
                                'There is no deleted product category record to restore.'
                            );

                            this.cdr.detectChanges();

                            return;
                        }

                        this.toast.error(
                            'Restore Failed',
                            this.extractErrorMessage(
                                error,
                                'Failed to restore the product category and its auto-generated Account Groups.'
                            )
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
        this.productCategoryService
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
                        'Product Category Management History';

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
                        'Failed to load product category history.'
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