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
    PfLookup,
    PfMember,
    PfPolicy,
    emptyPfPolicy,
    pfAmount,
    pfContributionText,
    pfDay,
    pfEligibleText,
    pfMoney,
    pfToday
}
from '../../models/provident-fund.model';

import
{
    ProvidentFundService
}
from '../../services/provident-fund.service';


function emptyMember(): PfMember
{
    return {
        PfMemberId:0,
        PublicId:'',
        Code:'',
        EmployeeId:0,
        EmployeeCode:'',
        EmployeeName:'',
        DesignationName:'',
        JoiningDate:'',
        MemberDate:pfToday(),
        OpeningEmployee:0,
        OpeningCompany:0,
        NomineeName:'',
        NomineeRelation:'',
        NomineePhone:'',
        Status:'Active',
        Remarks:'',
        EmployeeBalance:0,
        CompanyBalance:0,
        LoanOutstanding:0
    };
}


//===============================================================
// PF Member Form : an employee joins the provident fund.
//
// Left : the member (employee, membership date, opening balances,
// nominee). Right : what the policy says (contribution, who can
// join) and, for a saved member, the balances.
// The membership date cannot be before the date the policy lets
// the employee join.
//===============================================================

@Component(
{
    selector:'pf-member-form',
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
    templateUrl:'./pf-member-form.html',
    styleUrl:'../pf-pages.css'
})
export class PfMemberForm
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
        'add' | 'edit' | 'view' =
        'add';

    entityId =
        '';

    entity:
        PfMember =
        emptyMember();

    policy:
        PfPolicy =
        emptyPfPolicy();

    private employees:
        PfLookup[] = [];

    employeeItems:
        { label: string; value: number }[] = [];

    isSaving =
        false;

    private initialJson =
        '';

    get isViewMode(): boolean
    {
        return this.mode === 'view' || this.entity.Status === 'Settled';
    }

    get pageTitle(): string
    {
        return this.mode === 'add' ? 'PF Member' : `${this.mode === 'edit' ? 'Update' : 'View'} PF Member`;
    }

    get contributionText(): string
    {
        return pfContributionText(this.policy);
    }

    get eligibleText(): string
    {
        return pfEligibleText(this.policy);
    }

    // The employee picked (add) : the date the policy lets them join
    get picked(): PfLookup | undefined
    {
        return this.employees.find(x => x.Id === this.entity.EmployeeId);
    }

    get eligibleDate(): string
    {
        return this.picked?.Date ?? '';
    }

    money(value: number): string
    {
        return pfMoney(value);
    }

    day(value: string): string
    {
        return pfDay(value);
    }

    ngOnInit():
        void
    {
        const url =
            this.router.url.toLowerCase();

        this.mode =
            url.includes('/view/') ? 'view' : url.includes('/edit/') ? 'edit' : 'add';

        this.entityId =
            this.route.snapshot.paramMap.get('id') ?? '';

        forkJoin(
        {
            defaults:this.service.getDefaults('members'),
            member:this.entityId ? this.service.getById<PfMember>('members', this.entityId) : of(null)
        })
        .subscribe(
        {
            next:({ defaults, member }) =>
            {
                this.policy = defaults.Policy;
                this.employees = defaults.Employees;

                this.employeeItems =
                    this.employees.map(x => ({
                        label:`${x.Code}  ${x.Name}${x.Date ? '' : '  (' + x.Note + ')'}`,
                        value:x.Id
                    }));

                if (member)
                {
                    this.entity = member;
                }
                else
                {
                    this.entity.Code = defaults.NextCode;
                }

                this.initialJson = JSON.stringify(this.entity);
                this.cdr.detectChanges();
            },
            error:error =>
            {
                this.toast.error('Error', error?.error?.message ?? 'The member could not be loaded.');
                this.cdr.detectChanges();
            }
        });
    }

    onEmployee(value: any):
        void
    {
        this.entity.EmployeeId = Number(value) || 0;

        // the membership starts when the policy lets it (or today)
        const from = this.eligibleDate;

        if (from && this.entity.MemberDate < from)
        {
            this.entity.MemberDate = from;
        }

        this.cdr.detectChanges();
    }

    onDate(event: any):
        void
    {
        this.entity.MemberDate = event?.target?.value ?? '';
        this.cdr.detectChanges();
    }

    onText(field: 'NomineeName' | 'NomineeRelation' | 'NomineePhone' | 'Remarks', value: any):
        void
    {
        this.entity[field] = String(value ?? '');
        this.cdr.detectChanges();
    }

    onAmount(field: 'OpeningEmployee' | 'OpeningCompany', value: any):
        void
    {
        this.entity[field] = pfAmount(value);
        this.cdr.detectChanges();
    }

    private validate():
        string
    {
        const e = this.entity;

        if (!e.EmployeeId)
        {
            return 'Pick the employee.';
        }

        if (!e.MemberDate)
        {
            return 'Pick the membership date.';
        }

        if (this.mode === 'add')
        {
            if (!this.eligibleDate)
            {
                return `${this.picked?.Name ?? 'The employee'} is not confirmed yet : the policy lets an employee join ${this.eligibleText}.`;
            }

            if (e.MemberDate < this.eligibleDate)
            {
                return `The policy lets this employee join ${this.eligibleText} : not before ${pfDay(this.eligibleDate)}.`;
            }
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

        this.progressDialog.show('Saving', 'Saving the member...', false);

        const done =
            (message: string) =>
                this.progressDialog.finish(() =>
                {
                    this.isSaving = false;
                    this.toast.success('Success', message);
                    this.goToList();
                });

        const fail =
            (error: any) =>
            {
                this.progressDialog.fail();
                this.isSaving = false;
                this.toast.error('Error', error?.error?.message ?? 'The member could not be saved.');
                this.cdr.detectChanges();
            };

        if (this.mode === 'edit')
        {
            this.service
                .updateMember(this.entityId, this.entity)
                .subscribe({ next:() => done(`${this.entity.Code} updated.`), error:fail });
        }
        else
        {
            this.service
                .createMember(this.entity)
                .subscribe({ next:m => done(`${m.Code} : ${m.EmployeeName} is in the provident fund.`), error:fail });
        }
    }

    onClear():
        void
    {
        if (this.isViewMode)
        {
            return;
        }

        const kept = this.entity;

        this.entity = emptyMember();
        this.entity.Code = kept.Code;

        if (this.mode === 'edit')
        {
            this.entity = { ...this.entity, PfMemberId:kept.PfMemberId, PublicId:kept.PublicId, EmployeeId:kept.EmployeeId, EmployeeCode:kept.EmployeeCode, EmployeeName:kept.EmployeeName, DesignationName:kept.DesignationName, JoiningDate:kept.JoiningDate, MemberDate:kept.MemberDate, EmployeeBalance:kept.EmployeeBalance, CompanyBalance:kept.CompanyBalance, LoanOutstanding:kept.LoanOutstanding };
        }

        this.cdr.detectChanges();
    }

    private goToList():
        void
    {
        void this.router.navigate(['/human-resource-manangement/provident-fund/pf-members/list']);
    }

    onBackToList():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        if (this.isViewMode || JSON.stringify(this.entity) === this.initialJson)
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
