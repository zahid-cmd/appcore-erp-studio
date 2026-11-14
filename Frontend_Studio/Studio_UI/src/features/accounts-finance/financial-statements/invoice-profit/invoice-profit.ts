//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    inject
}
from '@angular/core';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import
{
    CommonModule
}
from '@angular/common';

import
{
    Subscription,
    timeout
}
from 'rxjs';

//===============================================================
// Shared Components
//===============================================================

import
{
    PageHeaderComponent
}
from '../../../../shared/components/layout/page-header/page-header';

import
{
    CommandCenterComponent
}
from '../../../../shared/components/utilities/command-center/command-center';

import
{
    SearchDropdownComponent
}
from '../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    SearchBoxComponent
}
from '../../../../shared/components/utilities/search-box/search-box';

import
{
    DatepickerComponent
}
from '../../../../shared/components/controls/datepicker/datepicker';

import
{
    ToastComponent
}
from '../../../../shared/components/utilities/toast/toast';

import
{
    OrbitLoaderComponent
}
from '../../../../shared/components/utilities/orbit-loader/orbit-loader';

//===============================================================
// Financial Statements
//===============================================================

import
{
    FaLine,
    toIsoDate
}
from '../models/final-accounts.model';

import
{
    FA_REQUEST_TIMEOUT,
    FaOption,
    FaStatementPage,
    FaStatementPeriod,
    faErrorText,
    faToday
}
from '../shared/fa-statement-page';

import
{
    DailyStatementsService
}
from '../services/daily-statements.service';

import
{
    INVOICE_PROFIT_PRINT_KEY,
    IP_TABS,
    InvoiceProfit,
    IpDay,
    IpLine,
    IpRow,
    IpTotals,
    IpCheckResult,
    buildIpDays,
    dayText,
    ipCheck,
    ipMargin,
    ipRowsShown,
    ipSalesPeople
}
from '../models/daily-statements.model';

import
{
    saveDailyPrintRequest
}
from '../print/daily-statements.print';


//===============================================================
// Invoice-wise Daily Profit & Loss (MB / SP / AC)
//
//   Left  : period (default : today), branch, Show cancelled,
//           Submit; sales person (no reload)
//   Tabs  : Motor Bikes / Spare Parts & Lubricants / Accessories
//   Right : one row per posted sales invoice (returns negative),
//           day subtotals and the total; a row opens its lines.
//           Figures from the document's own journal (agree with
//           the Profit & Loss).
//===============================================================

@Component(
{
    selector:'invoice-profit',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        CommandCenterComponent,
        SearchBoxComponent,
        SearchDropdownComponent,
        DatepickerComponent,
        ToastComponent,
        OrbitLoaderComponent
    ],

    templateUrl:'./invoice-profit.html',

    styleUrl:'./invoice-profit.css'
})

