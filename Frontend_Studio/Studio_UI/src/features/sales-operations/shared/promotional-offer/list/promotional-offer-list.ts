//===============================================================
// Promotional Offers - Sales Center / Service Center / Accessory
// Shop : list (shared; each page's wrapper gives its config).
// Hand-written : NEVER run Code Sync for these pages.
//
// AppCore list standard : server paging (tab = status, brand
// filter, search, sort), summary line below the canvas, View /
// Edit / Delete + Activate / Close / Cancel row actions (no
// row History, owner 2026-11-13), Add / Refresh / Restore and
// the page History.
//===============================================================


//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
    inject
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    HttpErrorResponse
}
from '@angular/common/http';

import
{
    Observable
}
from 'rxjs';

import
{
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    PROMOTIONAL_OFFER_PAGE
}
from '../promotional-offer.config';

import
{
    PromotionalOfferListItem
}
from '../promotional-offer.model';

import
{
    PromotionalOfferService
}
from '../promotional-offer.service';

import
{
    PageHeaderComponent
}
from '../../../../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    PageCanvasComponent,
    PageCanvasConfig
}
from '../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    SearchBoxComponent
}
from '../../../../../shared/components/utilities/search-box/search-box';

import
{
    CommandCenterComponent
}
from '../../../../../shared/components/utilities/command-center/command-center';

import
{
    ListTableComponent,
    ListTableColumn,
    ListTableRowAction,
    ListTableRowActionEvent
}
from '../../../../../shared/components/layout/list-table/list-table';

import
{
    PaginationComponent
}
from '../../../../../shared/components/controls/pagination/pagination';

import
{
    HistoryDrawerComponent
}
from '../../../../../shared/components/utilities/history-drawer/history-drawer';

import
{
    ConfirmDialogComponent
}
from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ConfirmDialogService
}
from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    ProgressDialogComponent
}
from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

import
{
    ProgressRunner
}
from '../../../../../shared/components/utilities/progress-dialog/progress-runner';

import
{
    ToastService
}
from '../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../shared/components/utilities/toast/toast';

import
{
    TextboxComponent
}
from '../../../../../shared/components/controls/textbox/textbox';

import
{
    SearchDropdownComponent
}
from '../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../shared/components/controls/control-tabs/control-tabs';


//===============================================================
// Row with display texts
//===============================================================

type OfferRow =
    PromotionalOfferListItem
    &
    {
        PeriodText:string;
        StatusText:string;
    };

const MONTHS =
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


@Component(
{
    selector:'promotional-offer-list',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        ToastComponent,
        TextboxComponent,
        SearchDropdownComponent,
        ControlTabsComponent
    ],

    templateUrl:'./promotional-offer-list.html',

    styleUrl:'./promotional-offer-list.css'
})

