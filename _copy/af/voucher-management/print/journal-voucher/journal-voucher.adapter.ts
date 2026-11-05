//===============================================================
// JOURNAL VOUCHER print : adapter
//
// Maps a Journal Voucher into the shared voucher print model.
// The design is shared by every voucher :
//   shared/print/templates/voucher/  (template, styles, Excel)
// Rows are printed group by group (debits first) with a
// separator row "Group n · Tk amount" when the voucher has
// several groups.
//===============================================================

import
{
    JournalVoucher
}
from '../../models/journal-voucher.model';

import
{
    roundMoney
}
from '../../../../../shared/components/accounting/accounting.models';

import
{
    journalGroups
}
from '../../../../../shared/components/accounting/journal-entry/journal-entry.models';

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

export interface JvPrintData
{
    voucher: JournalVoucher;
}

// JV-010101-2627-10-00007 → FY 2026-2027
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


export function journalVoucherModel
(
    data:
        JvPrintData,
    kit:
        PrintKit
):
    VoucherPrintModel
{
    const voucher =
        data.voucher;

    const groups =
        journalGroups(
            voucher.Lines ?? []
        );

    // Separator rows only when there is more than one group
    const several =
        groups.length > 1;

    const lines:
        VoucherPrintLine[] =
        groups.flatMap
        (
            group =>
            {
                const amount =
                    roundMoney(
                        group.lines
                            .filter(line => line.Side === 'Debit')
                            .reduce((sum, line) => sum + (Number(line.Amount) || 0), 0)
                    );

                const label =
                    several
                        ? `Group ${group.no} · Tk ${kit.money(amount)}`
                        : '';

                return group.lines.map
                (
                    line =>
                    ({
                        name:line.LedgerName,
                        code:line.LedgerCode,
                        details:[line.PartyCode, line.SubGroupName].filter(part => !!part).join(' · '),
                        notes:line.ShortNotes ?? '',
                        debit:line.Side === 'Debit' ? roundMoney(line.Amount) : 0,
                        credit:line.Side === 'Credit' ? roundMoney(line.Amount) : 0,
                        system:false,
                        group:label
                    })
                );
            }
        );

    const total =
        roundMoney(lines.reduce((sum, line) => sum + line.debit, 0));

    const status =
        String(voucher.Status ?? '');

    const meta =
    [
        { label:'Voucher Date', value:kit.date(voucher.VoucherDate) },
        { label:'Branch', value:voucher.BranchName },
        { label:'Financial Year', value:financialYear(voucher.VoucherNo) },
        { label:'Groups', value:String(groups.length || voucher.GroupCount || 1) },
        { label:'Ledger Type', value:voucher.LedgerType }
    ];

    return {
        title:'Journal Voucher',

        copy:'Office Copy',

        numberLabel:'Voucher No',

        number:voucher.VoucherNo,

        meta,

        status,

        // QR : plain text any phone can read
        qr:
            [
                kit.company?.CompanyName || 'AppCore ERP',
                'Journal Voucher',
                voucher.VoucherNo,
                kit.date(voucher.VoucherDate),
                `Tk ${kit.money(total)}`,
                status
            ]
            .filter(part => !!part)
            .join(' | '),

        logo:kit.isOn(VOUCHER_SWITCH.PRINT_LOGO, true),

        legal:kit.isOn(VOUCHER_SWITCH.PRINT_BIN_TIN, true),

        totalLabel:'Total Amount',

        total,

        lines,

        showCodes:
            kit.isOn(VOUCHER_SWITCH.JV_PRINT_LEDGER_CODES, true),

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
            kit.isOn(VOUCHER_SWITCH.JV_PRINT_WORKFLOW_DATES, true)
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
                ? `JV ${voucher.VoucherNo.split('-').slice(-2).join('-')}`
                : 'Journal Voucher',

        sheetInfo:
        [
            { label:'Voucher No', value:voucher.VoucherNo },
            ...meta,
            { label:'Status', value:status },
            { label:'Particulars', value:voucher.PartyName }
        ]
    };
}