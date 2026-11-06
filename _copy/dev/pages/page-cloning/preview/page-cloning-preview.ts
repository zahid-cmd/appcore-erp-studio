import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, finalize, map, of, switchMap, tap, timer } from 'rxjs';

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
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { ProgressDialogService } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

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

// How long the progress dialog stays open after a successful Save / Update / Restore
const PROGRESS_MS = 5000;

// Remembers a finished Save / Update / Restore across a page reload.
// Saving writes files into the Angular project, so "ng serve" may reload the
// browser while the progress dialog is still open. The wizard lives in memory
// and is empty after a reload; this note tells the page the work was done.
const FINISHED_KEY = 'pageCloning.finished';

@Component(
{
    selector:'page-cloning-preview',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent, PageToolbarComponent, CommandCenterComponent,
        ControlTabsComponent, PageCanvasComponent, StepsCounterComponent,
        ToastComponent, ConfirmDialogComponent, ProgressDialogComponent
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
    private readonly progressDialog = inject(ProgressDialogService);
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
    // "Finished" note (survives a page reload)
    //===========================================================
    private markFinished(title: string, message: string): void
    {
        try { sessionStorage.setItem(FINISHED_KEY, JSON.stringify({ title, message })); }
        catch { /* storage not available: nothing to remember */ }
    }

    private clearFinished(): void
    {
        try { sessionStorage.removeItem(FINISHED_KEY); }
        catch { /* ignore */ }
    }

    private takeFinished(): { title: string; message: string } | null
    {
        try
        {
            const raw = sessionStorage.getItem(FINISHED_KEY);

            if (!raw) { return null; }

            sessionStorage.removeItem(FINISHED_KEY);

            const note = JSON.parse(raw);

            return note && note.title
                ? { title: String(note.title), message: String(note.message ?? '') }
                : null;
        }
        catch
        {
            return null;
        }
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
            // The page was reloaded after a successful Save / Update / Restore
            // (ng serve reloads the browser when the generated files are written):
            // the work is done, so report it and go to the list.
            const finished = this.takeFinished();

            if (finished)
            {
                this.toast.success(finished.title, finished.message);

                void this.router.navigate(
                    ['/infrastructure-control', 'development-management', 'page-cloning', 'list']);
                return;
            }

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
        this.progressDialog.close();
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
    //
    // Same rule as the backend (Names.Words): a run of capitals
    // stays one word, so MFSAccounts -> mfs-accounts.
    //===========================================================
    private kebab(name: string): string
    {
        return (name.match(/[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[0-9]+/g) ?? [name])
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
    // Progress dialog around a backend call
    //
    // The dialog opens at once and the real request runs behind it.
    //   - success:  the "finished" note is saved at once (a reload
    //               during the wait cannot lose the result), and the
    //               dialog stays open until PROGRESS_MS have passed
    //   - failure / "not success" answer: no waiting, the caller
    //               closes the dialog and reports it
    // While waiting the bar moves up to 95%, then jumps to 100%.
    //===========================================================
    private withProgress<T extends { success: boolean }>(
        title: string, message: string, call: Observable<T>,
        doneTitle: string, doneMessage: string): Observable<T>
    {
        const started = Date.now();

        this.progressDialog.show(title, message);

        const tick = window.setInterval((): void =>
        {
            const pct = Math.min(95, ((Date.now() - started) / PROGRESS_MS) * 100);
            this.progressDialog.update(pct);
        }, 100);

        return call.pipe(
            tap((res: T): void =>
            {
                if (res.success) { this.markFinished(doneTitle, doneMessage); }
            }),
            switchMap((res: T): Observable<T> =>
            {
                if (!res.success) { return of(res); }

                const wait = Math.max(0, PROGRESS_MS - (Date.now() - started));

                return timer(wait).pipe(map((): T => res));
            }),
            finalize((): void => { window.clearInterval(tick); })
        );
    }

    // Go to the list first, then clear the wizard (so this page never
    // re-starts with an empty wizard and bounces back to Step 1)
    private finishToList(): void
    {
        void this.router.navigate(
            ['/infrastructure-control', 'development-management', 'page-cloning', 'list'])
            .then((): void =>
            {
                this.clearFinished();
                this.workflow.reset();
            });
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

        const verb = this.isEdit ? 'Update' : 'Save';

        this.confirmDialog.open(
            `${verb} clone`,
            this.isEdit
                ? 'The 15 files will be rewritten and the clone record will be updated. Do you want to continue?'
                : 'The 15 files will be written and the clone will be recorded. Do you want to continue?',
            (): void => { this.doSave(false); },
            verb,
            'Cancel',
            'primary');
    }

    private doSave(overwriteEdited: boolean): void
    {
        const verb = this.isEdit ? 'Updating' : 'Saving';

        this.saving = true;
        this.refresh();

        this.withProgress(
            verb + ' clone',
            'Writing the 15 files. Please wait...',
            this.api.savePlan(this.buildPlan(), overwriteEdited),
            this.isEdit ? 'Updated' : 'Saved',
            'The files were written and the clone was recorded.'
        ).subscribe(
        {
            next: (res: PlanActionResult): void =>
            {
                this.saving = false;
                this.progressDialog.update(100);
                this.progressDialog.close();

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

                    // Done: return to the list and clear the wizard
                    setTimeout((): void => { this.finishToList(); }, 900);

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
                this.progressDialog.close();
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

        this.withProgress(
            'Restoring clone',
            'Putting the files back to the baseline. Please wait...',
            this.api.restore(this.savedId),
            'Restored',
            'The files are back at the baseline.'
        ).subscribe(
        {
            next: (res: PlanActionResult): void =>
            {
                this.restoring = false;
                this.progressDialog.update(100);
                this.progressDialog.close();

                if (res.success)
                {
                    for (const f of this.files)
                    {
                        f.status = 'Restored';
                        f.tone = 'ok';
                    }

                    this.toast.success('Restored', 'The files are back at the baseline.');
                    this.refresh();

                    // Done: return to the list and clear the wizard
                    setTimeout((): void => { this.finishToList(); }, 900);

                    return;
                }

                this.toast.error('Restore', (res.messages ?? [])[0] ?? 'Restore failed.');
                this.refresh();
            },

            error: (error: unknown): void =>
            {
                console.error('[Clone Preview] restore error', error);

                this.restoring = false;
                this.progressDialog.close();
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