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
    AccountSubGroup
}
from '../../../models/account-sub-group.model';
import
{
    AccountClass
}
from '../../../models/account-class.model';
import
{
    AccountGroup
}
from '../../../models/account-group.model';
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
import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';
//===============================================================
// Service
//===============================================================
import
{
    AccountSubGroupService
}
from '../../../services/account-sub-group.service';
import
{
    AccountClassService
}
from '../../../services/account-class.service';
import
{
    AccountGroupService
}
from '../../../services/account-group.service';
//===============================================================
// Component
//===============================================================
@Component(
{
    selector:'account-sub-group-list',
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
        SearchDropdownComponent,
        ToastComponent
    ],
    templateUrl:'./account-sub-group-list.html',
    styleUrl:'./account-sub-group-list.css'
})
//===============================================================
// Account Sub Group List
//===============================================================
export class AccountSubGroupList
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================
    private readonly accountSubGroupService =
        inject(AccountSubGroupService);
    private readonly accountClassService =
        inject(AccountClassService);
    private readonly accountGroupService =
        inject(AccountGroupService);
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
            label:'All Account Sub Groups'
        },
        {
            id:'inventory-auto',
            label:'Inventory Auto Sub Groups'
        }
    ];
    selectedTab:
        string =
        'all';
    //===========================================================
    // Data
    //===========================================================
    accountSubGroups:
        AccountSubGroup[] =
    [];
    filteredAccountSubGroups:
        AccountSubGroup[] =
    [];
    pagedAccountSubGroups:
        AccountSubGroup[] =
    [];
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
    accountClassFilterItems:
        any[] =
    [
        {
            label:'All Account Classes',
            value:null
        }
    ];
    selectedAccountClassId:
        number | null =
        null;
    accountGroupFilterItems:
        any[] =
    [
        {
            label:'All Account Groups',
            value:null
        }
    ];
    selectedAccountGroupId:
        number | null =
        null;
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
        'Account Sub Group History';
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
            header:'Account Class',
            field:'AccountClassName',
            width:'180px',
            align:'left'
        },
        {
            header:'Group Code',
            field:'GroupCode',
            width:'130px',
            align:'center'
        },
        {
            header:'Group Name',
            field:'AccountGroupName',
            width:'220px',
            align:'left'
        },
        {
            header:'Sub Group Code',
            field:'SubGroupCode',
            width:'160px',
            align:'center'
        },
        {
            header:'Sub Group Name',
            field:'SubGroupName',
            width:'240px',
            align:'left'
        },
        {
            header:'Mode',
            field:'Mode',
            width:'90px',
            align:'center'
        },
        {
            header:'Ledger Creation',
            field:'AllowManualLedger',
            type:'boolean',
            width:'130px',
            align:'center'
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
        this.loadAccountClasses();
        this.loadAccountGroups();
        this.loadItems();
    }
    //===========================================================
    // Normalize API Response
    //===========================================================
    private normalizeAccountSubGroup
    (
        item:
            any
    ):
        AccountSubGroup
    {
        return {
            AccountSubGroupId:
                Number(
                    item?.AccountSubGroupId
                    ??
                    item?.accountSubGroupId
                    ??
                    item?.id
                    ??
                    item?.Id
                    ??
                    0
                ),
            AccountClassId:
                Number(
                    item?.AccountClassId
                    ??
                    item?.accountClassId
                    ??
                    0
                ),
            AccountClassName:
                [
                    item?.ClassCode
                    ??
                    item?.classCode
                    ??
                    '',
                    item?.AccountClassName
                    ??
                    item?.accountClassName
                    ??
                    ''
                ]
                    .filter(
                        value =>
                            value
                            &&
                            String(value).trim()
                    )
                    .join(' - '),
            AccountGroupId:
                Number(
                    item?.AccountGroupId
                    ??
                    item?.accountGroupId
                    ??
                    0
                ),
            AccountGroupName:
                item?.AccountGroupName
                ??
                item?.accountGroupName
                ??
                '',
            ClassCode:
                item?.ClassCode
                ??
                item?.classCode
                ??
                '',
            Mode:
                item?.Mode
                ??
                item?.mode
                ??
                '',
            GroupCode:
                item?.GroupCode
                ??
                item?.groupCode
                ??
                '',
            SubGroupCode:
                item?.SubGroupCode
                ??
                item?.subGroupCode
                ??
                '',
            SubGroupName:
                item?.SubGroupName
                ??
                item?.subGroupName
                ??
                '',
            //===========================================================
            // Configuration
            //===========================================================
            AllowManualLedger:
                Boolean(
                    item?.AllowManualLedger
                    ??
                    item?.allowManualLedger
                    ??
                    false
                ),
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
    private normalizeAccountSubGroups
    (
        response:
            any
    ):
        AccountSubGroup[]
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
                this.normalizeAccountSubGroup(
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
        this.accountSubGroupService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        AccountSubGroup[]
                ):
                    void =>
                {
                    console.log
                    (
                        'Account Sub Group API Response:',
                        response
                    );
                    this.accountSubGroups =
                        this.normalizeAccountSubGroups(
                            response
                        );
                    console.log
                    (
                        'Normalized Account Sub Groups:',
                        this.accountSubGroups
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
                        'Load Account Sub Groups Error:',
                        error
                    );
                    this.accountSubGroups =
                        [];
                    this.filteredAccountSubGroups =
                        [];
                    this.pagedAccountSubGroups =
                        [];
                    this.loading =
                        false;
                    this.loadFailed =
                        true;
                    this.toast.error
                    (
                        'Load Failed',
                        'Unable to load account sub groups.'
                    );
                    this.cdr.detectChanges();
                }
            });
    }
    //===========================================================
    // Load Account Classes
    //===========================================================
    private loadAccountClasses():
        void
    {
        this.accountClassService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        AccountClass[]
                ):
                    void =>
                {
                    this.accountClassFilterItems =
                    [
                        {
                            label:'All Account Classes',
                            value:null
                        },
                        ...response
                            .filter(
                                item =>
                                {
                                    const classCode =
                                        String(
                                            item.ClassCode
                                            ??
                                            ''
                                        )
                                            .trim()
                                            .toUpperCase();
                                    if
                                    (
                                        !item.IsActive
                                    )
                                    {
                                        return false;
                                    }
                                    if
                                    (
                                        this.selectedTab ===
                                        'inventory-auto'
                                    )
                                    {
                                        return classCode.startsWith(
                                            'INV-'
                                        );
                                    }
                                    return !classCode.startsWith(
                                        'INV-'
                                    );
                                }
                            )
                            .map
                            (
                                (
                                    item:
                                        AccountClass
                                ) =>
                                ({
                                    label:
                                        `${item.ClassCode} - ${item.ClassName}`,
                                    value:
                                        item.AccountClassId
                                })
                            )
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
                        'Load Account Classes Error:',
                        error
                    );
                    this.accountClassFilterItems =
                    [
                        {
                            label:'All Account Classes',
                            value:null
                        }
                    ];
                }
            });
    }
    //===========================================================
    // Load Account Groups
    //===========================================================
    private loadAccountGroups():
        void
    {
        this.accountGroupService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        AccountGroup[]
                ):
                    void =>
                {
                    this.accountGroupFilterItems =
                    [
                        {
                            label:'All Account Groups',
                            value:null
                        },
                        ...response
                            .filter(
                                item =>
                                {
                                    const groupCode =
                                        String(
                                            item.GroupCode
                                            ??
                                            ''
                                        )
                                            .trim()
                                            .toUpperCase();
                                    const classMatch =
                                        this.selectedAccountClassId ===
                                        null
                                        ||
                                        item.AccountClassId ===
                                        this.selectedAccountClassId;
                                    const inventoryAutoGroup =
                                        /^(INV-001|INV-002|INV-003)-\d{3}$/.test(
                                            groupCode
                                        );
                                    if
                                    (
                                        !item.IsActive
                                    )
                                    {
                                        return false;
                                    }
                                    if
                                    (
                                        !classMatch
                                    )
                                    {
                                        return false;
                                    }
                                    if
                                    (
                                        this.selectedTab ===
                                        'inventory-auto'
                                    )
                                    {
                                        return inventoryAutoGroup;
                                    }
                                    return !inventoryAutoGroup;
                                }
                            )
                            .map
                            (
                                (
                                    item:
                                        AccountGroup
                                ) =>
                                ({
                                    label:
                                        `${item.GroupCode} - ${item.GroupName}`,
                                    value:
                                        item.AccountGroupId,
                                    AccountClassId:
                                        item.AccountClassId
                                })
                            )
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
                        'Load Account Groups Error:',
                        error
                    );
                    this.accountGroupFilterItems =
                    [
                        {
                            label:'All Account Groups',
                            value:null
                        }
                    ];
                }
            });
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
        this.filteredAccountSubGroups =
            this.accountSubGroups.filter
            (
                (
                    item:
                        AccountSubGroup
                ):
                    boolean =>
                {
                    const accountClassMatch =
                        this.selectedAccountClassId === null
                        ||
                        item.AccountClassId ===
                        this.selectedAccountClassId;
                    const accountGroupMatch =
                        this.selectedAccountGroupId === null
                        ||
                        item.AccountGroupId ===
                        this.selectedAccountGroupId;
                    const inventoryAutoSubGroupMatch =
                        this.selectedTab !== 'inventory-auto'
                        ||
                        this.isInventoryAutoSubGroup(
                            item.GroupCode
                        );
                    const statusMatch =
                        this.selectedStatus === null
                        ||
                        item.IsActive ===
                        this.selectedStatus;
                    const accountClass =
                        item.AccountClassName
                        ??
                        '';
                    const classCode =
                        item.ClassCode
                        ??
                        '';
                    const accountGroup =
                        item.AccountGroupName
                        ??
                        '';
                    const groupCode =
                        item.GroupCode
                        ??
                        '';
                    const subGroupCode =
                        item.SubGroupCode
                        ??
                        '';
                    const subGroupName =
                        item.SubGroupName
                        ??
                        '';
                    const mode =
                        item.Mode
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
                    return (
                        inventoryAutoSubGroupMatch
                        &&
                        accountClassMatch
                        &&
                        accountGroupMatch
                        &&
                        statusMatch
                        &&
                        (
                            !keyword
                            ||
                            accountClass
                                .toLowerCase()
                                .includes(keyword)
                            ||
                            classCode
                                .toLowerCase()
                                .includes(keyword)
                            ||
                            accountGroup
                                .toLowerCase()
                                .includes(keyword)
                            ||
                            groupCode
                                .toLowerCase()
                                .includes(keyword)
                            ||
                            subGroupCode
                                .toLowerCase()
                                .includes(keyword)
                            ||
                            subGroupName
                                .toLowerCase()
                                .includes(keyword)
                            ||
                            mode
                                .toLowerCase()
                                .includes(keyword)
                            ||
                            remarks
                                .toLowerCase()
                                .includes(keyword)
                            ||
                            status
                                .includes(keyword)
                        )
                    );
                }
            );
        this.currentPage =
            1;
        this.updatePagination();
    }
    //===========================================================
    // Tab Change
    //===========================================================
    onTabChange
    (
        value:
            string
    ):
        void
    {
        this.selectedTab =
            value;
        this.selectedAccountClassId =
            null;
        this.selectedAccountGroupId =
            null;
        this.currentPage =
            1;
        this.loadAccountClasses();
        this.loadAccountGroups();
        this.applyFilters();
    }
    //===========================================================
    // Inventory Auto Sub Group
    //===========================================================
    private isInventoryAutoSubGroup
    (
        groupCode:
            string
    ):
        boolean
    {
        const code =
            String(
                groupCode
                ??
                ''
            ).trim();
        return /^(INV-001|INV-002|INV-003)-\d{3}$/.test(
            code
        );
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
        this.filteredAccountSubGroups =
        [
            ...this.filteredAccountSubGroups
        ];
        this.filteredAccountSubGroups.sort
        (
            (
                a:
                    AccountSubGroup,
                b:
                    AccountSubGroup
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof AccountSubGroup
                    ];
                const valueB:
                    any =
                    b[
                        event.field as keyof AccountSubGroup
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
    // Account Class Filter
    //===========================================================
    onAccountClassFilterChange
    (
        value:
            number | null
    ):
        void
    {
        this.selectedAccountClassId =
            value === null
                ? null
                : Number(value);
        this.selectedAccountGroupId =
            null;
        this.loadAccountGroups();
        this.applyFilters();
    }
    //===========================================================
    // Account Group Filter
    //===========================================================
    onAccountGroupFilterChange
    (
        value:
            number | null
    ):
        void
    {
        this.selectedAccountGroupId =
            value === null
                ? null
                : Number(value);
        this.applyFilters();
    }
    //===========================================================
    // Status Filter
    //===========================================================
    onStatusFilterChange
    (
        value:
            boolean | null
    ):
        void
    {
        this.selectedStatus =
            value === null
                ? null
                : Boolean(value);
        this.applyFilters();
    }
    //===========================================================
    // Refresh
    //===========================================================
    refresh():
        void
    {
        this.searchText =
            '';
        this.selectedTab =
            'all';
        this.selectedAccountClassId =
            null;
        this.selectedAccountGroupId =
            null;
        this.selectedStatus =
            null;
        this.currentPage =
            1;
        this.loadAccountClasses();
        this.loadAccountGroups();
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
        this.pagedAccountSubGroups =
        [
            ...this.filteredAccountSubGroups.slice
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
            AccountSubGroup
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',
                item.AccountSubGroupId
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
            AccountSubGroup
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',
                item.AccountSubGroupId
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
            AccountSubGroup
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Account Sub Group',
            `Are you sure you want to delete "${item.SubGroupName}" ?`,
            ():
                void =>
            {
                this.accountSubGroupService
                    .delete
                    (
                        item.AccountSubGroupId
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
                                `${item.SubGroupName} deleted successfully.`
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
                                'Delete Account Sub Group Error:',
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
                                    'Account Sub Group cannot be deleted because it is already configured.';
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
                                'Failed to delete account sub group.'
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
            'Restore Account Sub Group',
            'Are you sure you want to restore the most recently deleted account sub group?',
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
        this.accountSubGroupService
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
                        'The most recently deleted account sub group has been restored.'
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
                        'Restore Account Sub Group Error:',
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
                            'There is no deleted account sub group record to restore.'
                        );
                        return;
                    }
                    this.toast.error
                    (
                        'Restore Failed',
                        'Failed to restore account sub group.'
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
        this.accountSubGroupService
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
                        'Account Sub Group Management History';
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
                        'Failed to load account sub group history.'
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
