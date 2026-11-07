//===============================================================
// Ledger Statements and Registers : models
//
// One page component for six pages; the route's
// data.registerType picks the config :
//   General Ledger · Cash · Bank · MFS · POS · EMI
//
// Amounts : Debit − Credit; positive = Dr, negative = Cr.
// Dates : yyyy-MM-dd.
//===============================================================

export interface LedgerRegisterConfig
{
    // Stored LedgerType
    type:string;

    // API ?type=
    apiType:string;

    title:string;
    subtitle:string;
    icon:string;

    // "ledger" / "account"
    itemWord:string;

    // Reference column heading ('' = no column)
    refLabel:string;

    // Cheque status column (Bank)
    showStatus:boolean;
}

export const LEDGER_REGISTER_CONFIGS:
    Record<string, LedgerRegisterConfig> =
{
    'General Ledger':
    {
        type:'General Ledger',
        apiType:'general-ledger',
        title:'Ledger Statements',
        subtitle:'Statement of any ledger for a period',
        icon:'fas fa-book-open',
        itemWord:'ledger',
        refLabel:'Ref No',
        showStatus:false
    },

    'Cash':
    {
        type:'Cash',
        apiType:'cash',
        title:'Cash Registers',
        subtitle:'Cash book of the cash accounts',
        icon:'fas fa-money-bill-wave',
        itemWord:'account',
        refLabel:'',
        showStatus:false
    },

    'Bank':
    {
        type:'Bank',
        apiType:'bank',
        title:'Bank Registers',
        subtitle:'Bank book with cheques and their status',
        icon:'fas fa-building-columns',
        itemWord:'account',
        refLabel:'Cheque No',
        showStatus:true
    },

    'MFS':
    {
        type:'MFS',
        apiType:'mfs',
        title:'MFS Registers',
        subtitle:'Mobile wallet book of the MFS accounts',
        icon:'fas fa-mobile-screen-button',
        itemWord:'account',
        refLabel:'Transaction ID',
        showStatus:false
    },

    'POS':
    {
        type:'POS',
        apiType:'pos',
        title:'POS Registers',
        subtitle:'Card collections of the POS accounts',
        icon:'fas fa-credit-card',
        itemWord:'account',
        refLabel:'Card / Ref',
        showStatus:false
    },

    'EMI':
    {
        type:'EMI',
        apiType:'emi',
        title:'EMI Registers',
        subtitle:'Card EMI collections of the EMI accounts',
        icon:'fas fa-calendar-check',
        itemWord:'account',
        refLabel:'Card / Ref',
        showStatus:false
    }
};

export function ledgerRegisterConfig
(
    type:
        string
):
    LedgerRegisterConfig
{
    return LEDGER_REGISTER_CONFIGS[type] ?? LEDGER_REGISTER_CONFIGS['General Ledger'];
}


//===============================================================
// Chart (filter lists)
//===============================================================

export interface LedgerChartNode
{
    Code:string;
    Name:string;
    ParentCode:string;
    ClassCode:string;
}

export interface LedgerChartLedger
{
    Code:string;
    Name:string;
    ClassCode:string;
    GroupCode:string;
    SubGroupCode:string;
    Mode:string;
    IsActive:boolean;
}

export interface LedgerOption
{
    Id:number;
    Code:string;
    Name:string;
}

export interface LedgerChart
{
    Type:string;
    Classes:LedgerChartNode[];
    Groups:LedgerChartNode[];
    SubGroups:LedgerChartNode[];
    Ledgers:LedgerChartLedger[];
    Branches:LedgerOption[];
}


//===============================================================
// Statement
//===============================================================

export interface LedgerStatementRow
{
    VoucherType:string;
    VoucherNo:string;
    VoucherDate:string;
    BranchName:string;
    IsReversal:boolean;
    IsCancelled:boolean;
    Particulars:string;
    ContraCodes:string;
    PartyName:string;
    Reference:string;
    Status:string;
    Narration:string;
    ShortNote:string;
    Debit:number;
    Credit:number;
    Balance:number;
}

export interface LedgerStatement
{
    Type:string;
    LedgerCode:string;
    LedgerName:string;
    ClassName:string;
    GroupName:string;
    SubGroupName:string;
    Mode:string;
    IsNominal:boolean;
    OpeningFrom:string;
    From:string;
    To:string;
    BranchId:number;
    BranchName:string;
    ShowCancelled:boolean;
    Opening:number;
    TotalDebit:number;
    TotalCredit:number;
    Closing:number;
    Truncated:boolean;
    Rows:LedgerStatementRow[];
}


