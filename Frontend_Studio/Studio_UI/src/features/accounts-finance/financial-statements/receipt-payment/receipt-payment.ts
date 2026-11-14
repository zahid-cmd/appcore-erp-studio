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
    CashFlows,
    RECEIPT_PAYMENT_PRINT_KEY,
    RpItem,
    buildReceiptPayment
}
from '../models/financial-flows.model';

import
{
    FinancialFlowsService
}
from '../services/financial-flows.service';

import
{
    FA_REQUEST_TIMEOUT,
    FaStatementPage,
    FaStatementPeriod,
    faErrorText,
    faToday
}
from '../shared/fa-statement-page';

import
{
    saveFlowPrintRequest
}
from '../print/financial-flows.print';


//===============================================================
// Receipt & Payment Account
//
//   Left  : period (default : this month), branch, Show
//           cancelled, Submit
//   Bar   : level (no reload)
//   Right : Receipts (Dr) | Payments (Cr) side by side : opening
//           balances, receipts by where the money came from,
//           payments by where it went, closing balances. Both
//           sides total the same.
//===============================================================

@Component(
{
    selector:'receipt-payment',

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

    templateUrl:'./receipt-payment.html',

    styleUrl:'./receipt-payment.css'
})

export class ReceiptPaymentPage
    extends FaStatementPage
    implements OnInit
{
    protected readonly pageName =
        'Receipt & Payment';

    private readonly flows =
        inject(FinancialFlowsService);

    //===========================================================
    // Filter (Submit)
    //===========================================================

    fromDate:
        Date = monthStart();

    toDate:
        Date = faToday();

    //===========================================================
    // Canvas
    //===========================================================

    report:
        CashFlows | null = null;

    receipts:
        RpItem[] = [];

    payments:
        RpItem[] = [];

    receiptsTotal:
        number = 0;

    paymentsTotal:
        number = 0;

    // View (no reload)
    showTransfers:
        boolean = false;

    showCashLedgers:
        boolean = true;

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

    onTransfersChange
    (
        event:
            Event
    ):
        void
    {
        this.showTransfers = !!(event.target as HTMLInputElement | null)?.checked;

        this.rebuild();
    }

    onCashLedgersChange
    (
        event:
            Event
    ):
        void
    {
        this.showCashLedgers = !!(event.target as HTMLInputElement | null)?.checked;

        this.rebuild();
    }

    //===========================================================
    // Lines
    //===========================================================

    // Two sides (no statement lines)
    protected buildLines():
        FaLine[]
    {
        if (!this.report)
        {
            this.receipts = [];

            this.payments = [];

            this.receiptsTotal = 0;

            this.paymentsTotal = 0;

            return [];
        }

        const sides =
            buildReceiptPayment(
                this.report,
                {
                    level:this.level,
                    search:this.searchText,
                    showTransfers:this.showTransfers,
                    showCashLedgers:this.showCashLedgers
                });

        this.receipts = sides.receipts;

        this.payments = sides.payments;

        this.receiptsTotal = sides.receiptsTotal;

        this.paymentsTotal = sides.paymentsTotal;

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

    // Rows of the two sides, side by side
    get sideRows():
        { dr:RpItem | null; cr:RpItem | null }[]
    {
        const count =
            Math.max(this.receipts.length, this.payments.length);

        return Array.from(
            { length:count },
            (_, i) =>
            ({
                dr:this.receipts[i] ?? null,
                cr:this.payments[i] ?? null
            })
        );
    }

    canOpen
    (
        item:
            RpItem
    ):
        boolean
    {
        return !!item.flow?.LedgerCode || !!item.cash?.LedgerCode;
    }

    itemClick
    (
        item:
            RpItem
    ):
        void
    {
        if (item.flow?.LedgerCode)
        {
            this.openStatement(item.flow.LedgerCode, item.flow.LedgerType);
        }
        else if (item.cash?.LedgerCode)
        {
            this.openStatement(item.cash.LedgerCode, item.cash.LedgerType);
        }
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
            this.flows
                .getCashFlows(
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
                            result =>
                            {
                                this.report = result;

                                this.collapsed.clear();

                                this.loading = false;

                                this.rebuild();
                            },
                        error:
                            err =>
                            {
                                this.loading = false;

                                this.report = null;

                                this.loadError = faErrorText(err, 'The receipt & payment account could not be loaded.');

                                this.refreshView();
                            }
                    }
                );
    }

    refresh():
        void
    {
        this.loadRequest?.unsubscribe();

        this.fromDate = monthStart();

        this.toDate = faToday();

        this.branchId = 0;

        this.showCancelled = false;

        this.level = 1;

        this.showCodes = true;

        this.showZero = false;

        this.searchText = '';

        this.collapsed.clear();

        this.report = null;

        this.receipts = [];

        this.payments = [];

        this.showTransfers = false;

        this.showCashLedgers = true;

        this.loaded = false;

        this.loading = false;

        this.loadError = '';

        this.allLines = [];

        this.lines = [];

        this.loadBranches();

        this.refreshView();
    }

    //===========================================================
    // Figures
    //===========================================================

    get balanced():
        boolean
    {
        return !!this.report && Math.abs(this.receiptsTotal - this.paymentsTotal) < 0.005;
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
                'Submit first to show the receipt & payment account.'
            );

            return;
        }

        const token =
            saveFlowPrintRequest(
                RECEIPT_PAYMENT_PRINT_KEY,
                {
                    from:this.report.From,
                    to:this.report.To,
                    branchId:this.report.BranchId,
                    showCancelled:this.report.ShowCancelled,
                    level:this.level,
                    showCodes:this.showCodes,
                    showZero:this.showZero,
                    search:this.searchText,
                    showTransfers:this.showTransfers,
                    showCashLedgers:this.showCashLedgers
                }
            );

        this.openPrint(RECEIPT_PAYMENT_PRINT_KEY, token);
    }
}


//===============================================================
// Helpers
//===============================================================

function monthStart():
    Date
{
    const today =
        faToday();

    return new Date(today.getFullYear(), today.getMonth(), 1);
}
