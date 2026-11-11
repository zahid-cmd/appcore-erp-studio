//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    DestroyRef,
    OnInit,
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
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import
{
    Subscription
}
from 'rxjs';

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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

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
    formatMoney
}
from '../../../../../../shared/components/accounting/accounting.models';

import
{
    REGISTRATION_STAGE_NAMES,
    RegistrationProfileRow,
    RegistrationProfileStage
}
from '../../../models/registration-profiles.model';

import
{
    RegistrationProfilesService
}
from '../../../services/registration-profiles.service';


//===============================================================
// Table rows (display values added)
//===============================================================

type ProfileRow =
    RegistrationProfileRow
    &
    {
        ProfileDateText:string;
        AmountText:string;
        CostText:string;
        SurplusText:string;
        StatusText:string;
        DaysText:string;
    };


//===============================================================
// Registration Profiles (Registration Management > Registration
// Processing). Hand-written page, NO Code Synchronization.
//
// One row per chassis the dealer registers (made by a posted
// Sales Invoice - MB with a registration). Tabs by status, branch
// filter, search; the eye opens the profile on the right. Read
// only : the Registration Collection and stage pages come later.
//===============================================================

@Component(
{
    selector:'registration-profiles-list',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        SearchDropdownComponent,
        ToastComponent
    ],

    templateUrl:'./registration-profiles-list.html',

    styleUrl:'./registration-profiles-list.css'
})

