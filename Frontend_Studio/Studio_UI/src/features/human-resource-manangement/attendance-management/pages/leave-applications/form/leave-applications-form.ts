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
    LeaveApplication,
    LeaveBalance,
    LeaveEmployee,
    LeaveTypeOption,
    attDayText,
    attIsoDay,
    emptyLeaveApplication
}
from '../../../models/attendance.model';

import
{
    AttendanceService
}
from '../../../services/attendance.service';


//===============================================================
// Leave Applications Form (Human Resource > Attendance
// Management)
//
// Left : the application (employee, leave type, dates, reason).
// The days are the working days of the range : weekly off days
// and holidays are not leave. Right : the employee's leave
// balance of the year and, on View, the decision (Approve /
// Reject a Pending application, Cancel an Approved one).
//===============================================================

@Component(
{
    selector:'leave-applications-form',
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
    templateUrl:'./leave-applications-form.html',
    styleUrl:'./leave-applications-form.css'
})
export class LeaveApplicationsForm
implements OnInit
{
    // The shared date picker works with a Date; the page keeps
    // yyyy-MM-dd text
    readonly asDate = hrToDate;

    readonly dateEvent = hrDateEvent;

    private readonly service = inject(AttendanceService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    mode:
        'add' | 'edit' | 'view' =
        'add';

    entityId =
        '';

    entity:
        LeaveApplication =
        emptyLeaveApplication();

    private employees:
        LeaveEmployee[] = [];

    private leaveTypes:
        LeaveTypeOption[] = [];

    employeeItems:
        { label: string; value: number }[] = [];

    balance:
        LeaveBalance[] = [];

    balanceYear =
        '';

    // Weekly off days / holidays inside the range
    offDays =
        0;

    counting =
        false;

    decisionNote =
        '';

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
            ? 'Leave Application'
            : this.mode === 'edit'
                ? `Update Leave Application`
                : `Leave Application`;
    }

    get saveButtonText(): string
    {
        return this.mode === 'edit' ? 'Update' : 'Save';
    }

    get canDecide(): boolean
    {
        return this.isViewMode && this.entity.Status === 'Pending';
    }

    get canCancel(): boolean
    {
        return this.isViewMode && this.entity.Status === 'Approved';
    }

    get selectedEmployee(): LeaveEmployee | undefined
    {
        return this.employees.find(e => e.Id === this.entity.EmployeeId);
    }

    // Leave types the employee may take (All / the gender)
    get typeItems(): { label: string; value: number }[]
    {
        const gender =
            this.selectedEmployee?.Gender ?? '';

        const items =
            this.leaveTypes
                .filter(t => t.AppliesTo === 'All' || !gender || t.AppliesTo === gender)
                .map(t => ({ label:`${t.Name} (${t.ShortName})${t.IsPaid ? '' : ' - unpaid'}`, value:t.Id }));

        if (this.entity.LeaveTypeId > 0 && !items.some(x => x.value === this.entity.LeaveTypeId))
        {
            items.push({ label:this.entity.LeaveTypeName || `#${this.entity.LeaveTypeId}`, value:this.entity.LeaveTypeId });
        }

        return items;
    }

    get selectedBalance(): LeaveBalance | undefined
    {
        return this.balance.find(b => b.LeaveTypeId === this.entity.LeaveTypeId);
    }

    // Days of the type left for this application (its own pending
    // days are inside the balance already when it is being edited)
    get overLimit(): boolean
    {
        const b =
            this.selectedBalance;

        if (this.isViewMode || !b || b.Entitled <= 0 || this.entity.Days <= 0)
        {
            return false;
        }

        const own =
            this.mode === 'edit' ? this.initialDays : 0;

        return this.entity.Days > b.Remaining + own;
    }

    private initialDays =
        0;

    dayText(value: string): string
    {
        return attDayText(value);
    }

    days(value: number): string
    {
        return (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits:2 });
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

        this.loadAll();
    }

    private loadAll():
        void
    {
        this.loading = true;
        this.cdr.detectChanges();

        forkJoin(
        {
            defaults:this.service.getLeaveDefaults(),
            application:this.entityId ? this.service.getLeave(this.entityId) : of(null)
        })
        .subscribe(
        {
            next:({ defaults, application }) =>
            {
                this.employees = defaults.Employees;
                this.leaveTypes = defaults.LeaveTypes;

                if (application)
                {
                    this.entity = application;

                    // only a Pending application is changed
                    if (this.mode === 'edit' && application.Status !== 'Pending')
                    {
                        this.mode = 'view';
                    }
                }
                else
                {
                    this.entity.Code = defaults.NextCode;
                    this.entity.FromDate = attIsoDay(new Date());
                    this.entity.ToDate = this.entity.FromDate;
                }

                this.employeeItems =
                    this.employees.map(e => ({ label:`${e.Code}  ${e.Name}${e.DesignationName ? '  - ' + e.DesignationName : ''}`, value:e.Id }));

                // an employee who has left since stays on the list
                if (this.entity.EmployeeId > 0 && !this.employeeItems.some(x => x.value === this.entity.EmployeeId))
                {
                    this.employeeItems.push({ label:`${this.entity.EmployeeCode}  ${this.entity.EmployeeName}`, value:this.entity.EmployeeId });
                }

                this.initialDays = application?.Status === 'Pending' ? application.Days : 0;
                this.decisionNote = '';
                this.loading = false;
                this.setInitialState();
                this.loadBalance();
            },
            error:error =>
            {
                this.loading = false;
                this.toast.error('Error', error?.error?.message ?? 'The leave application could not be loaded.');
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

    // The employee's balance in the leave year (the financial
    // year) of the From Date
    private loadBalance():
        void
    {
        const date =
            this.entity.FromDate || attIsoDay(new Date());

        if (!this.entity.EmployeeId)
        {
            this.balance = [];
            this.balanceYear = '';
            this.cdr.detectChanges();
            return;
        }

        this.service
            .getLeaveBalance(this.entity.EmployeeId, date)
            .subscribe(
            {
                next:rows =>
                {
                    this.balance = rows;
                    this.balanceYear = rows[0]?.YearName ?? '';
                    this.cdr.detectChanges();
                },
                error:() =>
                {
                    this.balance = [];
                    this.cdr.detectChanges();
                }
            });
    }

    // The working days of the range (the server knows the shift's
    // weekly off days and the holidays)
    private countDays():
        void
    {
        if (this.isViewMode)
        {
            return;
        }

        const e =
            this.entity;

        if (!e.EmployeeId || !e.FromDate || (e.ToDate && e.ToDate < e.FromDate))
        {
            e.Days = 0;
            this.offDays = 0;
            this.changed();
            return;
        }

        this.counting = true;

        this.service
            .countLeaveDays(e.EmployeeId, e.FromDate, e.ToDate || e.FromDate)
            .subscribe(
            {
                next:result =>
                {
                    this.counting = false;
                    e.Days = result.Days;
                    this.offDays = result.OffDays;
                    this.changed();
                },
                error:() =>
                {
                    this.counting = false;
                    this.cdr.detectChanges();
                }
            });
    }

    //===========================================================
    // Fields
    //===========================================================

    onEmployee(value: any):
        void
    {
        this.entity.EmployeeId = Number(value) || 0;

        const employee =
            this.selectedEmployee;

        this.entity.EmployeeCode = employee?.Code ?? '';
        this.entity.EmployeeName = employee?.Name ?? '';

        // a leave type the employee may not take is dropped
        if (!this.typeItems.some(x => x.value === this.entity.LeaveTypeId))
        {
            this.entity.LeaveTypeId = 0;
        }

        this.changed();
        this.loadBalance();
        this.countDays();
    }

    onLeaveType(value: any):
        void
    {
        this.entity.LeaveTypeId = Number(value) || 0;
        this.entity.LeaveTypeName = this.leaveTypes.find(t => t.Id === this.entity.LeaveTypeId)?.Name ?? '';
        this.changed();
    }

    onDate(field: 'FromDate' | 'ToDate', event: Event):
        void
    {
        const before =
            this.entity.FromDate.slice(0, 4);

        this.entity[field] = (event.target as HTMLInputElement).value ?? '';

        // one day : the To Date follows the From Date
        if (field === 'FromDate' && (!this.entity.ToDate || this.entity.ToDate < this.entity.FromDate))
        {
            this.entity.ToDate = this.entity.FromDate;
        }

        this.changed();

        if (this.entity.FromDate.slice(0, 4) !== before)
        {
            this.loadBalance();
        }

        this.countDays();
    }

    onReason(value: any):
        void
    {
        this.entity.Reason = String(value ?? '');
        this.changed();
    }

    onDecisionNote(value: any):
        void
    {
        this.decisionNote = String(value ?? '');
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

        if (!e.EmployeeId)
        {
            return 'Pick the employee.';
        }

        if (!e.LeaveTypeId)
        {
            return 'Pick the leave type.';
        }

        if (!e.FromDate)
        {
            return 'From Date is required.';
        }

        if (e.ToDate && e.ToDate < e.FromDate)
        {
            return 'To Date cannot be before From Date.';
        }

        if ((e.ToDate || e.FromDate).slice(0, 4) !== e.FromDate.slice(0, 4))
        {
            return 'A leave application stays inside one year : make one for each year.';
        }

        if (!e.Reason.trim())
        {
            return 'Reason is required.';
        }

        if (!this.counting && e.Days <= 0)
        {
            return 'Every day of the range is a weekly off day or a holiday : no leave is needed.';
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

        this.isSaving = true;

        this.progressDialog.show('Saving', 'Saving the leave application...', false);

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
                this.toast.error('Error', error?.error?.message ?? 'The leave application could not be saved.');
                this.cdr.detectChanges();
            };

        if (this.mode === 'edit')
        {
            this.service
                .updateLeave(this.entityId, this.entity)
                .subscribe({ next:() => done(`${this.entity.Code} updated.`), error:fail });
        }
        else
        {
            this.service
                .createLeave(this.entity)
                .subscribe({ next:a => done(`${a.Code} created : waiting for approval.`), error:fail });
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

                this.entity = emptyLeaveApplication();
                this.entity.Code = kept.Code;
                this.entity.PublicId = kept.PublicId;
                this.entity.FromDate = attIsoDay(new Date());
                this.entity.ToDate = this.entity.FromDate;
                this.offDays = 0;

                this.changed();
                this.loadBalance();
            },
            'Clear',
            'Cancel',
            'primary');
    }

    //===========================================================
    // Decision : approve / reject / cancel
    //===========================================================

    private decide(decision: 'approve' | 'reject' | 'cancel', done: string):
        void
    {
        this.isSaving = true;

        this.progressDialog.show('Saving', 'Saving the decision...', false);

        this.service
            .decideLeave(this.entityId, decision, this.decisionNote)
            .subscribe(
            {
                next:() =>
                {
                    this.progressDialog.finish(() =>
                    {
                        this.isSaving = false;
                        this.toast.success('Success', done);
                        this.goToList();
                    });
                },
                error:error =>
                {
                    this.progressDialog.fail();
                    this.isSaving = false;
                    this.toast.error('Error', error?.error?.message ?? 'The decision could not be saved.');
                    this.cdr.detectChanges();
                }
            });
    }

    onApprove():
        void
    {
        if (!this.canDecide || this.isSaving)
        {
            return;
        }

        const e =
            this.entity;

        this.confirmDialog.open(
            'Approve Leave',
            `Approve ${e.Code} : ${e.EmployeeName}, ${e.LeaveTypeName}, ${this.dayText(e.FromDate)} to ${this.dayText(e.ToDate)} (${this.days(e.Days)} day(s))? The days go into the attendance as leave.`,
            () => this.decide('approve', `${e.Code} approved : the leave days are on the attendance.`),
            'Approve',
            'Cancel',
            'primary');
    }

    onReject():
        void
    {
        if (!this.canDecide || this.isSaving)
        {
            return;
        }

        if (!this.decisionNote.trim())
        {
            this.toast.error('Reject', 'Write why the application is rejected (Decision Note).');
            return;
        }

        this.confirmDialog.open(
            'Reject Leave',
            `Reject ${this.entity.Code} of ${this.entity.EmployeeName}?`,
            () => this.decide('reject', `${this.entity.Code} rejected.`),
            'Reject',
            'Keep Pending',
            'danger');
    }

    onCancelLeave():
        void
    {
        if (!this.canCancel || this.isSaving)
        {
            return;
        }

        if (!this.decisionNote.trim())
        {
            this.toast.error('Cancel Leave', 'Write why the leave is cancelled (Decision Note).');
            return;
        }

        this.confirmDialog.open(
            'Cancel Leave',
            `Cancel the approved leave ${this.entity.Code} of ${this.entity.EmployeeName}? Its ${this.days(this.entity.Days)} leave day(s) leave the attendance : mark those days again on Daily Attendance.`,
            () => this.decide('cancel', `${this.entity.Code} cancelled : its days are off the attendance.`),
            'Cancel Leave',
            'Keep Leave',
            'danger');
    }

    private goToList():
        void
    {
        void this.router.navigate(['/human-resource-manangement/attendance-management/leave-applications/list']);
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
