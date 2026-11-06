//===============================================================
// Service Enquiries List
//
// Toolbar : status tabs (All · Open · Due · Converted ·
// Suspended) on the left; the centre group (Website · Sold
// Bikes); Service / Parts on the right.
//   Website : sent from the website, nobody has taken it yet
//   (Service Appointments have their own page : Follow-ups &
//   Appointments › Service Appointments, 2026-11-06)
//   Sold Bikes : bikes sold from the outlet and their service
//             schedules (from the sale + Service Policy). The
//             table, Add, Restore, History and the right chips
//             switch to the bikes; the count is bikes whose next
//             service is due now. 7 days before a service is due
//             the server raises its Service Enquiry.
// Converted enquiries (job card / invoice / counter sale) open
// in View only.
//
// Server paging : the tab, the Service / Parts chip, the search
// and the sort go to the server (GET paged), which answers one
// page, the chip counts and the summary counts. Sold Bikes stay
// on this page's own list. Links and Delete use
// the enquiry's uuid (PublicId).
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

import
{
    ServiceEnquiry,
    ServiceEnquiryPage,
    ServiceVehicle
}
from '../../../models/service-enquiries.model';

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { ControlTabsComponent, ControlTab } from '../../../../../../shared/components/controls/control-tabs/control-tabs';
import { SearchBoxComponent } from '../../../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { ListTableComponent, ListTableColumn, ListTableRowAction, ListTableRowActionEvent } from '../../../../../../shared/components/layout/list-table/list-table';
import { ServiceFollowUpDialog } from '../follow-up/service-follow-up-dialog';
import { PaginationComponent } from '../../../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../../../shared/components/utilities/history-drawer/history-drawer';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { ProgressDialogService } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';
import { ProgressRunner } from '../../../../../../shared/components/utilities/progress-dialog/progress-runner';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';

import
{
    ServiceEnquiriesService
}
from '../../../services/service-enquiries.service';


// Row with its display texts
type ServiceEnquiryRow =
    ServiceEnquiry
    &
    {
        DateText:string;
        EnquirerText:string;
        TypeText:string;
        TypeDot:string;
        BikeText:string;
        RequestText:string;
        ExecutiveText:string;
        StatusText:string;
        StatusDot:string;
        NextText:string;
    };


// Sold bike with its display texts
type SoldBikeRow =
    ServiceVehicle
    &
    {
        SaleText:string;
        BikeText:string;
        CustomerText:string;
        NextText:string;
        NextDueText:string;
        NextDot:string;
        ProgressText:string;
        WarrantyText:string;
        HasMissed:boolean;
    };


// Schedule status colours (sold bikes)
const SCHEDULE_COLORS: Record<string, string> =
{
    'Due':'#DC2626',
    'Enquired':'#2563EB',
    'Upcoming':'#64748B',
    'Missed':'#B45309',
    'Out of warranty':'#9CA3AF',
    'Declined':'#9CA3AF',
    'Enquiry deleted':'#9CA3AF',
    'Completed':'#16A34A',
    'Taken':'#16A34A',
    'Skipped':'#9CA3AF',
    'Stopped':'#6B7280',
    'No schedule':'#9CA3AF'
};


// Service / Parts chip on the right
interface TypeChip
{
    id:string;
    label:string;
    color:string;
    count:number;
}


const SERVICE_COLOR = '#0D9488';

const PARTS_COLOR = '#7C3AED';