export class PromotionalOfferList
    implements OnInit, OnDestroy
{
    readonly page =
        inject(PROMOTIONAL_OFFER_PAGE);

    private readonly service =
        inject(PromotionalOfferService);

    private readonly router =
        inject(Router);

    private readonly route =
        inject(ActivatedRoute);

    private readonly toast =
        inject(ToastService);

    private readonly confirm =
        inject(ConfirmDialogService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges()
        );


    //===========================================================
    // Tabs (status) and filters
    //===========================================================

    readonly tabs: ControlTab[] =
    [
        { id:'all', label:'All Offers' },
        { id:'Draft', label:'Draft' },
        { id:'Active', label:'Active' },
        { id:'Closed', label:'Closed' },
        { id:'Cancelled', label:'Cancelled' }
    ];

    selectedTab = 'all';

    searchText = '';

    // Brand filter (stable array, built once)
    brandItems: { label:string; value:number | null }[] =
    [
        { label:'All Brands', value:null }
    ];

    selectedBrandId: number | null = null;


    //===========================================================
    // Data (server paging)
    //===========================================================

    loading = false;

    loadFailed = false;

    rows: OfferRow[] = [];

    totalRecords = 0;

    currentPage = 1;

    pageSize = 10;

    private counts: Record<string, number> = {};

    private sortField = '';

    private sortDirection: 'asc' | 'desc' = 'asc';

    private searchTimer: ReturnType<typeof setTimeout> | null = null;

    // Answers of older calls are dropped
    private loadSeq = 0;

    readonly canvasConfig: PageCanvasConfig =
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

    readonly columns: ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Offer No', field:'OfferNo', width:'110px', align:'left', sortable:true },
        { header:'Offer Name', field:'OfferName', width:'220px', align:'left', sortable:true },
        { header:'Offer Type', field:'OfferType', width:'130px', align:'left', sortable:true },
        { header:'Brand', field:'BrandName', width:'120px', align:'left', sortable:true, priority:2 },
        { header:'Funded By', field:'FundedBy', width:'100px', align:'center', sortable:true, priority:3 },
        { header:'Period', field:'PeriodText', width:'200px', align:'center', sortable:true },
        { header:'Benefit', field:'BenefitText', width:'150px', align:'left' },
        { header:'Covers', field:'TargetsText', width:'220px', align:'left', priority:2 },
        { header:'Status', field:'StatusText', type:'status', width:'140px', align:'center', sortable:true },
        { header:'Actions', field:'actions', type:'actions', width:'180px', align:'center' }
    ];

    // Before View / Edit / Delete
    readonly rowActions: ListTableRowAction[] =
    [
        { key:'activate', icon:'fas fa-circle-play', title:'Activate (invoices apply it from its start date)', tone:'success', visible:(r: OfferRow) => r.Status === 'Draft' },
        { key:'close', icon:'fas fa-flag-checkered', title:'Close the offer today', tone:'primary', visible:(r: OfferRow) => r.Status === 'Active' },
        { key:'cancel', icon:'fas fa-ban', title:'Cancel the offer', tone:'danger', visible:(r: OfferRow) => r.Status === 'Draft' || r.Status === 'Active' }
    ];

    readonly tableActions =
        { view:true, edit:true, delete:true };


    //===========================================================
    // History drawer
    //===========================================================

    historyOpened = false;

    historyTitle = '';

    historyItems: any[] = [];


    //===========================================================
    // Close / Cancel reason modal
    //===========================================================

    reasonRow: OfferRow | null = null;

    reasonAction: 'close' | 'cancel' = 'cancel';

    reasonText = '';

    reasonError = '';


    //===========================================================
    // Initialize / Destroy
    //===========================================================

    ngOnInit(): void
    {
        const state = history.state ?? {};

        if (state.poNotice)
        {
            setTimeout(() => this.toast.success(this.page.title, String(state.poNotice)));
        }

        this.loadBrands();

        this.loadItems();
    }

    ngOnDestroy(): void
    {
        if (this.searchTimer)
        {
            clearTimeout(this.searchTimer);
        }

        this.loadSeq++;
    }


    //===========================================================
    // Helpers
    //===========================================================

    private dateText(value: string): string
    {
        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

        return match
            ? `${match[3]}-${MONTHS[Number(match[2]) - 1]}-${match[1]}`
            : '-';
    }

    private errorText(error: unknown, fallback: string): string
    {
        const e = error as HttpErrorResponse;

        return e?.error?.message
            || (typeof e?.error === 'string' ? e.error : '')
            || fallback;
    }

    private get parent(): ActivatedRoute
    {
        return this.route.parent ?? this.route;
    }


    //===========================================================
    // Load
    //===========================================================

    private loadBrands(): void
    {
        this.service
            .getDefaults(this.page.apiPath)
            .subscribe
            ({
                next:
                    defaults =>
                    {
                        this.brandItems =
                        [
                            { label:'All Brands', value:null },
                            ...defaults.Brands.map(b => ({ label:b.Name, value:b.Id }))
                        ];

                        this.cdr.detectChanges();
                    },
                error:
                    () => {}
            });
    }

    loadItems(): void
    {
        const seq = ++this.loadSeq;

        this.loading = true;

        this.loadFailed = false;

        this.cdr.detectChanges();

        this.service
            .getPaged(
                this.page.apiPath,
                {
                    page:this.currentPage,
                    pageSize:this.pageSize,
                    search:this.searchText,
                    sort:this.sortField,
                    dir:this.sortDirection,
                    tab:this.selectedTab,
                    brandId:this.selectedBrandId
                })
            .subscribe
            ({
                next:
                    result =>
                    {
                        if (seq !== this.loadSeq)
                        {
                            return;
                        }

                        this.totalRecords = result.totalCount;

                        this.counts = result.counts ?? {};

                        if (result.page > 0)
                        {
                            this.currentPage = result.page;
                        }

                        this.rows =
                            result.items.map
                            (
                                x =>
                                ({
                                    ...x,
                                    PeriodText:`${this.dateText(x.StartDate)} to ${this.dateText(x.EndDate)}`,
                                    StatusText:x.Status === 'Active' && x.Phase ? `Active · ${x.Phase}` : x.Status
                                })
                            );

                        this.loading = false;

                        this.cdr.detectChanges();
                    },
                error:
                    error =>
                    {
                        if (seq !== this.loadSeq)
                        {
                            return;
                        }

                        console.error('Load Promotional Offers Error:', error);

                        this.rows = [];

                        this.loading = false;

                        this.loadFailed = true;

                        this.toast.error('Load Failed', this.errorText(error, 'Unable to load the offers.'));

                        this.cdr.detectChanges();
                    }
            });
    }

    private applyFilters(): void
    {
        this.currentPage = 1;

        this.loadItems();
    }


    //===========================================================
    // Tabs, filters, search, sort, paging
    //===========================================================

    onTabChange(value: string): void
    {
        this.selectedTab = String(value || 'all');

        this.applyFilters();
    }

    onBrandFilterChange(value: number | null): void
    {
        this.selectedBrandId = value === null || value === undefined ? null : Number(value);

        this.applyFilters();
    }

    onSearch(value: string): void
    {
        this.searchText = value ?? '';

        if (this.searchTimer)
        {
            clearTimeout(this.searchTimer);
        }

        this.searchTimer =
            setTimeout(
                () =>
                {
                    this.searchTimer = null;

                    this.applyFilters();
                },
                300);
    }

    onSort(event: { field:string; direction:'asc' | 'desc' }): void
    {
        this.sortField = event.field;

        this.sortDirection = event.direction === 'desc' ? 'desc' : 'asc';

        this.applyFilters();
    }

    onPageChange(page: number): void
    {
        this.currentPage = page;

        this.loadItems();
    }

    onPageSizeChange(size: number): void
    {
        this.pageSize = size;

        this.applyFilters();
    }

    refresh(): void
    {
        this.searchText = '';

        this.selectedTab = 'all';

        this.selectedBrandId = null;

        this.sortField = '';

        this.applyFilters();
    }


    //===========================================================
    // Summary line (brand and search applied, not the tab)
    //===========================================================

    countOf(key: string): number
    {
        return Number(this.counts[key] ?? 0);
    }

    summaryText(value: number): string
    {
        return value.toLocaleString('en-US');
    }


    //===========================================================
    // Add / View / Edit / Delete
    //===========================================================

    add(): void
    {
        void this.router.navigate(['add'], { relativeTo:this.parent });
    }

    view(row: OfferRow): void
    {
        void this.router.navigate(['view', row.PublicId], { relativeTo:this.parent });
    }

    edit(row: OfferRow): void
    {
        if (row.Status !== 'Draft' && row.Status !== 'Active')
        {
            this.toast.info('Not Editable', `${row.OfferNo} is ${row.Status.toLowerCase()} : it can only be viewed.`);

            return;
        }

        void this.router.navigate(['edit', row.PublicId], { relativeTo:this.parent });
    }

    delete(row: OfferRow): void
    {
        if (this.progress.busy)
        {
            return;
        }

        if (row.Status !== 'Draft')
        {
            this.toast.info('Delete Blocked', `Only a draft offer can be deleted; ${row.OfferNo} is ${row.Status.toLowerCase()} (cancel or close it instead).`);

            return;
        }

        this.confirm.open(
            'Delete Offer',
            `Are you sure you want to delete the draft offer ${row.OfferNo} (${row.OfferName})?`,
            () =>
                setTimeout(
                    () =>
                        this.run(
                            'Deleting Offer',
                            `Please wait while ${row.OfferNo} is being deleted...`,
                            'Offer deleted.',
                            this.service.remove(this.page.apiPath, row.PublicId),
                            'Delete Successful',
                            `Offer ${row.OfferNo} deleted successfully.`,
                            'Delete Failed')),
            'Delete',
            'Cancel',
            'danger'
        );
    }


    //===========================================================
    // Restore (the most recently deleted offer of the page)
    //===========================================================

    restore(): void
    {
        if (this.progress.busy)
        {
            return;
        }

        this.confirm.open(
            'Restore Offer',
            'Are you sure you want to restore the most recently deleted offer?',
            () =>
                setTimeout(
                    () =>
                        this.progress
                            .run<any>(
                                'Restoring Offer',
                                'Please wait while the most recently deleted offer is being restored...',
                                'Offer restored.',
                                this.service.restore(this.page.apiPath))
                            .subscribe
                            ({
                                next:
                                    () =>
                                    {
                                        this.toast.success('Restore Successful', 'The most recently deleted offer has been restored.');

                                        this.loadItems();
                                    },
                                error:
                                    error =>
                                    {
                                        if (error instanceof HttpErrorResponse && error.status === 404)
                                        {
                                            this.toast.info('No Data to Restore', 'There is no deleted offer to restore.');

                                            return;
                                        }

                                        this.toast.error('Restore Failed', this.errorText(error, 'Failed to restore the offer.'));
                                    }
                            })),
            'Restore',
            'Cancel',
            'primary'
        );
    }


    //===========================================================
    // Row actions : Activate / Close / Cancel
    //===========================================================

    onRowAction(event: ListTableRowActionEvent): void
    {
        const row = event.row as OfferRow;

        switch (event.key)
        {
            case 'activate':
                this.activate(row);
                break;

            case 'close':
            case 'cancel':
                this.openReason(row, event.key as 'close' | 'cancel');
                break;
        }
    }

    private activate(row: OfferRow): void
    {
        this.confirm.open(
            'Activate Offer',
            `Activate ${row.OfferNo} ${row.OfferName} (${row.PeriodText})? `
                + (row.OfferType.includes('Discount')
                    ? 'Invoices of the period apply it automatically (the better of offer or membership).'
                    : 'Staff can record it on invoices of the period.'),
            () =>
                setTimeout(
                    () =>
                        this.run(
                            'Activating Offer',
                            `Please wait while ${row.OfferNo} is being activated...`,
                            'Offer activated.',
                            this.service.activate(this.page.apiPath, row.PublicId),
                            'Activate Successful',
                            `Offer ${row.OfferNo} is active.`,
                            'Activate Failed')),
            'Activate',
            'Cancel',
            'primary'
        );
    }

    // One action in the progress dialog, then the list reloads
    private run
    (
        title: string,
        message: string,
        done: string,
        call: Observable<any>,
        okTitle: string,
        okText: string,
        failTitle: string
    ): void
    {
        this.progress
            .run<any>(title, message, done, call)
            .subscribe
            ({
                next:
                    () =>
                    {
                        this.toast.success(okTitle, okText);

                        this.loadItems();
                    },
                error:
                    error =>
                    {
                        const status = (error as HttpErrorResponse)?.status;

                        if (status === 400 || status === 409)
                        {
                            this.toast.info(failTitle, this.errorText(error, 'The offer could not be changed.'));

                            return;
                        }

                        this.toast.error(failTitle, this.errorText(error, 'The offer could not be changed.'));
                    }
            });
    }

    private openReason(row: OfferRow, action: 'close' | 'cancel'): void
    {
        this.reasonRow = row;

        this.reasonAction = action;

        this.reasonText = '';

        this.reasonError = '';

        this.cdr.detectChanges();
    }

    closeReason(): void
    {
        if (this.progress.busy)
        {
            return;
        }

        this.reasonRow = null;

        this.cdr.detectChanges();
    }

    onReason(value: string | number): void
    {
        this.reasonText = String(value ?? '');

        this.reasonError = '';
    }

    confirmReason(): void
    {
        const row = this.reasonRow;

        if (!row || this.progress.busy)
        {
            return;
        }

        const reason = this.reasonText.replace(/\s+/g, ' ').trim();

        const cancelling = this.reasonAction === 'cancel';

        if (cancelling && reason.length < 5)
        {
            this.reasonError = 'Reason is required : at least 5 characters.';

            this.cdr.detectChanges();

            return;
        }

        this.reasonRow = null;

        this.run(
            cancelling ? 'Cancelling Offer' : 'Closing Offer',
            `Please wait while ${row.OfferNo} is being ${cancelling ? 'cancelled' : 'closed'}...`,
            cancelling ? 'Offer cancelled.' : 'Offer closed.',
            cancelling
                ? this.service.cancel(this.page.apiPath, row.PublicId, reason)
                : this.service.close(this.page.apiPath, row.PublicId, reason),
            cancelling ? 'Cancel Successful' : 'Close Successful',
            `Offer ${row.OfferNo} ${cancelling ? 'cancelled' : 'closed'}.`,
            cancelling ? 'Cancel Failed' : 'Close Failed');
    }


    //===========================================================
    // History : the page (right command)
    //===========================================================

    openHistory(): void
    {
        this.showHistory(this.service.getListHistory(this.page.apiPath), `${this.page.title} History`);
    }

    private showHistory(call: Observable<any[]>, title: string): void
    {
        call.subscribe
        ({
            next:
                response =>
                {
                    this.historyItems =
                        (response ?? []).map
                        (
                            h =>
                            ({
                                title:h.activityTitle ?? h.ActivityTitle,
                                description:h.activityDescription ?? h.ActivityDescription,
                                user:h.performedByName ?? h.PerformedByName ?? 'System',
                                dateTime:new Date(h.performedDate ?? h.PerformedDate).toLocaleString(),
                                badge:h.activityType ?? h.ActivityType
                            })
                        );

                    this.historyTitle = title;

                    this.historyOpened = true;

                    this.cdr.detectChanges();
                },
            error:
                error =>
                {
                    console.error('History Load Failed:', error);

                    this.toast.error('History', 'Failed to load the offer history.');
                }
        });
    }

    closeHistory(): void
    {
        this.historyOpened = false;

        this.cdr.detectChanges();
    }
}
