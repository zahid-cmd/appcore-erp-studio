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
    Router
}
from '@angular/router';

import { PageHeaderComponent } from '../../../../../../shared/components/layout/page-header/page-header';
import { PageCanvasComponent } from '../../../../../../shared/components/layout/page-canvas/page-canvas';
import { CommandCenterComponent } from '../../../../../../shared/components/utilities/command-center/command-center';
import { TextboxComponent } from '../../../../../../shared/components/controls/textbox/textbox';
import { SearchDropdownComponent } from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { ToastComponent } from '../../../../../../shared/components/utilities/toast/toast';
import { ToastService } from '../../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { HrProgressService } from '../../../../services/hr-progress.service';

import
{
    GenerateSalarySheet,
    payMonthText
}
from '../../../models/payroll.model';

import
{
    PayrollService
}
from '../../../services/payroll.service';


//===============================================================
// Generate Salary Sheet (Human Resource > Payroll Management)
//
// Picks the month and the branch; the server makes the Draft
// sheet from Monthly Attendance, the salary structures and the
// salary advances, then the sheet opens.
//===============================================================

@Component(
{
    selector:'salary-sheet-generate',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageCanvasComponent,
        CommandCenterComponent,
        TextboxComponent,
        SearchDropdownComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./salary-sheet-generate.html',
    styleUrl:'./salary-sheet-generate.css'
})
export class SalarySheetGenerate
implements OnInit
{
    private readonly service = inject(PayrollService);

    private readonly router = inject(Router);

    private readonly toast = inject(ToastService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    request:
        GenerateSalarySheet =
    {
        Year:new Date().getFullYear(),
        Month:new Date().getMonth() + 1,
        BranchId:0,
        LateDaysPerCut:3,
        Remarks:''
    };

    nextCode =
        '';

    branchItems:
        { label: string; value: number }[] = [];

    isSaving =
        false;

    // yyyy-MM of the month box
    get monthValue(): string
    {
        return `${this.request.Year}-${String(this.request.Month).padStart(2, '0')}`;
    }

    get monthText(): string
    {
        return payMonthText(this.request.Year, this.request.Month);
    }

    // The month has not ended : its coming days count as paid
    get isRunningMonth(): boolean
    {
        const now = new Date();

        return this.request.Year === now.getFullYear() && this.request.Month === now.getMonth() + 1;
    }

    get isFutureMonth(): boolean
    {
        const now = new Date();

        return this.request.Year * 12 + this.request.Month > now.getFullYear() * 12 + now.getMonth() + 1;
    }

    ngOnInit():
        void
    {
        this.service
            .getSheetDefaults()
            .subscribe(
            {
                next:d =>
                {
                    this.nextCode = d.NextCode;
                    this.request.Year = d.Year || this.request.Year;
                    this.request.Month = d.Month || this.request.Month;
                    this.request.LateDaysPerCut = d.LateDaysPerCut;

                    this.branchItems =
                        d.Branches.map(b => ({ label:b.Name, value:b.Id }));

                    // one branch only : it is the answer
                    if (d.Branches.length === 1)
                    {
                        this.request.BranchId = d.Branches[0].Id;
                    }

                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.toast.error('Error', error?.error?.message ?? 'The branches could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    onMonth(event: Event):
        void
    {
        const m =
            /^(\d{4})-(\d{2})$/.exec((event.target as HTMLInputElement).value ?? '');

        if (m)
        {
            this.request.Year = Number(m[1]);
            this.request.Month = Number(m[2]);
        }

        this.cdr.detectChanges();
    }

    onBranch(value: any):
        void
    {
        this.request.BranchId = Number(value) || 0;
        this.cdr.detectChanges();
    }

    onLateRule(value: any):
        void
    {
        const number =
            Math.trunc(Number(value));

        this.request.LateDaysPerCut =
            Number.isFinite(number) && number > 0 ? Math.min(31, number) : 0;

        this.cdr.detectChanges();
    }

    onRemarks(value: any):
        void
    {
        this.request.Remarks = String(value ?? '');
        this.cdr.detectChanges();
    }

    onGenerate():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        if (this.isFutureMonth)
        {
            this.toast.error('Validation', `${this.monthText} has not started yet.`);
            return;
        }

        if (!this.request.BranchId)
        {
            this.toast.error('Validation', 'Pick the branch.');
            return;
        }

        this.isSaving = true;

        this.progressDialog.show('Generating', `Working out the salary of ${this.monthText}...`, false);

        this.service
            .generateSheet(this.request)
            .subscribe(
            {
                next:sheet =>
                {
                    this.progressDialog.finish(() =>
                    {
                        this.isSaving = false;
                        this.toast.success('Generated', `${sheet.Code} : ${sheet.EmployeeCount} employee(s).`);

                        void this.router.navigate(
                            ['/human-resource-manangement/payroll-management/salary-sheets/list']);
                    });
                },
                error:error =>
                {
                    this.progressDialog.fail();
                    this.isSaving = false;
                    this.toast.error('Error', error?.error?.message ?? 'The salary sheet could not be generated.');
                    this.cdr.detectChanges();
                }
            });
    }

    onBackToList():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        void this.router.navigate(['/human-resource-manangement/payroll-management/salary-sheets/list']);
    }
}
