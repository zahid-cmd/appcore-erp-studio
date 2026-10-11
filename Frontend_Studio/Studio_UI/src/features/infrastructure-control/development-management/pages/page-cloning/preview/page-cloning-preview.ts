import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { ControlTabsComponent, ControlTab } from '../../../../../../shared/components/controls/control-tabs/control-tabs';
import { PageCanvasComponent } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { FormGridComponent } from '../../../../../../shared/components/layout/form-grid/form-grid';
import { FormSectionComponent } from '../../../../../../shared/components/layout/form-section/form-section';
import { TextboxComponent } from '../../../../../../shared/components/controls/textbox/textbox';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    PageCloningWorkflowService,
    CloneWorkflowState,
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
        ControlTabsComponent, PageCanvasComponent, FormGridComponent,
        FormSectionComponent, TextboxComponent, ToastComponent
    ],
    templateUrl:'./page-cloning-preview.html',
    styleUrls:['./page-cloning-preview.css']
    
})
export class PageCloningPreviewComponent implements OnInit
{
    private readonly router = inject(Router);
    private readonly workflow = inject(PageCloningWorkflowService);
    private readonly toast = inject(ToastService);
    private readonly cdr = inject(ChangeDetectorRef);

    readonly step = 3;
    selectedTab = 'preview';

    tabs: ControlTab[] =
    [
        { id:'preview', label:'Clone Preview (Step 3 of 3)' }
    ];

    files: PreviewFileRow[] = [];
    selectedFile: PreviewFileRow | null = null;
    previewReady = false;

    get state(): CloneWorkflowState { return this.workflow.state; }

    //===========================================================
    // Load
    //===========================================================
    ngOnInit(): void
    {
        // Steps 1 and 2 must be done first
        if (!this.state.cloneFromId || !this.state.cloneToId || !this.state.entityName)
        {
            this.toast.info('Clone', 'Please complete the previous steps first.');
            void this.router.navigate(
                ['/infrastructure-control', 'development-management', 'page-cloning', 'source']);
            return;
        }

        this.files = this.buildFileRows();
    }

    //===========================================================
    // The 15 file names the target page is expected to have
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
            status: 'Not generated yet'
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
    }

    //===========================================================
    // Actions (connected to the engine in the next step)
    //===========================================================
    onGeneratePreview(): void
    {
        this.toast.info('Next step', 'Preview will be connected to the clone engine next.');
    }

    onApply(): void
    {
        this.toast.info('Next step', 'Apply will be connected to the clone engine next.');
    }

    //===========================================================
    // Navigation
    //===========================================================
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
}