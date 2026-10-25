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
    DestroyRef,
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
    roundMoney,
    formatMoney,
    parseMoney,
    toIsoDate,
    fromIsoDate
}
from '../accounting.models';

import
{
    JournalSide,
    JournalLedgerType,
    JournalLine,
    JournalEntryData,
    JOURNAL_LEDGER_TYPES,
    emptyJournalEntry,
    journalGroups
}
from './journal-entry.models';


interface SelectItem
{
    label:
        string;

    value:
        string;
}

// Ledger a row may use (supplier / customer / GL)
interface LedgerOption
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

// Entry card of one side (Debit / Credit)
interface SideDraft
{
    type:
        JournalLedgerType | '';

    subGroup:
        string;

    ledger:
        string;

    amountText:
        string;

    notes:
        string;

    options:
        LedgerOption[];

    subGroupItems:
        SelectItem[];

    ledgerItems:
        SelectItem[];

    error:
        string;

    // The user typed an amount (credit : stop following the
    // balance)
    touched:
        boolean;
}

function emptyDraft():
    SideDraft
{
    return {
        type:'',
        subGroup:'',
        ledger:'',
        amountText:'',
        notes:'',
        options:[],
        subGroupItems:[],
        ledgerItems:[],
        error:'',
        touched:false
    };
}


//===============================================================
// Component
//
// Journal Entry (Journal Voucher)
//
//   LEFT
//     1. Voucher Information : Voucher No, Voucher Date, Group
//     2. Debit  : Ledger Type → Sub-Group → Ledger, Amount, Notes
//     3. Credit : Ledger Type → Sub-Group → Ledger, Amount
//                 (= balance of the group), Notes
//   RIGHT
//     Detail Narration (required), Transaction Summary by group
//
// Groups open and close by themselves :
//   • a group starts with its debits (debits first)
//   • 2+ debits → one credit for the balance; 1 debit → several
//     credits up to the balance
//   • when debit = credit the group closes; the next debit starts
//     the next group ([multiGroup] OFF : one group only)
//   • rows of the open group can be removed (its debits once it
//     has no credit); any group can be removed whole
//   • supplier / customer / general ledger per row; cash / bank /
//     MFS / POS / EMI ledgers are never offered
//===============================================================

@Component(
{
    selector:'app-journal-entry',

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

    templateUrl:'./journal-entry.html',

    styleUrls:
    [
        '../voucher-master-data/voucher-master-data.css',
        './journal-entry.css'
    ]
})

