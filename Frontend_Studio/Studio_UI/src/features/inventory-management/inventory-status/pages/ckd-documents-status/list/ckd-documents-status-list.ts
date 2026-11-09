//===============================================================
// CKD Documents Status (one page, NO Code Synchronization)
//
// Inventory Management > Inventory Status. CKD documents = the
// brand distributor's import document set of a chassis : it goes
// to BRTA for registration and to the customer in the customer
// file. One row per chassis (bikes from purchases, receivings and
// opening stock; opening customer files without a bike record).
//
// Status Yes (in hand / on the portal) / No (default), changed
// with the dropdown on the row. Yes -> No asks for the reason
// (panel on the right). Before a file is delivered or a bike is
// registered the chassis must be Yes. No accounting.
//===============================================================


//===============================================================
// Imports
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
    CommonModule
}
from '@angular/common';

import
{
    CkdDocumentRow,
    CkdStatus
}
from '../../../ckd-documents/ckd-documents-status.model';

import
{
    CkdDocumentsStatusService
}
from '../../../ckd-documents/ckd-documents-status.service';

import
{
    PageHeaderComponent
}
from '../../../../../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    PageCanvasComponent,
    PageCanvasConfig
}
from '../../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    SearchBoxComponent
}
from '../../../../../../shared/components/utilities/search-box/search-box';

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

import
{
    ListTableComponent,
    ListTableColumn
}
from '../../../../../../shared/components/layout/list-table/list-table';

import
{
    PaginationComponent
}
from '../../../../../../shared/components/controls/pagination/pagination';

import
{
    HistoryDrawerComponent
}
from '../../../../../../shared/components/utilities/history-drawer/history-drawer';

import
{
    ProgressDialogComponent
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

import
{
    ProgressRunner
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-runner';

import
{
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

import
{
    FormSectionComponent
}
from '../../../../../../shared/components/layout/form-section/form-section';

import
{
    TextboxComponent
}
from '../../../../../../shared/components/controls/textbox/textbox';

import
{
    DropdownComponent
}
from '../../../../../../shared/components/controls/dropdown/dropdown';

import
{
    YearPickerComponent
}
from '../../../../../../shared/components/controls/year-picker/year-picker';


//===============================================================
// Row with its display texts
//===============================================================

type CkdRow =
    CkdDocumentRow
    &
    {
        RowKey:string;
        SourceText:string;
        BranchText:string;
        StockText:string;
        FileText:string;
        CheckedText:string;
        StockDot:string;
    };

type CkdTab =
    'All' | 'No' | 'Yes';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'ckd-documents-status-list',

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
        ProgressDialogComponent,
        ToastComponent,
        FormSectionComponent,
        TextboxComponent,
        DropdownComponent,
        YearPickerComponent
    ],

    templateUrl:'./ckd-documents-status-list.html',

    styleUrl:'./ckd-documents-status-list.css'
})


//===============================================================
// CKD Documents Status List
//===============================================================

