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
import { PaginationComponent } from '../../../../shared/components/controls/pagination/pagination';
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { ListTableColumn, ListTableComponent, ListTableRowAction, ListTableRowActionEvent } from '../../../../shared/components/layout/list-table/list-table';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { DatepickerComponent } from '../../../../shared/components/controls/datepicker/datepicker';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { ProgressDialogComponent } from '../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../human-resource-manangement/services/hr-progress.service';
import { hrToDate, hrToText } from '../../../human-resource-manangement/services/hr-date';
import { WsService } from '../../shared/ws.service';
import
{
    OutsourcedPart,
    OutsourcedParts,
    OutsourcingJob,
    WorkshopOutsideWork,
    WsPartOption,
    wsDay,
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

//===============================================================
// Job Outsourcing (owner 2026-11-19; hand-written : NEVER run Code
// Sync).
//
// The outside works (done by a vendor) and the parts bought outside
// are entered here for a job in work, any time before it is closed.
// List (the landing page) : the jobs in work with what is outsourced
// for each so far. Form : the job card is picked, its entries show in
// two sections; Add on a section opens a pop-up that stays open for
// the next entry. An entry is saved and posted at once (Dr Workshop WIP,
// Cr the payable ledger of Posting Setup : the vendor is typed).
// Job Card Closing shows the entries and bills them; nothing is
// entered there.
//===============================================================

@Component(
{
    selector:'job-outsourcing',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        WorkspaceArtComponent,
        ControlTabsComponent,
        PaginationComponent,
        SearchBoxComponent,
        ListTableComponent,
        SearchDropdownComponent,
        TextboxComponent,
        DatepickerComponent,
        CommandCenterComponent,
        ToastComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./job-outsourcing.html',
    styleUrl:'./job-outsourcing.css'
})
export class JobOutsourcingPage
implements OnInit
{
    private readonly ws = inject(WsService);

    private readonly route = inject(ActivatedRoute);

    private readonly router = inject(Router);

    private readonly toast = inject(ToastService);

    private readonly progress = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    readonly day = wsDay;

    readonly money = wsMoney;

    readonly asDate = hrToDate;

    // 'list' or 'add' : from the URL
    mode:
        'list' | 'add' = 'list';

    loading =
        false;

    loadFailed =
        false;

    jobs:
        OutsourcingJob[] = [];

    //===========================================================
    // The list : the jobs in work
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
        { id:'all', label:'Jobs In Work' },
        { id:'with', label:'With Outsourcing' }
    ];

    selectedTab =
        'all';

    // no view, edit or delete : the row button does the work
    readonly listActions =
        { view:false, edit:false, delete:false };

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Job Card', field:'JobCardNo', width:'250px', align:'left', subField:'DateText', subFigureField:'SerialToken' },
        { header:'Customer', field:'CustomerName', width:'220px', align:'left', subField:'Mobile' },
        { header:'Model', field:'ModelName', width:'230px', align:'left', subField:'BikeNo' },
        { header:'Service Type', field:'JobType', width:'150px', align:'left' },
        { header:'Status', field:'Status', width:'140px', align:'left', dotField:'StatusColor' },
        { header:'Entries', field:'EntriesText', width:'90px', align:'right' },
        { header:'Vendor Cost', field:'CostText', width:'120px', align:'right' },
        { header:'To Bill', field:'SellText', width:'120px', align:'right' },
        { header:'Actions', field:'actions', type:'actions', width:'90px', align:'center' }
    ];

    readonly rowActions:
        ListTableRowAction[] =
    [
        { key:'open', icon:'fas fa-truck-ramp-box', title:'Outsourcing of this job : see, add, cancel', tone:'primary' }
    ];

    searchText =
        '';

    currentPage =
        1;

    pageSize =
        10;

    get withCount(): number
    {
        return this.jobs.filter(x => x.Entries > 0).length;
    }

    // the rows of the tab, searched
    private get all(): any[]
    {
        const find = this.searchText.trim().toLowerCase();

        const rows: any[] =
            this.jobs
                .filter(x => this.selectedTab === 'all' || x.Entries > 0)
                .map(x => ({
                    ...x,
                    DateText:wsDay(x.JobDate),
                    StatusColor:wsStatusColor(x.Status),
                    EntriesText:x.Entries > 0 ? String(x.Entries) : '-',
                    CostText:x.Entries > 0 ? wsMoney(x.CostTotal) : '-',
                    SellText:x.Entries > 0 ? wsMoney(x.SellTotal) : '-'
                }));

        return !find
            ? rows
            : rows.filter(x =>
                [x.JobCardNo, x.CustomerName, x.Mobile, x.ModelName, x.BikeNo, x.SerialToken, x.JobType, x.Status]
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

    onTab(value: string):
        void
    {
        this.selectedTab = value || 'all';
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
        if (event.key === 'open')
        {
            this.add(event.row?.PublicId);
        }
    }

    goToList():
        void
    {
        void this.router.navigate(['../list'], { relativeTo:this.route });
    }

    //===========================================================
    // The form
    //===========================================================

    today =
        '';

    jobId:
        string | null = null;

    // a newer job was picked : the answer of an older one is dropped
    private detailRun = 0;

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

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.mode = this.router.url.split('?')[0].endsWith('/add') ? 'add' : 'list';

        this.loadJobs();
    }

    // quiet : after an entry, only the figures of the jobs are read again
    loadJobs(quiet = false):
        void
    {
        if (!quiet)
        {
            this.loading = true;
            this.loadFailed = false;
            this.cdr.detectChanges();
        }

        this.ws
            .getOutsourcingJobs()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:lookups =>
                {
                    this.loading = false;
                    this.jobs = lookups?.Jobs ?? [];
                    this.today = (lookups?.Today ?? '').substring(0, 10);

                    // opened for a job (another page)
                    const job = this.route.snapshot.queryParamMap.get('job');

                    if (!quiet && this.mode === 'add' && job && !this.jobId && this.jobs.some(x => x.PublicId === job))
                    {
                        this.onJob(job);
                    }

                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;

                    if (!quiet)
                    {
                        this.loadFailed = true;
                        this.failed(error, 'The jobs could not be loaded.');
                    }

                    this.cdr.detectChanges();
                }
            });
    }

    refresh():
        void
    {
        this.loadJobs();

        if (this.jobId)
        {
            this.loadOut(++this.detailRun);
        }
    }

    private failed(error: any, fallback: string):
        void
    {
        this.toast.error('Error', error?.error?.message ?? fallback);
    }

    quantityOf(value: number): string
    {
        return String(Math.round((Number(value) || 0) * 100) / 100);
    }

    //===========================================================
    // The job
    //===========================================================

    get jobItems(): Option[]
    {
        return this.jobs.map(x => ({
            label:[x.JobCardNo, x.CustomerName, x.SerialToken].filter(v => !!v).join('  -  '),
            value:x.PublicId,
            token:x.SerialToken
        }));
    }

    get job(): OutsourcingJob | null
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
        this.loadOut(++this.detailRun);
        this.cdr.detectChanges();
    }

    get noneText(): string
    {
        return !this.jobId ? (this.loading ? 'Loading the jobs...' : this.jobs.length === 0 ? 'No job is in work.' : 'Select the job card : its outsourcing shows here.') : !this.out ? 'Loading the job...' : '';
    }

    // the posted entries : what the job carries
    private sum(rows: OutsourcedPart[], field: 'CostAmount' | 'SellAmount'): number
    {
        return rows.filter(x => x.Status === 'Posted').reduce((total, x) => total + (Number(x[field]) || 0), 0);
    }

    get worksBilled(): number
    {
        return this.sum(this.outsideWorks, 'SellAmount');
    }

    get partsBilled(): number
    {
        return this.sum(this.outsourcedParts, 'SellAmount');
    }

    get costTotal(): number
    {
        return this.sum(this.outRows, 'CostAmount');
    }

    get billedTotal(): number
    {
        return this.sum(this.outRows, 'SellAmount');
    }

    //===========================================================
    // The entries : saved and posted at once (Dr Workshop WIP, Cr the
    // payable ledger of Posting Setup)
    //===========================================================

    // the entries of the job, its suppliers, what the user may do
    out:
        OutsourcedParts | null = null;

    outOpen =
        false;

    // true : an outside work. false : a part bought outside
    outWork =
        false;

    outSaving =
        false;

    // the last entry added while the pop-up is open, how many so far
    outAdded =
        '';

    outCount = 0;

    outTyped =
        false;

    outPick:
        string | null = null;

    outCode =
        '';

    outName =
        '';

    outVendorTyped =
        false;

    outSupplierId:
        number | null = null;

    outVendor =
        '';

    outDate =
        '';

    outBill =
        '';

    outQty =
        '1';

    outCost =
        '';

    outSell =
        '';

    outNote =
        '';

    outWorkId:
        number | null = null;

    // the entry being cancelled, and why
    outCancel =
        '';

    outReason =
        '';

    private works:
        WorkshopOutsideWork[] | null = null;

    workItems:
        Option[] = [];

    private partOptions:
        WsPartOption[] | null = null;

    private partBranchId = 0;

    partItems:
        Option[] = [];

    outSupplierItems:
        Option[] = [];

    private loadOut(run: number):
        void
    {
        this.out = null;
        this.outOpen = false;
        this.outCancel = '';

        if (!this.jobId)
        {
            return;
        }

        this.ws.getJobOutsourcing(this.jobId).subscribe(
        {
            next:out =>
            {
                if (run === this.detailRun)
                {
                    this.setOut(out);
                }
            },
            error:error =>
            {
                if (run === this.detailRun)
                {
                    this.failed(error, 'The entries of the job could not be loaded.');
                    this.cdr.detectChanges();
                }
            }
        });
    }

    private setOut(out: OutsourcedParts | null):
        void
    {
        this.out = out;

        this.outSupplierItems =
            (out?.Suppliers ?? []).map(x => ({ label:[x.Name, x.Code].filter(v => !!v).join('  '), value:x.SupplierId }));

        this.cdr.detectChanges();
    }

    private get outRows(): OutsourcedPart[]
    {
        return this.out?.Lines ?? [];
    }

    // the works done by a vendor
    get outsideWorks(): OutsourcedPart[]
    {
        return this.outRows.filter(x => x.ItemKind === 'OutsideWork');
    }

    // the parts bought outside for the job
    get outsourcedParts(): OutsourcedPart[]
    {
        return this.outRows.filter(x => x.ItemKind !== 'OutsideWork');
    }

    get canOutsource(): boolean
    {
        return !!this.jobId && !!this.out?.CanAdd;
    }

    // The price of Price Setup of the picked part
    get outMrp(): number | null
    {
        if (this.outWork || this.outTyped || !this.outPick)
        {
            return null;
        }

        return (this.partOptions ?? []).find(x => `${x.Kind}:${x.Id}` === this.outPick)?.Price ?? null;
    }

    get outAboveMrp(): boolean
    {
        const mrp = this.outMrp;

        return mrp !== null && mrp > 0 && (Number(this.outSell) || 0) > mrp;
    }

    // billed below what it cost
    get outLoss(): boolean
    {
        return this.outSell !== '' && (Number(this.outSell) || 0) < (Number(this.outCost) || 0);
    }

    get outCostTotal(): number
    {
        return (Number(this.outQty) || 0) * (Number(this.outCost) || 0);
    }

    get outSellTotal(): number
    {
        return (Number(this.outQty) || 0) * (Number(this.outSell) || 0);
    }

    get outMargin(): number
    {
        return this.outSellTotal - this.outCostTotal;
    }

    get outSummary(): string
    {
        const quantity = Number(this.outQty) || 0;
        const cost = quantity * (Number(this.outCost) || 0);
        const sell = quantity * (Number(this.outSell) || 0);
        const mrp = this.outMrp;

        return [
            mrp !== null ? `Price ${wsMoney(mrp)}` : '',
            `Cost ${wsMoney(cost)}`,
            `Billed ${wsMoney(sell)}`,
            `${sell >= cost ? 'Margin' : 'Loss'} ${wsMoney(Math.abs(sell - cost))}`,
            this.outAboveMrp ? (this.out?.CanAboveMrp ? 'above the price' : 'above the price : needs Sell Above MRP') : ''
        ]
        .filter(x => !!x)
        .join('  |  ');
    }

    openOut(work: boolean):
        void
    {
        const title = work ? 'Outside Works' : 'Parts Outsourcing';

        if (!this.out)
        {
            this.toast.error(title, 'Select the job card first.');
            return;
        }

        if (!this.out.CanAdd)
        {
            this.toast.error(title, `${this.out.JobCardNo} takes no outsourcing now.`);
            return;
        }

        this.outOpen = true;
        this.outWork = work;
        this.outWorkId = null;
        this.outTyped = false;
        this.outPick = null;
        this.outCode = '';
        this.outName = '';
        // the vendor is typed (owner 2026-11-19) : what is owed goes to
        // the payable ledger of Posting Setup, no supplier is picked
        this.outVendorTyped = true;
        this.outSupplierId = null;
        this.outVendor = '';
        this.outDate = this.out.Today || this.today;
        this.outBill = '';
        this.outQty = '1';
        this.outCost = '';
        this.outSell = '';
        this.outNote = '';
        this.outCancel = '';
        this.outAdded = '';
        this.outCount = 0;

        if (work && this.works === null)
        {
            this.ws.getOutsourcingWorks().subscribe(
            {
                next:works =>
                {
                    this.works = works ?? [];

                    this.workItems =
                        this.works.map(x => ({ label:`${x.Code}  ${x.Name}${x.Rate > 0 ? `  (${wsMoney(x.Rate)})` : ''}`, value:x.WorkshopOutsideWorkId }));

                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.outOpen = false;
                    this.failed(error, 'The list of outside works could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
        }

        const branchId = Number(this.job?.BranchId) || 0;

        if (!work && branchId > 0 && (this.partOptions === null || this.partBranchId !== branchId))
        {
            this.partOptions = [];
            this.partItems = [];
            this.partBranchId = branchId;

            this.ws.getOutsourcingParts(branchId).subscribe(
            {
                next:parts =>
                {
                    this.partOptions = parts ?? [];

                    this.partItems =
                        this.partOptions.map(x => ({
                            label:`${x.PartNumber || x.Code}  ${x.Name}  (${x.Price === null || x.Price === undefined ? 'no price' : wsMoney(x.Price)})`,
                            value:`${x.Kind}:${x.Id}`
                        }));

                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.partOptions = null;
                    this.failed(error, 'The parts could not be loaded : the part can still be typed.');
                    this.cdr.detectChanges();
                }
            });
        }

        this.cdr.detectChanges();
    }

    closeOut():
        void
    {
        this.outOpen = false;
        this.cdr.detectChanges();
    }

    // The customer charge starts at the usual charge of the work
    onOutWork(value: any):
        void
    {
        this.outWorkId = Number(value) || null;

        const work = (this.works ?? []).find(x => x.WorkshopOutsideWorkId === this.outWorkId);

        this.outSell = work && work.Rate > 0 ? String(work.Rate) : '';

        this.cdr.detectChanges();
    }

    onOutTyped(typed: boolean):
        void
    {
        this.outTyped = typed;
        this.outPick = null;
        this.outCode = '';
        this.outName = '';
        this.cdr.detectChanges();
    }

    onOutVendorTyped(typed: boolean):
        void
    {
        this.outVendorTyped = typed;
        this.outSupplierId = null;
        this.outVendor = '';
        this.cdr.detectChanges();
    }

    // The selling rate starts at the price of Price Setup
    onOutPick(value: any):
        void
    {
        this.outPick = value ? String(value) : null;

        const mrp = this.outMrp;

        this.outSell = mrp !== null && mrp > 0 ? String(mrp) : '';

        this.cdr.detectChanges();
    }

    onOutSupplier(value: any):
        void
    {
        this.outSupplierId = Number(value) || null;
        this.cdr.detectChanges();
    }

    onOutDate(date: Date | null):
        void
    {
        this.outDate = date ? hrToText(date) : '';
        this.cdr.detectChanges();
    }

    onOutText(field: 'outCode' | 'outName' | 'outVendor' | 'outBill' | 'outQty' | 'outCost' | 'outSell' | 'outNote' | 'outReason', value: any):
        void
    {
        this[field] = String(value ?? '');
        this.cdr.detectChanges();
    }

    saveOut():
        void
    {
        const publicId = this.jobId;

        if (!publicId || this.outSaving)
        {
            return;
        }

        const work = this.outWork;

        const title = work ? 'Outside Works' : 'Parts Outsourcing';

        const [kind, id] = (this.outPick ?? '').split(':');

        if (work && !this.outWorkId)
        {
            this.toast.error(title, 'Pick the outside work.');
            return;
        }

        if (!work && !this.outTyped && !this.outPick)
        {
            this.toast.error(title, 'Pick the part, or type it.');
            return;
        }

        if (!work && this.outTyped && !this.outName.trim())
        {
            this.toast.error(title, 'Type the part.');
            return;
        }

        if (!this.outVendorTyped && !this.outSupplierId)
        {
            this.toast.error(title, 'Pick the supplier, or type the vendor.');
            return;
        }

        if (this.outVendorTyped && !this.outVendor.trim())
        {
            this.toast.error(title, 'Type the vendor.');
            return;
        }

        if (!this.outDate)
        {
            this.toast.error(title, 'Give the date.');
            return;
        }

        if (!((Number(this.outQty) || 0) > 0))
        {
            this.toast.error(title, 'Give the quantity.');
            return;
        }

        if (!((Number(this.outCost) || 0) > 0))
        {
            this.toast.error(title, work ? 'Give the vendor charge : what the vendor takes for the work.' : 'Give the purchase rate : what the vendor charges for one.');
            return;
        }

        if (this.outSell.trim() === '' || (Number(this.outSell) || 0) < 0)
        {
            this.toast.error(title, work ? 'Give the customer charge (0 when it is not charged).' : 'Give the selling rate : what the customer pays for one (0 when it is not charged).');
            return;
        }

        if (this.outAboveMrp && !this.out?.CanAboveMrp)
        {
            this.toast.error(title, `The price is ${wsMoney(this.outMrp ?? 0)} : selling above it needs the page action Sell Above MRP.`);
            return;
        }

        this.outSaving = true;
        this.outAdded = '';
        this.cdr.detectChanges();

        const before = new Set((this.out?.Lines ?? []).map(x => x.PublicId));

        this.ws.addJobOutsourcing(
            publicId,
            {
                PurchaseDate:this.outDate,
                ItemKind:work ? 'OutsideWork' : this.outTyped ? 'Other' : kind,
                ItemId:work ? this.outWorkId : this.outTyped ? null : Number(id) || null,
                ItemCode:this.outTyped ? this.outCode.trim() : '',
                ItemName:this.outTyped ? this.outName.trim() : '',
                SupplierId:this.outVendorTyped ? null : this.outSupplierId,
                VendorName:this.outVendorTyped ? this.outVendor.trim() : '',
                BillNo:this.outBill.trim(),
                Quantity:Number(this.outQty) || 0,
                CostRate:Number(this.outCost) || 0,
                SellRate:Number(this.outSell) || 0,
                Note:this.outNote.trim()
            })
            .subscribe(
            {
                next:out =>
                {
                    this.outSaving = false;

                    // the pop-up stays open for the next entry (owner
                    // 2026-11-19) : the date and the vendor stay, the
                    // rest is cleared
                    const made = (out?.Lines ?? []).find(x => !before.has(x.PublicId));

                    this.outAdded = made ? `${made.PurchaseNo}  ${made.ItemName}  added to the job` : 'Added to the job';
                    this.outCount++;

                    this.outWorkId = null;
                    this.outPick = null;
                    this.outCode = '';
                    this.outName = '';
                    this.outBill = '';
                    this.outQty = '1';
                    this.outCost = '';
                    this.outSell = '';
                    this.outNote = '';

                    this.setOut(out);

                    // the figures of the job in the list
                    this.loadJobs(true);
                },
                error:error =>
                {
                    this.outSaving = false;
                    this.failed(error, work ? 'The outside work could not be saved.' : 'The outsourced part could not be saved.');
                    this.cdr.detectChanges();
                }
            });
    }

    startCancelOut(row: OutsourcedPart):
        void
    {
        this.outCancel = this.outCancel === row.PublicId ? '' : row.PublicId;
        this.outReason = '';
        this.cdr.detectChanges();
    }

    cancelOut(row: OutsourcedPart):
        void
    {
        const publicId = this.jobId;

        if (!publicId || this.outSaving)
        {
            return;
        }

        if (!this.outReason.trim())
        {
            this.toast.error('Outsourcing', 'Give the reason.');
            return;
        }

        this.outSaving = true;

        this.progress.show('Cancelling', `Reversing ${row.PurchaseNo}...`);

        this.ws.cancelJobOutsourcing(publicId, row.PublicId, this.outReason.trim()).subscribe(
        {
            next:out =>
                this.progress.finish(() =>
                {
                    this.outSaving = false;
                    this.outCancel = '';
                    this.toast.success('Success', `${row.PurchaseNo} was cancelled.`);
                    this.setOut(out);
                    this.loadJobs(true);
                }),
            error:error =>
            {
                this.progress.fail();
                this.outSaving = false;
                this.failed(error, 'The entry could not be cancelled.');
            }
        });
    }
}
