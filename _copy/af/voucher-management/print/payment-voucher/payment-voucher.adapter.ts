//===============================================================
// PAYMENT VOUCHER print : adapter
//
// Maps a Payment Voucher into the shared voucher print model.
// The design is shared by every voucher :
//   shared/print/templates/voucher/  (template, styles, Excel)
// Only the wording, fields and switches of the Payment Voucher
// are decided here.
//===============================================================

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
    VoucherPrintModel
}
from '../../../../../shared/print/templates/voucher/voucher-print.model';

import
{
    PvPrintData,
    voucherLines,
    headerOptions,
    financialYear,
    modes
}
from '../payment-voucher-print.helpers';


export function paymentVoucherModel
(
    data:
        PvPrintData,
    kit:
        PrintKit
):
    VoucherPrintModel
{
    const voucher =
        data.voucher;

    const lines =
        voucherLines(
            data,
            kit
        );

    const total =
        roundMoney(lines.reduce((sum, line) => sum + line.Debit, 0));

    const status =
        String(voucher.Status ?? '');

    const options =
        headerOptions(kit);

    const hasCheck =
        (voucher.Credits ?? []).some
        (
            line =>
                line.Mode === 'Check'
        );

    const meta =
    [
        { label:'Voucher Date', value:kit.date(voucher.VoucherDate) },
        { label:'Branch', value:voucher.BranchName },
        { label:'Financial Year', value:financialYear(voucher.VoucherNo) },
        { label:'Payment Mode', value:modes(voucher) },
        { label:'Ledger Type', value:voucher.LedgerType }
    ];

    return {
        title:'Payment Voucher',

        copy:'Office Copy',

        numberLabel:'Voucher No',

        number:voucher.VoucherNo,

        meta,

        status,

        // QR : plain text any phone can read
        qr:
            [
                kit.company?.CompanyName || 'AppCore ERP',
                'Payment Voucher',
                voucher.VoucherNo,
                kit.date(voucher.VoucherDate),
                `Tk ${kit.money(total)}`,
                status
            ]
            .filter(part => !!part)
            .join(' | '),

        logo:options.logo,

        legal:options.legal,

        totalLabel:'Total Paid',

        total,

        lines:lines.map
        (
            line =>
            ({
                name:line.LedgerName,
                code:line.LedgerCode,
                details:line.Details,
                notes:line.Notes,
                debit:line.Debit,
                credit:line.Credit,
                system:line.System
            })
        ),

        showCodes:
            kit.isOn(VOUCHER_SWITCH.PV_PRINT_LEDGER_CODES, true),

        narration:voucher.Narration,

        notes:
        [
            {
                text:hasCheck ? 'Check rows post to the ledger when the check clears (Check Reconciliation).' : '',
                tone:'warn'
            },
            {
                text:status === 'Cancelled' && voucher.CancelReason
                    ? `Cancelled on ${kit.date(voucher.CancelDate)} : ${voucher.CancelReason}`
                    : '',
                tone:'danger'
            }
        ],

        workflow:
            kit.isOn(VOUCHER_SWITCH.PV_PRINT_WORKFLOW_DATES, true)
                ? [
                    { label:'Created', value:kit.dateTime(voucher.CreatedDate), tone:'done' },
                    { label:'Approved', value:kit.dateTime(voucher.ApprovedDate), tone:'done' },
                    { label:'Posted', value:kit.dateTime(voucher.PostedDate), tone:'final' },
                    { label:'Cancelled', value:kit.dateTime(voucher.CancelledDate), tone:'cancel' }
                ]
                : [],

        signatures:['Prepared By', 'Checked By', 'Approved By', "Receiver's Signature"],

        stamp:
            kit.isOn(VOUCHER_SWITCH.PRINT_STAMP, true)
                ? `${voucher.BranchName ? voucher.BranchName + ' · ' : ''}Printed ${kit.now()}`
                : '',

        watermark:
            status === 'Cancelled'
                ? 'CANCELLED'
                : '',

        sheetName:
            voucher.VoucherNo
                ? `PV ${voucher.VoucherNo.split('-').slice(-2).join('-')}`
                : 'Payment Voucher',

        sheetInfo:
        [
            { label:'Voucher No', value:voucher.VoucherNo },
            ...meta,
            { label:'Status', value:status },
            { label:'Paid To', value:voucher.PartyName }
        ]
    };
}