//===============================================================
// Imports
//===============================================================
import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

//===============================================================
// Shared Components
//===============================================================
import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { ControlTabsComponent, ControlTab } from '../../../../../../shared/components/controls/control-tabs/control-tabs';
import { PageCanvasComponent } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { FormGridComponent } from '../../../../../../shared/components/layout/form-grid/form-grid';
import { FormSectionComponent } from '../../../../../../shared/components/layout/form-section/form-section';
import { TextboxComponent } from '../../../../../../shared/components/controls/textbox/textbox';
import { TextareaComponent } from '../../../../../../shared/components/controls/textarea/textarea';
import { DropdownComponent } from '../../../../../../shared/components/controls/dropdown/dropdown';
import { SearchDropdownComponent } from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

//===============================================================
// Models & Services
//===============================================================
import
{
    PageCloning,
    CreatePageCloning,
    UpdatePageCloning,
    PageCloningPreview,
    PageCloningFileChange,
    EntityAnalysis
}
from '../../../model/page-cloning.model';
import { PageCloningService } from '../../../services/page-cloning.service';

import { NavigationSubmenuService } from '../../../../navigation-management/services/submenu.service';
import { ModuleService } from '../../../../navigation-management/services/module.service';
import { NavigationMenuService } from '../../../../navigation-management/services/menu.service';

//===============================================================
// Blueprint (mirrors PageCloneBlueprint on the backend)
//===============================================================
export interface BlueprintField
{
    Name: string;
    Label: string;
    Type: string;
    MaxLength: number | null;
    Required: boolean;
    Unique: boolean;
    Control: string;
    ShowInList: boolean;
    Locked: boolean;
}

export interface BlueprintSegment
{
    Name: string;
    Pad: number;
}

export interface BlueprintChild
{
    Entity: string;
    NamePrefixes: string[];
}

export interface Blueprint
{
    EntityName: string;
    DisplayName: string;
    Parent: { Entity: string; CascadeFrom: string[] } | null;
    Code:
    {
        MethodName: string;
        Prefix: string;
        Segments: BlueprintSegment[];
        SequencePad: number;
        CountDeleted: boolean;
    };
    Fields: BlueprintField[];
    Children: BlueprintChild[];
    WriteCodeGeneratorMethod: boolean;
}

