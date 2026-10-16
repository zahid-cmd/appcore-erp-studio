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
    CashAccount
}
from '../../../models/cash-accounts.model';

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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

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

import
{
    BranchesService
}
from '../../../../general-settings/services/branches.service';

//===============================================================
// List Item
//===============================================================

interface CashAccountListItem
extends CashAccount
{
    AccountSubGroupName:
        string;

    CollectionAccountText:
        string;

    PaymentAccountText:
        string;
}

//===============================================================
// Case-Insensitive Field Reader
//
// ASP.NET Core camel-cases JSON names ("CashAccountCode" →
// "cashAccountCode"). This reads a field regardless of casing.
//===============================================================

function readField
(
    item:
        any,
    name:
        string
):
    any
{
    if
    (
        item == null
        ||
        typeof item !== 'object'
    )
    {
        return undefined;
    }

    if
    (
        name in item
    )
    {
        return item[name];
    }

    const target =
        name.toLowerCase();

    const key =
        Object.keys(item).find
        (
            k =>
                k.toLowerCase() ===
                target
        );

    return key !== undefined
        ? item[key]
        : undefined;
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
        SearchDropdownComponent,
        CommandCenterComponent,
        PageCanvasComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        ToastComponent
    ],

    templateUrl:'./cash-accounts-list.html',

    styleUrl:'./cash-accounts-list.css'
})

//===============================================================
// Cash Accounts List
//===============================================================

