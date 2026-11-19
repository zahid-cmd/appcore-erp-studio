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
import { ControlTab, ControlTabsComponent } from '../../../../shared/components/controls/control-tabs/control-tabs';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { WorkspaceArtComponent } from '../../../../shared/components/layout/workspace-art/workspace-art';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { DatepickerComponent } from '../../../../shared/components/controls/datepicker/datepicker';
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ListTableColumn, ListTableComponent } from '../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../human-resource-manangement/services/hr-progress.service';
import { hrToDate, hrToText } from '../../../human-resource-manangement/services/hr-date';
import { WsService } from '../../shared/ws.service';
import { openLocationChartAllPrint, openLocationChartPrint, openLocationChartSlipPrint } from '../../print/location-chart.print';
import
{
    Mis,
    MisJob,
    MisLookups,
    MisPart,
    PartsStock,
    wsDay,
    wsMoney,
    wsPlaceTitle,
    wsStatusColor
}
from '../../shared/ws.models';

//===============================================================
// Model
//===============================================================

type Mode =
    'list' | 'add' | 'view';

interface Option
{
    label: string;
    value: any;
    // the serial token of the job : the big figure of its row
    token?: string;
}

// A part of a job card on the slip
interface SlipLine
{
    ItemKind: string;
    ItemId: number;
    ItemCode: string;
    ItemName: string;
    Allocated: number;
    Issued: number;
    Remaining: number;
    Location: string;

    // what goes out now (typed)
    Quantity: string;

    // the quantity was typed : it is not set again from the stock
    touched: boolean;
}

// A job card on the slip
interface SlipJob
{
    job: MisJob;
    lines: SlipLine[];
}

//===============================================================
// Parts Issues (owner 2026-11-18) : the Material Issue Slip (MIS).
//
// The parts allocated to a job card (Job Card Requirements) go out
// of a warehouse of the service center. Only what is allocated and
// not issued yet can be issued; a part can go out in parts (the
// rest waits for the next slip). The first issue makes an Allocated
// job In Progress.
//
// Switch Parts Issue To Multiple Job Cards (Workshop Configuration)
//   off : one job card a slip
//   on  : several job cards on one slip
//
// MIS No : MIS-<service center>-<FY>-<MM>-00001, shown when the
// form opens (taken when the slip is posted).
// A slip is posted at once : stock out, cost to Workshop WIP. It
// cannot be changed; unused parts come back with a Parts Return.
//===============================================================