//===============================================================
// Summary
//===============================================================

export interface LedgerSummaryRow
{
    LedgerCode:string;
    LedgerName:string;
    GroupName:string;
    SubGroupName:string;
    Mode:string;
    IsActive:boolean;
    Opening:number;
    Debit:number;
    Credit:number;
    Closing:number;
}

export interface LedgerSummary
{
    Type:string;
    ClassCode:string;
    GroupCode:string;
    SubGroupCode:string;
    ScopePath:string;
    From:string;
    To:string;
    BranchId:number;
    BranchName:string;
    ShowCancelled:boolean;
    Opening:number;
    TotalDebit:number;
    TotalCredit:number;
    Closing:number;
    Rows:LedgerSummaryRow[];
}


//===============================================================
// Voucher (opened under a statement row)
//===============================================================

export interface LedgerVoucherLine
{
    LedgerCode:string;
    LedgerName:string;
    PartyName:string;
    Narration:string;
    Debit:number;
    Credit:number;
}

export interface LedgerVoucher
{
    VoucherType:string;
    VoucherNo:string;
    VoucherDate:string;
    BranchName:string;
    Narration:string;
    Lines:LedgerVoucherLine[];
    IsReversed:boolean;
    ReversalDate:string;
    ReversalReason:string;
    ReversalLines:LedgerVoucherLine[];
}


//===============================================================
// Print request (saved under a token for the Print Viewer)
//===============================================================

export interface LedgerPrintRequest
{
    registerType:string;

    // 'statement' / 'summary'
    view:string;

    ledgerCode:string;
    classCode:string;
    groupCode:string;
    subGroupCode:string;
    from:string;
    to:string;
    branchId:number;
    showCancelled:boolean;

    // The page's view switches (missing = on)
    showCodes?:boolean;
    showNarration?:boolean;

    // Summary : ledgers with a zero closing balance / with no
    // debit or credit in the period (missing = shown)
    showZeroBalance?:boolean;
    showNoTransactions?:boolean;

    // Statement : 'summary' = one row per voucher (missing =
    // detail, one row per voucher line)
    statementMode?:'detail' | 'summary';

    // Page search (optional)
    search?:string;
}

export const LEDGER_PRINT_KEY =
    'ledger-registers';


//===============================================================
// Helpers
//===============================================================

