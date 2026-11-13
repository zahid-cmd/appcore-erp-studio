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
import { DropdownComponent } from '../../../../../shared/components/controls/dropdown/dropdown';
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
    PfLookup,
    PfPolicy,
    PfSettlement,
    emptyPfPolicy,
    pfDay,
    pfForfeitLines,
    pfMoney,
    pfNumber,
    pfToday
}
from '../../models/provident-fund.model';

import
{
    ProvidentFundService
}
from '../../services/provident-fund.service';


function emptySettlement(): PfSettlement
{
    return {
        PublicId:'',
        Code:'',
        PfMemberId:0,
        MemberCode:'',
        EmployeeCode:'',
        EmployeeName:'',
        SettlementDate:pfToday(),
        Reason:'',
        Remarks:'',
        ServiceYears:0,
        EmployeeBalance:0,
        CompanyBalance:0,
        CompanyPaid:0,
        CompanyForfeited:0,
        LoanOutstanding:0,
        NetPayable:0,
        RuleNote:'',
        IsLatest:false
    };
}


//===============================================================
// PF Settlement Form : payment, cancellation and forfeiture.
//
// Pick the member, the date and the reason : the policy works out
// what the member gets (the own part always; the company part by
// the years and the reason; the loan still out is taken off).
// Nothing is typed in the amounts. A settlement is saved once :
// the member becomes Settled. Deleting it (on the list) takes
// everything back.
//===============================================================

