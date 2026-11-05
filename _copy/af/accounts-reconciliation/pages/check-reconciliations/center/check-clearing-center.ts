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
    CheckActionResult,
    CheckBankAccount,
    CheckCenterDefaults,
    CheckDirection,
    CheckReconciliations
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
    CheckReconciliationsService
}
from '../../../services/check-reconciliations.service';


//===============================================================
// Types
//===============================================================

export type CenterMode =
    'deposit' | 'clear' | 'dishonour';

// A check with display values
type CenterCheck =
    CheckReconciliations
    &
    {
        CheckDateText:
            string;

        AmountText:
            string;

        // Check date after today : waits
        PostDated:
            boolean;

        // Received : the bank it was deposited into; issued : the
        // account it is drawn on
        BankCode:
            string;

        BankName:
            string;
    };

// A check on the right, with what the user types
interface SelectedLine
{
    check:
        CenterCheck;

    // Clearing : bank charge
    charge:
        string;

    // Dishonour : bank charges (recovery follows them)
    fee:
        string;

    recovery:
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
    selector:'check-clearing-center',
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
    templateUrl:'./check-clearing-center.html',
    styleUrl:'./check-clearing-center.css'
})

//===============================================================
// Check Clearing Center
//
// Full page for working checks in batches.
//   Received : Deposit (Pending → Deposited, Bank Deposit Slip)
//              Clearing (Deposited → Cleared, RRV)
//              Dishonour (Deposited → Dishonoured, RRV charges)
//   Issued   : Clearing (Pending → Cleared, RRP)
//
// Left  : Available checks for the mode (cards; click or Add)
// Right : Selected checks with charge / fee / recovery and short
//         notes per check; totals
// Top   : Voucher Information (date, bank, narration / reason)
//
// Switches (by code) : 0047 Multi Check (OFF = one check),
// 0048 Print Prompt, 0049 One Voucher Per Batch (server groups).
// Opened from the list : center?direction=Received&mode=clear
// (&pick=<paymentId> preselects a check).
//===============================================================

