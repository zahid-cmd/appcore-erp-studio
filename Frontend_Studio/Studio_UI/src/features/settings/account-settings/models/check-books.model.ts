//===============================================================
// Check Books (Settings > Account Settings, hand-written page)
//
// A check book of one of our bank accounts (Payment = Yes) : a
// range of leaves, one row per leaf with its status. Dates are
// "yyyy-MM-dd" text.
//===============================================================

export type CheckLeafStatus =
    'Unused' | 'Issued' | 'Cancelled' | 'Lost' | 'Void';

export interface CheckBookListItem
{
    PublicId: string;
    Code: string;
    BankAccountId: number;
    BankAccountName: string;
    Bank: string;
    AccountNumber: string;
    BookNo: string;
    FirstCheckNo: string;
    LastCheckNo: string;
    LeafCount: number;
    Unused: number;
    Issued: number;
    Cancelled: number;
    Lost: number;
    Void: number;
    NextCheckNo: string;
    ReceivedDate: string;
    IsActive: boolean;
    AccountUnused: number;
    LowLeaf: boolean;
}

export interface CheckBookLeaf
{
    CheckBookLeafId: number;
    LeafNo: number;
    CheckNo: string;
    Status: CheckLeafStatus;
    SourceType: string;
    SourceNo: string;
    PayeeName: string;
    Amount: number;
    IssuedDate: string;
    Reason: string;
    StatusDate: string;
}

export interface CheckBook
{
    CheckBookId: number;
    PublicId: string;
    Code: string;
    BankAccountId: number;
    BankAccountName: string;
    Bank: string;
    AccountNumber: string;
    BookNo: string;
    Prefix: string;
    // As typed : leading zeros set the width of the numbers
    StartNo: string;
    EndNo: string;
    LeafCount: number;
    ReceivedDate: string;
    Remarks: string;
    IsActive: boolean;
    // A leaf is used : account, prefix and range are fixed
    RangeLocked: boolean;
    Leaves: CheckBookLeaf[];
}

export interface CheckBookBankAccount
{
    BankAccountId: number;
    Code: string;
    Name: string;
    Bank: string;
    AccountNumber: string;
    UnusedLeaves: number;
    LowLeaf: boolean;
    SuggestedStartNo: string;
    SuggestedPrefix: string;
}

export interface CheckBookDefaults
{
    NextCode: string;
    // 0 = the warning is off
    LowLeafThreshold: number;
    AllowChooseLeaf: boolean;
    BankAccounts: CheckBookBankAccount[];
}

export interface CheckLeafOption
{
    CheckBookLeafId: number;
    CheckNo: string;
    BookCode: string;
}

// For the vouchers (Payment Voucher, Fund Transfer)
export interface AvailableCheckLeaves
{
    BankAccountId: number;
    // false : the account has no check book (free check numbers)
    HasBooks: boolean;
    AllowChooseLeaf: boolean;
    LowLeafThreshold: number;
    LowLeaf: boolean;
    UnusedLeaves: number;
    Leaves: CheckLeafOption[];
}

export const CHECK_LEAF_STATUSES: CheckLeafStatus[] =
    ['Unused', 'Issued', 'Cancelled', 'Lost', 'Void'];

// The check number : prefix + the number padded to the width of
// the typed first number (the server does the same)
export function checkNumber(prefix: string, start: string, offset: number): string
{
    const digits =
        (start ?? '').trim();

    if (!/^\d{1,15}$/.test(digits))
    {
        return '';
    }

    const value =
        // 15 digits stay below 2^53 : safe as a number
        String(Number(digits) + offset);

    return (prefix ?? '').trim().toUpperCase() + value.padStart(digits.length, '0');
}

export function todayText(): string
{
    const d =
        new Date();

    const pad =
        (n: number) => String(n).padStart(2, '0');

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function textToDate(value: string): Date | null
{
    const m =
        /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');

    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

export function dateToText(value: Date | null): string
{
    if (!value || isNaN(value.getTime()))
    {
        return '';
    }

    const pad =
        (n: number) => String(n).padStart(2, '0');

    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

// "2026-11-15" -> "15-Nov-2026"
export function showDay(value: string): string
{
    const d =
        textToDate(value);

    if (!d)
    {
        return '';
    }

    const months =
        ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
}
