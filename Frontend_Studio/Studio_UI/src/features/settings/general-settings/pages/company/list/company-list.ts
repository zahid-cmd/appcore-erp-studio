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
    ActivatedRoute,
    Router
}
from '@angular/router';


//===============================================================
// Models
//===============================================================

import
{
    Company
}
from '../../../models/company.model';


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
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';


//===============================================================
// Service
//===============================================================

import
{
    CompanyService
}
from '../../../services/company.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'company-list',

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

        ToastComponent
    ],

    templateUrl:'./company-list.html',

    styleUrl:'./company-list.css'
})


//===============================================================
// Company List
//===============================================================

export class CompanyList
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly companyservice =
        inject(CompanyService);


    private readonly confirmDialog =
        inject(ConfirmDialogService);


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

            label:'All Companies'
        }
    ];


    selectedTab:
        string =
        'all';



    //===========================================================
    // Data
    //===========================================================

    companies:
        Company[] =
    [];


    filteredCompanies:
        Company[] =
    [];


    pagedCompanies:
        Company[] =
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
        'Company History';


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
            header:'Company Code',

            field:'CompanyCode',

            width:'160px',

            align:'center'
        },

        {
            header:'Company Name',

            field:'CompanyName',

            width:'250px',

            align:'left'
        },

        {
            header:'Short Name',

            field:'CompanyShortName',

            width:'160px',

            align:'left'
        },

        {
            header:'Phone',

            field:'Phone',

            width:'160px',

            align:'center'
        },

        {
            header:'Mobile',

            field:'Mobile',

            width:'160px',

            align:'center'
        },

        {
            header:'Email',

            field:'Email',

            width:'250px',

            align:'left'
        },

        {
            header:'Status',

            field:'IsActive',

            width:'120px',

            align:'center',

            type:'status'
        },

        {
            header:'Actions',

            field:'actions',

            type:'actions',

            width:'150px',

            align:'center'
        }
    ];



    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadItems();
    }



    //===========================================================
    // Normalize API Response
    //===========================================================

    private normalizeCompany
    (
        item:
            any
    ):
        Company
    {
        return {
            CompanyId:
                Number
                (
                    item?.CompanyId
                    ??
                    item?.companyId
                    ??
                    0
                ),

            CompanyCode:
                item?.CompanyCode
                ??
                item?.companyCode
                ??
                '',

            CompanyName:
                item?.CompanyName
                ??
                item?.companyName
                ??
                '',

            CompanyShortName:
                item?.CompanyShortName
                ??
                item?.companyShortName
                ??
                '',

            AddressLine1:
                item?.AddressLine1
                ??
                item?.addressLine1
                ??
                '',

            AddressLine2:
                item?.AddressLine2
                ??
                item?.addressLine2
                ??
                '',

            Phone:
                item?.Phone
                ??
                item?.phone
                ??
                '',

            Mobile:
                item?.Mobile
                ??
                item?.mobile
                ??
                '',

            Email:
                item?.Email
                ??
                item?.email
                ??
                '',

            Website:
                item?.Website
                ??
                item?.website
                ??
                '',

            BINNo:
                item?.BINNo
                ??
                item?.binNo
                ??
                '',

            OwnershipType:
                item?.OwnershipType
                ??
                item?.ownershipType
                ??
                '',

            EconomicActivity:
                item?.EconomicActivity
                ??
                item?.economicActivity
                ??
                '',

            TINNo:
                item?.TINNo
                ??
                item?.tinNo
                ??
                '',

            TradeLicenseNo:
                item?.TradeLicenseNo
                ??
                item?.tradeLicenseNo
                ??
                '',

            CompanyLogoPath:
                item?.CompanyLogoPath
                ??
                item?.companyLogoPath
                ??
                '',

            Remarks:
                item?.Remarks
                ??
                item?.remarks
                ??
                '',

            IsActive:
                Boolean
                (
                    item?.IsActive
                    ??
                    item?.isActive
                    ??
                    true
                )
        };
    }



    //===========================================================
    // Normalize API Response List
    //===========================================================

    private normalizeCompanies
    (
        response:
            any
    ):
        Company[]
    {
        if
        (
            !Array.isArray(response)
        )
        {
            return [];
        }


        return response.map
        (
            item =>
                this.normalizeCompany(
                    item
                )
        );
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


        this.companyservice
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        Company[]
                ):
                    void =>
                {
                    console.log
                    (
                        'Company API Response:',
                        response
                    );


                    this.companies =
                        this.normalizeCompanies(
                            response
                        );


                    console.log
                    (
                        'Normalized Companies:',
                        this.companies
                    );


                    this.applyFilters();


                    this.loading =
                        false;


                    this.loadFailed =
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
                        'Load Companies Error:',
                        error
                    );


                    this.companies =
                        [];


                    this.filteredCompanies =
                        [];


                    this.pagedCompanies =
                        [];


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load companies.'
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


        this.filteredCompanies =
            this.companies.filter
            (
                (
                    item:
                        Company
                ):
                    boolean =>
                {
                    const companyCode =
                        item.CompanyCode
                        ??
                        '';


                    const companyName =
                        item.CompanyName
                        ??
                        '';


                    const companyShortName =
                        item.CompanyShortName
                        ??
                        '';


                    const phone =
                        item.Phone
                        ??
                        '';


                    const mobile =
                        item.Mobile
                        ??
                        '';


                    const email =
                        item.Email
                        ??
                        '';


                    const website =
                        item.Website
                        ??
                        '';


                    const status =
                        item.IsActive
                            ? 'active'
                            : 'inactive';


                    const searchMatch =
                        !keyword
                        ||
                        companyCode
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        companyName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        companyShortName
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        phone
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        mobile
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        email
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        website
                            .toLowerCase()
                            .includes(keyword)
                        ||
                        status
                            .includes(keyword);


                    return searchMatch;
                }
            );


        this.currentPage =
            1;


        this.updatePagination();
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
        this.filteredCompanies =
        [
            ...this.filteredCompanies
        ];


        this.filteredCompanies.sort
        (
            (
                a:
                    Company,

                b:
                    Company
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof Company
                    ];


                const valueB:
                    any =
                    b[
                        event.field as keyof Company
                    ];


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
                    return -1;
                }


                if
                (
                    valueB == null
                )
                {
                    return 1;
                }


                if
                (
                    typeof valueA === 'string'
                    &&
                    typeof valueB === 'string'
                )
                {
                    return event.direction === 'asc'
                        ?
                        valueA.localeCompare(valueB)
                        :
                        valueB.localeCompare(valueA);
                }


                if
                (
                    valueA < valueB
                )
                {
                    return event.direction === 'asc'
                        ?
                        -1
                        :
                        1;
                }


                if
                (
                    valueA > valueB
                )
                {
                    return event.direction === 'asc'
                        ?
                        1
                        :
                        -1;
                }


                return 0;
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


        this.currentPage =
            1;


        this.loadItems();
    }



    //===========================================================
    // Update Pagination
    //===========================================================

    updatePagination():
        void
    {
        const start:
            number =
            (
                this.currentPage - 1
            )
            *
            this.pageSize;


        this.pagedCompanies =
        [
            ...this.filteredCompanies.slice
            (
                start,

                start + this.pageSize
            )
        ];
    }



    //===========================================================
    // Page Change
    //===========================================================

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



    //===========================================================
    // Page Size Change
    //===========================================================

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
    // Add
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



    //===========================================================
    // View
    //===========================================================

    view
    (
        item:
            Company
    ):
        void
    {
        void this.router.navigate
        (
            [
                'view',

                item.CompanyId
            ],

            {
                relativeTo:
                    this.route.parent
            }
        );
    }



    //===========================================================
    // Edit
    //===========================================================

    edit
    (
        item:
            Company
    ):
        void
    {
        void this.router.navigate
        (
            [
                'edit',

                item.CompanyId
            ],

            {
                relativeTo:
                    this.route.parent
            }
        );
    }



    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        item:
            Company
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete Company',

            `Are you sure you want to delete "${item.CompanyName}" ?`,

            (): void =>
            {
                this.companyservice
                    .delete
                    (
                        item.CompanyId
                    )
                    .subscribe
                    ({
                        next:
                        (): void =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',

                                `${item.CompanyName} deleted successfully.`
                            );


                            this.loadItems();
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
                                'Delete Company Error:',
                                error
                            );


                            //===================================================
                            // Deletion Blocked
                            //===================================================

                            if
                            (
                                error instanceof HttpErrorResponse
                                &&
                                error.status === 409
                            )
                            {
                                let message =
                                    'Company cannot be deleted because it is already configured.';


                                if
                                (
                                    typeof error.error === 'string'
                                    &&
                                    error.error.trim()
                                )
                                {
                                    message =
                                        error.error;
                                }
                                else if
                                (
                                    error.error?.message
                                )
                                {
                                    message =
                                        error.error.message;
                                }
                                else if
                                (
                                    error.error?.title
                                )
                                {
                                    message =
                                        error.error.title;
                                }


                                this.toast.info
                                (
                                    'Delete Blocked',

                                    message
                                );


                                return;
                            }


                            //===================================================
                            // Delete Failed
                            //===================================================

                            this.toast.error
                            (
                                'Delete Failed',

                                'Failed to delete company.'
                            );
                        }
                    });
            }
        );
    }



    //===========================================================
    // Restore
    //===========================================================

    restore():
        void
    {
        this.confirmDialog.open
        (
            'Restore Company',

            'Are you sure you want to restore the most recently deleted company?',

            (): void =>
            {
                this.restoreItem();
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }



    //===========================================================
    // Restore Item
    //===========================================================

    private restoreItem():
        void
    {
        this.companyservice
            .restore()
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.toast.success
                    (
                        'Restore Successful',

                        'The most recently deleted company has been restored.'
                    );


                    this.loadItems();
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
                        'Restore Company Error',

                        error
                    );


                    if
                    (
                        error instanceof HttpErrorResponse
                        &&
                        error.status === 404
                    )
                    {
                        this.toast.info
                        (
                            'No Data to Restore',

                            'There is no deleted company record to restore.'
                        );


                        return;
                    }


                    this.toast.error
                    (
                        'Restore Failed',

                        'Failed to restore company.'
                    );
                }
            });
    }



    //===========================================================
    // Open History
    //===========================================================

    openHistory():
        void
    {
        this.companyservice
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
                        response.map
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
                        'Company Management History';


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

                        'Failed to load company history.'
                    );
                }
            });
    }



    //===========================================================
    // Close History
    //===========================================================

    closeHistory():
        void
    {
        this.historyOpened =
            false;
    }

}