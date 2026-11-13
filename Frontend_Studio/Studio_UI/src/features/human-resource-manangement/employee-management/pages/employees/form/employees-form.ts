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
import { DatepickerComponent } from '../../../../../../shared/components/controls/datepicker/datepicker';
import { hrDateEvent, hrToDate } from '../../../../services/hr-date';
import { PageToolbarComponent } from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { ControlTab, ControlTabsComponent } from '../../../../../../shared/components/controls/control-tabs/control-tabs';
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
    EMPLOYEE_BLOOD_GROUPS,
    EMPLOYEE_GENDERS,
    EMPLOYEE_MARITAL_STATUSES,
    EMPLOYEE_TYPES,
    Employee,
    EmployeeDefaults,
    EmployeeLookup,
    EmployeeOvertimeStructure,
    EmployeeSalaryStructure,
    emptyEmployee
}
from '../../../models/employees.model';

import
{
    HR_WEEK_DAYS,
    hrToggleWeekDay,
    hrWeekDaysText
}
from '../../../../human-resource-setup/models/hr-setup.model';

import
{
    overtimeMoney,
    overtimeNumber,
    overtimeRates
}
from '../../../../human-resource-setup/models/overtime-structures.model';

import
{
    deductionBasisText,
    splitGross,
    structurePercent
}
from '../../../../human-resource-setup/models/salary-structures.model';

import
{
    EmployeesService
}
from '../../../services/employees.service';


type TextField =
    'FullName' | 'FatherName' | 'MotherName' | 'NationalId'
    | 'MobileNo' | 'Email' | 'PresentAddress' | 'PermanentAddress'
    | 'EmergencyContactName' | 'EmergencyContactPhone'
    | 'BankName' | 'BankAccountNo' | 'MfsNo' | 'Remarks';

type SelectField =
    'Gender' | 'BloodGroup' | 'MaritalStatus' | 'EmploymentType' | 'PaymentMode' | 'MfsName';

type LookupField =
    'BranchId' | 'DepartmentId' | 'DesignationId' | 'ShiftId' | 'UserProfileId';

type DateField =
    'DateOfBirth' | 'JoiningDate' | 'ConfirmationDate';

// A salary line as the Salary Structure tab shows it
interface SalaryRow
{
    SalaryHeadId: number;
    HeadName: string;
    HeadType: string;
    // '' on a salary from before salary structures
    PercentText: string;
    Amount: number;
}

type TabKey =
    'personal' | 'contact' | 'job' | 'salary';


//===============================================================
// Employee Profiles Form (Human Resource > Employee Management)
//
// Two fixed sides. Left : the Profile Summary (a few key lines
// and the salary). Right : four tabs, walked with Back / Next
// (or a click on a tab) :
//   Personal          who the employee is
//   Contact           phone, addresses, emergency contact
//   Job               branch, department, designation, shift,
//                     dates, login
//   Salary Structure  the salary structure picked from Human
//                     Resource Setup > Salary Structures (its
//                     lines are shown read only) and, beside it,
//                     overtime, remarks
// Each tab fits the canvas without scrolling.
// Save checks every tab and opens the one with the problem.
//===============================================================

