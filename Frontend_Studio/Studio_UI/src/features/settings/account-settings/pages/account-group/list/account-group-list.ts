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
    AccountGroup
}
from '../../../models/account-group.model';
import
{
    AccountClass
}
from '../../../models/account-class.model';
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
    AccountGroupService
}
from '../../../services/account-group.service';
import
{
    AccountClassService
}
from '../../../services/account-class.service';

//===============================================================
// Component
//===============================================================
@Component(
{
    selector:'account-group-list',
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
    templateUrl:'./account-group-list.html',
    styleUrl:'./account-group-list.css'
})

//===============================================================
// Account Group List
//===============================================================
export class AccountGroupList
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================
    private readonly accountGroupService =
        inject(AccountGroupService);
    private readonly accountClassService =
        inject(AccountClassService);
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
            label:'All Account Groups'
        },
        {
            id:'inventory-auto',
            label:'Inventory Auto Groups'
        }
    ];
    selectedTab:
        string =
        'all';

    //===========================================================
    // Data
    //===========================================================
    accountGroups:
        AccountGroup[] =
    [];
    filteredAccountGroups:
        AccountGroup[] =
    [];
    pagedAccountGroups:
        AccountGroup[] =
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
        'Account Group History';
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
            width:'140px',
            align:'center'
        },
        {
            header:'Group Name',
            field:'GroupName',
            width:'240px',
            align:'left'
        },
        {
            header:'Mode',
            field:'Mode',
            width:'100px',
            align:'center'
        },
        {
            header:'Manual Sub Group',
            field:'AllowManualSubGroup',
            width:'170px',
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
    readonly inventoryAutoGroupColumns:
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
            width:'140px',
            align:'center'
        },
        {
            header:'Group Name',
            field:'GroupName',
            width:'240px',
            align:'left'
        },
        {
            header:'Mode',
            field:'Mode',
            width:'100px',
            align:'center'
        },
        {
            header:'Manual Sub Group',
            field:'AllowManualSubGroup',
            width:'170px',
            align:'center',
            type:'boolean'
        },
        {
            header:'Status',
            field:'IsActive',
            type:'status',
            width:'120px',
            align:'center'
        }
    ];

    get displayColumns():
        ListTableColumn[]
    {
        return this.selectedTab === 'inventory-auto'
            ? this.inventoryAutoGroupColumns
            : this.columns;
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadAccountClasses();

        this.loadItems();
    }

    //===========================================================
    // Normalize API Response
    //===========================================================
    private normalizeAccountGroup
    (
        item:
            any
    ):
        AccountGroup
    {
        return {
            AccountGroupId:
                Number(
                    item?.AccountGroupId
                    ??
                    item?.accountGroupId
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
            GroupName:
                item?.GroupName
                ??
                item?.groupName
                ??
                '',
            AllowManualSubGroup:
                Boolean(
                    item?.AllowManualSubGroup
                    ??
                    item?.allowManualSubGroup
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
    private normalizeAccountGroups
    (
        response:
            any
    ):
        AccountGroup[]
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
                this.normalizeAccountGroup(
                    item
                )
        );
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

                    const classes =

                        response

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

                            );

                    this.accountClassFilterItems =

                    [

                        {

                            label:'All Account Classes',

                            value:null

                        },

                        ...classes

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
    // Load Items
    //===========================================================
    loadItems():
        void
    {
        this.loading =
            true;
        this.loadFailed =
            false;
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
                    console.log
                    (
                        'Account Group API Response:',
                        response
                    );
                    this.accountGroups =
                        this.normalizeAccountGroups(
                            response
                        );
                    console.log
                    (
                        'Normalized Account Groups:',
                        this.accountGroups
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
                        'Load Account Groups Error:',
                        error
                    );
                    this.accountGroups =
                        [];
                    this.filteredAccountGroups =
                        [];
                    this.pagedAccountGroups =
                        [];
                    this.loading =
                        false;
                    this.loadFailed =
                        true;
                    this.toast.error
                    (
                        'Load Failed',
                        'Unable to load account groups.'
                    );
                    this.cdr.detectChanges();
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
        this.filteredAccountGroups =
            this.accountGroups.filter
            (
                (
                    item:
                        AccountGroup
                ):
                    boolean =>
                {
                    const accountClass =
                        item.AccountClassName
                        ??
                        '';
                    const accountClassMatch =
                        this.selectedAccountClassId === null
                        ||
                        item.AccountClassId ===
                        this.selectedAccountClassId;
                    const statusMatch =
                        this.selectedStatus === null
                        ||
                        item.IsActive ===
                        this.selectedStatus;
                    const inventoryAutoGroupMatch =
                        this.selectedTab !== 'inventory-auto'
                        ||
                        this.isInventoryAutoGroup(
                            item.GroupCode
                        );
                    const classCode =
                        item.ClassCode
                        ??
                        '';
                    const mode =
                        item.Mode
                        ??
                        '';
                    const groupCode =
                        item.GroupCode
                        ??
                        '';
                    const groupName =
                        item.GroupName
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
                        inventoryAutoGroupMatch
                        &&
                        accountClassMatch
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
                            mode
                                .toLowerCase()
                                .includes(keyword)
                            ||
                            groupCode
                                .toLowerCase()
                                .includes(keyword)
                            ||
                            groupName
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

    onTabChange(

        value:

            string

    ):

        void

    {

        this.selectedTab =

            value;

        this.selectedAccountClassId =

            null;

        this.currentPage =

            1;

        this.loadAccountClasses();

        this.applyFilters();

    }

    //===========================================================
    // Inventory Auto Group
    //===========================================================
    private isInventoryAutoGroup(
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
    // Account Class Filter Change
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
            value === null
                ? null
                : Boolean(value);
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
        this.filteredAccountGroups =
        [
            ...this.filteredAccountGroups
        ];
        this.filteredAccountGroups.sort
        (
            (
                a:
                    AccountGroup,
                b:
                    AccountGroup
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof AccountGroup
                    ];
                const valueB:
                    any =
                    b[
                        event.field as keyof AccountGroup
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
        this.selectedTab =
            'all';
        this.selectedAccountClassId =
            null;
        this.selectedStatus =
            null;
        this.currentPage =
            1;
        this.loadAccountClasses();
        this.loadItems();
    }

    //===========================================================
    // Filters
    //===========================================================
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
        this.pagedAccountGroups =
        [
            ...this.filteredAccountGroups.slice
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
            AccountGroup
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',
                item.AccountGroupId
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
            AccountGroup
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',
                item.AccountGroupId
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
            AccountGroup
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Account Group',
            `Are you sure you want to delete "${item.GroupName}" ?`,
            ():
                void =>
            {
                this.accountGroupService
                    .delete
                    (
                        item.AccountGroupId
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
                                `${item.GroupName} deleted successfully.`
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
                                'Delete Account Group Error:',
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
                                    'Account Group cannot be deleted because it is already configured.';
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
                                'Failed to delete account group.'
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
            'Restore Account Group',
            'Are you sure you want to restore the most recently deleted account group?',
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
        this.accountGroupService
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
                        'The most recently deleted account group has been restored.'
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
                        'Restore Account Group Error:',
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
                            'There is no deleted account group record to restore.'
                        );
                        return;
                    }
                    this.toast.error
                    (
                        'Restore Failed',
                        'Failed to restore account group.'
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
        this.accountGroupService
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
                        'Account Group Management History';
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
                        'Failed to load account group history.'
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
