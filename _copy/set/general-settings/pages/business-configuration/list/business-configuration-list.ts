//===============================================================
// Business Configuration
//
// Which business lines each branch runs :
//   Core  : the wing's line(s), always on for every branch under it
//           (Wing Core Business tab)
//   Extra : granted to one branch on top of its core lines
//           Fixed      no end date, until revoked
//           Temporary  Valid From → Valid Until, ends by itself
//
// Tabs
//   Branch Overview  : every branch × the 4 lines, for today
//   Extra Business   : the grants (Add / Edit in a modal, Delete =
//                      Revoke, Restore brings back the latest)
//   Wing Core Business
//
// A branch's warehouses (and their racks) can store Spare Parts /
// Accessories only while the branch runs that line.
//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
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
    FormsModule
}
from '@angular/forms';

import
{
    HttpErrorResponse
}
from '@angular/common/http';

import
{
    forkJoin
}
from 'rxjs';


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
    DropdownComponent
}
from '../../../../../../shared/components/controls/dropdown/dropdown';

import
{
    TextareaComponent
}
from '../../../../../../shared/components/controls/textarea/textarea';

import
{
    FormModalComponent
}
from '../../../../../../shared/components/utilities/form-modal/form-modal';

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
// Models & Service
//===============================================================

import
{
    ACCESS_TYPES,
    BUSINESS_LINES,
    BUSINESS_LINE_ICONS,
    BranchBusinessLines,
    BranchLineStatus,
    BusinessConfiguration,
    WingBusinessLines
}
from '../../../models/business-configuration.model';

import
{
    BusinessConfigurationService
}
from '../../../services/business-configuration.service';


// Grant row in the list table
interface GrantRow
extends BusinessConfiguration
{
    AccessText:
        string;

    ValidFromText:
        string;

    ValidUntilText:
        string;
}


// Grant modal draft
interface GrantDraft
{
    BusinessConfigurationId: number;

    BranchId: number;

    BusinessLine: string;

    AccessType: string;

    ValidFrom: string;

    ValidUntil: string;

    Remarks: string;

    IsActive: boolean;
}


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'business-configuration-list',

    standalone:true,

    imports:
    [
        CommonModule,

        FormsModule,

        PageHeaderComponent,

        PageToolbarComponent,

        ControlTabsComponent,

        SearchBoxComponent,

        CommandCenterComponent,

        PageCanvasComponent,

        ListTableComponent,

        PaginationComponent,

        HistoryDrawerComponent,

        DropdownComponent,

        TextareaComponent,

        FormModalComponent,

        ConfirmDialogComponent,

        ToastComponent
    ],

    templateUrl:'./business-configuration-list.html',

    styleUrl:'./business-configuration-list.css'
})