@Component(
{
    selector:'employees-form',
    standalone:true,
    imports:
    [
        CommonModule,
        DatepickerComponent,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        ControlTabsComponent,
        CommandCenterComponent,
        TextboxComponent,
        DropdownComponent,
        SearchDropdownComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./employees-form.html',
    styleUrl:'./employees-form.css'
})
export class EmployeesForm
implements OnInit
{
    // The shared date picker works with a Date; the page keeps
    // yyyy-MM-dd text
    readonly asDate = hrToDate;

    readonly dateEvent = hrDateEvent;

    private readonly service = inject(EmployeesService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    readonly genderItems = EMPLOYEE_GENDERS;

    readonly maritalItems = EMPLOYEE_MARITAL_STATUSES;

    readonly bloodItems = EMPLOYEE_BLOOD_GROUPS;

    readonly typeItems = EMPLOYEE_TYPES;



    readonly statusItems =
    [
        { label:'Active', value:true },
        { label:'Inactive', value:false }
    ];

    readonly tabs:
        ControlTab[] =
    [
        { id:'personal', label:'Personal' },
        { id:'contact', label:'Contact' },
        { id:'job', label:'Job' },
        { id:'salary', label:'Salary Structure' }
    ];

    selectedTab:
        TabKey =
        'personal';

    mode:
        'add' | 'edit' | 'view' =
        'add';

    entityId =
        '';

    entity:
        Employee =
        emptyEmployee();

    // Active salary structures (with their lines)
    private structures:
        EmployeeSalaryStructure[] = [];

    //===========================================================
    // Weekly holiday : the employee's own days, or none picked =
    // the weekly holiday of everyone
    //===========================================================

    readonly weekDays =
        HR_WEEK_DAYS;

    // The weekly holiday of everyone (Holidays > Weekly Holidays)
    private everyoneOff =
        '';

    weeklyOn(day: string): boolean
    {
        return this.entity.WeeklyOffDays.split(',').includes(day);
    }

    get weeklyHint(): string
    {
        return this.entity.WeeklyOffDays
            ? `This employee's own weekly holiday : ${hrWeekDaysText(this.entity.WeeklyOffDays)}. Clear the days to go back to the one of everyone (${hrWeekDaysText(this.everyoneOff)}).`
            : `None picked : the weekly holiday of everyone applies (${hrWeekDaysText(this.everyoneOff)}). Pick days only when this employee is different.`;
    }

    toggleWeekly(day: string):
        void
    {
        if (this.isViewMode)
        {
            return;
        }

        this.entity.WeeklyOffDays = hrToggleWeekDay(this.entity.WeeklyOffDays, day);
        this.changed();
    }

    // The gross salary as the profile was loaded
    private loadedGross =
        0;

    branchItems:
        { label: string; value: number }[] = [];

    departmentItems:
        { label: string; value: number }[] = [];

    designationItems:
        { label: string; value: number }[] = [];

    shiftItems:
        { label: string; value: number }[] = [];

    loginItems:
        { label: string; value: number }[] = [];

    structureItems:
        { label: string; value: number }[] = [];

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
            ? 'Employee Profile'
            : this.mode === 'edit'
                ? `Update Employee Profile ${this.entity.Code}`
                : `View Employee Profile ${this.entity.Code}`;
    }

    get saveButtonText(): string
    {
        return this.mode === 'edit' ? 'Update' : 'Save';
    }

    //===========================================================
    // Tabs
    //===========================================================

    get tabIndex(): number
    {
        return Math.max(0, this.tabs.findIndex(x => x.id === this.selectedTab));
    }

    get isFirstTab(): boolean
    {
        return this.tabIndex === 0;
    }

    get isLastTab(): boolean
    {
        return this.tabIndex === this.tabs.length - 1;
    }

    onTabChange(value: string):
        void
    {
        this.selectedTab = (this.tabs.some(x => x.id === value) ? value : 'personal') as TabKey;
        this.cdr.detectChanges();
    }

    back():
        void
    {
        if (!this.isFirstTab)
        {
            this.onTabChange(this.tabs[this.tabIndex - 1].id);
        }
    }

    // The next tab; the tab being left must be complete first (not
    // on View)
    next():
        void
    {
        if (this.isLastTab)
        {
            return;
        }

        const problem =
            this.isViewMode ? null : this.problems().find(x => x.tab === this.selectedTab);

        if (problem)
        {
            this.toast.error('Validation', problem.message);
            return;
        }

        this.onTabChange(this.tabs[this.tabIndex + 1].id);
    }

    //===========================================================
    // Profile Summary (left)
    //===========================================================

    // The label of a picked item ('' = none picked)
    private nameOf(items: { label: string; value: number }[], id: number): string
    {
        return id > 0 ? items.find(x => x.value === id)?.label ?? '' : '';
    }

    // A few key lines only : the rest is on the tabs
    get profileFacts(): { label: string; value: string }[]
    {
        const e =
            this.entity;

        return [
            { label:'Code', value:e.Code },
            { label:'Name', value:e.FullName.trim() },
            { label:'Designation', value:this.nameOf(this.designationItems, e.DesignationId) },
            { label:'Department', value:this.nameOf(this.departmentItems, e.DepartmentId) },
            { label:'Branch', value:this.nameOf(this.branchItems, e.BranchId) },
            { label:'Status', value:e.IsActive ? 'Active' : 'Inactive' }
        ];
    }

    //===========================================================
    // Salary : the structure picked, shown read only
    //===========================================================

    get selectedStructure(): EmployeeSalaryStructure | undefined
    {
        return this.structures.find(x => x.Id === this.entity.SalaryStructureId);
    }

    // The lines shown : the gross salary split by the structure
    // picked. Without a structure on the list (none picked on a
    // profile from before salary structures, or one made inactive
    // since) the lines the employee already has.
    get salaryLines(): SalaryRow[]
    {
        const structure =
            this.selectedStructure;

        if (!structure)
        {
            return this.entity.SalaryLines.map(l => ({
                SalaryHeadId:l.SalaryHeadId,
                HeadName:l.HeadName,
                HeadType:l.HeadType,
                PercentText:'',
                Amount:l.Amount
            }));
        }

        const amounts =
            splitGross(this.entity.GrossSalary, structure.Lines);

        return structure.Lines
            .filter(l => l.Percent > 0 || l.FixedAmount > 0)
            .map(l => ({
                SalaryHeadId:l.SalaryHeadId,
                HeadName:l.HeadName,
                HeadType:l.HeadType,
                PercentText:l.HeadType === 'Deduction'
                    ? (l.Basis === 'Fixed' ? 'fixed' : deductionBasisText(l))
                    : structurePercent(l.Percent) + ' %',
                Amount:amounts.get(l.SalaryHeadId) ?? 0
            }));
    }

    get earningLines(): SalaryRow[]
    {
        return this.salaryLines.filter(l => l.HeadType !== 'Deduction');
    }

    get deductionLines(): SalaryRow[]
    {
        return this.salaryLines.filter(l => l.HeadType === 'Deduction');
    }

    get gross(): number
    {
        return Number(this.entity.GrossSalary) || 0;
    }

    get deductions(): number
    {
        return this.deductionLines.reduce((sum, l) => sum + (Number(l.Amount) || 0), 0);
    }

    get net(): number
    {
        return this.gross - this.deductions;
    }

    // The employee has a salary but no structure : saved before
    // salary structures existed
    get hasOldSalary(): boolean
    {
        return !this.entity.SalaryStructureId && this.entity.SalaryLines.length > 0;
    }

    // The old salary as it was saved : it may stay without a structure
    private get oldSalaryUntouched(): boolean
    {
        return this.hasOldSalary && this.gross === this.loadedGross;
    }

    // The structure picked is no longer active : the lines on screen
    // are those saved, not the gross typed now
    get staleLines(): boolean
    {
        return !this.selectedStructure && this.entity.SalaryLines.length > 0 && this.gross !== this.loadedGross;
    }

    onGross(value: any):
        void
    {
        const number =
            Number(String(value ?? '').replace(/,/g, ''));

        this.entity.GrossSalary =
            Number.isFinite(number) && number > 0
                ? Math.round(number * 100) / 100
                : 0;

        this.changed();
    }

    money(value: number): string
    {
        return (Number(value) || 0).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 });
    }

    onStructure(value: any):
        void
    {
        this.entity.SalaryStructureId = Number(value) || 0;
        this.entity.SalaryStructureName = this.nameOf(this.structureItems, this.entity.SalaryStructureId);
        this.changed();
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
            employee:this.entityId ? this.service.getById(this.entityId) : of(null)
        })
        .subscribe(
        {
            next:({ defaults, employee }) =>
            {
                if (employee)
                {
                    this.entity = employee;
                }
                else
                {
                    this.entity.Code = defaults.NextCode;
                    this.entity.JoiningDate = this.today();

                    // one branch / shift only : it is the answer
                    if (defaults.Branches.length === 1)
                    {
                        this.entity.BranchId = defaults.Branches[0].Id;
                    }

                    if (defaults.Shifts.length === 1)
                    {
                        this.entity.ShiftId = defaults.Shifts[0].Id;
                    }

                    // a new profile starts with the Default structure
                    this.entity.SalaryStructureId =
                        defaults.SalaryStructures.find(x => x.IsDefault)?.Id ?? 0;
                }

                this.loadedGross = Number(this.entity.GrossSalary) || 0;

                this.applyDefaults(defaults);

                this.loading = false;
                this.setInitialState();
            },
            error:error =>
            {
                this.loading = false;
                this.toast.error('Error', error?.error?.message ?? 'The employee profile could not be loaded.');
                this.cdr.detectChanges();
            }
        });
    }

    private today(): string
    {
        const now = new Date();

        const two =
            (value: number): string => String(value).padStart(2, '0');

        return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
    }

    // The lists of the form. A value of the employee that is no
    // longer on a list (made inactive since) is kept as an item.
    private applyDefaults(d: EmployeeDefaults):
        void
    {
        const items =
            (list: EmployeeLookup[], id: number, name: string, label: (l: EmployeeLookup) => string) =>
            {
                const result =
                    list.map(l => ({ label:label(l), value:l.Id }));

                if (id > 0 && !result.some(x => x.value === id))
                {
                    result.push({ label:name || `#${id}`, value:id });
                }

                return result;
            };

        this.branchItems =
            items(d.Branches, this.entity.BranchId, this.entity.BranchName, l => l.Name);

        this.departmentItems =
            items(d.Departments, this.entity.DepartmentId, this.entity.DepartmentName, l => l.Name);

        this.designationItems =
            items(d.Designations, this.entity.DesignationId, this.entity.DesignationName, l => l.Name);

        this.shiftItems =
            items(d.Shifts, this.entity.ShiftId, this.entity.ShiftName, l => l.Note ? `${l.Name}  (${l.Note})` : l.Name);

        this.loginItems =
        [
            { label:'No login', value:0 },
            ...items(
                d.Users,
                this.entity.UserProfileId,
                this.entity.LoginName,
                l => l.Note && l.Note !== this.entity.Code ? `${l.Name}  - linked to ${l.Note}` : l.Name)
        ];

        this.structures = d.SalaryStructures;

        this.everyoneOff = d.DefaultWeeklyOffDays;

        this.overtimeStructures = d.OvertimeStructures;

        this.shiftHours =
            new Map(d.Shifts.map(x => [x.Id, x.Hours || 8]));

        this.overtimeItems =
            this.overtimeStructures.map(x => ({ label:`${x.Code}  ${x.Name}${x.IsDefault ? '  (Default)' : ''}`, value:x.Id }));

        // the employee's structure, made inactive since, stays an item
        if (this.entity.OvertimeStructureId > 0 && !this.overtimeItems.some(x => x.value === this.entity.OvertimeStructureId))
        {
            this.overtimeItems.push({ label:`${this.entity.OvertimeStructureName || 'Overtime structure'}  (inactive)`, value:this.entity.OvertimeStructureId });
        }

        this.structureItems =
        [
            { label:'No salary structure', value:0 },
            ...this.structures.map(s => ({ label:`${s.Code}  ${s.Name}${s.IsDefault ? '  (Default)' : ''}`, value:s.Id }))
        ];

        // the employee's structure, made inactive since, stays an item
        if (this.entity.SalaryStructureId > 0 && !this.structureItems.some(x => x.value === this.entity.SalaryStructureId))
        {
            this.structureItems.push({ label:`${this.entity.SalaryStructureName || 'Salary structure'}  (inactive)`, value:this.entity.SalaryStructureId });
        }
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

    onText(field: TextField, value: any):
        void
    {
        this.entity[field] = String(value ?? '');
        this.changed();
    }

    onSelect(field: SelectField, value: any):
        void
    {
        this.entity[field] = String(value ?? '');
        this.changed();
    }

    onLookup(field: LookupField, value: any):
        void
    {
        this.entity[field] = Number(value) || 0;
        this.changed();
    }

    onDate(field: DateField, event: Event):
        void
    {
        this.entity[field] = (event.target as HTMLInputElement).value ?? '';
        this.changed();
    }

    onStatus(value: any):
        void
    {
        this.entity.IsActive = value === true || value === 'true';
        this.changed();
    }

    //===========================================================
    // Overtime : allowed or not; when allowed, the overtime
    // structure (Human Resource Setup > Overtime Structures)
    //===========================================================

    private overtimeStructures:
        EmployeeOvertimeStructure[] = [];

    // The working hours a day of each shift
    private shiftHours =
        new Map<number, number>();

    overtimeItems:
        { label: string; value: number }[] = [];

    get selectedOvertime(): EmployeeOvertimeStructure | undefined
    {
        return this.overtimeStructures.find(x => x.Id === this.entity.OvertimeStructureId);
    }

    // A rate typed before overtime structures, still in use
    get hasOldOvertimeRate(): boolean
    {
        return this.entity.OvertimeAllowed && !this.entity.OvertimeStructureId && this.entity.OvertimeRate > 0;
    }

    // What the structure picked comes to for this employee
    get overtimeFacts(): { label: string; value: string }[]
    {
        const s =
            this.selectedOvertime;

        if (!s)
        {
            return [];
        }

        const basic =
            this.earningLines.find(l => l.HeadName.toLowerCase().includes('basic'))?.Amount ?? 0;

        // the hours a day : the working hours of the employee's shift
        const hours =
            this.shiftHours.get(this.entity.ShiftId) ?? 8;

        const rates =
            overtimeRates(s, this.basicSalary || basic, this.gross, 30, hours);

        const facts =
        [
            { label:'Hours a day', value:`${overtimeNumber(hours)}  (the shift)` },
            { label:'Day rate', value:`Tk ${overtimeMoney(rates.day)}` },
            { label:'Hour rate', value:`Tk ${overtimeMoney(rates.hour)}` }
        ];

        if (s.PayExtraHours)
        {
            facts.push({ label:'Extra hour', value:`Tk ${overtimeMoney(rates.hour * s.HourMultiplier)}  (holiday Tk ${overtimeMoney(rates.hour * s.HolidayHourMultiplier)})` });
        }

        if (s.PayExtraDays)
        {
            facts.push({ label:'Extra day', value:`Tk ${overtimeMoney(rates.day * s.DayMultiplier)}  (x ${overtimeNumber(s.DayMultiplier)})` });
        }

        return facts;
    }

    // The basic salary as the structure splits the gross now
    private get basicSalary(): number
    {
        const structure =
            this.selectedStructure;

        if (!structure)
        {
            return 0;
        }

        const basic =
            structure.Lines.find(l => l.IsBasic);

        return basic ? splitGross(this.gross, structure.Lines).get(basic.SalaryHeadId) ?? 0 : 0;
    }

    onOvertime(event: Event):
        void
    {
        this.entity.OvertimeAllowed = (event.target as HTMLInputElement).checked;

        if (!this.entity.OvertimeAllowed)
        {
            this.entity.OvertimeStructureId = 0;
            this.entity.OvertimeStructureName = '';
        }
        else if (!this.entity.OvertimeStructureId && !this.hasOldOvertimeRate)
        {
            // on : the Default overtime structure
            this.entity.OvertimeStructureId =
                this.overtimeStructures.find(x => x.IsDefault)?.Id ?? 0;
        }

        this.changed();
    }

    onOvertimeStructure(value: any):
        void
    {
        this.entity.OvertimeStructureId = Number(value) || 0;
        this.entity.OvertimeStructureName = this.nameOf(this.overtimeItems, this.entity.OvertimeStructureId);
        this.changed();
    }

    sameAddress():
        void
    {
        this.entity.PermanentAddress = this.entity.PresentAddress;
        this.changed();
    }

    //===========================================================
    // Save / Clear / Back
    //===========================================================

    // What stops the form from being saved, each with its tab
    private problems():
        { tab: TabKey; message: string }[]
    {
        const e =
            this.entity;

        const list:
            { tab: TabKey; message: string }[] = [];

        const add =
            (tab: TabKey, message: string): void =>
            {
                list.push({ tab, message });
            };

        // ---------- Personal ----------
        if (!e.FullName.trim())
        {
            add('personal', 'Full Name is required.');
        }

        // ---------- Contact ----------
        if (e.Email.trim() && !e.Email.includes('@'))
        {
            add('contact', 'Email is not a valid address.');
        }

        // ---------- Job ----------
        if (!e.BranchId)
        {
            add('job', 'Pick the branch.');
        }

        if (!e.DepartmentId)
        {
            add('job', 'Pick the department.');
        }

        if (!e.DesignationId)
        {
            add('job', 'Pick the designation.');
        }

        if (!e.ShiftId)
        {
            add('job', 'Pick the shift.');
        }

        if (!e.JoiningDate)
        {
            add('job', 'Joining Date is required.');
        }
        else if (e.DateOfBirth && e.JoiningDate <= e.DateOfBirth)
        {
            add('job', 'Joining Date must be after the Date of Birth.');
        }

        if (e.ConfirmationDate && e.JoiningDate && e.ConfirmationDate < e.JoiningDate)
        {
            add('job', 'Confirmation Date cannot be before the Joining Date.');
        }

        if (e.WeeklyOffDays.split(',').filter(Boolean).length >= 7)
        {
            add('job', 'The week needs at least one working day : the weekly holiday cannot be all seven days.');
        }

        // ---------- Salary Structure ----------
        if (this.gross > 0 && !e.SalaryStructureId && !this.oldSalaryUntouched)
        {
            add('salary', 'Pick the Salary Structure : it splits the gross salary into the salary heads.');
        }

        if (e.OvertimeAllowed && !e.OvertimeStructureId && !this.hasOldOvertimeRate)
        {
            add('salary', 'Overtime is allowed : pick the Overtime Structure.');
        }

        return list;
    }

    onSave():
        void
    {
        if (this.isSaving || this.isViewMode)
        {
            return;
        }

        // the first problem, on its own tab
        const problem =
            this.problems()[0];

        if (problem)
        {
            this.onTabChange(problem.tab);
            this.toast.error('Validation', problem.message);
            return;
        }

        const save =
            () =>
            {
                this.isSaving = true;

                this.progressDialog.show('Saving', 'Saving the employee profile...', false);

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
                        this.toast.error('Error', error?.error?.message ?? 'The employee profile could not be saved.');
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
                        .subscribe({ next:e => done(`${e.Code} ${e.FullName} created.`), error:fail });
                }
            };

        if (this.gross <= 0)
        {
            this.confirmDialog.open(
                'No Gross Salary',
                'No gross salary is typed, so this employee has no salary. Save anyway? Payroll leaves out an employee without a salary.',
                save,
                'Save Anyway',
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

                this.entity = emptyEmployee();
                this.entity.Code = kept.Code;
                this.entity.PublicId = kept.PublicId;
                this.entity.JoiningDate = this.today();

                // the salary the employee already has stays on screen
                this.entity.SalaryLines = kept.SalaryLines;
                this.entity.GrossSalary = kept.GrossSalary;
                this.entity.SalaryStructureId = kept.SalaryStructureId;
                this.entity.SalaryStructureName = kept.SalaryStructureName;

                this.selectedTab = 'personal';

                this.changed();
            },
            'Clear',
            'Cancel',
            'primary');
    }

    private goToList():
        void
    {
        void this.router.navigate(['/human-resource-manangement/employee-management/employees/list']);
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
