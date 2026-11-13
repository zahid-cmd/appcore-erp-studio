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
import { ListTableComponent, ListTableColumn } from '../../../../../shared/components/layout/list-table/list-table';
import { TextboxComponent } from '../../../../../shared/components/controls/textbox/textbox';
import { DropdownComponent } from '../../../../../shared/components/controls/dropdown/dropdown';
import { HistoryDrawerComponent } from '../../../../../shared/components/utilities/history-drawer/history-drawer';
import { ToastComponent } from '../../../../../shared/components/utilities/toast/toast';
import { ConfirmDialogComponent } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { ToastService } from '../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { HrProgressService } from '../../../services/hr-progress.service';
import { hrDateEvent, hrToDate } from '../../../services/hr-date';

import
{
    PfPolicy,
    emptyPfPolicy,
    pfContributionText,
    pfEligibleText,
    pfForfeitLines,
    pfLoanInterestText,
    pfNumber
}
from '../../models/provident-fund.model';

import
{
    ProvidentFundService
}
from '../../services/provident-fund.service';


type PercentField =
    'EmployeePercent' | 'CompanyPercent' | 'InterestRate' | 'LoanMaxPercent' | 'LoanInterestRate' | 'VestingYears';

type WholeField =
    'EligibilityMonths' | 'LoanMaxInstallments';

type SwitchField =
    'CompanyContributes' | 'InterestEnabled' | 'LoanEnabled' | 'LoanInterestEnabled' | 'ForfeitOnMisconduct' | 'FullOnDeathRetirement';


//===============================================================
// Provident Fund Policy : ONE record. The page opens as a list
// with that record (Edit only : no Add, no Delete); Edit opens it
// with Save / Undo in the command center, Save goes back to the
// list.
//
//   Contributions  employee percent, company yes / no and percent,
//                  on the Basic or the Gross salary
//   Eligibility    who can join : from joining, from confirmation
//                  or some months after joining
//   Interest       yes / no and the yearly rate
//   Loans          yes / no, the limit and the instalments
//   Forfeiture     the years the company part needs; misconduct;
//                  death / retirement
//===============================================================

