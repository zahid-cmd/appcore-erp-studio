//===============================================================
// FUND TRANSFER print : adapter
//
// Maps a Fund Transfer into the shared voucher print model.
// The design is shared by every voucher :
//   shared/print/templates/voucher/  (template, styles, Excel)
// Only the wording, fields and switches of the Fund Transfer
// are decided here.
//===============================================================

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
    FtPrintData,
    voucherLines,
    headerOptions,
    financialYear,
    fromRows,
    transferTotal
}
from '../fund-transfer-print.helpers';


export function fundTransferModel
(
    data:
        FtPrintData,
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

    // The amount moved (charges are listed in the table)
    const total =
        transferTotal(voucher);

    const status =
        String(voucher.Status ?? '');

    const options =
        headerOptions(kit);

    const meta =
    [
        { label:'Voucher Date', value:kit.date(voucher.VoucherDate) },
        { label:'Branch', value:voucher.BranchName },
        { label:'Financial Year', value:financialYear(voucher.VoucherNo) },
        { label:'Transfer Type', value:voucher.TransferType },
        { label:'Method', value:[...new Set(fromRows(voucher).map(line => line.Method))].join(', ') }
    ];

    return {
        title:'Fund Transfer',

        copy:'Office Copy',

        numberLabel:'Voucher No',

        number:voucher.VoucherNo,

        meta,

        status,

        // QR : plain text any phone can read
        qr:
            [
                kit.company?.CompanyName || 'AppCore ERP',
                'Fund Transfer',
                voucher.VoucherNo,
                kit.date(voucher.VoucherDate),
                `Tk ${kit.money(total)}`,
                status
            ]
            .filter(part => !!part)
            .join(' | '),

        logo:options.logo,

        legal:options.legal,

        totalLabel:'Amount Transferred',

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
            kit.isOn(VOUCHER_SWITCH.FT_PRINT_LEDGER_CODES, true),

        narration:voucher.Narration,

        notes:
        [
            {
                text:status === 'Cancelled' && voucher.CancelReason
                    ? `Cancelled on ${kit.date(voucher.CancelDate)} : ${voucher.CancelReason}`
                    : '',
                tone:'danger'
            }
        ],

        workflow:
            kit.isOn(VOUCHER_SWITCH.FT_PRINT_WORKFLOW_DATES, true)
                ? [
                    { label:'Created', value:kit.dateTime(voucher.CreatedDate), tone:'done' },
                    { label:'Approved', value:kit.dateTime(voucher.ApprovedDate), tone:'done' },
                    { label:'Posted', value:kit.dateTime(voucher.PostedDate), tone:'final' },
                    { label:'Cancelled', value:kit.dateTime(voucher.CancelledDate), tone:'cancel' }
                ]
                : [],

        signatures:['Prepared By', 'Checked By', 'Approved By', 'Authorised Signature'],

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
                ? `FT ${voucher.VoucherNo.split('-').slice(-2).join('-')}`
                : 'Fund Transfer',

        sheetInfo:
        [
            { label:'Voucher No', value:voucher.VoucherNo },
            ...meta,
            { label:'Status', value:status },
            { label:'From / To', value:voucher.PartyName }
        ]
    };
}