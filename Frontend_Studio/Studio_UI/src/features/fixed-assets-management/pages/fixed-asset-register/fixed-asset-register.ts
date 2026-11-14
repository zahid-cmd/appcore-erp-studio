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
    Observable,
    forkJoin,
    of
}
from 'rxjs';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { ControlTab, ControlTabsComponent } from '../../../../shared/components/controls/control-tabs/control-tabs';
import { DropdownComponent } from '../../../../shared/components/controls/dropdown/dropdown';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { DatepickerComponent } from '../../../../shared/components/controls/datepicker/datepicker';
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ListTableActions, ListTableColumn, ListTableComponent } from '../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../human-resource-manangement/services/hr-progress.service';
import { hrToDate, hrToText } from '../../../human-resource-manangement/services/hr-date';

import
{
    FA_REPORT_PRINT_KEY,
    openFaPrint,
    saveFaReport
}
from '../../print/fa-print';

import
{
    FA_LIVE_STATUSES,
    FA_METHODS_ALL,
    FaAsset,
    FaAssetEvent,
    FaCategory,
    FaLookups,
    SaveFaAsset,
    faDay,
    faMoney,
    faNumber,
    faPeriodText,
    faRuleText,
    faStatusColor
}
from '../../shared/fa.models';

import
{
    FaService
}
from '../../shared/fa.service';


type ListRow =
    FaAsset
    &
    {
        CostText: string;
        DepreciationText: string;
        BookText: string;
        StatusColor: string;
    };

interface Choice
{
    label: string;
    value: any;
}

type TextField =
    'name' | 'brand' | 'model' | 'serial' | 'supplier' | 'purchaseRef' | 'description' | 'remarks'
    | 'qty' | 'cost' | 'residual' | 'rate' | 'life' | 'opening';

type ChoiceField =
    'locationId' | 'custodianId' | 'upToMonth' | 'upToYear';

const MONTHS =
    ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const number2 =
    (value: any): number => Number(String(value ?? '').replace(/,/g, '').trim()) || 0;

