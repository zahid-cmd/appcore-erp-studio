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
    ActivatedRoute,
    Router
}
from '@angular/router';

//===============================================================
// Models
//===============================================================

import
{
    ScheduledService
}
from '../../../models/scheduled-services.model';

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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

//===============================================================
// Service
//===============================================================

import
{
    ScheduledServicesService
}
from '../../../services/scheduled-services.service';

import
{
    ServicePolicyService
}
from '../../../services/service-policy.service';

import
{
    ServicePolicy
}
from '../../../models/service-policy.model';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'scheduled-services-list',
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
        SearchDropdownComponent,
        ToastComponent
    ],
    templateUrl:'./scheduled-services-list.html',
    styleUrl:'./scheduled-services-list.css'
})

//===============================================================
// Service Sub Category List
//===============================================================

export class ScheduledServicesList
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly scheduledServiceService =
        inject(ScheduledServicesService);

    private readonly servicePolicyService =
        inject(ServicePolicyService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly route =
        inject(ActivatedRoute);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Page Tabs
    //===========================================================

    tabs:
        ControlTab[] =
    [
        {
            id:'all',
            label:'All Scheduled Services'
        },
        {
            id:'Pending',
            label:'Pending'
        },
        {
            id:'Ready',
            label:'Ready'
        },
        {
            id:'Not in Policy',
            label:'Not in Policy'
        }
    ];

    selectedTab:
        string =
        'all';

    //===========================================================
    // Data
    //===========================================================

    scheduledServices:
        ScheduledService[] =
    [];

    // Summary line below the canvas (all records)
    summaryItems:
        {
            label:string;
            value:string;
            tone:'' | 'ok' | 'bad';
        }[] =
    [];

    filteredScheduledServices:
        ScheduledService[] =
    [];

    pagedScheduledServices:
        ScheduledService[] =
    [];


    // Server paging
    totalRecords:
        number =
        0;

    // Total · Active · Inactive (search and filters applied)
    private counts:
        Record<string, number> =
        {};

    private sortField:
        string =
        '';

    private sortDirection:
        'asc' | 'desc' =
        'asc';

    private searchTimer:
        ReturnType<typeof setTimeout> | null =
        null;

    // Answers of older calls are dropped
    private loadSeq:
        number =
        0;

    //===========================================================
    // Search & Loading
    //===========================================================

    searchText:
        string =
        '';

    loading:
        boolean =
        false;

    loadFailed:
        boolean =
        false;

    //===========================================================
    // Status Filter
    //===========================================================

    statusFilterItems:
        any[] =
    [
        {
            label:'All Status',
            value:null
        },
        {
            label:'Active',
            value:true
        },
        {
            label:'Inactive',
            value:false
        }
    ];

    selectedStatus:
        boolean | null =
        null;

    //===========================================================
    // Brand Filter (brands that have a Service Policy)
    //===========================================================

    brandFilterItems:
        any[] =
    [
        {
            label:'All Brands',
            value:null
        }
    ];

    selectedBrandId:
        number | null =
        null;

    //===========================================================
    // Pagination
    //===========================================================

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

    historyTitle:
        string =
        'Scheduled Service History';

    historyItems:
        any[] =
    [];

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
    // Table Columns
    //===========================================================

    readonly columns:
        ListTableColumn[] =
    [
        {
            header:'#',
            field:'serial',
            type:'serial',
            width:'50px',
            align:'center'
        },
        {
            header:'Service Code',
            field:'ServiceCodeDisplay',
            width:'160px',
            align:'center'
        },
        {
            header:'Service Name',
            field:'ServiceName',
            width:'220px',
            align:'left'
        },
        {
            header:'Brand',
            field:'BrandName',
            width:'120px',
            align:'left'
        },
        {
            header:'Seq',
            field:'SequenceNo',
            width:'60px',
            align:'center'
        },
        {
            header:'Type',
            field:'ServiceType',
            width:'80px',
            align:'center'
        },
        {
            header:'Due After',
            field:'DueAfterDisplay',
            width:'110px',
            align:'center'
        },
        {
            header:'Customer Charge',
            field:'CustomerChargeDisplay',
            width:'130px',
            align:'right'
        },
        {
            header:'Brand Reimbursement',
            field:'BrandReimbursementDisplay',
            width:'150px',
            align:'right'
        },
        {
            header:'Income Ledger',
            field:'IncomeLedgerDisplay',
            width:'190px',
            align:'center'
        },
        {
            header:'Readiness',
            field:'Readiness',
            width:'120px',
            align:'center'
        },
        {
            header:'Status',
            field:'IsActive',
            type:'status',
            width:'100px',
            align:'center'
        },
        {
            header:'Actions',
            field:'actions',
            type:'actions',
            width:'80px',
            align:'center'
        }
    ];

    // Rows come from Service Policy : no Delete here
    readonly tableActions =
    {
        view:true,
        edit:true,
        delete:false
    };

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadBrands();

        this.loadItems();
    }

    //===========================================================
    // Load Items
    //===========================================================

    loadItems():
        void
    {
        const seq =
            ++this.loadSeq;

        this.loading =
            true;

        this.loadFailed =
            false;

        this.scheduledServiceService
            .getPaged(this.pageQuery())
            .subscribe
            ({
                next:
                (
                    response:
                        any
                ):
                    void =>
                {
                    if (seq !== this.loadSeq)
                    {
                        return;
                    }

                    // Server page : remember the totals, then the
                    // rows go through the usual mapping below
                    this.totalRecords =
                        Number(response?.totalCount ?? 0);

                    this.counts =
                        response?.counts ?? {};

                    if (Number(response?.page) > 0)
                    {
                        this.currentPage =
                            Number(response.page);
                    }

                    response =
                        response?.items ?? [];

                    // Display values ('-' until the service is priced)
                    this.scheduledServices =
                        (response ?? []).map
                        (
                            (item: any) =>
                            ({
                                ...item,

                                ServiceCodeDisplay:
                                    item.ServiceCode
                                    ||
                                    '-',

                                DueAfterDisplay:
                                    `${item.IntervalDays} days`,

                                CustomerChargeDisplay:
                                    this.amountText(
                                        item.CustomerCharge,
                                        item.IsConfigured
                                        &&
                                        item.ServiceType === 'Paid'
                                    ),

                                BrandReimbursementDisplay:
                                    this.amountText(
                                        item.BrandReimbursement,
                                        item.IsConfigured
                                        &&
                                        item.ServiceType === 'Free'
                                    ),

                                IncomeLedgerDisplay:
                                    item.IncomeLedgerCode
                                    ||
                                    '-'
                            } as ScheduledService)
                        );

                    this.showServerPage();


                    this.updateSummary();

                    this.loading =
                        false;

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    if (seq !== this.loadSeq)
                    {
                        return;
                    }

                    console.error
                    (
                        'Load Scheduled Services Error:',
                        error
                    );

                    this.scheduledServices =
                        [];

                    this.filteredScheduledServices =
                        [];

                    this.pagedScheduledServices =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error
                    (
                        'Load Failed',
                        'Unable to load scheduled services.'
                    );

                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Apply Filters
    //===========================================================

    applyFilters():
        void
    {
        // Search, filters and paging run on the server
        this.currentPage =
            1;

        this.loadItems();
    }

    //===========================================================
    // Amount Text ("1,200.00"; '-' when it does not apply)
    //===========================================================

    private amountText
    (
        value:
            number,
        applies:
            boolean
    ):
        string
    {
        if
        (
            !applies
        )
        {
            return '-';
        }

        return Number(value ?? 0).toLocaleString(
            'en-US',
            {
                minimumFractionDigits:2,
                maximumFractionDigits:2
            }
        );
    }

    //===========================================================
    // Tab Change
    //===========================================================

    onTabChange
    (
        value:
            string
    ):
        void
    {
        this.selectedTab =
            value;

        this.applyFilters();

        this.cdr.detectChanges();
    }

    //===========================================================
    // Search
    //===========================================================

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText =
            value
            ??
            '';

        if (this.searchTimer)
        {
            clearTimeout(this.searchTimer);
        }

        this.searchTimer =
            setTimeout(
                (): void =>
                {
                    this.searchTimer = null;

                    this.applyFilters();
                },
                300
            );
    }

    //===========================================================
    // Brand Filter Change
    //===========================================================

    onBrandFilterChange
    (
        value:
            number | null
    ):
        void
    {
        this.selectedBrandId =
            value === null
            ||
            value === undefined
                ? null
                : Number(value);

        this.applyFilters();
    }

    //===========================================================
    // Load Brands (from the Service Policies, one per brand)
    //===========================================================

    private loadBrands():
        void
    {
        this.servicePolicyService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        ServicePolicy[]
                ):
                    void =>
                {
                    const brands =
                        new Map<number, string>();

                    for
                    (
                        const policy
                        of response ?? []
                    )
                    {
                        const id =
                            Number(policy.BrandManagementId);

                        if
                        (
                            id > 0
                            &&
                            !brands.has(id)
                        )
                        {
                            brands.set(
                                id,
                                policy.BrandName || `Brand ${id}`
                            );
                        }
                    }

                    this.brandFilterItems =
                    [
                        {
                            label:'All Brands',
                            value:null
                        },

                        ...[...brands.entries()]
                            .sort(
                                (a, b) =>
                                    a[1].localeCompare(b[1])
                            )
                            .map(
                                ([id, name]) =>
                                ({
                                    label:name,
                                    value:id
                                })
                            )
                    ];

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Service Policy Brands Error:',
                        error
                    );
                }
            });
    }

    //===========================================================
    // Status Filter Change
    //===========================================================

    onStatusFilterChange
    (
        value:
            boolean | null
    ):
        void
    {
        this.selectedStatus =
            value === null
                ? null
                : Boolean(value);

        this.applyFilters();
    }

    //===========================================================
    // Sort
    //===========================================================

    onSort
    (
        event:
        {
            field:
                string;

            direction:
                'asc' | 'desc';
        }
    ):
        void
    {
        // The server sorts the whole list
        this.sortField =
            event.field;

        this.sortDirection =
            event.direction === 'desc'
                ? 'desc'
                : 'asc';

        this.currentPage =
            1;

        this.loadItems();
    }

    //===========================================================
    // Refresh
    //===========================================================

    refresh():
        void
    {
        this.searchText =
            '';

        this.selectedTab =
            'all';

        this.selectedStatus =
            null;

        this.selectedBrandId =
            null;

        this.currentPage =
            1;

        this.loadBrands();

        this.loadItems();
    }

    //===========================================================
    // Pagination
    //===========================================================

    updatePagination():
        void
    {
        // The server sends one page
        this.pagedScheduledServices =
        [
            ...this.filteredScheduledServices
        ];
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

        this.loadItems();
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

        this.loadItems();
    }

    //===========================================================
    // Add / View / Edit
    //===========================================================

    add():
        void
    {
        void this.router.navigate
        (
            [
                'add'
            ],
            {
                relativeTo:
                    this.route.parent
            }
        );
    }

    view
    (
        item:
            ScheduledService
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',
                item.PublicId
            ],
            {
                relativeTo:
                    this.route.parent
            }
        );
    }

    edit
    (
        item:
            ScheduledService
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',
                item.PublicId
            ],
            {
                relativeTo:
                    this.route.parent
            }
        );
    }

    //===========================================================
    // History
    //===========================================================

    openHistory():
        void
    {
        this.scheduledServiceService
            .getHistory()
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ):
                    void =>
                {
                    this.historyItems =
                        (response ?? []).map
                        (
                            history =>
                            ({
                                title:
                                    history.activityTitle
                                    ??
                                    history.ActivityTitle,

                                description:
                                    history.activityDescription
                                    ??
                                    history.ActivityDescription,

                                user:
                                    history.performedByName
                                    ??
                                    history.PerformedByName
                                    ??
                                    'System',

                                dateTime:
                                    new Date
                                    (
                                        history.performedDate
                                        ??
                                        history.PerformedDate
                                    )
                                    .toLocaleString(),

                                badge:
                                    history.activityType
                                    ??
                                    history.ActivityType
                            })
                        );

                    this.historyTitle =
                        'Scheduled Service History';

                    this.historyOpened =
                        true;

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error
                    (
                        'History Load Failed:',
                        error
                    );

                    this.toast.error
                    (
                        'History',
                        'Failed to load scheduled service history.'
                    );
                }
            });
    }

    closeHistory():
        void
    {
        this.historyOpened =
            false;

        this.cdr.detectChanges();
    }

    //===========================================================
    // Summary Line (below the canvas) : Total / Active / Inactive
    // of all records
    //===========================================================

    private updateSummary():
        void
    {
        // Counts from the server : search and filters applied,
        // the status filter not
        const count =
            (key: string): number =>
                Number(this.counts[key] ?? 0);

        const text =
            (value: number): string =>
                value.toLocaleString('en-US');

        this.summaryItems =
        [
            { label:'Total',    value:text(count('Total')),    tone:'' },
            { label:'Active',   value:text(count('Active')),   tone:'ok' },
            { label:'Inactive', value:text(count('Inactive')), tone:'bad' }
        ];
    }



    //===========================================================
    // Server Paging Helpers
    //===========================================================

    private pageQuery():
        Record<string, unknown>
    {
        return {
            page:this.currentPage,
            pageSize:this.pageSize,
            search:this.searchText,
            sort:this.sortField,
            dir:this.sortDirection,
            status:this.selectedStatus === null ? '' : (this.selectedStatus ? 'active' : 'inactive'),
            tab:this.selectedTab,
            brandId:this.selectedBrandId ?? undefined
        };
    }


    // The rows of the page arrive already filtered and sorted
    private showServerPage():
        void
    {
        this.filteredScheduledServices =
            this.scheduledServices;

        this.updatePagination();
    }
}