@Component(
{
    selector:'parts-issues',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        WorkspaceArtComponent,
        SearchDropdownComponent,
        TextboxComponent,
        DatepickerComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./parts-issues.html',
    styleUrl:'./parts-issues.css'
})
export class PartsIssuesPage
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

    readonly money = wsMoney;

    readonly day = wsDay;

    readonly asDate = hrToDate;

    readonly statusColor = wsStatusColor;

    // the hover text of a row : where the part sits
    readonly placeTitle = wsPlaceTitle;

    mode:
        Mode = 'list';

    entityId =
        '';

    loading =
        false;

    loadFailed =
        false;

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
        rowHeight:32,
        headerHeight:36,
        footerHeight:56
    };

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
    // List
    //===========================================================

    readonly tabs:
        ControlTab[] =
    [
        { id:'all', label:'All' },
        { id:'today', label:'Today' },
        { id:'single', label:'Single Job' },
        { id:'multiple', label:'Multiple Jobs' }
    ];

    selectedTab =
        'all';

    onTab(value: string):
        void
    {
        this.selectedTab = value || 'all';
        this.currentPage = 1;
        this.apply();
    }

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'MIS No', field:'MisNo', width:'200px', align:'center' },
        { header:'Date', field:'DateText', width:'110px', align:'center' },
        { header:'Job Cards', field:'JobText', width:'230px', align:'left' },
        { header:'Jobs', field:'JobCount', width:'60px', align:'center' },
        { header:'Customer', field:'CustomerText', width:'210px', align:'left' },
        { header:'Warehouse', field:'WarehouseName', width:'160px', align:'left' },
        { header:'Issued To', field:'PersonName', width:'150px', align:'left' },
        { header:'Qty', field:'QuantityText', width:'80px', align:'right' },
        { header:'Cost', field:'CostText', width:'110px', align:'right' },
        { header:'Status', field:'Status', width:'95px', align:'left', dotField:'StatusColor' },
        { header:'Actions', field:'actions', type:'actions', width:'80px', align:'center' }
    ];

    readonly listActions =
        { view:true, edit:false, delete:false };

    private all:
        any[] = [];

    rows:
        any[] = [];

    searchText =
        '';

    currentPage =
        1;

    pageSize =
        10;

    totalRecords =
        0;

    //===========================================================
    // Form
    //===========================================================

    lookups:
        MisLookups | null = null;

    // the job cards on the slip
    slip:
        SlipJob[] = [];

    jobPick:
        any = null;

    warehouseId:
        number | null = null;

    technicianId:
        number | null = null;

    issueDate =
        '';

    remarks =
        '';

    // what the picked warehouse holds : "Kind:Id" -> quantity
    private stock =
        new Map<string, number>();

    private stockWarehouse =
        0;

    stockLoading =
        false;

    // View : the posted slip
    posted:
        Mis | null = null;

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/') ? 'view' : url.includes('/add') ? 'add' : 'list';

        this.entityId =
            this.route.snapshot.paramMap.get('id') ?? '';

        if (this.mode === 'list')
        {
            this.loadList();
        }
        else if (this.mode === 'add')
        {
            this.loadLookups();
        }
        else
        {
            this.loadSlip();
        }
    }

    private failed(error: any, fallback: string):
        void
    {
        this.toast.error('Parts Issues', error?.error?.message ?? fallback);
        this.cdr.detectChanges();
    }

    //===========================================================
    // List
    //===========================================================

    loadList():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.ws.getMisList()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:slips =>
                {
                    this.all =
                        (slips ?? []).map(x => ({
                            ...x,
                            DateText:wsDay(x.DocumentDate),
                            QuantityText:quantityText(x.TotalQuantity),
                            CostText:wsMoney(x.TotalCost),
                            StatusColor:'#15803d'
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.failed(error, 'The issue slips could not be loaded. (Was the API restarted ?)');
                }
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const today = hrToText(new Date());

        const tab = this.selectedTab;

        const matched =
            this.all.filter(x =>
                (tab === 'all'
                    || (tab === 'today' && String(x.DocumentDate ?? '').substring(0, 10) === today)
                    || (tab === 'single' && x.JobCount <= 1)
                    || (tab === 'multiple' && x.JobCount > 1))
                && (!find
                || [x.MisNo, x.JobText, x.CustomerText, x.WarehouseName, x.PersonName, x.DateText]
                    .some(v => String(v ?? '').toLowerCase().includes(find))));

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        this.cdr.detectChanges();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;
        this.apply();
    }

    onPageChange(page: number):
        void
    {
        this.currentPage = page;
        this.apply();
    }

    onPageSizeChange(size: number):
        void
    {
        this.pageSize = size;
        this.currentPage = 1;
        this.apply();
    }

    historyOpened =
        false;

    historyItems:
        any[] = [];

    openHistory():
        void
    {
        this.ws
            .getHistory('workshop-management/parts-issues')
            .subscribe(
            {
                next:items =>
                {
                    this.historyItems = items;
                    this.historyOpened = true;
                    this.cdr.detectChanges();
                },
                error:() => this.toast.error('Error', 'The history could not be loaded.')
            });
    }

    closeHistory():
        void
    {
        this.historyOpened = false;
        this.cdr.detectChanges();
    }

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    view(row: any):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    goToList():
        void
    {
        void this.router.navigate([this.mode === 'add' ? '../list' : '../../list'], { relativeTo:this.route });
    }

    //===========================================================
    // Form : load
    //===========================================================

    private loadLookups():
        void
    {
        this.loading = true;

        this.ws.getMisLookups()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:lookups =>
                {
                    this.lookups = lookups;
                    this.issueDate = (lookups?.Today ?? '').substring(0, 10) || hrToText(new Date());
                    this.loading = false;

                    // one service center : its warehouse at once
                    this.useWarehouse();
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.failed(error, 'The issue lists could not be loaded. (Was the API restarted ?)');
                }
            });
    }

    private loadSlip():
        void
    {
        this.loading = true;

        this.ws.getMis(this.entityId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:slip =>
                {
                    this.posted = slip;
                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.failed(error, 'The issue slip could not be loaded.');
                }
            });
    }

    //===========================================================
    // Form : what the page shows
    //===========================================================

    get multiple(): boolean
    {
        return !!this.lookups?.MultipleJobs;
    }

    // Switch Bulk Issue Per Job : a picked job card brings all
    // its waiting parts. Off : the parts are added one by one
    get bulk(): boolean
    {
        return !!this.lookups?.BulkPerJob;
    }

    //===========================================================
    // Part by part (the switch Bulk Issue Per Job off) : the
    // entry row - job card, part, quantity, Add. A part goes out
    // within what the job card still waits for.
    //===========================================================

    entryJobId:
        any = null;

    entryPartKey:
        any = null;

    entryQty =
        '';

    private get entryJob(): MisJob | undefined
    {
        return (this.lookups?.Jobs ?? []).find(x => x.PublicId === String(this.entryJobId ?? ''));
    }

    private get entryPart(): MisPart | undefined
    {
        return (this.entryJob?.Parts ?? []).find(x => `${x.ItemKind}:${x.ItemId}` === String(this.entryPartKey ?? ''));
    }

    // The job cards that wait for parts; one job card a slip : only
    // the one of the slip
    // Location Chart : where the parts of a job sit (one job a sheet)
    printChart(jobCardPublicId: string | null | undefined):
        void
    {
        if (!jobCardPublicId)
        {
            return;
        }

        const problem = openLocationChartPrint(this.router, jobCardPublicId);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }

    // The combined Location Chart : the parts of all the job cards of
    // the slip on one sheet (owner 2026-11-18)
    get chartJobIds(): string[]
    {
        const ids =
            this.mode === 'view'
                ? (this.posted?.Jobs ?? []).map(x => x.JobCardPublicId)
                : this.slip.map(x => x.job.PublicId);

        return [...new Set(ids.filter(x => !!x))];
    }

    printAllCharts():
        void
    {
        const ids = this.chartJobIds;

        if (ids.length === 0)
        {
            this.toast.error('Location Chart', 'No job card is on the slip yet.');
            return;
        }

        // a posted slip : what it issued; a new slip : what its jobs
        // still wait for
        const problem =
            this.mode === 'view' && this.posted?.PublicId
                ? openLocationChartSlipPrint(this.router, this.posted.PublicId)
                : openLocationChartAllPrint(this.router, ids);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }

    get entryJobItems(): Option[]
    {
        const only = !this.multiple && this.slip.length > 0 ? this.slip[0].job.PublicId : '';

        const branch = this.slip.length > 0 ? this.slip[0].job.BranchId : 0;

        return (this.lookups?.Jobs ?? [])
            .filter(x => (!only || x.PublicId === only) && (!branch || x.BranchId === branch))
            .map(x => ({
                label:[x.JobCardNo, x.CustomerName, x.SerialToken].filter(v => !!v).join('   -   '),
                value:x.PublicId,
                token:x.SerialToken ?? ''
            }));
    }

    get entryJobLocked(): boolean
    {
        return !this.multiple && this.slip.length > 0;
    }

    // The waiting parts of the picked job card that are not on the
    // slip yet
    get entryPartItems(): Option[]
    {
        const job = this.entryJob;

        if (!job)
        {
            return [];
        }

        const on = new Set((this.slip.find(x => x.job.PublicId === job.PublicId)?.lines ?? []).map(l => `${l.ItemKind}:${l.ItemId}`));

        return (job.Parts ?? [])
            .filter(x => !on.has(`${x.ItemKind}:${x.ItemId}`))
            .map(x => ({
                label:`${x.ItemCode}  ${x.ItemName}  (waiting ${quantityText(x.Remaining)})`,
                value:`${x.ItemKind}:${x.ItemId}`
            }));
    }

    get entryWaitingText(): string
    {
        const part = this.entryPart;

        return part ? quantityText(part.Remaining) : '';
    }

    // What the warehouse still holds of the picked part (what the
    // slip takes already is counted)
    private get entryStockLeft(): number | null
    {
        const part = this.entryPart;

        if (!part || !this.stockWarehouse)
        {
            return null;
        }

        const key = `${part.ItemKind}:${part.ItemId}`;

        const taken =
            this.slip.reduce(
                (sum, x) => sum + x.lines
                    .filter(l => `${l.ItemKind}:${l.ItemId}` === key)
                    .reduce((s, l) => s + (toNumber(l.Quantity) ?? 0), 0),
                0);

        return round2((this.stock.get(key) ?? 0) - taken);
    }

    get entryStockText(): string
    {
        const left = this.entryStockLeft;

        return left === null ? '' : quantityText(Math.max(0, left));
    }

    onEntryJob(value: any):
        void
    {
        this.entryJobId = value || null;
        this.entryPartKey = null;
        this.entryQty = '';

        // the warehouse of the service center of the job card
        this.useWarehouse();
        this.cdr.detectChanges();
    }

    onEntryPart(value: any):
        void
    {
        this.entryPartKey = value || null;

        const part = this.entryPart;

        const left = this.entryStockLeft;

        // what waits, but not more than the warehouse holds
        this.entryQty =
            part ? quantityText(left === null ? part.Remaining : Math.max(0, Math.min(part.Remaining, left))) : '';

        this.cdr.detectChanges();
    }

    onEntryQty(value: any):
        void
    {
        this.entryQty = String(value ?? '');
    }

    // Enter in the Qty box : the Add button
    onEntryEnter(event: Event, row: HTMLElement):
        void
    {
        if ((event.target as HTMLElement).closest('.jr-e-qty'))
        {
            event.preventDefault();
            this.focusEntry(row, 'add');
        }
    }

    // Puts the cursor in a box of the entry row (after the page is
    // drawn again); 'part' : the list of the parts is opened
    focusEntry(row: HTMLElement, what: 'part' | 'qty' | 'add'):
        void
    {
        setTimeout(() =>
        {
            if (what === 'part')
            {
                const box = row.querySelector('.mi-e-part .dropdown-selector') as HTMLElement | null;

                if (box && box.getAttribute('aria-expanded') !== 'true' && !box.classList.contains('disabled'))
                {
                    box.click();
                }

                return;
            }

            const element = row.querySelector(what === 'qty' ? '.jr-e-qty input' : 'button.jr-add') as HTMLInputElement | HTMLButtonElement | null;

            if (element && !element.disabled)
            {
                element.focus();

                if (what === 'qty')
                {
                    (element as HTMLInputElement).select?.();
                }
            }
        }, 60);
    }

    // Returns true when the line went on the slip
    addEntry(): boolean
    {
        const job = this.entryJob;

        const part = this.entryPart;

        if (!job)
        {
            this.toast.error('Parts Issue', 'Select the job card first.');

            return false;
        }

        if (!part)
        {
            this.toast.error('Parts Issue', 'Select the part.');

            return false;
        }

        const quantity = toNumber(this.entryQty);

        if (quantity === null || quantity <= 0)
        {
            this.toast.error('Parts Issue', 'Give the quantity.');

            return false;
        }

        // the allocation is the limit
        if (quantity > part.Remaining)
        {
            this.toast.error('Parts Issue', `${part.ItemName} : ${job.JobCardNo} waits for ${quantityText(part.Remaining)} only (allocated ${quantityText(part.Allocated)}, issued ${quantityText(part.Issued)}).`);

            return false;
        }

        const left = this.entryStockLeft;

        if (left !== null && quantity > left)
        {
            this.toast.error('Parts Issue', `${part.ItemName} : the warehouse holds ${quantityText(Math.max(0, left))} only.`);

            return false;
        }

        if (!this.multiple && this.slip.length > 0 && this.slip[0].job.PublicId !== job.PublicId)
        {
            this.toast.error('Parts Issue', 'One job card a slip (Workshop Configuration, switch Parts Issue To Multiple Job Cards).');

            return false;
        }

        const line: SlipLine =
        {
            ItemKind:part.ItemKind,
            ItemId:part.ItemId,
            ItemCode:part.ItemCode,
            ItemName:part.ItemName,
            Allocated:Number(part.Allocated) || 0,
            Issued:Number(part.Issued) || 0,
            Remaining:Number(part.Remaining) || 0,
            Location:part.Location ?? '',
            Quantity:quantityText(quantity),
            touched:true
        };

        const entry = this.slip.find(x => x.job.PublicId === job.PublicId);

        if (entry)
        {
            entry.lines = [...entry.lines, line];
        }
        else
        {
            this.slip = [...this.slip, { job, lines:[line] }];
        }

        // the job card stays : its next part
        this.entryPartKey = null;
        this.entryQty = '';

        this.cdr.detectChanges();

        return true;
    }

    // A part is taken off the slip (its job card too, with its last)
    removeLine(entry: SlipJob, line: SlipLine):
        void
    {
        entry.lines = entry.lines.filter(x => x !== line);

        if (entry.lines.length === 0)
        {
            this.slip = this.slip.filter(x => x !== entry);
        }

        this.cdr.detectChanges();
    }

    // The service center of the slip : of its first job card
    get branchId(): number
    {
        if (this.posted)
        {
            return this.posted.BranchId;
        }

        if (this.slip.length > 0)
        {
            return this.slip[0].job.BranchId;
        }

        if (this.entryJob)
        {
            return this.entryJob.BranchId;
        }

        const centers = this.lookups?.NextNos ?? [];

        return centers.length === 1 ? centers[0].Id : 0;
    }

    get branchName(): string
    {
        if (this.posted)
        {
            return this.posted.BranchName;
        }

        if (this.slip.length > 0)
        {
            return this.slip[0].job.BranchName;
        }

        if (this.entryJob)
        {
            return this.entryJob.BranchName;
        }

        const id = this.branchId;

        // Code : the name of the service center
        return (this.lookups?.NextNos ?? []).find(x => x.Id === id)?.Code ?? '';
    }

    // View : the part lines of the slip
    get viewLineCount(): number
    {
        return (this.posted?.Jobs ?? []).reduce((sum, x) => sum + (x.Lines ?? []).length, 0);
    }

    get misNo(): string
    {
        if (this.posted)
        {
            return this.posted.MisNo;
        }

        const id = this.branchId;

        return (this.lookups?.NextNos ?? []).find(x => x.Id === id)?.Name ?? (this.lookups ? 'Pick the job card' : '...');
    }

    get pageTitle(): string
    {
        return this.mode === 'view' ? 'View Parts Issue' : 'Add Parts Issue';
    }

    // The job cards that still wait for parts (not the ones on the
    // slip; of the service center of the slip)
    get jobItems(): Option[]
    {
        const on = new Set(this.slip.map(x => x.job.PublicId));

        const branch = this.slip.length > 0 ? this.slip[0].job.BranchId : 0;

        return (this.lookups?.Jobs ?? [])
            .filter(x => !on.has(x.PublicId) && (!branch || x.BranchId === branch))
            .map(x => ({
                label:[x.JobCardNo, x.CustomerName, x.SerialToken, `${x.Parts.length} ${x.Parts.length === 1 ? 'part' : 'parts'}`].filter(v => !!v).join('   -   '),
                value:x.PublicId,
                token:x.SerialToken ?? ''
            }));
    }

    get waiting(): number
    {
        return (this.lookups?.Jobs ?? []).length;
    }

    // one job card a slip : the box is locked once a job is picked
    get jobLocked(): boolean
    {
        return !this.multiple && this.slip.length > 0;
    }

    // The parts go out of the default warehouse of the service
    // center : nothing is picked
    private useWarehouse():
        void
    {
        const id = this.warehouseItems[0]?.value ?? null;

        if (id !== this.warehouseId)
        {
            this.warehouseId = id;
            this.stockWarehouse = 0;
        }

        this.loadStock();
    }

    get warehouseName(): string
    {
        return this.mode === 'view'
            ? this.posted?.WarehouseName ?? ''
            : this.warehouseItems.find(x => x.value === this.warehouseId)?.label ?? '';
    }

    get warehouseItems(): Option[]
    {
        const branch = this.branchId;

        return (this.lookups?.Warehouses ?? [])
            .filter(x => !branch || x.BranchId === branch)
            .map(x => ({ label:x.Name, value:x.Id }));
    }

    get technicianItems(): Option[]
    {
        const branch = this.branchId;

        return (this.lookups?.Technicians ?? [])
            .filter(x => !branch || !x.BranchId || x.BranchId === branch)
            .map(x => ({ label:`${x.Code}  ${x.Name}`, value:x.Id }));
    }

    get lineCount(): number
    {
        return this.slip.reduce((sum, x) => sum + x.lines.filter(l => (toNumber(l.Quantity) ?? 0) > 0).length, 0);
    }

    get totalQuantity(): number
    {
        return round2(this.slip.reduce((sum, x) => sum + x.lines.reduce((s, l) => s + (toNumber(l.Quantity) ?? 0), 0), 0));
    }

    quantityOf(value: number | null | undefined): string
    {
        return quantityText(value);
    }

    // What the warehouse holds of a part ('-' : not read yet)
    stockOf(line: SlipLine): string
    {
        return this.stockWarehouse ? quantityText(this.stock.get(`${line.ItemKind}:${line.ItemId}`) ?? 0) : '-';
    }

    // The slip asks for more of the part than the warehouse holds
    // (all its job cards together)
    isShort(line: SlipLine): boolean
    {
        if (!this.stockWarehouse)
        {
            return false;
        }

        const asked =
            this.slip.reduce(
                (sum, x) => sum + x.lines
                    .filter(l => l.ItemKind === line.ItemKind && l.ItemId === line.ItemId)
                    .reduce((s, l) => s + (toNumber(l.Quantity) ?? 0), 0),
                0);

        return asked > (this.stock.get(`${line.ItemKind}:${line.ItemId}`) ?? 0);
    }

    //===========================================================
    // Form : the job cards of the slip
    //===========================================================

    onJob(value: any):
        void
    {
        const id = String(value ?? '');

        const job = (this.lookups?.Jobs ?? []).find(x => x.PublicId === id);

        if (!job || this.jobLocked || this.slip.some(x => x.job.PublicId === id))
        {
            return;
        }

        this.slip =
        [
            ...this.slip,
            {
                job,
                lines:(job.Parts ?? []).map(p => ({
                    ItemKind:p.ItemKind,
                    ItemId:p.ItemId,
                    ItemCode:p.ItemCode,
                    ItemName:p.ItemName,
                    Allocated:Number(p.Allocated) || 0,
                    Issued:Number(p.Issued) || 0,
                    Remaining:Number(p.Remaining) || 0,
                    Location:p.Location ?? '',
                    Quantity:quantityText(p.Remaining),
                    touched:false
                }))
            }
        ];

        // one job card a slip : the box shows the job; several : it
        // is empty again for the next one
        this.jobPick = this.multiple ? null : id;

        // the warehouse of the service center of the job card
        this.useWarehouse();
        this.fitToStock();

        this.cdr.detectChanges();
    }

    removeJob(entry: SlipJob):
        void
    {
        this.slip = this.slip.filter(x => x !== entry);

        if (this.slip.length === 0)
        {
            this.jobPick = null;
        }

        this.cdr.detectChanges();
    }

    // Add : the page is emptied
    clear():
        void
    {
        this.slip = [];
        this.jobPick = null;
        this.entryJobId = null;
        this.entryPartKey = null;
        this.entryQty = '';
        this.technicianId = null;
        this.remarks = '';

        this.cdr.detectChanges();
    }

    onTechnician(value: any):
        void
    {
        this.technicianId = value ? Number(value) : null;
        this.cdr.detectChanges();
    }

    onDate(date: Date | null):
        void
    {
        this.issueDate = date ? hrToText(date) : '';
        this.cdr.detectChanges();
    }

    onRemarks(value: any):
        void
    {
        this.remarks = String(value ?? '');
    }

    onQuantity(line: SlipLine, event: Event):
        void
    {
        line.Quantity = (event.target as HTMLInputElement).value;
        line.touched = true;
        this.cdr.detectChanges();
    }

    private loadStock():
        void
    {
        const id = this.warehouseId ?? 0;

        if (!id || id === this.stockWarehouse)
        {
            return;
        }

        this.stockLoading = true;

        this.ws.getPartsStock(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:(rows: PartsStock[]) =>
                {
                    // another warehouse was picked meanwhile
                    if (id !== this.warehouseId)
                    {
                        return;
                    }

                    this.stock = new Map((rows ?? []).map(x => [`${x.ItemKind}:${x.ItemId}`, Number(x.OnHand) || 0]));
                    this.stockWarehouse = id;
                    this.stockLoading = false;

                    this.fitToStock();
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.stockLoading = false;
                    this.failed(error, 'The stock of the warehouse could not be read.');
                }
            });
    }

    // A quantity nobody typed : what waits, but not more than the
    // warehouse holds (what the earlier job cards of the slip take
    // is counted)
    private fitToStock():
        void
    {
        if (!this.stockWarehouse)
        {
            return;
        }

        const left = new Map(this.stock);

        for (const entry of this.slip)
        {
            for (const line of entry.lines)
            {
                const key = `${line.ItemKind}:${line.ItemId}`;

                const have = left.get(key) ?? 0;

                if (!line.touched)
                {
                    line.Quantity = quantityText(Math.max(0, Math.min(line.Remaining, have)));
                }

                left.set(key, have - (toNumber(line.Quantity) ?? 0));
            }
        }
    }

    //===========================================================
    // Post
    //===========================================================

    post():
        void
    {
        if (this.slip.length === 0)
        {
            this.toast.error('Validation', 'Pick the job card.');

            return;
        }

        if (!this.warehouseId)
        {
            this.toast.error('Validation', 'The service center has no active warehouse (Settings > General Settings > Warehouses).');

            return;
        }

        if (!this.issueDate)
        {
            this.toast.error('Validation', 'Give the date of the issue.');

            return;
        }

        for (const entry of this.slip)
        {
            for (const line of entry.lines)
            {
                const text = line.Quantity.trim();

                const quantity = text === '' ? 0 : toNumber(text);

                if (quantity === null || quantity < 0)
                {
                    this.toast.error('Validation', `${line.ItemName} (${entry.job.JobCardNo}) : the quantity is not a number.`);

                    return;
                }

                if (quantity > line.Remaining)
                {
                    this.toast.error('Validation', `${line.ItemName} : ${entry.job.JobCardNo} waits for ${quantityText(line.Remaining)} only.`);

                    return;
                }

                if (quantity > 0 && this.isShort(line))
                {
                    this.toast.error('Validation', `${line.ItemName} : the warehouse holds ${this.stockOf(line)} only.`);

                    return;
                }
            }
        }

        const jobs =
            this.slip
                .map(x => ({
                    JobCardPublicId:x.job.PublicId,
                    Lines:x.lines
                        .filter(l => (toNumber(l.Quantity) ?? 0) > 0)
                        .map(l => ({
                            LineId:0,
                            SourceLineId:null,
                            ItemKind:l.ItemKind,
                            ItemId:l.ItemId,
                            ItemCode:l.ItemCode,
                            ItemName:l.ItemName,
                            Quantity:toNumber(l.Quantity) ?? 0,
                            IssuedQuantity:0,
                            ReturnedQuantity:0,
                            Cost:0,
                            Note:''
                        }))
                }))
                .filter(x => x.Lines.length > 0);

        if (jobs.length === 0)
        {
            this.toast.error('Validation', 'Give the quantity to issue of a part at least.');

            return;
        }

        const body =
        {
            IssueDate:this.issueDate,
            WarehouseId:this.warehouseId,
            WorkshopTechnicianId:this.technicianId,
            Remarks:this.remarks.trim(),
            Jobs:jobs
        };

        const what =
            `${jobs.length} job ${jobs.length === 1 ? 'card' : 'cards'}, ${this.lineCount} ${this.lineCount === 1 ? 'part' : 'parts'}, quantity ${quantityText(this.totalQuantity)}`;

        this.confirmDialog.open(
            'Issue Parts',
            `Issue the parts now (${what})? The stock goes out at once and the slip cannot be changed; unused parts come back with a Parts Return.`,
            () =>
            {
                this.progress.show('Issuing the parts', what);

                this.ws.postMis(body).subscribe(
                {
                    next:result =>
                        this.progress.finish(() =>
                        {
                            this.toast.success('Issued', `${result?.MisNo ?? 'The slip'} is posted.`);
                            this.goToList();
                        }),
                    error:error =>
                    {
                        this.progress.fail();
                        this.failed(error, 'The parts could not be issued.');
                    }
                });
            },
            'Issue Parts',
            'Not Yet',
            'primary');
    }
}

//===============================================================
// Helpers
//===============================================================

function toNumber(text: string): number | null
{
    const value = String(text ?? '').replace(/,/g, '').trim();

    if (value === '' || !/^-?\d+(\.\d+)?$/.test(value))
    {
        return null;
    }

    return Number(value);
}

function round2(value: number): number
{
    return Math.round((Number(value) || 0) * 100) / 100;
}

// 2 -> "2", 2.5 -> "2.5"
function quantityText(value: number | null | undefined): string
{
    return String(round2(Number(value) || 0));
}
