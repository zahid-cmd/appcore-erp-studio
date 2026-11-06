import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, finalize, timeout } from 'rxjs';

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { ControlTabsComponent, ControlTab } from '../../../../../../shared/components/controls/control-tabs/control-tabs';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { DropdownComponent } from '../../../../../../shared/components/controls/dropdown/dropdown';
import { SearchDropdownComponent } from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { StepsCounterComponent } from '../../../../../../shared/components/controls/steps-counter/steps-counter';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    PageCloningWorkflowService,
    CloneWorkflowState,
    CloneFieldRow,
    CloneSetup,
    FieldAction,
    ParentMode,
    ControlType,
    FormSection
}
from '../../../services/page-cloning-workflow.service';
import { PageCloningService } from '../../../services/page-cloning.service';
import { EntityAnalysis, AnalysisField } from '../../../model/page-cloning.model';

//===============================================================
// Column definition (same idea as the list pages)
//===============================================================
export interface ActionColumn
{
    header: string;
    field: string;
    type: 'serial' | 'source' | 'action' | 'text' | 'datatype' | 'number' | 'check' | 'control' | 'section' | 'default' | 'remove';
    width: string;
    align: 'left' | 'center' | 'right';
}

@Component(
{
    selector:'page-cloning-action',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent, PageToolbarComponent, CommandCenterComponent,
        ControlTabsComponent, PageCanvasComponent, ToastComponent,
        DropdownComponent, SearchDropdownComponent, StepsCounterComponent
    ],
    templateUrl:'./page-cloning-action.html',
    styleUrls:['./page-cloning-action.css']
})
export class PageCloningActionComponent implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================
    private readonly router = inject(Router);
    private readonly workflow = inject(PageCloningWorkflowService);
    private readonly pageCloningService = inject(PageCloningService);
    private readonly toast = inject(ToastService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly zone = inject(NgZone);

    //===========================================================
    // Page Tabs and Canvas
    //===========================================================
    selectedTab = 'action';

    tabs: ControlTab[] =
    [
        { id:'action', label:'Clone Action' }
    ];

    readonly canvasConfig = {
        showFooter: true,
        reserveFooterSpace: true,
        footerHeight: 56
    } as PageCanvasConfig;

    //===========================================================
    // Table Columns
    //===========================================================
    readonly columns: ActionColumn[] =
    [
        { header:'#',            field:'serial',     type:'serial',   width:'44px',  align:'center' },
        { header:'Source field', field:'sourceName', type:'source',   width:'190px', align:'left'   },
        { header:'Action',       field:'action',     type:'action',   width:'120px', align:'left'   },
        { header:'Target name',  field:'name',       type:'text',     width:'auto',  align:'left'   },
        { header:'Type',         field:'type',       type:'datatype', width:'120px', align:'left'   },
        { header:'Max',          field:'maxLength',  type:'number',   width:'90px',  align:'left'   },
        { header:'Control',      field:'control',    type:'control',  width:'190px', align:'left'   },
        { header:'Section',      field:'section',    type:'section',  width:'130px', align:'left'   },
        { header:'Default',      field:'default',    type:'default',  width:'130px', align:'left'   },
        { header:'Required',     field:'required',   type:'check',    width:'80px',  align:'center' },
        { header:'Unique',       field:'unique',     type:'check',    width:'70px',  align:'center' },
        { header:'Remove',       field:'remove',     type:'remove',   width:'70px',  align:'center' }
    ];

    readonly sourceActions: FieldAction[] = ['Keep', 'Modify', 'Exclude'];
    readonly addedActions: FieldAction[] = ['Add', 'Exclude'];
    readonly parentModes: ParentMode[] = ['Keep', 'Change', 'Exclude'];

    // The form has four columns. Parent is reserved for the parent link field,
    // so the user chooses between the other three.
    readonly sectionItems: FormSection[] = ['Information', 'Status', 'Description'];

    readonly controlItems: { value: ControlType; label: string }[] =
    [
        { value: 'Textbox',        label: 'Textbox' },
        { value: 'Textarea',       label: 'Textarea' },
        { value: 'Number',         label: 'Number' },
        { value: 'Date',           label: 'Date' },
        { value: 'YesNo',          label: 'Yes / No dropdown' },
        { value: 'Status',         label: 'Status dropdown' },
        { value: 'Checkbox',       label: 'Checkbox' },
        { value: 'Dropdown',       label: 'Dropdown' },
        { value: 'SearchDropdown', label: 'Search dropdown' }
    ];

    private readonly baseTypes = ['string', 'bool', 'int', 'long', 'decimal', 'double', 'DateTime',
                                  'string?', 'int?', 'long?', 'decimal?', 'DateTime?'];

    private readonly numericTypes = ['int', 'long', 'decimal', 'double', 'int?', 'long?', 'decimal?'];

    private readonly hiddenFields = new Set(
    [
        'IsDeleted', 'DeletedBy', 'DeletedDate',
        'CreatedBy', 'CreatedDate',
        'ModifiedBy', 'ModifiedDate'
    ].map(x => x.toLowerCase()));

    private readonly systemFields = new Set(['isactive', 'remarks']);

    //===========================================================
    // State
    //===========================================================
    analysis: EntityAnalysis | null = null;
    loading = false;
    cascadeLoading = false;

    parentFormat = '';
    parentOptions: string[] = [];

    private sub?: Subscription;
    private cascadeSub?: Subscription;
    private watchdog?: ReturnType<typeof setTimeout>;
    private heartbeat?: ReturnType<typeof setInterval>;
    private loadStarted = 0;
    private destroyed = false;

    get state(): CloneWorkflowState { return this.workflow.state; }
    get rows(): CloneFieldRow[] { return this.state.fields ?? []; }
    get setup(): CloneSetup { return this.state.setup; }

    // View mode is read-only. Edit mode can change everything on this page.
    get locked(): boolean { return this.workflow.state.mode === 'view'; }

    get pageTitle(): string { return this.workflow.pageTitle; }

    //===========================================================
    // CHANGE DETECTION LOCK
    // ---------------------------------------------------------
    // RULES (do not remove):
    //  1. Never call cdr directly. Always call refresh().
    //  2. Every async callback (subscribe, setTimeout) must call
    //     refresh() as its LAST statement, in next, error and finalize.
    //  3. While loading or cascadeLoading is true, a heartbeat repaints
    //     the screen every second, so a missed refresh can never leave
    //     the spinner on screen.
    //  4. Work inside callbacks is wrapped in try/catch so one error
    //     cannot stop the refresh that follows it.
    //===========================================================
    private detect(): void
    {
        if (this.destroyed) { return; }

        try
        {
            this.cdr.markForCheck();
            this.cdr.detectChanges();
        }
        catch (error)
        {
            console.error('[Clone Action] render error', error);
        }
    }

    private refresh(): void
    {
        if (this.destroyed) { return; }

        this.zone.run(() => this.detect());

        // second pass after the current task, in case the first one was skipped
        setTimeout(() =>
        {
            if (!this.destroyed) { this.zone.run(() => this.detect()); }
        }, 0);
    }

    private startHeartbeat(): void
    {
        if (this.heartbeat) { return; }

        this.heartbeat = setInterval(() =>
        {
            if (this.destroyed || (!this.loading && !this.cascadeLoading))
            {
                this.stopHeartbeat();
                return;
            }

            this.zone.run(() => this.detect());
        }, 1000);
    }

    private stopHeartbeat(): void
    {
        if (this.heartbeat) { clearInterval(this.heartbeat); this.heartbeat = undefined; }
    }

    private clearWatchdog(): void
    {
        if (this.watchdog) { clearTimeout(this.watchdog); this.watchdog = undefined; }
    }

    // Repairs a state object created before fields / setup / control / section existed
    private ensureState(): void
    {
        const s = this.state;

        if (!Array.isArray(s.fields)) { s.fields = []; }
        if (!s.fieldsForSourceId) { s.fieldsForSourceId = 0; }
        if (!s.setup) { s.setup = this.workflow.emptySetup(); }
        if (!s.setupForSourceId) { s.setupForSourceId = 0; }

        for (const r of s.fields)
        {
            r.type = r.type ?? 'string';

            if (!r.control)
            {
                r.control = this.guessControl(r.sourceName || r.name, r.type, r.maxLength, false);
            }

            r.defaultValue = r.defaultValue ?? this.guessDefault(r.sourceName || r.name, r.control);
            r.srcControl = r.srcControl ?? r.control;
            r.srcDefault = r.srcDefault ?? r.defaultValue;

            r.sectionManual = r.sectionManual ?? false;
            r.section = r.section ?? this.guessSection(r.control, !!r.sourceName && this.isParentName(r.sourceName));
        }
    }

    //===========================================================
    // Initialize
    //===========================================================
    ngOnInit(): void
    {
        try
        {
            this.ensureState();
        }
        catch (error)
        {
            console.error('[Clone Action] state repair failed', error);
            this.workflow.state.fields = [];
            this.workflow.state.fieldsForSourceId = 0;
        }

        if (!this.state.cloneFromId || !this.state.cloneToId || !this.state.entityName)
        {
            this.toast.info('Clone', 'Please complete the previous steps first.');
            void this.router.navigate(
                ['/infrastructure-control', 'development-management', 'page-cloning', 'source']);
            return;
        }

        this.workflow.loadSubmenus().subscribe(
        {
            next: list =>
            {
                try
                {
                    this.parentOptions = Array.from(new Set(
                        list.map(o => (o.name ?? '').replace(/[^A-Za-z0-9]/g, '')).filter(x => !!x)))
                        .sort((a, b) => a.localeCompare(b));
                }
                catch (error)
                {
                    console.error('[Clone Action] parent list error', error);
                }

                this.refresh();
            },
            error: () => { this.refresh(); }
        });

        // Start after the first render, so the view exists before it is repainted
        setTimeout(() => this.loadSource(), 0);
    }

    ngOnDestroy(): void
    {
        this.destroyed = true;
        this.clearWatchdog();
        this.stopHeartbeat();
        this.sub?.unsubscribe();
        this.cascadeSub?.unsubscribe();
    }

    //===========================================================
    // Load the source analysis
    //===========================================================
    private loadSource(): void
    {
        if (this.destroyed) { return; }

        this.loading = true;
        this.loadStarted = Date.now();
        this.startHeartbeat();
        this.refresh();

        console.log('[Clone Action] analyze sent for', this.state.cloneFromName);

        // Last resort: the spinner can never stay forever
        this.clearWatchdog();
        this.watchdog = setTimeout(() =>
        {
            if (this.loading)
            {
                console.error('[Clone Action] watchdog fired, no answer from the API');
                this.loading = false;
                this.toast.error('Source page', 'No answer from the API. Check that it is running.');
                this.refresh();
            }
        }, 35000);

        this.sub = this.pageCloningService
            .analyze(this.state.cloneFromName)
            .pipe(
                timeout(30000),
                finalize(() =>
                {
                    this.clearWatchdog();
                    this.loading = false;
                    this.refresh();
                })
            )
            .subscribe(
            {
                next: (a: EntityAnalysis) =>
                {
                    console.log('[Clone Action] analyze received in',
                        Date.now() - this.loadStarted, 'ms');

                    this.loading = false;
                    this.clearWatchdog();
                    this.analysis = a;

                    try
                    {
                        if (this.state.blueprint)
                        {
                            // A saved clone was opened from the list:
                            // build the source rows first, then lay the saved decisions on top
                            this.buildFromSource();
                            this.buildSetup();
                            this.applyBlueprint();
                        }
                        else
                        {
                            if (this.state.fieldsForSourceId !== this.state.cloneFromId
                                || this.state.fields.length === 0)
                            {
                                this.buildFromSource();
                            }

                            if (this.state.setupForSourceId !== this.state.cloneFromId)
                            {
                                this.buildSetup();
                            }
                            else if (this.setup.parentEntity)
                            {
                                this.loadCascade();
                            }
                        }
                    }
                    catch (error)
                    {
                        console.error('[Clone Action] build error', error);
                        this.toast.error('Clone Action', 'Could not build the field list from the source.');
                    }

                    this.refresh();
                },
                error: (error: any) =>
                {
                    console.error('[Clone Action] analyze failed', error);

                    this.loading = false;
                    this.clearWatchdog();

                    this.toast.error('Source page',
                        error?.name === 'TimeoutError'
                            ? 'Reading the files took more than 30 seconds. Check that the API is running.'
                            : 'Could not read the source page fields.');

                    this.refresh();
                }
            });
    }

    //===========================================================
    // Lay the saved clone plan (BlueprintJson) over the source rows.
    // Used only when a record is opened from the list (View / Edit).
    //===========================================================
    private applyBlueprint(): void
    {
        const bp: any = this.state.blueprint;
        if (!bp) { return; }

        // The backend may send camelCase or PascalCase
        const pick = (o: any, key: string): any =>
            o?.[key] ?? o?.[key.charAt(0).toUpperCase() + key.slice(1)];

        const rows = [...this.state.fields];
        const added: CloneFieldRow[] = [];

        for (const f of (pick(bp, 'fields') ?? []) as any[])
        {
            const sourceName = String(pick(f, 'sourceName') ?? '');
            const row = sourceName ? rows.find(r => r.sourceName === sourceName) : undefined;

            const savedControl = (pick(f, 'control') ?? 'Textbox') as ControlType;
            const savedSection = String(pick(f, 'section') ?? '');
            const isParentRow = !!row && this.isParent(row);

            // Parent link rows always sit in the Parent column. An older saved clone
            // has no section yet, so it gets the automatic one.
            const section: FormSection = isParentRow
                ? 'Parent'
                : (this.sectionItems.includes(savedSection as FormSection)
                    ? (savedSection as FormSection)
                    : this.guessSection(savedControl, false));

            const saved = {
                action: (pick(f, 'action') ?? 'Keep') as FieldAction,
                name: String(pick(f, 'name') ?? ''),
                type: String(pick(f, 'type') ?? 'string'),
                maxLength: (pick(f, 'maxLength') ?? null) as number | null,
                required: !!pick(f, 'required'),
                unique: !!pick(f, 'unique'),
                control: savedControl,
                defaultValue: String(pick(f, 'defaultValue') ?? ''),
                section,
                sectionManual: !!pick(f, 'sectionManual')
            };

            if (row)
            {
                Object.assign(row, saved);
            }
            else if (!sourceName)
            {
                // A field the user added by hand
                added.push({
                    sourceName: '',
                    ...saved,
                    srcType: '', srcMaxLength: null, srcRequired: false, srcUnique: false,
                    srcControl: 'Textbox', srcDefault: ''
                });
            }
        }

        this.state.fields = [...rows, ...added];

        const parent = pick(bp, 'parent') ?? {};
        const code = pick(bp, 'code') ?? {};
        const s = this.state.setup;

        s.parentMode = (pick(parent, 'mode') ?? 'Exclude') as ParentMode;
        s.parentEntity = String(pick(parent, 'entity') ?? '');
        s.parentFk = String(pick(parent, 'foreignKey') ?? '');
        s.cascade = [...((pick(parent, 'cascade') ?? []) as string[])];

        s.codeEnabled = !!pick(bp, 'writeCodeGeneratorMethod');
        s.codePrefix = String(pick(code, 'prefix') ?? s.codePrefix);
        s.codeSequencePad = Number(pick(code, 'sequencePad')) || s.codeSequencePad;
        s.softDelete = !!pick(bp, 'softDelete');

        s.codeSegments = ((pick(code, 'segments') ?? []) as any[]).map(x =>
            ({ name: String(pick(x, 'name') ?? ''), pad: Number(pick(x, 'pad')) || 3 }));

        this.state.fieldsForSourceId = this.state.cloneFromId;
        this.state.setupForSourceId = this.state.cloneFromId;

        // Applied once. Going Back and Next again must keep the user's edits.
        this.state.blueprint = null;

        // Re-read the parent so the code example and cascade show correctly
        this.loadCascade();
    }

    //===========================================================
    // Control and default guessing (null-safe)
    //===========================================================
    private isParentName(name: string): boolean
    {
        return !!this.analysis?.Parents?.some(p => p.ForeignKey === name);
    }

    // Wings -> Wing, Categories -> Category, BankAccounts -> BankAccount
    private stem(name: string): string
    {
        const n = (name ?? '').replace(/[^A-Za-z0-9]/g, '');

        if (/ies$/i.test(n)) { return n.slice(0, -3) + 'y'; }
        if (/sses$/i.test(n)) { return n.slice(0, -2); }
        if (/s$/i.test(n) && !/ss$/i.test(n)) { return n.slice(0, -1); }

        return n;
    }

    // WingCode -> BankAccountCode when the source stem is Wing and the target stem is BankAccount.
    // BankCode -> CardCode when BankSetup is cloned to CardSetup (only the differing leading
    // words are compared once the shared trailing words, "Setup", are dropped).
    private renameField(name: string): string
    {
        const from = this.stem(this.state.cloneFromName);
        const to = this.stem(this.state.entityName);

        if (!from || !to || from.toLowerCase() === to.toLowerCase()) { return name; }

        const pairs: Array<[string, string]> = [[from, to]];

        const words = (s: string): string[] => s.match(/[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[0-9]+/g) ?? [s];
        const a = words(from);
        const b = words(to);

        while (a.length > 1 && b.length > 1 && a[a.length - 1].toLowerCase() === b[b.length - 1].toLowerCase())
        {
            a.pop();
            b.pop();
        }

        const fromHead = a.join('');
        const toHead = b.join('');

        if (fromHead && toHead && fromHead.toLowerCase() !== toHead.toLowerCase())
        {
            pairs.push([fromHead, toHead]);
        }

        const lower = name.toLowerCase();

        for (const [f, t] of pairs)
        {
            if (lower.startsWith(f.toLowerCase()))
            {
                return t + name.slice(f.length);
            }
        }

        return name;
    }

    // The automatic target name of a source field (parent keys keep their name)
    private autoName(sourceName: string): string
    {
        return this.isParentName(sourceName) ? sourceName : this.renameField(sourceName);
    }

    private guessControl(name: string, type: string | null | undefined, maxLength: number | null | undefined, parent: boolean): ControlType
    {
        const n = (name ?? '').toLowerCase();
        const t = type ?? 'string';

        if (parent) { return 'SearchDropdown'; }
        if (n === 'isactive') { return 'Status'; }
        if (t === 'bool') { return 'YesNo'; }
        if (t === 'DateTime' || t === 'DateTime?') { return 'Date'; }
        if (this.numericTypes.includes(t)) { return 'Number'; }
        if (t.startsWith('string') && (maxLength ?? 0) >= 500) { return 'Textarea'; }

        return 'Textbox';
    }

    // The automatic form column of a field:
    // parent link -> Parent, Yes/No / Status / Checkbox -> Status,
    // Textarea -> Description, everything else -> Information
    private guessSection(control: ControlType, parent: boolean): FormSection
    {
        if (parent) { return 'Parent'; }

        switch (control)
        {
            case 'YesNo':
            case 'Status':
            case 'Checkbox':
                return 'Status';

            case 'Textarea':
                return 'Description';

            default:
                return 'Information';
        }
    }

    private guessDefault(name: string, control: ControlType): string
    {
        if (control === 'Status') { return 'Active'; }
        if (control === 'YesNo') { return 'No'; }
        if (control === 'Checkbox') { return 'Unchecked'; }
        return '';
    }

    defaultOptions(row: CloneFieldRow): string[]
    {
        switch (row.control)
        {
            case 'YesNo':    return ['Yes', 'No'];
            case 'Status':   return ['Active', 'Inactive'];
            case 'Checkbox': return ['Checked', 'Unchecked'];
            default:         return [];
        }
    }

    isLookup(row: CloneFieldRow): boolean
    {
        return row.control === 'Dropdown' || row.control === 'SearchDropdown';
    }

    isTypeLocked(row: CloneFieldRow): boolean
    {
        return ['YesNo', 'Status', 'Checkbox', 'Date'].includes(row.control);
    }

    private applyControlRules(row: CloneFieldRow): void
    {
        const t = row.type ?? 'string';

        switch (row.control)
        {
            case 'YesNo':
            case 'Status':
            case 'Checkbox':
                row.type = 'bool';
                row.maxLength = null;
                break;

            case 'Date':
                if (t !== 'DateTime' && t !== 'DateTime?') { row.type = 'DateTime'; }
                row.maxLength = null;
                break;

            case 'Number':
                if (!this.numericTypes.includes(t)) { row.type = 'int'; }
                break;

            case 'Textarea':
            case 'Textbox':
                if (t === 'bool' || t.startsWith('DateTime')) { row.type = 'string'; }
                break;

            default:
                break;
        }

        const opts = this.defaultOptions(row);

        if (opts.length)
        {
            row.defaultValue = opts.includes(row.defaultValue) ? row.defaultValue : opts[opts.length - 1];
        }
        else if (this.isLookup(row))
        {
            row.defaultValue = '';
        }
    }

    //===========================================================
    // Build rows from the source (everything except key and audit)
    // Names are renamed automatically for the target page.
    //===========================================================
    private buildFromSource(): void
    {
        const pk = (this.analysis?.PrimaryKey ?? '').toLowerCase();

        const fields: AnalysisField[] = (this.analysis?.Fields ?? [])
            .filter(f =>
                !!f.Name &&
                f.Name.toLowerCase() !== pk &&
                !this.hiddenFields.has(f.Name.toLowerCase()));

        this.state.fields = fields.map(f =>
        {
            const type = f.CsType ?? 'string';
            const max = f.MaxLength ?? null;
            const parent = this.isParentName(f.Name);
            const control = this.guessControl(f.Name, type, max, parent);
            const def = this.guessDefault(f.Name, control);

            const target = this.autoName(f.Name);
            const renamed = target !== f.Name;

            return {
                sourceName: f.Name,
                action: (renamed ? 'Modify' : 'Keep') as FieldAction,
                name: target,
                type,
                maxLength: max,
                required: !!f.Required,
                unique: !!f.Unique,
                control,
                defaultValue: def,
                section: this.guessSection(control, parent),
                sectionManual: false,
                srcType: type,
                srcMaxLength: max,
                srcRequired: !!f.Required,
                srcUnique: !!f.Unique,
                srcControl: control,
                srcDefault: def
            };
        });

        this.state.fieldsForSourceId = this.state.cloneFromId;
    }

    //===========================================================
    // Build the setup (parent, code number, options) from the source
    //===========================================================
    private get sourceParent(): { ForeignKey: string; ParentEntity: string } | null
    {
        return this.analysis?.Parents?.[0] ?? null;
    }

    private pad(format: string, which: 'first' | 'last'): number
    {
        const m = [...(format ?? '').matchAll(/:D(\d)\}/g)].map(x => Number(x[1]));
        if (!m.length) { return which === 'first' ? 3 : 4; }
        return which === 'first' ? m[0] : m[m.length - 1];
    }

    private buildSetup(): void
    {
        const a = this.analysis;
        const p = this.sourceParent;
        const format = a?.CodeFormat ?? '';

        this.state.setup =
        {
            parentMode: p ? 'Keep' : 'Exclude',
            parentEntity: p?.ParentEntity ?? '',
            parentFk: p?.ForeignKey ?? '',
            cascade: [],

            codeEnabled: !!format,
            codePrefix: (this.state.entityName ?? '').replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 3),
            codeSegments: [],
            codeSequencePad: this.pad(format, 'last'),

            softDelete: !!a?.Fields?.some(f => f.Name === 'IsDeleted')
        };

        this.state.setupForSourceId = this.state.cloneFromId;
        this.loadCascade();
    }

    //===========================================================
    // Parent link
    //===========================================================
    get parentChoices(): string[]
    {
        const list = this.parentOptions.filter(x => x !== this.state.entityName);
        const cur = this.setup.parentEntity;
        return cur && !list.includes(cur) ? [cur, ...list] : list;
    }

    get hasSourceParent(): boolean { return !!this.sourceParent; }

    get sourceParentName(): string { return this.sourceParent?.ParentEntity ?? ''; }

    get availableParentModes(): ParentMode[]
    {
        return this.hasSourceParent ? this.parentModes : ['Change', 'Exclude'];
    }

    get parentModeItems(): { label: string; value: string }[]
    {
        const label: Record<string, string> =
        {
            Keep: 'Keep same parent',
            Change: 'Change parent',
            Exclude: 'No parent'
        };

        return this.availableParentModes.map(m => ({ label: label[m], value: m }));
    }

    get parentEntityItems(): { label: string; value: string }[]
    {
        return this.parentChoices.map(p => ({ label: p, value: p }));
    }

    onParentMode(value: any): void
    {
        const mode = String(value ?? 'Exclude') as ParentMode;
        const p = this.sourceParent;

        this.setup.parentMode = mode;

        if (mode === 'Exclude')
        {
            this.setup.parentEntity = '';
            this.setup.parentFk = '';
        }
        else if (mode === 'Keep' && p)
        {
            this.setup.parentEntity = p.ParentEntity;
            this.setup.parentFk = p.ForeignKey;
        }
        else if (mode === 'Change')
        {
            this.setup.parentEntity = '';
            this.setup.parentFk = '';
        }

        this.syncParentRow();
        this.loadCascade();
        this.refresh();
    }

    onParentEntity(value: any): void
    {
        const entity = String(value ?? '');

        this.setup.parentEntity = entity;
        this.setup.parentFk = entity ? `${entity}Id` : '';

        this.syncParentRow();
        this.loadCascade();
        this.refresh();
    }

    onParentFk(event: Event): void
    {
        const el = event.target as HTMLInputElement;
        this.setup.parentFk = el.value.replace(/[^A-Za-z0-9_]/g, '');
        el.value = this.setup.parentFk;

        this.syncParentRow();
    }

    private syncParentRow(): void
    {
        const p = this.sourceParent;
        if (!p) { return; }

        const row = this.rows.find(r => r.sourceName === p.ForeignKey);
        if (!row) { return; }

        const s = this.setup;

        if (s.parentMode === 'Exclude')
        {
            row.action = 'Exclude';
        }
        else if (s.parentMode === 'Keep')
        {
            this.restoreFromSource(row);
        }
        else
        {
            row.action = 'Modify';
            row.name = s.parentFk || row.sourceName;
            row.type = row.srcType || 'long';
            row.control = 'SearchDropdown';
            row.defaultValue = '';
            row.section = 'Parent';
        }
    }

    // Keep = the source values with the automatic target name
    private restoreFromSource(row: CloneFieldRow): void
    {
        row.action = 'Keep';
        row.name = this.autoName(row.sourceName);
        row.type = row.srcType;
        row.maxLength = row.srcMaxLength;
        row.required = row.srcRequired;
        row.unique = row.srcUnique;
        row.control = row.srcControl;
        row.defaultValue = row.srcDefault;

        // back to the automatic form column
        row.sectionManual = false;
        row.section = this.guessSection(row.srcControl, this.isParent(row));
    }

    //===========================================================
    // Cascade chain and parent code format
    //===========================================================
    private loadCascade(): void
    {
        this.cascadeSub?.unsubscribe();

        const entity = this.setup.parentEntity;

        if (!entity)
        {
            this.cascadeLoading = false;
            this.parentFormat = '';
            this.setup.cascade = [];
            this.rebuildSegments();
            this.refresh();
            return;
        }

        this.cascadeLoading = true;
        this.startHeartbeat();
        this.refresh();

        this.cascadeSub = this.pageCloningService
            .analyze(entity)
            .pipe(
                timeout(15000),
                finalize(() =>
                {
                    this.cascadeLoading = false;
                    this.refresh();
                })
            )
            .subscribe(
            {
                next: (a: EntityAnalysis) =>
                {
                    this.cascadeLoading = false;

                    try
                    {
                        this.parentFormat = a.CodeFormat ?? '';
                        this.setup.cascade = (a.Parents ?? []).map(x => x.ParentEntity);
                        this.rebuildSegments();
                    }
                    catch (error)
                    {
                        console.error('[Clone Action] cascade error', error);
                    }

                    this.refresh();
                },
                error: () =>
                {
                    this.parentFormat = '';
                    this.cascadeLoading = false;
                    this.setup.cascade = [];
                    this.rebuildSegments();
                    this.refresh();
                }
            });
    }

    //===========================================================
    // Code number
    //===========================================================
    private rebuildSegments(): void
    {
        const s = this.setup;
        const names = [...(s.cascade ?? []), s.parentEntity].filter(x => !!x);

        const pads = [...(this.parentFormat ?? '').matchAll(/:D(\d)\}/g)].map(x => Number(x[1]));
        const fallback = this.pad(this.analysis?.CodeFormat ?? '', 'first');

        s.codeSegments = names.map((n, i) =>
        ({
            name: n,
            pad: pads[i] ?? pads[pads.length - 1] ?? fallback
        }));
    }

    get parentCodeExample(): string
    {
        const f = this.parentFormat;
        if (!f) { return ''; }

        const prefix = f.match(/^([A-Za-z]+)-/)?.[1] ?? '';
        const pads = [...f.matchAll(/:D(\d)\}/g)].map(x => Number(x[1]));

        return [prefix, ...pads.map(p => '1'.padStart(p, '0'))].filter(x => x).join('-');
    }

    onCodeEnabled(event: Event): void
    {
        this.setup.codeEnabled = (event.target as HTMLInputElement).checked;
        this.refresh();
    }

    onPrefix(event: Event): void
    {
        const el = event.target as HTMLInputElement;
        this.setup.codePrefix = el.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 5);
        el.value = this.setup.codePrefix;
        this.refresh();
    }

    onSequencePad(event: Event): void
    {
        const n = Number((event.target as HTMLInputElement).value);
        this.setup.codeSequencePad = n >= 1 && n <= 9 ? n : 4;
        this.refresh();
    }

    onSoftDelete(event: Event): void
    {
        this.setup.softDelete = (event.target as HTMLInputElement).checked;
    }

    get codeExample(): string
    {
        const s = this.setup;
        if (!s || !s.codeEnabled || !s.codePrefix) { return ''; }

        return [
            s.codePrefix,
            ...(s.codeSegments ?? []).map(x => '1'.padStart(x.pad, '0')),
            '1'.padStart(s.codeSequencePad, '0')
        ].join('-');
    }

    get codeMethodName(): string
    {
        return `Generate${this.state.entityName}Code`;
    }

    //===========================================================
    // Row helpers
    //===========================================================
    actionsFor(row: CloneFieldRow): FieldAction[]
    {
        return row.sourceName ? this.sourceActions : this.addedActions;
    }

    typesFor(row: CloneFieldRow): string[]
    {
        return !row.type || this.baseTypes.includes(row.type)
            ? this.baseTypes
            : [row.type, ...this.baseTypes];
    }

    // The form columns a row can be placed in. The parent link field
    // always stays in the Parent column.
    sectionsFor(row: CloneFieldRow): FormSection[]
    {
        return this.isParent(row) ? ['Parent'] : this.sectionItems;
    }

    isEditable(row: CloneFieldRow): boolean
    {
        return row.action === 'Modify' || row.action === 'Add';
    }

    isParent(row: CloneFieldRow): boolean
    {
        return !!row.sourceName && this.isParentName(row.sourceName);
    }

    isSystem(row: CloneFieldRow): boolean
    {
        return !!row.sourceName && this.systemFields.has(row.sourceName.toLowerCase());
    }

    //===========================================================
    // Inline edits
    //===========================================================
    onAction(row: CloneFieldRow, value: string): void
    {
        row.action = value as FieldAction;

        if (row.action === 'Keep' && row.sourceName)
        {
            this.restoreFromSource(row);
        }

        this.refresh();
    }

    onName(row: CloneFieldRow, event: Event): void
    {
        row.name = (event.target as HTMLInputElement).value.replace(/[^A-Za-z0-9_]/g, '');
        (event.target as HTMLInputElement).value = row.name;
    }

    onType(row: CloneFieldRow, event: Event): void
    {
        row.type = (event.target as HTMLSelectElement).value;
    }

    onMax(row: CloneFieldRow, event: Event): void
    {
        const v = (event.target as HTMLInputElement).value.trim();
        row.maxLength = v === '' ? null : Number(v) || null;
    }

    onControl(row: CloneFieldRow, event: Event): void
    {
        row.control = (event.target as HTMLSelectElement).value as ControlType;
        this.applyControlRules(row);

        // The column follows the control until the user picks one by hand
        if (!row.sectionManual && !this.isParent(row))
        {
            row.section = this.guessSection(row.control, false);
        }

        this.refresh();
    }

    onSection(row: CloneFieldRow, event: Event): void
    {
        row.section = (event.target as HTMLSelectElement).value as FormSection;
        row.sectionManual = true;
        this.refresh();
    }

    onDefault(row: CloneFieldRow, event: Event): void
    {
        row.defaultValue = (event.target as HTMLInputElement | HTMLSelectElement).value;
    }

    onRequired(row: CloneFieldRow, event: Event): void
    {
        row.required = (event.target as HTMLInputElement).checked;
    }

    onUnique(row: CloneFieldRow, event: Event): void
    {
        row.unique = (event.target as HTMLInputElement).checked;
    }

    //===========================================================
    // Page toolbar : Add Field
    //===========================================================
    onAddField(): void
    {
        if (this.locked) { return; }

        this.state.fields = [
            ...this.state.fields,
            {
                sourceName: '',
                action: 'Add',
                name: '',
                type: 'string',
                maxLength: 100,
                required: false,
                unique: false,
                control: 'Textbox',
                defaultValue: '',
                section: 'Information',
                sectionManual: false,
                srcType: '', srcMaxLength: null, srcRequired: false, srcUnique: false,
                srcControl: 'Textbox', srcDefault: ''
            }
        ];

        this.refresh();
    }

    onRemoveRow(index: number): void
    {
        if (this.locked) { return; }

        const row = this.state.fields[index];

        if (!row || row.sourceName) { return; }

        this.state.fields = this.state.fields.filter((_, i) => i !== index);
        this.refresh();
    }

    //===========================================================
    // Counters
    //===========================================================
    private count(a: FieldAction): number
    {
        return this.rows.filter(r => r.action === a).length;
    }

    get keepCount(): number { return this.count('Keep'); }
    get modifyCount(): number { return this.count('Modify'); }
    get addCount(): number { return this.count('Add'); }
    get excludeCount(): number { return this.count('Exclude'); }

    //===========================================================
    // Command center : Reset, Back, List
    //===========================================================
    onReset(): void
    {
        if (this.locked)
        {
            this.toast.info('Reset', 'This page is read-only. Use Edit on the last page to change it.');
            return;
        }

        if (!this.analysis)
        {
            this.toast.info('Reset', 'The source page is not loaded yet.');
            return;
        }

        try
        {
            this.buildFromSource();
            this.buildSetup();
            this.toast.success('Reset', 'Fields and setup were reloaded from the source page.');
        }
        catch (error)
        {
            console.error('[Clone Action] reset error', error);
            this.toast.error('Reset', 'Could not reload the source page.');
        }

        this.refresh();
    }

    onBack(): void
    {
        void this.router.navigate(
            ['/infrastructure-control', 'development-management', 'page-cloning', 'target']);
    }

    onBackToList(): void
    {
        void this.router.navigate(
            ['/infrastructure-control', 'development-management', 'page-cloning', 'list']);
    }

    //===========================================================
    // Canvas footer : Next
    //===========================================================
    private validate(): boolean
    {
        const included = this.rows.filter(r => r.action !== 'Exclude');
        const names = new Set<string>();
        const s = this.setup;

        if (included.length === 0)
        {
            this.toast.error('Fields', 'At least one field must be kept or added.');
            return false;
        }

        for (const r of included)
        {
            if (!(r.name ?? '').trim())
            {
                this.toast.error('Fields', 'Every added or modified field needs a name.');
                return false;
            }

            const key = r.name.trim().toLowerCase();

            if (names.has(key))
            {
                this.toast.error('Fields', `Duplicate field name '${r.name}'.`);
                return false;
            }

            names.add(key);

            if (!r.type)
            {
                this.toast.error('Fields', `Field '${r.name}' needs a type.`);
                return false;
            }

            const opts = this.defaultOptions(r);
            if (opts.length && r.defaultValue && !opts.includes(r.defaultValue))
            {
                this.toast.error('Fields', `Field '${r.name}' has an invalid default value.`);
                return false;
            }
        }

        if (s.parentMode === 'Change' && (!s.parentEntity || !s.parentFk))
        {
            this.toast.error('Parent', 'Choose the parent entity and its foreign key name.');
            return false;
        }

        if (s.codeEnabled && !/^[A-Z]{2,5}$/.test(s.codePrefix))
        {
            this.toast.error('Code number', 'The prefix must be 2 to 5 letters.');
            return false;
        }

        return true;
    }

    onNext(): void
    {
        if (this.loading) { return; }
        if (!this.validate()) { return; }

        void this.router.navigate(
            ['/infrastructure-control', 'development-management', 'page-cloning', 'preview']);
    }
}