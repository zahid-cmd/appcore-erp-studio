//===============================================================
// Customer File Configuration (one page, NO Code Synchronization)
//
// Registration Management > Customer File. Built like
// Registration Configuration : two tabs, Name Transfer and File
// Delivery; a switch on the toolbar shows the tab's Rules (dated
// rows, a change = a new row) or its Required Documents. Add /
// Update / View in the panel on the right of the same page.
//
//   Name Transfer rules : Transfers Allowed, Fee per Transfer
//   File Delivery rules : Free Days, custody amounts (up to one
//                         year, next one year, per year above)
//
// One set of rules for all bikes. Charges post to Customer File
// Income (GLR-009-002-001-00002).
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
    HttpErrorResponse
}
from '@angular/common/http';

import
{
    CommonModule
}
from '@angular/common';

import
{
    CustomerFileTab,
    CustomerFileView,
    CustomerFileTabInfo,
    NameTransferRule,
    DeliveryRule,
    CustomerFileDocument,
    CustomerFileConfigurationDefaults,
    SaveNameTransferRule,
    SaveDeliveryRule,
    SaveCustomerFileDocument,
    CUSTOMER_FILE_TABS,
    custodyCharge
}
from '../../../models/customer-file-configuration.model';

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
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    ConfirmDialogComponent
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

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
    DatepickerComponent
}
from '../../../../../../shared/components/controls/datepicker/datepicker';

import
{
    CustomerFileConfigurationService
}
from '../../../services/customer-file-configuration.service';


//===============================================================
// Rows with their display texts
//===============================================================

type TransferRow =
    NameTransferRule
    &
    {
        DateText:string;
        FeeText:string;
    };

type DeliveryRow =
    DeliveryRule
    &
    {
        DateText:string;
        FreeDaysText:string;
        FirstText:string;
        SecondText:string;
        PerYearText:string;
    };

type DocumentRow =
    CustomerFileDocument
    &
    {
        RequiredText:string;
    };

type AnyRow =
    TransferRow | DeliveryRow | DocumentRow;

type AmountField =
    'feeText' | 'firstText' | 'secondText' | 'perYearText';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'customer-file-configuration-list',

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
        ConfirmDialogComponent,
        ProgressDialogComponent,
        ToastComponent,
        FormSectionComponent,
        TextboxComponent,
        DropdownComponent,
        DatepickerComponent
    ],

    templateUrl:'./customer-file-configuration-list.html',

    styleUrl:'./customer-file-configuration-list.css'
})


//===============================================================
// Customer File Configuration List
//===============================================================

