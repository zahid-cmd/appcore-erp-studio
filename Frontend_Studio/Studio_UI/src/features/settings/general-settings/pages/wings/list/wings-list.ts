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
    Wing
}
from '../../../models/wings.model';

import
{
    Company
}
from '../../../models/company.model';


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


//===============================================================
// Services
//===============================================================

import
{
    WingsService
}
from '../../../services/wings.service';

import
{
    CompanyService
}
from '../../../services/company.service';


//===============================================================
// List Item
//===============================================================

interface WingListItem
extends Wing
{
    CompanyName:
        string;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'wings-list',

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

        ToastComponent
    ],

    templateUrl:'./wings-list.html',

    styleUrl:'./wings-list.css'
})


//===============================================================
// Wings List
//===============================================================

export class WingsList
implements OnInit, OnDestroy
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly wingsService =
        inject(WingsService);


    private readonly companyService =
        inject(CompanyService);


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

            label:'All Wings'
        }
    ];


    selectedTab:
        string =
        'all';


    //===========================================================
    // Data
    //===========================================================

    wings:
        WingListItem[] =
    [];

    // Summary line below the canvas (all records)
    summaryItems:
        {
            label:string;
            value:string;
            tone:'' | 'ok' | 'bad';
        }[] =
    [];


    filteredWings:
        WingListItem[] =
    [];


    pagedWings:
        WingListItem[] =
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
    // Company Lookup
    //===========================================================

    private companyMap:
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


    // Prevents a second Delete / Restore while one is running
    isProcessing:
        boolean =
        false;


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
        'Wing History';


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
            header:'Company',

            field:'CompanyName',

            width:'280px',

            align:'left'
        },

        {
            header:'Wing Code',

            field:'WingCode',

            width:'280px',

            align:'center'
        },

        {
            header:'Wing Name',

            field:'WingName',

            align:'left'
        },

        {
            header:'Remarks',

            field:'Remarks',

            width:'350px',

            align:'left'
        },

        {
            header:'Status',

            field:'IsActive',

            width:'200px',

            align:'center',

            type:'status'
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
    // Normalize Wing
    //===========================================================

    private normalizeWing
    (
        item:
            any
    ):
        WingListItem
    {
        const companyId:
            number =
            Number
            (
                item?.CompanyId
                ??
                item?.companyId
                ??
                0
            );


        return {
            WingId:
                Number
                (
                    item?.WingId
                    ??
                    item?.wingId
                    ??
                    0
                ),

            // The id used in links and API calls (uuid v7)
            PublicId:
                String(item?.PublicId ?? item?.publicId ?? ''),

            CompanyId:
                companyId,

            CompanyName:
                this.getCompanyName(
                    companyId
                ),

            WingCode:
                item?.WingCode
                ??
                item?.wingCode
                ??
                '',

            WingName:
                item?.WingName
                ??
                item?.wingName
                ??
                '',

            Remarks:
                item?.Remarks
                ??
                item?.remarks
                ??
                '',

            IsActive:
                Boolean
                (
                    item?.IsActive
                    ??
                    item?.isActive
                    ??
                    true
                )
        };
    }


    //===========================================================
    // Normalize Wings
    //===========================================================

    private normalizeWings
    (
        response:
            any
    ):
        WingListItem[]
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
                this.normalizeWing(
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

        this.companyService
            .getAll()
            .subscribe
            ({
                next:
                (
                    companies:
                        Company[]
                ):
                    void =>
                {
                    this.buildCompanyMap(
                        companies
                    );


                    this.loadWings();
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


                    this.companyMap =
                        new Map<number, string>();


                    //===================================================
                    // Still Load Wings
                    //===================================================

                    this.loadWings();
                }
            });
    }


    //===========================================================
    // Build Company Map
    //===========================================================

    private buildCompanyMap
    (
        companies:
            Company[]
    ):
        void
    {
        this.companyMap =
            new Map<number, string>();


        companies.forEach
        (
            company =>
            {
                const companyId:
                    number =
                    Number(
                        company.CompanyId
                    );


                const companyName:
                    string =
                    company.CompanyName
                    ??
                    '';


                //=======================================================
                // Display Company Name Only
                //=======================================================

                const displayName:
                    string =
                    companyName
                    ||
                    String(companyId);


                this.companyMap.set
                (
                    companyId,

                    displayName
                );
            }
        );
    }


    //===========================================================
    // Load Wings
    //===========================================================

    private loadWings():
        void
    {
        const seq =
            ++this.loadSeq;

        this.wingsService
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

                    this.wings =
                        this.normalizeWings(
                            response
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

                    console.error
                    (
                        'Load Wings Error:',
                        error
                    );


                    this.wings =
                        [];


                    this.filteredWings =
                        [];


                    this.pagedWings =
                        [];


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load wings.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Get Company Name
    //===========================================================

    getCompanyName
    (
        companyId:
            number
    ):
        string
    {
        return this.companyMap.get(
            Number(companyId)
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
        // Search, filters and paging run on the server
        this.currentPage =
            1;

        this.loadWings();
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

        this.loadWings();
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
        // The server sends one page
        this.pagedWings =
        [
            ...this.filteredWings
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


        this.loadWings();
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


        this.loadWings();
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
            WingListItem
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


    //===========================================================
    // Edit
    //===========================================================

    edit
    (
        item:
            WingListItem
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
            WingListItem
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
            'Delete Wing',

            `Are you sure you want to delete "${item.WingName}" ?`,

            (): void =>
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
            WingListItem
    ):
        void
    {
        this.startProgress(
            'Deleting Wing',

            `Please wait while "${item.WingName}" is being deleted...`
        );


        this.withMinimumDuration(
            this.wingsService.delete(
                item.PublicId ?? ''
            )
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(

                        'Wing deleted.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',

                                `${item.WingName} deleted successfully.`
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
                        'Delete Wing Error:',
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
                                    'Wing cannot be deleted because it is already configured.';


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

                                'Failed to delete wing.'
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
            'Restore Wing',

            'Are you sure you want to restore the most recently deleted wing?',

            (): void =>
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
            'Restoring Wing',

            'Please wait while the most recently deleted wing is being restored...'
        );


        this.withMinimumDuration(
            this.wingsService.restore()
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(

                        'Wing restored.',

                        () =>
                        {
                            this.toast.success
                            (
                                'Restore Successful',

                                'The most recently deleted wing has been restored.'
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
                        'Restore Wing Error',

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

                                    'There is no deleted wing record to restore.'
                                );


                                return;
                            }


                            this.toast.error
                            (
                                'Restore Failed',

                                'Failed to restore wing.'
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
        this.wingsService
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
                        'Wing Management History';


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

                        'Failed to load wing history.'
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
            dir:this.sortDirection
        };
    }


    // The rows of the page arrive already filtered and sorted
    private showServerPage():
        void
    {
        this.filteredWings =
            this.wings;

        this.updatePagination();
    }
}
