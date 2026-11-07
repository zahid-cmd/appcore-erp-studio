//===============================================================
// Registration Configuration (one page, NO Code Synchronization)
//
// Registration Management > Registration Control. Built like
// Enquiry Setup : four tabs, one list each; Add / Update / View
// in the form panel on the right of the same page (the list
// shrinks to the left). Delete and Restore act on the current
// tab.
//
//   Registration Types  plan (validity fixed) + mode, no amounts
//   Registration Fees   min / max collection, dated rates
//   Registration Costs  BRTA fee, submission, tips, commission,
//                       dated rates (posted and paid as they are)
//   Stage Timings       the 6 fixed statuses : expected days,
//                       colour (edit only)
//
// The server blocks a Minimum Collection below the Total Cost in
// force (same type) on any date; the panel shows the figure in
// force on the chosen date as a hint.
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


//===============================================================
// Models
//===============================================================

import
{
    RegistrationConfigTab,
    RegistrationTabInfo,
    RegistrationType,
    RegistrationFee,
    RegistrationCost,
    RegistrationStageTiming,
    RegistrationConfigurationDefaults,
    RegistrationPlan,
    RegistrationMode,
    RegistrationPower,
    SaveRegistrationType,
    SaveRegistrationFee,
    SaveRegistrationCost,
    SaveRegistrationStageTiming,
    REGISTRATION_TABS,
    REGISTRATION_PLANS,
    REGISTRATION_MODES,
    REGISTRATION_POWERS,
    REGISTRATION_COLORS
}
from '../../../models/registration-configuration.model';


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
    RegistrationConfigurationService
}
from '../../../services/registration-configuration.service';


//===============================================================
// Rows with their display texts
//===============================================================

type TypeRow =
    RegistrationType
    &
    {
        ValidityText:string;
        TypeText:string;
        UsableText:string;
        DefaultText:string;
    };

type FeeRow =
    RegistrationFee
    &
    {
        DateText:string;
        ValidityText:string;
        TypeText:string;
        MinText:string;
        MaxText:string;
        RateText:string;
    };

type CostRow =
    RegistrationCost
    &
    {
        DateText:string;
        ValidityText:string;
        TypeText:string;
        BrtaText:string;
        SubmissionText:string;
        TipsText:string;
        CommissionText:string;
        TotalText:string;
        RateText:string;
    };

type StageRow =
    RegistrationStageTiming
    &
    {
        DaysText:string;
        IsActive:boolean;
    };

type AnyRow =
    TypeRow | FeeRow | CostRow | StageRow;


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'registration-configuration-list',

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

    templateUrl:'./registration-configuration-list.html',

    styleUrl:'./registration-configuration-list.css'
})


//===============================================================
// Registration Configuration List
//===============================================================

