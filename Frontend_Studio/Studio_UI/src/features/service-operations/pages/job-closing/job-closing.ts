//===============================================================
// Imports
//===============================================================
import
{
    Component,
    OnInit,
    ChangeDetectorRef,
    DestroyRef,
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
    ActivatedRoute,
    Router
}
from '@angular/router';
import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';
import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { WorkspaceArtComponent } from '../../../../shared/components/layout/workspace-art/workspace-art';
import { ControlTab, ControlTabsComponent } from '../../../../shared/components/controls/control-tabs/control-tabs';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { DatepickerComponent } from '../../../../shared/components/controls/datepicker/datepicker';
import { PaginationComponent } from '../../../../shared/components/controls/pagination/pagination';
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ListTableColumn, ListTableComponent, ListTableRowAction, ListTableRowActionEvent } from '../../../../shared/components/layout/list-table/list-table';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../human-resource-manangement/services/hr-progress.service';
import { hrToDate, hrToText } from '../../../human-resource-manangement/services/hr-date';
import { WsService } from '../../shared/ws.service';
import { openServiceInvoicePrint } from '../../print/service-invoice.print';
import
{
    ClosingDetail,
    ClosingFinding,
    ClosingJob,
    ClosingMove,
    ClosingOutsourced,
    ClosingPart,
    JobCard,
    ServiceInvoice,
    ServiceInvoiceLine,
    wsDateTime,
    wsDay,
    wsMinutes,
    wsMoney,
    wsStatusColor
}
from '../../shared/ws.models';

//===============================================================
// Model
//===============================================================

interface Option
{
    label: string;
    value: any;
    // the serial token of the job : the big figure of its row
    token?: string;
}

// The lines of the bill of one kind (service charges, parts, ...)
interface LineGroup
{
    title: string;
    icon: string;
    lines: ServiceInvoiceLine[];
    total: number;
}

//===============================================================
// Job Closing (owner 2026-11-19) : stage 4 of a job card.
//
// A job in work is closed : it is priced (its service charges, the
// parts issued less returned, outside works, VAT, the discount), the
// sale goes to the receivable of the customer and the job gets its
// bill number. No money here : the Billing stage collects it.
// Allocated parts that were not issued are left out of the bill.
//
// List : To Close (the jobs in work) | Closed (the bills).
// Form : the job card, the date, the round off; the bill is priced by
// the server and shown as it will be posted.
//
// The whole job shows before it is closed (owner 2026-11-19), on the
// tabs of the form : The Bill (a discount per line : 10% or an
// amount) | Parts (allocated, issued, returned, on the job, remaining;
// the issues and the returns) | Complaints & Observations (each one
// marked Solved / Needs Further Work / Not Done, with a note) | Job
// Details (the opening, the services, the work, the checklist, the
// statuses).
//===============================================================

