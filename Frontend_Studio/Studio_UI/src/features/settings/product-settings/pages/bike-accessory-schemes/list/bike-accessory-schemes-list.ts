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
    switchMap,
    Subscription
}
from 'rxjs';


//===============================================================
// Models
//===============================================================

import
{
    BikeAccessorySchemes,
    BikeAccessorySchemesDefaults,
    BikeAccessorySchemesPageQuery
}
from '../../../models/bike-accessory-schemes.model';

import
{
    PagedResult
}
from '../../../../../../shared/paging/paged-result.model';


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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

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
// Service
//===============================================================

import
{
    BikeAccessorySchemesService
}
from '../../../services/bike-accessory-schemes.service';


//===============================================================
// Grid row : the record plus display texts
//===============================================================

type BikeAccessorySchemesRow =
    BikeAccessorySchemes
    &
    {
        ValidText:string;

        ItemsCountText:string;
    };

const MONTHS =
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// '2026-11-06' → '06 Nov 2026'
function showDay
(
    value:
        string | null | undefined
):
    string
{
    const parts =
        String(value ?? '').slice(0, 10).split('-');

    if (parts.length !== 3)
    {
        return '';
    }

    return `${parts[2]} ${MONTHS[Number(parts[1]) - 1] ?? ''} ${parts[0]}`;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'bike-accessory-schemes-list',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        ControlTabsComponent,
        SearchDropdownComponent,
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

    templateUrl:'./bike-accessory-schemes-list.html',

    styleUrl:'./bike-accessory-schemes-list.css'
})


//===============================================================
// Bike Accessory Schemes List
//===============================================================

