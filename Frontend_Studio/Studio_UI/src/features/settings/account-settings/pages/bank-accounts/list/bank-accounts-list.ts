// PAGE-CLONED : Cash Accounts -> Bank Accounts
// PAGE-CLONED : Wings -> Bank Accounts
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
    BankAccount
}
from '../../../models/bank-accounts.model';

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
    BankAccountsService
}
from '../../../services/bank-accounts.service';

import
{
    AccountSubGroupService
}
from '../../../services/account-sub-group.service';


//===============================================================
// List Item
//===============================================================

interface BankAccountListItem
extends BankAccount
{
    AccountSubGroupName:
        string;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'bank-accounts-list',

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

    templateUrl:'./bank-accounts-list.html',

    styleUrl:'./bank-accounts-list.css'
})


//===============================================================
// BankAccounts List
//===============================================================

export class BankAccountsList
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly bankAccountsService =
        inject(BankAccountsService);


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

            label:'All BankAccounts'
        }
    ];


    selectedTab:
        string =
        'all';


    //===========================================================
    // Data
    //===========================================================

    bankAccounts:
        BankAccountListItem[] =
    [];


    filteredBankAccounts:
        BankAccountListItem[] =
    [];


    pagedBankAccounts:
        BankAccountListItem[] =
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
        'BankAccount History';


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
            header:'Bank Account Code',

            field:'BankAccountCode',

            width:'280px',

            align:'center'
        },

        {
            header:'Bank Account Name',

            field:'BankAccountName',

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
    // Normalize BankAccount
    //===========================================================

    private normalizeBankAccount
    (
        item:
            any
    ):
        BankAccountListItem
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
            BankAccountId:
                Number(item?.BankAccountId ?? item?.bankAccountId ?? 0),

            AccountSubGroupsId:
                Number(item?.AccountSubGroupsId ?? item?.accountSubGroupsId ?? 0),

            AccountSubGroupName:
                this.getAccountSubGroupName(Number(item?.AccountSubGroupsId ?? item?.accountSubGroupsId ?? 0)),

            BankAccountCode:
                item?.BankAccountCode ?? item?.bankAccountCode ?? '',

            BankAccountName:
                item?.BankAccountName ?? item?.bankAccountName ?? '',

            Remarks:
                item?.Remarks ?? item?.remarks ?? '',

            IsActive:
                Boolean(item?.IsActive ?? item?.isActive ?? true)
        };
    }


    //===========================================================
    // Normalize BankAccounts
    //===========================================================

    private normalizeBankAccounts
    (
        response:
            any
    ):
        BankAccountListItem[]
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
                this.normalizeBankAccount(
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


                    this.loadBankAccounts();
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
                    // Still Load BankAccounts
                    //===================================================

                    this.loadBankAccounts();
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
    // Load BankAccounts
    //===========================================================

    private loadBankAccounts():
        void
    {
        this.bankAccountsService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        BankAccount[]
                ):
                    void =>
                {
                    console.log
                    (
                        'BankAccount API Response:',
                        response
                    );


                    this.bankAccounts =
                        this.normalizeBankAccounts(
                            response
                        );


                    console.log
                    (
                        'Normalized BankAccounts:',
                        this.bankAccounts
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
                        'Load BankAccounts Error:',
                        error
                    );


                    this.bankAccounts =
                        [];


                    this.filteredBankAccounts =
                        [];


                    this.pagedBankAccounts =
                        [];


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load bankAccounts.'
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


        this.filteredBankAccounts =
            this.bankAccounts.filter
            (
                (
                    item:
                        BankAccountListItem
                ):
                    boolean =>
                {
                    const values:
                        unknown[] =
                    [
                        item.AccountSubGroupName,
                        item.BankAccountCode,
                        item.BankAccountName,
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
        this.filteredBankAccounts =
        [
            ...this.filteredBankAccounts
        ];


        this.filteredBankAccounts.sort
        (
            (
                a:
                    BankAccountListItem,

                b:
                    BankAccountListItem
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof BankAccountListItem
                    ];


                const valueB:
                    any =
                    b[
                        event.field as keyof BankAccountListItem
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


        this.pagedBankAccounts =
        [
            ...this.filteredBankAccounts.slice
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
            BankAccountListItem
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',

                item.BankAccountId
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
            BankAccountListItem
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',

                item.BankAccountId
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
            BankAccountListItem
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete BankAccount',

            `Are you sure you want to delete "${item.BankAccountName}" ?`,

            (): void =>
            {
                this.bankAccountsService
                    .delete
                    (
                        item.BankAccountId
                    )
                    .subscribe
                    ({
                        next:
                        (): void =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',

                                `${item.BankAccountName} deleted successfully.`
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
                                'Delete BankAccount Error:',
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
                                    'BankAccount cannot be deleted because it is already configured.';


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

                                'Failed to delete bankAccount.'
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
            'Restore BankAccount',

            'Are you sure you want to restore the most recently deleted bankAccount?',

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
        this.bankAccountsService
            .restore()
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.toast.success
                    (
                        'Restore Successful',

                        'The most recently deleted bankAccount has been restored.'
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
                        'Restore BankAccount Error',

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

                            'There is no deleted bankAccount record to restore.'
                        );


                        return;
                    }


                    this.toast.error
                    (
                        'Restore Failed',

                        'Failed to restore bankAccount.'
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
        this.bankAccountsService
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
                        'BankAccount Management History';


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

                        'Failed to load bankAccount history.'
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