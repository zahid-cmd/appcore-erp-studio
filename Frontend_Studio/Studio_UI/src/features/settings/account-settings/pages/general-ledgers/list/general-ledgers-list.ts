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
    GeneralLedger
}
from '../../../models/general-ledgers.model';

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
    GeneralLedgerService
}
from '../../../services/general-ledgers.service';

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

import
{
    AccountSubGroupService
}
from '../../../services/account-sub-group.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'general-ledgers-list',
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
        ProgressDialogComponent,
        SearchDropdownComponent,
        ToastComponent
    ],
    templateUrl:'./general-ledgers-list.html',
    styleUrl:'./general-ledgers-list.css'
})

//===============================================================
// General Ledgers List
//===============================================================

export class GeneralLedgersList
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly generalLedgerService =
        inject(GeneralLedgerService);

    private readonly accountClassService =
        inject(AccountClassService);

    private readonly accountGroupService =
        inject(AccountGroupService);

    private readonly accountSubGroupService =
        inject(AccountSubGroupService);

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
    // Page Tabs
    //===========================================================

    tabs:
        ControlTab[] =
    [
        {
            id:'all',
            label:'All General Ledgers'
        },
        {
            id:'inventory-auto',
            label:'Inventory Auto Ledgers'
        }
    ];

    selectedTab:
        string =
        'all';

    //===========================================================
    // Data
    //===========================================================

    generalLedgers:
        GeneralLedger[] =
    [];

    filteredGeneralLedgers:
        GeneralLedger[] =
    [];

    pagedGeneralLedgers:
        GeneralLedger[] =
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

    // Prevents a second Delete / Restore while one is running
    isProcessing:
        boolean =
        false;

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

    accountSubGroupFilterItems:
        any[] =
    [
        {
            label:'All Account Sub Groups',
            value:null
        }
    ];

    selectedAccountSubGroupId:
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
    // Progress Dialog Settings
    //===========================================================

    // Minimum time the dialog stays open
    private readonly MIN_PROGRESS_MS:
        number =
        3000;

    // Animation tick
    private readonly PROGRESS_TICK_MS:
        number =
        100;

    // Highest % reached before the server answers
    private readonly PROGRESS_CEILING:
        number =
        90;

    // How long 100% is shown before closing
    private readonly PROGRESS_COMPLETE_HOLD_MS:
        number =
        600;

    private progressTimer?:
        number;

    private progressValue:
        number =
        0;

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
        'General Ledger History';

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
            header:'Group Name',
            field:'AccountGroupName',
            width:'200px',
            align:'left'
        },
        {
            header:'Sub Group Name',
            field:'AccountSubGroupName',
            width:'200px',
            align:'left'
        },
        {
            header:'Ledger Code',
            field:'LedgerCode',
            width:'180px',
            align:'left'
        },
        {
            header:'Ledger Name',
            field:'LedgerName',
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
    // Inventory Auto Ledger Columns
    //
    // System-generated ledgers : read only, so no
    // View / Edit / Delete actions.
    //===========================================================

    readonly inventoryAutoLedgerColumns:
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
            header:'Group Name',
            field:'AccountGroupName',
            width:'200px',
            align:'left'
        },
        {
            header:'Sub Group Name',
            field:'AccountSubGroupName',
            width:'200px',
            align:'left'
        },
        {
            header:'Ledger Code',
            field:'LedgerCode',
            width:'180px',
            align:'left'
        },
        {
            header:'Ledger Name',
            field:'LedgerName',
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
            header:'Status',
            field:'IsActive',
            type:'status',
            width:'120px',
            align:'center'
        }
    ];

    //===========================================================
    // Display Columns (by tab)
    //===========================================================

    get displayColumns():
        ListTableColumn[]
    {
        return this.selectedTab === 'inventory-auto'
            ? this.inventoryAutoLedgerColumns
            : this.columns;
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadAccountClasses();
        this.loadAccountGroups();
        this.loadAccountSubGroups();
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
    // Progress Dialog (Animated)
    //
    // The bar eases from 0% toward 90% while the request runs,
    // then jumps to 100% on success before closing.
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

        // Determinate : we drive the percentage ourselves
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
                    // Ease-out : big steps first, smaller near the ceiling
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

    //-----------------------------------------------------------
    // Success : show 100%, pause briefly, then close
    //-----------------------------------------------------------

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

    //-----------------------------------------------------------
    // Error : close immediately, then report
    //-----------------------------------------------------------

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
    //
    // Keeps the progress dialog visible for at least
    // MIN_PROGRESS_MS, on both success and error.
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
    // Normalize API Response
    //===========================================================

    private normalizeGeneralLedger
    (
        item:
            any
    ):
        GeneralLedger
    {
        return {
            GeneralLedgerId:
                Number(
                    item?.GeneralLedgerId
                    ??
                    item?.generalLedgerId
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

            AccountSubGroupId:
                Number(
                    item?.AccountSubGroupId
                    ??
                    item?.accountSubGroupId
                    ??
                    0
                ),

            AccountSubGroupName:
                item?.AccountSubGroupName
                ??
                item?.accountSubGroupName
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

            LedgerCode:
                item?.LedgerCode
                ??
                item?.ledgerCode
                ??
                '',

            LedgerName:
                item?.LedgerName
                ??
                item?.ledgerName
                ??
                '',

            //===========================================================
            // Configuration
            //===========================================================

            // TODO: Normalize General Ledger specific configuration fields here

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

    private normalizeGeneralLedgers
    (
        response:
            any
    ):
        GeneralLedger[]
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
                this.normalizeGeneralLedger(
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

        this.generalLedgerService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        GeneralLedger[]
                ):
                    void =>
                {
                    console.log
                    (
                        'General Ledger API Response:',
                        response
                    );

                    this.generalLedgers =
                        this.normalizeGeneralLedgers(
                            response
                        );

                    console.log
                    (
                        'Normalized General Ledgers:',
                        this.generalLedgers
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
                        'Load General Ledgers Error:',
                        error
                    );

                    this.generalLedgers =
                        [];

                    this.filteredGeneralLedgers =
                        [];

                    this.pagedGeneralLedgers =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error
                    (
                        'Load Failed',
                        'Unable to load general ledgers.'
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
                                    const classMatch =
                                        this.selectedAccountClassId ===
                                        null
                                        ||
                                        item.AccountClassId ===
                                        this.selectedAccountClassId;

                                    const inventoryAutoGroup =
                                        this.isInventoryAutoGroup(
                                            item.GroupCode
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
    // Load Account Sub Groups
    //===========================================================

    private loadAccountSubGroups():
        void
    {
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
                    this.accountSubGroupFilterItems =
                    [
                        {
                            label:'All Account Sub Groups',
                            value:null
                        },

                        ...response
                            .filter(
                                item =>
                                {
                                    const classMatch =
                                        this.selectedAccountClassId ===
                                        null
                                        ||
                                        item.AccountClassId ===
                                        this.selectedAccountClassId;

                                    const groupMatch =
                                        this.selectedAccountGroupId ===
                                        null
                                        ||
                                        item.AccountGroupId ===
                                        this.selectedAccountGroupId;

                                    const inventoryAutoGroup =
                                        this.isInventoryAutoGroup(
                                            item.GroupCode
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
                                        ||
                                        !groupMatch
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
                                        AccountSubGroup
                                ) =>
                                ({
                                    label:
                                        `${item.SubGroupCode} - ${item.SubGroupName}`,

                                    value:
                                        item.AccountSubGroupId,

                                    AccountClassId:
                                        item.AccountClassId,

                                    AccountGroupId:
                                        item.AccountGroupId
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
                        'Load Account Sub Groups Error:',
                        error
                    );

                    this.accountSubGroupFilterItems =
                    [
                        {
                            label:'All Account Sub Groups',
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

        this.filteredGeneralLedgers =
            this.generalLedgers.filter
            (
                (
                    item:
                        GeneralLedger
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

                    const accountSubGroupMatch =
                        this.selectedAccountSubGroupId === null
                        ||
                        item.AccountSubGroupId ===
                        this.selectedAccountSubGroupId;

                    //===================================================
                    // Tab split
                    //   inventory-auto tab : only the auto ledgers
                    //   all tab            : only the manual ledgers
                    //===================================================

                    const isInventoryAuto =
                        this.isInventoryAutoGroup(
                            item.GroupCode
                        );

                    const inventoryAutoLedgerMatch =
                        this.selectedTab === 'inventory-auto'
                            ? isInventoryAuto
                            : !isInventoryAuto;

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

                    const accountSubGroup =
                        item.AccountSubGroupName
                        ??
                        '';

                    const subGroupCode =
                        item.SubGroupCode
                        ??
                        '';

                    const ledgerCode =
                        item.LedgerCode
                        ??
                        '';

                    const ledgerName =
                        item.LedgerName
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
                        inventoryAutoLedgerMatch
                        &&
                        accountClassMatch
                        &&
                        accountGroupMatch
                        &&
                        accountSubGroupMatch
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
                            accountSubGroup
                                .toLowerCase()
                                .includes(keyword)
                            ||
                            subGroupCode
                                .toLowerCase()
                                .includes(keyword)
                            ||
                            ledgerCode
                                .toLowerCase()
                                .includes(keyword)
                            ||
                            ledgerName
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

        this.selectedAccountSubGroupId =
            null;

        this.currentPage =
            1;

        this.loadAccountClasses();

        this.loadAccountGroups();

        this.loadAccountSubGroups();

        this.applyFilters();
    }

    //===========================================================
    // Inventory Auto Group
    //===========================================================

    private isInventoryAutoGroup
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
            ).trim().toUpperCase();

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
        this.filteredGeneralLedgers =
        [
            ...this.filteredGeneralLedgers
        ];

        this.filteredGeneralLedgers.sort
        (
            (
                a:
                    GeneralLedger,

                b:
                    GeneralLedger
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof GeneralLedger
                    ];

                const valueB:
                    any =
                    b[
                        event.field as keyof GeneralLedger
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

        this.selectedAccountSubGroupId =
            null;

        this.loadAccountGroups();

        this.loadAccountSubGroups();

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

        this.selectedAccountSubGroupId =
            null;

        this.loadAccountSubGroups();

        this.applyFilters();
    }

    //===========================================================
    // Account Sub Group Filter
    //===========================================================

    onAccountSubGroupFilterChange
    (
        value:
            number | null
    ):
        void
    {
        this.selectedAccountSubGroupId =
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

        this.selectedAccountSubGroupId =
            null;

        this.selectedStatus =
            null;

        this.currentPage =
            1;

        this.loadAccountClasses();

        this.loadAccountGroups();

        this.loadAccountSubGroups();

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

        this.pagedGeneralLedgers =
        [
            ...this.filteredGeneralLedgers.slice
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
            GeneralLedger
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',
                item.GeneralLedgerId
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
            GeneralLedger
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',
                item.GeneralLedgerId
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
            GeneralLedger
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

        this.confirmDialog.open
        (
            'Delete General Ledger',
            `Are you sure you want to delete "${item.LedgerName}" ?`,
            ():
                void =>
            {
                // Next tick : let the confirm dialog close first,
                // so it cannot hide the progress dialog.
                setTimeout(
                    () =>
                        this.deleteItem(
                            item
                        )
                );
            }
        );
    }

    //===========================================================
    // Delete Item
    //===========================================================

    private deleteItem
    (
        item:
            GeneralLedger
    ):
        void
    {
        this.startProgress(
            'Deleting General Ledger',
            `Please wait while "${item.LedgerName}" is being deleted...`
        );

        this.withMinimumDuration(
            this.generalLedgerService.delete(
                item.GeneralLedgerId
            )
        )
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.completeProgress(

                        'General ledger deleted.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',
                                `${item.LedgerName} deleted successfully.`
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
                    console.error
                    (
                        'Delete General Ledger Error:',
                        error
                    );

                    this.failProgress(
                        () =>
                        {
                            //===========================================
                            // Deletion Blocked
                            //===========================================

                            if
                            (
                                error instanceof HttpErrorResponse
                                &&
                                error.status === 409
                            )
                            {
                                let message =
                                    'General Ledger cannot be deleted because it is already configured.';

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

                            //===========================================
                            // Delete Failed
                            //===========================================

                            this.toast.error
                            (
                                'Delete Failed',
                                'Failed to delete general ledger.'
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
            'Restore General Ledger',
            'Are you sure you want to restore the most recently deleted general ledger?',
            ():
                void =>
            {
                // Next tick : same as Delete, for consistency.
                setTimeout(
                    () =>
                        this.restoreItem()
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
            'Restoring General Ledger',
            'Please wait while the most recently deleted general ledger is being restored...'
        );

        this.withMinimumDuration(
            this.generalLedgerService.restore()
        )
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.completeProgress(

                        'General ledger restored.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Restore Successful',
                                'The most recently deleted general ledger has been restored.'
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
                    console.error
                    (
                        'Restore General Ledger Error:',
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
                                this.toast.info
                                (
                                    'No Data to Restore',
                                    'There is no deleted general ledger record to restore.'
                                );

                                return;
                            }

                            this.toast.error
                            (
                                'Restore Failed',
                                'Failed to restore general ledger.'
                            );
                        }
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
        this.generalLedgerService
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
                        'General Ledger Management History';

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
                        'Failed to load general ledger history.'
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