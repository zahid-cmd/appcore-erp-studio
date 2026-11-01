//===============================================================
// Auto Journal Registers : models
//
// Journals posted by pages (purchases, reconciliations …), shown
// under the page that made them : Module › Menu › Submenu (from
// Navigation). Dates are yyyy-MM-dd; BranchId 0 = all branches.
//===============================================================

// Node of the left tree (module / menu / submenu)
export interface AutoJournalNode
{
    Code:string;
    Name:string;
    Icon:string;
    Count:number;
    VoucherTypes:string[];
    Children:AutoJournalNode[];
}

export interface AutoJournalOption
{
    Id:number;
    Code:string;
    Name:string;
}

export interface AutoJournalTree
{
    From:string;
    To:string;
    BranchId:number;
    Total:number;
    OtherCount:number;
    Modules:AutoJournalNode[];
    Branches:AutoJournalOption[];
}

export interface AutoJournalLine
{
    GroupNo:number;
    LineNo:number;
    LedgerCode:string;
    LedgerName:string;
    LedgerType:string;
    PartyType:string;
    PartyCode:string;
    PartyName:string;
    Narration:string;
    Debit:number;
    Credit:number;
}

export interface AutoJournal
{
    VoucherNo:string;
    VoucherType:string;
    VoucherDate:string;
    SourceCode:string;
    SourceName:string;
    BranchId:number;
    BranchName:string;
    PartyType:string;
    PartyCode:string;
    PartyName:string;
    Narration:string;
    ReferenceNo:string;
    TotalDebit:number;
    TotalCredit:number;
    Lines:AutoJournalLine[];
    IsReversed:boolean;
    ReversalDate:string;
    ReversalReason:string;
    ReversalLines:AutoJournalLine[];
}

export interface AutoJournalList
{
    Node:string;
    NodePath:string;
    From:string;
    To:string;
    BranchId:number;
    BranchName:string;
    Total:number;
    Shown:number;
    Truncated:boolean;
    Journals:AutoJournal[];
}


//===============================================================
// Constants
//===============================================================

// Node of the journals not linked to a page
export const AUTO_JOURNAL_OTHER =
    'OTHER';

// Print Viewer key (print-registry.ts)
export const AUTO_JOURNAL_PRINT_KEY =
    'auto-journal-registers';


//===============================================================
// Helpers
//===============================================================

// Date → yyyy-MM-dd (local)
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

// yyyy-MM-dd → Date (local; invalid → null)
export function fromIsoDate
(
    iso:
        string
):
    Date | null
{
    const match =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');

    return match
        ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        : null;
}

// yyyy-MM-dd → 31-Oct-2026
export function formatJournalDate
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

// "Supplier · SUP-0001 · Rahim Traders" style party text
export function partyText
(
    type:
        string,
    code:
        string,
    name:
        string
):
    string
{
    if
    (
        !code
    )
    {
        return '';
    }

    return name
        ? `${name} (${code})`
        : `${type ? type + ' ' : ''}${code}`;
}


// Search : every word must appear in the journal (voucher no,
// type, date, page, branch, party, ref, narration, any line's
// ledger name / code, party, narration or amount)
export function journalMatches
(
    journal:
        AutoJournal,
    search:
        string
):
    boolean
{
    const words =
        (search ?? '').trim().toLowerCase().split(/\s+/).filter(x => !!x);

    if
    (
        words.length === 0
    )
    {
        return true;
    }

    const lines =
        [...journal.Lines, ...journal.ReversalLines];

    const text =
        [
            journal.VoucherNo,
            journal.VoucherType,
            journal.VoucherDate,
            formatJournalDate(journal.VoucherDate),
            journal.SourceName,
            journal.BranchName,
            journal.PartyCode,
            journal.PartyName,
            journal.ReferenceNo,
            journal.Narration,
            journal.ReversalReason,
            String(journal.TotalDebit),
            ...lines.flatMap
            (
                x =>
                [
                    x.LedgerCode,
                    x.LedgerName,
                    x.PartyCode,
                    x.PartyName,
                    x.Narration,
                    x.Debit ? String(x.Debit) : '',
                    x.Credit ? String(x.Credit) : ''
                ]
            )
        ]
        .join(' \u001f ')
        .toLowerCase();

    return words.every(word => text.includes(word));
}
