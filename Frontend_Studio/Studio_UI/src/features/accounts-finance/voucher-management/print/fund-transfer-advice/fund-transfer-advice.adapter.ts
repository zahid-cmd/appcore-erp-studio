//===============================================================
// FUND TRANSFER ADVICE print : adapter
//
// Maps a Fund Transfer into the shared slip print model (A4
// sheet, Sender Copy + Receiver Copy halves; one sheet per To
// account when switch 0046 is ON). The design is
// shared by Money Receipt / Payment Slip / Fund Transfer Advice :
//   shared/print/templates/slip/  (template, styles, Excel)
//
//   "Transferred from … to … the sum of Taka … vide … on account
//    of …", Received By + Authorised Signature
//===============================================================

import
{
    FundTransfer
}
from '../../models/fund-transfer.model';

import
{
    TransferLine
}
from '../../../../../shared/components/accounting/transfer-entry/transfer-entry.models';

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
    SlipDocument,
    SlipFill,
    SlipPart,
    SlipPrintModel,
    SlipRow,
    SlipSheet
}
from '../../../../../shared/print/templates/slip/slip-print.model';

import
{
    FtPrintData,
    headerOptions,
    fromRows,
    toRows,
    transferTotal,
    chargeTotal,
    accountText,
    methodText
}
from '../fund-transfer-print.helpers';


// Tag in front of each "vide" row
function methodTag
(
    method:
        string
):
    string
{
    switch
    (
        method
    )
    {
        case 'Cheque':
            return 'CHEQUE';

        case 'Bank Transfer':
            return 'BANK';

        case 'MFS':
            return 'MFS';

        default:
            return 'CASH';
    }
}

// Account names, at most 3 (+ "and n more")
function accountParts
(
    names:
        string[]
):
    SlipPart[]
{
    const more =
        names.length > 3
            ? ` and ${names.length - 3} more`
            : '';

    return [
        { text:names.slice(0, 3).join(', ') + more }
    ];
}


//===============================================================
// Advices of a transfer
//===============================================================

// One advice : the From rows (amount may be a part of a row), the
// To accounts it covers, and the charge that belongs to it
export interface AdviceUnit
{
    from: { line: TransferLine; amount: number }[];

    to: TransferLine[];

    charges: number;
}

// Switch 0046 "Fund Transfer Advice : Separate Per To Account"
//   ON  : one advice per To account (1 From : several To; the
//         From row and its charge are shared by each To amount)
//   OFF : one advice for the whole transfer
export function adviceUnits
(
    voucher:
        FundTransfer,
    kit:
        PrintKit
):
    AdviceUnit[]
{
    const from =
        fromRows(voucher);

    const to =
        toRows(voucher);

    const perTo =
        kit.isOn(VOUCHER_SWITCH.FTA_PER_TO, true);

    if
    (
        perTo
        &&
        to.length > 1
        &&
        from.length === 1
    )
    {
        const source =
            from[0];

        const sourceAmount =
            roundMoney(Number(source.Amount) || 0);

        const charge =
            roundMoney(Number(source.ChargeAmount) || 0);

        let chargeLeft =
            charge;

        return to.map
        (
            (line, index) =>
            {
                const amount =
                    roundMoney(Number(line.Amount) || 0);

                // Last advice takes the rounding remainder
                const share =
                    index === to.length - 1
                        ? chargeLeft
                        : sourceAmount > 0
                            ? roundMoney(charge * amount / sourceAmount)
                            : 0;

                chargeLeft =
                    roundMoney(chargeLeft - share);

                return {
                    from:[{ line:source, amount }],
                    to:[line],
                    charges:share
                };
            }
        );
    }

    return [
    {
        from:from.map
        (
            line =>
            ({
                line,
                amount:roundMoney(Number(line.Amount) || 0)
            })
        ),
        to,
        charges:chargeTotal(voucher)
    }];
}


//===============================================================
// Document : one A4 sheet (two halves) per advice
//===============================================================

export function fundTransferAdviceDocument
(
    data:
        FtPrintData,
    kit:
        PrintKit
):
    SlipDocument
{
    const voucher =
        data.voucher;

    return {
        slips:
            adviceUnits(voucher, kit)
                .map((unit, index, units) => adviceSlip(voucher, unit, kit, units.length > 1 ? `${index + 1} of ${units.length}` : '')),

        copies:
        [
            'Sender Copy',
            'Receiver Copy'
        ],

        watermark:
            voucher.Status === 'Cancelled'
                ? 'CANCELLED'
                : ''
    };
}

