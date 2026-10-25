//===============================================================
// MFS RECONCILIATION VOUCHER print : adapter (RRV)
//
// Maps a voucher posted by MFS Reconciliation into the shared
// voucher print model (same design as every voucher :
// shared/print/templates/voucher/). Titled as what it is :
//   Settlement → Receipt Voucher (Dr bank + Dr MFS Charges /
//                Cr wallet)
//   Reject     → Journal Voucher (Dr customer [+ Dr recovery] /
//                Cr wallet)
// The info strip names the wallet and the source; each
// transaction's group row names its Txn ID and the Receipt
// Voucher it came from. Fee / recovery rows print as system rows.
//===============================================================

import
{
    MfsReconciliationVoucher,
    MfsReconciliationVoucherLine
}
from '../../models/mfs-reconciliations.model';

import
{
    roundMoney
}
from '../../../../../shared/components/accounting/accounting.models';

import
{
    VOUCHER_SWITCH
}
from '../../../../../shared/components/accounting/voucher-switches';

import
{
    PrintKit
}
from '../../../../../shared/print/print.models';

import
{
    VoucherPrintLine,
    VoucherPrintModel
}
from '../../../../../shared/print/templates/voucher/voucher-print.model';


//===============================================================
// Data
//===============================================================

export interface MfsVoucherPrintData
{
    voucher:
        MfsReconciliationVoucher;
}

// RRV-010101-2627-10-00007 → FY 2026-2027
function financialYear
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

export function mfsVoucherTitle
(
    voucher:
        MfsReconciliationVoucher
):
    string
{
    return voucher.Purpose === 'Reject'
        ? 'Journal Voucher'
        : 'Receipt Voucher';
}

