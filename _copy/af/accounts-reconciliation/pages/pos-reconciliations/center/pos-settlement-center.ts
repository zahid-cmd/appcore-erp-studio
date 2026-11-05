//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    inject,
    ChangeDetectorRef,
    DestroyRef
}
from '@angular/core';

import
{
    takeUntilDestroyed
}
from '@angular/core/rxjs-interop';

import
{
    HttpErrorResponse
}
from '@angular/common/http';

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
    Observable,
    catchError,
    defer,
    delayWhen,
    switchMap,
    throwError,
    timer
}
from 'rxjs';

//===============================================================
// Models
//===============================================================

import
{
    PosActionResult,
    PosCenterDefaults,
    PosReconciliations,
    PosBank
}
from '../../../models/pos-reconciliations.model';

import
{
    formatMoney,
    fromIsoDate,
    parseMoney,
    roundMoney,
    toIsoDate
}
from '../../../../../../shared/components/accounting/accounting.models';

import
{
    VOUCHER_SWITCH,
    VoucherSwitchesService,
    switchOn
}
from '../../../../../../shared/components/accounting/voucher-switches';

//===============================================================
// Shared Components
//===============================================================

import
{
    PageHeaderComponent
}
from '../../../../../../shared/components/layout/page-header/page-header';

import
{
    PageToolbarComponent
}
from '../../../../../../shared/components/layout/page-toolbar/page-toolbar';

import
{
    ControlTabsComponent,
    ControlTab
}
from '../../../../../../shared/components/controls/control-tabs/control-tabs';

import
{
    CommandCenterComponent
}
from '../../../../../../shared/components/utilities/command-center/command-center';

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

import
{
    ConfirmDialogService
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog.service';

import
{
    ConfirmDialogComponent
}
from '../../../../../../shared/components/utilities/confirm-dialog/confirm-dialog';

import
{
    ProgressDialogComponent
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

import
{
    ToastService
}
from '../../../../../../shared/components/utilities/toast/toast.service';

import
{
    ToastComponent
}
from '../../../../../../shared/components/utilities/toast/toast';

//===============================================================
// Login session (active branch)
//===============================================================

import
{
    AuthenticationStorageService
}
from '../../../../../../core/authentication/authentication-storage.service';

//===============================================================
// Service
//===============================================================

import
{
    PosReconciliationsService
}
from '../../../services/pos-reconciliations.service';


//===============================================================
// Types
//===============================================================

export type PosCenterMode =
    'settle' | 'reject';

// A transaction with display values
type CenterTxn =
    PosReconciliations
    &
    {
        ReceiptDateText:
            string;

        AmountText:
            string;

        DueDateText:
            string;
    };

// A transaction on the right, with what the user types
interface SelectedLine
{
    txn:
        CenterTxn;

    // Settle : bank charges (the RV's card charge unless Edit
    // Charges is ON)
    fee:
        string;

    // Required when the charges differ from the system charge
    // (Edit Charges ON) : charge audit
    feeReason:
        string;

    notes:
        string;
}

const MONEY_TEXT =
    /^\d[\d,]*(\.\d{0,2})?$/;


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'pos-settlement-center',
    standalone:true,
    imports:
    [
        CommonModule,
        PageHeaderComponent,
        PageToolbarComponent,
        ControlTabsComponent,
        CommandCenterComponent,
        DatepickerComponent,
        TextboxComponent,
        SearchDropdownComponent,
        EmptyStateComponent,
        ConfirmDialogComponent,
        ProgressDialogComponent,
        ToastComponent
    ],
    templateUrl:'./pos-settlement-center.html',
    styleUrl:'./pos-settlement-center.css'
})

//===============================================================
// POS Settlement Center
//
// Full page for working card (POS) receipts of ONE linked bank
// account in a batch : every POS account linked to it.
//   Settle : Pending → Settled (RRV printed as Receipt Voucher :
//            Dr bank net + Dr POS Charges / Cr POS account gross)
//   Reject : Pending → Rejected (RRV printed as Journal Voucher :
//            Dr customer / Cr POS account)
//
// Left  : Voucher Information (number, date, Settles Into bank;
//         the linked POS accounts under it), narration / reason,
//         Available transactions
// Right : Selected transactions with charges and short notes;
//         totals
//
// Charges default to the card charge saved on the Receipt
// Voucher. Switches (by code) : 0055 Edit Charges, 0056 Print
// Prompt. Opened from the list : center?mode=settle&bank=<code>
// (&pick=<paymentId> preselects a transaction).
//===============================================================

