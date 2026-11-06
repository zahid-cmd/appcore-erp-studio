//===============================================================
// Rack Management List
//
// Two tabs :
//   Racks : Warehouse · Zone · Rack Code · Rack · Shelves · Bins ·
//           Assigned to · Items · Status (add / edit on the form)
//   Zones : Warehouse · Zone Code · Zone · Priority · Racks ·
//           Status (add / edit in the shared Form Modal)
//
// No toasts : what an action did shows as a notice on the
// toolbar.
//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    OnDestroy,
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
    RackManagement,
    RackZone,
    CreateRackZone,
    UpdateRackZone,
    RackZoneDefaults
}
from '../../../../../settings/product-settings/models/rack-management.model';


// Rack row with its display texts
type RackListRow =
    RackManagement
    &
    {
        WarehouseText:string;
        ZoneText:string;
        AssignedText:string;
        BinsTotal:number;
    };


// Zone row with its display texts
type ZoneListRow =
    RackZone
    &
    {
        WarehouseText:string;
    };


// What an action did (no toast on this page)
interface ListNotice
{
    tone:'info' | 'ok' | 'error';
    text:string;
}


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
    FormModalComponent
}
from '../../../../../../shared/components/utilities/form-modal/form-modal';

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
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';


//===============================================================
// Services
//===============================================================

import
{
    RackManagementService
}
from '../../../../../settings/product-settings/services/rack-management.service';

// Warehouses live in General Settings
import
{
    WarehousesService
}
from '../../../../../settings/general-settings/services/warehouses.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'rackManagement-list',

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

        FormModalComponent,

        TextboxComponent,

        TextareaComponent,

        DropdownComponent,

        SearchDropdownComponent
    ],

    templateUrl:'./rack-management-list.html',

    styleUrl:'./rack-management-list.css'
})


//===============================================================
// Rack Management List
//===============================================================

