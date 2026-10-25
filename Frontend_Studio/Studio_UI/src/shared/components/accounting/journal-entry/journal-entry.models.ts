//===============================================================
// Journal Entry (Journal Voucher) : models
//
// Rows are kept in screen order, group by group; inside a group
// the debits come first, then the credits.
//===============================================================

export type JournalSide =
    'Debit' | 'Credit';

export type JournalLedgerType =
    'Supplier' | 'Customer' | 'General Ledger';

export const JOURNAL_LEDGER_TYPES:
    JournalLedgerType[] =
[
    'Supplier',
    'Customer',
    'General Ledger'
];

export interface JournalLine
{
    Side:
        JournalSide;

    // 1, 2, ... (the server renumbers in order)
    GroupNo:
        number;

    LedgerType:
        JournalLedgerType | string;

    SubGroupCode:
        string;

    SubGroupName:
        string;

    LedgerCode:
        string;

    // Supplier / Customer : display name; GL : ledger name
    LedgerName:
        string;

    // Supplier / Customer code; '' for General Ledger
    PartyCode:
        string;

    Amount:
        number;

    ShortNotes:
        string;
}

export interface JournalEntryData
{
    // yyyy-MM-dd
    VoucherDate:
        string;

    Narration:
        string;

    Lines:
        JournalLine[];
}

export function emptyJournalEntry
(
    voucherDate:
        string
):
    JournalEntryData
{
    return {
        VoucherDate:voucherDate,
        Narration:'',
        Lines:[]
    };
}

// Groups of the rows, in order : [{ no, lines }]
export function journalGroups
(
    lines:
        JournalLine[]
):
    { no: number; lines: JournalLine[] }[]
{
    const result:
        { no: number; lines: JournalLine[] }[] =
        [];

    for
    (
        const line of lines
    )
    {
        let group =
            result.find(item => item.no === line.GroupNo);

        if
        (
            !group
        )
        {
            group =
                { no:line.GroupNo, lines:[] };

            result.push(group);
        }

        group.lines.push(line);
    }

    return result;
}