const round2 =
    (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

// '2026-11-14' : 202611 (0 for no date)
const periodOf =
    (date: string): number => /^\d{4}-\d{2}/.test(date ?? '') ? Number(date.substring(0, 4)) * 100 + Number(date.substring(5, 7)) : 0;

const isLive =
    (status: string): boolean => FA_LIVE_STATUSES.includes(status);

// The value is in the list, even when it is no longer active
function withChoice(items: Choice[], value: any, label: string): Choice[]
{
    return !value || items.some(x => x.value === value) ? items : [...items, { label:label || String(value), value }];
}


//===============================================================
// Fixed Asset Register (Fixed Assets > Asset Register)
//
// The asset cards. A card is made by an Asset Acquisition or on
// Opening Assets, never here. A card can be changed : what it is
// and where it is always; its cost, dates and rule only while no
// depreciation run or movement has used them.
//
//   list / edit/:id / view/:id   (one component)
//===============================================================

@Component(
{
    selector:'fixed-asset-register',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        DropdownComponent,
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
    templateUrl:'./fixed-asset-register.html',
    styleUrl:'./fixed-asset-register.css'
})
export class FixedAssetRegisterPage
implements OnInit
{
    private readonly service = inject(FaService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    mode:
        'list' | 'edit' | 'view' = 'list';

    loading =
        false;

    loadFailed =
        false;

    isSaving =
        false;

    readonly asDate = hrToDate;

    readonly subtitle =
        'The asset cards : what the company owns, where it is, its cost and its book value';

    readonly lockedNote =
        'Fixed : the card was depreciated or moved';

    money(value: number): string
    {
        return faMoney(value);
    }

    day(value: string): string
    {
        return faDay(value);
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

    private all:
        ListRow[] = [];

    // What the tab, the filters and the search leave (every page)
    private matched:
        ListRow[] = [];

    rows:
        ListRow[] = [];

    searchText =
        '';

    currentPage =
        1;

    pageSize =
        10;

    totalRecords =
        0;

    readonly tabs:
        ControlTab[] =
    [
        { id:'all', label:'All Assets' },
        { id:'inuse', label:'In Use' },
        { id:'idle', label:'Idle or Under Repair' },
        { id:'disposed', label:'Disposed' }
    ];

    selectedTab =
        'all';

    branchFilter =
        0;

    categoryFilter =
        0;

    branchFilterItems:
        Choice[] = [{ label:'All Branches', value:0 }];

    categoryFilterItems:
        Choice[] = [{ label:'All Asset Groups', value:0 }];

    summaryItems:
        { label: string; value: string }[] = [];

    historyOpened =
        false;

    historyItems:
        any[] = [];

    // No delete : a card leaves by a disposal
    readonly listActions:
        ListTableActions =
    {
        view:true,
        edit:true,
        delete:false
    };

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Asset No', field:'AssetNo', width:'115px', align:'center' },
        { header:'Asset', field:'Name', width:'200px', align:'left' },
        { header:'Asset Group', field:'CategoryName', width:'150px', align:'left' },
        { header:'Branch', field:'BranchName', width:'140px', align:'left', priority:2 },
        { header:'Location', field:'LocationName', width:'140px', align:'left', priority:3 },
        { header:'Custodian', field:'CustodianName', width:'160px', align:'left', priority:3 },
        { header:'Cost', field:'CostText', width:'120px', align:'right' },
        { header:'Depreciation', field:'DepreciationText', width:'120px', align:'right' },
        { header:'Book Value', field:'BookText', width:'120px', align:'right' },
        { header:'Status', field:'Status', width:'115px', align:'left', dotField:'StatusColor' },
        { header:'Actions', field:'actions', type:'actions', width:'100px', align:'center' }
    ];

    //===========================================================
    // The card (view / edit)
    //===========================================================

    entityId =
        '';

    lookups:
        FaLookups | null = null;

    card:
        FaAsset | null = null;

    name =
        '';

    categoryId =
        0;

    branchId =
        0;

    locationId =
        0;

    custodianId =
        0;

    status =
        'In Use';

    brand =
        '';

    model =
        '';

    serial =
        '';

    supplier =
        '';

    purchaseRef =
        '';

    description =
        '';

    remarks =
        '';

    purchaseDate =
        '';

    useDate =
        '';

    qty =
        '1';

    cost =
        '';

    residual =
        '';

    method =
        'StraightLine';

    rate =
        '';

    life =
        '';

    // The depreciation to date of an opening card
    opening =
        '';

    // Depreciated up to : the month and the year (0 = none)
    upToMonth =
        0;

    upToYear =
        0;

    readonly methodItems = FA_METHODS_ALL;

    readonly statusItems:
        Choice[] = FA_LIVE_STATUSES.map(x => ({ label:x, value:x }));

    readonly monthItems:
        Choice[] =
    [
        { label:'None', value:0 },
        ...MONTHS.map((label, i) => ({ label, value:i + 1 }))
    ];

    yearItems:
        Choice[] = [{ label:'None', value:0 }];

    branchItems:
        Choice[] = [];

    categoryItems:
        Choice[] = [];

    locationItems:
        Choice[] = [];

    custodianItems:
        Choice[] = [];

    get pageTitle(): string
    {
        return this.mode === 'edit' ? 'Update Asset' : this.mode === 'view' ? 'View Asset' : 'Fixed Asset Register';
    }

    get canEdit(): boolean
    {
        return !!this.card && isLive(this.card.Status);
    }

    // cost, dates, quantity, depreciation to date : not after a run or a movement
    get moneyLocked(): boolean
    {
        return !this.card?.CanEditMoney;
    }

    get ruleLocked(): boolean
    {
        return !this.card?.CanEditRule;
    }

    // The asset group is never depreciated (land ...) : so is the card
    get groupIsNone(): boolean
    {
        return this.category?.Method === 'None';
    }

    get noDepreciation(): boolean
    {
        return this.method === 'None';
    }

    get history(): FaAssetEvent[]
    {
        return this.card?.History ?? [];
    }

    // How far the card is depreciated (0 to 100) : of what can be
    // depreciated, the cost less the residual value
    get depreciatedPercent(): number
    {
        const card = this.card;

        if (!card)
        {
            return 0;
        }

        const base = (Number(card.TotalCost) || 0) - (Number(card.ResidualValue) || 0);

        if (base <= 0)
        {
            return 0;
        }

        return Math.max(0, Math.min(100, Math.round((Number(card.AccumulatedDepreciation) || 0) / base * 100)));
    }

    // The icon of a line of the history
    kindIcon(kind: string): string
    {
        switch (kind)
        {
            case 'Acquired': return 'fa-cart-plus';
            case 'Opening': return 'fa-box-open';
            case 'Depreciation': return 'fa-chart-line';
            case 'Disposal': return 'fa-box-archive';
            default: return 'fa-circle';
        }
    }

    get ruleText(): string
    {
        return this.card ? faRuleText(this.card.Method, this.card.RatePercent, this.card.LifeYears) : '';
    }

    get sourceText(): string
    {
        const card = this.card;

        return !card ? '' : card.Source === 'Acquisition' && card.AcquisitionCode ? `Acquisition ${card.AcquisitionCode}` : card.Source;
    }

    get quantityText(): string
    {
        return faNumber(this.card?.Quantity ?? 0);
    }

    get chargeText(): string
    {
        const card = this.card;

        return !card ? ''
            : !isLive(card.Status) ? '-'
            : card.Method === 'None' ? 'No depreciation'
            : card.MonthlyCharge > 0 ? `Tk ${faMoney(card.MonthlyCharge)}`
            : 'Fully depreciated';
    }

    // brand / model / serial, in one text
    get makeText(): string
    {
        const card = this.card;

        return !card ? '' : [card.Brand, card.Model, card.SerialNo ? `S/N ${card.SerialNo}` : ''].filter(x => !!x).join(' · ') || '-';
    }

    private get category(): FaCategory | undefined
    {
        return (this.lookups?.Categories ?? []).find(x => x.FaCategoryId === this.categoryId);
    }

    // yyyymm (0 : none)
    get upToPeriod(): number
    {
        return this.upToMonth && this.upToYear ? this.upToYear * 100 + this.upToMonth : 0;
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
            url.includes('/view/') ? 'view' : url.includes('/edit/') ? 'edit' : 'list';

        this.entityId =
            this.route.snapshot.paramMap.get('id') ?? '';

        // No add here : the cards come from Asset Acquisitions and Opening Assets
        if (url.endsWith('/add') || url.includes('/add?'))
        {
            void this.router.navigate(['../list'], { relativeTo:this.route });
            return;
        }

        if (this.mode === 'list')
        {
            this.loadList();
        }
        else
        {
            this.loadCard();
        }
    }

    private failed(error: any, fallback: string):
        void
    {
        this.loading = false;
        this.loadFailed = true;
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

        this.service
            .getAssets()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        (rows ?? []).map(x => ({
                            ...x,
                            CostText:faMoney(x.TotalCost),
                            DepreciationText:faMoney(x.AccumulatedDepreciation),
                            BookText:faMoney(x.BookValue),
                            StatusColor:faStatusColor(x.Status)
                        }));

                    const choices =
                        (first: string, pairs: [number, string][]): Choice[] =>
                        [
                            { label:first, value:0 },
                            ...[...new Map(pairs).entries()]
                                .map(([value, label]) => ({ label:label || `#${value}`, value }))
                                .sort((a, b) => a.label.localeCompare(b.label))
                        ];

                    this.branchFilterItems =
                        choices('All Branches', this.all.map(x => [x.BranchId, x.BranchName] as [number, string]));

                    this.categoryFilterItems =
                        choices('All Asset Groups', this.all.map(x => [x.FaCategoryId, x.CategoryName] as [number, string]));

                    this.loading = false;
                    this.apply();
                },
                error:error => this.failed(error, 'The asset cards could not be loaded.')
            });
    }

    private inTab(row: FaAsset): boolean
    {
        return this.selectedTab === 'inuse' ? row.Status === 'In Use'
            : this.selectedTab === 'idle' ? row.Status === 'Idle' || row.Status === 'Under Repair'
            : this.selectedTab === 'disposed' ? !isLive(row.Status)
            : true;
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const matched =
            this.all.filter(x =>
                this.inTab(x)
                &&
                (!this.branchFilter || x.BranchId === this.branchFilter)
                &&
                (!this.categoryFilter || x.FaCategoryId === this.categoryFilter)
                &&
                (!find || [x.AssetNo, x.Name, x.CategoryName, x.BranchName, x.LocationName, x.CustodianName, x.SerialNo, x.Status]
                    .some(v => (v ?? '').toLowerCase().includes(find))));

        this.matched = matched;

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        this.summaryItems =
        [
            { label:'Cards', value:matched.length.toLocaleString('en-US') },
            { label:'Cost', value:`Tk ${faMoney(this.sum(x => x.TotalCost))}` },
            { label:'Depreciation', value:`Tk ${faMoney(this.sum(x => x.AccumulatedDepreciation))}` },
            { label:'Book Value', value:`Tk ${faMoney(this.sum(x => x.BookValue))}` }
        ];

        this.cdr.detectChanges();
    }

    private sum(pick: (row: ListRow) => number): number
    {
        return this.matched.reduce((total, x) => total + (Number(pick(x)) || 0), 0);
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;
        this.apply();
    }

    onTab(value: string):
        void
    {
        this.selectedTab = value || 'all';
        this.currentPage = 1;
        this.apply();
    }

    onBranchFilter(value: any):
        void
    {
        this.branchFilter = Number(value) || 0;
        this.currentPage = 1;
        this.apply();
    }

    onCategoryFilter(value: any):
        void
    {
        this.categoryFilter = Number(value) || 0;
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
        // By asset no
    }

    view(row: FaAsset):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    edit(row: FaAsset):
        void
    {
        if (!isLive(row.Status))
        {
            this.toast.info('Fixed Asset Register', `${row.AssetNo} is ${row.Status} : it can only be viewed.`);
            this.view(row);
            return;
        }

        void this.router.navigate(['../edit', row.PublicId], { relativeTo:this.route });
    }

    editCard():
        void
    {
        if (this.card && this.canEdit)
        {
            void this.router.navigate(['../../edit', this.card.PublicId], { relativeTo:this.route });
        }
    }

    goToList():
        void
    {
        void this.router.navigate(['../../list'], { relativeTo:this.route });
    }

    openHistory():
        void
    {
        this.service
            .getHistory('asset-register/fixed-asset-register')
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

    // The filtered cards, every page of them (Print Engine)
    printList():
        void
    {
        const rows = this.matched;

        if (rows.length === 0)
        {
            this.toast.info('Print', 'There is no asset card to print.');
            return;
        }

        const branch =
            this.branchFilterItems.find(x => x.value === this.branchFilter)?.label ?? 'All Branches';

        const category =
            this.categoryFilterItems.find(x => x.value === this.categoryFilter)?.label ?? 'All Asset Groups';

        const tab =
            this.tabs.find(x => x.id === this.selectedTab)?.label ?? 'All Assets';

        const token =
            saveFaReport(
            {
                title:'Fixed Asset Register',
                subtitle:`${tab} · ${branch} · ${category}`,
                meta:
                [
                    { label:'Search', value:this.searchText.trim() }
                ].filter(x => !!x.value),
                band:
                [
                    { label:'Cards', value:String(rows.length) },
                    { label:'Cost', value:`Tk ${faMoney(this.sum(x => x.TotalCost))}` },
                    { label:'Depreciation', value:`Tk ${faMoney(this.sum(x => x.AccumulatedDepreciation))}` },
                    { label:'Book Value', value:`Tk ${faMoney(this.sum(x => x.BookValue))}` }
                ],
                columns:
                [
                    { header:'Asset No', kind:'text' },
                    { header:'Asset', kind:'text' },
                    { header:'Asset Group', kind:'text' },
                    { header:'Branch', kind:'text' },
                    { header:'Location', kind:'text' },
                    { header:'Custodian', kind:'text' },
                    { header:'Cost', kind:'money' },
                    { header:'Depreciation', kind:'money' },
                    { header:'Book Value', kind:'money', strong:true },
                    { header:'Status', kind:'text' }
                ],
                rows:rows.map(x =>
                [
                    x.AssetNo,
                    x.Name,
                    x.CategoryName,
                    x.BranchName,
                    x.LocationName ?? '',
                    x.CustodianName ?? '',
                    x.CostText,
                    x.DepreciationText,
                    x.BookText,
                    x.Status
                ]),
                footer:
                [
                    '',
                    `Total (${rows.length})`,
                    '',
                    '',
                    '',
                    '',
                    faMoney(this.sum(x => x.TotalCost)),
                    faMoney(this.sum(x => x.AccumulatedDepreciation)),
                    faMoney(this.sum(x => x.BookValue)),
                    ''
                ],
                landscape:true
            });

        const problem =
            openFaPrint(this.router, FA_REPORT_PRINT_KEY, token, 'Fixed Asset Register', true);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }

    //===========================================================
    // The card : load
    //===========================================================

    private loadCard():
        void
    {
        this.loading = true;
        this.cdr.detectChanges();

        const lookups$: Observable<FaLookups | null> =
            this.mode === 'edit' ? this.service.getLookups() : of(null);

        forkJoin([lookups$, this.service.getAsset(this.entityId)])
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:([lookups, card]) =>
                {
                    if (this.mode === 'edit' && !isLive(card.Status))
                    {
                        this.toast.info('Fixed Asset Register', `${card.AssetNo} is ${card.Status} : it can only be viewed.`);
                        void this.router.navigate(['../../view', this.entityId], { relativeTo:this.route });
                        return;
                    }

                    this.card = card;

                    if (lookups)
                    {
                        this.lookups = lookups;
                        this.fill(lookups, card);
                    }

                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The asset card could not be loaded.')
            });
    }

    // The form, from the card
    private fill(lookups: FaLookups, card: FaAsset):
        void
    {
        const today =
            (lookups.Today ?? '').substring(0, 10) || hrToText(new Date());

        const thisYear =
            Number(today.substring(0, 4));

        this.name = card.Name ?? '';
        this.categoryId = card.FaCategoryId;
        this.branchId = card.BranchId;
        this.locationId = card.FaLocationId || 0;
        this.custodianId = card.CustodianEmployeeId || 0;
        this.status = card.Status;
        this.brand = card.Brand ?? '';
        this.model = card.Model ?? '';
        this.serial = card.SerialNo ?? '';
        this.supplier = card.SupplierName ?? '';
        this.purchaseRef = card.PurchaseRef ?? '';
        this.description = card.Description ?? '';
        this.remarks = card.Remarks ?? '';
        this.purchaseDate = (card.PurchaseDate ?? '').substring(0, 10);
        this.useDate = (card.UseDate ?? '').substring(0, 10);
        this.qty = String(card.Quantity ?? 1);
        this.cost = String(card.Cost ?? '');
        this.residual = String(card.ResidualValue ?? '');
        this.method = card.Method || 'StraightLine';
        this.rate = String(card.RatePercent ?? '');
        this.life = String(card.LifeYears ?? '');
        this.opening = String(card.OpeningAccumulated ?? '');

        const upTo = card.LastRunPeriod || 0;

        this.upToYear = Math.floor(upTo / 100);
        this.upToMonth = upTo % 100;

        this.yearItems =
            withChoice(
                [
                    { label:'None', value:0 },
                    ...Array.from({ length:61 }, (_, i) => ({ label:String(thisYear - i), value:thisYear - i }))
                ],
                this.upToYear,
                String(this.upToYear));

        this.branchItems =
            withChoice((lookups.Branches ?? []).map(x => ({ label:x.Name, value:x.Id })), card.BranchId, card.BranchName);

        this.categoryItems =
            withChoice((lookups.Categories ?? []).map(x => ({ label:x.Name, value:x.FaCategoryId })), card.FaCategoryId, card.CategoryName);

        this.applyNoDepreciation();

        this.custodianItems =
            withChoice(
                [
                    { label:'None', value:0 },
                    ...(lookups.Employees ?? []).map(x => ({ label:`${x.Code}  ${x.Name}`, value:x.Id }))
                ],
                card.CustodianEmployeeId,
                card.CustodianName);

        this.setLocations();

        this.locationItems = withChoice(this.locationItems, card.FaLocationId, card.LocationName);
        this.locationId = card.FaLocationId || 0;
    }

    // The locations of the branch of the card only
    private setLocations():
        void
    {
        const own =
            (this.lookups?.Locations ?? []).filter(x => x.BranchId === this.branchId);

        this.locationItems =
        [
            { label:'None', value:0 },
            ...own.map(x => ({ label:x.Name, value:x.Id }))
        ];

        if (this.locationId && !own.some(x => x.Id === this.locationId))
        {
            this.locationId = 0;
        }
    }

    //===========================================================
    // Edit : what is typed
    //===========================================================

    onText(field: TextField, value: any):
        void
    {
        this[field] = String(value ?? '');
    }

    onChoice(field: ChoiceField, value: any):
        void
    {
        this[field] = Number(value) || 0;

        // a month without a year : this year
        if (field === 'upToMonth' && this.upToMonth && !this.upToYear)
        {
            this.upToYear = Number(this.yearItems[1]?.value) || 0;
        }

        this.cdr.detectChanges();
    }

    onStatus(value: any):
        void
    {
        this.status = String(value ?? '') || 'In Use';
        this.cdr.detectChanges();
    }

    onMethod(value: any):
        void
    {
        this.method = String(value ?? '') || 'StraightLine';
        this.applyNoDepreciation();
        this.cdr.detectChanges();
    }

    // No depreciation : no rate, life or residual value
    private applyNoDepreciation():
        void
    {
        if (this.ruleLocked)
        {
            return;
        }

        if (this.groupIsNone)
        {
            this.method = 'None';
        }

        if (this.method === 'None')
        {
            this.rate = '';
            this.life = '';

            if (!this.moneyLocked)
            {
                this.residual = '';
            }
        }
    }

    // Another asset group : its rule, when the rule may still change
    onCategory(value: any):
        void
    {
        this.categoryId = Number(value) || 0;

        const category = this.category;

        if (category && !this.ruleLocked)
        {
            this.method = category.Method || 'StraightLine';
            this.rate = String(category.RatePercent ?? '');
            this.life = String(category.LifeYears ?? '');
        }

        this.applyNoDepreciation();

        this.cdr.detectChanges();
    }

    onBranch(value: any):
        void
    {
        this.branchId = Number(value) || 0;
        this.setLocations();
        this.cdr.detectChanges();
    }

    onDate(field: 'purchaseDate' | 'useDate', date: Date | null):
        void
    {
        this[field] = hrToText(date);
        this.cdr.detectChanges();
    }

    //===========================================================
    // Edit : save
    //===========================================================

    private validate(): string
    {
        const configuration = this.lookups?.Configuration;

        if (!this.name.trim())
        {
            return 'Write the name of the asset.';
        }

        if (configuration?.RequireLocation && !this.locationId)
        {
            return 'Pick the location.';
        }

        if (configuration?.RequireCustodian && !this.custodianId)
        {
            return 'Pick the custodian.';
        }

        const cost = number2(this.cost);

        const residual = number2(this.residual);

        const rate = number2(this.rate);

        const life = number2(this.life);

        if (!this.moneyLocked)
        {
            const category = this.category;

            const qty = number2(this.qty);

            const opening = number2(this.opening);

            if (!this.categoryId)
            {
                return 'Pick the asset group.';
            }

            if (!this.branchId)
            {
                return 'Pick the branch.';
            }

            if (!this.purchaseDate)
            {
                return 'Purchase Date is required.';
            }

            const today = (this.lookups?.Today ?? '').substring(0, 10) || hrToText(new Date());

            const useDate = this.useDate || this.purchaseDate;

            if (useDate < this.purchaseDate)
            {
                return 'Put to Use cannot be before the purchase date.';
            }

            if (!(qty > 0))
            {
                return 'The quantity must be more than 0.';
            }

            if (qty > 1 && category && !category.AllowGroupCard)
            {
                return `${category.Name} does not allow one card for many items : the quantity must be 1.`;
            }

            if (!(cost > 0))
            {
                return 'The cost must be more than 0.';
            }

            if (residual < 0 || residual >= cost)
            {
                return 'The residual value must be less than the cost.';
            }

            if (opening < 0 || opening > cost)
            {
                return 'The depreciation to date cannot be more than the cost.';
            }

            const upTo = this.upToPeriod;

            if ((this.upToMonth || this.upToYear) && !upTo)
            {
                return 'Depreciated Up To : pick both the month and the year.';
            }

            if (opening > 0 && !upTo)
            {
                return 'Depreciated Up To is required when there is a depreciation to date.';
            }

            if (upTo && (upTo < periodOf(useDate) || upTo > periodOf(today)))
            {
                return `Depreciated Up To must be between ${faPeriodText(periodOf(useDate))} (put to use) and ${faPeriodText(periodOf(today))} (this month).`;
            }
        }

        if (!this.ruleLocked && !this.noDepreciation)
        {
            if (rate < 0 || rate > 100)
            {
                return 'The rate must be between 0 and 100 % a year.';
            }

            if (life < 0 || !Number.isInteger(life))
            {
                return 'The life must be a whole number of years.';
            }

            if (this.method === 'ReducingBalance' && !(rate > 0))
            {
                return 'Reducing balance needs a rate % a year.';
            }

            if (this.method !== 'ReducingBalance' && !(life > 0) && !(rate > 0))
            {
                return 'Straight line needs a life in years, or a rate % a year.';
            }
        }

        return '';
    }

    // The whole card : the server ignores what may not change
    private body(card: FaAsset): SaveFaAsset
    {
        const money = !this.moneyLocked;

        const rule = !this.ruleLocked;

        return {
            Name:this.name.trim(),
            FaCategoryId:money ? this.categoryId : card.FaCategoryId,
            Description:this.description.trim(),
            Brand:this.brand.trim(),
            Model:this.model.trim(),
            SerialNo:this.serial.trim(),
            BranchId:money ? this.branchId : card.BranchId,
            FaLocationId:this.locationId,
            CustodianEmployeeId:this.custodianId,
            SupplierName:this.supplier.trim(),
            PurchaseRef:this.purchaseRef.trim(),
            PurchaseDate:money ? this.purchaseDate : card.PurchaseDate,
            UseDate:money ? (this.useDate || this.purchaseDate) : card.UseDate,
            Quantity:money ? (number2(this.qty) || 1) : card.Quantity,
            Cost:money ? round2(number2(this.cost)) : card.Cost,
            ResidualValue:money ? (this.noDepreciation ? 0 : round2(number2(this.residual))) : card.ResidualValue,
            Method:rule ? this.method : card.Method,
            RatePercent:rule ? (this.noDepreciation ? 0 : number2(this.rate)) : card.RatePercent,
            LifeYears:rule ? (this.noDepreciation ? 0 : number2(this.life)) : card.LifeYears,
            OpeningAccumulated:money ? round2(number2(this.opening)) : card.OpeningAccumulated,
            DepreciatedUpTo:money ? this.upToPeriod : (card.LastRunPeriod || 0),
            Status:this.status,
            Remarks:this.remarks.trim()
        };
    }

    onSave():
        void
    {
        const card = this.card;

        if (this.isSaving || this.mode !== 'edit' || this.loading || !card || !this.lookups)
        {
            return;
        }

        const problem =
            this.validate();

        if (problem)
        {
            this.toast.error('Validation', problem);
            return;
        }

        this.isSaving = true;

        this.progressDialog.show('Saving', 'Saving the asset card...', false);

        this.service.updateAsset(card.PublicId, this.body(card)).subscribe(
        {
            next:() =>
                this.progressDialog.finish(() =>
                {
                    this.isSaving = false;
                    this.toast.success('Success', `${card.AssetNo} was updated.`);
                    this.goToList();
                }),
            error:error =>
            {
                this.progressDialog.fail();
                this.isSaving = false;
                this.toast.error('Error', error?.error?.message ?? 'The asset card could not be saved.');
                this.cdr.detectChanges();
            }
        });
    }

    //===========================================================
    // View : print the card with its history (Print Engine)
    //===========================================================

    printCard():
        void
    {
        const card = this.card;

        if (!card)
        {
            return;
        }

        const events = this.history;

        const token =
            saveFaReport(
            {
                title:'Asset Card',
                subtitle:`${card.AssetNo} · ${card.Name}`,
                meta:
                [
                    { label:'Asset Group', value:card.CategoryName },
                    { label:'Branch', value:card.BranchName },
                    { label:'Location', value:card.LocationName },
                    { label:'Custodian', value:card.CustodianName },
                    { label:'Brand / Model / Serial', value:this.makeText === '-' ? '' : this.makeText },
                    { label:'Supplier', value:card.SupplierName },
                    { label:'Purchase Reference', value:card.PurchaseRef },
                    { label:'Purchase Date', value:faDay(card.PurchaseDate) },
                    { label:'Put to Use', value:faDay(card.UseDate) },
                    { label:'Quantity', value:faNumber(card.Quantity) },
                    { label:'Source', value:this.sourceText },
                    { label:'Rule', value:this.ruleText },
                    { label:'Residual Value', value:`Tk ${faMoney(card.ResidualValue)}` },
                    { label:'Depreciated Up To', value:card.LastRunText || 'Not yet' },
                    { label:'Next Month', value:this.chargeText },
                    { label:'Status', value:card.Status }
                ].filter(x => !!x.value),
                band:
                [
                    { label:'Total Cost', value:`Tk ${faMoney(card.TotalCost)}` },
                    { label:'Depreciation', value:`Tk ${faMoney(card.AccumulatedDepreciation)}` },
                    { label:'Book Value', value:`Tk ${faMoney(card.BookValue)}` }
                ],
                columns:
                [
                    { header:'Date', kind:'center' },
                    { header:'What', kind:'text' },
                    { header:'Document', kind:'text' },
                    { header:'Details', kind:'text' },
                    { header:'Amount', kind:'money', strong:true }
                ],
                rows:events.map(x =>
                [
                    faDay(x.Date),
                    x.Kind,
                    x.Code ?? '',
                    x.Text ?? '',
                    x.Amount ? faMoney(x.Amount) : ''
                ]),
                footer:null,
                note:[card.Description, card.Remarks].filter(x => !!x).join('  |  ')
            });

        const problem =
            openFaPrint(this.router, FA_REPORT_PRINT_KEY, token, `${card.AssetNo} Asset Card`);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }
}
