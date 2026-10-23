//===============================================================
// Accounting Models (shared)
//
// Used by the Voucher Master Data and Payment Desk components
// and by every voucher page (RV / PV / JV / FT).
//===============================================================


//===============================================================
// Ledger (api/platform/accounting/ledgers)
//===============================================================

export type LedgerType =
    'General Ledger' | 'Cash' | 'Bank' | 'MFS' | 'POS' | 'EMI';

export interface VoucherLedger
{
    AccountId: number;
    LedgerCode: string;
    LedgerName: string;
    LedgerType: LedgerType | string;
    ClassCode: string;
    GroupCode: string;
    SubGroupCode: string;
    SubGroupName: string;
    Branch: string;
    BranchExclusive: boolean;
    CollectionAccount: boolean;
    PaymentAccount: boolean;
    IsMoneyLedger: boolean;
    ChargePercent: number;
    IsActive: boolean;
}


//===============================================================
// Period (api/platform/accounting/period)
//===============================================================

export interface VoucherPeriod
{
    BranchId: number;
    BranchCode: string;
    BranchName: string;
    BranchDigits: string;
    FinancialYearId: number;
    FinancialYearName: string;
    FinancialYearCode: string;
    PeriodMonth: number;
    VoucherDate: string;
}


//===============================================================
// Look-up rows
//===============================================================

export interface BranchOption
{
    BranchId: number;
    BranchCode: string;
    BranchName: string;
    IsActive: boolean;
}

export interface PartyOption
{
    // Customer / Supplier code (CIB- / COS- / SUP-)
    Code: string;
    Name: string;
    LedgerCode: string;
    LedgerName: string;
    IsActive: boolean;
}

export interface CardOption
{
    CardSetupId: number;
    CardCode: string;
    CardName: string;
    IssuingBank: string;
    IsActive: boolean;
}

export interface BankOption
{
    BankName: string;
    ShortName: string;
    IsActive: boolean;
}

// One card's charge % on one POS account (Card Charges page)
export interface CardChargeRate
{
    POSAccountId: number;
    CardSetupId: number;
    ChargePercent: number;
}




//===============================================================
// Voucher number preview (api/platform/accounting/next-number)
//===============================================================

export interface VoucherNumberPreview
    extends VoucherPeriod
{
    VoucherNo: string;
}


//===============================================================
// Voucher Entry (Voucher Master Data component)
//
// One group per voucher :
//   n Debits : 1 Credit   or   1 Debit : n Credits
//
// Receipt Voucher : Debits = Receipt Mode (money in, entered
// first), Credits = Account Details.
//===============================================================

export type VoucherMode =
    'receipt';

// Receipt / payment mode
export type PaymentMode =
    'Cash' | 'Bank' | 'Check' | 'MFS' | 'POS' | 'EMI';

// Credit side ledger type
export type CreditLedgerType =
    'Customer' | 'Supplier' | 'General Ledger';

export type ChargeBorneBy =
    'Customer' | 'Company';


//===============================================================
// Debit row (Receipt Mode) + step 2 details (Payment Desk)
//===============================================================

export interface VoucherDebitLine
{
    Mode: PaymentMode;

    // Actual type of the ledger : Cash / Bank / MFS / POS / EMI
    LedgerType: string;

    SubGroupCode: string;
    SubGroupName: string;

    LedgerCode: string;
    LedgerName: string;
    AccountId: number;

    Amount: number;

    ShortNotes: string;

    //-----------------------------------------------------------
    // Payment Desk (step 2) : Check / MFS / POS / EMI
    //-----------------------------------------------------------

    // MFS / POS / EMI : platform charge
    ChargePercent: number;
    ChargeAmount: number;
    ChargeBorneBy: ChargeBorneBy | '';

    // POS / EMI
    CardSetupId: number;
    CardName: string;

    // MFS : Transaction ID; POS : approval code / last 4
    TransactionRef: string;

    // EMI (information only, not posted)
    TenureMonths: number;
    InterestPercent: number;
    InterestAmount: number;
    TotalCharged: number;

    // Check (the ledger is the deposit bank)
    CheckNo: string;
    // yyyy-MM-dd
    CheckDate: string;
    // Issuing bank (Bank Setup)
    CheckBank: string;

    // Read only (Check Reconciliation)
    CheckStatus: string;
    ClearedVoucherNo: string;

    // Screen only (never saved) : the user ticked "Verified" on
    // the Payment Desk. Any change to the row clears it; saved
    // rows load as verified.
    Verified?: boolean;
}


//===============================================================
// Credit row (Account Details)
//===============================================================

