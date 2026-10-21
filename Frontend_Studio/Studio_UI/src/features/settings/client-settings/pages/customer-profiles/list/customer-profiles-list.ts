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
    Customer,
    CustomerProfilesDefaults
}
from '../../../models/customer-profiles.model';

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
    CustomerProfilesService
}
from '../../../services/customer-profiles.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'customer-profiles-list',
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
    templateUrl:'./customer-profiles-list.html',
    styleUrl:'./customer-profiles-list.css'
})

//===============================================================
// Customer Profiles List
//===============================================================

export class CustomerProfilesList
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly customerProfilesService =
        inject(CustomerProfilesService);

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
            id:'inbound',
            label:'Inbound Customers'
        },
        {
            id:'outside',
            label:'Outside Customers'
        }
    ];

    // inbound : bought a bike from us; outside : services only
    selectedTab:
        string =
        'inbound';

    //===========================================================
    // Data
    //===========================================================

    customers:
        Customer[] =
    [];

    filteredCustomers:
        Customer[] =
    [];

    pagedCustomers:
        Customer[] =
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
    // Location Filter
    //===========================================================

    locationFilterItems:
        any[] =
    [
        {
            label:'All Locations',
            value:null
        }
    ];

    selectedLocationId:
        number | null =
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
        'Customer Profiles History';

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
            header:'Customer Code',
            field:'CustomerCode',
            width:'130px',
            align:'center'
        },
        {
            header:'Customer Name',
            field:'CustomerName',
            width:'220px',
            align:'left'
        },
        {
            header:'Phone 1',
            field:'Phone1',
            width:'130px',
            align:'center'
        },
        {
            header:'Location',
            field:'LocationName',
            width:'200px',
            align:'left'
        },
        {
            header:'Receivable Ledger',
            field:'ReceivableLedgerCode',
            width:'190px',
            align:'center'
        },
        {
            header:'Status',

            field:'IsActive',
            type:'status',
            width:'100px',
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
        this.loadLocations();

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

        this.customerProfilesService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        Customer[]
                ):
                    void =>
                {
                    this.customers =
                        response ?? [];

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
                        'Load Customers Error:',
                        error
                    );

                    this.customers =
                        [];

                    this.filteredCustomers =
                        [];

                    this.pagedCustomers =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error
                    (
                        'Load Failed',
                        'Unable to load customers.'
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

        this.filteredCustomers =
            this.customers.filter
            (
                item =>
                {
                    const tabMatch =
                        (
                            this.selectedTab === 'outside'
                                ? item.CustomerType === 'Outside'
                                : item.CustomerType === 'Inbound'
                        )
                        &&
                        (
                            this.selectedLocationId === null
                            ||
                            Number(item.LocationId) ===
                            this.selectedLocationId
                        );

                    const statusMatch =
                        this.selectedStatus === null
                        ||
                        item.IsActive ===
                        this.selectedStatus;

                    const text =
                        [
                            item.CustomerCode,
                            item.PreviousCode,
                            item.CustomerName,
                            item.Phone1,
                            item.Phone2,
                            item.NidNo,
                            item.LocationName,
                            item.ReceivableLedgerCode,
                            item.Remarks,
                            item.IsActive
                                ? 'active'
                                : 'inactive'
                        ]
                        .join(' ')
                        .toLowerCase();

                    return tabMatch
                        &&
                        statusMatch
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
    // Location Filter Change
    //===========================================================

    onLocationFilterChange
    (
        value:
            number | null
    ):
        void
    {
        this.selectedLocationId =
            value === null
            ||
            value === undefined
                ? null
                : Number(value);

        this.applyFilters();
    }

    //===========================================================
    // Load Locations (for the filter)
    //===========================================================

    private loadLocations():
        void
    {
        this.customerProfilesService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        CustomerProfilesDefaults
                ):
                    void =>
                {
                    this.locationFilterItems =
                    [
                        {
                            label:'All Locations',
                            value:null
                        },

                        ...(response.Locations ?? []).map(
                            option =>
                            ({
                                label:
                                    option.DisplayName,

                                value:
                                    Number(option.LocationId)
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
                        'Load Customer Locations Error:',
                        error
                    );
                }
            });
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
        const direction =
            event.direction === 'asc'
                ? 1
                : -1;

        this.filteredCustomers =
        [
            ...this.filteredCustomers
        ]
        .sort
        (
            (a: any, b: any): number =>
            {
                const valueA =
                    a[event.field];

                const valueB =
                    b[event.field];

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
            'inbound';

        this.selectedStatus =
            null;

        this.selectedLocationId =
            null;

        this.currentPage =
            1;

        this.loadLocations();

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

        this.pagedCustomers =
        [
            ...this.filteredCustomers.slice
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
        // Opens the form on the type of the current tab
        void this.router.navigate
        (
            [
                'add'
            ],
            {
                relativeTo:
                    this.route.parent,

                queryParams:
                {
                    type:
                        this.selectedTab === 'outside'
                            ? 'Outside'
                            : 'Inbound'
                }
            }
        );
    }

    view
    (
        item:
            Customer
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',
                item.CustomerId
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
            Customer
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',
                item.CustomerId
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
            Customer
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
            'Delete Customer',
            `Are you sure you want to delete "${item.DisplayName}" and its receivable ledger ${item.ReceivableLedgerCode}?`,
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
            Customer
    ):
        void
    {
        this.startProgress(
            'Deleting Customer',
            `Please wait while "${item.DisplayName}" is being deleted...`
        );

        this.withMinimumDuration(
            this.customerProfilesService.delete(
                item.CustomerId
            )
        )
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.completeProgress(

                        'Customer deleted.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',
                                `${item.DisplayName} deleted successfully.`
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
                        'Delete Customer Error:',
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
                                        'Customer cannot be deleted because it is already in use.'
                                    )
                                );

                                return;
                            }

                            this.toast.error
                            (
                                'Delete Failed',
                                'Failed to delete customer.'
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
            'Restore Customer',
            'Are you sure you want to restore the most recently deleted customer?',
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
            'Restoring Customer',
            'Please wait while the most recently deleted customer is being restored...'
        );

        this.withMinimumDuration(
            this.customerProfilesService.restore()
        )
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.completeProgress(

                        'Customer restored.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Restore Successful',
                                'The most recently deleted customer has been restored.'
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
                        'Restore Customer Error:',
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
                                    'There is no deleted customer record to restore.'
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
                                        'The customer cannot be restored.'
                                    )
                                );

                                return;
                            }

                            this.toast.error
                            (
                                'Restore Failed',
                                'Failed to restore customer.'
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
        this.customerProfilesService
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
                        'Customer Profiles History';

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
                        'Failed to load customer history.'
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