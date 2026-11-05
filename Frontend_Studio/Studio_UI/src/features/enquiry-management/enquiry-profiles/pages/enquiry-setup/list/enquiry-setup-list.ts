//===============================================================
// Enquiry Setup (one page, NO Code Synchronization)
//
// Six tabs, one table (EnquirySetups.SetupType) :
//   Source of Enquiry · Enquiry Status · Interest Levels ·
//   Follow-up Methods · Suspend Reasons · Time Slots
//
// Add / Update / View in the form panel : the toolbar and the
// canvas shrink to the left (animated) and the form opens on the
// right of the same page; the page header stays. Every action
// (save, update, close) brings the full list back. Delete and
// Restore act on the current tab. Enquiry Status and Interest
// Levels carry a colour, Enquiry Status a stage (Open / Won /
// Lost). System statuses (New / Won / Lost) cannot be deleted
// or deactivated and keep their stage.
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
    EnquirySetup,
    EnquirySetupType,
    EnquirySetupTypeInfo,
    EnquirySetupDefaults,
    CreateEnquirySetup,
    UpdateEnquirySetup,
    ENQUIRY_SETUP_TYPES,
    ENQUIRY_SETUP_COLORS,
    TIME_SLOT_USES,
    TIME_SLOT_INTERVALS,
    buildSlots,
    slotLabel,
    slotMinutes,
    slotTime
}
from '../../../models/enquiry-setup.model';


// Row with its display texts
type EnquirySetupRow =
    EnquirySetup
    &
    {
        DefaultText:string;
        StageText:string;
        DaysText:string;
        SlotText:string;
        IntervalText:string;
        LunchText:string;
        SlotsText:string;
        CapacityText:string;
    };


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


//===============================================================
// Service
//===============================================================

import
{
    EnquirySetupService
}
from '../../../services/enquiry-setup.service';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'enquiry-setup-list',

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

        DropdownComponent
    ],

    templateUrl:'./enquiry-setup-list.html',

    styleUrl:'./enquiry-setup-list.css'
})


//===============================================================
// Enquiry Setup List
//===============================================================

