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

        ToastComponent

    ],

    templateUrl:'./product-category-list.html',

    styleUrl:'./product-category-list.css'

})

//===============================================================
// Product Category List
//===============================================================

export class ProductCategoryList

implements OnInit

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

                    console.log

                    (

                        'Product Category API Response:',

                        response

                    );

                    this.productCategories =

                        this.normalizeProductCategories(

                            response

                        );

                    console.log

                    (

                        'Normalized Product Categories:',

                        this.productCategories

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

                    this.toast.error

                    (

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

                    const categoryCode =

                        item.CategoryCode

                        ??

                        '';

                    const categoryName =

                        item.CategoryName

                        ??

                        '';

                    const inventoryGroupCode =

                        item.InventoryGroupCode

                        ??

                        '';

                    const inventoryGroupName =

                        item.InventoryGroupName

                        ??

                        '';

                    const wipGroupCode =

                        item.WipGroupCode

                        ??

                        '';

                    const wipGroupName =

                        item.WipGroupName

                        ??

                        '';

                    const cogsGroupCode =

                        item.CogsGroupCode

                        ??

                        '';

                    const cogsGroupName =

                        item.CogsGroupName

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

        this.confirmDialog.open

        (

            'Delete Product Category',

            `Deleting "${item.CategoryName}" will also delete its auto-generated Inventory, WIP and COGS Account Groups. Do you want to continue?`,

            ():

                void =>

            {

                this.productCategoryService

                    .delete

                    (

                        item.ProductCategoryId

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

                                `${item.CategoryName} and its auto-generated Account Groups deleted successfully.`

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

                                'Delete Product Category Error:',

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

                                    'Product Category cannot be deleted because it or its auto-generated Account Groups are already configured.';

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

                                'Failed to delete product category and its auto-generated Account Groups.'

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

            'Restore Product Category',

            'Restoring the most recently deleted product category will also restore its auto-generated Inventory, WIP and COGS Account Groups. Do you want to continue?',

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

        this.productCategoryService

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

                        'The Product Category and its auto-generated Account Groups have been restored successfully.'

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

                        'Restore Product Category Error:',

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

                            'There is no deleted product category record to restore.'

                        );

                        return;

                    }

                    this.toast.error

                    (

                        'Restore Failed',

                        'Failed to restore the product category and its auto-generated Account Groups.'

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

                    console.error

                    (

                        'History Load Failed:',

                        error

                    );

                    this.toast.error

                    (

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