@Component(
{
    selector:'pf-settlement-form',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageCanvasComponent,
        CommandCenterComponent,
        TextboxComponent,
        SearchDropdownComponent,
        DropdownComponent,
        DatepickerComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./pf-settlement-form.html',
    styleUrl:'../pf-pages.css'
})
export class PfSettlementForm
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
        PfSettlement =
        emptySettlement();

    policy:
        PfPolicy =
        emptyPfPolicy();

    private members:
        PfLookup[] = [];

    memberItems:
        { label: string; value: number }[] = [];

    reasonItems:
        { label: string; value: string }[] = [];

    // The amounts are worked out for what is picked now
    worked =
        false;

    working =
        false;

    workProblem =
        '';

    isSaving =
        false;

    get isViewMode(): boolean
    {
        return this.mode === 'view';
    }

    get pageTitle(): string
    {
        return this.isViewMode ? `View PF Settlement ${this.entity.Code}` : 'PF Settlement';
    }

    get member(): PfLookup | undefined
    {
        return this.members.find(x => x.Id === this.entity.PfMemberId);
    }

    get showAmounts(): boolean
    {
        return this.isViewMode || this.worked;
    }

    get forfeitLines(): string[]
    {
        return pfForfeitLines(this.policy);
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
            defaults:this.service.getDefaults('settlements'),
            settlement:id ? this.service.getById<PfSettlement>('settlements', id) : of(null)
        })
        .subscribe(
        {
            next:({ defaults, settlement }) =>
            {
                this.policy = defaults.Policy;
                this.members = defaults.Members;

                this.memberItems =
                    this.members.map(x => ({ label:`${x.Code}  ${x.Name}`, value:x.Id }));

                this.reasonItems =
                    defaults.Reasons.map(x => ({ label:x === 'Misconduct' ? 'Misconduct (illegal activity)' : x, value:x }));

                if (settlement)
                {
                    this.entity = settlement;
                }
                else
                {
                    this.entity.Code = defaults.NextCode;
                }

                this.cdr.detectChanges();
            },
            error:error =>
            {
                this.toast.error('Error', error?.error?.message ?? 'The settlement could not be loaded.');
                this.cdr.detectChanges();
            }
        });
    }

    onMember(value: any):
        void
    {
        this.entity.PfMemberId = Number(value) || 0;
        this.work();
    }

    onDate(event: any):
        void
    {
        this.entity.SettlementDate = event?.target?.value ?? '';
        this.work();
    }

    onReason(value: any):
        void
    {
        this.entity.Reason = String(value ?? '');
        this.work();
    }

    onRemarks(value: any):
        void
    {
        this.entity.Remarks = String(value ?? '');
        this.cdr.detectChanges();
    }

    // Asks the policy what the member gets
    private work():
        void
    {
        const e = this.entity;

        this.worked = false;
        this.workProblem = '';

        if (!e.PfMemberId || !e.SettlementDate || !e.Reason)
        {
            this.cdr.detectChanges();
            return;
        }

        this.working = true;
        this.cdr.detectChanges();

        this.service
            .previewSettlement(e.PfMemberId, e.SettlementDate, e.Reason)
            .subscribe(
            {
                next:p =>
                {
                    // (only when nothing was changed meanwhile)
                    if (e.PfMemberId === this.entity.PfMemberId && e.SettlementDate === this.entity.SettlementDate && e.Reason === this.entity.Reason)
                    {
                        this.entity =
                        {
                            ...this.entity,
                            ServiceYears:p.ServiceYears,
                            EmployeeBalance:p.EmployeeBalance,
                            CompanyBalance:p.CompanyBalance,
                            CompanyPaid:p.CompanyPaid,
                            CompanyForfeited:p.CompanyForfeited,
                            LoanOutstanding:p.LoanOutstanding,
                            NetPayable:p.NetPayable,
                            RuleNote:p.RuleNote
                        };

                        this.worked = true;
                    }

                    this.working = false;
                    this.cdr.detectChanges();
                },
                error:error =>
                {
                    this.working = false;
                    this.workProblem = error?.error?.message ?? 'The settlement could not be worked out.';
                    this.cdr.detectChanges();
                }
            });
    }

    onSave():
        void
    {
        if (this.isSaving || this.isViewMode)
        {
            return;
        }

        const e = this.entity;

        const problem =
            !e.PfMemberId ? 'Pick the member.'
            : !e.SettlementDate ? 'Pick the settlement date.'
            : !e.Reason ? 'Pick the reason.'
            : this.workProblem ? this.workProblem
            : !this.worked ? 'The amounts are still being worked out : try again in a moment.'
            : e.NetPayable < 0 ? `The loan still out is more than what the member gets : recover Tk ${pfMoney(-e.NetPayable)} of the loan first.`
            : '';

        if (problem)
        {
            this.toast.error('Validation', problem);
            return;
        }

        const run =
            () =>
            {
                this.isSaving = true;

                this.progressDialog.show('Saving', 'Saving the settlement...', false);

                this.service
                    .createSettlement(this.entity)
                    .subscribe(
                    {
                        next:s =>
                            this.progressDialog.finish(() =>
                            {
                                this.isSaving = false;
                                this.toast.success('Success', `${s.Code} : ${s.EmployeeName} is settled, net Tk ${pfMoney(s.NetPayable)}.`);
                                this.goToList();
                            }),
                        error:error =>
                        {
                            this.progressDialog.fail();
                            this.isSaving = false;
                            this.toast.error('Error', error?.error?.message ?? 'The settlement could not be saved.');
                            this.cdr.detectChanges();
                        }
                    });
            };

        this.confirmDialog.open(
            'Save PF Settlement',
            `${this.member?.Name ?? 'The member'} leaves the provident fund (${e.Reason}). Net payable Tk ${pfMoney(e.NetPayable)}`
            + (e.CompanyForfeited > 0 ? `; Tk ${pfMoney(e.CompanyForfeited)} of the company part is forfeited.` : '.')
            + ' The member becomes Settled and no more fund deduction is taken from the salary.',
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

        this.entity = emptySettlement();
        this.entity.Code = code;
        this.worked = false;
        this.workProblem = '';

        this.cdr.detectChanges();
    }

    private goToList():
        void
    {
        void this.router.navigate(['/human-resource-manangement/provident-fund/pf-settlements/list']);
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
