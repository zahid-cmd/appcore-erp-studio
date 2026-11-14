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
import { SearchDropdownComponent } from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../../services/hr-progress.service';

import
{
    EmployeeMovement,
    EmployeeMovementDefaults,
    MOVEMENT_TYPES,
    MovementEmployeeState,
    MovementSalaryLine,
    MovementSalaryStructure,
    SEPARATION_TYPES,
    emptyEmployeeMovement
}
from '../../../models/employee-movements.model';

import
{
    splitGross
}
from '../../../../human-resource-setup/models/salary-structures.model';

import
{
    EmployeeMovementsService
}
from '../../../services/employee-movements.service';


const MONTHS =
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type Item =
    { label: string; value: number };


//===============================================================
// Employee Movements Form (Human Resource > Employee Management)
//
// Add : pick the employee and the kind of movement; the form
// shows what the employee has now and takes what it becomes. A
// salary change is another salary structure (Human Resource
// Setup > Salary Structures) : the form shows the salary head by
// head, now and new, read only.
// Saving changes the employee at once. View : what the movement
// changed (a movement is not edited).
//===============================================================

@Component(
{
    selector:'employee-movements-form',
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
        SearchDropdownComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./employee-movements-form.html',
    styleUrl:'./employee-movements-form.css'
})
export class EmployeeMovementsForm
implements OnInit
{
    // The shared date picker works with a Date; the page keeps
    // yyyy-MM-dd text
    readonly asDate = hrToDate;

    readonly dateEvent = hrDateEvent;

    private readonly service = inject(EmployeeMovementsService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    readonly types =
        MOVEMENT_TYPES;

    readonly separationItems =
        SEPARATION_TYPES;

    mode:
        'add' | 'view' =
        'add';

    entityId =
        '';

    entity:
        EmployeeMovement =
        emptyEmployeeMovement();

    // The employee as now (Add)
    state:
        MovementEmployeeState | null = null;

    employeeItems:
        Item[] = [];

    branchItems:
        Item[] = [];

    departmentItems:
        Item[] = [];

    designationItems:
        Item[] = [];

    shiftItems:
        Item[] = [];

    // Promotion : the salary changes too
    withSalary =
        false;

    // Active salary structures (with their lines)
    private structures:
        MovementSalaryStructure[] = [];

    structureItems:
        Item[] = [];

    isSaving =
        false;

    loading =
        false;

    stateLoading =
        false;

    readonly today =
        this.isoToday();

    get isViewMode(): boolean
    {
        return this.mode === 'view';
    }

    get type(): string
    {
        return this.entity.MovementType;
    }

    get pageTitle(): string
    {
        return this.isViewMode
            ? `Employee Movement`
            : 'Employee Movement';
    }

    // The salary card is on the form
    get showSalary(): boolean
    {
        if (this.isViewMode)
        {
            return this.entity.SalaryLines.length > 0;
        }

        return !!this.state && (this.type === 'Increment' || (this.type === 'Promotion' && this.withSalary));
    }

    get earningLines(): MovementSalaryLine[]
    {
        return this.entity.SalaryLines.filter(l => l.HeadType !== 'Deduction');
    }

    get deductionLines(): MovementSalaryLine[]
    {
        return this.entity.SalaryLines.filter(l => l.HeadType === 'Deduction');
    }

    get oldGross(): number
    {
        return Number(this.entity.OldGrossSalary) || 0;
    }

    get newGross(): number
    {
        return Number(this.entity.NewGrossSalary) || 0;
    }

    // +12.5 % (against the gross now)
    get grossChange(): string
    {
        if (this.oldGross <= 0 || this.newGross === this.oldGross)
        {
            return '';
        }

        const percent =
            (this.newGross - this.oldGross) * 100 / this.oldGross;

        return `${percent > 0 ? '+' : ''}${percent.toLocaleString('en-US', { maximumFractionDigits:1 })} %`;
    }

    // A gross salary and a structure, and one of them is new
    get salaryChanged(): boolean
    {
        const e =
            this.entity;

        return e.NewSalaryStructureId > 0
            && this.newGross > 0
            && (e.NewSalaryStructureId !== e.OldSalaryStructureId || this.newGross !== this.oldGross);
    }

    // The now / new table has something to show
    get hasSalaryLines(): boolean
    {
        return this.entity.SalaryLines.length > 0;
    }

    money(value: number): string
    {
        return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
    }

    dayText(value: string): string
    {
        const m =
            /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

        return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : '';
    }

    private isoToday(): string
    {
        const now = new Date();

        const two =
            (value: number): string => String(value).padStart(2, '0');

        return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
    }

    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.mode =
            this.router.url.toLowerCase().includes('/view/') ? 'view' : 'add';

        this.entityId =
            this.route.snapshot.paramMap.get('id') ?? '';

        this.loading = true;

        if (this.isViewMode)
        {
            this.service
                .getById(this.entityId)
                .subscribe(
                {
                    next:m =>
                    {
                        this.entity = m;
                        this.loading = false;
                        this.cdr.detectChanges();
                    },
                    error:error =>
                    {
                        this.loading = false;
                        this.toast.error('Error', error?.error?.message ?? 'The employee movement could not be loaded.');
                        this.cdr.detectChanges();
                    }
                });

            return;
        }

        this.entity.EffectiveDate = this.today;

        this.service
            .getDefaults()
            .subscribe(
            {
                next:(d: EmployeeMovementDefaults) =>
                {
                    const items =
                        (list: { Id: number; Name: string }[]): Item[] =>
                            list.map(x => ({ label:x.Name, value:x.Id }));

                    this.entity.Code = d.NextCode;

                    this.employeeItems =
                        d.Employees.map(e => ({ label:`${e.Code}  ${e.Name}`, value:e.Id }));

                    this.branchItems = items(d.Branches);
                    this.departmentItems = items(d.Departments);
                    this.designationItems = items(d.Designations);
                    this.shiftItems = items(d.Shifts);

                    this.structures = d.SalaryStructures;

                    this.structureItems =
                        this.structures.map(x => ({ label:x.IsDefault ? `${x.Name}  (Default)` : x.Name, value:x.Id }));

                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.toast.error('Error', error?.error?.message ?? 'The form lists could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Employee and type
    //===========================================================

    onEmployee(value: any):
        void
    {
        const employeeId =
            Number(value) || 0;

        this.entity.EmployeeId = employeeId;
        this.state = null;

        if (!employeeId)
        {
            this.cdr.detectChanges();
            return;
        }

        this.stateLoading = true;
        this.cdr.detectChanges();

        this.service
            .getEmployeeState(employeeId)
            .subscribe(
            {
                next:state =>
                {
                    this.stateLoading = false;

                    // another employee was picked meanwhile
                    if (state.EmployeeId !== this.entity.EmployeeId)
                    {
                        return;
                    }

                    this.state = state;
                    this.startFromState();
                },
                error:error =>
                {
                    this.stateLoading = false;
                    this.toast.error('Error', error?.error?.message ?? 'The employee could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    // The "new" side starts as what the employee has now
    private startFromState():
        void
    {
        const s =
            this.state;

        if (!s)
        {
            return;
        }

        const e =
            this.entity;

        e.EmployeeCode = s.Code;
        e.EmployeeName = s.FullName;
        e.OldBranchId = e.NewBranchId = s.BranchId;
        e.OldBranchName = s.BranchName;
        e.OldDepartmentId = e.NewDepartmentId = s.DepartmentId;
        e.OldDepartmentName = s.DepartmentName;
        e.OldDesignationId = s.DesignationId;
        e.OldDesignationName = s.DesignationName;
        e.NewDesignationId = 0;
        e.OldShiftId = e.NewShiftId = s.ShiftId;
        e.OldShiftName = s.ShiftName;
        e.OldEmploymentType = s.EmploymentType;
        e.OldSalaryStructureId = s.SalaryStructureId;
        e.OldSalaryStructureName = s.SalaryStructureName;
        e.OldGrossSalary = s.GrossSalary;
        e.SettlementAmount = 0;

        this.withSalary = false;

        this.salaryAsNow();

        // the date is never before the latest movement
        if (s.LastMovementDate && e.EffectiveDate < s.LastMovementDate)
        {
            e.EffectiveDate = s.LastMovementDate > this.today ? s.LastMovementDate : this.today;
        }

        // the lists keep what the employee has, even when it was
        // made inactive since
        const keep =
            (list: Item[], id: number, name: string): Item[] =>
                id > 0 && !list.some(x => x.value === id)
                    ? [...list, { label:name || `#${id}`, value:id }]
                    : list;

        this.branchItems = keep(this.branchItems, s.BranchId, s.BranchName);
        this.departmentItems = keep(this.departmentItems, s.DepartmentId, s.DepartmentName);
        this.shiftItems = keep(this.shiftItems, s.ShiftId, s.ShiftName);

        this.cdr.detectChanges();
    }

    setType(value: string):
        void
    {
        if (this.isViewMode || this.entity.MovementType === value)
        {
            return;
        }

        this.entity.MovementType = value;

        // what the other type typed is dropped
        this.startFromState();

        this.cdr.detectChanges();
    }

    onDate(event: Event):
        void
    {
        this.entity.EffectiveDate = (event.target as HTMLInputElement).value ?? '';
        this.cdr.detectChanges();
    }

    onLookup(field: 'NewBranchId' | 'NewDepartmentId' | 'NewDesignationId' | 'NewShiftId', value: any):
        void
    {
        this.entity[field] = Number(value) || 0;
        this.cdr.detectChanges();
    }

    onSeparationType(value: any):
        void
    {
        this.entity.SeparationType = String(value ?? '');
        this.cdr.detectChanges();
    }

    onText(field: 'Remarks' | 'SettlementNote', value: any):
        void
    {
        this.entity[field] = String(value ?? '');
        this.cdr.detectChanges();
    }

    onSettlement(value: any):
        void
    {
        this.entity.SettlementAmount = this.toAmount(value);
        this.cdr.detectChanges();
    }

    onWithSalary(event: Event):
        void
    {
        this.withSalary = (event.target as HTMLInputElement).checked;

        // off : the salary stays as it is
        if (!this.withSalary)
        {
            this.salaryAsNow();
        }

        this.cdr.detectChanges();
    }

    //===========================================================
    // Salary
    //===========================================================

    private toAmount(value: any): number
    {
        const number =
            Number(String(value ?? '').replace(/,/g, ''));

        return Number.isFinite(number) && number > 0
            ? Math.round(number * 100) / 100
            : 0;
    }

    // The new side of the salary starts as the employee has it :
    // the same gross and the same structure (the Default when the
    // employee has none that can still be picked)
    private salaryAsNow():
        void
    {
        const s =
            this.state;

        if (!s)
        {
            return;
        }

        const structure =
            this.structures.find(x => x.Id === s.SalaryStructureId)
            ?? this.structures.find(x => x.IsDefault);

        this.entity.NewSalaryStructureId = structure?.Id ?? 0;
        this.entity.NewSalaryStructureName = structure?.Name ?? '';
        this.entity.NewGrossSalary = s.GrossSalary;

        this.splitSalary();
    }

    onStructure(value: any):
        void
    {
        const structure =
            this.structures.find(x => x.Id === (Number(value) || 0));

        this.entity.NewSalaryStructureId = structure?.Id ?? 0;
        this.entity.NewSalaryStructureName = structure?.Name ?? '';

        this.splitSalary();

        this.cdr.detectChanges();
    }

    onGross(value: any):
        void
    {
        this.entity.NewGrossSalary = this.toAmount(value);

        this.splitSalary();

        this.cdr.detectChanges();
    }

    // The now / new table : the new gross split by the structure
    // picked, beside what the employee has now. Every head that has
    // an amount on either side is shown.
    private splitSalary():
        void
    {
        const now =
            this.state?.SalaryLines ?? [];

        const structure =
            this.structures.find(x => x.Id === this.entity.NewSalaryStructureId);

        // nothing changes : the new side is the salary now
        if (!structure || this.newGross <= 0 || !this.salaryChanged)
        {
            this.entity.SalaryLines = now.map(l => ({ ...l, NewAmount:l.OldAmount }));
            return;
        }

        const amounts =
            splitGross(this.newGross, structure.Lines);

        const lines:
            MovementSalaryLine[] =
            structure.Lines
                .filter(l => l.Percent > 0 || l.FixedAmount > 0)
                .map(l => ({
                    ...l,
                    OldAmount:now.find(x => x.SalaryHeadId === l.SalaryHeadId)?.OldAmount ?? 0,
                    NewAmount:amounts.get(l.SalaryHeadId) ?? 0
                }));

        // heads the employee has now that the structure has not
        for (const old of now)
        {
            if (!lines.some(x => x.SalaryHeadId === old.SalaryHeadId))
            {
                lines.push({ ...old, NewAmount:0 });
            }
        }

        // earnings first, as the structure lists them
        this.entity.SalaryLines =
        [
            ...lines.filter(l => l.HeadType !== 'Deduction'),
            ...lines.filter(l => l.HeadType === 'Deduction')
        ];
    }

    //===========================================================
    // Save / Back
    //===========================================================

    private validate():
        string
    {
        const e =
            this.entity;

        const s =
            this.state;

        if (!e.EmployeeId || !s)
        {
            return 'Pick the employee.';
        }

        if (!e.EffectiveDate)
        {
            return 'Effective Date is required.';
        }

        if (e.EffectiveDate < s.JoiningDate)
        {
            return `${s.FullName} joined on ${this.dayText(s.JoiningDate)} : the effective date is before that.`;
        }

        if (s.LastMovementDate && e.EffectiveDate < s.LastMovementDate)
        {
            return `The latest movement of ${s.FullName} is dated ${this.dayText(s.LastMovementDate)} : a new one cannot be before it.`;
        }

        switch (this.type)
        {
            case 'Increment':

                if (this.newGross <= 0)
                {
                    return 'Type the new gross salary.';
                }

                if (!e.NewSalaryStructureId)
                {
                    return 'Pick the salary structure : it splits the gross salary into the salary heads.';
                }

                if (!this.salaryChanged)
                {
                    return 'The gross salary and the salary structure are the same as now : change one of them.';
                }

                break;

            case 'Promotion':

                if (!e.NewDesignationId || e.NewDesignationId === e.OldDesignationId)
                {
                    return 'Pick the new designation.';
                }

                if (this.withSalary && !this.salaryChanged)
                {
                    return 'Type the new gross salary (or pick another salary structure), or switch "Change the salary too" off.';
                }

                break;

            case 'Transfer':

                if (e.NewBranchId === e.OldBranchId && e.NewDepartmentId === e.OldDepartmentId && e.NewShiftId === e.OldShiftId)
                {
                    return 'Pick the new branch, department or shift.';
                }

                break;

            case 'Confirmation':

                if (s.EmploymentType === 'Permanent')
                {
                    return `${s.FullName} is already Permanent.`;
                }

                break;

            case 'Separation':

                if (!e.SeparationType)
                {
                    return 'Pick the kind of separation (Resignation, Termination ...).';
                }

                if (e.EffectiveDate > this.today)
                {
                    return 'The last working day cannot be in the future : save the separation on or after that day.';
                }

                break;
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

        const e =
            this.entity;

        const what =
            this.type === 'Separation'
                ? `${e.EmployeeName} becomes Inactive from ${this.dayText(e.EffectiveDate)} (${e.SeparationType}).`
                : `The ${this.type.toLowerCase()} of ${e.EmployeeName} changes the employee record now.`;

        this.confirmDialog.open(
            `Save ${this.type}`,
            `${what} A movement is not edited afterwards; it can be deleted while it is the employee's latest one.`,
            () =>
            {
                this.isSaving = true;

                this.progressDialog.show('Saving', 'Saving the movement...', false);

                this.service
                    .create(e, this.showSalary)
                    .subscribe(
                    {
                        next:m =>
                        {
                            this.progressDialog.finish(() =>
                            {
                                this.isSaving = false;
                                this.toast.success('Success', `${m.Code} saved : ${e.EmployeeName} is updated.`);
                                this.goToList();
                            });
                        },
                        error:error =>
                        {
                            this.progressDialog.fail();
                            this.isSaving = false;
                            this.toast.error('Error', error?.error?.message ?? 'The employee movement could not be saved.');
                            this.cdr.detectChanges();
                        }
                    });
            },
            'Save',
            'Cancel',
            this.type === 'Separation' ? 'danger' : 'primary');
    }

    private goToList():
        void
    {
        void this.router.navigate(['/human-resource-manangement/employee-management/employee-movements/list']);
    }

    onBackToList():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        if (this.isViewMode || !this.entity.EmployeeId)
        {
            this.goToList();
            return;
        }

        this.confirmDialog.open(
            'Cancel Movement',
            'The movement is not saved. Do you want to leave this page?',
            () => this.goToList(),
            'Leave',
            'Stay',
            'primary');
    }
}