export class PosSettlementCenter
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly service =
        inject(PosReconciliationsService);

    private readonly switchesService =
        inject(VoucherSwitchesService);

    private readonly authenticationStorage =
        inject(AuthenticationStorageService);

    private readonly confirmDialog =
        inject(ConfirmDialogService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    private readonly toast =
        inject(ToastService);

    private readonly router =
        inject(Router);

    private readonly route =
        inject(ActivatedRoute);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly destroyRef =
        inject(DestroyRef);


    //===========================================================
    // Mode
    //===========================================================

    // Page toolbar tab (one; same look as the Check Center)
    readonly tabs:
        ControlTab[] =
    [
        {
            id:'pos',
            label:'POS Settlement'
        }
    ];

    readonly selectedTab:
        string =
        'pos';

    mode:
        PosCenterMode =
        'settle';

    readonly modes:
        { id:PosCenterMode; label:string; icon:string }[] =
    [
        { id:'settle', label:'Settlement', icon:'fas fa-money-bill-transfer' },
        { id:'reject', label:'Rejection', icon:'fas fa-ban' }
    ];

    get settle():
        boolean
    {
        return this.mode === 'settle';
    }


    //===========================================================
    // Data
    //===========================================================

    txns:
        CenterTxn[] =
    [];

    banks:
        PosBank[] =
    [];

    selected:
        SelectedLine[] =
    [];

    loading:
        boolean =
        false;

    loadFailed:
        boolean =
        false;

    busy:
        boolean =
        false;

    private pickId:
        number =
        0;

    private loginBranchId:
        number =
        0;


    //===========================================================
    // Filters (left)
    //===========================================================

    searchText:
        string =
        '';

    branchFilter:
        number | null =
        null;

    // Received up to (receipt date)
    uptoDate:
        Date | null =
        null;

    branchItems:
        { label:string; value:number | null }[] =
    [];


    //===========================================================
    // Voucher Information
    //===========================================================

    date:
        Date | null =
        new Date();

    readonly maxDate:
        Date =
        new Date();

    // The bank account worked on (required) : every POS account
    // linked to it
    bankCode:
        string | null =
        null;

    narration:
        string =
        '';

    reason:
        string =
        '';

    // Available maximized : covers Voucher Information and
    // Narration (the left column)
    availableMax:
        boolean =
        false;

    // Next RRV preview; Save takes the real one
    voucherNo:
        string =
        '';

    voucherNoNote:
        string =
        '';

    voucherNoLoading:
        boolean =
        false;

    // Header ribbon : branch + financial year of the preview
    headerBranch:
        string =
        '';

    headerYear:
        string =
        '';

    headerYearError:
        string =
        '';

    private defaultsKey:
        string =
        '';


    //===========================================================
    // Switches
    //===========================================================

    // 0052 : the fee may be changed per transaction
    editFee:
        boolean =
        false;

    // 0053 : ask to print after Save
    printPrompt:
        boolean =
        true;


    //===========================================================
    // Initialize
    //===========================================================

    ngOnInit():
        void
    {
        // Leaving the page stops the progress timers
        this.destroyRef.onDestroy(
            () =>
                this.clearProgressTimers());

        const user =
            this.authenticationStorage.getUser();

        this.loginBranchId =
            Number(user?.branchId) || 0;

        const query =
            this.route.snapshot.queryParamMap;

        this.mode =
            query.get('mode') === 'reject'
                ? 'reject'
                : 'settle';

        this.bankCode =
            query.get('bank') || null;

        this.pickId =
            Number(query.get('pick')) || 0;

        void this.loadSwitches();

        this.loadBanks();

        this.loadTxns();

        this.loadDefaults();
    }

    private async loadSwitches():
        Promise<void>
    {
        const switches =
            await this.switchesService.load();

        this.editFee =
            switchOn(switches, VOUCHER_SWITCH.POS_EDIT_CHARGES, false);

        this.printPrompt =
            switchOn(switches, VOUCHER_SWITCH.POS_PRINT_PROMPT, true);

        // OFF now : every charge back to the one on the RV
        if
        (
            !this.editFee
        )
        {
            for
            (
                const line of this.selected
            )
            {
                line.fee =
                    this.money(this.autoFee(line.txn));
            }
        }

        this.cdr.detectChanges();
    }


    //===========================================================
    // Load
    //===========================================================

    private loadBanks():
        void
    {
        this.service
            .getBanks()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    response:
                        PosBank[]
                ):
                    void =>
                {
                    this.banks =
                        (response ?? []).map(bank => ({ ...bank, Accounts:bank.Accounts ?? [] }));

                    this.buildBankItems();

                    // A bank from the URL that is not offered here
                    if
                    (
                        this.bankCode
                        &&
                        !this.bankItems.some(item => item.value === this.bankCode)
                    )
                    {
                        this.bankCode =
                            null;
                    }

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error('POS Banks Error:', error);

                    this.toast.error('Bank Accounts', 'Unable to load the settlement bank accounts.');
                }
            });
    }

    loadTxns():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        this.service
            .getAll()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    response:
                        PosReconciliations[]
                ):
                    void =>
                {
                    this.txns =
                        (response ?? []).map
                        (
                            item =>
                            ({
                                ...item,
                                ReceiptDateText:this.displayDate(item.ReceiptDate),
                                AmountText:formatMoney(item.GrossAmount),
                                DueDateText:this.displayDate(item.DueDate)
                            })
                        );

                    // Keep the selected lines that still fit
                    const byId =
                        new Map(this.txns.map(txn => [txn.PaymentId, txn]));

                    this.selected =
                        this.selected
                            .map(line => ({ ...line, txn:byId.get(line.txn.PaymentId) as CenterTxn }))
                            .filter(line => !!line.txn && this.fits(line.txn));

                    this.buildFilters();

                    // Preselect (from the list)
                    if
                    (
                        this.pickId
                    )
                    {
                        const pick =
                            byId.get(this.pickId);

                        this.pickId =
                            0;

                        if
                        (
                            pick
                            &&
                            this.fits(pick)
                        )
                        {
                            this.add(pick);
                        }
                    }

                    this.loading =
                        false;

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error('Load Card Receipts Error:', error);

                    this.txns =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error('Load Failed', 'Unable to load the card receipts.');

                    this.cdr.detectChanges();
                }
            });
    }

    private buildFilters():
        void
    {
        const branches =
            new Map<number, string>();

        for
        (
            const txn of this.txns
        )
        {
            if
            (
                this.fits(txn)
            )
            {
                branches.set(txn.BranchId, txn.BranchName);
            }
        }

        this.branchItems =
        [
            { label:'All Branches', value:null },
            ...[...branches.entries()]
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([value, label]) => ({ label, value }))
        ];

        if
        (
            this.branchFilter === null
            &&
            branches.has(this.loginBranchId)
        )
        {
            this.branchFilter =
                this.loginBranchId;
        }

        if
        (
            this.branchFilter !== null
            &&
            !branches.has(this.branchFilter)
        )
        {
            this.branchFilter =
                null;
        }

        this.loadDefaults();
    }


    //===========================================================
    // Banks (one batch = one linked bank account)
    //===========================================================

    // Kept as a field (not a getter) : a new array on every change
    // detection made the dropdown lose the first click
    bankItems:
        { label:string; value:string }[] =
    [];

    private buildBankItems():
        void
    {
        this.bankItems =
            this.banks
                .map(
                    bank =>
                    ({
                        label:bank.BankLedgerName,
                        value:bank.BankLedgerCode
                    }));
    }

    get bank():
        PosBank | null
    {
        return this.banks.find(bank => bank.BankLedgerCode === this.bankCode) ?? null;
    }

    // The POS accounts linked to the selected bank (read only line)
    get accountsText():
        string
    {
        const bank =
            this.bank;

        if
        (
            !bank
        )
        {
            return '';
        }

        return bank.Accounts.length
            ? bank.Accounts.map(account => account.AccountName).join(', ')
            : 'No POS account';
    }

    get bankNote():
        string
    {
        return this.bank?.BankMessage
            || (this.bankCode ? '' : 'Select the bank account');
    }

    onBank
    (
        value:
            string | null
    ):
        void
    {
        const code =
            value || null;

        if
        (
            code === this.bankCode
        )
        {
            return;
        }

        const go =
            (): void =>
            {
                this.bankCode =
                    code;

                this.selected =
                    [];

                this.buildFilters();

                this.cdr.detectChanges();
            };

        if
        (
            this.selected.length === 0
        )
        {
            go();

            return;
        }

        this.confirmDialog.open(
            'Change Bank Account',
            `${this.selected.length} selected transaction(s) will be removed. Continue?`,
            go,
            'Continue',
            'Keep',
            'primary',
            () =>
                this.cdr.detectChanges()
        );
    }


    //===========================================================
    // Which transactions belong to the mode / bank account
    //===========================================================

    private fits
    (
        txn:
            CenterTxn
    ):
        boolean
    {
        return txn.Status === 'Pending'
            && (!this.bankCode || txn.BankLedgerCode === this.bankCode);
    }

    isSelected
    (
        txn:
            CenterTxn
    ):
        boolean
    {
        return this.selected.some(line => line.txn.PaymentId === txn.PaymentId);
    }

    // Left : the mode's transactions, not yet selected, filtered
    get available():
        CenterTxn[]
    {
        const keyword =
            this.searchText.trim().toLowerCase();

        const upto =
            this.uptoDate
                ? toIsoDate(this.uptoDate)
                : '';

        return this.txns
            .filter(
                txn =>
                    this.fits(txn)
                    &&
                    !this.isSelected(txn)
                    &&
                    (this.branchFilter === null || txn.BranchId === this.branchFilter)
                    &&
                    (!upto || txn.ReceiptDate <= upto)
                    &&
                    (
                        !keyword
                        ||
                        [
                            txn.TransactionRef,
                            txn.PartyName,
                            txn.SourceVoucherNo,
                            txn.AmountText,
                            txn.AccountName,
                            txn.CardName
                        ]
                        .join(' ')
                        .toLowerCase()
                        .includes(keyword)
                    ))
            .sort(
                (a, b) =>
                    (a.ReceiptDate || '').localeCompare(b.ReceiptDate || '')
                    ||
                    a.SourceVoucherNo.localeCompare(b.SourceVoucherNo)
                    ||
                    a.PaymentId - b.PaymentId);
    }

    // Why a transaction cannot be added now ('' = it can)
    addBlock
    (
        txn:
            CenterTxn
    ):
        string
    {
        // Settlement needs the bank it goes into (a reject does not)
        if
        (
            this.settle
            &&
            !txn.BankLedgerCode
        )
        {
            return 'Its POS account has no linked bank account.';
        }

        if
        (
            this.bankCode
            &&
            txn.BankLedgerCode !== this.bankCode
        )
        {
            return 'Settles into another bank account : one bank account per batch.';
        }

        return '';
    }


    //===========================================================
    // Add / remove
    //===========================================================

    add
    (
        txn:
            CenterTxn
    ):
        void
    {
        if
        (
            this.busy
            ||
            this.isSelected(txn)
        )
        {
            return;
        }

        const block =
            this.addBlock(txn);

        if
        (
            block
        )
        {
            this.toast.info('Not Added', block);

            return;
        }

        // The first transaction picks the bank account
        if
        (
            !this.bankCode
            &&
            txn.BankLedgerCode
        )
        {
            this.bankCode =
                txn.BankLedgerCode;
        }

        this.selected =
        [
            ...this.selected,
            {
                txn,
                fee:this.money(this.autoFee(txn)),
                feeReason:'',
                notes:''
            }
        ];

        this.loadDefaults();
    }

    toggleAvailableMax():
        void
    {
        this.availableMax =
            !this.availableMax;
    }

    addAllShown():
        void
    {
        for
        (
            const txn of this.available
        )
        {
            if
            (
                !this.addBlock(txn)
            )
            {
                this.add(txn);
            }
        }
    }

    get canAddAll():
        boolean
    {
        return this.available.some(txn => !this.addBlock(txn));
    }

    remove
    (
        line:
            SelectedLine
    ):
        void
    {
        this.selected =
            this.selected.filter(item => item !== line);

        this.loadDefaults();
    }

    removeAll():
        void
    {
        this.selected =
            [];

        this.loadDefaults();
    }


    //===========================================================
    // Mode / filters
    //===========================================================

    setMode
    (
        mode:
            PosCenterMode
    ):
        void
    {
        if
        (
            mode === this.mode
            ||
            this.busy
        )
        {
            return;
        }

        const go =
            (): void =>
            {
                this.mode =
                    mode;

                this.resetBatch();

                this.buildFilters();

                this.cdr.detectChanges();
            };

        if
        (
            this.selected.length === 0
        )
        {
            go();

            return;
        }

        this.confirmDialog.open(
            'Change Mode',
            `${this.selected.length} selected transaction(s) will be removed. Continue?`,
            go,
            'Continue',
            'Keep',
            'primary'
        );
    }

    private resetBatch():
        void
    {
        this.selected =
            [];

        this.narration =
            '';

        this.reason =
            '';

        this.loadDefaults();
    }

    onSearch
    (
        value:
            string | number
    ):
        void
    {
        this.searchText =
            String(value ?? '');
    }

    onBranchFilter
    (
        value:
            number | null
    ):
        void
    {
        this.branchFilter =
            value === null || value === undefined ? null : Number(value);

        this.loadDefaults();
    }

    onUptoDate
    (
        value:
            Date | null
    ):
        void
    {
        this.uptoDate =
            value;
    }

    clearUptoDate():
        void
    {
        this.uptoDate =
            null;
    }


    //===========================================================
    // Voucher Information
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

        this.loadDefaults();
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

    onLine
    (
        line:
            SelectedLine,
        field:
            'fee' | 'feeReason' | 'notes',
        value:
            string | number
    ):
        void
    {
        line[field] =
            String(value ?? '');
    }


    //===========================================================
    // Voucher No preview (next RRV). Branch : the selected
    // receipts' branch, else the branch filter, else the login
    // branch. Nothing is reserved; Save takes the real number.
    //===========================================================

    private branchLabel
    (
        branchId:
            number
    ):
        string
    {
        return this.txns.find(txn => txn.BranchId === branchId)?.BranchName
            || this.branchItems.find(item => item.value === branchId)?.label
            || '';
    }

    private get previewBranchId():
        number
    {
        return this.selected[0]?.txn.BranchId
            || this.branchFilter
            || this.loginBranchId;
    }

    loadDefaults
    (
        force:
            boolean =
            false
    ):
        void
    {
        const branchId =
            this.previewBranchId;

        const day =
            this.date
                ? toIsoDate(this.date)
                : '';

        if
        (
            !branchId
            ||
            !day
        )
        {
            this.defaultsKey =
                '';

            this.voucherNo =
                '';

            this.voucherNoNote =
                !branchId ? 'No branch selected' : 'Select a date';

            return;
        }

        const key =
            `${branchId}|${day}`;

        if
        (
            !force
            &&
            key === this.defaultsKey
        )
        {
            return;
        }

        this.defaultsKey =
            key;

        this.voucherNoLoading =
            true;

        this.service
            .getDefaults(branchId, day)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    result:
                        PosCenterDefaults
                ):
                    void =>
                {
                    // A newer request went out : ignore this one
                    if
                    (
                        key !== this.defaultsKey
                    )
                    {
                        return;
                    }

                    this.voucherNoLoading =
                        false;

                    this.voucherNo =
                        result?.VoucherNo || '';

                    this.voucherNoNote =
                        this.voucherNo
                            ? (result?.BranchName || '')
                            : (result?.Message || 'No number available');

                    this.headerBranch =
                        result?.BranchName || this.branchLabel(branchId);

                    this.headerYear =
                        result?.FinancialYearName || '';

                    this.headerYearError =
                        result?.FinancialYearName ? '' : (result?.Message || 'No open financial year');

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    if
                    (
                        key !== this.defaultsKey
                    )
                    {
                        return;
                    }

                    console.error('POS Settlement Center Defaults Error:', error);

                    this.voucherNoLoading =
                        false;

                    this.voucherNo =
                        '';

                    this.voucherNoNote =
                        'Unable to load the number';

                    // Allow a retry on the next change
                    this.defaultsKey =
                        '';

                    this.cdr.detectChanges();
                }
            });
    }

    // One RRV per branch : the first number is shown
    get voucherNoExtra():
        number
    {
        return Math.max(0, this.branchCount - 1);
    }

    private get branchCount():
        number
    {
        return new Set(this.selected.map(line => line.txn.BranchId)).size;
    }


    //===========================================================
    // Fee / totals
    //===========================================================

    // The card charge saved on the Receipt Voucher at the sale
    autoFee
    (
        txn:
            CenterTxn
    ):
        number
    {
        return roundMoney(Number(txn.Fee) || 0);
    }

    lineFee
    (
        line:
            SelectedLine
    ):
        number
    {
        return this.editFee
            ? roundMoney(parseMoney(line.fee))
            : this.autoFee(line.txn);
    }

    // Charge audit : the user changed the system charge (a reason
    // is then required)
    isFeeEdited
    (
        line:
            SelectedLine
    ):
        boolean
    {
        return this.settle
            && this.editFee
            && !this.moneyIssue(line.fee)
            && this.lineFee(line) !== roundMoney(this.autoFee(line.txn));
    }

    // The charges as a % of the amount (as the Receipt Voucher
    // saves the card rate)
    lineFeePercent
    (
        line:
            SelectedLine
    ):
        string
    {
        const amount =
            Number(line.txn.Amount) || 0;

        return amount > 0
            ? `${(this.lineFee(line) * 100 / amount).toFixed(2)}%`
            : '—';
    }

    lineNet
    (
        line:
            SelectedLine
    ):
        number
    {
        return roundMoney((Number(line.txn.GrossAmount) || 0) - this.lineFee(line));
    }

    get totalAmount():
        number
    {
        return roundMoney(
            this.selected.reduce((sum, line) => sum + (Number(line.txn.GrossAmount) || 0), 0));
    }

    get totalFees():
        number
    {
        return roundMoney(
            this.selected.reduce((sum, line) => sum + this.lineFee(line), 0));
    }

    get totalNet():
        number
    {
        return roundMoney(this.totalAmount - this.totalFees);
    }

    // What Save creates
    get createsText():
        string
    {
        if
        (
            this.selected.length === 0
        )
        {
            return '—';
        }

        return `${this.branchCount} RRV (${this.settle ? 'Receipt' : 'Journal'})`;
    }


    //===========================================================
    // Rules
    //===========================================================

    get minDate():
        Date | null
    {
        let latest =
            '';

        for
        (
            const line of this.selected
        )
        {
            if
            (
                line.txn.ReceiptDate
                &&
                line.txn.ReceiptDate > latest
            )
            {
                latest =
                    line.txn.ReceiptDate;
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

    get dateLabel():
        string
    {
        return this.settle
            ? 'Settlement Date'
            : 'Reject Date';
    }

    // '' when Save can run
    get issue():
        string
    {
        if
        (
            this.settle
            &&
            !this.bankCode
        )
        {
            return 'Select the bank account to settle into.';
        }

        if
        (
            this.settle
            &&
            this.bank?.BankMessage
        )
        {
            return `${this.bank.BankLedgerName} : ${this.bank.BankMessage}`;
        }

        if
        (
            this.selected.length === 0
        )
        {
            return 'Add transactions from the left.';
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
            return `${this.dateLabel} cannot be before ${this.displayDate(toIsoDate(min))} (a receipt date).`;
        }

        if
        (
            this.settle
            &&
            !this.narration.trim()
        )
        {
            return 'The detail narration is required.';
        }

        if
        (
            !this.settle
            &&
            !this.reason.trim()
        )
        {
            return 'The reject reason is required.';
        }

        if
        (
            this.settle
            &&
            this.editFee
        )
        {
            for
            (
                const line of this.selected
            )
            {
                if
                (
                    this.moneyIssue(line.fee)
                )
                {
                    return `${this.txnLabel(line.txn)} : the charges must be a number with at most 2 decimals.`;
                }

                if
                (
                    this.lineFee(line) > (Number(line.txn.GrossAmount) || 0)
                )
                {
                    return `${this.txnLabel(line.txn)} : the charges cannot be more than the amount.`;
                }

                if
                (
                    this.isFeeEdited(line)
                    &&
                    !line.feeReason.trim()
                )
                {
                    return `${this.txnLabel(line.txn)} : charges changed from ${this.money(this.autoFee(line.txn))} to ${this.money(this.lineFee(line))} : the reason is required.`;
                }
            }
        }

        return '';
    }

    txnLabel
    (
        txn:
            CenterTxn
    ):
        string
    {
        return txn.TransactionRef
            ? `Card ${txn.TransactionRef}`
            : `Card receipt of ${txn.SourceVoucherNo}`;
    }


    //===========================================================
    // Floating ribbon (Available maximized) : the hidden Voucher
    // Information in one line
    //===========================================================

    get ribbonDate():
        string
    {
        return this.date
            ? this.date
                .toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
                .replace(/ /g, '-')
            : '—';
    }

    get ribbonBank():
        string
    {
        return this.bank?.BankLedgerName || 'Bank account not selected';
    }

    get ribbonNarration():
        string
    {
        return (this.settle ? this.narration : this.reason).trim();
    }


    //===========================================================
    // Commands : Save · Clear · back
    //===========================================================

    get saveText():
        string
    {
        return this.settle
            ? 'Settle'
            : 'Reject';
    }

    get saveTitle():
        string
    {
        return this.settle
            ? 'Settle the selected card transactions into the bank account'
            : 'Reject the selected transactions';
    }

    get saveIcon():
        string
    {
        return this.settle
            ? 'fas fa-money-bill-transfer'
            : 'fas fa-ban';
    }

    onClear():
        void
    {
        if
        (
            this.selected.length === 0
        )
        {
            this.resetBatch();

            return;
        }

        this.confirmDialog.open(
            'Clear Selection',
            `Remove the ${this.selected.length} selected transaction(s) and the entered values?`,
            () =>
            {
                this.resetBatch();

                this.cdr.detectChanges();
            },
            'Clear',
            'Keep',
            'primary'
        );
    }

    // Close the Center : the list
    private goToList():
        void
    {
        void this.router.navigate(
            ['list'],
            {
                relativeTo:this.route.parent
            });
    }

    onBack():
        void
    {
        const go =
            (): void =>
                this.goToList();

        if
        (
            this.selected.length === 0
        )
        {
            go();

            return;
        }

        this.confirmDialog.open(
            'Leave Settlement Center',
            `${this.selected.length} selected transaction(s) are not saved. Leave anyway?`,
            go,
            'Leave',
            'Stay',
            'danger'
        );
    }

    onSave():
        void
    {
        const issue =
            this.issue;

        if
        (
            issue
        )
        {
            this.toast.error('Check the Batch', issue);

            return;
        }

        const date =
            toIsoDate(this.date as Date);

        const count =
            this.selected.length;

        const total =
            formatMoney(this.totalAmount);

        const bankName =
            this.bank?.BankLedgerName ?? this.bankCode ?? '';

        let message:
            string;

        let request$:
            Observable<PosActionResult>;

        if
        (
            this.settle
        )
        {
            message =
                `Settle ${count} card transaction(s), Tk ${total}, on ${this.displayDate(date)}? `
                + `Tk ${formatMoney(this.totalNet)} goes into ${bankName}`
                + (this.totalFees > 0 ? ` and card charges Tk ${formatMoney(this.totalFees)} are charged` : '')
                + ` (${this.createsText}).`;

            request$ =
                this.service.settle(
                {
                    BankLedgerCode:this.bankCode ?? '',
                    SettlementDate:date,
                    Narration:this.narration.trim(),
                    Items:this.selected.map(
                        line =>
                        ({
                            PaymentId:line.txn.PaymentId,
                            Fee:this.editFee ? this.lineFee(line) : null,
                            FeeReason:this.isFeeEdited(line) ? line.feeReason.trim() : '',
                            ShortNotes:line.notes.trim()
                        }))
                });
        }
        else
        {
            message =
                `Reject ${count} card transaction(s), Tk ${total}, on ${this.displayDate(date)}? `
                + `The amount goes back to the customer's account and out of the POS account (${this.createsText}).`;

            request$ =
                this.service.reject(
                {
                    BankLedgerCode:this.bankCode ?? '',
                    RejectDate:date,
                    Reason:this.reason.trim(),
                    Items:this.selected.map(
                        line =>
                        ({
                            PaymentId:line.txn.PaymentId,
                            ShortNotes:line.notes.trim()
                        }))
                });
        }

        this.confirmDialog.open(
            this.saveText,
            message,
            () => this.run(request$),
            this.saveText,
            'Cancel',
            this.settle ? 'primary' : 'danger'
        );
    }

    private run
    (
        request$:
            Observable<PosActionResult>
    ):
        void
    {
        if
        (
            this.busy
        )
        {
            return;
        }

        this.busy =
            true;

        const title =
            this.saveText;

        this.startProgress(
            title,
            'Please wait…'
        );

        this.withMinimumDuration(request$)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    result:
                        PosActionResult
                ):
                    void =>
                {
                    // Saved : nothing left to leave behind
                    this.selected =
                        [];

                    this.narration =
                        '';

                    this.reason =
                        '';

                    this.completeProgress(
                        'Completed.',
                        () =>
                        {
                            this.busy =
                                false;

                            this.toast.success(title, result?.Message || 'Done.');

                            // (print prompt, switch 0053) then back to
                            // the list, which shows the new status
                            this.offerPrint(result, () => this.goToList());
                        });
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    this.failProgress();

                    this.busy =
                        false;

                    console.error('POS Settlement Center Error:', error);

                    this.toast.error(title, this.extractErrorMessage(error, 'The action failed.'));

                    this.loadTxns();
                }
            });
    }


    //===========================================================
    // Progress (same as the voucher pages) : the bar climbs to
    // 90 % while the server works, stays open at least 3 seconds,
    // shows 100 % briefly, then closes
    //===========================================================

    private readonly MIN_PROGRESS_MS:
        number =
        3000;

    private readonly PROGRESS_TICK_MS:
        number =
        100;

    private readonly PROGRESS_CEILING:
        number =
        90;

    private readonly PROGRESS_COMPLETE_HOLD_MS:
        number =
        600;

    private progressValue:
        number =
        0;

    private progressTimer:
        ReturnType<typeof setInterval> | null =
        null;

    private completeTimer:
        ReturnType<typeof setTimeout> | null =
        null;

    private startProgress
    (
        title:
            string,
        message:
            string
    ):
        void
    {
        this.progressValue =
            0;

        this.progressDialog.show(
            title,
            message,
            false
        );

        this.clearProgressTimers();

        this.progressTimer =
            setInterval(
                () =>
                {
                    const step =
                        Math.max(
                            0.4,
                            (this.PROGRESS_CEILING - this.progressValue) * 0.06
                        );

                    this.progressValue =
                        Math.min(
                            this.PROGRESS_CEILING,
                            this.progressValue + step
                        );

                    this.progressDialog.update(
                        Math.round(this.progressValue)
                    );
                },
                this.PROGRESS_TICK_MS
            );
    }

    // 100 %, a short hold, close, then done()
    private completeProgress
    (
        message:
            string,
        done:
            () => void
    ):
        void
    {
        this.clearProgressTimers();

        this.progressDialog.update(
            100,
            message
        );

        this.completeTimer =
            setTimeout(
                () =>
                {
                    this.completeTimer =
                        null;

                    this.progressDialog.close();

                    done();

                    this.cdr.detectChanges();
                },
                this.PROGRESS_COMPLETE_HOLD_MS
            );
    }

    private failProgress():
        void
    {
        this.clearProgressTimers();

        this.progressDialog.close();
    }

    private clearProgressTimers():
        void
    {
        if
        (
            this.progressTimer
        )
        {
            clearInterval(this.progressTimer);

            this.progressTimer =
                null;
        }

        if
        (
            this.completeTimer
        )
        {
            clearTimeout(this.completeTimer);

            this.completeTimer =
                null;
        }
    }

    // The request takes at least MIN_PROGRESS_MS (success or error)
    private withMinimumDuration<T>
    (
        source$:
            Observable<T>
    ):
        Observable<T>
    {
        return defer(
            () =>
            {
                const startedAt =
                    Date.now();

                const remaining =
                    (): number =>
                        Math.max(0, this.MIN_PROGRESS_MS - (Date.now() - startedAt));

                return source$.pipe(
                    delayWhen(
                        () =>
                            timer(remaining())
                    ),
                    catchError(
                        error =>
                            timer(remaining()).pipe(
                                switchMap(
                                    () =>
                                        throwError(() => error)
                                )
                            )
                    )
                );
            });
    }


    //===========================================================
    // Print (switch 0053 : ask after Save)
    //===========================================================

    private offerPrint
    (
        result:
            PosActionResult,
        done:
            () => void
    ):
        void
    {
        const ids =
            result?.VoucherIds ?? [];

        if
        (
            !this.printPrompt
            ||
            ids.length === 0
        )
        {
            done();

            return;
        }

        this.confirmDialog.open(
            'Print Voucher',
            ids.length === 1
                ? `Print ${result.VoucherNos[0]}?`
                : `Print the ${ids.length} vouchers (${result.VoucherNos.join(', ')})?`,
            () =>
            {
                ids.forEach(id => this.openPrint('pos-reconciliation-voucher', id));

                done();
            },
            'Print',
            'Later',
            'primary',
            done
        );
    }

    private openPrint
    (
        key:
            string,
        id:
            number
    ):
        void
    {
        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    ['/print-viewer', key, id],
                    {
                        queryParams:{ doc:'all' }
                    }
                )
            );

        // Not "noopener" : the new tab keeps this session's login
        const tab =
            window.open(url, '_blank');

        if
        (
            !tab
        )
        {
            this.toast.error('Print Failed', 'The browser blocked the new tab. Allow pop-ups for this site.');
        }
    }


    //===========================================================
    // Helpers
    //===========================================================

    private extractErrorMessage
    (
        error:
            unknown,
        fallback:
            string
    ):
        string
    {
        if
        (
            error instanceof HttpErrorResponse
        )
        {
            if
            (
                typeof error.error === 'string'
                &&
                error.error.trim()
            )
            {
                return error.error;
            }

            if
            (
                error.error?.message
            )
            {
                return error.error.message;
            }

            if
            (
                error.error?.title
            )
            {
                return error.error.title;
            }
        }

        return fallback;
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

    // yyyy-MM-dd → dd-MM-yyyy
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
}