export class CustomerFileConfigurationList
implements OnInit
{
    private readonly service =
        inject(CustomerFileConfigurationService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

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
    // Tabs : Name Transfer, its documents, File Delivery
    //===========================================================

    readonly tabInfos =
        CUSTOMER_FILE_TABS;

    // One row of tabs on the left : each process, then its
    // required documents (id = "<tab>|<view>")
    readonly tabs:
        ControlTab[] =
        // The two policies, then the documents (Name Transfer only;
        // owner 2026-11-08)
        [
            { id:'NameTransfer|Rules', label:'Name Transfer Policies' },
            { id:'FileDelivery|Rules', label:'File Delivery Policies' },
            { id:'NameTransfer|Documents', label:'Name Transfer Documents' }
        ];

    get selectedKey():
        string
    {
        return `${this.selectedTab}|${this.selectedView}`;
    }

    selectedTab:
        CustomerFileTab =
        'NameTransfer';

    selectedView:
        CustomerFileView =
        'Rules';

    get info():
        CustomerFileTabInfo
    {
        return this.infoOf(this.selectedTab);
    }

    private infoOf(tab: CustomerFileTab): CustomerFileTabInfo
    {
        return this.tabInfos.find(x => x.tab === tab) ?? this.tabInfos[0];
    }

    get isDocs():
        boolean
    {
        return this.selectedView === 'Documents';
    }

    get noun():
        string
    {
        return this.isDocs ? this.info.docNoun : this.info.ruleNoun;
    }

    get hint():
        string
    {
        return this.isDocs ? this.info.docHint : this.info.ruleHint;
    }

    get searchPlaceholder():
        string
    {
        return `Search ${this.noun.toLowerCase()}s...`;
    }


    //===========================================================
    // Data
    //===========================================================

    private transferRows:
        TransferRow[] =
        [];

    private deliveryRows:
        DeliveryRow[] =
        [];

    private documentRows:
        DocumentRow[] =
        [];

    today:
        string =
        '';

    filteredRows:
        AnyRow[] =
        [];

    pagedRows:
        AnyRow[] =
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

    historyOpened:
        boolean =
        false;

    readonly historyTitle:
        string =
        'Customer File Configuration History';

    historyItems:
        any[] =
        [];

    readonly statusItems:
        any[] =
        [
            { label:'Active', value:true },
            { label:'Inactive', value:false }
        ];

    readonly requiredItems:
        any[] =
        [
            { label:'Required', value:true },
            { label:'Optional', value:false }
        ];

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


    //===========================================================
    // Columns
    //===========================================================

    private static serial(): ListTableColumn
    {
        return { header:'#', field:'serial', type:'serial', width:'56px', align:'center' };
    }

    private static code(): ListTableColumn
    {
        return { header:'Code', field:'Code', width:'100px', align:'center' };
    }

    private static status(): ListTableColumn
    {
        return { header:'Status', field:'IsActive', type:'status', width:'140px', align:'center' };
    }

    private static actions(): ListTableColumn
    {
        return { header:'Actions', field:'actions', type:'actions', width:'130px', align:'center' };
    }

    private readonly transferColumns:
        ListTableColumn[] =
    [
        CustomerFileConfigurationList.serial(),
        CustomerFileConfigurationList.code(),
        { header:'Effective From', field:'DateText', align:'left' },
        { header:'Transfers Allowed', field:'TransfersAllowed', width:'170px', align:'center' },
        { header:'Fee per Transfer', field:'FeeText', width:'170px', align:'right' },
        { header:'Rate', field:'RateState', width:'110px', align:'center' },
        CustomerFileConfigurationList.status(),
        CustomerFileConfigurationList.actions()
    ];

    private readonly deliveryColumns:
        ListTableColumn[] =
    [
        CustomerFileConfigurationList.serial(),
        CustomerFileConfigurationList.code(),
        { header:'Effective From', field:'DateText', align:'left' },
        { header:'Free Days', field:'FreeDaysText', width:'120px', align:'center' },
        { header:'Up to One Year', field:'FirstText', width:'150px', align:'right' },
        { header:'Next One Year', field:'SecondText', width:'150px', align:'right' },
        { header:'Per Year Above', field:'PerYearText', width:'150px', align:'right' },
        { header:'Rate', field:'RateState', width:'110px', align:'center' },
        CustomerFileConfigurationList.status(),
        CustomerFileConfigurationList.actions()
    ];

    private readonly documentColumns:
        ListTableColumn[] =
    [
        CustomerFileConfigurationList.serial(),
        CustomerFileConfigurationList.code(),
        { header:'Document', field:'Name', align:'left' },
        { header:'Required', field:'RequiredText', width:'120px', align:'center' },
        { header:'Order', field:'DisplayOrder', width:'80px', align:'center' },
        CustomerFileConfigurationList.status(),
        CustomerFileConfigurationList.actions()
    ];

    get columns():
        ListTableColumn[]
    {
        return this.isDocs
            ? this.documentColumns
            : this.selectedTab === 'NameTransfer'
                ? this.transferColumns
                : this.deliveryColumns;
    }

    private get viewRows():
        AnyRow[]
    {
        return this.isDocs
            ? this.documentRows.filter(x => x.DocumentFor === this.selectedTab)
            : this.selectedTab === 'NameTransfer'
                ? this.transferRows
                : this.deliveryRows;
    }

    get viewCount():
        number
    {
        return this.viewRows.length;
    }


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

        const money = CustomerFileConfigurationList.money;

        const dateLabel = CustomerFileConfigurationList.dateLabel;

        this.service
            .getAll()
            .subscribe
            ({
                next:
                (data): void =>
                {
                    this.today = data.Today;

                    this.transferRows =
                        data.NameTransferRules.map(
                            x => ({ ...x, DateText:dateLabel(x.EffectiveFrom), FeeText:money(x.FeePerTransfer) }));

                    this.deliveryRows =
                        data.DeliveryRules.map(
                            x =>
                            ({
                                ...x,
                                DateText:dateLabel(x.EffectiveFrom),
                                FreeDaysText:`${x.FreeDays} day${x.FreeDays === 1 ? '' : 's'}`,
                                FirstText:money(x.FirstYearAmount),
                                SecondText:money(x.SecondYearAmount),
                                PerYearText:money(x.PerYearAmount)
                            }));

                    this.documentRows =
                        data.Documents.map(
                            x => ({ ...x, RequiredText:x.IsRequired ? 'Required' : 'Optional' }));

                    this.loading = false;

                    this.applyFilters(false);

                    this.cdr.detectChanges();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('Load Customer File Configuration Error:', error);

                    this.transferRows = [];
                    this.deliveryRows = [];
                    this.documentRows = [];
                    this.filteredRows = [];
                    this.pagedRows = [];

                    this.loading = false;

                    this.loadFailed = true;

                    this.toast.error('Load Failed', this.errorText(error, 'Unable to load the customer file configuration.'));

                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Formatting
    //===========================================================

    static money(value: number): string
    {
        return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
    }

    static parseDate(value: string): Date | null
    {
        const [y, m, d] =
            (value ?? '').slice(0, 10).split('-').map(Number);

        return y && m && d ? new Date(y, m - 1, d) : null;
    }

    static dateLabel(value: string): string
    {
        const date =
            CustomerFileConfigurationList.parseDate(value);

        return date
            ? date.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
            : value || '—';
    }

    static dateKey(date: Date | null): string
    {
        if (!date || isNaN(date.getTime()))
        {
            return '';
        }

        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    private static amount(text: string): number
    {
        const value =
            String(text ?? '').replace(/,/g, '').trim();

        return value === '' ? NaN : Number(value);
    }


    //===========================================================
    // Filters / Sort / Pagination
    //===========================================================

    applyFilters(resetPage: boolean = true): void
    {
        const keyword =
            this.searchText.trim().toLowerCase();

        this.filteredRows =
            this.viewRows.filter(
                row =>
                    !keyword
                    ||
                    Object.values(row)
                        .filter(v => typeof v === 'string' || typeof v === 'number')
                        .join(' ')
                        .toLowerCase()
                        .includes(keyword)
                    ||
                    (keyword === 'active' && row.IsActive)
                    ||
                    (keyword === 'inactive' && !row.IsActive));

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
        const [tab, view] =
            String(value ?? '').split('|');

        this.selectedTab = tab as CustomerFileTab;

        this.selectedView = (view === 'Documents' ? 'Documents' : 'Rules') as CustomerFileView;

        this.afterSwitch();
    }


    onViewChange(value: string): void
    {
        this.selectedView = value as CustomerFileView;

        this.afterSwitch();
    }


    private afterSwitch(): void
    {
        if (this.panelOpened && !this.progress.busy && (this.panelTab !== this.selectedTab || this.panelView !== this.selectedView))
        {
            this.panelOpened = false;
        }

        this.searchText = '';

        this.applyFilters();

        this.cdr.detectChanges();
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

        const raw: Record<string, string> =
        {
            DateText:'EffectiveFrom',
            FeeText:'FeePerTransfer',
            FreeDaysText:'FreeDays',
            FirstText:'FirstYearAmount',
            SecondText:'SecondYearAmount',
            PerYearText:'PerYearAmount'
        };

        const field =
            raw[event.field] && this.filteredRows.some(r => raw[event.field] in r)
                ? raw[event.field]
                : event.field;

        this.filteredRows =
            [...this.filteredRows].sort(
                (a: any, b: any) =>
                {
                    const x = a?.[field];

                    const y = b?.[field];

                    if (x == null && y == null) { return 0; }

                    if (x == null) { return -sign; }

                    if (y == null) { return sign; }

                    if (typeof x === 'string' && typeof y === 'string')
                    {
                        return x.localeCompare(y, undefined, { numeric:true }) * sign;
                    }

                    return (x < y ? -1 : x > y ? 1 : 0) * sign;
                });

        this.currentPage = 1;

        this.updatePagination();
    }


    refresh(): void
    {
        this.searchText = '';

        this.currentPage = 1;

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
    // FORM PANEL
    //===========================================================

    panelOpened:
        boolean =
        false;

    panelMode:
        'add' | 'edit' | 'view' =
        'add';

    panelTab:
        CustomerFileTab =
        'NameTransfer';

    panelView:
        CustomerFileView =
        'Rules';

    panelPublicId:
        string =
        '';

    code:
        string =
        '';

    // Rules
    effectiveDate:
        Date =
        new Date();

    allowedText:
        string =
        '';

    feeText:
        string =
        '';

    freeDaysText:
        string =
        '';

    firstText:
        string =
        '';

    secondText:
        string =
        '';

    perYearText:
        string =
        '';

    // Documents
    docName:
        string =
        '';

    docRequired:
        boolean =
        true;

    orderText:
        string =
        '';

    // Both
    isActive:
        boolean =
        true;

    remarks:
        string =
        '';

    // Add opened by New Rate (the values copied)
    newRateMode:
        boolean =
        false;

    get panelInfo(): CustomerFileTabInfo
    {
        return this.infoOf(this.panelTab);
    }

    get panelIsDocs(): boolean
    {
        return this.panelView === 'Documents';
    }

    get panelNoun(): string
    {
        return this.panelIsDocs ? this.panelInfo.docNoun : this.panelInfo.ruleNoun;
    }

    get panelIcon(): string
    {
        return this.panelIsDocs ? 'fas fa-file-lines' : this.panelInfo.icon;
    }

    get panelSubtitle(): string
    {
        return this.panelIsDocs ? this.panelInfo.docHint : this.panelInfo.ruleHint;
    }

    get isView(): boolean
    {
        return this.panelMode === 'view';
    }

    get panelTitle(): string
    {
        return this.panelMode === 'edit'
            ? `Update ${this.panelNoun}`
            : this.panelMode === 'view'
                ? `View ${this.panelNoun}`
                : this.newRateMode
                    ? `New Rate : ${this.panelNoun}`
                    : `Add ${this.panelNoun}`;
    }

    get saveText(): string
    {
        return this.panelMode === 'edit' ? 'Update' : 'Save';
    }

    get saveIcon(): string
    {
        return this.panelMode === 'edit' ? 'fas fa-pen-to-square' : 'fas fa-floppy-disk';
    }

    get command2Text(): string
    {
        return this.panelMode === 'add' ? 'Clear' : 'New Rate';
    }

    get command2Icon(): string
    {
        return this.panelMode === 'add' ? 'fas fa-broom' : 'fas fa-clock-rotate-left';
    }

    get command2Visible(): boolean
    {
        return this.panelMode === 'add' ? !this.newRateMode : !this.panelIsDocs;
    }


    // File Delivery : examples of the charge with the typed amounts
    get custodyExample(): string
    {
        const free =
            Number(this.freeDaysText);

        if (this.freeDaysText.trim() === '' || !Number.isInteger(free))
        {
            return 'Enter the free days and the amounts to see examples.';
        }

        const rule =
        {
            FreeDays:free,
            FirstYearAmount:CustomerFileConfigurationList.amount(this.firstText) || 0,
            SecondYearAmount:CustomerFileConfigurationList.amount(this.secondText) || 0,
            PerYearAmount:CustomerFileConfigurationList.amount(this.perYearText) || 0
        };

        const ready =
            new Date(2026, 0, 1);

        const at =
            (y: number, m: number) => new Date(2026 + y, m, 1);

        const money = CustomerFileConfigurationList.money;

        return `Example, file ready 01 Jan : collected after 6 months ${money(custodyCharge(ready, at(0, 6), rule))} · `
            + `after 1 year 3 months ${money(custodyCharge(ready, at(1, 3), rule))} · `
            + `after 2 years 3 months ${money(custodyCharge(ready, at(2, 3), rule))} · `
            + `after 3 years 1 month ${money(custodyCharge(ready, at(3, 1), rule))}.`;
    }


    //===========================================================
    // Open / Close
    //===========================================================

    add(): void
    {
        this.openPanel('add', null);
    }

    view(row: AnyRow): void
    {
        this.openPanel('view', row);
    }

    edit(row: AnyRow): void
    {
        this.openPanel('edit', row);
    }


    private openPanel(mode: 'add' | 'edit' | 'view', row: AnyRow | null): void
    {
        if (this.progress.busy)
        {
            return;
        }

        const money = CustomerFileConfigurationList.money;

        this.panelMode = mode;

        this.newRateMode = false;

        this.panelTab = this.selectedTab;

        this.panelView = this.selectedView;

        this.panelPublicId = row ? row.PublicId : '';

        this.code = row ? row.Code : '';

        this.isActive = row?.IsActive ?? true;

        this.remarks = row?.Remarks ?? '';

        if (this.panelIsDocs)
        {
            const doc = row as DocumentRow | null;

            this.docName = doc?.Name ?? '';

            this.docRequired = doc?.IsRequired ?? true;

            this.orderText = doc ? String(doc.DisplayOrder) : '';
        }
        else
        {
            const rule = row as TransferRow | DeliveryRow | null;

            this.effectiveDate =
                (rule ? CustomerFileConfigurationList.parseDate(rule.EffectiveFrom) : null)
                ?? CustomerFileConfigurationList.parseDate(this.today)
                ?? new Date();

            const transfer = this.panelTab === 'NameTransfer' ? row as TransferRow | null : null;

            const delivery = this.panelTab === 'FileDelivery' ? row as DeliveryRow | null : null;

            this.allowedText = transfer ? String(transfer.TransfersAllowed) : '1';

            this.feeText = money(transfer?.FeePerTransfer ?? 0);

            this.freeDaysText = delivery ? String(delivery.FreeDays) : '30';

            this.firstText = money(delivery?.FirstYearAmount ?? 0);

            this.secondText = money(delivery?.SecondYearAmount ?? 0);

            this.perYearText = money(delivery?.PerYearAmount ?? 0);
        }

        this.panelOpened = true;

        this.cdr.detectChanges();

        if (mode === 'add')
        {
            this.loadDefaults();
        }
    }


    private loadDefaults(): void
    {
        const tab = this.panelTab;

        const view = this.panelView;

        this.service
            .getDefaults()
            .subscribe
            ({
                next:
                (d: CustomerFileConfigurationDefaults): void =>
                {
                    if (!this.panelOpened || this.panelMode !== 'add' || this.panelTab !== tab || this.panelView !== view)
                    {
                        return;
                    }

                    if (view === 'Documents')
                    {
                        this.code = tab === 'NameTransfer' ? d.NameTransferDocumentCode : d.FileDeliveryDocumentCode;

                        if (!this.orderText)
                        {
                            this.orderText = String(tab === 'NameTransfer' ? d.NextNameTransferDocumentOrder : d.NextFileDeliveryDocumentOrder);
                        }
                    }
                    else
                    {
                        this.code = tab === 'NameTransfer' ? d.NameTransferRuleCode : d.DeliveryRuleCode;
                    }

                    this.cdr.detectChanges();
                },
                error:
                (error: unknown): void =>
                {
                    this.toast.error('Load Failed', this.errorText(error, 'The next code could not be loaded.'));
                }
            });
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


    command2(): void
    {
        if (this.panelMode === 'add')
        {
            this.clearForm();
        }
        else
        {
            this.newRate();
        }
    }


    // New Rate : Add with the values copied and today's date; the
    // open row stays (history)
    newRate(): void
    {
        if (this.progress.busy || this.panelIsDocs)
        {
            return;
        }

        this.panelMode = 'add';

        this.newRateMode = true;

        this.panelPublicId = '';

        this.code = '';

        this.effectiveDate =
            CustomerFileConfigurationList.parseDate(this.today) ?? new Date();

        this.isActive = true;

        this.remarks = '';

        this.cdr.detectChanges();

        this.loadDefaults();
    }


    clearForm(): void
    {
        if (this.panelMode !== 'add' || this.progress.busy)
        {
            return;
        }

        const code = this.code;

        const order = this.orderText;

        this.openPanel('add', null);

        this.code = code;

        this.orderText = order;
    }


    //===========================================================
    // Panel inputs
    //===========================================================

    private unwrapValue(value: any): any
    {
        return value !== null && typeof value === 'object' && 'value' in value
            ? value.value
            : value;
    }

    // Amounts : commas while typing, 2 decimals
    private cleanAmount(value: string | number): string
    {
        const text =
            String(value ?? '').replace(/[^0-9.]/g, '');

        const dot =
            text.indexOf('.');

        const whole =
            (dot >= 0 ? text.slice(0, dot) : text).replace(/^0+(?=\d)/, '').slice(0, 9);

        const decimals =
            dot >= 0 ? '.' + text.slice(dot + 1).replace(/\./g, '').slice(0, 2) : '';

        return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + decimals;
    }

    onAmountChange(field: AmountField, value: string | number): void
    {
        this[field] = this.cleanAmount(value);
    }

    onAmountBlur(field: AmountField): void
    {
        const value =
            CustomerFileConfigurationList.amount(this[field]);

        if (!isNaN(value))
        {
            this[field] = CustomerFileConfigurationList.money(value);

            this.cdr.detectChanges();
        }
    }

    onAllowedChange(value: string | number): void
    {
        this.allowedText = String(value ?? '').replace(/[^0-9]/g, '').slice(0, 2);
    }

    onFreeDaysChange(value: string | number): void
    {
        this.freeDaysText = String(value ?? '').replace(/[^0-9]/g, '').slice(0, 3);
    }

    onOrderChange(value: string | number): void
    {
        this.orderText = String(value ?? '').replace(/[^0-9]/g, '').slice(0, 4);
    }

    onDateChange(value: Date): void
    {
        this.effectiveDate = value;
    }

    onDocNameChange(value: string | number): void
    {
        this.docName = String(value ?? '');
    }

    onRequiredChange(value: any): void
    {
        this.docRequired = !!this.unwrapValue(value);
    }

    onStatusChange(value: any): void
    {
        this.isActive = !!this.unwrapValue(value);
    }

    onRemarksChange(value: string | number): void
    {
        this.remarks = String(value ?? '');
    }


    //===========================================================
    // Save
    //===========================================================

    private buildBody(): { path:string; body:any; name:string } | string
    {
        const amount = CustomerFileConfigurationList.amount;

        const orZero = (text: string) => { const v = amount(text); return isNaN(v) ? 0 : v; };

        if (this.panelIsDocs)
        {
            const name = this.docName.trim();

            if (!name)
            {
                return 'Document Name is required.';
            }

            const body: SaveCustomerFileDocument =
            {
                DocumentFor:this.panelTab,
                Name:name,
                IsRequired:this.docRequired,
                DisplayOrder:Number(this.orderText) || 0,
                Remarks:this.remarks.trim(),
                IsActive:this.isActive
            };

            return { path:'documents', body, name };
        }

        const date =
            CustomerFileConfigurationList.dateKey(this.effectiveDate);

        if (!date)
        {
            return 'Effective From is required.';
        }

        if (this.panelTab === 'NameTransfer')
        {
            const allowed = Number(this.allowedText);

            if (this.allowedText.trim() === '' || !Number.isInteger(allowed) || allowed > 20)
            {
                return 'Transfers Allowed must be a whole number from 0 to 20.';
            }

            const body: SaveNameTransferRule =
            {
                EffectiveFrom:date,
                TransfersAllowed:allowed,
                FeePerTransfer:orZero(this.feeText),
                Remarks:this.remarks.trim(),
                IsActive:this.isActive
            };

            return { path:this.panelInfo.rulePath, body, name:this.code || 'The rule' };
        }

        const free = Number(this.freeDaysText);

        if (this.freeDaysText.trim() === '' || !Number.isInteger(free) || free > 365)
        {
            return 'Free Days must be a whole number from 0 to 365.';
        }

        const body: SaveDeliveryRule =
        {
            EffectiveFrom:date,
            FreeDays:free,
            FirstYearAmount:orZero(this.firstText),
            SecondYearAmount:orZero(this.secondText),
            PerYearAmount:orZero(this.perYearText),
            Remarks:this.remarks.trim(),
            IsActive:this.isActive
        };

        return { path:this.panelInfo.rulePath, body, name:this.code || 'The rule' };
    }


    save(): void
    {
        if (this.isView || this.progress.busy)
        {
            return;
        }

        const built = this.buildBody();

        if (typeof built === 'string')
        {
            this.toast.warning('Check the Form', built);

            this.cdr.detectChanges();

            return;
        }

        const isAdd = this.panelMode === 'add';

        const noun = this.panelNoun;

        const call$ =
            isAdd
                ? this.service.create(built.path, built.body)
                : this.service.update(built.path, this.panelPublicId, built.body);

        this.progress
            .run<unknown>(
                isAdd ? `Saving ${noun}` : `Updating ${noun}`,
                `Please wait while "${built.name}" is being saved...`,
                isAdd ? `${noun} saved.` : `${noun} updated.`,
                call$)
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.panelOpened = false;

                    this.toast.success(
                        isAdd ? 'Save Successful' : 'Update Successful',
                        isAdd ? `${built.name} saved.` : `${built.name}${this.code ? ` (${this.code})` : ''} updated.`);

                    this.selectedTab = this.panelTab;

                    this.selectedView = this.panelView;

                    this.loadItems();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('Save Customer File Configuration Error', error);

                    this.toast.error('Save Failed', this.errorText(error, `The ${noun.toLowerCase()} could not be saved.`));

                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Delete / Restore (the current tab and view)
    //===========================================================

    private pathOfView(): string
    {
        return this.isDocs ? 'documents' : this.info.rulePath;
    }

    private rowLabel(row: AnyRow): string
    {
        return 'Name' in row
            ? `"${row.Name}" (${row.Code})`
            : `${row.Code} (from ${row.DateText})`;
    }


    delete(row: AnyRow): void
    {
        if (this.progress.busy)
        {
            return;
        }

        const noun = this.noun;

        const path = this.pathOfView();

        const label = this.rowLabel(row);

        this.confirmDialog.open
        (
            `Delete ${noun}`,
            `Are you sure you want to delete ${label} ?`,
            (): void =>
            {
                setTimeout(() => this.deleteItem(row, path, noun, label));
            }
        );
    }


    private deleteItem(row: AnyRow, path: string, noun: string, label: string): void
    {
        this.progress
            .run(
                `Deleting ${noun}`,
                `Please wait while ${label} is being deleted...`,
                `${noun} deleted.`,
                this.service.delete(path, row.PublicId))
            .subscribe
            ({
                next:
                (): void =>
                {
                    if (this.panelOpened && this.panelMode !== 'add' && this.panelPublicId === row.PublicId)
                    {
                        this.panelOpened = false;
                    }

                    this.toast.success('Delete Successful', `${label} deleted.`);

                    this.loadItems();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('Delete Customer File Configuration Error:', error);

                    if (error instanceof HttpErrorResponse && error.status === 409)
                    {
                        this.toast.info('Delete Blocked', this.errorText(error, `${noun} cannot be deleted.`));

                        return;
                    }

                    this.toast.error('Delete Failed', this.errorText(error, `Failed to delete the ${noun.toLowerCase()}.`));
                }
            });
    }


    restore(): void
    {
        if (this.progress.busy)
        {
            return;
        }

        const noun = this.noun;

        const path = this.pathOfView();

        const list = this.isDocs ? this.selectedTab : '';

        this.confirmDialog.open
        (
            `Restore ${noun}`,
            `Restore the most recently deleted ${noun.toLowerCase()}?`,
            (): void =>
            {
                setTimeout(() => this.restoreItem(path, list, noun));
            },
            'Restore',
            'Cancel',
            'primary'
        );
    }


    private restoreItem(path: string, list: string, noun: string): void
    {
        this.progress
            .run<unknown>(
                'Restoring',
                `Please wait while the most recently deleted ${noun.toLowerCase()} is being restored...`,
                'Record restored.',
                this.service.restore(path, list))
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.toast.success('Restore Successful', `The most recently deleted ${noun.toLowerCase()} has been restored.`);

                    this.loadItems();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('Restore Customer File Configuration Error:', error);

                    if (error instanceof HttpErrorResponse && error.status === 404)
                    {
                        this.toast.info('No Data to Restore', `There is no deleted ${noun.toLowerCase()} to restore.`);

                        return;
                    }

                    if (error instanceof HttpErrorResponse && error.status === 409)
                    {
                        this.toast.info('Restore Blocked', this.errorText(error, 'The record cannot be restored.'));

                        return;
                    }

                    this.toast.error('Restore Failed', this.errorText(error, 'Failed to restore the record.'));
                }
            });
    }


    //===========================================================
    // History
    //===========================================================

    openHistory(): void
    {
        this.service
            .getHistory()
            .subscribe
            ({
                next:
                (response: any[]): void =>
                {
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

                    this.toast.error('History', 'Failed to load the customer file configuration history.');
                }
            });
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

    get summaryTotal(): number
    {
        return this.viewRows.length;
    }

    get summaryActive(): number
    {
        return this.viewRows.filter(x => x.IsActive).length;
    }

    get summaryNote(): string
    {
        if (this.isDocs)
        {
            const rows = this.viewRows as DocumentRow[];

            return `Required ${rows.filter(x => x.IsRequired && x.IsActive).length} · Optional ${rows.filter(x => !x.IsRequired && x.IsActive).length}`;
        }

        const rows = this.viewRows as (TransferRow | DeliveryRow)[];

        return `Current ${rows.filter(x => x.RateState === 'Current').length} · Upcoming ${rows.filter(x => x.RateState === 'Upcoming').length}`;
    }

    summaryText(value: number): string
    {
        return value.toLocaleString('en-US');
    }
}
