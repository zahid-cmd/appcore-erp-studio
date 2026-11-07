//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    OnInit,
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
    PageHeaderComponent
}
from '../../../../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    CommandCenterComponent
}
from '../../../../../shared/components/utilities/command-center/command-center';

import
{
    SearchDropdownComponent
}
from '../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    TextboxComponent
}
from '../../../../../shared/components/controls/textbox/textbox';

import
{
    TextareaComponent
}
from '../../../../../shared/components/controls/textarea/textarea';

import
{
    CheckboxComponent
}
from '../../../../../shared/components/utilities/checkbox/checkbox';

import
{
    OrbitLoaderComponent
}
from '../../../../../shared/components/utilities/orbit-loader/orbit-loader';

import
{
    PageCanvasComponent,
    PageCanvasConfig
}
from '../../../../../shared/components/layout/page-canvas/page-canvas';

import
{
    PaginationComponent
}
from '../../../../../shared/components/controls/pagination/pagination';

import
{
    ProgressDialogComponent
}
from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

import
{
    ToastService
}
from '../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../shared/components/utilities/toast/toast';

import
{
    DataConnection,
    DataResetCatalog,
    DataResetGroup,
    DataResetPreview,
    DataResetRequest,
    DataStatus,
    apiError,
    connectionLabel,
    formatCount,
    formatDateTime
}
from '../../models/data-management.model';

import
{
    DataManagementService
}
from '../../services/data-management.service';


interface Option
{
    label: string;
    value: string;
}

const WALK_IN_KEY =
    'walk-in';

const SECTION_SETTINGS =
    'Settings';

// Settings areas, in menu order
const SETTINGS_AREAS =
[
    'Client Settings',
    'Product Settings',
    'Service Settings',
    'Membership Settings',
    'Account Settings',
    'General Settings'
];


//===============================================================
// Data Reset
//
//   Database dropdown · backup check (one of the last 30 minutes,
//   with Backup Now) · group cards : tick a group, or open it and
//   tick tables (live row counts) · Preview (rows per table,
//   tables pulled in, blocks) · Run (type the database name and a
//   reason; one transaction).
//
//   Two sections :
//     Operations : transactions and logs
//     Settings   : the Settings pages by area; customers /
//                  suppliers can be cleared "Test data only".
//                  Locked Settings pages are listed, never ticked.
//
//   Presets :
//     Fresh test start : every Operations group + walk-ins + the
//                        test data of customers / suppliers
//     Template clean   : every Operations group + every Settings
//                        group not kept in the template
//   Save as Template : a backup of kind "Template" (the base of a
//   new dealer's database).
//   AppCore Admin (RP-001) only.
//===============================================================