export class RegistrationProfilesList
    implements OnInit
{
    private readonly service =
        inject(RegistrationProfilesService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);

    private request?:
        Subscription;

    //===========================================================
    // State
    //===========================================================

    rows:
        ProfileRow[] =
        [];

    stages:
        RegistrationProfileStage[] =
        [];

    filteredRows:
        ProfileRow[] =
        [];

    pagedRows:
        ProfileRow[] =
        [];

    loading:
        boolean =
        false;

    loadFailed:
        boolean =
        false;

    searchText:
        string =
        '';

    selectedTab:
        string =
        'all';

    branchId:
        number =
        0;

    branchItems:
        { label:string; value:number }[] =
        [{ label:'All Branches', value:0 }];

    currentPage:
        number =
        1;

    pageSize:
        number =
        10;

    // The profile open on the right (null = none)
    viewRow:
        ProfileRow | null =
        null;

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
        { header:'#', field:'serial', type:'serial', width:'45px', align:'center' },
        { header:'Profile No', field:'ProfileNo', width:'230px', align:'left', sortable:true },
        { header:'Date', field:'ProfileDateText', width:'100px', align:'center', sortable:true },
        { header:'Customer', field:'CustomerName', width:'190px', align:'left', sortable:true },
        { header:'Model', field:'ModelName', width:'170px', align:'left', sortable:true, priority:2 },
        { header:'Chassis No', field:'ChassisNo', width:'150px', align:'left', sortable:true },
        { header:'Registration Type', field:'RegistrationTypeName', width:'190px', align:'left', sortable:true, priority:2 },
        { header:'Amount', field:'AmountText', width:'100px', align:'right', sortable:true },
        { header:'Cost', field:'CostText', width:'95px', align:'right', sortable:true, priority:3 },
        { header:'Surplus', field:'SurplusText', width:'95px', align:'right', sortable:true, priority:3 },
        { header:'Days', field:'DaysText', width:'65px', align:'center', sortable:true, priority:3 },
        { header:'Status', field:'StatusText', type:'status', width:'150px', align:'center', sortable:true },
        { header:'View', field:'actions', type:'actions', width:'60px', align:'center' }
    ];

    //===========================================================
    // Tabs (status with counts)
    //===========================================================

    get tabs():
        ControlTab[]
    {
        const count =
            (key: string) =>
                this.branchRows.filter(x => x.Status === key).length;

        return [
            { id:'all', label:`All (${this.branchRows.length})` },
            ...Object.keys(REGISTRATION_STAGE_NAMES)
                .map(key => ({ id:key, label:`${this.stageName(key)} (${count(key)})` }))
        ];
    }

    get totalRecords():
        number
    {
        return this.filteredRows.length;
    }

    private get branchRows():
        ProfileRow[]
    {
        return this.branchId > 0
            ? this.rows.filter(x => x.BranchId === this.branchId)
            : this.rows;
    }

    stageName
    (
        key:
            string
    ):
        string
    {
        return this.stages.find(x => x.StageKey === key)?.StageName
            || REGISTRATION_STAGE_NAMES[key]
            || key;
    }

    money
    (
        value:
            number
    ):
        string
    {
        return formatMoney(Number(value) || 0);
    }

    dateText
    (
        value:
            string
    ):
        string
    {
        if
        (
            !/^\d{4}-\d{2}-\d{2}/.test(value || '')
        )
        {
            return value || '-';
        }

        const months =
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return `${value.substring(8, 10)}-${months[Number(value.substring(5, 7)) - 1]}-${value.substring(0, 4)}`;
    }

    //===========================================================
    // Load
    //===========================================================

    ngOnInit():
        void
    {
        this.load();
    }

    refresh():
        void
    {
        this.load();
    }

    private load():
        void
    {
        this.request?.unsubscribe();

        this.loading =
            true;

        this.loadFailed =
            false;

        this.cdr.detectChanges();

        this.request =
            this.service
                .getList(0)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe
                ({
                    next:
                        result =>
                        {
                            this.loading =
                                false;

                            this.stages =
                                result.Stages;

                            this.rows =
                                result.Rows.map(x => this.toRow(x));

                            const branches =
                                new Map<number, string>();

                            this.rows.forEach(x => branches.set(x.BranchId, x.BranchName || `Branch ${x.BranchId}`));

                            this.branchItems =
                            [
                                { label:'All Branches', value:0 },
                                ...Array.from(branches.entries())
                                    .sort((a, b) => a[1].localeCompare(b[1]))
                                    .map(([value, label]) => ({ label, value }))
                            ];

                            if
                            (
                                this.viewRow
                            )
                            {
                                this.viewRow =
                                    this.rows.find(x => x.RegistrationProfileId === this.viewRow!.RegistrationProfileId) ?? null;
                            }

                            this.applyFilters();
                        },

                    error:
                        error =>
                        {
                            this.loading =
                                false;

                            this.loadFailed =
                                true;

                            this.rows =
                                [];

                            this.applyFilters();

                            this.toast.error(
                                'Load Failed',
                                error?.error?.message
                                ||
                                (typeof error?.error === 'string' ? error.error : '')
                                ||
                                'The registration profiles could not be loaded.'
                            );
                        }
                });
    }

    private toRow
    (
        x:
            RegistrationProfileRow
    ):
        ProfileRow
    {
        const open =
            x.Status !== 'Delivered'
            &&
            x.Status !== 'Cancelled';

        return {
            ...x,
            ProfileDateText:this.dateText(x.ProfileDate),
            AmountText:formatMoney(x.Amount),
            CostText:formatMoney(x.TotalCost),
            SurplusText:formatMoney(x.Surplus),
            StatusText:this.stageName(x.Status),
            DaysText:open ? `${x.DaysInStatus}${x.Overdue ? ' !' : ''}` : '-'
        };
    }

    //===========================================================
    // Filters, paging, sort
    //===========================================================

    private applyFilters():
        void
    {
        const text =
            this.searchText.trim().toLowerCase();

        this.filteredRows =
            this.branchRows
                .filter(x => this.selectedTab === 'all' || x.Status === this.selectedTab)
                .filter
                (
                    x =>
                        !text
                        ||
                        [x.ProfileNo, x.CustomerName, x.CustomerPhone, x.CustomerCode, x.ChassisNo, x.EngineNo, x.ModelName, x.SalesInvoiceNo, x.CustomerFileNo, x.RegistrationTypeName]
                            .some(value => String(value ?? '').toLowerCase().includes(text))
                );

        const pages =
            Math.max(1, Math.ceil(this.filteredRows.length / this.pageSize));

        if
        (
            this.currentPage > pages
        )
        {
            this.currentPage =
                pages;
        }

        this.paginate();
    }

    private paginate():
        void
    {
        const start =
            (this.currentPage - 1) * this.pageSize;

        this.pagedRows =
            this.filteredRows.slice(start, start + this.pageSize);

        this.cdr.detectChanges();
    }

    onTabChange
    (
        tab:
            string
    ):
        void
    {
        this.selectedTab =
            tab;

        this.currentPage =
            1;

        this.applyFilters();
    }

    onSearch
    (
        text:
            string
    ):
        void
    {
        this.searchText =
            text ?? '';

        this.currentPage =
            1;

        this.applyFilters();
    }

    onBranchChange
    (
        value:
            any
    ):
        void
    {
        this.branchId =
            Number(value) || 0;

        this.currentPage =
            1;

        this.applyFilters();
    }

    onPageChange
    (
        page:
            number
    ):
        void
    {
        this.currentPage =
            page;

        this.paginate();
    }

    onPageSizeChange
    (
        size:
            number
    ):
        void
    {
        this.pageSize =
            size;

        this.currentPage =
            1;

        this.paginate();
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
        const raw:
            Record<string, string> =
        {
            ProfileDateText:'ProfileDate',
            AmountText:'Amount',
            CostText:'TotalCost',
            SurplusText:'Surplus',
            DaysText:'DaysInStatus'
        };

        const field =
            raw[event.field] ?? event.field;

        const direction =
            event.direction === 'asc' ? 1 : -1;

        this.filteredRows =
            [...this.filteredRows].sort
            (
                (a: any, b: any) =>
                    typeof a[field] === 'number' && typeof b[field] === 'number'
                        ? (a[field] - b[field]) * direction
                        : String(a[field] ?? '').localeCompare(String(b[field] ?? ''), undefined, { numeric:true }) * direction
            );

        this.paginate();
    }

    //===========================================================
    // View (right panel)
    //===========================================================

    openView
    (
        row:
            any
    ):
        void
    {
        this.viewRow =
            this.rows.find(x => x.RegistrationProfileId === Number(row?.RegistrationProfileId)) ?? null;

        this.cdr.detectChanges();
    }

    closeView():
        void
    {
        this.viewRow =
            null;

        this.cdr.detectChanges();
    }
}
