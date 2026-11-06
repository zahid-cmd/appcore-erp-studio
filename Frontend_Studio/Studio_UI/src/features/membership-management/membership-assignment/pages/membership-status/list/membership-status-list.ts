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
    Membership
}
from '../../../models/membership-status.model';

import
{
    MembershipCard
}
from '../../../../membership-setup/models/membership-cards.model';

import
{
    MembershipCardsService
}
from '../../../../membership-setup/services/membership-cards.service';

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
    MembershipStatusService
}
from '../../../services/membership-status.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'membership-status-list',
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
    templateUrl:'./membership-status-list.html',
    styleUrl:'./membership-status-list.css'
})

//===============================================================
// Membership Status List
//===============================================================

export class MembershipStatusList
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly membershipStatusService =
        inject(MembershipStatusService);


    private readonly membershipCardsService =
        inject(MembershipCardsService);

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
            label:'All Memberships'
        },
        {
            id:'Pending',
            label:'Pending'
        },
        {
            id:'Active',
            label:'Active'
        },
        {
            id:'Expired',
            label:'Expired'
        },
        {
            id:'Suspended',
            label:'Suspended'
        },
        {
            id:'Cancelled',
            label:'Cancelled'
        }
    ];

    selectedTab:
        string =
        'all';

    //===========================================================
    // Data
    //===========================================================

    memberships:
        Membership[] =
    [];

    filteredMemberships:
        Membership[] =
    [];

    pagedMemberships:
        Membership[] =
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
    // Membership Card Filter (cards in the list)
    //===========================================================

    cardFilterItems:
        any[] =
    [
        {
            label:'All Membership Cards',
            value:null
        }
    ];

    selectedCardId:
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
        'Membership Status History';

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
            header:'Membership No',
            field:'MembershipNo',
            width:'120px',
            align:'center'
        },
        {
            header:'Card',
            field:'CardName',
            width:'130px',
            align:'left'
        },
        {
            header:'Customer',
            field:'CustomerName',
            width:'230px',
            align:'left'
        },
        {
            header:'Motor Bike',
            field:'MotorBikeName',
            width:'190px',
            align:'left'
        },
        {
            header:'Chassis No',
            field:'ChassisNo',
            width:'150px',
            align:'center'
        },
        {
            header:'Start',
            field:'StartDisplay',
            width:'105px',
            align:'center'
        },
        {
            header:'Expiry',
            field:'ExpiryDisplay',
            width:'105px',
            align:'center'
        },
        {
            header:'Fee',
            field:'FeeDisplay',
            width:'100px',
            align:'right'
        },
        {
            header:'Free Services',
            field:'FreeServiceDisplay',
            width:'120px',
            align:'center'
        },
        {
            header:'Status',
            field:'Status',
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
        this.buildCardFilter();

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
        const seq =
            ++this.loadSeq;

        this.loading =
            true;

        this.loadFailed =
            false;

        this.membershipStatusService
            .getPaged(this.pageQuery())
            .subscribe
            ({
                next:
                (
                    response:
                        any
                ):
                    void =>
                {
                    if (seq !== this.loadSeq)
                    {
                        return;
                    }

                    // Server page : remember the totals, then the
                    // rows go through the usual mapping below
                    this.totalRecords =
                        Number(response?.totalCount ?? 0);

                    this.counts =
                        response?.counts ?? {};

                    if (Number(response?.page) > 0)
                    {
                        this.currentPage =
                            Number(response.page);
                    }

                    response =
                        response?.items ?? [];

                    // Display values
                    this.memberships =
                        (response ?? []).map
                        (
                            (item: any) =>
                            ({
                                ...item,

                                StartDisplay:
                                    this.dateText(
                                        item.StartDate
                                    ),

                                ExpiryDisplay:
                                    this.dateText(
                                        item.ExpiryDate
                                    ),

                                FeeDisplay:
                                    this.amountText(
                                        item.FeeAmount
                                    ),

                                FreeServiceDisplay:
                                    item.FreeServiceCount + item.CarriedServiceCount > 0
                                        ? `${item.UsedCount} / ${item.FreeServiceCount + item.CarriedServiceCount} taken`
                                        : 'None'
                            } as Membership)
                        );


                    this.showServerPage();

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
                    if (seq !== this.loadSeq)
                    {
                        return;
                    }

                    console.error
                    (
                        'Load Membership Status Error:',
                        error
                    );

                    this.memberships =
                        [];

                    this.filteredMemberships =
                        [];

                    this.pagedMemberships =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error
                    (
                        'Load Failed',
                        'Unable to load memberships.'
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
        // Search, filters and paging run on the server
        this.currentPage =
            1;

        this.loadItems();
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
    // Membership Card Filter
    //===========================================================

    private buildCardFilter():
        void
    {
        // Every membership card (the list holds one page only)
        this.membershipCardsService
            .getAll()
            .subscribe
            ({
                next:
                    (cards: MembershipCard[]): void =>
                    {
                        this.cardFilterItems =
                        [
                            {
                                label:'All Membership Cards',
                                value:null
                            },
                            ...(cards ?? []).map(
                                card =>
                                ({
                                    label:`${card.CardCode} - ${card.CardName}`,
                                    value:Number(card.MembershipCardId)
                                })
                            )
                        ];

                        this.cdr.detectChanges();
                    },

                error:
                    (): void =>
                    {
                        this.cardFilterItems =
                        [
                            {
                                label:'All Membership Cards',
                                value:null
                            }
                        ];
                    }
            });
    }


    onCardFilterChange
    (
        value:
            number | null
    ):
        void
    {
        this.selectedCardId =
            value === null
            ||
            value === undefined
                ? null
                : Number(value);

        this.applyFilters();
    }


    //===========================================================
    // Date display ("2026-10-21" -> "21-Oct-2026")
    //===========================================================

    private dateText
    (
        value:
            string
    ):
        string
    {
        const match =
            /^(\d{4})-(\d{2})-(\d{2})$/.exec(
                value ?? ''
            );

        if
        (
            !match
        )
        {
            return '-';
        }

        const months =
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return `${match[3]}-${months[Number(match[2]) - 1]}-${match[1]}`;
    }


    //===========================================================
    // Amount display (0.00)
    //===========================================================

    private amountText
    (
        value:
            number
    ):
        string
    {
        return Number(value ?? 0).toLocaleString(
            'en-US',
            {
                minimumFractionDigits:2,
                maximumFractionDigits:2
            }
        );
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
        this.searchText =
            '';

        this.selectedTab =
            'all';

        this.selectedStatus =
            null;

        this.selectedCardId =
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
        // The server sends one page
        this.pagedMemberships =
        [
            ...this.filteredMemberships
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

        this.loadItems();
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

        this.loadItems();
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
            Membership
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',
                item.PublicId
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
            Membership
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',
                item.PublicId
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
            Membership
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
            'Delete Membership',
            `Are you sure you want to delete the membership ${item.MembershipNo} (${item.ChassisNo})? Only a Pending membership can be deleted.`,
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
            Membership
    ):
        void
    {
        this.startProgress(
            'Deleting Membership',
            `Please wait while "${item.CardName}" is being deleted...`
        );

        this.withMinimumDuration(
            this.membershipStatusService.delete(
                item.PublicId ?? ''
            )
        )
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.completeProgress(

                        'Membership deleted.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',
                                `Membership ${item.MembershipNo} deleted successfully.`
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
                        'Delete Membership Error:',
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
                                        'Only a Pending membership can be deleted.'
                                    )
                                );

                                return;
                            }

                            this.toast.error
                            (
                                'Delete Failed',
                                'Failed to delete membership.'
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
            'Restore Membership',
            'Are you sure you want to restore the most recently deleted membership?',
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
            'Restoring Membership',
            'Please wait while the most recently deleted membership is being restored...'
        );

        this.withMinimumDuration(
            this.membershipStatusService.restore()
        )
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.completeProgress(

                        'Membership restored.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Restore Successful',
                                'The most recently deleted membership has been restored.'
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
                        'Restore Membership Error:',
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
                                    'There is no deleted membership record to restore.'
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
                                        'The membership cannot be restored.'
                                    )
                                );

                                return;
                            }

                            this.toast.error
                            (
                                'Restore Failed',
                                'Failed to restore membership.'
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
        this.membershipStatusService
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
                        'Membership Status History';

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
                        'Failed to load membership history.'
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


    //===========================================================
    // Summary Line (below the canvas) : memberships by status
    // (all records)
    //===========================================================

    get summaryTotal():
        number
    {
        // Server counts : card and search applied
        return Number(this.counts['All'] ?? 0);
    }

    summaryCount(
        status: string
    ):
        number
    {
        const key =
            Object.keys(this.counts).find(k => k.toLowerCase() === status.toLowerCase());

        return key ? Number(this.counts[key] ?? 0) : 0;
    }

    summaryText(
        value: number
    ):
        string
    {
        return value.toLocaleString('en-US');
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
            tab:this.selectedTab,
            cardId:this.selectedCardId ?? undefined
        };
    }


    // The rows of the page arrive already filtered and sorted
    private showServerPage():
        void
    {
        this.filteredMemberships =
            this.memberships;

        this.updatePagination();
    }
}
