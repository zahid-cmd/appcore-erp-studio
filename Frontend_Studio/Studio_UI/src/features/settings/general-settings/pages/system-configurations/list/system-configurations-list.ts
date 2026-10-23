//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    OnDestroy,
    inject,
    ChangeDetectorRef
}
from '@angular/core';

import
{
    HttpErrorResponse
}
from '@angular/common/http';

import
{
    CommonModule
}
from '@angular/common';

import
{
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    Observable,
    defer,
    forkJoin,
    of,
    timer,
    throwError,
    delayWhen,
    catchError,
    switchMap
}
from 'rxjs';

//===============================================================
// Models
//===============================================================

import
{
    SystemConfiguration,
    ConfigurationModule,
    DEFAULT_MODULE_ICON
}
from '../../../models/system-configurations.model';

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
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

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
    EmptyStateComponent
}
from '../../../../../../shared/components/layout/empty-state/empty-state';

import
{
    HistoryDrawerComponent
}
from '../../../../../../shared/components/utilities/history-drawer/history-drawer';

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
    ProgressDialogComponent
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

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
// Services
//===============================================================

import
{
    SystemConfigurationsService
}
from '../../../services/system-configurations.service';

import
{
    ModuleService
}
from '../../../../../infrastructure-control/navigation-management/services/module.service';

//===============================================================
// Module Panel
//===============================================================

interface ModulePanel
{
    id:
        number;

    name:
        string;

    isActive:
        boolean;

    icon:
        string;

    items:
        SystemConfiguration[];

    total:
        number;

    enabled:
        number;
}

//===============================================================
// Case-Insensitive Field Reader
//===============================================================

function readField
(
    item:
        any,
    name:
        string
):
    any
{
    if
    (
        item == null
        ||
        typeof item !== 'object'
    )
    {
        return undefined;
    }

    if
    (
        name in item
    )
    {
        return item[name];
    }

    const target =
        name.toLowerCase();

    const key =
        Object.keys(item).find
        (
            k =>
                k.toLowerCase() ===
                target
        );

    return key !== undefined
        ? item[key]
        : undefined;
}

//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'system-configurations-list',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        ControlTabsComponent,
        SearchBoxComponent,
        SearchDropdownComponent,
        CommandCenterComponent,
        EmptyStateComponent,
        HistoryDrawerComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        ToastComponent
    ],

    templateUrl:'./system-configurations-list.html',

    styleUrl:'./system-configurations-list.css'
})

//===============================================================
// System Configurations List
//
// Not a table: one panel per module, each holding its settings
// as cards with an on/off switch. Panels in a row share the
// height of the tallest one. No pagination.
//===============================================================

