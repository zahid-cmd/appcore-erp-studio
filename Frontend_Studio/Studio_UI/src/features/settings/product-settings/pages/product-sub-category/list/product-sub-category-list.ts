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
    ProductSubCategory
}
from '../../../models/product-sub-category.model';

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

//===============================================================
// Service
//===============================================================

import
{
    ProductSubCategoryService
}
from '../../../services/product-sub-category.service';

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
        ToastComponent
    ],
    templateUrl:'./product-sub-category-list.html',
    styleUrl:'./product-sub-category-list.css'
})
//===============================================================
// Product Sub Category List
//===============================================================

export class ProductSubCategoryList
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================
    private readonly productSubCategoryService =
        inject(ProductSubCategoryService);
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
        ProductSubCategory[] =
    [];
    filteredProductSubCategories:
        ProductSubCategory[] =
    [];
    pagedProductSubCategories:
        ProductSubCategory[] =
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
            width:'140px',
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
            field:'ProductCategoryId',
            width:'180px',
            align:'center'
        },
        {
            header:'Inventory Sub Group',
            field:'InventorySubGroupCode',
            width:'160px',
            align:'center'
        },
        {
            header:'WIP Sub Group',
            field:'WipSubGroupCode',
            width:'160px',
            align:'center'
        },
        {
            header:'COGS Sub Group',
            field:'CogsSubGroupCode',
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
    // Normalize API Response
    //===========================================================
    private normalizeProductSubCategory
    (
        item:
            any
    ):
        ProductSubCategory
    {
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
            ProductCategoryId:
                Number(
                    item?.ProductCategoryId
                    ??
                    item?.productCategoryId
                    ??
                    0
                ),
            SubCategoryCode:
                item?.SubCategoryCode
                ??
                item?.categoryCode
                ??
                '',
            SubCategoryName:
                item?.SubCategoryName
                ??
                item?.categoryName
                ??
                '',
            InventorySubGroupCode:
                item?.InventorySubGroupCode
                ??
                item?.inventoryGroupCode
                ??
                '',
            WipSubGroupCode:
                item?.WipSubGroupCode
                ??
                item?.wipGroupCode
                ??
                '',
            CogsSubGroupCode:
                item?.CogsSubGroupCode
                ??
                item?.cogsGroupCode
                ??
                '',
            InventorySubGroupName:
                item?.InventorySubGroupName
                ??
                item?.inventoryGroupName
                ??
                '',
            WipSubGroupName:
                item?.WipSubGroupName
                ??
                item?.wipGroupName
                ??
                '',
            CogsSubGroupName:
                item?.CogsSubGroupName
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
    private normalizeProductSubCategories
    (
        response:
            any
    ):
        ProductSubCategory[]
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
                this.normalizeProductSubCategory(
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
        this.productSubCategoryService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        ProductSubCategory[]
                ):
                    void =>
                {
                    console.log
                    (
                        'Product Sub Category API Response:',
                        response
                    );
                    this.productSubCategories =
                        this.normalizeProductSubCategories(
                            response
                        );
                    console.log
                    (
                        'Normalized Product Sub Categories:',
                        this.productSubCategories
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
                        'Load Product Sub Categories Error:',
                        error
                    );
                    this.productSubCategories =
                        [];
                    this.filteredProductSubCategories =
                        [];
                    this.pagedProductSubCategories =
                        [];
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
        this.filteredProductSubCategories =
            this.productSubCategories.filter
            (
                (
                    item:
                        ProductSubCategory
                ):
                    boolean =>
                {
                    const categoryCode =
                        item.SubCategoryCode
                        ??
                        '';
                    const categoryName =
                        item.SubCategoryName
                        ??
                        '';
                    const inventoryGroupCode =
                        item.InventorySubGroupCode
                        ??
                        '';
                    const inventoryGroupName =
                        item.InventorySubGroupName
                        ??
                        '';
                    const wipGroupCode =
                        item.WipSubGroupCode
                        ??
                        '';
                    const wipGroupName =
                        item.WipSubGroupName
                        ??
                        '';
                    const cogsGroupCode =
                        item.CogsSubGroupCode
                        ??
                        '';
                    const cogsGroupName =
                        item.CogsSubGroupName
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
                    const statusMatches =
                        this.selectedStatus === null
                        ||
                        item.IsActive ===
                            this.selectedStatus;
                    const keywordMatches =
                        !keyword
                        ||
                        categoryCode
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        categoryName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        inventoryGroupCode
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        inventoryGroupName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        wipGroupCode
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        wipGroupName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        cogsGroupCode
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        cogsGroupName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        remarks
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        status
                            .includes(keyword);
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
        this.filteredProductSubCategories =
        [
            ...this.filteredProductSubCategories
        ];
        this.filteredProductSubCategories.sort
        (
            (
                a:
                    ProductSubCategory,
                b:
                    ProductSubCategory
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof ProductSubCategory
                    ];
                const valueB:
                    any =
                    b[
                        event.field as keyof ProductSubCategory
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
        this.pagedProductSubCategories =
        [
            ...this.filteredProductSubCategories.slice
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
            ProductSubCategory
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',
                item.ProductSubCategoryId
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
            ProductSubCategory
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',
                item.ProductSubCategoryId
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
            ProductSubCategory
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Product Sub Category',
            `Deleting "${item.SubCategoryName}" will also delete its auto-generated Inventory, WIP and COGS Account Groups. Do you want to continue?`,
            ():
                void =>
            {
                this.productSubCategoryService
                    .delete
                    (
                        item.ProductSubCategoryId
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
                                `${item.SubCategoryName} and its auto-generated Account Groups deleted successfully.`
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
                                'Delete Product Sub Category Error:',
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
                                    'Product Sub Category cannot be deleted because it or its auto-generated Account Groups are already configured.';
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
                                'Failed to delete product sub category and its auto-generated Account Groups.'
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
            'Restore Product Sub Category',
            'Restoring the most recently deleted product sub category will also restore its auto-generated Inventory, WIP and COGS Account Groups. Do you want to continue?',
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
        this.productSubCategoryService
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
                        'The Product Sub Category and its auto-generated Account Groups have been restored successfully.'
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
                        'Restore Product Sub Category Error:',
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
                            'There is no deleted product sub category record to restore.'
                        );
                        return;
                    }
                    this.toast.error
                    (
                        'Restore Failed',
                        'Failed to restore the product sub category and its auto-generated Account Groups.'
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
                    console.error
                    (
                        'History Load Failed:',
                        error
                    );
                    this.toast.error
                    (
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
