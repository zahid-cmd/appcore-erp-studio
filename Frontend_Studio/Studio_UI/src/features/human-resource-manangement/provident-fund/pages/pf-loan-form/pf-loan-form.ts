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

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import { PageHeaderComponent } from '../../../../../shared/components/layout/page-header/page-header';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../shared/components/layout/page-canvas/page-canvas';
import { CommandCenterComponent } from '../../../../../shared/components/utilities/command-center/command-center';
import { TextboxComponent } from '../../../../../shared/components/controls/textbox/textbox';
import { SearchDropdownComponent } from '../../../../../shared/components/controls/search-dropdown/search-dropdown';
import { DatepickerComponent } from '../../../../../shared/components/controls/datepicker/datepicker';
import { ToastComponent } from '../../../../../shared/components/utilities/toast/toast';
import { ConfirmDialogComponent } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { ToastService } from '../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { HrProgressService } from '../../../services/hr-progress.service';
import { hrDateEvent, hrToDate } from '../../../services/hr-date';

import
{
    PfLoan,
    PfLookup,
    PfPolicy,
    emptyPfPolicy,
    pfAmount,
    pfDay,
    pfLoanInterestText,
    pfMoney,
    pfNumber,
    pfPlanLoan,
    pfToday
}
from '../../models/provident-fund.model';

import
{
    ProvidentFundService
}
from '../../services/provident-fund.service';


function emptyLoan(): PfLoan
{
    const today = pfToday();

    return {
        PublicId:'',
        Code:'',
        PfMemberId:0,
        MemberCode:'',
        EmployeeCode:'',
        EmployeeName:'',
        LoanDate:today,
        Amount:0,
        Installments:12,
        InstallmentAmount:0,
        StartMonth:today.substring(0, 7),
        Remarks:'',
        InterestRate:0,
        InterestMethod:'',
        TotalInterest:0,
        Recovered:0,
        InterestPaid:0,
        PrincipalOutstanding:0,
        Outstanding:0,
        Status:''
    };
}


//===============================================================
// PF Loan Form : a loan against the provident fund.
//
// A loan is saved once (it is not edited : a loan nothing was
// recovered of can be deleted). The amount cannot be more than
// the policy's percent of the member's own balance, less what is
// still on loan. An instalment is taken from every salary sheet
// from the start month.
//===============================================================