export class RackManagementList
implements OnInit, OnDestroy
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly rackManagementService =
        inject(RackManagementService);


    private readonly warehousesService =
        inject(WarehousesService);


    private readonly confirmDialog =
        inject(ConfirmDialogService);


    private readonly router =
        inject(Router);


    private readonly route =
        inject(ActivatedRoute);


    private readonly cdr =
        inject(ChangeDetectorRef);


    // Progress dialog around save / delete / restore
    readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges()
        );



    //===========================================================
    // Page Tabs : Racks / Zones
    //===========================================================

    tabs:
        ControlTab[] =
    [
        {
            id:'racks',

            label:'Racks'
        },

        {
            id:'zones',

            label:'Zones'
        }
    ];


    selectedTab:
        string =
        'racks';


    get isZonesTab():
        boolean
    {
        return this.selectedTab === 'zones';
    }



    //===========================================================
    // Data
    //===========================================================

    racks:
        RackListRow[] =
    [];


    zones:
        ZoneListRow[] =
    [];


    filteredRows:
        any[] =
    [];


    pagedRows:
        any[] =
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
    // Notice (instead of toasts)
    //===========================================================

    notice:
        ListNotice | null =
        null;


    private noticeTimer?:
        number;



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
        'Rack Management History';


    historyItems:
        any[] =
    [];



    //===========================================================
    // Zone Modal (shared Form Modal)
    //===========================================================

    zoneModalOpened:
        boolean =
        false;


    zoneModalMode:
        'add' | 'edit' | 'view' =
        'add';


    zoneDraft:
        RackZone =
        this.emptyZone();


    // Text in the Priority box
    zonePriorityText:
        string =
        '1';


    // Error shown in the modal footer
    zoneError:
        string =
        '';


    // Active warehouses (the zone's own one always stays)
    zoneWarehouseItems:
        any[] =
    [];


    readonly statusItems:
        any[] =
    [
        {
            label:'Active',

            value:true
        },

        {
            label:'Inactive',

            value:false
        }
    ];


    private warehouses:
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
    // Table Columns : Racks
    //===========================================================

    readonly rackColumns:
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
            header:'Warehouse',

            field:'WarehouseText',

            width:'220px',

            align:'left'
        },

        {
            header:'Zone',

            field:'ZoneText',

            width:'180px',

            align:'left'
        },

        {
            header:'Rack Code',

            field:'FullRackCode',

            width:'170px',

            align:'center'
        },

        {
            header:'Rack',

            field:'RackName',

            width:'110px',

            align:'left'
        },

        {
            header:'Shelves',

            field:'ShelfCount',

            width:'90px',

            align:'center'
        },

        {
            header:'Bins',

            field:'BinsTotal',

            width:'80px',

            align:'center'
        },

        {
            header:'Assigned to',

            field:'AssignedText',

            align:'left'
        },

        {
            header:'Items',

            field:'PartsPlaced',

            width:'80px',

            align:'center'
        },

        {
            header:'Status',

            field:'IsActive',

            width:'120px',

            type:'status',

            align:'center'
        },

        {
            header:'Actions',

            field:'actions',

            type:'actions',

            width:'130px',

            align:'center'
        }
    ];



    //===========================================================
    // Table Columns : Zones
    //===========================================================

    readonly zoneColumns:
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
            header:'Warehouse',

            field:'WarehouseText',

            width:'280px',

            align:'left'
        },

        {
            header:'Zone Code',

            field:'ZoneCode',

            width:'130px',

            align:'center'
        },

        {
            header:'Zone',

            field:'ZoneName',

            align:'left'
        },

        {
            header:'Priority',

            field:'Priority',

            width:'110px',

            align:'center'
        },

        {
            header:'Racks',

            field:'RackCount',

            width:'100px',

            align:'center'
        },

        {
            header:'Status',

            field:'IsActive',

            width:'120px',

            type:'status',

            align:'center'
        },

        {
            header:'Actions',

            field:'actions',

            type:'actions',

            width:'130px',

            align:'center'
        }
    ];


    get columns():
        ListTableColumn[]
    {
        return this.isZonesTab
            ? this.zoneColumns
            : this.rackColumns;
    }


    get searchPlaceholder():
        string
    {
        return this.isZonesTab
            ? 'Search zones...'
            : 'Search racks...';
    }



    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadWarehouses();

        this.loadItems();
    }



    //===========================================================
    // Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        if
        (
            this.noticeTimer
        )
        {
            clearTimeout(
                this.noticeTimer
            );
        }
    }



    //===========================================================
    // Notice
    //===========================================================

    private say
    (
        tone:
            ListNotice['tone'],

        message:
            string
    ):
        void
    {
        this.notice =
        {
            tone,

            text:message
        };


        if
        (
            this.noticeTimer
        )
        {
            clearTimeout(
                this.noticeTimer
            );
        }


        this.noticeTimer =
            window.setTimeout(
                () =>
                {
                    this.notice =
                        null;

                    this.cdr.detectChanges();
                },

                tone === 'error' ? 9000 : 6000
            );


        this.cdr.detectChanges();
    }


    closeNotice():
        void
    {
        this.notice =
            null;

        this.cdr.detectChanges();
    }



    //===========================================================
    // Load Warehouses (zone modal)
    //===========================================================

    private loadWarehouses():
        void
    {
        this.warehousesService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ):
                    void =>
                {
                    this.warehouses =
                        (response ?? [])
                            .slice()
                            .sort(
                                (a, b) =>
                                    String(a?.WarehouseCode ?? '')
                                        .localeCompare(
                                            String(b?.WarehouseCode ?? '')
                                        )
                            );


                    this.buildZoneWarehouseItems();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Warehouses Error',
                        error
                    );
                }
            });
    }



    //===========================================================
    // Load Items (racks and zones)
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;


        this.loadFailed =
            false;


        let pending =
            2;


        const done =
            (): void =>
            {
                pending--;


                if
                (
                    pending > 0
                )
                {
                    return;
                }


                this.loading =
                    false;


                this.applyFilters();


                this.cdr.detectChanges();
            };


        this.rackManagementService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        RackManagement[]
                ):
                    void =>
                {
                    this.racks =
                        (response ?? [])
                            .map(
                                item =>
                                    this.toRackRow(
                                        item
                                    )
                            );


                    done();
                },


                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Racks Error:',
                        error
                    );


                    this.racks =
                        [];


                    this.loadFailed =
                        true;


                    this.say(
                        'error',
                        'Unable to load racks.'
                    );


                    done();
                }
            });


        this.rackManagementService
            .getZones(
                0
            )
            .subscribe
            ({
                next:
                (
                    response:
                        RackZone[]
                ):
                    void =>
                {
                    this.zones =
                        (response ?? [])
                            .map(
                                item =>
                                    this.toZoneRow(
                                        item
                                    )
                            );


                    done();
                },


                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Load Zones Error:',
                        error
                    );


                    this.zones =
                        [];


                    if
                    (
                        this.isZonesTab
                    )
                    {
                        this.loadFailed =
                            true;
                    }


                    this.say(
                        'error',
                        'Unable to load zones.'
                    );


                    done();
                }
            });
    }



    //===========================================================
    // Rows with display texts
    //===========================================================

    private toRackRow
    (
        item:
            RackManagement
    ):
        RackListRow
    {
        const binsTotal =
            item.TotalBins
            ||
            (item.Shelves ?? [])
                .reduce(
                    (sum, shelf) =>
                        sum + Number(shelf.BinCount || 0),
                    0
                )
            ||
            item.ShelfCount;


        const subCount =
            (item.SubCategoryIds ?? []).length;


        const assigned =
            item.AssignmentText
            ||
            (
                item.ProductCategoryId
                    ? (
                        subCount > 0
                            ? `${item.CategoryName} (${subCount} sub categor${subCount === 1 ? 'y' : 'ies'})`
                            : String(item.CategoryName ?? '')
                    )
                    : 'General'
            );


        return {
            ...item,

            WarehouseText:
                [item.WarehouseCode, item.WarehouseName]
                    .filter(x => !!x)
                    .join(' - '),

            ZoneText:
                item.ZoneCode
                    ? `${item.ZoneCode} · ${item.ZoneName}`
                    : '—',

            AssignedText:
                assigned,

            BinsTotal:
                binsTotal
        };
    }


    private toZoneRow
    (
        item:
            RackZone
    ):
        ZoneListRow
    {
        return {
            ...item,

            WarehouseText:
                [item.WarehouseCode, item.WarehouseName]
                    .filter(x => !!x)
                    .join(' - ')
        };
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


        const matches =
            (
                values:
                    unknown[],

                isActive:
                    boolean
            ): boolean =>
                !keyword
                ||
                values.some(
                    value =>
                        String(value ?? '')
                            .toLowerCase()
                            .includes(keyword)
                )
                ||
                (isActive ? 'active' : 'inactive')
                    .includes(keyword);


        if
        (
            this.isZonesTab
        )
        {
            this.filteredRows =
                this.zones.filter(
                    item =>
                        matches(
                            [
                                item.WarehouseText,
                                item.BranchName,
                                item.ZoneCode,
                                item.ZoneName,
                                item.Priority,
                                item.Remarks
                            ],
                            item.IsActive
                        )
                );
        }
        else
        {
            this.filteredRows =
                this.racks.filter(
                    item =>
                        matches(
                            [
                                item.FullRackCode,
                                item.RackName,
                                item.BranchName,
                                item.WarehouseText,
                                item.ZoneText,
                                item.AssignedText,
                                item.RackType
                            ],
                            item.IsActive
                        )
                );
        }


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


        this.searchText =
            '';


        this.loadFailed =
            false;


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
        const sign =
            event.direction === 'asc'
                ? 1
                : -1;


        this.filteredRows =
        [
            ...this.filteredRows
        ]
        .sort(
            (a, b) =>
            {
                const valueA =
                    a?.[event.field];

                const valueB =
                    b?.[event.field];


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
                    return -1 * sign;
                }


                if
                (
                    valueB == null
                )
                {
                    return 1 * sign;
                }


                if
                (
                    typeof valueA === 'string'
                    &&
                    typeof valueB === 'string'
                )
                {
                    return valueA.localeCompare(valueB, undefined, { numeric:true }) * sign;
                }


                return (valueA < valueB ? -1 : valueA > valueB ? 1 : 0) * sign;
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
    // Pagination
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


        this.pagedRows =
        [
            ...this.filteredRows.slice
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
    // Add (rack form or zone modal)
    //===========================================================

    add():
        void
    {
        if
        (
            this.isZonesTab
        )
        {
            this.openZoneModal(
                'add',
                null
            );

            return;
        }


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
            any
    ):
        void
    {
        if
        (
            this.isZonesTab
        )
        {
            this.openZoneModal(
                'view',
                item
            );

            return;
        }


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



    //===========================================================
    // Edit
    //===========================================================

    edit
    (
        item:
            any
    ):
        void
    {
        if
        (
            this.isZonesTab
        )
        {
            this.openZoneModal(
                'edit',
                item
            );

            return;
        }


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
    // Delete
    //===========================================================

    delete
    (
        item:
            any
    ):
        void
    {
        if
        (
            this.progress.busy
        )
        {
            return;
        }


        const isZone =
            this.isZonesTab;


        const name =
            isZone
                ? `${item.ZoneCode} - ${item.ZoneName}`
                : item.RackName;


        this.confirmDialog.open
        (
            isZone ? 'Delete Zone' : 'Delete Rack',

            `Are you sure you want to delete "${name}" ?`,

            (): void =>
            {
                // Next tick : let the confirm dialog close first,
                // so it cannot hide the progress dialog.
                setTimeout(
                    () =>
                        isZone
                            ? this.deleteZone(item)
                            : this.deleteRack(item)
                );
            }
        );
    }


    private deleteRack
    (
        item:
            RackListRow
    ):
        void
    {
        this.progress
            .run(
                'Deleting Rack',

                `Please wait while "${item.RackName}" is being deleted...`,

                'Rack deleted.',

                this.rackManagementService.delete(
                    item.PublicId ?? ''
                )
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.say(
                        'ok',
                        `${item.RackName} (${item.FullRackCode}) deleted.`
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
                    console.error(
                        'Delete Rack Error:',
                        error
                    );


                    this.say(
                        'error',
                        this.errorText(
                            error,
                            error instanceof HttpErrorResponse && error.status === 409
                                ? 'Rack cannot be deleted because it is already in use.'
                                : 'Failed to delete rack.'
                        )
                    );
                }
            });
    }


    private deleteZone
    (
        item:
            ZoneListRow
    ):
        void
    {
        this.progress
            .run(
                'Deleting Zone',

                `Please wait while "${item.ZoneName}" is being deleted...`,

                'Zone deleted.',

                this.rackManagementService.deleteZone(
                    item.RackZoneId
                )
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.say(
                        'ok',
                        `Zone ${item.ZoneCode} - ${item.ZoneName} deleted.`
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
                    console.error(
                        'Delete Zone Error:',
                        error
                    );


                    this.say(
                        'error',
                        this.errorText(
                            error,
                            error instanceof HttpErrorResponse && error.status === 409
                                ? 'Zone cannot be deleted while a rack uses it.'
                                : 'Failed to delete zone.'
                        )
                    );
                }
            });
    }



    //===========================================================
    // Restore (the most recently deleted rack / zone)
    //===========================================================

    restore():
        void
    {
        if
        (
            this.progress.busy
        )
        {
            return;
        }


        const isZone =
            this.isZonesTab;


        const noun =
            isZone ? 'zone' : 'rack';


        this.confirmDialog.open
        (
            isZone ? 'Restore Zone' : 'Restore Rack',

            `Are you sure you want to restore the most recently deleted ${noun}?`,

            (): void =>
            {
                setTimeout(
                    () =>
                        this.restoreItem(
                            isZone
                        )
                );
            },

            'Restore',

            'Cancel',

            'primary'
        );
    }


    private restoreItem
    (
        isZone:
            boolean
    ):
        void
    {
        const noun =
            isZone ? 'zone' : 'rack';


        const call$ =
            isZone
                ? this.rackManagementService.restoreZone()
                : this.rackManagementService.restore();


        this.progress
            .run<unknown>(
                isZone ? 'Restoring Zone' : 'Restoring Rack',

                `Please wait while the most recently deleted ${noun} is being restored...`,

                isZone ? 'Zone restored.' : 'Rack restored.',

                call$
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.say(
                        'ok',
                        `The most recently deleted ${noun} has been restored.`
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
                    console.error(
                        'Restore Error',
                        error
                    );


                    if
                    (
                        error instanceof HttpErrorResponse
                        &&
                        error.status === 404
                    )
                    {
                        this.say(
                            'info',
                            `There is no deleted ${noun} to restore.`
                        );

                        return;
                    }


                    this.say(
                        'error',
                        this.errorText(
                            error,
                            `Failed to restore the ${noun}.`
                        )
                    );
                }
            });
    }



    //===========================================================
    // ZONE MODAL
    //===========================================================

    private emptyZone():
        RackZone
    {
        return {
            RackZoneId:0,

            BranchId:0,

            WarehouseId:0,

            ZoneCode:'',

            ZoneName:'',

            Priority:1,

            Remarks:'',

            IsActive:true
        };
    }


    get zoneModalTitle():
        string
    {
        switch
        (
            this.zoneModalMode
        )
        {
            case 'edit':

                return 'Update Zone';


            case 'view':

                return 'View Zone';


            default:

                return 'Add Zone';
        }
    }


    get isZoneView():
        boolean
    {
        return this.zoneModalMode === 'view';
    }


    get canSaveZone():
        boolean
    {
        return Number(this.zoneDraft.WarehouseId) > 0
            &&
            !!this.zoneDraft.ZoneName.trim()
            &&
            Number(this.zoneDraft.Priority) >= 1;
    }


    openZoneModal
    (
        mode:
            'add' | 'edit' | 'view',

        item:
            ZoneListRow | null
    ):
        void
    {
        if
        (
            this.progress.busy
        )
        {
            return;
        }


        this.zoneModalMode =
            mode;


        this.zoneError =
            '';


        this.zoneDraft =
            item
                ? {
                    RackZoneId:item.RackZoneId,
                    BranchId:item.BranchId,
                    WarehouseId:item.WarehouseId,
                    ZoneCode:item.ZoneCode,
                    ZoneName:item.ZoneName,
                    Priority:item.Priority,
                    Remarks:item.Remarks,
                    IsActive:item.IsActive,
                    RackCount:item.RackCount
                }
                : this.emptyZone();


        this.zonePriorityText =
            String(this.zoneDraft.Priority || 1);


        this.buildZoneWarehouseItems();


        this.zoneModalOpened =
            true;


        this.cdr.detectChanges();
    }


    closeZoneModal():
        void
    {
        if
        (
            this.progress.busy
        )
        {
            return;
        }


        this.zoneModalOpened =
            false;


        this.cdr.detectChanges();
    }


    private buildZoneWarehouseItems():
        void
    {
        const currentId =
            Number(this.zoneDraft.WarehouseId ?? 0);


        this.zoneWarehouseItems =
            this.warehouses
                .filter(
                    item =>
                        Boolean(item?.IsActive)
                        ||
                        Number(item?.WarehouseId) === currentId
                )
                .map(
                    item =>
                    ({
                        label:
                            `${item.WarehouseCode} - ${item.WarehouseName}`,

                        value:
                            Number(item.WarehouseId)
                    })
                );


        this.cdr.detectChanges();
    }


    // A dropdown may emit the value or the whole { label, value } item
    private unwrapValue
    (
        value:
            any
    ):
        any
    {
        return value !== null
            &&
            typeof value === 'object'
            &&
            'value' in value
                ? value.value
                : value;
    }


    // Add : the next code and priority of the warehouse
    onZoneWarehouseChange
    (
        value:
            any
    ):
        void
    {
        const warehouseId =
            Number(this.unwrapValue(value) ?? 0);


        this.zoneDraft.WarehouseId =
            warehouseId;


        this.zoneDraft.ZoneCode =
            '';


        this.zoneError =
            '';


        if
        (
            !(warehouseId > 0)
            ||
            this.zoneModalMode !== 'add'
        )
        {
            this.cdr.detectChanges();

            return;
        }


        this.rackManagementService
            .getZoneDefaults(
                warehouseId
            )
            .subscribe
            ({
                next:
                (
                    defaults:
                        RackZoneDefaults
                ):
                    void =>
                {
                    // Ignore a late answer for an older choice
                    if
                    (
                        Number(this.zoneDraft.WarehouseId) !== warehouseId
                    )
                    {
                        return;
                    }


                    this.zoneDraft.ZoneCode =
                        defaults.Code;


                    this.zoneDraft.Priority =
                        defaults.NextPriority;


                    this.zonePriorityText =
                        String(defaults.NextPriority);


                    this.cdr.detectChanges();
                },


                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    this.zoneError =
                        this.errorText(
                            error,
                            'The next zone code could not be loaded.'
                        );


                    this.cdr.detectChanges();
                }
            });
    }


    onZoneNameChange
    (
        value:
            string | number
    ):
        void
    {
        this.zoneDraft.ZoneName =
            String(value ?? '');


        this.zoneError =
            '';
    }


    onZonePriorityChange
    (
        value:
            string | number
    ):
        void
    {
        const digits =
            String(value ?? '')
                .replace(/[^0-9]/g, '')
                .replace(/^0+(?=\d)/, '')
                .slice(0, 3);


        this.zonePriorityText =
            digits;


        this.zoneDraft.Priority =
            digits
                ? Number(digits)
                : 0;


        this.cdr.detectChanges();
    }


    onZoneStatusChange
    (
        value:
            any
    ):
        void
    {
        this.zoneDraft.IsActive =
            Boolean(this.unwrapValue(value));
    }


    onZoneRemarksChange
    (
        value:
            string
    ):
        void
    {
        this.zoneDraft.Remarks =
            String(value ?? '');
    }


    saveZone():
        void
    {
        if
        (
            this.isZoneView
            ||
            this.progress.busy
        )
        {
            return;
        }


        if
        (
            !this.canSaveZone
        )
        {
            this.zoneError =
                !(Number(this.zoneDraft.WarehouseId) > 0)
                    ? 'Select the warehouse.'
                    : !this.zoneDraft.ZoneName.trim()
                        ? 'Zone Name is required.'
                        : 'Priority must be 1 or more (1 = nearest the counter).';


            this.cdr.detectChanges();

            return;
        }


        const body:
            CreateRackZone =
        {
            WarehouseId:
                Number(this.zoneDraft.WarehouseId),

            ZoneName:
                this.zoneDraft.ZoneName.trim(),

            Priority:
                Number(this.zoneDraft.Priority),

            Remarks:
                this.zoneDraft.Remarks?.trim() ?? '',

            IsActive:
                this.zoneDraft.IsActive
        };


        const isAdd =
            this.zoneModalMode === 'add';


        const call$ =
            isAdd
                ? this.rackManagementService.createZone(
                    body
                )
                : this.rackManagementService.updateZone(
                    {
                        RackZoneId:this.zoneDraft.RackZoneId,
                        ...body
                    } as UpdateRackZone
                );


        this.progress
            .run<unknown>(
                isAdd ? 'Saving Zone' : 'Updating Zone',

                'Please wait while the zone is being saved...',

                isAdd ? 'Zone saved.' : 'Zone updated.',

                call$
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.zoneModalOpened =
                        false;


                    this.say(
                        'ok',
                        isAdd
                            ? `Zone ${body.ZoneName} added.`
                            : `Zone ${this.zoneDraft.ZoneCode} - ${body.ZoneName} updated.`
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
                    console.error(
                        'Save Zone Error',
                        error
                    );


                    this.zoneError =
                        this.errorText(
                            error,
                            'The zone could not be saved.'
                        );


                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // History
    //===========================================================

    openHistory():
        void
    {
        const isZone =
            this.isZonesTab;


        const call$ =
            isZone
                ? this.rackManagementService.getZoneHistory()
                : this.rackManagementService.getHistory();


        call$.subscribe
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
                    isZone
                        ? 'Rack Zone History'
                        : 'Rack Management History';


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
                console.error(
                    'History Load Failed:',
                    error
                );


                this.say(
                    'error',
                    'Failed to load the history.'
                );
            }
        });
    }


    closeHistory():
        void
    {
        this.historyOpened =
            false;
    }



    //===========================================================
    // Server Message ({ message } / a text / the fallback)
    //===========================================================

    private errorText
    (
        error:
            unknown,

        fallback:
            string
    ):
        string
    {
        const err =
            error as any;


        const body =
            err?.error;


        if
        (
            err?.status === 403
        )
        {
            return body?.message || body?.Message || 'You do not have permission for this action.';
        }


        if
        (
            typeof body === 'string'
            &&
            body.trim()
        )
        {
            return body.trim();
        }


        return body?.message || body?.Message || body?.title || fallback;
    }


    //===========================================================
    // Summary Line (below the canvas) : Total / Active / Inactive
    // of all records
    //===========================================================

    get summaryTotal():
        number
    {
        return (this.racks ?? []).length;
    }

    get summaryActive():
        number
    {
        return (this.racks ?? [])
            .filter(x => this.isSummaryActive(x))
            .length;
    }

    private isSummaryActive(
        item: any
    ):
        boolean
    {
        return !!(
            item?.isActive
            ?? item?.IsActive
            ?? item?.status
            ?? item?.Status
        );
    }

    summaryText(
        value: number
    ):
        string
    {
        return value.toLocaleString('en-US');
    }
}
