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
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import { PageHeaderComponent } from '../../../../../shared/components/layout/page-header/page-header';
import { PageToolbarComponent } from '../../../../../shared/components/layout/page-toolbar/page-toolbar';
import { PageCanvasComponent, PageCanvasConfig } from '../../../../../shared/components/layout/page-canvas/page-canvas';
import { CommandCenterComponent } from '../../../../../shared/components/utilities/command-center/command-center';
import { PaginationComponent } from '../../../../../shared/components/controls/pagination/pagination';
import { ToastComponent } from '../../../../../shared/components/utilities/toast/toast';
import { ConfirmDialogComponent } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';
import { ProgressDialogComponent } from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';
import { ToastService } from '../../../../../shared/components/utilities/toast/toast.service';
import { ConfirmDialogService } from '../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';
import { HrProgressService } from '../../../services/hr-progress.service';
import { hrDateEvent, hrToDate } from '../../../services/hr-date';

import
{
    PfFinancialYear,
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
// The year is a financial year (Settings > General Settings >
// Financial Years), not January to December. Pick one : the page
// shows every member's balance on the last day of that year
// (before the interest of the year) and the interest at the
// policy's rate, employee part and company part each. "Credit
// Interest" writes it to the fund once the year is over; "Delete"
// takes the interest of that year back.
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
        PaginationComponent,
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
        showFooter:true,
        reserveFooterSpace:true,
        bodyScrollable:true,
        fixedHeight:true
    };

    // The financial years, the newest first
    years:
        PfFinancialYear[] = [];

    // The picked year : a financial year, or an interest credited
    // before financial years (its calendar year)
    yearId = 0;

    data:
        PfInterestYear =
        { Year:PfInterestPage.noYear(), Rate:0, Basis:'Monthly', Rows:[] };

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

    // Paging : the screen shows a page of the members (the totals
    // under the table are those of every member)
    page =
        1;

    pageSize =
        10;

    // The first row of the page (0 based) : the # column goes on
    // from it
    get pageStart(): number
    {
        const pages =
            Math.max(1, Math.ceil(this.rows.length / this.pageSize));

        return (Math.min(this.page, pages) - 1) * this.pageSize;
    }

    get pagedRows(): PfInterestRow[]
    {
        return this.rows.slice(this.pageStart, this.pageStart + this.pageSize);
    }

    onPage(page: number):
        void
    {
        this.page = page;
        this.cdr.detectChanges();
    }

    onPageSize(size: number):
        void
    {
        this.pageSize = size;
        this.page = 1;
        this.cdr.detectChanges();
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

    private static noYear(): PfFinancialYear
    {
        return { FinancialYearId:0, Name:'', StartDate:'', EndDate:'', IsCurrent:false, Ended:false, IsPosted:false };
    }

    get runsText(): string
    {
        return this.runs.length > 0 ? this.runs.map(x => x.Name).join(', ') : 'none yet';
    }

    // Interest credited before financial years (January to December)
    get oldRuns(): PfInterestRun[]
    {
        return this.runs.filter(run => !this.years.some(y => y.FinancialYearId === run.Id));
    }

    get oldRun(): PfInterestRun | null
    {
        return this.oldRuns.find(x => x.Id === this.yearId) ?? null;
    }

    get yearName(): string
    {
        return this.oldRun?.Name ?? this.data.Year.Name;
    }

    get isPosted(): boolean
    {
        return this.oldRun !== null || this.data.Year.IsPosted;
    }

    get chipText(): string
    {
        if (this.isPosted)
        {
            const voucher =
                this.runs.find(x => x.Id === this.yearId)?.JournalVoucherNo ?? '';

            return voucher ? `Credited : Journal Voucher ${voucher}` : 'Credited';
        }

        return this.data.Year.FinancialYearId > 0 && !this.data.Year.Ended
            ? `Running : ends ${this.day(this.data.Year.EndDate)}`
            : 'Not credited yet';
    }

    get periodText(): string
    {
        return this.oldRun === null && this.data.Year.StartDate
            ? `${this.day(this.data.Year.StartDate)} to ${this.day(this.data.Year.EndDate)}`
            : '';
    }

    get emptyText(): string
    {
        if (this.loading)
        {
            return 'Working out the interest...';
        }

        if (this.years.length === 0 && this.oldRuns.length === 0)
        {
            return 'No financial year is set up : add one in Settings > General Settings > Financial Years.';
        }

        if (this.oldRun)
        {
            return `${this.oldRun.Name} was credited by calendar year : Tk ${pfMoney(this.oldRun.EmployeeInterest + this.oldRun.CompanyInterest)} to ${this.oldRun.Members} member(s). Delete it, then credit the interest by financial year.`;
        }

        return `No member has a balance at the end of ${this.yearName}.`;
    }

    get basisText(): string
    {
        return this.data.Basis === 'Closing'
            ? 'Interest = rate x the balance on the last day of the financial year, before the interest of that year'
            : 'Interest = the balance at the end of every month of the financial year x rate / 12 (money earns for the months it was in the fund)';
    }

    // 2026-06-30 : 30-Jun-2026
    day(text: string): string
    {
        const date = hrToDate(text);

        return date
            ? `${String(date.getDate()).padStart(2, '0')}-${date.toLocaleString('en-US', { month:'short' })}-${date.getFullYear()}`
            : text;
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

    // The years and what is credited, then the picked year
    load():
        void
    {
        this.loading = true;
        this.cdr.detectChanges();

        this.service
            .getInterestHome()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:home =>
                {
                    this.years = home.Years;
                    this.runs = home.Runs;

                    const known =
                        this.years.some(x => x.FinancialYearId === this.yearId) || this.oldRun !== null;

                    if (!known)
                    {
                        // the newest year that is over; else the current one
                        const pick =
                            this.years.find(x => x.Ended)
                            ?? this.years.find(x => x.IsCurrent)
                            ?? this.years[0];

                        this.yearId = pick?.FinancialYearId ?? this.oldRuns[0]?.Id ?? 0;
                    }

                    this.loadYear();
                },
                error:error => this.failed(error)
            });
    }

    private loadYear():
        void
    {
        if (this.yearId <= 0 || this.oldRun)
        {
            this.data = { Year:PfInterestPage.noYear(), Rate:this.data.Rate, Basis:this.data.Basis, Rows:[] };
            this.loading = false;
            this.cdr.detectChanges();
            return;
        }

        this.loading = true;
        this.cdr.detectChanges();

        this.service
            .previewInterest(this.yearId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
            {
                next:data =>
                {
                    this.data = data;
                    this.page = 1;
                    this.loading = false;
                    this.cdr.detectChanges();
                },
                error:error => this.failed(error)
            });
    }

    private failed(error: any):
        void
    {
        this.loading = false;
        this.toast.error('Error', error?.error?.message ?? 'The interest could not be worked out.');
        this.cdr.detectChanges();
    }

    onYear(event: Event):
        void
    {
        this.yearId = Number((event.target as HTMLSelectElement).value) || 0;
        this.loadYear();
    }

    credit():
        void
    {
        if (this.isSaving)
        {
            return;
        }

        if (this.oldRun)
        {
            this.toast.info('PF Interest', `${this.oldRun.Name} was credited by calendar year : delete it, then pick a financial year.`);
            return;
        }

        if (this.data.Year.FinancialYearId <= 0)
        {
            this.toast.error('PF Interest', 'Pick the financial year.');
            return;
        }

        if (this.data.Year.IsPosted)
        {
            this.toast.info('PF Interest', `The interest of ${this.yearName} is credited already.`);
            return;
        }

        if (!this.data.Year.Ended)
        {
            this.toast.error('PF Interest', `${this.yearName} is not over yet : its interest can be credited after ${this.day(this.data.Year.EndDate)}.`);
            return;
        }

        if (this.data.Rate <= 0)
        {
            this.toast.error('PF Interest', 'Interest is switched off on the Provident Fund Policy.');
            return;
        }

        if (this.totalEmployee + this.totalCompany <= 0)
        {
            this.toast.error('PF Interest', `No member has a balance at the end of ${this.yearName}.`);
            return;
        }

        this.confirmDialog.open(
            'Credit Interest',
            `Credit the interest of ${this.yearName} at ${pfNumber(this.data.Rate)} % : Tk ${pfMoney(this.totalEmployee + this.totalCompany)} to ${this.rows.length} member(s)?`,
            () =>
            {
                this.isSaving = true;

                this.progressDialog.show('Saving', `Crediting the interest of ${this.yearName}...`, false);

                this.service
                    .postInterest(this.data.Year.FinancialYearId)
                    .subscribe(
                    {
                        next:run =>
                            this.progressDialog.finish(() =>
                            {
                                this.isSaving = false;
                                this.toast.success('Credited', `Interest of ${run.Name} : ${run.Members} member(s), Tk ${pfMoney(run.EmployeeInterest + run.CompanyInterest)}${run.JournalVoucherNo ? '. Journal Voucher ' + run.JournalVoucherNo : ''}.`);
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
        if (!this.isPosted)
        {
            this.toast.info('PF Interest', `The interest of ${this.yearName} is not credited.`);
            return;
        }

        this.confirmDialog.open(
            'Delete Interest',
            `Take back the interest of ${this.yearName} from every member?`,
            () =>
                this.service.deleteInterest(this.yearId).subscribe(
                {
                    next:() =>
                    {
                        this.toast.success('Deleted', `The interest of ${this.yearName} was taken back.`);
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