export class EnquirySetupList
implements OnInit
{

    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly enquirySetupService =
        inject(EnquirySetupService);


    private readonly confirmDialog =
        inject(ConfirmDialogService);


    private readonly toast =
        inject(ToastService);


    private readonly cdr =
        inject(ChangeDetectorRef);


    // Progress dialog around save / delete / restore
    readonly progress =
        new ProgressRunner(
            inject(ProgressDialogService),
            () => this.cdr.detectChanges()
        );



    //===========================================================
    // Tabs : the five lists
    //===========================================================

    readonly typeInfos:
        EnquirySetupTypeInfo[] =
        ENQUIRY_SETUP_TYPES;


    tabs:
        ControlTab[] =
        ENQUIRY_SETUP_TYPES.map(
            info =>
            ({
                id:info.type,

                label:info.tabLabel
            })
        );


    selectedTab:
        EnquirySetupType =
        'Source';


    get info():
        EnquirySetupTypeInfo
    {
        return this.typeInfos.find(x => x.type === this.selectedTab)
            ??
            this.typeInfos[0];
    }



    //===========================================================
    // Data
    //===========================================================

    // Every live row of every list (one call)
    private rows:
        EnquirySetupRow[] =
    [];


    filteredRows:
        EnquirySetupRow[] =
    [];


    pagedRows:
        EnquirySetupRow[] =
    [];


    // Rows per tab (counts on the toolbar)
    get tabCount():
        number
    {
        return this.rows.filter(x => x.SetupType === this.selectedTab).length;
    }



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
        'Enquiry Setup History';


    historyItems:
        any[] =
    [];



    //===========================================================
    // Form Panel (right of the list, same page)
    //===========================================================

    panelOpened:
        boolean =
        false;


    panelMode:
        'add' | 'edit' | 'view' =
        'add';


    // The list the panel works on (fixed while it is open)
    panelType:
        EnquirySetupType =
        'Source';


    draft:
        EnquirySetup =
        this.emptyDraft('Source');


    displayOrderText:
        string =
        '';


    // Interest Level : days to purchase (text while typing)
    daysFromText:
        string =
        '';


    daysToText:
        string =
        '';


    panelError:
        string =
        '';


    readonly colorPresets:
        string[] =
        ENQUIRY_SETUP_COLORS;


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


    readonly defaultItems:
        any[] =
    [
        {
            label:'Yes',

            value:true
        },

        {
            label:'No',

            value:false
        }
    ];


    readonly stageItems:
        any[] =
    [
        {
            label:'Open',

            value:'Open'
        },

        {
            label:'Won',

            value:'Won'
        },

        {
            label:'Suspended',

            value:'Lost'
        }
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
    // Table Columns (built once per kind of list : stable arrays)
    //===========================================================

    private buildColumns
    (
        hasColor:
            boolean,

        hasStage:
            boolean,

        hasDays:
            boolean = false,

        hasTime:
            boolean = false
    ):
        ListTableColumn[]
    {
        const columns:
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

                field:'Code',

                width:'120px',

                align:'center'
            },

            {
                header:'Name',

                field:'Name',

                align:'left',

                flagField:'IsSystem',

                flagText:'System',

                ...(hasColor ? { dotField:'ColorCode' } : {})
            }
        ];


        if
        (
            hasStage
        )
        {
            columns.push(
                {
                    header:'Stage',

                    field:'StageText',

                    width:'120px',

                    align:'center'
                }
            );
        }


        if
        (
            hasColor
        )
        {
            columns.push(
                {
                    header:'Colour',

                    field:'ColorCode',

                    width:'120px',

                    align:'center'
                }
            );
        }


        if
        (
            hasDays
        )
        {
            columns.push(
                {
                    header:'Days to Purchase',

                    field:'DaysText',

                    width:'150px',

                    align:'center'
                }
            );
        }


        if
        (
            hasTime
        )
        {
            columns.push(
                {
                    header:'Interval',

                    field:'IntervalText',

                    width:'110px',

                    align:'center'
                },

                {
                    header:'Working Hours',

                    field:'SlotText',

                    width:'190px',

                    align:'center'
                },

                {
                    header:'Lunch Break',

                    field:'LunchText',

                    width:'190px',

                    align:'center'
                },

                {
                    header:'Slots',

                    field:'SlotsText',

                    width:'80px',

                    align:'center'
                },

                {
                    header:'Per Slot',

                    field:'CapacityText',

                    width:'90px',

                    align:'center'
                }
            );
        }


        columns.push(
            {
                header:'Order',

                field:'DisplayOrder',

                width:'90px',

                align:'center'
            },

            {
                header:'Default',

                field:'DefaultText',

                width:'100px',

                align:'center'
            },

            {
                header:'Status',

                field:'IsActive',

                type:'status',

                width:'120px',

                align:'center'
            },

            {
                header:'Actions',

                field:'actions',

                type:'actions',

                width:'130px',

                align:'center'
            }
        );


        return columns;
    }


    private readonly plainColumns =
        this.buildColumns(false, false);


    private readonly colorColumns =
        this.buildColumns(true, false);


    private readonly interestColumns =
        this.buildColumns(true, false, true);


    private readonly statusColumns =
        this.buildColumns(true, true);


    private readonly timeColumns =
        this.buildColumns(false, false, false, true);


    get columns():
        ListTableColumn[]
    {
        return this.info.hasTime
            ? this.timeColumns
            : this.info.hasStage
            ? this.statusColumns
            : this.info.hasDays
                ? this.interestColumns
            : this.info.hasColor
                ? this.colorColumns
                : this.plainColumns;
    }


    get searchPlaceholder():
        string
    {
        return `Search ${this.info.tabLabel.toLowerCase()}...`;
    }



    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadItems();
    }



    //===========================================================
    // Load Items (every list in one call)
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;


        this.loadFailed =
            false;


        this.enquirySetupService
            .getAll()
            .subscribe
            ({
                next:
                (
                    response:
                        EnquirySetup[]
                ):
                    void =>
                {
                    this.rows =
                        (response ?? [])
                            .map(
                                item =>
                                    this.toRow(item)
                            );


                    this.loading =
                        false;


                    this.applyFilters();


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
                        'Load Enquiry Setup Error:',
                        error
                    );


                    this.rows =
                        [];


                    this.filteredRows =
                        [];


                    this.pagedRows =
                        [];


                    this.loading =
                        false;


                    this.loadFailed =
                        true;


                    this.toast.error(
                        'Load Failed',
                        this.errorText(
                            error,
                            'Unable to load the enquiry setup.'
                        )
                    );


                    this.cdr.detectChanges();
                }
            });
    }


    private toRow
    (
        item:
            EnquirySetup
    ):
        EnquirySetupRow
    {
        return {
            ...item,

            DefaultText:
                item.IsDefault
                    ? 'Default'
                    : '—',

            // Stage 'Lost' is shown as Suspended
            StageText:
                item.Stage === 'Lost'
                    ? 'Suspended'
                    : item.Stage || '—',

            DaysText:
                EnquirySetupList.daysText(item.DaysFrom, item.DaysTo),

            SlotText:
                item.TimeFrom && item.TimeTo
                    ? `${slotLabel(item.TimeFrom)} - ${slotLabel(item.TimeTo)}`
                    : '—',

            IntervalText:
                TIME_SLOT_INTERVALS.find(x => x.value === item.IntervalMinutes)?.label
                ?? '—',

            LunchText:
                item.BreakFrom && item.BreakTo
                    ? `${slotLabel(item.BreakFrom)} - ${slotLabel(item.BreakTo)}`
                    : (item.SetupType === 'TimeSlot' ? 'No break' : '—'),

            SlotsText:
                item.SetupType === 'TimeSlot'
                    ? String(item.SlotCount)
                    : '—',

            CapacityText:
                item.SetupType === 'TimeSlot' && item.SlotCapacity
                    ? String(item.SlotCapacity)
                    : '—'
        };
    }


    // "14:30" → "02:30 PM"
    static timeLabel
    (
        value:
            string
    ):
        string
    {
        return slotLabel(value);
    }


    // "HH:mm" → minutes after midnight (NaN when empty)
    // "HH:mm" → minutes after midnight (NaN when empty)
    private static minutes
    (
        value:
            string
    ):
        number
    {
        return slotMinutes(value);
    }


    // 0 - 3 days · 16+ days · — (by hand only)
    static daysText
    (
        from:
            number | null | undefined,

        to:
            number | null | undefined
    ):
        string
    {
        if
        (
            from === null
            ||
            from === undefined
        )
        {
            return '—';
        }

        if
        (
            to === null
            ||
            to === undefined
        )
        {
            return `${from}+ days`;
        }

        return from === to
            ? `${from} day${from === 1 ? '' : 's'}`
            : `${from} - ${to} days`;
    }



    //===========================================================
    // Apply Filters (current tab + search)
    //===========================================================

    applyFilters():
        void
    {
        const keyword =
            this.searchText
                .trim()
                .toLowerCase();


        this.filteredRows =
            this.rows
                .filter(
                    item =>
                        item.SetupType === this.selectedTab
                )
                .filter(
                    item =>
                        !keyword
                        ||
                        [
                            item.Code,
                            item.Name,
                            item.Stage,
                            item.ColorCode,
                            item.DaysText,
                            item.SlotText,
                            item.IntervalText,
                            item.LunchText,
                            item.Remarks,
                            item.IsDefault ? 'default' : '',
                            item.IsSystem ? 'system' : '',
                            item.IsActive ? 'active' : 'inactive'
                        ]
                        .join(' ')
                        .toLowerCase()
                        .includes(keyword)
                )
                .sort(
                    (a, b) =>
                        a.DisplayOrder - b.DisplayOrder
                        ||
                        a.Code.localeCompare(b.Code)
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
            value as EnquirySetupType;


        // Another list : the open form belongs to the old one
        if
        (
            this.panelOpened
            &&
            !this.progress.busy
            &&
            this.panelType !== this.selectedTab
        )
        {
            this.panelOpened =
                false;
        }


        this.searchText =
            '';


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
            (a: any, b: any) =>
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
            (this.currentPage - 1) * this.pageSize;


        this.pagedRows =
        [
            ...this.filteredRows.slice(
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
    // Add / View / Edit (form panel)
    //===========================================================

    add():
        void
    {
        this.openPanel(
            'add',
            null
        );
    }


    view
    (
        item:
            EnquirySetupRow
    ):
        void
    {
        this.openPanel(
            'view',
            item
        );
    }


    edit
    (
        item:
            EnquirySetupRow
    ):
        void
    {
        this.openPanel(
            'edit',
            item
        );
    }



    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        item:
            EnquirySetupRow
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


        if
        (
            item.IsSystem
        )
        {
            this.toast.info(
                'Delete Not Allowed',
                `"${item.Name}" is a system status and cannot be deleted. You can rename it instead.`
            );

            return;
        }


        if
        (
            item.IsDefault
        )
        {
            this.toast.info(
                'Delete Not Allowed',
                `"${item.Name}" is the default ${this.nounOf(item.SetupType).toLowerCase()}. Set another default first.`
            );

            return;
        }


        const noun =
            this.nounOf(item.SetupType);


        this.confirmDialog.open
        (
            `Delete ${noun}`,

            `Are you sure you want to delete "${item.Name}" (${item.Code}) ?`,

            (): void =>
            {
                // Next tick : let the confirm dialog close first
                setTimeout(
                    () =>
                        this.deleteItem(
                            item
                        )
                );
            }
        );
    }


    private deleteItem
    (
        item:
            EnquirySetupRow
    ):
        void
    {
        const noun =
            this.nounOf(item.SetupType);


        this.progress
            .run(
                `Deleting ${noun}`,

                `Please wait while "${item.Name}" is being deleted...`,

                `${noun} deleted.`,

                this.enquirySetupService.delete(
                    item.EnquirySetupId
                )
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    // The deleted record was open in the form
                    if
                    (
                        this.panelOpened
                        &&
                        this.panelMode !== 'add'
                        &&
                        this.draft.EnquirySetupId === item.EnquirySetupId
                    )
                    {
                        this.panelOpened =
                            false;
                    }


                    this.toast.success(
                        'Delete Successful',
                        `${item.Name} (${item.Code}) deleted.`
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
                        'Delete Enquiry Setup Error:',
                        error
                    );


                    if
                    (
                        error instanceof HttpErrorResponse
                        &&
                        error.status === 409
                    )
                    {
                        this.toast.info(
                            'Delete Blocked',
                            this.errorText(
                                error,
                                `${noun} cannot be deleted.`
                            )
                        );

                        return;
                    }


                    this.toast.error(
                        'Delete Failed',
                        this.errorText(
                            error,
                            `Failed to delete the ${noun.toLowerCase()}.`
                        )
                    );
                }
            });
    }



    //===========================================================
    // Restore (the most recently deleted row of this tab)
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


        const type =
            this.selectedTab;


        const label =
            this.info.tabLabel;


        this.confirmDialog.open
        (
            `Restore ${this.info.noun}`,

            `Restore the most recently deleted record of "${label}"?`,

            (): void =>
            {
                setTimeout(
                    () =>
                        this.restoreItem(
                            type,
                            label
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
        type:
            EnquirySetupType,

        label:
            string
    ):
        void
    {
        this.progress
            .run<unknown>(
                'Restoring',

                `Please wait while the most recently deleted record of "${label}" is being restored...`,

                'Record restored.',

                this.enquirySetupService.restore(
                    type
                )
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.toast.success(
                        'Restore Successful',
                        `The most recently deleted record of "${label}" has been restored.`
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
                        'Restore Enquiry Setup Error:',
                        error
                    );


                    if
                    (
                        error instanceof HttpErrorResponse
                        &&
                        error.status === 404
                    )
                    {
                        this.toast.info(
                            'No Data to Restore',
                            `There is no deleted record in "${label}" to restore.`
                        );

                        return;
                    }


                    if
                    (
                        error instanceof HttpErrorResponse
                        &&
                        error.status === 409
                    )
                    {
                        this.toast.info(
                            'Restore Blocked',
                            this.errorText(
                                error,
                                'The record cannot be restored.'
                            )
                        );

                        return;
                    }


                    this.toast.error(
                        'Restore Failed',
                        this.errorText(
                            error,
                            'Failed to restore the record.'
                        )
                    );
                }
            });
    }



    //===========================================================
    // FORM PANEL
    //===========================================================

    private emptyDraft
    (
        type:
            EnquirySetupType
    ):
        EnquirySetup
    {
        const info =
            ENQUIRY_SETUP_TYPES.find(x => x.type === type);


        return {
            EnquirySetupId:0,

            SetupType:type,

            Code:'',

            Name:'',

            ColorCode:
                info?.hasColor
                    ? ENQUIRY_SETUP_COLORS[0]
                    : '',

            Stage:
                info?.hasStage
                    ? 'Open'
                    : '',

            DaysFrom:null,

            DaysTo:null,

            UsedFor:
                info?.hasTime
                    ? 'Service'
                    : '',

            IntervalMinutes:null,

            // New time slot : 2 bookings per slot
            SlotCapacity:
                info?.hasTime
                    ? 2
                    : null,

            TimeFrom:'',

            TimeTo:'',

            // New time slot : lunch 1 PM - 2 PM (can be changed or
            // set to No lunch break)
            BreakFrom:
                info?.hasTime
                    ? '13:00'
                    : '',

            BreakTo:
                info?.hasTime
                    ? '14:00'
                    : '',

            SlotCount:0,

            DisplayOrder:0,

            IsDefault:false,

            IsSystem:false,

            Remarks:'',

            IsActive:true
        };
    }


    get panelInfo():
        EnquirySetupTypeInfo
    {
        return this.typeInfos.find(x => x.type === this.panelType)
            ??
            this.typeInfos[0];
    }


    get panelTitle():
        string
    {
        const noun =
            this.panelInfo.noun;


        switch
        (
            this.panelMode
        )
        {
            case 'edit':

                return `Update ${noun}`;


            case 'view':

                return `View ${noun}`;


            default:

                return `Add ${noun}`;
        }
    }


    get isView():
        boolean
    {
        return this.panelMode === 'view';
    }


    get panelSubtitle():
        string
    {
        return this.panelInfo.hint;
    }


    // Save / Update command (same as the other form pages)
    get saveText():
        string
    {
        return this.panelMode === 'edit'
            ? 'Update'
            : 'Save';
    }


    get saveIcon():
        string
    {
        return this.panelMode === 'edit'
            ? 'fas fa-pen-to-square'
            : 'fas fa-floppy-disk';
    }


    // Clear (Add only) : a fresh form, the code kept
    clearForm():
        void
    {
        if
        (
            this.panelMode !== 'add'
            ||
            this.progress.busy
        )
        {
            return;
        }


        const code =
            this.draft.Code;


        const order =
            this.draft.DisplayOrder;


        this.draft =
            this.emptyDraft(
                this.panelType
            );


        this.draft.Code =
            code;


        this.draft.DisplayOrder =
            order;


        this.displayOrderText =
            order > 0
                ? String(order)
                : '';


        this.daysFromText =
            '';


        this.daysToText =
            '';


        this.panelError =
            '';


        this.cdr.detectChanges();
    }


    get colorValid():
        boolean
    {
        return /^#[0-9A-Fa-f]{6}$/.test(
            (this.draft.ColorCode ?? '').trim()
        );
    }


    // Days : From needed when To is given; To not below From
    get daysError():
        string
    {
        if
        (
            !this.panelInfo.hasDays
        )
        {
            return '';
        }

        const from =
            this.draft.DaysFrom;

        const to =
            this.draft.DaysTo;

        if
        (
            from === null
            &&
            to !== null
        )
        {
            return 'Enter Days From as well (0 or more), or clear Days To.';
        }

        if
        (
            from !== null
            &&
            to !== null
            &&
            to < from
        )
        {
            return 'Days To cannot be less than Days From.';
        }

        return '';
    }


    get daysPreview():
        string
    {
        return this.draft.DaysFrom === null
            ? 'Chosen by hand only (no days range).'
            : `Open enquiries with ${EnquirySetupList.daysText(this.draft.DaysFrom, this.draft.DaysTo)} left to the expected purchase date become ${this.draft.Name.trim() || 'this level'}.`;
    }


    //===========================================================
    // Time Slots : page, interval, working hours, lunch break.
    // Hours picked in 15-minute steps 05:00 to 23:45 (12 h labels).
    //===========================================================

    readonly timeItems:
        any[] =
        Array.from(
            { length:76 },
            (_x, i) =>
            {
                const value =
                    slotTime(5 * 60 + i * 15);

                return {
                    label:slotLabel(value),

                    value
                };
            }
        );


    readonly lunchItems:
        any[] =
        [
            { label:'No lunch break', value:'' },

            ...this.timeItems
        ];


    readonly usedForItems:
        any[] =
        TIME_SLOT_USES;


    readonly intervalItems:
        any[] =
        TIME_SLOT_INTERVALS;


    // Bookings per slot : 1 - 20
    readonly capacityItems:
        any[] =
        Array.from(
            { length:20 },
            (_x, i) =>
                ({ label:i === 0 ? '1 booking' : `${i + 1} bookings`, value:i + 1 })
        );


    // Name the server gives a new time slot : "<page> n" (shown
    // read-only; deleted ones also count, so it may come out higher)
    get slotName():
        string
    {
        if
        (
            this.panelMode !== 'add'
        )
        {
            return this.draft.Name;
        }

        const label =
            TIME_SLOT_USES.find(x => x.value === this.draft.UsedFor)?.label
            ?? 'Time Slot';

        const highest =
            this.rows
                .filter(x => x.SetupType === 'TimeSlot' && x.UsedFor === this.draft.UsedFor)
                .map(x => Number((x.Name ?? '').slice(label.length + 1)) || 0)
                .reduce((a, b) => Math.max(a, b), 0);

        return `${label} ${highest + 1}`;
    }


    get daySlots():
        { start:string; end:string }[]
    {
        return buildSlots(
            this.draft.TimeFrom,
            this.draft.TimeTo,
            this.draft.IntervalMinutes,
            this.draft.BreakFrom,
            this.draft.BreakTo);
    }


    get timeError():
        string
    {
        if
        (
            !this.panelInfo.hasTime
        )
        {
            return '';
        }

        const d =
            this.draft;

        const from =
            EnquirySetupList.minutes(d.TimeFrom);

        const to =
            EnquirySetupList.minutes(d.TimeTo);

        if
        (
            d.TimeFrom && d.TimeTo && to <= from
        )
        {
            return 'End Time must be after Start Time.';
        }

        if
        (
            !!d.BreakFrom !== !!d.BreakTo
        )
        {
            return 'Pick both Lunch From and Lunch To, or No lunch break for both.';
        }

        if
        (
            d.BreakFrom && d.BreakTo
        )
        {
            const lunchFrom =
                EnquirySetupList.minutes(d.BreakFrom);

            const lunchTo =
                EnquirySetupList.minutes(d.BreakTo);

            if
            (
                lunchTo <= lunchFrom
            )
            {
                return 'Lunch To must be after Lunch From.';
            }

            if
            (
                d.TimeFrom && d.TimeTo && (lunchFrom < from || lunchTo > to)
            )
            {
                return 'The lunch break must be inside the working hours.';
            }
        }

        if
        (
            d.TimeFrom && d.TimeTo && d.IntervalMinutes && this.daySlots.length === 0
        )
        {
            return 'No slot fits these hours. Widen the hours or shorten the interval.';
        }

        return '';
    }


    get timeMissing():
        boolean
    {
        return !!this.panelInfo.hasTime
            &&
            (
                !this.draft.UsedFor
                ||
                !this.draft.IntervalMinutes
                ||
                !this.draft.SlotCapacity
                ||
                !this.draft.TimeFrom
                ||
                !this.draft.TimeTo
            );
    }


    get timePreview():
        string
    {
        if
        (
            this.timeMissing
        )
        {
            return 'Pick the interval, start and end time; the lunch break is skipped.';
        }

        const slots =
            this.daySlots;

        const first =
            slots[0];

        const last =
            slots[slots.length - 1];

        const interval =
            TIME_SLOT_INTERVALS.find(x => x.value === this.draft.IntervalMinutes)?.label ?? '';

        const lunch =
            this.draft.BreakFrom && this.draft.BreakTo
                ? `, lunch ${slotLabel(this.draft.BreakFrom)} - ${slotLabel(this.draft.BreakTo)} skipped`
                : '';

        const per =
            Number(this.draft.SlotCapacity ?? 0);

        return `${slots.length} slot${slots.length === 1 ? '' : 's'} of ${interval} a day : first ${slotLabel(first.start)}, last ${slotLabel(last.start)} - ${slotLabel(last.end)}${lunch}. ${per} booking${per === 1 ? '' : 's'} per slot = up to ${slots.length * per} a day.`;
    }


    get canSave():
        boolean
    {
        return !this.daysError
            &&
            !this.timeError
            &&
            !this.timeMissing
            &&
            (this.panelInfo.hasTime || !!this.draft.Name.trim())
            &&
            (!this.panelInfo.hasColor || this.colorValid)
            &&
            (!this.panelInfo.hasStage || !!this.draft.Stage)
            &&
            (this.panelInfo.hasTime || Number(this.draft.DisplayOrder) >= 1);
    }


    openPanel
    (
        mode:
            'add' | 'edit' | 'view',

        item:
            EnquirySetupRow | null
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


        this.panelMode =
            mode;


        this.panelError =
            '';


        this.panelType =
            item
                ? item.SetupType
                : this.selectedTab;


        this.draft =
            item
                ? {
                    EnquirySetupId:item.EnquirySetupId,
                    SetupType:item.SetupType,
                    Code:item.Code,
                    Name:item.Name,
                    ColorCode:item.ColorCode,
                    Stage:item.Stage,
                    DaysFrom:item.DaysFrom ?? null,
                    DaysTo:item.DaysTo ?? null,
                    UsedFor:item.UsedFor ?? '',
                    IntervalMinutes:item.IntervalMinutes ?? null,
                    SlotCapacity:item.SlotCapacity ?? null,
                    TimeFrom:item.TimeFrom ?? '',
                    TimeTo:item.TimeTo ?? '',
                    BreakFrom:item.BreakFrom ?? '',
                    BreakTo:item.BreakTo ?? '',
                    SlotCount:item.SlotCount ?? 0,
                    DisplayOrder:item.DisplayOrder,
                    IsDefault:item.IsDefault,
                    IsSystem:item.IsSystem,
                    Remarks:item.Remarks,
                    IsActive:item.IsActive
                }
                : this.emptyDraft(this.panelType);


        this.displayOrderText =
            this.draft.DisplayOrder > 0
                ? String(this.draft.DisplayOrder)
                : '';


        this.daysFromText =
            this.draft.DaysFrom === null
                ? ''
                : String(this.draft.DaysFrom);


        this.daysToText =
            this.draft.DaysTo === null
                ? ''
                : String(this.draft.DaysTo);


        this.panelOpened =
            true;


        this.cdr.detectChanges();


        if
        (
            mode === 'add'
        )
        {
            this.loadDefaults(
                this.panelType
            );
        }
    }


    // Add : the next code and order of the list
    private loadDefaults
    (
        type:
            EnquirySetupType
    ):
        void
    {
        this.enquirySetupService
            .getDefaults(
                type
            )
            .subscribe
            ({
                next:
                (
                    defaults:
                        EnquirySetupDefaults
                ):
                    void =>
                {
                    // Ignore a late answer for another list / a closed panel
                    if
                    (
                        !this.panelOpened
                        ||
                        this.panelMode !== 'add'
                        ||
                        this.panelType !== type
                    )
                    {
                        return;
                    }


                    this.draft.Code =
                        defaults.Code;


                    if
                    (
                        !(this.draft.DisplayOrder > 0)
                    )
                    {
                        this.draft.DisplayOrder =
                            defaults.NextDisplayOrder;


                        this.displayOrderText =
                            String(defaults.NextDisplayOrder);
                    }


                    this.cdr.detectChanges();
                },


                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    this.toast.error(
                        'Load Failed',
                        this.errorText(
                            error,
                            'The next code could not be loaded.'
                        )
                    );


                    this.cdr.detectChanges();
                }
            });
    }


    closePanel():
        void
    {
        if
        (
            this.progress.busy
        )
        {
            return;
        }


        this.panelOpened =
            false;


        this.cdr.detectChanges();
    }



    //===========================================================
    // Panel Inputs
    //===========================================================

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


    onNameChange
    (
        value:
            string | number
    ):
        void
    {
        this.draft.Name =
            String(value ?? '');


        this.panelError =
            '';
    }


    onDisplayOrderChange
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
                .slice(0, 4);


        this.displayOrderText =
            digits;


        this.draft.DisplayOrder =
            digits
                ? Number(digits)
                : 0;


        this.cdr.detectChanges();
    }


    // Days : digits only, empty = no value
    private daysDigits
    (
        value:
            string | number
    ):
        string
    {
        return String(value ?? '')
            .replace(/[^0-9]/g, '')
            .replace(/^0+(?=\d)/, '')
            .slice(0, 4);
    }


    onDaysFromChange
    (
        value:
            string | number
    ):
        void
    {
        this.daysFromText =
            this.daysDigits(value);

        this.draft.DaysFrom =
            this.daysFromText
                ? Number(this.daysFromText)
                : null;

        this.panelError =
            '';

        this.cdr.detectChanges();
    }


    onDaysToChange
    (
        value:
            string | number
    ):
        void
    {
        this.daysToText =
            this.daysDigits(value);

        this.draft.DaysTo =
            this.daysToText
                ? Number(this.daysToText)
                : null;

        this.panelError =
            '';

        this.cdr.detectChanges();
    }


    onTimeFromChange
    (
        value:
            any
    ):
        void
    {
        this.draft.TimeFrom =
            String(this.unwrapValue(value) ?? '');

        // End Time follows : 8 hours later (latest 11:45 PM); it
        // can still be changed by hand afterwards
        if
        (
            this.draft.TimeFrom
        )
        {
            this.draft.TimeTo =
                slotTime(Math.min(EnquirySetupList.minutes(this.draft.TimeFrom) + 8 * 60, 23 * 60 + 45));
        }

        this.panelError =
            '';

        this.cdr.detectChanges();
    }


    onTimeToChange
    (
        value:
            any
    ):
        void
    {
        this.draft.TimeTo =
            String(this.unwrapValue(value) ?? '');

        this.panelError =
            '';

        this.cdr.detectChanges();
    }


    onBreakFromChange
    (
        value:
            any
    ):
        void
    {
        this.draft.BreakFrom =
            String(this.unwrapValue(value) ?? '');

        // Lunch To follows : 1 hour later when empty or not after
        if
        (
            this.draft.BreakFrom
            &&
            (
                !this.draft.BreakTo
                ||
                EnquirySetupList.minutes(this.draft.BreakTo) <= EnquirySetupList.minutes(this.draft.BreakFrom)
            )
        )
        {
            this.draft.BreakTo =
                slotTime(Math.min(EnquirySetupList.minutes(this.draft.BreakFrom) + 60, 23 * 60 + 45));
        }

        if
        (
            !this.draft.BreakFrom
        )
        {
            this.draft.BreakTo =
                '';
        }

        this.panelError =
            '';

        this.cdr.detectChanges();
    }


    onBreakToChange
    (
        value:
            any
    ):
        void
    {
        this.draft.BreakTo =
            String(this.unwrapValue(value) ?? '');

        if
        (
            !this.draft.BreakTo
        )
        {
            this.draft.BreakFrom =
                '';
        }

        this.panelError =
            '';

        this.cdr.detectChanges();
    }


    onIntervalChange
    (
        value:
            any
    ):
        void
    {
        const minutes =
            Number(this.unwrapValue(value) ?? 0);

        this.draft.IntervalMinutes =
            minutes > 0
                ? minutes
                : null;

        this.panelError =
            '';

        this.cdr.detectChanges();
    }


    onCapacityChange
    (
        value:
            any
    ):
        void
    {
        const n =
            Number(this.unwrapValue(value) ?? 0);

        this.draft.SlotCapacity =
            n > 0
                ? n
                : null;

        this.panelError =
            '';

        this.cdr.detectChanges();
    }


    onUsedForChange
    (
        value:
            any
    ):
        void
    {
        this.draft.UsedFor =
            String(this.unwrapValue(value) ?? '');

        this.panelError =
            '';

        this.cdr.detectChanges();
    }


    onStageChange
    (
        value:
            any
    ):
        void
    {
        this.draft.Stage =
            String(this.unwrapValue(value) ?? '');


        this.panelError =
            '';
    }


    onColorChange
    (
        value:
            string | number
    ):
        void
    {
        let text =
            String(value ?? '')
                .trim()
                .toUpperCase();


        if
        (
            text
            &&
            !text.startsWith('#')
        )
        {
            text =
                '#' + text;
        }


        this.draft.ColorCode =
            text.slice(0, 7);


        this.panelError =
            '';


        this.cdr.detectChanges();
    }


    pickColor
    (
        color:
            string
    ):
        void
    {
        if
        (
            this.isView
            ||
            this.progress.busy
        )
        {
            return;
        }


        this.draft.ColorCode =
            color;


        this.panelError =
            '';


        this.cdr.detectChanges();
    }


    onDefaultChange
    (
        value:
            any
    ):
        void
    {
        this.draft.IsDefault =
            Boolean(this.unwrapValue(value));


        if
        (
            this.draft.IsDefault
        )
        {
            this.draft.IsActive =
                true;
        }


        this.cdr.detectChanges();
    }


    onStatusChange
    (
        value:
            any
    ):
        void
    {
        this.draft.IsActive =
            Boolean(this.unwrapValue(value));
    }


    onRemarksChange
    (
        value:
            string | number
    ):
        void
    {
        this.draft.Remarks =
            String(value ?? '');
    }



    //===========================================================
    // Save (Add / Update)
    //===========================================================

    save():
        void
    {
        if
        (
            this.isView
            ||
            this.progress.busy
        )
        {
            return;
        }


        if
        (
            !this.canSave
        )
        {
            this.toast.warning(
                'Check the Form',
                this.daysError
                    ? this.daysError
                    : this.timeError
                    ? this.timeError
                    : this.timeMissing
                    ? 'Pick the page, the interval, the bookings per slot, the start time and the end time.'
                    : !this.draft.Name.trim()
                    ? 'Name is required.'
                    : this.panelInfo.hasColor && !this.colorValid
                        ? 'Pick a colour, or type one such as #2563EB.'
                        : this.panelInfo.hasStage && !this.draft.Stage
                            ? 'Choose the stage : Open, Won or Suspended.'
                            : 'Display Order must be 1 or more.'
            );


            this.cdr.detectChanges();

            return;
        }


        if
        (
            this.draft.IsDefault
            &&
            !this.draft.IsActive
        )
        {
            this.toast.warning(
                'Check the Form',
                'A default must be active.'
            );


            this.cdr.detectChanges();

            return;
        }


        const body:
            CreateEnquirySetup =
        {
            SetupType:
                this.panelType,

            Name:
                this.draft.Name.trim(),

            ColorCode:
                this.panelInfo.hasColor
                    ? this.draft.ColorCode.trim()
                    : '',

            Stage:
                this.panelInfo.hasStage
                    ? this.draft.Stage
                    : '',

            DaysFrom:
                this.panelInfo.hasDays
                    ? this.draft.DaysFrom
                    : null,

            DaysTo:
                this.panelInfo.hasDays && this.draft.DaysFrom !== null
                    ? this.draft.DaysTo
                    : null,

            UsedFor:
                this.panelInfo.hasTime
                    ? this.draft.UsedFor
                    : '',

            IntervalMinutes:
                this.panelInfo.hasTime
                    ? this.draft.IntervalMinutes
                    : null,

            SlotCapacity:
                this.panelInfo.hasTime
                    ? this.draft.SlotCapacity
                    : null,

            TimeFrom:
                this.panelInfo.hasTime
                    ? this.draft.TimeFrom
                    : '',

            TimeTo:
                this.panelInfo.hasTime
                    ? this.draft.TimeTo
                    : '',

            BreakFrom:
                this.panelInfo.hasTime
                    ? this.draft.BreakFrom
                    : '',

            BreakTo:
                this.panelInfo.hasTime
                    ? this.draft.BreakTo
                    : '',

            DisplayOrder:
                Number(this.draft.DisplayOrder),

            IsDefault:
                this.draft.IsDefault,

            Remarks:
                this.draft.Remarks?.trim() ?? '',

            IsActive:
                this.draft.IsActive
        };


        const isAdd =
            this.panelMode === 'add';


        const noun =
            this.panelInfo.noun;


        const call$ =
            isAdd
                ? this.enquirySetupService.create(
                    body
                )
                : this.enquirySetupService.update(
                    {
                        EnquirySetupId:this.draft.EnquirySetupId,
                        ...body
                    } as UpdateEnquirySetup
                );


        this.progress
            .run<unknown>(
                isAdd ? `Saving ${noun}` : `Updating ${noun}`,

                `Please wait while "${body.Name}" is being saved...`,

                isAdd ? `${noun} saved.` : `${noun} updated.`,

                call$
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.panelOpened =
                        false;


                    this.toast.success(
                        isAdd ? 'Save Successful' : 'Update Successful',
                        isAdd
                            ? `${body.Name} added to ${this.panelInfo.tabLabel}.`
                            : `${body.Name} (${this.draft.Code}) updated.`
                    );


                    // Show the list the record belongs to
                    this.selectedTab =
                        this.panelType;


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
                        'Save Enquiry Setup Error',
                        error
                    );


                    this.toast.error(
                        'Save Failed',
                        this.errorText(
                            error,
                            `The ${noun.toLowerCase()} could not be saved.`
                        )
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
        this.enquirySetupService
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


                    this.toast.error(
                        'History',
                        'Failed to load the enquiry setup history.'
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
    // Helpers
    //===========================================================

    private nounOf
    (
        type:
            EnquirySetupType
    ):
        string
    {
        return this.typeInfos.find(x => x.type === type)?.noun
            ??
            'Record';
    }


    // Server message ({ message } / a text / the fallback)
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
    // Summary Line (below the canvas) : the open tab's rows
    // (Total / Active / Inactive)
    //===========================================================

    private get summaryRows():
        EnquirySetupRow[]
    {
        return this.rows.filter(x => x.SetupType === this.selectedTab);
    }

    get summaryTotal():
        number
    {
        return this.summaryRows.length;
    }

    get summaryActive():
        number
    {
        return this.summaryRows.filter(x => !!x.IsActive).length;
    }

    get summaryNote():
        string
    {
        return `All ${this.info.tabLabel.toLowerCase()}`;
    }

    summaryText(
        value: number
    ):
        string
    {
        return value.toLocaleString('en-US');
    }
}
