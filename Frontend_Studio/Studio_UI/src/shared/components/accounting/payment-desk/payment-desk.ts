//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    Input,
    Output,
    EventEmitter,
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
    FormsModule
}
from '@angular/forms';

//===============================================================
// Shared Controls
//===============================================================

import
{
    TextboxComponent
}
from '../../controls/textbox/textbox';

import
{
    DropdownComponent
}
from '../../controls/dropdown/dropdown';

import
{
    SearchDropdownComponent
}
from '../../controls/search-dropdown/search-dropdown';

import
{
    DatepickerComponent
}
from '../../controls/datepicker/datepicker';

//===============================================================
// Accounting
//===============================================================

import
{
    AccountingLookupService
}
from '../accounting-lookup.service';

import
{
    CardOption,
    BankOption,
    CardChargeRate,
    VoucherDebitLine,
    needsDetails,
    debitDetailIssue,
    isDebitRowReady,
    amountInWords,
    roundMoney,
    formatMoney,
    parseMoney,
    toIsoDate,
    fromIsoDate
}
from '../accounting.models';


//===============================================================
// Local Types
//===============================================================

type DeskRowState =
    'todo' | 'ready' | 'verified';

interface SelectItem
{
    label:
        string;

    value:
        any;
}


//===============================================================
// Component
//
// Payment Desk (step 2) : details of the Check / MFS / POS / EMI
// debit rows entered on step 1 (Cash / Bank rows need nothing).
//
//   LEFT  : the rows that need details, each ! Details needed,
//           Ready to verify or ✓ Verified; click one to edit it
//   RIGHT : summary chips, then the selected row's details and
//           the Verify Row button (only when the details are
//           complete; any later change clears Verified)
//     Check : Check No*, Check Date*, Issuing Bank*, Deposited
//             Bank (read only : the step 1 ledger)
//     MFS   : Transaction ID*, Charge % / Amount, Borne By
//     POS   : Card*, Approval / Last 4, Charge % / Amount,
//             Borne By (charge % from Card Charges)
//     EMI   : Card*, Tenure*, Interest % / Amount, Total
//             Charged, Charge % / Amount, Borne By
//
// Hosted inside the voucher page's modal (header / footer there).
// Mode, ledger and amount are never changed here.
//===============================================================

@Component(
{
    selector:'app-payment-desk',

    standalone:true,

    imports:
    [
        CommonModule,
        FormsModule,
        TextboxComponent,
        DropdownComponent,
        SearchDropdownComponent,
        DatepickerComponent
    ],

    templateUrl:'./payment-desk.html',

    styleUrls:
    [
        './payment-desk.css'
    ]
})

