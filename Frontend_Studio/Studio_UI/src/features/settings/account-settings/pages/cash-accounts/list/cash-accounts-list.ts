// PAGE-CLONED : Wings -> Cash Accounts
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
    CashAccount
}
from '../../../models/cash-accounts.model';

import
{
    AccountSubGroup
}
from '../../../models/account-sub-group.model';


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
    CashAccountsService
}
from '../../../services/cash-accounts.service';

import
{
    AccountSubGroupService
}
from '../../../services/account-sub-group.service';


//===============================================================
// List Item
//===============================================================

interface CashAccountListItem
extends CashAccount
{
    AccountSubGroupName:
        string;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'cash-accounts-list',

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

        ToastComponent
    ],

    templateUrl:'./cash-accounts-list.html',

    styleUrl:'./cash-accounts-list.css'
})


//===============================================================
// CashAccounts List
//===============================================================

export class CashAccountsList
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly cashAccountsService =
        inject(CashAccountsService);


    private readonly accountSubGroupService =
        inject(AccountSubGroupService);


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

            label:'All CashAccounts'
        }
    ];


    selectedTab:
        string =
        'all';


    //===========================================================
    // Data
    //===========================================================

    cashAccounts:
        CashAccountListItem[] =
    [];


    filteredCashAccounts:
        CashAccountListItem[] =
    [];


    pagedCashAccounts:
        CashAccountListItem[] =
    [];


    //===========================================================
    // AccountSubGroup Lookup
    //===========================================================

    private accountSubGroupMap:
        Map<number, string> =
        new Map<number, string>();


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
        'CashAccount History';


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
            header:'Account Sub Group',

            field:'AccountSubGroupName',

            width:'280px',

            align:'left'
        },

        {
            header:'Cash Account Code',

            field:'CashAccountCode',

            width:'280px',

            align:'center'
        },

        {
            header:'Cash Account Name',

            field:'CashAccountName',

            align:'left'
        },

        {
            header:'Remarks',

            field:'Remarks',

            width:'350px',

            align:'left'
        },

        {
            header:'Is Active',

            field:'IsActive',

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
    // Normalize CashAccount
    //===========================================================

    private normalizeCashAccount
    (
        item:
            any
    ):
        CashAccountListItem
    {
        const accountSubGroupsId:
            number =
            Number
            (
                item?.AccountSubGroupsId
                ??
                item?.accountSubGroupsId
                ??
                0
            );


        return {
            CashAccountId:
                Number(item?.CashAccountId ?? item?.cashAccountId ?? 0),

            AccountSubGroupsId:
                Number(item?.AccountSubGroupsId ?? item?.accountSubGroupsId ?? 0),

            AccountSubGroupName:
                this.getAccountSubGroupName(Number(item?.AccountSubGroupsId ?? item?.accountSubGroupsId ?? 0)),

            CashAccountCode:
                item?.CashAccountCode ?? item?.cashAccountCode ?? '',

            CashAccountName:
                item?.CashAccountName ?? item?.cashAccountName ?? '',

            Remarks:
                item?.Remarks ?? item?.remarks ?? '',

            IsActive:
                Boolean(item?.IsActive ?? item?.isActive ?? true)
        };
    }


    //===========================================================
    // Normalize CashAccounts
    //===========================================================

    private normalizeCashAccounts
    (
        response:
            any
    ):
        CashAccountListItem[]
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
                this.normalizeCashAccount(
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


        //=======================================================
        // Load Companies
        //=======================================================

        this.accountSubGroupService
            .getAll()
            .subscribe
            ({
                next:
                (
                    companies:
                        AccountSubGroup[]
                ):
                    void =>
                {
                    this.buildAccountSubGroupMap(
                        companies
                    );


                    this.loadCashAccounts();
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
                        'Load Companies Error:',
                        error
                    );


                    this.accountSubGroupMap =
                        new Map<number, string>();


                    //===================================================
                    // Still Load CashAccounts
                    //===================================================

                    this.loadCashAccounts();
                }
            });
    }


    //===========================================================
    // Build AccountSubGroup Map
    //===========================================================

    private buildAccountSubGroupMap
    (
        companies:
            AccountSubGroup[]
    ):
        void
    {
        this.accountSubGroupMap =
            new Map<number, string>();


        companies.forEach
        (
            accountSubGroup =>
            {
                const accountSubGroupsId:
                    number =
                    Number(
                        accountSubGroup.AccountSubGroupId
                    );


                const accountSubGroupName:
                    string =
                    accountSubGroup.SubGroupName
                    ??
                    '';


                //=======================================================
                // Display AccountSubGroup Name Only
                //=======================================================

                const displayName:
                    string =
                    accountSubGroupName
                    ||
                    String(accountSubGroupsId);


                this.accountSubGroupMap.set
                (
                    accountSubGroupsId,

                    displayName
                );
            }
        );
    }


    //===========================================================
    // Load CashAccounts
    //===========================================================

    private loadCashAccounts():
        void
    {
        this.cashAccountsService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        CashAccount[]
                ):
                    void =>
                {
                    console.log
                    (
                        'CashAccount API Response:',
                        response
                    );


                    this.cashAccounts =
                        this.normalizeCashAccounts(
                            response
                        );


                    console.log
                    (
                        'Normalized CashAccounts:',
                        this.cashAccounts
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
                        'Load CashAccounts Error:',
                        error
                    );


                    this.cashAccounts =
                        [];


                    this.filteredCashAccounts =
                        [];


                    this.pagedCashAccounts =
                        [];


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load cashAccounts.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Get AccountSubGroup Name
    //===========================================================

    getAccountSubGroupName
    (
        accountSubGroupsId:
            number
    ):
        string
    {
        return this.accountSubGroupMap.get(
            Number(accountSubGroupsId)
        )
        ??
        '';
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


        this.filteredCashAccounts =
            this.cashAccounts.filter
            (
                (
                    item:
                        CashAccountListItem
                ):
                    boolean =>
                {
                    const values:
                        unknown[] =
                    [
                        item.AccountSubGroupName,
                        item.CashAccountCode,
                        item.CashAccountName,
                        item.Remarks
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
        this.filteredCashAccounts =
        [
            ...this.filteredCashAccounts
        ];


        this.filteredCashAccounts.sort
        (
            (
                a:
                    CashAccountListItem,

                b:
                    CashAccountListItem
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof CashAccountListItem
                    ];


                const valueB:
                    any =
                    b[
                        event.field as keyof CashAccountListItem
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


        this.pagedCashAccounts =
        [
            ...this.filteredCashAccounts.slice
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
            CashAccountListItem
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',

                item.CashAccountId
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
            CashAccountListItem
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',

                item.CashAccountId
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
            CashAccountListItem
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete CashAccount',

            `Are you sure you want to delete "${item.CashAccountName}" ?`,

            (): void =>
            {
                this.cashAccountsService
                    .delete
                    (
                        item.CashAccountId
                    )
                    .subscribe
                    ({
                        next:
                        (): void =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',

                                `${item.CashAccountName} deleted successfully.`
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
                                'Delete CashAccount Error:',
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
                                    'CashAccount cannot be deleted because it is already configured.';


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

                                'Failed to delete cashAccount.'
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
            'Restore CashAccount',

            'Are you sure you want to restore the most recently deleted cashAccount?',

            (): void =>
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
        this.cashAccountsService
            .restore()
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.toast.success
                    (
                        'Restore Successful',

                        'The most recently deleted cashAccount has been restored.'
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
                        'Restore CashAccount Error',

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

                            'There is no deleted cashAccount record to restore.'
                        );


                        return;
                    }


                    this.toast.error
                    (
                        'Restore Failed',

                        'Failed to restore cashAccount.'
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
        this.cashAccountsService
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
                        'CashAccount Management History';


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

                        'Failed to load cashAccount history.'
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