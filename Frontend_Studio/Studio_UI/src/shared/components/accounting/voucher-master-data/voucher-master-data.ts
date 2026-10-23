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

const RECEIPT_MODES:
    PaymentMode[] =
[
    'Cash',
    'Bank',
    'Check',
    'MFS',
    'POS',
    'EMI'
];

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
// Voucher Master Data (Receipt Voucher)
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

    @Input()
    mode:
        VoucherMode =
        'receipt';

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

    readonly modeItems:
        SelectItem[] =
        RECEIPT_MODES.map
        (
            mode =>
            ({
                label:mode,
                value:mode
            })
        );

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
    //===========================================================

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

    // Debit − Credit
    get balance():
        number
    {
        return roundMoney(
            this.totalDebit - this.totalCredit
        );
    }

    // Debit first; once a credit is added the debits are locked
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

    // Debits are entered first, so the last free line is kept
    // for the credit : no debit may take it
    get debitLineKeptForCredit():
        boolean
    {
        return this.maxLines > 0
            &&
            this.data.Credits.length === 0
            &&
            this.linesLeft <= 1;
    }

    // The next debit is the last one that fits (one line stays
    // for the credit)
    get nextDebitIsLast():
        boolean
    {
        return this.maxLines > 0
            &&
            this.data.Credits.length === 0
            &&
            this.linesLeft === 2;
    }

    // The next credit takes the last free line : it must clear
    // the whole balance, or the voucher could never balance
    get nextCreditIsLast():
        boolean
    {
        return this.maxLines > 0
            &&
            this.linesLeft === 1
            &&
            this.balance > 0;
    }

    // Amber footer when a line limit warning is shown
    get debitHintWarn():
        boolean
    {
        return this.nextDebitIsLast
            ||
            this.debitLineKeptForCredit
            ||
            (this.atMaxLines && this.data.Credits.length === 0);
    }

    get creditHintWarn():
        boolean
    {
        return this.nextCreditIsLast
            ||
            (this.atMaxLines && this.balance > 0);
    }

    get canAddDebit():
        boolean
    {
        return !this.readonly
            &&
            this.data.Credits.length === 0
            &&
            !this.atMaxLines
            &&
            !this.debitLineKeptForCredit;
    }

    // Several debits → a single credit; the last free line → the
    // full balance
    get creditAmountLocked():
        boolean
    {
        return this.data.Debits.length >= 2
            ||
            this.nextCreditIsLast;
    }

    get canAddCredit():
        boolean
    {
        return !this.readonly
            &&
            !this.atMaxLines
            &&
            this.balance > 0
            &&
            !(
                this.data.Debits.length >= 2
                &&
                this.data.Credits.length >= 1
            );
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
        if
        (
            this.data.Debits.length === 0
        )
        {
            return 'Add the receipt mode (debit) first.';
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
            this.nextCreditIsLast
        )
        {
            return `Last line (${this.maxLines} of ${this.maxLines}) : this credit takes the full balance ${this.money(this.balance)}.`;
        }

        if
        (
            this.balance <= 0
        )
        {
            return 'Balanced : nothing left to credit.';
        }

        if
        (
            this.data.Debits.length >= 2
        )
        {
            return this.data.Credits.length === 0
                ? 'Several debits : one credit for the full balance.'
                : 'Several debits allow only one credit.';
        }

        return `Up to ${this.money(this.balance)} left to credit.`;
    }

    // One receipt mode per voucher (multi mode OFF) : fixed by
    // the first debit
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
        if
        (
            this.atMaxLines
            &&
            this.data.Credits.length === 0
        )
        {
            return `${this.maxLinesHint} The credit is still pending : remove a debit row.`;
        }

        if
        (
            this.debitLineKeptForCredit
        )
        {
            return `Line ${this.maxLines} of ${this.maxLines} is kept for the credit : no more debits.`;
        }

        if
        (
            this.nextDebitIsLast
        )
        {
            return `Next debit is the last one (line ${this.maxLines - 1} of ${this.maxLines}); line ${this.maxLines} is kept for the credit.`;
        }

        if
        (
            this.data.Credits.length > 0
        )
        {
            return 'Locked : remove the credits to change the receipt modes.';
        }

        return this.modeLocked
            ? `One receipt mode per voucher : only ${this.data.Debits[0].Mode} rows can be added. Remove them to change the mode.`
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
            this.data.Debits.length === 0
        )
        {
            return 'Add at least one receipt mode (debit).';
        }

        if
        (
            this.data.Credits.length === 0
        )
        {
            return 'Add at least one account (credit).';
        }

        if
        (
            this.balance !== 0
        )
        {
            return `Balance remaining ${this.money(this.balance)} : debit and credit must be equal.`;
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
                if
                (
                    ledger.LedgerType !== type
                    ||
                    !ledger.CollectionAccount
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
            RECEIPT_MODES.includes(value)
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
            roundMoney(
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
                'Receipt Mode is required.';

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
            this.data.Credits.length > 0
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
        if
        (
            this.creditAmountLocked
            ||
            !this.creditAmountTouched
        )
        {
            this.creditAmountText =
                this.balance > 0
                    ? this.balance.toFixed(2)
                    : '';

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
            amount > this.balance
        )
        {
            this.creditError =
                `Amount cannot be more than the balance ${this.money(this.balance)}.`;

            return;
        }

        if
        (
            this.nextCreditIsLast
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

    // Customer-borne charges : added on posting, not counted here
    get customerCharges():
        VoucherDebitLine[]
    {
        return this.data.Debits.filter
        (
            line =>
                line.ChargeBorneBy === 'Customer'
                &&
                line.ChargeAmount > 0
        );
    }

    //===========================================================
    // Charge rows in the main grid (charge the customer pays on
    // top; posted with the voucher)
    //   Dr the same money account : the charge
    //   Cr <Mode> Charges Recovery : the charges of that mode
    //===========================================================

    get chargeDebitRows():
        VoucherChargeRow[]
    {
        return this.customerCharges.map
        (
            line =>
            ({
                LedgerCode:
                    line.LedgerCode,

                LedgerName:
                    line.LedgerName,

                Subtitle:
                    `${line.Mode} charge · paid by customer`,

                Amount:
                    roundMoney(line.ChargeAmount)
            })
        );
    }

    get chargeCreditRows():
        VoucherChargeRow[]
    {
        const byMode =
            new Map<string, number>();

        for
        (
            const line of this.customerCharges
        )
        {
            byMode.set(
                line.Mode,
                roundMoney(
                    (byMode.get(line.Mode) ?? 0) + line.ChargeAmount
                )
            );
        }

        return [...byMode.entries()].map
        (
            ([mode, amount]) =>
            {
                const code =
                    CHARGE_RECOVERY_LEDGERS[mode] ?? '';

                const ledger =
                    this.findLedger(code);

                return {
                    LedgerCode:
                        code,

                    LedgerName:
                        ledger?.LedgerName || `${mode} Charges Recovery`,

                    Subtitle:
                        ledger?.SubGroupName || 'Charges recovery',

                    Amount:
                        amount
                };
            }
        );
    }

    get chargeTotal():
        number
    {
        return roundMoney(
            this.customerCharges.reduce
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
            this.totalDebit + this.chargeTotal
        );
    }

    get gridCredit():
        number
    {
        return roundMoney(
            this.totalCredit + this.chargeTotal
        );
    }

    // Serial No. of a credit row (debits are 1 … n, credits follow)
    creditSerial
    (
        index:
            number
    ):
        number
    {
        return this.data.Debits.length + index + 1;
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