export class PaymentDeskComponent
implements OnInit
{
    //===========================================================
    // Injection
    //===========================================================

    private readonly lookup =
        inject(AccountingLookupService);

    private readonly cdr =
        inject(ChangeDetectorRef);


    //===========================================================
    // Inputs
    //===========================================================

    @Input()
    readonly:
        boolean =
        false;

    // Every debit row of the voucher (step 1)
    @Input()
    set lines
    (
        value:
            VoucherDebitLine[] | null
    )
    {
        this.rows =
            (value ?? []).map
            (
                line =>
                ({
                    ...line
                })
            );

        // Charged rows without a side yet : the company bears it
        for
        (
            const row of this.rows
        )
        {
            if
            (
                this.hasCharge(row)
                &&
                !row.ChargeBorneBy
            )
            {
                row.ChargeBorneBy =
                    'Company';
            }
        }

        if
        (
            !this.detailIndexes.includes(this.selectedIndex)
        )
        {
            this.selectedIndex =
                this.firstIncomplete();
        }

        this.loadSelectedTexts();

        this.emitValid();

        this.cdr.markForCheck();
    }


    //===========================================================
    // Outputs
    //===========================================================

    @Output()
    linesChange =
        new EventEmitter<VoucherDebitLine[]>();

    // Every Check / MFS / POS / EMI row is complete
    @Output()
    validChange =
        new EventEmitter<boolean>();


    //===========================================================
    // Data
    //===========================================================

    rows:
        VoucherDebitLine[] =
        [];

    selectedIndex:
        number =
        -1;

    // Row that was just ticked (short pulse on the left)
    pulseIndex:
        number =
        -1;

    private advanceTimer:
        ReturnType<typeof setTimeout> | null =
        null;


    //===========================================================
    // Look-ups
    //===========================================================

    private cards:
        CardOption[] =
        [];

    private cardRates:
        CardChargeRate[] =
        [];

    // POS accounts whose card lines were loaded one by one
    private loadedPosRates:
        Set<number> =
        new Set<number>();

    cardItems:
        SelectItem[] =
        [];

    bankItems:
        SelectItem[] =
        [];

    readonly borneByItems:
        SelectItem[] =
    [
        {
            label:'Company',
            value:'Company'
        },
        {
            label:'Customer (pays on top)',
            value:'Customer'
        }
    ];


    //===========================================================
    // Text fields of the selected row
    //===========================================================

    chargePercentText:
        string =
        '';

    chargeAmountText:
        string =
        '';

    tenureText:
        string =
        '';

    interestPercentText:
        string =
        '';

    interestAmountText:
        string =
        '';

    totalChargedText:
        string =
        '';

    checkDateValue:
        Date | null =
        null;


    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        this.loadLookups();

        this.emitValid();
    }

    private loadLookups():
        void
    {
        this.lookup
            .getCards()
            .subscribe
            ({
                next:
                (
                    cards:
                        CardOption[]
                ):
                    void =>
                {
                    this.cards =
                        cards;

                    this.cardItems =
                        cards
                            .filter
                            (
                                card =>
                                    card.IsActive
                            )
                            .sort
                            (
                                (a, b) =>
                                    a.CardName.localeCompare(b.CardName)
                            )
                            .map
                            (
                                card =>
                                ({
                                    label:
                                        card.IssuingBank
                                            ? `${card.CardName} (${card.IssuingBank})`
                                            : card.CardName,
                                    value:
                                        card.CardSetupId
                                })
                            );

                    this.cdr.markForCheck();
                },

                error:
                ():
                    void =>
                {
                    this.cards =
                        [];
                }
            });

        this.lookup
            .getBanks()
            .subscribe
            ({
                next:
                (
                    banks:
                        BankOption[]
                ):
                    void =>
                {
                    this.bankItems =
                        banks
                            .filter
                            (
                                bank =>
                                    bank.IsActive
                            )
                            .sort
                            (
                                (a, b) =>
                                    a.BankName.localeCompare(b.BankName)
                            )
                            .map
                            (
                                bank =>
                                ({
                                    label:
                                        bank.BankName,
                                    value:
                                        bank.BankName
                                })
                            );

                    this.cdr.markForCheck();
                },

                error:
                ():
                    void =>
                {
                    this.bankItems =
                        [];
                }
            });

        this.lookup
            .getCardCharges()
            .subscribe
            ({
                next:
                (
                    rates:
                        CardChargeRate[]
                ):
                    void =>
                {
                    this.cardRates =
                        rates;
                },

                error:
                ():
                    void =>
                {
                    this.cardRates =
                        [];
                }
            });
    }


    //===========================================================
    // Rows needing details
    //===========================================================

    get detailIndexes():
        number[]
    {
        return this.rows
            .map
            (
                (row, index) =>
                    needsDetails(row.Mode)
                        ? index
                        : -1
            )
            .filter
            (
                index =>
                    index >= 0
            );
    }

    get selected():
        VoucherDebitLine | null
    {
        return this.rows[this.selectedIndex]
            ??
            null;
    }

    private firstIncomplete():
        number
    {
        const indexes =
            this.detailIndexes;

        return indexes.find
        (
            index =>
                !isDebitRowReady(this.rows[index])
        )
        ??
        indexes[0]
        ??
        -1;
    }

    selectRow
    (
        index:
            number
    ):
        void
    {
        this.selectedIndex =
            index;

        this.loadSelectedTexts();
    }

    hasCharge
    (
        row:
            VoucherDebitLine
    ):
        boolean
    {
        return row.Mode === 'MFS'
            ||
            row.Mode === 'POS'
            ||
            row.Mode === 'EMI';
    }

    hasCard
    (
        row:
            VoucherDebitLine
    ):
        boolean
    {
        return row.Mode === 'POS'
            ||
            row.Mode === 'EMI';
    }

    // '' when complete
    rowIssue
    (
        row:
            VoucherDebitLine
    ):
        string
    {
        return debitDetailIssue(
            row
        );
    }

    // Every detail row is complete and ticked Verified
    get allComplete():
        boolean
    {
        return this.detailIndexes.every
        (
            index =>
                isDebitRowReady(this.rows[index])
        );
    }

    rowState
    (
        row:
            VoucherDebitLine
    ):
        DeskRowState
    {
        if
        (
            this.rowIssue(row)
        )
        {
            return 'todo';
        }

        return row.Verified
            ? 'verified'
            : 'ready';
    }

    get selectedIssue():
        string
    {
        return this.selected
            ? this.rowIssue(this.selected)
            : '';
    }


    //===========================================================
    // Summary
    //===========================================================

    get totalReceived():
        number
    {
        return roundMoney(
            this.rows.reduce
            (
                (sum, row) =>
                    sum + (Number(row.Amount) || 0),
                0
            )
        );
    }

    get customerCharges():
        number
    {
        return roundMoney(
            this.rows
                .filter
                (
                    row =>
                        row.ChargeBorneBy === 'Customer'
                )
                .reduce
                (
                    (sum, row) =>
                        sum + (Number(row.ChargeAmount) || 0),
                    0
                )
        );
    }

    get totalCollected():
        number
    {
        return roundMoney(
            this.totalReceived + this.customerCharges
        );
    }

    get pendingChecks():
        VoucherDebitLine[]
    {
        return this.rows.filter
        (
            row =>
                row.Mode === 'Check'
        );
    }

    get pendingCheckAmount():
        number
    {
        return roundMoney(
            this.pendingChecks.reduce
            (
                (sum, row) =>
                    sum + (Number(row.Amount) || 0),
                0
            )
        );
    }

    // Total Collected in words (Crore / Lakh / Thousand)
    get collectedInWords():
        string
    {
        return amountInWords(
            this.totalCollected
        );
    }

    money
    (
        value:
            number
    ):
        string
    {
        return formatMoney(
            value
        );
    }

    modeIcon
    (
        mode:
            string
    ):
        string
    {
        switch
        (
            mode
        )
        {
            case 'Check':
                return 'fas fa-money-check';

            case 'MFS':
                return 'fas fa-mobile-screen-button';

            case 'POS':
                return 'fas fa-credit-card';

            case 'EMI':
                return 'fas fa-calendar-check';

            default:
                return 'fas fa-money-bill';
        }
    }


    //===========================================================
    // Selected row : text fields
    //===========================================================

    private loadSelectedTexts():
        void
    {
        const row =
            this.selected;

        const show =
            (value: number, decimals: boolean): string =>
                value
                    ? (decimals ? value.toFixed(2) : String(value))
                    : '';

        this.chargePercentText =
            show(row?.ChargePercent ?? 0, false);

        this.chargeAmountText =
            show(row?.ChargeAmount ?? 0, true);

        this.tenureText =
            show(row?.TenureMonths ?? 0, false);

        this.interestPercentText =
            show(row?.InterestPercent ?? 0, false);

        this.interestAmountText =
            show(row?.InterestAmount ?? 0, true);

        this.totalChargedText =
            show(row?.TotalCharged ?? 0, true);

        this.checkDateValue =
            fromIsoDate(
                row?.CheckDate
            );
    }

    private update
    (
        change:
            (row: VoucherDebitLine) => void
    ):
        void
    {
        const row =
            this.selected;

        if
        (
            !row
            ||
            this.readonly
        )
        {
            return;
        }

        change(row);

        // The details changed : the tick must be given again
        row.Verified =
            false;

        this.emitLines();
    }


    //===========================================================
    // Verify Row
    //===========================================================

    // Verify Row : one way; the button stays disabled until a
    // detail changes (which clears Verified)
    verifyRow():
        void
    {
        const row =
            this.selected;

        if
        (
            !row
            ||
            this.readonly
            ||
            row.Verified
            ||
            this.rowIssue(row)
        )
        {
            return;
        }

        row.Verified =
            true;

        this.emitLines();

        // Short pulse on the left, then move to the next row
        // still waiting
        const index =
            this.selectedIndex;

        this.pulseIndex =
            index;

        if
        (
            this.advanceTimer
        )
        {
            clearTimeout(
                this.advanceTimer
            );
        }

        this.advanceTimer =
            setTimeout
            (
                () =>
                {
                    this.advanceTimer =
                        null;

                    if
                    (
                        this.pulseIndex === index
                    )
                    {
                        this.pulseIndex =
                            -1;
                    }

                    const next =
                        this.detailIndexes.find
                        (
                            item =>
                                !isDebitRowReady(this.rows[item])
                        );

                    if
                    (
                        next !== undefined
                        &&
                        this.selectedIndex === index
                    )
                    {
                        this.selectRow(
                            next
                        );
                    }

                    this.cdr.markForCheck();
                },
                650
            );
    }


    //===========================================================
    // Check
    //===========================================================

    onCheckNo
    (
        input:
            string | number
    ):
        void
    {
        this.update(
            row =>
                row.CheckNo =
                    String(input ?? '').trim()
        );
    }

    onCheckDate
    (
        value:
            Date | null
    ):
        void
    {
        this.checkDateValue =
            value;

        this.update(
            row =>
                row.CheckDate =
                    value
                        ? toIsoDate(value)
                        : ''
        );
    }

    onCheckBank
    (
        value:
            any
    ):
        void
    {
        this.update(
            row =>
                row.CheckBank =
                    String(value ?? '')
        );
    }


    //===========================================================
    // MFS / POS reference
    //===========================================================

    onTransactionRef
    (
        input:
            string | number
    ):
        void
    {
        this.update(
            row =>
                row.TransactionRef =
                    String(input ?? '').trim()
        );
    }


    //===========================================================
    // Card (POS / EMI)
    //===========================================================

    onCardChange
    (
        value:
            any
    ):
        void
    {
        const id =
            Number(value) || 0;

        const card =
            this.cards.find
            (
                item =>
                    item.CardSetupId === id
            );

        this.update(
            row =>
            {
                row.CardSetupId =
                    card?.CardSetupId ?? 0;

                row.CardName =
                    card?.CardName ?? '';

            }
        );

        // POS : Card Charges rate of this POS + card (editable)
        const row =
            this.selected;

        if
        (
            row
            &&
            row.Mode === 'POS'
            &&
            row.CardSetupId > 0
        )
        {
            this.applyCardRate(
                row
            );
        }
    }

    // Rate from Card Charges (loaded per POS account when the
    // list did not carry the card lines)
    private applyCardRate
    (
        row:
            VoucherDebitLine
    ):
        void
    {
        const find =
            ():
                CardChargeRate | undefined =>
                this.cardRates.find
                (
                    item =>
                        item.POSAccountId === row.AccountId
                        &&
                        item.CardSetupId === row.CardSetupId
                );

        const rate =
            find();

        if
        (
            rate
            ||
            this.loadedPosRates.has(row.AccountId)
        )
        {
            this.update(
                target =>
                    this.setChargePercent(
                        target,
                        rate?.ChargePercent ?? 0
                    )
            );

            return;
        }

        this.lookup
            .getCardChargesForPos(
                row.AccountId
            )
            .subscribe
            ({
                next:
                (
                    rates:
                        CardChargeRate[]
                ):
                    void =>
                {
                    this.loadedPosRates.add(
                        row.AccountId
                    );

                    this.cardRates =
                    [
                        ...this.cardRates.filter
                        (
                            item =>
                                item.POSAccountId !== row.AccountId
                        ),
                        ...rates
                    ];

                    // Still the same row and card ?
                    if
                    (
                        this.selected === row
                    )
                    {
                        const found =
                            find();

                        this.update(
                            target =>
                                this.setChargePercent(
                                    target,
                                    found?.ChargePercent ?? 0
                                )
                        );
                    }

                    this.cdr.markForCheck();
                },

                error:
                ():
                    void =>
                {
                    this.loadedPosRates.add(
                        row.AccountId
                    );
                }
            });
    }


    //===========================================================
    // Charge
    //===========================================================

    private setChargePercent
    (
        row:
            VoucherDebitLine,
        percent:
            number
    ):
        void
    {
        row.ChargePercent =
            roundMoney(
                percent
            );

        row.ChargeAmount =
            roundMoney(
                row.Amount * row.ChargePercent / 100
            );

        this.chargePercentText =
            row.ChargePercent
                ? String(row.ChargePercent)
                : '';

        this.chargeAmountText =
            row.ChargeAmount
                ? row.ChargeAmount.toFixed(2)
                : '';
    }

    onChargePercentText
    (
        input:
            string | number
    ):
        void
    {
        const text =
            String(input ?? '');

        this.chargePercentText =
            text;

        this.update(
            row =>
            {
                row.ChargePercent =
                    roundMoney(
                        parseMoney(text)
                    );

                row.ChargeAmount =
                    roundMoney(
                        row.Amount * row.ChargePercent / 100
                    );

                this.chargeAmountText =
                    row.ChargeAmount
                        ? row.ChargeAmount.toFixed(2)
                        : '';
            }
        );
    }

    // Charge amount typed : % follows
    onChargeAmountText
    (
        input:
            string | number
    ):
        void
    {
        const text =
            String(input ?? '');

        this.chargeAmountText =
            text;

        this.update(
            row =>
            {
                row.ChargeAmount =
                    roundMoney(
                        parseMoney(text)
                    );

                if
                (
                    row.Amount > 0
                )
                {
                    row.ChargePercent =
                        roundMoney(
                            row.ChargeAmount * 100 / row.Amount
                        );

                    this.chargePercentText =
                        row.ChargePercent
                            ? String(row.ChargePercent)
                            : '';
                }
            }
        );
    }

    onBorneByChange
    (
        value:
            any
    ):
        void
    {
        this.update(
            row =>
                row.ChargeBorneBy =
                    value === 'Customer'
                        ? 'Customer'
                        : 'Company'
        );
    }


    //===========================================================
    // EMI
    //===========================================================

    onTenureText
    (
        input:
            string | number
    ):
        void
    {
        const text =
            String(input ?? '');

        this.tenureText =
            text;

        this.update(
            row =>
                row.TenureMonths =
                    Math.max(
                        0,
                        Math.floor(
                            parseMoney(text)
                        )
                    )
        );
    }

    onInterestPercentText
    (
        input:
            string | number
    ):
        void
    {
        const text =
            String(input ?? '');

        this.interestPercentText =
            text;

        this.update(
            row =>
            {
                row.InterestPercent =
                    roundMoney(
                        parseMoney(text)
                    );

                row.InterestAmount =
                    roundMoney(
                        row.Amount * row.InterestPercent / 100
                    );

                this.interestAmountText =
                    row.InterestAmount
                        ? row.InterestAmount.toFixed(2)
                        : '';

                this.recalcTotalCharged(row);
            }
        );
    }

    // Interest amount typed : % follows
    onInterestAmountText
    (
        input:
            string | number
    ):
        void
    {
        const text =
            String(input ?? '');

        this.interestAmountText =
            text;

        this.update(
            row =>
            {
                row.InterestAmount =
                    roundMoney(
                        parseMoney(text)
                    );

                if
                (
                    row.Amount > 0
                )
                {
                    row.InterestPercent =
                        roundMoney(
                            row.InterestAmount * 100 / row.Amount
                        );

                    this.interestPercentText =
                        row.InterestPercent
                            ? String(row.InterestPercent)
                            : '';
                }

                this.recalcTotalCharged(row);
            }
        );
    }

    private recalcTotalCharged
    (
        row:
            VoucherDebitLine
    ):
        void
    {
        row.TotalCharged =
            roundMoney(
                row.Amount + row.InterestAmount
            );

        this.totalChargedText =
            row.TotalCharged
                ? row.TotalCharged.toFixed(2)
                : '';
    }

    // Total charged on the platform (editable)
    onTotalChargedText
    (
        input:
            string | number
    ):
        void
    {
        const text =
            String(input ?? '');

        this.totalChargedText =
            text;

        this.update(
            row =>
                row.TotalCharged =
                    roundMoney(
                        parseMoney(text)
                    )
        );
    }


    //===========================================================
    // Emit
    //===========================================================

    private emitLines():
        void
    {
        const lines =
            this.rows.map
            (
                row =>
                ({
                    ...row
                })
            );

        // After the current change-detection pass
        queueMicrotask(
            () =>
                this.linesChange.emit(
                    lines
                )
        );

        this.emitValid();

        this.cdr.markForCheck();
    }

    private emitValid():
        void
    {
        const valid =
            this.allComplete;

        queueMicrotask(
            () =>
                this.validChange.emit(
                    valid
                )
        );
    }
}