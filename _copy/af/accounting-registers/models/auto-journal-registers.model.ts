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


//===============================================================
// No repeats on a journal (view and print) : a line shows its
// party / narration only when it adds something
//===============================================================

// "RUNNER AUTOMOBILES PLC - REVOO - 01812114911 (SUP-000001)"
// → its first part and its phone, to compare a ledger with a party
function nameKey
(
    name:
        string
):
    { full:string; first:string; phone:string }
{
    const clean =
        (name ?? '')
            .toUpperCase()
            .replace(/\s*\([^)]*\)\s*$/, '')
            .replace(/\s+/g, ' ')
            .trim();

    return {
        full:clean,
        first:clean.split(' - ')[0].trim(),
        phone:(/(\d{6,})\s*$/.exec(clean)?.[1]) ?? ''
    };
}

function sameName
(
    a:
        string,
    b:
        string
):
    boolean
{
    const x =
        nameKey(a);

    const y =
        nameKey(b);

    if
    (
        !x.full || !y.full
    )
    {
        return false;
    }

    return x.full === y.full
        ||
        (x.first === y.first && x.phone === y.phone);
}

// The line's party, or '' when it repeats the ledger (the party's
// own ledger) or the journal's party (shown in its header)
export function lineParty
(
    line:
        AutoJournalLine,
    journal:
        AutoJournal
):
    string
{
    if
    (
        !line.PartyCode
    )
    {
        return '';
    }

    if
    (
        sameName(line.LedgerName, line.PartyName)
        ||
        (journal.PartyCode && journal.PartyCode === line.PartyCode && journal.PartyType === line.PartyType)
    )
    {
        return '';
    }

    return partyText(line.PartyType, line.PartyCode, line.PartyName);
}

// The line's narration, or '' when it repeats the journal's
// narration (journal lines) or the reversal reason (reversal)
export function lineNote
(
    line:
        AutoJournalLine,
    journal:
        AutoJournal,
    reversal:
        boolean
):
    string
{
    const note =
        (line.Narration ?? '').trim();

    const plain =
        (value: string) =>
            (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

    if
    (
        !note
        ||
        plain(note) === plain(journal.Narration)
    )
    {
        return '';
    }

    if
    (
        reversal
    )
    {
        const reason =
            plain(journal.ReversalReason);

        const text =
            plain(note).replace(/^(cancelled|reversed|reversal)\s*:?\s*/, '');

        if
        (
            !text || text === reason || plain(note) === reason
        )
        {
            return '';
        }
    }

    return note;
}

// Does any line of the journal (and its reversal) show a party /
// a narration? (the column is left out when none does)
export function journalShowsParty
(
    journal:
        AutoJournal
):
    boolean
{
    return [...journal.Lines, ...journal.ReversalLines].some(x => !!lineParty(x, journal));
}

export function journalShowsNotes
(
    journal:
        AutoJournal
):
    boolean
{
    return journal.Lines.some(x => !!lineNote(x, journal, false))
        ||
        journal.ReversalLines.some(x => !!lineNote(x, journal, true));
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
