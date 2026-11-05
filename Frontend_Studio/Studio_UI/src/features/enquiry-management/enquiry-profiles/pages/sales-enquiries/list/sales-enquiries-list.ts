//===============================================================
// Sales Enquiries List
//
// Tabs : All · Website (sent from the website, not yet taken by
// an executive) · Open · Due (open, next follow-up today or
// earlier) · Matured (sold) · Lost. Status and interest level
// show their Enquiry Setup colour. Matured enquiries open in View
// only (no edit / delete).
//
// Test Rides (centre pill) : the table shows active test rides
// date-wise (live rides of every date + ride requests not booked
// yet, website ones included); Book Test Ride opens the Test Rides
// board. The motorcycle icon of an open row opens the board with
// that enquiry picked.
//
// Interest chips (toolbar right) : All · Super Hot · Hot … with
// counts, combined with the tab and the search. An open enquiry
// with an Expected Purchase Date shows the level of the days
// left (set by the server from the Enquiry Setup days ranges).
//
// Server paging : the tab, the interest chip, the search and the
// sort go to the server (GET paged), which answers one page, the
// chip counts, the summary counts and the ids of the whole view
// (for Print). The Test Rides view stays on this page's own list.
// Links and Delete use the enquiry's uuid (PublicId).
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
    SalesEnquiry,
    SalesEnquiryPage,
    EnquiryOption
}
from '../../../models/sales-enquiries.model';


import
{
    ActiveTestRide
}
from '../../../models/sales-test-rides.model';

import
{
    slotLabel
}
from '../../../models/enquiry-setup.model';


// Test Rides view : status colours
const RIDE_COLORS: Record<string, string> =
{
    'Requested':'#7C3AED',
    'Booked':'#2563EB',
    'Confirmed':'#0D9488',
    'Overdue':'#DC2626'
};


// Test Rides view : one row
type TestRideRow =
    ActiveTestRide
    &
    {
        DateText:string;
        TimeText:string;
        CustomerText:string;
        BikeText:string;
        InterestText:string;
        AdvisorText:string;
        SourceText:string;
        StatusText:string;
        StatusDot:string;
        Overdue:boolean;
    };


// One interest chip on the toolbar
interface InterestChip
{
    // 'all' · level id · 'none'
    id:string;
    label:string;
    color:string;
    count:number;
}


// Row with its display texts
type SalesEnquiryRow =
    SalesEnquiry
    &
    {
        DateText:string;
        EnquirerText:string;
        ModelText:string;
        NextFollowUpText:string;
        StatusText:string;
        StatusDot:string;
        InterestText:string;
        InterestKey:string;
        ExecutiveText:string;
        ModelColourText:string;
    };


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
    ListTableColumn,
    ListTableRowAction,
    ListTableRowActionEvent
}
from '../../../../../../shared/components/layout/list-table/list-table';

import
{
    SalesFollowUpDialog
}
from '../follow-up/sales-follow-up-dialog';

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
    ProgressRunner
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-runner';

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
// Print
//===============================================================

import
{
    SALES_ENQUIRIES_PRINT_KEY,
    saveSalesEnquiriesPrintRequest
}
from '../../../print/sales-enquiries.print';


//===============================================================
// Service
//===============================================================

import
{
    SalesEnquiriesService
}
from '../../../services/sales-enquiries.service';

import
{
    SalesTestRidesService
}
from '../../../services/sales-test-rides.service';

import
{
    AuthenticationStorageService
}
from '../../../../../../core/authentication/authentication-storage.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'salesEnquiries-list',

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
        ToastComponent,
        SalesFollowUpDialog
    ],

    templateUrl:'./sales-enquiries-list.html',

    styleUrl:'./sales-enquiries-list.css'
})


//===============================================================
// Sales Enquiries List
//===============================================================