export class InvoiceProfitPage
    extends FaStatementPage
    implements OnInit
{
    protected readonly pageName =
        'Invoice-wise Profit & Loss';

    private readonly daily =
        inject(DailyStatementsService);

    readonly tabs =
        IP_TABS;

    //===========================================================
    // Filter
    //===========================================================

    fromDate:
        Date = faToday();

    toDate:
        Date = faToday();

    salesPerson:
        string = '';

    salesPeople:
        FaOption[] = [{ label:'All sales people', value:'' }];

    //===========================================================
    // View (no reload)
    //===========================================================

    tab:
        IpLine = 'mb';

    // Documents opened (number)
    openDocs =
        new Set<string>();

    //===========================================================
    // Canvas
    //===========================================================

    report:
        InvoiceProfit | null = null;

    days:
        IpDay[] = [];

    grand:
        IpTotals | null = null;

    private loadRequest?:
        Subscription;

    //===========================================================
    // Start
    //===========================================================

    ngOnInit():
        void
    {
        this.loadBranches();
    }

    onFromChange
    (
        date:
            Date
    ):
        void
    {
        this.fromDate = date;

        if (this.fromDate > this.toDate)
        {
            this.toDate = date;
        }
    }

    onToChange
    (
        date:
            Date
    ):
        void
    {
        this.toDate = date;

        if (this.toDate < this.fromDate)
        {
            this.fromDate = date;
        }
    }

    onSalesPersonChange
    (
        value:
            any
    ):
        void
    {
        this.salesPerson = String(value ?? '');

        this.rebuild();
    }

    setTab
    (
        tab:
            IpLine
    ):
        void
    {
        if (this.tab === tab)
        {
            return;
        }

        this.tab = tab;

        this.salesPerson = '';

        this.openDocs.clear();

        this.rebuild();
    }

    // Documents of a tab (badge)
    tabCount
    (
        tab:
            IpLine
    ):
        number
    {
        return this.report?.Rows.filter(x => x.Line === tab).length ?? 0;
    }

    //===========================================================
    // Rows (no statement lines)
    //===========================================================

    protected buildLines():
        FaLine[]
    {
        if (!this.report)
        {
            this.days = [];

            this.grand = null;

            return [];
        }

        this.salesPeople =
        [
            { label:'All sales people', value:'' },
            ...ipSalesPeople(this.report, this.tab).map(x => ({ label:x, value:x }))
        ];

        const built =
            buildIpDays(
                ipRowsShown(
                    this.report,
                    {
                        line:this.tab,
                        salesPerson:this.salesPerson,
                        search:this.searchText
                    }));

        this.days = built.days;

        this.grand = built.total;

        return [];
    }

    protected statementPeriod():
        FaStatementPeriod | null
    {
        return this.report
            ? {
                from:this.report.From,
                to:this.report.To,
                branchId:this.report.BranchId,
                showCancelled:this.report.ShowCancelled
            }
            : null;
    }

    isOpenDoc
    (
        row:
            IpRow
    ):
        boolean
    {
        return this.openDocs.has(row.DocumentNo);
    }

    toggleDoc
    (
        row:
            IpRow
    ):
        void
    {
        if (this.openDocs.has(row.DocumentNo))
        {
            this.openDocs.delete(row.DocumentNo);
        }
        else
        {
            this.openDocs.add(row.DocumentNo);
        }

        this.refreshView();
    }

    margin
    (
        profit:
            number,
        netSales:
            number
    ):
        string
    {
        return this.pct(ipMargin(profit, netSales));
    }

    dayName
    (
        iso:
            string
    ):
        string
    {
        return dayText(iso);
    }

    qty
    (
        value:
            number
    ):
        string
    {
        return (Number(value) || 0).toLocaleString('en-US', { maximumFractionDigits:2 });
    }

    // Invoices of the tab vs the Profit & Loss (hidden while a sales
    // person or a search narrows the list)
    get check():
        IpCheckResult | null
    {
        return this.report && !this.salesPerson && !this.searchText
            ? ipCheck(this.report, this.tab)
            : null;
    }

    get tabLabel():
        string
    {
        return this.tabs.find(x => x.key === this.tab)?.label ?? '';
    }

    //===========================================================
    // Submit / Refresh
    //===========================================================

    submit():
        void
    {
        this.loadRequest?.unsubscribe();

        this.loading = true;

        this.loaded = true;

        this.loadError = '';

        this.refreshView();

        this.loadRequest =
            this.daily
                .getInvoiceProfit(
                    {
                        from:toIsoDate(this.fromDate),
                        to:toIsoDate(this.toDate),
                        branchId:this.branchId,
                        showCancelled:this.showCancelled
                    }
                )
                .pipe(timeout(FA_REQUEST_TIMEOUT), takeUntilDestroyed(this.destroyRef))
                .subscribe
                (
                    {
                        next:
                            (result: InvoiceProfit) =>
                            {
                                this.report = result;

                                this.openDocs.clear();

                                this.salesPerson = '';

                                // Open the first tab that has documents
                                if (this.tabCount(this.tab) === 0)
                                {
                                    this.tab = this.tabs.find(x => this.tabCount(x.key) > 0)?.key ?? this.tab;
                                }

                                this.loading = false;

                                this.rebuild();
                            },
                        error:
                            err =>
                            {
                                this.loading = false;

                                this.report = null;

                                this.loadError = faErrorText(err, 'The invoice-wise profit & loss could not be loaded.');

                                this.refreshView();
                            }
                    }
                );
    }

    refresh():
        void
    {
        this.loadRequest?.unsubscribe();

        this.fromDate = faToday();

        this.toDate = faToday();

        this.branchId = 0;

        this.showCancelled = false;

        this.salesPerson = '';

        this.salesPeople = [{ label:'All sales people', value:'' }];

        this.tab = 'mb';

        this.showCodes = true;

        this.searchText = '';

        this.openDocs.clear();

        this.report = null;

        this.loaded = false;

        this.loading = false;

        this.loadError = '';

        this.days = [];

        this.grand = null;

        this.loadBranches();

        this.refreshView();
    }

    //===========================================================
    // Print
    //===========================================================

    print():
        void
    {
        if (!this.report)
        {
            this.toast.error(
                'Nothing to Print',
                'Submit first to show the invoice-wise profit & loss.'
            );

            return;
        }

        const token =
            saveDailyPrintRequest(
                INVOICE_PROFIT_PRINT_KEY,
                {
                    from:this.report.From,
                    to:this.report.To,
                    branchId:this.report.BranchId,
                    showCancelled:this.report.ShowCancelled,
                    search:this.searchText,
                    tab:this.tab,
                    salesPerson:this.salesPerson,
                    withDetail:this.openDocs.size > 0
                }
            );

        this.openPrint(INVOICE_PROFIT_PRINT_KEY, token);
    }
}
