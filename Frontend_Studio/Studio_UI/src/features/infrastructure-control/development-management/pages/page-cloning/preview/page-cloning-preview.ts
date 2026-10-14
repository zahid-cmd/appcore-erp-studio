import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { ControlTabsComponent, ControlTab } from '../../../../../../shared/components/controls/control-tabs/control-tabs';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { StepsCounterComponent } from '../../../../../../shared/components/controls/steps-counter/steps-counter';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    PageCloningWorkflowService,
    CloneWorkflowState,
    CloneFieldRow,
    CloneSetup,
    FieldAction,
    CLONE_FILE_KINDS
}
from '../../../services/page-cloning-workflow.service';

import
{
    PageCloningPlanService,
    PlanPreviewResult,
    PlanActionResult
}
from '../../../services/page-cloning-plan.service';

type Tone = 'wait' | 'ok' | 'warn';

interface PreviewFileRow
{
    group: string;
    label: string;
    fileName: string;
    status: string;
    tone: Tone;
    before: string;
    after: string;
}

@Component(
{
    selector:'page-cloning-preview',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent, PageToolbarComponent, CommandCenterComponent,
        ControlTabsComponent, PageCanvasComponent, StepsCounterComponent,
        ToastComponent, ConfirmDialogComponent
    ],
    templateUrl:'./page-cloning-preview.html',
    styleUrls:['./page-cloning-preview.css']
})
export class PageCloningPreviewComponent implements OnInit, OnDestroy
{
    private readonly router = inject(Router);
    private readonly workflow = inject(PageCloningWorkflowService);
    private readonly api = inject(PageCloningPlanService);
    private readonly toast = inject(ToastService);
    private readonly confirmDialog = inject(ConfirmDialogService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly zone = inject(NgZone);

    selectedTab = 'preview';

    // The tab shows only the name (the step lives in the page header center)
    tabs: ControlTab[] =
    [
        { id:'preview', label:'Clone Preview' }
    ];

    readonly canvasConfig = {
        showFooter: true,
        reserveFooterSpace: true,
        footerHeight: 56
    } as PageCanvasConfig;

    // After the first Save (or when a saved clone is opened) the same record is updated
    isEdit = false;
    saved = false;
    savedId = 0;

    previewing = false;
    saving = false;
    restoring = false;

    files: PreviewFileRow[] = [];
    selectedFile: PreviewFileRow | null = null;
    warnings: string[] = [];

    private destroyed = false;

    get state(): CloneWorkflowState { return this.workflow.state; }
    get rows(): CloneFieldRow[] { return this.state.fields ?? []; }
    get setup(): CloneSetup { return this.state.setup; }

    // View mode: the top button becomes Edit and nothing can be written
    get readOnly(): boolean { return this.workflow.state.mode === 'view'; }

    get pageTitle(): string { return this.workflow.pageTitle; }

    //===========================================================
    // CHANGE DETECTION LOCK
    // Never call cdr directly. Every async callback must end with refresh().
    //===========================================================
    private refresh(): void
    {
        if (this.destroyed) { return; }

        this.zone.run(() =>
        {
            try
            {
                this.cdr.markForCheck();
                this.cdr.detectChanges();
            }
            catch (error)
            {
                console.error('[Clone Preview] render error', error);
            }
        });
    }

    //===========================================================
    // Load
    //===========================================================
    ngOnInit(): void
    {
        // Steps 1 to 3 must be done first
        if (!this.state.cloneFromId || !this.state.cloneToId
            || !this.state.entityName || !this.rows.length)
        {
            this.toast.info('Clone', 'Please complete the previous steps first.');
            void this.router.navigate(
                ['/infrastructure-control', 'development-management', 'page-cloning', 'source']);
            return;
        }

        // A clone opened from the list already exists: the button is Update, Restore works
        if (this.state.mode !== 'add')
        {
            this.isEdit = true;
            this.saved = true;
            this.savedId = this.state.pageCloningId;
        }

        this.files = this.buildFileRows();
        this.loadPreview();
    }

    ngOnDestroy(): void
    {
        this.destroyed = true;
    }

    //===========================================================
    // The plan sent to the backend (same shape as preview-plan)
    //===========================================================
    private buildPlan(): unknown
    {
        const s: any = this.state;

        return {
            cloneFromId: s.cloneFromId,
            cloneFromCode: s.cloneFromCode ?? '',
            cloneFromName: s.cloneFromName,
            cloneToId: s.cloneToId,
            cloneToCode: s.cloneToCode ?? '',
            cloneToName: s.cloneToName,
            entityName: s.entityName,
            displayName: s.displayName,
            fields: this.rows.map(r => ({ ...r })),
            setup: { ...this.setup }
        };
    }

    private errorText(error: unknown, fallback: string): string
    {
        if (error instanceof HttpErrorResponse
            && typeof error.error === 'string'
            && error.error.trim())
        {
            return error.error;
        }

        return fallback;
    }

    private baseName(path: string): string
    {
        return (path.split(/[\\/]/).pop() ?? path).toLowerCase();
    }

    //===========================================================
    // The 15 files the target page will have
    //===========================================================
    private kebab(name: string): string
    {
        return (name.match(/[A-Z][a-z0-9]*|[0-9]+/g) ?? [name])
            .join('-')
            .toLowerCase();
    }

    private buildFileRows(): PreviewFileRow[]
    {
        const e = this.state.entityName.trim();
        const k = this.kebab(e);

        return CLONE_FILE_KINDS.map(f =>
        ({
            group: f.group,
            label: f.label,
            fileName: f.pattern.replace('{E}', e).replace('{K}', k),
            status: 'Pending',
            tone: 'wait' as Tone,
            before: '',
            after: ''
        }));
    }

    get backendFiles(): PreviewFileRow[]
    {
        return this.files.filter(f => f.group === 'Backend');
    }

    get frontendFiles(): PreviewFileRow[]
    {
        return this.files.filter(f => f.group === 'Frontend');
    }

    selectFile(file: PreviewFileRow): void
    {
        this.selectedFile = file;
        this.refresh();
    }

    //===========================================================
    // Preview: the real Before / After from the backend
    //===========================================================
    private loadPreview(): void
    {
        this.previewing = true;
        this.refresh();

        this.api.previewPlan(this.buildPlan()).subscribe(
        {
            next: (res: PlanPreviewResult): void =>
            {
                this.applyPreview(res);
                this.previewing = false;
                this.refresh();
            },

            error: (error: unknown): void =>
            {
                console.error('[Clone Preview] preview error', error);

                this.previewing = false;
                this.toast.error('Preview', this.errorText(error, 'Failed to build the preview.'));
                this.refresh();
            }
        });
    }

    private applyPreview(res: PlanPreviewResult): void
    {
        const incoming = res.files ?? [];
        this.warnings = res.warnings ?? [];

        for (const row of this.files)
        {
            const hit = incoming.find(f => this.baseName(f.path) === row.fileName.toLowerCase());

            if (!hit) { continue; }

            row.before = hit.before ?? '';
            row.after = hit.after ?? '';

            if (hit.editedSinceBaseline)
            {
                row.status = 'Edited by hand';
                row.tone = 'warn';
            }
            else if (row.before === row.after)
            {
                row.status = 'No change';
                row.tone = 'ok';
            }
            else
            {
                row.status = 'Will change';
                row.tone = 'wait';
            }
        }

        // CodeGenerator.cs is the extra file the clone touches
        const cg = incoming.find(f => f.logicalKey === 'backend.codegenerator');

        if (cg && !this.files.some(f => f.fileName === 'CodeGenerator.cs'))
        {
            this.files.push(
            {
                group: 'Backend',
                label: 'Code Generator',
                fileName: 'CodeGenerator.cs',
                status: cg.before === cg.after ? 'No change' : 'Will change',
                tone: cg.before === cg.after ? 'ok' : 'wait',
                before: cg.before ?? '',
                after: cg.after ?? ''
            });
        }

        if (!this.selectedFile && this.files.length)
        {
            this.selectedFile = this.files[0];
        }
    }

    //===========================================================
    // Plan summary (read-only, from Clone Action)
    //===========================================================
    private count(a: FieldAction): number
    {
        return this.rows.filter(r => r.action === a).length;
    }

    get keepCount(): number { return this.count('Keep'); }
    get modifyCount(): number { return this.count('Modify'); }
    get addCount(): number { return this.count('Add'); }
    get excludeCount(): number { return this.count('Exclude'); }

    // Only the rows that differ from the source
    get changedRows(): CloneFieldRow[]
    {
        return this.rows.filter(r => r.action !== 'Keep');
    }

    get parentText(): string
    {
        const s = this.setup;
        if (!s || s.parentMode === 'Exclude' || !s.parentEntity) { return 'No parent'; }

        return `${s.parentEntity} (${s.parentFk})`;
    }

    get cascadeText(): string
    {
        const s = this.setup;
        if (!s || !s.parentEntity) { return ''; }

        return [...(s.cascade ?? []), s.parentEntity, this.state.entityName].join(' > ');
    }

    get codeExample(): string
    {
        const s = this.setup;
        if (!s || !s.codeEnabled || !s.codePrefix) { return 'No code number'; }

        return [
            s.codePrefix,
            ...(s.codeSegments ?? []).map(x => '1'.padStart(x.pad, '0')),
            '1'.padStart(s.codeSequencePad, '0')
        ].join('-');
    }

    //===========================================================
    // Command center : Save / Update / Edit, Restore, Back, List
    //===========================================================
    onSave(): void
    {
        // View mode: this button is "Edit". It unlocks Clone Action and goes there.
        if (this.readOnly)
        {
            this.state.mode = 'edit';

            this.toast.info('Edit', 'Edit mode is on. Change the fields on Clone Action, then click Update.');

            void this.router.navigate(
                ['/infrastructure-control', 'development-management', 'page-cloning', 'action']);
            return;
        }

        if (this.saving || this.restoring || this.previewing) { return; }

        this.doSave(false);
    }

    private doSave(overwriteEdited: boolean): void
    {
        this.saving = true;
        this.refresh();

        this.api.savePlan(this.buildPlan(), overwriteEdited).subscribe(
        {
            next: (res: PlanActionResult): void =>
            {
                this.saving = false;

                if (res.success)
                {
                    this.saved = true;
                    this.isEdit = true;
                    this.savedId = res.pageCloningId;
                    this.state.pageCloningId = res.pageCloningId;

                    for (const f of this.files)
                    {
                        f.status = 'Written';
                        f.tone = 'ok';
                    }

                    this.toast.success('Saved', 'The files were written and the clone was recorded.');
                    this.refresh();

                    // Done: clear the wizard and return to the list
                    setTimeout((): void =>
                    {
                        this.workflow.reset();

                        void this.router.navigate(
                            ['/infrastructure-control', 'development-management', 'page-cloning', 'list']);
                    }, 900);

                    return;
                }

                const messages = res.messages ?? [];
                const editedMessage = messages.find(m => m.includes('edited by hand'));

                if (editedMessage && !overwriteEdited)
                {
                    this.refresh();

                    this.confirmDialog.open(
                        'Overwrite edited files',
                        editedMessage + ' Do you want to overwrite them?',
                        (): void => { this.doSave(true); },
                        'Overwrite',
                        'Cancel',
                        'primary');

                    return;
                }

                this.toast.error('Save', messages[0] ?? 'Save failed.');
                this.refresh();
            },

            error: (error: unknown): void =>
            {
                console.error('[Clone Preview] save error', error);

                this.saving = false;
                this.toast.error('Save', this.errorText(error, 'Save failed.'));
                this.refresh();
            }
        });
    }

    onRestore(): void
    {
        if (this.readOnly)
        {
            this.toast.info('Restore', 'Click Edit first to restore this clone.');
            return;
        }

        if (this.saving || this.restoring || this.previewing) { return; }

        if (!this.saved || !this.savedId)
        {
            this.toast.info('Restore', 'Nothing has been saved yet, so there is nothing to restore.');
            return;
        }

        this.confirmDialog.open(
            'Restore to baseline',
            'The generated files will be replaced by the baseline files. Do you want to continue?',
            (): void => { this.doRestore(); },
            'Restore',
            'Cancel',
            'primary');
    }

    private doRestore(): void
    {
        this.restoring = true;
        this.refresh();

        this.api.restore(this.savedId).subscribe(
        {
            next: (res: PlanActionResult): void =>
            {
                this.restoring = false;

                if (res.success)
                {
                    for (const f of this.files)
                    {
                        f.status = 'Restored';
                        f.tone = 'ok';
                    }

                    this.toast.success('Restored', 'The files are back at the baseline.');
                }
                else
                {
                    this.toast.error('Restore', (res.messages ?? [])[0] ?? 'Restore failed.');
                }

                this.refresh();
            },

            error: (error: unknown): void =>
            {
                console.error('[Clone Preview] restore error', error);

                this.restoring = false;
                this.toast.error('Restore', this.errorText(error, 'Restore failed.'));
                this.refresh();
            }
        });
    }

    onBack(): void
    {
        void this.router.navigate(
            ['/infrastructure-control', 'development-management', 'page-cloning', 'action']);
    }

    onBackToList(): void
    {
        void this.router.navigate(
            ['/infrastructure-control', 'development-management', 'page-cloning', 'list']);
    }
}