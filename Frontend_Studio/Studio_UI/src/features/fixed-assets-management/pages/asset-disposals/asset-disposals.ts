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
    forkJoin
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
    FA_LIVE_STATUSES,
    FaAsset,
    FaDisposal,
    faDay,
    faMoney
}
from '../../shared/fa.models';

import
{
    FaService
}
from '../../shared/fa.service';


type ListRow =
    FaDisposal
    &
    {
        DateText: string;
        AssetText: string;
        CostText: string;
        AccumulatedText: string;
        BookValueText: string;
        PriceText: string;
        // "Gain 1,200.00" / "Loss 300.00"
        GainLossText: string;
        GainLossColor: string;
        JournalText: string;
    };

const GAIN_COLOR =
    '#047857';

const LOSS_COLOR =
    '#b4232c';

// '1,250.50' : 1250.5 (0 for a text that is no number)
function toAmount(text: string): number
{
    const value = Number(String(text ?? '').replace(/,/g, '').trim());

    return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

// '2026-11-14' : 202611
function periodOf(date: string): number
{
    return Number(date.substring(0, 4)) * 100 + Number(date.substring(5, 7));
}

// "Gain 1,200.00" / "Loss 300.00"
function gainLossText(value: number): string
{
    return value >= 0 ? `Gain ${faMoney(value)}` : `Loss ${faMoney(-value)}`;
}


//===============================================================
// Asset Disposals (Fixed Assets > Asset Disposal)
//
// The sale, the scrap, the write-off or the loss of an asset. A
// Journal Voucher takes the cost and the depreciation of the
// asset off the books; the price (when there is one) is owed by
// the Receivable From ledger, and what is left is the gain or the
// loss :  gain / loss = price - book value.
//
//   list       the disposals : view, delete
//   add        left the disposal, right what it does
//   view/:id   one disposal (never edited : deleted)
//===============================================================

@Component(
{
    selector:'asset-disposals',
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
    templateUrl:'./asset-disposals.html',
    styleUrl:'./asset-disposals.css'
})
export class AssetDisposalsPage
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
        'list' | 'add' | 'view' = 'list';

    loading =
        false;

    loadFailed =
        false;

    isSaving =
        false;

    readonly asDate = hrToDate;

    money(value: number): string
    {
        return faMoney(value);
    }

    day(value: string): string
    {
        return faDay(value);
    }

    gainLoss(value: number): string
    {
        return gainLossText(value);
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

    // Every row the tab, the branch and the search leave (the print)
    private matched:
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
        { id:'all', label:'All' },
        { id:'sale', label:'Sale' },
        { id:'scrap', label:'Scrap' },
        { id:'off', label:'Write Off & Lost' }
    ];

    selectedTab =
        'all';

    branchFilter =
        '';

    branchItems:
        { label: string; value: string }[] =
    [
        { label:'All Branches', value:'' }
    ];

    // tone : 'ok' green, 'bad' red, '' plain
    summaryItems:
        { label: string; value: string; tone: string }[] = [];

    historyOpened =
        false;

    historyItems:
        any[] = [];

    readonly actions:
        ListTableActions =
    {
        view:true,
        edit:false,
        delete:true
    };

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Code', field:'Code', width:'110px', align:'center' },
        { header:'Date', field:'DateText', width:'110px', align:'center' },
        { header:'Asset', field:'AssetText', width:'230px', align:'left' },
        { header:'Asset Group', field:'CategoryName', width:'150px', align:'left' },
        { header:'Kind', field:'Kind', width:'95px', align:'center' },
        { header:'Cost', field:'CostText', width:'120px', align:'right' },
        { header:'Depreciation', field:'AccumulatedText', width:'120px', align:'right' },
        { header:'Book Value', field:'BookValueText', width:'120px', align:'right' },
        { header:'Price', field:'PriceText', width:'120px', align:'right' },
        { header:'Gain / Loss', field:'GainLossText', width:'150px', align:'left', dotField:'GainLossColor' },
        { header:'Journal', field:'JournalText', width:'170px', align:'center' },
        { header:'Actions', field:'actions', type:'actions', width:'100px', align:'center' }
    ];

    //===========================================================
    // Add
    //===========================================================

    private assets:
        FaAsset[] = [];

    assetItems:
        { label: string; value: number }[] = [];

    ledgerItems:
        { label: string; value: string }[] = [];

    readonly kindItems =
    [
        { label:'Sale', value:'Sale' },
        { label:'Scrap', value:'Scrap' },
        { label:'Write Off', value:'Write Off' },
        { label:'Lost', value:'Lost' }
    ];

    disposalDate =
        hrToText(new Date());

    assetId =
        0;

    kind =
        'Sale';

    buyerName =
        '';

    priceText =
        '';

    debitLedgerCode =
        '';

    remarks =
        '';

    get asset(): FaAsset | undefined
    {
        return this.assets.find(x => x.FaAssetId === this.assetId);
    }

    // Sale / Scrap : there may be a buyer and a price
    get hasBuyer(): boolean
    {
        return this.kind === 'Sale' || this.kind === 'Scrap';
    }

    // Write Off / Lost : no price
    get price(): number
    {
        return this.hasBuyer ? toAmount(this.priceText) : 0;
    }

    // Price less book value (a loss is negative)
    get liveGainLoss(): number
    {
        return Math.round((this.price - (this.asset?.BookValue ?? 0)) * 100) / 100;
    }

    // The Journal Voucher of the disposal, in words
    get voucherLines(): string[]
    {
        const a = this.asset;

        if (!a)
        {
            return [];
        }

        const receivable =
            this.ledgerItems.find(x => x.value === this.debitLedgerCode)?.label ?? 'Receivable';

        const gain = this.liveGainLoss;

        const lines: string[] = [];

        if (a.AccumulatedDepreciation > 0)
        {
            lines.push(`Accumulated Depreciation Dr / Asset Cost Cr : Tk ${faMoney(a.AccumulatedDepreciation)}`);
        }

        if (this.price > 0)
        {
            lines.push(`${receivable} Dr / Asset Cost Cr : Tk ${faMoney(Math.min(this.price, a.BookValue))}`);
        }

        if (gain > 0)
        {
            lines.push(`${receivable} Dr / Gain on Disposal Cr : Tk ${faMoney(gain)}`);
        }
        else if (gain < 0)
        {
            lines.push(`Loss on Disposal Dr / Asset Cost Cr : Tk ${faMoney(-gain)}`);
        }

        return lines;
    }

    //===========================================================
    // View
    //===========================================================

    entity:
        FaDisposal | null = null;

    get pageTitle(): string
    {
        return this.mode === 'list' ? 'Asset Disposals'
            : this.mode === 'add' ? 'Add Asset Disposal'
            : 'View Asset Disposal';
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase().split('?')[0];

        this.mode =
            url.includes('/view/') ? 'view' : url.endsWith('/add') ? 'add' : 'list';

        if (this.mode === 'list')
        {
            this.loadList();
        }
        else if (this.mode === 'view')
        {
            const id =
                (this.route.snapshot.paramMap.get('id') ?? '').toLowerCase();

            this.loading = true;

            this.service
                .getDisposals()
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(
                {
                    next:rows =>
                    {
                        this.entity = rows.find(x => String(x.PublicId).toLowerCase() === id) ?? null;
                        this.loading = false;
                        this.loadFailed = !this.entity;
                        this.cdr.detectChanges();
                    },
                    error:error => this.failed(error, 'The asset disposal could not be loaded.')
                });
        }
        else
        {
            this.loading = true;

            forkJoin(
            {
                lookups:this.service.getLookups(),
                assets:this.service.getAssets()
            })
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(
                {
                    next:x =>
                    {
                        this.assets =
                            (x.assets ?? []).filter(a => FA_LIVE_STATUSES.includes(a.Status));

                        this.assetItems =
                            this.assets.map(a => ({ label:`${a.AssetNo}  ${a.Name}`, value:a.FaAssetId }));

                        this.ledgerItems =
                            (x.lookups.Ledgers ?? [])
                                .filter(l => l.LedgerType === 'Customer' || l.LedgerType === 'General Ledger')
                                .map(l => ({ label:`${l.LedgerName}  (${l.LedgerType})`, value:l.LedgerCode }));

                        this.debitLedgerCode =
                            this.ledgerItems.some(l => l.value === x.lookups.ReceivableLedgerCode) ? x.lookups.ReceivableLedgerCode : '';

                        this.disposalDate = x.lookups.Today || this.disposalDate;
                        this.loading = false;
                        this.cdr.detectChanges();
                    },
                    error:error => this.failed(error, 'The asset lists could not be loaded.')
                });
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
            .getDisposals()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:rows =>
                {
                    this.all =
                        (rows ?? []).map(x => ({
                            ...x,
                            DateText:faDay(x.DisposalDate),
                            AssetText:`${x.AssetNo}  ${x.AssetName}`,
                            CostText:faMoney(x.Cost),
                            AccumulatedText:faMoney(x.Accumulated),
                            BookValueText:faMoney(x.BookValue),
                            PriceText:faMoney(x.SalePrice),
                            GainLossText:gainLossText(x.GainLoss),
                            GainLossColor:x.GainLoss >= 0 ? GAIN_COLOR : LOSS_COLOR,
                            JournalText:x.JournalVoucherNo || '-'
                        }));

                    this.branchItems =
                    [
                        { label:'All Branches', value:'' },
                        ...[...new Set(this.all.map(x => x.BranchName).filter(x => !!x))].sort().map(x => ({ label:x, value:x }))
                    ];

                    if (!this.branchItems.some(x => x.value === this.branchFilter))
                    {
                        this.branchFilter = '';
                    }

                    this.loading = false;
                    this.apply();
                },
                error:error => this.failed(error, 'Asset disposals could not be loaded.')
            });
    }

    private inTab(row: ListRow): boolean
    {
        return this.selectedTab === 'all'
            || (this.selectedTab === 'sale' ? row.Kind === 'Sale'
                : this.selectedTab === 'scrap' ? row.Kind === 'Scrap'
                : row.Kind === 'Write Off' || row.Kind === 'Lost');
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
                (!this.branchFilter || x.BranchName === this.branchFilter)
                &&
                (!find || [x.Code, x.DateText, x.AssetText, x.CategoryName, x.BranchName, x.Kind, x.BuyerName, x.JournalVoucherNo, x.Remarks]
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

        const net = matched.reduce((sum, x) => sum + x.GainLoss, 0);

        this.summaryItems =
        [
            { label:'Disposals', value:matched.length.toLocaleString('en-US'), tone:'' },
            { label:'Cost', value:`Tk ${faMoney(matched.reduce((sum, x) => sum + x.Cost, 0))}`, tone:'' },
            { label:'Book Value', value:`Tk ${faMoney(matched.reduce((sum, x) => sum + x.BookValue, 0))}`, tone:'' },
            { label:'Price', value:`Tk ${faMoney(matched.reduce((sum, x) => sum + x.SalePrice, 0))}`, tone:'' },
            { label:net >= 0 ? 'Net Gain' : 'Net Loss', value:`Tk ${faMoney(Math.abs(net))}`, tone:net >= 0 ? 'ok' : 'bad' }
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

    onBranchFilter(value: any):
        void
    {
        this.branchFilter = String(value ?? '');
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

    open(row: ListRow):
        void
    {
        void this.router.navigate(['../view', row.PublicId], { relativeTo:this.route });
    }

    goToList():
        void
    {
        void this.router.navigate([this.mode === 'view' ? '../../list' : '../list'], { relativeTo:this.route });
    }

    delete(row: FaDisposal):
        void
    {
        this.confirmDialog.open(
            'Delete Asset Disposal',
            `Delete ${row.Code} : ${row.Kind} of ${row.AssetNo} ${row.AssetName}? Its Journal Voucher is cancelled and the asset is put back in use.`,
            () =>
                this.service.deleteDisposal(row.PublicId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted : ${row.AssetNo} is back in use.`);

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
                        this.toast.error('Error', error?.error?.message ?? 'The asset disposal could not be deleted.')
                }),
            'Delete',
            'Keep',
            'danger');
    }

    openHistory():
        void
    {
        this.service
            .getHistory('asset-disposal/asset-disposals')
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
    // Add
    //===========================================================

    onDate(date: Date | null):
        void
    {
        this.disposalDate = hrToText(date);
        this.cdr.detectChanges();
    }

    onAsset(value: any):
        void
    {
        this.assetId = Number(value) || 0;
        this.cdr.detectChanges();
    }

    onKind(value: any):
        void
    {
        this.kind = String(value ?? 'Sale');
        this.cdr.detectChanges();
    }

    onBuyer(value: any):
        void
    {
        this.buyerName = String(value ?? '');
    }

    onPrice(value: any):
        void
    {
        this.priceText = String(value ?? '');
        this.cdr.detectChanges();
    }

    onLedger(value: any):
        void
    {
        this.debitLedgerCode = String(value ?? '');
        this.cdr.detectChanges();
    }

    onRemarks(value: any):
        void
    {
        this.remarks = String(value ?? '');
    }

    private validate(): string
    {
        const a = this.asset;

        if (!this.disposalDate)
        {
            return 'Date is required.';
        }

        if (!a)
        {
            return 'Pick the asset.';
        }

        if (a.LastRunPeriod > 0 && periodOf(this.disposalDate) <= a.LastRunPeriod)
        {
            return `${a.AssetNo} is depreciated up to ${a.LastRunText} : the date must be after that month.`;
        }

        if (this.hasBuyer)
        {
            const typed = Number(this.priceText.replace(/,/g, '').trim() || '0');

            if (!Number.isFinite(typed) || typed < 0)
            {
                return 'Price must be a number, 0 or more.';
            }
        }

        if (this.kind === 'Sale' && !(this.price > 0))
        {
            return 'A sale needs a price of more than 0. With no price, pick Scrap or Write Off.';
        }

        return '';
    }

    onSave():
        void
    {
        if (this.isSaving)
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

        const gain = this.liveGainLoss;

        this.isSaving = true;

        this.progressDialog.show('Saving', 'Saving the asset disposal...', false);

        this.service
            .createDisposal(
            {
                DisposalDate:this.disposalDate,
                FaAssetId:this.assetId,
                Kind:this.kind,
                BuyerName:this.hasBuyer ? this.buyerName.trim() : '',
                SalePrice:this.price,
                // no price : nothing is owed
                DebitLedgerCode:this.price > 0 ? this.debitLedgerCode : '',
                Remarks:this.remarks.trim()
            })
            .subscribe(
            {
                next:saved =>
                    this.progressDialog.finish(() =>
                    {
                        this.isSaving = false;
                        this.toast.success('Saved', `${saved?.Code || 'The disposal'} : ${this.asset?.AssetNo ?? 'the asset'} was disposed. ${gainLossText(saved?.GainLoss ?? gain)}.`);
                        this.goToList();
                    }),
                error:error =>
                {
                    this.progressDialog.fail();
                    this.isSaving = false;
                    this.toast.error('Error', error?.error?.message ?? 'The asset disposal could not be saved.');
                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Print (the shared Print Engine)
    //===========================================================

    private openPrint(token: number, name: string, landscape: boolean):
        void
    {
        const problem =
            openFaPrint(this.router, FA_REPORT_PRINT_KEY, token, name, landscape);

        if (problem)
        {
            this.toast.error('Print', problem);
        }
    }

    // The list as it is filtered now
    printList():
        void
    {
        const rows = this.matched;

        if (rows.length === 0)
        {
            this.toast.error('Print', 'There is nothing to print.');
            return;
        }

        const tab = this.tabs.find(x => x.id === this.selectedTab)?.label ?? 'All';

        const sum =
            (pick: (row: ListRow) => number): number => rows.reduce((total, x) => total + pick(x), 0);

        const cost = sum(x => x.Cost);

        const accumulated = sum(x => x.Accumulated);

        const book = sum(x => x.BookValue);

        const price = sum(x => x.SalePrice);

        const net = sum(x => x.GainLoss);

        this.openPrint(
            saveFaReport(
            {
                title:'Asset Disposals',
                subtitle:`${tab} · ${this.branchFilter || 'All Branches'}`,
                meta:this.searchText.trim() ? [{ label:'Search', value:this.searchText.trim() }] : [],
                band:
                [
                    { label:'Disposals', value:String(rows.length) },
                    { label:'Cost', value:`Tk ${faMoney(cost)}` },
                    { label:'Book Value', value:`Tk ${faMoney(book)}` },
                    { label:'Price', value:`Tk ${faMoney(price)}` },
                    { label:net >= 0 ? 'Net Gain' : 'Net Loss', value:`Tk ${faMoney(Math.abs(net))}` }
                ],
                columns:
                [
                    { header:'Code', kind:'center' },
                    { header:'Date', kind:'center' },
                    { header:'Asset', kind:'text' },
                    { header:'Asset Group', kind:'text' },
                    { header:'Kind', kind:'center' },
                    { header:'Cost', kind:'money' },
                    { header:'Depreciation', kind:'money' },
                    { header:'Book Value', kind:'money' },
                    { header:'Price', kind:'money' },
                    { header:'Gain / Loss', kind:'text', strong:true },
                    { header:'Journal', kind:'center' }
                ],
                rows:rows.map(x =>
                [
                    x.Code,
                    x.DateText,
                    x.AssetText,
                    x.CategoryName ?? '',
                    x.Kind,
                    x.CostText,
                    x.AccumulatedText,
                    x.BookValueText,
                    x.PriceText,
                    x.GainLossText,
                    x.JournalText
                ]),
                footer:['', '', `Total (${rows.length})`, '', '', faMoney(cost), faMoney(accumulated), faMoney(book), faMoney(price), gainLossText(net), ''],
                landscape:true
            }),
            'Asset Disposals',
            true);
    }

    // One disposal : what came off the books and the gain or loss
    printOne():
        void
    {
        const e = this.entity;

        if (!e)
        {
            return;
        }

        this.openPrint(
            saveFaReport(
            {
                title:'Asset Disposal',
                subtitle:`${e.AssetNo} ${e.AssetName} · ${e.BranchName}`,
                meta:
                [
                    { label:'Disposal', value:e.Code },
                    { label:'Date', value:faDay(e.DisposalDate) },
                    { label:'Kind', value:e.Kind },
                    { label:'Asset Group', value:e.CategoryName },
                    { label:'Buyer', value:e.BuyerName },
                    { label:'Receivable from', value:e.SalePrice > 0 ? e.DebitLedgerName : '' },
                    { label:'Journal Voucher', value:e.JournalVoucherNo }
                ].filter(x => !!x.value),
                band:
                [
                    { label:'Book Value', value:`Tk ${faMoney(e.BookValue)}` },
                    { label:'Price', value:`Tk ${faMoney(e.SalePrice)}` },
                    { label:e.GainLoss >= 0 ? 'Gain' : 'Loss', value:`Tk ${faMoney(Math.abs(e.GainLoss))}` }
                ],
                columns:
                [
                    { header:'Particulars', kind:'text' },
                    { header:'Amount (Tk)', kind:'money', strong:true }
                ],
                rows:
                [
                    ['Cost of the asset', faMoney(e.Cost)],
                    ['Accumulated depreciation', faMoney(e.Accumulated)],
                    ['Book value', faMoney(e.BookValue)],
                    ['Price', faMoney(e.SalePrice)]
                ],
                footer:[e.GainLoss >= 0 ? 'Gain on disposal (price less book value)' : 'Loss on disposal (book value less price)', faMoney(Math.abs(e.GainLoss))],
                note:e.Remarks
            }),
            `${e.Code} ${e.AssetNo}`,
            false);
    }
}