export class BikeAccessorySchemesList
implements OnInit, OnDestroy
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly schemesService =
        inject(BikeAccessorySchemesService);

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
    // Page Tabs : All / Additional / Promotional / Expired
    //===========================================================

    tabs:
        ControlTab[] =
    [
        { id:'all', label:'All Schemes' },
        { id:'Additional', label:'Additional' },
        { id:'Promotional', label:'Promotional' },
        { id:'Expired', label:'Expired' }
    ];

    selectedTab:
        string =
        'all';



    //===========================================================
    // Toolbar Filter : Brand
    //===========================================================

    brandFilterItems:
        any[] =
        [{ label:'All Brands', value:null }];

    selectedBrandId:
        number | null =
        null;



    //===========================================================
    // Data
    //===========================================================

    rows:
        BikeAccessorySchemesRow[] =
    [];

    totalRecords:
        number =
        0;

    summaryItems:
        {
            label:string;
            value:string;
            tone:'' | 'ok' | 'bad';
        }[] =
    [];

    private loadSubscription?:
        Subscription;

    private sortField:
        string =
        '';

    private sortDirection:
        'asc' | 'desc' =
        'asc';

    private searchTimer?:
        number;

    private readonly SEARCH_DELAY_MS:
        number =
        300;



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
        'Bike Accessory Schemes History';

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
        { header:'#', field:'serial', type:'serial', width:'60px', align:'center' },
        { header:'Code', field:'SchemeCode', width:'110px', align:'center' },
        { header:'Scheme Name', field:'SchemeName', align:'left' },
        { header:'Accessory Type', field:'SchemeKind', width:'140px', align:'center' },
        { header:'Source', field:'SchemeSource', width:'110px', align:'center' },
        { header:'Brand', field:'BrandName', width:'150px', align:'left' },
        { header:'Models', field:'ModelsText', width:'240px', align:'left' },
        { header:'Valid', field:'ValidText', width:'230px', align:'center' },
        { header:'Items', field:'ItemsCountText', width:'90px', align:'center' },
        { header:'Status', field:'Status', type:'status', width:'130px', align:'center' },
        { header:'Actions', field:'actions', type:'actions', width:'130px', align:'center' }
    ];



    //===========================================================
    // Initialize / Destroy
    //===========================================================

    ngOnInit():
        void
    {
        this.loadFilterLookups();

        this.loadItems();
    }


    ngOnDestroy():
        void
    {
        this.clearSearchTimer();

        this.loadSubscription?.unsubscribe();

        this.clearProgressTimer();

        if (this.isProcessing)
        {
            this.progressDialog.close();
        }
    }



    //===========================================================
    // Filter Lookups (brands from Defaults)
    //===========================================================

    private loadFilterLookups():
        void
    {
        this.schemesService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    defaults:
                        BikeAccessorySchemesDefaults
                ): void =>
                {
                    this.brandFilterItems =
                    [
                        { label:'All Brands', value:null },

                        ...(defaults.Brands ?? [])
                            .map(
                                x =>
                                ({
                                    label:x.BrandName,
                                    value:x.BrandManagementId
                                })
                            )
                            .filter(x => x.value > 0)
                    ];

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error('Load Scheme Filters Error', error);
                }
            });
    }


    onBrandFilterChange
    (
        value:
            number | null
    ):
        void
    {
        this.selectedBrandId =
            Number(value) > 0 ? Number(value) : null;

        this.reload();
    }


    onTabChange
    (
        tabId:
            string
    ):
        void
    {
        this.selectedTab =
            tabId || 'all';

        this.reload();
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
                        Math.round(this.progressValue)
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
        if (this.progressTimer)
        {
            clearInterval(this.progressTimer);

            this.progressTimer =
                undefined;
        }
    }


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
    // Row texts
    //===========================================================

    private toRow
    (
        item:
            BikeAccessorySchemes
    ):
        BikeAccessorySchemesRow
    {
        const validText =
            item.ValidTo
                ? `${showDay(item.ValidFrom)} – ${showDay(item.ValidTo)}`
                : `From ${showDay(item.ValidFrom)}`;

        return {
            ...item,

            ValidText:
                item.Validity && item.Validity !== 'Running'
                    ? `${validText} (${item.Validity})`
                    : validText,

            ItemsCountText:
                String(item.ItemCount ?? item.Items.length)
        };
    }



    //===========================================================
    // Load Items (one page from the server)
    //===========================================================

    loadItems():
        void
    {
        this.loadSubscription?.unsubscribe();

        this.loading =
            true;

        this.loadFailed =
            false;

        this.cdr.detectChanges();

        const tab =
            this.selectedTab;

        const query:
            BikeAccessorySchemesPageQuery =
        {
            page:
                this.currentPage,

            pageSize:
                this.pageSize,

            search:
                this.searchText.trim(),

            sort:
                this.sortField,

            dir:
                this.sortDirection,

            status:
                null,

            schemeKind:
                tab === 'Additional' || tab === 'Promotional'
                    ? tab
                    : null,

            validity:
                tab === 'Expired'
                    ? 'Expired'
                    : null,

            brandManagementId:
                this.selectedBrandId
        };

        this.loadSubscription =
            this.schemesService
                .getPaged(query)
                .subscribe
                ({
                    next:
                    (
                        response:
                            PagedResult<BikeAccessorySchemes>
                    ):
                        void =>
                    {
                        this.rows =
                            response.items.map(x => this.toRow(x));

                        this.totalRecords =
                            response.totalCount;

                        this.currentPage =
                            response.page;

                        this.updateSummary(
                            response.counts
                        );

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
                        console.error('Load Bike Accessory Schemes Error:', error);

                        this.rows =
                            [];

                        this.totalRecords =
                            0;

                        this.loading =
                            false;

                        this.loadFailed =
                            true;

                        this.toast.error
                        (
                            'Load Failed',
                            'Unable to load bike accessory schemes.'
                        );

                        this.cdr.detectChanges();
                    }
                });
    }


    private reload():
        void
    {
        this.currentPage =
            1;

        this.loadItems();
    }



    //===========================================================
    // Summary Line (below the canvas)
    //===========================================================

    private updateSummary
    (
        counts:
            Record<string, number>
    ):
        void
    {
        const value =
            (key: string): string =>
                Number(counts[key] ?? 0).toLocaleString('en-US');

        this.summaryItems =
        [
            { label:'Total', value:value('Total'), tone:'' },
            { label:'Active', value:value('Active'), tone:'ok' },
            { label:'Inactive', value:value('Inactive'), tone:'bad' }
        ];
    }



    //===========================================================
    // Search (asks the server 300 ms after the last key)
    //===========================================================

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText =
            value ?? '';

        this.clearSearchTimer();

        this.searchTimer =
            window.setTimeout(
                () =>
                {
                    this.searchTimer =
                        undefined;

                    this.reload();
                },
                this.SEARCH_DELAY_MS
            );
    }


    private clearSearchTimer():
        void
    {
        if (this.searchTimer)
        {
            clearTimeout(this.searchTimer);

            this.searchTimer =
                undefined;
        }
    }



    //===========================================================
    // Sort (the server sorts)
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
        const sortAlias:
            Record<string, string> =
        {
            ValidText:'ValidFrom',
            ModelsText:'SchemeName',
            ItemsCountText:'SchemeName'
        };

        this.sortField =
            sortAlias[event.field] ?? event.field;

        this.sortDirection =
            event.direction === 'desc'
                ? 'desc'
                : 'asc';

        this.reload();
    }



    //===========================================================
    // Refresh
    //===========================================================

    refresh():
        void
    {
        this.clearSearchTimer();

        this.searchText =
            '';

        this.sortField =
            '';

        this.sortDirection =
            'asc';

        this.selectedBrandId =
            null;

        this.selectedTab =
            'all';

        this.reload();
    }



    //===========================================================
    // Pagination
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


    onPageSizeChange
    (
        size:
            number
    ):
        void
    {
        this.pageSize =
            size;

        this.reload();
    }



    //===========================================================
    // Add / View / Edit
    //===========================================================

    add():
        void
    {
        void this.router.navigate(['add'], { relativeTo:this.route.parent });
    }


    view
    (
        item:
            BikeAccessorySchemes
    ):
        void
    {
        void this.router.navigate(['view', item.PublicId], { relativeTo:this.route.parent });
    }


    edit
    (
        item:
            BikeAccessorySchemes
    ):
        void
    {
        void this.router.navigate(['edit', item.PublicId], { relativeTo:this.route.parent });
    }



    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        item:
            BikeAccessorySchemes
    ):
        void
    {
        if (this.isProcessing)
        {
            return;
        }

        this.confirmDialog.open
        (
            'Delete Bike Accessory Scheme',
            `Are you sure you want to delete "${item.SchemeName}" ?`,
            (): void =>
            {
                setTimeout(
                    () =>
                        this.deleteItem(item)
                );
            }
        );
    }


    private deleteItem
    (
        item:
            BikeAccessorySchemes
    ):
        void
    {
        this.startProgress(
            'Deleting Bike Accessory Scheme',
            `Please wait while "${item.SchemeName}" is being deleted...`
        );

        this.withMinimumDuration(
            this.schemesService.delete(item.PublicId ?? '')
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(
                        'Scheme deleted.',
                        () =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',
                                `${item.SchemeName} deleted successfully.`
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
                    console.error('Delete Bike Accessory Scheme Error:', error);

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
                                    this.errorText(error, 'The scheme cannot be deleted.')
                                );

                                return;
                            }

                            this.toast.error
                            (
                                'Delete Failed',
                                'Failed to delete the bike accessory scheme.'
                            );
                        }
                    );
                }
            });
    }



    //===========================================================
    // Restore (the most recently deleted)
    //===========================================================

    restore():
        void
    {
        if (this.isProcessing)
        {
            return;
        }

        this.confirmDialog.open
        (
            'Restore Bike Accessory Scheme',
            'Are you sure you want to restore the most recently deleted scheme?',
            (): void =>
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
            'Restoring Bike Accessory Scheme',
            'Please wait while the most recently deleted scheme is being restored...'
        );

        this.withMinimumDuration(
            this.schemesService.restore()
        )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.completeProgress(
                        'Scheme restored.',
                        () =>
                        {
                            this.toast.success
                            (
                                'Restore Successful',
                                'The most recently deleted scheme has been restored.'
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
                    console.error('Restore Bike Accessory Scheme Error', error);

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
                                    'There is no deleted scheme to restore.'
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
                                    this.errorText(error, 'The scheme cannot be restored.')
                                );

                                return;
                            }

                            this.toast.error
                            (
                                'Restore Failed',
                                'Failed to restore the bike accessory scheme.'
                            );
                        }
                    );
                }
            });
    }


    private errorText
    (
        error:
            HttpErrorResponse,

        fallback:
            string
    ):
        string
    {
        if (typeof error.error === 'string' && error.error.trim())
        {
            return error.error;
        }

        return error.error?.message ?? error.error?.title ?? fallback;
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
                                    history.activityTitle ?? history.ActivityTitle,

                                description:
                                    history.activityDescription ?? history.ActivityDescription,

                                user:
                                    history.performedByName ?? history.PerformedByName ?? 'System',

                                dateTime:
                                    new Date(history.performedDate ?? history.PerformedDate).toLocaleString(),

                                badge:
                                    history.activityType ?? history.ActivityType
                            })
                        );

                    this.historyTitle =
                        'Bike Accessory Schemes History';

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
                    console.error('History Load Failed:', error);

                    this.toast.error
                    (
                        'History',
                        'Failed to load the scheme history.'
                    );
                }
            });
    }


    closeHistory():
        void
    {
        this.historyOpened =
            false;
    }

}
