//===============================================================
// Warranty Configuration (one page, NO Code Synchronization)
//
// Warranty Management > Warranty Control. Built like Enquiry
// Setup / Registration Configuration : three tabs, one list each;
// Add / Update / View in the form panel on the right of the same
// page (the list shrinks to the left). Delete and Restore act on
// the current tab.
//
//   Warranty Parts      the parts a coverage can name
//   Warranty Policies   per brand (optional model) : Effective
//                       From / To (empty = open-ended), the
//                       whole-bike period + km, terms, exclusions.
//                       Policies of one brand / model may not
//                       overlap in dates.
//   Warranty Coverages  part-level warranty of a policy (battery,
//                       motor ...), each with its own period
//
// A period = number + Days / Months / Years and an optional km
// limit (the warranty ends at whichever comes first).
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
    Observable
}
from 'rxjs';


//===============================================================
// Models
//===============================================================

import
{
    WarrantyConfigTab,
    WarrantyTabInfo,
    WarrantyPart,
    WarrantyPolicy,
    WarrantyCoverage,
    WarrantyLookup,
    WarrantyConfigurationDefaults,
    WarrantyPeriodUnit,
    SaveWarrantyPart,
    SaveWarrantyPolicy,
    SaveWarrantyCoverage,
    WARRANTY_TABS,
    WARRANTY_UNITS
}
from '../../../models/warranty-configuration.model';


//===============================================================
// Shared Components
//===============================================================

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
    TextareaComponent
}
from '../../../../../../shared/components/controls/textarea/textarea';

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


//===============================================================
// Service
//===============================================================

import
{
    WarrantyConfigurationService
}
from '../../../services/warranty-configuration.service';


//===============================================================
// Rows with their display texts
//===============================================================

type PartRow =
    WarrantyPart
    &
    {
        UsedText:string;
    };

type PolicyRow =
    WarrantyPolicy
    &
    {
        DateText:string;
        RangeText:string;
        ScopeText:string;
        WarrantyText:string;
        PartsText:string;
        StateText:string;
    };

type CoverageRow =
    WarrantyCoverage
    &
    {
        PolicyText:string;
        PeriodText:string;
        KmText:string;
        StateText:string;
    };

type AnyRow =
    PartRow | PolicyRow | CoverageRow;


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'warranty-configuration-list',

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
        TextareaComponent,
        DropdownComponent,
        DatepickerComponent
    ],

    templateUrl:'./warranty-configuration-list.html',

    styleUrl:'./warranty-configuration-list.css'
})


//===============================================================
// Warranty Configuration List
//===============================================================

