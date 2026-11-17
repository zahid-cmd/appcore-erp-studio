//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
    DestroyRef,
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
    ActivatedRoute
}
from '@angular/router';

import
{
    Observable,
    catchError,
    forkJoin,
    of
}
from 'rxjs';

import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../shared/components/layout/page-toolbar/page-toolbar';
import { ControlTab, ControlTabsComponent } from '../../../../shared/components/controls/control-tabs/control-tabs';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { SearchDropdownComponent } from '../../../../shared/components/controls/search-dropdown/search-dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { SearchBoxComponent } from '../../../../shared/components/utilities/search-box/search-box';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { ListTableActions, ListTableColumn, ListTableComponent } from '../../../../shared/components/layout/list-table/list-table';
import { PaginationComponent } from '../../../../shared/components/controls/pagination/pagination';
import { HistoryDrawerComponent } from '../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ProgressDialogComponent } from '../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../human-resource-manangement/services/hr-progress.service';

import { WsService } from '../../shared/ws.service';

import
{
    WS_EMPTY_GUID,
    WorkshopBay,
    WorkshopChecklistItem,
    WorkshopDiagnosis,
    WorkshopDiagnosisItem,
    WorkshopDiagnosisSetup,
    WorkshopObservation,
    WorkshopOutsideWork,
    WorkshopOutsideWorksSetup,
    WorkshopTechnician,
    WsLookup,
    WsPartOption,
    WsServiceItem,
    wsMoney,
    wsStatusColor
}
from '../../shared/ws.models';


//===============================================================
// Model
//===============================================================

type Tab =
    'bays' | 'technicians' | 'checklist' | 'observations' | 'diagnoses' | 'outsideworks' | 'switches';

// A row put on the list with Add / Apply : written by Save
interface Pending
{
    key: number;
    tab: Tab;
    // '' : a new row; else the PublicId of the row it changes
    editId: string;
    code: string;
    name: string;
    branchId: number;
    employeeId: number;
    skill: string;
    sortOrder: number;
    remarks: string;
    isActive: boolean;
    // an observation : the default one
    isDefault: boolean;
    // an outside work : its usual charge
    rate: number;
    // a diagnosis : its observation (0 : any) and what it suggests
    observationId: number;
    items: WorkshopDiagnosisItem[];
}

type Row =
    (WorkshopBay | WorkshopTechnician | WorkshopChecklistItem)
    &
    {
        StatusText: string;
        StatusColor: string;
    };


//===============================================================
// Workshop Configuration (Service Operations > Service Setup)
//
// One page, seven tabs :
//   Bays         the work bays of a service center
//   Technicians  the employees (Human Resource) who work on job
//                cards
//   Checklist    what is checked when a bike comes in
//   Observations the problems of a bike, picked on a service
//                estimate
//   Diagnoses    what was found; a diagnosis can suggest labour
//                and parts for the estimate
//   Outside Works the works done outside the workshop, picked on
//                the estimate and the job card (never typed there)
//   Switches     the rules of a job card
//
// A list tab shows its rows on the left and the form of one row
// on the right. Add (on the form) puts the row on the list as a
// row to save; nothing is written until Save (command center),
// which writes every row to save. The pen of a row fills the form
// (Apply puts the change on the list). Codes are made by the
// server; the list shows the ones the rows will get.
//===============================================================

