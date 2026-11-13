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
    PayrollEmployee,
    SalaryAdvance,
    emptySalaryAdvance,
    payAmount,
    payMoney,
    payMonthText,
    payToday
}
from '../../../models/payroll.model';

import
{
    PayrollService
}
from '../../../services/payroll.service';


//===============================================================
// Salary Advances Form (Human Resource > Payroll Management)
//
// Left : the advance / loan (employee, date, amount, monthly
// installment, the first salary month it is taken from).
// Right : the recovery plan and what has been recovered. The
// money itself is paid out by a Payment Voucher; its number can
// be noted here.
//===============================================================

@Component(
{
    selector:'salary-advances-form',
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
    templateUrl:'./salary-advances-form.html',
    styleUrl:'./salary-advances-form.css'
})
export class SalaryAdvancesForm
implements OnInit
{
    // The shared date picker works with a Date; the page keeps
    // yyyy-MM-dd text
    readonly asDate = hrToDate;

    readonly dateEvent = hrDateEvent;

    private readonly service = inject(PayrollService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    readonly typeItems =
    [
        { label:'Advance', value:'Advance' },
        { label:'Loan', value:'Loan' }
    ];

    mode:
        'add' | 'edit' | 'view' =
        'add';

    entityId =
        '';

    entity:
        SalaryAdvance =
        emptySalaryAdvance();

    private employees:
        PayrollEmployee[] = [];

    employeeItems:
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

    // A salary sheet has taken from it : the employee is fixed
    get isUsed(): boolean
    {
        return this.entity.Recovered > 0;
    }

    get pageTitle(): string
    {
        return this.mode === 'add'
            ? 'Salary Advance'
            : this.mode === 'edit'
                ? `Update Salary Advance ${this.entity.Code}`
                : `View Salary Advance ${this.entity.Code}`;
    }

    get saveButtonText(): string
    {
        return this.mode === 'edit' ? 'Update' : 'Save';
    }

    get selectedEmployee(): PayrollEmployee | undefined
    {
        return this.employees.find(e => e.Id === this.entity.EmployeeId);
    }

    // yyyy-MM of the start month box
    get startValue(): string
    {
        return this.entity.StartYear > 0 && this.entity.StartMonth > 0
            ? `${this.entity.StartYear}-${String(this.entity.StartMonth).padStart(2, '0')}`
            : '';
    }

    get startText(): string
    {
        return payMonthText(this.entity.StartYear, this.entity.StartMonth);
    }

    // What is still to recover
    get balance(): number
    {
        return Math.max(0, (Number(this.entity.Amount) || 0) - (Number(this.entity.Recovered) || 0));
    }

    // Salary months it takes to recover the balance
    get months(): number
    {
        const installment =
            Number(this.entity.InstallmentAmount) || 0;

        return installment > 0 ? Math.ceil(this.balance / installment) : 0;
    }

    // The last installment (the rest of the balance)
    get lastInstallment(): number
    {
        const installment =
            Number(this.entity.InstallmentAmount) || 0;

        if (installment <= 0 || this.months === 0)
        {
            return 0;
        }

        return Math.round((this.balance - installment * (this.months - 1)) * 100) / 100;
    }

    // The installment against the employee's gross salary
    get heavy(): boolean
    {
        const gross =
            this.selectedEmployee?.GrossSalary ?? 0;

        return gross > 0 && (Number(this.entity.InstallmentAmount) || 0) > gross / 2;
    }

    money(value: number): string
    {
        return payMoney(value);
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
            defaults:this.service.getAdvanceDefaults(),
            advance:this.entityId ? this.service.getAdvance(this.entityId) : of(null)
        })
        .subscribe(
        {
            next:({ defaults, advance }) =>
            {
                this.employees = defaults.Employees;

                if (advance)
                {
                    this.entity = advance;
                }
                else
                {
                    const today = payToday();

                    this.entity.Code = defaults.NextCode;
                    this.entity.AdvanceDate = today;
                    this.entity.StartYear = Number(today.slice(0, 4));
                    this.entity.StartMonth = Number(today.slice(5, 7));
                }

                this.employeeItems =
                    this.employees.map(e => ({ label:`${e.Code}  ${e.Name}${e.DesignationName ? '  - ' + e.DesignationName : ''}`, value:e.Id }));

                // an employee who has left since stays on the list
                if (this.entity.EmployeeId > 0 && !this.employeeItems.some(x => x.value === this.entity.EmployeeId))
                {
                    this.employeeItems.push({ label:`${this.entity.EmployeeCode}  ${this.entity.EmployeeName}`, value:this.entity.EmployeeId });
                }

                this.loading = false;
                this.setInitialState();
            },
            error:error =>
            {
                this.loading = false;
                this.toast.error('Error', error?.error?.message ?? 'The salary advance could not be loaded.');
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

    onEmployee(value: any):
        void
    {
        this.entity.EmployeeId = Number(value) || 0;
        this.entity.EmployeeCode = this.selectedEmployee?.Code ?? '';
        this.entity.EmployeeName = this.selectedEmployee?.Name ?? '';
        this.changed();
    }

    onType(value: any):
        void
    {
        this.entity.AdvanceType = String(value ?? '') || 'Advance';
        this.changed();
    }

    onDate(event: Event):
        void
    {
        const value =
            (event.target as HTMLInputElement).value ?? '';

        this.entity.AdvanceDate = value;

        // recovery never starts before the month it was given
        if (/^\d{4}-\d{2}/.test(value))
        {
            const year = Number(value.slice(0, 4));
            const month = Number(value.slice(5, 7));

            if (this.entity.StartYear * 12 + this.entity.StartMonth < year * 12 + month)
            {
                this.entity.StartYear = year;
                this.entity.StartMonth = month;
            }
        }

        this.changed();
    }

    onStart(event: Event):
        void
    {
        const m =
            /^(\d{4})-(\d{2})$/.exec((event.target as HTMLInputElement).value ?? '');

        this.entity.StartYear = m ? Number(m[1]) : 0;
        this.entity.StartMonth = m ? Number(m[2]) : 0;
        this.changed();
    }

    onAmount(field: 'Amount' | 'InstallmentAmount', value: any):
        void
    {
        this.entity[field] = payAmount(value);
        this.changed();
    }

    onText(field: 'Reason' | 'VoucherNo', value: any):
        void
    {
        this.entity[field] = String(value ?? '');
        this.changed();
    }

    onClosed(event: Event):
        void
    {
        this.entity.IsClosed = (event.target as HTMLInputElement).checked;
        this.changed();
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

        if (!e.AdvanceDate)
        {
            return 'Date is required.';
        }

        if (e.AdvanceDate > payToday())
        {
            return 'The date cannot be in the future.';
        }

        if (e.Amount <= 0)
        {
            return 'Amount must be more than 0.';
        }

        if (e.Amount < e.Recovered)
        {
            return `Tk ${this.money(e.Recovered)} has already been recovered from salary : the amount cannot be less than that.`;
        }

        if (e.InstallmentAmount <= 0)
        {
            return 'Monthly Installment must be more than 0.';
        }

        if (e.InstallmentAmount > e.Amount)
        {
            return 'Monthly Installment cannot be more than the amount.';
        }

        if (!e.StartYear || !e.StartMonth)
        {
            return 'Pick the first salary month the installment is taken from.';
        }

        if (e.StartYear * 12 + e.StartMonth < Number(e.AdvanceDate.slice(0, 4)) * 12 + Number(e.AdvanceDate.slice(5, 7)))
        {
            return 'Recovery cannot start before the month the advance was given.';
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

        this.progressDialog.show('Saving', 'Saving the salary advance...', false);

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
                this.toast.error('Error', error?.error?.message ?? 'The salary advance could not be saved.');
                this.cdr.detectChanges();
            };

        if (this.mode === 'edit')
        {
            this.service
                .updateAdvance(this.entityId, this.entity)
                .subscribe({ next:() => done(`${this.entity.Code} updated.`), error:fail });
        }
        else
        {
            this.service
                .createAdvance(this.entity)
                .subscribe({ next:a => done(`${a.Code} created.`), error:fail });
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
                const today = payToday();

                this.entity = emptySalaryAdvance();
                this.entity.Code = kept.Code;
                this.entity.PublicId = kept.PublicId;
                this.entity.AdvanceDate = today;
                this.entity.StartYear = Number(today.slice(0, 4));
                this.entity.StartMonth = Number(today.slice(5, 7));

                // what salary sheets took, and from whom, stays
                this.entity.Recovered = kept.Recovered;

                if (kept.Recovered > 0)
                {
                    this.entity.EmployeeId = kept.EmployeeId;
                    this.entity.EmployeeCode = kept.EmployeeCode;
                    this.entity.EmployeeName = kept.EmployeeName;
                }

                this.changed();
            },
            'Clear',
            'Cancel',
            'primary');
    }

    private goToList():
        void
    {
        void this.router.navigate(['/human-resource-manangement/payroll-management/salary-advances/list']);
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