@Component(
{
    selector:'job-closing',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        WorkspaceArtComponent,
        ControlTabsComponent,
        SearchDropdownComponent,
        TextboxComponent,
        DatepickerComponent,
        PaginationComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./job-closing.html',
    styleUrl:'./job-closing.css'
})
export class JobClosingPage
implements OnInit
{
    private readonly ws = inject(WsService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progress = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    readonly day = wsDay;

    readonly money = wsMoney;

    readonly dateTime = wsDateTime;

    readonly minutes = wsMinutes;

    readonly asDate = hrToDate;

    readonly statusColor = wsStatusColor;

    // 'list' or 'add' : from the URL
    mode:
        'list' | 'add' = 'list';

    loading =
        false;

    loadFailed =
        false;

    // the jobs in work that have no bill yet
    jobs:
        ClosingJob[] = [];

    // the bills
    closed:
        ServiceInvoice[] = [];

    today =
        '';

    //===========================================================
    // The list
    //===========================================================

    readonly listConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:true,
        reserveFooterSpace:true,
        bodyScrollable:true,
        fixedHeight:true,
        visibleRows:10,
        // room for the small second line of a cell
        rowHeight:38,
        headerHeight:36,
        footerHeight:56
    };

    readonly tabs:
        ControlTab[] =
    [
        { id:'open', label:'To Close' },
        { id:'closed', label:'Closed' }
    ];

    selectedTab =
        'open';

    // no view, edit or delete : the row buttons do the work
    readonly listActions =
        { view:false, edit:false, delete:false };

    readonly openColumns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Job Card', field:'JobCardNo', width:'250px', align:'left', subField:'DateText', subFigureField:'SerialToken' },
        { header:'Customer', field:'CustomerName', width:'230px', align:'left', subField:'Mobile' },
        { header:'Model', field:'ModelName', width:'240px', align:'left', subField:'BikeNo' },
        { header:'Service Type', field:'JobType', width:'160px', align:'left' },
        { header:'Status', field:'Status', width:'150px', align:'left', dotField:'StatusColor' },
        { header:'Not Issued', field:'UnissuedText', width:'130px', align:'right' },
        { header:'Actions', field:'actions', type:'actions', width:'90px', align:'center' }
    ];

    readonly closedColumns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Bill No', field:'InvoiceNo', width:'230px', align:'left', subField:'DateText' },
        { header:'Job Card', field:'JobCardNo', width:'220px', align:'left', subField:'JobType' },
        { header:'Customer', field:'CustomerName', width:'220px', align:'left', subField:'Mobile' },
        { header:'Service', field:'LabourText', width:'110px', align:'right' },
        { header:'Parts', field:'PartsText', width:'110px', align:'right' },
        { header:'VAT', field:'VatText', width:'100px', align:'right' },
        { header:'Discount', field:'DiscountText', width:'100px', align:'right' },
        { header:'Bill Total', field:'GrandText', width:'120px', align:'right' },
        { header:'Due', field:'DueText', width:'110px', align:'right' },
        { header:'Actions', field:'actions', type:'actions', width:'90px', align:'center' }
    ];

    readonly openRowActions:
        ListTableRowAction[] =
    [
        { key:'close', icon:'fas fa-file-invoice-dollar', title:'Close this job : price it and make the bill', tone:'primary' }
    ];

    readonly closedRowActions:
        ListTableRowAction[] =
    [
        { key:'print', icon:'fas fa-print', title:'Print the bill', tone:'primary' }
    ];

    searchText =
        '';

    currentPage =
        1;

    pageSize =
        10;

    get columns(): ListTableColumn[]
    {
        return this.selectedTab === 'open' ? this.openColumns : this.closedColumns;
    }

    get rowActions(): ListTableRowAction[]
    {
        return this.selectedTab === 'open' ? this.openRowActions : this.closedRowActions;
    }

    // the rows of the tab, searched
    private get all(): any[]
    {
        const find = this.searchText.trim().toLowerCase();

        const rows: any[] =
            this.selectedTab === 'open'
                ? this.jobs.map(x => ({
                    ...x,
                    DateText:wsDay(x.JobDate),
                    StatusColor:wsStatusColor(x.Status),
                    UnissuedText:x.UnissuedParts > 0 ? `${x.UnissuedParts} part(s)` : '-'
                }))
                : this.closed.map(x => ({
                    ...x,
                    DateText:wsDay(x.InvoiceDate),
                    LabourText:wsMoney(x.LabourTotal),
                    PartsText:wsMoney(x.PartsTotal + x.OutsideTotal),
                    VatText:wsMoney(x.VatTotal),
                    DiscountText:wsMoney(x.Discount),
                    GrandText:wsMoney(x.GrandTotal),
                    DueText:wsMoney(x.DueAmount)
                }));

        return !find
            ? rows
            : rows.filter(x =>
                [x.JobCardNo, x.InvoiceNo, x.CustomerName, x.Mobile, x.ModelName, x.BikeNo, x.SerialToken, x.JobType, x.Status]
                    .some(v => String(v ?? '').toLowerCase().includes(find)));
    }

    get totalRecords(): number
    {
        return this.all.length;
    }

    get rows(): any[]
    {
        const start = (this.currentPage - 1) * this.pageSize;

        return this.all.slice(start, start + this.pageSize);
    }

    //===========================================================
    // The form
    //===========================================================

    readonly formConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:false,
        reserveFooterSpace:false,
        bodyScrollable:true,
        fixedHeight:true
    };

    readonly formTabs:
        ControlTab[] =
    [
        { id:'bill', label:'The Bill' },
        { id:'services', label:'Service Charges' },
        { id:'parts', label:'Parts' },
        { id:'outsourcing', label:'Outsourcing' },
        { id:'findings', label:'Observations' },
        { id:'checklist', label:'Checklist' },
        { id:'details', label:'Job Details' }
    ];

    formTab =
        'bill';

    readonly results =
        ['Solved', 'Needs Further Work', 'Not Done'];

    // the whole job : its card, parts, issues, returns, findings
    detail:
        ClosingDetail | null = null;

    detailLoading =
        false;

    // a newer job was picked : the answer of an older one is dropped
    private detailRun = 0;

    // the item discount : a percent every charged line takes, and
    // an amount the charged lines absorb by their value
    itemPercent =
        '';

    itemAmount =
        '';

    jobId:
        string | null = null;

    closeDate =
        '';

    discount =
        '';

    remarks =
        '';

    // the bill as the server prices it (nothing saved)
    bill:
        ServiceInvoice | null = null;

    pricing =
        false;

    // the last pricing failed (the server or the database did not
    // answer) : the page says so and offers to price again - it
    // never shows an empty bill as "nothing to bill"
    priceFailed =
        false;

    private priceTimer: any = null;

    // a newer pricing is on its way : an older answer is dropped
    private priceRun = 0;

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.mode = this.router.url.split('?')[0].endsWith('/add') ? 'add' : 'list';

        if (this.mode === 'list' && this.route.snapshot.queryParamMap.get('tab') === 'closed')
        {
            this.selectedTab = 'closed';
        }

        this.loadList();
    }

    loadList():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.ws
            .getClosingLookups()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:lookups =>
                {
                    this.loading = false;
                    this.jobs = lookups?.Jobs ?? [];
                    this.today = (lookups?.Today ?? '').substring(0, 10);

                    if (this.mode === 'add')
                    {
                        this.closeDate = this.closeDate || this.today;

                        // opened for a job (the list, the Job Cards page)
                        const job = this.route.snapshot.queryParamMap.get('job');

                        if (job && !this.jobId && this.jobs.some(x => x.PublicId === job))
                        {
                            this.jobId = job;
                            this.loadDetail();
                            this.price();
                        }
                    }

                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.failed(error, 'The jobs could not be loaded.');
                    this.cdr.detectChanges();
                }
            });

        if (this.mode === 'list')
        {
            this.ws
                .getClosedJobs()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(
                {
                    next:bills =>
                    {
                        this.closed = bills ?? [];
                        this.cdr.detectChanges();
                    },
                    error:error => this.failed(error, 'The closed jobs could not be loaded.')
                });
        }
    }

    private failed(error: any, fallback: string):
        void
    {
        this.toast.error('Error', error?.error?.message ?? fallback);
    }

    //===========================================================
    // The list : events
    //===========================================================

    onTab(value: string):
        void
    {
        this.selectedTab = value || 'open';
        this.currentPage = 1;
        this.cdr.detectChanges();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;
        this.cdr.detectChanges();
    }

    onPageChange(page: number):
        void
    {
        this.currentPage = page;
        this.cdr.detectChanges();
    }

    onPageSizeChange(size: number):
        void
    {
        this.pageSize = size;
        this.currentPage = 1;
        this.cdr.detectChanges();
    }

    add(job?: string):
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route, queryParams:job ? { job } : {} });
    }

    onRowAction(event: ListTableRowActionEvent):
        void
    {
        if (event.key === 'close')
        {
            this.add(event.row?.PublicId);
        }

        if (event.key === 'print')
        {
            this.print(event.row?.PublicId);
        }
    }

    print(publicId: string):
        void
    {
        const problem = publicId ? openServiceInvoicePrint(this.router, publicId) : '';

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }

    goToList(tab = ''):
        void
    {
        void this.router.navigate(['../list'], { relativeTo:this.route, queryParams:tab ? { tab } : {} });
    }

    //===========================================================
    // The form : the job, the date, the discount
    //===========================================================

    get jobItems(): Option[]
    {
        return this.jobs.map(x => ({
            label:[x.JobCardNo, x.CustomerName, x.SerialToken].filter(v => !!v).join('  -  '),
            value:x.PublicId,
            token:x.SerialToken
        }));
    }

    get job(): ClosingJob | null
    {
        return this.jobs.find(x => x.PublicId === this.jobId) ?? null;
    }

    get branchName(): string
    {
        return this.job?.BranchName ?? (this.jobs.length > 0 ? this.jobs[0].BranchName : '');
    }

    onJob(value: any):
        void
    {
        this.jobId = value ? String(value) : null;
        this.bill = null;
        this.priceFailed = false;
        this.loadDetail();
        this.price();
    }

    onFormTab(value: string):
        void
    {
        this.formTab = value || 'bill';
        this.cdr.detectChanges();
    }

    // The whole job : the card, the parts, the issues, the returns,
    // the complaints and observations
    private loadDetail():
        void
    {
        const run = ++this.detailRun;

        this.detail = null;

        if (!this.jobId)
        {
            this.detailLoading = false;
            this.cdr.detectChanges();
            return;
        }

        this.detailLoading = true;
        this.cdr.detectChanges();

        this.ws.getClosingJob(this.jobId).subscribe(
        {
            next:detail =>
            {
                if (run !== this.detailRun)
                {
                    return;
                }

                this.detailLoading = false;
                this.detail = detail;
                this.cdr.detectChanges();
            },
            error:error =>
            {
                if (run !== this.detailRun)
                {
                    return;
                }

                this.detailLoading = false;
                this.failed(error, 'The details of the job could not be loaded.');
                this.cdr.detectChanges();
            }
        });
    }

    get card(): JobCard | null
    {
        return this.detail?.Card ?? null;
    }

    get parts(): ClosingPart[]
    {
        return this.detail?.Parts ?? [];
    }

    get issues(): ClosingMove[]
    {
        return this.detail?.Issues ?? [];
    }

    get returns(): ClosingMove[]
    {
        return this.detail?.Returns ?? [];
    }

    get findings(): ClosingFinding[]
    {
        return this.detail?.Findings ?? [];
    }

    get services()
    {
        return this.card?.Services ?? [];
    }

    get checklist()
    {
        return this.card?.Checklist ?? [];
    }

    // the works done by a vendor (entered on the page Job Outsourcing)
    get outsideWorks(): ClosingOutsourced[]
    {
        return (this.detail?.Outsourced ?? []).filter(x => x.Kind === 'Work');
    }

    // the parts bought outside for the job
    get outsourcedParts(): ClosingOutsourced[]
    {
        return (this.detail?.Outsourced ?? []).filter(x => x.Kind !== 'Work');
    }

    get noneText(): string
    {
        return this.detailLoading ? 'Loading the job...' : !this.jobId ? 'Select the job card on The Bill tab.' : '';
    }

    // parts allocated and not on the job : left out of the bill
    get remainingParts(): number
    {
        return this.parts.filter(x => x.Remaining > 0).length;
    }

    get unmarked(): number
    {
        return this.findings.filter(x => !x.Result).length;
    }

    onResult(finding: ClosingFinding, event: Event):
        void
    {
        finding.Result = (event.target as HTMLSelectElement | null)?.value ?? '';
        this.cdr.detectChanges();
    }

    onResultNote(finding: ClosingFinding, event: Event):
        void
    {
        finding.ResultNote = (event.target as HTMLInputElement | null)?.value ?? '';
    }

    onDate(date: Date | null):
        void
    {
        this.closeDate = date ? hrToText(date) : '';
        this.price();
    }

    // priced again a moment after the typing stops
    onDiscount(value: any):
        void
    {
        this.discount = String(value ?? '');

        this.priceSoon();
    }

    onItemPercent(value: any):
        void
    {
        this.itemPercent = String(value ?? '');

        this.priceSoon();
    }

    onItemAmount(value: any):
        void
    {
        this.itemAmount = String(value ?? '');

        this.priceSoon();
    }

    // The figures on the page follow the typing at once (shown,
    // below); the server prices the bill again a moment after the
    // typing stops
    private priceSoon():
        void
    {
        this.cdr.detectChanges();

        clearTimeout(this.priceTimer);

        this.priceTimer = setTimeout(() => this.price(true), 400);
    }

    onRemarks(value: any):
        void
    {
        this.remarks = String(value ?? '');
    }

    clear():
        void
    {
        this.jobId = null;
        this.bill = null;
        this.detail = null;
        this.detailRun++;
        this.detailLoading = false;
        this.itemPercent = '';
        this.itemAmount = '';
        this.formTab = 'bill';
        this.discount = '';
        this.remarks = '';
        this.closeDate = this.today;

        this.cdr.detectChanges();
    }

    private body()
    {
        return {
            JobCardPublicId:this.jobId ?? '',
            InvoiceDate:this.closeDate,
            Discount:toNumber(this.discount) ?? 0,
            Remarks:this.remarks.trim(),
            Deliver:false,
            OutsideLines:[],
            Payments:[],
            ItemDiscountPercent:toNumber(this.itemPercent) ?? 0,
            ItemDiscountAmount:toNumber(this.itemAmount) ?? 0,
            Findings:this.findings
        };
    }

    // The server prices the job : the bill as it will be posted
    price(quiet = false):
        void
    {
        clearTimeout(this.priceTimer);

        if (!this.jobId || !this.closeDate)
        {
            this.bill = null;
            this.cdr.detectChanges();
            return;
        }

        if (this.badNumber)
        {
            // (while typing : no message, the next key prices again)
            if (!quiet)
            {
                this.toast.error('Discount', this.badNumber);
            }

            return;
        }

        const run = ++this.priceRun;

        // (typing a discount : the figures already follow, no "Pricing...")
        this.pricing = !quiet || !this.bill;
        this.cdr.detectChanges();

        const sent = this.stamp;

        this.ws.priceClosing(this.body() as any).subscribe(
        {
            next:bill =>
            {
                if (run !== this.priceRun)
                {
                    return;
                }

                this.pricing = false;
                this.priceFailed = false;
                this.bill = bill;
                this.pricedWith = sent;
                this.cdr.detectChanges();
            },
            error:error =>
            {
                if (run !== this.priceRun)
                {
                    return;
                }

                this.pricing = false;
                this.priceFailed = true;

                // the bill of this job stays on the page (it is priced
                // again before it can be closed)
                if (this.bill?.JobCardPublicId !== this.jobId)
                {
                    this.bill = null;
                }

                this.failed(error, 'The job could not be priced.');
                this.cdr.detectChanges();
            }
        });
    }

    //===========================================================
    // The bill
    //===========================================================

    // a discount box that does not hold a number ('' : all fine)
    get badNumber(): string
    {
        const bad = (text: string) => text.trim() !== '' && toNumber(text) === null;

        return bad(this.itemPercent) ? 'The item discount percent is not a number.'
            : bad(this.itemAmount) ? 'The item discount amount is not a number.'
            : bad(this.discount) ? 'The round off is not a number.'
            : '';
    }

    // what the bill was priced with last : the boxes moved on since
    private pricedWith = '';

    private get stamp(): string
    {
        return [this.jobId, this.closeDate, toNumber(this.itemPercent) ?? 0, toNumber(this.itemAmount) ?? 0, toNumber(this.discount) ?? 0].join('|');
    }

    get stale(): boolean
    {
        return this.pricedWith !== this.stamp;
    }

    // The bill as the page shows it : the figures of the server, with
    // the discounts of the boxes worked in at once (the same sums as
    // the server : a percent on every charged line, then the amount
    // spread by value, VAT after the discount). The server prices it
    // again a moment later and its figures take over.
    get shown(): ServiceInvoice | null
    {
        const bill = this.bill;

        if (!bill)
        {
            return null;
        }

        if (!this.stale || this.badNumber)
        {
            return bill;
        }

        const percent = Math.min(100, Math.max(0, toNumber(this.itemPercent) ?? 0));

        let amount = Math.max(0, toNumber(this.itemAmount) ?? 0);

        const lines =
            (bill.Lines ?? []).map(x =>
            {
                // VAT inside the price : the total of the line is its amount
                const inside = x.VatAmount > 0 && Math.abs(x.Total - (x.Amount - (x.Discount ?? 0))) < 0.005;

                return { ...x, inside, Discount:x.Amount > 0 ? round2(x.Amount * percent / 100) : 0 };
            });

        const charged = lines.filter(x => x.Amount > 0 && x.Amount - x.Discount > 0);

        const open = charged.reduce((sum, x) => sum + x.Amount - x.Discount, 0);

        amount = Math.min(amount, open);

        let left = amount;

        charged.forEach((x, i) =>
        {
            const room = x.Amount - x.Discount;

            const share = Math.min(room, i === charged.length - 1 ? left : Math.min(left, round2(amount * room / open)));

            x.Discount = round2(x.Discount + share);

            left = round2(left - share);
        });

        for (const x of lines)
        {
            if (x.Amount <= 0)
            {
                continue;
            }

            const net = round2(x.Amount - x.Discount);

            const rate = Number(x.VatRate) || 0;

            x.VatAmount = rate <= 0 ? 0 : x.inside ? round2(net * rate / (100 + rate)) : round2(net * rate / 100);

            x.Total = x.inside || rate <= 0 ? net : round2(net + x.VatAmount);
        }

        const roundOff = toNumber(this.discount) ?? 0;

        return {
            ...bill,
            Lines:lines,
            LineDiscount:round2(lines.reduce((sum, x) => sum + x.Discount, 0)),
            VatTotal:round2(lines.reduce((sum, x) => sum + (Number(x.VatAmount) || 0), 0)),
            Discount:roundOff,
            GrandTotal:round2(lines.reduce((sum, x) => sum + (Number(x.Total) || 0), 0) - roundOff)
        };
    }

    // the lines by their kind, in the order of the bill
    get groups(): LineGroup[]
    {
        const lines = this.shown?.Lines ?? [];

        // outside : true = the parts bought outside, false = the
        // parts of the store, null = every line of the type
        const of = (type: string, title: string, icon: string, outside: boolean | null = null): LineGroup =>
        {
            const own = lines.filter(x => x.LineType === type && (outside === null || !!x.IsOutsourced === outside));

            return { title, icon, lines:own, total:own.reduce((sum, x) => sum + (Number(x.Total) || 0), 0) };
        };

        return [
            of('Service', 'Service Charges', 'fas fa-screwdriver-wrench'),
            of('Part', 'Parts', 'fas fa-gears', false),
            of('Part', 'Outsourced Parts', 'fas fa-cart-flatbed', true),
            of('Outside', 'Outside Works', 'fas fa-truck-ramp-box')
        ].filter(x => x.lines.length > 0);
    }

    // the parts bought outside, as billed : shown apart from the
    // parts of the store on the totals panel
    get outsourcedBilled(): number
    {
        return round2((this.shown?.Lines ?? [])
            .filter(x => x.LineType === 'Part' && !!x.IsOutsourced)
            .reduce((sum, x) => sum + (Number(x.Amount) || 0), 0));
    }

    get storePartsBilled(): number
    {
        return round2((Number(this.shown?.PartsTotal) || 0) - this.outsourcedBilled);
    }

    get lineCount(): number
    {
        return (this.bill?.Lines ?? []).length;
    }

    // what stops the closing, what the user should know
    get blockers(): string[]
    {
        return (this.bill?.Warnings ?? []).filter(x => x.startsWith('Cannot be posted'));
    }

    get notes(): string[]
    {
        return (this.bill?.Warnings ?? []).filter(x => !x.startsWith('Cannot be posted'));
    }

    quantityOf(value: number): string
    {
        return String(Math.round((Number(value) || 0) * 100) / 100);
    }

    //===========================================================
    // Close
    //===========================================================

    post():
        void
    {
        const job = this.job;

        if (!job)
        {
            this.toast.error('Validation', 'Select the job card.');
            return;
        }

        if (!this.closeDate)
        {
            this.toast.error('Validation', 'Give the date of the closing.');
            return;
        }

        if (this.badNumber)
        {
            this.toast.error('Validation', this.badNumber);
            return;
        }

        // every complaint and observation is marked before the job is
        // closed (owner 2026-11-19)
        if (this.detailLoading)
        {
            this.toast.error('Job Closing', 'The job is still loading : wait a moment.');
            return;
        }

        if (this.unmarked > 0)
        {
            this.formTab = 'findings';
            this.toast.error('Job Closing', `${this.unmarked} observation${this.unmarked === 1 ? ' is' : 's are'} not marked : set the result of each one before closing.`);
            this.cdr.detectChanges();
            return;
        }

        if (!this.bill || this.pricing || this.priceTimer && this.stale)
        {
            this.toast.error('Job Closing', 'The job is being priced : wait a moment.');
            return;
        }

        if (this.blockers.length > 0)
        {
            this.toast.error('Job Closing', this.blockers[0].replace('Cannot be posted : ', ''));
            return;
        }

        if (this.stale)
        {
            this.toast.error('Job Closing', 'The job is being priced : wait a moment.');
            this.price();
            return;
        }

        const what = `${job.JobCardNo}, bill ${wsMoney(this.bill.GrandTotal)}`;

        this.confirmDialog.open(
            'Close Job',
            `Close the job now (${what})? The bill goes to the account of the customer and cannot be changed. No money is taken here.`,
            () =>
            {
                this.progress.show('Closing the job', what);

                this.ws.postClosing(this.body() as any).subscribe(
                {
                    next:result =>
                        this.progress.finish(() =>
                        {
                            this.toast.success('Closed', `${job.JobCardNo} is closed : bill ${result?.InvoiceNo ?? ''}.`);
                            this.goToList('closed');
                        }),
                    error:error =>
                    {
                        this.progress.fail();
                        this.failed(error, 'The job could not be closed.');
                    }
                });
            },
            'Close Job',
            'Not Yet',
            'primary');
    }
}

//===============================================================
// Helpers
//===============================================================

function round2(value: number): number
{
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toNumber(text: string): number | null
{
    const value = String(text ?? '').replace(/,/g, '').trim();

    if (value === '' || !/^\d+(\.\d+)?$/.test(value))
    {
        return null;
    }

    return Number(value);
}