export interface VoucherCreditLine
{
    LedgerType: CreditLedgerType | string;

    SubGroupCode: string;
    SubGroupName: string;

    LedgerCode: string;

    // Customer / supplier name, or the GL name
    LedgerName: string;

    // Customer / Supplier code; empty for General Ledger
    PartyCode: string;

    Amount: number;

    ShortNotes: string;
}


//===============================================================
// Voucher Entry value
//===============================================================

export interface VoucherEntryData
{
    // yyyy-MM-dd
    VoucherDate: string;

    Narration: string;

    // Credit side ledger type (one per voucher)
    LedgerType: CreditLedgerType | '';

    Debits: VoucherDebitLine[];

    Credits: VoucherCreditLine[];
}


//===============================================================
// Charge recovery ledgers (charge the customer pays on top),
// looked up by CODE (same codes the server posts to)
//===============================================================

export const CHARGE_RECOVERY_LEDGERS:
    Record<string, string> =
{
    MFS:'GLR-011-001-001-00001',
    POS:'GLR-011-001-001-00002',
    EMI:'GLR-011-001-001-00003'
};

// A posting row added by the system (not entered by the user)
export interface VoucherChargeRow
{
    LedgerCode: string;
    LedgerName: string;
    Subtitle: string;
    Amount: number;
}


//===============================================================
// Modes that need step 2 (Payment Desk)
//===============================================================

export const DETAIL_MODES:
    PaymentMode[] =
[
    'Check',
    'MFS',
    'POS',
    'EMI'
];

export function needsDetails
(
    mode:
        string
):
    boolean
{
    return (DETAIL_MODES as string[]).includes(
        mode
    );
}


//===============================================================
// Step 2 details check (Payment Desk + voucher pages)
// '' when the row is complete; Cash / Bank never need details
//===============================================================

export function debitDetailIssue
(
    row:
        VoucherDebitLine
):
    string
{
    switch
    (
        row.Mode
    )
    {
        case 'Check':

            if (!(row.CheckNo ?? '').trim()) return 'Check No is required.';

            if (!row.CheckDate) return 'Check Date is required.';

            if (!(row.CheckBank ?? '').trim()) return 'Issuing Bank is required.';

            return '';

        case 'MFS':

            if (!(row.TransactionRef ?? '').trim()) return 'Transaction ID is required.';

            break;

        case 'POS':

            if (!(row.CardSetupId > 0)) return 'Card is required.';

            break;

        case 'EMI':

            if (!(row.CardSetupId > 0)) return 'Card is required.';

            if (!(row.TenureMonths > 0)) return 'Tenure is required.';

            if (row.TenureMonths > 120) return 'Tenure can be at most 120 months.';

            if (row.InterestPercent < 0 || row.InterestPercent > 100) return 'Interest % must be 0 to 100.';

            break;

        default:

            return '';
    }

    // MFS / POS / EMI : charge
    if (row.ChargePercent < 0 || row.ChargePercent > 100) return 'Charge % must be 0 to 100.';

    if (row.ChargeAmount < 0 || row.ChargeAmount > row.Amount) return 'Charge cannot be more than the amount.';

    return '';
}


//===============================================================
// Row ready for saving : Cash / Bank always; Check / MFS / POS /
// EMI once the details are complete AND ticked Verified
//===============================================================

export function isDebitRowReady
(
    row:
        VoucherDebitLine
):
    boolean
{
    return !needsDetails(row.Mode)
        ||
        (
            !debitDetailIssue(row)
            &&
            !!row.Verified
        );
}


//===============================================================
// Helpers
//===============================================================

export function roundMoney
(
    value:
        number
):
    number
{
    return Math.round(
        (Number(value) || 0) * 100
    ) / 100;
}

export function formatMoney
(
    value:
        number
):
    string
{
    return (Number(value) || 0).toLocaleString(
        'en-US',
        {
            minimumFractionDigits:2,
            maximumFractionDigits:2
        }
    );
}

// '1,234.50' / '1234.5' → 1234.5 (NaN → 0)
export function parseMoney
(
    text:
        string | number | null | undefined
):
    number
{
    const value =
        Number(
            String(text ?? '')
                .replace(/,/g, '')
                .trim()
        );

    return Number.isFinite(value)
        ? value
        : 0;
}