export class SystemConfigurationsList
implements OnInit, OnDestroy
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly systemConfigurationsService =
        inject(SystemConfigurationsService);

    private readonly moduleService =
        inject(ModuleService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly route =
        inject(ActivatedRoute);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // Progress Configuration
    //===========================================================

    private readonly MIN_PROGRESS_MS:
        number =
        3000;

    private readonly PROGRESS_TICK_MS:
        number =
        100;

    private readonly PROGRESS_CEILING:
        number =
        90;

    private readonly PROGRESS_COMPLETE_HOLD_MS:
        number =
        600;

    private readonly CONFIRM_CLOSE_DELAY_MS:
        number =
        150;

    private progressTimer?:
        number;

    private progressValue:
        number =
        0;

    // Prevents a second Delete / Restore while one is running
    isProcessing:
        boolean =
        false;

    //===========================================================
    // Page Tabs
    //===========================================================

    tabs:
        ControlTab[] =
    [
        {
            id:'all',
            label:'All Configurations'
        }
    ];

    selectedTab:
        string =
        'all';

    //===========================================================
    // Data
    //===========================================================

    private configurations:
        SystemConfiguration[] =
        [];

    // Navigation Modules (DB driven) — one panel each
    private modules:
        ConfigurationModule[] =
        [];

    panels:
        ModulePanel[] =
        [];

    //===========================================================
    // Summary
    //===========================================================

    totalCount:
        number =
        0;

    enabledCount:
        number =
        0;

    disabledCount:
        number =
        0;

    activeModuleCount:
        number =
        0;

    //===========================================================
    // Toggle In Progress (per configuration id)
    //===========================================================

    private readonly togglingIds:
        Set<number> =
        new Set<number>();

    //===========================================================
    // Module Filter
    //===========================================================

    moduleFilterItems:
        any[] =
    [
        { label:'All Modules', value:null }
    ];

    selectedModule:
        number | null =
        null;

    //===========================================================
    // Enabled Filter
    //===========================================================

    enabledFilterItems:
        any[] =
    [
        { label:'All Settings', value:null },
        { label:'Enabled', value:true },
        { label:'Disabled', value:false }
    ];

    selectedEnabled:
        boolean | null =
        null;

    //===========================================================
    // Search & Loading
    //===========================================================

    searchText:
        string =
        '';

    loading:
        boolean =
        false;

    loadFailed:
        boolean =
        false;

    //===========================================================
    // History
    //===========================================================

    historyOpened:
        boolean =
        false;

    historyTitle:
        string =
        'System Configuration History';

    historyItems:
        any[] =
        [];

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadItems();
    }

    //===========================================================
    // Destroy
    //===========================================================

    ngOnDestroy():
        void
    {
        this.clearProgressTimer();

        if
        (
            this.isProcessing
        )
        {
            this.progressDialog.close();
        }
    }

    //===========================================================
    // Filters Active
    //===========================================================

    get hasActiveFilters():
        boolean
    {
        return !!this.searchText.trim()
            ||
            this.selectedModule !== null
            ||
            this.selectedEnabled !== null;
    }

    //===========================================================
    // Any Module To Show (no module, no panel)
    //===========================================================

    get hasModules():
        boolean
    {
        return this.visibleModules().length > 0;
    }

    //===========================================================
    // Navigation Module → Panel Module
    //===========================================================

    private toModule
    (
        item:
            any
    ):
        ConfigurationModule
    {
        const icon =
            String(readField(item, 'icon') ?? '').trim();

        const active =
            readField(item, 'isActive');

        return {
            id:
                Number(readField(item, 'id') ?? 0) || 0,

            code:
                String(readField(item, 'code') ?? '').trim(),

            name:
                String(readField(item, 'name') ?? '').trim(),

            icon:
                icon || DEFAULT_MODULE_ICON,

            displayOrder:
                Number(readField(item, 'displayOrder') ?? 0) || 0,

            isActive:
                active == null
                    ? true
                    : Boolean(active)
        };
    }

    //===========================================================
    // Build Module Filter Items
    //===========================================================

    private buildModuleFilterItems():
        void
    {
        this.moduleFilterItems =
        [
            { label:'All Modules', value:null },

            ...this.visibleModules().map
            (
                module =>
                ({
                    label:module.name,
                    value:module.id
                })
            )
        ];
    }

    //===========================================================
    // Visible Modules
    //
    // Active Navigation Modules, plus inactive ones that still
    // hold settings (so nothing is hidden). Deleted modules
    // never come back from the API.
    //===========================================================

    private visibleModules():
        ConfigurationModule[]
    {
        const usedIds =
            new Set(
                this.configurations.map
                (
                    item =>
                        item.NavigationModuleId
                )
            );

        return this.modules
            .filter
            (
                module =>
                    module.id > 0
                    &&
                    (
                        module.isActive
                        ||
                        usedIds.has(module.id)
                    )
            )
            .sort
            (
                (a, b) =>
                    a.displayOrder - b.displayOrder
                    ||
                    a.name.localeCompare(b.name)
            );
    }

    //===========================================================
    // Load Items (modules + configurations together)
    //===========================================================

    loadItems():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        forkJoin
        ({
            modules:
                this.moduleService
                    .getAll()
                    .pipe
                    (
                        catchError
                        (
                            error =>
                            {
                                console.error(
                                    'Load Navigation Modules Error:',
                                    error
                                );

                                return of(null);
                            }
                        )
                    ),

            configurations:
                this.systemConfigurationsService.getAll()
        })
        .subscribe
        ({
            next:
            (
                result:
                {
                    modules:
                        any;
                    configurations:
                        SystemConfiguration[];
                }
            ):
                void =>
            {
                if
                (
                    result.modules === null
                )
                {
                    this.toast.error(
                        'Load Failed',
                        'Unable to load modules from Navigation Management.'
                    );
                }

                this.modules =
                    (Array.isArray(result.modules) ? result.modules : [])
                        .map
                        (
                            item =>
                                this.toModule(
                                    item
                                )
                        );

                this.configurations =
                    result.configurations ?? [];

                this.buildModuleFilterItems();

                this.buildSummary();

                this.applyFilters();

                this.loading =
                    false;

                this.loadFailed =
                    result.modules === null;

                this.cdr.detectChanges();
            },

            error:
            (
                error:
                    unknown
            ):
                void =>
            {
                console.error(
                    'Load System Configurations Error:',
                    error
                );

                this.configurations =
                    [];

                this.buildSummary();

                this.applyFilters();

                this.loading =
                    false;

                this.loadFailed =
                    true;

                this.toast.error(
                    'Load Failed',
                    'Unable to load system configurations.'
                );

                this.cdr.detectChanges();
            }
        });
    }

    //===========================================================
    // Summary (whole data set, ignores filters)
    //===========================================================

    private buildSummary():
        void
    {
        this.totalCount =
            this.configurations.length;

        this.enabledCount =
            this.configurations.filter
            (
                item =>
                    item.IsEnabled
            ).length;

        this.disabledCount =
            this.totalCount - this.enabledCount;

        this.activeModuleCount =
            new Set(
                this.configurations.map
                (
                    item =>
                        item.NavigationModuleId
                )
            ).size;
    }

    //===========================================================
    // Apply Filters → Panels
    //===========================================================

    applyFilters():
        void
    {
        const keyword:
            string =
            this.searchText
                .trim()
                .toLowerCase();

        const matches =
            (
                item:
                    SystemConfiguration
            ):
                boolean =>
            {
                if
                (
                    this.selectedEnabled !== null
                    &&
                    item.IsEnabled !== this.selectedEnabled
                )
                {
                    return false;
                }

                if
                (
                    !keyword
                )
                {
                    return true;
                }

                return [
                    item.ConfigurationCode,
                    item.ConfigurationName,
                    item.Remarks,
                    item.Value,
                    item.ModuleName,
                    item.ModuleCode,
                    item.IsEnabled ? 'enabled' : 'disabled'
                ]
                .some
                (
                    value =>
                        String(value ?? '')
                            .toLowerCase()
                            .includes(keyword)
                );
            };

        const modules:
            ConfigurationModule[] =
            this.visibleModules()
                .filter
                (
                    module =>
                        this.selectedModule === null
                        ||
                        module.id === this.selectedModule
                );

        this.panels =
            modules
                .map
                (
                    module =>
                    {
                        const all =
                            this.configurations.filter
                            (
                                item =>
                                    item.NavigationModuleId === module.id
                            );

                        return {
                            id:
                                module.id,

                            name:
                                module.name,

                            isActive:
                                module.isActive,

                            icon:
                                module.icon,

                            items:
                                all
                                    .filter(matches)
                                    .sort
                                    (
                                        (a, b) =>
                                            a.ConfigurationCode.localeCompare(b.ConfigurationCode)
                                    ),

                            total:
                                all.length,

                            enabled:
                                all.filter
                                (
                                    item =>
                                        item.IsEnabled
                                ).length
                        };
                    }
                )
                // While searching / filtering, hide modules with no match
                .filter
                (
                    panel =>
                        !this.hasActiveFilters
                        ||
                        this.selectedModule !== null
                        ||
                        panel.items.length > 0
                );

        this.cdr.detectChanges();
    }

    //===========================================================
    // Search
    //===========================================================

    onSearch
    (
        value:
            string
    ):
        void
    {
        this.searchText =
            value
            ??
            '';

        this.applyFilters();
    }

    //===========================================================
    // Module Filter Change
    //===========================================================

    onModuleFilterChange
    (
        value:
            number | null
    ):
        void
    {
        this.selectedModule =
            value;

        this.applyFilters();
    }

    //===========================================================
    // Enabled Filter Change
    //===========================================================

    onEnabledFilterChange
    (
        value:
            boolean | null
    ):
        void
    {
        this.selectedEnabled =
            value;

        this.applyFilters();
    }

    //===========================================================
    // Clear Filters
    //===========================================================

    clearFilters():
        void
    {
        this.searchText =
            '';

        this.selectedModule =
            null;

        this.selectedEnabled =
            null;

        this.applyFilters();
    }

    //===========================================================
    // Refresh
    //===========================================================

    refresh():
        void
    {
        if
        (
            this.isProcessing
        )
        {
            return;
        }

        this.searchText =
            '';

        this.selectedModule =
            null;

        this.selectedEnabled =
            null;

        this.loadItems();
    }

    //===========================================================
    // Navigate
    //===========================================================

    private navigateTo
    (
        action:
            'add' | 'view' | 'edit',
        id?:
            number,
        moduleId?:
            number
    ):
        void
    {
        const commands:
            any[] =
            id
                ? [action, id]
                : [action];

        void this.router.navigate
        (
            commands,
            {
                relativeTo:
                    this.route.parent
                    ??
                    this.route,

                queryParams:
                    moduleId
                        ? { moduleId }
                        : undefined
            }
        );
    }

    //===========================================================
    // Add (header) / Add To Module (panel "+")
    //===========================================================

    add():
        void
    {
        if
        (
            this.isProcessing
        )
        {
            return;
        }

        this.navigateTo(
            'add',
            undefined,
            this.selectedModule ?? undefined
        );
    }

    addToModule
    (
        moduleId:
            number
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

        this.navigateTo(
            'add',
            undefined,
            moduleId
        );
    }

    //===========================================================
    // View / Edit
    //===========================================================

    view
    (
        item:
            SystemConfiguration
    ):
        void
    {
        if
        (
            this.isProcessing
            ||
            !item.SystemConfigurationId
        )
        {
            return;
        }

        this.navigateTo(
            'view',
            item.SystemConfigurationId
        );
    }

    edit
    (
        item:
            SystemConfiguration
    ):
        void
    {
        if
        (
            this.isProcessing
            ||
            !item.SystemConfigurationId
        )
        {
            return;
        }

        this.navigateTo(
            'edit',
            item.SystemConfigurationId
        );
    }

    //===========================================================
    // Toggle Enabled (saves immediately)
    //===========================================================

    isToggling
    (
        item:
            SystemConfiguration
    ):
        boolean
    {
        return this.togglingIds.has(
            item.SystemConfigurationId
        );
    }

    toggleEnabled
    (
        item:
            SystemConfiguration
    ):
        void
    {
        if
        (
            this.isProcessing
            ||
            this.isToggling(item)
        )
        {
            return;
        }

        const previous =
            item.IsEnabled;

        const next =
            !previous;

        // Optimistic: flip now, revert if the server refuses
        item.IsEnabled =
            next;

        this.togglingIds.add(
            item.SystemConfigurationId
        );

        this.buildSummary();

        this.applyFilters();

        this.systemConfigurationsService
            .setEnabled(
                item.SystemConfigurationId,
                next
            )
            .subscribe
            ({
                next:
                ():
                    void =>
                {
                    this.togglingIds.delete(
                        item.SystemConfigurationId
                    );

                    this.toast.success(
                        next ? 'Enabled' : 'Disabled',
                        `${item.ConfigurationName} is now ${next ? 'enabled' : 'disabled'}.`
                    );

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'Toggle Configuration Error:',
                        error
                    );

                    item.IsEnabled =
                        previous;

                    this.togglingIds.delete(
                        item.SystemConfigurationId
                    );

                    this.buildSummary();

                    this.applyFilters();

                    this.toast.error(
                        'Update Failed',
                        error instanceof HttpErrorResponse
                            ? this.extractErrorMessage(
                                error,
                                `Could not change ${item.ConfigurationName}.`
                            )
                            : `Could not change ${item.ConfigurationName}.`
                    );
                }
            });
    }

    //===========================================================
    // Delete
    //===========================================================

    delete
    (
        item:
            SystemConfiguration
    ):
        void
    {
        if
        (
            this.isProcessing
            ||
            !item.SystemConfigurationId
        )
        {
            return;
        }

        const id =
            item.SystemConfigurationId;

        const name =
            item.ConfigurationName
            ||
            item.ConfigurationCode
            ||
            'this configuration';

        this.confirmDialog.open
        (
            'Delete Configuration',
            `Are you sure you want to delete "${name}"?`,
            ():
                void =>
            {
                setTimeout
                (
                    () =>
                        this.deleteItem(
                            id,
                            name
                        ),
                    this.CONFIRM_CLOSE_DELAY_MS
                );
            }
        );
    }

    //===========================================================
    // Delete Item
    //===========================================================

    private deleteItem
    (
        id:
            number,
        name:
            string
    ):
        void
    {
        this.startProgress(
            'Deleting Configuration',
            `Please wait while "${name}" is being deleted...`
        );

        this.withMinimumDuration(
            this.systemConfigurationsService.delete(
                id
            )
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Configuration deleted.',
                    () =>
                    {
                        this.toast.success(
                            'Delete Successful',
                            `${name} deleted successfully.`
                        );

                        this.loadItems();
                    }
                );
            },

            error:
            (
                error:
                    unknown
            ):
                void =>
            {
                console.error(
                    'Delete Configuration Error:',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        if
                        (
                            error instanceof HttpErrorResponse
                            &&
                            error.status === 409
                        )
                        {
                            this.toast.info(
                                'Delete Blocked',
                                this.extractErrorMessage(
                                    error,
                                    'This configuration cannot be deleted.'
                                )
                            );

                            return;
                        }

                        if
                        (
                            error instanceof HttpErrorResponse
                            &&
                            error.status === 404
                        )
                        {
                            this.toast.info(
                                'Not Found',
                                'This configuration no longer exists. The page has been refreshed.'
                            );

                            this.loadItems();

                            return;
                        }

                        this.toast.error(
                            'Delete Failed',
                            'Failed to delete configuration.'
                        );
                    }
                );
            }
        });
    }

    //===========================================================
    // Restore
    //===========================================================

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
            'Restore Configuration',
            'Are you sure you want to restore the most recently deleted configuration?',
            ():
                void =>
            {
                setTimeout
                (
                    () =>
                        this.restoreItem(),
                    this.CONFIRM_CLOSE_DELAY_MS
                );
            },
            'Restore',
            'Cancel',
            'primary'
        );
    }

    //===========================================================
    // Restore Item
    //===========================================================

    private restoreItem():
        void
    {
        this.startProgress(
            'Restoring Configuration',
            'Please wait while the most recently deleted configuration is being restored...'
        );

        this.withMinimumDuration(
            this.systemConfigurationsService.restore()
        )
        .subscribe
        ({
            next:
            ():
                void =>
            {
                this.completeProgress(
                    'Configuration restored.',
                    () =>
                    {
                        this.toast.success(
                            'Restore Successful',
                            'The most recently deleted configuration has been restored.'
                        );

                        this.loadItems();
                    }
                );
            },

            error:
            (
                error:
                    unknown
            ):
                void =>
            {
                console.error(
                    'Restore Configuration Error',
                    error
                );

                this.failProgress(
                    () =>
                    {
                        if
                        (
                            error instanceof HttpErrorResponse
                            &&
                            error.status === 404
                        )
                        {
                            this.toast.info(
                                'No Data to Restore',
                                'There is no deleted configuration to restore.'
                            );

                            return;
                        }

                        if
                        (
                            error instanceof HttpErrorResponse
                            &&
                            error.status === 409
                        )
                        {
                            this.toast.info(
                                'Restore Blocked',
                                this.extractErrorMessage(
                                    error,
                                    'The configuration cannot be restored.'
                                )
                            );

                            return;
                        }

                        this.toast.error(
                            'Restore Failed',
                            'Failed to restore configuration.'
                        );
                    }
                );
            }
        });
    }

    //===========================================================
    // Progress Dialog (Animated)
    //===========================================================

    private startProgress
    (
        title:
            string,
        message:
            string
    ):
        void
    {
        this.isProcessing =
            true;

        this.progressValue =
            0;

        this.progressDialog.show(
            title,
            message,
            false
        );

        this.clearProgressTimer();

        this.progressTimer =
            window.setInterval(
                () =>
                {
                    const step =
                        Math.max(
                            0.4,
                            (this.PROGRESS_CEILING - this.progressValue) * 0.06
                        );

                    this.progressValue =
                        Math.min(
                            this.PROGRESS_CEILING,
                            this.progressValue + step
                        );

                    this.progressDialog.update(
                        Math.round(
                            this.progressValue
                        )
                    );
                },
                this.PROGRESS_TICK_MS
            );

        this.cdr.detectChanges();
    }

    private completeProgress
    (
        message:
            string,
        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressDialog.update(
            100,
            message
        );

        window.setTimeout(
            () =>
            {
                this.progressDialog.close();

                this.isProcessing =
                    false;

                this.cdr.detectChanges();

                done();
            },
            this.PROGRESS_COMPLETE_HOLD_MS
        );
    }

    private failProgress
    (
        done:
            () => void
    ):
        void
    {
        this.clearProgressTimer();

        this.progressDialog.close();

        this.isProcessing =
            false;

        this.cdr.detectChanges();

        done();
    }

    private clearProgressTimer():
        void
    {
        if
        (
            this.progressTimer
        )
        {
            clearInterval(
                this.progressTimer
            );

            this.progressTimer =
                undefined;
        }
    }

    //===========================================================
    // Minimum Progress Duration
    //===========================================================

    private withMinimumDuration<T>
    (
        source$:
            Observable<T>
    ):
        Observable<T>
    {
        return defer(
            () =>
            {
                const startedAt:
                    number =
                    Date.now();

                const remaining =
                    (): number =>
                        Math.max(
                            0,
                            this.MIN_PROGRESS_MS - (Date.now() - startedAt)
                        );

                return source$.pipe(
                    delayWhen(
                        () =>
                            timer(remaining())
                    ),

                    catchError(
                        error =>
                            timer(remaining()).pipe(
                                switchMap(
                                    () =>
                                        throwError(() => error)
                                )
                            )
                    )
                );
            }
        );
    }

    //===========================================================
    // Extract Error Message
    //===========================================================

    private extractErrorMessage
    (
        error:
            HttpErrorResponse,
        fallback:
            string
    ):
        string
    {
        if
        (
            typeof error.error === 'string'
            &&
            error.error.trim()
        )
        {
            return error.error;
        }

        if
        (
            error.error?.message
        )
        {
            return error.error.message;
        }

        if
        (
            error.error?.title
        )
        {
            return error.error.title;
        }

        return fallback;
    }

    //===========================================================
    // Open History
    //===========================================================

    openHistory():
        void
    {
        this.systemConfigurationsService
            .getHistory()
            .subscribe
            ({
                next:
                (
                    response:
                        any[]
                ):
                    void =>
                {
                    this.historyItems =
                        (response ?? []).map
                        (
                            history =>
                            ({
                                title:
                                    readField(history, 'ActivityTitle'),

                                description:
                                    readField(history, 'ActivityDescription'),

                                user:
                                    readField(history, 'PerformedByName')
                                    ??
                                    'System',

                                dateTime:
                                    new Date(
                                        readField(history, 'PerformedDate')
                                    )
                                    .toLocaleString(),

                                badge:
                                    readField(history, 'ActivityType')
                            })
                        );

                    this.historyTitle =
                        'System Configuration History';

                    this.historyOpened =
                        true;

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error(
                        'History Load Failed:',
                        error
                    );

                    this.toast.error(
                        'History',
                        'Failed to load configuration history.'
                    );
                }
            });
    }

    //===========================================================
    // Close History
    //===========================================================

    closeHistory():
        void
    {
        this.historyOpened =
            false;
    }
}