@Component(
{
    selector:'pf-policy',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageCanvasComponent,
        CommandCenterComponent,
        ListTableComponent,
        TextboxComponent,
        DropdownComponent,
        HistoryDrawerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./pf-policy.html',
    styleUrl:'./pf-policy.css'
})
export class PfPolicyPage
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

    readonly baseItems =
    [
        { label:'Basic Salary', value:'Basic' },
        { label:'Gross Salary', value:'Gross' }
    ];

    readonly eligibilityItems =
    [
        { label:'From the joining date', value:'Joining' },
        { label:'From the confirmation date', value:'Confirmation' },
        { label:'Some months after joining', value:'Months' }
    ];

    readonly loanMethodItems =
    [
        { label:'Flat (on the whole loan)', value:'Flat' },
        { label:'Reducing balance', value:'Reducing' }
    ];

    readonly vestingFromItems =
    [
        { label:'The joining date (service)', value:'Joining' },
        { label:'The membership date', value:'Membership' }
    ];

    // As saved
    private saved:
        PfPolicy =
        emptyPfPolicy();

    entity:
        PfPolicy =
        emptyPfPolicy();

    loading =
        false;

    editing =
        false;

    isSaving =
        false;

    historyOpened =
        false;

    historyItems:
        any[] = [];

    readonly listConfig:
        PageCanvasConfig =
    {
        mode:'list',
        showHeader:false,
        showFooter:false,
        reserveFooterSpace:false,
        bodyScrollable:true,
        fixedHeight:true
    };

    readonly actions =
        { view:false, edit:true, delete:false };

    readonly columns:
        ListTableColumn[] =
    [
        { header:'#', field:'serial', type:'serial', width:'50px', align:'center' },
        { header:'Contribution', field:'Contribution', width:'340px', align:'left' },
        { header:'Can Join', field:'Eligible', width:'210px', align:'left' },
        { header:'Interest', field:'Interest', width:'110px', align:'center' },
        { header:'Loans', field:'Loans', width:'380px', align:'left' },
        { header:'Company Part After', field:'Vesting', width:'170px', align:'center' },
        { header:'Members', field:'Members', width:'100px', align:'center' },
        { header:'Actions', field:'actions', type:'actions', width:'110px', align:'center' }
    ];

    // The list : the one record
    get rows(): any[]
    {
        if (this.loading)
        {
            return [];
        }

        const p = this.saved;

        return [
        {
            Contribution:pfContributionText(p),
            Eligible:pfEligibleText(p),
            Interest:p.InterestEnabled ? `${pfNumber(p.InterestRate)} % a year` : 'No',
            Loans:p.LoanEnabled ? `Up to ${pfNumber(p.LoanMaxPercent)} % of own balance, ${p.LoanMaxInstallments} instalments; ${pfLoanInterestText(p)}` : 'No',
            Vesting:p.VestingYears > 0 ? `${pfNumber(p.VestingYears)} year(s)` : 'Always paid',
            Members:p.ActiveMembers
        }];
    }

    get forfeitLines(): string[]
    {
        return pfForfeitLines(this.editing ? this.entity : this.saved);
    }

    get hasChanges(): boolean
    {
        return JSON.stringify(this.entity) !== JSON.stringify(this.saved);
    }

    number(value: number): string
    {
        return pfNumber(value);
    }

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

        this.service
            .getPolicy()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:p =>
                {
                    this.saved = p;
                    this.entity = { ...p };
                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.loading = false;
                    this.toast.error('Error', error?.error?.message ?? 'The provident fund policy could not be loaded.');
                    this.cdr.detectChanges();
                }
            });
    }

    edit():
        void
    {
        this.entity = { ...this.saved };
        this.editing = true;
        this.cdr.detectChanges();
    }

    undo():
        void
    {
        this.entity = { ...this.saved };
        this.cdr.detectChanges();
    }

    back():
        void
    {
        this.entity = { ...this.saved };
        this.editing = false;
        this.cdr.detectChanges();
    }

    onSelect(field: 'ContributionBase' | 'EligibilityRule' | 'VestingFrom' | 'LoanInterestMethod', value: any):
        void
    {
        this.entity[field] = String(value ?? '');
        this.cdr.detectChanges();
    }

    onSwitch(field: SwitchField, event: Event):
        void
    {
        this.entity[field] = (event.target as HTMLInputElement).checked;
        this.cdr.detectChanges();
    }

    onPercent(field: PercentField, value: any):
        void
    {
        const number =
            Number(String(value ?? '').replace(/[,%]/g, ''));

        this.entity[field] =
            Number.isFinite(number) && number > 0 ? Math.round(number * 1000) / 1000 : 0;

        this.cdr.detectChanges();
    }

    onWhole(field: WholeField, value: any):
        void
    {
        const number =
            Number(String(value ?? '').replace(/,/g, ''));

        this.entity[field] =
            Number.isFinite(number) && number > 0 ? Math.round(number) : 0;

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

        if (!(e.EmployeePercent > 0 && e.EmployeePercent <= 100))
        {
            return "Type the employee's contribution (percent, up to 100).";
        }

        if (e.CompanyContributes && !(e.CompanyPercent > 0 && e.CompanyPercent <= 100))
        {
            return "The company contributes : type its percent (or switch it off).";
        }

        if (e.EligibilityRule === 'Months' && !(e.EligibilityMonths >= 1 && e.EligibilityMonths <= 120))
        {
            return 'Months after joining must be 1 to 120.';
        }

        if (e.InterestEnabled && !(e.InterestRate > 0 && e.InterestRate <= 100))
        {
            return 'Interest is on : type the yearly rate (or switch it off).';
        }

        if (e.LoanEnabled && (!(e.LoanMaxPercent > 0 && e.LoanMaxPercent <= 100) || !(e.LoanMaxInstallments >= 1 && e.LoanMaxInstallments <= 120)))
        {
            return "Loans are on : type the limit (percent of the member's own balance) and the instalments (1 to 120).";
        }

        if (e.LoanEnabled && e.LoanInterestEnabled && !(e.LoanInterestRate > 0 && e.LoanInterestRate <= 100))
        {
            return 'Interest on loans is on : type the yearly rate (or switch it off).';
        }

        if (e.VestingYears < 0 || e.VestingYears > 50)
        {
            return 'The years for the company part must be 0 to 50.';
        }

        return '';
    }

    save():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        if (!this.hasChanges)
        {
            this.toast.info('Provident Fund Policy', 'Nothing is changed.');
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

                this.progressDialog.show('Saving', 'Saving the provident fund policy...', false);

                this.service
                    .savePolicy({ ...this.entity, Remarks:this.entity.Remarks.trim() })
                    .subscribe(
                    {
                        next:p =>
                        {
                            this.progressDialog.finish(() =>
                            {
                                this.isSaving = false;
                                this.saved = p;
                                this.entity = { ...p };
                                this.editing = false;
                                this.toast.success('Saved', 'The provident fund policy is saved.');
                                this.cdr.detectChanges();
                            });
                        },
                        error:error =>
                        {
                            this.progressDialog.fail();
                            this.isSaving = false;
                            this.toast.error('Error', error?.error?.message ?? 'The provident fund policy could not be saved.');
                            this.cdr.detectChanges();
                        }
                    });
            };

        this.confirmDialog.open(
            'Change Provident Fund Policy',
            'The new rules are used from the next salary sheet worked out and the next settlement. Salary sheets and settlements saved already stay as they are.',
            run,
            'Update',
            'Cancel',
            'primary');
    }

    openHistory():
        void
    {
        this.service
            .getHistory('policy')
            .subscribe(
            {
                next:items =>
                {
                    this.historyItems =
                        (Array.isArray(items) ? items : []).map(h => ({
                            title:h.ActivityTitle ?? h.activityTitle,
                            description:h.ActivityDescription ?? h.activityDescription,
                            user:h.PerformedByName ?? h.performedByName ?? 'System',
                            dateTime:new Date(h.PerformedDate ?? h.performedDate).toLocaleString(),
                            badge:h.ActivityType ?? h.activityType
                        }));
                    this.historyOpened = true;
                    this.cdr.detectChanges();
                },
                error:() =>
                    this.toast.error('Error', 'The history could not be loaded.')
            });
    }

    closeHistory():
        void
    {
        this.historyOpened = false;
        this.cdr.detectChanges();
    }
}