@Component(
{
    selector:'serviceEnquiries-list',

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
        ServiceFollowUpDialog
    ],

    templateUrl:'./service-enquiries-list.html',

    styleUrl:'./service-enquiries-list.css'
})
export class ServiceEnquiriesList
implements OnInit
{
    private readonly service = inject(ServiceEnquiriesService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly toast = inject(ToastService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    //===========================================================
    // Table bindings (enquiries · sold bikes)
    //===========================================================

    private readonly fullActions = { view:true, edit:true, delete:true };

    get tableColumns(): ListTableColumn[]
    {
        return this.isBikes ? this.bikeColumns : this.columns;
    }

    get tableRows(): any[]
    {
        return this.isBikes ? this.pagedBikes : this.pagedRows;
    }

    get tableTotal(): number
    {
        return this.isBikes ? this.filteredBikes.length : this.totalRecords;
    }

    get tableLoading(): boolean
    {
        return this.isBikes ? this.bikesLoading : this.loading;
    }

    get tableFailed(): boolean
    {
        return this.isBikes ? this.bikesFailed : this.loadFailed;
    }

    get tableRowActions(): ListTableRowAction[]
    {
        return this.isBikes ? [] : this.rowActions;
    }

    get tableActions(): { view:boolean; edit:boolean; delete:boolean }
    {
        return this.fullActions;
    }

    get chipList(): TypeChip[]
    {
        return this.isBikes ? this.bikeChips : this.typeChips;
    }

    get chipSelected(): string
    {
        return this.isBikes ? this.selectedBikeStatus : this.selectedType;
    }

    onChip(id: string): void
    {
        if (this.isBikes)
        {
            this.onBikeStatusChange(id);

            return;
        }

        this.onTypeChange(id);
    }

    get searchPlaceholder(): string
    {
        return this.isBikes
            ? 'Search sold bikes, chassis, customer, mobile, service...'
            : 'Search enquiries, mobile, bike, registration, part...';
    }

    private readonly cdr = inject(ChangeDetectorRef);

    readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges()
        );


    //===========================================================
    // Tabs / centre group / type chips
    //===========================================================

    tabs:
        ControlTab[] =
    [
        { id:'all',        label:'All Enquiries' },
        { id:'open',       label:'Open' },
        { id:'due',        label:'Due' },
        { id:'converted',  label:'Converted' },
        { id:'suspended',  label:'Suspended' }
    ];

    selectedTab = 'all';

    websiteCount = 0;

    visitsCount = 0;

    selectedType = 'all';

    typeChips: TypeChip[] = [];


    //===========================================================
    // Sold bikes (centre "Sold Bikes")
    //===========================================================

    get isBikes(): boolean
    {
        return this.selectedTab === 'bikes';
    }

    private bikes: SoldBikeRow[] = [];

    filteredBikes: SoldBikeRow[] = [];

    pagedBikes: SoldBikeRow[] = [];

    bikesLoading = false;

    bikesFailed = false;

    bikesCount = 0;

    selectedBikeStatus = 'all';

    bikeChips: TypeChip[] = [];

    readonly bikeColumns:
        ListTableColumn[] =
    [
        { header:'#',            field:'serial',       type:'serial', width:'50px', align:'center' },
        { header:'Chassis No',   field:'ChassisNo',    width:'170px', align:'left' },
        { header:'Sold',         field:'SaleText',     width:'170px', align:'left' },
        { header:'Bike',         field:'BikeText',     width:'210px', align:'left' },
        { header:'Customer',     field:'CustomerText', align:'left' },
        { header:'Next Service', field:'NextText',     width:'230px', align:'left', dotField:'NextDot' },
        { header:'Due',          field:'NextDueText',  width:'120px', align:'center' },
        { header:'Taken',        field:'ProgressText', width:'80px',  align:'center' },
        { header:'Warranty',     field:'WarrantyText', width:'130px', align:'center' },
        { header:'Actions',      field:'actions',      type:'actions', width:'130px', align:'center' }
    ];


    //===========================================================
    // Data
    //===========================================================

    // Server paging : rows of the whole view, counts, sort
    totalRecords = 0;

    // Summary : All · Open · Due · Converted · Suspended
    counts: Record<string, number> = {};

    private serviceCount = 0;

    private partsCount = 0;

    private sortField = '';

    private sortDirection: 'asc' | 'desc' = 'asc';

    private searchTimer: ReturnType<typeof setTimeout> | null = null;

    // Answers of older calls are dropped
    private loadSeq = 0;

    pagedRows: ServiceEnquiryRow[] = [];

    searchText = '';

    loading = false;

    loadFailed = false;

    currentPage = 1;

    pageSize = 10;

    historyOpened = false;

    historyTitle = 'Service Enquiries History';

    historyItems: any[] = [];

    private readonly today = ServiceEnquiriesList.isoDate(new Date());


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


    readonly columns:
        ListTableColumn[] =
    [
        { header:'#',              field:'serial',       type:'serial', width:'50px',  align:'center' },
        { header:'Enquiry No',     field:'EnquiryNo',    width:'215px', align:'center' },
        { header:'Date',           field:'DateText',     width:'120px', align:'center' },
        { header:'Type',           field:'TypeText',     width:'95px',  align:'left', dotField:'TypeDot' },
        { header:'Enquirer',       field:'EnquirerText', align:'left' },
        { header:'Bike',           field:'BikeText',     width:'200px', align:'left' },
        { header:'Request',        field:'RequestText',  width:'220px', align:'left' },
        { header:'Executive',      field:'ExecutiveText', width:'130px', align:'left' },
        { header:'Status',         field:'StatusText',   width:'150px', align:'left', dotField:'StatusDot' },
        { header:'Next',           field:'NextText',     width:'150px', align:'center' },
        { header:'Actions',        field:'actions',      type:'actions', width:'130px', align:'center' }
    ];


    ngOnInit(): void
    {
        // ?tab=bikes (back from the sold bike form)
        if (this.route.snapshot.queryParamMap.get('tab') === 'bikes')
        {
            this.selectedTab = 'bikes';
        }

        this.loadItems();
    }


    //===========================================================
    // Dates
    //===========================================================

    static isoDate(date: Date): string
    {
        const pad = (n: number): string => String(n).padStart(2, '0');

        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    // yyyy-MM-dd → 03 Nov 2026
    private formatDate(value: string | null): string
    {
        if (!value)
        {
            return '—';
        }

        const [year, month, day] = value.slice(0, 10).split('-').map(Number);

        if (!year || !month || !day)
        {
            return value;
        }

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return `${String(day).padStart(2, '0')} ${months[month - 1]} ${year}`;
    }


    //===========================================================
    // Load
    //===========================================================

    // Fresh load (open, refresh, after a change) : the server
    // raises due service enquiries first, then the bikes load
    loadItems(): void
    {
        this.loadPage(true);
    }


    // One page of the enquiries (tab, chip, search, sort)
    loadPage(fresh: boolean = false): void
    {
        const seq = ++this.loadSeq;

        this.loading = true;

        this.loadFailed = false;

        const tab =
            this.isBikes ? 'all' : this.selectedTab;

        this.service
            .getPaged(
                {
                    page:this.currentPage,
                    pageSize:this.pageSize,
                    search:this.isBikes ? '' : this.searchText,
                    sort:this.sortField,
                    dir:this.sortDirection,
                    tab,
                    type:this.selectedType,
                    raise:fresh
                })
            .subscribe
            ({
                next: (response: ServiceEnquiryPage): void =>
                {
                    if (seq !== this.loadSeq)
                    {
                        return;
                    }

                    this.pagedRows = (response.items ?? []).map(item => this.toRow(item));

                    this.totalRecords = response.totalCount;

                    this.counts = response.counts ?? {};

                    this.websiteCount = response.websiteCount;

                    this.visitsCount = response.visitsCount;

                    this.serviceCount = response.serviceCount;

                    this.partsCount = response.partsCount;

                    // The server moves back to the last page when
                    // the list became shorter
                    if (!this.isBikes && response.page > 0)
                    {
                        this.currentPage = response.page;
                    }

                    this.loading = false;

                    this.buildTypeChips();

                    this.cdr.detectChanges();

                    // After the enquiries : the server raises due
                    // services first, then the bikes show it
                    if (fresh)
                    {
                        this.loadBikes();
                    }
                },

                error: (error: unknown): void =>
                {
                    if (seq !== this.loadSeq)
                    {
                        return;
                    }

                    console.error('Load Service Enquiries Error:', error);

                    this.pagedRows = [];
                    this.totalRecords = 0;
                    this.counts = {};

                    this.loading = false;

                    this.loadFailed = true;

                    this.toast.error('Load Failed', this.errorText(error, 'Unable to load service enquiries. Run ServiceEnquiries_Tables.sql.'));

                    this.cdr.detectChanges();

                    if (fresh)
                    {
                        this.loadBikes();
                    }
                }
            });
    }


    loadBikes(): void
    {
        this.bikesLoading = true;

        this.bikesFailed = false;

        this.service
            .getVehicles()
            .subscribe
            ({
                next: (response: ServiceVehicle[]): void =>
                {
                    this.bikes = (response ?? []).map(item => this.toBikeRow(item));

                    this.bikesLoading = false;

                    this.bikesCount = this.bikes.filter(x => x.IsActive && (x.NextStatusText === 'Due' || x.NextStatusText === 'Enquired')).length;

                    this.applyBikeFilters();

                    this.cdr.detectChanges();
                },

                error: (error: unknown): void =>
                {
                    console.error('Load Sold Bikes Error:', error);

                    this.bikes = [];
                    this.filteredBikes = [];
                    this.pagedBikes = [];

                    this.bikesLoading = false;

                    this.bikesFailed = true;

                    if (this.isBikes)
                    {
                        this.toast.error('Load Failed', this.errorText(error, 'Unable to load sold bikes. Run ServiceVehicles_Tables.sql.'));
                    }

                    this.cdr.detectChanges();
                }
            });
    }


    private toBikeRow(item: ServiceVehicle): SoldBikeRow
    {
        const next = item.NextStatusText;

        return {
            ...item,

            SaleText:
                this.formatDate(item.SaleDate)
                + (item.SaleSource === 'Sale' ? ` · ${item.SaleDocNo || 'Sale'}` : ' · by hand'),

            BikeText: [item.ModelName, item.RegistrationNo].filter(x => !!x).join(' · ') || '—',

            CustomerText: `${item.CustomerName} - ${item.Mobile}`,

            NextText:
                item.NextServiceName
                    ? `${item.NextServiceName} · ${next}${item.NextEnquiryNo && next === 'Enquired' ? ' ' + item.NextEnquiryNo.slice(-5) : ''}`
                    : next,

            NextDueText: item.NextDueDate ? this.formatDate(item.NextDueDate) : '—',

            NextDot: SCHEDULE_COLORS[next] ?? '#64748B',

            ProgressText: item.TotalCount > 0 ? `${item.TakenCount} / ${item.TotalCount}` : '—',

            WarrantyText:
                !item.WarrantyUntil
                    ? '—'
                    : item.InWarranty
                        ? `to ${this.formatDate(item.WarrantyUntil).slice(3)}`
                        : 'Expired',

            HasMissed: item.Schedules.some(x => x.StatusText === 'Missed')
        };
    }


    private inBikeStatus(item: SoldBikeRow, id: string): boolean
    {
        switch (id)
        {
            case 'due':       return item.IsActive && (item.NextStatusText === 'Due' || item.NextStatusText === 'Enquired');
            case 'upcoming':  return item.IsActive && item.NextStatusText === 'Upcoming';
            case 'missed':    return item.HasMissed;
            case 'completed': return item.NextStatusText === 'Completed';
            case 'stopped':   return !item.IsActive;
            default:          return true;
        }
    }


    applyBikeFilters(): void
    {
        const keyword = this.searchText.trim().toLowerCase();

        const inView =
            this.bikes.filter(item =>
                !keyword
                ||
                [
                    item.ChassisNo,
                    item.EngineNo,
                    item.RegistrationNo,
                    item.ModelName,
                    item.BrandName,
                    item.ColorName,
                    item.CustomerName,
                    item.CustomerCode,
                    item.Mobile,
                    item.SaleText,
                    item.NextText,
                    item.BranchName,
                    item.Schedules.map(x => `${x.ServiceName} ${x.EnquiryNo}`).join(' '),
                    item.Remarks
                ]
                .join(' ')
                .toLowerCase()
                .includes(keyword));

        const chip = (id: string, label: string, color: string): TypeChip =>
            ({ id, label, color, count:inView.filter(x => this.inBikeStatus(x, id)).length });

        this.bikeChips =
        [
            chip('all',       'All',       ''),
            chip('due',       'Due',       SCHEDULE_COLORS['Enquired']),
            chip('upcoming',  'Upcoming',  SCHEDULE_COLORS['Upcoming']),
            chip('missed',    'Missed',    SCHEDULE_COLORS['Missed']),
            chip('completed', 'Completed', SCHEDULE_COLORS['Completed']),
            chip('stopped',   'Stopped',   SCHEDULE_COLORS['Stopped'])
        ];

        let rows = inView.filter(x => this.inBikeStatus(x, this.selectedBikeStatus));

        // Due now / upcoming : nearest first
        if (this.selectedBikeStatus === 'due' || this.selectedBikeStatus === 'upcoming')
        {
            rows = [...rows].sort((a, b) => (a.NextDueDate ?? '').localeCompare(b.NextDueDate ?? ''));
        }

        this.filteredBikes = rows;

        // The enquiries keep their server page while hidden
        if (this.isBikes)
        {
            this.currentPage = 1;
        }

        this.updatePagination();
    }


    onBikeStatusChange(id: string): void
    {
        if (this.selectedBikeStatus === id)
        {
            return;
        }

        this.selectedBikeStatus = id;

        this.applyBikeFilters();

        this.cdr.detectChanges();
    }


    private isOpen(item: ServiceEnquiry): boolean
    {
        return !item.IsConverted && item.StatusStage !== 'Lost';
    }


    private toRow(item: ServiceEnquiry): ServiceEnquiryRow
    {
        const open = this.isOpen(item);

        const due =
            open && !!item.NextFollowUpDate && item.NextFollowUpDate.slice(0, 10) <= this.today;

        const bike =
            [item.ModelName, item.RegistrationNo].filter(x => !!x).join(' · ');

        const visit =
            open && item.PreferredDate
                ? `Visit ${this.formatDate(item.PreferredDate).slice(0, 6)}${item.PreferredSlot ? ' · ' + item.PreferredSlot : ''}`
                : '';

        return {
            ...item,

            DateText: this.formatDate(item.EnquiryDate),

            EnquirerText: `${item.EnquirerName} - ${item.EnquirerMobile}`,

            TypeText: item.EnquiryType,

            TypeDot: item.EnquiryType === 'Parts' ? PARTS_COLOR : SERVICE_COLOR,

            BikeText: bike || '—',

            RequestText:
                (item.RequestSummary || '—')
                + (item.PickupDrop ? ' · pick-up' : ''),

            ExecutiveText: item.ExecutiveUserId > 0 ? item.ExecutiveName : 'Unassigned',

            StatusText:
                item.IsConverted
                    ? `Converted${item.ConvertedDocNo ? ' · ' + item.ConvertedDocNo : ''}`
                    : item.StatusStage === 'Lost'
                        ? item.StatusName || 'Suspended'
                        : item.StatusName,

            StatusDot: item.IsConverted ? '#16A34A' : item.StatusColor,

            NextText:
                !open
                    ? '—'
                    : visit || (this.formatDate(item.NextFollowUpDate) + (due ? ' •' : ''))
        };
    }


    //===========================================================
    // Filters (server)
    //===========================================================

    // Tab, chip or search changed : page 1 from the server
    applyFilters(): void
    {
        this.currentPage = 1;

        this.loadPage();
    }


    // Service / Parts counts of the tab + search (server)
    private buildTypeChips(): void
    {
        this.typeChips =
        [
            { id:'all',     label:'All',     color:'',            count:this.serviceCount + this.partsCount },
            { id:'Service', label:'Service', color:SERVICE_COLOR, count:this.serviceCount },
            { id:'Parts',   label:'Parts',   color:PARTS_COLOR,   count:this.partsCount }
        ];
    }


    onTabChange(value: string): void
    {
        this.selectedTab = value;

        if (this.isBikes)
        {
            this.applyBikeFilters();
        }
        else
        {
            this.applyFilters();
        }

        this.cdr.detectChanges();
    }

    // Centre group : a second click goes back to All Enquiries
    onInboxClick(id: 'website' | 'bikes'): void
    {
        this.onTabChange(this.selectedTab === id ? 'all' : id);
    }

    onTypeChange(id: string): void
    {
        if (this.selectedType === id)
        {
            return;
        }

        this.selectedType = id;

        this.applyFilters();

        this.cdr.detectChanges();
    }

    onSearch(value: string): void
    {
        this.searchText = value ?? '';

        if (this.isBikes)
        {
            this.applyBikeFilters();
        }
        else
        {
            if (this.searchTimer)
            {
                clearTimeout(this.searchTimer);
            }

            this.searchTimer =
                setTimeout((): void =>
                {
                    this.searchTimer = null;

                    this.applyFilters();
                }, 300);
        }
    }

    onSort(event: { field: string; direction: 'asc' | 'desc' }): void
    {
        const sign = event.direction === 'asc' ? 1 : -1;

        const field =
            event.field === 'DateText' ? 'EnquiryDate'
            : event.field === 'TimeText' ? 'SlotStart'
            : event.field === 'SaleText' ? 'SaleDate'
            : event.field === 'NextDueText' ? 'NextDueDate'
            : event.field;

        const compare = (a: any, b: any): number =>
            {
                const valueA = a?.[field];

                const valueB = b?.[field];

                if (valueA == null && valueB == null) return 0;

                if (valueA == null) return -1 * sign;

                if (valueB == null) return 1 * sign;

                if (typeof valueA === 'string' && typeof valueB === 'string')
                {
                    return valueA.localeCompare(valueB, undefined, { numeric:true }) * sign;
                }

                return (valueA < valueB ? -1 : valueA > valueB ? 1 : 0) * sign;
            };

        if (this.isBikes)
        {
            this.filteredBikes = [...this.filteredBikes].sort(compare);
        }
        else
        {
            // Enquiries : the server sorts the whole view
            this.sortField = event.field === 'DateText' ? 'EnquiryDate' : event.field;

            this.sortDirection = event.direction;

            this.currentPage = 1;

            this.loadPage();

            return;
        }

        this.currentPage = 1;

        this.updatePagination();
    }

    refresh(): void
    {
        this.searchText = '';

        this.currentPage = 1;

        this.loadItems();
    }

    updatePagination(): void
    {
        // Sold Bikes only (the enquiries come a page at a time from
        // the server)
        const start = (this.currentPage - 1) * this.pageSize;

        this.pagedBikes = this.filteredBikes.slice(start, start + this.pageSize);
    }

    onPageChange(page: number): void
    {
        this.currentPage = page;

        if (this.isBikes)
        {
            this.updatePagination();

            return;
        }

        this.loadPage();
    }

    onPageSizeChange(size: number): void
    {
        this.pageSize = size;

        this.currentPage = 1;

        this.updatePagination();

        if (!this.isBikes)
        {
            this.loadPage();
        }
    }


    //===========================================================
    // Add / View / Edit
    //===========================================================

    add(): void
    {
        void this.router.navigate(this.isBikes ? ['bike', 'add'] : ['add'], { relativeTo:this.route.parent });
    }

    //===========================================================
    // Log a call (Service Follow-up pop-up)
    //===========================================================

    readonly rowActions: ListTableRowAction[] =
    [
        {
            key:'call',
            icon:'fas fa-phone',
            title:'Log a call',
            tone:'success',
            visible:(row: any): boolean => !row.IsConverted && row.StatusStage !== 'Lost'
        }
    ];

    callEnquiry: ServiceEnquiry | null = null;

    onRowAction(event: ListTableRowActionEvent): void
    {
        if (event.key === 'call' && !this.isBikes)
        {
            this.callEnquiry = event.row as ServiceEnquiry;

            this.cdr.detectChanges();
        }
    }

    onCallSaved(): void
    {
        this.callEnquiry = null;

        this.loadItems();
    }

    onCallClosed(): void
    {
        this.callEnquiry = null;

        this.cdr.detectChanges();
    }

    view(item: any): void
    {
        if (this.isBikes)
        {
            void this.router.navigate(['bike', 'view', (item as SoldBikeRow).ServiceVehicleId], { relativeTo:this.route.parent });

            return;
        }

        void this.router.navigate(['view', item.PublicId || item.ServiceEnquiryId], { relativeTo:this.route.parent });
    }

    edit(item: any): void
    {
        if (this.isBikes)
        {
            void this.router.navigate(['bike', 'edit', (item as SoldBikeRow).ServiceVehicleId], { relativeTo:this.route.parent });

            return;
        }

        if (item.IsConverted)
        {
            this.toast.info('Edit Not Allowed', `${item.EnquiryNo} is closed by ${item.ConvertedDocType} ${item.ConvertedDocNo} and cannot be changed.`);

            return;
        }

        void this.router.navigate(['edit', item.PublicId || item.ServiceEnquiryId], { relativeTo:this.route.parent });
    }


    //===========================================================
    // Delete / Restore
    //===========================================================

    delete(item: any): void
    {
        if (this.progress.busy)
        {
            return;
        }

        if (this.isBikes)
        {
            this.deleteBike(item as SoldBikeRow);

            return;
        }

        if (item.IsConverted)
        {
            this.toast.info('Delete Not Allowed', `${item.EnquiryNo} is closed by ${item.ConvertedDocType} ${item.ConvertedDocNo} and cannot be deleted.`);

            return;
        }

        this.confirmDialog.open
        (
            'Delete Service Enquiry',

            `Are you sure you want to delete ${item.EnquiryNo} (${item.EnquirerName} - ${item.EnquirerMobile}) ?`,

            (): void =>
            {
                setTimeout(() => this.deleteItem(item));
            }
        );
    }

    private deleteItem(item: ServiceEnquiryRow): void
    {
        this.progress
            .run(
                'Deleting Service Enquiry',
                `Please wait while ${item.EnquiryNo} is being deleted...`,
                'Service enquiry deleted.',
                this.service.delete(item.PublicId ?? '')
            )
            .subscribe
            ({
                next: (): void =>
                {
                    this.toast.success('Delete Successful', `${item.EnquiryNo} deleted.`);

                    this.loadItems();
                },

                error: (error: unknown): void =>
                {
                    console.error('Delete Service Enquiry Error:', error);

                    if (error instanceof HttpErrorResponse && error.status === 409)
                    {
                        this.toast.info('Delete Blocked', this.errorText(error, 'The service enquiry cannot be deleted.'));

                        return;
                    }

                    this.toast.error('Delete Failed', this.errorText(error, 'Failed to delete the service enquiry.'));
                }
            });
    }

    // Sold bike : only bikes added by hand (a sale's bike is set
    // inactive on its form, or stopped by the sales return)
    private deleteBike(item: SoldBikeRow): void
    {
        if (item.SaleSource === 'Sale')
        {
            this.toast.info('Delete Not Allowed', `${item.ChassisNo} comes from ${item.SaleDocType} ${item.SaleDocNo}. Set it inactive on its form to stop the reminders.`);

            return;
        }

        this.confirmDialog.open
        (
            'Delete Sold Bike',

            `Are you sure you want to delete ${item.ModelName} ${item.ChassisNo} (${item.CustomerName}) and its service schedule?`,

            (): void =>
            {
                setTimeout(() =>
                    this.progress
                        .run(
                            'Deleting Sold Bike',
                            `Please wait while ${item.ChassisNo} is being deleted...`,
                            'Sold bike deleted.',
                            this.service.deleteVehicle(item.ServiceVehicleId)
                        )
                        .subscribe
                        ({
                            next: (): void =>
                            {
                                this.toast.success('Delete Successful', `${item.ChassisNo} deleted.`);

                                this.loadBikes();
                            },

                            error: (error: unknown): void =>
                            {
                                console.error('Delete Sold Bike Error:', error);

                                this.toast.error('Delete Failed', this.errorText(error, 'Failed to delete the sold bike.'));
                            }
                        }));
            }
        );
    }

    restore(): void
    {
        if (this.progress.busy)
        {
            return;
        }

        if (this.isBikes)
        {
            this.confirmDialog.open
            (
                'Restore Sold Bike',

                'Are you sure you want to restore the most recently deleted sold bike?',

                (): void =>
                {
                    setTimeout(() =>
                        this.progress
                            .run<unknown>(
                                'Restoring Sold Bike',
                                'Please wait while the most recently deleted sold bike is being restored...',
                                'Sold bike restored.',
                                this.service.restoreVehicle()
                            )
                            .subscribe
                            ({
                                next: (): void =>
                                {
                                    this.toast.success('Restore Successful', 'The most recently deleted sold bike has been restored.');

                                    this.loadBikes();
                                },

                                error: (error: unknown): void =>
                                {
                                    if (error instanceof HttpErrorResponse && error.status === 404)
                                    {
                                        this.toast.info('No Data to Restore', 'There is no deleted sold bike to restore.');

                                        return;
                                    }

                                    this.toast.error('Restore Failed', this.errorText(error, 'Failed to restore the sold bike.'));
                                }
                            }));
                },

                'Restore',

                'Cancel',

                'primary'
            );

            return;
        }

        this.confirmDialog.open
        (
            'Restore Service Enquiry',

            'Are you sure you want to restore the most recently deleted service enquiry?',

            (): void =>
            {
                setTimeout(() => this.restoreItem());
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }

    private restoreItem(): void
    {
        this.progress
            .run<unknown>(
                'Restoring Service Enquiry',
                'Please wait while the most recently deleted service enquiry is being restored...',
                'Service enquiry restored.',
                this.service.restore()
            )
            .subscribe
            ({
                next: (): void =>
                {
                    this.toast.success('Restore Successful', 'The most recently deleted service enquiry has been restored.');

                    this.loadItems();
                },

                error: (error: unknown): void =>
                {
                    console.error('Restore Service Enquiry Error:', error);

                    if (error instanceof HttpErrorResponse && error.status === 404)
                    {
                        this.toast.info('No Data to Restore', 'There is no deleted service enquiry to restore.');

                        return;
                    }

                    this.toast.error('Restore Failed', this.errorText(error, 'Failed to restore the service enquiry.'));
                }
            });
    }


    //===========================================================
    // History
    //===========================================================

    openHistory(): void
    {
        this.historyTitle = this.isBikes ? 'Sold Bikes History' : 'Service Enquiries History';

        (this.isBikes ? this.service.getVehicleHistory() : this.service.getHistory())
            .subscribe
            ({
                next: (response: any[]): void =>
                {
                    this.historyItems =
                        (response ?? []).map(history => ({
                            title: history.activityTitle ?? history.ActivityTitle,
                            description: history.activityDescription ?? history.ActivityDescription,
                            user: history.performedByName ?? history.PerformedByName ?? 'System',
                            dateTime: new Date(history.performedDate ?? history.PerformedDate).toLocaleString(),
                            badge: history.activityType ?? history.ActivityType
                        }));

                    this.historyOpened = true;

                    this.cdr.detectChanges();
                },

                error: (error: unknown): void =>
                {
                    console.error('History Load Failed:', error);

                    this.toast.error('History', 'Failed to load the service enquiry history.');
                }
            });
    }

    closeHistory(): void
    {
        this.historyOpened = false;

        this.cdr.detectChanges();
    }


    //===========================================================
    // Server message
    //===========================================================

    private errorText(error: unknown, fallback: string): string
    {
        const err = error as any;

        const body = err?.error;

        if (err?.status === 403)
        {
            return body?.message || body?.Message || 'You do not have permission for this action.';
        }

        if (typeof body === 'string' && body.trim())
        {
            return body.trim();
        }

        return body?.message || body?.Message || body?.title || fallback;
    }


    //===========================================================
    // Summary Line (below the canvas) : enquiries by stage
    // (search applied; tab and type not)
    //===========================================================

    get summaryTotal(): number
    {
        return Number(this.counts['All'] ?? 0);
    }

    countOf(key: string): number
    {
        const found = Object.keys(this.counts).find(k => k.toLowerCase() === key.toLowerCase());

        return found ? Number(this.counts[found] ?? 0) : 0;
    }

    get summaryNote(): string
    {
        return this.searchText.trim() ? 'Filtered records' : 'All records';
    }

    summaryText(value: number): string
    {
        return value.toLocaleString('en-US');
    }
}