//===============================================================
// Component
//===============================================================
@Component(
{
    selector:'page-cloning-form',
    standalone:true,
    imports:
    [
        CommonModule, FormsModule,
        PageHeaderComponent, PageToolbarComponent, CommandCenterComponent,
        ControlTabsComponent, PageCanvasComponent, FormGridComponent,
        FormSectionComponent,
        TextboxComponent, TextareaComponent, DropdownComponent,
        SearchDropdownComponent,
        ToastComponent, ConfirmDialogComponent
    ],
    templateUrl:'./page-cloning-form.html',
    styleUrls:['./page-cloning-form.css']
})
export class PageCloningFormComponent implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly pageCloningService = inject(PageCloningService);
    private readonly moduleService = inject(ModuleService);
    private readonly menuService = inject(NavigationMenuService);
    private readonly submenuService = inject(NavigationSubmenuService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly toast = inject(ToastService);
    private readonly cdr = inject(ChangeDetectorRef);

    //===========================================================
    // Mode
    //===========================================================
    mode: 'add' | 'edit' | 'view' = 'add';
    entityId = 0;
    pageTitle = 'Page Cloning';
    entityName = 'Page Cloning';

    //===========================================================
    // Tabs
    //===========================================================
    selectedTab = 'general';

    get tabs(): ControlTab[]
    {
        return [ { id:'general', label:this.tabTitle } ];
    }

    get tabTitle(): string
    {
        switch (this.mode)
        {
            case 'add': return `Add ${this.entityName}`;
            case 'edit': return `Update ${this.entityName}`;
            case 'view': return `View ${this.entityName}`;
            default: return this.entityName;
        }
    }

    //===========================================================
    // Lookups
    //===========================================================
    submenuItems: any[] = [ { label:'Select Submenu', value:null } ];
    private submenus: { id:number; code:string; name:string }[] = [];

    controlItems: any[] =
    [
        { label:'Textbox', value:'textbox' },
        { label:'Textarea', value:'textarea' },
        { label:'Dropdown', value:'dropdown' },
        { label:'Search Dropdown', value:'searchdropdown' },
        { label:'Toggle', value:'toggle' }
    ];

    typeItems: any[] =
    [
        { label:'string', value:'string' },
        { label:'bool', value:'bool' },
        { label:'int', value:'int' },
        { label:'long', value:'long' },
        { label:'decimal', value:'decimal' },
        { label:'date', value:'date' }
    ];

    yesNoItems: any[] =
    [
        { label:'Yes', value:true },
        { label:'No', value:false }
    ];

    statusItems: any[] =
    [
        { label:'Active', value:true },
        { label:'Inactive', value:false }
    ];

    //===========================================================
    // Entity (the stored row)
    //===========================================================
    entity: PageCloning = this.emptyEntity();

    //===========================================================
    // Blueprint (edited as structured fields, stored as JSON)
    //===========================================================
    blueprint: Blueprint = this.emptyBlueprint();

    parentEntity = '';
    cascadeFromText = '';
    childrenText = '';          // e.g. "GeneralLedgers:INV,WIP,COGS"

    //===========================================================
    // Source Analysis
    //===========================================================
    sourceAnalysis: EntityAnalysis | null = null;
    analyzing = false;

    //===========================================================
    // Engine State
    //===========================================================
    preview: PageCloningPreview | null = null;
    selectedFile: PageCloningFileChange | null = null;
    diffOpened = false;
    engineBusy = false;
    engineMessages: string[] = [];

    //===========================================================
    // Form State
    //===========================================================
    private originalSnapshot = '';
    hasChanges = false;

    //===========================================================
    // Initialize
    //===========================================================
    ngOnInit(): void
    {
        this.loadSubmenus();
        this.initializeMode();
    }

    private emptyEntity(): PageCloning
    {
        return {
            PageCloningId:0,
            CloneFromId:0, CloneFromCode:'', CloneFromName:'',
            CloneToId:0, CloneToCode:'', CloneToName:'',
            EntityName:'', BlueprintJson:'',
            NumberOfFiles:15, RunStatus:'Draft', LastRunDate:null, BuildOutput:'',
            Remarks:'', IsActive:true
        };
    }

    private emptyBlueprint(): Blueprint
    {
        return {
            EntityName:'', DisplayName:'', Parent:null,
            Code:{ MethodName:'', Prefix:'', Segments:[], SequencePad:4, CountDeleted:true },
            Fields:[], Children:[], WriteCodeGeneratorMethod:true
        };
    }

    //===========================================================
    // Load Submenus (module -> menu -> submenu)
    //===========================================================
    private loadSubmenus(): void
    {
        this.submenus = [];

        const refresh = (): void =>
        {
            this.submenuItems =
            [
                { label:'Select Submenu', value:null },
                ...this.submenus.map(x =>
                    ({ label:`${x.code} - ${x.name}`, value:x.id }))
            ];

            this.cdr.detectChanges();
        };

        this.moduleService.getAll().subscribe(
        {
            next: (modules: any[]) =>
            {
                (modules ?? []).forEach((m: any) =>
                {
                    this.menuService.getByModule(Number(m.id)).subscribe(
                    {
                        next: (menus: any[]) =>
                        {
                            (menus ?? []).forEach((menu: any) =>
                            {
                                this.submenuService.getByMenu(Number(menu.id)).subscribe(
                                {
                                    next: (subs: any[]) =>
                                    {
                                        (subs ?? []).forEach((s: any) =>
                                        {
                                            const id = Number(s.id);

                                            if (!this.submenus.some(x => x.id === id))
                                            {
                                                this.submenus.push(
                                                {
                                                    id,
                                                    code: s.code ?? '',
                                                    name: s.name ?? ''
                                                });
                                            }
                                        });

                                        refresh();
                                    },
                                    error: (e: unknown) =>
                                        console.error('Load Submenus Error', e)
                                });
                            });
                        },
                        error: (e: unknown) =>
                            console.error('Load Menus Error', e)
                    });
                });
            },
            error: (error: unknown) =>
            {
                console.error('Load Modules Error', error);
                this.toast.error('Error', 'Failed to load submenus.');
            }
        });
    }

    //===========================================================
    // Initialize Mode
    //===========================================================
    private initializeMode(): void
    {
        const url = this.router.url.toLowerCase();

        if (url.includes('/view/')) { this.mode = 'view'; }
        else if (url.includes('/edit/')) { this.mode = 'edit'; }
        else { this.mode = 'add'; }

        const id = this.resolveEntityId();

        if (id > 0)
        {
            this.entityId = id;
            this.loadEntity();
            return;
        }

        this.initializeEntity();
    }

    private resolveEntityId(): number
    {
        let current: ActivatedRoute | null = this.route;

        while (current)
        {
            const id = Number(current.snapshot.paramMap.get('id'));
            if (id > 0) { return id; }
            current = current.parent;
        }

        return 0;
    }

    private initializeEntity(): void
    {
        this.entity = this.emptyEntity();
        this.blueprint = this.emptyBlueprint();
        this.parentEntity = '';
        this.cascadeFromText = '';
        this.childrenText = '';
        this.preview = null;
        this.sourceAnalysis = null;
        this.engineMessages = [];
        this.setInitialFormState();
    }

    //===========================================================
    // Source / Target Change
    //===========================================================
    onSourceChange(): void
    {
        if (this.isViewMode) { return; }

        const s = this.submenus.find(x => x.id === Number(this.entity.CloneFromId));
        this.entity.CloneFromCode = s?.code ?? '';
        this.entity.CloneFromName = s?.name ?? '';

        this.sourceAnalysis = null;

        if (s)
        {
            this.analyzing = true;

            this.pageCloningService.analyze(s.name).subscribe(
            {
                next: (a: EntityAnalysis) =>
                {
                    this.sourceAnalysis = a;
                    this.analyzing = false;

                    // Pre-fill the field grid from the real source (business fields only)
                    this.blueprint.Fields = a.Fields
                        .filter(f => f.Category === 'Business & Functional' && f.Name !== 'Remarks')
                        .map(f => ({
                            Name: f.Name,
                            Label: f.Name.replace(/([a-z])([A-Z])/g, '$1 $2'),
                            Type: f.CsType.toLowerCase().replace('?', ''),
                            MaxLength: f.MaxLength,
                            Required: f.Required,
                            Unique: f.Unique,
                            Control: 'textbox',
                            ShowInList: true,
                            Locked: false
                        }));

                    this.onValueChange();
                    this.cdr.detectChanges();
                },
                error: () =>
                {
                    this.analyzing = false;
                    this.toast.error('Analysis', 'Could not analyze the source page.');
                    this.cdr.detectChanges();
                }
            });
        }

        this.onValueChange();
    }

    onTargetChange(): void
    {
        if (this.isViewMode) { return; }

        const t = this.submenus.find(x => x.id === Number(this.entity.CloneToId));
        this.entity.CloneToCode = t?.code ?? '';
        this.entity.CloneToName = t?.name ?? '';

        // Pre-fill the blueprint identity from the target once
        if (t && !this.blueprint.EntityName)
        {
            const entityName = t.name.replace(/[^A-Za-z0-9]/g, '');
            this.blueprint.EntityName = entityName;
            this.blueprint.DisplayName = t.name;
            this.entity.EntityName = entityName;
            this.blueprint.Code.MethodName = `Generate${entityName}Code`;
        }

        this.onValueChange();
    }

    onEntityNameChange(): void
    {
        this.entity.EntityName = this.blueprint.EntityName;

        if (!this.blueprint.Code.MethodName ||
            this.blueprint.Code.MethodName.startsWith('Generate'))
        {
            this.blueprint.Code.MethodName =
                `Generate${this.blueprint.EntityName}Code`;
        }

        this.onValueChange();
    }

    //===========================================================
    // Fields Grid
    //===========================================================
    addField(): void
    {
        if (this.isViewMode) { return; }

        this.blueprint.Fields.push(
        {
            Name:'', Label:'', Type:'string', MaxLength:200,
            Required:false, Unique:false, Control:'textbox',
            ShowInList:true, Locked:false
        });

        this.onValueChange();
    }

    removeField(index: number): void
    {
        if (this.isViewMode) { return; }
        this.blueprint.Fields.splice(index, 1);
        this.onValueChange();
    }

    //===========================================================
    // Code Segments
    //===========================================================
    addSegment(): void
    {
        if (this.isViewMode) { return; }
        this.blueprint.Code.Segments.push({ Name:'', Pad:3 });
        this.onValueChange();
    }

    removeSegment(index: number): void
    {
        if (this.isViewMode) { return; }
        this.blueprint.Code.Segments.splice(index, 1);
        this.onValueChange();
    }

    // Live example such as PRD-001-001-001-0001
    get codePreview(): string
    {
        const c = this.blueprint.Code;
        if (!c.Prefix) { return ''; }

        const parts = [ c.Prefix.toUpperCase() ];
        c.Segments.forEach(s => parts.push('1'.padStart(Number(s.Pad) || 3, '0')));
        parts.push('1'.padStart(Number(c.SequencePad) || 4, '0'));
        return parts.join('-');
    }

    //===========================================================
    // Blueprint <-> JSON
    //===========================================================
    private buildBlueprintJson(): string
    {
        const parent = this.parentEntity.trim();

        this.blueprint.Parent = parent
            ? {
                Entity: parent,
                CascadeFrom: this.cascadeFromText
                    .split(',').map(x => x.trim()).filter(x => x)
              }
            : null;

        // "GeneralLedgers:INV,WIP,COGS;Other:A,B"
        this.blueprint.Children = this.childrenText
            .split(';').map(x => x.trim()).filter(x => x)
            .map(x =>
            {
                const [entity, prefixes] = x.split(':');
                return {
                    Entity: (entity ?? '').trim(),
                    NamePrefixes: (prefixes ?? '')
                        .split(',').map(p => p.trim()).filter(p => p)
                };
            });

        this.blueprint.Code.SequencePad =
            Number(this.blueprint.Code.SequencePad) || 4;

        this.blueprint.Code.Segments.forEach(s =>
            s.Pad = Number(s.Pad) || 3);

        this.blueprint.Fields.forEach(f =>
            f.MaxLength = f.MaxLength === null || f.MaxLength === undefined || (f.MaxLength as any) === ''
                ? null
                : Number(f.MaxLength));

        return JSON.stringify(this.blueprint);
    }

    private applyBlueprintJson(json: string): void
    {
        this.blueprint = this.emptyBlueprint();
        this.parentEntity = '';
        this.cascadeFromText = '';
        this.childrenText = '';

        if (!json?.trim()) { return; }

        try
        {
            const b = JSON.parse(json) as Blueprint;

            this.blueprint = { ...this.emptyBlueprint(), ...b,
                Code: { ...this.emptyBlueprint().Code, ...(b.Code ?? {}) },
                Fields: b.Fields ?? [],
                Children: b.Children ?? [] };

            this.parentEntity = b.Parent?.Entity ?? '';
            this.cascadeFromText = (b.Parent?.CascadeFrom ?? []).join(', ');
            this.childrenText = (b.Children ?? [])
                .map(c => `${c.Entity}:${(c.NamePrefixes ?? []).join(',')}`)
                .join(';');
        }
        catch
        {
            this.toast.error('Error', 'Stored blueprint is not valid JSON.');
        }
    }

    //===========================================================
    // Load Entity
    //===========================================================
    private loadEntity(): void
    {
        this.pageCloningService.getById(this.entityId).subscribe(
        {
            next: (r: any) =>
            {
                this.entity =
                {
                    PageCloningId: Number(r?.PageCloningId ?? r?.pageCloningId ?? 0),
                    CloneFromId: Number(r?.CloneFromId ?? r?.cloneFromId ?? 0),
                    CloneFromCode: r?.CloneFromCode ?? r?.cloneFromCode ?? '',
                    CloneFromName: r?.CloneFromName ?? r?.cloneFromName ?? '',
                    CloneToId: Number(r?.CloneToId ?? r?.cloneToId ?? 0),
                    CloneToCode: r?.CloneToCode ?? r?.cloneToCode ?? '',
                    CloneToName: r?.CloneToName ?? r?.cloneToName ?? '',
                    EntityName: r?.EntityName ?? r?.entityName ?? '',
                    BlueprintJson: r?.BlueprintJson ?? r?.blueprintJson ?? '',
                    NumberOfFiles: Number(r?.NumberOfFiles ?? r?.numberOfFiles ?? 15),
                    RunStatus: r?.RunStatus ?? r?.runStatus ?? 'Draft',
                    LastRunDate: r?.LastRunDate ?? r?.lastRunDate ?? null,
                    BuildOutput: r?.BuildOutput ?? r?.buildOutput ?? '',
                    Remarks: r?.Remarks ?? r?.remarks ?? '',
                    IsActive: Boolean(r?.IsActive ?? r?.isActive ?? true)
                };

                this.applyBlueprintJson(this.entity.BlueprintJson);
                this.setInitialFormState();
            },
            error: (error: unknown) =>
            {
                console.error('Load Page Cloning Error', error);
                this.toast.error('Error', 'Failed to load Page Cloning.');
                this.onBackToList();
            }
        });
    }

    //===========================================================
    // Change Tracking
    //===========================================================
    private snapshot(): string
    {
        return JSON.stringify(
        {
            e: this.entity, b: this.blueprint,
            p: this.parentEntity, c: this.cascadeFromText, k: this.childrenText
        });
    }

    private setInitialFormState(): void
    {
        this.originalSnapshot = this.snapshot();
        this.hasChanges = false;
        this.cdr.detectChanges();
    }

    checkForChanges(): void
    {
        this.hasChanges = this.snapshot() !== this.originalSnapshot;
    }

    onValueChange(): void
    {
        if (this.isViewMode) { return; }
        this.checkForChanges();
        this.cdr.detectChanges();
    }

    onTabChange(tabId: string): void
    {
        this.selectedTab = tabId;
    }

    //===========================================================
    // Validation
    //===========================================================
    private validate(): boolean
    {
        const fail = (m: string): boolean =>
        {
            this.toast.error('Validation', m);
            return false;
        };

        if (!this.entity.CloneFromId) { return fail('Clone From is required.'); }
        if (!this.entity.CloneToId) { return fail('Clone To is required.'); }

        if (this.entity.CloneFromId === this.entity.CloneToId)
        {
            return fail('Clone From and Clone To cannot be the same page.');
        }

        if (!this.blueprint.EntityName.trim()) { return fail('Entity Name is required.'); }

        const names = new Set<string>();

        for (const f of this.blueprint.Fields)
        {
            if (!f.Name.trim()) { return fail('Every field needs a name.'); }

            const key = f.Name.trim().toLowerCase();
            if (names.has(key)) { return fail(`Duplicate field '${f.Name}'.`); }
            names.add(key);
        }

        if (this.blueprint.Code.Prefix && this.blueprint.Code.Segments.some(s => !s.Name.trim()))
        {
            return fail('Every code segment needs a name.');
        }

        return true;
    }

    //===========================================================
    // Save
    //===========================================================
    onSave(): void
    {
        if (this.isViewMode) { return; }
        if (!this.validate()) { return; }

        this.entity.EntityName = this.blueprint.EntityName.trim();
        this.entity.BlueprintJson = this.buildBlueprintJson();

        if (this.mode === 'add') { this.saveCreate(); }
        else { this.saveUpdate(); }
    }

    private saveCreate(): void
    {
        const model: CreatePageCloning =
        {
            CloneFromId: this.entity.CloneFromId,
            CloneFromCode: this.entity.CloneFromCode,
            CloneFromName: this.entity.CloneFromName,
            CloneToId: this.entity.CloneToId,
            CloneToCode: this.entity.CloneToCode,
            CloneToName: this.entity.CloneToName,
            EntityName: this.entity.EntityName,
            BlueprintJson: this.entity.BlueprintJson,
            Remarks: this.entity.Remarks?.trim() ?? '',
            IsActive: this.entity.IsActive
        };

        this.pageCloningService.create(model).subscribe(
        {
            next: () =>
            {
                this.setInitialFormState();
                this.toast.success('Success', 'Page Cloning created successfully.');
                this.onBackToList();
            },
            error: (error: any) => this.showError(error, 'Failed to create Page Cloning.')
        });
    }

    private saveUpdate(): void
    {
        const model: UpdatePageCloning =
        {
            PageCloningId: this.entity.PageCloningId,
            CloneFromId: this.entity.CloneFromId,
            CloneFromCode: this.entity.CloneFromCode,
            CloneFromName: this.entity.CloneFromName,
            CloneToId: this.entity.CloneToId,
            CloneToCode: this.entity.CloneToCode,
            CloneToName: this.entity.CloneToName,
            EntityName: this.entity.EntityName,
            BlueprintJson: this.entity.BlueprintJson,
            Remarks: this.entity.Remarks?.trim() ?? '',
            IsActive: this.entity.IsActive
        };

        this.pageCloningService.update(model).subscribe(
        {
            next: () =>
            {
                this.setInitialFormState();
                this.toast.success('Success', 'Page Cloning updated successfully.');
                this.onBackToList();
            },
            error: (error: any) => this.showError(error, 'Failed to update Page Cloning.')
        });
    }

    private showError(error: any, fallback: string): void
    {
        console.error(fallback, error);

        const message =
            typeof error?.error === 'string' && error.error.trim()
                ? error.error
                : fallback;

        this.toast.error('Validation', message);
    }

    //===========================================================
    // Engine: Preview (writes nothing)
    //===========================================================
    onPreview(): void
    {
        if (this.entityId <= 0 || this.engineBusy) { return; }

        if (this.hasChanges)
        {
            this.toast.info('Save First', 'Save the blueprint before previewing.');
            return;
        }

        this.engineBusy = true;
        this.engineMessages = [];

        this.pageCloningService.preview(this.entityId).subscribe(
        {
            next: (p: PageCloningPreview) =>
            {
                this.preview = p;
                this.selectedFile = p.Files[0] ?? null;
                this.diffOpened = true;
                this.engineMessages = p.Warnings;
                this.engineBusy = false;
                this.cdr.detectChanges();
            },
            error: (error: any) =>
            {
                this.engineBusy = false;
                this.showError(error, 'Failed to preview clone.');
            }
        });
    }

    selectFile(file: PageCloningFileChange): void
    {
        this.selectedFile = file;
    }

    // Apply stays disabled until the diff has been opened (agreed safety net)
    get canApply(): boolean
    {
        return !this.isAddMode && !this.engineBusy && this.diffOpened && !!this.preview;
    }

    get hasEditedFiles(): boolean
    {
        return !!this.preview?.Files.some(
            (f: PageCloningFileChange) => f.EditedSinceBaseline);
    }

    //===========================================================
    // Engine: Apply
    //===========================================================
    onApply(): void
    {
        if (!this.canApply) { return; }

        const run = (overwrite: boolean): void =>
        {
            this.engineBusy = true;

            this.pageCloningService.apply(this.entityId, overwrite).subscribe(
            {
                next: r =>
                {
                    this.engineBusy = false;
                    this.entity.RunStatus = r.RunStatus || this.entity.RunStatus;
                    this.entity.BuildOutput = r.BuildOutput;
                    this.engineMessages = r.Messages;

                    r.Success
                        ? this.toast.success('Clone Applied', 'All files were written.')
                        : this.toast.error('Clone', r.Messages[0] ?? 'Clone was not applied.');

                    this.cdr.detectChanges();
                },
                error: (error: any) =>
                {
                    this.engineBusy = false;
                    this.showError(error, 'Failed to apply clone.');
                }
            });
        };

        if (this.hasEditedFiles)
        {
            this.confirmDialog.open(
                'Overwrite Edited Files',
                'Some files were edited by hand after the baseline. Applying will overwrite them. Continue?',
                () => run(true),
                'Overwrite', 'Cancel', 'primary');
            return;
        }

        this.confirmDialog.open(
            'Apply Clone',
            'This writes the generated code into the 15 target files. Continue?',
            () => run(false),
            'Apply', 'Cancel', 'primary');
    }

    //===========================================================
    // Engine: Restore Code To Baseline
    //===========================================================
    onRestoreBaseline(): void
    {
        if (this.isAddMode || this.engineBusy) { return; }

        this.confirmDialog.open(
            'Restore To Baseline',
            'The 15 target files will be overwritten with the code sync baseline. The database is not changed. Continue?',
            () =>
            {
                this.engineBusy = true;

                this.pageCloningService.restoreBaseline(this.entityId).subscribe(
                {
                    next: r =>
                    {
                        this.engineBusy = false;
                        this.entity.RunStatus = r.RunStatus || this.entity.RunStatus;
                        this.engineMessages = r.Messages;
                        this.preview = null;
                        this.diffOpened = false;

                        r.Success
                            ? this.toast.success('Restored', 'Code restored to baseline.')
                            : this.toast.error('Restore', r.Messages[0] ?? 'Restore failed.');

                        this.cdr.detectChanges();
                    },
                    error: (error: any) =>
                    {
                        this.engineBusy = false;
                        this.showError(error, 'Failed to restore baseline.');
                    }
                });
            },
            'Restore', 'Cancel', 'primary');
    }

    //===========================================================
    // Clear / Back / Refresh
    //===========================================================
    onClear(): void
    {
        if (this.mode === 'edit') { this.loadEntity(); return; }
        this.initializeEntity();
    }

    onBackToList(): void
    {
        const go = (): void =>
        {
            void this.router.navigate(
            [
                '/infrastructure-control',
                'development-management',
                'page-cloning',
                'list'
            ]);
        };

        if (!this.hasChanges) { go(); return; }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            go, 'Leave', 'Stay', 'primary');
    }

    refresh(): void
    {
        if (this.mode === 'edit' || this.mode === 'view') { this.loadEntity(); return; }
        this.initializeEntity();
    }

    close(): void { this.onBackToList(); }

    //===========================================================
    // Getters
    //===========================================================
    get saveButtonText(): string { return this.mode === 'edit' ? 'Update' : 'Save'; }
    get isViewMode(): boolean { return this.mode === 'view'; }
    get isEditMode(): boolean { return this.mode === 'edit'; }
    get isAddMode(): boolean { return this.mode === 'add'; }

    get missingFileCount(): number
    {
        return this.sourceAnalysis?.Files.filter(f => !f.Exists).length ?? 0;
    }
}