export class JournalEntryComponent
implements OnInit
{
    //===========================================================
    // Injection
    //===========================================================

    private readonly lookup =
        inject(AccountingLookupService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);


    //===========================================================
    // Inputs
    //===========================================================

    @Input()
    readonly:
        boolean =
        false;

    // Switch "Multi Group Journal Voucher" (OFF : one group)
    @Input()
    multiGroup:
        boolean =
        true;

    // Setting "Max Lines" : most rows per voucher (0 = no limit)
    @Input()
    maxLines:
        number =
        0;

    // Settings "Back Dated / Post Dated Entry"
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

    @Input()
    set value
    (
        data:
            JournalEntryData | null
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

            Lines:
                (data.Lines ?? []).map
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

        this.resetDraft(this.debit);

        this.resetDraft(this.credit);

        this.buildSubGroupItems(this.debit);

        this.buildSubGroupItems(this.credit);

        this.followBalance();

        this.emitAll(false);
    }


    //===========================================================
    // Outputs
    //===========================================================

    @Output()
    valueChange =
        new EventEmitter<JournalEntryData>();

    // Debit total (= credit total when every group balances)
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
        JournalEntryData =
        emptyJournalEntry(
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

    readonly ledgerTypeItems:
        SelectItem[] =
        JOURNAL_LEDGER_TYPES.map
        (
            type =>
            ({
                label:type,
                value:type
            })
        );

    debit:
        SideDraft =
        emptyDraft();

    credit:
        SideDraft =
        emptyDraft();


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

    private partyLedgerCodes:
        Set<string> =
        new Set<string>();

    private autoLedgerCodes:
        Set<string> =
        new Set<string>();


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

                this.partyLedgerCodes =
                    new Set<string>
                    (
                        [
                            ...this.customers,
                            ...this.suppliers
                        ]
                        .map(party => (party.LedgerCode ?? '').trim().toUpperCase())
                        .filter(code => code.length > 0)
                    );

                this.buildSubGroupItems(this.debit);

                this.buildSubGroupItems(this.credit);

                this.cdr.markForCheck();
            };

        this.lookup
            .getLedgers(true)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    (ledgers: VoucherLedger[]): void =>
                    {
                        this.ledgers =
                            ledgers.filter(ledger => ledger.IsActive);

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
                    (): void =>
                    {
                        this.lookupError =
                            'Failed to load the ledgers.';

                        done();
                    }
            });

        this.lookup
            .getAutoLedgerCodes()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    (codes: Set<string>): void =>
                    {
                        this.autoLedgerCodes =
                            codes;

                        done();
                    },

                error:
                    (): void =>
                    {
                        this.autoLedgerCodes =
                            new Set<string>();

                        done();
                    }
            });

        this.lookup
            .getCustomers()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    (rows: PartyOption[]): void =>
                    {
                        this.customers =
                            rows;

                        done();
                    },

                error:
                    (): void =>
                    {
                        this.customers =
                            [];

                        done();
                    }
            });

        this.lookup
            .getSuppliers()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    (rows: PartyOption[]): void =>
                    {
                        this.suppliers =
                            rows;

                        done();
                    },

                error:
                    (): void =>
                    {
                        this.suppliers =
                            [];

                        done();
                    }
            });
    }


    //===========================================================
    // Groups / totals / rules
    //===========================================================

    get groups():
        { no: number; lines: JournalLine[] }[]
    {
        return journalGroups(
            this.data.Lines
        );
    }

    groupDebit
    (
        no:
            number
    ):
        number
    {
        return this.sum(
            this.data.Lines.filter(line => line.GroupNo === no && line.Side === 'Debit')
        );
    }

    groupCredit
    (
        no:
            number
    ):
        number
    {
        return this.sum(
            this.data.Lines.filter(line => line.GroupNo === no && line.Side === 'Credit')
        );
    }

    groupBalanced
    (
        no:
            number
    ):
        boolean
    {
        const debit =
            this.groupDebit(no);

        return debit > 0
            &&
            debit === this.groupCredit(no);
    }

    // Debit − credit of a group (left to credit)
    groupBalance
    (
        no:
            number
    ):
        number
    {
        return roundMoney(
            this.groupDebit(no) - this.groupCredit(no)
        );
    }

    private sum
    (
        lines:
            JournalLine[]
    ):
        number
    {
        return roundMoney(
            lines.reduce
            (
                (total, line) =>
                    total + (Number(line.Amount) || 0),
                0
            )
        );
    }

    private get lastGroupNo():
        number
    {
        return this.data.Lines.reduce
        (
            (max, line) =>
                Math.max(max, line.GroupNo),
            0
        );
    }

    // The group being entered (not yet balanced); 0 = none
    get openGroupNo():
        number
    {
        const last =
            this.lastGroupNo;

        return last > 0 && !this.groupBalanced(last)
            ? last
            : 0;
    }

    // Group the next debit goes to
    get currentGroupNo():
        number
    {
        return this.openGroupNo
            ||
            this.lastGroupNo + 1;
    }

    private get openDebits():
        number
    {
        return this.data.Lines.filter
        (
            line =>
                line.GroupNo === this.openGroupNo
                &&
                line.Side === 'Debit'
        ).length;
    }

    private get openCredits():
        number
    {
        return this.data.Lines.filter
        (
            line =>
                line.GroupNo === this.openGroupNo
                &&
                line.Side === 'Credit'
        ).length;
    }

    // Left to credit in the open group
    get balance():
        number
    {
        return this.openGroupNo > 0
            ? this.groupBalance(this.openGroupNo)
            : 0;
    }

    get totalDebit():
        number
    {
        return this.sum(
            this.data.Lines.filter(line => line.Side === 'Debit')
        );
    }

    get totalCredit():
        number
    {
        return this.sum(
            this.data.Lines.filter(line => line.Side === 'Credit')
        );
    }

    get lineCount():
        number
    {
        return this.data.Lines.length;
    }

    get linesLeft():
        number
    {
        return this.maxLines > 0
            ? Math.max(this.maxLines - this.lineCount, 0)
            : Number.POSITIVE_INFINITY;
    }

    get atMaxLines():
        boolean
    {
        return this.linesLeft === 0;
    }

    // One group only (switch OFF) and it is balanced
    private get singleGroupDone():
        boolean
    {
        return !this.multiGroup
            &&
            this.openGroupNo === 0
            &&
            this.lineCount > 0;
    }

    // Group shown on the Debit / Credit cards
    get cardGroupNo():
        number
    {
        if
        (
            this.openGroupNo > 0
        )
        {
            return this.openGroupNo;
        }

        // One group only : no next group to start
        return this.singleGroupDone
            ? this.lastGroupNo
            : this.currentGroupNo;
    }

    // Voucher Information : "Group 2 · open"
    get groupText():
        string
    {
        if
        (
            this.openGroupNo > 0
        )
        {
            return `Group ${this.openGroupNo} · open`;
        }

        if
        (
            this.lineCount === 0
        )
        {
            return this.multiGroup ? 'Group 1' : 'Single group';
        }

        const count =
            this.groups.length;

        return `${count} group${count === 1 ? '' : 's'} · balanced`;
    }

    //-----------------------------------------------------------
    // Debit card
    //-----------------------------------------------------------

    // Debits first; a new group needs a line for its credit too
    get canAddDebit():
        boolean
    {
        return !this.readonly
            &&
            this.openCredits === 0
            &&
            !this.singleGroupDone
            &&
            this.linesLeft >= 2;
    }

    get debitHint():
        string
    {
        if
        (
            this.singleGroupDone
        )
        {
            return 'One group per voucher (switch 0045 is OFF).';
        }

        if
        (
            this.openCredits > 0
        )
        {
            return `Group ${this.openGroupNo} has credits : debits locked.`;
        }

        if
        (
            this.maxLines > 0
            &&
            this.linesLeft < 2
        )
        {
            return `Max ${this.maxLines} lines : last line kept for the credit.`;
        }

        if
        (
            this.lineCount === 0
        )
        {
            return 'Start Group 1 with a debit.';
        }

        if
        (
            this.openGroupNo === 0
        )
        {
            return `Group ${this.lastGroupNo} balanced : next debit starts Group ${this.lastGroupNo + 1}.`;
        }

        return `Adding to Group ${this.openGroupNo}.`;
    }

    get debitHintWarn():
        boolean
    {
        return this.singleGroupDone
            ||
            (this.maxLines > 0 && this.linesLeft < 2);
    }

    //-----------------------------------------------------------
    // Credit card
    //-----------------------------------------------------------

    get canAddCredit():
        boolean
    {
        return !this.readonly
            &&
            this.openGroupNo > 0
            &&
            this.openDebits > 0
            &&
            this.balance > 0
            &&
            !(
                this.openDebits >= 2
                &&
                this.openCredits >= 1
            )
            &&
            this.linesLeft >= 1;
    }

    // Several debits → one credit for the balance; the last free
    // line → the balance
    get creditAmountLocked():
        boolean
    {
        return this.openDebits >= 2
            ||
            this.linesLeft === 1;
    }

    get creditHint():
        string
    {
        if
        (
            this.openGroupNo === 0
        )
        {
            return this.lineCount === 0
                ? 'Add the debit first.'
                : 'Every group is balanced.';
        }

        if
        (
            this.atMaxLines
        )
        {
            return `Max lines reached : Group ${this.openGroupNo} still needs ${this.money(this.balance)}.`;
        }

        if
        (
            this.openDebits >= 2
        )
        {
            return `Several debits : one credit for ${this.money(this.balance)}.`;
        }

        if
        (
            this.linesLeft === 1
        )
        {
            return `Last line : credit the full ${this.money(this.balance)}.`;
        }

        return `Group ${this.openGroupNo} : ${this.money(this.balance)} to credit.`;
    }

    get creditHintWarn():
        boolean
    {
        return this.atMaxLines
            ||
            this.linesLeft === 1;
    }

    //-----------------------------------------------------------
    // Rows
    //-----------------------------------------------------------

    // Rows of the open group : credits always, debits once the
    // group has no credit
    canRemoveLine
    (
        line:
            JournalLine
    ):
        boolean
    {
        if
        (
            this.readonly
            ||
            line.GroupNo !== this.openGroupNo
        )
        {
            return false;
        }

        return line.Side === 'Credit'
            ||
            this.openCredits === 0;
    }

    removeLineTitle
    (
        line:
            JournalLine
    ):
        string
    {
        if
        (
            line.GroupNo !== this.openGroupNo
        )
        {
            return 'Balanced group : remove the whole group';
        }

        return this.canRemoveLine(line)
            ? 'Remove'
            : 'Remove the credits of this group first';
    }

    // SL across the voucher
    serial
    (
        line:
            JournalLine
    ):
        number
    {
        return this.data.Lines.indexOf(line) + 1;
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
            this.lineCount === 0
        )
        {
            return 'Add at least one debit and one credit.';
        }

        if
        (
            this.openGroupNo > 0
        )
        {
            return `Group ${this.openGroupNo} : balance ${this.money(this.balance)} remaining. Debit and credit must be equal.`;
        }

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
    // Ledger Type → Sub-Group → Ledger (both cards)
    //===========================================================

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

    private buildOptions
    (
        type:
            JournalLedgerType | ''
    ):
        LedgerOption[]
    {
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
                LedgerOption[] =
                [];

            for
            (
                const party of parties
            )
            {
                const ledger =
                    party.IsActive
                        ? this.findLedger(party.LedgerCode)
                        : undefined;

                if
                (
                    !ledger
                    ||
                    ledger.IsMoneyLedger
                )
                {
                    continue;
                }

                options.push(
                {
                    SubGroupCode:ledger.SubGroupCode,
                    SubGroupName:ledger.SubGroupName,
                    LedgerCode:ledger.LedgerCode,
                    LedgerName:party.Name,
                    PartyCode:party.Code,
                    Label:`${party.Code} - ${party.Name}`
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
                        !this.partyLedgerCodes.has(ledger.LedgerCode.trim().toUpperCase())
                        &&
                        !this.autoLedgerCodes.has(ledger.LedgerCode.trim().toUpperCase())
                )
                .map
                (
                    ledger =>
                    ({
                        SubGroupCode:ledger.SubGroupCode,
                        SubGroupName:ledger.SubGroupName,
                        LedgerCode:ledger.LedgerCode,
                        LedgerName:ledger.LedgerName,
                        PartyCode:'',
                        Label:`${ledger.LedgerCode} - ${ledger.LedgerName}`
                    })
                );
        }

        return [];
    }

    private buildSubGroupItems
    (
        draft:
            SideDraft
    ):
        void
    {
        draft.options =
            this.buildOptions(
                draft.type
            );

        const seen =
            new Map<string, string>();

        for
        (
            const option of draft.options
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

        draft.subGroupItems =
            [...seen.entries()]
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map
                (
                    ([code, name]) =>
                    ({
                        label:name ? `${code} - ${name}` : code,
                        value:code
                    })
                );

        if
        (
            draft.subGroupItems.length === 1
        )
        {
            draft.subGroup =
                draft.subGroupItems[0].value;
        }
        else if
        (
            !draft.subGroupItems.some(item => item.value === draft.subGroup)
        )
        {
            draft.subGroup =
                '';
        }

        this.buildLedgerItems(draft);

        this.cdr.markForCheck();
    }

    // Ledgers of the sub group, minus those already in the group
    // being entered (either side)
    private buildLedgerItems
    (
        draft:
            SideDraft
    ):
        void
    {
        const used =
            new Set
            (
                this.data.Lines
                    .filter(line => line.GroupNo === this.currentGroupNo)
                    .map(line => line.LedgerCode.toUpperCase())
            );

        draft.ledgerItems =
            draft.options
                .filter
                (
                    option =>
                        option.SubGroupCode === draft.subGroup
                        &&
                        !used.has(option.LedgerCode.toUpperCase())
                )
                .sort((a, b) => a.Label.localeCompare(b.Label))
                .map
                (
                    option =>
                    ({
                        label:option.Label,
                        value:option.LedgerCode
                    })
                );

        if
        (
            !draft.ledgerItems.some(item => item.value === draft.ledger)
        )
        {
            draft.ledger =
                '';
        }
    }

    private draftOf
    (
        side:
            JournalSide
    ):
        SideDraft
    {
        return side === 'Debit'
            ? this.debit
            : this.credit;
    }

    onTypeChange
    (
        side:
            JournalSide,
        value:
            any
    ):
        void
    {
        const draft =
            this.draftOf(side);

        draft.type =
            JOURNAL_LEDGER_TYPES.includes(value)
                ? value as JournalLedgerType
                : '';

        draft.subGroup =
            '';

        draft.ledger =
            '';

        draft.error =
            '';

        this.buildSubGroupItems(draft);
    }

    onSubGroupChange
    (
        side:
            JournalSide,
        value:
            any
    ):
        void
    {
        const draft =
            this.draftOf(side);

        draft.subGroup =
            String(value ?? '');

        draft.ledger =
            '';

        draft.error =
            '';

        this.buildLedgerItems(draft);
    }

    onLedgerChange
    (
        side:
            JournalSide,
        value:
            any
    ):
        void
    {
        const draft =
            this.draftOf(side);

        draft.ledger =
            String(value ?? '');

        draft.error =
            '';

        if
        (
            side === 'Credit'
        )
        {
            this.followBalance();
        }
    }

    onAmountText
    (
        side:
            JournalSide,
        value:
            string | number
    ):
        void
    {
        const draft =
            this.draftOf(side);

        draft.amountText =
            String(value ?? '');

        draft.touched =
            true;

        draft.error =
            '';
    }

    onNotes
    (
        side:
            JournalSide,
        value:
            string | number
    ):
        void
    {
        this.draftOf(side).notes =
            String(value ?? '');
    }

    // Credit amount follows the group balance until the user types
    // one
    private followBalance():
        void
    {
        if
        (
            this.creditAmountLocked
            ||
            !this.credit.touched
        )
        {
            this.credit.amountText =
                this.balance > 0
                    ? this.balance.toFixed(2)
                    : '';

            this.credit.touched =
                false;
        }
    }

    private resetDraft
    (
        draft:
            SideDraft
    ):
        void
    {
        draft.ledger =
            '';

        draft.amountText =
            '';

        draft.notes =
            '';

        draft.error =
            '';

        draft.touched =
            false;
    }


    //===========================================================
    // Add / remove
    //===========================================================

    add
    (
        side:
            JournalSide
    ):
        void
    {
        const isDebit =
            side === 'Debit';

        if
        (
            isDebit
                ? !this.canAddDebit
                : !this.canAddCredit
        )
        {
            return;
        }

        const draft =
            this.draftOf(side);

        const amount =
            !isDebit && this.creditAmountLocked
                ? this.balance
                : roundMoney(parseMoney(draft.amountText));

        const option =
            draft.options.find
            (
                item =>
                    item.LedgerCode === draft.ledger
            );

        if
        (
            !draft.type
        )
        {
            draft.error =
                'Ledger Type is required.';

            return;
        }

        if
        (
            !draft.subGroup
        )
        {
            draft.error =
                'Account Sub-Group is required.';

            return;
        }

        if
        (
            !option
        )
        {
            draft.error =
                'Account Ledger is required.';

            return;
        }

        if
        (
            !(amount > 0)
        )
        {
            draft.error =
                'Amount must be more than 0.';

            return;
        }

        if
        (
            !isDebit
            &&
            amount > this.balance
        )
        {
            draft.error =
                `Amount cannot be more than the balance ${this.money(this.balance)}.`;

            return;
        }

        if
        (
            !isDebit
            &&
            this.linesLeft === 1
            &&
            amount !== this.balance
        )
        {
            draft.error =
                `Last line : the amount must be the full balance ${this.money(this.balance)}.`;

            return;
        }

        const groupNo =
            this.currentGroupNo;

        const line:
            JournalLine =
        {
            Side:side,
            GroupNo:groupNo,
            LedgerType:draft.type,
            SubGroupCode:option.SubGroupCode,
            SubGroupName:option.SubGroupName,
            LedgerCode:option.LedgerCode,
            LedgerName:option.LedgerName,
            PartyCode:option.PartyCode,
            Amount:amount,
            ShortNotes:draft.notes.trim()
        };

        // Debits go after the group's debits (before its credits;
        // a new group goes last)
        if
        (
            isDebit
        )
        {
            const lastDebit =
                this.data.Lines.reduce
                (
                    (found, item, index) =>
                        item.GroupNo === groupNo && item.Side === 'Debit'
                            ? index
                            : found,
                    -1
                );

            const at =
                lastDebit >= 0
                    ? lastDebit + 1
                    : this.data.Lines.length;

            this.data.Lines =
            [
                ...this.data.Lines.slice(0, at),
                line,
                ...this.data.Lines.slice(at)
            ];
        }
        else
        {
            this.data.Lines =
            [
                ...this.data.Lines,
                line
            ];
        }

        this.resetDraft(draft);

        // After a balanced group the next debit starts a new one
        this.buildLedgerItems(this.debit);

        this.buildLedgerItems(this.credit);

        this.followBalance();

        this.emitAll();
    }

    removeLine
    (
        line:
            JournalLine
    ):
        void
    {
        if
        (
            !this.canRemoveLine(line)
        )
        {
            return;
        }

        this.data.Lines =
            this.data.Lines.filter
            (
                item =>
                    item !== line
            );

        this.afterRemove();
    }

    removeGroup
    (
        no:
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

        this.data.Lines =
            this.data.Lines.filter
            (
                item =>
                    item.GroupNo !== no
            );

        this.afterRemove();
    }

    // Groups renumbered 1, 2, ... in order
    private afterRemove():
        void
    {
        const order =
            journalGroups(this.data.Lines)
                .map(group => group.no);

        this.data.Lines =
            this.data.Lines.map
            (
                item =>
                ({
                    ...item,

                    GroupNo:
                        order.indexOf(item.GroupNo) + 1
                })
            );

        this.debit.error =
            '';

        this.credit.error =
            '';

        this.buildLedgerItems(this.debit);

        this.buildLedgerItems(this.credit);

        this.credit.touched =
            false;

        this.followBalance();

        this.emitAll();
    }


    //===========================================================
    // Summary helpers
    //===========================================================

    // Subtitle under a row : "SUP-000004 · Trade Payables"
    lineDetails
    (
        line:
            JournalLine
    ):
        string
    {
        return [line.PartyCode, line.SubGroupName]
            .filter(part => !!part)
            .join(' · ');
    }

    trackLine
    (
        _index:
            number,
        line:
            JournalLine
    ):
        JournalLine
    {
        return line;
    }


    //===========================================================
    // Emit (after the current change-detection pass)
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
            JournalEntryData =
        {
            ...this.data,

            Lines:
                this.data.Lines.map
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