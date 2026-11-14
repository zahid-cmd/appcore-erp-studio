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
import { DropdownComponent } from '../../../../shared/components/controls/dropdown/dropdown';
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

import
{
    FA_METHODS_ALL,
    FaAsset,
    FaCategory,
    FaLookups,
    SaveFaAsset,
    faDay,
    faMoney,
    faPeriodText,
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
        PurchaseText: string;
        CostText: string;
        OpeningText: string;
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
    | 'qty' | 'cost' | 'rate' | 'life' | 'opening';

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

// The value is in the list, even when it is no longer active
function withChoice(items: Choice[], value: any, label: string): Choice[]
{
    return !value || items.some(x => x.value === value) ? items : [...items, { label:label || String(value), value }];
}


//===============================================================
// Opening Assets (Fixed Assets > Asset Register)
//
// The assets owned before the module : the card with its cost and
// the depreciation to date. Nothing is posted : both are in the
// ledgers already. The depreciation runs continue from the month
// after "Depreciated Up To".
//
//   list / add / edit/:id / view/:id   (one component)
//===============================================================

@Component(
{
    selector:'opening-assets',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
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
    templateUrl:'./opening-assets.html',
    styleUrl:'./opening-assets.css'
})
export class OpeningAssetsPage
implements OnInit
{
    private readonly service = inject(FaService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    mode:
        'list' | 'add' | 'edit' | 'view' = 'list';

    loading =
        false;

    loadFailed =
        false;

    isSaving =
        false;

    readonly asDate = hrToDate;

    readonly subtitle =
        'The assets owned before the module : saving writes the Journal Voucher that puts them in the ledgers';

    readonly lockedNote =
        'Fixed : the card was depreciated or moved';

    money(value: number): string
    {
        return faMoney(value);
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

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Asset No', field:'AssetNo', width:'120px', align:'center' },
        { header:'Asset', field:'Name', width:'220px', align:'left' },
        { header:'Asset Group', field:'CategoryName', width:'160px', align:'left' },
        { header:'Branch', field:'BranchName', width:'160px', align:'left' },
        { header:'Purchase Date', field:'PurchaseText', width:'120px', align:'center' },
        { header:'Cost', field:'CostText', width:'130px', align:'right' },
        { header:'Depreciation to Date', field:'OpeningText', width:'160px', align:'right' },
        { header:'Book Value', field:'BookText', width:'130px', align:'right' },
        { header:'Status', field:'Status', width:'115px', align:'left', dotField:'StatusColor' },
        { header:'Actions', field:'actions', type:'actions', width:'120px', align:'center' }
    ];

    //===========================================================
    // Form
    //===========================================================

    entityId =
        '';

    lookups:
        FaLookups | null = null;

    // The card as it was loaded (edit / view)
    card:
        FaAsset | null = null;

    assetNo =
        '';

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

    // The depreciation to date
    opening =
        '';

    // Depreciated up to : the month and the year (0 = none)
    upToMonth =
        0;

    upToYear =
        0;

    // The residual value was typed : the asset group no longer fills it
    private residualTyped =
        false;

    // Put to Use was picked : it no longer follows the purchase date
    private useDatePicked =
        false;

    readonly methodItems = FA_METHODS_ALL;

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

    get isViewMode(): boolean
    {
        return this.mode === 'view';
    }

    // cost, dates, quantity, depreciation to date : not after a run or a movement
    get moneyLocked(): boolean
    {
        return this.isViewMode || (this.mode === 'edit' && !this.card?.CanEditMoney);
    }

    get ruleLocked(): boolean
    {
        return this.isViewMode
            || this.groupIsNone
            || !this.lookups?.Configuration?.AllowAssetRule
            || (this.mode === 'edit' && !this.card?.CanEditRule);
    }

    // The asset group is never depreciated (land ...) : so is the card
    get groupIsNone(): boolean
    {
        return this.category?.Method === 'None';
    }

    get noDepreciation(): boolean
    {
        return this.groupIsNone || this.method === 'None';
    }

    // The note under a card whose money fields can no longer change
    get showMoneyNote(): boolean
    {
        return this.mode === 'edit' && !!this.card && !this.card.CanEditMoney;
    }

    get ruleNote(): string
    {
        return this.isViewMode ? ''
            : this.groupIsNone ? 'This asset group is never depreciated : the card has no depreciation.'
            : this.mode === 'edit' && !!this.card && !this.card.CanEditRule ? this.lockedNote
            : !this.lookups?.Configuration?.AllowAssetRule ? 'The method, rate and life come from the asset group.'
            : '';
    }

    get pageTitle(): string
    {
        return this.mode === 'add' ? 'Add Opening Asset'
            : this.mode === 'edit' ? 'Update Opening Asset'
            : this.mode === 'view' ? 'View Opening Asset'
            : 'Opening Assets';
    }

    get saveText(): string
    {
        return this.mode === 'edit' ? 'Update' : 'Save';
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

    get bookValue(): number
    {
        return round2(number2(this.cost) - number2(this.opening));
    }

    // The charge of a month after the opening
    get monthlyCharge(): number
    {
        if (this.noDepreciation)
        {
            return 0;
        }

        const cost = number2(this.cost);

        const residual = number2(this.residual);

        const rate = number2(this.rate);

        const life = number2(this.life);

        const left = Math.max(0, this.bookValue - residual);

        const charge =
            this.method === 'ReducingBalance' ? this.bookValue * rate / 100 / 12
            : life > 0 ? (cost - residual) / (life * 12)
            : cost * rate / 100 / 12;

        return round2(Math.max(0, Math.min(charge, left)));
    }

    get chargeText(): string
    {
        return this.noDepreciation ? 'No depreciation'
            : !(number2(this.cost) > 0) ? '-'
            : this.monthlyCharge > 0 ? `Tk ${faMoney(this.monthlyCharge)}`
            : this.bookValue - number2(this.residual) <= 0 ? 'Fully depreciated'
            : '-';
    }

    get continuesText(): string
    {
        return this.upToPeriod ? `The runs continue after ${faPeriodText(this.upToPeriod)}` : 'The runs start from the put to use month';
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
            .getOpeningAssets()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        (rows ?? []).map(x => ({
                            ...x,
                            PurchaseText:faDay(x.PurchaseDate),
                            CostText:faMoney(x.Cost),
                            OpeningText:faMoney(x.OpeningAccumulated),
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
                error:error => this.failed(error, 'The opening assets could not be loaded.')
            });
    }

    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const matched =
            this.all.filter(x =>
                (!this.branchFilter || x.BranchId === this.branchFilter)
                &&
                (!this.categoryFilter || x.FaCategoryId === this.categoryFilter)
                &&
                (!find || [x.AssetNo, x.Name, x.CategoryName, x.BranchName, x.PurchaseText, x.SerialNo, x.Status]
                    .some(v => (v ?? '').toLowerCase().includes(find))));

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        const sum =
            (pick: (row: ListRow) => number): number => matched.reduce((total, x) => total + (Number(pick(x)) || 0), 0);

        this.summaryItems =
        [
            { label:'Cards', value:matched.length.toLocaleString('en-US') },
            { label:'Cost', value:`Tk ${faMoney(sum(x => x.Cost))}` },
            { label:'Depreciation to Date', value:`Tk ${faMoney(sum(x => x.OpeningAccumulated))}` }
        ];

        this.cdr.detectChanges();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
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

    add():
        void
    {
        void this.router.navigate(['../add'], { relativeTo:this.route });
    }

    view(row: FaAsset):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    edit(row: FaAsset):
        void
    {
        void this.router.navigate(['../edit', row.PublicId], { relativeTo:this.route });
    }

    editCard():
        void
    {
        if (this.card)
        {
            void this.router.navigate(['../../edit', this.card.PublicId], { relativeTo:this.route });
        }
    }

    goToList():
        void
    {
        void this.router.navigate([this.mode === 'add' ? '../list' : '../../list'], { relativeTo:this.route });
    }

    delete(row: FaAsset):
        void
    {
        this.confirmDialog.open(
            'Delete Opening Asset',
            `Delete ${row.AssetNo} : ${row.Name}?`,
            () =>
                this.service.deleteOpeningAsset(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.AssetNo} was deleted.`);
                        this.loadList();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The opening asset could not be deleted.')
                }),
            'Delete',
            'Keep',
            'danger');
    }

    openHistory():
        void
    {
        this.service
            .getHistory('asset-register/opening-assets')
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

        const card$: Observable<FaAsset | null> =
            this.mode === 'add' ? of(null) : this.service.getOpeningAsset(this.entityId);

        forkJoin([this.service.getLookups(), card$])
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:([lookups, card]) =>
                {
                    this.lookups = lookups;

                    const today =
                        (lookups.Today ?? '').substring(0, 10) || hrToText(new Date());

                    const thisYear =
                        Number(today.substring(0, 4));

                    this.yearItems =
                    [
                        { label:'None', value:0 },
                        ...Array.from({ length:61 }, (_, i) => ({ label:String(thisYear - i), value:thisYear - i }))
                    ];

                    this.branchItems =
                        (lookups.Branches ?? []).map(x => ({ label:x.Name, value:x.Id }));

                    this.categoryItems =
                        (lookups.Categories ?? []).map(x => ({ label:x.IsDeclared ? x.Name : `${x.Name}  (depreciation not declared)`, value:x.FaCategoryId }));

                    this.custodianItems =
                    [
                        { label:'None', value:0 },
                        ...(lookups.Employees ?? []).map(x => ({ label:`${x.Code}  ${x.Name}`, value:x.Id }))
                    ];

                    if (card)
                    {
                        this.card = card;
                        this.assetNo = card.AssetNo;
                        this.name = card.Name ?? '';
                        this.categoryId = card.FaCategoryId;
                        this.branchId = card.BranchId;
                        this.locationId = card.FaLocationId || 0;
                        this.custodianId = card.CustodianEmployeeId || 0;
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

                        // the opening month : what was keyed, as long as no run moved it on
                        const upTo = card.LastRunPeriod || 0;

                        this.upToYear = Math.floor(upTo / 100);
                        this.upToMonth = upTo % 100;
                        this.residualTyped = true;
                        this.useDatePicked = true;

                        this.branchItems = withChoice(this.branchItems, card.BranchId, card.BranchName);
                        this.categoryItems = withChoice(this.categoryItems, card.FaCategoryId, card.CategoryName);

                        this.applyNoDepreciation();
                        this.custodianItems = withChoice(this.custodianItems, card.CustodianEmployeeId, card.CustodianName);
                        this.yearItems = withChoice(this.yearItems, this.upToYear, String(this.upToYear));
                    }
                    else
                    {
                        this.branchId = this.branchItems.length === 1 ? this.branchItems[0].value : 0;
                        this.loadAssetNo();
                    }

                    this.setLocations();

                    if (card)
                    {
                        this.locationItems = withChoice(this.locationItems, card.FaLocationId, card.LocationName);
                        this.locationId = card.FaLocationId || 0;
                    }

                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The opening asset could not be loaded.')
            });
    }

    // Add : the asset no the card will get, as soon as the branch and
    // the asset group are picked (the number is made of both)
    private loadAssetNo():
        void
    {
        if (this.mode !== 'add')
        {
            return;
        }

        const branchId = this.branchId;
        const categoryId = this.categoryId;

        if (!branchId || !categoryId)
        {
            this.assetNo = '';
            this.cdr.detectChanges();
            return;
        }

        this.service.getNextAssetNo(branchId, categoryId)
            .subscribe(
            {
                next:result =>
                {
                    // an answer for what is no longer picked is dropped
                    if (branchId === this.branchId && categoryId === this.categoryId)
                    {
                        this.assetNo = result?.AssetNo ?? '';
                        this.cdr.detectChanges();
                    }
                },
                error:() =>
                {
                    this.assetNo = '';
                    this.cdr.detectChanges();
                }
            });
    }

    // The locations of the chosen branch only
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
    // Form : what is typed
    //===========================================================

    onText(field: TextField, value: any):
        void
    {
        this[field] = String(value ?? '');

        if (field === 'cost')
        {
            this.fillResidual();
        }

        this.cdr.detectChanges();
    }

    onResidual(value: any):
        void
    {
        this.residual = String(value ?? '');
        this.residualTyped = this.residual.trim() !== '';
        this.cdr.detectChanges();
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

    onMethod(value: any):
        void
    {
        this.method = this.groupIsNone ? 'None' : (String(value ?? '') || 'StraightLine');
        this.applyNoDepreciation();
        this.cdr.detectChanges();
    }

    // No depreciation : no rate, life or residual value
    private applyNoDepreciation():
        void
    {
        if (this.groupIsNone)
        {
            this.method = 'None';
        }

        if (this.method === 'None')
        {
            this.rate = '';
            this.life = '';
            this.residual = '';
        }
    }

    // The asset group gives the rule and, while none was typed, the residual value
    onCategory(value: any):
        void
    {
        const before = this.categoryId;

        const picked = (this.lookups?.Categories ?? []).find(x => x.FaCategoryId === (Number(value) || 0));

        // Its depreciation is not declared : the pick is not kept
        if (picked && !picked.IsDeclared && picked.FaCategoryId !== before)
        {
            this.toast.error('Asset Group', `Declare the depreciation of ${picked.Name} on Asset Setup > Depreciation of Fixed Assets first.`);

            // the dropdown goes back to what it showed
            this.categoryId = picked.FaCategoryId;
            this.cdr.detectChanges();
            this.categoryId = before;
            this.cdr.detectChanges();
            return;
        }

        this.categoryId = Number(value) || 0;
        this.loadAssetNo();

        const category = this.category;

        if (category)
        {
            this.method = category.Method || 'StraightLine';
            this.rate = String(category.RatePercent ?? '');
            this.life = String(category.LifeYears ?? '');

            if (!category.AllowGroupCard && number2(this.qty) > 1)
            {
                this.qty = '1';
            }

            this.fillResidual();
            this.applyNoDepreciation();
        }

        this.cdr.detectChanges();
    }

    private fillResidual():
        void
    {
        const category = this.category;

        if (this.noDepreciation)
        {
            return;
        }

        if (!this.residualTyped && category)
        {
            const value = round2(number2(this.cost) * (Number(category.ResidualPercent) || 0) / 100);

            this.residual = value > 0 ? String(value) : '';
        }
    }

    onBranch(value: any):
        void
    {
        this.branchId = Number(value) || 0;
        this.setLocations();
        this.loadAssetNo();
        this.cdr.detectChanges();
    }

    onPurchaseDate(date: Date | null):
        void
    {
        this.purchaseDate = hrToText(date);

        if (!this.useDatePicked)
        {
            this.useDate = this.purchaseDate;
        }

        this.cdr.detectChanges();
    }

    onUseDate(date: Date | null):
        void
    {
        this.useDate = hrToText(date);
        this.useDatePicked = !!this.useDate;

        if (!this.useDate)
        {
            this.useDate = this.purchaseDate;
        }

        this.cdr.detectChanges();
    }

    //===========================================================
    // Form : save
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

            if (!category)
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

            if (this.purchaseDate > today)
            {
                return 'The purchase date cannot be after today.';
            }

            if (useDate < this.purchaseDate)
            {
                return 'Put to Use cannot be before the purchase date.';
            }

            if (!(qty > 0))
            {
                return 'The quantity must be more than 0.';
            }

            if (qty > 1 && !category.AllowGroupCard)
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

    private body(): SaveFaAsset
    {
        return {
            Name:this.name.trim(),
            FaCategoryId:this.categoryId,
            Description:this.description.trim(),
            Brand:this.brand.trim(),
            Model:this.model.trim(),
            SerialNo:this.serial.trim(),
            BranchId:this.branchId,
            FaLocationId:this.locationId,
            CustodianEmployeeId:this.custodianId,
            SupplierName:this.supplier.trim(),
            PurchaseRef:this.purchaseRef.trim(),
            PurchaseDate:this.purchaseDate,
            UseDate:this.useDate || this.purchaseDate,
            Quantity:number2(this.qty) || 1,
            Cost:round2(number2(this.cost)),
            ResidualValue:this.noDepreciation ? 0 : round2(number2(this.residual)),
            Method:this.groupIsNone ? 'None' : this.method,
            RatePercent:this.noDepreciation ? 0 : number2(this.rate),
            LifeYears:this.noDepreciation ? 0 : number2(this.life),
            OpeningAccumulated:round2(number2(this.opening)),
            DepreciatedUpTo:this.upToPeriod,
            Status:this.card?.Status || 'In Use',
            Remarks:this.remarks.trim()
        };
    }

    onSave():
        void
    {
        if (this.isSaving || this.isViewMode || this.loading || !this.lookups)
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

        const call: Observable<any> =
            this.mode === 'edit'
                ? this.service.updateOpeningAsset(this.entityId, this.body())
                : this.service.createOpeningAsset(this.body());

        this.isSaving = true;

        this.progressDialog.show('Saving', 'Saving the opening asset...', false);

        call.subscribe(
        {
            next:saved =>
                this.progressDialog.finish(() =>
                {
                    this.isSaving = false;

                    const no = this.mode === 'edit' ? this.assetNo : (saved?.AssetNo || this.name.trim());

                    this.toast.success('Success', `${no} was ${this.mode === 'edit' ? 'updated' : 'saved'}${saved?.JournalVoucherNo ? ' : Journal Voucher ' + saved.JournalVoucherNo : ''}.`);
                    this.goToList();
                }),
            error:error =>
            {
                this.progressDialog.fail();
                this.isSaving = false;
                this.toast.error('Error', error?.error?.message ?? 'The opening asset could not be saved.');
                this.cdr.detectChanges();
            }
        });
    }
}
