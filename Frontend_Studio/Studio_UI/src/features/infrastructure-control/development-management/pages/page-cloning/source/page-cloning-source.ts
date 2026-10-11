import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, finalize, timeout } from 'rxjs';

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { ControlTabsComponent, ControlTab } from '../../../../../../shared/components/controls/control-tabs/control-tabs';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { SearchDropdownComponent } from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';

import { PageCloningWorkflowService, CloneWorkflowState } from '../../../services/page-cloning-workflow.service';
import { PageCloningService } from '../../../services/page-cloning.service';
import { EntityAnalysis, AnalysisFile } from '../../../model/page-cloning.model';

import { ModuleService } from '../../../../navigation-management/services/module.service';
import { NavigationMenuService } from '../../../../navigation-management/services/menu.service';
import { NavigationSubmenuService } from '../../../../navigation-management/services/submenu.service';

const FILE_LABELS: Record<string, string> =
{
    'backend.entity': 'Entity',
    'backend.configuration': 'Configuration',
    'backend.repository': 'Repository',
    'backend.interface': 'Repository Interface',
    'backend.dto': 'DTO',
    'backend.createdto': 'Create DTO',
    'backend.updatedto': 'Update DTO',
    'backend.defaultsdto': 'Defaults DTO',
    'backend.controller': 'Controller',
    'frontend.model': 'Model',
    'frontend.service': 'Service',
    'frontend.form.ts': 'Form (ts)',
    'frontend.form.html': 'Form (html)',
    'frontend.list.ts': 'List (ts)',
    'frontend.list.html': 'List (html)'
};

