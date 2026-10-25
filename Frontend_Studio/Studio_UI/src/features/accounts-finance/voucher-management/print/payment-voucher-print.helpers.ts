//===============================================================
// Payment Voucher prints : shared helpers
//
// Used by both documents (payment-voucher\ and payment-slip\):
// data shape, company charges, totals, "vide" / detail text per
// mode, header options, and the Dr / Cr lines of the voucher.
//
// On the Payment Voucher (server shape) :
//   voucher.Debits  = Pay To rows   (supplier / customer / GL)
//   voucher.Credits = Payment Mode rows (Cash / Bank / Check /
//                     MFS, with the step 2 details)
//===============================================================

import
{
    PaymentVoucher
}
from '../models/payment-voucher.model';

import
{
    VoucherLedger,
    VoucherDebitLine,
    CHARGE_EXPENSE_LEDGERS,
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

export interface PvPrintData
{
    voucher: PaymentVoucher;

    // Names of the charge expense ledgers
    ledgers: VoucherLedger[];
}

// Dr / Cr line of the voucher
export interface PvLine
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

// Payment Mode rows (the money side)
export function moneyRows
(
    voucher:
        PaymentVoucher
):
    VoucherDebitLine[]
{
    return voucher.Credits ?? [];
}

// Charge of a row borne by the company ('' otherwise : 0)
export function companyCharge
(
    line:
        VoucherDebitLine
):
    number
{
    return line.ChargeBorneBy === 'Company'
        ? roundMoney(Number(line.ChargeAmount) || 0)
        : 0;
}

// Charge of a row borne by the payee (taken out of the transfer)
export function payeeCharge
(
    line:
        VoucherDebitLine
):
    number
{
    return line.ChargeBorneBy === 'Payee'
        ? roundMoney(Number(line.ChargeAmount) || 0)
        : 0;
}

export function companyCharges
(
    voucher:
        PaymentVoucher
):
    VoucherDebitLine[]
{
    return moneyRows(voucher).filter
    (
        line =>
            companyCharge(line) > 0
    );
}

export function paidTotal
(
    voucher:
        PaymentVoucher
):
    number
{
    return roundMoney(
        moneyRows(voucher).reduce
        (
            (sum, line) =>
                sum + (Number(line.Amount) || 0),
            0
        )
    );
}

// PV-010101-2627-10-00007 → FY 2026-2027
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
        PaymentVoucher
):
    string
{
    return [...new Set(moneyRows(voucher).map(line => line.Mode))]
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
        case 'Bank':
            return line.TransactionRef ? `Ref ${line.TransactionRef}` : 'Bank transfer';

        case 'Check':
            return join([
                `Check No ${line.CheckNo || '—'}`,
                line.CheckDate && kit.date(line.CheckDate),
                line.PayeeName && `Pay to ${line.PayeeName}`
            ]);

        case 'MFS':
            return join([
                line.TransactionRef ? `Txn ${line.TransactionRef}` : 'MFS',
                line.PayeeAccount && `To ${line.PayeeAccount}`
            ]);

        default:
            return line.Mode;
    }
}

// "vide" phrase of the payment slip
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
            return join(
                [
                    `Bank transfer from ${line.LedgerName}`,
                    line.TransactionRef && `Ref ${line.TransactionRef}`
                ],
                ', '
            );

        case 'Check':
            return join(
                [
                    `Cheque No. ${line.CheckNo || '—'}`,
                    line.CheckDate && `dated ${kit.date(line.CheckDate)}`,
                    `drawn on ${line.CheckBank || line.LedgerName}`
                ],
                ' '
            );

        case 'MFS':
            return join(
                [
                    `MFS (${line.LedgerName})`,
                    line.PayeeAccount && `to ${line.PayeeAccount}`,
                    line.TransactionRef && `Txn ID ${line.TransactionRef}`
                ],
                ', '
            );

        default:
            return line.LedgerName;
    }
}

// Debits (Pay To + charge expense), then credits (money
// accounts + the charges they also pay out)
export function voucherLines
(
    data:
        PvPrintData,
    kit:
        PrintKit
):
    PvLine[]
{
    const voucher =
        data.voucher;

    const charges =
        companyCharges(
            voucher
        );

    const result:
        PvLine[] =
        [];

    //-----------------------------------------------------------
    // Debits : Pay To
    //-----------------------------------------------------------

    for
    (
        const line of voucher.Debits ?? []
    )
    {
        result.push(
        {
            LedgerName: line.LedgerName,
            LedgerCode: line.LedgerCode,
            Details: join([line.PartyCode, line.SubGroupName]),
            Notes: line.ShortNotes ?? '',
            Debit: roundMoney(line.Amount),
            Credit: 0,
            System: false
        });
    }

    //-----------------------------------------------------------
    // Debits : charge expense (borne by the company), per mode
    //-----------------------------------------------------------

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
                (byMode.get(line.Mode) ?? 0) + companyCharge(line)
            )
        );
    }

    for
    (
        const [mode, amount] of byMode
    )
    {
        const code =
            CHARGE_EXPENSE_LEDGERS[mode] ?? '';

        const ledger =
            data.ledgers.find
            (
                item =>
                    item.LedgerCode === code
            );

        result.push(
        {
            LedgerName: ledger?.LedgerName || `${mode} Charges`,
            LedgerCode: code,
            Details: ledger?.SubGroupName || 'Charges expense',
            Notes: 'Charge',
            Debit: amount,
            Credit: 0,
            System: true
        });
    }

    //-----------------------------------------------------------
    // Credits : money accounts
    //-----------------------------------------------------------

    for
    (
        const line of moneyRows(voucher)
    )
    {
        result.push(
        {
            LedgerName: line.LedgerName,
            LedgerCode: line.LedgerCode,
            Details: join([line.SubGroupName, modeDetails(line, kit)]),
            Notes: line.ShortNotes ?? '',
            Debit: 0,
            Credit: roundMoney(line.Amount),
            System: false
        });
    }

    //-----------------------------------------------------------
    // Credits : the charge each account also pays out
    //-----------------------------------------------------------

    for
    (
        const line of charges
    )
    {
        result.push(
        {
            LedgerName: line.LedgerName,
            LedgerCode: line.LedgerCode,
            Details: `${line.Mode} charge${line.ChargePercent ? ` (${line.ChargePercent}%)` : ''} · borne by the company`,
            Notes: 'Charge',
            Debit: 0,
            Credit: companyCharge(line),
            System: true
        });
    }

    return result;
}