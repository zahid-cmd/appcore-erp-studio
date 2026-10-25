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
    CHARGE_EXPENSE_LEDGERS,
    roundMoney,
    formatMoney,
    parseMoney,
    toIsoDate,
    fromIsoDate
}
from '../accounting.models';

import
{
    TransferSide,
    TransferAccountType,
    TransferLine,
    TransferEntryData,
    TRANSFER_ACCOUNT_TYPES,
    emptyTransferEntry,
    transferTypeText
}
from './transfer-entry.models';


interface SelectItem
{
    label:
        string;

    value:
        string;
}

// Entry card of one side (From / To)
interface SideDraft
{
    type:
        TransferAccountType | '';

    subGroup:
        string;

    ledger:
        string;

    amountText:
        string;

    notes:
        string;

    subGroupItems:
        SelectItem[];

    ledgerItems:
        SelectItem[];

    error:
        string;

    // The user typed an amount (To : stop following the balance)
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
        subGroupItems:[],
        ledgerItems:[],
        error:'',
        touched:false
    };
}

// Charge row added by the system (company pays)
export interface TransferChargeRow
{
    LedgerCode:
        string;

    LedgerName:
        string;

    Subtitle:
        string;

    Amount:
        number;
}


//===============================================================
// Component
//
// Transfer Entry (Fund Transfer)
//
//   LEFT
//     1. Voucher Information : Voucher No, Voucher Date, Transfer
//        Type (Cash → Bank …)
//     2. Transfer From (CREDIT, entered first) : Account Type →
//        Sub-Group → Account, Amount, Short Notes;
//          Bank : Method (Bank Transfer / Cheque) + Reference or
//                 Cheque No / Date, Charge
//          MFS  : Transaction ID, Charge
//     3. Transfer To (DEBIT) : Account Type → Sub-Group → Account
//        (any branch), Amount (= balance), Short Notes
//   RIGHT
//     Detail Narration (required), Transaction Summary (debits
//     first : To, charge expense | From, charge)
//
// Rules (as RV / PV) :
//   • 2+ From → one To for the balance; 1 From → several To
//   • once a To row exists the From side is locked
//   • [multiMode] OFF : one From and one To
//   • From : our branch's cash; bank / MFS shared or ours
//   • an account is never on both sides
//===============================================================

@Component(
{
    selector:'app-transfer-entry',

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

    templateUrl:'./transfer-entry.html',

    styleUrls:
    [
        '../voucher-master-data/voucher-master-data.css',
        './transfer-entry.css'
    ]
})

