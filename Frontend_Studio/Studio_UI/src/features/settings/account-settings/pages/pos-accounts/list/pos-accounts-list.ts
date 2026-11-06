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
    POSAccount
}
from '../../../models/pos-accounts.model';

import
{
    BankAccountsService
}
from '../../../services/bank-accounts.service';

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
    POSAccountsService
}
from '../../../services/pos-accounts.service';

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

interface POSAccountListItem
extends POSAccount
{
    // Display name of the linked bank account (saved by code)
    LinkedBankAccountName:
        string;

    AccountSubGroupName:
        string;

    CollectionAccountText:
        string;

    PaymentAccountText:
        string;

    BranchExclusiveText:
        string;
}

//===============================================================
// Case-Insensitive Field Reader
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
    selector:'pos-accounts-list',

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

    templateUrl:'./pos-accounts-list.html',

    styleUrl:'./pos-accounts-list.css'
})

//===============================================================
// POS Accounts List
//===============================================================

export class PosAccountsList
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly posAccountsService =
        inject(POSAccountsService);

    // Linked Bank Account is saved as the bank account CODE; the
    // list shows its display name
    private readonly bankAccountsService =
        inject(BankAccountsService);

    private bankAccountNames:
        Map<string, string> =
        new Map<string, string>();

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
            label:'All POS Accounts'
        }
    ];

    selectedTab:
        string =
        'all';

    //===========================================================
    // Data
    //===========================================================

    posAccounts:
        POSAccountListItem[] =
        [];

    // Summary line below the canvas (all records)
    summaryItems:
        {
            label:string;
            value:string;
            tone:'' | 'ok' | 'bad';
        }[] =
    [];

    filteredPOSAccounts:
        POSAccountListItem[] =
        [];

    pagedPOSAccounts:
        POSAccountListItem[] =
        [];


    // Server paging
    totalRecords:
        number =
        0;

    // Total · Active · Inactive (search and filters applied)
    private counts:
        Record<string, number> =
        {};

    private sortField:
        string =
        '';

    private sortDirection:
        'asc' | 'desc' =
        'asc';

    private searchTimer:
        ReturnType<typeof setTimeout> | null =
        null;

    // Answers of older calls are dropped
    private loadSeq:
        number =
        0;

    //===========================================================
    // Account Sub Group Lookup (Id → "Code - Name")
    //===========================================================

    private accountSubGroupMap:
        Map<number, string> =
        new Map<number, string>();

    //===========================================================
    // Branch Filter
    //
    // Value = Branch Name (POS Accounts store the branch by name)
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
        'POS Account History';

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
            header:'POS Account Code',
            field:'POSAccountCode',
            width:'220px',
            align:'center'
        },
        {
            header:'POS Account Name',
            field:'POSAccountName',
            width:'220px',
            align:'left'
        },
        {
            header:'Linked Bank Account',
            field:'LinkedBankAccountName',
            width:'280px',
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
            header:'Br. Exclusive',
            field:'BranchExclusiveText',
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
    // To List Item
    //
    // The service already normalizes the API response into
    // POSAccount; this only adds the display-only columns.
    //===========================================================

    private toListItem
    (
        item:
            POSAccount
    ):
        POSAccountListItem
    {
        const linked =
            String(item.LinkedBankAccount ?? '').trim();

        return {
            ...item,

            // By code; a row saved earlier by name shows as it is
            LinkedBankAccountName:
                this.bankAccountNames.get(linked) || linked,

            AccountSubGroupName:
                this.getAccountSubGroupName(
                    item.AccountSubGroupsId
                ),

            CollectionAccountText:
                this.toYesNo(
                    item.CollectionAccount
                ),

            PaymentAccountText:
                this.toYesNo(
                    item.PaymentAccount
                ),

            BranchExclusiveText:
                this.toYesNo(
                    item.BranchExclusive
                )
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
    // Branches used by POS accounts but now inactive / missing
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
            of this.posAccounts
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
        const seq =
            ++this.loadSeq;

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

            bankAccounts:
                this.bankAccountsService
                    .getAll()
                    .pipe
                    (
                        catchError
                        (
                            error =>
                            {
                                console.error(
                                    'Load Bank Accounts Error:',
                                    error
                                );

                                return of([]);
                            }
                        )
                    ),

            accounts:
                this.posAccountsService.getPaged(this.pageQuery())
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
                    bankAccounts:
                        any;
                    accounts:
                        any;
                }
            ):
                void =>
            {
                if (seq !== this.loadSeq)
                {
                    return;
                }

                this.bankAccountNames =
                    new Map<string, string>(
                        (Array.isArray(result.bankAccounts) ? result.bankAccounts : [])
                            .map
                            (
                                (bank: any): [string, string] =>
                                [
                                    String(readField(bank, 'BankAccountCode') ?? '').trim(),
                                    String(readField(bank, 'DisplayName') ?? '').trim()
                                ]
                            )
                            .filter(([code]) => !!code)
                    );

                this.buildAccountSubGroupMap(
                    result.subGroups
                );

                this.posAccounts =
                    this.takeServerPage(result.accounts).map
                    (
                        item =>
                            this.toListItem(
                                item
                            )
                    );

                this.buildBranchFilterItems(
                    result.branches
                );

                this.showServerPage();


                this.updateSummary();

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
                if (seq !== this.loadSeq)
                {
                    return;
                }

                console.error(
                    'Load POS Accounts Error:',
                    error
                );

                this.posAccounts =
                    [];

                this.filteredPOSAccounts =
                    [];

                this.pagedPOSAccounts =
                    [];

                this.loading =
                    false;

                this.loadFailed =
                    true;

                this.toast.error(
                    'Load Failed',
                    'Unable to load POS accounts.'
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
        // Search, filters and paging run on the server
        this.currentPage =
            1;

        this.loadItems();
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

        if (this.searchTimer)
        {
            clearTimeout(this.searchTimer);
        }

        this.searchTimer =
            setTimeout(
                (): void =>
                {
                    this.searchTimer = null;

                    this.applyFilters();
                },
                300
            );
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
        // The server sorts the whole list
        this.sortField =
            event.field;

        this.sortDirection =
            event.direction === 'desc'
                ? 'desc'
                : 'asc';

        this.currentPage =
            1;

        this.loadItems();
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
        // The server sends one page
        this.pagedPOSAccounts =
        [
            ...this.filteredPOSAccounts
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

        this.loadItems();
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

        this.loadItems();
    }

    //===========================================================
    // Resolve Row Id
    //===========================================================

    private getRowId
    (
        item:
            any
    ):
        string
    {
        const id =
            String(
                item?.PublicId
                ??
                item?.publicId
                ??
                ''
            ).trim();

        if
        (
            !id
        )
        {
            console.error(
                '[POS Accounts] Row has no id. Row fields:',
                item ? Object.keys(item) : item
            );

            this.toast.error(
                'Missing Id',
                'This POS account has no id from the server, so it cannot be opened.'
            );

            return '';
        }

        return id;
    }

    //===========================================================
    // Navigate
    //===========================================================

    private navigateTo
    (
        action:
            'add' | 'view' | 'edit',
        id?:
            string
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
            POSAccountListItem
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

        const id =
            this.getRowId(
                item
            );

        if
        (
            !!id
        )
        {
            this.navigateTo(
                'view',
                id
            );
        }
    }

    //===========================================================
    // Edit
    //===========================================================

    edit
    (
        item:
            POSAccountListItem
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

        const id =
            this.getRowId(
                item
            );

        if
        (
            !!id
        )
        {
            this.navigateTo(
                'edit',
                id
            );
        }
    }

    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        item:
            POSAccountListItem
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

        const id =
            this.getRowId(
                item
            );

        if
        (
            !id
        )
        {
            return;
        }

        const name =
            item.POSAccountName
            ||
            item.POSAccountCode
            ||
            'this POS account';

        this.confirmDialog.open
        (
            'Delete POS Account',
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
                            id,
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
            string,
        name:
            string
    ):
        void
    {
        this.startProgress(
            'Deleting POS Account',
            `Please wait while "${name}" is being deleted...`
        );

        this.withMinimumDuration(
            this.posAccountsService.delete(
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
                    'POS account deleted.',
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
                    'Delete POS Account Error:',
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
                                    'POS account cannot be deleted because it is already in use.'
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
                                'This POS account no longer exists. The list has been refreshed.'
                            );

                            this.loadItems();

                            return;
                        }

                        //=======================================
                        // Delete Failed
                        //=======================================

                        this.toast.error(
                            'Delete Failed',
                            'Failed to delete POS account.'
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
            'Restore POS Account',
            'Are you sure you want to restore the most recently deleted POS account?',
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
            'Restoring POS Account',
            'Please wait while the most recently deleted POS account is being restored...'
        );

        this.withMinimumDuration(
            this.posAccountsService.restore()
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'POS account restored.',
                    () =>
                    {
                        this.toast.success(
                            'Restore Successful',
                            'The most recently deleted POS account has been restored.'
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
                    'Restore POS Account Error',
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
                                'There is no deleted POS account record to restore.'
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
                                    'The POS account cannot be restored.'
                                )
                            );

                            return;
                        }

                        this.toast.error(
                            'Restore Failed',
                            'Failed to restore POS account.'
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
        this.posAccountsService
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
                        'POS Account Management History';

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
                        'Failed to load POS account history.'
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

    //===========================================================
    // Summary Line (below the canvas) : Total / Active / Inactive
    // of all records
    //===========================================================

    private updateSummary():
        void
    {
        // Counts from the server : search and filters applied,
        // the status filter not
        const count =
            (key: string): number =>
                Number(this.counts[key] ?? 0);

        const text =
            (value: number): string =>
                value.toLocaleString('en-US');

        this.summaryItems =
        [
            { label:'Total',    value:text(count('Total')),    tone:'' },
            { label:'Active',   value:text(count('Active')),   tone:'ok' },
            { label:'Inactive', value:text(count('Inactive')), tone:'bad' }
        ];
    }



    //===========================================================
    // Server Paging Helpers
    //===========================================================

    private pageQuery():
        Record<string, unknown>
    {
        return {
            page:this.currentPage,
            pageSize:this.pageSize,
            search:this.searchText,
            sort:this.sortField,
            dir:this.sortDirection,
            status:this.selectedStatus === null ? '' : (this.selectedStatus ? 'active' : 'inactive'),
            branch:this.selectedBranch ?? undefined
        };
    }


    // The rows of the page arrive already filtered and sorted
    private showServerPage():
        void
    {
        this.filteredPOSAccounts =
            this.posAccounts;

        this.updatePagination();
    }


    // A server page : keep the totals, give back the rows
    private takeServerPage
    (
        page:
            any
    ):
        any[]
    {
        this.totalRecords =
            Number(page?.totalCount ?? 0);

        this.counts =
            page?.counts ?? {};

        if (Number(page?.page) > 0)
        {
            this.currentPage =
                Number(page.page);
        }

        return Array.isArray(page?.items)
            ? page.items
            : [];
    }
}
