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
    CommandCenterComponent
}
from '../../../../../shared/components/utilities/command-center/command-center';

import
{
    TextboxComponent
}
from '../../../../../shared/components/controls/textbox/textbox';

import
{
    OrbitLoaderComponent
}
from '../../../../../shared/components/utilities/orbit-loader/orbit-loader';

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
    ProgressRunner
}
from '../../../../../shared/components/utilities/progress-dialog/progress-runner';

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
    BackupCenter,
    BackupCenterItem
}
from '../../models/backup-center.model';

import
{
    BackupCenterService
}
from '../../services/backup-center.service';


//===============================================================
// Backup Center (Settings > General Settings, client side)
//
//   Status card : the nightly backup (last run, next run, where it
//   is saved, how long backups are kept), red when last night's
//   run failed or no backup for over a day.
//   Backup Now : only with the page activity "Take Backup"
//   (checked again by the API); kind Client.
//   Last 10 backups of the App database, read only : no restore,
//   delete, download or folders (developer pages only).
//===============================================================

@Component(
{
    selector:'backup-center',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageCanvasComponent,
        PaginationComponent,
        CommandCenterComponent,
        TextboxComponent,
        OrbitLoaderComponent,
        ProgressDialogComponent,
        ToastComponent
    ],

    templateUrl:'./backup-center.html',

    styleUrl:'./backup-center.css'
})
export class BackupCenterPage
    implements OnInit
{
    private readonly service =
        inject(BackupCenterService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly progress =
        new ProgressRunner(inject(ProgressDialogService), () => this.refreshView());

    loading = true;

    denied = '';

    data: BackupCenter | null = null;

    // Backup Now modal
    backupOpen = false;

    backupNote = '';

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

    ngOnInit():
        void
    {
        this.load();
    }

    refresh():
        void
    {
        this.currentPage = 1;
        this.load();
    }

    private load():
        void
    {
        this.loading = true;
        this.refreshView();

        this.service
            .get()
            .subscribe(
            {
                next:data =>
                {
                    this.data = data;
                    this.denied = '';
                    this.loading = false;
                    this.refreshView();
                },
                error:error =>
                {
                    this.loading = false;

                    if (error?.status === 403)
                    {
                        this.denied = error?.error?.message || 'You cannot open the Backup Center.';
                    }
                    else
                    {
                        this.toast.error('Backup Center', error?.error?.message || 'The backup status could not be loaded.');
                    }

                    this.refreshView();
                }
            });
    }

    //===========================================================
    // Status
    //===========================================================

    get state():
        'ok' | 'failed' | 'off' | 'pending'
    {
        const nightly =
            this.data?.Nightly;

        if (!nightly || !nightly.Enabled)
        {
            return 'off';
        }

        if (nightly.Failing)
        {
            return 'failed';
        }

        return nightly.LastSuccessDate ? 'ok' : 'pending';
    }

    get stateTitle():
        string
    {
        switch (this.state)
        {
            case 'ok': return 'Your data is backed up every night';
            case 'failed': return this.data?.Nightly?.LastStatus === 'Failed' ? 'Last night\'s backup failed' : 'No recent backup';
            case 'pending': return 'The first nightly backup has not run yet';
            default: return 'Nightly backup is turned off';
        }
    }

    get stateHint():
        string
    {
        switch (this.state)
        {
            case 'failed': return 'Take a backup now and tell your AppCore support.';
            case 'off': return 'Ask your AppCore support to turn it on.';
            default: return '';
        }
    }

    get backups():
        BackupCenterItem[]
    {
        return this.data?.Backups ?? [];
    }

    get pagedBackups():
        BackupCenterItem[]
    {
        const start =
            (this.currentPage - 1) * this.pageSize;

        return this.backups.slice(start, start + this.pageSize);
    }

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

    //===========================================================
    // Backup Now
    //===========================================================

    openBackup():
        void
    {
        if (!this.data?.CanTakeBackup || this.progress.busy)
        {
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
        this.backupOpen = false;
        this.refreshView();

        this.progress
            .run(
                'Backup Center',
                'Taking a backup of your data ...',
                'Backup saved.',
                this.service.backup(this.backupNote.trim()))
            .subscribe(
            {
                next:result =>
                {
                    if (result.Warning)
                    {
                        this.toast.warning('Backup saved', result.Warning);
                    }
                    else
                    {
                        this.toast.success('Backup saved', `${this.formatBytes(result.SizeBytes)} · saved on ${result.SavedOnBothPcs ? 'both PCs' : 'this PC'}.`);
                    }

                    this.load();
                },
                error:error =>
                {
                    this.toast.error('Backup failed', error?.error?.message || 'The backup could not be taken.');
                    this.refreshView();
                }
            });
    }

    //===========================================================
    // Formatting
    //===========================================================

    formatDateTime
    (
        iso: string | null | undefined
    ):
        string
    {
        if (!iso)
        {
            return '-';
        }

        const date =
            new Date(iso);

        if (isNaN(date.getTime()))
        {
            return String(iso);
        }

        const months =
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const pad =
            (n: number) => String(n).padStart(2, '0');

        return `${pad(date.getDate())}-${months[date.getMonth()]}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    formatBytes
    (
        bytes: number
    ):
        string
    {
        const value =
            Number(bytes) || 0;

        return value >= 1024 * 1024
            ? `${(value / 1024 / 1024).toFixed(1)} MB`
            : `${Math.max(1, Math.round(value / 1024)).toLocaleString('en-US')} KB`;
    }

    private refreshView():
        void
    {
        this.cdr.markForCheck();
        this.cdr.detectChanges();
    }
}