export class TransferEntryComponent
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

    // Switch "Multi Mode Fund Transfer" (OFF : one From, one To)
    @Input()
    multiMode:
        boolean =
        false;

    // Setting "Max Lines" (0 = no limit)
    @Input()
    maxLines:
        number =
        0;

    @Input()
    minDate:
        Date | null =
        null;

    @Input()
    maxDate:
        Date | null =
        null;

    @Input()
    voucherNo:
        string =
        '';

    // Login branch : decides which From accounts are offered
    @Input()
    set branchName
    (
        value:
            string
    )
    {
        this._branchName =
            (value ?? '').trim();

        this.buildSubGroupItems(this.from);

        this.buildSubGroupItems(this.to);
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
            TransferEntryData | null
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

        this.resetFromDraft();

        this.resetDraft(this.to);

        this.buildSubGroupItems(this.from);

        this.buildSubGroupItems(this.to);

        this.followBalance();

        this.emitAll(false);
    }


    //===========================================================
    // Outputs
    //===========================================================

    @Output()
    valueChange =
        new EventEmitter<TransferEntryData>();

    // Transfer amount (To total)
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
        TransferEntryData =
        emptyTransferEntry(
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

    readonly typeItems:
        SelectItem[] =
        TRANSFER_ACCOUNT_TYPES.map
        (
            type =>
            ({
                label:type,
                value:type
            })
        );

    readonly methodItems:
        SelectItem[] =
    [
        { label:'Bank Transfer', value:'Bank Transfer' },
        { label:'Cheque', value:'Cheque' }
    ];

    from:
        SideDraft =
        emptyDraft();

    to:
        SideDraft =
        emptyDraft();

    // From card extras
    fromMethod:
        string =
        'Bank Transfer';

    fromReference:
        string =
        '';

    fromCheckNo:
        string =
        '';

    fromCheckDate:
        Date | null =
        null;

    fromChargeText:
        string =
        '';


    //===========================================================
    // Look-ups
    //===========================================================

    private ledgers:
        VoucherLedger[] =
        [];


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

        this.loading =
            true;

        this.lookup
            .getLedgers(true)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                    (ledgers: VoucherLedger[]): void =>
                    {
                        this.ledgersAll =
                            ledgers;

                        this.ledgers =
                            ledgers.filter
                            (
                                ledger =>
                                    ledger.IsActive
                                    &&
                                    (TRANSFER_ACCOUNT_TYPES as string[]).includes(ledger.LedgerType)
                            );

                        this.loading =
                            false;

                        this.buildSubGroupItems(this.from);

                        this.buildSubGroupItems(this.to);

                        this.cdr.markForCheck();
                    },

                error:
                    (): void =>
                    {
                        this.lookupError =
                            'Failed to load the accounts.';

                        this.loading =
                            false;

                        this.cdr.markForCheck();
                    }
            });

        this.emitAll(false);
    }


    //===========================================================
    // Totals / rules
    //===========================================================

    get fromLines():
        TransferLine[]
    {
        return this.data.Lines.filter(line => line.Side === 'From');
    }

    get toLines():
        TransferLine[]
    {
        return this.data.Lines.filter(line => line.Side === 'To');
    }

    private sum
    (
        values:
            number[]
    ):
        number
    {
        return roundMoney(
            values.reduce((total, value) => total + (Number(value) || 0), 0)
        );
    }

    get totalFrom():
        number
    {
        return this.sum(this.fromLines.map(line => line.Amount));
    }

    get totalTo():
        number
    {
        return this.sum(this.toLines.map(line => line.Amount));
    }

    get totalCharges():
        number
    {
        return this.sum(this.fromLines.map(line => line.ChargeAmount));
    }

    // Left to send To
    get balance():
        number
    {
        return roundMoney(
            this.totalFrom - this.totalTo
        );
    }

    // Grid totals (charges on both sides)
    get gridDebit():
        number
    {
        return roundMoney(this.totalTo + this.totalCharges);
    }

    get gridCredit():
        number
    {
        return roundMoney(this.totalFrom + this.totalCharges);
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

    get transferType():
        string
    {
        return transferTypeText(this.data.Lines)
            ||
            '—';
    }

    //-----------------------------------------------------------
    // From card
    //-----------------------------------------------------------

    // From rows first; the last free line is kept for the To row
    get canAddFrom():
        boolean
    {
        return !this.readonly
            &&
            this.toLines.length === 0
            &&
            (this.multiMode || this.fromLines.length === 0)
            &&
            this.linesLeft >= 2;
    }

    get fromHint():
        string
    {
        if
        (
            this.toLines.length > 0
        )
        {
            return 'Transfer To rows exist : From is locked.';
        }

        if
        (
            !this.multiMode
            &&
            this.fromLines.length > 0
        )
        {
            return 'One From account (Multi Mode is OFF).';
        }

        if
        (
            this.maxLines > 0
            &&
            this.linesLeft < 2
        )
        {
            return `Max ${this.maxLines} lines : last line kept for Transfer To.`;
        }

        return this.fromLines.length === 0
            ? 'Start with the account the money leaves.'
            : 'Add another From account, or go to Transfer To.';
    }

    get fromHintWarn():
        boolean
    {
        return this.maxLines > 0
            &&
            this.linesLeft < 2
            &&
            this.toLines.length === 0;
    }

    //-----------------------------------------------------------
    // To card
    //-----------------------------------------------------------

    get canAddTo():
        boolean
    {
        return !this.readonly
            &&
            this.fromLines.length > 0
            &&
            this.balance > 0
            &&
            !(
                this.fromLines.length >= 2
                &&
                this.toLines.length >= 1
            )
            &&
            (this.multiMode || this.toLines.length === 0)
            &&
            this.linesLeft >= 1;
    }

    // Several From rows, one To allowed or the last line : the
    // To row takes the whole balance
    get toAmountLocked():
        boolean
    {
        return this.fromLines.length >= 2
            ||
            !this.multiMode
            ||
            this.linesLeft === 1;
    }

    get toHint():
        string
    {
        if
        (
            this.fromLines.length === 0
        )
        {
            return 'Add the Transfer From account first.';
        }

        if
        (
            this.balance <= 0
        )
        {
            return 'Balanced.';
        }

        if
        (
            this.atMaxLines
        )
        {
            return `Max lines reached : ${this.money(this.balance)} still pending.`;
        }

        if
        (
            this.toAmountLocked
        )
        {
            return `One To account for the full ${this.money(this.balance)}.`;
        }

        return `${this.money(this.balance)} left to transfer.`;
    }

    get toHintWarn():
        boolean
    {
        return this.atMaxLines
            ||
            this.linesLeft === 1;
    }

    // To rows : always removable; From rows : while no To row
    canRemove
    (
        line:
            TransferLine
    ):
        boolean
    {
        return !this.readonly
            &&
            (
                line.Side === 'To'
                ||
                this.toLines.length === 0
            );
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
            this.fromLines.length === 0
            ||
            this.toLines.length === 0
        )
        {
            return 'Add a Transfer From and a Transfer To account.';
        }

        if
        (
            this.balance !== 0
        )
        {
            return `Balance remaining ${this.money(this.balance)} : From and To must be equal.`;
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
    // Account Type → Sub-Group → Account
    //===========================================================

    private draftOf
    (
        side:
            TransferSide
    ):
        SideDraft
    {
        return side === 'From'
            ? this.from
            : this.to;
    }

    // From : our branch's cash; bank / MFS shared or ours.
    // To : any branch. Never an account already in the transfer.
    private candidates
    (
        draft:
            SideDraft
    ):
        VoucherLedger[]
    {
        if
        (
            !draft.type
        )
        {
            return [];
        }

        const branch =
            this.branchName.toUpperCase();

        const used =
            new Set(
                this.data.Lines.map(line => line.LedgerCode.toUpperCase())
            );

        return this.ledgers.filter
        (
            ledger =>
            {
                if
                (
                    ledger.LedgerType !== draft.type
                    ||
                    used.has(ledger.LedgerCode.toUpperCase())
                )
                {
                    return false;
                }

                if
                (
                    draft !== this.from
                )
                {
                    return true;
                }

                const own =
                    (ledger.Branch ?? '').trim().toUpperCase() === branch;

                return ledger.LedgerType === 'Cash'
                    ? own
                    : !ledger.BranchExclusive || own;
            }
        );
    }

    private buildSubGroupItems
    (
        draft:
            SideDraft
    ):
        void
    {
        const seen =
            new Map<string, string>();

        for
        (
            const ledger of this.candidates(draft)
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

    private buildLedgerItems
    (
        draft:
            SideDraft
    ):
        void
    {
        const branch =
            this.branchName.toUpperCase();

        draft.ledgerItems =
            this.candidates(draft)
                .filter(ledger => ledger.SubGroupCode === draft.subGroup)
                .map
                (
                    ledger =>
                    {
                        // Another branch's account : show its branch
                        const other =
                            ledger.Branch
                            &&
                            ledger.Branch.trim().toUpperCase() !== branch;

                        return {
                            label:`${ledger.LedgerCode} - ${ledger.LedgerName}${other ? ` · ${ledger.Branch}` : ''}`,
                            value:ledger.LedgerCode
                        };
                    }
                )
                .sort((a, b) => a.label.localeCompare(b.label));

        if
        (
            !draft.ledgerItems.some(item => item.value === draft.ledger)
        )
        {
            draft.ledger =
                '';
        }
    }

    onTypeChange
    (
        side:
            TransferSide,
        value:
            any
    ):
        void
    {
        const draft =
            this.draftOf(side);

        draft.type =
            (TRANSFER_ACCOUNT_TYPES as string[]).includes(value)
                ? value as TransferAccountType
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
            TransferSide,
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
            TransferSide,
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
            side === 'To'
        )
        {
            this.followBalance();
        }
    }

    onAmountText
    (
        side:
            TransferSide,
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
            TransferSide,
        value:
            string | number
    ):
        void
    {
        this.draftOf(side).notes =
            String(value ?? '');
    }

    //-----------------------------------------------------------
    // From extras
    //-----------------------------------------------------------

    onMethodChange
    (
        value:
            any
    ):
        void
    {
        this.fromMethod =
            value === 'Cheque'
                ? 'Cheque'
                : 'Bank Transfer';

        this.from.error =
            '';
    }

    onReference
    (
        value:
            string | number
    ):
        void
    {
        this.fromReference =
            String(value ?? '');

        this.from.error =
            '';
    }

    onCheckNo
    (
        value:
            string | number
    ):
        void
    {
        this.fromCheckNo =
            String(value ?? '');

        this.from.error =
            '';
    }

    onCheckDate
    (
        value:
            Date | null
    ):
        void
    {
        this.fromCheckDate =
            value;

        this.from.error =
            '';
    }

    onChargeText
    (
        value:
            string | number
    ):
        void
    {
        this.fromChargeText =
            String(value ?? '');

        this.from.error =
            '';
    }

    // To amount follows the balance until the user types one
    private followBalance():
        void
    {
        if
        (
            this.toAmountLocked
            ||
            !this.to.touched
        )
        {
            this.to.amountText =
                this.balance > 0
                    ? this.balance.toFixed(2)
                    : '';

            this.to.touched =
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

    private resetFromDraft():
        void
    {
        this.resetDraft(this.from);

        this.fromMethod =
            'Bank Transfer';

        this.fromReference =
            '';

        this.fromCheckNo =
            '';

        this.fromCheckDate =
            null;

        this.fromChargeText =
            '';
    }


    //===========================================================
    // Add / remove
    //===========================================================

    add
    (
        side:
            TransferSide
    ):
        void
    {
        const isFrom =
            side === 'From';

        if
        (
            isFrom
                ? !this.canAddFrom
                : !this.canAddTo
        )
        {
            return;
        }

        const draft =
            this.draftOf(side);

        const ledger =
            this.candidates(draft).find
            (
                item =>
                    item.LedgerCode === draft.ledger
            );

        const amount =
            !isFrom && this.toAmountLocked
                ? this.balance
                : roundMoney(parseMoney(draft.amountText));

        if
        (
            !draft.type
        )
        {
            draft.error =
                'Account Type is required.';

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
            !ledger
        )
        {
            draft.error =
                'Account is required.';

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
            !isFrom
            &&
            amount > this.balance
        )
        {
            draft.error =
                `Amount cannot be more than the balance ${this.money(this.balance)}.`;

            return;
        }

        const line:
            TransferLine =
        {
            Side:side,
            AccountType:draft.type,
            SubGroupCode:ledger.SubGroupCode,
            SubGroupName:ledger.SubGroupName,
            LedgerCode:ledger.LedgerCode,
            LedgerName:ledger.LedgerName,
            AccountId:ledger.AccountId,
            AccountBranch:ledger.Branch ?? '',
            Amount:amount,
            ShortNotes:draft.notes.trim(),
            Method:'',
            Reference:'',
            CheckNo:'',
            CheckDate:'',
            ChargeAmount:0
        };

        if
        (
            isFrom
        )
        {
            const issue =
                this.applyFromExtras(line);

            if
            (
                issue
            )
            {
                draft.error =
                    issue;

                return;
            }

            // From rows stay before the To rows
            const lastFrom =
                this.data.Lines.reduce
                (
                    (found, item, index) =>
                        item.Side === 'From' ? index : found,
                    -1
                );

            this.data.Lines =
            [
                ...this.data.Lines.slice(0, lastFrom + 1),
                line,
                ...this.data.Lines.slice(lastFrom + 1)
            ];

            this.resetFromDraft();
        }
        else
        {
            this.data.Lines =
            [
                ...this.data.Lines,
                line
            ];

            this.resetDraft(this.to);
        }

        this.buildSubGroupItems(this.from);

        this.buildSubGroupItems(this.to);

        this.followBalance();

        this.emitAll();
    }

    // Method / reference / cheque / charge of a From row; returns
    // an error text ('' = fine)
    private applyFromExtras
    (
        line:
            TransferLine
    ):
        string
    {
        switch
        (
            line.AccountType
        )
        {
            case 'Cash':

                line.Method =
                    'Cash';

                return '';

            case 'Bank':

                if
                (
                    this.fromMethod === 'Cheque'
                )
                {
                    if
                    (
                        !this.fromCheckNo.trim()
                    )
                    {
                        return 'Cheque No is required.';
                    }

                    if
                    (
                        !this.fromCheckDate
                    )
                    {
                        return 'Cheque Date is required.';
                    }

                    line.Method =
                        'Cheque';

                    line.CheckNo =
                        this.fromCheckNo.trim();

                    line.CheckDate =
                        toIsoDate(this.fromCheckDate);
                }
                else
                {
                    line.Method =
                        'Bank Transfer';

                    line.Reference =
                        this.fromReference.trim();
                }

                break;

            case 'MFS':

                if
                (
                    !this.fromReference.trim()
                )
                {
                    return 'Transaction ID is required.';
                }

                line.Method =
                    'MFS';

                line.Reference =
                    this.fromReference.trim();

                break;
        }

        const charge =
            roundMoney(parseMoney(this.fromChargeText));

        if
        (
            charge < 0
            ||
            charge > line.Amount
        )
        {
            return 'Charge must be between 0 and the amount.';
        }

        line.ChargeAmount =
            charge;

        return '';
    }

    remove
    (
        line:
            TransferLine
    ):
        void
    {
        if
        (
            !this.canRemove(line)
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

        this.from.error =
            '';

        this.to.error =
            '';

        this.to.touched =
            false;

        this.buildSubGroupItems(this.from);

        this.buildSubGroupItems(this.to);

        this.followBalance();

        this.emitAll();
    }


    //===========================================================
    // Summary helpers
    //===========================================================

    // Charge expense rows (Dr) : one per account type
    get chargeRows():
        TransferChargeRow[]
    {
        const byType =
            new Map<string, number>();

        for
        (
            const line of this.fromLines
        )
        {
            if
            (
                line.ChargeAmount > 0
            )
            {
                byType.set(
                    String(line.AccountType),
                    roundMoney((byType.get(String(line.AccountType)) ?? 0) + line.ChargeAmount)
                );
            }
        }

        return [...byType.entries()].map
        (
            ([type, amount]) =>
            {
                const code =
                    CHARGE_EXPENSE_LEDGERS[type] ?? '';

                const ledger =
                    this.ledgersAll.find(item => item.LedgerCode === code);

                return {
                    LedgerCode:code,
                    LedgerName:ledger?.LedgerName || `${type} Charges`,
                    Subtitle:'Charge paid by the company',
                    Amount:amount
                };
            }
        );
    }

    // Charge expense ledgers are General Ledgers (not in the
    // filtered transfer accounts) : names only
    private ledgersAll:
        VoucherLedger[] =
        [];

    // Subtitle under a row
    //   From Bank  : Liability For Finance · Cheque 123456 · 26-Oct-2026 · Charge 50.00
    //   From MFS   : Cash With MFS · Txn BK9X2Q · Charge 18.50
    //   To         : Cash In Hand · Head Office
    lineDetails
    (
        line:
            TransferLine
    ):
        string
    {
        const parts:
            string[] =
            [line.SubGroupName];

        if
        (
            line.Side === 'To'
            ||
            (line.AccountBranch && line.AccountBranch.trim().toUpperCase() !== this.branchName.toUpperCase())
        )
        {
            parts.push(line.AccountBranch);
        }

        if
        (
            line.Method === 'Cheque'
        )
        {
            parts.push(`Cheque ${line.CheckNo}`, this.displayDate(line.CheckDate));
        }
        else if
        (
            line.Reference
        )
        {
            parts.push(line.Method === 'MFS' ? `Txn ${line.Reference}` : `Ref ${line.Reference}`);
        }

        if
        (
            line.ChargeAmount > 0
        )
        {
            parts.push(`Charge ${this.money(line.ChargeAmount)}`);
        }

        return parts
            .filter(part => !!part)
            .join(' · ');
    }

    // yyyy-MM-dd → 26-Oct-2026
    private displayDate
    (
        value:
            string
    ):
        string
    {
        const date =
            fromIsoDate(value);

        return date
            ? date.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }).replace(/ /g, '-')
            : '';
    }

    // SL of an entered row (To rows first, then From rows)
    serial
    (
        line:
            TransferLine
    ):
        number
    {
        const order =
            [...this.toLines, ...this.fromLines];

        return order.indexOf(line) + 1;
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
            TransferEntryData =
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
            this.totalTo;

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