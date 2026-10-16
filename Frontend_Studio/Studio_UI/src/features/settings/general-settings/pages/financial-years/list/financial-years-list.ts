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
    FinancialYear,
    FinancialYearStatus
}
from '../../../models/financial-years.model';

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
    FinancialYearsService
}
from '../../../services/financial-years.service';

//===============================================================
// List Item
//===============================================================

interface FinancialYearListItem
extends FinancialYear
{
    StartDateText:
        string;

    EndDateText:
        string;

    DurationText:
        string;

    CurrentText:
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
// Date Display Helpers
//===============================================================

const MONTH_NAMES:
    string[] =
[
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// "2026-07-01" → "01-Jul-2026"
function formatDate
(
    value:
        string
):
    string
{
    const match =
        /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');

    if
    (
        !match
    )
    {
        return '';
    }

    return `${match[3]}-${MONTH_NAMES[Number(match[2]) - 1]}-${match[1]}`;
}

// Whole months between two dates (inclusive), e.g. 12
function monthsBetween
(
    start:
        string,
    end:
        string
):
    number
{
    const a =
        /^(\d{4})-(\d{2})-(\d{2})$/.exec(start ?? '');

    const b =
        /^(\d{4})-(\d{2})-(\d{2})$/.exec(end ?? '');

    if
    (
        !a
        ||
        !b
    )
    {
        return 0;
    }

    const startUtc =
        Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));

    // one day after the end date
    const endNextUtc =
        Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]) + 1);

    const s =
        new Date(startUtc);

    const e =
        new Date(endNextUtc);

    return (
        (e.getUTCFullYear() - s.getUTCFullYear()) * 12
        +
        (e.getUTCMonth() - s.getUTCMonth())
    );
}

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'financial-years-list',

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

    templateUrl:'./financial-years-list.html',

    styleUrl:'./financial-years-list.css'
})

//===============================================================
// Financial Years List
//===============================================================

