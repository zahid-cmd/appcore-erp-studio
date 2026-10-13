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
import { StepsCounterComponent } from '../../../../../../shared/components/controls/steps-counter/steps-counter';
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
    selector:'page-cloning-target',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent, PageToolbarComponent, CommandCenterComponent,
        ControlTabsComponent, PageCanvasComponent, SearchDropdownComponent,
        StepsCounterComponent, ToastComponent
    ],
    templateUrl:'./page-cloning-target.html',
    styleUrls:['./page-cloning-target.css']
})
export class PageCloningTargetComponent implements OnInit, OnDestroy
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

    selectedTab = 'target';

    // The tab shows only the name (the step lives in the page header center)
    tabs: ControlTab[] =
    [
        { id:'target', label:'Clone To' }
    ];

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
                console.error('[Clone To] render error', error);
            }
        });

        setTimeout(() =>
        {
            if (this.destroyed) { return; }

            this.zone.run(() =>
            {
                try { this.cdr.detectChanges(); }
                catch (error) { console.error('[Clone To] render error', error); }
            });
        }, 0);
    }

    //===========================================================
    // Load
    //===========================================================
    ngOnInit(): void
    {
        // Step 1 must be done first
        if (!this.state.cloneFromId)
        {
            this.toast.info('Clone From', 'Please choose the page to copy first.');
            void this.router.navigate(
                ['/infrastructure-control', 'development-management', 'page-cloning', 'source']);
            return;
        }

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
                if (this.state.cloneToModuleId)
                {
                    this.loadMenus(() =>
                    {
                        if (this.state.cloneToMenuId)
                        {
                            this.loadSubmenus(() =>
                            {
                                if (this.state.cloneToId) { this.analyze(); }
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
        this.state.cloneToMenuId = 0;
        this.clearSubmenu();
        this.menuItems = [ { label:'Select menu', value:null } ];
        this.submenuItems = [ { label:'Select submenu', value:null } ];

        if (this.state.cloneToModuleId) { this.loadMenus(); }

        this.refresh();
    }

    onMenuChange(): void
    {
        this.clearSubmenu();
        this.submenuItems = [ { label:'Select submenu', value:null } ];

        if (this.state.cloneToMenuId) { this.loadSubmenus(); }

        this.refresh();
    }

    onSubmenuChange(): void
    {
        const id = Number(this.state.cloneToId) || 0;

        // The source page cannot be its own target
        if (id && id === this.state.cloneFromId)
        {
            this.toast.error('Clone To', 'Clone To cannot be the same page as Clone From.');
            this.clearSubmenu();
            this.refresh();
            return;
        }

        const s = this.submenus.find(x => Number(x.id) === id);

        this.state.cloneToCode = s?.code ?? '';
        this.state.cloneToName = s?.name ?? '';
        this.state.displayName = s?.name ?? '';
        this.state.entityName = (s?.name ?? '').replace(/[^A-Za-z0-9]/g, '');

        this.cancelAnalysis();
        this.analysis = null;

        this.refresh();
    }

    private clearSubmenu(): void
    {
        this.cancelAnalysis();

        this.state.cloneToId = 0;
        this.state.cloneToCode = '';
        this.state.cloneToName = '';
        this.state.entityName = '';
        this.state.displayName = '';
        this.analysis = null;
    }

    private loadMenus(done?: () => void): void
    {
        this.menuService.getByModule(Number(this.state.cloneToModuleId)).subscribe(
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
        this.submenuService.getByMenu(Number(this.state.cloneToMenuId)).subscribe(
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
    // Names (typed by the user)
    //===========================================================
    onEntityInput(event: Event): void
    {
        this.state.entityName = (event.target as HTMLInputElement).value;
    }

    onDisplayInput(event: Event): void
    {
        this.state.displayName = (event.target as HTMLInputElement).value;
    }

    //===========================================================
    // Analyse button
    //===========================================================
    onAnalyse(): void
    {
        if (!this.state.cloneToId)
        {
            this.toast.error('Clone To', 'Please select module, menu and submenu first.');
            return;
        }

        this.analyze();
    }

    private cancelAnalysis(): void
    {
        this.analyzeSub?.unsubscribe();
        this.analyzeSub = undefined;
        this.analyzing = false;
    }

    private analyze(): void
    {
        if (!this.state.cloneToName)
        {
            const s = this.submenus.find(x => Number(x.id) === Number(this.state.cloneToId));
            this.state.cloneToCode = s?.code ?? '';
            this.state.cloneToName = s?.name ?? '';
        }

        this.analyzeSub?.unsubscribe();

        this.analyzing = true;
        this.analysis = null;
        this.refresh();

        this.analyzeSub = this.pageCloningService
            .analyze(this.state.cloneToName)
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

                    // Use the real entity name found in the code
                    if (a.Entity)
                    {
                        this.state.entityName = a.Entity;
                    }

                    this.refresh();
                },
                error: (error: any) =>
                {
                    console.error('Analyze failed', error);

                    this.analysis = null;
                    this.analyzing = false;

                    this.toast.error(
                        'Target page',
                        error?.name === 'TimeoutError'
                            ? 'Reading the files took more than 30 seconds. Check that the API is running.'
                            : (typeof error?.error === 'string' && error.error
                                ? error.error
                                : 'Could not read the target page files.'));

                    this.refresh();
                }
            });
    }

    labelOf(file: AnalysisFile): string
    {
        return FILE_LABELS[file.Key] ?? file.Key;
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
    // Canvas footer : Next
    //===========================================================
    onNext(): void
    {
        if (!this.state.cloneToId)
        {
            this.toast.error('Clone To', 'Please select the empty page to fill.');
            return;
        }

        if (!this.analysis || this.analyzing)
        {
            this.toast.info('Clone To', 'Please click Analyse and wait while the files are checked.');
            return;
        }

        if (this.foundCount < this.analysis.Files.length)
        {
            this.toast.error('Clone To',
                `Only ${this.foundCount} of ${this.analysis.Files.length} target files exist. Run code synchronization for this page first.`);
            return;
        }

        if (!this.state.entityName.trim())
        {
            this.toast.error('Entity Name', 'Entity Name is required.');
            return;
        }

        void this.router.navigate(
            ['/infrastructure-control', 'development-management', 'page-cloning', 'action']);
    }

    //===========================================================
    // Command center : Reset, Back, List
    //===========================================================
    onReset(): void
    {
        this.cancelAnalysis();
        this.clearSubmenu();

        this.state.cloneToModuleId = 0;
        this.state.cloneToMenuId = 0;

        this.menuItems = [ { label:'Select menu', value:null } ];
        this.submenuItems = [ { label:'Select submenu', value:null } ];

        this.refresh();
    }

    onBack(): void
    {
        this.cancelAnalysis();

        void this.router.navigate(
            ['/infrastructure-control', 'development-management', 'page-cloning', 'source']);
    }

    onBackToList(): void
    {
        this.cancelAnalysis();

        void this.router.navigate(
            ['/infrastructure-control', 'development-management', 'page-cloning', 'list']);
    }
}