export class RegistrationConfigurationList
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly service =
        inject(RegistrationConfigurationService);

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
        RegistrationTabInfo[] =
        REGISTRATION_TABS;

    readonly tabs:
        ControlTab[] =
        REGISTRATION_TABS.map(
            x =>
            ({
                id:x.tab,
                label:x.tabLabel
            })
        );

    selectedTab:
        RegistrationConfigTab =
        'Types';

    get info():
        RegistrationTabInfo
    {
        return this.infoOf(this.selectedTab);
    }

    private infoOf
    (
        tab:
            RegistrationConfigTab
    ):
        RegistrationTabInfo
    {
        return this.tabInfos.find(x => x.tab === tab) ?? this.tabInfos[0];
    }


    //===========================================================
    // Data (every tab in one call)
    //===========================================================

    private typeRows:
        TypeRow[] =
        [];

    private feeRows:
        FeeRow[] =
        [];

    private costRows:
        CostRow[] =
        [];

    private stageRows:
        StageRow[] =
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

    // Fees / Costs : one registration type ('' = all)
    typeFilter:
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
        'Registration Configuration History';

    historyItems:
        any[] =
        [];


    //===========================================================
    // Fixed dropdown items
    //===========================================================

    readonly planItems =
        REGISTRATION_PLANS.map(x => ({ label:x.label, value:x.value }));

    readonly modeItems =
        REGISTRATION_MODES;

    readonly powerItems =
        REGISTRATION_POWERS;

    readonly colorPresets:
        string[] =
        REGISTRATION_COLORS;

    readonly statusItems:
        any[] =
        [
            { label:'Active', value:true },
            { label:'Inactive', value:false }
        ];

    readonly defaultItems:
        any[] =
        [
            { label:'Yes', value:true },
            { label:'No', value:false }
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
        return { header:'Status', field:'IsActive', type:'status', width:'140px', align:'center' };
    }

    private static actions():
        ListTableColumn
    {
        return { header:'Actions', field:'actions', type:'actions', width:'130px', align:'center' };
    }

    private readonly typeColumns:
        ListTableColumn[] =
    [
        RegistrationConfigurationList.serial(),
        RegistrationConfigurationList.code(),
        { header:'Registration Type', field:'TypeText', width:'500px', align:'left', flagField:'IsSystem', flagText:'System' },
        { header:'Plan', field:'PlanName', align:'left' },
        { header:'Rates Today', field:'UsableText', width:'120px', align:'center' },
        { header:'Order', field:'DisplayOrder', width:'70px', align:'center' },
        { header:'Default', field:'DefaultText', width:'90px', align:'center' },
        RegistrationConfigurationList.status(),
        RegistrationConfigurationList.actions()
    ];

    private readonly feeColumns:
        ListTableColumn[] =
    [
        RegistrationConfigurationList.serial(),
        RegistrationConfigurationList.code(),
        { header:'Registration Type', field:'TypeText', align:'left' },
        { header:'Effective From', field:'DateText', width:'130px', align:'center' },
        { header:'Minimum', field:'MinText', width:'130px', align:'right' },
        { header:'Maximum', field:'MaxText', width:'130px', align:'right' },
        { header:'Rate', field:'RateText', width:'100px', align:'center' },
        RegistrationConfigurationList.status(),
        RegistrationConfigurationList.actions()
    ];

    private readonly costColumns:
        ListTableColumn[] =
    [
        RegistrationConfigurationList.serial(),
        RegistrationConfigurationList.code(),
        { header:'Registration Type', field:'TypeText', align:'left' },
        { header:'Effective From', field:'DateText', width:'120px', align:'center' },
        { header:'Reg. Fees', field:'BrtaText', width:'110px', align:'right' },
        { header:'Submission', field:'SubmissionText', width:'110px', align:'right' },
        { header:'Tips', field:'TipsText', width:'100px', align:'right' },
        { header:'Commission', field:'CommissionText', width:'110px', align:'right' },
        { header:'Total Cost', field:'TotalText', width:'115px', align:'right' },
        { header:'Rate', field:'RateText', width:'90px', align:'center' },
        RegistrationConfigurationList.status(),
        RegistrationConfigurationList.actions()
    ];

    private readonly stageColumns:
        ListTableColumn[] =
    [
        RegistrationConfigurationList.serial(),
        RegistrationConfigurationList.code(),
        { header:'Stage', field:'StageName', align:'left', dotField:'ColorCode' },
        { header:'Order', field:'StageOrder', width:'70px', align:'center' },
        { header:'Expected Days', field:'DaysText', width:'130px', align:'center' },
        { header:'Colour', field:'ColorCode', width:'100px', align:'center' },
        RegistrationConfigurationList.actions()
    ];

    get columns():
        ListTableColumn[]
    {
        switch (this.selectedTab)
        {
            case 'Fees':
                return this.feeColumns;

            case 'Costs':
                return this.costColumns;

            case 'Stages':
                return this.stageColumns;

            default:
                return this.typeColumns;
        }
    }

    // Stage Timings : view / edit only
    readonly rowActions =
        { view:true, edit:true, delete:true };

    readonly stageActions =
        { view:true, edit:true, delete:false };

    get tableActions():
        any
    {
        return this.info.editOnly ? this.stageActions : this.rowActions;
    }

    get searchPlaceholder():
        string
    {
        return `Search ${this.info.tabLabel.toLowerCase()}...`;
    }

    // Fees / Costs toolbar : all types or one
    get typeFilterItems():
        any[]
    {
        return [
            { label:'All Registration Types', value:'' },
            ...this.typeRows.map(x => ({ label:RegistrationConfigurationList.typeLabel(x), value:x.PublicId }))
        ];
    }

    get showTypeFilter():
        boolean
    {
        return this.selectedTab === 'Fees' || this.selectedTab === 'Costs';
    }

    private get tabRows():
        AnyRow[]
    {
        switch (this.selectedTab)
        {
            case 'Fees':
                return this.feeRows;

            case 'Costs':
                return this.costRows;

            case 'Stages':
                return this.stageRows;

            default:
                return this.typeRows;
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

                    this.typeRows =
                        data.Types.map(
                            x =>
                            ({
                                ...x,
                                ValidityText:`${x.ValidityYears} Years`,
                                TypeText:RegistrationConfigurationList.typeLabel(x),
                                UsableText:
                                    x.Usable
                                        ? 'Ready'
                                        : !x.IsActive
                                            ? 'Inactive'
                                            : 'No rates',
                                DefaultText:x.IsDefault ? 'Default' : '—'
                            })
                        );

                    this.feeRows =
                        data.Fees.map(
                            x =>
                            ({
                                ...x,
                                DateText:RegistrationConfigurationList.dateLabel(x.EffectiveFrom),
                                MinText:RegistrationConfigurationList.money(x.MinimumCollection),
                                MaxText:RegistrationConfigurationList.money(x.MaximumCollection),
                                RateText:x.RateState,
                                ValidityText:this.validityOf(x.RegistrationTypeId),
                                TypeText:`${x.RegistrationTypeName} || ${this.validityOf(x.RegistrationTypeId)}`
                            })
                        );

                    this.costRows =
                        data.Costs.map(
                            x =>
                            ({
                                ...x,
                                DateText:RegistrationConfigurationList.dateLabel(x.EffectiveFrom),
                                BrtaText:RegistrationConfigurationList.money(x.BrtaFees),
                                SubmissionText:RegistrationConfigurationList.money(x.SubmissionCharges),
                                TipsText:RegistrationConfigurationList.money(x.BrtaTips),
                                CommissionText:RegistrationConfigurationList.money(x.RegistrationCommission),
                                TotalText:RegistrationConfigurationList.money(x.TotalCost),
                                RateText:x.RateState,
                                ValidityText:this.validityOf(x.RegistrationTypeId),
                                TypeText:`${x.RegistrationTypeName} || ${this.validityOf(x.RegistrationTypeId)}`
                            })
                        );

                    this.stageRows =
                        data.Stages.map(
                            x =>
                            ({
                                ...x,
                                DaysText:
                                    x.ExpectedDays == null
                                        ? 'No limit'
                                        : `${x.ExpectedDays} day${x.ExpectedDays === 1 ? '' : 's'}`,
                                IsActive:true
                            })
                        );

                    // A filtered type that is gone : back to all
                    if (this.typeFilter && !this.typeRows.some(x => x.PublicId === this.typeFilter))
                    {
                        this.typeFilter = '';
                    }

                    this.loading = false;

                    this.applyFilters(false);

                    this.cdr.detectChanges();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('Load Registration Configuration Error:', error);

                    this.typeRows = [];
                    this.feeRows = [];
                    this.costRows = [];
                    this.stageRows = [];
                    this.filteredRows = [];
                    this.pagedRows = [];

                    this.loading = false;

                    this.loadFailed = true;

                    this.toast.error(
                        'Load Failed',
                        this.errorText(error, 'Unable to load the registration configuration.')
                    );

                    this.cdr.detectChanges();
                }
            });
    }


    // "2 Years" : the validity of a fee / cost row's type
    private validityOf
    (
        typeId:
            number
    ):
        string
    {
        const type =
            this.typeRows.find(t => t.RegistrationTypeId === typeId);

        return type ? `${type.ValidityYears} Years` : '—';
    }


    //===========================================================
    // Formatting helpers
    //===========================================================

    static money
    (
        value:
            number
    ):
        string
    {
        return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
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
            RegistrationConfigurationList.parseDate(value);

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

    // Typed amount -> number (NaN when empty / invalid)
    private static amount
    (
        text:
            string
    ):
        number
    {
        const value =
            String(text ?? '').replace(/,/g, '').trim();

        return value === '' ? NaN : Number(value);
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

        if (this.showTypeFilter && this.typeFilter)
        {
            rows =
                (rows as (FeeRow | CostRow)[])
                    .filter(x => x.RegistrationTypePublicId === this.typeFilter);
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
                    (keyword === 'active' && (row as any).IsActive)
                    ||
                    (keyword === 'inactive' && !(row as any).IsActive)
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
            value as RegistrationConfigTab;

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


    onTypeFilterChange
    (
        value:
            any
    ):
        void
    {
        this.typeFilter =
            String(this.unwrapValue(value) ?? '');

        this.applyFilters();

        this.cdr.detectChanges();
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

        // Text columns of dates / amounts : sort by the raw value
        const raw: Record<string, string> =
        {
            DateText:'EffectiveFrom',
            MinText:'MinimumCollection',
            MaxText:'MaximumCollection',
            BrtaText:'BrtaFees',
            SubmissionText:'SubmissionCharges',
            TipsText:'BrtaTips',
            CommissionText:'RegistrationCommission',
            TotalText:'TotalCost',
            ValidityText:'ValidityYears',
            TypeText:'TypeText',
            DaysText:'ExpectedDays'
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
        RegistrationConfigTab =
        'Types';

    // The record open in the panel (edit / view)
    panelPublicId:
        string =
        '';

    code:
        string =
        '';

    // Types
    typeDraft =
    {
        RegistrationPlan:'Installment' as RegistrationPlan,
        RegistrationMode:'Online' as RegistrationMode,
        VehiclePower:'Electric' as RegistrationPower,
        Name:'',
        IsDefault:false,
        IsSystem:false,
        IsActive:true,
        Remarks:''
    };

    // The name follows plan + mode until it is typed by hand
    private nameTyped:
        boolean =
        false;

    displayOrderText:
        string =
        '';

    // Fees / Costs
    rateTypeId:
        string =
        '';

    effectiveDate:
        Date =
        new Date();

    minText:
        string =
        '';

    maxText:
        string =
        '';

    brtaText:
        string =
        '';

    submissionText:
        string =
        '';

    tipsText:
        string =
        '';

    commissionText:
        string =
        '';

    rateActive:
        boolean =
        true;

    rateRemarks:
        string =
        '';

    // Stage Timings
    stageDraft:
        RegistrationStageTiming | null =
        null;

    daysText:
        string =
        '';

    stageColor:
        string =
        '';

    stageRemarks:
        string =
        '';


    get panelInfo():
        RegistrationTabInfo
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
                : this.newRateMode
                    ? `New Rate : ${noun}`
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

    // Types : validity of the chosen plan
    get validityText():
        string
    {
        const plan =
            REGISTRATION_PLANS.find(x => x.value === this.typeDraft.RegistrationPlan);

        return plan ? `${plan.years} Years` : '';
    }

    // Fees / Costs : the types offered (live ones; the row's own
    // type always stays)
    get rateTypeItems():
        any[]
    {
        // Add : only the types with no fee / cost row yet (a later
        // rate of a used type is added with New Rate)
        const used =
            this.panelMode === 'add' && !this.newRateMode
                ? this.usedTypeIds(this.panelTab)
                : new Set<string>();

        return this.typeRows
            .filter(x => (x.IsActive && !used.has(x.PublicId)) || x.PublicId === this.rateTypeId)
            .map(x => ({ label:RegistrationConfigurationList.typeLabel(x), value:x.PublicId }));
    }

    // Types that already have a live row on the Fees / Costs tab
    private usedTypeIds
    (
        tab:
            RegistrationConfigTab
    ):
        Set<string>
    {
        const rows: (FeeRow | CostRow)[] =
            tab === 'Fees' ? this.feeRows : tab === 'Costs' ? this.costRows : [];

        return new Set(rows.map(x => x.RegistrationTypePublicId));
    }

    // Add opened by New Rate : the type is fixed, the amounts copied
    newRateMode:
        boolean =
        false;

    // "Installment System - Online || 2 Years"
    static typeLabel
    (
        x:
            RegistrationType
    ):
        string
    {
        return `${x.Name} || ${x.ValidityYears} Years`;
    }

    get totalCost():
        number
    {
        const values =
            [this.brtaText, this.submissionText, this.tipsText, this.commissionText]
                .map(x => RegistrationConfigurationList.amount(x));

        return values.reduce((sum, v) => sum + (isNaN(v) ? 0 : v), 0);
    }

    get totalCostText():
        string
    {
        return RegistrationConfigurationList.money(this.totalCost);
    }


    // The other side's rate in force on the chosen date (hint)
    private costInForce():
        CostRow | null
    {
        const date =
            RegistrationConfigurationList.dateKey(this.effectiveDate);

        return this.costRows
            .filter(x => x.RegistrationTypePublicId === this.rateTypeId && x.IsActive && x.EffectiveFrom <= date)
            .sort((a, b) => b.EffectiveFrom.localeCompare(a.EffectiveFrom))[0]
            ?? null;
    }

    private feeInForce():
        FeeRow | null
    {
        const date =
            RegistrationConfigurationList.dateKey(this.effectiveDate);

        return this.feeRows
            .filter(
                x =>
                    x.RegistrationTypePublicId === this.rateTypeId
                    && x.IsActive
                    && x.EffectiveFrom <= date
                    && !(this.panelTab === 'Fees' && x.PublicId === this.panelPublicId))
            .sort((a, b) => b.EffectiveFrom.localeCompare(a.EffectiveFrom))[0]
            ?? null;
    }


    // Fees : min / max checks and the cost in force
    get feeError():
        string
    {
        const min =
            RegistrationConfigurationList.amount(this.minText);

        const max =
            RegistrationConfigurationList.amount(this.maxText);

        if (!isNaN(min) && min <= 0)
        {
            return 'Minimum Collection must be more than 0.';
        }

        if (!isNaN(min) && !isNaN(max) && max < min)
        {
            return 'Maximum Collection cannot be less than Minimum Collection.';
        }

        const cost =
            this.rateTypeId && this.rateActive ? this.costInForce() : null;

        if (cost && !isNaN(min) && min < cost.TotalCost)
        {
            return `The total cost in force on this date is ${cost.TotalText} (${cost.Code}). The minimum collection cannot be below it.`;
        }

        return '';
    }

    get feeHint():
        string
    {
        if (!this.rateTypeId)
        {
            return 'Choose the registration type and the date the rate starts.';
        }

        const cost =
            this.costInForce();

        return cost
            ? `Total cost in force on this date : ${cost.TotalText} (${cost.Code}). The minimum collection must be at least this.`
            : 'No cost is set for this type on this date yet.';
    }

    // Costs : the fee in force
    get costError():
        string
    {
        const brta =
            RegistrationConfigurationList.amount(this.brtaText);

        if (!isNaN(brta) && brta <= 0)
        {
            return 'Registration Fees (BRTA) must be more than 0.';
        }

        if ([this.submissionText, this.tipsText, this.commissionText].some(x => RegistrationConfigurationList.amount(x) < 0))
        {
            return 'Amounts cannot be negative.';
        }

        const fee =
            this.rateTypeId && this.rateActive ? this.feeInForceForCost() : null;

        if (fee && this.totalCost > fee.MinimumCollection)
        {
            return `The minimum collection in force on this date is ${fee.MinText} (${fee.Code}). The total cost cannot be above it.`;
        }

        return '';
    }

    get costHint():
        string
    {
        if (!this.rateTypeId)
        {
            return 'Choose the registration type and the date the rate starts.';
        }

        const fee =
            this.feeInForceForCost();

        return fee
            ? `Minimum collection in force on this date : ${fee.MinText} (${fee.Code}). Surplus per file at the minimum : ${RegistrationConfigurationList.money(fee.MinimumCollection - this.totalCost)}.`
            : 'No fee is set for this type on this date yet.';
    }

    private feeInForceForCost():
        FeeRow | null
    {
        const date =
            RegistrationConfigurationList.dateKey(this.effectiveDate);

        return this.feeRows
            .filter(x => x.RegistrationTypePublicId === this.rateTypeId && x.IsActive && x.EffectiveFrom <= date)
            .sort((a, b) => b.EffectiveFrom.localeCompare(a.EffectiveFrom))[0]
            ?? null;
    }

    get stageColorValid():
        boolean
    {
        return /^#[0-9A-Fa-f]{6}$/.test((this.stageColor ?? '').trim());
    }

    get daysError():
        string
    {
        const value =
            this.daysText.trim();

        if (value === '')
        {
            return '';
        }

        const days =
            Number(value);

        return Number.isInteger(days) && days >= 0 && days <= 365
            ? ''
            : 'Expected Days must be a whole number from 0 to 365, or empty.';
    }


    //===========================================================
    // Open / Close
    //===========================================================

    add():
        void
    {
        if (this.info.editOnly)
        {
            this.toast.info(
                'Fixed List',
                'The registration statuses are fixed. Open a stage with Edit to set its expected days.'
            );

            return;
        }

        // Fees / Costs : every active type has a row already
        if (this.selectedTab === 'Fees' || this.selectedTab === 'Costs')
        {
            const used =
                this.usedTypeIds(this.selectedTab);

            if (!this.typeRows.some(x => x.IsActive && !used.has(x.PublicId)))
            {
                this.toast.info(
                    'All Types Have a Rate',
                    `Every registration type already has a ${this.info.noun.toLowerCase()}. To change a rate, open its row and click New Rate.`
                );

                return;
            }
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

        this.newRateMode = false;

        this.panelTab = this.selectedTab;

        this.panelPublicId = row ? row.PublicId : '';

        this.code = row ? row.Code : '';

        switch (this.panelTab)
        {
            case 'Types':
                this.fillType(row as TypeRow | null);
                break;

            case 'Fees':
                this.fillFee(row as FeeRow | null);
                break;

            case 'Costs':
                this.fillCost(row as CostRow | null);
                break;

            default:
                this.fillStage(row as StageRow | null);
        }

        this.panelOpened = true;

        this.cdr.detectChanges();

        if (mode === 'add')
        {
            this.loadDefaults(this.panelTab);
        }
    }


    private fillType(row: TypeRow | null): void
    {
        this.typeDraft =
        {
            RegistrationPlan:row?.RegistrationPlan ?? 'Installment',
            RegistrationMode:row?.RegistrationMode ?? 'Online',
            VehiclePower:row?.VehiclePower ?? 'Electric',
            Name:row?.Name ?? '',
            IsDefault:row?.IsDefault ?? false,
            IsSystem:row?.IsSystem ?? false,
            IsActive:row?.IsActive ?? true,
            Remarks:row?.Remarks ?? ''
        };

        this.nameTyped = !!row;

        this.displayOrderText = row ? String(row.DisplayOrder) : '';

        if (!row)
        {
            this.typeDraft.Name = this.suggestedName();
        }
    }


    private fillRate(row: FeeRow | CostRow | null): void
    {
        // Add : the filtered / default / first type that has no row yet
        const used =
            this.usedTypeIds(this.panelTab);

        const free =
            this.typeRows.filter(x => x.IsActive && !used.has(x.PublicId));

        this.rateTypeId =
            row?.RegistrationTypePublicId
            ?? (free.find(x => x.PublicId === this.typeFilter)?.PublicId
                || free.find(x => x.IsDefault)?.PublicId
                || free[0]?.PublicId
                || '');

        this.effectiveDate =
            (row ? RegistrationConfigurationList.parseDate(row.EffectiveFrom) : null)
            ?? RegistrationConfigurationList.parseDate(this.today)
            ?? new Date();

        this.rateActive = row?.IsActive ?? true;

        this.rateRemarks = row?.Remarks ?? '';
    }


    private fillFee(row: FeeRow | null): void
    {
        this.fillRate(row);

        this.minText = row ? RegistrationConfigurationList.money(row.MinimumCollection) : '';

        this.maxText = row ? RegistrationConfigurationList.money(row.MaximumCollection) : '';
    }


    private fillCost(row: CostRow | null): void
    {
        this.fillRate(row);

        this.brtaText = row ? RegistrationConfigurationList.money(row.BrtaFees) : '';

        this.submissionText = RegistrationConfigurationList.money(row?.SubmissionCharges ?? 0);

        this.tipsText = RegistrationConfigurationList.money(row?.BrtaTips ?? 0);

        this.commissionText = RegistrationConfigurationList.money(row?.RegistrationCommission ?? 0);
    }


    private fillStage(row: StageRow | null): void
    {
        this.stageDraft = row;

        this.daysText = row?.ExpectedDays == null ? '' : String(row.ExpectedDays);

        this.stageColor = row?.ColorCode ?? REGISTRATION_COLORS[0];

        this.stageRemarks = row?.Remarks ?? '';
    }


    // Add : the next code (and type order)
    private loadDefaults(tab: RegistrationConfigTab): void
    {
        this.service
            .getDefaults()
            .subscribe
            ({
                next:
                (d: RegistrationConfigurationDefaults): void =>
                {
                    if (!this.panelOpened || this.panelMode !== 'add' || this.panelTab !== tab)
                    {
                        return;
                    }

                    this.code =
                        tab === 'Fees'
                            ? d.FeeCode
                            : tab === 'Costs'
                                ? d.CostCode
                                : d.TypeCode;

                    if (tab === 'Types' && !this.displayOrderText)
                    {
                        this.displayOrderText = String(d.NextTypeOrder);
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


    // Command 2 of the panel : Clear (Add) / New Rate (a fee or cost
    // opened with View / Edit)
    get command2Text():
        string
    {
        return this.panelMode === 'add' ? 'Clear' : 'New Rate';
    }

    get command2Icon():
        string
    {
        return this.panelMode === 'add' ? 'fas fa-broom' : 'fas fa-clock-rotate-left';
    }

    get command2Visible():
        boolean
    {
        return this.panelMode === 'add'
            ? !this.newRateMode
            : this.panelTab === 'Fees' || this.panelTab === 'Costs';
    }

    command2():
        void
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

    // New Rate : Add for the same type, the amounts copied, the date
    // today; the open row stays as it is (history)
    newRate():
        void
    {
        if (this.progress.busy || (this.panelTab !== 'Fees' && this.panelTab !== 'Costs'))
        {
            return;
        }

        this.panelMode = 'add';

        this.newRateMode = true;

        this.panelPublicId = '';

        this.code = '';

        this.effectiveDate =
            RegistrationConfigurationList.parseDate(this.today) ?? new Date();

        this.rateActive = true;

        this.rateRemarks = '';

        this.cdr.detectChanges();

        this.loadDefaults(this.panelTab);
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

    private suggestedName():
        string
    {
        const plan =
            REGISTRATION_PLANS.find(x => x.value === this.typeDraft.RegistrationPlan)?.label ?? '';

        return `${plan} - ${this.typeDraft.RegistrationMode} - ${this.typeDraft.VehiclePower}`;
    }

    onPlanChange(value: any): void
    {
        this.typeDraft.RegistrationPlan = this.unwrapValue(value) as RegistrationPlan;

        if (!this.nameTyped)
        {
            this.typeDraft.Name = this.suggestedName();
        }
    }

    onModeChange(value: any): void
    {
        this.typeDraft.RegistrationMode = this.unwrapValue(value) as RegistrationMode;

        if (!this.nameTyped)
        {
            this.typeDraft.Name = this.suggestedName();
        }
    }

    onPowerChange(value: any): void
    {
        this.typeDraft.VehiclePower = this.unwrapValue(value) as RegistrationPower;

        if (!this.nameTyped)
        {
            this.typeDraft.Name = this.suggestedName();
        }
    }

    onNameChange(value: string | number): void
    {
        this.typeDraft.Name = String(value ?? '');

        this.nameTyped = this.typeDraft.Name.trim() !== '' && this.typeDraft.Name !== this.suggestedName();
    }

    onDisplayOrderChange(value: string | number): void
    {
        this.displayOrderText = String(value ?? '').replace(/[^0-9]/g, '').slice(0, 4);
    }

    onDefaultChange(value: any): void
    {
        this.typeDraft.IsDefault = !!this.unwrapValue(value);

        if (this.typeDraft.IsDefault)
        {
            this.typeDraft.IsActive = true;
        }
    }

    onTypeStatusChange(value: any): void
    {
        this.typeDraft.IsActive = !!this.unwrapValue(value);
    }

    onTypeRemarksChange(value: string | number): void
    {
        this.typeDraft.Remarks = String(value ?? '');
    }

    onRateTypeChange(value: any): void
    {
        this.rateTypeId = String(this.unwrapValue(value) ?? '');
    }

    onDateChange(value: Date): void
    {
        this.effectiveDate = value;
    }

    // Amounts : digits and one dot, 2 decimals, commas while typing
    // ("15000" -> "15,000"; "15000.5" -> "15,000.5")
    private cleanAmount(value: string | number): string
    {
        let text =
            String(value ?? '').replace(/[^0-9.]/g, '');

        const dot =
            text.indexOf('.');

        let whole =
            dot >= 0 ? text.slice(0, dot) : text;

        const decimals =
            dot >= 0 ? '.' + text.slice(dot + 1).replace(/\./g, '').slice(0, 2) : '';

        whole =
            whole.replace(/^0+(?=\d)/, '').slice(0, 9);

        return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + decimals;
    }

    // Leaving an amount : "15,000" -> "15,000.00"
    onAmountBlur
    (
        field:
            'minText' | 'maxText' | 'brtaText' | 'submissionText' | 'tipsText' | 'commissionText'
    ):
        void
    {
        const value =
            RegistrationConfigurationList.amount(this[field]);

        if (!isNaN(value))
        {
            this[field] = RegistrationConfigurationList.money(value);

            this.cdr.detectChanges();
        }
    }

    onMinChange(value: string | number): void
    {
        this.minText = this.cleanAmount(value);
    }

    onMaxChange(value: string | number): void
    {
        this.maxText = this.cleanAmount(value);
    }

    onBrtaChange(value: string | number): void
    {
        this.brtaText = this.cleanAmount(value);
    }

    onSubmissionChange(value: string | number): void
    {
        this.submissionText = this.cleanAmount(value);
    }

    onTipsChange(value: string | number): void
    {
        this.tipsText = this.cleanAmount(value);
    }

    onCommissionChange(value: string | number): void
    {
        this.commissionText = this.cleanAmount(value);
    }

    onRateStatusChange(value: any): void
    {
        this.rateActive = !!this.unwrapValue(value);
    }

    onRateRemarksChange(value: string | number): void
    {
        this.rateRemarks = String(value ?? '');
    }

    onDaysChange(value: string | number): void
    {
        this.daysText = String(value ?? '').replace(/[^0-9]/g, '').slice(0, 3);
    }

    pickColor(color: string): void
    {
        if (!this.isView)
        {
            this.stageColor = color;
        }
    }

    onColorChange(value: string | number): void
    {
        this.stageColor = String(value ?? '').trim().toUpperCase();
    }

    onStageRemarksChange(value: string | number): void
    {
        this.stageRemarks = String(value ?? '');
    }


    //===========================================================
    // Save (Add / Update)
    //===========================================================

    // The body of the open tab, or a message for the toast
    private buildBody():
        { body:any; name:string } | string
    {
        switch (this.panelTab)
        {
            case 'Types':
            {
                const name =
                    this.typeDraft.Name.trim();

                if (!name)
                {
                    return 'Registration Type Name is required.';
                }

                if (this.typeDraft.IsDefault && !this.typeDraft.IsActive)
                {
                    return 'The default registration type must be active.';
                }

                const body: SaveRegistrationType =
                {
                    RegistrationPlan:this.typeDraft.RegistrationPlan,
                    RegistrationMode:this.typeDraft.RegistrationMode,
                    VehiclePower:this.typeDraft.VehiclePower,
                    Name:name,
                    DisplayOrder:Number(this.displayOrderText) || 0,
                    IsDefault:this.typeDraft.IsDefault,
                    Remarks:this.typeDraft.Remarks.trim(),
                    IsActive:this.typeDraft.IsActive
                };

                return { body, name };
            }

            case 'Fees':
            {
                if (!this.rateTypeId)
                {
                    return 'Choose the registration type.';
                }

                const min = RegistrationConfigurationList.amount(this.minText);

                const max = RegistrationConfigurationList.amount(this.maxText);

                if (isNaN(min) || isNaN(max))
                {
                    return 'Minimum Collection and Maximum Collection are required.';
                }

                if (this.feeError)
                {
                    return this.feeError;
                }

                const body: SaveRegistrationFee =
                {
                    RegistrationTypePublicId:this.rateTypeId,
                    EffectiveFrom:RegistrationConfigurationList.dateKey(this.effectiveDate),
                    MinimumCollection:min,
                    MaximumCollection:max,
                    Remarks:this.rateRemarks.trim(),
                    IsActive:this.rateActive
                };

                return { body, name:this.code || 'The fee' };
            }

            case 'Costs':
            {
                if (!this.rateTypeId)
                {
                    return 'Choose the registration type.';
                }

                const brta = RegistrationConfigurationList.amount(this.brtaText);

                if (isNaN(brta))
                {
                    return 'Registration Fees (BRTA) is required.';
                }

                if (this.costError)
                {
                    return this.costError;
                }

                const other =
                    (text: string): number =>
                    {
                        const v = RegistrationConfigurationList.amount(text);

                        return isNaN(v) ? 0 : v;
                    };

                const body: SaveRegistrationCost =
                {
                    RegistrationTypePublicId:this.rateTypeId,
                    EffectiveFrom:RegistrationConfigurationList.dateKey(this.effectiveDate),
                    BrtaFees:brta,
                    SubmissionCharges:other(this.submissionText),
                    BrtaTips:other(this.tipsText),
                    RegistrationCommission:other(this.commissionText),
                    Remarks:this.rateRemarks.trim(),
                    IsActive:this.rateActive
                };

                return { body, name:this.code || 'The cost' };
            }

            default:
            {
                if (this.daysError)
                {
                    return this.daysError;
                }

                if (!this.stageColorValid)
                {
                    return 'Pick a colour, or type one such as #2563EB.';
                }

                const body: SaveRegistrationStageTiming =
                {
                    ExpectedDays:this.daysText.trim() === '' ? null : Number(this.daysText),
                    ColorCode:this.stageColor.trim(),
                    Remarks:this.stageRemarks.trim()
                };

                return { body, name:this.stageDraft?.StageName ?? 'The stage' };
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

        const call$ =
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
                            ? `${built.name} added to ${info.tabLabel}.`
                            : `${built.name}${this.code ? ` (${this.code})` : ''} updated.`
                    );

                    this.selectedTab = this.panelTab;

                    this.loadItems();
                },
                error:
                (error: unknown): void =>
                {
                    console.error('Save Registration Configuration Error', error);

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
        return 'Name' in row
            ? `"${row.Name}" (${row.Code})`
            : 'StageName' in row
                ? `"${row.StageName}"`
                : `${row.Code} (${row.RegistrationTypeName}, from ${row.DateText})`;
    }


    delete(row: AnyRow): void
    {
        if (this.progress.busy || this.info.editOnly)
        {
            return;
        }

        if ('IsSystem' in row && row.IsSystem)
        {
            this.toast.info(
                'Delete Not Allowed',
                `"${row.Name}" is a system registration type and cannot be deleted. You can deactivate or rename it instead.`
            );

            return;
        }

        if ('IsDefault' in row && row.IsDefault)
        {
            this.toast.info(
                'Delete Not Allowed',
                `"${row.Name}" is the default registration type. Set another default first.`
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
        info: RegistrationTabInfo,
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
                    console.error('Delete Registration Configuration Error:', error);

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

        if (info.editOnly)
        {
            this.toast.info('Fixed List', 'Stage timings cannot be deleted, so there is nothing to restore.');

            return;
        }

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
        info: RegistrationTabInfo
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
                    console.error('Restore Registration Configuration Error:', error);

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

                    this.toast.error('History', 'Failed to load the registration configuration history.');
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
        return this.info.editOnly
            ? this.stageRows.filter(x => x.ExpectedDays != null).length
            : this.tabRows.filter(x => !!(x as any).IsActive).length;
    }

    get summaryActiveLabel():
        string
    {
        return this.info.editOnly ? 'With Expected Days' : 'Active';
    }

    get summarySecondLabel():
        string
    {
        return this.info.editOnly ? 'No Limit' : 'Inactive';
    }

    // Fees / Costs : how many rows are current / upcoming
    get summaryNote():
        string
    {
        if (this.selectedTab === 'Fees' || this.selectedTab === 'Costs')
        {
            const rows =
                this.tabRows as (FeeRow | CostRow)[];

            const current = rows.filter(x => x.RateState === 'Current').length;

            const upcoming = rows.filter(x => x.RateState === 'Upcoming').length;

            return `Current ${current} · Upcoming ${upcoming}`;
        }

        if (this.selectedTab === 'Types')
        {
            const ready = this.typeRows.filter(x => x.Usable).length;

            return `Ready for sale today ${ready} of ${this.typeRows.length}`;
        }

        return 'All registration stages';
    }

    summaryText(value: number): string
    {
        return value.toLocaleString('en-US');
    }
}
