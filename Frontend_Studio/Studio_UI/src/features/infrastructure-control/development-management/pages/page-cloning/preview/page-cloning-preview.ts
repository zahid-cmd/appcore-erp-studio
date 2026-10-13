import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { ControlTabsComponent, ControlTab } from '../../../../../../shared/components/controls/control-tabs/control-tabs';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { StepsCounterComponent } from '../../../../../../shared/components/controls/steps-counter/steps-counter';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';

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

interface PreviewFileRow
{
    group: string;
    label: string;
    fileName: string;
    status: string;
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
        ToastComponent
    ],
    templateUrl:'./page-cloning-preview.html',
    styleUrls:['./page-cloning-preview.css']
})
export class PageCloningPreviewComponent implements OnInit, OnDestroy
{
    private readonly router = inject(Router);
    private readonly workflow = inject(PageCloningWorkflowService);
    private readonly toast = inject(ToastService);
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

    // Edit mode is not available yet; when it is, this switches Save to Update
    isEdit = false;
    saved = false;

    files: PreviewFileRow[] = [];
    selectedFile: PreviewFileRow | null = null;

    private destroyed = false;

    get state(): CloneWorkflowState { return this.workflow.state; }
    get rows(): CloneFieldRow[] { return this.state.fields ?? []; }
    get setup(): CloneSetup { return this.state.setup; }

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

        this.files = this.buildFileRows();
    }

    ngOnDestroy(): void
    {
        this.destroyed = true;
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
            status: 'Pending'
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
    // Command center : Save / Update, Restore, Back, List
    //===========================================================
    onSave(): void
    {
        // Connected to the generator in the backend step:
        // it will write the 15 files and save the PageCloning record.
        this.toast.info(
            this.isEdit ? 'Update' : 'Save',
            'Saving will write the files once the backend generator is connected.');
    }

    onRestore(): void
    {
        if (!this.saved)
        {
            this.toast.info('Restore', 'Nothing has been saved yet, so there is nothing to restore.');
            return;
        }

        this.toast.info('Restore', 'Restore will be connected with the backend step.');
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