@Component(
{
    selector:'page-cloning-source',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent, PageToolbarComponent, CommandCenterComponent,
        ControlTabsComponent, PageCanvasComponent, SearchDropdownComponent,
        ToastComponent
    ],
    templateUrl:'./page-cloning-source.html',
    styleUrls:['./page-cloning-source.css']
})
export class PageCloningSourceComponent implements OnInit, OnDestroy
{
    private readonly router = inject(Router);
    private readonly workflow = inject(PageCloningWorkflowService);
    private readonly pageCloningService = inject(PageCloningService);
    private readonly moduleService = inject(ModuleService);
    private readonly menuService = inject(NavigationMenuService);
    private readonly submenuService = inject(NavigationSubmenuService);
    private readonly toast = inject(ToastService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly zone = inject(NgZone);

    readonly step: number = 1;
    selectedTab = 'source';

    tabs: ControlTab[] =
    [
        { id:'source', label:'Clone From (Step 1 of 3)' }
    ];

    // Turns the canvas footer on (hints are shown there)
    readonly canvasConfig = {
        showFooter: true,
        reserveFooterSpace: true,
        footerHeight: 56
    } as PageCanvasConfig;

    moduleItems: any[] = [ { label:'Select module', value:null } ];
    menuItems: any[] = [ { label:'Select menu', value:null } ];
    submenuItems: any[] = [ { label:'Select submenu', value:null } ];

    private submenus: any[] = [];

    analysis: EntityAnalysis | null = null;
    analyzing = false;

    private analyzeSub?: Subscription;
    private destroyed = false;

    get state(): CloneWorkflowState { return this.workflow.state; }

    //===========================================================
    // Refresh the screen (works with and without zone.js)
    //===========================================================
    private refresh(): void
    {
        if (this.destroyed) { return; }

        this.zone.run(() =>
        {
            this.cdr.markForCheck();
            this.cdr.detectChanges();
        });
    }

    //===========================================================
    // Load
    //===========================================================
    ngOnInit(): void
    {
        this.moduleService.getAll().subscribe(
        {
            next: (modules: any[]) =>
            {
                this.moduleItems =
                [
                    { label:'Select module', value:null },
                    ...(modules ?? []).map((m: any) => this.toItem(m))
                ];

                this.refresh();

                // Restore earlier choices when coming Back
                if (this.state.cloneFromModuleId)
                {
                    this.loadMenus(() =>
                    {
                        if (this.state.cloneFromMenuId)
                        {
                            this.loadSubmenus(() =>
                            {
                                if (this.state.cloneFromId) { this.analyze(); }
                            });
                        }
                    });
                }
            },
            error: () =>
            {
                this.toast.error('Error', 'Failed to load modules.');
                this.refresh();
            }
        });
    }

    ngOnDestroy(): void
    {
        this.destroyed = true;
        this.analyzeSub?.unsubscribe();
    }

    private toItem(x: any): { label: string; value: number }
    {
        const code = x.code ?? '';
        const name = x.name ?? '';
        return { label: code ? `${code} - ${name}` : name, value: Number(x.id) };
    }

    //===========================================================
    // Module -> Menu -> Submenu
    //===========================================================
    onModuleChange(): void
    {
        this.state.cloneFromMenuId = 0;
        this.clearSubmenu();
        this.menuItems = [ { label:'Select menu', value:null } ];
        this.submenuItems = [ { label:'Select submenu', value:null } ];

        if (this.state.cloneFromModuleId) { this.loadMenus(); }

        this.refresh();
    }

    onMenuChange(): void
    {
        this.clearSubmenu();
        this.submenuItems = [ { label:'Select submenu', value:null } ];

        if (this.state.cloneFromMenuId) { this.loadSubmenus(); }

        this.refresh();
    }

    onSubmenuChange(): void
    {
        const id = Number(this.state.cloneFromId) || 0;
        const s = this.submenus.find(x => Number(x.id) === id);

        this.state.cloneFromCode = s?.code ?? '';
        this.state.cloneFromName = s?.name ?? '';

        // A different page invalidates any running or finished analysis
        this.cancelAnalysis();
        this.analysis = null;

        // A new source clears the target
        if (this.state.cloneToId === id)
        {
            this.state.cloneToId = 0;
            this.state.cloneToCode = '';
            this.state.cloneToName = '';
            this.state.entityName = '';
            this.state.displayName = '';
        }

        this.refresh();
    }

    private clearSubmenu(): void
    {
        this.cancelAnalysis();

        this.state.cloneFromId = 0;
        this.state.cloneFromCode = '';
        this.state.cloneFromName = '';
        this.analysis = null;
    }

    private loadMenus(done?: () => void): void
    {
        this.menuService.getByModule(Number(this.state.cloneFromModuleId)).subscribe(
        {
            next: (menus: any[]) =>
            {
                this.menuItems =
                [
                    { label:'Select menu', value:null },
                    ...(menus ?? []).map((m: any) => this.toItem(m))
                ];
                this.refresh();
                done?.();
            },
            error: () =>
            {
                this.toast.error('Error', 'Failed to load menus.');
                this.refresh();
            }
        });
    }

    private loadSubmenus(done?: () => void): void
    {
        this.submenuService.getByMenu(Number(this.state.cloneFromMenuId)).subscribe(
        {
            next: (subs: any[]) =>
            {
                this.submenus = subs ?? [];
                this.submenuItems =
                [
                    { label:'Select submenu', value:null },
                    ...this.submenus.map((s: any) => this.toItem(s))
                ];
                this.refresh();
                done?.();
            },
            error: () =>
            {
                this.toast.error('Error', 'Failed to load submenus.');
                this.refresh();
            }
        });
    }

    //===========================================================
    // Analyse button
    //===========================================================
    onAnalyse(): void
    {
        if (!this.state.cloneFromId)
        {
            this.toast.error('Clone From', 'Please select module, menu and submenu first.');
            return;
        }

        // A new click always starts a fresh request
        this.analyze();
    }

    //===========================================================
    // The 15 files of the source page
    //===========================================================
    private cancelAnalysis(): void
    {
        this.analyzeSub?.unsubscribe();
        this.analyzeSub = undefined;
        this.analyzing = false;
    }

    private analyze(): void
    {
        if (!this.state.cloneFromName)
        {
            const s = this.submenus.find(x => Number(x.id) === Number(this.state.cloneFromId));
            this.state.cloneFromCode = s?.code ?? '';
            this.state.cloneFromName = s?.name ?? '';
        }

        // Drop any request that is still pending
        this.analyzeSub?.unsubscribe();

        this.analyzing = true;
        this.analysis = null;
        this.refresh();

        this.analyzeSub = this.pageCloningService
            .analyze(this.state.cloneFromName)
            .pipe(
                timeout(30000),
                finalize(() =>
                {
                    this.analyzing = false;
                    this.refresh();
                })
            )
            .subscribe(
            {
                next: (a: EntityAnalysis) =>
                {
                    this.analysis = a;
                    this.analyzing = false;
                    this.refresh();
                },
                error: (error: any) =>
                {
                    console.error('Analyze failed', error);

                    this.analysis = null;
                    this.analyzing = false;

                    this.toast.error(
                        'Source page',
                        error?.name === 'TimeoutError'
                            ? 'Reading the files took more than 30 seconds. Check that the API is running.'
                            : (typeof error?.error === 'string' && error.error
                                ? error.error
                                : 'Could not read the source page files.'));

                    this.refresh();
                }
            });
    }

    labelOf(file: AnalysisFile): string
    {
        return FILE_LABELS[file.Key] ?? file.Key;
    }

    groupOf(file: AnalysisFile): string
    {
        return file.Key.startsWith('backend') ? 'Backend' : 'Frontend';
    }

    get foundCount(): number
    {
        return this.analysis?.Files.filter(f => f.Exists).length ?? 0;
    }

    get backendFiles(): AnalysisFile[]
    {
        return this.analysis?.Files.filter(f => f.Key.startsWith('backend')) ?? [];
    }

    get frontendFiles(): AnalysisFile[]
    {
        return this.analysis?.Files.filter(f => f.Key.startsWith('frontend')) ?? [];
    }

    //===========================================================
    // Navigation
    //===========================================================
    onContinue(): void
    {
        if (!this.state.cloneFromId)
        {
            this.toast.error('Clone From', 'Please select the page to copy.');
            return;
        }

        if (!this.analysis || this.analyzing)
        {
            this.toast.info('Clone From', 'Please click Analyse and wait while the files are checked.');
            return;
        }

        if (this.foundCount < this.analysis.Files.length)
        {
            this.toast.error('Clone From',
                `Only ${this.foundCount} of ${this.analysis.Files.length} files were found. A complete page is needed as the source.`);
            return;
        }

        void this.router.navigate(
            ['/infrastructure-control', 'development-management', 'page-cloning', 'target']);
    }

    onClear(): void
    {
        this.cancelAnalysis();
        this.workflow.reset();
        this.analysis = null;
        this.menuItems = [ { label:'Select menu', value:null } ];
        this.submenuItems = [ { label:'Select submenu', value:null } ];
        this.refresh();
    }

    onBackToList(): void
    {
        this.cancelAnalysis();

        void this.router.navigate(
            ['/infrastructure-control', 'development-management', 'page-cloning', 'list']);
    }
}