function adviceSlip
(
    voucher:
        FundTransfer,
    unit:
        AdviceUnit,
    kit:
        PrintKit,
    // "1 of 2" when the transfer is split per To account
    part:
        string
):
    SlipPrintModel
{
    const total =
        roundMoney(
            unit.to.reduce((sum, line) => sum + (Number(line.Amount) || 0), 0)
        );

    const charges =
        unit.charges;

    // How the money left each From account
    const vide:
        SlipRow[] =
        unit.from.map
        (
            row =>
            ({
                tag:methodTag(row.line.Method),
                detail:`${methodText(row.line, kit)} from ${accountText(row.line, voucher)}`,
                amount:row.amount
            })
        );

    const fills:
        SlipFill[] =
    [
        { label:'Transferred from', parts:accountParts(unit.from.map(row => accountText(row.line, voucher))) },
        { label:'to', parts:accountParts(unit.to.map(line => accountText(line, voucher))) },
        { label:'the sum of Taka', parts:[{ text:kit.words(total).replace(/^Taka\s+/i, '') }], words:true },
        { label:'vide', rows:vide },
        ...(charges > 0
            ? [{ label:'charges', parts:[{ text:`Tk ${kit.money(charges)} ` }, { text:'(paid by the company, not deducted)', muted:true }] }]
            : []),
        { label:'on account of', parts:[{ text:voucher.Narration ?? '' }] }
    ];

    const options =
        headerOptions(kit);

    return {
        title:'FUND TRANSFER ADVICE',

        numberLabel:'Advice No',

        number:part ? `${voucher.VoucherNo} · ${part}` : voucher.VoucherNo,

        dateLabel:'Date',

        date:kit.date(voucher.VoucherDate),

        // QR : plain text any phone can read
        qr:
            [
                kit.company?.CompanyName || 'AppCore ERP',
                'Fund Transfer Advice',
                voucher.VoucherNo,
                kit.date(voucher.VoucherDate),
                `Tk ${kit.money(total)}`,
                unit.to[0]?.LedgerName ?? voucher.TransferType
            ]
            .filter(part => !!part)
            .join(' | '),

        logo:options.logo,

        legal:options.legal,

        fills,

        amount:total,

        note:'',

        receiverSignature:'Received By',

        signature:'Authorised Signature',

        stamp:
            kit.isOn(VOUCHER_SWITCH.PRINT_STAMP, true)
                ? `${voucher.BranchName ? voucher.BranchName + ' · ' : ''}Printed ${kit.now()}`
                : '',

        footnote:'This advice is valid with the authorised signature.'
    };
}


//===============================================================
// Excel
//===============================================================

export function fundTransferAdviceSheet
(
    data:
        FtPrintData,
    kit:
        PrintKit
):
    SlipSheet
{
    const voucher =
        data.voucher;

    const charges =
        chargeTotal(voucher);

    return {
        name:
            voucher.VoucherNo
                ? `FTA ${voucher.VoucherNo.split('-').slice(-2).join('-')}`
                : 'Fund Transfer Advice',

        title:'Fund Transfer Advice',

        info:
        [
            { label:'Advice No', value:voucher.VoucherNo },
            { label:'Date', value:kit.date(voucher.VoucherDate) },
            { label:'Branch', value:voucher.BranchName },
            { label:'Status', value:String(voucher.Status ?? '') },
            { label:'From', value:fromRows(voucher).map(line => accountText(line, voucher)).join(', ') },
            { label:'To', value:toRows(voucher).map(line => accountText(line, voucher)).join(', ') },
            { label:'On Account Of', value:voucher.Narration },
            ...(charges > 0 ? [{ label:'Charges (company)', value:kit.money(charges) }] : [])
        ],

        rows:
            fromRows(voucher).map
            (
                line =>
                ({
                    tag:methodTag(line.Method),
                    detail:`${methodText(line, kit)} from ${accountText(line, voucher)}`,
                    amount:roundMoney(line.Amount)
                })
            ),

        extras:[],

        totalLabel:'Amount Transferred',

        total:transferTotal(voucher)
    };
}