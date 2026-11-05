//===============================================================
// CHECK RECONCILIATION VOUCHER print : adapter (RRV / RRP)
//
// Maps a voucher posted by Check Reconciliation into the shared
// voucher print model (same design as every voucher :
// shared/print/templates/voucher/). Titled as what it is :
//   RRV clearing  → Receipt Voucher
//   RRP clearing  → Payment Voucher
//   RRV dishonour → Journal Voucher (bank fee / recovery)
// The info strip says the Source (Check Clearing / Check
// Dishonour); each check's group row names its check and the
// voucher it came from. Charge rows print as system rows.
//===============================================================

import
{
    CheckClearingVoucher,
    CheckClearingVoucherLine
}
from '../../models/check-reconciliations.model';

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

export interface CheckClearingPrintData
{
    voucher:
        CheckClearingVoucher;
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

// RRV / RRP + purpose → title
export function checkClearingTitle
(
    voucher:
        CheckClearingVoucher
):
    string
{
    if
    (
        voucher.Purpose === 'Dishonour'
    )
    {
        return 'Journal Voucher';
    }

    return voucher.VoucherType === 'RRP'
        ? 'Payment Voucher'
        : 'Receipt Voucher';
}

// Source line of the info strip
export function checkClearingSource
(
    voucher:
        CheckClearingVoucher
):
    string
{
    return voucher.Purpose === 'Dishonour'
        ? 'Check Dishonour'
        : 'Check Clearing';
}

export function checkClearingModel
(
    data:
        CheckClearingPrintData,
    kit:
        PrintKit
):
    VoucherPrintModel
{
    const voucher =
        data.voucher;

    const dishonour =
        voucher.Purpose === 'Dishonour';

    const source:
        CheckClearingVoucherLine[] =
        [...(voucher.Lines ?? [])].sort((a, b) => a.LineNo - b.LineNo);

    // Check no → the voucher it came from (RV / PV no)
    const origin =
        new Map(
            (voucher.Sources ?? []).map(item => [item.CheckNo, item.SourceVoucherNo]));

    const from =
        (checkNo: string): string =>
            origin.get(checkNo)
                ? ` · ${origin.get(checkNo)}`
                : '';

    // Group label : the check and its amount (clearing) or the
    // part (dishonour : fee / recovery)
    const groupLabel =
        (line: CheckClearingVoucherLine): string =>
        {
            const rows =
                source.filter(row => row.GroupNo === line.GroupNo);

            if
            (
                dishonour
            )
            {
                const recovery =
                    rows.some(row => !!row.PartyCode);

                const amount =
                    roundMoney(rows.reduce((sum, row) => sum + (Number(row.Debit) || 0), 0));

                return `Check ${line.CheckNo}${from(line.CheckNo)} · ${recovery ? 'Recovery from customer' : 'Bank fee'} · Tk ${kit.money(amount)}`;
            }

            const amount =
                roundMoney(
                    rows
                        .filter(row => !row.IsCharge)
                        .reduce((sum, row) => sum + (Number(row.Debit) || 0), 0));

            return `Check ${line.CheckNo}${from(line.CheckNo)} · Tk ${kit.money(amount)}`;
        };

    // Short Notes : what the row is (the group row names the check)
    const shortNote =
        (line: CheckClearingVoucherLine): string =>
        {
            if
            (
                dishonour
            )
            {
                return line.PartyCode
                    ? 'Charged to customer'
                    : line.Credit > 0 && line.LedgerCode !== voucher.BankLedgerCode
                        ? 'Recovery income'
                        : line.Debit > 0
                            ? 'Bank fee'
                            : 'Paid from bank';
            }

            if
            (
                line.IsCharge
            )
            {
                return 'Bank charge';
            }

            if
            (
                line.LedgerCode === voucher.BankLedgerCode
            )
            {
                return voucher.VoucherType === 'RRP'
                    ? 'Check paid by bank'
                    : 'Check realised';
            }

            return voucher.VoucherType === 'RRP'
                ? 'Paid by check'
                : 'Received by check';
        };

    const several =
        new Set(source.map(line => line.GroupNo)).size > 1
        ||
        !dishonour;

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
                // Dishonour : every row is a charge row; keep SL
                system:!dishonour && !!line.IsCharge,
                group:several ? groupLabel(line) : ''
            })
        );

    // Bar : the checks cleared (charges are rows of their own) /
    // the dishonour charges
    const total =
        dishonour
            ? roundMoney(lines.reduce((sum, line) => sum + line.debit, 0))
            : roundMoney(
                source
                    .filter(line => !line.IsCharge)
                    .reduce((sum, line) => sum + (Number(line.Debit) || 0), 0));

    const status =
        String(voucher.Status ?? '');

    // Source : Check Clearing · RV-…-00009 (one voucher), or the
    // count when the checks came from several
    const origins =
        [...new Set((voucher.Sources ?? []).map(item => item.SourceVoucherNo).filter(no => !!no))];

    const sourceText =
        origins.length === 1
            ? `${checkClearingSource(voucher)} · ${origins[0]}`
            : origins.length > 1
                ? `${checkClearingSource(voucher)} · ${origins.length} vouchers`
                : checkClearingSource(voucher);

    const meta =
    [
        { label:'Voucher Date', value:kit.date(voucher.VoucherDate) },
        { label:'Branch', value:voucher.BranchName },
        { label:'Financial Year', value:financialYear(voucher.VoucherNo) },
        { label:'Bank Account', value:voucher.BankLedgerName },
        { label:'Source', value:sourceText }
    ];

    const title =
        checkClearingTitle(voucher);

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
                !dishonour && voucher.Charges > 0
                    ? `Bank charges Tk ${kit.money(voucher.Charges)} are included.`
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
        totalLabel:dishonour ? 'Total Amount' : (voucher.VoucherType === 'RRP' ? 'Total Paid' : 'Total Received'),
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
                : 'Check Clearing',
        sheetInfo:
        [
            { label:'Voucher No', value:voucher.VoucherNo },
            ...meta,
            { label:'Status', value:status },
            { label:'Checks', value:String(voucher.CheckCount || 0) },
            {
                label:'Source Vouchers',
                value:(voucher.Sources ?? [])
                    .map(item => `${item.CheckNo} : ${item.SourceVoucherNo}`)
                    .join(', ')
            }
        ]
    };
}