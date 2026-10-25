//===============================================================
// Imports
//===============================================================

import
{
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    CheckClearRequest,
    CheckDirection,
    CheckDishonourRequest
}
from '../../../models/check-reconciliations.model';

import
{
    amountInWords,
    formatMoney,
    fromIsoDate,
    parseMoney,
    roundMoney,
    toIsoDate
}
from '../../../../../../shared/components/accounting/accounting.models';

import
{
    DatepickerComponent
}
from '../../../../../../shared/components/controls/datepicker/datepicker';

import
{
    TextboxComponent
}
from '../../../../../../shared/components/controls/textbox/textbox';

import
{
    SearchDropdownComponent
}
from '../../../../../../shared/components/controls/search-dropdown/search-dropdown';

import
{
    EmptyStateComponent
}
from '../../../../../../shared/components/layout/empty-state/empty-state';


//===============================================================
// Types
//===============================================================

export type CheckCartMode =
    'deposit' | 'clear' | 'dishonour';

// A check in the cart (the list row carries all of these)
export interface CheckCartRow
{
    Direction:
        CheckDirection;

    PaymentId:
        number;

    BranchId:
        number;

    BranchName:
        string;

    CheckNo:
        string;

    CheckDate:
        string;

    CheckDateText:
        string;

    CheckBank:
        string;

    PartyName:
        string;

    SourceVoucherNo:
        string;

    VoucherDate:
        string;

    Amount:
        number;

    AmountText:
        string;

    AccountLedgerCode:
        string;

    AccountLedgerName:
        string;

    DepositDate:
        string;

    DepositLedgerCode:
        string;

    DepositLedgerName:
        string;
}

// What the user types per check
interface CartExtra
{
    // Clearing : bank charge
    charge:
        string;

    // Dishonour
    reason:
        string;

    fee:
        string;

    recovery:
        string;
}

export interface CheckCartDeposit
{
    DepositDate:
        string;

    BankLedgerCode:
        string;
}

const MONEY_TEXT =
    /^\d[\d,]*(\.\d{0,2})?$/;


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'app-check-cart',
    standalone:true,
    imports:
    [
        CommonModule,
        DatepickerComponent,
        TextboxComponent,
        SearchDropdownComponent,
        EmptyStateComponent
    ],
    templateUrl:'./check-cart.html',
    styleUrl:'./check-cart.css'
})

//===============================================================
// Check Clearing Center (modal)
//
//   Left  : Check Tray, a slip per check (Ready / Details needed)
//   Right : stat ribbon (+ words), a cheque preview of the
//           selected check with its fields, then Posting (date,
//           bank / narration) for all checks
//   Footer: note + Close + the action
//
// The checks picked on Check Reconciliation for ONE action :
//   deposit   : date + bank account → one Deposit Slip
//   clear     : date + narration; per check an optional bank
//               charge → one RRV / RRP per bank account
//   dishonour : date; per check reason*, bank fee, recovery from
//               the payer → one RRV per bank account (charges)
// The page runs the action; the cart only collects and checks
// the input, then emits it.
//===============================================================

