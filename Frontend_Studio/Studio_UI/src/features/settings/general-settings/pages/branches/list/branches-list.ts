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
    Branches
}
from '../../../models/branches.model';

import
{
    Company
}
from '../../../models/company.model';

import
{
    Wing
}
from '../../../models/wings.model';


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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

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
// Services
//===============================================================

import
{
    BranchesService
}
from '../../../services/branches.service';

import
{
    CompanyService
}
from '../../../services/company.service';

import
{
    WingsService
}
from '../../../services/wings.service';


//===============================================================
// List Item
//===============================================================

interface BranchListItem
extends Branches
{
    CompanyName:
        string;

    WingName:
        string;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'branches-list',

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

    templateUrl:'./branches-list.html',

    styleUrl:'./branches-list.css'
})


//===============================================================
// Branches List
//===============================================================

export class BranchesList
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly branchesService =
        inject(BranchesService);

    private readonly companyService =
        inject(CompanyService);

    private readonly wingsService =
        inject(WingsService);

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
            label:'All Branches'
        }
    ];

    selectedTab:
        string =

        'all';


    //===========================================================
    // Data
    //===========================================================

    branches:
        BranchListItem[] =

    [];

    filteredBranches:
        BranchListItem[] =

    [];

    pagedBranches:
        BranchListItem[] =

    [];


    //===========================================================
    // Company Lookup
    //===========================================================

    private companyMap:
        Map<number, string> =

        new Map<number, string>();


    //===========================================================
    // Wing Lookup
    //===========================================================

    private wingMap:
        Map<number, string> =

        new Map<number, string>();


    //===========================================================
    // Wing Filter
    //===========================================================

    wingFilterItems:
        any[] =

    [
        {
            label:'All Wings',
            value:null
        }
    ];

    selectedWingId:
        number | null =

        null;


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

        'Branch History';

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
            header:'Company',
            field:'CompanyName',
            width:'240px',
            align:'left'
        },

        {
            header:'Wing',
            field:'WingName',
            width:'180px',
            align:'left'
        },

        {
            header:'Branch Code',
            field:'BranchCode',
            width:'180px',
            align:'center'
        },

        {
            header:'Branch Name',
            field:'BranchName',
            width:'260px',
            align:'left'
        },

        {
            header:'Short Name',
            field:'ShortName',
            width:'180px',
            align:'left'
        },

        {
            header:'Mobile',
            field:'Mobile',
            width:'160px',
            align:'left'
        },

        {
            header:'Email',
            field:'Email',
            width:'240px',
            align:'left'
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
    // Normalize Branch
    //===========================================================

    private normalizeBranch
    (
        item:
            any
    ):
        BranchListItem
    {
        const companyId:
            number =

            Number(
                item?.CompanyId
                ??
                item?.companyId
                ??
                0
            );

        const wingId:
            number =

            Number(
                item?.WingId
                ??
                item?.wingId
                ??
                0
            );

        return {
            BranchId:
                Number(
                    item?.BranchId
                    ??
                    item?.branchId
                    ??
                    0
                ),

            CompanyId:
                companyId,

            WingId:
                wingId,

            WingName:
                item?.WingName
                ??
                item?.wingName
                ??
                this.getWingName(wingId),

            BranchCode:
                item?.BranchCode
                ??
                item?.branchCode
                ??
                '',

            ShortName:
                item?.ShortName
                ??
                item?.shortName
                ??
                '',

            BranchName:
                item?.BranchName
                ??
                item?.branchName
                ??
                '',

            Mobile:
                item?.Mobile
                ??
                item?.mobile
                ??
                '',

            Email:
                item?.Email
                ??
                item?.email
                ??
                '',

            Address:
                item?.Address
                ??
                item?.address
                ??
                '',

            Remarks:
                item?.Remarks
                ??
                item?.remarks
                ??
                '',

            CompanyName:
                this.getCompanyName(companyId),

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
    // Normalize Branches
    //===========================================================

    private normalizeBranches
    (
        response:
            any
    ):
        BranchListItem[]
    {
        if
        (
            !Array.isArray(response)
        )
        {
            return [];
        }

        return response.map(
            item =>
                this.normalizeBranch(item)
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

        this.companyService
            .getAll()
            .subscribe(
            {
                next:
                (
                    companies:
                        Company[]
                ):
                    void =>
                {
                    this.buildCompanyMap(
                        companies
                    );

                    this.loadWings();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Companies Error:',
                        error
                    );

                    this.companyMap =
                        new Map<number, string>();

                    this.loadWings();
                }
            });
    }


    //===========================================================
    // Load Wings
    //===========================================================

    private loadWings():
        void
    {
        this.wingsService
            .getAll()
            .subscribe(
            {
                next:
                (
                    wings:
                        Wing[]
                ):
                    void =>
                {
                    this.buildWingMap(
                        wings
                    );

                    this.loadBranches();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Wings Error:',
                        error
                    );

                    this.wingMap =
                        new Map<number, string>();

                    this.wingFilterItems =
                    [
                        {
                            label:'All Wings',
                            value:null
                        }
                    ];

                    this.loadBranches();
                }
            });
    }


    //===========================================================
    // Build Company Map
    //===========================================================

    private buildCompanyMap
    (
        companies:
            Company[]
    ):
        void
    {
        this.companyMap =
            new Map<number, string>();

        companies.forEach(
            company =>
            {
                const companyId:
                    number =

                    Number(
                        company.CompanyId
                    );

                const companyName:
                    string =

                    company.CompanyName
                    ??
                    '';

                this.companyMap.set(
                    companyId,
                    companyName
                );
            }
        );
    }


    //===========================================================
    // Build Wing Map
    //===========================================================

    private buildWingMap
    (
        wings:
            Wing[]
    ):
        void
    {
        this.wingMap =
            new Map<number, string>();

        const items:
            any[] =

        [
            {
                label:'All Wings',
                value:null
            }
        ];

        wings.forEach(
            wing =>
            {
                const wingId:
                    number =

                    Number(
                        wing.WingId
                    );

                const wingName:
                    string =

                    wing.WingName
                    ??
                    '';

                this.wingMap.set(
                    wingId,
                    wingName
                );

                items.push(
                {
                    label:
                        wingName,

                    value:
                        wingId
                });
            }
        );

        this.wingFilterItems =
            items;
    }


    //===========================================================
    // Load Branches
    //===========================================================

    private loadBranches():
        void
    {
        this.branchesService
            .getAll()
            .subscribe(
            {
                next:
                (
                    response:
                        Branches[]
                ):
                    void =>
                {
                    this.branches =
                        this.normalizeBranches(
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
                        'Load Branches Error:',
                        error
                    );

                    this.branches = [];

                    this.filteredBranches = [];

                    this.pagedBranches = [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error(
                        'Load Failed',
                        'Unable to load branches.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Get Company Name
    //===========================================================

    getCompanyName
    (
        companyId:
            number
    ):
        string
    {
        return this.companyMap.get(
            Number(companyId)
        )
        ??
        '';
    }


    //===========================================================
    // Get Wing Name
    //===========================================================

    getWingName
    (
        wingId:
            number
    ):
        string
    {
        return this.wingMap.get(
            Number(wingId)
        )
        ??
        '';
    }


    //===========================================================
    // Wing Filter Change
    //===========================================================

    onWingFilterChange
    (
        value:
            any
    ):
        void
    {
        if
        (
            value === null
            ||
            value === undefined
            ||
            value === ''
        )
        {
            this.selectedWingId =
                null;
        }
        else
        {
            this.selectedWingId =
                Number(value);
        }

        this.applyFilters();
    }


    //===========================================================
    // Status Filter Change
    //===========================================================

    onStatusFilterChange
    (
        value:
            any
    ):
        void
    {
        if
        (
            value === null
            ||
            value === undefined
            ||
            value === ''
        )
        {
            this.selectedStatus =
                null;
        }
        else
        {
            this.selectedStatus =
                Boolean(value);
        }

        this.applyFilters();
    }


    //===========================================================
    // Apply Filters
    //===========================================================

    applyFilters():
        void
    {
        const keyword:
            string =

            this.searchText
                .trim()
                .toLowerCase();

        this.filteredBranches =
            this.branches.filter(
            (
                item:
                    BranchListItem
            ):
                boolean =>
            {
                const companyId =
                    String(
                        item.CompanyId
                        ??
                        ''
                    );

                const companyName =
                    item.CompanyName
                    ??
                    '';

                const wingId =
                    String(
                        item.WingId
                        ??
                        ''
                    );

                const wingName =
                    item.WingName
                    ??
                    '';

                const branchCode =
                    item.BranchCode
                    ??
                    '';

                const shortName =
                    item.ShortName
                    ??
                    '';

                const branchName =
                    item.BranchName
                    ??
                    '';

                const mobile =
                    item.Mobile
                    ??
                    '';

                const email =
                    item.Email
                    ??
                    '';

                const address =
                    item.Address
                    ??
                    '';

                const remarks =
                    item.Remarks
                    ??
                    '';

                const status =
                    item.IsActive
                        ?
                        'active'
                        :
                        'inactive';

                const matchesSearch =
                    !keyword
                    ||
                    companyId
                        .toLowerCase()
                        .includes(keyword)
                    ||
                    companyName
                        .toLowerCase()
                        .includes(keyword)
                    ||
                    wingId
                        .toLowerCase()
                        .includes(keyword)
                    ||
                    wingName
                        .toLowerCase()
                        .includes(keyword)
                    ||
                    branchCode
                        .toLowerCase()
                        .includes(keyword)
                    ||
                    shortName
                        .toLowerCase()
                        .includes(keyword)
                    ||
                    branchName
                        .toLowerCase()
                        .includes(keyword)
                    ||
                    mobile
                        .toLowerCase()
                        .includes(keyword)
                    ||
                    email
                        .toLowerCase()
                        .includes(keyword)
                    ||
                    address
                        .toLowerCase()
                        .includes(keyword)
                    ||
                    remarks
                        .toLowerCase()
                        .includes(keyword)
                    ||
                    status.includes(keyword);

                const matchesWing =
                    this.selectedWingId === null
                    ||
                    Number(item.WingId)
                    ===
                    Number(this.selectedWingId);

                const matchesStatus =
                    this.selectedStatus === null
                    ||
                    item.IsActive
                    ===
                    this.selectedStatus;

                return (
                    matchesSearch
                    &&
                    matchesWing
                    &&
                    matchesStatus
                );
            });

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
        this.filteredBranches =
        [
            ...this.filteredBranches
        ];

        this.filteredBranches.sort(
        (
            a:
                BranchListItem,

            b:
                BranchListItem
        ):
            number =>
        {
            const valueA:
                any =
                (a as any)[event.field];

            const valueB:
                any =
                (b as any)[event.field];

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
        });

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

        this.selectedWingId =
            null;

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

        this.pagedBranches =
        [
            ...this.filteredBranches.slice(
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
        void this.router.navigate(
        [
            'add'
        ],
        {
            relativeTo:
                this.route.parent
        });
    }


    //===========================================================
    // View
    //===========================================================

    view
    (
        item:
            BranchListItem
    ):
        void
    {
        void this.router.navigate(
        [
            'view',
            item.BranchId
        ],
        {
            relativeTo:
                this.route.parent
        });
    }


    //===========================================================
    // Edit
    //===========================================================

    edit
    (
        item:
            BranchListItem
    ):
        void
    {
        void this.router.navigate(
        [
            'edit',
            item.BranchId
        ],
        {
            relativeTo:
                this.route.parent
        });
    }


    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        item:
            BranchListItem
    ):
        void
    {
        this.confirmDialog.open(
            'Delete Branch',

            `Are you sure you want to delete "${item.BranchName}" ?`,

            ():
                void =>
            {
                this.branchesService
                    .delete(item.BranchId)
                    .subscribe(
                    {
                        next:
                        ():
                            void =>
                        {
                            this.toast.success(
                                'Delete Successful',

                                `${item.BranchName} deleted successfully.`
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
                            console.error(
                                'Delete Branch Error:',
                                error
                            );

                            if
                            (
                                error instanceof HttpErrorResponse
                                &&
                                error.status === 409
                            )
                            {
                                let message =
                                    'Branch cannot be deleted because it is already configured.';

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

                                this.toast.info(
                                    'Delete Blocked',
                                    message
                                );

                                return;
                            }

                            this.toast.error(
                                'Delete Failed',
                                'Failed to delete branch.'
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
        this.confirmDialog.open(
            'Restore Branch',

            'Are you sure you want to restore the most recently deleted branch?',

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
        this.branchesService
            .restore()
            .subscribe(
            {
                next:
                ():
                    void =>
                {
                    this.toast.success(
                        'Restore Successful',

                        'The most recently deleted branch has been restored.'
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
                    console.error(
                        'Restore Branch Error',
                        error
                    );

                    if
                    (
                        error instanceof HttpErrorResponse
                        &&
                        error.status === 404
                    )
                    {
                        this.toast.info(
                            'No Data to Restore',

                            'There is no deleted branch record to restore.'
                        );

                        return;
                    }

                    this.toast.error(
                        'Restore Failed',

                        'Failed to restore branch.'
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
        this.branchesService
            .getHistory()
            .subscribe(
            {
                next:
                (
                    response:
                        any[]
                ):
                    void =>
                {
                    this.historyItems =
                        response.map(
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
                                    ).toLocaleString(),

                                badge:
                                    history.activityType
                                    ??
                                    history.ActivityType
                            })
                        );

                    this.historyTitle =
                        'Branch Management History';

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

                        'Failed to load branch history.'
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