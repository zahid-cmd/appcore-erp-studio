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

import
{
    Observable,
    defer,
    timer,
    throwError,
    delayWhen,
    catchError,
    switchMap
}
from 'rxjs';

//===============================================================
// Models
//===============================================================

import
{
    MembershipService,
    MembershipServicesDefaults
}
from '../../../models/membership-services.model';

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
    MembershipServicesService
}
from '../../../services/membership-services.service';

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'membership-services-list',
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
    templateUrl:'./membership-services-list.html',
    styleUrl:'./membership-services-list.css'
})

//===============================================================
// Membership Services List (configure-only)
//
// Rows are created by Membership Cards. No Add, Delete or Restore :
// View, and Edit to set the Service Value / status / remarks.
//===============================================================

export class MembershipServicesList
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly membershipServicesService =
        inject(MembershipServicesService);

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
            label:'All Membership Services'
        }
    ];

    selectedTab:
        string =
        'all';

    //===========================================================
    // Data
    //===========================================================

    membershipServices:
        MembershipService[] =
    [];

    // Summary line below the canvas (all records)
    summaryItems:
        {
            label:string;
            value:string;
            tone:'' | 'ok' | 'bad';
        }[] =
    [];

    filteredMembershipServices:
        MembershipService[] =
    [];

    pagedMembershipServices:
        MembershipService[] =
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
    // Membership Card Filter
    //===========================================================

    cardFilterItems:
        any[] =
    [
        {
            label:'All Membership Cards',
            value:null
        }
    ];

    selectedCardId:
        number | null =
        null;


    //===========================================================
    // Readiness Filter (Pending : no Service Value yet)
    //===========================================================

    readinessFilterItems:
        any[] =
    [
        {
            label:'All Readiness',
            value:null
        },
        {
            label:'Pending',
            value:'Pending'
        },
        {
            label:'Ready',
            value:'Ready'
        }
    ];

    selectedReadiness:
        string | null =
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
        'Membership Services History';

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
            field:'ServiceCode',
            width:'160px',
            align:'center'
        },
        {
            header:'Membership Card',
            field:'MembershipType',
            width:'150px',
            align:'left'
        },
        {
            header:'Service Name',
            field:'DisplayName',
            width:'280px',
            align:'left'
        },
        {
            header:'Service Value',
            field:'ServiceValueDisplay',
            width:'120px',
            align:'right'
        },
        {
            header:'Readiness',
            field:'Readiness',
            width:'100px',
            align:'center'
        },
        {
            header:'Income Ledger',
            field:'IncomeLedgerCode',
            width:'180px',
            align:'center'
        },
        {
            header:'Expense Ledger',
            field:'ExpenseLedgerCode',
            width:'180px',
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


    //===========================================================
    // Row Actions : view and configure only (rows are deleted
    // with their card)
    //===========================================================

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
        this.loadFilters();

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

        this.membershipServicesService
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

                    // Display values
                    this.membershipServices =
                        (response ?? []).map
                        (
                            (item: any) =>
                            ({
                                ...item,

                                SubCategoryDisplay:
                                    [
                                        item.SubCategoryCode,
                                        item.SubCategoryName
                                    ]
                                    .filter(
                                        value =>
                                            !!value
                                    )
                                    .join(' - ')
                                    ||
                                    '-',

                                ServiceValueDisplay:
                                    !(Number(item.ServiceValue ?? 0) > 0)
                                        ? '-'
                                        : Number(item.ServiceValue ?? 0).toLocaleString(
                                        'en-US',
                                        {
                                            minimumFractionDigits:2,
                                            maximumFractionDigits:2
                                        }
                                    )
                            } as MembershipService)
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
                        'Load Membership Services Error:',
                        error
                    );

                    this.membershipServices =
                        [];

                    this.filteredMembershipServices =
                        [];

                    this.pagedMembershipServices =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error
                    (
                        'Load Failed',
                        'Unable to load membership services.'
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
    // Membership Card Filter Change
    //===========================================================

    onCardFilterChange
    (
        value:
            number | null
    ):
        void
    {
        this.selectedCardId =
            value === null
            ||
            value === undefined
                ? null
                : Number(value);

        this.applyFilters();
    }


    //===========================================================
    // Readiness Filter Change
    //===========================================================

    onReadinessFilterChange
    (
        value:
            string | null
    ):
        void
    {
        this.selectedReadiness =
            value
                ? String(value)
                : null;

        this.applyFilters();
    }


    //===========================================================
    // Load Filters (membership cards)
    //===========================================================

    private loadFilters():
        void
    {
        this.membershipServicesService
            .getDefaults()
            .subscribe
            ({
                next:
                (
                    response:
                        MembershipServicesDefaults
                ):
                    void =>
                {
                    this.cardFilterItems =
                    [
                        {
                            label:'All Membership Cards',
                            value:null
                        },

                        ...(response.Cards ?? []).map(
                            option =>
                            ({
                                label:
                                    `${option.CardCode} - ${option.CardName}`,

                                value:
                                    Number(option.MembershipCardId)
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
                        'Load Membership Cards Error:',
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

        this.selectedCardId =
            null;

        this.selectedReadiness =
            null;

        this.currentPage =
            1;

        this.loadFilters();

        this.loadItems();
    }

    //===========================================================
    // Pagination
    //===========================================================

    updatePagination():
        void
    {
        // The server sends one page
        this.pagedMembershipServices =
        [
            ...this.filteredMembershipServices
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
    // View / Configure
    //===========================================================

    view
    (
        item:
            MembershipService
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
            MembershipService
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
        this.membershipServicesService
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
                        'Membership Services History';

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
                        'Failed to load membership service history.'
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
            cardId:this.selectedCardId ?? undefined,
            readiness:this.selectedReadiness ?? undefined
        };
    }


    // The rows of the page arrive already filtered and sorted
    private showServerPage():
        void
    {
        this.filteredMembershipServices =
            this.membershipServices;

        this.updatePagination();
    }
}