export function mfsVoucherModel
(
    data:
        MfsVoucherPrintData,
    kit:
        PrintKit
):
    VoucherPrintModel
{
    const voucher =
        data.voucher;

    const reject =
        voucher.Purpose === 'Reject';

    const source:
        MfsReconciliationVoucherLine[] =
        [...(voucher.Lines ?? [])].sort((a, b) => a.LineNo - b.LineNo);

    // Txn ID → the Receipt Voucher it came from
    const origin =
        new Map(
            (voucher.Sources ?? []).map(item => [item.TransactionRef, item.SourceVoucherNo]));

    // Charge audit : transactions whose charges the user changed
    const adjusted =
        reject
            ? []
            : (voucher.Sources ?? []).filter(item => !!item.FeeEdited);

    const adjustedRefs =
        new Set(adjusted.map(item => item.TransactionRef));

    const from =
        (ref: string): string =>
            origin.get(ref)
                ? ` · ${origin.get(ref)}`
                : '';

    // Group label : the transaction and its gross
    const groupLabel =
        (line: MfsReconciliationVoucherLine): string =>
        {
            const gross =
                roundMoney(
                    source
                        .filter(row => row.GroupNo === line.GroupNo)
                        .reduce((sum, row) => sum + (Number(row.Credit) || 0), 0));

            return `${line.TransactionRef ? `Txn ${line.TransactionRef}` : 'MFS receipt'}${from(line.TransactionRef)} · Tk ${kit.money(gross)}`;
        };

    // Short Notes : what the row is (the group row names the txn)
    const shortNote =
        (line: MfsReconciliationVoucherLine): string =>
        {
            if
            (
                line.LedgerCode === voucher.WalletCode
            )
            {
                return reject
                    ? 'Reversed out of the wallet'
                    : 'Settled out of the wallet';
            }

            if
            (
                reject
            )
            {
                return line.IsCharge
                    ? 'Charge recovery reversed'
                    : 'Charged back to customer';
            }

            return line.IsCharge
                ? (adjustedRefs.has(line.TransactionRef) ? 'MFS fee' + ' (adjusted)' : 'MFS fee')
                : 'Received in bank';
        };

    const lines:
        VoucherPrintLine[] =
        source.map
        (
            line =>
            ({
                name:line.LedgerName,
                code:line.LedgerCode,
                details:[line.PartyCode, line.SubGroupName].filter(part => !!part).join(' · '),
                notes:shortNote(line),
                debit:roundMoney(line.Debit),
                credit:roundMoney(line.Credit),
                system:!!line.IsCharge,
                group:groupLabel(line)
            })
        );

    // Bar : what left the wallet
    const total =
        roundMoney(lines.reduce((sum, line) => sum + line.credit, 0));

    const status =
        String(voucher.Status ?? '');

    const origins =
        [...new Set((voucher.Sources ?? []).map(item => item.SourceVoucherNo).filter(no => !!no))];

    const kind =
        reject
            ? 'MFS Reject'
            : (voucher.IsAuto ? 'MFS Auto Settlement' : 'MFS Settlement');

    const sourceText =
        origins.length === 1
            ? `${kind} · ${origins[0]}`
            : origins.length > 1
                ? `${kind} · ${origins.length} vouchers`
                : kind;

    const meta =
    [
        { label:'Voucher Date', value:kit.date(voucher.VoucherDate) },
        { label:'Branch', value:voucher.BranchName },
        { label:'Financial Year', value:financialYear(voucher.VoucherNo) },
        { label:'MFS Wallet', value:voucher.WalletName },
        ...(reject ? [] : [{ label:'Bank Account', value:voucher.BankLedgerName }]),
        { label:'Source', value:sourceText }
    ];

    const title =
        mfsVoucherTitle(voucher);

    const notes =
    [
        {
            text:
                status === 'Reversed'
                    ? `Reversed on ${kit.date(voucher.ReversedDate)}${voucher.ReverseReason ? ` : ${voucher.ReverseReason}` : ''}`
                    : '',
            tone:'danger' as const
        },
        {
            text:
                !reject && voucher.Charges > 0
                    ? `MFS fee Tk ${kit.money(voucher.Charges)} included; Tk ${kit.money(voucher.NetAmount)} into the bank.`
                    : '',
            tone:'warn' as const
        },
        {
            text:
                adjusted.length > 0
                    ? 'Adjusted charges : '
                        + adjusted
                            .map(item => `Txn ${item.TransactionRef || '—'} Tk ${kit.money(item.StandardFee)} → Tk ${kit.money(item.Fee)} (${item.FeeReason})`)
                            .join('; ')
                    : '',
            tone:'warn' as const
        }
    ];

    return {
        title,
        copy:'Office Copy',
        numberLabel:'Voucher No',
        number:voucher.VoucherNo,
        meta,
        status,
        qr:
            [
                kit.company?.CompanyName || 'AppCore ERP',
                title,
                voucher.VoucherNo,
                kit.date(voucher.VoucherDate),
                `Tk ${kit.money(total)}`,
                status
            ]
            .filter(part => !!part)
            .join(' | '),
        logo:kit.isOn(VOUCHER_SWITCH.PRINT_LOGO, true),
        legal:kit.isOn(VOUCHER_SWITCH.PRINT_BIN_TIN, true),
        totalLabel:reject ? 'Total Amount' : 'Total Settled',
        total,
        lines,
        showCodes:true,
        narration:voucher.Narration,
        notes,
        workflow:[],
        signatures:['Prepared By', 'Checked By', 'Approved By', 'Authorised Signature'],
        stamp:
            kit.isOn(VOUCHER_SWITCH.PRINT_STAMP, true)
                ? `${voucher.BranchName ? voucher.BranchName + ' · ' : ''}Printed ${kit.now()}`
                : '',
        watermark:
            status === 'Reversed'
                ? 'REVERSED'
                : '',
        sheetName:
            voucher.VoucherNo
                ? `${voucher.VoucherType} ${voucher.VoucherNo.split('-').slice(-2).join('-')}`
                : 'MFS Reconciliation',
        sheetInfo:
        [
            { label:'Voucher No', value:voucher.VoucherNo },
            ...meta,
            { label:'Status', value:status },
            { label:'Transactions', value:String(voucher.TransactionCount || 0) },
            {
                label:'Source Vouchers',
                value:(voucher.Sources ?? [])
                    .map(item => `${item.TransactionRef || '—'} : ${item.SourceVoucherNo}`)
                    .join(', ')
            }
        ]
    };
}