//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
    DestroyRef,
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
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import { PageHeaderComponent } from '../../../../shared/components/layout/page-header/page-header';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../shared/components/layout/page-canvas/page-canvas';
import { DropdownComponent } from '../../../../shared/components/controls/dropdown/dropdown';
import { TextboxComponent } from '../../../../shared/components/controls/textbox/textbox';
import { CommandCenterComponent } from '../../../../shared/components/utilities/command-center/command-center';
import { HistoryDrawerComponent } from '../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../shared/components/utilities/toast/toast.service';
import { ProgressDialogComponent } from '../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../human-resource-manangement/services/hr-progress.service';

import { FaService } from '../../shared/fa.service';

import
{
    FaConfiguration
}
from '../../shared/fa.models';


type SwitchField =
    'requireLocation' | 'requireCustodian' | 'allowAssetRule' | 'allowRunningMonth';


//===============================================================
// Asset Configuration (Fixed Assets > Asset Setup)
//
// The one configuration record of the module : the rules of an
// asset card and how an asset number is made. No list, no add :
// whatever the URL says, the page shows the one form.
//===============================================================

@Component(
{
    selector:'asset-configuration',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageCanvasComponent,
        DropdownComponent,
        TextboxComponent,
        CommandCenterComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./asset-configuration.html',
    styleUrl:'./asset-configuration.css'
})
export class AssetConfigurationPage
implements OnInit
{
    private readonly fa = inject(FaService);

    private readonly toast = inject(ToastService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    loading =
        false;

    // true once the configuration is on the page (Save works)
    loaded =
        false;

    isSaving =
        false;

    readonly formConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:false,
        reserveFooterSpace:false,
        bodyScrollable:true,
        fixedHeight:true
    };

    historyOpened =
        false;

    historyItems:
        any[] = [];

    //===========================================================
    // Form
    //===========================================================

    requireLocation =
        false;

    requireCustodian =
        false;

    allowAssetRule =
        false;

    allowRunningMonth =
        false;

    prefix =
        'FA';

    digits =
        5;

    readonly digitItems =
        [3, 4, 5, 6, 7, 8].map(x => ({ label:`${x} digits`, value:x }));

    // FA-01-003-00001
    get previewText(): string
    {
        const prefix = this.prefix.trim().toUpperCase();

        return `${prefix ? prefix + '-' : ''}01-003-${'1'.padStart(this.digits, '0')}`;
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.load();
    }

    load():
        void
    {
        this.loading = true;
        this.cdr.detectChanges();

        this.fa
            .getConfiguration()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:c =>
                {
                    const digits = Math.round(Number(c?.AssetNoDigits) || 5);

                    this.requireLocation = !!c?.RequireLocation;
                    this.requireCustodian = !!c?.RequireCustodian;
                    this.allowAssetRule = !!c?.AllowAssetRule;
                    this.allowRunningMonth = !!c?.AllowRunningMonth;
                    this.prefix = String(c?.AssetNoPrefix ?? '');
                    this.digits = Math.min(8, Math.max(3, digits));
                    this.loading = false;
                    this.loaded = true;
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.toast.error('Error', error?.error?.message ?? 'The asset configuration could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    openHistory():
        void
    {
        this.fa
            .getHistory('asset-setup/asset-configuration')
            .subscribe(
            {
                next:items =>
                {
                    this.historyItems = items;
                    this.historyOpened = true;
                    this.cdr.detectChanges();
                },
                error:() => this.toast.error('Error', 'The history could not be loaded.')
            });
    }

    closeHistory():
        void
    {
        this.historyOpened = false;
        this.cdr.detectChanges();
    }

    //===========================================================
    // Form
    //===========================================================

    onSwitch(field: SwitchField, event: Event):
        void
    {
        this[field] = (event.target as HTMLInputElement).checked;
        this.cdr.detectChanges();
    }

    onPrefix(value: any):
        void
    {
        this.prefix = String(value ?? '').toUpperCase();
        this.cdr.detectChanges();
    }

    onDigits(value: any):
        void
    {
        this.digits = Math.min(8, Math.max(3, Math.round(Number(value) || 5)));
        this.cdr.detectChanges();
    }

    onSave():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        if (!this.loaded)
        {
            this.toast.error('Error', 'The asset configuration is not loaded. Press Refresh first.');
            return;
        }

        const prefix =
            this.prefix.trim().toUpperCase();

        if (!/^[A-Z0-9]{1,10}$/.test(prefix))
        {
            this.toast.error('Validation', 'The prefix must be 1 to 10 letters or digits, with no space or sign.');
            return;
        }

        const body: FaConfiguration =
        {
            RequireLocation:this.requireLocation,
            RequireCustodian:this.requireCustodian,
            AllowAssetRule:this.allowAssetRule,
            AllowRunningMonth:this.allowRunningMonth,
            AssetNoPrefix:prefix,
            AssetNoDigits:this.digits
        };

        this.isSaving = true;

        this.progressDialog.show('Saving', 'Saving the asset configuration...', false);

        this.fa.saveConfiguration(body).subscribe(
        {
            next:() =>
                this.progressDialog.finish(() =>
                {
                    this.isSaving = false;
                    this.toast.success('Success', 'The asset configuration was saved.');
                    this.load();
                }),
            error:error =>
            {
                this.progressDialog.fail();
                this.isSaving = false;
                this.toast.error('Error', error?.error?.message ?? 'The asset configuration could not be saved.');
                this.cdr.detectChanges();
            }
        });
    }
}