@Component(
{
    selector:'data-reset',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        CommandCenterComponent,
        SearchDropdownComponent,
        TextboxComponent,
        TextareaComponent,
        CheckboxComponent,
        OrbitLoaderComponent,
        PageCanvasComponent,
        PaginationComponent,
        ProgressDialogComponent,
        ToastComponent
    ],

    templateUrl:'./data-reset.html',

    styleUrls:
    [
        '../database-backups/database-backups.css',
        './data-reset.css'
    ]
})
export class DataResetPage
    implements OnInit
{
    private readonly service =
        inject(DataManagementService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    //===========================================================
    // State
    //===========================================================

    loading = true;

    allowed = false;

    private readonly progressDialog =
        inject(ProgressDialogService);

    // Long call running : the shared progress dialog shows it
    // (indeterminate; '' closes it)
    private busyText = '';

    get busy():
        string
    {
        return this.busyText;
    }

    // The dialog stays at least this long (no flash on fast calls)
    private static readonly MinimumBusyMs = 3000;

    private busyOpenedAt = 0;

    private busyCloseTimer?: ReturnType<typeof setTimeout>;

    // Progress shown while the call runs : creeps towards 90 %, then
    // 100 % with "Done" when it ends
    private busyTicker?: ReturnType<typeof setInterval>;

    private static readonly CeilingPercent = 90;

    private static readonly HoldMs = 500;

    set busy
    (
        value: string
    )
    {
        this.busyText = value ?? '';

        if (this.busyCloseTimer)
        {
            clearTimeout(this.busyCloseTimer);
            this.busyCloseTimer = undefined;
        }

        if (this.busyText)
        {
            const opening =
                !this.progressDialog.isOpen();

            if (opening)
            {
                this.busyOpenedAt = Date.now();
                this.progressDialog.show('Data Reset', this.busyText, false);
            }
            else
            {
                this.progressDialog.update(this.progressDialog.progress(), this.busyText);
            }

            this.startTicker();
            return;
        }

        // Keep it up for the minimum time, then 100 %, a short hold, close
        const wait =
            Math.max(0, this.busyOpenedAt + DataResetPage.MinimumBusyMs - Date.now());

        this.busyCloseTimer =
            setTimeout(() =>
            {
                this.stopTicker();
                this.progressDialog.update(100, 'Done.');

                this.busyCloseTimer =
                    setTimeout(() =>
                    {
                        this.busyCloseTimer = undefined;
                        this.progressDialog.close();
                        this.flushAfterBusy();
                    }, DataResetPage.HoldMs);
            }, wait);
    }

    private startTicker():
        void
    {
        if (this.busyTicker)
        {
            return;
        }

        this.busyTicker =
            setInterval(() =>
            {
                // 0 -> 90 % on an easing curve (about 75 % after 3 s)
                const elapsed =
                    Date.now() - this.busyOpenedAt;

                const value =
                    DataResetPage.CeilingPercent * (1 - Math.exp(-elapsed / 2000));

                this.progressDialog.update(Math.round(value));
            }, 100);
    }

    private stopTicker():
        void
    {
        if (this.busyTicker)
        {
            clearInterval(this.busyTicker);
            this.busyTicker = undefined;
        }
    }

    // What to do once the dialog has closed (open the preview, show
    // the result toast, reload ...)
    private afterBusy: Array<() => void> = [];

    private endBusy
    (
        then: () => void
    ):
        void
    {
        this.afterBusy.push(then);
        this.busy = '';
    }

    private flushAfterBusy():
        void
    {
        const queue =
            this.afterBusy;

        this.afterBusy = [];

        for (const action of queue)
        {
            action();
        }

        this.refreshView();
    }

    status: DataStatus | null = null;

    connectionName = '';

    catalog: DataResetCatalog | null = null;

    // Selected tables (exact names) and the walk-in flag
    selected = new Set<string>();

    walkIn = false;

    // Settings groups in "Test data only" mode (group keys)
    testData = new Set<string>();

    // Open group cards
    expanded = new Set<string>();

    preview: DataResetPreview | null = null;

    // Blocks notification panel (toolbar bell)
    blocksOpen = false;

    // Preview page (canvas + pagination)
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

    // Groups page : the groups scroll inside the canvas body, the
    // action bar is the canvas footer
    readonly groupsCanvasConfig:
        PageCanvasConfig =
    {
        mode:'form',
        showHeader:false,
        showFooter:true,
        reserveFooterSpace:true,
        bodyScrollable:false,
        fixedHeight:true
    };

    previewPage = 1;

    previewSize = 10;

    // Run modal
    runOpen = false;

    runConfirm = '';

    runReason = '';

    readonly formatCount = formatCount;

    readonly formatDateTime = formatDateTime;

    //===========================================================
    // Start
    //===========================================================

    ngOnInit():
        void
    {
        this.service
            .access()
            .subscribe(
            {
                next:allowed =>
                {
                    this.allowed = allowed;

                    if (!allowed)
                    {
                        this.loading = false;
                        this.refreshView();
                        return;
                    }

                    this.loadStatus();
                },
                error:() =>
                {
                    this.loading = false;
                    this.refreshView();
                }
            });
    }

    refresh():
        void
    {
        if (!this.allowed)
        {
            return;
        }

        this.clearSelection();
        this.loadStatus();
    }

    private loadStatus():
        void
    {
        this.loading = true;
        this.refreshView();

        this.service
            .status()
            .subscribe(
            {
                next:status =>
                {
                    this.status = status;

                    if (!status.Connections.some(x => x.Name === this.connectionName))
                    {
                        this.connectionName = status.Connections[0]?.Name ?? '';
                    }

                    this.loadCatalog();
                },
                error:error =>
                {
                    this.loading = false;
                    this.toast.error('Data Reset', apiError(error, 'The status could not be loaded.'));
                    this.refreshView();
                }
            });
    }

    private loadCatalog():
        void
    {
        if (!this.connectionName)
        {
            this.loading = false;
            this.refreshView();
            return;
        }

        this.loading = true;
        this.preview = null;
        this.refreshView();

        const name =
            this.connectionName;

        this.service
            .resetCatalog(name)
            .subscribe(
            {
                next:catalog =>
                {
                    if (name !== this.connectionName)
                    {
                        return;
                    }

                    this.catalog = catalog;

                    // keep only selections that still exist
                    const names =
                        new Set(catalog.Groups.flatMap(g => g.Tables.map(t => t.Name)));

                    this.selected =
                        new Set([...this.selected].filter(x => names.has(x)));

                    this.loading = false;
                    this.refreshView();

                    this.toastBackupState(catalog);
                },
                error:error =>
                {
                    this.catalog = null;
                    this.loading = false;
                    this.toast.error('Data Reset', apiError(error, 'The tables could not be read.'));
                    this.refreshView();
                }
            });
    }

    //===========================================================
    // Database
    //===========================================================

    get connections():
        DataConnection[]
    {
        return this.status?.Connections ?? [];
    }

    get connectionItems():
        Option[]
    {
        return this.connections.map(x =>
        ({
            label:connectionLabel(x),
            value:x.Name
        }));
    }

    get selectedConnection():
        DataConnection | null
    {
        return this.connections.find(x => x.Name === this.connectionName) ?? null;
    }

    onConnectionChange
    (
        value: any
    ):
        void
    {
        const next =
            String(value ?? '');

        if (next === this.connectionName)
        {
            return;
        }

        this.connectionName = next;
        this.clearSelection();
        this.loadCatalog();
    }

    //===========================================================
    // Groups / tables
    //===========================================================

    get groups():
        DataResetGroup[]
    {
        return this.catalog?.Groups ?? [];
    }

    get operationGroups():
        DataResetGroup[]
    {
        return this.groups.filter(x => x.Section !== SECTION_SETTINGS);
    }

    get settingsGroups():
        DataResetGroup[]
    {
        return this.groups.filter(x => x.Section === SECTION_SETTINGS);
    }

    // Settings groups by area (menu order; unknown areas last)
    get settingsAreas():
        { area: string; groups: DataResetGroup[] }[]
    {
        const areas =
            [
                ...SETTINGS_AREAS,
                ...this.settingsGroups
                    .map(x => x.Area)
                    .filter((x, i, all) => !SETTINGS_AREAS.includes(x) && all.indexOf(x) === i)
            ];

        return areas
            .map(area =>
            ({
                area,
                groups:this.settingsGroups.filter(x => x.Area === area)
            }))
            .filter(x => x.groups.length > 0);
    }

    get lockedPages():
        { Name: string; Reason: string }[]
    {
        return this.catalog?.Locked ?? [];
    }

    isTestData
    (
        group: DataResetGroup
    ):
        boolean
    {
        return this.testData.has(group.Key);
    }

    // "Test data only" on : the group's tables are not emptied,
    // only its rows with Remarks 'TEST DATA' go
    toggleTestData
    (
        group: DataResetGroup,
        on: boolean
    ):
        void
    {
        if (on)
        {
            this.testData.add(group.Key);

            for (const table of group.Tables)
            {
                this.selected.delete(table.Name);
            }

            this.selected = new Set(this.selected);
        }
        else
        {
            this.testData.delete(group.Key);
        }

        this.testData = new Set(this.testData);
        this.preview = null;
        this.refreshView();
    }

    groupRows
    (
        group: DataResetGroup
    ):
        number
    {
        return group.IsSpecial
            ? group.SpecialRows
            : group.Tables.reduce((sum, t) => sum + (t.Rows || 0), 0);
    }

    groupState
    (
        group: DataResetGroup
    ):
        'all' | 'some' | 'none'
    {
        if (group.IsSpecial)
        {
            return this.walkIn ? 'all' : 'none';
        }

        if (this.testData.has(group.Key))
        {
            return 'some';
        }

        const count =
            group.Tables.filter(t => this.selected.has(t.Name)).length;

        if (count === 0)
        {
            return 'none';
        }

        return count === group.Tables.length ? 'all' : 'some';
    }

    groupSelectedCount
    (
        group: DataResetGroup
    ):
        number
    {
        return group.Tables.filter(t => this.selected.has(t.Name)).length;
    }

    toggleGroup
    (
        group: DataResetGroup,
        on: boolean
    ):
        void
    {
        if (group.Key === WALK_IN_KEY || group.IsSpecial)
        {
            this.walkIn = on;
        }
        else
        {
            // The whole table replaces "Test data only"
            if (on)
            {
                this.testData.delete(group.Key);
                this.testData = new Set(this.testData);
            }

            for (const table of group.Tables)
            {
                if (on)
                {
                    this.selected.add(table.Name);
                }
                else
                {
                    this.selected.delete(table.Name);
                }
            }

            this.selected = new Set(this.selected);
        }

        this.preview = null;
        this.refreshView();
    }

    toggleTable
    (
        name: string,
        on: boolean
    ):
        void
    {
        if (on)
        {
            this.selected.add(name);

            // A ticked table replaces its group's "Test data only"
            const group =
                this.groups.find(g => g.Tables.some(t => t.Name === name));

            if (group && this.testData.delete(group.Key))
            {
                this.testData = new Set(this.testData);
            }
        }
        else
        {
            this.selected.delete(name);
        }

        this.selected = new Set(this.selected);
        this.preview = null;
        this.refreshView();
    }

    isExpanded
    (
        group: DataResetGroup
    ):
        boolean
    {
        return this.expanded.has(group.Key);
    }

    toggleExpand
    (
        group: DataResetGroup
    ):
        void
    {
        if (this.expanded.has(group.Key))
        {
            this.expanded.delete(group.Key);
        }
        else
        {
            this.expanded.add(group.Key);
        }

        this.expanded = new Set(this.expanded);
        this.refreshView();
    }

    // Every Operations group (Settings are ticked one by one or by
    // a preset)
    selectAll():
        void
    {
        for (const group of this.operationGroups)
        {
            this.toggleGroup(group, true);
        }
    }

    //===========================================================
    // Presets
    //===========================================================

    // Every Operations group + walk-ins + customers' / suppliers'
    // test data : test again with the same setup
    presetFreshTest():
        void
    {
        this.clearSelection();

        for (const group of this.operationGroups)
        {
            this.toggleGroup(group, true);
        }

        for (const group of this.settingsGroups.filter(x => x.SupportsTestData))
        {
            this.toggleTestData(group, true);
        }

        this.toast.info('Fresh test start', 'All transactions, walk-ins and the test data of customers / suppliers are ticked. Click Preview Reset.');
    }

    // Every Operations group + every Settings group not kept in the
    // template (locked pages and shared reference data stay)
    presetTemplateClean():
        void
    {
        this.clearSelection();

        for (const group of this.operationGroups)
        {
            this.toggleGroup(group, true);
        }

        for (const group of this.settingsGroups.filter(x => !x.KeepInTemplate))
        {
            this.toggleGroup(group, true);
        }

        this.toast.info('Template clean', 'All transactions and every Settings group not kept in the template are ticked. Click Preview Reset.');
    }

    //===========================================================
    // Save as Template : a backup of kind "Template"
    //===========================================================

    saveTemplate():
        void
    {
        const connection =
            this.selectedConnection;

        if (!connection || this.busy)
        {
            return;
        }

        this.busy = `Saving ${connection.Database} as the template ...`;
        this.refreshView();

        this.service
            .backup(connection.Name, 'Template for new dealers', true)
            .subscribe(
            {
                next:result =>
                {
                    this.endBusy(() =>
                    {
                        if (result.OtherPcMessage)
                        {
                            this.toast.warning('Template saved on this PC only', result.OtherPcMessage);
                        }
                        else
                        {
                            this.toast.success('Template saved', result.Backup.FileName);
                        }

                        this.loadCatalog();
                    });
                },
                error:error =>
                {
                    this.endBusy(() =>
                    {
                        this.toast.error('Save as Template', apiError(error, 'The template could not be saved.'));
                        this.refreshView();
                    });
                }
            });
    }

    // After a backup on the preview page : new backup state, same preview
    private refreshCatalogKeepPreview():
        void
    {
        this.service
            .resetCatalog(this.connectionName)
            .subscribe(
            {
                next:catalog =>
                {
                    this.catalog = catalog;
                    this.runPreview();
                },
                error:() =>
                {
                    this.runPreview();
                }
            });
    }

    clearSelection():
        void
    {
        this.selected = new Set<string>();
        this.walkIn = false;
        this.testData = new Set<string>();
        this.preview = null;
        this.refreshView();
    }

    get selectionCount():
        number
    {
        return this.selected.size + (this.walkIn ? 1 : 0) + this.testData.size;
    }

    // Test rows of the groups in "Test data only" mode
    get selectedTestRows():
        number
    {
        return this.groups
            .filter(x => this.testData.has(x.Key))
            .reduce((sum, x) => sum + (x.TestRows || 0), 0);
    }

    get selectedRows():
        number
    {
        let total = 0;

        for (const group of this.groups)
        {
            for (const table of group.Tables)
            {
                if (this.selected.has(table.Name))
                {
                    total += table.Rows || 0;
                }
            }
        }

        return total;
    }

    //===========================================================
    // Backup
    //===========================================================

    get backupFresh():
        boolean
    {
        return !!this.catalog?.BackupFresh;
    }

    // Backup state after the tables load (was an alert bar)
    private toastBackupState(catalog: any):
        void
    {
        if (catalog?.BackupFresh)
        {
            this.toast.info(
                'Backup ready',
                `${catalog.LastBackup?.FileName ?? ''} (${this.formatDateTime(catalog.LastBackup?.TakenDate)}).`);
        }
        else
        {
            this.toast.warning(
                'Backup needed',
                `A backup of ${catalog?.Database ?? 'this database'} from the last ${catalog?.FreshMinutes ?? ''} minutes is needed before a reset. Click Backup.`);
        }
    }

    // Preview state (was an alert bar under the preview)
    private toastPreviewState(preview: any):
        void
    {
        if (preview.Blocks.length > 0)
        {
            this.toast.warning(
                'Data Reset',
                `${preview.Blocks.length} block(s) stop this reset : see the notifications (bell) on the toolbar.`);
        }
        else if (!preview.BackupFresh)
        {
            this.toast.warning(
                'Backup needed',
                `Take a backup of ${this.catalog?.Database ?? 'this database'} first (one from the last ${this.catalog?.FreshMinutes ?? ''} minutes is needed).`);
        }
        else
        {
            this.toast.success(
                'Ready',
                `No blocks, backup ${this.catalog?.LastBackup?.FileName ?? ''}. Click Run Reset to clear.`);
        }
    }

    backupNow():
        void
    {
        const connection =
            this.selectedConnection;

        if (!connection)
        {
            return;
        }

        this.busy = `Backing up ${connection.Database} ...`;
        this.refreshView();

        this.service
            .backup(connection.Name, 'Before data reset')
            .subscribe(
            {
                next:result =>
                {
                    this.endBusy(() =>
                    {

                        if (result.OtherPcMessage)
                        {
                            this.toast.warning('Backup saved on this PC only', result.OtherPcMessage);
                        }
                        else
                        {
                            this.toast.success('Backup done', result.Backup.FileName);
                        }

                        if (this.preview)
                        {
                            this.refreshCatalogKeepPreview();
                        }
                        else
                        {
                            this.loadCatalog();
                        }
                    });
                },
                error:error =>
                {
                    this.endBusy(() =>
                    {
                        this.toast.error('Backup failed', apiError(error, 'The backup could not be taken.'));
                        this.refreshView();
                    });
                }
            });
    }

    //===========================================================
    // Preview
    //===========================================================

    private request():
        DataResetRequest
    {
        return {
            ConnectionName:this.connectionName,
            Tables:[...this.selected],
            WalkInCustomers:this.walkIn,
            TestDataGroups:[...this.testData]
        };
    }

    runPreview():
        void
    {
        if (this.selectionCount === 0)
        {
            this.toast.warning('Data Reset', 'Tick a group or a table first.');
            return;
        }

        this.busy = 'Checking the tables ...';
        this.refreshView();

        this.service
            .resetPreview(this.request())
            .subscribe(
            {
                next:preview =>
                {
                    this.endBusy(() =>
                    {
                        this.preview = preview;
                        this.previewPage = 1;

                        // Blocks : the notification opens by itself
                        this.blocksOpen = preview.Blocks.length > 0;

                        this.toastPreviewState(preview);

                        // tables pulled in become part of the selection
                        for (const table of preview.Tables.filter(x => x.AutoAdded))
                        {
                            this.selected.add(table.Name);
                        }

                        this.selected = new Set(this.selected);


                        this.refreshView();
                    });
                },
                error:error =>
                {
                    this.endBusy(() =>
                    {
                        this.toast.error('Preview', apiError(error, 'The preview could not be made.'));
                        this.refreshView();
                    });
                }
            });
    }

    get pagedPreview():
        DataResetPreview['Tables']
    {
        const list =
            this.preview?.Tables ?? [];

        const start =
            (this.previewPage - 1) * this.previewSize;

        return list.slice(start, start + this.previewSize);
    }

    onPreviewPage
    (
        page: number
    ):
        void
    {
        this.previewPage = page;
        this.refreshView();
    }

    onPreviewSize
    (
        size: number
    ):
        void
    {
        this.previewSize = size;
        this.previewPage = 1;
        this.refreshView();
    }

    closePreview():
        void
    {
        this.preview = null;
        this.blocksOpen = false;
        this.refreshView();
    }

    toggleBlocks():
        void
    {
        this.blocksOpen = !this.blocksOpen;
        this.refreshView();
    }

    closeBlocks():
        void
    {
        this.blocksOpen = false;
        this.refreshView();
    }

    // Groups to tick too so the blocks go
    get fixGroups():
        DataResetGroup[]
    {
        const keys =
            (this.preview?.Fixes ?? [])
                .filter(x => x.Fixable)
                .map(x => x.GroupKey);

        return this.groups.filter(g => keys.includes(g.Key));
    }

    // Kept tables no group can clear (e.g. a locked page)
    get fixKept():
        string[]
    {
        return (this.preview?.Fixes ?? [])
            .filter(x => !x.Fixable)
            .map(x => x.Name);
    }

    get fixNames():
        string
    {
        return this.fixGroups.map(g => g.Name).join(' · ');
    }

    // Tick the suggested groups, then Preview again (Run Reset
    // still asks for the typed confirmation)
    addFixes():
        void
    {
        const list =
            this.fixGroups;

        if (list.length === 0)
        {
            return;
        }

        for (const group of list)
        {
            this.toggleGroup(group, true);
        }

        this.blocksOpen = false;
        this.toast.info('Data Reset', `Added : ${list.map(g => g.Name).join(', ')}. Checking again ...`);
        this.runPreview();
    }

    groupName
    (
        key: string
    ):
        string
    {
        return this.groups.find(x => x.Key === key)?.Name ?? key;
    }

    //===========================================================
    // Run
    //===========================================================

    openRun():
        void
    {
        if (!this.preview)
        {
            return;
        }

        if (!this.preview.CanRun)
        {
            this.toast.warning(
                'Run Reset',
                this.preview.Blocks.length > 0
                    ? 'Fix the blocks shown on the preview first.'
                    : (this.preview.BackupFresh ? 'Nothing to clear.' : 'Take a backup first (Backup).'));
            return;
        }

        this.runConfirm = '';
        this.runReason = '';
        this.runOpen = true;
        this.refreshView();
    }

    closeRun():
        void
    {
        this.runOpen = false;
        this.refreshView();
    }

    get runReady():
        boolean
    {
        return !!this.selectedConnection
            && this.runConfirm.trim() === this.selectedConnection.Database
            && this.runReason.trim().length > 0;
    }

    run():
        void
    {
        if (!this.runReady)
        {
            return;
        }

        const request:
            DataResetRequest =
            {
                ...this.request(),
                ConfirmDatabase:this.runConfirm.trim(),
                Reason:this.runReason.trim()
            };

        this.runOpen = false;
        this.busy = `Clearing ${this.selectedConnection?.Database} ...`;
        this.refreshView();

        this.service
            .resetRun(request)
            .subscribe(
            {
                next:result =>
                {
                    this.endBusy(() =>
                    {

                        const extra =
                            [
                                result.ProductLedgersDeleted > 0 ? `${formatCount(result.ProductLedgersDeleted)} product ledgers` : '',
                                result.WalkInCustomersDeleted > 0 ? `${formatCount(result.WalkInCustomersDeleted)} walk-in customers` : '',
                                result.TestDataRowsDeleted > 0 ? `${formatCount(result.TestDataRowsDeleted)} test data rows` : '',
                                result.SettingsLedgersDeleted > 0 ? `${formatCount(result.SettingsLedgersDeleted)} settings ledgers` : '',
                                result.AccountGroupsDeleted + result.AccountSubGroupsDeleted > 0
                                    ? `${formatCount(result.AccountGroupsDeleted)} account groups / ${formatCount(result.AccountSubGroupsDeleted)} sub groups`
                                    : '',
                                result.Unlinked > 0 ? `${formatCount(result.Unlinked)} links cleared` : '',
                                (result.SequencesReset ?? 0) > 0 ? `${formatCount(result.SequencesReset ?? 0)} number counters reset` : ''
                            ]
                            .filter(x => !!x)
                            .join(', ');

                        this.toast.success(
                            'Reset done',
                            `${result.Tables.length} tables, ${formatCount(result.TotalRows)} rows cleared${extra ? ', ' + extra : ''}.`);

                        this.clearSelection();
                        this.loadCatalog();
                    });
                },
                error:error =>
                {
                    this.endBusy(() =>
                    {
                        this.toast.error('Reset failed', apiError(error, 'Nothing was changed.'));
                        this.refreshView();
                    });
                }
            });
    }

    //===========================================================
    // View
    //===========================================================

    private refreshView():
        void
    {
        this.cdr.markForCheck();
        this.cdr.detectChanges();
    }
}
