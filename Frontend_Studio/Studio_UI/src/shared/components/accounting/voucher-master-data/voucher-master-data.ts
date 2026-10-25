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
    VoucherLedger,
    PartyOption,
    VoucherMode,
    PaymentMode,
    CreditLedgerType,
    VoucherDebitLine,
    VoucherCreditLine,
    VoucherEntryData,
    VoucherChargeRow,
    CHARGE_RECOVERY_LEDGERS,
    CHARGE_EXPENSE_LEDGERS,
    VOUCHER_MODES,
    emptyDebitLine,
    emptyVoucherEntry,
    needsDetails,
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

interface SelectItem
{
    label:
        string;

    value:
        string;
}

// Receipt mode → ledger type of its accounts
const MODE_LEDGER_TYPES:
    Record<PaymentMode, string> =
{
    Cash:'Cash',
    Bank:'Bank',
    Check:'Bank',
    MFS:'MFS',
    POS:'POS',
    EMI:'EMI'
};

const CREDIT_LEDGER_TYPES:
    CreditLedgerType[] =
[
    'Customer',
    'Supplier',
    'General Ledger'
];

// Credit-side candidate (customer / supplier / GL)
interface CreditOption
{
    SubGroupCode:
        string;

    SubGroupName:
        string;

    LedgerCode:
        string;

    LedgerName:
        string;

    PartyCode:
        string;

    Label:
        string;
}


//===============================================================
// Component
//
// Voucher Master Data (Receipt Voucher / Payment Voucher)
//
// [mode] decides the sides :
//   receipt : money (Receipt Mode) = DEBIT, entered first;
//             accounts (Account Details) = CREDIT
//   payment : accounts (Pay To) = DEBIT, entered first;
//             money (Payment Mode) = CREDIT
// Inside the component data.Debits are always the money rows and
// data.Credits the account rows; the page maps them to its own
// debit / credit tables.
//
//   LEFT
//     1. Voucher Information : Voucher Date, Voucher No (preview)
//     2. Receipt Mode (DEBIT, entered first) :
//          Mode → Account Sub-Group → Account Ledger, Amount,
//          Short Notes, + Add
//     3. Account Details (CREDIT) :
//          Ledger Type → Account Sub-Group → Account Ledger,
//          Amount (= balance by default), Short Notes, + Add
//   RIGHT
//     Detail Narration (one line), then Transaction Summary (debits first,
//     then credits, Total, Balance Remaining)
//
// One group per voucher :
//   • 2+ debits → only ONE credit, equal to the balance
//   • 1 debit   → several credits, each up to the balance left
//   • once a credit is added the debit side is locked (remove
//     the credits to change the debits)
//   • balance 0 → both + Add buttons are blocked
//
// Check / MFS / POS / EMI rows get their details on the Payment
// Desk (step 2); those values are kept here untouched.
//===============================================================

@Component(
{
    selector:'app-voucher-master-data',

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

    templateUrl:'./voucher-master-data.html',

    styleUrls:
    [
        './voucher-master-data.css'
    ]
})