export class WarrantyConfigurationList
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly service =
        inject(WarrantyConfigurationService);

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
    // Tabs
    //===========================================================

    readonly tabInfos:
        WarrantyTabInfo[] =
        WARRANTY_TABS;

    readonly tabs:
        ControlTab[] =
        WARRANTY_TABS.map(
            x =>
            ({
                id:x.tab,
                label:x.tabLabel
            })
        );

    selectedTab:
        WarrantyConfigTab =
        'Policies';

    get info():
        WarrantyTabInfo
    {
        return this.infoOf(this.selectedTab);
    }

    private infoOf
    (
        tab:
            WarrantyConfigTab
    ):
        WarrantyTabInfo
    {
        return this.tabInfos.find(x => x.tab === tab) ?? this.tabInfos[0];
    }


    //===========================================================
    // Data (every tab in one call)
    //===========================================================

    private partRows:
        PartRow[] =
        [];

    private policyRows:
        PolicyRow[] =
        [];

    private coverageRows:
        CoverageRow[] =
        [];

    private brands:
        WarrantyLookup[] =
        [];

    private models:
        WarrantyLookup[] =
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

    // Policies : one brand ('' = all)
    brandFilter:
        string =
        '';

    // Coverages : one policy ('' = all)
    policyFilter:
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


    //===========================================================
    // History
    //===========================================================

    historyOpened:
        boolean =
        false;

    readonly historyTitle:
        string =
        'Warranty Configuration History';

    historyItems:
        any[] =
        [];


    //===========================================================
    // Fixed dropdown items
    //===========================================================

    readonly unitItems =
        WARRANTY_UNITS;

    readonly statusItems:
        any[] =
        [
            { label:'Active', value:true },
            { label:'Inactive', value:false }
        ];


    //===========================================================
    // Page Canvas Configuration
    //===========================================================

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
    // Columns (stable arrays, one per tab)
    //===========================================================

    private static serial():
        ListTableColumn
    {
        return { header:'#', field:'serial', type:'serial', width:'56px', align:'center' };
    }

    private static code():
        ListTableColumn
    {
        return { header:'Code', field:'Code', width:'100px', align:'center' };
    }

    private static status():
        ListTableColumn
    {
        return { header:'Status', field:'IsActive', type:'status', width:'110px', align:'center' };
    }

    private static actions():
        ListTableColumn
    {
        return { header:'Actions', field:'actions', type:'actions', width:'120px', align:'center' };
    }

    private readonly partColumns:
        ListTableColumn[] =
    [
        WarrantyConfigurationList.serial(),
        WarrantyConfigurationList.code(),
        { header:'Part Name', field:'Name', width:'240px', align:'left' },
        { header:'Used By', field:'UsedText', width:'150px', align:'center' },
        { header:'Order', field:'DisplayOrder', width:'80px', align:'center' },
        { header:'Remarks', field:'Remarks', align:'left' },
        WarrantyConfigurationList.status(),
        WarrantyConfigurationList.actions()
    ];

    private readonly policyColumns:
        ListTableColumn[] =
    [
        WarrantyConfigurationList.serial(),
        WarrantyConfigurationList.code(),
        { header:'Policy Name', field:'Name', align:'left' },
        { header:'Brand / Model', field:'ScopeText', width:'200px', align:'left' },
        { header:'Effective', field:'RangeText', width:'230px', align:'center' },
        { header:'Whole Bike', field:'WarrantyText', width:'190px', align:'center' },
        { header:'Parts', field:'PartsText', width:'90px', align:'center' },
        { header:'Policy', field:'StateText', width:'95px', align:'center' },
        WarrantyConfigurationList.status(),
        WarrantyConfigurationList.actions()
    ];

    private readonly coverageColumns:
        ListTableColumn[] =
    [
        WarrantyConfigurationList.serial(),
        WarrantyConfigurationList.code(),
        { header:'Policy', field:'PolicyText', align:'left' },
        { header:'Brand / Model', field:'ScopeText', width:'200px', align:'left' },
        { header:'Part', field:'PartName', width:'170px', align:'left' },
        { header:'Period', field:'PeriodText', width:'110px', align:'center' },
        { header:'Km Limit', field:'KmText', width:'110px', align:'right' },
        { header:'Policy State', field:'StateText', width:'110px', align:'center' },
        WarrantyConfigurationList.status(),
        WarrantyConfigurationList.actions()
    ];

    get columns():
        ListTableColumn[]
    {
        switch (this.selectedTab)
        {
            case 'Parts':
                return this.partColumns;

            case 'Coverages':
                return this.coverageColumns;

            default:
                return this.policyColumns;
        }
    }

    readonly tableActions =
        { view:true, edit:true, delete:true };

    get searchPlaceholder():
        string
    {
        return `Search ${this.info.tabLabel.toLowerCase()}...`;
    }

    // Policies toolbar : all brands or one
    get brandFilterItems():
        any[]
    {
        return [
            { label:'All Brands', value:'' },
            ...this.brands.map(x => ({ label:x.Name, value:x.PublicId }))
        ];
    }

    // Coverages toolbar : all policies or one
    get policyFilterItems():
        any[]
    {
        return [
            { label:'All Policies', value:'' },
            ...this.policyRows.map(x => ({ label:WarrantyConfigurationList.policyLabel(x), value:x.PublicId }))
        ];
    }

    private get tabRows():
        AnyRow[]
    {
        switch (this.selectedTab)
        {
            case 'Parts':
                return this.partRows;

            case 'Coverages':
                return this.coverageRows;

            default:
                return this.policyRows;
        }
    }

    get tabCount():
        number
    {
        return this.tabRows.length;
    }


    //===========================================================
    // Initialize / Load
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

                    this.brands = data.Brands;

                    this.models = data.Models;

                    this.partRows =
                        data.Parts.map(
                            x =>
                            ({
                                ...x,
                                UsedText:
                                    x.CoverageCount > 0
                                        ? `${x.CoverageCount} coverage${x.CoverageCount === 1 ? '' : 's'}`
                                        : 'Not used'
                            })
                        );

                    this.policyRows =
                        data.Policies.map(
                            x =>
                            ({
                                ...x,
                                DateText:WarrantyConfigurationList.dateLabel(x.EffectiveFrom),
                                RangeText:WarrantyConfigurationList.rangeText(x.EffectiveFrom, x.EffectiveTo),
                                ScopeText:`${x.BrandName || '—'} · ${x.ModelName || 'All models'}`,
                                WarrantyText:WarrantyConfigurationList.warrantyText(x.PeriodValue, x.PeriodUnit, x.KmLimit),
                                PartsText:x.CoverageCount > 0 ? String(x.CoverageCount) : '—',
                                StateText:x.PolicyState
                            })
                        );

                    this.coverageRows =
                        data.Coverages.map(
                            x =>
                            ({
                                ...x,
                                PolicyText:`${x.PolicyCode} · ${x.PolicyName}`,
                                PeriodText:WarrantyConfigurationList.periodText(x.PeriodValue, x.PeriodUnit),
                                KmText:x.KmLimit == null ? 'No limit' : `${x.KmLimit.toLocaleString('en-US')} km`,
                                StateText:x.PolicyState
                            })
                        );

                    // A filtered brand / policy that is gone : back to all
                    if (this.brandFilter && !this.brands.some(x => x.PublicId === this.brandFilter))
                    {
                        this.brandFilter = '';
                    }

                    if (this.policyFilter && !this.policyRows.some(x => x.PublicId === this.policyFilter))
                    {
                        this.policyFilter = '';
                    }

                    this.loading = false;

                    this.applyFilters(false);

                    this.cdr.detectChanges();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('Load Warranty Configuration Error:', error);

                    this.partRows = [];
                    this.policyRows = [];
                    this.coverageRows = [];
                    this.filteredRows = [];
                    this.pagedRows = [];

                    this.loading = false;

                    this.loadFailed = true;

                    this.toast.error(
                        'Load Failed',
                        this.errorText(error, 'Unable to load the warranty configuration.')
                    );

                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Formatting helpers
    //===========================================================

    // 2, "Years" -> "2 Years" (1 -> "1 Year")
    static periodText
    (
        value:
            number | null,
        unit:
            string
    ):
        string
    {
        if (value == null || !unit)
        {
            return '—';
        }

        return `${value} ${value === 1 ? unit.replace(/s$/, '') : unit}`;
    }

    // "WPO-001 · Revoo Warranty (01 Jul 2024 - open)"
    static policyLabel
    (
        x:
            PolicyRow
    ):
        string
    {
        return `${x.Code} · ${x.Name} (${x.RangeText}${x.PolicyState === 'Current' ? '' : ', ' + x.PolicyState.toLowerCase()})`;
    }

    // "01 Jul 2024 - 30 Jun 2026" / "01 Jul 2024 - open"
    static rangeText
    (
        from:
            string,
        to:
            string
    ):
        string
    {
        return `${WarrantyConfigurationList.dateLabel(from)} - ${to ? WarrantyConfigurationList.dateLabel(to) : 'open'}`;
    }

    // "2 Years / 20,000 km"
    static warrantyText
    (
        value:
            number | null,
        unit:
            string,
        km:
            number | null
    ):
        string
    {
        const period =
            WarrantyConfigurationList.periodText(value, unit);

        return km == null || period === '—'
            ? period
            : `${period} / ${km.toLocaleString('en-US')} km`;
    }

    // "2026-11-08" -> "08 Nov 2026"
    static dateLabel
    (
        value:
            string
    ):
        string
    {
        const date =
            WarrantyConfigurationList.parseDate(value);

        return date
            ? date.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
            : value || '—';
    }

    // "yyyy-MM-dd" -> local Date (no time zone shift)
    static parseDate
    (
        value:
            string
    ):
        Date | null
    {
        const [y, m, d] =
            (value ?? '').slice(0, 10).split('-').map(Number);

        return y && m && d
            ? new Date(y, m - 1, d)
            : null;
    }

    // local Date -> "yyyy-MM-dd"
    static dateKey
    (
        date:
            Date | null
    ):
        string
    {
        if (!date || isNaN(date.getTime()))
        {
            return '';
        }

        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    // Typed whole number -> number (null when empty)
    private static whole
    (
        text:
            string
    ):
        number | null
    {
        const value =
            String(text ?? '').replace(/,/g, '').trim();

        return value === '' ? null : Number(value);
    }


    //===========================================================
    // Filters / Sort / Pagination
    //===========================================================

    applyFilters
    (
        resetPage:
            boolean = true
    ):
        void
    {
        const keyword =
            this.searchText.trim().toLowerCase();

        let rows =
            this.tabRows;

        if (this.selectedTab === 'Policies' && this.brandFilter)
        {
            rows =
                (rows as PolicyRow[])
                    .filter(x => x.BrandPublicId === this.brandFilter);
        }

        if (this.selectedTab === 'Coverages' && this.policyFilter)
        {
            rows =
                (rows as CoverageRow[])
                    .filter(x => x.PolicyPublicId === this.policyFilter);
        }

        this.filteredRows =
            rows.filter(
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
                    (keyword === 'inactive' && !row.IsActive)
            );

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


    onTabChange
    (
        value:
            string
    ):
        void
    {
        this.selectedTab =
            value as WarrantyConfigTab;

        if (this.panelOpened && !this.progress.busy && this.panelTab !== this.selectedTab)
        {
            this.panelOpened = false;
        }

        this.searchText = '';

        this.applyFilters();

        this.cdr.detectChanges();
    }


    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText = value ?? '';

        this.applyFilters();
    }


    onBrandFilterChange
    (
        value:
            any
    ):
        void
    {
        this.brandFilter =
            String(this.unwrapValue(value) ?? '');

        this.applyFilters();

        this.cdr.detectChanges();
    }


    onPolicyFilterChange
    (
        value:
            any
    ):
        void
    {
        this.policyFilter =
            String(this.unwrapValue(value) ?? '');

        this.applyFilters();

        this.cdr.detectChanges();
    }


    // A policy row : open its coverages
    showCoverages
    (
        row:
            PolicyRow
    ):
        void
    {
        this.policyFilter = row.PublicId;

        this.onTabChange('Coverages');
    }


    onSort
    (
        event:
        {
            field:string;
            direction:'asc' | 'desc';
        }
    ):
        void
    {
        const sign =
            event.direction === 'asc' ? 1 : -1;

        // Text columns of dates / numbers : sort by the raw value
        const raw: Record<string, string> =
        {
            DateText:'EffectiveFrom',
            RangeText:'EffectiveFrom',
            PartsText:'CoverageCount',
            UsedText:'CoverageCount',
            KmText:'KmLimit'
        };

        const field =
            raw[event.field] ?? event.field;

        this.filteredRows =
            [...this.filteredRows].sort(
                (a: any, b: any) =>
                {
                    const x = a?.[field];

                    const y = b?.[field];

                    if (x == null && y == null)
                    {
                        return 0;
                    }

                    if (x == null)
                    {
                        return -sign;
                    }

                    if (y == null)
                    {
                        return sign;
                    }

                    if (typeof x === 'string' && typeof y === 'string')
                    {
                        return x.localeCompare(y, undefined, { numeric:true }) * sign;
                    }

                    return (x < y ? -1 : x > y ? 1 : 0) * sign;
                }
            );

        this.currentPage = 1;

        this.updatePagination();
    }


    refresh():
        void
    {
        this.searchText = '';

        this.currentPage = 1;

        this.loadItems();
    }


    updatePagination():
        void
    {
        const start =
            (this.currentPage - 1) * this.pageSize;

        this.pagedRows =
            [...this.filteredRows.slice(start, start + this.pageSize)];
    }


    onPageChange
    (
        page:
            number
    ):
        void
    {
        this.currentPage = page;

        this.updatePagination();
    }


    onPageSizeChange
    (
        size:
            number
    ):
        void
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
        WarrantyConfigTab =
        'Policies';

    // The record open in the panel (edit / view)
    panelPublicId:
        string =
        '';

    code:
        string =
        '';

    // Parts
    partDraft =
    {
        Name:'',
        IsActive:true,
        Remarks:''
    };

    displayOrderText:
        string =
        '';

    // Policies
    policyName:
        string =
        '';

    // The name follows brand / model until typed by hand
    private nameTyped:
        boolean =
        false;

    brandId:
        string =
        '';

    modelId:
        string =
        '';

    effectiveDate:
        Date =
        new Date();

    // Effective To : open-ended or a date
    endsMode:
        'open' | 'date' =
        'open';

    effectiveToDate:
        Date =
        new Date();

    readonly endsItems:
        any[] =
        [
            { label:'Open-ended', value:'open' },
            { label:'On a date', value:'date' }
        ];

    terms:
        string =
        '';

    exclusions:
        string =
        '';

    policyRemarks:
        string =
        '';

    policyActive:
        boolean =
        true;

    // Coverages
    coveragePolicyId:
        string =
        '';

    coveragePartId:
        string =
        '';

    // Policy (whole bike) and coverage (part) : the period
    periodText:
        string =
        '';

    periodUnit:
        WarrantyPeriodUnit =
        'Years';

    kmText:
        string =
        '';

    coverageNotes:
        string =
        '';

    coverageActive:
        boolean =
        true;


    get panelInfo():
        WarrantyTabInfo
    {
        return this.infoOf(this.panelTab);
    }

    get isView():
        boolean
    {
        return this.panelMode === 'view';
    }

    get panelTitle():
        string
    {
        const noun =
            this.panelInfo.noun;

        return this.panelMode === 'edit'
            ? `Update ${noun}`
            : this.panelMode === 'view'
                ? `View ${noun}`
                : `Add ${noun}`;
    }

    get panelSubtitle():
        string
    {
        return this.panelInfo.hint;
    }

    get saveText():
        string
    {
        return this.panelMode === 'edit' ? 'Update' : 'Save';
    }

    get saveIcon():
        string
    {
        return this.panelMode === 'edit' ? 'fas fa-pen-to-square' : 'fas fa-floppy-disk';
    }

    // Brand / model, policy / part : locked after saving
    get scopeLocked():
        boolean
    {
        return this.panelMode !== 'add' || this.progress.busy;
    }

    get controlsOff():
        boolean
    {
        return this.isView || this.progress.busy;
    }


    //===========================================================
    // Panel dropdown items
    //===========================================================

    // Active brands (the row's own brand always stays)
    get brandItems():
        any[]
    {
        return this.brands
            .filter(x => x.IsActive || x.PublicId === this.brandId)
            .map(x => ({ label:x.Name, value:x.PublicId }));
    }

    // The chosen brand's models, plus "All models"
    get modelItems():
        any[]
    {
        return [
            { label:'All models of the brand', value:'' },
            ...this.models
                .filter(x => x.ParentPublicId === this.brandId && (x.IsActive || x.PublicId === this.modelId))
                .map(x => ({ label:x.Name, value:x.PublicId }))
        ];
    }

    // Policies for a coverage : active ones (the row's own stays)
    get coveragePolicyItems():
        any[]
    {
        return this.policyRows
            .filter(x => x.IsActive || x.PublicId === this.coveragePolicyId)
            .map(x => ({ label:`${WarrantyConfigurationList.policyLabel(x)} · ${x.ScopeText}`, value:x.PublicId }));
    }

    // Parts not covered yet by the chosen policy (the row's own stays)
    get partItems():
        any[]
    {
        const taken =
            new Set(
                this.coverageRows
                    .filter(x => x.PolicyPublicId === this.coveragePolicyId && x.PublicId !== this.panelPublicId)
                    .map(x => x.PartPublicId));

        return this.partRows
            .filter(x => (x.IsActive && !taken.has(x.PublicId)) || x.PublicId === this.coveragePartId)
            .map(x => ({ label:x.Name, value:x.PublicId }));
    }


    //===========================================================
    // Live checks / hints
    //===========================================================

    get periodError():
        string
    {
        const value =
            WarrantyConfigurationList.whole(this.periodText);

        if (value != null && value <= 0)
        {
            return 'Period must be more than 0.';
        }

        const max =
            this.periodUnit === 'Days' ? 3660 : this.periodUnit === 'Months' ? 120 : 10;

        if (value != null && value > max)
        {
            return `Period cannot be more than ${max} ${this.periodUnit.toLowerCase()} (10 years).`;
        }

        const km =
            WarrantyConfigurationList.whole(this.kmText);

        if (km != null && km > 1000000)
        {
            return 'The km limit cannot be more than 1,000,000.';
        }

        return '';
    }

    get periodHint():
        string
    {
        const value =
            WarrantyConfigurationList.whole(this.periodText);

        const km =
            WarrantyConfigurationList.whole(this.kmText);

        if (value == null)
        {
            return 'Enter the period. Add a km limit if the warranty also ends at a mileage.';
        }

        const text =
            WarrantyConfigurationList.periodText(value, this.periodUnit);

        const what =
            this.panelTab === 'Policies' ? 'The whole bike is covered for' : 'This part is covered for';

        return km != null
            ? `${what} ${text} or ${km.toLocaleString('en-US')} km, whichever comes first.`
            : `${what} ${text}, no km limit.`;
    }

    // Effective To must not be before Effective From
    get datesError():
        string
    {
        return this.endsMode === 'date'
            && WarrantyConfigurationList.dateKey(this.effectiveToDate) < WarrantyConfigurationList.dateKey(this.effectiveDate)
            ? 'Effective To cannot be before Effective From.'
            : '';
    }

    // The policy's whole-bike period and its other parts (hint)
    get coverageHint():
        string
    {
        const policy =
            this.policyRows.find(x => x.PublicId === this.coveragePolicyId);

        if (!policy)
        {
            return 'Choose the policy, then the part.';
        }

        const others =
            this.coverageRows
                .filter(x => x.PolicyPublicId === this.coveragePolicyId && x.PublicId !== this.panelPublicId)
                .map(x => x.PartName);

        return `The whole bike is covered for ${policy.WarrantyText}. This part's warranty wins over it for this part.`
            + (others.length > 0 ? ` Parts already set : ${others.join(', ')}.` : '');
    }

    // Overlap with another active policy of the same brand / model
    get policyInForceHint():
        string
    {
        if (this.panelTab !== 'Policies' || this.isView)
        {
            return '';
        }

        if (!this.brandId)
        {
            return 'Choose the brand and the dates of the policy.';
        }

        if (!this.policyActive)
        {
            return 'Inactive : not used for new sales, and its dates are not checked.';
        }

        const from =
            WarrantyConfigurationList.dateKey(this.effectiveDate);

        const to =
            this.endsMode === 'date' ? WarrantyConfigurationList.dateKey(this.effectiveToDate) : '9999-12-31';

        const other =
            this.policyRows
                .filter(
                    x =>
                        x.IsActive
                        && x.PublicId !== this.panelPublicId
                        && x.BrandPublicId === this.brandId
                        && x.BikeModelPublicId === this.modelId
                        && x.EffectiveFrom <= to
                        && (!x.EffectiveTo || x.EffectiveTo >= from))
                .sort((a, b) => a.EffectiveFrom.localeCompare(b.EffectiveFrom))[0];

        if (other)
        {
            return other.EffectiveTo
                ? `The dates overlap ${other.Code} (${other.RangeText}). Change the dates so they do not overlap.`
                : `${other.Code} runs ${other.RangeText}. Set its Effective To before this policy starts.`;
        }

        return 'No other policy of this brand / model in these dates.';
    }

    get policyInForceError():
        boolean
    {
        return this.policyInForceHint.includes('overlap') || this.policyInForceHint.includes('Set its Effective To');
    }


    //===========================================================
    // Open / Close
    //===========================================================

    add():
        void
    {
        if (this.selectedTab === 'Policies' && this.brands.length === 0)
        {
            this.toast.info(
                'No Brands',
                'Add a brand in Product Settings > Brand Management first.'
            );

            return;
        }

        if (this.selectedTab === 'Coverages' && !this.policyRows.some(x => x.IsActive))
        {
            this.toast.info(
                'No Policies',
                'Add a warranty policy on the Warranty Policies tab first.'
            );

            return;
        }

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


    private openPanel
    (
        mode:
            'add' | 'edit' | 'view',
        row:
            AnyRow | null
    ):
        void
    {
        if (this.progress.busy)
        {
            return;
        }

        this.panelMode = mode;

        this.panelTab = this.selectedTab;

        this.panelPublicId = row ? row.PublicId : '';

        this.code = row ? row.Code : '';

        switch (this.panelTab)
        {
            case 'Parts':
                this.fillPart(row as PartRow | null);
                break;

            case 'Coverages':
                this.fillCoverage(row as CoverageRow | null);
                break;

            default:
                this.fillPolicy(row as PolicyRow | null);
        }

        this.panelOpened = true;

        this.cdr.detectChanges();

        if (mode === 'add')
        {
            this.loadDefaults(this.panelTab);
        }
    }


    private fillPart(row: PartRow | null): void
    {
        this.partDraft =
        {
            Name:row?.Name ?? '',
            IsActive:row?.IsActive ?? true,
            Remarks:row?.Remarks ?? ''
        };

        this.displayOrderText = row ? String(row.DisplayOrder) : '';
    }


    private fillPolicy(row: PolicyRow | null): void
    {
        // New policy : the brand filtered on the toolbar, else the first
        this.brandId =
            row?.BrandPublicId
            ?? (this.brandFilter || this.brands.find(x => x.IsActive)?.PublicId || '');

        this.modelId = row?.BikeModelPublicId ?? '';

        this.effectiveDate =
            (row ? WarrantyConfigurationList.parseDate(row.EffectiveFrom) : null)
            ?? WarrantyConfigurationList.parseDate(this.today)
            ?? new Date();

        this.endsMode = row?.EffectiveTo ? 'date' : 'open';

        this.effectiveToDate =
            (row?.EffectiveTo ? WarrantyConfigurationList.parseDate(row.EffectiveTo) : null)
            ?? this.effectiveDate;

        this.periodText = row ? String(row.PeriodValue) : '';

        this.periodUnit = row?.PeriodUnit ?? 'Years';

        this.kmText = row?.KmLimit == null ? '' : String(row.KmLimit);

        this.terms = row?.Terms ?? '';

        this.exclusions = row?.Exclusions ?? '';

        this.policyRemarks = row?.Remarks ?? '';

        this.policyActive = row?.IsActive ?? true;

        this.policyName = row?.Name ?? '';

        this.nameTyped = !!row;

        if (!row)
        {
            this.policyName = this.suggestedName();
        }
    }


    private fillCoverage(row: CoverageRow | null): void
    {
        // New coverage : the policy filtered on the toolbar, else the
        // first current one
        this.coveragePolicyId =
            row?.PolicyPublicId
            ?? (this.policyFilter
                || this.policyRows.find(x => x.IsActive && x.PolicyState === 'Current')?.PublicId
                || this.policyRows.find(x => x.IsActive)?.PublicId
                || '');

        this.coveragePartId = row?.PartPublicId ?? '';

        this.periodText = row ? String(row.PeriodValue) : '';

        this.periodUnit = row?.PeriodUnit ?? 'Years';

        this.kmText = row?.KmLimit == null ? '' : String(row.KmLimit);

        this.coverageNotes = row?.Notes ?? '';

        this.coverageActive = row?.IsActive ?? true;

        // New : the first part not covered yet
        if (!row)
        {
            this.coveragePartId = this.partItems[0]?.value ?? '';
        }
    }


    // Add : the next code (and part order)
    private loadDefaults(tab: WarrantyConfigTab): void
    {
        this.service
            .getDefaults()
            .subscribe
            ({
                next:
                (d: WarrantyConfigurationDefaults): void =>
                {
                    if (!this.panelOpened || this.panelMode !== 'add' || this.panelTab !== tab)
                    {
                        return;
                    }

                    this.code =
                        tab === 'Parts'
                            ? d.PartCode
                            : tab === 'Coverages'
                                ? d.CoverageCode
                                : d.PolicyCode;

                    if (tab === 'Parts' && !this.displayOrderText)
                    {
                        this.displayOrderText = String(d.NextPartOrder);
                    }

                    this.cdr.detectChanges();
                },
                error:
                (error: unknown): void =>
                {
                    this.toast.error('Load Failed', this.errorText(error, 'The next code could not be loaded.'));

                    this.cdr.detectChanges();
                }
            });
    }


    closePanel():
        void
    {
        if (this.progress.busy)
        {
            return;
        }

        this.panelOpened = false;

        this.cdr.detectChanges();
    }


    clearForm():
        void
    {
        if (this.panelMode !== 'add' || this.progress.busy)
        {
            return;
        }

        const code = this.code;

        const order = this.displayOrderText;

        this.openPanel('add', null);

        this.code = code;

        this.displayOrderText = order;
    }


    //===========================================================
    // Panel inputs
    //===========================================================

    // A dropdown may emit the value or the whole { label, value } item
    private unwrapValue(value: any): any
    {
        return value !== null && typeof value === 'object' && 'value' in value
            ? value.value
            : value;
    }

    private static digits(value: string | number, max: number): string
    {
        return String(value ?? '').replace(/[^0-9]/g, '').slice(0, max);
    }

    // Parts
    onPartNameChange(value: string | number): void
    {
        this.partDraft.Name = String(value ?? '');
    }

    onDisplayOrderChange(value: string | number): void
    {
        this.displayOrderText = WarrantyConfigurationList.digits(value, 4);
    }

    onPartStatusChange(value: any): void
    {
        this.partDraft.IsActive = !!this.unwrapValue(value);
    }

    onPartRemarksChange(value: string | number): void
    {
        this.partDraft.Remarks = String(value ?? '');
    }

    // Policies : the name follows brand / model
    private suggestedName():
        string
    {
        const brand =
            this.brands.find(x => x.PublicId === this.brandId)?.Name ?? '';

        const model =
            this.models.find(x => x.PublicId === this.modelId)?.Name ?? '';

        return brand
            ? `${brand}${model ? ' ' + model : ''} Warranty`
            : '';
    }

    private refreshName(): void
    {
        if (!this.nameTyped)
        {
            this.policyName = this.suggestedName();
        }
    }

    onPolicyNameChange(value: string | number): void
    {
        this.policyName = String(value ?? '');

        this.nameTyped = this.policyName.trim() !== '' && this.policyName !== this.suggestedName();
    }

    onBrandChange(value: any): void
    {
        const brand =
            String(this.unwrapValue(value) ?? '');

        if (brand !== this.brandId)
        {
            this.brandId = brand;

            this.modelId = '';
        }

        this.refreshName();
    }

    onModelChange(value: any): void
    {
        this.modelId = String(this.unwrapValue(value) ?? '');

        this.refreshName();
    }

    onDateChange(value: Date): void
    {
        this.effectiveDate = value;
    }

    onEndsChange(value: any): void
    {
        this.endsMode = this.unwrapValue(value) === 'date' ? 'date' : 'open';

        // A new end date starts at the From date
        if (this.endsMode === 'date' && WarrantyConfigurationList.dateKey(this.effectiveToDate) < WarrantyConfigurationList.dateKey(this.effectiveDate))
        {
            this.effectiveToDate = this.effectiveDate;
        }
    }

    onToDateChange(value: Date): void
    {
        this.effectiveToDate = value;
    }

    onTermsChange(value: string): void
    {
        this.terms = String(value ?? '');
    }

    onExclusionsChange(value: string): void
    {
        this.exclusions = String(value ?? '');
    }

    onPolicyStatusChange(value: any): void
    {
        this.policyActive = !!this.unwrapValue(value);
    }

    onPolicyRemarksChange(value: string | number): void
    {
        this.policyRemarks = String(value ?? '');
    }

    // Coverages
    onCoveragePolicyChange(value: any): void
    {
        this.coveragePolicyId = String(this.unwrapValue(value) ?? '');

        // The part may be taken on the new policy : first free one
        if (!this.partItems.some(x => x.value === this.coveragePartId))
        {
            this.coveragePartId = this.partItems[0]?.value ?? '';
        }
    }

    onPartChange(value: any): void
    {
        this.coveragePartId = String(this.unwrapValue(value) ?? '');
    }

    onPeriodChange(value: string | number): void
    {
        this.periodText = WarrantyConfigurationList.digits(value, 4);
    }

    onUnitChange(value: any): void
    {
        this.periodUnit = (this.unwrapValue(value) || 'Years') as WarrantyPeriodUnit;
    }

    onKmChange(value: string | number): void
    {
        this.kmText = WarrantyConfigurationList.digits(value, 7);
    }

    onCoverageNotesChange(value: string | number): void
    {
        this.coverageNotes = String(value ?? '');
    }

    onCoverageStatusChange(value: any): void
    {
        this.coverageActive = !!this.unwrapValue(value);
    }


    //===========================================================
    // Save (Add / Update)
    //===========================================================

    // The body of the open tab, or a message for the toast
    private buildBody():
        { body:SaveWarrantyPart | SaveWarrantyPolicy | SaveWarrantyCoverage; name:string } | string
    {
        switch (this.panelTab)
        {
            case 'Parts':
            {
                const name =
                    this.partDraft.Name.trim();

                if (!name)
                {
                    return 'Part Name is required.';
                }

                const body: SaveWarrantyPart =
                {
                    Name:name,
                    DisplayOrder:Number(this.displayOrderText) || 0,
                    Remarks:this.partDraft.Remarks.trim(),
                    IsActive:this.partDraft.IsActive
                };

                return { body, name };
            }

            case 'Coverages':
            {
                if (!this.coveragePolicyId)
                {
                    return 'Choose the warranty policy.';
                }

                if (!this.coveragePartId)
                {
                    return 'Choose the part.';
                }

                const value =
                    WarrantyConfigurationList.whole(this.periodText);

                if (value == null)
                {
                    return 'Enter the period.';
                }

                if (this.periodError)
                {
                    return this.periodError;
                }

                const body: SaveWarrantyCoverage =
                {
                    PolicyPublicId:this.coveragePolicyId,
                    PartPublicId:this.coveragePartId,
                    PeriodValue:value,
                    PeriodUnit:this.periodUnit,
                    KmLimit:WarrantyConfigurationList.whole(this.kmText),
                    Notes:this.coverageNotes.trim(),
                    IsActive:this.coverageActive
                };

                const part =
                    this.partItems.find(x => x.value === this.coveragePartId)?.label ?? 'The part';

                return { body, name:part };
            }

            default:
            {
                const name =
                    this.policyName.trim();

                if (!this.brandId)
                {
                    return 'Choose the brand.';
                }

                if (!name)
                {
                    return 'Policy Name is required.';
                }

                if (this.datesError)
                {
                    return this.datesError;
                }

                const value =
                    WarrantyConfigurationList.whole(this.periodText);

                if (value == null)
                {
                    return 'Enter the whole-bike warranty period.';
                }

                if (this.periodError)
                {
                    return this.periodError;
                }

                const body: SaveWarrantyPolicy =
                {
                    Name:name,
                    BrandPublicId:this.brandId,
                    BikeModelPublicId:this.modelId || null,
                    EffectiveFrom:WarrantyConfigurationList.dateKey(this.effectiveDate),
                    EffectiveTo:this.endsMode === 'date' ? WarrantyConfigurationList.dateKey(this.effectiveToDate) : '',
                    PeriodValue:value,
                    PeriodUnit:this.periodUnit,
                    KmLimit:WarrantyConfigurationList.whole(this.kmText),
                    Terms:this.terms.trim(),
                    Exclusions:this.exclusions.trim(),
                    Remarks:this.policyRemarks.trim(),
                    IsActive:this.policyActive
                };

                return { body, name };
            }
        }
    }


    save():
        void
    {
        if (this.isView || this.progress.busy)
        {
            return;
        }

        const built =
            this.buildBody();

        if (typeof built === 'string')
        {
            this.toast.warning('Check the Form', built);

            this.cdr.detectChanges();

            return;
        }

        const isAdd =
            this.panelMode === 'add';

        const info =
            this.panelInfo;

        const call$: Observable<any> =
            isAdd
                ? this.service.create(info.path, built.body)
                : this.service.update(info.path, this.panelPublicId, built.body);

        this.progress
            .run<unknown>(
                isAdd ? `Saving ${info.noun}` : `Updating ${info.noun}`,
                `Please wait while "${built.name}" is being saved...`,
                isAdd ? `${info.noun} saved.` : `${info.noun} updated.`,
                call$
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.panelOpened = false;

                    this.toast.success(
                        isAdd ? 'Save Successful' : 'Update Successful',
                        isAdd
                            ? `"${built.name}" added to ${info.tabLabel}.`
                            : `"${built.name}"${this.code ? ` (${this.code})` : ''} updated.`
                    );

                    this.selectedTab = this.panelTab;

                    this.loadItems();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('Save Warranty Configuration Error', error);

                    this.toast.error(
                        'Save Failed',
                        this.errorText(error, `The ${info.noun.toLowerCase()} could not be saved.`)
                    );

                    this.cdr.detectChanges();
                }
            });
    }


    //===========================================================
    // Delete / Restore
    //===========================================================

    private rowLabel(row: AnyRow): string
    {
        return 'PartName' in row
            ? `${row.Code} (${row.PartName} of ${row.PolicyCode})`
            : `"${row.Name}" (${row.Code})`;
    }


    delete(row: AnyRow): void
    {
        if (this.progress.busy)
        {
            return;
        }

        if ('UsedText' in row && row.CoverageCount > 0)
        {
            this.toast.info(
                'Delete Not Allowed',
                `"${row.Name}" is used by ${row.UsedText}. Deactivate it instead, or delete those coverages first.`
            );

            return;
        }

        if ('BrandPublicId' in row && row.CoverageCount > 0)
        {
            this.toast.info(
                'Delete Not Allowed',
                `"${row.Name}" has ${row.CoverageCount} coverage${row.CoverageCount === 1 ? '' : 's'}. Delete them first, or deactivate the policy.`
            );

            return;
        }

        const info = this.info;

        const label = this.rowLabel(row);

        this.confirmDialog.open
        (
            `Delete ${info.noun}`,
            `Are you sure you want to delete ${label} ?`,
            (): void =>
            {
                setTimeout(() => this.deleteItem(row, info, label));
            }
        );
    }


    private deleteItem
    (
        row: AnyRow,
        info: WarrantyTabInfo,
        label: string
    ):
        void
    {
        this.progress
            .run(
                `Deleting ${info.noun}`,
                `Please wait while ${label} is being deleted...`,
                `${info.noun} deleted.`,
                this.service.delete(info.path, row.PublicId)
            )
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
                    console.error('Delete Warranty Configuration Error:', error);

                    if (error instanceof HttpErrorResponse && error.status === 409)
                    {
                        this.toast.info('Delete Blocked', this.errorText(error, `${info.noun} cannot be deleted.`));

                        return;
                    }

                    this.toast.error('Delete Failed', this.errorText(error, `Failed to delete the ${info.noun.toLowerCase()}.`));
                }
            });
    }


    restore():
        void
    {
        if (this.progress.busy)
        {
            return;
        }

        const info = this.info;

        this.confirmDialog.open
        (
            `Restore ${info.noun}`,
            `Restore the most recently deleted record of "${info.tabLabel}"?`,
            (): void =>
            {
                setTimeout(() => this.restoreItem(info));
            },
            'Restore',
            'Cancel',
            'primary'
        );
    }


    private restoreItem
    (
        info: WarrantyTabInfo
    ):
        void
    {
        this.progress
            .run<unknown>(
                'Restoring',
                `Please wait while the most recently deleted record of "${info.tabLabel}" is being restored...`,
                'Record restored.',
                this.service.restore(info.path)
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.toast.success('Restore Successful', `The most recently deleted record of "${info.tabLabel}" has been restored.`);

                    this.loadItems();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('Restore Warranty Configuration Error:', error);

                    if (error instanceof HttpErrorResponse && error.status === 404)
                    {
                        this.toast.info('No Data to Restore', `There is no deleted record in "${info.tabLabel}" to restore.`);

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

    openHistory():
        void
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
                            })
                        );

                    this.historyOpened = true;

                    this.cdr.detectChanges();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('History Load Failed:', error);

                    this.toast.error('History', 'Failed to load the warranty configuration history.');
                }
            });
    }


    closeHistory():
        void
    {
        this.historyOpened = false;

        this.cdr.detectChanges();
    }


    //===========================================================
    // Helpers
    //===========================================================

    // Server message ({ message } / a text / the fallback)
    private errorText
    (
        error: unknown,
        fallback: string
    ):
        string
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
    // Summary Line (below the canvas) : the open tab's rows
    //===========================================================

    get summaryTotal():
        number
    {
        return this.tabRows.length;
    }

    get summaryActive():
        number
    {
        return this.tabRows.filter(x => x.IsActive).length;
    }

    get summaryNote():
        string
    {
        if (this.selectedTab === 'Parts')
        {
            const used = this.partRows.filter(x => x.CoverageCount > 0).length;

            return `Used by coverages ${used} of ${this.partRows.length}`;
        }

        if (this.selectedTab === 'Coverages')
        {
            const policies = new Set(this.coverageRows.map(x => x.PolicyPublicId)).size;

            return `Policies with part warranty ${policies}`;
        }

        const current = this.policyRows.filter(x => x.PolicyState === 'Current').length;

        const upcoming = this.policyRows.filter(x => x.PolicyState === 'Upcoming').length;

        const ended = this.policyRows.filter(x => x.PolicyState === 'Ended').length;

        return `Current ${current} · Upcoming ${upcoming} · Ended ${ended}`;
    }

    summaryText(value: number): string
    {
        return value.toLocaleString('en-US');
    }
}
