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
import { StepTabsComponent, StepTabsStep } from '../../../../shared/components/layout/step-tabs/step-tabs';
import { WorkspaceArtComponent } from '../../../../shared/components/layout/workspace-art/workspace-art';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
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
import { ProductShelfComponent } from '../../../procurement/shared/product-shelf/product-shelf';
import { ShelfOptions, ShelfPick, ShelfProduct } from '../../../procurement/shared/product-shelf/product-shelf.model';
import { WsService } from '../../shared/ws.service';
import { openLocationChartPrint } from '../../print/location-chart.print';
import
{
    JobCard,
    JobCardLookups,
    JobRequirement,
    JobRequirementEstimate,
    PartBin,
    WsPartOption,
    wsBinText,
    wsDay,
    wsMoney,
    wsStatusColor
}
from '../../shared/ws.models';

//===============================================================
// Model
//===============================================================

type Mode =
    'list' | 'add' | 'edit' | 'view';

interface Option
{
    label: string;
    value: any;
    // the serial token of the job : the big figure of its row
    token?: string;
}

// A part the job needs
interface PartLine
{
    key: number;
    ItemKind: string;
    ItemId: number | null;
    ItemCode: string;
    ItemName: string;
    Quantity: string;
    Rate: number;
    Note: string;
}

// A service charge of the job (the charge can be changed)
interface ServiceLine
{
    key: number;
    ItemKind: string;
    ItemId: number | null;
    ItemCode: string;
    ItemName: string;
    Quantity: string;
    Rate: string;
    IsFree: boolean;
    Note: string;
}

//===============================================================
// Job Card Requirements (owner 2026-11-18) - in the place of Parts
// Requisitions.
//
// One page per job : the parts and the service charges an assigned
// job needs (its projection). With the switch Estimate Driven Job
// Card on, the estimate of the job fills them. The service manager
// or the service engineer can add to them and take off.
//
// List  : the Assigned jobs (nothing allocated yet) and the
//         Allocated ones (ready for parts and service issue).
// Add   : a job is picked from the Assigned ones.
// Save  : the job becomes Allocated.
// The manager can cancel the job here (tab Summary) : not with
// service charges on it, issued parts, or an estimate whose charge
// is not collected (the server says which).
//===============================================================

