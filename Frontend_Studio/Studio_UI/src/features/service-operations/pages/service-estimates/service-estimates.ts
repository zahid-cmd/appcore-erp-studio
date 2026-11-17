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

import
{
    Observable,
    catchError,
    forkJoin,
    of
}
from 'rxjs';

import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../shared/components/layout/page-toolbar/page-toolbar';
import { ControlTab, ControlTabsComponent } from '../../../../shared/components/controls/control-tabs/control-tabs';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { DatepickerComponent } from '../../../../shared/components/controls/datepicker/datepicker';
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ListTableColumn, ListTableComponent, ListTableRowAction, ListTableRowActionEvent } from '../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { OrbitLoaderComponent } from '../../../../shared/components/utilities/orbit-loader/orbit-loader';
import { SummaryLineComponent, SummaryLineItem } from '../../../../shared/components/layout/summary-line/summary-line';
import { HrProgressService } from '../../../human-resource-manangement/services/hr-progress.service';
import { hrToDate, hrToText } from '../../../human-resource-manangement/services/hr-date';

import { WsService } from '../../shared/ws.service';
import { openServiceEstimatePrint } from '../../print/service-estimate.print';

import
{
    EstimateObservationLists,
    JobCardBike,
    SaveServiceEstimate,
    ServiceEstimate,
    ServiceEstimateLine,
    ServiceEstimateLookups,
    WorkshopDiagnosis,
    WorkshopObservation,
    WorkshopOutsideWork,
    WsCustomerOption,
    WsLedger,
    WsPartOption,
    WsServiceItem,
    wsDateTime,
    wsDay,
    wsEstimateName,
    wsMoney,
    wsStatusColor
}
from '../../shared/ws.models';


//===============================================================
// Model
//===============================================================

type Mode =
    'list' | 'add' | 'edit' | 'view';

type Section =
    'observations' | 'lines' | 'charge' | 'status';

// A labour line or a part line of the form
interface Line
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

interface Option
{
    label: string;
    value: any;
}

// An observation of the estimate (a problem of the bike) with
// what was found
interface ObservationRow
{
    key: number;
    WorkshopObservationId: number | null;
    Observation: string;
    WorkshopDiagnosisId: number | null;
    Diagnosis: string;
    Note: string;
    // the diagnoses that can be picked for it
    items: Option[];
    // a new diagnosis is being typed
    typing: boolean;
    typed: string;
}

// A collection line of the Estimate Charge
interface PayLine
{
    key: number;
    Mode: string;
    LedgerCode: string;
    Amount: string;
    TransactionRef: string;
}

const MODES: Option[] =
[
    { label:'Cash', value:'Cash' },
    { label:'Bank', value:'Bank' },
    { label:'MFS', value:'MFS' }
];


//===============================================================
// Service Estimates (Service Operations > Workshop Management)
//
// One page : the list, and the form of one estimate (add / edit /
// view). An estimate is made for a customer and a bike (found, or
// typed) : it is not made for a job card. A job card can be made
// from it (Create Job Card) : the estimate is Converted then.
//
// Draft > Sent > Approved / Rejected. Revise makes a new version (a
// Draft) and the old one becomes Revised.
//
// The Estimate Charge (the service selected in Workshop
// Configuration) is collected on the estimate when the customer
// does not take the service. The estimate is printed only when the
// charge was collected or a job card was made from it.
//
// The observations (the problems of the bike) are picked from the
// list of Workshop Configuration, each with its diagnosis. With
// the switch on, a picked diagnosis puts its labour and parts on
// the estimate. Users with the page action Add Observation can add
// a new observation or diagnosis to the lists from here. They go
// to the job card as its complaints.
//
// The list and the form follow the voucher pages (Receipt / Payment
// Voucher) : a summary line under the list; on the form a ribbon in
// the header, floating cards, and the lines in the card on the
// right. The form never scrolls : only the lines do.
//===============================================================

// A row of the customer search : a customer and the bikes the
// service center knows of him
interface CustomerHit
{
    key: string;
    customerId: number | null;
    name: string;
    mobile: string;
    code: string;
    bikes: JobCardBike[];
}

@Component(
{
    selector:'service-estimates',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
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
        ProgressDialogComponent,
        OrbitLoaderComponent,
        SummaryLineComponent
    ],

    templateUrl:'./service-estimates.html',

    styleUrl:'./service-estimates.css'
})

