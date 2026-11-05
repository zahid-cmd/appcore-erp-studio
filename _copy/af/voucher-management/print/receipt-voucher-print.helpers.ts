//===============================================================
// Receipt Voucher prints : shared helpers
//
// Used by both documents (receipt-voucher\ and money-receipt\):
// data shape, charges, totals, "vide" / detail text per mode,
// header options and the "Printed on" stamp (switches), and the
// Dr / Cr lines of the voucher.
//===============================================================

import
{
    ReceiptVoucher
}
from '../models/receipt-voucher.model';

import
{
    VoucherLedger,
    VoucherDebitLine,
    CHARGE_RECOVERY_LEDGERS,
    roundMoney
}
from '../../../../shared/components/accounting/accounting.models';

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

export interface RvPrintData
{
    voucher: ReceiptVoucher;

    // Names of the charge recovery ledgers
    ledgers: VoucherLedger[];
}

// Dr / Cr line of the voucher
export interface RvLine
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
// Shared helpers
//===============================================================

// Header options from the "Voucher Print" switches
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

// "Printed on" stamp (switch : Voucher Print : Show Printed On)
export function stamp
(
    kit:
        PrintKit,
    text:
        string
):
    string
{
    return kit.isOn(VOUCHER_SWITCH.PRINT_STAMP, true)
        ? `<div class="pv-printed">${kit.escape(text)}</div>`
        : '';
}

export function customerCharges
(
    voucher:
        ReceiptVoucher
):
    VoucherDebitLine[]
{
    return (voucher.Debits ?? []).filter
    (
        line =>
            line.ChargeBorneBy === 'Customer'
            &&
            (Number(line.ChargeAmount) || 0) > 0
    );
}

export function chargeTotal
(
    voucher:
        ReceiptVoucher
):
    number
{
    return roundMoney(
        customerCharges(voucher).reduce
        (
            (sum, line) =>
                sum + (Number(line.ChargeAmount) || 0),
            0
        )
    );
}

export function receivedTotal
(
    voucher:
        ReceiptVoucher
):
    number
{
    return roundMoney(
        (voucher.Debits ?? []).reduce
        (
            (sum, line) =>
                sum + (Number(line.Amount) || 0),
            0
        )
    );
}

// RV-010101-2627-10-00007 → FY 2026-2027
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

export function modes
(
    voucher:
        ReceiptVoucher
):
    string
{
    return [...new Set((voucher.Debits ?? []).map(line => line.Mode))]
        .join(', ');
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

// Detail line under a money ledger on the voucher
export function modeDetails
(
    line:
        VoucherDebitLine,
    kit:
        PrintKit
):
    string
{
    switch
    (
        line.Mode
    )
    {
        case 'Check':
            return join([
                `Check No ${line.CheckNo || '—'}`,
                line.CheckDate && kit.date(line.CheckDate),
                line.CheckBank
            ]);

        case 'MFS':
            return line.TransactionRef ? `Txn ${line.TransactionRef}` : 'MFS';

        case 'POS':
            return join([
                line.CardName,
                line.TransactionRef && `Card No. **** ${line.TransactionRef}`
            ]);

        case 'EMI':
            return join([
                line.CardName,
                line.TenureMonths && `${line.TenureMonths} months`,
                line.TotalCharged && `Total charged ${kit.money(line.TotalCharged)}`
            ]);

        default:
            return line.Mode;
    }
}

// "vide" phrase of the money receipt
export function videText
(
    line:
        VoucherDebitLine,
    kit:
        PrintKit
):
    string
{
    switch
    (
        line.Mode
    )
    {
        case 'Cash':
            return 'Cash';

        case 'Bank':
            return `Bank deposit / transfer to ${line.LedgerName}`;

        case 'Check':
            return join(
                [
                    `Cheque No. ${line.CheckNo || '—'}`,
                    line.CheckDate && `dated ${kit.date(line.CheckDate)}`,
                    line.CheckBank && `drawn on ${line.CheckBank}`
                ],
                ' '
            );

        case 'MFS':
            return join(
                [
                    `MFS (${line.LedgerName})`,
                    line.TransactionRef && `Txn ID ${line.TransactionRef}`
                ],
                ', '
            );

        case 'POS':
            return join(
                [
                    `Card${line.CardName ? ` (${line.CardName})` : ''} via ${line.LedgerName}`,
                    line.TransactionRef && `Card Number **** ${line.TransactionRef}`
                ],
                ', '
            );

        case 'EMI':
            return join(
                [
                    `EMI${line.CardName ? ` on ${line.CardName}` : ''} via ${line.LedgerName}`,
                    line.TenureMonths && `${line.TenureMonths} months`
                ],
                ', '
            );

        default:
            return line.LedgerName;
    }
}

// Debits (money + customer charges), then credits (parties /
// GL + charge recovery)
export function voucherLines
(
    data:
        RvPrintData,
    kit:
        PrintKit
):
    RvLine[]
{
    const voucher =
        data.voucher;

    const charges =
        customerCharges(
            voucher
        );

    const result:
        RvLine[] =
        [];

    for
    (
        const line of voucher.Debits ?? []
    )
    {
        result.push(
        {
            LedgerName: line.LedgerName,
            LedgerCode: line.LedgerCode,
            Details: join([line.SubGroupName, modeDetails(line, kit)]),
            Notes: line.ShortNotes ?? '',
            Debit: roundMoney(line.Amount),
            Credit: 0,
            System: false
        });
    }

    for
    (
        const line of charges
    )
    {
        result.push(
        {
            LedgerName: line.LedgerName,
            LedgerCode: line.LedgerCode,
            Details: `${line.Mode} charge${line.ChargePercent ? ` (${line.ChargePercent}%)` : ''} · paid by customer`,
            Notes: 'Charge',
            Debit: roundMoney(line.ChargeAmount),
            Credit: 0,
            System: true
        });
    }

    for
    (
        const line of voucher.Credits ?? []
    )
    {
        result.push(
        {
            LedgerName: line.LedgerName,
            LedgerCode: line.LedgerCode,
            Details: join([line.PartyCode, line.SubGroupName]),
            Notes: line.ShortNotes ?? '',
            Debit: 0,
            Credit: roundMoney(line.Amount),
            System: false
        });
    }

    const byMode =
        new Map<string, number>();

    for
    (
        const line of charges
    )
    {
        byMode.set(
            line.Mode,
            roundMoney(
                (byMode.get(line.Mode) ?? 0) + (Number(line.ChargeAmount) || 0)
            )
        );
    }

    for
    (
        const [mode, amount] of byMode
    )
    {
        const code =
            CHARGE_RECOVERY_LEDGERS[mode] ?? '';

        const ledger =
            data.ledgers.find
            (
                item =>
                    item.LedgerCode === code
            );

        result.push(
        {
            LedgerName: ledger?.LedgerName || `${mode} Charges Recovery`,
            LedgerCode: code,
            Details: ledger?.SubGroupName || 'Charges recovery',
            Notes: 'Charge',
            Debit: 0,
            Credit: amount,
            System: true
        });
    }

    return result;
}