export function emptyDebitLine
(
    mode:
        PaymentMode
):
    VoucherDebitLine
{
    return {
        Mode:mode,
        LedgerType:'',
        SubGroupCode:'',
        SubGroupName:'',
        LedgerCode:'',
        LedgerName:'',
        AccountId:0,
        Amount:0,
        ShortNotes:'',
        ChargePercent:0,
        ChargeAmount:0,
        ChargeBorneBy:'',
        CardSetupId:0,
        CardName:'',
        TransactionRef:'',
        TenureMonths:0,
        InterestPercent:0,
        InterestAmount:0,
        TotalCharged:0,
        CheckNo:'',
        CheckDate:'',
        CheckBank:'',
        CheckStatus:'',
        ClearedVoucherNo:''
    };
}

export function emptyVoucherEntry
(
    voucherDate:
        string
):
    VoucherEntryData
{
    return {
        VoucherDate:voucherDate,
        Narration:'',
        LedgerType:'',
        Debits:[],
        Credits:[]
    };
}

// Local date → yyyy-MM-dd
export function toIsoDate
(
    value:
        Date
):
    string
{
    const y =
        value.getFullYear();

    const m =
        String(value.getMonth() + 1).padStart(2, '0');

    const d =
        String(value.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;
}

// yyyy-MM-dd → local date (null when empty / invalid)
export function fromIsoDate
(
    value:
        string | null | undefined
):
    Date | null
{
    const parts =
        (value ?? '').substring(0, 10).split('-').map(Number);

    if
    (
        parts.length !== 3
        ||
        parts.some(part => !Number.isFinite(part) || part <= 0)
    )
    {
        return null;
    }

    return new Date(
        parts[0],
        parts[1] - 1,
        parts[2]
    );
}


//===============================================================
// Amount in words (Bangladesh : Crore / Lakh / Thousand)
//   203500.5 → "Taka Two Lakh Three Thousand Five Hundred and
//               Fifty Paisa Only"
//===============================================================

const WORD_ONES:
    string[] =
[
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
    'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen',
    'Nineteen'
];

const WORD_TENS:
    string[] =
[
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty',
    'Seventy', 'Eighty', 'Ninety'
];

// 0 - 99
function wordsBelowHundred
(
    value:
        number
):
    string
{
    if
    (
        value < 20
    )
    {
        return WORD_ONES[value];
    }

    const tens =
        WORD_TENS[Math.floor(value / 10)];

    const ones =
        WORD_ONES[value % 10];

    return ones
        ? `${tens} ${ones}`
        : tens;
}

// 0 - 999
function wordsBelowThousand
(
    value:
        number
):
    string
{
    const hundreds =
        Math.floor(value / 100);

    const rest =
        value % 100;

    const parts:
        string[] =
        [];

    if
    (
        hundreds > 0
    )
    {
        parts.push(
            `${WORD_ONES[hundreds]} Hundred`
        );
    }

    if
    (
        rest > 0
    )
    {
        parts.push(
            wordsBelowHundred(rest)
        );
    }

    return parts.join(' ');
}

// Whole number in the Crore / Lakh / Thousand system
function wholeNumberInWords
(
    value:
        number
):
    string
{
    if
    (
        value === 0
    )
    {
        return 'Zero';
    }

    const parts:
        string[] =
        [];

    const crore =
        Math.floor(value / 10000000);

    let rest =
        value % 10000000;

    if
    (
        crore > 0
    )
    {
        // 100+ crore : the crore count itself is read in words
        parts.push(
            `${wholeNumberInWords(crore)} Crore`
        );
    }

    const lakh =
        Math.floor(rest / 100000);

    rest =
        rest % 100000;

    if
    (
        lakh > 0
    )
    {
        parts.push(
            `${wordsBelowHundred(lakh)} Lakh`
        );
    }

    const thousand =
        Math.floor(rest / 1000);

    rest =
        rest % 1000;

    if
    (
        thousand > 0
    )
    {
        parts.push(
            `${wordsBelowHundred(thousand)} Thousand`
        );
    }

    if
    (
        rest > 0
    )
    {
        parts.push(
            wordsBelowThousand(rest)
        );
    }

    return parts.join(' ');
}

export function amountInWords
(
    value:
        number,
    currency:
        string =
        'Taka',
    fraction:
        string =
        'Paisa'
):
    string
{
    const amount =
        Math.abs(
            roundMoney(value)
        );

    if
    (
        !Number.isFinite(amount)
        ||
        amount === 0
    )
    {
        return `${currency} Zero Only`;
    }

    const whole =
        Math.floor(amount);

    const cents =
        Math.round((amount - whole) * 100);

    let text =
        `${currency} ${wholeNumberInWords(whole)}`;

    if
    (
        cents > 0
    )
    {
        text +=
            ` and ${wordsBelowHundred(cents)} ${fraction}`;
    }

    return `${text} Only`;
}