@Component(
{
    selector:'pf-loan-form',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageCanvasComponent,
        CommandCenterComponent,
        TextboxComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./pf-loan-form.html',
    styleUrl:'../pf-pages.css'
})
export class PfLoanForm
implements OnInit
{
    private readonly service = inject(ProvidentFundService);

    private readonly router = inject(Router);

    private readonly route = inject(ActivatedRoute);

    private readonly toast = inject(ToastService);

    private readonly confirmDialog = inject(ConfirmDialogService);

    private readonly progressDialog = inject(HrProgressService);

    private readonly cdr = inject(ChangeDetectorRef);

    private readonly destroyRef = inject(DestroyRef);

    // The shared date picker works with a Date; the page keeps
    // yyyy-MM-dd text
    readonly asDate = hrToDate;

    readonly dateEvent = hrDateEvent;
    // No footer strip under the form (the canvas keeps its height)
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

    mode:
        'add' | 'view' =
        'add';

    entity:
        PfLoan =
        emptyLoan();

    policy:
        PfPolicy =
        emptyPfPolicy();

    private members:
        PfLookup[] = [];

    memberItems:
        { label: string; value: number }[] = [];

    isSaving =
        false;

    get isViewMode(): boolean
    {
        return this.mode === 'view';
    }

    get pageTitle(): string
    {
        return this.isViewMode ? `View PF Loan ${this.entity.Code}` : 'PF Loan';
    }

    get member(): PfLookup | undefined
    {
        return this.members.find(x => x.Id === this.entity.PfMemberId);
    }

    // The most the member can borrow now
    get limit(): number
    {
        const m = this.member;

        return m
            ? Math.max(0, Math.round(m.EmployeeBalance * this.policy.LoanMaxPercent) / 100 - m.LoanOutstanding)
            : 0;
    }

    // The interest terms : a saved loan keeps its own, a new one
    // gets those of the policy today
    get rate(): number
    {
        return this.isViewMode
            ? this.entity.InterestRate
            : this.policy.LoanInterestEnabled ? this.policy.LoanInterestRate : 0;
    }

    get method(): string
    {
        return this.isViewMode
            ? this.entity.InterestMethod
            : this.rate > 0 ? this.policy.LoanInterestMethod : '';
    }

    get interestText(): string
    {
        return this.rate > 0
            ? `${pfNumber(this.rate)} % a year, ${this.method === 'Reducing' ? 'reducing balance' : 'flat'}`
            : 'No interest';
    }

    get policyInterestText(): string
    {
        return pfLoanInterestText(this.policy);
    }

    private get plan(): { interest: number; installment: number }
    {
        return pfPlanLoan(this.entity.Amount, this.entity.Installments, this.rate, this.method);
    }

    get installment(): number
    {
        return this.isViewMode ? this.entity.InstallmentAmount : this.plan.installment;
    }

    get totalInterest(): number
    {
        return this.isViewMode ? this.entity.TotalInterest : this.plan.interest;
    }

    money(value: number): string
    {
        return pfMoney(value);
    }

    number(value: number): string
    {
        return pfNumber(value);
    }

    day(value: string): string
    {
        return pfDay(value);
    }

    ngOnInit():
        void
    {
        this.mode =
            this.router.url.toLowerCase().includes('/view/') ? 'view' : 'add';

        const id =
            this.route.snapshot.paramMap.get('id') ?? '';

        forkJoin(
        {
            defaults:this.service.getDefaults('loans'),
            loan:id ? this.service.getById<PfLoan>('loans', id) : of(null)
        })
        .subscribe(
        {
            next:({ defaults, loan }) =>
            {
                this.policy = defaults.Policy;
                this.members = defaults.Members;

                this.memberItems =
                    this.members.map(x => ({ label:`${x.Code}  ${x.Name}`, value:x.Id }));

                if (loan)
                {
                    this.entity = loan;
                }
                else
                {
                    this.entity.Code = defaults.NextCode;

                    if (!this.policy.LoanEnabled)
                    {
                        this.toast.error('PF Loans', 'Loans are switched off on the Provident Fund Policy.');
                    }
                }

                this.cdr.detectChanges();
            },
            error:error =>
            {
                this.toast.error('Error', error?.error?.message ?? 'The loan could not be loaded.');
                this.cdr.detectChanges();
            }
        });
    }

    onMember(value: any):
        void
    {
        this.entity.PfMemberId = Number(value) || 0;
        this.cdr.detectChanges();
    }

    onDate(event: any):
        void
    {
        this.entity.LoanDate = event?.target?.value ?? '';

        // the recovery never starts before the month of the loan
        if (this.entity.LoanDate && this.entity.StartMonth < this.entity.LoanDate.substring(0, 7))
        {
            this.entity.StartMonth = this.entity.LoanDate.substring(0, 7);
        }

        this.cdr.detectChanges();
    }

    onMonth(event: Event):
        void
    {
        this.entity.StartMonth = (event.target as HTMLInputElement).value ?? '';
        this.cdr.detectChanges();
    }

    onAmount(value: any):
        void
    {
        this.entity.Amount = pfAmount(value);
        this.cdr.detectChanges();
    }

    onInstallments(value: any):
        void
    {
        const number =
            Number(String(value ?? '').replace(/,/g, ''));

        this.entity.Installments = Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
        this.cdr.detectChanges();
    }

    onRemarks(value: any):
        void
    {
        this.entity.Remarks = String(value ?? '');
        this.cdr.detectChanges();
    }

    private validate():
        string
    {
        const e = this.entity;

        if (!this.policy.LoanEnabled)
        {
            return 'Loans are switched off on the Provident Fund Policy.';
        }

        if (!e.PfMemberId)
        {
            return 'Pick the member.';
        }

        if (!e.LoanDate)
        {
            return 'Pick the loan date.';
        }

        if (e.Amount <= 0)
        {
            return 'Type the loan amount.';
        }

        if (e.Amount > this.limit)
        {
            return `The loan can be Tk ${pfMoney(this.limit)} at most : ${pfNumber(this.policy.LoanMaxPercent)} % of the member's own balance, less what is still on loan.`;
        }

        if (e.Installments < 1 || e.Installments > this.policy.LoanMaxInstallments)
        {
            return `Instalments must be 1 to ${this.policy.LoanMaxInstallments} (the policy).`;
        }

        if (!e.StartMonth)
        {
            return 'Pick the month the recovery starts.';
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

        const run =
            () =>
            {
                this.isSaving = true;

                this.progressDialog.show('Saving', 'Saving the loan...', false);

                this.service
                    .createLoan(this.entity)
                    .subscribe(
                    {
                        next:l =>
                            this.progressDialog.finish(() =>
                            {
                                this.isSaving = false;
                                this.toast.success('Success', `${l.Code} : Tk ${pfMoney(l.Amount)} to ${l.EmployeeName}.`);
                                this.goToList();
                            }),
                        error:error =>
                        {
                            this.progressDialog.fail();
                            this.isSaving = false;
                            this.toast.error('Error', error?.error?.message ?? 'The loan could not be saved.');
                            this.cdr.detectChanges();
                        }
                    });
            };

        this.confirmDialog.open(
            'Save PF Loan',
            `Give ${this.member?.Name ?? 'the member'} a loan of Tk ${pfMoney(this.entity.Amount)}, recovered by ${this.entity.Installments} instalment(s) of Tk ${pfMoney(this.installment)} from ${this.entity.StartMonth}${this.totalInterest > 0 ? ` (interest Tk ${pfMoney(this.totalInterest)}, ${this.interestText})` : ''}? A loan is not edited afterwards.`,
            run,
            'Save',
            'Cancel',
            'primary');
    }

    onClear():
        void
    {
        if (this.isViewMode)
        {
            return;
        }

        const code = this.entity.Code;

        this.entity = emptyLoan();
        this.entity.Code = code;

        this.cdr.detectChanges();
    }

    private goToList():
        void
    {
        void this.router.navigate(['/human-resource-manangement/provident-fund/pf-loans/list']);
    }

    onBackToList():
        void
    {
        if (!this.isSaving)
        {
            this.goToList();
        }
    }
}