export class CashAccountsList
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly cashAccountsService =
        inject(CashAccountsService);

    private readonly accountSubGroupService =
        inject(AccountSubGroupService);

    private readonly branchesService =
        inject(BranchesService);

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
    // Progress Configuration
    //===========================================================

    private readonly MIN_PROGRESS_MS:
        number =
        3000;

    private readonly PROGRESS_TICK_MS:
        number =
        100;

    private readonly PROGRESS_CEILING:
        number =
        90;

    private readonly PROGRESS_COMPLETE_HOLD_MS:
        number =
        600;

    private readonly CONFIRM_CLOSE_DELAY_MS:
        number =
        150;

    private progressTimer?:
        number;

    private progressValue:
        number =
        0;

    // Prevents a second Delete / Restore while one is running
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
            label:'All Cash Accounts'
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
    // Account Sub Group Lookup (Id → "Code - Name")
    //===========================================================

    private accountSubGroupMap:
        Map<number, string> =
        new Map<number, string>();

    //===========================================================
    // Branch Filter
    //
    // Value = Branch Name (Cash Accounts store the branch by name)
    //===========================================================

    branchFilterItems:
        any[] =
    [
        { label:'All Branches', value:null }
    ];

    selectedBranch:
        string | null =
        null;

    //===========================================================
    // Status Filter
    //===========================================================

    statusFilterItems:
        any[] =
    [
        { label:'All Status', value:null },
        { label:'Active', value:true },
        { label:'Inactive', value:false }
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
        'Cash Account History';

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
            width:'60px',
            align:'center'
        },
        {
            header:'Cash Account Code',
            field:'CashAccountCode',
            width:'220px',
            align:'center'
        },
        {
            header:'Cash Account Name',
            field:'CashAccountName',
            width:'220px',
            align:'left'
        },
        {
            header:'Display Name',
            field:'DisplayName',
            width:'260px',
            align:'left'
        },
        {
            header:'Branch',
            field:'Branch',
            width:'200px',
            align:'left'
        },
        {
            header:'Collection',
            field:'CollectionAccountText',
            width:'120px',
            align:'center'
        },
        {
            header:'Payment',
            field:'PaymentAccountText',
            width:'120px',
            align:'center'
        },
        {
            header:'Status',
            field:'Status',
            type:'status',
            width:'120px',
            align:'center'
        },
        {
            header:'Actions',
            field:'actions',
            type:'actions',
            width:'120px',
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
    // Field Helpers
    //===========================================================

    private text
    (
        item:
            any,
        name:
            string
    ):
        string
    {
        return String(
            readField(item, name)
            ??
            ''
        ).trim();
    }

    private bool
    (
        item:
            any,
        name:
            string,
        fallback:
            boolean
    ):
        boolean
    {
        const value =
            readField(item, name);

        return value == null
            ? fallback
            : Boolean(value);
    }

    private num
    (
        item:
            any,
        name:
            string
    ):
        number
    {
        const value =
            Number(
                readField(item, name)
                ??
                0
            );

        return Number.isFinite(value)
            ? value
            : 0;
    }

    private toYesNo
    (
        value:
            boolean
    ):
        string
    {
        return value
            ? 'Yes'
            : 'No';
    }

    private normalizeKey
    (
        value:
            string | null | undefined
    ):
        string
    {
        return (value ?? '')
            .trim()
            .toUpperCase();
    }

    //===========================================================
    // Normalize Cash Account
    //===========================================================

    private normalizeCashAccount
    (
        item:
            any
    ):
        CashAccountListItem
    {
        const accountSubGroupsId =
            this.num(item, 'AccountSubGroupsId');

        const collectionAccount =
            this.bool(item, 'CollectionAccount', false);

        const paymentAccount =
            this.bool(item, 'PaymentAccount', false);

        return {
            CashAccountId:
                this.num(item, 'CashAccountId'),

            AccountSubGroupsId:
                accountSubGroupsId,

            AccountSubGroupName:
                this.getAccountSubGroupName(
                    accountSubGroupsId
                ),

            CashAccountCode:
                this.text(item, 'CashAccountCode'),

            CashAccountName:
                this.text(item, 'CashAccountName'),

            Remarks:
                this.text(item, 'Remarks'),

            Status:
                this.bool(item, 'Status', true),

            Branch:
                this.text(item, 'Branch'),

            DisplayName:
                this.text(item, 'DisplayName'),

            CollectionAccount:
                collectionAccount,

            PaymentAccount:
                paymentAccount,

            CollectionAccountText:
                this.toYesNo(collectionAccount),

            PaymentAccountText:
                this.toYesNo(paymentAccount)
        };
    }

    //===========================================================
    // Build Account Sub Group Map
    //===========================================================

    private buildAccountSubGroupMap
    (
        response:
            any
    ):
        void
    {
        this.accountSubGroupMap =
            new Map<number, string>();

        if
        (
            !Array.isArray(response)
        )
        {
            return;
        }

        for
        (
            const subGroup
            of response
        )
        {
            const id =
                this.num(subGroup, 'AccountSubGroupId');

            const code =
                this.text(subGroup, 'SubGroupCode');

            const name =
                this.text(subGroup, 'SubGroupName');

            if
            (
                id > 0
            )
            {
                this.accountSubGroupMap.set(
                    id,
                    [code, name]
                        .filter(part => !!part)
                        .join(' - ')
                    ||
                    String(id)
                );
            }
        }
    }

    //===========================================================
    // Build Branch Filter Items
    //
    // All Branches + active branches (Code - Name).
    // Branches used by cash accounts but now inactive / missing
    // are added too, so every row stays filterable.
    //===========================================================

    private buildBranchFilterItems
    (
        response:
            any
    ):
        void
    {
        const list:
            any[] =
            Array.isArray(response)
                ? response
                : [];

        const items:
            any[] =
            list
                .filter
                (
                    branch =>
                        !!this.text(branch, 'BranchName')
                        &&
                        readField(branch, 'IsActive') !== false
                )
                .sort
                (
                    (a, b) =>
                        this.text(a, 'BranchCode').localeCompare(
                            this.text(b, 'BranchCode')
                        )
                )
                .map
                (
                    branch =>
                    {
                        const code =
                            this.text(branch, 'BranchCode');

                        const name =
                            this.text(branch, 'BranchName');

                        return {
                            label:
                                code
                                    ? `${code} - ${name}`
                                    : name,
                            value:
                                name
                        };
                    }
                );

        const known =
            new Set<string>(
                items.map
                (
                    item =>
                        this.normalizeKey(item.value)
                )
            );

        for
        (
            const account
            of this.cashAccounts
        )
        {
            const key =
                this.normalizeKey(
                    account.Branch
                );

            if
            (
                key
                &&
                !known.has(key)
            )
            {
                known.add(key);

                items.push
                ({
                    label:
                        account.Branch,
                    value:
                        account.Branch
                });
            }
        }

        this.branchFilterItems =
        [
            { label:'All Branches', value:null },
            ...items
        ];

        // Keep the selection only if it still exists
        if
        (
            this.selectedBranch
            &&
            !known.has(
                this.normalizeKey(
                    this.selectedBranch
                )
            )
        )
        {
            this.selectedBranch =
                null;
        }
    }

    //===========================================================
    // Get Account Sub Group Name
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
    // Load Items
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        forkJoin
        ({
            subGroups:
                this.accountSubGroupService
                    .getAll()
                    .pipe
                    (
                        catchError
                        (
                            error =>
                            {
                                console.error(
                                    'Load Account Sub Groups Error:',
                                    error
                                );

                                return of([]);
                            }
                        )
                    ),

            branches:
                this.branchesService
                    .getAll()
                    .pipe
                    (
                        catchError
                        (
                            error =>
                            {
                                console.error(
                                    'Load Branches Error:',
                                    error
                                );

                                return of([]);
                            }
                        )
                    ),

            accounts:
                this.cashAccountsService.getAll()
        })
        .subscribe
        ({
            next:
            (
                result:
                {
                    subGroups:
                        any;
                    branches:
                        any;
                    accounts:
                        any;
                }
            ):
                void =>
            {
                this.buildAccountSubGroupMap(
                    result.subGroups
                );

                const list:
                    any[] =
                    Array.isArray(result.accounts)
                        ? result.accounts
                        : [];

                this.cashAccounts =
                    list.map
                    (
                        item =>
                            this.normalizeCashAccount(
                                item
                            )
                    );

                this.buildBranchFilterItems(
                    result.branches
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
                    'Load Cash Accounts Error:',
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

                this.toast.error(
                    'Load Failed',
                    'Unable to load cash accounts.'
                );

                this.cdr.detectChanges();
            }
        });
    }

    //===========================================================
    // Branch Filter Change
    //===========================================================

    onBranchFilterChange
    (
        value:
            string | null
    ):
        void
    {
        this.selectedBranch =
            value
            ||
            null;

        this.applyFilters();
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
    // Apply Filters (Branch + Status + Search)
    //===========================================================

    applyFilters():
        void
    {
        const keyword:
            string =
            this.searchText
                .trim()
                .toLowerCase();

        const branchKey:
            string =
            this.normalizeKey(
                this.selectedBranch
            );

        this.filteredCashAccounts =
            this.cashAccounts.filter
            (
                (
                    item:
                        CashAccountListItem
                ):
                    boolean =>
                {
                    //===============================================
                    // Branch
                    //===============================================

                    if
                    (
                        branchKey
                        &&
                        this.normalizeKey(item.Branch) !==
                        branchKey
                    )
                    {
                        return false;
                    }

                    //===============================================
                    // Status
                    //===============================================

                    if
                    (
                        this.selectedStatus !== null
                        &&
                        item.Status !==
                        this.selectedStatus
                    )
                    {
                        return false;
                    }

                    //===============================================
                    // Search
                    //===============================================

                    if
                    (
                        !keyword
                    )
                    {
                        return true;
                    }

                    const values:
                        unknown[] =
                    [
                        item.AccountSubGroupName,
                        item.CashAccountCode,
                        item.CashAccountName,
                        item.Branch,
                        item.DisplayName,
                        item.CollectionAccountText,
                        item.PaymentAccountText,
                        item.Remarks,
                        item.Status ? 'active' : 'inactive'
                    ];

                    return values.some
                    (
                        value =>
                            String(value ?? '')
                                .toLowerCase()
                                .includes(keyword)
                    );
                }
            );

        this.currentPage =
            1;

        this.updatePagination();

        this.cdr.detectChanges();
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

        this.selectedBranch =
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
    // Navigate
    //===========================================================

    private navigateTo
    (
        action:
            'add' | 'view' | 'edit',
        id?:
            number
    ):
        void
    {
        const commands:
            any[] =
            id
                ? [action, id]
                : [action];

        void this.router.navigate
        (
            commands,
            {
                relativeTo:
                    this.route.parent
                    ??
                    this.route
            }
        );
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

        this.navigateTo(
            'add'
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
        if
        (
            this.isProcessing
            ||
            !item?.CashAccountId
        )
        {
            return;
        }

        this.navigateTo(
            'view',
            item.CashAccountId
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
        if
        (
            this.isProcessing
            ||
            !item?.CashAccountId
        )
        {
            return;
        }

        this.navigateTo(
            'edit',
            item.CashAccountId
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
        if
        (
            this.isProcessing
            ||
            !item?.CashAccountId
        )
        {
            return;
        }

        const name =
            item.DisplayName
            ||
            item.CashAccountName
            ||
            item.CashAccountCode
            ||
            'this cash account';

        this.confirmDialog.open
        (
            'Delete Cash Account',
            `Are you sure you want to delete "${name}"?`,
            ():
                void =>
            {
                // Let the confirm dialog close first,
                // so it cannot hide the progress dialog.
                setTimeout
                (
                    () =>
                        this.deleteItem(
                            item.CashAccountId,
                            name
                        ),
                    this.CONFIRM_CLOSE_DELAY_MS
                );
            }
        );
    }

    //===========================================================
    // Delete Item
    //===========================================================

    private deleteItem
    (
        id:
            number,
        name:
            string
    ):
        void
    {
        this.startProgress(
            'Deleting Cash Account',
            `Please wait while "${name}" is being deleted...`
        );

        this.withMinimumDuration(
            this.cashAccountsService.delete(
                id
            )
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Cash account deleted.',
                    () =>
                    {
                        this.toast.success(
                            'Delete Successful',
                            `${name} deleted successfully.`
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
                    'Delete Cash Account Error:',
                    error
                );

                this.failProgress(
                    () =>
                    {
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
                                    'Cash account cannot be deleted because it is already in use.'
                                )
                            );

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
                                'This cash account no longer exists. The list has been refreshed.'
                            );

                            this.loadItems();

                            return;
                        }

                        //=======================================
                        // Delete Failed
                        //=======================================

                        this.toast.error(
                            'Delete Failed',
                            'Failed to delete cash account.'
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
            'Restore Cash Account',
            'Are you sure you want to restore the most recently deleted cash account?',
            ():
                void =>
            {
                setTimeout
                (
                    () =>
                        this.restoreItem(),
                    this.CONFIRM_CLOSE_DELAY_MS
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
            'Restoring Cash Account',
            'Please wait while the most recently deleted cash account is being restored...'
        );

        this.withMinimumDuration(
            this.cashAccountsService.restore()
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Cash account restored.',
                    () =>
                    {
                        this.toast.success(
                            'Restore Successful',
                            'The most recently deleted cash account has been restored.'
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
                    'Restore Cash Account Error',
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
                            this.toast.info(
                                'No Data to Restore',
                                'There is no deleted cash account record to restore.'
                            );

                            return;
                        }

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
                                    'The cash account cannot be restored.'
                                )
                            );

                            return;
                        }

                        this.toast.error(
                            'Restore Failed',
                            'Failed to restore cash account.'
                        );
                    }
                );
            }
        });
    }

    //===========================================================
    // Progress Dialog (Animated)
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
    // Extract Error Message
    //===========================================================

    private extractErrorMessage
    (
        error:
            HttpErrorResponse,
        fallback:
            string
    ):
        string
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

        return fallback;
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
                        (response ?? []).map
                        (
                            history =>
                            ({
                                title:
                                    readField(history, 'ActivityTitle'),

                                description:
                                    readField(history, 'ActivityDescription'),

                                user:
                                    readField(history, 'PerformedByName')
                                    ??
                                    'System',

                                dateTime:
                                    new Date(
                                        readField(history, 'PerformedDate')
                                    )
                                    .toLocaleString(),

                                badge:
                                    readField(history, 'ActivityType')
                            })
                        );

                    this.historyTitle =
                        'Cash Account Management History';

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
                        'Failed to load cash account history.'
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