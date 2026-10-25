//===============================================================
// Fund Transfer prints : shared helpers
//
// Used by both documents (fund-transfer\ and
// fund-transfer-advice\): data shape, header options, method
// text per From row, and the Dr / Cr lines of the voucher.
//===============================================================

import
{
    FundTransfer
}
from '../models/fund-transfer.model';

import
{
    VoucherLedger,
    CHARGE_EXPENSE_LEDGERS,
    roundMoney
}
from '../../../../shared/components/accounting/accounting.models';

import
{
    TransferLine
}
from '../../../../shared/components/accounting/transfer-entry/transfer-entry.models';

import
{
    VOUCHER_SWITCH
}
from '../../../../shared/components/accounting/voucher-switches';

import
{
    PrintKit
}
from '../../../../shared/print/print.models';


//===============================================================
// Data
//===============================================================

export interface FtPrintData
{
    voucher: FundTransfer;

    // Names of the charge expense ledgers
    ledgers: VoucherLedger[];
}

// Dr / Cr line of the voucher
export interface FtLine
{
    LedgerName: string;
    LedgerCode: string;
    Details: string;
    Notes: string;
    Debit: number;
    Credit: number;
    System: boolean;
}


//===============================================================
// Helpers
//===============================================================

export function headerOptions
(
    kit:
        PrintKit
)
{
    return {
        logo:
            kit.isOn(VOUCHER_SWITCH.PRINT_LOGO, true),

        legal:
            kit.isOn(VOUCHER_SWITCH.PRINT_BIN_TIN, true)
    };
}

export function fromRows
(
    voucher:
        FundTransfer
):
    TransferLine[]
{
    return (voucher.Lines ?? []).filter(line => line.Side === 'From');
}

export function toRows
(
    voucher:
        FundTransfer
):
    TransferLine[]
{
    return (voucher.Lines ?? []).filter(line => line.Side === 'To');
}

export function transferTotal
(
    voucher:
        FundTransfer
):
    number
{
    return roundMoney(
        toRows(voucher).reduce((sum, line) => sum + (Number(line.Amount) || 0), 0)
    );
}

export function chargeTotal
(
    voucher:
        FundTransfer
):
    number
{
    return roundMoney(
        fromRows(voucher).reduce((sum, line) => sum + (Number(line.ChargeAmount) || 0), 0)
    );
}

// FT-010101-2627-10-00007 → FY 2026-2027
export function financialYear
(
    voucherNo:
        string
):
    string
{
    const code =
        (voucherNo ?? '').split('-')[2] ?? '';

    return /^\d{4}$/.test(code)
        ? `FY 20${code.slice(0, 2)}-20${code.slice(2)}`
        : '';
}

export function join
(
    parts:
        (string | number | null | undefined | false)[],
    separator:
        string =
        ' · '
):
    string
{
    return parts
        .filter(part => !!part)
        .map(part => String(part))
        .join(separator);
}

// Account name with its branch when it is not the voucher's
export function accountText
(
    line:
        TransferLine,
    voucher:
        FundTransfer
):
    string
{
    const other =
        line.AccountBranch
        &&
        line.AccountBranch.trim().toUpperCase() !== (voucher.BranchName ?? '').trim().toUpperCase();

    return other
        ? `${line.LedgerName} (${line.AccountBranch})`
        : line.LedgerName;
}

// How the money left a From account
//   Cash          : Cash
//   Bank Transfer : Bank transfer, Ref NPSB 77812
//   Cheque        : Cheque No. 123456 dated 26-Oct-2026
//   MFS           : MFS, Txn ID BK9X2Q
export function methodText
(
    line:
        TransferLine,
    kit:
        PrintKit
):
    string
{
    switch
    (
        line.Method
    )
    {
        case 'Cheque':
            return join(
                [
                    `Cheque No. ${line.CheckNo || '—'}`,
                    line.CheckDate && `dated ${kit.date(line.CheckDate)}`
                ],
                ' '
            );

        case 'Bank Transfer':
            return join(['Bank transfer', line.Reference && `Ref ${line.Reference}`], ', ');

        case 'MFS':
            return join(['MFS', line.Reference && `Txn ID ${line.Reference}`], ', ');

        default:
            return 'Cash';
    }
}

// To rows, charge expense (Dr) | From rows, charges (Cr)
export function voucherLines
(
    data:
        FtPrintData,
    kit:
        PrintKit
):
    FtLine[]
{
    const voucher =
        data.voucher;

    const result:
        FtLine[] =
        [];

    for
    (
        const line of toRows(voucher)
    )
    {
        result.push(
        {
            LedgerName: line.LedgerName,
            LedgerCode: line.LedgerCode,
            Details: join([line.SubGroupName, line.AccountBranch]),
            Notes: line.ShortNotes ?? '',
            Debit: roundMoney(line.Amount),
            Credit: 0,
            System: false
        });
    }

    const byType =
        new Map<string, number>();

    for
    (
        const line of fromRows(voucher)
    )
    {
        if
        (
            (Number(line.ChargeAmount) || 0) > 0
        )
        {
            byType.set(
                String(line.AccountType),
                roundMoney((byType.get(String(line.AccountType)) ?? 0) + Number(line.ChargeAmount))
            );
        }
    }

    for
    (
        const [type, amount] of byType
    )
    {
        const code =
            CHARGE_EXPENSE_LEDGERS[type] ?? '';

        const ledger =
            data.ledgers.find(item => item.LedgerCode === code);

        result.push(
        {
            LedgerName: ledger?.LedgerName || `${type} Charges`,
            LedgerCode: code,
            Details: ledger?.SubGroupName || 'Charges expense',
            Notes: 'Charge',
            Debit: amount,
            Credit: 0,
            System: true
        });
    }

    for
    (
        const line of fromRows(voucher)
    )
    {
        result.push(
        {
            LedgerName: line.LedgerName,
            LedgerCode: line.LedgerCode,
            Details: join([line.SubGroupName, methodText(line, kit)]),
            Notes: line.ShortNotes ?? '',
            Debit: 0,
            Credit: roundMoney(line.Amount),
            System: false
        });
    }

    for
    (
        const line of fromRows(voucher)
    )
    {
        if
        (
            (Number(line.ChargeAmount) || 0) > 0
        )
        {
            result.push(
            {
                LedgerName: line.LedgerName,
                LedgerCode: line.LedgerCode,
                Details: `${line.AccountType} charge · paid by the company`,
                Notes: 'Charge',
                Debit: 0,
                Credit: roundMoney(line.ChargeAmount),
                System: true
            });
        }
    }

    return result;
}