export class SalesEnquiriesList
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly salesEnquiriesService =
        inject(SalesEnquiriesService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly testRidesService =
        inject(SalesTestRidesService);

    private readonly auth =
        inject(AuthenticationStorageService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly route =
        inject(ActivatedRoute);

    private readonly cdr =
        inject(ChangeDetectorRef);

    readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges()
        );



    //===========================================================
    // Tabs
    //===========================================================

    tabs:
        ControlTab[] =
    [
        { id:'all',      label:'All Enquiries' },
        { id:'open',     label:'Open' },
        { id:'due',      label:'Due' },
        { id:'lapsed',   label:'Lapsed' },
        { id:'matured',  label:'Matured' },
        { id:'lost',     label:'Suspended' }
    ];


    selectedTab:
        string =
        'all';


    // Centre group (Website · Test Rides) : waiting counts
    websiteCount:
        number =
        0;

    ridesCount:
        number =
        0;


    // Interest chip : 'all' · level id · 'none'
    selectedInterest:
        string =
        'all';


    interestChips:
        InterestChip[] =
    [];


    // Interest levels in their Enquiry Setup order (chip order)
    private interestLevels:
        EnquiryOption[] =
    [];



    //===========================================================
    // Test Rides view (centre "Test Rides") : live rides of every
    // date + ride requests not booked yet. "Book Test Ride" opens
    // the Test Rides board.
    //===========================================================

    get isRides(): boolean
    {
        return this.selectedTab === 'rides';
    }

    private rides: TestRideRow[] = [];

    filteredRides: TestRideRow[] = [];

    pagedRides: TestRideRow[] = [];

    ridesLoading = false;

    ridesFailed = false;

    selectedRideChip = 'all';

    rideChips: InterestChip[] = [];

    readonly rideColumns:
        ListTableColumn[] =
    [
        { header:'#',          field:'serial',       type:'serial', width:'50px', align:'center' },
        { header:'Date',       field:'DateText',     width:'150px', align:'left' },
        { header:'Time',       field:'TimeText',     width:'190px', align:'left' },
        { header:'Enquiry No', field:'EnquiryNo',    width:'200px', align:'center' },
        { header:'Customer',   field:'CustomerText', align:'left' },
        { header:'Bike',       field:'BikeText',     width:'180px', align:'left' },
        { header:'Interest',   field:'InterestText', width:'110px', align:'left', dotField:'InterestLevelColor' },
        { header:'Executive',  field:'AdvisorText',  width:'130px', align:'left' },
        { header:'Source',     field:'SourceText',   width:'110px', align:'left' },
        { header:'Status',     field:'StatusText',   width:'140px', align:'left', dotField:'StatusDot' },
        { header:'Actions',    field:'actions',      type:'actions', width:'110px', align:'center' }
    ];

    readonly rideRowActions: ListTableRowAction[] =
    [
        {
            key:'board',
            icon:'fas fa-calendar-check',
            title:'Open on the test ride board',
            tone:'primary',
            visible:(): boolean => true
        }
    ];

    private readonly fullActions = { view:true, edit:true, delete:true };

    private readonly viewOnlyActions = { view:true, edit:false, delete:false };

    get tableColumns(): ListTableColumn[]
    {
        return this.isRides ? this.rideColumns : this.columns;
    }

    get tableRows(): any[]
    {
        return this.isRides ? this.pagedRides : this.pagedRows;
    }

    get tableTotal(): number
    {
        return this.isRides ? this.filteredRides.length : this.totalRecords;
    }

    get tableLoading(): boolean
    {
        return this.isRides ? this.ridesLoading : this.loading;
    }

    get tableFailed(): boolean
    {
        return this.isRides ? this.ridesFailed : this.loadFailed;
    }

    get tableRowActions(): ListTableRowAction[]
    {
        return this.isRides ? this.rideRowActions : this.rowActions;
    }

    get tableActions(): { view:boolean; edit:boolean; delete:boolean }
    {
        return this.isRides ? this.viewOnlyActions : this.fullActions;
    }

    get chipList(): InterestChip[]
    {
        return this.isRides ? this.rideChips : this.interestChips;
    }

    get chipSelected(): string
    {
        return this.isRides ? this.selectedRideChip : this.selectedInterest;
    }

    onChip(id: string): void
    {
        if (this.isRides)
        {
            this.selectedRideChip = id;

            this.applyRideFilters();

            this.cdr.detectChanges();

            return;
        }

        this.onInterestChange(id);
    }

    get searchPlaceholder(): string
    {
        return this.isRides
            ? 'Search test rides, customer, mobile, bike...'
            : 'Search enquiries, mobile, model...';
    }


    loadRides(): void
    {
        this.ridesLoading = true;

        this.ridesFailed = false;

        this.testRidesService
            .getActive(Number(this.auth.getUser()?.branchId ?? 0))
            .subscribe
            ({
                next:(rows: ActiveTestRide[]): void =>
                {
                    this.rides = (rows ?? []).map(x => this.toRideRow(x));

                    // Pill : rides and requests still to come
                    this.ridesCount = this.rides.filter(x => !x.Overdue).length;

                    this.ridesLoading = false;

                    this.applyRideFilters();

                    this.cdr.detectChanges();
                },

                error:(error: unknown): void =>
                {
                    console.error('Load Test Rides Error:', error);

                    this.rides = [];
                    this.filteredRides = [];
                    this.pagedRides = [];

                    this.ridesLoading = false;

                    this.ridesFailed = true;

                    if (this.isRides)
                    {
                        this.toast.error('Load Failed', this.errorText(error, 'Unable to load the test rides. Run SalesTestRides_Tables.sql.'));
                    }

                    this.cdr.detectChanges();
                }
            });
    }

    private toRideRow(item: ActiveTestRide): TestRideRow
    {
        const overdue = item.Date < this.today;

        const weekday =
            new Date(Number(item.Date.slice(0, 4)), Number(item.Date.slice(5, 7)) - 1, Number(item.Date.slice(8, 10)))
                .toLocaleDateString('en-GB', { weekday:'short' });

        return {
            ...item,

            DateText:
                `${weekday}, ${this.formatDate(item.Date)}`
                + (item.Date === this.today ? ' · Today' : ''),

            TimeText:
                item.SlotStart
                    ? `${slotLabel(item.SlotStart)} - ${slotLabel(item.SlotEnd)}`
                    : `Asked${item.AskedSlot ? ' ' + item.AskedSlot : ''} · not booked`,

            CustomerText: `${item.EnquirerName} - ${item.EnquirerMobile}`,

            BikeText: [item.ModelName, item.BrandName].filter(x => !!x).join(' · ') || '—',

            InterestText: item.InterestLevelName || '—',

            AdvisorText: item.AdvisorName || 'Unassigned',

            SourceText: item.FromWebsite ? 'Website' : item.SourceName || '—',

            StatusText:
                overdue
                    ? `${item.Status} · overdue`
                    : item.Status + (item.RescheduleCount ? ` · moved ${item.RescheduleCount}x` : ''),

            StatusDot:
                overdue
                    ? RIDE_COLORS['Overdue']
                    : RIDE_COLORS[item.Status] ?? '#64748B',

            Overdue:overdue
        };
    }

    private inRideChip(item: TestRideRow, id: string): boolean
    {
        switch (id)
        {
            case 'today':     return item.Date === this.today;
            case 'requested': return item.Kind === 'Request';
            case 'booked':    return item.Status === 'Booked';
            case 'confirmed': return item.Status === 'Confirmed';
            case 'overdue':   return item.Overdue;
            default:          return true;
        }
    }

    applyRideFilters(): void
    {
        const keyword = this.searchText.trim().toLowerCase();

        const inView =
            this.rides.filter(item =>
                !keyword
                ||
                [
                    item.EnquiryNo,
                    item.DateText,
                    item.TimeText,
                    item.EnquirerName,
                    item.EnquirerMobile,
                    item.ModelName,
                    item.BrandName,
                    item.InterestText,
                    item.AdvisorText,
                    item.SourceText,
                    item.StatusText,
                    item.Note
                ]
                .join(' ')
                .toLowerCase()
                .includes(keyword));

        const chip = (id: string, label: string, color: string): InterestChip =>
            ({ id, label, color, count:inView.filter(x => this.inRideChip(x, id)).length });

        this.rideChips =
        [
            chip('all',       'All',       ''),
            chip('today',     'Today',     '#0EA5E9'),
            chip('requested', 'Requested', RIDE_COLORS['Requested']),
            chip('booked',    'Booked',    RIDE_COLORS['Booked']),
            chip('confirmed', 'Confirmed', RIDE_COLORS['Confirmed']),
            chip('overdue',   'Overdue',   RIDE_COLORS['Overdue'])
        ];

        this.filteredRides = inView.filter(x => this.inRideChip(x, this.selectedRideChip));

        // The enquiries keep their server page while hidden
        if (this.isRides)
        {
            this.currentPage = 1;
        }

        this.updatePagination();
    }

    // The board : its day, the enquiry picked
    openBoard(row: TestRideRow): void
    {
        void this.router.navigate(
            ['test-rides'],
            {
                relativeTo:this.route.parent,
                queryParams:{ enquiry:row.SalesEnquiryId, date:row.Date }
            });
    }

    // The Test Rides page (optionally with an enquiry)
    openTestRides(enquiryId: number = 0): void
    {
        void this.router.navigate(
            ['test-rides'],
            {
                relativeTo:this.route.parent,
                queryParams:enquiryId > 0 ? { enquiry:enquiryId } : {}
            });
    }



    //===========================================================
    // Data
    //===========================================================

    // Server paging : rows of the whole view, counts, sort
    totalRecords:
        number =
        0;

    // Summary : All · Open · Due · Lapsed · Matured · Suspended
    counts:
        Record<string, number> =
        {};

    // Interest chip counts of the tab + search (server)
    private interestCounts:
        SalesEnquiryPage['interests'] =
    [];

    // Every enquiry of the view in list order (Print)
    private printIds:
        number[] =
    [];

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

    pagedRows:
        SalesEnquiryRow[] =
    [];

    searchText:
        string =
        '';

    loading:
        boolean =
        false;

    loadFailed:
        boolean =
        false;

    currentPage:
        number =
        1;

    pageSize:
        number =
        10;

    historyOpened:
        boolean =
        false;

    historyTitle:
        string =
        'Sales Enquiries History';

    historyItems:
        any[] =
    [];


    // Today, yyyy-MM-dd (local)
    private readonly today:
        string =
        SalesEnquiriesList.isoDate(new Date());



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
    // Columns
    //===========================================================

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#',             field:'serial',           type:'serial', width:'50px',  align:'center' },
        { header:'Enquiry No',    field:'EnquiryNo',        width:'215px', align:'center' },
        { header:'Date',          field:'DateText',         width:'120px', align:'center' },
        { header:'Enquirer',      field:'EnquirerText',     align:'left' },
        { header:'Model',         field:'ModelColourText',  width:'190px', align:'left' },
        { header:'Executive',     field:'ExecutiveText',    width:'130px', align:'left' },
        { header:'Interest',      field:'InterestText',     width:'130px', align:'left', dotField:'InterestLevelColor' },
        { header:'Status',        field:'StatusText',       width:'220px', align:'left', dotField:'StatusDot' },
        { header:'Next Follow-up', field:'NextFollowUpText', width:'135px', align:'center' },
        { header:'Actions',       field:'actions',          type:'actions', width:'130px', align:'center' }
    ];



    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        // ?tab=test-rides (back from the Test Rides board)
        if
        (
            this.route.snapshot.queryParamMap.get('tab') === 'test-rides'
        )
        {
            this.selectedTab =
                'rides';
        }

        this.loadInterestLevels();

        this.loadItems();

        this.loadRides();
    }


    // Chip order and colours (no error shown : the chips then
    // follow the rows)
    private loadInterestLevels():
        void
    {
        this.salesEnquiriesService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response
                ):
                    void =>
                {
                    this.interestLevels =
                        response?.InterestLevels ?? [];

                    this.buildInterestChips();

                    this.cdr.detectChanges();
                },

                error:
                    (): void => {}
            });
    }



    //===========================================================
    // Dates
    //===========================================================

    static isoDate
    (
        date:
            Date
    ):
        string
    {
        const pad =
            (n: number): string =>
                String(n).padStart(2, '0');

        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }


    // yyyy-MM-dd → 03 Nov 2026
    private formatDate
    (
        value:
            string | null
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

        const [year, month, day] =
            value.slice(0, 10).split('-').map(Number);

        if
        (
            !year || !month || !day
        )
        {
            return value;
        }

        const months =
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return `${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`;
    }



    //===========================================================
    // Load
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

        this.salesEnquiriesService
            .getPaged(
                {
                    page:this.currentPage,
                    pageSize:this.pageSize,
                    search:this.searchText,
                    sort:this.sortField,
                    dir:this.sortDirection,
                    tab:this.isRides ? 'all' : this.selectedTab,
                    interest:this.selectedInterest
                }
            )
            .subscribe
            ({
                next:
                (
                    response:
                        SalesEnquiryPage
                ):
                    void =>
                {
                    if
                    (
                        seq !== this.loadSeq
                    )
                    {
                        return;
                    }

                    this.pagedRows =
                        (response.items ?? []).map(item => this.toRow(item));

                    this.totalRecords =
                        response.totalCount;

                    this.counts =
                        response.counts ?? {};

                    this.websiteCount =
                        response.websiteCount;

                    this.interestCounts =
                        response.interests ?? [];

                    this.printIds =
                        response.ids ?? [];

                    // The server moves back to the last page when
                    // the list became shorter
                    if
                    (
                        !this.isRides
                        &&
                        response.page > 0
                    )
                    {
                        this.currentPage =
                            response.page;
                    }

                    this.loading =
                        false;

                    this.buildInterestChips();

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    if
                    (
                        seq !== this.loadSeq
                    )
                    {
                        return;
                    }

                    console.error('Load Sales Enquiries Error:', error);

                    this.pagedRows = [];
                    this.totalRecords = 0;
                    this.counts = {};
                    this.interestCounts = [];
                    this.printIds = [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error(
                        'Load Failed',
                        this.errorText(error, 'Unable to load sales enquiries.')
                    );

                    this.cdr.detectChanges();
                }
            });
    }


    private toRow
    (
        item:
            SalesEnquiry
    ):
        SalesEnquiryRow
    {
        const dueSoon =
            !item.IsMatured
            &&
            item.StatusStage !== 'Lost'
            &&
            !!item.NextFollowUpDate
            &&
            item.NextFollowUpDate.slice(0, 10) <= this.today;

        return {
            ...item,

            DateText:
                this.formatDate(item.EnquiryDate),

            EnquirerText:
                `${item.EnquirerName} - ${item.EnquirerMobile}`
                +
                (item.EnquiryFor === 'Referrer' ? ' (Referrer)' : ''),

            ModelText:
                item.SecondModelName
                    ? `${item.ModelName} / ${item.SecondModelName}`
                    : item.ModelName,

            NextFollowUpText:
                item.IsMatured || item.StatusStage === 'Lost'
                    ? '—'
                    : this.formatDate(item.NextFollowUpDate)
                      +
                      (dueSoon ? ' •' : ''),

            StatusText:
                item.IsMatured
                    ? `Matured${item.SaleNo ? ' · ' + item.SaleNo : ''}`
                    : item.StatusName
                      +
                      (
                          item.TestRideDate && item.StatusStage !== 'Lost'
                              ? ` · Ride ${this.formatDate(item.TestRideDate).slice(0, 6)}${item.TestRideSlot ? ' · ' + item.TestRideSlot : ''}`
                              : ''
                      ),

            StatusDot:
                item.IsMatured
                    ? '#16A34A'
                    : item.StatusColor,

            InterestText:
                !item.InterestLevelName
                    ? '—'
                    : item.InterestAuto
                        && item.DaysToPurchase !== null
                        && item.DaysToPurchase !== undefined
                        ? `${item.InterestLevelName} · ${item.DaysToPurchase === 0 ? 'due' : item.DaysToPurchase + 'd'}`
                        : item.InterestLevelName,

            InterestKey:
                item.InterestLevelId
                    ? String(item.InterestLevelId)
                    : 'none',

            ExecutiveText:
                item.ExecutiveUserId > 0
                    ? item.ExecutiveName
                    : 'Unassigned',

            ModelColourText:
                (
                    item.SecondModelName
                        ? `${item.ModelName} / ${item.SecondModelName}`
                        : item.ModelName
                )
                +
                (item.PreferredColor ? ` · ${item.PreferredColor}` : '')
        };
    }


    // Centre group : a second click goes back to All Enquiries
    onInboxClick
    (
        id:
            'website' | 'rides'
    ):
        void
    {
        this.onTabChange(
            this.selectedTab === id
                ? 'all'
                : id
        );
    }



    //===========================================================
    // Filters
    //===========================================================

    // Tab, chip or search changed : page 1 from the server
    applyFilters():
        void
    {
        this.currentPage =
            1;

        this.loadItems();
    }


    // Chips : All, every level (setup order; ones only on old
    // rows after), Not Set when some rows have none. Counts come
    // from the server (tab + search).
    private buildInterestChips():
        void
    {
        const counts =
            new Map<string, number>();

        let total =
            0;

        for
        (
            const item
            of this.interestCounts
        )
        {
            counts.set(item.Key, item.Count);

            total += item.Count;
        }

        const chips:
            InterestChip[] =
        [
            { id:'all', label:'All', color:'', count:total }
        ];

        const seen =
            new Set<string>();

        for
        (
            const level
            of this.interestLevels
        )
        {
            const id =
                String(level.Id);

            seen.add(id);

            chips.push(
                {
                    id,
                    label:level.Name,
                    color:level.ColorCode,
                    count:counts.get(id) ?? 0
                }
            );
        }

        for
        (
            const item
            of this.interestCounts
        )
        {
            if
            (
                item.Key !== 'none'
                &&
                !seen.has(item.Key)
            )
            {
                seen.add(item.Key);

                chips.push(
                    {
                        id:item.Key,
                        label:item.Name,
                        color:item.Color,
                        count:item.Count
                    }
                );
            }
        }

        if
        (
            (counts.get('none') ?? 0) > 0
            ||
            this.selectedInterest === 'none'
        )
        {
            chips.push(
                {
                    id:'none',
                    label:'Not Set',
                    color:'#94A3B8',
                    count:counts.get('none') ?? 0
                }
            );
        }

        this.interestChips =
            chips;
    }


    onInterestChange
    (
        id:
            string
    ):
        void
    {
        if
        (
            this.selectedInterest === id
        )
        {
            return;
        }

        this.selectedInterest =
            id;

        this.applyFilters();

        this.cdr.detectChanges();
    }


    onTabChange
    (
        value:
            string
    ):
        void
    {
        this.selectedTab =
            value;

        if
        (
            this.isRides
        )
        {
            this.applyRideFilters();

            this.cdr.detectChanges();

            return;
        }

        this.applyFilters();

        this.cdr.detectChanges();
    }


    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText =
            value ?? '';

        if
        (
            this.isRides
        )
        {
            this.applyRideFilters();

            return;
        }

        if
        (
            this.searchTimer
        )
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
        const sign =
            event.direction === 'asc' ? 1 : -1;

        // Date columns sort by their real value
        const field =
            event.field === 'DateText'
                ? (this.isRides ? 'Date' : 'EnquiryDate')
                : event.field === 'NextFollowUpText'
                    ? 'NextFollowUpDate'
                    : event.field === 'TimeText'
                        ? 'SlotStart'
                        : event.field;

        const compare =
            (a: any, b: any): number =>
            {
                const valueA = a?.[field];

                const valueB = b?.[field];

                if (valueA == null && valueB == null) return 0;

                if (valueA == null) return -1 * sign;

                if (valueB == null) return 1 * sign;

                if
                (
                    typeof valueA === 'string'
                    &&
                    typeof valueB === 'string'
                )
                {
                    return valueA.localeCompare(valueB, undefined, { numeric:true }) * sign;
                }

                return (valueA < valueB ? -1 : valueA > valueB ? 1 : 0) * sign;
            };

        if
        (
            this.isRides
        )
        {
            this.filteredRides =
                [...this.filteredRides].sort(compare);

            this.currentPage =
                1;

            this.updatePagination();

            return;
        }

        // Enquiries : the server sorts the whole view
        this.sortField =
            event.field === 'DateText'
                ? 'EnquiryDate'
                : event.field === 'NextFollowUpText'
                    ? 'NextFollowUpDate'
                    : event.field;

        this.sortDirection =
            event.direction;

        this.currentPage =
            1;

        this.loadItems();
    }


    refresh():
        void
    {
        this.searchText =
            '';

        this.currentPage =
            1;

        this.loadItems();

        this.loadRides();
    }


    updatePagination():
        void
    {
        // Test Rides view only (the enquiries come a page at a
        // time from the server)
        const start =
            (this.currentPage - 1) * this.pageSize;

        this.pagedRides =
            this.filteredRides.slice(start, start + this.pageSize);
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

        if
        (
            this.isRides
        )
        {
            this.updatePagination();

            return;
        }

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

        this.updatePagination();

        if
        (
            !this.isRides
        )
        {
            this.loadItems();
        }
    }



    //===========================================================
    // Add / View / Edit
    //===========================================================

    // Test Rides view : Book Test Ride (the board)
    add():
        void
    {
        if
        (
            this.isRides
        )
        {
            this.openTestRides();

            return;
        }

        void this.router.navigate(['add'], { relativeTo:this.route.parent });
    }


    //===========================================================
    // Log a call (Sales Follow-up pop-up)
    //===========================================================

    readonly rowActions:
        ListTableRowAction[] =
    [
        {
            key:'call',
            icon:'fas fa-phone',
            title:'Log a call',
            tone:'success',
            visible:(row: any): boolean => !row.IsMatured && row.StatusStage !== 'Lost'
        },
        {
            key:'ride',
            icon:'fas fa-motorcycle',
            title:'Book a test ride',
            tone:'primary',
            visible:(row: any): boolean => !row.IsMatured && row.StatusStage !== 'Lost'
        }
    ];

    callEnquiry:
        SalesEnquiry | null = null;

    onRowAction
    (
        event:
            ListTableRowActionEvent
    ):
        void
    {
        if
        (
            event.key === 'board'
            &&
            this.isRides
        )
        {
            this.openBoard(event.row as TestRideRow);

            return;
        }

        if
        (
            event.key === 'ride'
        )
        {
            this.openTestRides((event.row as SalesEnquiry).SalesEnquiryId);

            return;
        }

        if
        (
            event.key === 'call'
        )
        {
            this.callEnquiry = event.row as SalesEnquiry;

            this.cdr.detectChanges();
        }
    }

    onCallSaved():
        void
    {
        this.callEnquiry = null;

        this.loadItems();

        this.loadRides();
    }

    onCallClosed():
        void
    {
        this.callEnquiry = null;

        this.cdr.detectChanges();
    }


    view
    (
        item:
            SalesEnquiryRow
    ):
        void
    {
        if
        (
            this.isRides
        )
        {
            this.openBoard(item as unknown as TestRideRow);

            return;
        }

        void this.router.navigate(['view', item.PublicId || item.SalesEnquiryId], { relativeTo:this.route.parent });
    }


    edit
    (
        item:
            SalesEnquiryRow
    ):
        void
    {
        if
        (
            item.IsMatured
        )
        {
            this.toast.info(
                'Edit Not Allowed',
                `${item.EnquiryNo} is matured by sale ${item.SaleNo} and cannot be changed.`
            );

            return;
        }

        void this.router.navigate(['edit', item.PublicId || item.SalesEnquiryId], { relativeTo:this.route.parent });
    }



    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        item:
            SalesEnquiryRow
    ):
        void
    {
        if
        (
            this.progress.busy
        )
        {
            return;
        }

        if
        (
            item.IsMatured
        )
        {
            this.toast.info(
                'Delete Not Allowed',
                `${item.EnquiryNo} is matured by sale ${item.SaleNo} and cannot be deleted.`
            );

            return;
        }

        this.confirmDialog.open
        (
            'Delete Sales Enquiry',

            `Are you sure you want to delete ${item.EnquiryNo} (${item.EnquirerName} - ${item.EnquirerMobile}) ?`,

            (): void =>
            {
                setTimeout(() => this.deleteItem(item));
            }
        );
    }


    private deleteItem
    (
        item:
            SalesEnquiryRow
    ):
        void
    {
        this.progress
            .run(
                'Deleting Sales Enquiry',
                `Please wait while ${item.EnquiryNo} is being deleted...`,
                'Sales enquiry deleted.',
                this.salesEnquiriesService.delete(item.PublicId ?? '')
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.toast.success(
                        'Delete Successful',
                        `${item.EnquiryNo} deleted.`
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
                    console.error('Delete Sales Enquiry Error:', error);

                    if
                    (
                        error instanceof HttpErrorResponse
                        &&
                        error.status === 409
                    )
                    {
                        this.toast.info(
                            'Delete Blocked',
                            this.errorText(error, 'The sales enquiry cannot be deleted.')
                        );

                        return;
                    }

                    this.toast.error(
                        'Delete Failed',
                        this.errorText(error, 'Failed to delete the sales enquiry.')
                    );
                }
            });
    }



    //===========================================================
    // Restore (the most recently deleted enquiry)
    //===========================================================

    restore():
        void
    {
        if
        (
            this.progress.busy
        )
        {
            return;
        }

        this.confirmDialog.open
        (
            'Restore Sales Enquiry',

            'Are you sure you want to restore the most recently deleted sales enquiry?',

            (): void =>
            {
                setTimeout(() => this.restoreItem());
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }


    private restoreItem():
        void
    {
        this.progress
            .run<unknown>(
                'Restoring Sales Enquiry',
                'Please wait while the most recently deleted sales enquiry is being restored...',
                'Sales enquiry restored.',
                this.salesEnquiriesService.restore()
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.toast.success(
                        'Restore Successful',
                        'The most recently deleted sales enquiry has been restored.'
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
                    console.error('Restore Sales Enquiry Error:', error);

                    if
                    (
                        error instanceof HttpErrorResponse
                        &&
                        error.status === 404
                    )
                    {
                        this.toast.info(
                            'No Data to Restore',
                            'There is no deleted sales enquiry to restore.'
                        );

                        return;
                    }

                    this.toast.error(
                        'Restore Failed',
                        this.errorText(error, 'Failed to restore the sales enquiry.')
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
        this.salesEnquiriesService
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

                    this.toast.error(
                        'History',
                        'Failed to load the sales enquiry history.'
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
    // Server message
    //===========================================================

    private errorText
    (
        error:
            unknown,

        fallback:
            string
    ):
        string
    {
        const err =
            error as any;

        const body =
            err?.error;

        if
        (
            err?.status === 403
        )
        {
            return body?.message || body?.Message || 'You do not have permission for this action.';
        }

        if
        (
            typeof body === 'string'
            &&
            body.trim()
        )
        {
            return body.trim();
        }

        return body?.message || body?.Message || body?.title || fallback;
    }


    //===========================================================
    // Print : the enquiries on the canvas (Print Viewer, new tab)
    //===========================================================

    print():
        void
    {
        if
        (
            this.loading || this.loadFailed
        )
        {
            this.toast.error(
                'Nothing to Print',
                'Wait for the enquiries to load.'
            );

            return;
        }

        const view =
            this.selectedTab === 'website'
                ? 'Website'
                : this.selectedTab === 'rides'
                    ? 'Test Rides'
                    : this.tabs.find(x => x.id === this.selectedTab)?.label ?? 'All Enquiries';

        const interest =
            this.interestChips.find(x => x.id === this.selectedInterest)?.label ?? 'All';

        const token =
            saveSalesEnquiriesPrintRequest(
                {
                    ids:this.printIds,
                    view,
                    interest,
                    search:this.searchText.trim()
                }
            );

        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', SALES_ENQUIRIES_PRINT_KEY, token],
                    {
                        queryParams:
                        {
                            doc:'sales-enquiries'
                        }
                    }
                )
            );

        // Not "noopener" : the new tab keeps this session's login
        const tab =
            window.open(
                url,
                '_blank'
            );

        if
        (
            !tab
        )
        {
            this.toast.error(
                'Print Failed',
                'The browser blocked the print tab. Allow pop-ups for this site.'
            );
        }
    }



    //===========================================================
    // Summary Line (below the canvas) : enquiries by stage
    // (search applied; tab and interest not)
    //===========================================================

    get summaryTotal():
        number
    {
        return Number(this.counts['All'] ?? 0);
    }

    countOf
    (
        key:
            string
    ):
        number
    {
        const found =
            Object.keys(this.counts).find(k => k.toLowerCase() === key.toLowerCase());

        return found ? Number(this.counts[found] ?? 0) : 0;
    }

    get summaryNote():
        string
    {
        return this.searchText.trim()
            ? 'Filtered records'
            : 'All records';
    }

    summaryText(
        value: number
    ):
        string
    {
        return value.toLocaleString('en-US');
    }
}