export class CheckClearingCenter
implements OnInit
{
    //===========================================================
    // Dependency Injection
    //===========================================================

    private readonly service =
        inject(CheckReconciliationsService);

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
    // Tabs / mode
    //===========================================================

    readonly tabs:
        ControlTab[] =
    [
        {
            id:'Received',
            label:'Received Checks'
        },
        {
            id:'Issued',
            label:'Issued Checks'
        }
    ];

    selectedTab:
        string =
        'Received';

    mode:
        CenterMode =
        'deposit';

    get direction():
        CheckDirection
    {
        return this.selectedTab === 'Issued'
            ? 'Issued'
            : 'Received';
    }

    get received():
        boolean
    {
        return this.direction === 'Received';
    }

    // Modes offered on the tab
    get modes():
        { id:CenterMode; label:string; icon:string }[]
    {
        return this.received
            ? [
                { id:'deposit', label:'Deposit', icon:'fas fa-building-columns' },
                { id:'clear', label:'Clearing', icon:'fas fa-circle-check' },
                { id:'dishonour', label:'Dishonour', icon:'fas fa-ban' }
            ]
            : [
                { id:'clear', label:'Clearing', icon:'fas fa-circle-check' }
            ];
    }


    //===========================================================
    // Data
    //===========================================================

    checks:
        CenterCheck[] =
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

    bankFilter:
        string | null =
        null;

    branchItems:
        { label:string; value:number | null }[] =
    [];

    bankItems:
        { label:string; value:string | null }[] =
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

    // Deposit : bank account to deposit into
    depositBankCode:
        string | null =
        null;

    depositAccountItems:
        { label:string; value:string }[] =
    [];

    private depositAccountsBranchId:
        number =
        0;

    narration:
        string =
        '';

    // Available Checks maximized : covers Voucher Information and
    // Narration (the left column)
    availableMax:
        boolean =
        false;

    // Next number preview (RRV / RRP / DS); Save takes the real one
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

    reason:
        string =
        '';


    //===========================================================
    // Switches
    //===========================================================

    multiCheck:
        boolean =
        true;

    printPrompt:
        boolean =
        true;

    perBatch:
        boolean =
        true;

    // Switch 0050 Dishonour Recovery : Recovery column (OFF = bank
    // fee only)
    recoveryOn:
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

        if
        (
            query.get('direction') === 'Issued'
        )
        {
            this.selectedTab =
                'Issued';
        }

        const mode =
            query.get('mode');

        this.mode =
            this.received
                ? (mode === 'clear' || mode === 'dishonour' ? mode : 'deposit')
                : 'clear';

        this.pickId =
            Number(query.get('pick')) || 0;

        void this.loadSwitches();

        this.loadChecks();

        this.loadDefaults();
    }

    private async loadSwitches():
        Promise<void>
    {
        const switches =
            await this.switchesService.load();

        this.multiCheck =
            switchOn(switches, VOUCHER_SWITCH.CHECK_MULTI, true);

        this.printPrompt =
            switchOn(switches, VOUCHER_SWITCH.CHECK_PRINT_PROMPT, true);

        this.perBatch =
            switchOn(switches, VOUCHER_SWITCH.CHECK_ONE_VOUCHER_PER_BATCH, true);

        this.recoveryOn =
            switchOn(switches, VOUCHER_SWITCH.CHECK_DISHONOUR_RECOVERY, true);

        this.cdr.detectChanges();
    }


    //===========================================================
    // Load
    //===========================================================

    loadChecks():
        void
    {
        this.loading =
            true;

        this.loadFailed =
            false;

        const direction =
            this.direction;

        const today =
            toIsoDate(new Date());

        this.service
            .getAll(direction)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    response:
                        CheckReconciliations[]
                ):
                    void =>
                {
                    if
                    (
                        direction !== this.direction
                    )
                    {
                        return;
                    }

                    this.checks =
                        (response ?? []).map
                        (
                            item =>
                            ({
                                ...item,
                                CheckDateText:this.displayDate(item.CheckDate),
                                AmountText:formatMoney(item.Amount),
                                PostDated:!!item.CheckDate && item.CheckDate > today,
                                BankCode:item.Direction === 'Received' ? item.DepositLedgerCode : item.AccountLedgerCode,
                                BankName:item.Direction === 'Received' ? item.DepositLedgerName : item.AccountLedgerName
                            })
                        );

                    // Keep the selected lines that still fit
                    const byId =
                        new Map(this.checks.map(check => [check.PaymentId, check]));

                    this.selected =
                        this.selected
                            .map(line => ({ ...line, check:byId.get(line.check.PaymentId) as CenterCheck }))
                            .filter(line => !!line.check && this.fits(line.check));

                    this.buildFilters();

                    // Preselect (from the list's row button)
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
                    console.error('Load Checks Error:', error);

                    this.checks =
                        [];

                    this.loading =
                        false;

                    this.loadFailed =
                        true;

                    this.toast.error('Load Failed', 'Unable to load checks.');

                    this.cdr.detectChanges();
                }
            });
    }

    private buildFilters():
        void
    {
        const branches =
            new Map<number, string>();

        const banks =
            new Map<string, string>();

        for
        (
            const check of this.checks
        )
        {
            if
            (
                this.fits(check)
            )
            {
                branches.set(check.BranchId, check.BranchName);

                if
                (
                    check.BankCode
                )
                {
                    banks.set(check.BankCode, check.BankName);
                }
            }
        }

        this.branchItems =
        [
            { label:'All Branches', value:null },
            ...[...branches.entries()]
                .sort((a, b) => a[1].localeCompare(b[1]))
                .map(([value, label]) => ({ label, value }))
        ];

        this.bankItems =
        [
            { label:'All Bank Accounts', value:null },
            ...[...banks.entries()]
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

        if
        (
            this.bankFilter
            &&
            !banks.has(this.bankFilter)
        )
        {
            this.bankFilter =
                null;
        }

        this.loadDefaults();
    }


    //===========================================================
    // Which checks belong to the mode
    //===========================================================

    private fits
    (
        check:
            CenterCheck
    ):
        boolean
    {
        if
        (
            check.Direction !== this.direction
        )
        {
            return false;
        }

        switch
        (
            this.mode
        )
        {
            case 'deposit':
                return check.Direction === 'Received'
                    && check.Status === 'Pending';

            case 'dishonour':
                return check.Direction === 'Received'
                    && check.Status === 'Deposited';

            default:
                return check.Direction === 'Received'
                    ? check.Status === 'Deposited'
                    : check.Status === 'Pending';
        }
    }

    isSelected
    (
        check:
            CenterCheck
    ):
        boolean
    {
        return this.selected.some(line => line.check.PaymentId === check.PaymentId);
    }

    // Left : the mode's checks, not yet selected, filtered
    get available():
        CenterCheck[]
    {
        const keyword =
            this.searchText.trim().toLowerCase();

        return this.checks
            .filter(
                check =>
                    this.fits(check)
                    &&
                    !this.isSelected(check)
                    &&
                    (this.branchFilter === null || check.BranchId === this.branchFilter)
                    &&
                    (this.mode === 'deposit' || !this.bankFilter || check.BankCode === this.bankFilter)
                    &&
                    (
                        !keyword
                        ||
                        [
                            check.CheckNo,
                            check.PartyName,
                            check.CheckBank,
                            check.SourceVoucherNo,
                            check.AmountText,
                            check.BankName
                        ]
                        .join(' ')
                        .toLowerCase()
                        .includes(keyword)
                    ))
            .sort(
                (a, b) =>
                    (a.CheckDate || '').localeCompare(b.CheckDate || '')
                    ||
                    a.CheckNo.localeCompare(b.CheckNo));
    }

    // Why a check cannot be added now ('' = it can)
    addBlock
    (
        check:
            CenterCheck
    ):
        string
    {
        if
        (
            check.PostDated
        )
        {
            return `Post-dated : from ${check.CheckDateText}.`;
        }

        if
        (
            !this.multiCheck
            &&
            this.selected.length >= 1
        )
        {
            return 'Multi Check Deposit / Clearing is OFF : one check at a time.';
        }

        if
        (
            this.mode === 'deposit'
            &&
            this.selected.length > 0
            &&
            this.selected[0].check.BranchId !== check.BranchId
        )
        {
            return 'One Deposit Slip holds the checks of one branch.';
        }

        return '';
    }


    //===========================================================
    // Add / remove
    //===========================================================

    add
    (
        check:
            CenterCheck
    ):
        void
    {
        if
        (
            this.busy
            ||
            this.isSelected(check)
        )
        {
            return;
        }

        const block =
            this.addBlock(check);

        if
        (
            block
        )
        {
            this.toast.info('Not Added', block);

            return;
        }

        this.selected =
        [
            ...this.selected,
            {
                check,
                charge:'',
                fee:'',
                recovery:'',
                notes:''
            }
        ];

        if
        (
            this.mode === 'deposit'
        )
        {
            this.loadDepositAccounts(check);
        }

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
            const check of this.available
        )
        {
            if
            (
                !this.addBlock(check)
            )
            {
                this.add(check);
            }
        }
    }

    get canAddAll():
        boolean
    {
        return this.available.some(check => !this.addBlock(check));
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
    // Tab / mode / filters
    //===========================================================

    onTabChange
    (
        value:
            string
    ):
        void
    {
        if
        (
            value === this.selectedTab
        )
        {
            return;
        }

        this.confirmLeave(
            () =>
            {
                this.selectedTab =
                    value;

                this.mode =
                    this.received ? 'deposit' : 'clear';

                this.resetBatch();

                this.checks =
                    [];

                this.loadChecks();
            });
    }

    setMode
    (
        mode:
            CenterMode
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

        this.confirmLeave(
            () =>
            {
                this.mode =
                    mode;

                this.resetBatch();

                this.buildFilters();
            });
    }

    // Switching tab / mode empties the selection : ask first
    private confirmLeave
    (
        go:
            () => void
    ):
        void
    {
        if
        (
            this.selected.length === 0
        )
        {
            go();

            this.cdr.detectChanges();

            return;
        }

        this.confirmDialog.open(
            'Change Selection',
            `${this.selected.length} selected check(s) will be removed. Continue?`,
            () =>
            {
                go();

                this.cdr.detectChanges();
            },
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

        this.bankFilter =
            null;

        this.narration =
            '';

        this.reason =
            '';

        this.depositBankCode =
            null;

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

    onBankFilter
    (
        value:
            string | null
    ):
        void
    {
        this.bankFilter =
            value || null;
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

    onDepositBank
    (
        value:
            string | null
    ):
        void
    {
        this.depositBankCode =
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

    onLine
    (
        line:
            SelectedLine,
        field:
            'charge' | 'fee' | 'recovery' | 'notes',
        value:
            string | number
    ):
        void
    {
        line[field] =
            String(value ?? '');
    }

    private loadDepositAccounts
    (
        check:
            CenterCheck
    ):
        void
    {
        if
        (
            this.depositAccountsBranchId === check.BranchId
            &&
            this.depositAccountItems.length > 0
        )
        {
            this.defaultDepositBank();

            return;
        }

        this.depositAccountsBranchId =
            check.BranchId;

        this.service
            .getDepositAccounts(check.BranchId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    accounts:
                        CheckBankAccount[]
                ):
                    void =>
                {
                    this.depositAccountItems =
                        (accounts ?? []).map(account => ({ label:account.LedgerName, value:account.LedgerCode }));

                    this.defaultDepositBank();

                    this.cdr.detectChanges();
                },

                error:
                (
                    error:
                        unknown
                ):
                    void =>
                {
                    console.error('Deposit Accounts Error:', error);

                    this.depositAccountsBranchId =
                        0;

                    this.toast.error('Bank Accounts', 'Unable to load the bank accounts to deposit into.');
                }
            });
    }

    // Default : the account named on the first Receipt Voucher
    private defaultDepositBank():
        void
    {
        if
        (
            this.depositBankCode
            &&
            this.depositAccountItems.some(account => account.value === this.depositBankCode)
        )
        {
            return;
        }

        const first =
            this.selected[0]?.check;

        this.depositBankCode =
            this.depositAccountItems.find(account => account.value === first?.AccountLedgerCode)?.value
            ??
            (this.depositAccountItems.length === 1 ? this.depositAccountItems[0].value : null);
    }


    //===========================================================
    // Totals
    //===========================================================
    // Voucher No preview
    //
    // Deposit : next DS-… ; Clear / Dishonour : next RRV / RRP.
    // Branch : the selected checks' branch, else the branch
    // filter, else the login branch. Nothing is reserved; Save
    // takes the real number in sequence.
    //===========================================================

    // Branch name from the loaded checks (header fallback)
    private branchLabel
    (
        branchId:
            number
    ):
        string
    {
        return this.checks.find(check => check.BranchId === branchId)?.BranchName
            || this.branchItems.find(item => item.value === branchId)?.label
            || '';
    }

    private get previewBranchId():
        number
    {
        return this.selected[0]?.check.BranchId
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
            `${this.direction}|${this.mode}|${branchId}|${day}`;

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
            .getDefaults(this.direction, this.mode, branchId, day)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe
            ({
                next:
                (
                    result:
                        CheckCenterDefaults
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

                    console.error('Clearing Center Defaults Error:', error);

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

    // Save may create several vouchers : the first number is shown
    get voucherNoExtra():
        number
    {
        const match =
            /^(\d+)/.exec(this.createsText);

        const count =
            match ? Number(match[1]) : 0;

        return this.mode === 'deposit' || count <= 1
            ? 0
            : count - 1;
    }

    get voucherNoLabel():
        string
    {
        return this.mode === 'deposit'
            ? 'Deposit Slip No'
            : 'Voucher No';
    }


    //===========================================================

    get totalAmount():
        number
    {
        return roundMoney(
            this.selected.reduce((sum, line) => sum + (Number(line.check.Amount) || 0), 0));
    }

    get totalCharges():
        number
    {
        return roundMoney(
            this.selected.reduce((sum, line) => sum + parseMoney(line.charge), 0));
    }

    get totalFees():
        number
    {
        return roundMoney(
            this.selected.reduce((sum, line) => sum + parseMoney(line.fee), 0));
    }

    get totalRecovery():
        number
    {
        return roundMoney(
            this.selected.reduce((sum, line) => sum + this.lineRecovery(line), 0));
    }

    // Recovery = the line's bank charges (read only), only while
    // switch 0050 is ON
    lineRecovery
    (
        line:
            SelectedLine
    ):
        number
    {
        return this.recoveryOn
            ? roundMoney(parseMoney(line.fee))
            : 0;
    }

    // Clearing : received → the bank gets amount − charge;
    // issued → the bank pays amount + charge
    net
    (
        line:
            SelectedLine
    ):
        number
    {
        const amount =
            Number(line.check.Amount) || 0;

        const charge =
            parseMoney(line.charge);

        return roundMoney(
            this.received
                ? amount - charge
                : amount + charge);
    }

    get totalNet():
        number
    {
        return roundMoney(
            this.selected.reduce((sum, line) => sum + this.net(line), 0));
    }

    get inWords():
        string
    {
        return amountInWords(this.totalAmount);
    }

    get voucherPrefix():
        string
    {
        return this.received
            ? 'RRV'
            : 'RRP';
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

        if
        (
            this.mode === 'deposit'
        )
        {
            return '1 Bank Deposit Slip';
        }

        const lines =
            this.mode === 'dishonour'
                ? this.selected.filter(line => parseMoney(line.fee) > 0 || this.lineRecovery(line) > 0)
                : this.selected;

        if
        (
            lines.length === 0
        )
        {
            return 'Nothing to post';
        }

        const keys =
            new Set(
                lines.map(
                    line =>
                        this.perBatch
                            ? `${line.check.BranchId}|${line.check.BankCode}`
                            : `${line.check.BranchId}|${line.check.BankCode}|${line.check.SourceVoucherId}`));

        return `${keys.size} ${this.voucherPrefix}`;
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
            const dates =
                [line.check.CheckDate, line.check.VoucherDate];

            if
            (
                this.mode !== 'deposit'
            )
            {
                dates.push(line.check.DepositDate);
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

    //===========================================================
    // Floating ribbon (Available Checks maximized) : the hidden
    // Voucher Information in one line
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
        if
        (
            this.mode === 'deposit'
        )
        {
            return this.depositAccountItems.find(item => item.value === this.depositBankCode)?.label
                || 'Deposit account not selected';
        }

        return this.bankItems.find(item => item.value === this.bankFilter)?.label
            || 'All Bank Accounts';
    }

    get ribbonNarration():
        string
    {
        return (this.mode === 'dishonour' ? this.reason : (this.mode === 'clear' ? this.narration : '')).trim();
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

    // '' when Save can run
    get issue():
        string
    {
        if
        (
            this.selected.length === 0
        )
        {
            return 'Add checks from the left.';
        }

        if
        (
            !this.multiCheck
            &&
            this.selected.length > 1
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
            !this.depositBankCode
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
            const line of this.selected
        )
        {
            if
            (
                (this.mode === 'clear' && this.moneyIssue(line.charge))
                ||
                (this.mode === 'dishonour' && this.moneyIssue(line.fee))
            )
            {
                return `Check ${line.check.CheckNo} : amounts must be numbers with at most 2 decimals.`;
            }

            if
            (
                this.mode === 'clear'
                &&
                parseMoney(line.charge) >= (Number(line.check.Amount) || 0)
                &&
                parseMoney(line.charge) > 0
                &&
                this.received
            )
            {
                return `Check ${line.check.CheckNo} : the bank charge must be less than the check amount.`;
            }
        }

        return '';
    }


    //===========================================================
    // Commands : Save · Clear · back
    //===========================================================

    get saveText():
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
                return 'Clear';
        }
    }

    // Tooltip of the Save command
    get saveTitle():
        string
    {
        switch
        (
            this.mode
        )
        {
            case 'deposit':
                return 'Deposit the selected checks';

            case 'dishonour':
                return 'Dishonour the selected checks';

            default:
                return 'Clear the selected checks';
        }
    }

    get saveIcon():
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
            `Remove the ${this.selected.length} selected check(s) and the entered values?`,
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

    // Close the Center : the list of this tab
    private goToList():
        void
    {
        void this.router.navigate(
            ['list'],
            {
                relativeTo:this.route.parent,
                queryParams:{ direction:this.direction }
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
            'Leave Clearing Center',
            `${this.selected.length} selected check(s) are not saved. Leave anyway?`,
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

        let message:
            string;

        let request$:
            Observable<CheckActionResult>;

        switch
        (
            this.mode
        )
        {
            case 'deposit':
            {
                const bank =
                    this.depositAccountItems.find(account => account.value === this.depositBankCode)?.label
                    ??
                    this.depositBankCode;

                message =
                    `Deposit ${count} check(s), Tk ${total}, into ${bank} on ${this.displayDate(date)}? A Bank Deposit Slip is created; nothing is posted until the checks clear.`;

                request$ =
                    this.service.deposit(
                    {
                        PaymentIds:this.selected.map(line => line.check.PaymentId),
                        DepositDate:date,
                        BankLedgerCode:this.depositBankCode ?? '',
                        Notes:this.selected
                            .filter(line => !!line.notes.trim())
                            .map(line => ({ PaymentId:line.check.PaymentId, ShortNotes:line.notes.trim() }))
                    });

                break;
            }

            case 'dishonour':
            {
                message =
                    `Mark ${count} check(s), Tk ${total}, as dishonoured on ${this.displayDate(date)}? Bank charges Tk ${formatMoney(this.totalFees)}${this.recoveryOn ? ` and recovery Tk ${formatMoney(this.totalRecovery)}` : ''} are posted (${this.createsText}).`;

                request$ =
                    this.service.dishonour(
                    {
                        DishonourDate:date,
                        Items:this.selected.map(
                            line =>
                            ({
                                PaymentId:line.check.PaymentId,
                                Reason:this.reason.trim(),
                                Fee:roundMoney(parseMoney(line.fee)),
                                Recovery:roundMoney(this.lineRecovery(line)),
                                ShortNotes:line.notes.trim()
                            }))
                    });

                break;
            }

            default:
            {
                message =
                    `Clear ${count} check(s), Tk ${total}, on ${this.displayDate(date)}? ${this.createsText} will be posted${this.totalCharges > 0 ? ` with bank charges Tk ${formatMoney(this.totalCharges)}` : ''}.`;

                request$ =
                    this.service.clear(
                    {
                        Direction:this.direction,
                        ClearedDate:date,
                        Narration:this.narration.trim(),
                        Items:this.selected.map(
                            line =>
                            ({
                                PaymentId:line.check.PaymentId,
                                Charge:roundMoney(parseMoney(line.charge)),
                                ShortNotes:line.notes.trim()
                            }))
                    });

                break;
            }
        }

        const mode =
            this.mode;

        this.confirmDialog.open(
            this.saveText,
            message,
            () => this.run(request$, mode),
            this.saveText,
            'Cancel',
            mode === 'dishonour' ? 'danger' : 'primary'
        );
    }

    private run
    (
        request$:
            Observable<CheckActionResult>,
        mode:
            CenterMode
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
                        CheckActionResult
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

                            // (print prompt, switch 0048) then back to the
                            // list, which shows the new status
                            this.offerPrint(result, mode, () => this.goToList());
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

                    console.error('Clearing Center Error:', error);

                    this.toast.error(title, this.extractErrorMessage(error, 'The action failed.'));

                    this.loadChecks();
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
    // Print (switch 0048 : ask after Save)
    //===========================================================

    private offerPrint
    (
        result:
            CheckActionResult,
        mode:
            CenterMode,
        done:
            () => void
    ):
        void
    {
        if
        (
            !this.printPrompt
        )
        {
            done();

            return;
        }

        if
        (
            mode === 'deposit'
            &&
            result.DepositSlipId
        )
        {
            const id =
                result.DepositSlipId;

            this.confirmDialog.open(
                'Print Deposit Slip',
                `Print Bank Deposit Slip ${result.DepositSlipNo}?`,
                () =>
                {
                    this.openPrint('bank-deposit-slip', id);

                    done();
                },
                'Print',
                'Later',
                'primary',
                done
            );

            return;
        }

        const ids =
            result.VoucherIds ?? [];

        if
        (
            ids.length > 0
        )
        {
            this.confirmDialog.open(
                'Print Voucher',
                ids.length === 1
                    ? `Print ${result.VoucherNos[0]}?`
                    : `Print the ${ids.length} vouchers (${result.VoucherNos.join(', ')})?`,
                () =>
                {
                    ids.forEach(id => this.openPrint('check-clearing-voucher', id));

                    done();
                },
                'Print',
                'Later',
                'primary',
                done
            );

            return;
        }

        // Nothing to print (e.g. a dishonour without charges)
        done();
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