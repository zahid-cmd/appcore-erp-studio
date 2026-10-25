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
    EmiReimbursementSchemes
}
from '../../../models/emi-reimbursement-schemes.model';

import
{
    formatMoney
}
from '../../../../../../shared/components/accounting/accounting.models';

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
    EmiReimbursementSchemesService
}
from '../../../services/emi-reimbursement-schemes.service';

//===============================================================
// List Row (adds display values)
//===============================================================

type SchemeRow =
    EmiReimbursementSchemes
    &
    {
        TenureText:
            string;

        ValidFromText:
            string;

        ValidToText:
            string;

        SwapText:
            string;

        EmiText:
            string;

        TotalCapText:
            string;

        // Active / Inactive / Expired / Upcoming
        StatusText:
            string;
    };

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'emi-reimbursement-schemes-list',
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
    templateUrl:'./emi-reimbursement-schemes-list.html',
    styleUrl:'./emi-reimbursement-schemes-list.css'
})

//===============================================================
// EMI Reimbursement Schemes List
//
// Tabs : All / Active (active, not expired) / Expired (Valid To
// before today). Brand + status filters.
//===============================================================

export class EmiReimbursementSchemesList
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly schemesService =
        inject(EmiReimbursementSchemesService);

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
            label:'All Schemes'
        },
        {
            id:'active',
            label:'Active'
        },
        {
            id:'expired',
            label:'Expired'
        }
    ];

    selectedTab:
        string =
        'all';

    //===========================================================
    // Data
    //===========================================================

    schemes:
        SchemeRow[] =
    [];

    filteredSchemes:
        SchemeRow[] =
    [];

    pagedSchemes:
        SchemeRow[] =
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
    // Brand Filter (built from the loaded schemes)
    //===========================================================

    brandFilterItems:
        any[] =
    [
        {
            label:'All Brands',
            value:null
        }
    ];

    selectedBrand:
        string | null =
        null;

    //===========================================================
    // Progress Dialog Settings
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
        'EMI Reimbursement Schemes History';

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
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Code', field:'SchemeCode', width:'100px', align:'center' },
        { header:'Brand', field:'BrandName', width:'130px', align:'left' },
        { header:'Motor Bikes Supplier', field:'SupplierName', width:'260px', align:'left' },
        { header:'Tenure', field:'TenureText', width:'110px', align:'center' },
        { header:'Valid From', field:'ValidFromText', width:'110px', align:'center' },
        { header:'Valid To', field:'ValidToText', width:'110px', align:'center' },
        { header:'Swap Charge', field:'SwapText', width:'170px', align:'right' },
        { header:'EMI Charge', field:'EmiText', width:'170px', align:'right' },
        { header:'Total Cap', field:'TotalCapText', width:'110px', align:'right' },
        { header:'Status', field:'StatusText', type:'status', width:'110px', align:'center' },
        { header:'Actions', field:'actions', type:'actions', width:'90px', align:'center', cellAlign:'center' }
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
    // Error Message
    //===========================================================

    private extractErrorMessage
    (
        error:
            unknown,

        fallback:
            string
    ):
        string
    {
        if
        (
            error instanceof HttpErrorResponse
        )
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
        }

        return fallback;
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

        this.schemesService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        EmiReimbursementSchemes[]
                ):
                    void =>
                {
                    // Display values
                    this.schemes =
                        (response ?? []).map
                        (
                            item =>
                                this.toRow(item)
                        );

                    this.buildBrandFilterItems();

                    this.applyFilters();

                    this.loading =
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
                        'Load EMI Reimbursement Schemes Error:',
                        error
                    );

                    this.schemes =
                        [];

                    this.filteredSchemes =
                        [];

                    this.pagedSchemes =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error
                    (
                        'Load Failed',
                        'Unable to load EMI reimbursement schemes.'
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

        this.filteredSchemes =
            this.schemes.filter
            (
                item =>
                {
                    const statusMatch =
                        this.selectedStatus === null
                        ||
                        item.Status ===
                        this.selectedStatus;

                    const tabMatch =
                        this.selectedTab === 'all'
                        ||
                        (
                            this.selectedTab === 'active'
                            &&
                            item.Status
                            &&
                            !item.IsExpired
                        )
                        ||
                        (
                            this.selectedTab === 'expired'
                            &&
                            item.IsExpired
                        );

                    const brandMatch =
                        this.selectedBrand === null
                        ||
                        item.BrandCode ===
                        this.selectedBrand;

                    const text =
                        [
                            item.SchemeCode,
                            item.BrandName,
                            item.SupplierName,
                            item.TenureText,
                            item.ValidFromText,
                            item.ValidToText,
                            item.SwapText,
                            item.EmiText,
                            item.TotalCapText,
                            item.Remarks,
                            item.StatusText
                        ]
                        .join(' ')
                        .toLowerCase();

                    return statusMatch
                        &&
                        tabMatch
                        &&
                        brandMatch
                        &&
                        (
                            !keyword
                            ||
                            text.includes(keyword)
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

        this.applyFilters();

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
    // Brand Filter
    //===========================================================

    onBrandFilterChange
    (
        value:
            string | null
    ):
        void
    {
        this.selectedBrand =
            value
                ? String(value)
                : null;

        this.applyFilters();
    }

    private buildBrandFilterItems():
        void
    {
        const brands =
            new Map<string, string>();

        for
        (
            const item of this.schemes
        )
        {
            brands.set(
                item.BrandCode,
                item.BrandName
            );
        }

        this.brandFilterItems =
        [
            {
                label:'All Brands',
                value:null
            },
            ...[...brands.entries()]
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([code, name]) => ({ label:name, value:code }))
        ];

        if
        (
            this.selectedBrand !== null
            &&
            !brands.has(this.selectedBrand)
        )
        {
            this.selectedBrand =
                null;
        }
    }

    //===========================================================
    // Display Values
    //===========================================================

    private toRow
    (
        item:
            EmiReimbursementSchemes
    ):
        SchemeRow
    {
        return {
            ...item,

            TenureText:
                item.TenureMonths > 0
                    ? `${item.TenureMonths} months`
                    : 'All',

            ValidFromText:
                this.displayDate(item.ValidFrom),

            ValidToText:
                item.ValidTo
                    ? this.displayDate(item.ValidTo)
                    : 'Open',

            SwapText:
                this.shareText(item.SwapBasis, item.SwapValue, item.SwapCap),

            EmiText:
                this.shareText(item.EmiBasis, item.EmiValue, item.EmiCap),

            TotalCapText:
                item.TotalCap
                    ? formatMoney(item.TotalCap)
                    : '—',

            StatusText:
                !item.Status
                    ? 'Inactive'
                    : item.IsExpired
                        ? 'Expired'
                        : item.IsUpcoming
                            ? 'Upcoming'
                            : 'Active'
        };
    }

    // "60% · cap 1,000.00" / "Tk 2,000.00" / "—"
    private shareText
    (
        basis:
            string,
        value:
            number,
        cap:
            number | null
    ):
        string
    {
        if
        (
            !value
        )
        {
            return '—';
        }

        const share =
            basis === 'Fixed'
                ? `Tk ${formatMoney(value)}`
                : `${Number(value.toFixed(2))}%`;

        return cap
            ? `${share} · cap ${formatMoney(cap)}`
            : share;
    }

    // yyyy-MM-dd → dd-MM-yyyy
    private displayDate
    (
        value:
            string | null | undefined
    ):
        string
    {
        const parts =
            (value ?? '').substring(0, 10).split('-');

        return parts.length === 3
            ? `${parts[2]}-${parts[1]}-${parts[0]}`
            : value ?? '';
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
        const direction =
            event.direction === 'asc'
                ? 1
                : -1;

        // Display columns sort by their raw values
        const raw:
            Record<string, string> =
        {
            TenureText:'TenureMonths',
            ValidFromText:'ValidFrom',
            ValidToText:'ValidTo',
            SwapText:'SwapValue',
            EmiText:'EmiValue',
            TotalCapText:'TotalCap'
        };

        const field =
            raw[event.field] ?? event.field;

        this.filteredSchemes =
        [
            ...this.filteredSchemes
        ]
        .sort
        (
            (a: any, b: any): number =>
            {
                const valueA =
                    a[field];

                const valueB =
                    b[field];

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
                    return -1 * direction;
                }

                if
                (
                    valueB == null
                )
                {
                    return 1 * direction;
                }

                if
                (
                    typeof valueA === 'string'
                    &&
                    typeof valueB === 'string'
                )
                {
                    return valueA.localeCompare(valueB) * direction;
                }

                return (valueA < valueB ? -1 : valueA > valueB ? 1 : 0) * direction;
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

        this.selectedStatus =
            null;

        this.selectedBrand =
            null;

        this.currentPage =
            1;

        this.loadItems();
    }

    //===========================================================
    // Pagination
    //===========================================================

    updatePagination():
        void
    {
        const start:
            number =
            (this.currentPage - 1) * this.pageSize;

        this.pagedSchemes =
        [
            ...this.filteredSchemes.slice
            (
                start,
                start + this.pageSize
            )
        ];
    }

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
    // Add / View / Edit
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

    view
    (
        item:
            SchemeRow
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',
                item.EmiReimbursementSchemeId
            ],
            {
                relativeTo:
                    this.route.parent
            }
        );
    }

    edit
    (
        item:
            SchemeRow
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',
                item.EmiReimbursementSchemeId
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
            SchemeRow
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
            'Delete EMI Reimbursement Scheme',
            `Are you sure you want to delete scheme ${item.SchemeCode} of ${item.BrandName}?`,
            ():
                void =>
            {
                // Next tick : let the confirm dialog close first
                setTimeout(
                    () =>
                        this.deleteItem(
                            item
                        )
                );
            }
        );
    }

    private deleteItem
    (
        item:
            SchemeRow
    ):
        void
    {
        this.startProgress(
            'Deleting EMI Reimbursement Scheme',
            `Please wait while "scheme ${item.SchemeCode}" is being deleted...`
        );

        this.withMinimumDuration(
            this.schemesService.delete(
                item.EmiReimbursementSchemeId
            )
        )
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.completeProgress(

                        'EMI reimbursement scheme deleted.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',
                                `scheme ${item.SchemeCode} deleted successfully.`
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
                        'Delete EMI Reimbursement Scheme Error:',
                        error
                    );

                    this.failProgress(
                        () =>
                        {
                            if
                            (
                                error instanceof HttpErrorResponse
                                &&
                                error.status === 409
                            )
                            {
                                this.toast.info
                                (
                                    'Delete Blocked',
                                    this.extractErrorMessage(
                                        error,
                                        'EMI Reimbursement Scheme cannot be deleted because it is already in use.'
                                    )
                                );

                                return;
                            }

                            this.toast.error
                            (
                                'Delete Failed',
                                'Failed to delete EMI reimbursement scheme.'
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
            'Restore EMI Reimbursement Scheme',
            'Are you sure you want to restore the most recently deleted EMI reimbursement scheme?',
            ():
                void =>
            {
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

    private restoreItem():
        void
    {
        this.startProgress(
            'Restoring EMI Reimbursement Scheme',
            'Please wait while the most recently deleted EMI reimbursement scheme is being restored...'
        );

        this.withMinimumDuration(
            this.schemesService.restore()
        )
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.completeProgress(

                        'EMI reimbursement scheme restored.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Restore Successful',
                                'The most recently deleted EMI reimbursement scheme has been restored.'
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
                        'Restore EMI Reimbursement Scheme Error:',
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
                                    'There is no deleted EMI reimbursement scheme record to restore.'
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
                                this.toast.info
                                (
                                    'Restore Blocked',
                                    this.extractErrorMessage(
                                        error,
                                        'The EMI reimbursement scheme cannot be restored.'
                                    )
                                );

                                return;
                            }

                            this.toast.error
                            (
                                'Restore Failed',
                                'Failed to restore EMI reimbursement scheme.'
                            );
                        }
                    );
                }
            });
    }

    //===========================================================
    // History
    //===========================================================

    openHistory():
        void
    {
        this.schemesService
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
                        'EMI Reimbursement Schemes History';

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
                        'Failed to load EMI reimbursement scheme history.'
                    );
                }
            });
    }

    closeHistory():
        void
    {
        this.historyOpened =
            false;

        this.cdr.detectChanges();
    }
}