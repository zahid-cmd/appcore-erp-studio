//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    ChangeDetectorRef,
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
    ActivatedRoute,
    Router
}
from '@angular/router';

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { DatepickerComponent } from '../../../../../../shared/components/controls/datepicker/datepicker';
import { hrDateEvent, hrToDate } from '../../../../services/hr-date';
import { PageCanvasComponent } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { TextboxComponent } from '../../../../../../shared/components/controls/textbox/textbox';
import { DropdownComponent } from '../../../../../../shared/components/controls/dropdown/dropdown';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../../services/hr-progress.service';

import
{
    HR_SETUP_PAGES,
    HR_WEEK_DAYS,
    HrSetupField,
    HrSetupKey,
    HrSetupPage,
    HrSetupRow
}
from '../../../models/hr-setup.model';

import
{
    HrSetupService
}
from '../../../services/hr-setup.service';


//===============================================================
// Human Resource Setup Form : Shifts, Holidays, Leave Types and
// Salary Heads (the page comes from the route data 'hrSetup').
//
// Left : the fields of the page (models/hr-setup.model.ts) in
// three columns : Code, the name and Status first.
// Right : how the row is used by attendance and payroll.
//===============================================================

@Component(
{
    selector:'hr-setup-form',
    standalone:true,
    imports:
    [
        CommonModule,
        DatepickerComponent,
        PageHeaderComponent,
        PageCanvasComponent,
        CommandCenterComponent,
        TextboxComponent,
        DropdownComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./hr-setup-form.html',
    styleUrl:'./hr-setup-form.css'
})
export class HrSetupForm
implements OnInit
{
    // The shared date picker works with a Date; the page keeps
    // yyyy-MM-dd text
    readonly asDate = hrToDate;

    readonly dateEvent = hrDateEvent;

    private readonly service = inject(HrSetupService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    readonly weekDays =
        HR_WEEK_DAYS;

    readonly statusItems =
    [
        { label:'Active', value:true },
        { label:'Inactive', value:false }
    ];

    page:
        HrSetupPage =
        HR_SETUP_PAGES['shifts'];

    mode:
        'add' | 'edit' | 'view' =
        'add';

    entityId =
        '';

    entity:
        HrSetupRow =
        this.emptyEntity();

    isSaving =
        false;

    hasChanges =
        false;

    loading =
        false;

    private initialJson =
        '';

    get isViewMode(): boolean
    {
        return this.mode === 'view';
    }

    get pageTitle(): string
    {
        return this.mode === 'add'
            ? this.page.singular
            : this.mode === 'edit'
                ? `Update ${this.page.singular} ${this.entity.Code}`
                : `View ${this.page.singular} ${this.entity.Code}`;
    }

    get saveButtonText(): string
    {
        return this.mode === 'edit' ? 'Update' : 'Save';
    }

    get visibleFields(): HrSetupField[]
    {
        return this.page.fields.filter(f => !f.showWhen || f.showWhen(this.entity));
    }

    // The name : it sits between Code and Status
    get nameField(): HrSetupField | undefined
    {
        return this.page.fields.find(f => f.key === 'Name');
    }

    // The fields after the first row
    get otherFields(): HrSetupField[]
    {
        return this.visibleFields.filter(f => f.key !== 'Name');
    }

    get statusLocked(): boolean
    {
        return this.isViewMode || (!!this.page.statusLockedWhen && this.page.statusLockedWhen(this.entity));
    }

    // Part of the row is fixed (e.g. a salary head used by payroll)
    get partlyLocked(): boolean
    {
        return !this.isViewMode
            && (this.statusLocked || this.page.fields.some(f => !!f.lockedWhen && f.lockedWhen(this.entity)));
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        const key =
            this.route.snapshot.data['hrSetup'] as HrSetupKey;

        this.page =
            HR_SETUP_PAGES[key] ?? HR_SETUP_PAGES['shifts'];

        this.entity =
            this.emptyEntity();

        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/') ? 'view' : url.includes('/edit/') ? 'edit' : 'add';

        this.entityId =
            this.route.snapshot.paramMap.get('id') ?? '';

        if (this.entityId)
        {
            this.loading = true;

            this.service
                .getById(this.page, this.entityId)
                .subscribe(
                {
                    next:row =>
                    {
                        this.entity = row;
                        this.loading = false;
                        this.setInitialState();
                    },
                    error:error =>
                    {
                        this.loading = false;
                        this.toast.error('Error', error?.error?.message ?? `The ${this.page.singular.toLowerCase()} could not be loaded.`);
                        this.cdr.detectChanges();
                    }
                });
        }
        else
        {
            this.setInitialState();

            this.service
                .getNextCode(this.page)
                .subscribe(
                {
                    next:code =>
                    {
                        if (!this.entity.Code)
                        {
                            this.entity.Code = code;
                            this.initialJson = JSON.stringify(this.entity);
                            this.cdr.detectChanges();
                        }
                    },
                    error:() =>
                    {
                        // the code is given on save anyway
                    }
                });
        }
    }

    private today(): string
    {
        const now = new Date();

        const two =
            (value: number): string => String(value).padStart(2, '0');

        return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
    }

    private emptyEntity():
        HrSetupRow
    {
        const row:
            Record<string, any> =
        {
            PublicId:'',
            Code:'',
            Name:'',
            Remarks:'',
            IsActive:true
        };

        for (const field of this.page?.fields ?? [])
        {
            row[field.key] =
                field.type === 'date' && field.required ? this.today() : field.initial;
        }

        return row as HrSetupRow;
    }

    private setInitialState():
        void
    {
        this.initialJson = JSON.stringify(this.entity);
        this.hasChanges = false;
        this.cdr.detectChanges();
    }

    changed():
        void
    {
        this.hasChanges = JSON.stringify(this.entity) !== this.initialJson;
        this.cdr.detectChanges();
    }

    //===========================================================
    // Fields
    //===========================================================

    isLocked(field: HrSetupField): boolean
    {
        return this.isViewMode || (!!field.lockedWhen && field.lockedWhen(this.entity));
    }

    onText(field: HrSetupField, value: any):
        void
    {
        const text = String(value ?? '');

        this.entity[field.key] = field.upper ? text.toUpperCase() : text;
        this.changed();
    }

    onNumber(field: HrSetupField, value: any):
        void
    {
        const number =
            Number(String(value ?? '').replace(/,/g, ''));

        this.entity[field.key] =
            Number.isFinite(number)
                ? field.whole ? Math.trunc(number) : number
                : 0;

        this.changed();
    }

    onSelect(field: HrSetupField, value: any):
        void
    {
        this.entity[field.key] = String(value ?? '');
        this.changed();
    }

    // Native time / date input
    onNative(field: HrSetupField, event: Event):
        void
    {
        this.entity[field.key] = (event.target as HTMLInputElement).value ?? '';
        this.changed();
    }

    onSwitch(field: HrSetupField, event: Event):
        void
    {
        this.entity[field.key] = (event.target as HTMLInputElement).checked;
        this.changed();
    }

    onStatus(value: any):
        void
    {
        this.entity.IsActive = value === true || value === 'true';
        this.changed();
    }

    dayOn(field: HrSetupField, day: string): boolean
    {
        return String(this.entity[field.key] ?? '').split(',').includes(day);
    }

    toggleDay(field: HrSetupField, day: string):
        void
    {
        if (this.isLocked(field))
        {
            return;
        }

        const days =
            new Set(String(this.entity[field.key] ?? '').split(',').filter(Boolean));

        if (days.has(day))
        {
            days.delete(day);
        }
        else
        {
            days.add(day);
        }

        this.entity[field.key] =
            HR_WEEK_DAYS.filter(d => days.has(d)).join(',');

        this.changed();
    }

    //===========================================================
    // Save / Clear / Back
    //===========================================================

    private validate():
        string
    {
        for (const field of this.visibleFields)
        {
            if (field.required && !String(this.entity[field.key] ?? '').trim())
            {
                return `${field.label} is required.`;
            }
        }

        return this.page.validate ? this.page.validate(this.entity) : '';
    }

    onSave():
        void
    {
        if (this.isSaving || this.isViewMode)
        {
            return;
        }

        const problem =
            this.validate();

        if (problem)
        {
            this.toast.error('Validation', problem);
            return;
        }

        this.isSaving = true;

        this.progressDialog.show('Saving', `Saving the ${this.page.singular.toLowerCase()}...`, false);

        const done =
            (message: string) =>
            {
                this.progressDialog.finish(() =>
                {
                    this.isSaving = false;
                    this.setInitialState();
                    this.toast.success('Success', message);
                    this.goToList();
                });
            };

        const fail =
            (error: any) =>
            {
                this.progressDialog.fail();
                this.isSaving = false;
                this.toast.error('Error', error?.error?.message ?? `The ${this.page.singular.toLowerCase()} could not be saved.`);
                this.cdr.detectChanges();
            };

        if (this.mode === 'edit')
        {
            this.service
                .update(this.page, this.entityId, this.entity)
                .subscribe({ next:() => done(`${this.entity.Code} updated.`), error:fail });
        }
        else
        {
            this.service
                .create(this.page, this.entity)
                .subscribe({ next:row => done(`${row.Code} created.`), error:fail });
        }
    }

    onClear():
        void
    {
        if (this.isViewMode)
        {
            return;
        }

        this.confirmDialog.open(
            'Clear Form',
            'Clear every field of the form?',
            () =>
            {
                const kept = this.entity;

                this.entity = this.emptyEntity();
                this.entity.Code = kept.Code;
                this.entity.PublicId = kept.PublicId;

                // what is fixed on the row stays (e.g. a payroll head)
                for (const key of Object.keys(kept))
                {
                    const field = this.page.fields.find(f => f.key === key);

                    if (!field || (field.lockedWhen && field.lockedWhen(kept)))
                    {
                        this.entity[key] = kept[key];
                    }
                }

                this.entity.Name = '';
                this.entity.Remarks = '';

                this.changed();
            },
            'Clear',
            'Cancel',
            'primary');
    }

    private goToList():
        void
    {
        void this.router.navigate([`${this.page.route}/list`]);
    }

    onBackToList():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        if (!this.hasChanges || this.isViewMode)
        {
            this.goToList();
            return;
        }

        this.confirmDialog.open(
            'Cancel Changes',
            'Any unsaved changes will be lost. Do you want to leave this page?',
            () => this.goToList(),
            'Leave',
            'Stay',
            'primary');
    }
}