export class ServiceEstimatesPage
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

    readonly asDate = hrToDate;
    readonly money = wsMoney;
    readonly dateTime = wsDateTime;

    mode:
        Mode = 'list';

    entityId =
        '';

    loading =
        false;

    loadFailed =
        false;

    isSaving =
        false;

    // The fields can be changed : a new estimate, or a Draft
    get canEdit(): boolean
    {
        return this.mode === 'add' || (this.mode === 'edit' && !!this.estimate?.CanEdit);
    }

    get pageTitle(): string
    {
        return this.mode === 'add' ? 'Add Service Estimate' : this.mode === 'edit' ? 'Update Service Estimate' : 'View Service Estimate';
    }

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
        { id:'Draft', label:'Draft' },
        { id:'Sent', label:'Sent' },
        { id:'Approved', label:'Approved' },
        { id:'Converted', label:'Converted' },
        { id:'Rejected', label:'Rejected' },
        { id:'Revised', label:'Revised' }
    ];

    selectedTab =
        'all';

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Estimate', field:'NameText', width:'125px', align:'center' },
        { header:'Date', field:'DateText', width:'105px', align:'center' },
        { header:'Customer', field:'CustomerName', width:'180px', align:'left' },
        { header:'Mobile', field:'Mobile', width:'115px', align:'left' },
        { header:'Model', field:'ModelName', width:'150px', align:'left' },
        { header:'Bike', field:'BikeText', width:'150px', align:'left' },
        { header:'Total', field:'TotalText', width:'115px', align:'right' },
        { header:'Est. Charge', field:'ChargeText', width:'105px', align:'center' },
        { header:'Job Card', field:'JobCardNo', width:'150px', align:'center' },
        { header:'Status', field:'Status', width:'105px', align:'left', dotField:'StatusColor' },
        { header:'Actions', field:'actions', type:'actions', width:'130px', align:'center' }
    ];

    readonly rowActions:
        ListTableRowAction[] =
    [
        { key:'print', icon:'fas fa-print', title:'Print the estimate', tone:'primary' }
    ];

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

    // Under the list : how many of each status (the search applied,
    // not the tab)
    summaryItems:
        SummaryLineItem[] = [];

    historyOpened =
        false;

    historyItems:
        any[] = [];


    //===========================================================
    // Form
    //===========================================================

    lookups:
        ServiceEstimateLookups | null = null;

    // The saved estimate (null : a new one)
    estimate:
        ServiceEstimate | null = null;

    branchItems:
        Option[] = [];

    modelItems:
        Option[] = [];

    customerItems:
        Option[] = [];

    private customers:
        WsCustomerOption[] = [];

    serviceItems:
        Option[] = [];

    partItems:
        Option[] = [];

    private parts:
        WsPartOption[] | null = null;

    estimateName =
        '';

    estimateDate =
        '';

    validUntil =
        '';

    branchId =
        0;

    // The bike : found (serviceVehicleId) or typed
    serviceVehicleId:
        number | null = null;

    chassisNo =
        '';

    engineNo =
        '';

    registrationNo =
        '';

    modelId:
        number | null = null;

    modelName =
        '';

    brandName =
        '';

    brandManagementId:
        number | null = null;

    colorName =
        '';

    // The customer : of the customer profiles (customerId) or typed
    customerId:
        number | null = null;

    customerName =
        '';

    mobile =
        '';

    kmReading =
        '';

    basicRequirement =
        '';

    remarks =
        '';

    // The customer search (as on the sales invoice) : the list opens
    // while typing; a customer comes with the bikes the service
    // center knows of him
    customerQuery =
        '';

    finding =
        false;

    hits:
        CustomerHit[] = [];

    hitsOpen =
        false;

    hitActive =
        0;

    // a customer was picked from the list : name and mobile are locked
    customerPicked =
        false;

    // the bikes of the picked customer, and the list to choose from
    customerBikes:
        JobCardBike[] = [];

    bikeChoices:
        JobCardBike[] = [];

    private searchTimer:
        any = null;

    private searchNo =
        0;

    // The collection of the Estimate Charge
    readonly modeItems = MODES;

    readonly day = wsDay;

    private ledgers:
        WsLedger[] = [];

    private ledgersAsked =
        false;

    payments:
        PayLine[] = [];

    collectDate =
        '';

    readonly sectionTabs:
        ControlTab[] =
    [
        { id:'observations', label:'Observations' },
        { id:'lines', label:'Labour & Parts' },
        { id:'charge', label:'Estimate Charge' },
        { id:'status', label:'Status' }
    ];

    section:
        Section = 'lines';

    // The model is typed (not in the list)
    typeModel =
        false;

    // The form as it was loaded or saved : what "Unsaved" compares
    private snapshot =
        '';

    private nextKey =
        1;

    services:
        Line[] = [];

    partLines:
        Line[] = [];

    // The observations and diagnoses of Workshop Configuration
    // (null : not loaded, or their script was not run yet)
    private lists:
        EstimateObservationLists | null = null;

    observationItems:
        Option[] = [];

    observationPick:
        any = null;

    // A new observation typed here (page action Add Observation)
    newObservation =
        '';

    observations:
        ObservationRow[] = [];

    get canAddObservation(): boolean
    {
        return this.canEdit && !!this.lists?.CanAdd;
    }

    get observationHint(): string
    {
        return !this.canEdit ? 'The observations go to the job card as its complaints.'
            : this.lists?.Suggest ? 'Picking a diagnosis puts its labour and parts on the estimate. The observations go to the job card as its complaints.'
            : 'Pick the problems of the bike and what was found. They go to the job card as its complaints.';
    }

    servicePick:
        any = null;

    partPick:
        any = null;

    // The note of a status change (needed to reject)
    statusNote =
        '';

    get labourTotal(): number
    {
        return this.services.reduce((sum, x) => sum + this.amount(x), 0);
    }

    get partsTotal(): number
    {
        return this.partLines.reduce((sum, x) => sum + this.amount(x), 0);
    }

    get branchName(): string
    {
        return this.estimate?.BranchName || (this.branchItems.find(x => x.value === this.branchId)?.label ?? '');
    }

    // The pill of the header ribbon
    get statusClass(): string
    {
        return `se-status se-status-${(this.estimate?.Status ?? 'new').toLowerCase()}`;
    }

    // What Save would send, as text
    private state(): string
    {
        const lines =
            (rows: Line[]): any[] => rows.map(x => [x.ItemKind, x.ItemId, x.ItemName, x.Quantity, x.Rate, x.Note]);

        return JSON.stringify(
            [
                this.branchId, this.estimateDate, this.validUntil,
                this.serviceVehicleId, this.chassisNo, this.engineNo, this.registrationNo, this.modelId, this.modelName, this.colorName,
                this.customerId, this.customerName, this.mobile, this.kmReading, this.basicRequirement, this.remarks,
                lines(this.services), lines(this.partLines),
                this.observations.map(x => [x.WorkshopObservationId, x.Observation, x.WorkshopDiagnosisId, x.Diagnosis, x.Note])
            ]);
    }

    get hasChanges(): boolean
    {
        return this.canEdit && !!this.snapshot && this.state() !== this.snapshot;
    }

    get statusColor(): string
    {
        return wsStatusColor(this.estimate?.Status ?? 'Draft');
    }

    // The Estimate Charge the page shows : of the saved estimate, or
    // as Workshop Configuration has it for a new one
    get charge(): { isSet: boolean; name: string; amount: number; vatRate: number; vat: number; total: number }
    {
        const e = this.estimate;

        if (e)
        {
            return {
                isSet:!!e.ChargeName || e.ChargeTotal > 0,
                name:e.ChargeName || 'Estimate Charge',
                amount:e.ChargeAmount ?? 0,
                vatRate:e.ChargeVatRate ?? 0,
                vat:e.ChargeVatAmount ?? 0,
                total:e.ChargeTotal ?? 0
            };
        }

        const c = this.lookups?.Charge;

        return {
            isSet:!!c?.IsSet,
            name:c?.Name || 'Estimate Charge',
            amount:c?.Amount ?? 0,
            vatRate:c?.VatRate ?? 0,
            vat:c?.VatAmount ?? 0,
            total:c?.Total ?? 0
        };
    }

    amount(line: Line): number
    {
        return line.IsFree ? 0 : Math.round((Number(line.Quantity) || 0) * (Number(line.Rate) || 0) * 100) / 100;
    }


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
        this.toast.error('Error', error?.error?.message ?? fallback);
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

        this.ws
            .getEstimates()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:estimates =>
                {
                    this.all =
                        (estimates ?? []).map(x => ({
                            ...x,
                            NameText:wsEstimateName(x),
                            DateText:wsDay(x.EstimateDate),
                            ValidText:wsDay(x.ValidUntil),
                            BikeText:x.RegistrationNo || x.ChassisNo || x.EngineNo,
                            ChargeText:x.ChargeCollected ? 'Collected' : (x.ChargeTotal > 0 && !x.JobCardNo ? wsMoney(x.ChargeTotal) : ''),
                            TotalText:wsMoney(x.GrandTotal),
                            StatusColor:wsStatusColor(x.Status)
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.failed(error, 'Estimates could not be loaded.');
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
                    || [x.NameText, x.JobCardNo, x.CustomerName, x.Mobile, x.ModelName, x.ChassisNo, x.EngineNo, x.RegistrationNo, x.Status]
                        .some(v => String(v ?? '').toLowerCase().includes(find))));

        this.totalRecords = matched.length;

        const found =
            this.all.filter(x =>
                !find
                || [x.NameText, x.JobCardNo, x.CustomerName, x.Mobile, x.ModelName, x.ChassisNo, x.EngineNo, x.RegistrationNo, x.Status]
                    .some(v => String(v ?? '').toLowerCase().includes(find)));

        const count =
            (status: string): string => found.filter(x => x.Status === status).length.toLocaleString('en-US');

        this.summaryItems =
            this.all.length === 0
                ? []
                : [
                    { label:'Total', value:found.length.toLocaleString('en-US'), tone:'' },
                    { label:'Draft', value:count('Draft'), tone:'' },
                    { label:'Sent', value:count('Sent'), tone:'warn' },
                    { label:'Approved', value:count('Approved'), tone:'ok' },
                    { label:'Converted', value:count('Converted'), tone:'ok' },
                    { label:'Rejected', value:count('Rejected'), tone:'bad' }
                ];

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

    onSort(_event: any):
        void
    {
        // Newest first
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

    onRowAction(event: ListTableRowActionEvent):
        void
    {
        if (event.key === 'print')
        {
            this.print(event.row);
        }
    }

    // Printed only when the Estimate Charge was collected or a job
    // card was made from the estimate
    print(row?: any):
        void
    {
        const estimate = row ?? this.estimate;

        if (!estimate?.PublicId)
        {
            return;
        }

        if (!estimate.CanPrint)
        {
            this.toast.error('Print', 'The estimate is printed only when its Estimate Charge is collected, or a job card is made from it.');
            return;
        }

        const problem = openServiceEstimatePrint(this.router, estimate.PublicId);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }

    delete(row: any):
        void
    {
        this.confirmDialog.open(
            'Delete Estimate',
            `Delete ${row.NameText}? Only a Draft that is not a revision can be deleted.`,
            () =>
                this.ws.deleteEstimate(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.NameText} was deleted.`);
                        this.loadList();
                    },
                    error:error => this.failed(error, 'The estimate could not be deleted.')
                }),
            'Delete',
            'Keep',
            'danger');
    }

    restore():
        void
    {
        this.ws.restoreEstimate().subscribe(
        {
            next:result =>
            {
                this.toast.success('Restored', result?.Message ?? 'The estimate was restored.');
                this.loadList();
            },
            error:error => this.failed(error, 'The estimate could not be restored.')
        });
    }

    openHistory():
        void
    {
        this.ws
            .getHistory('workshop-management/service-estimates')
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


    //===========================================================
    // Form : load
    //===========================================================

    private loadForm():
        void
    {
        this.loading = true;
        this.cdr.detectChanges();

        const estimate$: Observable<ServiceEstimate | null> =
            this.mode === 'add' ? of(null) : this.ws.getEstimate(this.entityId);

        // the customer profiles : to pick the customer (not on a view)
        const customers$: Observable<WsCustomerOption[]> =
            this.mode === 'view' ? of([]) : this.ws.getCustomers().pipe(catchError(() => of([] as WsCustomerOption[])));

        // the observations and diagnoses to pick (not on a view; none
        // until their script was run)
        const lists$: Observable<EstimateObservationLists | null> =
            this.mode === 'view' ? of(null) : this.ws.getEstimateObservationLists().pipe(catchError(() => of(null)));

        forkJoin({ lookups:this.ws.getEstimateLookups(), estimate:estimate$, customers:customers$, lists:lists$ })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:({ lookups, estimate, customers, lists }) =>
                {
                    this.lookups = lookups;
                    this.lists = lists;
                    this.buildObservationItems();
                    this.customers = customers ?? [];

                    this.branchItems = (lookups.Branches ?? []).map(x => ({ label:x.Name, value:x.Id }));
                    this.modelItems = (lookups.Models ?? []).map(x => ({ label:[x.BrandName, x.Name].filter(v => !!v).join('  '), value:x.Id }));
                    this.customerItems = this.customers.map(x => ({ label:[x.CustomerCode, x.Name, x.Mobile].filter(v => !!v).join('  '), value:x.CustomerId }));

                    this.collectDate = (lookups.Today ?? '').substring(0, 10) || hrToText(new Date());

                    this.loading = false;

                    if (estimate)
                    {
                        // an estimate nothing can be done with is only shown
                        if (this.mode === 'edit'
                            && !estimate.CanEdit && !estimate.CanRevise && !estimate.CanCollect && !estimate.CanConvert
                            && (estimate.NextStatuses ?? []).length === 0)
                        {
                            void this.router.navigate(['../../view', estimate.PublicId], { relativeTo:this.route });
                            return;
                        }

                        this.fill(estimate, true);
                    }
                    else
                    {
                        this.estimateName = '';
                        this.estimateDate = (lookups.Today ?? '').substring(0, 10) || hrToText(new Date());
                        this.validUntil = (lookups.ValidUntil ?? '').substring(0, 10);

                        this.buildServiceItems();
                        this.loadParts();

                        if ((lookups.Branches ?? []).length === 1)
                        {
                            this.onBranch(lookups.Branches[0].Id);
                        }

                        // a new estimate starts with the default
                        // observation of Workshop Configuration
                        const first =
                            (lists?.Observations ?? []).find(x => x.IsDefault === true && x.IsActive !== false);

                        if (first)
                        {
                            this.putObservation(first);
                        }

                        this.snapshot = this.state();
                    }

                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.failed(error, 'The estimate could not be loaded.');
                }
            });
    }

    private toLine(x: ServiceEstimateLine): Line
    {
        return {
            key:this.nextKey++,
            ItemKind:x.ItemKind,
            ItemId:x.ItemId ?? null,
            ItemCode:x.ItemCode ?? '',
            ItemName:x.ItemName ?? '',
            Quantity:String(x.Quantity ?? 1),
            Rate:String(x.Rate ?? 0),
            IsFree:!!x.IsFree,
            Note:x.Note ?? ''
        };
    }

    // A saved estimate on the form
    private fill(estimate: ServiceEstimate, _saved: boolean):
        void
    {
        this.estimate = estimate;

        this.estimateName = wsEstimateName(estimate);
        this.estimateDate = (estimate.EstimateDate ?? '').substring(0, 10);
        this.validUntil = (estimate.ValidUntil ?? '').substring(0, 10);
        this.branchId = Number(estimate.BranchId) || 0;

        this.serviceVehicleId = estimate.ServiceVehicleId ?? null;
        this.chassisNo = estimate.ChassisNo ?? '';
        this.engineNo = estimate.EngineNo ?? '';
        this.registrationNo = estimate.RegistrationNo ?? '';
        this.modelId = estimate.ModelId ?? null;
        this.modelName = estimate.ModelName ?? '';
        this.brandName = estimate.BrandName ?? '';
        this.brandManagementId = estimate.BrandManagementId ?? null;
        this.colorName = estimate.ColorName ?? '';

        this.customerId = estimate.CustomerId ?? null;
        this.customerName = estimate.CustomerName ?? '';
        this.mobile = estimate.Mobile ?? '';
        this.kmReading = estimate.KmReading === null || estimate.KmReading === undefined ? '' : String(estimate.KmReading);
        this.basicRequirement = estimate.BasicRequirement ?? '';
        this.remarks = estimate.Remarks ?? '';

        this.resetSearch();
        this.customerPicked = !!this.customerId;
        this.customerBikes = [];
        this.bikeChoices = [];

        this.services = (estimate.Services ?? []).map(x => this.toLine(x));
        this.partLines = (estimate.Parts ?? []).map(x => this.toLine({ ...x, IsFree:false }));

        this.observations =
            (estimate.Observations ?? []).map(x => this.toObservation(x.WorkshopObservationId ?? null, x.Observation ?? '', x.WorkshopDiagnosisId ?? null, x.Diagnosis ?? '', x.Note ?? ''));

        this.typeModel = !this.serviceVehicleId && !this.modelId && !!this.modelName;

        this.buildServiceItems();
        this.resetPayments();
        this.loadParts();

        if (this.section === 'charge')
        {
            this.loadLedgers();
        }

        this.snapshot = this.state();
    }

    // The services the bike can get : of its brand, and the dealer's
    // own (any brand)
    private buildServiceItems():
        void
    {
        const brand = this.brandManagementId;

        this.serviceItems =
            (this.lookups?.ServiceItems ?? [])
                .filter(x => !brand || !x.BrandManagementId || x.BrandManagementId === brand)
                .map(x => ({
                    label:`${x.Code}  ${x.Name}  (${x.IsFree ? 'Free' : wsMoney(x.Rate)})`,
                    value:`${x.Kind}:${x.Id}`
                }));
    }


    //===========================================================
    // Form : the head
    //===========================================================

    // A new estimate : the number the service center would give it
    private peekNo():
        void
    {
        if (this.mode !== 'add' || !this.branchId || !this.estimateDate)
        {
            return;
        }

        this.ws.getEstimateNextNo(this.branchId, this.estimateDate).subscribe(
        {
            next:result =>
            {
                this.estimateName = result?.EstimateNo ?? '';
                this.cdr.detectChanges();
            },
            error:() =>
            {
                this.estimateName = '';
                this.cdr.detectChanges();
            }
        });
    }

    onBranch(value: any):
        void
    {
        if (this.mode !== 'add')
        {
            return;
        }

        this.branchId = Number(value) || 0;
        this.estimateName = '';
        this.peekNo();

        // the parts follow the business lines of the service center
        this.parts = null;
        this.partItems = [];
        this.loadParts();
        this.cdr.detectChanges();
    }

    onText(field: 'remarks' | 'statusNote' | 'chassisNo' | 'engineNo' | 'registrationNo' | 'colorName' | 'modelName' | 'customerName' | 'mobile' | 'kmReading' | 'basicRequirement', value: any):
        void
    {
        this[field] = String(value ?? '');
    }

    onDate(field: 'estimateDate' | 'validUntil', date: Date | null):
        void
    {
        this[field] = date ? hrToText(date) : '';

        if (field === 'estimateDate')
        {
            // the number carries the month of the date
            this.peekNo();
        }

        this.cdr.detectChanges();
    }

    onModel(value: any):
        void
    {
        this.modelId = Number(value) || null;

        const model =
            (this.lookups?.Models ?? []).find(x => x.Id === this.modelId);

        this.modelName = model?.Name ?? '';
        this.brandName = model?.BrandName ?? '';
        this.brandManagementId = model?.BrandManagementId ?? null;

        this.buildServiceItems();
        this.cdr.detectChanges();
    }

    // A customer of the customer profiles : the name and the mobile
    // come from the profile
    onCustomer(value: any):
        void
    {
        this.customerId = Number(value) || null;

        const customer =
            this.customers.find(x => x.CustomerId === this.customerId);

        if (customer)
        {
            this.customerName = customer.Name || this.customerName;
            this.mobile = customer.Mobile || this.mobile;
        }

        this.cdr.detectChanges();
    }


    //===========================================================
    // Form : the customer search (as on the sales invoice)
    //
    // Mobile or name first (registration, chassis and engine no work
    // too). The list opens while typing : Up / Down, Enter picks, Esc
    // closes. A customer comes with the bikes the service center
    // knows of him : one bike comes at once, several are listed in
    // the Bike card to choose from.
    //===========================================================

    get customerBoxText(): string
    {
        if (this.customerPicked)
        {
            return [this.customerName, this.mobile].filter(x => !!x).join('  ·  ');
        }

        return this.customerQuery;
    }

    // The customer profile of the estimate, as text
    get profileText(): string
    {
        if (!this.customerId)
        {
            return '';
        }

        const customer = this.customers.find(x => x.CustomerId === this.customerId);

        return customer
            ? [customer.CustomerCode, customer.Name].filter(x => !!x).join('  ')
            : (this.estimate?.CustomerCode || 'Linked');
    }

    private resetSearch():
        void
    {
        if (this.searchTimer)
        {
            clearTimeout(this.searchTimer);
            this.searchTimer = null;
        }

        this.searchNo++;
        this.customerQuery = '';
        this.finding = false;
        this.hits = [];
        this.hitsOpen = false;
        this.hitActive = 0;
    }

    onCustomerQuery(value: any):
        void
    {
        if (this.customerPicked)
        {
            return;
        }

        const text = String(value ?? '').substring(0, 60);

        this.customerQuery = text;

        if (this.searchTimer)
        {
            clearTimeout(this.searchTimer);
            this.searchTimer = null;
        }

        if (text.trim().length < 3)
        {
            this.searchNo++;
            this.finding = false;
            this.hits = [];
            this.hitsOpen = false;
            this.cdr.detectChanges();
            return;
        }

        this.searchTimer = setTimeout(() => this.search(text.trim()), 300);
    }

    private search(text: string):
        void
    {
        const no = ++this.searchNo;

        this.searchTimer = null;
        this.finding = true;
        this.cdr.detectChanges();

        this.ws.findBikes(text).subscribe(
        {
            next:bikes =>
            {
                if (no !== this.searchNo)
                {
                    // typed on meanwhile
                    return;
                }

                this.finding = false;
                this.hits = this.toHits(bikes ?? [], text);
                this.hitActive = 0;
                this.hitsOpen = true;
                this.cdr.detectChanges();
            },
            error:error =>
            {
                if (no !== this.searchNo)
                {
                    return;
                }

                this.finding = false;
                this.failed(error, 'The customers could not be searched.');
            }
        });
    }

    // The found bikes by customer, then the customers of the Customer
    // Profiles that match and have no bike on record
    private toHits(bikes: JobCardBike[], text: string): CustomerHit[]
    {
        const hits: CustomerHit[] = [];

        for (const bike of bikes)
        {
            const key =
                bike.CustomerId ? `c${bike.CustomerId}` : `m${(bike.Mobile || '').trim()}|${(bike.CustomerName || '').trim().toLowerCase()}`;

            let hit = hits.find(x => x.key === key);

            if (!hit)
            {
                const profile = bike.CustomerId ? this.customers.find(x => x.CustomerId === bike.CustomerId) : undefined;

                hit = { key, customerId:bike.CustomerId ?? null, name:bike.CustomerName ?? '', mobile:bike.Mobile ?? '', code:profile?.CustomerCode ?? '', bikes:[] };
                hits.push(hit);
            }

            hit.bikes.push(bike);
        }

        const low = text.toLowerCase();

        for (const customer of this.customers)
        {
            if (hits.length >= 30)
            {
                break;
            }

            if (hits.some(x => x.customerId === customer.CustomerId))
            {
                continue;
            }

            if ([customer.Mobile, customer.Name, customer.CustomerCode].some(v => (v ?? '').toLowerCase().includes(low)))
            {
                hits.push({ key:`c${customer.CustomerId}`, customerId:customer.CustomerId, name:customer.Name ?? '', mobile:customer.Mobile ?? '', code:customer.CustomerCode ?? '', bikes:[] });
            }
        }

        return hits;
    }

    hitBikes(hit: CustomerHit): string
    {
        return hit.bikes.length === 0 ? 'No bike on record' : hit.bikes.length === 1 ? '1 bike' : `${hit.bikes.length} bikes`;
    }

    hitBikeText(hit: CustomerHit): string
    {
        const bike = hit.bikes[0];

        if (!bike)
        {
            return '';
        }

        const text =
            [bike.RegistrationNo || bike.ChassisNo, [bike.BrandName, bike.ModelName].filter(x => !!x).join(' ')].filter(x => !!x).join(' · ');

        return hit.bikes.length > 1 ? `${text} ...` : text;
    }

    onHitKey(event: KeyboardEvent):
        void
    {
        if (!this.hitsOpen)
        {
            return;
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp')
        {
            event.preventDefault();

            const count = this.hits.length;

            if (count)
            {
                this.hitActive = (this.hitActive + (event.key === 'ArrowDown' ? 1 : count - 1)) % count;
                this.cdr.detectChanges();
            }
        }
        else if (event.key === 'Escape')
        {
            event.preventDefault();
            this.hitsOpen = false;
            this.cdr.detectChanges();
        }
    }

    onHitEnter():
        void
    {
        if (this.customerPicked)
        {
            return;
        }

        if (this.hitsOpen && this.hits[this.hitActive])
        {
            this.pickHit(this.hits[this.hitActive]);
            return;
        }

        const text = this.customerQuery.trim();

        if (text.length < 3)
        {
            this.toast.error('Customer', 'Type 3 letters at least : mobile or customer name, registration or chassis no.');
            return;
        }

        if (this.searchTimer)
        {
            clearTimeout(this.searchTimer);
        }

        this.search(text);
    }

    onHitBlur():
        void
    {
        // a click on a row comes first (mousedown)
        setTimeout(() =>
        {
            if (this.hitsOpen)
            {
                this.hitsOpen = false;
                this.cdr.detectChanges();
            }
        }, 150);
    }

    // The customer comes onto the estimate : with his bike when the
    // service center knows one only, with the list to choose from
    // when it knows several
    pickHit(hit: CustomerHit):
        void
    {
        this.customerId = hit.customerId;
        this.customerName = hit.name;
        this.mobile = hit.mobile;
        this.customerPicked = true;
        this.customerBikes = hit.bikes;

        this.resetSearch();

        if (hit.bikes.length === 1)
        {
            this.bikeChoices = [];
            this.pickBike(hit.bikes[0]);
            return;
        }

        // the bike of the customer before does not stay
        this.emptyBike();
        this.bikeChoices = hit.bikes;

        this.buildServiceItems();
        this.cdr.detectChanges();
    }

    // Another customer : the search opens again
    changeCustomer():
        void
    {
        this.customerPicked = false;
        this.customerId = null;
        this.customerName = '';
        this.mobile = '';
        this.customerBikes = [];
        this.bikeChoices = [];

        if (this.serviceVehicleId)
        {
            this.emptyBike();
            this.buildServiceItems();
        }

        this.resetSearch();
        this.cdr.detectChanges();
    }

    private emptyBike():
        void
    {
        this.serviceVehicleId = null;
        this.typeModel = false;
        this.chassisNo = '';
        this.engineNo = '';
        this.registrationNo = '';
        this.modelId = null;
        this.modelName = '';
        this.brandName = '';
        this.brandManagementId = null;
        this.colorName = '';
        this.kmReading = '';
    }

    // The list of the customer's bikes again
    chooseBike():
        void
    {
        this.bikeChoices = this.customerBikes;
        this.cdr.detectChanges();
    }

    // A bike of the customer the service center does not know : typed
    otherBike():
        void
    {
        this.bikeChoices = [];
        this.emptyBike();
        this.buildServiceItems();
        this.cdr.detectChanges();
    }

    bikeLine(bike: JobCardBike): string
    {
        return [bike.RegistrationNo, bike.ChassisNo, [bike.BrandName, bike.ModelName].filter(x => !!x).join(' '), bike.ColorName]
            .filter(x => !!x)
            .join('  |  ');
    }

    // The model is typed instead of chosen (and back)
    onTypeModel(typed: boolean):
        void
    {
        this.typeModel = typed;
        this.modelId = null;
        this.modelName = '';
        this.brandName = '';
        this.brandManagementId = null;

        this.buildServiceItems();
        this.cdr.detectChanges();
    }

    // The chosen bike of the customer comes onto the estimate
    pickBike(bike: JobCardBike):
        void
    {
        this.typeModel = false;
        this.serviceVehicleId = bike.ServiceVehicleId ?? null;
        this.chassisNo = bike.ChassisNo ?? '';
        this.engineNo = bike.EngineNo ?? '';
        this.registrationNo = bike.RegistrationNo ?? '';
        this.modelId = bike.ModelId ?? null;
        this.modelName = bike.ModelName ?? '';
        this.brandName = bike.BrandName ?? '';
        this.brandManagementId = bike.BrandManagementId ?? null;
        this.colorName = bike.ColorName ?? '';

        this.kmReading = bike.LastKm ? String(bike.LastKm) : '';

        this.bikeChoices = [];

        this.buildServiceItems();
        this.cdr.detectChanges();
    }

    // The bike is typed again (a bike the service center does not
    // know)
    clearBike():
        void
    {
        this.serviceVehicleId = null;
        this.typeModel = !this.modelId && !!this.modelName;
        this.cdr.detectChanges();
    }


    //===========================================================
    // Form : the lines
    //===========================================================

    // The parts the service center can put on an estimate : the
    // ones of its business lines (Business Configuration). Read
    // again when the service center changes
    private loadParts():
        void
    {
        if (this.parts !== null || !this.canEdit || !this.branchId)
        {
            return;
        }

        this.parts = [];

        const branchId = this.branchId;

        this.ws.getEstimateParts(branchId).subscribe(
        {
            next:parts =>
            {
                if (branchId !== this.branchId)
                {
                    // the service center changed meanwhile
                    return;
                }

                this.parts = parts ?? [];

                this.partItems =
                    this.parts.map(x => ({
                        label:`${x.PartNumber || x.Code}  ${x.Name}  (${x.Price === null || x.Price === undefined ? 'no price' : wsMoney(x.Price)}, stock ${x.OnHand})`,
                        value:`${x.Kind}:${x.Id}`
                    }));

                this.cdr.detectChanges();
            },
            error:error =>
            {
                this.parts = null;
                this.failed(error, 'The parts could not be loaded.');
            }
        });
    }

    //===========================================================
    // Form : the observations
    //===========================================================

    private buildObservationItems():
        void
    {
        this.observationItems =
            (this.lists?.Observations ?? []).map(x => ({ label:x.Name, value:x.WorkshopObservationId }));
    }

    // The diagnoses of an observation : its own and the ones for any
    // observation (and the saved one, when the list lost it)
    private diagnosisItems(observationId: number | null, diagnosisId: number | null, diagnosis: string): Option[]
    {
        const items: Option[] =
            (this.lists?.Diagnoses ?? [])
                .filter(x => !x.WorkshopObservationId || x.WorkshopObservationId === observationId)
                .map(x => ({ label:x.Name, value:x.WorkshopDiagnosisId }));

        if (diagnosisId && !items.some(x => x.value === diagnosisId))
        {
            items.unshift({ label:diagnosis, value:diagnosisId });
        }

        return items;
    }

    private toObservation(observationId: number | null, observation: string, diagnosisId: number | null, diagnosis: string, note: string): ObservationRow
    {
        return {
            key:this.nextKey++,
            WorkshopObservationId:observationId,
            Observation:observation,
            WorkshopDiagnosisId:diagnosisId,
            Diagnosis:diagnosis,
            Note:note,
            items:this.diagnosisItems(observationId, diagnosisId, diagnosis),
            typing:false,
            typed:''
        };
    }

    private putObservation(observation: WorkshopObservation):
        void
    {
        if (this.observations.some(x => x.WorkshopObservationId === observation.WorkshopObservationId))
        {
            this.toast.error('Observation', `${observation.Name} is already on the estimate.`);
            return;
        }

        this.observations =
            [...this.observations, this.toObservation(observation.WorkshopObservationId, observation.Name ?? '', null, '', '')];
    }

    // The picker : an observation of the list goes on the estimate
    onObservationPick(value: any):
        void
    {
        if (!value)
        {
            return;
        }

        this.observationPick = value;

        const observation =
            (this.lists?.Observations ?? []).find(x => x.WorkshopObservationId === Number(value));

        if (observation)
        {
            this.putObservation(observation);
        }

        setTimeout(() =>
        {
            this.observationPick = null;
            this.cdr.detectChanges();
        });
    }

    onNewObservation(event: Event):
        void
    {
        this.newObservation = (event.target as HTMLInputElement).value;
    }

    // Add : a new observation goes to the list of Workshop
    // Configuration and onto the estimate (page action Add
    // Observation)
    addObservation():
        void
    {
        const name = this.newObservation.trim();

        if (!this.canAddObservation || this.isSaving)
        {
            return;
        }

        if (!name)
        {
            this.toast.error('Observation', 'Type the new observation, then press Add.');
            return;
        }

        this.isSaving = true;

        this.ws.addEstimateObservation(name).subscribe(
        {
            next:observation =>
            {
                this.isSaving = false;
                this.newObservation = '';

                if (this.lists && !this.lists.Observations.some(x => x.WorkshopObservationId === observation.WorkshopObservationId))
                {
                    this.lists.Observations = [...this.lists.Observations, observation].sort((a, b) => a.Name.localeCompare(b.Name));
                    this.buildObservationItems();
                }

                this.putObservation(observation);
                this.cdr.detectChanges();
            },
            error:error =>
            {
                this.isSaving = false;
                this.failed(error, 'The observation could not be added.');
            }
        });
    }

    removeObservation(row: ObservationRow):
        void
    {
        this.observations = this.observations.filter(x => x.key !== row.key);
        this.cdr.detectChanges();
    }

    onObservationNote(row: ObservationRow, event: Event):
        void
    {
        row.Note = (event.target as HTMLInputElement).value;
        this.cdr.detectChanges();
    }

    // What was found. With the switch on, the labour and the parts
    // the diagnosis suggests come onto the estimate
    onDiagnosis(row: ObservationRow, value: any):
        void
    {
        const id = Number(value) || null;

        if (id === row.WorkshopDiagnosisId)
        {
            return;
        }

        const diagnosis =
            id ? (this.lists?.Diagnoses ?? []).find(x => x.WorkshopDiagnosisId === id) : undefined;

        row.WorkshopDiagnosisId = diagnosis ? id : null;
        row.Diagnosis = diagnosis?.Name ?? '';

        if (diagnosis && this.lists?.Suggest)
        {
            this.suggest(diagnosis);
        }

        this.cdr.detectChanges();
    }

    // The labour and the parts of a diagnosis, at their own rates;
    // what the estimate has already is left as it is
    private suggest(diagnosis: WorkshopDiagnosis):
        void
    {
        let labour = 0;
        let parts = 0;
        let missing = 0;

        for (const item of diagnosis.Items ?? [])
        {
            if (item.LineType === 'Service')
            {
                const service =
                    (this.lookups?.ServiceItems ?? []).find(x => x.Kind === item.ItemKind && x.Id === item.ItemId);

                if (!service)
                {
                    missing++;
                    continue;
                }

                if (this.services.some(x => x.ItemKind === service.Kind && x.ItemId === service.Id))
                {
                    continue;
                }

                this.services =
                    [...this.services, { key:this.nextKey++, ItemKind:service.Kind, ItemId:service.Id, ItemCode:service.Code ?? '', ItemName:service.Name ?? '', Quantity:'1', Rate:String(service.Rate ?? 0), IsFree:!!service.IsFree, Note:'' }];

                labour++;
            }
            else
            {
                const part =
                    (this.parts ?? []).find(x => x.Kind === item.ItemKind && x.Id === item.ItemId);

                if (!part)
                {
                    missing++;
                    continue;
                }

                if (this.partLines.some(x => x.ItemKind === part.Kind && x.ItemId === part.Id))
                {
                    continue;
                }

                this.partLines =
                    [...this.partLines, { key:this.nextKey++, ItemKind:part.Kind, ItemId:part.Id, ItemCode:part.PartNumber || part.Code || '', ItemName:part.Name ?? '', Quantity:String(item.Quantity || 1), Rate:String(part.Price ?? 0), IsFree:false, Note:'' }];

                parts++;
            }
        }

        if (labour + parts > 0)
        {
            this.toast.success('Diagnosis', `${diagnosis.Name} : ${labour} labour and ${parts} part line${parts === 1 ? '' : 's'} were put on the estimate (Labour & Parts).`);
        }

        if (missing > 0)
        {
            this.toast.error('Diagnosis', `${missing} suggested line${missing === 1 ? ' is' : 's are'} not in the service charts or the parts any more : add ${missing === 1 ? 'it' : 'them'} by hand.`);
        }
    }

    // A new diagnosis is typed in the row (page action Add
    // Observation)
    startDiagnosis(row: ObservationRow):
        void
    {
        row.typing = true;
        row.typed = '';
        this.cdr.detectChanges();
    }

    cancelDiagnosis(row: ObservationRow):
        void
    {
        row.typing = false;
        this.cdr.detectChanges();
    }

    onTypedDiagnosis(row: ObservationRow, event: Event):
        void
    {
        row.typed = (event.target as HTMLInputElement).value;
    }

    saveDiagnosis(row: ObservationRow):
        void
    {
        const name = row.typed.trim();

        if (!this.canAddObservation || this.isSaving)
        {
            return;
        }

        if (!name)
        {
            this.toast.error('Diagnosis', 'Type the new diagnosis.');
            return;
        }

        this.isSaving = true;

        this.ws.addEstimateDiagnosis(name, row.WorkshopObservationId).subscribe(
        {
            next:diagnosis =>
            {
                this.isSaving = false;

                if (this.lists && !this.lists.Diagnoses.some(x => x.WorkshopDiagnosisId === diagnosis.WorkshopDiagnosisId))
                {
                    this.lists.Diagnoses = [...this.lists.Diagnoses, diagnosis].sort((a, b) => a.Name.localeCompare(b.Name));
                }

                row.typing = false;
                row.typed = '';

                // every row can pick it now
                for (const x of this.observations)
                {
                    x.items = this.diagnosisItems(x.WorkshopObservationId, x.WorkshopDiagnosisId, x.Diagnosis);
                }

                this.onDiagnosis(row, diagnosis.WorkshopDiagnosisId);
                this.cdr.detectChanges();
            },
            error:error =>
            {
                this.isSaving = false;
                this.failed(error, 'The diagnosis could not be added.');
            }
        });
    }


    onSection(value: string):
        void
    {
        this.section = (value || 'lines') as Section;

        if (this.section === 'charge')
        {
            this.loadLedgers();
        }

        this.cdr.detectChanges();
    }

    // The picker : a service of the catalogue goes on a line
    onServicePick(value: any):
        void
    {
        if (!value)
        {
            return;
        }

        this.servicePick = value;
        this.section = 'lines';

        const item: WsServiceItem | undefined =
            (this.lookups?.ServiceItems ?? []).find(x => `${x.Kind}:${x.Id}` === String(value));

        if (item)
        {
            if (this.services.some(x => x.ItemKind === item.Kind && x.ItemId === item.Id))
            {
                this.toast.error('Service', `${item.Name} is already on the estimate.`);
            }
            else
            {
                this.services =
                [
                    ...this.services,
                    {
                        key:this.nextKey++,
                        ItemKind:item.Kind,
                        ItemId:item.Id,
                        ItemCode:item.Code ?? '',
                        ItemName:item.Name ?? '',
                        Quantity:'1',
                        Rate:String(item.Rate ?? 0),
                        IsFree:!!item.IsFree,
                        Note:''
                    }
                ];
            }
        }

        setTimeout(() =>
        {
            this.servicePick = null;
            this.cdr.detectChanges();
        });
    }

    //===========================================================
    // Outside Works : the work is picked from the list of Workshop
    // Configuration (never typed here). It goes on the estimate as a
    // labour line with the code of the work; the charge can be
    // changed on the line. A work that is not in the list is added
    // in Workshop Configuration (New Work goes there).
    //===========================================================

    private works:
        WorkshopOutsideWork[] = [];

    workItems:
        Option[] = [];

    workPickOpen =
        false;

    workPick:
        any = null;

    toggleWorkPick():
        void
    {
        this.workPickOpen = !this.workPickOpen;

        if (this.workPickOpen)
        {
            this.ws.getOutsideWorks('estimate').subscribe(
            {
                next:works =>
                {
                    this.works = works ?? [];

                    this.workItems =
                        this.works.map(x => ({ label:`${x.Code}  ${x.Name}${x.Rate > 0 ? `  (${wsMoney(x.Rate)})` : ''}`, value:x.WorkshopOutsideWorkId }));

                    if (this.works.length === 0)
                    {
                        this.toast.error('Outside Works', 'The list is empty : add the works in Workshop Configuration (New Work).');
                    }

                    this.cdr.detectChanges();
                },
                error:() =>
                {
                    this.workPickOpen = false;
                    this.toast.error('Outside Works', 'The list of outside works is not ready : run ServiceOperations_Outside_Works.sql and restart the API.');
                    this.cdr.detectChanges();
                }
            });
        }

        this.cdr.detectChanges();
    }

    onWorkPick(value: any):
        void
    {
        const work = this.works.find(x => x.WorkshopOutsideWorkId === Number(value));

        if (!work)
        {
            return;
        }

        if (this.services.some(x => x.ItemKind === 'Other' && x.ItemCode === work.Code))
        {
            this.toast.error('Outside Works', `${work.Name} is already on the estimate.`);
        }
        else
        {
            this.section = 'lines';

            this.services =
                [...this.services, { key:this.nextKey++, ItemKind:'Other', ItemId:null, ItemCode:work.Code, ItemName:work.Name, Quantity:'1', Rate:work.Rate > 0 ? String(work.Rate) : '', IsFree:false, Note:'' }];

            this.workPickOpen = false;
        }

        this.workPick = value;

        setTimeout(() =>
        {
            this.workPick = null;
            this.cdr.detectChanges();
        });

        this.cdr.detectChanges();
    }

    // New Work : the list is kept in Workshop Configuration
    newWork():
        void
    {
        this.confirmDialog.open(
            'Outside Works',
            'A new outside work is added in Workshop Configuration (tab Outside Works). Open it? What is not saved on this estimate will be lost.',
            () => void this.router.navigate(['/service-operations/service-setup/workshop-configuration'], { queryParams:{ tab:'outsideworks' } }),
            'Open',
            'Stay',
            'primary');
    }

    // A labour line that is not in the catalogue : name and charge
    // are typed
    addOtherService():
        void
    {
        this.section = 'lines';

        this.services =
            [...this.services, { key:this.nextKey++, ItemKind:'Other', ItemId:null, ItemCode:'', ItemName:'', Quantity:'1', Rate:'', IsFree:false, Note:'' }];

        this.cdr.detectChanges();
    }

    removeService(line: Line):
        void
    {
        this.services = this.services.filter(x => x.key !== line.key);
        this.cdr.detectChanges();
    }

    onPartPick(value: any):
        void
    {
        if (!value)
        {
            return;
        }

        this.partPick = value;
        this.section = 'lines';

        const part =
            (this.parts ?? []).find(x => `${x.Kind}:${x.Id}` === String(value));

        if (part)
        {
            if (this.partLines.some(x => x.ItemKind === part.Kind && x.ItemId === part.Id))
            {
                this.toast.error('Parts', `${part.Name} is already on the estimate : change its quantity.`);
            }
            else
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
                        Quantity:'1',
                        Rate:String(part.Price ?? 0),
                        IsFree:false,
                        Note:''
                    }
                ];
            }
        }

        setTimeout(() =>
        {
            this.partPick = null;
            this.cdr.detectChanges();
        });
    }

    addOtherPart():
        void
    {
        this.section = 'lines';

        this.partLines =
            [...this.partLines, { key:this.nextKey++, ItemKind:'Other', ItemId:null, ItemCode:'', ItemName:'', Quantity:'1', Rate:'', IsFree:false, Note:'' }];

        this.cdr.detectChanges();
    }

    removePart(line: Line):
        void
    {
        this.partLines = this.partLines.filter(x => x.key !== line.key);
        this.cdr.detectChanges();
    }

    onLine(line: Line, field: 'ItemName' | 'Quantity' | 'Rate' | 'Note', event: Event):
        void
    {
        line[field] = (event.target as HTMLInputElement).value;
        this.cdr.detectChanges();
    }


    //===========================================================
    // Save
    //===========================================================

    private body(): SaveServiceEstimate | null
    {
        if (!this.branchId)
        {
            this.toast.error('Validation', 'Choose the service center.');
            return null;
        }

        if (!this.serviceVehicleId && !this.modelId && !this.modelName.trim())
        {
            this.toast.error('Validation', 'Find the bike, or choose its model.');
            return null;
        }

        if (!this.customerName.trim() || !this.mobile.trim())
        {
            this.toast.error('Validation', 'Give the name and the mobile no of the customer.');
            return null;
        }

        const km =
            this.kmReading.trim() === '' ? null : Math.round(Number(this.kmReading));

        if (km !== null && (!Number.isFinite(km) || km < 0))
        {
            this.toast.error('Validation', 'The KM reading is not a number.');
            return null;
        }

        if (!this.estimateDate)
        {
            this.toast.error('Validation', 'Choose the date.');
            return null;
        }

        if (this.validUntil && this.validUntil < this.estimateDate)
        {
            this.toast.error('Validation', 'Valid Until cannot be before the date of the estimate.');
            return null;
        }

        const lines =
            (rows: Line[], what: string): ServiceEstimateLine[] | null =>
            {
                const result: ServiceEstimateLine[] = [];

                for (const x of rows)
                {
                    const quantity = Number(x.Quantity) || 0;
                    const rate = Number(x.Rate) || 0;

                    if (!x.ItemName.trim())
                    {
                        this.toast.error('Validation', `Give every ${what} line a name, or remove the empty line.`);
                        return null;
                    }

                    if (quantity <= 0 || rate < 0)
                    {
                        this.toast.error('Validation', `${x.ItemName} : the quantity must be more than 0 and the rate cannot be less than 0.`);
                        return null;
                    }

                    result.push({
                        ItemKind:x.ItemKind,
                        ItemId:x.ItemId,
                        ItemCode:x.ItemCode,
                        ItemName:x.ItemName.trim(),
                        Quantity:quantity,
                        Rate:rate,
                        Amount:this.amount(x),
                        IsFree:x.IsFree,
                        Note:x.Note.trim()
                    });
                }

                return result;
            };

        const services = lines(this.services, 'labour');

        if (!services)
        {
            return null;
        }

        const parts = lines(this.partLines, 'part');

        if (!parts)
        {
            return null;
        }

        if (services.length + parts.length === 0)
        {
            this.toast.error('Validation', 'Put one labour or part line on the estimate at least.');
            return null;
        }

        return {
            BranchId:this.branchId,
            EstimateDate:this.estimateDate,
            ValidUntil:this.validUntil,
            CustomerId:this.customerId,
            CustomerName:this.customerName.trim(),
            Mobile:this.mobile.trim(),
            ServiceVehicleId:this.serviceVehicleId,
            ChassisNo:this.chassisNo.trim(),
            EngineNo:this.engineNo.trim(),
            RegistrationNo:this.registrationNo.trim(),
            ModelId:this.modelId,
            ModelName:this.modelName.trim(),
            BrandName:this.brandName.trim(),
            ColorName:this.colorName.trim(),
            KmReading:km,
            BasicRequirement:this.basicRequirement.trim(),
            Remarks:this.remarks.trim(),
            Services:services,
            Parts:parts,
            Observations:
                this.observations.map(x => ({
                    WorkshopObservationId:x.WorkshopObservationId,
                    Observation:x.Observation,
                    WorkshopDiagnosisId:x.WorkshopDiagnosisId,
                    Diagnosis:x.Diagnosis,
                    Note:x.Note.trim()
                }))
        };
    }

    onSave():
        void
    {
        if (this.isSaving || this.loading || !this.canEdit)
        {
            return;
        }

        const body = this.body();

        if (!body)
        {
            return;
        }

        this.isSaving = true;

        this.progress.show(this.mode === 'edit' ? 'Updating' : 'Saving', 'Saving the estimate...');

        this.ws.saveEstimate(this.mode === 'edit' ? this.entityId : '', body).subscribe(
        {
            next:saved =>
                // the bar fills, then the page carries on
                this.progress.finish(() =>
                {
                    this.isSaving = false;
                    this.toast.success('Success', `${wsEstimateName(saved)} was saved.`);

                    if (this.mode === 'add')
                    {
                        // the saved estimate opens : it is sent and
                        // approved from there
                        void this.router.navigate(['../edit', saved.PublicId], { relativeTo:this.route });
                        return;
                    }

                    this.fill(saved, true);
                    this.cdr.detectChanges();
                }),
            error:error =>
            {
                this.progress.fail();
                this.isSaving = false;
                this.failed(error, 'The estimate could not be saved.');
            }
        });
    }


    //===========================================================
    // Status (a saved estimate)
    //===========================================================

    statusIcon(status: string): string
    {
        return status === 'Rejected' ? 'fas fa-ban'
            : status === 'Approved' ? 'fas fa-check'
            : 'fas fa-paper-plane';
    }

    changeStatus(status: string):
        void
    {
        if (!this.estimate || this.isSaving)
        {
            return;
        }

        const note = this.statusNote.trim();
        const name = wsEstimateName(this.estimate);

        if (status === 'Rejected' && !note)
        {
            this.toast.error('Reject', 'Write in the note why the customer rejected the estimate, then press Rejected again.');
            return;
        }

        const run =
            (): void =>
            {
                this.isSaving = true;

                this.ws.changeEstimateStatus(this.estimate!.PublicId, status, note).subscribe(
                {
                    next:estimate =>
                    {
                        this.isSaving = false;
                        this.statusNote = '';
                        this.fill(estimate, true);
                        this.toast.success('Status', `${name} is now ${estimate.Status}.`);
                        this.cdr.detectChanges();
                    },
                    error:error =>
                    {
                        this.isSaving = false;
                        this.failed(error, 'The status could not be changed.');
                    }
                });
            };

        if (status === 'Approved')
        {
            this.confirmDialog.open(
                'Approve Estimate',
                `The customer approved ${name}? Unsaved changes of the estimate are not included : save first.`,
                run,
                'Approved',
                'Not yet',
                'primary');
        }
        else if (status === 'Rejected')
        {
            this.confirmDialog.open('Reject Estimate', `The customer rejected ${name}?`, run, 'Rejected', 'Keep', 'danger');
        }
        else
        {
            run();
        }
    }

    // A new version : this one becomes Revised, the new Draft opens
    revise():
        void
    {
        if (!this.estimate || this.isSaving)
        {
            return;
        }

        const name = wsEstimateName(this.estimate);

        this.confirmDialog.open(
            'Revise Estimate',
            `Make a new version of ${name}? ${name} becomes Revised and cannot be used any more.`,
            () =>
            {
                this.isSaving = true;

                this.ws.reviseEstimate(this.estimate!.PublicId).subscribe(
                {
                    next:next =>
                    {
                        this.isSaving = false;
                        this.statusNote = '';
                        this.entityId = next.PublicId;
                        this.mode = 'edit';
                        this.parts = this.parts && this.parts.length > 0 ? this.parts : null;
                        this.fill(next, true);
                        this.toast.success('Revised', `${wsEstimateName(next)} is a Draft now : change it and send it again.`);
                        this.cdr.detectChanges();

                        // the address follows the new version
                        void this.router.navigate(['../../edit', next.PublicId], { relativeTo:this.route, replaceUrl:true });
                    },
                    error:error =>
                    {
                        this.isSaving = false;
                        this.failed(error, 'The estimate could not be revised.');
                    }
                });
            },
            'Revise',
            'Keep',
            'primary');
    }

    openJobCard():
        void
    {
        if (this.estimate?.JobCardPublicId)
        {
            void this.router.navigate(['../../../job-cards/edit', this.estimate.JobCardPublicId], { relativeTo:this.route });
        }
    }

    // The customer takes the service : a new job card opens with the
    // customer, the bike, the labour and the parts of this estimate.
    // The estimate becomes Converted when that job card is saved
    createJobCard():
        void
    {
        if (!this.estimate?.CanConvert || this.isSaving)
        {
            return;
        }

        const estimate = this.estimate;

        this.confirmDialog.open(
            'Create Job Card',
            `Make a job card from ${wsEstimateName(estimate)}? Unsaved changes of the estimate are not included : save first.${estimate.ChargeCollected ? ' The collected Estimate Charge comes off the service invoice.' : ''}`,
            () => void this.router.navigate(['../../../job-cards/add'], { relativeTo:this.route, queryParams:{ estimate:estimate.PublicId } }),
            'Create Job Card',
            'Not yet',
            'primary');
    }


    //===========================================================
    // The Estimate Charge : its collection
    //===========================================================

    ledgerItems(mode: string): Option[]
    {
        return this.ledgers
            .filter(x => x.CollectionAccount && x.LedgerType === mode)
            .map(x => ({ label:`${x.LedgerName}  (${x.LedgerCode})${x.Branch ? '  |  ' + x.Branch : ''}`, value:x.LedgerCode }));
    }

    // The accounts money is collected in (asked once, when the charge
    // can be collected)
    private loadLedgers():
        void
    {
        if (this.ledgersAsked || !this.estimate?.CanCollect)
        {
            return;
        }

        this.ledgersAsked = true;

        this.ws.getLedgers().subscribe(
        {
            next:ledgers =>
            {
                this.ledgers = ledgers ?? [];
                this.resetPayments();
                this.cdr.detectChanges();
            },
            error:error =>
            {
                this.ledgersAsked = false;
                this.failed(error, 'The collection accounts could not be loaded.');
            }
        });
    }

    // One Cash line of the whole charge
    private resetPayments():
        void
    {
        const cash = this.ledgerItems('Cash');
        const total = this.estimate?.ChargeTotal ?? 0;

        this.payments =
            this.estimate?.CanCollect
                ? [{ key:this.nextKey++, Mode:'Cash', LedgerCode:cash.length === 1 ? cash[0].value : '', Amount:total > 0 ? String(total) : '', TransactionRef:'' }]
                : [];
    }

    onCollectDate(date: Date | null):
        void
    {
        this.collectDate = date ? hrToText(date) : '';
        this.cdr.detectChanges();
    }

    addPayment():
        void
    {
        const cash = this.ledgerItems('Cash');

        this.payments =
            [...this.payments, { key:this.nextKey++, Mode:'Cash', LedgerCode:cash.length === 1 ? cash[0].value : '', Amount:'', TransactionRef:'' }];

        this.cdr.detectChanges();
    }

    onPayMode(line: PayLine, value: any):
        void
    {
        line.Mode = value ? String(value) : 'Cash';

        const items = this.ledgerItems(line.Mode);

        line.LedgerCode = items.length === 1 ? items[0].value : '';
        line.TransactionRef = '';

        this.cdr.detectChanges();
    }

    onPayLedger(line: PayLine, value: any):
        void
    {
        line.LedgerCode = value ? String(value) : '';
        this.cdr.detectChanges();
    }

    onPay(line: PayLine, field: 'Amount' | 'TransactionRef', event: Event):
        void
    {
        const input = event.target as HTMLInputElement;

        if (field === 'Amount')
        {
            const clean = input.value.replace(/[^0-9.]/g, '');

            if (clean !== input.value)
            {
                input.value = clean;
            }
        }

        line[field] = input.value;

        this.cdr.detectChanges();
    }

    removePayment(line: PayLine):
        void
    {
        this.payments = this.payments.filter(x => x !== line);
        this.cdr.detectChanges();
    }

    // The charge is collected : its journal and a Receipt Voucher are
    // posted, and the estimate can be printed
    collect():
        void
    {
        if (!this.estimate?.CanCollect || this.isSaving)
        {
            return;
        }

        const estimate = this.estimate;
        const name = wsEstimateName(estimate);

        if (!this.collectDate)
        {
            this.toast.error('Validation', 'Choose the date of the collection.');
            return;
        }

        if (!estimate.CustomerId)
        {
            this.toast.error('Validation', 'Pick the Customer Profile on the estimate and save it first : the charge is posted to the customer\'s ledger.');
            return;
        }

        const payments =
            this.payments
                .filter(x => (Number(x.Amount) || 0) > 0 || !!x.LedgerCode)
                .map(x => ({
                    Mode:x.Mode,
                    LedgerCode:x.LedgerCode,
                    LedgerName:this.ledgers.find(l => l.LedgerCode === x.LedgerCode)?.LedgerName ?? '',
                    Amount:Math.round((Number(x.Amount) || 0) * 100) / 100,
                    TransactionRef:x.Mode === 'MFS' ? x.TransactionRef.trim() : ''
                }));

        for (const pay of payments)
        {
            if (!pay.LedgerCode)
            {
                this.toast.error('Validation', `Choose the ${pay.Mode} account the money goes to.`);
                return;
            }

            if (pay.Amount <= 0)
            {
                this.toast.error('Validation', `${pay.Mode} : give the amount collected.`);
                return;
            }

            if (pay.Mode === 'MFS' && !pay.TransactionRef)
            {
                this.toast.error('Validation', 'MFS : give the transaction ID.');
                return;
            }
        }

        const paid =
            Math.round(payments.reduce((sum, x) => sum + x.Amount, 0) * 100) / 100;

        if (paid !== Math.round(estimate.ChargeTotal * 100) / 100)
        {
            this.toast.error('Validation', `The Estimate Charge is ${wsMoney(estimate.ChargeTotal)} : collect exactly that (the lines add up to ${wsMoney(paid)}).`);
            return;
        }

        this.confirmDialog.open(
            'Collect Estimate Charge',
            `Collect ${wsMoney(estimate.ChargeTotal)} from ${estimate.CustomerName} for ${name}? A Receipt Voucher is posted. Unsaved changes of the estimate are not included : save first.`,
            () =>
            {
                this.isSaving = true;

                this.progress.show('Collecting', 'Posting the Estimate Charge...');

                this.ws.collectEstimateCharge(estimate.PublicId, { CollectDate:this.collectDate, Payments:payments }).subscribe(
                {
                    next:saved =>
                        this.progress.finish(() =>
                        {
                            this.isSaving = false;
                            this.fill(saved, true);
                            this.toast.success('Collected', `${saved.ChargeReceiptVoucherNo || 'The Receipt Voucher'} was posted. ${name} can be printed now.`);
                            this.cdr.detectChanges();
                        }),
                    error:error =>
                    {
                        this.progress.fail();
                        this.isSaving = false;
                        this.failed(error, 'The Estimate Charge could not be collected.');
                    }
                });
            },
            'Collect',
            'Not yet',
            'primary');
    }
}