export class BusinessConfigurationList
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly service =
        inject(BusinessConfigurationService);


    private readonly confirmDialog =
        inject(ConfirmDialogService);


    private readonly toast =
        inject(ToastService);


    private readonly cdr =
        inject(ChangeDetectorRef);



    //===========================================================
    // Constants for the template
    //===========================================================

    readonly lines:
        readonly string[] =
        BUSINESS_LINES;


    readonly lineIcons =
        BUSINESS_LINE_ICONS;



    //===========================================================
    // Tabs
    //===========================================================

    tabs:
        ControlTab[] =
    [
        {
            id:'overview',

            label:'Branch Overview'
        },

        {
            id:'grants',

            label:'Extra Business'
        },

        {
            id:'core',

            label:'Wing Core Business'
        }
    ];


    private currentTab:
        string =
        'overview';


    get selectedTab():
        string
    {
        return this.currentTab;
    }


    set selectedTab
    (
        value:
            string
    )
    {
        this.currentTab =
            value;

        this.currentPage =
            1;

        this.applyFilters();
    }



    //===========================================================
    // Data
    //===========================================================

    overview:
        BranchBusinessLines[] =
    [];


    filteredOverview:
        BranchBusinessLines[] =
    [];


    grants:
        GrantRow[] =
    [];


    filteredGrants:
        GrantRow[] =
    [];


    pagedGrants:
        GrantRow[] =
    [];


    wings:
        WingBusinessLines[] =
    [];


    // Wing Core Business : unsaved selection per wing
    wingDrafts:
        Record<number, string[]> =
        {};


    savingWingId:
        number =
        0;



    //===========================================================
    // Filters / Loading
    //===========================================================

    searchText:
        string =
        '';


    wingFilter:
        number =
        0;


    loading:
        boolean =
        false;


    loadFailed:
        boolean =
        false;


    isProcessing:
        boolean =
        false;



    //===========================================================
    // Pagination (Extra Business tab)
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
        'Business Configuration History';


    historyItems:
        any[] =
    [];



    //===========================================================
    // Page Canvas : footer (pagination) only on Extra Business
    //===========================================================

    private readonly listCanvas:
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


    private readonly panelCanvas:
        PageCanvasConfig =
    {
        ...this.listCanvas,

        showFooter:false,

        reserveFooterSpace:false
    };


    get canvasConfig():
        PageCanvasConfig
    {
        return this.currentTab === 'grants'
            ? this.listCanvas
            : this.panelCanvas;
    }



    //===========================================================
    // Extra Business : table columns
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
            header:'Wing',

            field:'WingName',

            width:'150px',

            align:'left'
        },

        {
            header:'Branch Code',

            field:'BranchCode',

            width:'140px',

            align:'center'
        },

        {
            header:'Branch Name',

            field:'BranchName',

            align:'left'
        },

        {
            header:'Business Line',

            field:'BusinessLine',

            width:'140px',

            align:'left'
        },

        {
            header:'Access',

            field:'AccessText',

            width:'110px',

            align:'center'
        },

        {
            header:'Valid From',

            field:'ValidFromText',

            width:'120px',

            align:'center'
        },

        {
            header:'Valid Until',

            field:'ValidUntilText',

            width:'120px',

            align:'center'
        },

        {
            header:'Today',

            field:'State',

            width:'110px',

            align:'center'
        },

        {
            header:'Status',

            field:'IsActive',

            type:'status',

            width:'150px',

            align:'center'
        },

        {
            header:'Actions',

            field:'actions',

            type:'actions',

            width:'110px',

            align:'center'
        }
    ];



    //===========================================================
    // Grant Modal
    //===========================================================

    modalOpened:
        boolean =
        false;


    draft:
        GrantDraft =
        this.emptyDraft();


    readonly accessTypeItems:
        any[] =
        ACCESS_TYPES.map(
            type =>
            ({
                label:type,

                value:type
            })
        );


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


    branchItems:
        any[] =
    [];


    lineItems:
        any[] =
    [];


    get isEditingGrant():
        boolean
    {
        return this.draft.BusinessConfigurationId > 0;
    }


    get modalTitle():
        string
    {
        return this.isEditingGrant
            ? 'Edit Extra Business'
            : 'Grant Extra Business';
    }


    get isTemporary():
        boolean
    {
        return this.draft.AccessType === 'Temporary';
    }


    get canSaveGrant():
        boolean
    {
        return this.draft.BranchId > 0
            &&
            !!this.draft.BusinessLine
            &&
            !!this.draft.AccessType
            &&
            (
                !this.isTemporary
                ||
                !!this.draft.ValidUntil
            );
    }


    // Core lines of the chosen branch (shown in the modal)
    get draftCoreLines():
        string[]
    {
        return this.coreLinesOf(
            this.draft.BranchId
        );
    }



    //===========================================================
    // Wing filter items
    //===========================================================

    get wingFilterItems():
        any[]
    {
        return [
            {
                label:'All Wings',

                value:0
            },

            ...this.wings.map(
                wing =>
                ({
                    label:`${wing.WingCode} - ${wing.WingName}`,

                    value:wing.WingId
                })
            )
        ];
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
    // Load everything (overview, grants, wing core lines)
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        this.cdr.detectChanges();

        forkJoin
        ({
            overview:
                this.service.getBranchOverview(),

            grants:
                this.service.getAll(),

            wings:
                this.service.getWingLines()
        })
        .subscribe
        ({
            next:
            (
                result
            ): void =>
            {
                this.overview =
                    result.overview;

                this.grants =
                    result.grants.map(
                        grant =>
                            this.toRow(grant)
                    );

                this.wings =
                    result.wings;

                this.wingDrafts =
                    {};

                for
                (
                    const wing
                    of this.wings
                )
                {
                    this.wingDrafts[wing.WingId] =
                        [...wing.BusinessLines];
                }

                this.buildBranchItems();

                this.loading =
                    false;

                this.applyFilters();

                this.cdr.detectChanges();
            },

            error:
            (
                error:
                    unknown
            ): void =>
            {
                console.error(
                    'Load Business Configuration Error',
                    error
                );

                this.loading =
                    false;

                this.loadFailed =
                    true;

                this.cdr.detectChanges();
            }
        });
    }


    refresh():
        void
    {
        this.loadItems();
    }


    private toRow
    (
        grant:
            BusinessConfiguration
    ):
        GrantRow
    {
        return {
            ...grant,

            AccessText:
                grant.AccessType,

            ValidFromText:
                this.formatDate(grant.ValidFrom) || '—',

            ValidUntilText:
                grant.AccessType === 'Fixed'
                    ? 'No end'
                    : this.formatDate(grant.ValidUntil) || '—'
        };
    }



    //===========================================================
    // Filters
    //===========================================================

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText =
            value ?? '';

        this.currentPage =
            1;

        this.applyFilters();
    }


    onWingFilterChange
    (
        value:
            any
    ):
        void
    {
        this.wingFilter =
            Number(this.unwrapValue(value) ?? 0);

        this.currentPage =
            1;

        this.applyFilters();
    }


    applyFilters():
        void
    {
        const text =
            this.searchText
                .trim()
                .toLowerCase();

        const matchesWing =
            (wingId: number | undefined): boolean =>
                !this.wingFilter
                ||
                Number(wingId) === this.wingFilter;

        const matchesText =
            (values: unknown[]): boolean =>
                !text
                ||
                values.some(
                    value =>
                        String(value ?? '')
                            .toLowerCase()
                            .includes(text)
                );

        this.filteredOverview =
            this.overview.filter(
                row =>
                    matchesWing(row.WingId)
                    &&
                    matchesText(
                        [
                            row.WingName,
                            row.BranchCode,
                            row.BranchName,
                            ...row.ActiveLines
                        ]
                    )
            );

        this.filteredGrants =
            this.grants.filter(
                row =>
                    matchesWing(row.WingId)
                    &&
                    matchesText(
                        [
                            row.WingName,
                            row.BranchCode,
                            row.BranchName,
                            row.BusinessLine,
                            row.AccessType,
                            row.State,
                            row.Remarks
                        ]
                    )
            );

        this.updatePagination();
    }


    updatePagination():
        void
    {
        const start =
            (this.currentPage - 1) * this.pageSize;

        this.pagedGrants =
            this.filteredGrants.slice(
                start,
                start + this.pageSize
            );

        this.cdr.detectChanges();
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
    // Branch Overview helpers
    //===========================================================

    lineStatus
    (
        row:
            BranchBusinessLines,
        line:
            string
    ):
        BranchLineStatus | undefined
    {
        return row.Lines.find(
            item =>
                item.BusinessLine === line
        );
    }


    // Text under a granted / scheduled / expired chip
    lineHint
    (
        status:
            BranchLineStatus | undefined
    ):
        string
    {
        if
        (
            !status
            ||
            status.Source === 'Core'
            ||
            status.Source === 'None'
        )
        {
            return '';
        }

        if
        (
            status.Source === 'Scheduled'
        )
        {
            return `from ${this.formatDate(status.ValidFrom)}`;
        }

        if
        (
            status.AccessType === 'Fixed'
        )
        {
            return 'Fixed';
        }

        return `until ${this.formatDate(status.ValidUntil)}`;
    }


    // Click on an overview cell : edit the grant, or grant the line
    onCellClick
    (
        row:
            BranchBusinessLines,
        status:
            BranchLineStatus | undefined
    ):
        void
    {
        if
        (
            !status
            ||
            status.Source === 'Core'
            ||
            this.isProcessing
        )
        {
            return;
        }

        if
        (
            status.BusinessConfigurationId > 0
        )
        {
            const grant =
                this.grants.find(
                    item =>
                        item.BusinessConfigurationId === status.BusinessConfigurationId
                );

            if
            (
                grant
            )
            {
                this.edit(
                    grant
                );
            }

            return;
        }

        this.openGrantModal(
            row.BranchId,
            status.BusinessLine
        );
    }


    private coreLinesOf
    (
        branchId:
            number
    ):
        string[]
    {
        return (
            this.overview
                .find(
                    row =>
                        row.BranchId === Number(branchId)
                )
                ?.Lines
                ?? []
        )
        .filter(
            line =>
                line.Source === 'Core'
        )
        .map(
            line =>
                line.BusinessLine
        );
    }



    //===========================================================
    // Grant Modal
    //===========================================================

    private emptyDraft():
        GrantDraft
    {
        return {
            BusinessConfigurationId:0,

            BranchId:0,

            BusinessLine:'',

            AccessType:'Fixed',

            ValidFrom:this.todayText(),

            ValidUntil:'',

            Remarks:'',

            IsActive:true
        };
    }


    // Page header : Add
    add():
        void
    {
        this.openGrantModal(
            0,
            ''
        );
    }


    private openGrantModal
    (
        branchId:
            number,
        line:
            string
    ):
        void
    {
        this.draft =
        {
            ...this.emptyDraft(),

            BranchId:
                branchId,

            BusinessLine:
                line
        };

        this.buildLineItems();

        this.modalOpened =
            true;

        this.cdr.detectChanges();
    }


    edit
    (
        row:
            GrantRow
    ):
        void
    {
        this.draft =
        {
            BusinessConfigurationId:
                row.BusinessConfigurationId,

            BranchId:
                row.BranchId,

            BusinessLine:
                row.BusinessLine,

            AccessType:
                row.AccessType || 'Fixed',

            ValidFrom:
                row.ValidFrom ?? '',

            ValidUntil:
                row.ValidUntil ?? '',

            Remarks:
                row.Remarks ?? '',

            IsActive:
                row.IsActive
        };

        this.buildLineItems();

        this.modalOpened =
            true;

        this.cdr.detectChanges();
    }


    closeModal():
        void
    {
        this.modalOpened =
            false;

        this.cdr.detectChanges();
    }


    private buildBranchItems():
        void
    {
        this.branchItems =
            this.overview.map(
                row =>
                ({
                    label:
                        `${row.BranchCode} - ${row.BranchName} (${row.WingName})`,

                    value:
                        row.BranchId
                })
            );
    }


    // Lines that can be granted to the chosen branch : not core,
    // not already granted (except the grant being edited)
    private buildLineItems():
        void
    {
        const core =
            this.coreLinesOf(
                this.draft.BranchId
            );

        const granted =
            this.grants
                .filter(
                    grant =>
                        grant.BranchId === Number(this.draft.BranchId)
                        &&
                        grant.BusinessConfigurationId !== this.draft.BusinessConfigurationId
                )
                .map(
                    grant =>
                        grant.BusinessLine
                );

        this.lineItems =
            BUSINESS_LINES
                .filter(
                    line =>
                        line === this.draft.BusinessLine
                        ||
                        (
                            !core.includes(line)
                            &&
                            !granted.includes(line)
                        )
                )
                .map(
                    line =>
                    ({
                        label:line,

                        value:line
                    })
                );

        // A line that became unavailable for the new branch is cleared
        if
        (
            this.draft.BusinessLine
            &&
            !this.isEditingGrant
            &&
            (
                core.includes(this.draft.BusinessLine)
                ||
                granted.includes(this.draft.BusinessLine)
            )
        )
        {
            this.draft.BusinessLine =
                '';
        }

        this.cdr.detectChanges();
    }


    onDraftBranchChange
    (
        value:
            any
    ):
        void
    {
        this.draft.BranchId =
            Number(this.unwrapValue(value) ?? 0);

        this.buildLineItems();
    }


    onDraftLineChange
    (
        value:
            any
    ):
        void
    {
        this.draft.BusinessLine =
            String(this.unwrapValue(value) ?? '');

        this.cdr.detectChanges();
    }


    onDraftAccessTypeChange
    (
        value:
            any
    ):
        void
    {
        this.draft.AccessType =
            String(this.unwrapValue(value) ?? 'Fixed');

        if
        (
            this.draft.AccessType === 'Fixed'
        )
        {
            this.draft.ValidUntil =
                '';
        }

        this.cdr.detectChanges();
    }


    onDraftStatusChange
    (
        value:
            any
    ):
        void
    {
        this.draft.IsActive =
            Boolean(this.unwrapValue(value));

        this.cdr.detectChanges();
    }


    saveGrant():
        void
    {
        if
        (
            !this.canSaveGrant
            ||
            this.isProcessing
        )
        {
            this.toast.error(
                'Validation',
                this.isTemporary && !this.draft.ValidUntil
                    ? 'Valid Until is required for Temporary access.'
                    : 'Select the branch, business line and access type.'
            );

            return;
        }

        if
        (
            this.isTemporary
            &&
            this.draft.ValidFrom
            &&
            this.draft.ValidUntil < this.draft.ValidFrom
        )
        {
            this.toast.error(
                'Validation',
                'Valid Until cannot be before Valid From.'
            );

            return;
        }

        const model =
        {
            BranchId:
                Number(this.draft.BranchId),

            BusinessLine:
                this.draft.BusinessLine,

            AccessType:
                this.draft.AccessType,

            ValidFrom:
                this.draft.ValidFrom || null,

            ValidUntil:
                this.isTemporary
                    ? this.draft.ValidUntil || null
                    : null,

            Remarks:
                this.draft.Remarks?.trim() ?? '',

            IsActive:
                this.draft.IsActive
        };

        this.isProcessing =
            true;

        this.cdr.detectChanges();

        const request$ =
            this.isEditingGrant
                ? this.service.update(
                    {
                        ...model,

                        BusinessConfigurationId:
                            this.draft.BusinessConfigurationId
                    }
                )
                : this.service.create(
                    model
                );

        (request$ as any)
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.isProcessing =
                        false;

                    this.cdr.detectChanges();

                    this.toast.success(
                        'Success',
                        this.isEditingGrant
                            ? `${model.BusinessLine} access updated.`
                            : `${model.BusinessLine} granted.`
                    );

                    this.closeModal();

                    this.loadItems();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    this.isProcessing =
                        false;

                    this.cdr.detectChanges();

                    this.toast.error(
                        'Validation',
                        this.extractMessage(
                            error,
                            'Business access could not be saved.'
                        )
                    );

                    this.cdr.detectChanges();
                }
            });
    }



    //===========================================================
    // Revoke (delete) / Restore
    //===========================================================

    delete
    (
        row:
            GrantRow
    ):
        void
    {
        if
        (
            this.isProcessing
        )
        {
            return;
        }

        this.confirmDialog.open
        (
            'Revoke Business',

            `Revoke ${row.BusinessLine} from ${row.BranchName}? ` +
            'Its warehouses will no longer be offered for this business; items already stored there stay and are marked "access revoked".',

            (): void =>
            {
                setTimeout(
                    () =>
                        this.revoke(
                            row
                        )
                );
            },

            'Revoke',

            'Cancel'
        );
    }


    private revoke
    (
        row:
            GrantRow
    ):
        void
    {
        this.isProcessing =
            true;

        this.service
            .delete(
                row.BusinessConfigurationId
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.isProcessing =
                        false;

                    this.cdr.detectChanges();

                    this.toast.success(
                        'Revoked',
                        `${row.BusinessLine} revoked from ${row.BranchName}.`
                    );

                    this.loadItems();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    this.isProcessing =
                        false;

                    this.cdr.detectChanges();

                    this.toast.error(
                        'Revoke Failed',
                        this.extractMessage(
                            error,
                            'Business access could not be revoked.'
                        )
                    );
                }
            });
    }


    restore():
        void
    {
        if
        (
            this.isProcessing
        )
        {
            return;
        }

        this.confirmDialog.open
        (
            'Restore Business',

            'Restore the most recently revoked business grant?',

            (): void =>
            {
                setTimeout(
                    () =>
                        this.restoreLatest()
                );
            },

            'Restore',

            'Cancel'
        );
    }


    private restoreLatest():
        void
    {
        this.isProcessing =
            true;

        this.service
            .restore()
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.isProcessing =
                        false;

                    this.cdr.detectChanges();

                    this.toast.success(
                        'Restored',
                        'Business grant restored.'
                    );

                    this.loadItems();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    this.isProcessing =
                        false;

                    this.cdr.detectChanges();

                    if
                    (
                        error instanceof HttpErrorResponse
                        &&
                        (error.status === 404 || error.status === 409)
                    )
                    {
                        this.toast.info(
                            'Restore',
                            this.extractMessage(
                                error,
                                'Nothing to restore.'
                            )
                        );

                        return;
                    }

                    this.toast.error(
                        'Restore Failed',
                        'Business grant could not be restored.'
                    );
                }
            });
    }



    //===========================================================
    // Wing Core Business
    //===========================================================

    isWingLineOn
    (
        wingId:
            number,
        line:
            string
    ):
        boolean
    {
        return (this.wingDrafts[wingId] ?? [])
            .includes(
                line
            );
    }


    toggleWingLine
    (
        wingId:
            number,
        line:
            string
    ):
        void
    {
        if
        (
            this.savingWingId
        )
        {
            return;
        }

        const current =
            this.wingDrafts[wingId] ?? [];

        this.wingDrafts[wingId] =
            current.includes(line)
                ? current.filter(item => item !== line)
                : BUSINESS_LINES.filter(
                    item =>
                        item === line
                        ||
                        current.includes(item)
                );

        this.cdr.detectChanges();
    }


    isWingChanged
    (
        wing:
            WingBusinessLines
    ):
        boolean
    {
        const draft =
            [...(this.wingDrafts[wing.WingId] ?? [])].sort().join('|');

        const saved =
            [...wing.BusinessLines].sort().join('|');

        return draft !== saved;
    }


    saveWing
    (
        wing:
            WingBusinessLines
    ):
        void
    {
        const lines =
            this.wingDrafts[wing.WingId] ?? [];

        if
        (
            lines.length === 0
        )
        {
            this.toast.error(
                'Validation',
                `${wing.WingName} needs at least one core business line.`
            );

            return;
        }

        this.savingWingId =
            wing.WingId;

        this.cdr.detectChanges();

        this.service
            .updateWingLines(
                wing.WingId,
                lines
            )
            .subscribe
            ({
                next:
                (): void =>
                {
                    this.savingWingId =
                        0;

                    // zoneless : refresh the button at once
                    this.cdr.detectChanges();

                    this.toast.success(
                        'Success',
                        `Core business of ${wing.WingName} saved.`
                    );

                    this.loadItems();
                },

                error:
                (
                    error:
                        unknown
                ): void =>
                {
                    this.savingWingId =
                        0;

                    // zoneless : refresh the button at once
                    this.cdr.detectChanges();

                    this.toast.error(
                        'Validation',
                        this.extractMessage(
                            error,
                            'Core business could not be saved.'
                        )
                    );

                    this.cdr.detectChanges();
                }
            });
    }


    resetWing
    (
        wing:
            WingBusinessLines
    ):
        void
    {
        this.wingDrafts[wing.WingId] =
            [...wing.BusinessLines];

        this.cdr.detectChanges();
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
                (
                    response:
                        any[]
                ): void =>
                {
                    this.historyItems =
                        (response ?? []).map(
                            history =>
                            ({
                                title:
                                    history.activityTitle ?? history.ActivityTitle,

                                description:
                                    history.activityDescription ?? history.ActivityDescription,

                                user:
                                    history.performedByName ?? history.PerformedByName ?? 'System',

                                dateTime:
                                    new Date(
                                        history.performedDate ?? history.PerformedDate
                                    )
                                    .toLocaleString(),

                                badge:
                                    history.activityType ?? history.ActivityType
                            })
                        );

                    this.historyOpened =
                        true;

                    this.cdr.detectChanges();
                },

                error:
                (): void =>
                {
                    this.toast.error(
                        'History',
                        'Failed to load business configuration history.'
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
    // Helpers
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


    // 'yyyy-MM-dd' → '19 Oct 2026'
    formatDate
    (
        value:
            string | null | undefined
    ):
        string
    {
        if
        (
            !value
        )
        {
            return '';
        }

        const date =
            new Date(`${value}T00:00:00`);

        return isNaN(date.getTime())
            ? value
            : date.toLocaleDateString(
                'en-GB',
                {
                    day:'2-digit',

                    month:'short',

                    year:'numeric'
                }
            );
    }


    private todayText():
        string
    {
        const now =
            new Date();

        const pad =
            (n: number): string =>
                String(n).padStart(2, '0');

        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }


    private extractMessage
    (
        error:
            any,
        fallback:
            string
    ):
        string
    {
        if
        (
            typeof error?.error === 'string'
            &&
            error.error.trim()
        )
        {
            return error.error;
        }

        return error?.error?.message
            ??
            error?.error?.title
            ??
            fallback;
    }
}