export class CheckCartComponent
implements OnChanges
{
    //===========================================================
    // Inputs
    //===========================================================

    @Input()
    opened =
        false;

    @Input()
    mode:
        CheckCartMode | null =
        null;

    @Input()
    direction:
        CheckDirection =
        'Received';

    @Input()
    rows:
        CheckCartRow[] =
        [];

    // Deposit : bank accounts of the branch
    @Input()
    depositAccounts:
        { label:string; value:string }[] =
        [];

    // Multi Check Deposit / Clearing (switch 0047)
    @Input()
    multi =
        true;

    @Input()
    busy =
        false;


    //===========================================================
    // Outputs
    //===========================================================

    @Output()
    readonly closed =
        new EventEmitter<void>();

    @Output()
    readonly removed =
        new EventEmitter<number>();

    @Output()
    readonly emptied =
        new EventEmitter<void>();

    @Output()
    readonly modeChange =
        new EventEmitter<CheckCartMode>();

    @Output()
    readonly deposit =
        new EventEmitter<CheckCartDeposit>();

    @Output()
    readonly clear =
        new EventEmitter<Omit<CheckClearRequest, 'Direction'>>();

    @Output()
    readonly dishonour =
        new EventEmitter<CheckDishonourRequest>();


    //===========================================================
    // State
    //===========================================================

    date:
        Date | null =
        new Date();

    bankCode:
        string | null =
        null;

    narration:
        string =
        '';

    // Dishonour : the bank's return reason (all checks in the cart)
    reason:
        string =
        '';

    extras:
        Record<number, CartExtra> =
        {};

    readonly maxDate:
        Date =
        new Date();

    // Check shown in Row Details
    selectedId:
        number | null =
        null;


    //===========================================================
    // Changes
    //===========================================================

    ngOnChanges
    (
        changes:
            SimpleChanges
    ):
        void
    {
        if
        (
            changes['rows']
        )
        {
            // Empty cart : start fresh next time
            if
            (
                this.rows.length === 0
            )
            {
                this.extras =
                    {};

                this.date =
                    new Date();

                this.narration =
                    '';

                this.reason =
                    '';

                this.bankCode =
                    null;
            }

            // Drop what was typed for checks no longer here
            const ids =
                new Set(this.rows.map(row => row.PaymentId));

            for
            (
                const key of Object.keys(this.extras)
            )
            {
                if
                (
                    !ids.has(Number(key))
                )
                {
                    delete this.extras[Number(key)];
                }
            }

            for
            (
                const row of this.rows
            )
            {
                this.extras[row.PaymentId] ??=
                {
                    charge:'',
                    reason:'',
                    fee:'',
                    recovery:''
                };
            }
        }

        if
        (
            changes['depositAccounts']
            ||
            changes['rows']
        )
        {
            this.defaultBank();
        }

        // Keep a valid selection : the first check needing
        // details, else the first check
        if
        (
            !this.rows.some(row => row.PaymentId === this.selectedId)
        )
        {
            this.selectedId =
                (this.rows.find(row => this.rowState(row) === 'todo') ?? this.rows[0])?.PaymentId
                ??
                null;
        }
    }

    //===========================================================
    // Selection / row state
    //===========================================================

    get selected():
        CheckCartRow | null
    {
        return this.rows.find(row => row.PaymentId === this.selectedId)
            ?? null;
    }

    select
    (
        row:
            CheckCartRow
    ):
        void
    {
        this.selectedId =
            row.PaymentId;
    }

    // todo : something required is missing or wrong; ready : fine
    rowState
    (
        row:
            CheckCartRow
    ):
        'todo' | 'ready'
    {
        const extra =
            this.extra(row);

        if
        (
            this.mode === 'clear'
        )
        {
            return this.moneyIssue(extra.charge)
                ? 'todo'
                : 'ready';
        }

        if
        (
            this.mode === 'dishonour'
        )
        {
            return this.moneyIssue(extra.fee)
                || this.moneyIssue(extra.recovery)
                ? 'todo'
                : 'ready';
        }

        return 'ready';
    }

    get readyCount():
        number
    {
        return this.rows.filter(row => this.rowState(row) === 'ready').length;
    }

    // Row Details : the next check that still needs details
    nextTodo():
        void
    {
        const next =
            this.rows.find(row => this.rowState(row) === 'todo' && row.PaymentId !== this.selectedId);

        if
        (
            next
        )
        {
            this.selectedId =
                next.PaymentId;
        }
    }

    get modeLabel():
        string
    {
        switch
        (
            this.mode
        )
        {
            case 'deposit':
                return 'Deposit';

            case 'dishonour':
                return 'Dishonour';

            default:
                return 'Clearing';
        }
    }

    get branchName():
        string
    {
        return this.rows[0]?.BranchName ?? '';
    }

    // Charges of the selected mode (bank charges / bank fees)
    get chargesTotal():
        number
    {
        return this.mode === 'dishonour'
            ? this.fees
            : this.mode === 'clear'
                ? this.charges
                : 0;
    }

    get inWords():
        string
    {
        return amountInWords(this.total);
    }

    wordsOf
    (
        value:
            number
    ):
        string
    {
        return amountInWords(value);
    }

    // Vouchers the action posts
    get voucherCount():
        number
    {
        if
        (
            this.mode === 'deposit'
        )
        {
            return 0;
        }

        if
        (
            this.mode === 'dishonour'
        )
        {
            const banks =
                new Set(
                    this.rows
                        .filter(
                            row =>
                                parseMoney(this.extra(row).fee) > 0
                                ||
                                parseMoney(this.extra(row).recovery) > 0)
                        .map(row => this.bankOf(row)));

            return banks.size;
        }

        return this.banks.length;
    }

    // Deposit : the account named on the Receipt Voucher, else
    // the only one
    private defaultBank():
        void
    {
        if
        (
            this.bankCode
            &&
            this.depositAccounts.some(account => account.value === this.bankCode)
        )
        {
            return;
        }

        const first =
            this.rows[0];

        const match =
            first
                ? this.depositAccounts.find(account => account.value === first.AccountLedgerCode)
                : undefined;

        this.bankCode =
            match?.value
            ??
            (this.depositAccounts.length === 1 ? this.depositAccounts[0].value : null);
    }


    //===========================================================
    // Display
    //===========================================================

    get received():
        boolean
    {
        return this.direction === 'Received';
    }

    get title():
        string
    {
        switch
        (
            this.mode
        )
        {
            case 'deposit':
                return 'Check Clearing Center';

            case 'dishonour':
                return 'Check Clearing Center';

            default:
                return 'Check Clearing Center';
        }
    }

    get icon():
        string
    {
        switch
        (
            this.mode
        )
        {
            case 'deposit':
                return 'fas fa-building-columns';

            case 'dishonour':
                return 'fas fa-ban';

            default:
                return 'fas fa-circle-check';
        }
    }

    get actionText():
        string
    {
        const count =
            this.rows.length;

        switch
        (
            this.mode
        )
        {
            case 'deposit':
                return `Deposit ${count} Check(s)`;

            case 'dishonour':
                return `Dishonour ${count} Check(s)`;

            default:
                return `Clear ${count} Check(s)`;
        }
    }

    get dateLabel():
        string
    {
        switch
        (
            this.mode
        )
        {
            case 'deposit':
                return 'Deposit Date';

            case 'dishonour':
                return 'Dishonour Date';

            default:
                return 'Clearing Date';
        }
    }

    // Deposited received checks can be cleared or dishonoured
    get canSwitch():
        boolean
    {
        return this.received
            && (this.mode === 'clear' || this.mode === 'dishonour');
    }

    get total():
        number
    {
        return roundMoney(
            this.rows.reduce((sum, row) => sum + (Number(row.Amount) || 0), 0));
    }

    get charges():
        number
    {
        return roundMoney(
            this.rows.reduce((sum, row) => sum + parseMoney(this.extra(row).charge), 0));
    }

    get fees():
        number
    {
        return roundMoney(
            this.rows.reduce((sum, row) => sum + parseMoney(this.extra(row).fee), 0));
    }

    get recoveries():
        number
    {
        return roundMoney(
            this.rows.reduce((sum, row) => sum + parseMoney(this.extra(row).recovery), 0));
    }

    // The bank account each check posts against
    bankOf
    (
        row:
            CheckCartRow
    ):
        string
    {
        return row.Direction === 'Received'
            ? row.DepositLedgerName
            : row.AccountLedgerName;
    }

    // Vouchers the action will create : one per bank account
    get banks():
        { name:string; count:number; amount:number }[]
    {
        const banks =
            new Map<string, { name:string; count:number; amount:number }>();

        for
        (
            const row of this.rows
        )
        {
            const name =
                this.bankOf(row) || '—';

            const bank =
                banks.get(name)
                ??
                {
                    name,
                    count:0,
                    amount:0
                };

            bank.count++;

            bank.amount =
                roundMoney(bank.amount + (Number(row.Amount) || 0));

            banks.set(name, bank);
        }

        return [...banks.values()];
    }

    get voucherPrefix():
        string
    {
        return this.received
            ? 'RRV'
            : 'RRP';
    }

    money
    (
        value:
            number
    ):
        string
    {
        return formatMoney(value);
    }

    extra
    (
        row:
            CheckCartRow
    ):
        CartExtra
    {
        return this.extras[row.PaymentId]
            ??
            (this.extras[row.PaymentId] = { charge:'', reason:'', fee:'', recovery:'' });
    }

    displayDate
    (
        value:
            string | null | undefined
    ):
        string
    {
        const parts =
            (value ?? '').substring(0, 10).split('-');

        return parts.length === 3
            ? `${parts[2]}-${parts[1]}-${parts[0]}`
            : value ?? '';
    }


    //===========================================================
    // Input handlers
    //===========================================================

    onDate
    (
        value:
            Date | null
    ):
        void
    {
        this.date =
            value;
    }

    onBank
    (
        value:
            string | null
    ):
        void
    {
        this.bankCode =
            value || null;
    }

    onNarration
    (
        value:
            string | number
    ):
        void
    {
        this.narration =
            String(value ?? '');
    }

    onReason
    (
        value:
            string | number
    ):
        void
    {
        this.reason =
            String(value ?? '');
    }

    onExtra
    (
        row:
            CheckCartRow,
        field:
            keyof CartExtra,
        value:
            string | number
    ):
        void
    {
        this.extra(row)[field] =
            String(value ?? '');
    }

    setMode
    (
        mode:
            CheckCartMode
    ):
        void
    {
        if
        (
            mode !== this.mode
            &&
            !this.busy
        )
        {
            this.modeChange.emit(mode);
        }
    }


    //===========================================================
    // Rules
    //===========================================================

    // Earliest allowed date : no check / voucher / deposit date
    // after it
    get minDate():
        Date | null
    {
        let latest =
            '';

        for
        (
            const row of this.rows
        )
        {
            const dates =
                [row.CheckDate, row.VoucherDate];

            if
            (
                this.mode !== 'deposit'
            )
            {
                dates.push(row.DepositDate);
            }

            for
            (
                const value of dates
            )
            {
                if
                (
                    value
                    &&
                    value > latest
                )
                {
                    latest =
                        value;
                }
            }
        }

        return fromIsoDate(latest);
    }

    moneyIssue
    (
        text:
            string
    ):
        boolean
    {
        const value =
            text.trim();

        return !!value
            && !MONEY_TEXT.test(value);
    }

    // '' when the action can run
    get issue():
        string
    {
        if
        (
            this.rows.length === 0
        )
        {
            return 'The cart is empty. Tick checks in the list to add them.';
        }

        if
        (
            !this.multi
            &&
            this.rows.length > 1
        )
        {
            return 'Multi Check Deposit / Clearing is OFF : one check at a time.';
        }

        if
        (
            !this.date
        )
        {
            return `${this.dateLabel} is required.`;
        }

        const date =
            toIsoDate(this.date);

        if
        (
            date > toIsoDate(new Date())
        )
        {
            return `${this.dateLabel} cannot be after today.`;
        }

        const min =
            this.minDate;

        if
        (
            min
            &&
            date < toIsoDate(min)
        )
        {
            return `${this.dateLabel} cannot be before ${this.displayDate(toIsoDate(min))} (a check, voucher or deposit date).`;
        }

        if
        (
            this.mode === 'deposit'
            &&
            !this.bankCode
        )
        {
            return 'Choose the bank account to deposit into.';
        }

        if
        (
            this.mode === 'dishonour'
            &&
            !this.reason.trim()
        )
        {
            return 'The reason is required.';
        }

        for
        (
            const row of this.rows
        )
        {
            const extra =
                this.extra(row);

            if
            (
                this.mode === 'clear'
                &&
                this.moneyIssue(extra.charge)
            )
            {
                return `Check ${row.CheckNo} : bank charge must be a number with at most 2 decimals.`;
            }

            if
            (
                this.mode === 'dishonour'
            )
            {
                if
                (
                    this.moneyIssue(extra.fee)
                    ||
                    this.moneyIssue(extra.recovery)
                )
                {
                    return `Check ${row.CheckNo} : fee and recovery must be numbers with at most 2 decimals.`;
                }
            }
        }

        return '';
    }


    //===========================================================
    // Run
    //===========================================================

    run():
        void
    {
        if
        (
            this.issue
            ||
            this.busy
            ||
            !this.date
        )
        {
            return;
        }

        const date =
            toIsoDate(this.date);

        switch
        (
            this.mode
        )
        {
            case 'deposit':
                this.deposit.emit(
                {
                    DepositDate:date,
                    BankLedgerCode:this.bankCode ?? ''
                });
                break;

            case 'dishonour':
                this.dishonour.emit(
                {
                    DishonourDate:date,
                    Items:this.rows.map(
                        row =>
                        ({
                            PaymentId:row.PaymentId,
                            Reason:this.reason.trim(),
                            Fee:roundMoney(parseMoney(this.extra(row).fee)),
                            Recovery:roundMoney(parseMoney(this.extra(row).recovery))
                        }))
                });
                break;

            default:
                this.clear.emit(
                {
                    ClearedDate:date,
                    Narration:this.narration.trim(),
                    Items:this.rows.map(
                        row =>
                        ({
                            PaymentId:row.PaymentId,
                            Charge:roundMoney(parseMoney(this.extra(row).charge))
                        }))
                });
                break;
        }
    }

    close():
        void
    {
        if
        (
            !this.busy
        )
        {
            this.closed.emit();
        }
    }
}