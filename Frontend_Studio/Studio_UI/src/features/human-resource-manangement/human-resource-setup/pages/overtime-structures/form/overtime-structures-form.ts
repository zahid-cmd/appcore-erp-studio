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

import
{
    forkJoin,
    of
}
from 'rxjs';

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
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
    OVERTIME_BASES,
    OVERTIME_DAY_MODES,
    OvertimeStructure,
    emptyOvertimeStructure,
    overtimeAmount,
    overtimeMoney,
    overtimeNumber,
    overtimeRates
}
from '../../../models/overtime-structures.model';

import
{
    OvertimeStructuresService
}
from '../../../services/overtime-structures.service';


type NumberField =
    'FixedHourRate' | 'MonthDays' | 'HourMultiplier' | 'HolidayHourMultiplier' | 'DayMultiplier';


//===============================================================
// Overtime Structures Form (Human Resource Setup)
//
// Left : the structure (code, status, name, Default, remarks) and,
// under it, how the structure is used. The name is not typed :
// Overtime Structure - 1 / 2 / 3.
// Right : the rules in their own card : the rate (base, days in
// the month; the hours a day are those of the shift), the extra hours and the extra days,
// and an example worked out on a salary typed there.
//===============================================================

@Component(
{
    selector:'overtime-structures-form',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageCanvasComponent,
        CommandCenterComponent,
        TextboxComponent,
        DropdownComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./overtime-structures-form.html',
    styleUrl:'./overtime-structures-form.css'
})
export class OvertimeStructuresForm
implements OnInit
{
    private readonly service = inject(OvertimeStructuresService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    // The canvas keeps the height every page has (mode 'list' : the
    // stylesheet height; 'form' measures the page and came out
    // short). Only the empty footer strip goes : the two sides use
    // the whole height (no scrolling, no blank band).
    readonly canvasConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:false,
        reserveFooterSpace:false,
        bodyScrollable:true,
        fixedHeight:true
    };

    readonly statusItems =
    [
        { label:'Active', value:true },
        { label:'Inactive', value:false }
    ];

    mode:
        'add' | 'edit' | 'view' =
        'add';

    entityId =
        '';

    entity:
        OvertimeStructure =
        emptyOvertimeStructure();

    readonly baseItems = OVERTIME_BASES;

    readonly dayModeItems = OVERTIME_DAY_MODES;

    // The Default structure now, when it is another one ('' = none)
    otherDefault =
        '';

    // The hours a day are not typed : the working hours of the
    // employee's shift. Here : the first shift, for the example.
    shiftName =
        '';

    shiftHours =
        8;

    get shiftText(): string
    {
        return this.shiftName
            ? `${this.number(this.shiftHours)} hours  (${this.shiftName})`
            : `${this.number(this.shiftHours)} hours`;
    }

    // The example : a salary and a month
    // One of the two is filled : the rate is worked out on it (the
    // other box is blank and blocked). Basic for a structure on the
    // basic salary, Gross for one on the gross salary.
    exampleBasic =
        5000;

    exampleGross =
        0;

    // The structure as the example uses it : the rate on the box
    // that is filled
    private get exampleRule(): OvertimeStructure
    {
        return {
            ...this.entity,
            RateBase:this.isFixed ? 'Fixed' : this.exampleGross > 0 ? 'Gross' : 'Basic'
        };
    }

    get basicBlocked(): boolean
    {
        return this.isFixed || this.exampleGross > 0;
    }

    get grossBlocked(): boolean
    {
        return this.isFixed || this.exampleBasic > 0;
    }

    // The example follows the structure : Basic or Gross filled
    private exampleFor(rateBase: string):
        void
    {
        const amount =
            this.exampleBasic || this.exampleGross;

        if (rateBase === 'Gross')
        {
            this.exampleGross = amount || 10000;
            this.exampleBasic = 0;
        }
        else if (rateBase === 'Basic')
        {
            this.exampleBasic = amount || 5000;
            this.exampleGross = 0;
        }
    }

    readonly exampleMonthDays = 30;

    readonly exampleHours = 10;

    readonly exampleHolidayHours = 4;

    readonly exampleDays = 4;

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
            ? 'Overtime Structure'
            : this.mode === 'edit'
                ? `Update Overtime Structure`
                : `View Overtime Structure`;
    }

    get saveButtonText(): string
    {
        return this.mode === 'edit' ? 'Update' : 'Save';
    }

    get isFixed(): boolean
    {
        return this.entity.RateBase === 'Fixed';
    }

    get fixedDays(): boolean
    {
        return this.entity.MonthDaysMode !== 'Actual';
    }

    // The formula of the day rate, in words
    get dayFormula(): string
    {
        const e =
            this.entity;

        return this.isFixed
            ? `Tk ${this.money(e.FixedHourRate)} an hour x the shift's working hours`
            : `${e.RateBase} salary / ${this.fixedDays ? this.number(e.MonthDays) + ' days' : 'the days of the month'}`;
    }

    get hourFormula(): string
    {
        return this.isFixed
            ? 'typed'
            : "day rate / the shift's working hours";
    }

    private get rates(): { day: number; hour: number }
    {
        return overtimeRates(this.exampleRule, this.exampleBasic, this.exampleGross, this.exampleMonthDays, this.shiftHours);
    }

    get exampleDayRate(): string
    {
        return this.money(this.rates.day);
    }

    get exampleHourRate(): string
    {
        return this.money(this.rates.hour);
    }

    // 10 extra hours on working days
    get exampleHoursPay(): string
    {
        return this.money(overtimeAmount({ ...this.exampleRule, PayExtraDays:false }, this.exampleBasic, this.exampleGross, this.exampleMonthDays, this.shiftHours, this.exampleHours, 0, 0));
    }

    // 4 extra hours on a holiday
    get exampleHolidayPay(): string
    {
        return this.money(overtimeAmount({ ...this.exampleRule, PayExtraDays:false }, this.exampleBasic, this.exampleGross, this.exampleMonthDays, this.shiftHours, 0, this.exampleHolidayHours, 0));
    }

    // 4 extra days
    get exampleDaysPay(): string
    {
        return this.money(overtimeAmount({ ...this.exampleRule, PayExtraHours:false }, this.exampleBasic, this.exampleGross, this.exampleMonthDays, this.shiftHours, 0, 0, this.exampleDays));
    }

    get exampleTotal(): string
    {
        return this.money(overtimeAmount(this.exampleRule, this.exampleBasic, this.exampleGross, this.exampleMonthDays, this.shiftHours, this.exampleHours, this.exampleHolidayHours, this.exampleDays));
    }

    money(value: number): string
    {
        return overtimeMoney(value);
    }

    number(value: number): string
    {
        return overtimeNumber(value);
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/') ? 'view' : url.includes('/edit/') ? 'edit' : 'add';

        this.entityId =
            this.route.snapshot.paramMap.get('id') ?? '';

        this.loading = true;

        forkJoin(
        {
            defaults:this.service.getDefaults(),
            structure:this.entityId ? this.service.getById(this.entityId) : of(null)
        })
        .subscribe(
        {
            next:({ defaults, structure }) =>
            {
                if (structure)
                {
                    this.entity = structure;
                }
                else
                {
                    this.entity.Code = defaults.NextCode;
                    this.entity.Name = defaults.NextName;

                    // the first structure is the Default
                    this.entity.IsDefault = !defaults.DefaultCode;
                }

                this.exampleFor(this.entity.RateBase);

                this.shiftName = defaults.ShiftName;
                this.shiftHours = defaults.ShiftHours || 8;

                this.otherDefault =
                    defaults.DefaultCode && defaults.DefaultPublicId !== this.entity.PublicId
                        ? defaults.DefaultCode
                        : '';

                this.loading = false;
                this.setInitialState();
            },
            error:error =>
            {
                this.loading = false;
                this.toast.error('Error', error?.error?.message ?? 'The overtime structure could not be loaded.');
                this.cdr.detectChanges();
            }
        });
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

    onText(field: 'Remarks', value: any):
        void
    {
        this.entity[field] = String(value ?? '');
        this.changed();
    }

    onStatus(value: any):
        void
    {
        this.entity.IsActive = value === true || value === 'true';

        if (!this.entity.IsActive)
        {
            // an inactive structure is never the Default
            this.entity.IsDefault = false;
        }

        this.changed();
    }

    onDefault(event: Event):
        void
    {
        this.entity.IsDefault = (event.target as HTMLInputElement).checked && this.entity.IsActive;
        this.changed();
    }

    onSelect(field: 'RateBase' | 'MonthDaysMode', value: any):
        void
    {
        this.entity[field] = String(value ?? '');

        // a fixed rate has no days in the month
        if (this.isFixed)
        {
            this.entity.MonthDaysMode = 'Fixed';
        }

        if (field === 'RateBase')
        {
            this.exampleFor(this.entity.RateBase);
        }

        this.changed();
    }

    onSwitch(field: 'PayExtraHours' | 'PayExtraDays', event: Event):
        void
    {
        this.entity[field] = (event.target as HTMLInputElement).checked;
        this.changed();
    }

    onNumber(field: NumberField, value: any):
        void
    {
        const number =
            Number(String(value ?? '').replace(/,/g, ''));

        const clean =
            Number.isFinite(number) && number > 0 ? number : 0;

        this.entity[field] =
            field === 'MonthDays' ? Math.round(clean)
            : field === 'FixedHourRate' ? Math.round(clean * 100) / 100
            : Math.round(clean * 1000) / 1000;

        this.changed();
    }

    // Typing in one box blanks and blocks the other; the rate is
    // worked out on the box that is filled, and the structure's
    // "Rate on" follows it
    onExample(field: 'exampleBasic' | 'exampleGross', event: Event):
        void
    {
        const number =
            Number(String((event.target as HTMLInputElement).value ?? '').replace(/,/g, ''));

        this[field] = Number.isFinite(number) && number > 0 ? number : 0;

        if (this[field] > 0)
        {
            if (field === 'exampleBasic')
            {
                this.exampleGross = 0;
            }
            else
            {
                this.exampleBasic = 0;
            }

            const rateBase =
                field === 'exampleBasic' ? 'Basic' : 'Gross';

            if (!this.isViewMode && !this.isFixed && this.entity.RateBase !== rateBase)
            {
                this.entity.RateBase = rateBase;
                this.changed();
                return;
            }
        }

        this.cdr.detectChanges();
    }

    //===========================================================
    // Save / Clear / Back
    //===========================================================

    private validate():
        string
    {
        const e =
            this.entity;

        if (this.isFixed && e.FixedHourRate <= 0)
        {
            return 'Type the fixed rate (Tk an hour).';
        }

        if (!this.isFixed && this.fixedDays && (e.MonthDays < 1 || e.MonthDays > 31))
        {
            return 'Days in the month must be 1 to 31.';
        }

        if (!e.PayExtraHours && !e.PayExtraDays)
        {
            return 'Switch on Extra hours or Extra days : the structure pays nothing.';
        }

        const bad =
            (value: number): boolean => !(value > 0 && value <= 10);

        if (e.PayExtraHours && (bad(e.HourMultiplier) || bad(e.HolidayHourMultiplier)))
        {
            return 'The multipliers of extra hours must be more than 0 and no more than 10.';
        }

        if (e.PayExtraDays && bad(e.DayMultiplier))
        {
            return 'The multiplier of extra days must be more than 0 and no more than 10.';
        }

        return '';
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

        const save =
            () =>
            {
                this.isSaving = true;

                this.progressDialog.show('Saving', 'Saving the overtime structure...', false);

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
                        this.toast.error('Error', error?.error?.message ?? 'The overtime structure could not be saved.');
                        this.cdr.detectChanges();
                    };

                if (this.mode === 'edit')
                {
                    this.service
                        .update(this.entityId, this.entity)
                        .subscribe({ next:() => done(`${this.entity.Code} updated.`), error:fail });
                }
                else
                {
                    this.service
                        .create(this.entity)
                        .subscribe({ next:s => done(`${s.Code} created.`), error:fail });
                }
            };

        // what saving changes besides the structure itself
        const notes:
            string[] = [];

        if (this.mode === 'edit' && this.entity.EmployeeCount > 0)
        {
            notes.push(`${this.entity.EmployeeCount} employee(s) are on ${this.entity.Code} : their overtime follows the new rules from the next salary sheet worked out.`);
        }

        if (this.entity.IsDefault && this.otherDefault)
        {
            notes.push(`${this.otherDefault} is the Default now : this structure becomes the Default instead.`);
        }

        if (notes.length > 0)
        {
            this.confirmDialog.open(
                this.mode === 'edit' ? 'Update Overtime Structure' : 'Save Overtime Structure',
                notes.join(' '),
                save,
                this.saveButtonText,
                'Cancel',
                'primary');
            return;
        }

        save();
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

                this.entity = emptyOvertimeStructure();
                this.entity.Code = kept.Code;
                this.entity.Name = kept.Name;
                this.entity.PublicId = kept.PublicId;
                this.entity.OvertimeStructureId = kept.OvertimeStructureId;
                this.entity.EmployeeCount = kept.EmployeeCount;

                this.exampleFor(this.entity.RateBase);

                this.changed();
            },
            'Clear',
            'Cancel',
            'primary');
    }

    private goToList():
        void
    {
        void this.router.navigate(['/human-resource-manangement/human-resource-setup/overtime-structures/list']);
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
