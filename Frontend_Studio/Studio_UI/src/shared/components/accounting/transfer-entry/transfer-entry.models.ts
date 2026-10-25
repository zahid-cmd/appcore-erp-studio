//===============================================================
// Transfer Entry (Fund Transfer) : models
//
// From rows (CREDIT, entered first) and To rows (DEBIT); kept in
// screen order, From rows first.
//===============================================================

export type TransferSide =
    'From' | 'To';

export type TransferAccountType =
    'Cash' | 'Bank' | 'MFS';

export const TRANSFER_ACCOUNT_TYPES:
    TransferAccountType[] =
[
    'Cash',
    'Bank',
    'MFS'
];

// From rows : Cash → Cash; Bank → Bank Transfer / Cheque;
// MFS → MFS
export type TransferMethod =
    'Cash' | 'Bank Transfer' | 'Cheque' | 'MFS' | '';

export interface TransferLine
{
    Side:
        TransferSide;

    AccountType:
        TransferAccountType | string;

    SubGroupCode:
        string;

    SubGroupName:
        string;

    LedgerCode:
        string;

    LedgerName:
        string;

    AccountId:
        number;

    // Branch of the account
    AccountBranch:
        string;

    Amount:
        number;

    ShortNotes:
        string;

    // From rows only
    Method:
        TransferMethod | string;

    // Bank transfer reference / MFS transaction id
    Reference:
        string;

    CheckNo:
        string;

    // yyyy-MM-dd
    CheckDate:
        string;

    // Charge the company pays on top (From Bank / MFS rows)
    ChargeAmount:
        number;
}

export interface TransferEntryData
{
    // yyyy-MM-dd
    VoucherDate:
        string;

    Narration:
        string;

    Lines:
        TransferLine[];
}

export function emptyTransferEntry
(
    voucherDate:
        string
):
    TransferEntryData
{
    return {
        VoucherDate:voucherDate,
        Narration:'',
        Lines:[]
    };
}

// "Cash → Bank", "Bank / MFS → Cash" ... ('' when a side is empty)
export function transferTypeText
(
    lines:
        TransferLine[]
):
    string
{
    const types =
        (side: TransferSide): string =>
            [...new Set(lines.filter(line => line.Side === side).map(line => line.AccountType))]
                .join(' / ');

    const from =
        types('From');

    const to =
        types('To');

    return from && to
        ? `${from} → ${to}`
        : from
            ? `${from} → …`
            : '';
}