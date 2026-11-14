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
    of,
    switchMap
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
    FA_REPORT_PRINT_KEY,
    openFaPrint,
    saveFaReport
}
from '../../print/fa-print';

import
{
    FaAcquisition,
    FaAcquisitionLine,
    FaCategory,
    FaLookups,
    faDay,
    faMoney,
    faNumber,
    faStatusColor
}
from '../../shared/fa.models';

import
{
    FaService
}
from '../../shared/fa.service';


type ListRow =
    FaAcquisition
    &
    {
        DateText: string;
        AmountText: string;
        StatusColor: string;
    };

// A line of the form : what is typed
interface LineRow
{
    key: number;
    categoryId: number;
    name: string;
    qty: string;
    cost: string;
    // Each / Group
    cardMode: string;
    brand: string;
    model: string;
    serial: string;
    locationId: number;
    custodianId: number;
    useDate: string;
    // the detail row (brand, model, serial, location ...) is open
    open: boolean;
}

type LineText =
    'name' | 'qty' | 'cost' | 'brand' | 'model' | 'serial';

interface Choice
{
    label: string;
    value: any;
}

const number2 =
    (value: any): number => Number(String(value ?? '').replace(/,/g, '').trim()) || 0;

const round2 =
    (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;


//===============================================================
// Asset Acquisitions (Fixed Assets > Asset Register)
//
// Buying assets. A Draft is saved and changed freely; posting
// writes the Journal Voucher (asset cost against the supplier or
// a payable ledger) and makes the asset cards. A posted one is
// unposted with a reason.
//
//   list / add / edit/:id / view/:id   (one component)
//===============================================================

@Component(
{
    selector:'asset-acquisitions',
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
        ProgressDialogComponent
    ],
    templateUrl:'./asset-acquisitions.html',
    styleUrl:'./asset-acquisitions.css'
})
export class AssetAcquisitionsPage
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
        'Assets bought : posting writes the Journal Voucher and makes the asset cards';

    money(value: number): string
    {
        return faMoney(value);
    }

    day(value: string): string
    {
        return faDay(value);
    }

    quantity(value: number): string
    {
        return faNumber(value);
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

    readonly tabs:
        ControlTab[] =
    [
        { id:'all', label:'All Acquisitions' },
        { id:'Draft', label:'Draft' },
        { id:'Posted', label:'Posted' }
    ];

    selectedTab =
        'all';

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
        { header:'Code', field:'Code', width:'110px', align:'center' },
        { header:'Date', field:'DateText', width:'110px', align:'center' },
        { header:'Branch', field:'BranchName', width:'160px', align:'left' },
        { header:'Reference', field:'RefNo', width:'130px', align:'left' },
        { header:'Items', field:'ItemCount', width:'70px', align:'center' },
        { header:'Amount', field:'AmountText', width:'130px', align:'right' },
        { header:'Payable To', field:'CreditLedgerName', width:'180px', align:'left' },
        { header:'Status', field:'Status', width:'100px', align:'left', dotField:'StatusColor' },
        { header:'Journal', field:'JournalVoucherNo', width:'170px', align:'center' },
        { header:'Actions', field:'actions', type:'actions', width:'120px', align:'center' }
    ];

    //===========================================================
    // Form (add / edit)
    //===========================================================

    entityId =
        '';

    lookups:
        FaLookups | null = null;

    code =
        '';

    acquisitionDate =
        '';

    branchId =
        0;

    supplierName =
        '';

    refNo =
        '';

    creditLedgerCode =
        '';

    remarks =
        '';

    lines:
        LineRow[] = [];

    private nextKey =
        1;

    // something was changed since it was loaded / saved
    private dirty =
        false;

    branchItems:
        Choice[] = [];

    // "SUB-003-002-005  Liability For Capital Assets"
    payableSubGroup =
        '';

    ledgerItems:
        Choice[] = [];

    locationItems:
        Choice[] = [];

    custodianItems:
        Choice[] = [];

    //===========================================================
    // View
    //===========================================================

    doc:
        FaAcquisition | null = null;

    unposting =
        false;

    unpostReason =
        '';

    get isDraft(): boolean
    {
        return this.doc?.Status === 'Draft';
    }

    get isPosted(): boolean
    {
        return this.doc?.Status === 'Posted';
    }

    get pageTitle(): string
    {
        return this.mode === 'add' ? 'Add Acquisition'
            : this.mode === 'edit' ? 'Update Acquisition'
            : this.mode === 'view' ? 'View Acquisition'
            : 'Asset Acquisitions';
    }

    get saveText(): string
    {
        return this.mode === 'edit' ? 'Update' : 'Save';
    }

    get categories(): FaCategory[]
    {
        return this.lookups?.Categories ?? [];
    }

    private category(id: number): FaCategory | undefined
    {
        return this.categories.find(x => x.FaCategoryId === id);
    }

    // "Group" (one card with the quantity) : only when the asset group allows it
    // The asset groups a line can pick : the ones whose depreciation
    // is declared (and the one a saved line already holds)
    get categoryItems(): { label: string; value: number }[]
    {
        const held = new Set(this.lines.map(x => x.categoryId));

        const key = `${this.categories.length}|${[...held].sort().join(',')}`;

        if (key !== this.categoryKey)
        {
            this.categoryKey = key;

            this.categoryList =
                this.categories
                    .filter(c => c.IsDeclared || held.has(c.FaCategoryId))
                    .map(c => ({ label:c.IsDeclared ? c.Name : `${c.Name}  (depreciation not declared)`, value:c.FaCategoryId }));
        }

        return this.categoryList;
    }

    private categoryKey =
        '';

    private categoryList:
        { label: string; value: number }[] = [];

    get undeclaredCount(): number
    {
        return this.categories.filter(c => !c.IsDeclared).length;
    }

    readonly cardEach =
    [
        { label:'Each', value:'Each' }
    ];

    readonly cardBoth =
    [
        { label:'Each', value:'Each' },
        { label:'Group', value:'Group' }
    ];

    allowsGroup(line: LineRow): boolean
    {
        return !!this.category(line.categoryId)?.AllowGroupCard;
    }

    amountOf(line: LineRow): number
    {
        return round2(number2(line.qty) * number2(line.cost));
    }

    get total(): number
    {
        return round2(this.lines.reduce((sum, x) => sum + this.amountOf(x), 0));
    }

    // The asset cards posting will make : one a line for a group
    // card, one an item otherwise
    get cardCount(): number
    {
        return this.lines.reduce(
            (sum, x) =>
            {
                const qty = number2(x.qty);

                return sum + (qty <= 0 ? 0 : x.cardMode === 'Group' ? 1 : Math.floor(qty));
            },
            0);
    }

    get docLines(): FaAcquisitionLine[]
    {
        return this.doc?.Lines ?? [];
    }

    get assetNos(): string[]
    {
        return this.doc?.AssetNos ?? [];
    }

    get docTotal(): number
    {
        return round2((this.doc?.Lines ?? []).reduce((sum, x) => sum + (Number(x.Amount) || 0), 0));
    }

    // brand, model and serial of a line, in one text (view)
    detailText(line: { Brand: string; Model: string; SerialNo: string }): string
    {
        return [line.Brand, line.Model, line.SerialNo ? `S/N ${line.SerialNo}` : ''].filter(x => !!x).join(' · ');
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
        else if (this.mode === 'view')
        {
            this.loadDoc();
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
            .getAcquisitions()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        (rows ?? []).map(x => ({
                            ...x,
                            DateText:faDay(x.AcquisitionDate),
                            AmountText:faMoney(x.TotalAmount),
                            StatusColor:faStatusColor(x.Status)
                        }));

                    this.loading = false;
                    this.apply();
                },
                error:error => this.failed(error, 'The acquisitions could not be loaded.')
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
                &&
                (!find || [x.Code, x.DateText, x.BranchName, x.SupplierName, x.RefNo, x.CreditLedgerName, x.Status, x.JournalVoucherNo]
                    .some(v => (v ?? '').toLowerCase().includes(find))));

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        const posted = matched.filter(x => x.Status === 'Posted');

        this.summaryItems =
        [
            { label:'Acquisitions', value:matched.length.toLocaleString('en-US') },
            { label:'Amount', value:`Tk ${faMoney(matched.reduce((sum, x) => sum + (Number(x.TotalAmount) || 0), 0))}` },
            { label:'Posted', value:posted.length.toLocaleString('en-US') },
            { label:'Amount Posted', value:`Tk ${faMoney(posted.reduce((sum, x) => sum + (Number(x.TotalAmount) || 0), 0))}` }
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

    onTab(value: string):
        void
    {
        this.selectedTab = value || 'all';
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

    view(row: FaAcquisition):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    edit(row: FaAcquisition):
        void
    {
        if (row.Status !== 'Draft')
        {
            this.toast.info('Asset Acquisitions', 'Posted : unpost it to change it.');
            this.view(row);
            return;
        }

        void this.router.navigate(['../edit', row.PublicId], { relativeTo:this.route });
    }

    goToList():
        void
    {
        void this.router.navigate([this.mode === 'add' ? '../list' : '../../list'], { relativeTo:this.route });
    }

    delete(row: FaAcquisition):
        void
    {
        if (row.Status !== 'Draft')
        {
            this.toast.error('Asset Acquisitions', `${row.Code} is ${row.Status} : only a Draft can be deleted. Open it and unpost it first.`);
            return;
        }

        this.confirmDialog.open(
            'Delete Acquisition',
            `Delete ${row.Code} : Tk ${faMoney(row.TotalAmount)}, ${row.BranchName}?`,
            () =>
                this.service.deleteAcquisition(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);

                        if (this.mode === 'list')
                        {
                            this.loadList();
                        }
                        else
                        {
                            this.goToList();
                        }
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The acquisition could not be deleted.')
                }),
            'Delete',
            'Keep',
            'danger');
    }

    openHistory():
        void
    {
        this.service
            .getHistory('asset-register/asset-acquisitions')
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

        const doc$: Observable<FaAcquisition | null> =
            this.mode === 'edit' ? this.service.getAcquisition(this.entityId) : of(null);

        forkJoin([this.service.getLookups(), doc$])
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:([lookups, doc]) =>
                {
                    if (doc && doc.Status !== 'Draft')
                    {
                        this.toast.info('Asset Acquisitions', 'Posted : unpost it to change it.');
                        void this.router.navigate(['../../view', this.entityId], { relativeTo:this.route });
                        return;
                    }

                    this.lookups = lookups;

                    this.branchItems =
                        (lookups.Branches ?? []).map(x => ({ label:x.Name, value:x.Id }));

                    this.custodianItems =
                    [
                        { label:'None', value:0 },
                        ...(lookups.Employees ?? []).map(x => ({ label:`${x.Code}  ${x.Name}`, value:x.Id }))
                    ];

                    // only the ledgers under Liability For Capital Assets
                    this.payableSubGroup = lookups.PayableSubGroup ?? '';

                    this.ledgerItems =
                        (lookups.PayableLedgers ?? [])
                            .map(x => ({ label:`${x.LedgerCode}  ${x.LedgerName}`, value:x.LedgerCode }));

                    if (doc)
                    {
                        this.doc = doc;
                        this.code = doc.Code;
                        this.acquisitionDate = (doc.AcquisitionDate ?? '').substring(0, 10);
                        this.branchId = doc.BranchId;
                        this.supplierName = doc.SupplierName ?? '';
                        this.refNo = doc.RefNo ?? '';
                        this.creditLedgerCode = doc.CreditLedgerCode || '';
                        this.remarks = doc.Remarks ?? '';

                        const ledgerCode = doc.CreditLedgerCode;

                        if (ledgerCode && !this.ledgerItems.some(x => x.value === ledgerCode))
                        {
                            this.ledgerItems =
                            [
                                { label:`${doc.CreditLedgerCode}  ${doc.CreditLedgerName}`, value:doc.CreditLedgerCode },
                                ...this.ledgerItems
                            ];
                        }

                        this.lines =
                            (doc.Lines ?? []).map(x => ({
                                key:this.nextKey++,
                                categoryId:x.FaCategoryId,
                                name:x.Name ?? '',
                                qty:String(x.Quantity ?? ''),
                                cost:String(x.UnitCost ?? ''),
                                cardMode:x.CardMode === 'Group' ? 'Group' : 'Each',
                                brand:x.Brand ?? '',
                                model:x.Model ?? '',
                                serial:x.SerialNo ?? '',
                                locationId:x.FaLocationId || 0,
                                custodianId:x.CustodianEmployeeId || 0,
                                useDate:(x.UseDate ?? '').substring(0, 10),
                                open:false
                            }));
                    }
                    else
                    {
                        this.code = lookups.NextAcquisitionCode || '';
                        this.acquisitionDate = (lookups.Today ?? '').substring(0, 10) || hrToText(new Date());
                        this.branchId = this.branchItems.length === 1 ? this.branchItems[0].value : 0;
                        // one ledger only : it is the one
                        this.creditLedgerCode = this.ledgerItems.length === 1 ? this.ledgerItems[0].value : '';
                        this.lines = [this.newLine()];
                    }

                    this.setLocations();
                    this.dirty = false;
                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The acquisition could not be loaded.')
            });
    }

    private newLine(): LineRow
    {
        return {
            key:this.nextKey++,
            categoryId:0,
            name:'',
            qty:'1',
            cost:'',
            cardMode:'Each',
            brand:'',
            model:'',
            serial:'',
            locationId:0,
            custodianId:0,
            useDate:this.acquisitionDate,
            open:false
        };
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

        for (const line of this.lines)
        {
            if (line.locationId && !own.some(x => x.Id === line.locationId))
            {
                line.locationId = 0;
            }
        }
    }

    //===========================================================
    // Form : what is typed
    //===========================================================

    onText(field: 'supplierName' | 'refNo' | 'remarks', value: any):
        void
    {
        this[field] = String(value ?? '');
        this.dirty = true;
    }

    onDate(date: Date | null):
        void
    {
        const before = this.acquisitionDate;

        this.acquisitionDate = hrToText(date);

        // the put-to-use date of a line follows while it was not changed
        for (const line of this.lines)
        {
            if (!line.useDate || line.useDate === before)
            {
                line.useDate = this.acquisitionDate;
            }
        }

        this.dirty = true;
        this.cdr.detectChanges();
    }

    onBranch(value: any):
        void
    {
        this.branchId = Number(value) || 0;
        this.setLocations();
        this.dirty = true;
        this.cdr.detectChanges();
    }

    onLedger(value: any):
        void
    {
        this.creditLedgerCode = String(value ?? '');
        this.dirty = true;
        this.cdr.detectChanges();
    }

    addLine():
        void
    {
        this.lines = [...this.lines, this.newLine()];
        this.dirty = true;
        this.cdr.detectChanges();
    }

    removeLine(line: LineRow):
        void
    {
        this.lines = this.lines.filter(x => x !== line);
        this.dirty = true;
        this.cdr.detectChanges();
    }

    toggleLine(line: LineRow):
        void
    {
        line.open = !line.open;
        this.cdr.detectChanges();
    }

    onLineCategory(line: LineRow, value: any):
        void
    {
        const picked = this.category(Number(value) || 0);

        line.categoryId = picked?.FaCategoryId ?? 0;

        if (!this.allowsGroup(line))
        {
            line.cardMode = 'Each';
        }

        this.dirty = true;
        this.cdr.detectChanges();
    }

    onLineCard(line: LineRow, value: any):
        void
    {
        line.cardMode = String(value ?? '') === 'Group' && this.allowsGroup(line) ? 'Group' : 'Each';
        this.dirty = true;
        this.cdr.detectChanges();
    }

    onLineInput(line: LineRow, field: LineText, event: Event):
        void
    {
        line[field] = (event.target as HTMLInputElement).value ?? '';
        this.dirty = true;
        this.cdr.detectChanges();
    }

    onLineText(line: LineRow, field: LineText, value: any):
        void
    {
        line[field] = String(value ?? '');
        this.dirty = true;
    }

    onLineChoice(line: LineRow, field: 'locationId' | 'custodianId', value: any):
        void
    {
        line[field] = Number(value) || 0;
        this.dirty = true;
        this.cdr.detectChanges();
    }

    onLineUseDate(line: LineRow, date: Date | null):
        void
    {
        line.useDate = hrToText(date);
        this.dirty = true;
        this.cdr.detectChanges();
    }

    //===========================================================
    // Form : save and post
    //===========================================================

    private validate(): string
    {
        if (!this.acquisitionDate)
        {
            return 'Date is required.';
        }

        if (!this.branchId)
        {
            return 'Pick the branch.';
        }

        if (this.lines.length === 0)
        {
            return 'Add at least one item.';
        }

        const configuration = this.lookups?.Configuration;

        for (let i = 0; i < this.lines.length; i++)
        {
            const line = this.lines[i];

            const at = `Item ${i + 1}`;

            const category = this.category(line.categoryId);

            const qty = number2(line.qty);

            const cost = number2(line.cost);

            if (!category)
            {
                return `${at} : pick the asset group.`;
            }

            if (!line.name.trim())
            {
                return `${at} : write the item name.`;
            }

            if (!(qty > 0))
            {
                return `${at} : the quantity must be more than 0.`;
            }

            if (!(cost > 0))
            {
                return `${at} : the unit cost must be more than 0.`;
            }

            if (line.cardMode !== 'Group' && !Number.isInteger(qty))
            {
                return `${at} : one card an item needs a whole quantity.`;
            }

            if (line.cardMode === 'Group' && !category.AllowGroupCard)
            {
                return `${at} : ${category.Name} does not allow one card for many items.`;
            }

            if (category.CapitalThreshold > 0 && cost < category.CapitalThreshold)
            {
                return `${at} : a unit cost below Tk ${faMoney(category.CapitalThreshold)} is an expense for ${category.Name}, not an asset.`;
            }

            if (configuration?.RequireLocation && !line.locationId)
            {
                line.open = true;
                return `${at} : pick the location.`;
            }

            if (configuration?.RequireCustodian && !line.custodianId)
            {
                line.open = true;
                return `${at} : pick the custodian.`;
            }
        }

        return '';
    }

    private body(): any
    {
        return {
            AcquisitionDate:this.acquisitionDate,
            BranchId:this.branchId,
            SupplierName:'',
            RefNo:this.refNo.trim(),
            CreditLedgerCode:this.creditLedgerCode,
            Remarks:this.remarks.trim(),
            Lines:this.lines.map(x => ({
                FaCategoryId:x.categoryId,
                Name:x.name.trim(),
                Brand:x.brand.trim(),
                Model:x.model.trim(),
                SerialNo:x.serial.trim(),
                Quantity:number2(x.qty),
                UnitCost:round2(number2(x.cost)),
                CardMode:x.cardMode,
                FaLocationId:x.locationId,
                CustodianEmployeeId:x.custodianId,
                UseDate:x.useDate || this.acquisitionDate
            }))
        };
    }

    private run<T>(busy: string, call: Observable<T>, failure: string, done: (result: T) => void):
        void
    {
        this.isSaving = true;

        this.progressDialog.show('Saving', busy, false);

        call.subscribe(
        {
            next:result =>
                this.progressDialog.finish(() =>
                {
                    this.isSaving = false;
                    done(result);
                    this.cdr.detectChanges();
                }),
            error:error =>
            {
                this.progressDialog.fail();
                this.isSaving = false;
                this.toast.error('Error', error?.error?.message ?? failure);
                this.cdr.detectChanges();
            }
        });
    }

    onSave():
        void
    {
        if (this.isSaving || this.loading || !this.lookups)
        {
            return;
        }

        const problem =
            this.validate();

        if (problem)
        {
            this.toast.error('Validation', problem);
            this.cdr.detectChanges();
            return;
        }

        this.run(
            'Saving the acquisition...',
            this.service.saveAcquisition(this.entityId, this.body()),
            'The acquisition could not be saved.',
            saved =>
            {
                this.dirty = false;
                this.toast.success('Success', `${saved?.Code || (this.mode === 'edit' ? this.code : 'The acquisition')} was saved as a Draft.`);
                this.goToList();
            });
    }

    // Edit of a Draft : saves what was changed, then posts
    onPostForm():
        void
    {
        if (this.isSaving || this.loading || this.mode !== 'edit' || !this.lookups)
        {
            return;
        }

        const problem =
            this.validate();

        if (problem)
        {
            this.toast.error('Validation', problem);
            this.cdr.detectChanges();
            return;
        }

        const id = this.entityId;

        this.confirmDialog.open(
            'Post Acquisition',
            `Post ${this.code} : Tk ${faMoney(this.total)}? Posting writes the Journal Voucher and makes the asset cards.`,
            () =>
                this.run(
                    'Posting the acquisition...',
                    this.dirty
                        ? this.service.saveAcquisition(id, this.body()).pipe(switchMap(() => this.service.postAcquisition(id)))
                        : this.service.postAcquisition(id),
                    'The acquisition could not be posted.',
                    () =>
                    {
                        this.dirty = false;
                        this.toast.success('Success', `${this.code} was posted : the asset cards were made.`);
                        this.goToList();
                    }),
            'Post',
            'Cancel',
            'primary');
    }

    //===========================================================
    // View
    //===========================================================

    private loadDoc():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        this.service
            .getAcquisition(this.entityId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:doc =>
                {
                    this.doc = doc;
                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error => this.failed(error, 'The acquisition could not be loaded.')
            });
    }

    editDoc():
        void
    {
        if (this.doc && this.isDraft)
        {
            void this.router.navigate(['../../edit', this.doc.PublicId], { relativeTo:this.route });
        }
    }

    deleteDoc():
        void
    {
        if (this.doc)
        {
            this.delete(this.doc);
        }
    }

    onPostDoc():
        void
    {
        const doc = this.doc;

        if (!doc || !this.isDraft || this.isSaving)
        {
            return;
        }

        this.confirmDialog.open(
            'Post Acquisition',
            `Post ${doc.Code} : Tk ${faMoney(doc.TotalAmount)}? Posting writes the Journal Voucher and makes the asset cards.`,
            () =>
                this.run(
                    'Posting the acquisition...',
                    this.service.postAcquisition(doc.PublicId),
                    'The acquisition could not be posted.',
                    () =>
                    {
                        this.toast.success('Success', `${doc.Code} was posted : the asset cards were made.`);
                        this.loadDoc();
                    }),
            'Post',
            'Cancel',
            'primary');
    }

    askUnpost():
        void
    {
        this.unposting = true;
        this.unpostReason = '';
        this.cdr.detectChanges();
    }

    onUnpostReason(value: any):
        void
    {
        this.unpostReason = String(value ?? '');
    }

    keepPosted():
        void
    {
        this.unposting = false;
        this.cdr.detectChanges();
    }

    confirmUnpost():
        void
    {
        const doc = this.doc;

        if (!doc || this.isSaving)
        {
            return;
        }

        const reason = this.unpostReason.trim();

        if (!reason)
        {
            this.toast.error('Asset Acquisitions', 'Write why the acquisition is unposted.');
            return;
        }

        this.run(
            'Unposting the acquisition...',
            this.service.unpostAcquisition(doc.PublicId, reason),
            'The acquisition could not be unposted.',
            () =>
            {
                this.unposting = false;
                this.toast.success('Success', `${doc.Code} was unposted : its Journal Voucher is cancelled and its asset cards are removed.`);
                this.loadDoc();
            });
    }

    // The lines with their total (Print Engine)
    print():
        void
    {
        const doc = this.doc;

        const lines = this.docLines;

        if (!doc || lines.length === 0)
        {
            return;
        }

        const cards = this.assetNos;

        const token =
            saveFaReport(
            {
                title:'Asset Acquisition',
                subtitle:[doc.BranchName, doc.SupplierName].filter(x => !!x).join(' · '),
                meta:
                [
                    { label:'Acquisition', value:doc.Code },
                    { label:'Date', value:faDay(doc.AcquisitionDate) },
                    { label:'Reference', value:doc.RefNo },
                    { label:'Payable To', value:doc.CreditLedgerName },
                    { label:'Status', value:doc.Status },
                    { label:'Journal Voucher', value:doc.JournalVoucherNo }
                ].filter(x => !!x.value),
                band:
                [
                    { label:'Items', value:String(lines.length) },
                    { label:'Asset Cards', value:String(cards.length) },
                    { label:'Total', value:`Tk ${faMoney(this.docTotal)}` }
                ],
                columns:
                [
                    { header:'Asset Group', kind:'text' },
                    { header:'Item', kind:'text' },
                    { header:'Brand / Model / Serial', kind:'text' },
                    { header:'Location', kind:'text' },
                    { header:'Custodian', kind:'text' },
                    { header:'Put to Use', kind:'center' },
                    { header:'Card', kind:'center' },
                    { header:'Qty', kind:'num' },
                    { header:'Unit Cost', kind:'money' },
                    { header:'Amount', kind:'money', strong:true }
                ],
                rows:lines.map(x =>
                [
                    x.CategoryName,
                    x.Name,
                    this.detailText(x),
                    x.LocationName ?? '',
                    x.CustodianName ?? '',
                    faDay(x.UseDate),
                    x.CardMode,
                    faNumber(x.Quantity),
                    faMoney(x.UnitCost),
                    faMoney(x.Amount)
                ]),
                footer:['', `Total (${lines.length})`, '', '', '', '', '', '', '', faMoney(this.docTotal)],
                note:[doc.Remarks, cards.length > 0 ? `Asset cards : ${cards.join(', ')}` : ''].filter(x => !!x).join('  |  '),
                landscape:true
            });

        const problem =
            openFaPrint(this.router, FA_REPORT_PRINT_KEY, token, `${doc.Code} Asset Acquisition`, true);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }
}