export class CkdDocumentsStatusList
implements OnInit
{
    private readonly service =
        inject(CkdDocumentsStatusService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges()
        );


    //===========================================================
    // Tabs and filters
    //===========================================================

    selectedTab:
        CkdTab =
        'No';

    // No counts on the tabs : the summary line shows them
    readonly tabs:
        ControlTab[] =
        [
            { id:'No', label:'CKD No' },
            { id:'Yes', label:'CKD Yes' },
            { id:'All', label:'All' }
        ];

    readonly sourceItems:
        any[] =
        [
            { label:'All Sources', value:'' },
            { label:'Purchase', value:'Purchase' },
            { label:'Opening Stock', value:'Opening Stock' },
            { label:'Opening File', value:'Opening File' }
        ];

    sourceFilter:
        string =
        '';

    readonly stockItems:
        any[] =
        [
            { label:'All Bikes', value:'' },
            { label:'In Stock', value:'In Stock' },
            { label:'Sold', value:'Sold' },
            { label:'Other', value:'Other' }
        ];

    stockFilter:
        string =
        '';

    branchItems:
        any[] =
        [ { label:'All Branches', value:0 } ];

    branchFilter:
        number =
        0;

    readonly statusItems:
        any[] =
        [
            { label:'Yes', value:'Yes' },
            { label:'No', value:'No' }
        ];

    // Year of manufacture : 2000 .. next year (newest first)
    readonly years:
        number[] =
        Array.from(
            { length:new Date().getFullYear() + 1 - 2000 + 1 },
            (_, i) => new Date().getFullYear() + 1 - i
        );

    readonly yearItems:
        any[] =
        this.years.map(y => ({ label:String(y), value:y }));

    readonly hint:
        string =
        'CKD documents in hand or on the distributor portal : Yes. A customer file is delivered, and a bike registered, only when Yes.';


    //===========================================================
    // Data
    //===========================================================

    private rows:
        CkdRow[] =
        [];

    today:
        string =
        '';

    filteredRows:
        CkdRow[] =
        [];

    pagedRows:
        CkdRow[] =
        [];

    searchText:
        string =
        '';

    loading:
        boolean =
        false;

    loadFailed:
        boolean =
        false;

    currentPage:
        number =
        1;

    pageSize:
        number =
        10;

    // Row being saved (its dropdown waits)
    savingKey:
        string =
        '';

    historyOpened:
        boolean =
        false;

    historyTitle:
        string =
        'CKD Documents History';

    historyItems:
        any[] =
        [];

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
        { header:'#', field:'serial', type:'serial', width:'56px', align:'center' },
        { header:'Chassis No', field:'ChassisNo', width:'170px', align:'left' },
        { header:'Engine No', field:'EngineNo', width:'150px', align:'left' },
        { header:'Motor Bike', field:'ProductName', align:'left' },
        { header:'Source', field:'SourceText', width:'210px', align:'left' },
        { header:'Branch', field:'BranchText', width:'170px', align:'left', priority:2 },
        { header:'Stock', field:'StockText', width:'130px', align:'left', dotField:'StockDot' },
        { header:'Customer File', field:'FileText', width:'170px', align:'left', priority:2 },
        { header:'Year', field:'ManufactureYear', type:'template', width:'96px', align:'center' },
        { header:'CKD Docs', field:'CkdStatus', type:'template', width:'110px', align:'center' },
        { header:'Checked', field:'CheckedText', width:'190px', align:'left', priority:3 },
        { header:'Actions', field:'actions', type:'actions', width:'90px', align:'center' }
    ];


    //===========================================================
    // Load
    //===========================================================

    ngOnInit():
        void
    {
        this.loadItems();
    }


    loadItems():
        void
    {
        this.loading = true;

        this.loadFailed = false;

        this.service
            .getAll()
            .subscribe
            ({
                next:
                (data): void =>
                {
                    this.today = data.Today;

                    this.rows =
                        data.Rows.map(
                            x =>
                            ({
                                ...x,
                                RowKey:`${x.Kind}-${x.Id}`,
                                SourceText:x.SourceNo ? `${x.Source} · ${x.SourceNo}` : x.Source,
                                BranchText:[x.BranchName, x.WarehouseName].filter(v => v).join(' · ') || '—',
                                StockText:x.StockStatus || '—',
                                FileText:x.CustomerFileNo || '—',
                                CheckedText:
                                    x.CkdCheckedDate
                                        ? `${CkdDocumentsStatusList.dateLabel(x.CkdCheckedDate)}${x.CkdCheckedByName ? ' · ' + x.CkdCheckedByName : ''}`
                                        : '—',
                                StockDot:
                                    x.StockStatus === 'In Stock'
                                        ? '#16a34a'
                                        : x.StockStatus === 'Sold'
                                            ? '#2563eb'
                                            : '#94a3b8'
                            }));

                    const branches =
                        new Map<number, string>();

                    this.rows.forEach(x => branches.set(x.BranchId, x.BranchName || `Branch ${x.BranchId}`));

                    this.branchItems =
                        [
                            { label:'All Branches', value:0 },
                            ...[...branches.entries()]
                                .sort((a, b) => a[1].localeCompare(b[1]))
                                .map(([value, label]) => ({ label, value }))
                        ];

                    this.loading = false;

                    this.applyFilters(false);

                    this.cdr.detectChanges();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('Load CKD Documents Error:', error);

                    this.rows = [];
                    this.filteredRows = [];
                    this.pagedRows = [];

                    this.loading = false;

                    this.loadFailed = true;

                    this.toast.error('Load Failed', this.errorText(error, 'Unable to load the CKD documents status.'));

                    this.cdr.detectChanges();
                }
            });
    }


    static dateLabel(value: string): string
    {
        const [y, m, d] =
            (value ?? '').slice(0, 10).split('-').map(Number);

        return y && m && d
            ? new Date(y, m - 1, d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
            : value || '—';
    }

    dateLabel(value: string): string
    {
        return CkdDocumentsStatusList.dateLabel(value);
    }


    //===========================================================
    // Filters / Sort / Pagination
    //===========================================================

    // Source / stock / branch filters (the tabs count inside them)
    private get scopedRows():
        CkdRow[]
    {
        return this.rows.filter(
            x =>
                (!this.sourceFilter || x.Source === this.sourceFilter)
                &&
                (!this.branchFilter || x.BranchId === this.branchFilter)
                &&
                (
                    !this.stockFilter
                    || (this.stockFilter === 'Other'
                        ? x.StockStatus !== 'In Stock' && x.StockStatus !== 'Sold'
                        : x.StockStatus === this.stockFilter)
                ));
    }

    countOf(status: CkdStatus): number
    {
        return this.scopedRows.filter(x => x.CkdStatus === status).length;
    }

    applyFilters(resetPage: boolean = true): void
    {
        const keyword =
            this.searchText.trim().toLowerCase();

        this.filteredRows =
            this.scopedRows.filter(
                row =>
                    (this.selectedTab === 'All' || row.CkdStatus === this.selectedTab)
                    &&
                    (
                        !keyword
                        ||
                        [row.ChassisNo, row.EngineNo, row.ProductName, row.SourceText, row.BranchText, row.FileText, row.CustomerName, row.CkdRemarks, row.CheckedText, String(row.ManufactureYear ?? '')]
                            .join(' ')
                            .toLowerCase()
                            .includes(keyword)
                    ));

        if (resetPage)
        {
            this.currentPage = 1;
        }

        const pages =
            Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        this.updatePagination();
    }

    onTabChange(value: string): void
    {
        this.selectedTab = (value as CkdTab) || 'No';

        this.applyFilters();
    }

    onSourceFilter(value: string): void
    {
        this.sourceFilter = value ?? '';

        this.applyFilters();
    }

    onStockFilter(value: string): void
    {
        this.stockFilter = value ?? '';

        this.applyFilters();
    }

    onBranchFilter(value: number): void
    {
        this.branchFilter = Number(value) || 0;

        this.applyFilters();
    }

    onSearch(value: string): void
    {
        this.searchText = value ?? '';

        this.applyFilters();
    }

    onSort(event: { field:string; direction:'asc' | 'desc' }): void
    {
        const sign =
            event.direction === 'asc' ? 1 : -1;

        const field =
            event.field === 'CheckedText' ? 'CkdCheckedDate' : event.field;

        this.filteredRows =
            [...this.filteredRows].sort(
                (a: any, b: any) =>
                    String(a?.[field] ?? '').localeCompare(String(b?.[field] ?? ''), undefined, { numeric:true }) * sign);

        this.currentPage = 1;

        this.updatePagination();
    }

    refresh(): void
    {
        this.searchText = '';

        this.loadItems();
    }

    updatePagination(): void
    {
        const start =
            (this.currentPage - 1) * this.pageSize;

        this.pagedRows =
            [...this.filteredRows.slice(start, start + this.pageSize)];
    }

    onPageChange(page: number): void
    {
        this.currentPage = page;

        this.updatePagination();
    }

    onPageSizeChange(size: number): void
    {
        this.pageSize = size;

        this.currentPage = 1;

        this.updatePagination();
    }


    //===========================================================
    // Status : dropdown on the row
    //   No -> Yes : saved at once
    //   Yes -> No : the panel asks for the reason
    //===========================================================

    onRowStatus(row: CkdRow, event: Event): void
    {
        const select =
            event.target as HTMLSelectElement;

        const next =
            (select.value === 'Yes' ? 'Yes' : 'No') as CkdStatus;

        if (next === row.CkdStatus || this.progress.busy)
        {
            select.value = row.CkdStatus;

            return;
        }

        if (next === 'No')
        {
            // Back to the saved value until the reason is given
            select.value = row.CkdStatus;

            this.openPanel(row, 'No');

            return;
        }

        this.saveStatus(row, 'Yes', row.CkdRemarks);
    }


    // Year of manufacture : dropdown on the row, saved at once
    onRowYear(row: CkdRow, value: number): void
    {
        const year =
            Number(value) || 0;

        if (!year || year === row.ManufactureYear || this.progress.busy)
        {
            return;
        }

        this.saveStatus(row, row.CkdStatus, row.CkdRemarks ?? '', year);
    }


    private saveStatus(row: CkdRow, status: CkdStatus, remarks: string, year: number | null = null): void
    {
        this.savingKey = row.RowKey;

        const yearOnly =
            status === row.CkdStatus && remarks === (row.CkdRemarks ?? '') && !!year;

        this.progress
            .run<unknown>(
                yearOnly ? 'Saving Year of Manufacture' : 'Saving CKD Status',
                yearOnly
                    ? `Please wait while chassis ${row.ChassisNo} is set to year ${year}...`
                    : `Please wait while chassis ${row.ChassisNo} is marked CKD ${status}...`,
                yearOnly ? `Chassis ${row.ChassisNo} : year ${year}.` : `Chassis ${row.ChassisNo} : CKD ${status}.`,
                this.service.setStatus(row, { CkdStatus:status, Remarks:remarks, ManufactureYear:year }))
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.savingKey = '';

                    this.panelOpened = false;

                    if (yearOnly)
                    {
                        this.toast.success('Year Saved', `Chassis ${row.ChassisNo} : year of manufacture ${year}.`);
                    }
                    else
                    {
                        this.toast.success('CKD Status Saved', `Chassis ${row.ChassisNo} is now CKD ${status}${year && year !== row.ManufactureYear ? `, year ${year}` : ''}.`);
                    }

                    this.loadItems();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('Save CKD Status Error', error);

                    this.savingKey = '';

                    this.toast.error('Not Saved', this.errorText(error, 'The CKD status could not be changed.'));

                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // PANEL : view a chassis, change status with remarks
    //===========================================================

    panelOpened:
        boolean =
        false;

    panelRow:
        CkdRow | null =
        null;

    panelStatus:
        CkdStatus =
        'No';

    panelRemarks:
        string =
        '';

    // Year of manufacture (0 = not set)
    panelYear:
        number =
        0;

    get panelNeedsReason():
        boolean
    {
        return !!this.panelRow && this.panelRow.CkdStatus === 'Yes' && this.panelStatus === 'No';
    }

    get panelChanged():
        boolean
    {
        return !!this.panelRow
            && (this.panelStatus !== this.panelRow.CkdStatus
                || this.panelRemarks.trim() !== (this.panelRow.CkdRemarks ?? '').trim()
                || (!!this.panelYear && this.panelYear !== this.panelRow.ManufactureYear));
    }

    view(row: CkdRow): void
    {
        this.openPanel(row, row.CkdStatus);
    }

    private openPanel(row: CkdRow, status: CkdStatus): void
    {
        if (this.progress.busy)
        {
            return;
        }

        this.panelRow = row;

        this.panelStatus = status;

        // Yes -> No : a fresh reason
        this.panelRemarks = status !== row.CkdStatus ? '' : row.CkdRemarks;

        this.panelYear = row.ManufactureYear ?? 0;

        this.panelOpened = true;

        this.cdr.detectChanges();
    }

    closePanel(): void
    {
        if (this.progress.busy)
        {
            return;
        }

        this.panelOpened = false;

        this.cdr.detectChanges();
    }

    onPanelStatus(value: string): void
    {
        this.panelStatus = value === 'Yes' ? 'Yes' : 'No';
    }

    onPanelYear(value: unknown): void
    {
        this.panelYear = Number(value) || 0;
    }

    onPanelRemarks(value: string | number): void
    {
        this.panelRemarks = String(value ?? '');
    }

    savePanel(): void
    {
        const row = this.panelRow;

        if (!row || this.progress.busy)
        {
            return;
        }

        if (!this.panelChanged)
        {
            this.toast.info('No Change', `Chassis ${row.ChassisNo} is already CKD ${row.CkdStatus}${row.ManufactureYear ? `, year ${row.ManufactureYear}` : ''}.`);

            return;
        }

        if (this.panelNeedsReason && !this.panelRemarks.trim())
        {
            this.toast.warning('Reason Needed', 'Give the reason for changing Yes to No (e.g. lost by the customer after delivery : GD no.).');

            return;
        }

        this.saveStatus(
            row,
            this.panelStatus,
            this.panelRemarks.trim(),
            this.panelYear && this.panelYear !== row.ManufactureYear ? this.panelYear : null);
    }


    //===========================================================
    // History
    //===========================================================

    private showHistory(title: string, call$: ReturnType<CkdDocumentsStatusService['getHistory']>): void
    {
        call$
            .subscribe
            ({
                next:
                (response: any[]): void =>
                {
                    this.historyTitle = title;

                    this.historyItems =
                        (response ?? []).map(
                            h =>
                            ({
                                title:h.activityTitle ?? h.ActivityTitle,
                                description:h.activityDescription ?? h.ActivityDescription,
                                user:h.performedByName ?? h.PerformedByName ?? 'System',
                                dateTime:new Date(h.performedDate ?? h.PerformedDate).toLocaleString(),
                                badge:h.activityType ?? h.ActivityType
                            }));

                    this.historyOpened = true;

                    this.cdr.detectChanges();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('History Load Failed:', error);

                    this.toast.error('History', 'Failed to load the CKD documents history.');
                }
            });
    }

    openHistory(): void
    {
        this.showHistory('CKD Documents History', this.service.getHistory());
    }

    openRowHistory(): void
    {
        const row = this.panelRow;

        if (row)
        {
            this.showHistory(`Chassis ${row.ChassisNo} History`, this.service.getRowHistory(row));
        }
    }

    closeHistory(): void
    {
        this.historyOpened = false;

        this.cdr.detectChanges();
    }


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
    // Summary line
    //===========================================================

    summaryText(value: number): string
    {
        return value.toLocaleString('en-US');
    }

    get totalCount(): number
    {
        return this.scopedRows.length;
    }
}
