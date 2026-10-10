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
    ProductMaster
}
from '../../../models/product-master.model';

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
    ProductMasterService
}
from '../../../services/product-master.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'product-master-list',
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
    templateUrl:'./product-master-list.html',
    styleUrl:'./product-master-list.css'
})
//===============================================================
// Product Master List
//===============================================================

export class ProductMasterList
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================
    private readonly productMasterService =
        inject(ProductMasterService);
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
            label:'All Product Masters'
        }
    ];
    selectedTab:
        string =
        'all';
    //===========================================================
    // Data
    //===========================================================
    productMasters:
        ProductMaster[] =
    [];
    filteredProductMasters:
        ProductMaster[] =
    [];
    pagedProductMasters:
        ProductMaster[] =
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
        'Product Master History';
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
            width:'200px',
            align:'left'
        },
        {
            header:'Product Name',
            field:'ProductName',
            width:'180px',
            align:'left'
        },
        {
            header:'Product Category',
            field:'ProductCategoryName',
            width:'160px',
            align:'left'
        },
        {
            header:'Sub Category',
            field:'ProductSubCategoryName',
            width:'160px',
            align:'left'
        },
        {
            header:'Inventory Ledger',
            field:'InventoryLedgerCode',
            width:'200px',
            align:'left'
        },
        {
            header:'WIP Ledger',
            field:'WipLedgerCode',
            width:'200px',
            align:'left'
        },
        {
            header:'COGS Ledger',
            field:'CogsLedgerCode',
            width:'200px',
            align:'left'
        },
        {
            header:'Status',
            field:'IsActive',
            type:'status',

            align:'center'
        },
        {
            header:'Actions',
            field:'actions',
            type:'actions',
            width:'100px',
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
    private normalizeProductMaster
    (
        item:
            any
    ):
        ProductMaster
    {
        return {
            ProductMasterId:
                Number(
                    item?.ProductMasterId
                    ??
                    item?.productMasterId
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
            ProductCategoryName:
                item?.ProductCategoryName
                ??
                item?.productCategoryName
                ??
                '',
            ProductSubCategoryId:
                Number(
                    item?.ProductSubCategoryId
                    ??
                    item?.productSubCategoryId
                    ??
                    0
                ),
            ProductSubCategoryName:
                item?.ProductSubCategoryName
                ??
                item?.productSubCategoryName
                ??
                '',
            SubCategoryCode:
                item?.SubCategoryCode
                ??
                item?.subCategoryCode
                ??
                '',
            ProductCode:
                item?.ProductCode
                ??
                item?.productCode
                ??
                '',
            ProductName:
                item?.ProductName
                ??
                item?.productName
                ??
                '',
            //===========================================================
            // Auto Ledger Codes
            //===========================================================
            InventoryLedgerCode:
                item?.InventoryLedgerCode
                ??
                item?.inventoryLedgerCode
                ??
                '',
            WipLedgerCode:
                item?.WipLedgerCode
                ??
                item?.wipLedgerCode
                ??
                '',
            CogsLedgerCode:
                item?.CogsLedgerCode
                ??
                item?.cogsLedgerCode
                ??
                '',
            //===========================================================
            // Auto Ledger Names
            //===========================================================
            InventoryLedgerName:
                item?.InventoryLedgerName
                ??
                item?.inventoryLedgerName
                ??
                '',
            WipLedgerName:
                item?.WipLedgerName
                ??
                item?.wipLedgerName
                ??
                '',
            CogsLedgerName:
                item?.CogsLedgerName
                ??
                item?.cogsLedgerName
                ??
                '',
            //===========================================================
            // Configuration
            //===========================================================
            // TODO: Normalize Product Master specific configuration fields here
            Remarks:
                item?.Remarks
                ??
                item?.remarks
                ??
                '',
            //===========================================================
            // Status
            //===========================================================
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
    private normalizeProductMasters
    (
        response:
            any
    ):
        ProductMaster[]
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
                this.normalizeProductMaster(
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
        this.productMasterService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        ProductMaster[]
                ):
                    void =>
                {
                    console.log
                    (
                        'Product Master API Response:',
                        response
                    );
                    this.productMasters =
                        this.normalizeProductMasters(
                            response
                        );
                    console.log
                    (
                        'Normalized Product Masters:',
                        this.productMasters
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
                        'Load Product Masters Error:',
                        error
                    );
                    this.productMasters =
                        [];
                    this.filteredProductMasters =
                        [];
                    this.pagedProductMasters =
                        [];
                    this.loading =
                        false;
                    this.loadFailed =
                        true;
                    this.toast.error
                    (
                        'Load Failed',
                        'Unable to load product masters.'
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
        this.filteredProductMasters =
            this.productMasters.filter
            (
                (
                    item:
                        ProductMaster
                ):
                    boolean =>
                {
                    const productCode =
                        item.ProductCode
                        ??
                        '';
                    const productName =
                        item.ProductName
                        ??
                        '';
                    const categoryName =
                        item.ProductCategoryName
                        ??
                        '';
                    const subCategoryName =
                        item.ProductSubCategoryName
                        ??
                        '';
                    const subCategoryCode =
                        item.SubCategoryCode
                        ??
                        '';
                    const ledgerText =
                        [
                            item.InventoryLedgerCode,
                            item.InventoryLedgerName,
                            item.WipLedgerCode,
                            item.WipLedgerName,
                            item.CogsLedgerCode,
                            item.CogsLedgerName
                        ]
                            .join(' ')
                            .toLowerCase();
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
                        productCode
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        productName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        categoryName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        subCategoryName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        subCategoryCode
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        ledgerText
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
        this.filteredProductMasters =
        [
            ...this.filteredProductMasters
        ];
        this.filteredProductMasters.sort
        (
            (
                a:
                    ProductMaster,
                b:
                    ProductMaster
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof ProductMaster
                    ];
                const valueB:
                    any =
                    b[
                        event.field as keyof ProductMaster
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
        this.pagedProductMasters =
        [
            ...this.filteredProductMasters.slice
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
            ProductMaster
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',
                item.ProductMasterId
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
            ProductMaster
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',
                item.ProductMasterId
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
            ProductMaster
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Product Master',
            `Deleting "${item.ProductName}" will also delete its auto-generated Inventory, WIP and COGS General Ledgers. Do you want to continue?`,
            ():
                void =>
            {
                this.productMasterService
                    .delete
                    (
                        item.ProductMasterId
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
                                `${item.ProductName} and its auto-generated General Ledgers deleted successfully.`
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
                                'Delete Product Master Error:',
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
                                    'Product Master cannot be deleted because it or its auto-generated General Ledgers are already configured.';
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
                                'Failed to delete product master and its auto-generated General Ledgers.'
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
            'Restore Product Master',
            'Restoring the most recently deleted product master will also restore its auto-generated Inventory, WIP and COGS General Ledgers. Do you want to continue?',
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
        this.productMasterService
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
                        'The Product Master and its auto-generated General Ledgers have been restored successfully.'
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
                        'Restore Product Master Error:',
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
                            'There is no deleted product master record to restore.'
                        );
                        return;
                    }
                    this.toast.error
                    (
                        'Restore Failed',
                        'Failed to restore the product master and its auto-generated General Ledgers.'
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
        this.productMasterService
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
                        'Product Master Management History';
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
                        'Failed to load product master history.'
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