@Component(
{
    selector:'workshop-configuration',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        SearchDropdownComponent,
        TextboxComponent,
        SearchBoxComponent,
        CommandCenterComponent,
        ListTableComponent,
        PaginationComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./workshop-configuration.html',
    styleUrl:'./workshop-configuration.css'
})
export class WorkshopConfigurationPage
implements OnInit
{
    private readonly ws = inject(WsService);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progress = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    private readonly route = inject(ActivatedRoute);

    loading =
        false;

    loadFailed =
        false;

    isSaving =
        false;

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
    // Tabs
    //===========================================================

    readonly tabs:
        ControlTab[] =
    [
        { id:'bays', label:'Bays' },
        { id:'technicians', label:'Technicians' },
        { id:'checklist', label:'Check-in Checklist' },
        { id:'observations', label:'Observations' },
        { id:'diagnoses', label:'Diagnoses' },
        { id:'outsideworks', label:'Outside Works' },
        { id:'switches', label:'Switches' }
    ];

    tab:
        Tab = 'bays';

    get isList(): boolean
    {
        return this.tab !== 'switches';
    }

    // Bay / Technician / Checklist Item / Observation / Diagnosis
    get noun(): string
    {
        return this.tab === 'bays' ? 'Bay'
            : this.tab === 'technicians' ? 'Technician'
            : this.tab === 'observations' ? 'Observation'
            : this.tab === 'diagnoses' ? 'Diagnosis'
            : this.tab === 'outsideworks' ? 'Outside Work'
            : 'Checklist Item';
    }

    get nameLabel(): string
    {
        return this.tab === 'bays' ? 'Bay Name' : this.noun;
    }

    get namePlaceholder(): string
    {
        return this.tab === 'bays' ? 'e.g. Service Bay 1'
            : this.tab === 'observations' ? 'e.g. Engine noise'
            : this.tab === 'diagnoses' ? 'e.g. Clutch plate worn'
            : this.tab === 'outsideworks' ? 'e.g. Lathe work'
            : 'e.g. Mirrors';
    }

    get activeNote(): string
    {
        return this.tab === 'outsideworks' ? 'An Inactive one cannot be picked on an estimate or a job card'
            : this.tab === 'observations' || this.tab === 'diagnoses'
            ? 'An Inactive one cannot be picked on an estimate'
            : 'An Inactive one cannot be chosen on a job card';
    }

    //===========================================================
    // Lists
    //===========================================================

    private bays:
        WorkshopBay[] = [];

    private technicians:
        WorkshopTechnician[] = [];

    private checklist:
        WorkshopChecklistItem[] = [];

    private observations:
        WorkshopObservation[] = [];

    private diagnoses:
        WorkshopDiagnosis[] = [];

    private outsideWorks:
        WorkshopOutsideWork[] = [];

    // What a diagnosis can suggest
    private catalogServices:
        WsServiceItem[] = [];

    private catalogParts:
        WsPartOption[] = [];

    observationItems:
        { label: string; value: number }[] = [];

    suggestServiceItems:
        { label: string; value: string }[] = [];

    suggestPartItems:
        { label: string; value: string }[] = [];

    branches:
        WsLookup[] = [];

    employeeItems:
        { label: string; value: number; branchId: number }[] = [];

    private nextCodes:
        Record<string, string> = {};

    private employees:
        WsLookup[] = [];

    // The rows to save (every tab)
    private pending:
        Pending[] = [];

    private pendingKey =
        1;

    rows:
        any[] = [];

    searchText =
        '';

    currentPage =
        1;

    pageSize =
        10;

    totalRecords =
        0;

    // The eye is not needed : the pen shows the row on the right
    readonly rowActions:
        ListTableActions = { view:false, edit:true, delete:true };

    private readonly columnSets:
        Record<string, ListTableColumn[]> =
    {
        bays:
        [
            { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
            { header:'Code', field:'Code', width:'100px', align:'center' },
            { header:'Bay', field:'Name', width:'220px', align:'left' },
            { header:'Service Center', field:'BranchName', width:'200px', align:'left' },
            { header:'Remarks', field:'Remarks', width:'220px', align:'left' },
            { header:'Status', field:'StatusText', width:'100px', align:'left', dotField:'StatusColor' },
            { header:'Actions', field:'actions', type:'actions', width:'90px', align:'center' }
        ],
        technicians:
        [
            { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
            { header:'Code', field:'Code', width:'100px', align:'center' },
            { header:'Technician', field:'EmployeeName', width:'220px', align:'left' },
            { header:'Employee', field:'EmployeeCode', width:'110px', align:'center' },
            { header:'Service Center', field:'BranchName', width:'190px', align:'left' },
            { header:'Skill', field:'Skill', width:'150px', align:'left' },
            { header:'Status', field:'StatusText', width:'100px', align:'left', dotField:'StatusColor' },
            { header:'Actions', field:'actions', type:'actions', width:'90px', align:'center' }
        ],
        checklist:
        [
            { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
            { header:'Code', field:'Code', width:'100px', align:'center' },
            { header:'Checklist Item', field:'Name', width:'280px', align:'left' },
            { header:'Order', field:'SortOrder', width:'80px', align:'center' },
            { header:'Remarks', field:'Remarks', width:'240px', align:'left' },
            { header:'Status', field:'StatusText', width:'100px', align:'left', dotField:'StatusColor' },
            { header:'Actions', field:'actions', type:'actions', width:'90px', align:'center' }
        ],
        observations:
        [
            { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
            { header:'Code', field:'Code', width:'100px', align:'center' },
            { header:'Observation', field:'Name', width:'320px', align:'left' },
            { header:'Default', field:'DefaultText', width:'90px', align:'center' },
            { header:'Remarks', field:'Remarks', width:'240px', align:'left' },
            { header:'Status', field:'StatusText', width:'100px', align:'left', dotField:'StatusColor' },
            { header:'Actions', field:'actions', type:'actions', width:'90px', align:'center' }
        ],
        diagnoses:
        [
            { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
            { header:'Code', field:'Code', width:'100px', align:'center' },
            { header:'Diagnosis', field:'Name', width:'250px', align:'left' },
            { header:'For Observation', field:'ObservationText', width:'210px', align:'left' },
            { header:'Suggests', field:'SuggestText', width:'170px', align:'left' },
            { header:'Status', field:'StatusText', width:'100px', align:'left', dotField:'StatusColor' },
            { header:'Actions', field:'actions', type:'actions', width:'90px', align:'center' }
        ],
        outsideworks:
        [
            { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
            { header:'Code', field:'Code', width:'100px', align:'center' },
            { header:'Outside Work', field:'Name', width:'280px', align:'left' },
            { header:'Usual Charge', field:'RateText', width:'120px', align:'right' },
            { header:'Remarks', field:'Remarks', width:'220px', align:'left' },
            { header:'Status', field:'StatusText', width:'100px', align:'left', dotField:'StatusColor' },
            { header:'Actions', field:'actions', type:'actions', width:'90px', align:'center' }
        ]
    };

    get columns(): ListTableColumn[]
    {
        return this.columnSets[this.tab] ?? [];
    }

    historyOpened =
        false;

    historyItems:
        any[] = [];

    //===========================================================
    // The form of one row (right)
    //===========================================================

    // '' : a new one
    editId =
        '';

    code =
        '';

    name =
        '';

    branchId =
        0;

    employeeId =
        0;

    skill =
        '';

    sortOrder =
        '';

    // An outside work : its usual charge to the customer
    rate =
        '';

    // Add Bays : how many bays to make ("Bay n" ...)
    bayCount =
        '1';

    remarks =
        '';

    isActive =
        true;

    // An observation : the default one (one only; the one saved
    // last takes it)
    isDefault =
        false;

    // A diagnosis : the observation it explains (0 : any)
    observationId =
        0;

    // A diagnosis : the labour and the parts it suggests
    items:
        WorkshopDiagnosisItem[] = [];

    suggestServicePick:
        any = null;

    suggestPartPick:
        any = null;

    get codeText(): string
    {
        return this.editId
            ? this.code
            : this.codeAfter(this.nextCodes[this.tab] ?? '', this.pending.filter(x => x.tab === this.tab && !x.editId).length);
    }

    // A new bay is not named : bays are made by number
    get isBayAdd(): boolean
    {
        return this.tab === 'bays' && !this.editId;
    }

    // 1 .. 50; 0 : not a number of bays
    private get bayCountNumber(): number
    {
        const text = this.bayCount.trim();

        const count = /^\d{1,2}$/.test(text) ? Number(text) : 0;

        return count >= 1 && count <= 50 ? count : 0;
    }

    // "Service Bay 4", "Service Bay 5" : after the highest bay number
    // of the service center and the new bays already on the list (the
    // server names them by the same rule)
    private get bayNames(): string[]
    {
        const count = this.bayCountNumber;

        if (!count || !this.branchId)
        {
            return [];
        }

        const from =
            this.highestBay(this.branchId)
            + this.pending.filter(x => x.tab === 'bays' && !x.editId && x.branchId === this.branchId).length;

        return Array.from({ length:count }, (_, i) => `Service Bay ${from + i + 1}`);
    }

    // Read only, on the Add Bays form : the codes the bays will get
    // ("BAY-0004 to BAY-0005")
    get bayCodeSample(): string
    {
        const first = this.codeText;

        const count = this.bayCountNumber;

        return count <= 1 ? first : `${first} to ${this.codeAfter(first, count - 1)}`;
    }

    // Read only : the names the bays will get
    get bayNameSample(): string
    {
        const names = this.bayNames;

        return names.length === 0 ? ''
            : names.length === 1 ? names[0]
            : `${names[0]} to ${names[names.length - 1]}`;
    }

    // The line under the fields : what Add will put on the list
    get bayPreview(): string
    {
        if (!this.bayCountNumber)
        {
            return 'Number of Bays : a whole number, 1 to 50.';
        }

        const names = this.bayNames;

        if (names.length === 0)
        {
            return 'Choose the service center to see the bays.';
        }

        const shown =
            names.length > 6 ? `${names[0]} to ${names[names.length - 1]} (${names.length} bays)` : names.join(', ');

        return `Add puts ${shown} of ${this.branchName(this.branchId)} on the list. Save then creates them.`;
    }

    get formTitle(): string
    {
        return this.isBayAdd ? 'Add Bays' : `${this.editId ? 'Update' : 'Add'} ${this.noun}`;
    }

    // Rows of this tab wait to be saved : the list shows only them
    get hasPending(): boolean
    {
        return this.pending.some(x => x.tab === this.tab);
    }

    //===========================================================
    // Switches
    //===========================================================

    requireKm =
        true;

    requireChecklist =
        false;

    requireEstimate =
        false;

    issueWithoutRequisition =
        true;

    allowCreditInvoice =
        false;

    // Picking a diagnosis on an estimate puts its labour and parts
    // on the estimate
    diagnosisSuggests =
        false;

    // The customized service that is the Estimate Charge (0 : none,
    // estimates are free)
    estimateChargeServiceId =
        0;

    chargeItems:
        { label: string; value: number }[] = [];

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        // ...?tab=outsideworks : the + of the estimate and the job card
        const tab = this.route.snapshot.queryParamMap.get('tab') ?? '';

        if (this.tabs.some(x => x.id === tab))
        {
            this.tab = tab as Tab;
        }

        this.load();
    }

    // Refresh (command center) : the rows waiting to be saved are
    // dropped (every tab), the form is cleared, the saved rows are
    // read again
    onRefresh():
        void
    {
        this.pending = [];
        this.clearForm();
        this.load();
    }

    load():
        void
    {
        this.loading = true;
        this.loadFailed = false;
        this.cdr.detectChanges();

        // the observations and diagnoses : empty until their script
        // (ServiceOperations_Diagnosis_Engine.sql) was run
        forkJoin({
            setup:this.ws.getSetup(),
            diagnosis:this.ws.getDiagnosisSetup().pipe(catchError(() => of(null as WorkshopDiagnosisSetup | null))),
            // empty until ServiceOperations_Outside_Works.sql was run
            works:this.ws.getOutsideWorksSetup().pipe(catchError(() => of(null as WorkshopOutsideWorksSetup | null)))
        })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:({ setup, diagnosis, works }) =>
                {
                    this.outsideWorks = works?.OutsideWorks ?? [];
                    this.observations = diagnosis?.Observations ?? [];
                    this.diagnoses = diagnosis?.Diagnoses ?? [];
                    this.catalogServices = diagnosis?.ServiceItems ?? [];
                    this.catalogParts = diagnosis?.Parts ?? [];

                    this.observationItems =
                    [
                        { label:'Any observation', value:0 },
                        ...this.observations.map(x => ({ label:`${x.Code}  ${x.Name}`, value:x.WorkshopObservationId }))
                    ];

                    this.suggestServiceItems =
                        this.catalogServices.map(x => ({ label:`${x.Code}  ${x.Name}`, value:`${x.Kind}:${x.Id}` }));

                    this.suggestPartItems =
                        this.catalogParts.map(x => ({ label:`${x.PartNumber || x.Code}  ${x.Name}`, value:`${x.Kind}:${x.Id}` }));

                    this.bays = setup?.Bays ?? [];
                    this.technicians = setup?.Technicians ?? [];
                    this.checklist = setup?.ChecklistItems ?? [];
                    this.branches = setup?.Branches ?? [];
                    this.employees = setup?.Employees ?? [];

                    this.employeeItems =
                        (setup?.Employees ?? []).map(x => ({ label:`${x.Code}  ${x.Name}`, value:x.Id, branchId:x.BranchId }));

                    this.nextCodes =
                    {
                        bays:setup?.NextBayCode ?? '',
                        technicians:setup?.NextTechnicianCode ?? '',
                        checklist:setup?.NextChecklistCode ?? '',
                        observations:diagnosis?.NextObservationCode ?? '',
                        diagnoses:diagnosis?.NextDiagnosisCode ?? '',
                        outsideworks:works?.NextCode ?? ''
                    };

                    this.requireKm = setup?.Switches?.RequireKm !== false;
                    this.requireChecklist = !!setup?.Switches?.RequireChecklist;
                    this.requireEstimate = !!setup?.Switches?.RequireEstimate;
                    this.issueWithoutRequisition = setup?.Switches?.IssueWithoutRequisition !== false;
                    this.allowCreditInvoice = !!setup?.Switches?.AllowCreditInvoice;
                    this.diagnosisSuggests = !!setup?.Switches?.DiagnosisSuggests;
                    this.estimateChargeServiceId = Number(setup?.Switches?.EstimateChargeServiceId) || 0;

                    this.chargeItems =
                    [
                        { label:'None : estimates are free', value:0 },
                        ...(setup?.ChargeServices ?? []).map(x => ({ label:`${x.Code}  ${x.Name}`, value:x.Id }))
                    ];

                    this.loading = false;
                    this.apply();
                },
                error:error =>
                {
                    this.loading = false;
                    this.loadFailed = true;
                    this.toast.error('Error', error?.error?.message ?? 'The workshop configuration could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // List
    //===========================================================

    private source(): any[]
    {
        return this.tab === 'bays' ? this.bays
            : this.tab === 'technicians' ? this.technicians
            : this.tab === 'checklist' ? this.checklist
            : this.tab === 'observations' ? this.observations
            : this.tab === 'diagnoses' ? this.diagnoses
            : this.tab === 'outsideworks' ? this.outsideWorks
            : [];
    }

    // "2 labour, 1 part"
    private suggestText(items: WorkshopDiagnosisItem[] | null | undefined): string
    {
        const labour = (items ?? []).filter(x => x.LineType === 'Service').length;
        const parts = (items ?? []).filter(x => x.LineType === 'Part').length;

        return [labour ? `${labour} labour` : '', parts ? `${parts} part${parts === 1 ? '' : 's'}` : ''].filter(x => !!x).join(', ');
    }

    private observationName(id: number | null | undefined): string
    {
        return id ? (this.observations.find(x => x.WorkshopObservationId === id)?.Name ?? '') : 'Any observation';
    }

    private branchName(id: number): string
    {
        return this.branches.find(x => x.Id === id)?.Name ?? '';
    }

    // The highest "Service Bay n" of a service center (saved bays)
    private highestBay(branchId: number): number
    {
        let highest = 0;

        for (const bay of this.bays)
        {
            const match = /^service\s+bay\s+(\d+)$/i.exec((bay.Name ?? '').trim());

            if (bay.BranchId === branchId && match && Number(match[1]) > highest)
            {
                highest = Number(match[1]);
            }
        }

        return highest;
    }

    // BAY-0011 + 2 : BAY-0013
    private codeAfter(next: string, offset: number): string
    {
        const match = /^(.*?)(\d+)$/.exec(next ?? '');

        return match ? `${match[1]}${String(Number(match[2]) + offset).padStart(match[2].length, '0')}` : (next ?? '');
    }

    // A row to save as a row of the list
    private pendingRow(x: Pending, index: number): any
    {
        const employee =
            this.employees.find(e => e.Id === x.employeeId);

        const row: any =
        {
            PendingKey:x.key,
            PendingEdit:!!x.editId,
            PublicId:x.editId || `new-${x.key}`,
            Code:x.editId ? x.code : this.codeAfter(this.nextCodes[x.tab] ?? '', index),
            Name:x.name,
            BranchId:x.branchId,
            BranchName:this.branchName(x.branchId),
            EmployeeId:x.employeeId,
            EmployeeCode:employee?.Code ?? '',
            EmployeeName:employee?.Name ?? '',
            Skill:x.skill,
            SortOrder:x.sortOrder,
            Remarks:x.remarks,
            IsActive:x.isActive,
            IsDefault:x.isDefault,
            DefaultText:x.isDefault ? 'Default' : '',
            Rate:x.rate,
            RateText:x.tab === 'outsideworks' ? wsMoney(x.rate) : '',
            WorkshopObservationId:x.observationId || null,
            ObservationText:this.observationName(x.observationId),
            Items:x.items,
            SuggestText:this.suggestText(x.items),
            StatusText:x.editId ? 'Changed' : 'New',
            StatusColor:'#d97706'
        };

        if (x.tab === 'bays' && !x.editId)
        {
            // named after the saved bays and the new ones above it
            const before =
                this.pending.filter(y => y.tab === 'bays' && !y.editId && y.branchId === x.branchId && y.key < x.key).length;

            row.Name = `Service Bay ${this.highestBay(x.branchId) + before + 1}`;
        }

        return row;
    }

    // The list. While rows wait to be saved it shows only them (the
    // new ones, then the changed ones) : the saved rows come back
    // after Save, or when the waiting rows are removed.
    private apply():
        void
    {
        const find =
            this.searchText.trim().toLowerCase();

        const mine =
            this.pending.filter(x => x.tab === this.tab);

        const fresh =
            mine.filter(x => !x.editId).map((x, i) => this.pendingRow(x, i));

        const saved =
            mine.length > 0
                ? mine.filter(x => !!x.editId).map(x => this.pendingRow(x, 0))
                : this.source().map(x => ({
                    ...x,
                    ObservationText:this.tab === 'diagnoses' ? (x.ObservationName || 'Any observation') : '',
                    SuggestText:this.tab === 'diagnoses' ? this.suggestText(x.Items) : '',
                    RateText:this.tab === 'outsideworks' ? wsMoney(Number(x.Rate) || 0) : '',
                    DefaultText:x.IsDefault ? 'Default' : '',
                    StatusText:x.IsActive ? 'Active' : 'Inactive',
                    StatusColor:wsStatusColor(x.IsActive ? 'Active' : 'Inactive')
                }));

        const matched =
            [...fresh, ...saved]
                .filter(x => !find || Object.values(x).some(v => typeof v === 'string' && v.toLowerCase().includes(find)));

        this.totalRecords = matched.length;

        const pages = Math.max(1, Math.ceil(matched.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start = (this.currentPage - 1) * this.pageSize;

        this.rows = matched.slice(start, start + this.pageSize);

        this.cdr.detectChanges();
    }


    onTab(value: string):
        void
    {
        this.tab = (value || 'bays') as Tab;
        this.currentPage = 1;
        this.searchText = '';
        this.clearForm();
        this.apply();
    }

    onSearch(value: string):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;
        this.apply();
    }

    onPageChange(page: number):
        void
    {
        this.currentPage = page;
        this.apply();
    }

    onPageSizeChange(size: number):
        void
    {
        this.pageSize = size;
        this.currentPage = 1;
        this.apply();
    }

    onSort(_event: any):
        void
    {
        // By code (the checklist : by its order)
    }

    openHistory():
        void
    {
        this.ws
            .getHistory('service-setup/workshop-configuration')
            .subscribe(
            {
                next:items =>
                {
                    this.historyItems = items;
                    this.historyOpened = true;
                    this.cdr.detectChanges();
                },
                error:() => this.toast.error('Error', 'The history could not be loaded.')
            });
    }

    closeHistory():
        void
    {
        this.historyOpened = false;
        this.cdr.detectChanges();
    }

    //===========================================================
    // Form
    //===========================================================

    // Add : an empty form
    clearForm():
        void
    {
        this.editId = '';
        this.code = '';
        this.name = '';
        this.branchId = this.branches.length === 1 ? this.branches[0].Id : 0;
        this.employeeId = 0;
        this.skill = '';
        this.sortOrder = '';
        this.rate = '';
        this.bayCount = '1';
        this.remarks = '';
        this.isActive = true;
        this.isDefault = false;
        this.observationId = 0;
        this.items = [];
        this.cdr.detectChanges();
    }

    // The pen of a row
    edit(row: any):
        void
    {
        // a new row that is not saved yet
        if (row.PendingKey && !row.PendingEdit)
        {
            if (this.tab === 'bays')
            {
                this.toast.error('Bays', 'A new bay gets its name and code from the system. Remove it with the bin if it is not wanted.');
                return;
            }

            // it goes back on the form; Add puts it on the list again
            this.pending = this.pending.filter(x => x.key !== row.PendingKey);
            this.editId = '';
            this.code = '';
        }
        else
        {
            this.editId = row.PublicId ?? '';
            this.code = row.Code ?? '';
        }

        this.name = row.Name ?? '';
        this.branchId = Number(row.BranchId) || 0;
        this.employeeId = Number(row.EmployeeId) || 0;
        this.skill = row.Skill ?? '';
        this.sortOrder = row.SortOrder ? String(row.SortOrder) : '';
        this.rate = Number(row.Rate) > 0 ? String(row.Rate) : '';
        this.remarks = row.Remarks ?? '';
        this.isActive = row.IsActive !== false;
        this.isDefault = row.IsDefault === true;
        this.observationId = Number(row.WorkshopObservationId) || 0;
        this.items = (row.Items ?? []).map((x: WorkshopDiagnosisItem) => ({ ...x }));

        this.apply();
    }


    onText(field: 'name' | 'skill' | 'remarks' | 'sortOrder' | 'bayCount' | 'rate', value: any):
        void
    {
        this[field] = String(value ?? '');

        if (field === 'bayCount')
        {
            // the preview line follows the number
            this.cdr.detectChanges();
        }
    }

    onBranch(value: any):
        void
    {
        this.branchId = Number(value) || 0;
        this.cdr.detectChanges();
    }

    // The technician works where the employee is posted, unless
    // another service center is picked
    onEmployee(value: any):
        void
    {
        this.employeeId = Number(value) || 0;

        const employee =
            this.employeeItems.find(x => x.value === this.employeeId);

        if (employee && !this.branchId)
        {
            this.branchId = employee.branchId;
        }

        this.cdr.detectChanges();
    }

    onActive(event: Event):
        void
    {
        this.isActive = (event.target as HTMLInputElement).checked;

        // an inactive one cannot be the default
        if (!this.isActive)
        {
            this.isDefault = false;
        }

        this.cdr.detectChanges();
    }

    onDefault(event: Event):
        void
    {
        this.isDefault = (event.target as HTMLInputElement).checked && this.isActive;
        this.cdr.detectChanges();
    }

    // The Add / Apply button of the form : the row goes on the list
    // (left) as a row to save; nothing is written yet
    onAdd():
        void
    {
        if (!this.isList)
        {
            return;
        }

        if (this.isBayAdd)
        {
            const count = this.bayCountNumber;

            if (!count)
            {
                this.toast.error('Validation', 'Number of Bays must be a whole number, 1 to 50.');
                return;
            }

            if (!this.branchId)
            {
                this.toast.error('Validation', 'Choose the service center of the bays.');
                return;
            }

            if (this.pending.filter(x => x.tab === 'bays' && !x.editId).length + count > 50)
            {
                this.toast.error('Validation', 'At most 50 new bays can be saved at once. Save these first.');
                return;
            }

            for (let i = 0; i < count; i++)
            {
                this.pending.push(this.draft(''));
            }

            this.clearForm();
            this.apply();
            return;
        }

        if (this.tab === 'technicians')
        {
            if (!this.employeeId)
            {
                this.toast.error('Validation', 'Choose the employee.');
                return;
            }

            if (!this.branchId)
            {
                this.toast.error('Validation', 'Choose the service center of the technician.');
                return;
            }

            if (this.pending.some(x => x.tab === 'technicians' && x.employeeId === this.employeeId && x.editId !== this.editId)
                || this.technicians.some(x => x.EmployeeId === this.employeeId && x.PublicId !== this.editId))
            {
                this.toast.error('Validation', 'This employee is a technician already.');
                return;
            }
        }
        else
        {
            if (!this.name.trim())
            {
                this.toast.error('Validation', `Give the ${this.noun.toLowerCase()} a name.`);
                return;
            }

            if (this.tab === 'diagnoses' && this.items.some(x => !(Number(x.Quantity) > 0)))
            {
                this.toast.error('Validation', 'Give every suggested part its quantity.');
                return;
            }

            if (this.tab === 'bays' && !this.branchId)
            {
                this.toast.error('Validation', 'Choose the service center of the bay.');
                return;
            }

            if (this.tab === 'outsideworks' && this.rate.trim() !== '' && !(Number(this.rate) >= 0))
            {
                this.toast.error('Validation', 'The usual charge must be a number (empty when it changes every time).');
                return;
            }
        }

        // a row changed twice : the last change stays
        if (this.editId)
        {
            this.pending = this.pending.filter(x => !(x.tab === this.tab && x.editId === this.editId));
        }

        this.pending.push(this.draft(this.editId));

        this.clearForm();
        this.apply();
    }

    // What the form holds, as a row to save
    private draft(editId: string): Pending
    {
        return {
            key:this.pendingKey++,
            tab:this.tab,
            editId,
            code:editId ? this.code : '',
            name:this.name.trim(),
            branchId:this.branchId,
            employeeId:this.employeeId,
            skill:this.skill.trim(),
            sortOrder:Math.max(0, Math.round(Number(this.sortOrder) || 0)),
            remarks:this.remarks.trim(),
            isActive:this.isActive,
            isDefault:this.tab === 'observations' && this.isDefault && this.isActive,
            rate:this.tab === 'outsideworks' ? Math.max(0, Number(this.rate) || 0) : 0,
            observationId:this.tab === 'diagnoses' ? this.observationId : 0,
            items:this.tab === 'diagnoses' ? this.items.map(x => ({ ...x, Quantity:Number(x.Quantity) || 1 })) : []
        };
    }

    // Save (command center) : every row to save is written. New bays
    // go in one go (all or nothing); the others one after the other.
    onSave():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        if (!this.isList)
        {
            this.onSaveSwitches();
            return;
        }

        if (this.pending.length === 0)
        {
            this.toast.error('Save', 'There is nothing to save. Fill the form on the right and press Add first.');
            return;
        }

        const newBays =
            this.pending.filter(x => x.tab === 'bays' && !x.editId);

        const jobs: { keys: number[]; run: () => Observable<any> }[] = [];

        if (newBays.length > 0)
        {
            jobs.push({
                keys:newBays.map(x => x.key),
                run:() => this.ws.createBays(newBays.map(x => ({ BranchId:x.branchId, Remarks:x.remarks })))
            });
        }

        for (const x of this.pending.filter(y => !(y.tab === 'bays' && !y.editId)))
        {
            jobs.push({ keys:[x.key], run:() => this.request(x) });
        }

        this.isSaving = true;

        this.progress.show('Saving', 'Saving the workshop configuration...');

        let saved = 0;

        const next =
            (): void =>
            {
                const job = jobs.shift();

                if (!job)
                {
                    // the bar fills, then the page carries on
                    this.progress.finish(() =>
                    {
                        this.isSaving = false;
                        this.toast.success('Success', `${saved} record${saved === 1 ? ' was' : 's were'} saved.`);
                        this.load();
                    });

                    return;
                }

                job.run().subscribe(
                {
                    next:() =>
                    {
                        saved += job.keys.length;

                        // written : no longer a row to save
                        this.pending = this.pending.filter(x => !job.keys.includes(x.key));

                        next();
                    },
                    error:error =>
                    {
                        this.progress.fail();
                        this.isSaving = false;

                        this.toast.error(
                            'Error',
                            `${error?.error?.message ?? 'The record could not be saved.'}${saved > 0 ? ` ${saved} record(s) before it were saved.` : ''}`);

                        // what was written shows as saved; the rest stays to save
                        this.load();
                    }
                });
            };

        next();
    }

    // One row to save (not a new bay) as its request
    private request(x: Pending): Observable<any>
    {
        const publicId = x.editId || WS_EMPTY_GUID;

        if (x.tab === 'technicians')
        {
            return this.ws.saveTechnician(
                x.editId,
                { PublicId:publicId, EmployeeId:x.employeeId, BranchId:x.branchId, Skill:x.skill, Remarks:x.remarks, IsActive:x.isActive });
        }

        if (x.tab === 'bays')
        {
            return this.ws.saveBay(
                x.editId,
                { PublicId:publicId, Name:x.name, BranchId:x.branchId, Remarks:x.remarks, IsActive:x.isActive });
        }

        if (x.tab === 'observations')
        {
            return this.ws.saveObservation(
                x.editId,
                { PublicId:publicId, Name:x.name, Remarks:x.remarks, IsActive:x.isActive, IsDefault:x.isDefault });
        }

        if (x.tab === 'outsideworks')
        {
            return this.ws.saveOutsideWork(
                x.editId,
                { PublicId:publicId, Name:x.name, Rate:x.rate, Remarks:x.remarks, IsActive:x.isActive });
        }

        if (x.tab === 'diagnoses')
        {
            return this.ws.saveDiagnosis(
                x.editId,
                { PublicId:publicId, Name:x.name, WorkshopObservationId:x.observationId || null, Remarks:x.remarks, IsActive:x.isActive, Items:x.items });
        }

        return this.ws.saveChecklistItem(
            x.editId,
            { PublicId:publicId, Name:x.name, SortOrder:x.sortOrder, Remarks:x.remarks, IsActive:x.isActive });
    }

    delete(row: any):
        void
    {
        // a row to save : it only leaves the list
        if (row.PendingKey)
        {
            this.pending = this.pending.filter(x => x.key !== row.PendingKey);

            if (this.editId && this.editId === row.PublicId)
            {
                this.clearForm();
            }

            this.apply();
            return;
        }

        const noun = this.noun;

        const label =
            `${row.Code} ${row.Name ?? row.EmployeeName ?? ''}`.trim();

        const request =
            this.tab === 'bays' ? this.ws.deleteBay(row.PublicId)
            : this.tab === 'technicians' ? this.ws.deleteTechnician(row.PublicId)
            : this.tab === 'observations' ? this.ws.deleteObservation(row.PublicId)
            : this.tab === 'diagnoses' ? this.ws.deleteDiagnosis(row.PublicId)
            : this.tab === 'outsideworks' ? this.ws.deleteOutsideWork(row.PublicId)
            : this.ws.deleteChecklistItem(row.PublicId);

        this.confirmDialog.open(
            `Delete ${noun}`,
            `Delete ${label}?`,
            () =>
                request.subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `${row.Code} was deleted.`);

                        if (this.editId === row.PublicId)
                        {
                            this.clearForm();
                        }

                        this.load();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? `The ${noun.toLowerCase()} could not be deleted.`)
                }),
            'Delete',
            'Keep',
            'danger');
    }

    //===========================================================
    // A diagnosis : its observation and what it suggests
    //===========================================================

    onObservation(value: any):
        void
    {
        this.observationId = Number(value) || 0;
        this.cdr.detectChanges();
    }

    private addItem(item: WorkshopDiagnosisItem):
        void
    {
        if (this.items.some(x => x.LineType === item.LineType && x.ItemKind === item.ItemKind && x.ItemId === item.ItemId))
        {
            this.toast.error('Diagnosis', `${item.ItemName} is suggested already.`);
            return;
        }

        this.items = [...this.items, item];
    }

    onSuggestService(value: any):
        void
    {
        if (!value)
        {
            return;
        }

        this.suggestServicePick = value;

        const item = this.catalogServices.find(x => `${x.Kind}:${x.Id}` === String(value));

        if (item)
        {
            this.addItem({ LineType:'Service', ItemKind:item.Kind, ItemId:item.Id, ItemCode:item.Code ?? '', ItemName:item.Name ?? '', Quantity:1 });
        }

        setTimeout(() =>
        {
            this.suggestServicePick = null;
            this.cdr.detectChanges();
        });
    }

    onSuggestPart(value: any):
        void
    {
        if (!value)
        {
            return;
        }

        this.suggestPartPick = value;

        const part = this.catalogParts.find(x => `${x.Kind}:${x.Id}` === String(value));

        if (part)
        {
            this.addItem({ LineType:'Part', ItemKind:part.Kind, ItemId:part.Id, ItemCode:part.PartNumber || part.Code || '', ItemName:part.Name ?? '', Quantity:1 });
        }

        setTimeout(() =>
        {
            this.suggestPartPick = null;
            this.cdr.detectChanges();
        });
    }

    onItemQuantity(item: WorkshopDiagnosisItem, event: Event):
        void
    {
        item.Quantity = Number((event.target as HTMLInputElement).value) || 0;
    }

    removeItem(item: WorkshopDiagnosisItem):
        void
    {
        this.items = this.items.filter(x => x !== item);
        this.cdr.detectChanges();
    }


    //===========================================================
    // Switches
    //===========================================================

    onSwitch(field: 'requireKm' | 'requireChecklist' | 'requireEstimate' | 'issueWithoutRequisition' | 'allowCreditInvoice' | 'diagnosisSuggests', event: Event):
        void
    {
        this[field] = (event.target as HTMLInputElement).checked;
        this.cdr.detectChanges();
    }

    onEstimateCharge(value: any):
        void
    {
        this.estimateChargeServiceId = Number(value) || 0;
        this.cdr.detectChanges();
    }

    onSaveSwitches():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        this.isSaving = true;

        this.progress.show('Saving', 'Saving the workshop switches...');

        this.ws.saveSwitches({ RequireKm:this.requireKm, RequireChecklist:this.requireChecklist, RequireEstimate:this.requireEstimate, IssueWithoutRequisition:this.issueWithoutRequisition, AllowCreditInvoice:this.allowCreditInvoice, EstimateChargeServiceId:this.estimateChargeServiceId || null, DiagnosisSuggests:this.diagnosisSuggests }).subscribe(
        {
            next:() =>
                this.progress.finish(() =>
                {
                    this.isSaving = false;
                    this.toast.success('Success', 'The workshop switches were saved.');
                    this.cdr.detectChanges();
                }),
            error:error =>
            {
                this.progress.fail();
                this.isSaving = false;
                this.toast.error('Error', error?.error?.message ?? 'The workshop switches could not be saved.');
                this.cdr.detectChanges();
            }
        });
    }
}