@Component(
{
    selector:'job-card-requirements',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        StepTabsComponent,
        WorkspaceArtComponent,
        SearchDropdownComponent,
        TextboxComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        ProductShelfComponent
    ],
    templateUrl:'./job-card-requirements.html',
    styleUrl:'./job-card-requirements.css'
})
export class JobCardRequirementsPage
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
        { id:'Assigned', label:'Assigned' },
        { id:'Allocated', label:'Allocated' }
    ];

    selectedTab =
        'all';

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Job Card', field:'JobCardNo', width:'195px', align:'center' },
        { header:'Serial Token', field:'TokenText', width:'100px', align:'center' },
        { header:'Date', field:'DateText', width:'110px', align:'center' },
        { header:'Customer', field:'CustomerName', width:'170px', align:'left' },
        { header:'Mobile', field:'Mobile', width:'125px', align:'left' },
        { header:'Model', field:'ModelName', width:'150px', align:'left' },
        { header:'Bike', field:'BikeNoText', width:'110px', align:'left' },
        { header:'Job Type', field:'JobType', width:'120px', align:'left' },
        { header:'Parts', field:'PartsText', width:'90px', align:'right' },
        { header:'Service', field:'ServiceText', width:'90px', align:'right' },
        { header:'Total', field:'TotalText', width:'95px', align:'right' },
        { header:'Status', field:'Status', width:'110px', align:'left', dotField:'StatusColor' },
        { header:'Actions', field:'actions', type:'actions', width:'95px', align:'center' }
    ];

    readonly listActions =
        { view:true, edit:true, delete:false };

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

    readonly steps:
        StepTabsStep[] =
    [
        { id:'parts', label:'Parts' },
        { id:'services', label:'Service Charges' },
        { id:'location', label:'Location' },
        { id:'summary', label:'Summary' }
    ];

    tab =
        'parts';

    lookups:
        JobCardLookups | null = null;

    card:
        JobCard | null = null;

    // The estimate of the job (the switch Estimate Driven Job Card
    // on); null : none
    estimate:
        JobRequirementEstimate | null = null;

    // The lines on the page came from the estimate (nothing was
    // allocated before)
    fromEstimate =
        false;

    // Parts that are with the job now (issued less returned)
    issuedQuantity =
        0;

    // The same, part by part ("Kind:Id") : such a part stays on the
    // requirement, its quantity not below what was issued
    private issuedItems =
        new Map<string, number>();

    // What is issued of a part of the requirement (0 : nothing)
    issuedOf(line: PartLine): number
    {
        return this.issuedItems.get(`${line.ItemKind}:${line.ItemId}`) ?? 0;
    }

    // Add : the assigned jobs that have nothing allocated yet
    jobItems:
        Option[] = [];

    jobPick:
        any = null;

    jobsLoading =
        false;

    // the assigned jobs that wait for their allocation
    waiting =
        0;

    partLines:
        PartLine[] = [];

    serviceLines:
        ServiceLine[] = [];

    private parts:
        WsPartOption[] = [];

    private partsBranch =
        0;

    partItems:
        Option[] = [];

    partPick:
        any = null;

    serviceItems:
        Option[] = [];

    servicePick:
        any = null;

    cancelReason =
        '';

    private nextKey =
        1;

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/') ? 'view' : url.includes('/edit/') ? 'edit' : url.includes('/add') ? 'add' : 'list';

        this.entityId =
            this.route.snapshot.paramMap.get('id') ?? '';

        if (this.mode === 'list')
        {
            this.loadList();
        }
        else
        {
            this.loadForm();
        }
    }

    private failed(error: any, fallback: string):
        void
    {
        this.toast.error('Job Card Requirements', error?.error?.message ?? fallback);
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

        this.ws.getJobCards()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:cards =>
                {
                    this.all =
                        (cards ?? [])
                            .filter(x => x.Status === 'Assigned' || x.Status === 'Allocated')
                            .map(x => ({
                                ...x,
                                TokenText:jobToken(x),
                                DateText:wsDay(x.JobDate),
                                BikeText:bikeText(x),
                                BikeNoText:x.RegistrationNo || x.ChassisNo || x.EngineNo,
                                PartsText:wsMoney(x.PartsTotal),
                                ServiceText:wsMoney(x.LabourTotal),
                                TotalText:wsMoney((Number(x.PartsTotal) || 0) + (Number(x.LabourTotal) || 0)),
                                StatusColor:wsStatusColor(x.Status)
                            }));

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.failed(error, 'The job cards could not be loaded.');
                }
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const matched =
            this.all.filter(x =>
                (this.selectedTab === 'all' || x.Status === this.selectedTab)
                && (!find
                    || [x.JobCardNo, x.TokenText, x.CustomerName, x.Mobile, x.BikeText, x.ChassisNo, x.RegistrationNo, x.JobType, x.Status]
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

    onTab(value: string):
        void
    {
        this.selectedTab = value || 'all';
        this.currentPage = 1;
        this.apply();
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

    // The history of the job cards (a requirement is a change of one)
    openHistory():
        void
    {
        this.ws
            .getHistory('workshop-management/job-cards')
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

    edit(row: any):
        void
    {
        void this.router.navigate(['../edit', row.PublicId], { relativeTo:this.route });
    }

    goToList():
        void
    {
        void this.router.navigate([this.mode === 'add' ? '../list' : '../../list'], { relativeTo:this.route });
    }

    //===========================================================
    // Form : load
    //===========================================================

    private loadForm():
        void
    {
        // the lists (the services, the service centers)
        this.ws.getJobCardLookups()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:lookups =>
                {
                    this.lookups = lookups;

                    this.serviceItems =
                        (lookups.ServiceItems ?? []).map(x => ({
                            label:`${x.Code}  ${x.Name}  (${x.IsFree ? 'free' : wsMoney(x.Rate)})`,
                            value:`${x.Kind}:${x.Id}`
                        }));

                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The services could not be loaded.')
            });

        if (this.mode !== 'add')
        {
            this.loadRequirement(this.entityId);

            return;
        }

        // Add : the assigned jobs with nothing allocated yet (an
        // allocated job is changed by the edit icon of the list)
        this.jobsLoading = true;

        this.ws.getJobCards()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:cards =>
                {
                    this.jobItems =
                        (cards ?? [])
                            .filter(x => x.Status === 'Assigned')
                            .map(x => ({
                                label:[x.JobCardNo, x.CustomerName, jobToken(x)].filter(v => !!v).join('   -   '),
                                value:x.PublicId,
                                token:jobToken(x)
                            }));

                    this.waiting = (cards ?? []).filter(x => x.Status === 'Assigned').length;

                    this.jobsLoading = false;
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.jobsLoading = false;
                    this.failed(error, 'The job cards could not be loaded.');
                }
            });
    }

    onJob(value: any):
        void
    {
        const id = String(value ?? '');

        // the page is of one job : once picked it stays
        if (!id || this.jobPick)
        {
            return;
        }

        this.jobPick = id;

        this.loadRequirement(id);
    }

    // Add : the page is emptied, another job can be picked
    clear():
        void
    {
        this.card = null;
        this.estimate = null;
        this.fromEstimate = false;
        this.issuedQuantity = 0;
        this.issuedItems = new Map<string, number>();
        this.jobPick = null;
        this.partLines = [];
        this.serviceLines = [];
        this.partEditKey = null;
        this.serviceEditKey = null;
        this.partPick = null;
        this.partQty = '1';
        this.partNote = '';
        this.servicePick = null;
        this.serviceQty = '1';
        this.serviceNote = '';
        this.cancelReason = '';
        this.tab = 'parts';

        this.cdr.detectChanges();
    }

    //===========================================================
    // Location Chart (owner 2026-11-18) : the rack, shelf and bin
    // of a part in the default warehouse of the service center
    //===========================================================

    // "Kind:Id" -> "A-03-05"
    private places =
        new Map<string, string>();

    // "Kind:Id" -> its bins (zone, rack, shelf, bin)
    private bins =
        new Map<string, PartBin[]>();

    // The Location step : a row a bin of a part (a part in two bins
    // takes two rows; a part with no place, one row with no bin)
    get locationRows(): { key: string; no: number | null; line: PartLine | null; bin: PartBin | null }[]
    {
        const rows: { key: string; no: number | null; line: PartLine | null; bin: PartBin | null }[] = [];

        this.partLines.forEach((line, index) =>
        {
            const bins = this.bins.get(`${line.ItemKind}:${line.ItemId}`) ?? [];

            if (bins.length === 0)
            {
                rows.push({ key:`${line.key}:0`, no:index + 1, line, bin:null });
                return;
            }

            bins.forEach((bin, i) =>
                rows.push({ key:`${line.key}:${i}`, no:i === 0 ? index + 1 : null, line:i === 0 ? line : null, bin }));
        });

        return rows;
    }

    // the parts saved on the job : what the chart prints
    savedParts =
        0;

    private loadPlaces(publicId: string):
        void
    {
        this.ws.getLocationChart(publicId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:chart =>
                {
                    this.places =
                        new Map((chart?.Places ?? []).map(x => [`${x.ItemKind}:${x.ItemId}`, x.Location ?? '']));

                    this.bins =
                        new Map((chart?.Places ?? []).map(x => [`${x.ItemKind}:${x.ItemId}`, x.Bins ?? []]));

                    this.cdr.detectChanges();
                },
                // the page works without the places
                error:() => { }
            });
    }

    placeOf(line: PartLine): string
    {
        return this.places.get(`${line.ItemKind}:${line.ItemId}`) ?? '';
    }

    // The hover text of a part row : where it sits, then the hint
    partTitle(line: PartLine): string
    {
        // in full : zone, rack, shelf, bin - a bin a line
        const bins = (this.bins.get(`${line.ItemKind}:${line.ItemId}`) ?? []).map(x => wsBinText(x)).filter(x => !!x);

        const place = bins.length > 0 ? bins.join('\n') : this.placeOf(line);

        return [
            place ? `Location\n${place}` : '',
            this.canEdit ? 'Double click : load the line above to update it' : ''
        ].filter(x => !!x).join('\n');
    }

    printChart():
        void
    {
        if (!this.card)
        {
            return;
        }

        if (this.savedParts === 0)
        {
            this.toast.error('Location Chart', 'No part is saved on this job yet : save the requirement first.');
            return;
        }

        const problem = openLocationChartPrint(this.router, this.card.PublicId);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }

    private loadRequirement(publicId: string):
        void
    {
        this.loading = true;
        this.cdr.detectChanges();

        this.ws.getJobRequirement(publicId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:requirement =>
                {
                    this.loading = false;
                    this.fill(requirement);
                },
                error:error =>
                {
                    this.loading = false;

                    // nothing came : another job can be picked
                    if (!this.card)
                    {
                        this.jobPick = null;
                    }

                    this.failed(error, 'The requirement of the job card could not be read. (Was the API restarted ?)');
                }
            });
    }

    private fill(requirement: JobRequirement):
        void
    {
        const card = requirement.Card;

        this.card = card;
        this.estimate = requirement.Estimate ?? null;
        this.issuedQuantity = Number(requirement.IssuedQuantity) || 0;

        this.issuedItems =
            new Map((requirement.IssuedItems ?? []).map(x => [`${x.ItemKind}:${x.ItemId}`, Number(x.Quantity) || 0]));

        this.savedParts = (card.Parts ?? []).length;
        this.loadPlaces(card.PublicId);
        this.cancelReason = '';

        let parts = card.Parts ?? [];
        let services = card.Services ?? [];

        // Nothing allocated yet : the estimate of the job fills the page
        this.fromEstimate =
            parts.length === 0 && services.length === 0 && !!this.estimate && !!card.CanAllocate
            && ((this.estimate?.Parts ?? []).length > 0 || (this.estimate?.Services ?? []).length > 0);

        if (this.fromEstimate)
        {
            parts = this.estimate!.Parts ?? [];
            services = this.estimate!.Services ?? [];
        }

        this.partLines =
            parts.map(x => ({
                key:this.nextKey++,
                ItemKind:x.ItemKind,
                ItemId:x.ItemId,
                ItemCode:x.ItemCode ?? '',
                ItemName:x.ItemName ?? '',
                Quantity:quantityText(x.Quantity),
                Rate:Number(x.Rate) || 0,
                Note:x.Note ?? ''
            }));

        this.serviceLines =
            services.map(x => ({
                key:this.nextKey++,
                ItemKind:x.ItemKind,
                ItemId:x.ItemId,
                ItemCode:x.ItemCode ?? '',
                ItemName:x.ItemName ?? '',
                Quantity:quantityText(x.Quantity),
                Rate:quantityText(x.Rate),
                IsFree:!!x.IsFree,
                Note:x.Note ?? ''
            }));

        this.loadParts(card.BranchId);

        this.cdr.detectChanges();
    }

    // The parts of the business lines the service center of the job
    // runs (Business Configuration)
    private loadParts(branchId: number):
        void
    {
        if (!branchId || this.partsBranch === branchId)
        {
            return;
        }

        this.partsBranch = branchId;

        this.ws.getParts(branchId).subscribe(
        {
            next:parts =>
            {
                this.parts = parts ?? [];

                this.partItems =
                    this.parts.map(x => ({
                        label:`${x.PartNumber || x.Code}  ${x.Name}  (${wsMoney(x.Price)}, stock ${x.OnHand})`,
                        value:`${x.Kind}:${x.Id}`
                    }));

                this.cdr.detectChanges();
            },
            error:error =>
            {
                this.partsBranch = 0;
                this.failed(error, 'The parts could not be loaded.');
            }
        });
    }

    //===========================================================
    // Form : what is shown
    //===========================================================

    // Add : a job with nothing allocated yet is picked (once picked,
    // the page is of that job). The edit icon of a row : the manager
    // adds to the allocation of the job, takes off, or cancels it.
    get canEdit(): boolean
    {
        return this.mode !== 'view' && !!this.card?.CanAllocate;
    }

    get pageTitle(): string
    {
        return this.mode === 'view' ? 'View Job Card Requirement'
            : this.mode === 'edit' ? 'Update Job Card Requirement'
            : 'Add Job Card Requirement';
    }

    get statusColor(): string
    {
        return wsStatusColor(this.card?.Status ?? 'Assigned');
    }

    get branchName(): string
    {
        const centers = this.lookups?.Branches ?? [];

        return this.card
            ? centers.find(x => x.Id === this.card?.BranchId)?.Name ?? this.card.BranchName ?? ''
            : centers.length === 1 ? centers[0].Name : '';
    }

    get dateText(): string
    {
        return this.card ? wsDay(this.card.JobDate) : '';
    }

    get tokenText(): string
    {
        return this.card ? jobToken(this.card) : '';
    }

    get bikeText(): string
    {
        return this.card ? bikeText(this.card) : '';
    }

    get bikeNoText(): string
    {
        return this.card?.RegistrationNo || this.card?.ChassisNo || this.card?.EngineNo || '';
    }

    partAmount(line: PartLine): number
    {
        return round2((toNumber(line.Quantity) ?? 0) * line.Rate);
    }

    serviceAmount(line: ServiceLine): number
    {
        return round2((toNumber(line.Quantity) ?? 0) * (toNumber(line.Rate) ?? 0));
    }

    get partsTotal(): number
    {
        return round2(this.partLines.reduce((sum, x) => sum + this.partAmount(x), 0));
    }

    get servicesTotal(): number
    {
        return round2(this.serviceLines.reduce((sum, x) => sum + this.serviceAmount(x), 0));
    }

    get total(): number
    {
        return round2(this.partsTotal + this.servicesTotal);
    }

    //===========================================================
    // Form : the lines
    //===========================================================

    // The entry row : the item is picked, its price is shown, the
    // quantity and a short note are typed, then Add puts it on the
    // requirement (picking alone adds nothing)
    partQty =
        '1';

    partNote =
        '';

    serviceQty =
        '1';

    serviceNote =
        '';

    private get pickedPart(): WsPartOption | undefined
    {
        return this.parts.find(x => `${x.Kind}:${x.Id}` === String(this.partPick ?? ''));
    }

    private get pickedService()
    {
        return (this.lookups?.ServiceItems ?? []).find(x => `${x.Kind}:${x.Id}` === String(this.servicePick ?? ''));
    }

    get partPriceText(): string
    {
        const part = this.pickedPart;

        return part ? wsMoney(part.Price) : '';
    }

    // What the store holds of the picked part
    get partStockText(): string
    {
        const part = this.pickedPart;

        return part ? quantityText(part.OnHand) : '';
    }

    // What the store holds of a part of the requirement ('-' : not
    // known, the part is not in the list of the service center)
    stockOf(line: PartLine): string
    {
        const part = this.parts.find(x => x.Kind === line.ItemKind && x.Id === line.ItemId);

        return part ? quantityText(part.OnHand) : '-';
    }

    // The requirement asks for more than the store holds
    isShort(line: PartLine): boolean
    {
        const part = this.parts.find(x => x.Kind === line.ItemKind && x.Id === line.ItemId);

        return !!part && (toNumber(line.Quantity) ?? 0) > (Number(part.OnHand) || 0);
    }

    get servicePriceText(): string
    {
        const item = this.pickedService;

        return !item ? '' : item.IsFree ? 'Free' : wsMoney(item.Rate);
    }

    onPartPick(value: any):
        void
    {
        this.partPick = value || null;
        this.cdr.detectChanges();
    }

    onServicePick(value: any):
        void
    {
        this.servicePick = value || null;
        this.cdr.detectChanges();
    }

    onEntry(field: 'partQty' | 'partNote' | 'serviceQty' | 'serviceNote', value: any):
        void
    {
        this[field] = String(value ?? '');
    }

    // Enter in the entry row : Qty > Short Note > the Add button
    // (Enter on the button adds the line)
    onEntryEnter(event: Event, row: HTMLElement):
        void
    {
        const target = event.target as HTMLElement;

        if (target.closest('.jr-e-qty'))
        {
            event.preventDefault();
            this.focusEntry(row, 'note');
        }
        else if (target.closest('.jr-e-note'))
        {
            event.preventDefault();
            this.focusEntry(row, 'add');
        }
    }

    // Puts the cursor in a box of the entry row (after the page is
    // drawn again)
    focusEntry(row: HTMLElement, what: 'item' | 'qty' | 'note' | 'add'):
        void
    {
        setTimeout(() =>
        {
            // the item box : its list is opened again, the cursor
            // goes to the search box of the list (the dropdown does
            // that itself when it opens)
            if (what === 'item')
            {
                const box = row.querySelector('app-search-dropdown .dropdown-selector') as HTMLElement | null;

                if (box && box.getAttribute('aria-expanded') !== 'true' && !box.classList.contains('disabled'))
                {
                    box.click();
                }

                return;
            }

            const selector =
                what === 'qty' ? '.jr-e-qty input'
                : what === 'note' ? '.jr-e-note input'
                : what === 'add' ? 'button.jr-add'
                : 'app-search-dropdown input';

            const element = row.querySelector(selector) as HTMLInputElement | HTMLButtonElement | null;

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

    //===========================================================
    // The Product Shelf : several parts (or services) picked at
    // once, with their quantity
    //===========================================================

    shelfKind:
        'parts' | 'services' = 'parts';

    shelfOpen =
        false;

    shelfProducts:
        ShelfProduct[] = [];

    get shelfTitle(): string
    {
        return this.shelfKind === 'parts' ? 'Product Shelf - Parts' : 'Product Shelf - Service Charges';
    }

    get shelfSubtitle(): string
    {
        return this.card ? `${this.card.JobCardNo}  -  ${this.card.CustomerName}` : '';
    }

    get shelfOptions(): ShelfOptions
    {
        const parts = this.shelfKind === 'parts';

        return {
            showMrp:false,
            showMargin:false,
            showFree:false,
            mrpRequired:false,
            priceWord:parts ? 'Price' : 'Charge',
            itemWord:parts ? 'part' : 'service',
            itemsWord:parts ? 'spare parts / lubricants / accessories' : 'services',
            icon:parts ? 'fas fa-gears' : 'fas fa-screwdriver-wrench',
            docWord:'requirement',
            salesMode:true,
            reclickAddsQty:true
        };
    }

    openShelf(kind: 'parts' | 'services'):
        void
    {
        if (!this.canEdit)
        {
            return;
        }

        this.shelfKind = kind;

        const groups: string[] = [];

        // a group of the shelf : the kind of the item
        const group = (name: string): number =>
        {
            if (!groups.includes(name))
            {
                groups.push(name);
            }

            return groups.indexOf(name) + 1;
        };

        if (kind === 'parts')
        {
            this.shelfProducts =
                this.parts.map(x =>
                {
                    const onLine =
                        toNumber(this.partLines.find(l => l.ItemKind === x.Kind && l.ItemId === x.Id)?.Quantity ?? '') ?? 0;

                    const kindName = kindText(x.Kind);

                    const stock = Number(x.OnHand) || 0;

                    const price = Number(x.Price) || 0;

                    return {
                        code:`${x.Kind}:${x.Id}`,
                        name:[x.PartNumber || x.Code, x.Name].filter(v => !!v).join(' - '),
                        unit:x.Unit ?? '',
                        categoryId:group(kindName),
                        categoryName:kindName,
                        subCategoryId:x.BrandManagementId,
                        subCategoryName:x.BrandName ?? '',
                        imageUrl:'',
                        lastText:'',
                        boughtBefore:false,
                        mrpText:price > 0 ? `Price ${wsMoney(price)}` : 'Price -',
                        stockText:`Stock ${quantityText(stock)}`,
                        stockQty:stock,
                        stockTone:stock > 0 ? 'green' : 'red',
                        room:null,
                        inOrderQty:onLine,
                        start:{ qty:onLine > 0 ? onLine : 1, free:0, mrp:price, margin:null, dp:price }
                    } as ShelfProduct;
                });
        }
        else
        {
            this.shelfProducts =
                (this.lookups?.ServiceItems ?? []).map(x =>
                {
                    const onLine =
                        toNumber(this.serviceLines.find(l => l.ItemKind === x.Kind && l.ItemId === x.Id)?.Quantity ?? '') ?? 0;

                    const kindName = kindText(x.Kind);

                    const rate = x.IsFree ? 0 : Number(x.Rate) || 0;

                    return {
                        code:`${x.Kind}:${x.Id}`,
                        name:[x.Code, x.Name].filter(v => !!v).join(' - '),
                        unit:'',
                        categoryId:group(kindName),
                        categoryName:kindName,
                        subCategoryId:null,
                        subCategoryName:'',
                        imageUrl:'',
                        lastText:'',
                        boughtBefore:false,
                        mrpText:x.IsFree ? 'Free' : `Charge ${wsMoney(rate)}`,
                        stockText:x.Info ?? '',
                        stockTone:'',
                        room:null,
                        inOrderQty:onLine,
                        start:{ qty:onLine > 0 ? onLine : 1, free:0, mrp:rate, margin:null, dp:rate }
                    } as ShelfProduct;
                });
        }

        if (this.shelfProducts.length === 0)
        {
            this.toast.error('Product Shelf', kind === 'parts' ? 'The parts are not loaded yet (or the service center has none).' : 'No service is set up (Service Setup).');

            return;
        }

        this.shelfOpen = true;
        this.cdr.detectChanges();
    }

    closeShelf():
        void
    {
        this.shelfOpen = false;
        this.cdr.detectChanges();
    }

    // The picks : a new line each; the one already on the requirement
    // gets the picked quantity
    onShelfAdd(picks: ShelfPick[]):
        void
    {
        for (const pick of picks ?? [])
        {
            const quantity = quantityText(pick.figures?.qty > 0 ? pick.figures.qty : 1);

            if (this.shelfKind === 'parts')
            {
                const part = this.parts.find(x => `${x.Kind}:${x.Id}` === pick.code);

                const line = part ? this.partLines.find(l => l.ItemKind === part.Kind && l.ItemId === part.Id) : null;

                if (line)
                {
                    line.Quantity = quantity;
                }
                else if (part)
                {
                    this.partLines =
                    [
                        ...this.partLines,
                        {
                            key:this.nextKey++,
                            ItemKind:part.Kind,
                            ItemId:part.Id,
                            ItemCode:part.PartNumber || part.Code || '',
                            ItemName:part.Name ?? '',
                            Quantity:quantity,
                            Rate:Number(part.Price) || 0,
                            Note:''
                        }
                    ];
                }
            }
            else
            {
                const item = (this.lookups?.ServiceItems ?? []).find(x => `${x.Kind}:${x.Id}` === pick.code);

                const line = item ? this.serviceLines.find(l => l.ItemKind === item.Kind && l.ItemId === item.Id) : null;

                if (line)
                {
                    line.Quantity = quantity;
                }
                else if (item)
                {
                    this.serviceLines =
                    [
                        ...this.serviceLines,
                        {
                            key:this.nextKey++,
                            ItemKind:item.Kind,
                            ItemId:item.Id,
                            ItemCode:item.Code ?? '',
                            ItemName:item.Name ?? '',
                            Quantity:quantity,
                            Rate:quantityText(item.IsFree ? 0 : item.Rate),
                            IsFree:!!item.IsFree,
                            Note:''
                        }
                    ];
                }
            }
        }

        this.shelfOpen = false;
        this.cdr.detectChanges();
    }

    //===========================================================
    // A line of the cart is double clicked : it is loaded in the
    // entry row, the Add button becomes Update
    //===========================================================

    partEditKey:
        number | null = null;

    serviceEditKey:
        number | null = null;

    editPart(line: PartLine, event: Event):
        void
    {
        if (!this.canEdit || isBoxOrButton(event))
        {
            return;
        }

        this.partEditKey = line.key;
        this.partPick = `${line.ItemKind}:${line.ItemId}`;
        this.partQty = line.Quantity;
        this.partNote = line.Note ?? '';

        this.cdr.detectChanges();

        // the entry row of the same card
        const row = (event.currentTarget as HTMLElement | null)?.closest('.jr-card')?.querySelector('.jr-pick') as HTMLElement | null;

        if (row)
        {
            this.focusEntry(row, 'qty');
        }
    }

    editService(line: ServiceLine, event: Event):
        void
    {
        if (!this.canEdit || isBoxOrButton(event))
        {
            return;
        }

        this.serviceEditKey = line.key;
        this.servicePick = `${line.ItemKind}:${line.ItemId}`;
        this.serviceQty = line.Quantity;
        this.serviceNote = line.Note ?? '';

        this.cdr.detectChanges();

        // the entry row of the same card
        const row = (event.currentTarget as HTMLElement | null)?.closest('.jr-card')?.querySelector('.jr-pick') as HTMLElement | null;

        if (row)
        {
            this.focusEntry(row, 'qty');
        }
    }

    // The loaded line is let go : the entry row is empty again
    cancelPartEdit():
        void
    {
        this.partEditKey = null;
        this.partPick = null;
        this.partQty = '1';
        this.partNote = '';

        this.cdr.detectChanges();
    }

    cancelServiceEdit():
        void
    {
        this.serviceEditKey = null;
        this.servicePick = null;
        this.serviceQty = '1';
        this.serviceNote = '';

        this.cdr.detectChanges();
    }

    addPart():
        void
    {
        // Update : the loaded line gets the quantity and the note
        const loaded = this.partLines.find(x => x.key === this.partEditKey);

        if (loaded)
        {
            const quantity = toNumber(this.partQty);

            if (quantity === null || quantity <= 0)
            {
                this.toast.error('Parts', 'Give the quantity.');

                return;
            }

            loaded.Quantity = quantityText(quantity);
            loaded.Note = this.partNote.trim();

            this.cancelPartEdit();

            return;
        }

        const part = this.pickedPart;

        if (!part)
        {
            this.toast.error('Parts', 'Select the part first.');

            return;
        }

        const quantity = toNumber(this.partQty);

        if (quantity === null || quantity <= 0)
        {
            this.toast.error('Parts', 'Give the quantity.');

            return;
        }

        if (this.partLines.some(x => x.ItemKind === part.Kind && x.ItemId === part.Id))
        {
            this.toast.error('Parts', `${part.Name} is already on the requirement : change its quantity on the line.`);

            return;
        }

        this.partLines =
        [
            ...this.partLines,
            {
                key:this.nextKey++,
                ItemKind:part.Kind,
                ItemId:part.Id,
                ItemCode:part.PartNumber || part.Code || '',
                ItemName:part.Name ?? '',
                Quantity:quantityText(quantity),
                Rate:Number(part.Price) || 0,
                Note:this.partNote.trim()
            }
        ];

        this.partPick = null;
        this.partQty = '1';
        this.partNote = '';

        this.cdr.detectChanges();
    }

    addService():
        void
    {
        // Update : the loaded line gets the quantity and the note
        const loaded = this.serviceLines.find(x => x.key === this.serviceEditKey);

        if (loaded)
        {
            const quantity = toNumber(this.serviceQty);

            if (quantity === null || quantity <= 0)
            {
                this.toast.error('Service Charges', 'Give the quantity.');

                return;
            }

            loaded.Quantity = quantityText(quantity);
            loaded.Note = this.serviceNote.trim();

            this.cancelServiceEdit();

            return;
        }

        const item = this.pickedService;

        if (!item)
        {
            this.toast.error('Service Charges', 'Select the service first.');

            return;
        }

        const quantity = toNumber(this.serviceQty);

        if (quantity === null || quantity <= 0)
        {
            this.toast.error('Service Charges', 'Give the quantity.');

            return;
        }

        if (this.serviceLines.some(x => x.ItemKind === item.Kind && x.ItemId === item.Id))
        {
            this.toast.error('Service Charges', `${item.Name} is already on the requirement.`);

            return;
        }

        this.serviceLines =
        [
            ...this.serviceLines,
            {
                key:this.nextKey++,
                ItemKind:item.Kind,
                ItemId:item.Id,
                ItemCode:item.Code ?? '',
                ItemName:item.Name ?? '',
                Quantity:quantityText(quantity),
                Rate:quantityText(item.IsFree ? 0 : item.Rate),
                IsFree:!!item.IsFree,
                Note:this.serviceNote.trim()
            }
        ];

        this.servicePick = null;
        this.serviceQty = '1';
        this.serviceNote = '';

        this.cdr.detectChanges();
    }

    onPartLine(line: PartLine, field: 'Quantity' | 'Note', event: Event):
        void
    {
        line[field] = (event.target as HTMLInputElement).value;
        this.cdr.detectChanges();
    }

    onServiceLine(line: ServiceLine, field: 'Quantity' | 'Rate' | 'Note', event: Event):
        void
    {
        line[field] = (event.target as HTMLInputElement).value;
        this.cdr.detectChanges();
    }

    removePart(line: PartLine):
        void
    {
        if (this.issuedOf(line) > 0)
        {
            this.toast.error('Parts', `${line.ItemName} : ${quantityText(this.issuedOf(line))} is issued to the job already. It cannot be taken off (return the parts first, Parts Returns).`);

            return;
        }

        this.partLines = this.partLines.filter(x => x.key !== line.key);

        if (this.partEditKey === line.key)
        {
            this.cancelPartEdit();
        }

        this.cdr.detectChanges();
    }

    removeService(line: ServiceLine):
        void
    {
        this.serviceLines = this.serviceLines.filter(x => x.key !== line.key);

        if (this.serviceEditKey === line.key)
        {
            this.cancelServiceEdit();
        }

        this.cdr.detectChanges();
    }

    //===========================================================
    // Save
    //===========================================================

    save():
        void
    {
        const card = this.card;

        if (!card)
        {
            this.toast.error('Validation', 'Pick the job card.');

            return;
        }

        for (const line of this.partLines)
        {
            const quantity = toNumber(line.Quantity);

            if (quantity === null || quantity <= 0)
            {
                this.tab = 'parts';
                this.toast.error('Validation', `${line.ItemName} : give the quantity.`);

                return;
            }
        }

        for (const line of this.serviceLines)
        {
            const quantity = toNumber(line.Quantity);
            const rate = toNumber(line.Rate);

            if (quantity === null || quantity <= 0 || rate === null || rate < 0)
            {
                this.tab = 'services';
                this.toast.error('Validation', `${line.ItemName} : give the quantity and the charge.`);

                return;
            }
        }

        for (const line of this.partLines)
        {
            if ((toNumber(line.Quantity) ?? 0) < this.issuedOf(line))
            {
                this.toast.error('Validation', `${line.ItemName} : ${quantityText(this.issuedOf(line))} is issued to the job already. The quantity cannot go below that.`);

                return;
            }
        }

        if (this.partLines.length === 0 && this.serviceLines.length === 0 && card.Status !== 'Allocated')
        {
            this.toast.error('Validation', 'Add a part or a service charge at least.');

            return;
        }

        this.progress.show(this.mode === 'edit' ? 'Updating the requirement' : 'Saving the requirement', card.JobCardNo);

        this.ws
            .saveJobRequirement(
                card.PublicId,
                {
                    EstimatePublicId:this.estimate?.PublicId ?? null,
                    Parts:this.partLines.map(x => ({
                        ItemKind:x.ItemKind,
                        ItemId:x.ItemId,
                        ItemCode:x.ItemCode,
                        ItemName:x.ItemName,
                        Quantity:toNumber(x.Quantity) ?? 0,
                        Rate:x.Rate,
                        Amount:this.partAmount(x),
                        Note:x.Note.trim()
                    })),
                    Services:this.serviceLines.map(x => ({
                        ItemKind:x.ItemKind,
                        ItemId:x.ItemId,
                        ItemCode:x.ItemCode,
                        ItemName:x.ItemName,
                        Quantity:toNumber(x.Quantity) ?? 0,
                        Rate:toNumber(x.Rate) ?? 0,
                        Amount:this.serviceAmount(x),
                        IsFree:x.IsFree,
                        Note:x.Note.trim()
                    })),
                    Note:''
                })
            .subscribe(
            {
                next:result =>
                    this.progress.finish(() =>
                    {
                        this.toast.success(this.mode === 'edit' ? 'Updated' : 'Saved', `${card.JobCardNo} is ${result?.Card?.Status ?? 'saved'}.`);
                        this.goToList();
                    }),
                error:error =>
                {
                    this.progress.fail();
                    this.failed(error, 'The requirement could not be saved.');
                }
            });
    }

    //===========================================================
    // Cancel the job (the manager)
    //===========================================================

    get canCancel(): boolean
    {
        return this.mode !== 'view' && !!this.card && (this.card.Status === 'Assigned' || this.card.Status === 'Allocated');
    }

    onCancelReason(value: any):
        void
    {
        this.cancelReason = String(value ?? '');
    }

    // Why the job cannot be cancelled now ('' : it can). Nothing may
    // be allocated to it : the saved parts and service charges are
    // taken off (and saved) first, the charge of its estimate is
    // collected first
    get cancelLock(): string
    {
        const card = this.card;

        if (!card)
        {
            return '';
        }

        if (this.issuedQuantity > 0)
        {
            return 'Parts are issued to the job : return them first (Parts Returns).';
        }

        if ((card.Parts ?? []).length > 0 || (card.Services ?? []).length > 0)
        {
            return 'Parts or service charges are allocated to the job : remove all of them and save, then the job can be cancelled.';
        }

        if (this.partLines.length > 0 || this.serviceLines.length > 0)
        {
            return 'Parts or service charges are on the requirement : remove all of them, then the job can be cancelled.';
        }

        const estimate = this.estimate;

        if (estimate && Number(estimate.ChargeTotal) > 0 && !estimate.ChargeCollected)
        {
            return `The job has the estimate ${estimate.Name} : collect its Estimate Charge first (Service Estimates).`;
        }

        return '';
    }

    cancelJob():
        void
    {
        if (this.cancelLock)
        {
            this.toast.error('Cancel Job', this.cancelLock);

            return;
        }

        const card = this.card;

        const reason = this.cancelReason.trim();

        if (!card)
        {
            return;
        }

        if (!reason)
        {
            this.toast.error('Validation', 'Say why the job is cancelled.');

            return;
        }

        this.confirmDialog.open(
            'Cancel Job',
            `Cancel ${card.JobCardNo} of ${card.CustomerName}? A job with service charges, issued parts or an estimate whose charge is not collected cannot be cancelled.`,
            () =>
                this.ws.changeJobCardStatus(card.PublicId, 'Cancelled', reason).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Cancelled', `${card.JobCardNo} was cancelled.`);
                        this.goToList();
                    },
                    error:error => this.failed(error, 'The job card could not be cancelled.')
                }),
            'Cancel Job',
            'Keep',
            'danger');
    }
}

//===============================================================
// Helpers
//===============================================================

// 1118001 : the month and the day of the job, then its serial
function jobToken(card: JobCard): string
{
    const serial = (card.WelcomeTokenNo ?? '').replace(/^W-/, '');
    const date = (card.JobDate ?? '').substring(0, 10);

    return serial && date.length === 10 ? date.substring(5, 7) + date.substring(8, 10) + serial : serial;
}

function bikeText(card: JobCard): string
{
    return [[card.BrandName, card.ModelName].filter(x => !!x).join(' '), card.ColorName].filter(x => !!x).join(' - ');
}

// A double click in a box or on a button of a line is not the
// double click of the line
function isBoxOrButton(event: Event): boolean
{
    return !!(event.target as HTMLElement | null)?.closest('input, button');
}

// SparePart -> "Spare Part", LaborChart -> "Labor Chart"
function kindText(kind: string): string
{
    return String(kind ?? '').replace(/([a-z])([A-Z])/g, '$1 $2') || 'Other';
}

function toNumber(text: string): number | null
{
    const value = String(text ?? '').replace(/,/g, '').trim();

    return /^[0-9]+(\.[0-9]+)?$/.test(value) ? Number(value) : null;
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
