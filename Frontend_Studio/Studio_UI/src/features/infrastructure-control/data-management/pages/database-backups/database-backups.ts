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
    SearchBoxComponent
}
from '../../../../../shared/components/utilities/search-box/search-box';

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
    CheckboxComponent
}
from '../../../../../shared/components/utilities/checkbox/checkbox';

import
{
    TextareaComponent
}
from '../../../../../shared/components/controls/textarea/textarea';

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
    DataBackup,
    DataConnection,
    DataServerInfo,
    BACKUP_KINDS,
    DataSettings,
    DataStatus,
    apiError,
    connectionLabel,
    formatBytes,
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

type DeleteWhere =
    'this' | 'other' | 'both';


//===============================================================
// Database Backups
//
//   Database dropdown (the API's connection strings) · status of
//   the tools and both folders · Backup Now · list of backups on
//   both PCs (Download, Copy to the other PC, Restore, Delete) ·
//   Settings (folders, keep count, tools folder).
//   Only role RP-001 AppCore Admin (checked by the API).
//===============================================================

@Component(
{
    selector:'database-backups',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        CommandCenterComponent,
        SearchBoxComponent,
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

    templateUrl:'./database-backups.html',

    styleUrl:'./database-backups.css'
})
export class DatabaseBackupsPage
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

    // List canvas (same contract as the other list pages)
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

    currentPage = 1;

    pageSize = 10;

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
                this.progressDialog.show('Database Backups', this.busyText, false);
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
            Math.max(0, this.busyOpenedAt + DatabaseBackupsPage.MinimumBusyMs - Date.now());

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
                    }, DatabaseBackupsPage.HoldMs);
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
                    DatabaseBackupsPage.CeilingPercent * (1 - Math.exp(-elapsed / 2000));

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

    server: DataServerInfo | null = null;

    backups: DataBackup[] = [];

    connectionName = '';

    searchText = '';

    // Settings panel
    settingsOpen = false;

    settings: DataSettings =
    {
        ThisPcFolder:'',
        OtherPcFolder:'',
        KeepCount:0,
        ToolsFolder:'',
        NightlyEnabled:true,
        NightlyTime:'00:30',
        KeepNightly:14,
        KeepWeekly:8,
        KeepMonthly:12
    };

    // Kind filter ('' = all)
    kindFilter = '';

    readonly kindItems:
        Option[] =
        [
            { label:'All kinds', value:'' },
            ...BACKUP_KINDS.map(x => ({ label:x, value:x }))
        ];

    // Backup modal
    backupOpen = false;

    backupNote = '';

    // Restore modal
    restoreItem: DataBackup | null = null;

    restoreTarget = '';

    restoreConfirm = '';

    restoreReason = '';

    // Delete modal
    deleteItem: DataBackup | null = null;

    deleteWhere: DeleteWhere = 'this';

    readonly formatBytes = formatBytes;

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

                    this.loadAll();
                },
                error:() =>
                {
                    this.allowed = false;
                    this.loading = false;
                    this.refreshView();
                }
            });
    }

    //===========================================================
    // Loading
    //===========================================================

    refresh():
        void
    {
        if (!this.allowed)
        {
            return;
        }

        this.searchText = '';
        this.loadAll();
    }

    private loadAll():
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
                    this.settings = { ...status.Settings };

                    if (!status.Connections.some(x => x.Name === this.connectionName))
                    {
                        this.connectionName = status.Connections[0]?.Name ?? '';
                    }

                    this.loadServer();
                    this.loadBackups();
                },
                error:error =>
                {
                    this.loading = false;
                    this.toast.error('Data Management', apiError(error, 'The status could not be loaded.'));
                    this.refreshView();
                }
            });
    }

    private loadBackups():
        void
    {
        this.service
            .backups()
            .subscribe(
            {
                next:list =>
                {
                    this.backups = list;
                    this.loading = false;
                    this.refreshView();
                },
                error:error =>
                {
                    this.loading = false;
                    this.toast.error('Backups', apiError(error, 'The backups could not be listed.'));
                    this.refreshView();
                }
            });
    }

    private loadServer():
        void
    {
        this.server = null;

        if (!this.connectionName)
        {
            return;
        }

        const name =
            this.connectionName;

        this.service
            .serverInfo(name)
            .subscribe(
            {
                next:info =>
                {
                    if (name === this.connectionName)
                    {
                        this.server = info;
                        this.refreshView();
                    }
                },
                error:() =>
                {
                    this.server = null;
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
        this.connectionName = String(value ?? '');
        this.loadServer();
        this.refreshView();
    }

    connectionText
    (
        name: string
    ):
        string
    {
        const connection =
            this.connections.find(x => x.Name === name);

        return connection
            ? (connection.IsAppDatabase ? 'App database' : connection.Name.replace(/Connection$/i, ''))
            : name;
    }

    //===========================================================
    // List
    //===========================================================

    get visibleBackups():
        DataBackup[]
    {
        const text =
            this.searchText.trim().toLowerCase();

        const list =
            this.kindFilter
                ? this.backups.filter(x => x.Kind === this.kindFilter)
                : this.backups;

        if (!text)
        {
            return list;
        }

        return list.filter(x =>
            [x.FileName, x.Database, x.ConnectionName, x.Kind, x.Note, x.TakenBy]
                .join(' ')
                .toLowerCase()
                .includes(text));
    }

    onSearch
    (
        value: string
    ):
        void
    {
        this.searchText = value ?? '';
        this.currentPage = 1;
        this.refreshView();
    }

    get canBackup():
        boolean
    {
        return !!this.status?.ToolsFound
            && !!this.status?.ThisPcFolderOk
            && !!this.connectionName
            && !this.busy;
    }

    // \\SkyHost\AppCore_Backups -> SkyHost
    get otherPcName():
        string
    {
        const folder =
            this.status?.Settings?.OtherPcFolder ?? '';

        const match =
            /^\\\\([^\\]+)/.exec(folder);

        return match ? match[1] : folder;
    }

    get toolsOlderThanServer():
        boolean
    {
        return !!this.status?.ToolsFound
            && !!this.server?.Reachable
            && (this.status?.ToolsMajor ?? 0) < (this.server?.Major ?? 0);
    }

    //===========================================================
    // Backup Now
    //===========================================================

    openBackup():
        void
    {
        if (!this.canBackup)
        {
            this.toast.warning('Backup', this.status?.ToolsFound ? 'Check the folder on this PC (Settings).' : (this.status?.ToolsMessage || 'pg_dump was not found.'));
            return;
        }

        this.backupNote = '';
        this.backupOpen = true;
        this.refreshView();
    }

    closeBackup():
        void
    {
        this.backupOpen = false;
        this.refreshView();
    }

    runBackup():
        void
    {
        const connection =
            this.selectedConnection;

        if (!connection)
        {
            return;
        }

        this.backupOpen = false;
        this.busy = `Backing up ${connection.Database} ...`;
        this.refreshView();

        this.service
            .backup(connection.Name, this.backupNote.trim())
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
                            this.toast.success('Backup done', `${result.Backup.FileName} (${formatBytes(result.Backup.SizeBytes)})`);
                        }

                        this.loadBackups();
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
    // Download / copy
    //===========================================================

    download
    (
        item: DataBackup
    ):
        void
    {
        this.busy = `Downloading ${item.FileName} ...`;
        this.refreshView();

        this.service
            .download(item.FileName)
            .subscribe(
            {
                next:blob =>
                {
                    this.endBusy(() =>
                    {

                        const url =
                            URL.createObjectURL(blob);

                        const link =
                            document.createElement('a');

                        link.href = url;
                        link.download = item.FileName;
                        document.body.appendChild(link);
                        link.click();
                        link.remove();

                        setTimeout(() => URL.revokeObjectURL(url), 2000);

                        this.refreshView();
                    });
                },
                error:error =>
                {
                    this.endBusy(() =>
                    {
                        this.toast.error('Download', apiError(error, 'The file could not be downloaded.'));
                        this.refreshView();
                    });
                }
            });
    }

    canCopy
    (
        item: DataBackup
    ):
        boolean
    {
        return !!this.status?.OtherPcFolderSet && item.OnThisPc !== item.OnOtherPc;
    }

    copy
    (
        item: DataBackup
    ):
        void
    {
        this.busy = item.OnThisPc
            ? 'Copying to the other PC ...'
            : 'Copying back to this PC ...';

        this.refreshView();

        this.service
            .copy(item.FileName)
            .subscribe(
            {
                next:() =>
                {
                    this.endBusy(() =>
                    {
                        this.toast.success('Copied', `${item.FileName} is on both PCs now.`);
                        this.loadBackups();
                    });
                },
                error:error =>
                {
                    this.endBusy(() =>
                    {
                        this.toast.error('Copy failed', apiError(error, 'The file could not be copied.'));
                        this.refreshView();
                    });
                }
            });
    }

    //===========================================================
    // Restore
    //===========================================================

    openRestore
    (
        item: DataBackup
    ):
        void
    {
        if (!this.status?.ToolsFound)
        {
            this.toast.warning('Restore', this.status?.ToolsMessage || 'pg_restore was not found.');
            return;
        }

        this.restoreItem = item;

        this.restoreTarget =
            this.connections.some(x => x.Name === item.ConnectionName)
                ? item.ConnectionName
                : this.connectionName;

        this.restoreConfirm = '';
        this.restoreReason = '';
        this.refreshView();
    }

    closeRestore():
        void
    {
        this.restoreItem = null;
        this.refreshView();
    }

    get restoreConnection():
        DataConnection | null
    {
        return this.connections.find(x => x.Name === this.restoreTarget) ?? null;
    }

    onRestoreTargetChange
    (
        value: any
    ):
        void
    {
        this.restoreTarget = String(value ?? '');
        this.restoreConfirm = '';
        this.refreshView();
    }

    get restoreReady():
        boolean
    {
        const connection =
            this.restoreConnection;

        return !!connection
            && this.restoreConfirm.trim() === connection.Database
            && this.restoreReason.trim().length > 0;
    }

    runRestore():
        void
    {
        const item =
            this.restoreItem;

        const connection =
            this.restoreConnection;

        if (!item || !connection || !this.restoreReady)
        {
            return;
        }

        this.restoreItem = null;
        this.busy = `Backing up ${connection.Database} first, then restoring ...`;
        this.refreshView();

        this.service
            .restore(item.FileName, connection.Name, this.restoreConfirm.trim(), this.restoreReason.trim())
            .subscribe(
            {
                next:result =>
                {
                    this.endBusy(() =>
                    {
                        this.toast.success('Restore done', result.Message);
                        this.loadAll();
                    });
                },
                error:error =>
                {
                    this.endBusy(() =>
                    {
                        this.toast.error('Restore failed', apiError(error, 'The database could not be restored.'));
                        this.loadBackups();
                    });
                }
            });
    }

    //===========================================================
    // Delete
    //===========================================================

    openDelete
    (
        item: DataBackup
    ):
        void
    {
        this.deleteItem = item;

        this.deleteWhere =
            item.OnThisPc && item.OnOtherPc
                ? 'both'
                : item.OnThisPc ? 'this' : 'other';

        this.refreshView();
    }

    closeDelete():
        void
    {
        this.deleteItem = null;
        this.refreshView();
    }

    setDeleteWhere
    (
        where: DeleteWhere
    ):
        void
    {
        this.deleteWhere = where;
        this.refreshView();
    }

    runDelete():
        void
    {
        const item =
            this.deleteItem;

        if (!item)
        {
            return;
        }

        this.deleteItem = null;
        this.busy = 'Deleting ...';
        this.refreshView();

        this.service
            .remove(item.FileName, this.deleteWhere)
            .subscribe(
            {
                next:() =>
                {
                    this.endBusy(() =>
                    {
                        this.toast.success('Deleted', item.FileName);
                        this.loadBackups();
                    });
                },
                error:error =>
                {
                    this.endBusy(() =>
                    {
                        this.toast.error('Delete failed', apiError(error, 'The backup could not be deleted.'));
                        this.refreshView();
                    });
                }
            });
    }

    //===========================================================
    // Settings
    //===========================================================

    toggleSettings():
        void
    {
        if (!this.allowed)
        {
            return;
        }

        this.settingsOpen = !this.settingsOpen;

        if (this.settingsOpen && this.status)
        {
            this.settings = { ...this.status.Settings };
        }

        this.refreshView();
    }

    onSettingText
    (
        field: 'ThisPcFolder' | 'OtherPcFolder' | 'ToolsFolder',
        value: any
    ):
        void
    {
        this.settings = { ...this.settings, [field]:String(value ?? '') };
    }

    onKeep
    (
        field: 'KeepNightly' | 'KeepWeekly' | 'KeepMonthly',
        value: any
    ):
        void
    {
        const number =
            parseInt(String(value ?? '').replace(/[^0-9]/g, ''), 10);

        this.settings = { ...this.settings, [field]:isNaN(number) ? 1 : Math.max(1, number) };
    }

    onNightlyEnabled
    (
        on: boolean
    ):
        void
    {
        this.settings = { ...this.settings, NightlyEnabled:on };
        this.refreshView();
    }

    onNightlyTime
    (
        value: any
    ):
        void
    {
        this.settings = { ...this.settings, NightlyTime:String(value ?? '').trim() };
    }

    onKindFilter
    (
        value: any
    ):
        void
    {
        this.kindFilter = String(value ?? '');
        this.currentPage = 1;
        this.refreshView();
    }

    // Toolbar : nightly status text
    get nightlyText():
        string
    {
        const nightly =
            this.status?.Nightly;

        if (!nightly)
        {
            return '';
        }

        if (!nightly.Enabled)
        {
            return 'Off';
        }

        if (nightly.Failing)
        {
            return nightly.LastStatus === 'Failed' ? 'Last run failed' : 'Overdue';
        }

        const last =
            nightly.LastSuccessDate ? formatDateTime(nightly.LastSuccessDate) : 'not run yet';

        return `${last} · next ${nightly.NextRun ? formatDateTime(nightly.NextRun) : nightly.Time}`;
    }

    onKeepCount
    (
        value: any
    ):
        void
    {
        const number =
            parseInt(String(value ?? '').replace(/[^0-9]/g, ''), 10);

        this.settings = { ...this.settings, KeepCount:isNaN(number) ? 0 : number };
    }

    saveSettings():
        void
    {
        this.busy = 'Saving settings ...';
        this.refreshView();

        this.service
            .saveSettings(this.settings)
            .subscribe(
            {
                next:status =>
                {
                    this.endBusy(() =>
                    {
                        this.status = status;
                        this.settings = { ...status.Settings };
                        this.settingsOpen = false;
                        this.toast.success('Settings saved', 'Folders and tools checked again.');
                        this.loadBackups();
                    });
                },
                error:error =>
                {
                    this.endBusy(() =>
                    {
                        this.toast.error('Settings', apiError(error, 'The settings could not be saved.'));
                        this.refreshView();
                    });
                }
            });
    }

    //===========================================================
    // Pagination
    //===========================================================

    onPageChange
    (
        page: number
    ):
        void
    {
        this.currentPage = page;
        this.refreshView();
    }

    onPageSizeChange
    (
        size: number
    ):
        void
    {
        this.pageSize = size;
        this.currentPage = 1;
        this.refreshView();
    }

    get pagedBackups():
        DataBackup[]
    {
        const list =
            this.visibleBackups;

        const pages =
            Math.max(1, Math.ceil(list.length / this.pageSize));

        if (this.currentPage > pages)
        {
            this.currentPage = pages;
        }

        const start =
            (this.currentPage - 1) * this.pageSize;

        return list.slice(start, start + this.pageSize);
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