export class VoucherMasterDataComponent
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

    // receipt / payment : sides, modes, money accounts, wording
    @Input()
    set mode
    (
        value:
            VoucherMode
    )
    {
        this._mode =
            value === 'payment'
                ? 'payment'
                : 'receipt';

        this.modeList =
            VOUCHER_MODES[this._mode];

        this.modeItems =
            this.modeList.map
            (
                item =>
                ({
                    label:item,
                    value:item
                })
            );

        this.buildDebitSubGroupItems();
    }

    get mode():
        VoucherMode
    {
        return this._mode;
    }

    private _mode:
        VoucherMode =
        'receipt';

    get isPayment():
        boolean
    {
        return this._mode === 'payment';
    }

    @Input()
    readonly:
        boolean =
        false;

    // Switch "Multi Mode Receipt Voucher" : several receipt modes
    // in one voucher (OFF : the first debit fixes the mode)
    @Input()
    multiMode:
        boolean =
        false;

    // Setting "Max Lines" : most debit + credit rows per voucher
    // (0 = no limit)
    @Input()
    maxLines:
        number =
        0;

    // Settings "Back Dated / Post Dated Entry" : earliest and
    // latest voucher date (null = no limit)
    @Input()
    minDate:
        Date | null =
        null;

    @Input()
    maxDate:
        Date | null =
        null;

    // Preview before saving / the saved number after
    @Input()
    voucherNo:
        string =
        '';

    // Login branch : decides which money accounts are offered
    @Input()
    set branchName
    (
        value:
            string
    )
    {
        this._branchName =
            (value ?? '').trim();

        this.buildDebitSubGroupItems();
    }

    get branchName():
        string
    {
        return this._branchName;
    }

    private _branchName:
        string =
        '';

    @Input()
    set value
    (
        data:
            VoucherEntryData | null
    )
    {
        if
        (
            !data
        )
        {
            return;
        }

        this.data =
        {
            ...data,

            Debits:
                (data.Debits ?? []).map
                (
                    line =>
                    ({
                        ...line
                    })
                ),

            Credits:
                (data.Credits ?? []).map
                (
                    line =>
                    ({
                        ...line
                    })
                )
        };

        this.voucherDateValue =
            fromIsoDate(
                this.data.VoucherDate
            );

        this.resetDebitDraft();

        this.buildCreditSubGroupItems();

        this.resetCreditDraft();

        this.emitAll(false);
    }


    //===========================================================
    // Outputs
    //===========================================================

    @Output()
    valueChange =
        new EventEmitter<VoucherEntryData>();

    // Debit total (= credit total when balanced)
    @Output()
    totalChange =
        new EventEmitter<number>();

    @Output()
    validChange =
        new EventEmitter<boolean>();


    //===========================================================
    // Data
    //===========================================================

    data:
        VoucherEntryData =
        emptyVoucherEntry(
            toIsoDate(new Date())
        );

    voucherDateValue:
        Date | null =
        new Date();

    loading:
        boolean =
        false;

    lookupError:
        string =
        '';


    //===========================================================
    // Look-ups
    //===========================================================

    private ledgers:
        VoucherLedger[] =
        [];

    private ledgerByCode:
        Map<string, VoucherLedger> =
        new Map<string, VoucherLedger>();

    private customers:
        PartyOption[] =
        [];

    private suppliers:
        PartyOption[] =
        [];

    // Ledger codes (UPPER) owned by customers / suppliers
    private partyLedgerCodes:
        Set<string> =
        new Set<string>();

    // Ledger codes (UPPER) created automatically by other pages
    // (inventory, service, membership ...) : never offered
    private autoLedgerCodes:
        Set<string> =
        new Set<string>();


    //===========================================================
    // Debit draft (Receipt Mode)
    //===========================================================

    private modeList:
        PaymentMode[] =
        VOUCHER_MODES.receipt;

    modeItems:
        SelectItem[] =
        VOUCHER_MODES.receipt.map
        (
            mode =>
            ({
                label:mode,
                value:mode
            })
        );

    // Payment Voucher : the money amount follows the balance until
    // the user types one
    private debitAmountTouched:
        boolean =
        false;

    debitMode:
        PaymentMode | '' =
        '';

    debitSubGroup:
        string =
        '';

    debitLedger:
        string =
        '';

    debitAmountText:
        string =
        '';

    debitNotes:
        string =
        '';

    debitSubGroupItems:
        SelectItem[] =
        [];

    debitLedgerItems:
        SelectItem[] =
        [];

    debitError:
        string =
        '';


    //===========================================================
    // Credit draft (Account Details)
    //===========================================================

    readonly ledgerTypeItems:
        SelectItem[] =
        CREDIT_LEDGER_TYPES.map
        (
            type =>
            ({
                label:type,
                value:type
            })
        );

    creditSubGroup:
        string =
        '';

    creditLedger:
        string =
        '';

    creditAmountText:
        string =
        '';

    creditNotes:
        string =
        '';

    creditSubGroupItems:
        SelectItem[] =
        [];

    creditLedgerItems:
        SelectItem[] =
        [];

    private creditOptions:
        CreditOption[] =
        [];

    creditError:
        string =
        '';

    // The user typed an amount : stop following the balance
    private creditAmountTouched:
        boolean =
        false;


    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        if
        (
            !this.data.VoucherDate
        )
        {
            this.data.VoucherDate =
                toIsoDate(
                    new Date()
                );

            this.voucherDateValue =
                new Date();
        }

        this.loadLookups();

        this.emitAll(false);
    }


    //===========================================================
    // Load Look-ups
    //===========================================================

    private loadLookups():
        void
    {
        this.loading =
            true;

        let pending =
            4;

        const done =
            ():
                void =>
            {
                pending--;

                if
                (
                    pending > 0
                )
                {
                    return;
                }

                this.loading =
                    false;

                this.indexPartyLedgers();

                this.buildDebitSubGroupItems();

                this.buildCreditSubGroupItems();

                this.cdr.markForCheck();
            };

        this.lookup
            .getLedgers(true)
            .subscribe
            ({
                next:
                (
                    ledgers:
                        VoucherLedger[]
                ):
                    void =>
                {
                    this.ledgers =
                        ledgers.filter
                        (
                            ledger =>
                                ledger.IsActive
                        );

                    this.ledgerByCode =
                        new Map
                        (
                            this.ledgers.map
                            (
                                ledger =>
                                [
                                    ledger.LedgerCode.trim().toUpperCase(),
                                    ledger
                                ]
                            )
                        );

                    done();
                },

                error:
                ():
                    void =>
                {
                    this.lookupError =
                        'Failed to load the ledgers.';

                    done();
                }
            });

        this.lookup
            .getAutoLedgerCodes()
            .subscribe
            ({
                next:
                (
                    codes:
                        Set<string>
                ):
                    void =>
                {
                    this.autoLedgerCodes =
                        codes;

                    done();
                },

                error:
                ():
                    void =>
                {
                    this.autoLedgerCodes =
                        new Set<string>();

                    done();
                }
            });

        this.lookup
            .getCustomers()
            .subscribe
            ({
                next:
                (
                    rows:
                        PartyOption[]
                ):
                    void =>
                {
                    this.customers =
                        rows;

                    done();
                },

                error:
                ():
                    void =>
                {
                    this.customers =
                        [];

                    done();
                }
            });

        this.lookup
            .getSuppliers()
            .subscribe
            ({
                next:
                (
                    rows:
                        PartyOption[]
                ):
                    void =>
                {
                    this.suppliers =
                        rows;

                    done();
                },

                error:
                ():
                    void =>
                {
                    this.suppliers =
                        [];

                    done();
                }
            });
    }

    private indexPartyLedgers():
        void
    {
        this.partyLedgerCodes =
            new Set<string>
            (
                [
                    ...this.customers,
                    ...this.suppliers
                ]
                .map
                (
                    party =>
                        (party.LedgerCode ?? '').trim().toUpperCase()
                )
                .filter
                (
                    code =>
                        code.length > 0
                )
            );
    }

    private findLedger
    (
        code:
            string
    ):
        VoucherLedger | undefined
    {
        return this.ledgerByCode.get(
            (code ?? '').trim().toUpperCase()
        );
    }


    //===========================================================
    // Totals / rules
    //
    // "First" side = entered first (receipt : money, payment :
    // accounts); "second" side = the other one.
    //   • 2+ first rows → ONE second row, equal to the balance
    //   • 1 first row   → several second rows, up to the balance
    //   • once a second row exists the first side is locked
    //   • balance 0 → both + Add buttons are blocked
    //===========================================================

    // Money rows total
    get totalDebit():
        number
    {
        return roundMoney(
            this.data.Debits.reduce
            (
                (sum, line) =>
                    sum + (Number(line.Amount) || 0),
                0
            )
        );
    }

    // Account rows total
    get totalCredit():
        number
    {
        return roundMoney(
            this.data.Credits.reduce
            (
                (sum, line) =>
                    sum + (Number(line.Amount) || 0),
                0
            )
        );
    }

    private get firstCount():
        number
    {
        return this.isPayment
            ? this.data.Credits.length
            : this.data.Debits.length;
    }

    private get secondCount():
        number
    {
        return this.isPayment
            ? this.data.Debits.length
            : this.data.Credits.length;
    }

    // First side − second side (left to enter on the second side)
    get balance():
        number
    {
        return roundMoney(
            this.isPayment
                ? this.totalCredit - this.totalDebit
                : this.totalDebit - this.totalCredit
        );
    }

    // Wording of the two sides
    get moneyLabel():
        string
    {
        return this.isPayment
            ? 'Payment Mode'
            : 'Receipt Mode';
    }

    get accountLabel():
        string
    {
        return this.isPayment
            ? 'Pay To'
            : 'Account Details';
    }

    private get firstName():
        string
    {
        return this.isPayment
            ? 'pay-to account (debit)'
            : 'receipt mode (debit)';
    }

    private get secondName():
        string
    {
        return this.isPayment
            ? 'payment mode (credit)'
            : 'account (credit)';
    }

    // Debit + credit rows entered
    get lineCount():
        number
    {
        return this.data.Debits.length
            +
            this.data.Credits.length;
    }

    // "Max Lines" reached : no more rows on either side
    get atMaxLines():
        boolean
    {
        return this.maxLines > 0
            &&
            this.lineCount >= this.maxLines;
    }

    get maxLinesHint():
        string
    {
        return `Maximum ${this.maxLines} lines per voucher.`;
    }

    // Lines still free under "Max Lines" (Infinity = no limit)
    get linesLeft():
        number
    {
        return this.maxLines > 0
            ? Math.max(0, this.maxLines - this.lineCount)
            : Number.POSITIVE_INFINITY;
    }

    // The first side is entered first, so the last free line is
    // kept for the second side
    private get firstLineKeptForSecond():
        boolean
    {
        return this.maxLines > 0
            &&
            this.secondCount === 0
            &&
            this.linesLeft <= 1;
    }

    // The next first-side row is the last one that fits
    private get nextFirstIsLast():
        boolean
    {
        return this.maxLines > 0
            &&
            this.secondCount === 0
            &&
            this.linesLeft === 2;
    }

    // The next second-side row takes the last free line : it must
    // clear the whole balance
    private get nextSecondIsLast():
        boolean
    {
        return this.maxLines > 0
            &&
            this.linesLeft === 1
            &&
            this.balance > 0;
    }

    private get canAddFirst():
        boolean
    {
        return !this.readonly
            &&
            this.secondCount === 0
            &&
            !this.atMaxLines
            &&
            !this.firstLineKeptForSecond;
    }

    private get canAddSecond():
        boolean
    {
        return !this.readonly
            &&
            !this.atMaxLines
            &&
            this.balance > 0
            &&
            this.firstCount > 0
            &&
            !(
                this.firstCount >= 2
                &&
                this.secondCount >= 1
            );
    }

    // Several first rows → a single second row; the last free
    // line → the full balance
    private get secondAmountLocked():
        boolean
    {
        return this.firstCount >= 2
            ||
            this.nextSecondIsLast;
    }

    private get firstHintWarn():
        boolean
    {
        return this.nextFirstIsLast
            ||
            this.firstLineKeptForSecond
            ||
            (this.atMaxLines && this.secondCount === 0);
    }

    private get secondHintWarn():
        boolean
    {
        return this.nextSecondIsLast
            ||
            (this.atMaxLines && this.balance > 0);
    }

    private get firstHint():
        string
    {
        if
        (
            this.atMaxLines
            &&
            this.secondCount === 0
        )
        {
            return `${this.maxLinesHint} The ${this.secondName} is still pending : remove a row.`;
        }

        if
        (
            this.firstLineKeptForSecond
        )
        {
            return `Line ${this.maxLines} of ${this.maxLines} is kept for the ${this.secondName} : no more rows here.`;
        }

        if
        (
            this.nextFirstIsLast
        )
        {
            return `Next row is the last one here (line ${this.maxLines - 1} of ${this.maxLines}); line ${this.maxLines} is kept for the ${this.secondName}.`;
        }

        if
        (
            this.secondCount > 0
        )
        {
            return this.isPayment
                ? 'Locked : remove the payment rows to change the pay-to accounts.'
                : 'Locked : remove the credits to change the receipt modes.';
        }

        return '';
    }

    private get secondHint():
        string
    {
        if
        (
            this.firstCount === 0
        )
        {
            return `Add the ${this.firstName} first.`;
        }

        if
        (
            this.atMaxLines
            &&
            this.balance > 0
        )
        {
            return `${this.maxLinesHint} Balance ${this.money(this.balance)} is still pending : remove a row or raise the limit in System Configuration.`;
        }

        if
        (
            this.nextSecondIsLast
        )
        {
            return `Last line (${this.maxLines} of ${this.maxLines}) : this row takes the full balance ${this.money(this.balance)}.`;
        }

        if
        (
            this.balance <= 0
        )
        {
            return this.isPayment
                ? 'Balanced : nothing left to pay.'
                : 'Balanced : nothing left to credit.';
        }

        if
        (
            this.firstCount >= 2
        )
        {
            return this.secondCount === 0
                ? `Several debits : one ${this.secondName} for the full balance.`
                : `Several debits allow only one ${this.secondName}.`;
        }

        return this.isPayment
            ? `Up to ${this.money(this.balance)} left to pay.`
            : `Up to ${this.money(this.balance)} left to credit.`;
    }

    //-----------------------------------------------------------
    // Money side (data.Debits)
    //-----------------------------------------------------------

    get canAddDebit():
        boolean
    {
        return this.isPayment
            ? this.canAddSecond
            : this.canAddFirst;
    }

    // Payment Voucher : several pay-to rows → one payment row for
    // the full balance
    get debitAmountLocked():
        boolean
    {
        return this.isPayment
            &&
            this.secondAmountLocked;
    }

    get debitHintWarn():
        boolean
    {
        return this.isPayment
            ? this.secondHintWarn
            : this.firstHintWarn;
    }

    // Money rows can be removed while no account row depends on
    // them (receipt); always on the second side (payment)
    get debitRemoveLocked():
        boolean
    {
        return !this.isPayment
            &&
            this.data.Credits.length > 0;
    }

    //-----------------------------------------------------------
    // Account side (data.Credits)
    //-----------------------------------------------------------

    get canAddCredit():
        boolean
    {
        return this.isPayment
            ? this.canAddFirst
            : this.canAddSecond;
    }

    // Receipt Voucher : several receipt modes → one account row for
    // the full balance
    get creditAmountLocked():
        boolean
    {
        return !this.isPayment
            &&
            this.secondAmountLocked;
    }

    get creditHintWarn():
        boolean
    {
        return this.isPayment
            ? this.firstHintWarn
            : this.secondHintWarn;
    }

    get creditRemoveLocked():
        boolean
    {
        return this.isPayment
            &&
            this.data.Debits.length > 0;
    }

    get ledgerTypeLocked():
        boolean
    {
        return this.readonly
            ||
            this.data.Credits.length > 0;
    }

    get creditHint():
        string
    {
        return this.isPayment
            ? this.firstHint
            : this.secondHint;
    }

    // One mode per voucher (multi mode OFF) : fixed by the first
    // money row
    get modeLocked():
        boolean
    {
        return !this.multiMode
            &&
            this.data.Debits.length > 0;
    }

    get debitHint():
        string
    {
        const side =
            this.isPayment
                ? this.secondHint
                : this.firstHint;

        if
        (
            side
        )
        {
            return side;
        }

        return this.modeLocked
            ? `One ${this.moneyLabel.toLowerCase()} per voucher : only ${this.data.Debits[0].Mode} rows can be added. Remove them to change the mode.`
            : '';
    }

    get validationMessage():
        string
    {
        if
        (
            !this.data.VoucherDate
        )
        {
            return 'Voucher Date is required.';
        }

        if
        (
            this.firstCount === 0
        )
        {
            return `Add at least one ${this.firstName}.`;
        }

        if
        (
            this.secondCount === 0
        )
        {
            return `Add at least one ${this.secondName}.`;
        }

        if
        (
            this.balance !== 0
        )
        {
            return `Balance remaining ${this.money(this.balance)} : debit and credit must be equal.`;
        }

        // Detail Narration is required on every voucher
        if
        (
            !(this.data.Narration ?? '').trim()
        )
        {
            return 'Detail Narration is required.';
        }

        return '';
    }

    get isValid():
        boolean
    {
        return !this.validationMessage;
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


    //===========================================================
    // Voucher Information
    //===========================================================

    onDateChange
    (
        value:
            Date | null
    ):
        void
    {
        this.voucherDateValue =
            value;

        this.data.VoucherDate =
            value
                ? toIsoDate(value)
                : '';

        this.emitAll();
    }

    onNarrationChange
    (
        value:
            string | number
    ):
        void
    {
        this.data.Narration =
            String(value ?? '');

        this.emitAll();
    }


    //===========================================================
    // Debit : Mode → Sub-Group → Ledger
    //===========================================================

    // Money accounts of the mode : active, collection, branch rule
    private debitCandidates():
        VoucherLedger[]
    {
        if
        (
            !this.debitMode
        )
        {
            return [];
        }

        const type =
            MODE_LEDGER_TYPES[this.debitMode];

        const branch =
            this.branchName.toUpperCase();

        return this.ledgers.filter
        (
            ledger =>
            {
                // Receipt : Collection = Yes; Payment : Payment = Yes
                if
                (
                    ledger.LedgerType !== type
                    ||
                    !(
                        this.isPayment
                            ? ledger.PaymentAccount
                            : ledger.CollectionAccount
                    )
                )
                {
                    return false;
                }

                const ledgerBranch =
                    (ledger.Branch ?? '').trim().toUpperCase();

                return type === 'Cash'
                    ? ledgerBranch === branch
                    : !ledger.BranchExclusive || ledgerBranch === branch;
            }
        );
    }

    private buildDebitSubGroupItems():
        void
    {
        const seen =
            new Map<string, string>();

        for
        (
            const ledger of this.debitCandidates()
        )
        {
            if
            (
                !seen.has(ledger.SubGroupCode)
            )
            {
                seen.set(
                    ledger.SubGroupCode,
                    ledger.SubGroupName
                );
            }
        }

        this.debitSubGroupItems =
            [...seen.entries()]
                .sort
                (
                    (a, b) =>
                        a[0].localeCompare(b[0])
                )
                .map
                (
                    ([code, name]) =>
                    ({
                        label:
                            name
                                ? `${code} - ${name}`
                                : code,
                        value:
                            code
                    })
                );

        // One sub group : pick it
        if
        (
            this.debitSubGroupItems.length === 1
        )
        {
            this.debitSubGroup =
                this.debitSubGroupItems[0].value;
        }
        else if
        (
            !this.debitSubGroupItems.some
            (
                item =>
                    item.value === this.debitSubGroup
            )
        )
        {
            this.debitSubGroup =
                '';
        }

        this.buildDebitLedgerItems();

        this.cdr.markForCheck();
    }

    private buildDebitLedgerItems():
        void
    {
        this.debitLedgerItems =
            this.debitCandidates()
                .filter
                (
                    ledger =>
                        ledger.SubGroupCode === this.debitSubGroup
                )
                .sort
                (
                    (a, b) =>
                        a.LedgerName.localeCompare(b.LedgerName)
                )
                .map
                (
                    ledger =>
                    ({
                        label:
                            ledger.LedgerName,
                        value:
                            ledger.LedgerCode
                    })
                );

        if
        (
            this.debitLedgerItems.length === 1
        )
        {
            this.debitLedger =
                this.debitLedgerItems[0].value;
        }
        else if
        (
            !this.debitLedgerItems.some
            (
                item =>
                    item.value === this.debitLedger
            )
        )
        {
            this.debitLedger =
                '';
        }
    }

    onDebitModeChange
    (
        value:
            any
    ):
        void
    {
        // One receipt mode per voucher
        if
        (
            this.modeLocked
        )
        {
            this.debitMode =
                this.data.Debits[0].Mode;

            return;
        }

        this.debitMode =
            this.modeList.includes(value)
                ? value as PaymentMode
                : '';

        this.debitSubGroup =
            '';

        this.debitLedger =
            '';

        this.debitError =
            '';

        this.buildDebitSubGroupItems();
    }

    onDebitSubGroupChange
    (
        value:
            any
    ):
        void
    {
        this.debitSubGroup =
            String(value ?? '');

        this.debitLedger =
            '';

        this.debitError =
            '';

        this.buildDebitLedgerItems();
    }

    onDebitLedgerChange
    (
        value:
            any
    ):
        void
    {
        this.debitLedger =
            String(value ?? '');

        this.debitError =
            '';
    }

    onDebitAmountText
    (
        input:
            string | number
    ):
        void
    {
        this.debitAmountText =
            String(input ?? '');

        this.debitAmountTouched =
            true;

        this.debitError =
            '';
    }

    onDebitNotes
    (
        input:
            string | number
    ):
        void
    {
        this.debitNotes =
            String(input ?? '');
    }

    addDebit():
        void
    {
        if
        (
            !this.canAddDebit
        )
        {
            return;
        }

        const amount =
            this.debitAmountLocked
                ? this.balance
                : roundMoney(
                    parseMoney(this.debitAmountText)
                );

        const ledger =
            this.findLedger(
                this.debitLedger
            );

        if
        (
            !this.debitMode
        )
        {
            this.debitError =
                `${this.moneyLabel} is required.`;

            return;
        }

        if
        (
            !this.debitSubGroup
        )
        {
            this.debitError =
                'Account Sub-Group is required.';

            return;
        }

        if
        (
            !ledger
        )
        {
            this.debitError =
                'Account Ledger is required.';

            return;
        }

        if
        (
            !(amount > 0)
        )
        {
            this.debitError =
                'Amount must be more than 0.';

            return;
        }

        // Payment Voucher : the money side follows the pay-to total
        if
        (
            this.isPayment
            &&
            amount > this.balance
        )
        {
            this.debitError =
                `Amount cannot be more than the balance ${this.money(this.balance)}.`;

            return;
        }

        if
        (
            this.isPayment
            &&
            this.nextSecondIsLast
            &&
            amount !== this.balance
        )
        {
            this.debitError =
                `Last line : the amount must be the full balance ${this.money(this.balance)}.`;

            return;
        }

        const line:
            VoucherDebitLine =
        {
            ...emptyDebitLine(
                this.debitMode
            ),

            LedgerType:
                ledger.LedgerType,

            SubGroupCode:
                ledger.SubGroupCode,

            SubGroupName:
                ledger.SubGroupName,

            LedgerCode:
                ledger.LedgerCode,

            LedgerName:
                ledger.LedgerName,

            AccountId:
                ledger.AccountId,

            Amount:
                amount,

            ShortNotes:
                this.debitNotes.trim(),

            // MFS : the account's charge % (amount on step 2)
            ChargePercent:
                this.debitMode === 'MFS'
                    ? roundMoney(ledger.ChargePercent)
                    : 0,

            ChargeAmount:
                this.debitMode === 'MFS'
                    ? roundMoney(amount * (ledger.ChargePercent || 0) / 100)
                    : 0,

            ChargeBorneBy:
                needsDetails(this.debitMode) && this.debitMode !== 'Check'
                    ? 'Company'
                    : '',

            // Payment check : drawn on our own bank (the ledger)
            CheckBank:
                this.isPayment && this.debitMode === 'Check'
                    ? ledger.LedgerName
                    : ''
        };

        this.data.Debits =
        [
            ...this.data.Debits,
            line
        ];

        // Keep mode / sub group for the next row
        this.debitLedger =
            this.debitLedgerItems.length === 1
                ? this.debitLedger
                : '';

        this.debitAmountText =
            '';

        this.debitAmountTouched =
            false;

        this.debitNotes =
            '';

        this.debitError =
            '';

        this.followBalance();

        this.emitAll();
    }

    removeDebit
    (
        index:
            number
    ):
        void
    {
        if
        (
            this.readonly
        )
        {
            return;
        }

        if
        (
            this.debitRemoveLocked
        )
        {
            this.debitError =
                'Remove the credits first, then change the receipt modes.';

            return;
        }

        this.data.Debits =
            this.data.Debits.filter
            (
                (_, i) =>
                    i !== index
            );

        this.followBalance();

        this.emitAll();
    }

    private resetDebitDraft():
        void
    {
        // Loaded voucher : the mode of its (last) row
        if
        (
            this.data.Debits.length > 0
        )
        {
            this.debitMode =
                this.data.Debits[this.data.Debits.length - 1].Mode;

            this.buildDebitSubGroupItems();
        }
        else
        {
            // Empty voucher (Add / Clear) : nothing pre-selected
            this.debitMode =
                '';

            this.debitSubGroup =
                '';

            this.debitLedger =
                '';

            this.debitSubGroupItems =
                [];

            this.debitLedgerItems =
                [];
        }

        this.debitAmountText =
            '';

        this.debitNotes =
            '';

        this.debitError =
            '';
    }


    //===========================================================
    // Credit : Ledger Type → Sub-Group → Ledger
    //===========================================================

    private buildCreditOptions():
        CreditOption[]
    {
        const type =
            this.data.LedgerType;

        if
        (
            type === 'Customer'
            ||
            type === 'Supplier'
        )
        {
            const parties =
                type === 'Customer'
                    ? this.customers
                    : this.suppliers;

            const options:
                CreditOption[] =
                [];

            for
            (
                const party of parties
            )
            {
                if
                (
                    !party.IsActive
                )
                {
                    continue;
                }

                const ledger =
                    this.findLedger(
                        party.LedgerCode
                    );

                if
                (
                    !ledger
                )
                {
                    continue;
                }

                options.push(
                {
                    SubGroupCode:
                        ledger.SubGroupCode,

                    SubGroupName:
                        ledger.SubGroupName,

                    LedgerCode:
                        ledger.LedgerCode,

                    LedgerName:
                        party.Name,

                    PartyCode:
                        party.Code,

                    Label:
                        `${party.Code} - ${party.Name}`
                });
            }

            return options;
        }

        if
        (
            type === 'General Ledger'
        )
        {
            return this.ledgers
                .filter
                (
                    ledger =>
                        ledger.LedgerType === 'General Ledger'
                        &&
                        !ledger.IsMoneyLedger
                        &&
                        !this.partyLedgerCodes.has(
                            ledger.LedgerCode.trim().toUpperCase()
                        )
                        &&
                        !this.autoLedgerCodes.has(
                            ledger.LedgerCode.trim().toUpperCase()
                        )
                )
                .map
                (
                    ledger =>
                    ({
                        SubGroupCode:
                            ledger.SubGroupCode,

                        SubGroupName:
                            ledger.SubGroupName,

                        LedgerCode:
                            ledger.LedgerCode,

                        LedgerName:
                            ledger.LedgerName,

                        PartyCode:
                            '',

                        Label:
                            `${ledger.LedgerCode} - ${ledger.LedgerName}`
                    })
                );
        }

        return [];
    }

    private buildCreditSubGroupItems():
        void
    {
        this.creditOptions =
            this.buildCreditOptions();

        const seen =
            new Map<string, string>();

        for
        (
            const option of this.creditOptions
        )
        {
            if
            (
                !seen.has(option.SubGroupCode)
            )
            {
                seen.set(
                    option.SubGroupCode,
                    option.SubGroupName
                );
            }
        }

        this.creditSubGroupItems =
            [...seen.entries()]
                .sort
                (
                    (a, b) =>
                        a[0].localeCompare(b[0])
                )
                .map
                (
                    ([code, name]) =>
                    ({
                        label:
                            name
                                ? `${code} - ${name}`
                                : code,
                        value:
                            code
                    })
                );

        if
        (
            this.creditSubGroupItems.length === 1
        )
        {
            this.creditSubGroup =
                this.creditSubGroupItems[0].value;
        }
        else if
        (
            !this.creditSubGroupItems.some
            (
                item =>
                    item.value === this.creditSubGroup
            )
        )
        {
            this.creditSubGroup =
                '';
        }

        this.buildCreditLedgerItems();

        this.cdr.markForCheck();
    }

    private buildCreditLedgerItems():
        void
    {
        const used =
            new Set
            (
                this.data.Credits.map
                (
                    line =>
                        line.LedgerCode.toUpperCase()
                )
            );

        this.creditLedgerItems =
            this.creditOptions
                .filter
                (
                    option =>
                        option.SubGroupCode === this.creditSubGroup
                        &&
                        !used.has(
                            option.LedgerCode.toUpperCase()
                        )
                )
                .sort
                (
                    (a, b) =>
                        a.Label.localeCompare(b.Label)
                )
                .map
                (
                    option =>
                    ({
                        label:
                            option.Label,
                        value:
                            option.LedgerCode
                    })
                );

        if
        (
            !this.creditLedgerItems.some
            (
                item =>
                    item.value === this.creditLedger
            )
        )
        {
            this.creditLedger =
                '';
        }
    }

    onLedgerTypeChange
    (
        value:
            any
    ):
        void
    {
        if
        (
            this.ledgerTypeLocked
        )
        {
            return;
        }

        this.data.LedgerType =
            CREDIT_LEDGER_TYPES.includes(value)
                ? value as CreditLedgerType
                : '';

        this.creditSubGroup =
            '';

        this.creditLedger =
            '';

        this.creditError =
            '';

        this.buildCreditSubGroupItems();

        this.emitAll();
    }

    onCreditSubGroupChange
    (
        value:
            any
    ):
        void
    {
        this.creditSubGroup =
            String(value ?? '');

        this.creditLedger =
            '';

        this.creditError =
            '';

        this.buildCreditLedgerItems();
    }

    onCreditLedgerChange
    (
        value:
            any
    ):
        void
    {
        this.creditLedger =
            String(value ?? '');

        this.creditError =
            '';

        this.followBalance();
    }

    onCreditAmountText
    (
        input:
            string | number
    ):
        void
    {
        this.creditAmountText =
            String(input ?? '');

        this.creditAmountTouched =
            true;

        this.creditError =
            '';
    }

    onCreditNotes
    (
        input:
            string | number
    ):
        void
    {
        this.creditNotes =
            String(input ?? '');
    }

    // Amount follows the balance until the user types one
    private followBalance():
        void
    {
        const text =
            this.balance > 0
                ? this.balance.toFixed(2)
                : '';

        // Payment Voucher : the money side is the second side
        if
        (
            this.isPayment
        )
        {
            if
            (
                this.debitAmountLocked
                ||
                !this.debitAmountTouched
            )
            {
                this.debitAmountText =
                    text;

                this.debitAmountTouched =
                    false;
            }

            return;
        }

        if
        (
            this.creditAmountLocked
            ||
            !this.creditAmountTouched
        )
        {
            this.creditAmountText =
                text;

            this.creditAmountTouched =
                false;
        }
    }

    addCredit():
        void
    {
        if
        (
            !this.canAddCredit
        )
        {
            return;
        }

        const amount =
            this.creditAmountLocked
                ? this.balance
                : roundMoney(
                    parseMoney(this.creditAmountText)
                );

        const option =
            this.creditOptions.find
            (
                item =>
                    item.LedgerCode === this.creditLedger
            );

        if
        (
            !this.data.LedgerType
        )
        {
            this.creditError =
                'Ledger Type is required.';

            return;
        }

        if
        (
            !this.creditSubGroup
        )
        {
            this.creditError =
                'Account Sub-Group is required.';

            return;
        }

        if
        (
            !option
        )
        {
            this.creditError =
                'Account Ledger is required.';

            return;
        }

        if
        (
            !(amount > 0)
        )
        {
            this.creditError =
                'Amount must be more than 0.';

            return;
        }

        if
        (
            !this.isPayment
            &&
            amount > this.balance
        )
        {
            this.creditError =
                `Amount cannot be more than the balance ${this.money(this.balance)}.`;

            return;
        }

        if
        (
            !this.isPayment
            &&
            this.nextSecondIsLast
            &&
            amount !== this.balance
        )
        {
            this.creditError =
                `Last line : the amount must be the full balance ${this.money(this.balance)}.`;

            return;
        }

        const line:
            VoucherCreditLine =
        {
            LedgerType:
                this.data.LedgerType,

            SubGroupCode:
                option.SubGroupCode,

            SubGroupName:
                option.SubGroupName,

            LedgerCode:
                option.LedgerCode,

            LedgerName:
                option.LedgerName,

            PartyCode:
                option.PartyCode,

            Amount:
                amount,

            ShortNotes:
                this.creditNotes.trim()
        };

        this.data.Credits =
        [
            ...this.data.Credits,
            line
        ];

        this.creditLedger =
            '';

        this.creditNotes =
            '';

        this.creditError =
            '';

        this.creditAmountTouched =
            false;

        this.buildCreditLedgerItems();

        this.followBalance();

        this.emitAll();
    }

    removeCredit
    (
        index:
            number
    ):
        void
    {
        if
        (
            this.readonly
        )
        {
            return;
        }

        if
        (
            this.creditRemoveLocked
        )
        {
            this.creditError =
                'Remove the payment rows first, then change the pay-to accounts.';

            return;
        }

        this.data.Credits =
            this.data.Credits.filter
            (
                (_, i) =>
                    i !== index
            );

        this.creditError =
            '';

        this.buildCreditLedgerItems();

        this.followBalance();

        this.emitAll();
    }

    private resetCreditDraft():
        void
    {
        this.creditLedger =
            '';

        this.creditNotes =
            '';

        this.creditError =
            '';

        this.creditAmountTouched =
            false;

        this.followBalance();
    }


    //===========================================================
    // Summary helpers
    //===========================================================

    // Subtitle under a debit row
    //   Cash  : Cash In Hand              (sub group)
    //   Bank  : Liability For Finance     (sub group)
    //   Check : Check No 123456 · 22-Oct-2026 · Dutch-Bangla Bank
    //   MFS   : Txn TXN8KD72HQ · Charge 18.50 (Customer)
    //   POS   : VISA Platinum · Appr 4521 · Charge 120.00 (Company)
    //   EMI   : VISA Platinum · 6 months · Charge 250.00 (Customer)
    debitDetails
    (
        line:
            VoucherDebitLine
    ):
        string
    {
        const parts:
            string[] =
            [];

        const add =
            (text: string): void =>
            {
                if
                (
                    text
                )
                {
                    parts.push(
                        text
                    );
                }
            };

        const charge =
            line.ChargeAmount > 0
                ? `Charge ${this.money(line.ChargeAmount)} (${line.ChargeBorneBy || 'Company'})`
                : '';

        switch
        (
            line.Mode
        )
        {
            case 'Cash':
            case 'Bank':
                add(line.SubGroupName || line.SubGroupCode);
                break;

            case 'Check':
                add(line.CheckNo ? `Check No ${line.CheckNo}` : '');
                add(this.displayDate(line.CheckDate));
                add(line.CheckBank);
                break;

            case 'MFS':
                add(line.TransactionRef ? `Txn ${line.TransactionRef}` : '');
                add(charge);
                break;

            case 'POS':
                add(line.CardName);
                add(line.TransactionRef ? `Appr ${line.TransactionRef}` : '');
                add(charge);
                break;

            case 'EMI':
                add(line.CardName);
                add(line.TenureMonths > 0 ? `${line.TenureMonths} months` : '');
                add(charge);
                break;
        }

        return parts.join(' · ');
    }

    // Subtitle under a credit row
    //   Customer : CIB-000001 · Trade Receivables
    //   Supplier : SUP-000004 · Trade Payables
    //   GL       : Paid Up Capital
    creditDetails
    (
        line:
            VoucherCreditLine
    ):
        string
    {
        return [
            line.PartyCode,
            line.SubGroupName || line.SubGroupCode
        ]
        .filter
        (
            part =>
                !!part
        )
        .join(' · ');
    }

    // yyyy-MM-dd → 22-Oct-2026
    private displayDate
    (
        value:
            string
    ):
        string
    {
        const date =
            fromIsoDate(
                value
            );

        if
        (
            !date
        )
        {
            return '';
        }

        const months =
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        return `${String(date.getDate()).padStart(2, '0')}-${months[date.getMonth()]}-${date.getFullYear()}`;
    }

    // Charges posted with the voucher :
    //   receipt : the customer pays on top (Dr money, Cr recovery)
    //   payment : the company pays (Dr charge expense, Cr money)
    get postedCharges():
        VoucherDebitLine[]
    {
        const payer =
            this.isPayment
                ? 'Company'
                : 'Customer';

        return this.data.Debits.filter
        (
            line =>
                line.ChargeBorneBy === payer
                &&
                line.ChargeAmount > 0
        );
    }

    // Kept for older bindings
    get customerCharges():
        VoucherDebitLine[]
    {
        return this.postedCharges;
    }

    // One row per money line (the same money account)
    private get chargeMoneyRows():
        VoucherChargeRow[]
    {
        return this.postedCharges.map
        (
            line =>
            ({
                LedgerCode:
                    line.LedgerCode,

                LedgerName:
                    line.LedgerName,

                Subtitle:
                    this.isPayment
                        ? `${line.Mode} charge · paid by the company`
                        : `${line.Mode} charge · paid by customer`,

                Amount:
                    roundMoney(line.ChargeAmount)
            })
        );
    }

    // One row per mode : recovery income (receipt) / charge
    // expense (payment)
    private get chargeLedgerRows():
        VoucherChargeRow[]
    {
        const byMode =
            new Map<string, number>();

        for
        (
            const line of this.postedCharges
        )
        {
            byMode.set(
                line.Mode,
                roundMoney(
                    (byMode.get(line.Mode) ?? 0) + line.ChargeAmount
                )
            );
        }

        const codes =
            this.isPayment
                ? CHARGE_EXPENSE_LEDGERS
                : CHARGE_RECOVERY_LEDGERS;

        return [...byMode.entries()].map
        (
            ([mode, amount]) =>
            {
                const code =
                    codes[mode] ?? '';

                const ledger =
                    this.findLedger(code);

                return {
                    LedgerCode:
                        code,

                    LedgerName:
                        ledger?.LedgerName
                        ||
                        (this.isPayment ? `${mode} Charges` : `${mode} Charges Recovery`),

                    Subtitle:
                        ledger?.SubGroupName
                        ||
                        (this.isPayment ? 'Charge expense' : 'Charges recovery'),

                    Amount:
                        amount
                };
            }
        );
    }

    // Debit-side charge rows : money (receipt) / expense (payment)
    get chargeDebitRows():
        VoucherChargeRow[]
    {
        return this.isPayment
            ? this.chargeLedgerRows
            : this.chargeMoneyRows;
    }

    // Credit-side charge rows : recovery (receipt) / money (payment)
    get chargeCreditRows():
        VoucherChargeRow[]
    {
        return this.isPayment
            ? this.chargeMoneyRows
            : this.chargeLedgerRows;
    }

    get chargeTotal():
        number
    {
        return roundMoney(
            this.postedCharges.reduce
            (
                (sum, line) =>
                    sum + (Number(line.ChargeAmount) || 0),
                0
            )
        );
    }

    // Grid totals include the charge rows (both sides)
    get gridDebit():
        number
    {
        return roundMoney(
            (this.isPayment ? this.totalCredit : this.totalDebit)
            +
            this.chargeTotal
        );
    }

    get gridCredit():
        number
    {
        return roundMoney(
            (this.isPayment ? this.totalDebit : this.totalCredit)
            +
            this.chargeTotal
        );
    }

    // Serial No. : the debit side's rows first (1 … n), then the
    // credit side's
    moneySerial
    (
        index:
            number
    ):
        number
    {
        return this.isPayment
            ? this.data.Credits.length + index + 1
            : index + 1;
    }

    partySerial
    (
        index:
            number
    ):
        number
    {
        return this.isPayment
            ? index + 1
            : this.data.Debits.length + index + 1;
    }

    // Serial No. of a credit row (kept for older bindings)
    creditSerial
    (
        index:
            number
    ):
        number
    {
        return this.partySerial(index);
    }

    get gridRowCount():
        number
    {
        return this.data.Debits.length
            + this.data.Credits.length
            + this.chargeDebitRows.length
            + this.chargeCreditRows.length;
    }


    //===========================================================
    // Emit
    //===========================================================

    private emitAll
    (
        changed:
            boolean =
            true
    ):
        void
    {
        const snapshot:
            VoucherEntryData =
        {
            ...this.data,

            Debits:
                this.data.Debits.map
                (
                    line =>
                    ({
                        ...line
                    })
                ),

            Credits:
                this.data.Credits.map
                (
                    line =>
                    ({
                        ...line
                    })
                )
        };

        const total =
            this.totalDebit;

        const valid =
            this.isValid;

        // After the current change-detection pass, so the page's
        // bindings never change while Angular is checking them
        queueMicrotask(
            () =>
            {
                if
                (
                    changed
                )
                {
                    this.valueChange.emit(
                        snapshot
                    );
                }

                this.totalChange.emit(
                    total
                );

                this.validChange.emit(
                    valid
                );
            }
        );

        this.cdr.markForCheck();
    }
}