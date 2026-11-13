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
import { PageToolbarComponent } from '../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../shared/components/layout/page-canvas/page-canvas';
import { CommandCenterComponent } from '../../../../../shared/components/utilities/command-center/command-center';
import { ToastComponent } from '../../../../../shared/components/utilities/toast/toast';
import { ConfirmDialogComponent } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { ToastService } from '../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { HrProgressService } from '../../../services/hr-progress.service';
import { hrDateEvent, hrToDate } from '../../../services/hr-date';

import
{
    PfInterestRow,
    PfInterestRun,
    PfInterestYear,
    pfMoney,
    pfNumber
}
from '../../models/provident-fund.model';

import
{
    ProvidentFundService
}
from '../../services/provident-fund.service';


//===============================================================
// PF Interest : the yearly interest of the fund.
//
// Pick a year : the page shows every member's balance at 31
// December (before the interest of that year) and the interest at
// the policy's rate, employee part and company part each. "Credit
// Interest" writes it to the fund; "Delete" takes the interest of
// that year back.
//===============================================================

@Component(
{
    selector:'pf-interest',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        PageCanvasComponent,
        CommandCenterComponent,
        ToastComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent
    ],
    templateUrl:'./pf-interest.html',
    styleUrl:'./pf-interest.css'
})
export class PfInterestPage
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

    year =
        new Date().getFullYear() - 1;

    data:
        PfInterestYear =
        { Year:this.year, Rate:0, IsPosted:false, Rows:[] };

    runs:
        PfInterestRun[] = [];

    loading =
        false;

    isSaving =
        false;

    get rows(): PfInterestRow[]
    {
        return this.data.Rows;
    }

    get totalEmployee(): number
    {
        return this.rows.reduce((sum, x) => sum + x.EmployeeInterest, 0);
    }

    get totalCompany(): number
    {
        return this.rows.reduce((sum, x) => sum + x.CompanyInterest, 0);
    }

    get totalBalance(): number
    {
        return this.rows.reduce((sum, x) => sum + x.EmployeeBalance + x.CompanyBalance, 0);
    }

    get runsText(): string
    {
        return this.runs.length > 0 ? this.runs.map(x => x.Year).join(', ') : 'none yet';
    }

    money(value: number): string
    {
        return pfMoney(value);
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
        if (!(this.year >= 2000 && this.year <= 2100))
        {
            this.toast.error('PF Interest', 'Type the year (four digits).');
            return;
        }

        this.loading = true;
        this.cdr.detectChanges();

        forkJoin(
        {
            data:this.service.previewInterest(this.year),
            runs:this.service.getInterestRuns()
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(
        {
            next:({ data, runs }) =>
            {
                this.data = { ...data, Rows:data.Rows ?? [] };
                this.runs = runs;
                this.loading = false;
                this.cdr.detectChanges();
            },
            error:error =>
            {
                this.loading = false;
                this.toast.error('Error', error?.error?.message ?? 'The interest could not be worked out.');
                this.cdr.detectChanges();
            }
        });
    }

    onYear(event: Event):
        void
    {
        this.year = Number((event.target as HTMLInputElement).value) || 0;
    }

    step(by: number):
        void
    {
        this.year += by;
        this.load();
    }

    credit():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        if (this.data.IsPosted)
        {
            this.toast.info('PF Interest', `The interest of ${this.data.Year} is credited already.`);
            return;
        }

        if (this.data.Rate <= 0)
        {
            this.toast.error('PF Interest', 'Interest is switched off on the Provident Fund Policy.');
            return;
        }

        if (this.totalEmployee + this.totalCompany <= 0)
        {
            this.toast.error('PF Interest', `No member has a balance at the end of ${this.data.Year}.`);
            return;
        }

        this.confirmDialog.open(
            'Credit Interest',
            `Credit the interest of ${this.data.Year} at ${pfNumber(this.data.Rate)} % : Tk ${pfMoney(this.totalEmployee + this.totalCompany)} to ${this.rows.length} member(s)?`,
            () =>
            {
                this.isSaving = true;

                this.progressDialog.show('Saving', `Crediting the interest of ${this.data.Year}...`, false);

                this.service
                    .postInterest(this.data.Year)
                    .subscribe(
                    {
                        next:run =>
                            this.progressDialog.finish(() =>
                            {
                                this.isSaving = false;
                                this.toast.success('Credited', `Interest of ${run.Year} : ${run.Members} member(s), Tk ${pfMoney(run.EmployeeInterest + run.CompanyInterest)}.`);
                                this.load();
                            }),
                        error:error =>
                        {
                            this.progressDialog.fail();
                            this.isSaving = false;
                            this.toast.error('Error', error?.error?.message ?? 'The interest could not be credited.');
                            this.cdr.detectChanges();
                        }
                    });
            },
            'Credit',
            'Cancel',
            'primary');
    }

    remove():
        void
    {
        if (!this.data.IsPosted)
        {
            this.toast.info('PF Interest', `The interest of ${this.data.Year} is not credited.`);
            return;
        }

        this.confirmDialog.open(
            'Delete Interest',
            `Take back the interest of ${this.data.Year} from every member?`,
            () =>
                this.service.deleteInterest(this.data.Year).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `The interest of ${this.data.Year} was taken back.`);
                        this.load();
                    },
                    error:error =>
                        this.toast.error('Error', error?.error?.message ?? 'The interest could not be deleted.')
                }),
            'Delete',
            'Keep',
            'danger');
    }
}