export function toIsoDate
(
    date:
        Date
):
    string
{
    const pad =
        (value: number) =>
            String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// yyyy-MM-dd → 31-Oct-2026
export function formatLedgerDate
(
    iso:
        string
):
    string
{
    const match =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');

    if
    (
        !match
    )
    {
        return '';
    }

    const months =
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${match[3]}-${months[Number(match[2]) - 1] ?? match[2]}-${match[1]}`;
}

// 1234.5 → "1,234.50"
export function formatLedgerMoney
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

// Signed balance → "1,234.50 Dr" / "1,234.50 Cr" / "0.00"
export function formatBalance
(
    value:
        number
):
    string
{
    const amount =
        Math.round((Number(value) || 0) * 100) / 100;

    if
    (
        amount === 0
    )
    {
        return '0.00';
    }

    return `${formatLedgerMoney(Math.abs(amount))} ${amount > 0 ? 'Dr' : 'Cr'}`;
}


//===============================================================
// Search : every word must appear in the row
//===============================================================

function searchWords
(
    search:
        string
):
    string[]
{
    return (search ?? '').trim().toLowerCase().split(/\s+/).filter(x => !!x);
}

function hasWords
(
    parts:
        (string | number)[],
    words:
        string[]
):
    boolean
{
    const text =
        parts.map(x => String(x ?? '')).join(' \u001f ').toLowerCase();

    return words.every(word => text.includes(word));
}

// Statement row : date, voucher, counter head + code, ref,
// status, narration, short note, amounts
export function statementRowMatches
(
    row:
        LedgerStatementRow,
    search:
        string
):
    boolean
{
    const words =
        searchWords(search);

    return words.length === 0
        || hasWords(
            [
                row.VoucherDate,
                formatLedgerDate(row.VoucherDate),
                row.VoucherNo,
                row.VoucherType,
                row.Particulars,
                row.ContraCodes,
                row.Reference,
                row.Status,
                row.Narration,
                row.ShortNote,
                row.Debit || '',
                row.Credit || '',
                row.IsReversal ? 'reversal' : '',
                row.IsCancelled ? 'cancelled' : ''
            ],
            words
        );
}

// Summary row : ledger name, code, group, sub group
// Notes of a merged voucher : said once. Notes that share a
// "Kind - " start ("Purchase - 1 Pcs", "Purchase - Input VAT")
// become "Purchase - 1 Pcs, Input VAT".
function joinNotes
(
    notes:
        string[]
):
    string
{
    if (notes.length === 0)
    {
        return '';
    }

    const parts =
        notes.map(x => x.match(/^(.+?) - (.+)$/));

    const kind =
        parts[0]?.[1];

    if (kind && parts.every(x => x && x[1] === kind))
    {
        const bodies =
            parts.map(x => x![2].trim());

        // Quantity notes ("2 Pcs", "1 Pcs | typed note") become
        // one total : "5 products · 8 Pcs"; the rest stays as it is
        const qty =
            /^(\d+(?:\.\d+)?)\s+([A-Za-z.]+)\s*(?:\|\s*(.*))?$/;

        const totals =
            new Map<string, number>();

        const others:
            string[] = [];

        let products = 0;

        for (const body of bodies)
        {
            const m =
                body.match(qty);

            if (m)
            {
                products++;

                totals.set(m[2], (totals.get(m[2]) ?? 0) + Number(m[1]));

                if (m[3] && m[3].trim())
                {
                    others.push(m[3].trim());
                }
            }
            else
            {
                others.push(body);
            }
        }

        if (products > 1)
        {
            const amount =
                [...totals.entries()]
                    .map(([unit, n]) => `${Math.round(n * 100) / 100} ${unit}`)
                    .join(' + ');

            return `${kind} - ${products} products · ${amount}`
                + (others.length > 0 ? `, ${[...new Set(others)].join(', ')}` : '');
        }

        return `${kind} - ${[...new Set(bodies)].join(', ')}`;
    }

    return [...new Set(notes)].join(' · ');
}

// Statement summary : one row per voucher. Consecutive lines of
// the same voucher are merged : debit and credit added, the
// balance after the voucher's last line, the other ledgers as
// "first + N more", their notes joined once each.
export function mergeVoucherRows
(
    rows:
        LedgerStatementRow[]
):
    LedgerStatementRow[]
{
    const key =
        (x: LedgerStatementRow) => `${x.VoucherType}|${x.VoucherNo}|${x.IsReversal}`;

    const result:
        LedgerStatementRow[] = [];

    let start = 0;

    for (let i = 1; i <= rows.length; i++)
    {
        if (i < rows.length && key(rows[i]) === key(rows[start]))
        {
            continue;
        }

        const group =
            rows.slice(start, i);

        start = i;

        if (group.length === 1)
        {
            result.push(group[0]);

            continue;
        }

        const first =
            group[0];

        const unique =
            (values: string[]) => [...new Set(values.map(x => (x ?? '').trim()).filter(x => !!x))];

        const names =
            unique(group.map(x => x.Particulars));

        // Every line's note (not made unique : quantities are added)
        const notes =
            group.map(x => (x.ShortNote ?? '').trim()).filter(x => !!x);

        const round =
            (x: number) => Math.round(x * 100) / 100;

        result.push(
            {
                ...first,
                Particulars:
                    names.length <= 1
                        ? (names[0] ?? '')
                        : `${names[0]} + ${names.length - 1} more`,
                ContraCodes:
                    names.length <= 1 ? first.ContraCodes : '',
                ShortNote:
                    joinNotes(notes),
                Debit:
                    round(group.reduce((t, x) => t + (x.Debit || 0), 0)),
                Credit:
                    round(group.reduce((t, x) => t + (x.Credit || 0), 0)),
                Balance:
                    group[group.length - 1].Balance,
                Narration:
                    group[group.length - 1].Narration || first.Narration
            });
    }

    return result;
}

// Summary view switches : a ledger with a zero closing balance
// and / or with no debit or credit in the period is shown only
// when its switch is ON
export function summaryRowShown
(
    row:
        LedgerSummaryRow,
    showZeroBalance:
        boolean,
    showNoTransactions:
        boolean
):
    boolean
{
    const zero =
        (x:number) => Math.abs(x || 0) < 0.005;

    if (!showZeroBalance && zero(row.Closing))
    {
        return false;
    }

    if (!showNoTransactions && zero(row.Debit) && zero(row.Credit))
    {
        return false;
    }

    return true;
}

export function summaryRowMatches
(
    row:
        LedgerSummaryRow,
    search:
        string
):
    boolean
{
    const words =
        searchWords(search);

    return words.length === 0
        || hasWords([row.LedgerName, row.LedgerCode, row.GroupName, row.SubGroupName], words);
}
