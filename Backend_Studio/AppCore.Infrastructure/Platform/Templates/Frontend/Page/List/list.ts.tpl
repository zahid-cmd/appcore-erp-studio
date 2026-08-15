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
    Router
}
from '@angular/router';


//===============================================================
// Models
//===============================================================

import
{
    {{MODEL_IMPORT}}
}
from '{{MODEL_PATH}}';


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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

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
    {{SERVICE_CLASS}}
}
from '{{SERVICE_PATH}}';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'{{LIST_SELECTOR}}',

    standalone:true,

    imports:
    [
        CommonModule,

        PageHeaderComponent,

        PageToolbarComponent,

        ControlTabsComponent,

        SearchBoxComponent,

        SearchDropdownComponent,

        CommandCenterComponent,

        PageCanvasComponent,

        ListTableComponent,

        PaginationComponent,

        HistoryDrawerComponent,

        ConfirmDialogComponent,

        ToastComponent
    ],

    templateUrl:'./{{LIST_HTML_FILE}}',

    styleUrl:'./{{LIST_CSS_FILE}}'
})


//===============================================================
// {{ENTITY_NAME}} List Component
//===============================================================

export class {{LIST_COMPONENT_CLASS}}
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly {{SERVICE_PROPERTY}} =
        inject({{SERVICE_CLASS}});


    private readonly confirmDialog =
        inject(ConfirmDialogService);


    private readonly toast =
        inject(ToastService);


    private readonly router =
        inject(Router);


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

            label:'All {{ENTITY_PLURAL}}'
        }
    ];


    selectedTab:
        string =
        'all';



    //===========================================================
    // Parent Filter
    //===========================================================

    items:
        any[] =
    [
        {
            value:null,

            text:'All {{FILTER_NAME}}'
        }
    ];


    selectedItemId:
        number | null =
        null;



    //===========================================================
    // Data Source
    //===========================================================

    {{ENTITY_PLURAL_PROPERTY}}:
        {{ENTITY_CLASS}}[] =
    [];


    filtered{{ENTITY_PLURAL}}:
        {{ENTITY_CLASS}}[] =
    [];


    paged{{ENTITY_PLURAL}}:
        {{ENTITY_CLASS}}[] =
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
        '{{ENTITY_NAME}} History';


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

            width:'60px',

            align:'center'
        },

        {
            header:'Code',

            field:'code',

            width:'180px',

            align:'center'
        },

        {
            header:'Name',

            field:'name',

            align:'left'
        },

        {
            header:'Status',

            field:'isActive',

            type:'status',

            width:'120px',

            align:'center'
        },

        {
            header:'Actions',

            field:'actions',

            type:'actions',

            width:'180px',

            align:'center'
        }
    ];



    //===========================================================
    // Initialization
    //===========================================================

    ngOnInit():
        void
    {
        this.load{{FILTER_NAME}}();

        this.loadItems();
    }



    //===========================================================
    // Load Parent Filter
    //===========================================================

    load{{FILTER_NAME}}():
        void
    {
        //=======================================================
        // Parent filter loading remains feature specific.
        //
        // The synchronization engine only generates the
        // standard list structure.
        //=======================================================
    }



    //===========================================================
    // Load {{ENTITY_PLURAL}}
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;


        this.loadFailed =
            false;


        this.{{SERVICE_PROPERTY}}
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        {{ENTITY_CLASS}}[]
                ): void =>
                {
                    this.{{ENTITY_PLURAL_PROPERTY}} =
                    [
                        ...response
                    ];


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
                ): void =>
                {
                    console.error
                    (
                        'Load {{ENTITY_PLURAL}} Error',

                        error
                    );


                    this.{{ENTITY_PLURAL_PROPERTY}} =
                    [];


                    this.filtered{{ENTITY_PLURAL}} =
                    [];


                    this.paged{{ENTITY_PLURAL}} =
                    [];


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error
                    (
                        'Load Failed',

                        'Unable to load {{ENTITY_PLURAL_LOWER}}.'
                    );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Parent Filter Changed
    //===========================================================

    onFilterChange
    (
        id:
            number | null
    ):
        void
    {
        this.selectedItemId =
            id;


        this.applyFilters();
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


        this.filtered{{ENTITY_PLURAL}} =
            this.{{ENTITY_PLURAL_PROPERTY}}
                .filter
                (
                    (
                        x:
                            {{ENTITY_CLASS}}
                    ):
                        boolean =>
                    {
                        const filterMatch =
                            !this.selectedItemId
                            ||
                            x.{{FILTER_FIELD}}
                            ===
                            this.selectedItemId;


                        const searchMatch =
                            !keyword
                            ||
                            x.code
                                ?.toLowerCase()
                                .includes(keyword)
                            ||
                            x.name
                                ?.toLowerCase()
                                .includes(keyword)
                            ||
                            x.remarks
                                ?.toLowerCase()
                                .includes(keyword);


                        return filterMatch
                            &&
                            searchMatch;
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
            value;


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
        this.filtered{{ENTITY_PLURAL}} =
        [
            ...this.filtered{{ENTITY_PLURAL}}
        ];


        this.filtered{{ENTITY_PLURAL}}.sort
        (
            (
                a:
                    {{ENTITY_CLASS}},

                b:
                    {{ENTITY_CLASS}}
            ):
                number =>
            {
                const valueA:
                    any =
                    a[
                        event.field as keyof {{ENTITY_CLASS}}
                    ];


                const valueB:
                    any =
                    b[
                        event.field as keyof {{ENTITY_CLASS}}
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


        this.selectedItemId =
            null;


        this.load{{FILTER_NAME}}();

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


        this.paged{{ENTITY_PLURAL}} =
        [
            ...this.filtered{{ENTITY_PLURAL}}
                .slice
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
                '{{ADD_ROUTE}}'
            ]
        );
    }



    //===========================================================
    // View
    //===========================================================

    view
    (
        item:
            {{ENTITY_CLASS}}
    ):
        void
    {
        void this.router.navigate
        (
            [
                '{{VIEW_ROUTE}}',

                item.id
            ]
        );
    }



    //===========================================================
    // Edit
    //===========================================================

    edit
    (
        item:
            {{ENTITY_CLASS}}
    ):
        void
    {
        void this.router.navigate
        (
            [
                '{{EDIT_ROUTE}}',

                item.id
            ]
        );
    }



    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        item:
            {{ENTITY_CLASS}}
    ):
        void
    {
        this.confirmDialog.open
        (
            'Delete {{ENTITY_NAME}}',

            `Are you sure you want to delete "${item.name}" ?`,

            (): void =>
            {
                this.{{SERVICE_PROPERTY}}
                    .delete
                    (
                        item.id
                    )
                    .subscribe
                    ({
                        next:
                        (): void =>
                        {
                            this.toast.success
                            (
                                'Delete Successful',

                                `${item.name} deleted successfully.`
                            );


                            this.loadItems();
                        },


                        error:
                        (
                            error:
                                unknown
                        ): void =>
                        {
                            console.error
                            (
                                'Delete {{ENTITY_NAME}} Error',

                                error
                            );


                            this.toast.error
                            (
                                'Delete Failed',

                                'Failed to delete {{ENTITY_LOWER}}.'
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
            'Restore {{ENTITY_NAME}}',

            'Are you sure you want to restore the most recently deleted {{ENTITY_LOWER}}?',

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
        this.{{SERVICE_PROPERTY}}
            .restore()
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.toast.success
                    (
                        'Restore Successful',

                        'The most recently deleted {{ENTITY_LOWER}} has been restored.'
                    );


                    this.loadItems();
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error
                    (
                        'Restore {{ENTITY_NAME}} Error',

                        error
                    );


                    this.toast.error
                    (
                        'Restore Failed',

                        'Failed to restore {{ENTITY_LOWER}}.'
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
        this.{{SERVICE_PROPERTY}}
            .getHistory()
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ): void =>
                {
                    this.historyItems =
                        response.map
                        (
                            history =>
                            ({
                                title:
                                    history.activityTitle,


                                description:
                                    history.activityDescription,


                                user:
                                    history.performedByName
                                    ??
                                    'System',


                                dateTime:
                                    new Date
                                    (
                                        history.performedDate
                                    )
                                    .toLocaleString(),


                                badge:
                                    history.activityType
                            })
                        );


                    this.historyTitle =
                        '{{ENTITY_NAME}} Management History';


                    this.historyOpened =
                        true;


                    this.cdr.detectChanges();
                },


                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    console.error
                    (
                        'History Load Failed',

                        error
                    );


                    this.toast.error
                    (
                        'History',

                        'Failed to load {{ENTITY_LOWER}} history.'
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