export class FinancialYearsList
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly financialYearsService =
        inject(FinancialYearsService);

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
            label:'All Financial Years'
        }
    ];

    selectedTab:
        string =
        'all';

    //===========================================================
    // Data
    //===========================================================

    financialYears:
        FinancialYearListItem[] =
        [];

    filteredFinancialYears:
        FinancialYearListItem[] =
        [];

    pagedFinancialYears:
        FinancialYearListItem[] =
        [];

    //===========================================================
    // Year Status Filter
    //===========================================================

    yearStatusFilterItems:
        any[] =
    [
        { label:'All Year Status', value:null },
        { label:'Open', value:'Open' },
        { label:'Closed', value:'Closed' },
        { label:'Locked', value:'Locked' }
    ];

    selectedYearStatus:
        FinancialYearStatus | null =
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
        'Financial Year History';

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
            header:'Code',
            field:'FinancialYearCode',
            width:'140px',
            align:'center'
        },
        {
            header:'Financial Year',
            field:'FinancialYearName',
            width:'200px',
            align:'left'
        },
        {
            header:'Start Date',
            field:'StartDateText',
            width:'150px',
            align:'center'
        },
        {
            header:'End Date',
            field:'EndDateText',
            width:'150px',
            align:'center'
        },
        {
            header:'Duration',
            field:'DurationText',
            width:'120px',
            align:'center'
        },
        {
            header:'Current',
            field:'CurrentText',
            width:'110px',
            align:'center'
        },
        {
            header:'Year Status',
            field:'YearStatus',
            width:'130px',
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
    // Sort Fields
    //
    // Display columns that must sort by their underlying value.
    //===========================================================

    private readonly sortFieldMap:
        Record<string, keyof FinancialYearListItem> =
    {
        StartDateText:'StartDate',
        EndDateText:'EndDate'
    };

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
    // To List Item
    //===========================================================

    private toListItem
    (
        item:
            FinancialYear
    ):
        FinancialYearListItem
    {
        const months =
            monthsBetween(
                item.StartDate,
                item.EndDate
            );

        return {
            ...item,

            StartDateText:
                formatDate(
                    item.StartDate
                ),

            EndDateText:
                formatDate(
                    item.EndDate
                ),

            DurationText:
                months > 0
                    ? `${months} month${months === 1 ? '' : 's'}`
                    : '',

            CurrentText:
                item.IsCurrent
                    ? 'Current'
                    : '—'
        };
    }

    //===========================================================
    // Load Items (newest year first)
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        this.financialYearsService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        FinancialYear[]
                ):
                    void =>
                {
                    this.financialYears =
                        (response ?? [])
                            .map
                            (
                                item =>
                                    this.toListItem(
                                        item
                                    )
                            )
                            .sort
                            (
                                (a, b) =>
                                    b.StartDate.localeCompare(a.StartDate)
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
                        'Load Financial Years Error:',
                        error
                    );

                    this.financialYears =
                        [];

                    this.filteredFinancialYears =
                        [];

                    this.pagedFinancialYears =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error(
                        'Load Failed',
                        'Unable to load financial years.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Year Status Filter Change
    //===========================================================

    onYearStatusFilterChange
    (
        value:
            FinancialYearStatus | null
    ):
        void
    {
        this.selectedYearStatus =
            value;

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

        this.filteredFinancialYears =
            this.financialYears.filter
            (
                (
                    item:
                        FinancialYearListItem
                ):
                    boolean =>
                {
                    const yearStatusMatches =
                        this.selectedYearStatus === null
                        ||
                        item.YearStatus ===
                        this.selectedYearStatus;

                    const statusMatches =
                        this.selectedStatus === null
                        ||
                        item.Status ===
                        this.selectedStatus;

                    if
                    (
                        !yearStatusMatches
                        ||
                        !statusMatches
                    )
                    {
                        return false;
                    }

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
                        item.FinancialYearCode,
                        item.FinancialYearName,
                        item.StartDateText,
                        item.EndDateText,
                        item.DurationText,
                        item.CurrentText,
                        item.YearStatus,
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
        const field:
            keyof FinancialYearListItem =
            this.sortFieldMap[event.field]
            ??
            (event.field as keyof FinancialYearListItem);

        this.filteredFinancialYears =
        [
            ...this.filteredFinancialYears
        ];

        this.filteredFinancialYears.sort
        (
            (
                a:
                    FinancialYearListItem,
                b:
                    FinancialYearListItem
            ):
                number =>
            {
                const valueA:
                    any =
                    a[field];

                const valueB:
                    any =
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

        this.selectedYearStatus =
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

        this.pagedFinancialYears =
        [
            ...this.filteredFinancialYears.slice
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
    // Resolve Row Id
    //===========================================================

    private getRowId
    (
        item:
            any
    ):
        number
    {
        const id =
            Number(
                item?.FinancialYearId
                ||
                readField(item, 'FinancialYearId')
            );

        if
        (
            !id
            ||
            id <= 0
        )
        {
            console.error(
                '[Financial Years] Row has no id. Row fields:',
                item ? Object.keys(item) : item
            );

            this.toast.error(
                'Missing Id',
                'This financial year has no id from the server, so it cannot be opened.'
            );

            return 0;
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
            FinancialYearListItem
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
            id > 0
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
            FinancialYearListItem
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
            id > 0
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
    //
    // The server blocks (409) deleting the current year or a
    // Closed / Locked year; the message is shown as-is.
    //===========================================================

    delete
    (
        item:
            FinancialYearListItem
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
            id <= 0
        )
        {
            return;
        }

        const name =
            item.FinancialYearName
            ||
            item.FinancialYearCode
            ||
            'this financial year';

        this.confirmDialog.open
        (
            'Delete Financial Year',
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
            number,
        name:
            string
    ):
        void
    {
        this.startProgress(
            'Deleting Financial Year',
            `Please wait while "${name}" is being deleted...`
        );

        this.withMinimumDuration(
            this.financialYearsService.delete(
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
                    'Financial year deleted.',
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
                    'Delete Financial Year Error:',
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
                                    'This financial year cannot be deleted.'
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
                                'This financial year no longer exists. The list has been refreshed.'
                            );

                            this.loadItems();

                            return;
                        }

                        //=======================================
                        // Delete Failed
                        //=======================================

                        this.toast.error(
                            'Delete Failed',
                            'Failed to delete financial year.'
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
            'Restore Financial Year',
            'Are you sure you want to restore the most recently deleted financial year?',
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
            'Restoring Financial Year',
            'Please wait while the most recently deleted financial year is being restored...'
        );

        this.withMinimumDuration(
            this.financialYearsService.restore()
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Financial year restored.',
                    () =>
                    {
                        this.toast.success(
                            'Restore Successful',
                            'The most recently deleted financial year has been restored.'
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
                    'Restore Financial Year Error',
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
                                'There is no deleted financial year record to restore.'
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
                                    'The financial year cannot be restored.'
                                )
                            );

                            return;
                        }

                        this.toast.error(
                            'Restore Failed',
                            'Failed to restore financial year.'
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
        this.financialYearsService
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
                        'Financial Year Management History';

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
                        'Failed to load financial year history.'
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