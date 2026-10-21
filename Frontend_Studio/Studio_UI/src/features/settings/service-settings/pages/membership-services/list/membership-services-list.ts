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

    filteredMembershipServices:
        MembershipService[] =
    [];

    pagedMembershipServices:
        MembershipService[] =
    [];

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
        this.loading =
            true;

        this.loadFailed =
            false;

        this.membershipServicesService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        MembershipService[]
                ):
                    void =>
                {
                    // Display values
                    this.membershipServices =
                        (response ?? []).map
                        (
                            item =>
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

                    this.applyFilters();

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
        const keyword =
            this.searchText
                .trim()
                .toLowerCase();

        this.filteredMembershipServices =
            this.membershipServices.filter
            (
                item =>
                {
                    const tabMatch =
                        (
                            this.selectedCardId === null
                            ||
                            Number(item.MembershipCardId) ===
                            this.selectedCardId
                        )
                        &&
                        (
                            this.selectedReadiness === null
                            ||
                            item.Readiness ===
                            this.selectedReadiness
                        );

                    const statusMatch =
                        this.selectedStatus === null
                        ||
                        item.IsActive ===
                        this.selectedStatus;

                    const text =
                        [
                            item.ServiceCode,
                            item.ServiceName,
                            item.DisplayName,
                            item.MembershipType,
                            item.CardCode,
                            item.Readiness,
                            item.SubCategoryCode,
                            item.SubCategoryName,
                            item.IncomeLedgerCode,
                            item.ExpenseLedgerCode,
                            item.Remarks,
                            item.IsActive
                                ? 'active'
                                : 'inactive'
                        ]
                        .join(' ')
                        .toLowerCase();

                    return tabMatch
                        &&
                        statusMatch
                        &&
                        (
                            !keyword
                            ||
                            text.includes(keyword)
                        );
                }
            );

        this.currentPage =
            1;

        this.updatePagination();
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

        this.applyFilters();
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
        const direction =
            event.direction === 'asc'
                ? 1
                : -1;

        this.filteredMembershipServices =
        [
            ...this.filteredMembershipServices
        ]
        .sort
        (
            (a: any, b: any): number =>
            {
                const valueA =
                    a[event.field];

                const valueB =
                    b[event.field];

                if
                (
                    valueA == null
                    &&
                    valueB == null
                )
                {
                    return 0;
                }

                if
                (
                    valueA == null
                )
                {
                    return -1 * direction;
                }

                if
                (
                    valueB == null
                )
                {
                    return 1 * direction;
                }

                if
                (
                    typeof valueA === 'string'
                    &&
                    typeof valueB === 'string'
                )
                {
                    return valueA.localeCompare(valueB) * direction;
                }

                return (valueA < valueB ? -1 : valueA > valueB ? 1 : 0) * direction;
            }
        );

        this.currentPage =
            1;

        this.updatePagination();
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
        const start:
            number =
            (this.currentPage - 1) * this.pageSize;

        this.pagedMembershipServices =
        [
            ...this.filteredMembershipServices.slice
            (
                start,
                start + this.pageSize
            )
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

        this.updatePagination();
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

        this.updatePagination();
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
                item.MembershipServiceId
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
                item.MembershipServiceId
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
}