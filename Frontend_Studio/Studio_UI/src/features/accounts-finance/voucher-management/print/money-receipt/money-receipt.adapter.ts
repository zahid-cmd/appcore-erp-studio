//===============================================================
// MONEY RECEIPT print : adapter
//
// Maps a Receipt Voucher into the shared slip print model (A4
// sheet, Customer Copy + Office Copy halves). The design is
// shared by Money Receipt / Payment Slip / Fund Transfer Advice :
//   shared/print/templates/slip/  (template, styles, Excel)
// Decided here : how the voucher is split into receipts
// (switches 0031 / 0002), the wording, and the switches.
//===============================================================

import
{
    ReceiptVoucher
}
from '../../models/receipt-voucher.model';

import
{
    VoucherDebitLine,
    VoucherCreditLine,
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
    RvPrintData,
    videText,
    join,
    headerOptions
}
from '../receipt-voucher-print.helpers';


//===============================================================
// Receipts of a voucher
//===============================================================

// One Money Receipt : the receipt rows (amount may be a part of
// a row), the parties it is received from, and the customer
// charges that belong to it
export interface ReceiptUnit
{
    rows: { line: VoucherDebitLine; amount: number }[];

    credits: VoucherCreditLine[];

    charges: number;

    // Title suffix : the mode (per-mode receipts)
    mode: string;
}

export function customerCharge
(
    line:
        VoucherDebitLine
):
    number
{
    return line.ChargeBorneBy === 'Customer'
        ? roundMoney(Number(line.ChargeAmount) || 0)
        : 0;
}

// Splits the voucher into Money Receipts by the switches :
//   Separate Per Party ON (0031) : one receipt per customer /
//     supplier / ledger (1 debit : n credits; the debit and its
//     charge are shared in proportion to each credit)
//   Multi Mode Money Receipt OFF (0002) : one receipt per mode
//   otherwise : one receipt for the whole voucher
export function receiptUnits
(
    voucher:
        ReceiptVoucher,
    kit:
        PrintKit
):
    ReceiptUnit[]
{
    const debits =
        voucher.Debits ?? [];

    const credits =
        voucher.Credits ?? [];

    const perParty =
        kit.isOn(VOUCHER_SWITCH.MR_PER_PARTY, false);

    const multiMode =
        kit.isOn(VOUCHER_SWITCH.MR_MULTI_MODE, true);

    //-----------------------------------------------------------
    // Per party (only matters when there are several credits,
    // which means a single debit)
    //-----------------------------------------------------------

    if
    (
        perParty
        &&
        credits.length > 1
        &&
        debits.length === 1
    )
    {
        const debit =
            debits[0];

        const debitAmount =
            roundMoney(Number(debit.Amount) || 0);

        const charge =
            customerCharge(debit);

        let chargeLeft =
            charge;

        return credits.map
        (
            (credit, index) =>
            {
                const amount =
                    roundMoney(Number(credit.Amount) || 0);

                // Last receipt takes the rounding remainder
                const share =
                    index === credits.length - 1
                        ? chargeLeft
                        : debitAmount > 0
                            ? roundMoney(charge * amount / debitAmount)
                            : 0;

                chargeLeft =
                    roundMoney(chargeLeft - share);

                return {
                    rows:[{ line:debit, amount }],
                    credits:[credit],
                    charges:share,
                    mode:''
                };
            }
        );
    }

    //-----------------------------------------------------------
    // Per mode
    //-----------------------------------------------------------

    if
    (
        !multiMode
    )
    {
        const units:
            ReceiptUnit[] =
            [];

        for
        (
            const line of debits
        )
        {
            let unit =
                units.find(item => item.mode === line.Mode);

            if
            (
                !unit
            )
            {
                unit =
                {
                    rows:[],
                    credits,
                    charges:0,
                    mode:line.Mode
                };

                units.push(unit);
            }

            unit.rows.push(
            {
                line,
                amount:roundMoney(Number(line.Amount) || 0)
            });

            unit.charges =
                roundMoney(unit.charges + customerCharge(line));
        }

        // A single mode needs no mode in the title
        if
        (
            units.length === 1
        )
        {
            units[0].mode =
                '';
        }

        return units;
    }

    //-----------------------------------------------------------
    // One receipt
    //-----------------------------------------------------------

    return [
    {
        rows:debits.map
        (
            line =>
            ({
                line,
                amount:roundMoney(Number(line.Amount) || 0)
            })
        ),
        credits,
        charges:roundMoney(
            debits.reduce((sum, line) => sum + customerCharge(line), 0)
        ),
        mode:''
    }];
}



//===============================================================
// Document : one A4 sheet per receipt
//===============================================================

export function moneyReceiptDocument
(
    data:
        RvPrintData,
    kit:
        PrintKit
):
    SlipDocument
{
    const voucher =
        data.voucher;

    // Office copy (switch) : two halves; otherwise the customer
    // copy only
    const officeCopy =
        kit.isOn(VOUCHER_SWITCH.MR_OFFICE_COPY, true);

    return {
        slips:
            receiptUnits(voucher, kit)
                .map(unit => moneyReceiptSlip(voucher, unit, kit)),

        copies:
            officeCopy
                ? ['Customer Copy', 'Office Copy']
                : ['Customer Copy'],

        watermark:
            voucher.Status === 'Cancelled'
                ? 'CANCELLED'
                : ''
    };
}

function moneyReceiptSlip
(
    voucher:
        ReceiptVoucher,
    unit:
        ReceiptUnit,
    kit:
        PrintKit
):
    SlipPrintModel
{
    const credits =
        unit.credits;

    const received =
        roundMoney(
            unit.rows.reduce
            (
                (sum, row) =>
                    sum + row.amount,
                0
            )
        );

    const charges =
        unit.charges;

    // Switch "Money Receipt : Show Customer Charges Line" OFF :
    // the charges are left out of the receipt (line and total)
    const chargesLine =
        charges > 0
        &&
        kit.isOn(VOUCHER_SWITCH.MR_CHARGES_LINE, true);

    const total =
        roundMoney(
            received + (chargesLine ? charges : 0)
        );

    const isParty =
        voucher.LedgerType === 'Customer'
        ||
        voucher.LedgerType === 'Supplier';

    const showCode =
        kit.isOn(VOUCHER_SWITCH.MR_PARTY_CODE, true);

    const more =
        credits.length > 3
            ? ` and ${credits.length - 3} more`
            : '';

    // Received from : customers / suppliers (a General Ledger
    // receipt : the narration names the payer); at most 3 names
    const from:
        SlipPart[] =
        isParty
            ? [
                ...credits
                    .slice(0, 3)
                    .flatMap
                    (
                        (line, index) =>
                        [
                            { text:(index > 0 ? ', ' : '') + line.LedgerName },
                            ...(showCode && line.PartyCode ? [{ text:` (${line.PartyCode})`, muted:true }] : [])
                        ]
                    ),
                ...(more ? [{ text:more }] : [])
            ]
            : [{ text:voucher.Narration ?? '' }];

    // On account of : narration (party) or the GL names
    const account =
        isParty
            ? voucher.Narration ?? ''
            : credits
                .slice(0, 3)
                .map(line => line.LedgerName)
                .join(', ')
                + more;

    const vide:
        SlipRow[] =
        unit.rows.map
        (
            row =>
            ({
                tag:modeTag(row.line.Mode),
                detail:modeDetail(row.line, voucher, kit),
                amount:row.amount
            })
        );

    const fills:
        SlipFill[] =
    [
        { label:'Received with thanks from', parts:from },
        { label:'the sum of Taka', parts:[{ text:kit.words(total).replace(/^Taka\s+/i, '') }], words:true },
        { label:'vide', rows:vide },
        ...(chargesLine
            ? [{ label:'including charges', parts:[{ text:`Tk ${kit.money(charges)} ` }, { text:'(paid by the customer)', muted:true }] }]
            : []),
        { label:'on account of', parts:[{ text:account }] }
    ];

    const options =
        headerOptions(kit);

    return {
        title:
            unit.mode
                ? `MONEY RECEIPT · ${unit.mode.toUpperCase()}`
                : 'MONEY RECEIPT',

        numberLabel:'Receipt No',

        number:voucher.VoucherNo,

        dateLabel:'Date',

        date:kit.date(voucher.VoucherDate),

        // QR : plain text any phone can read
        qr:
            [
                kit.company?.CompanyName || 'AppCore ERP',
                'Money Receipt',
                voucher.VoucherNo,
                kit.date(voucher.VoucherDate),
                `Tk ${kit.money(total)}`,
                credits[0]?.LedgerName ?? ''
            ]
            .filter(part => !!part)
            .join(' | '),

        logo:options.logo,

        legal:options.legal,

        fills,

        amount:total,

        note:
            unit.rows.some(row => row.line.Mode === 'Check')
                ? 'Cheque payment is subject to realisation.'
                : '',

        signature:'Authorised Signature',

        stamp:
            kit.isOn(VOUCHER_SWITCH.PRINT_STAMP, true)
                ? `${voucher.BranchName ? voucher.BranchName + ' · ' : ''}Printed ${kit.now()}`
                : '',

        footnote:'This receipt is valid with the authorised signature.'
    };
}


//===============================================================
// Excel : the whole voucher as one receipt
//===============================================================

export function moneyReceiptSheet
(
    data:
        RvPrintData,
    kit:
        PrintKit
):
    SlipSheet
{
    const voucher =
        data.voucher;

    const debits =
        voucher.Debits ?? [];

    const charges =
        roundMoney(
            debits.reduce((sum, line) => sum + customerCharge(line), 0)
        );

    const chargesLine =
        charges > 0
        &&
        kit.isOn(VOUCHER_SWITCH.MR_CHARGES_LINE, true);

    const received =
        roundMoney(
            debits.reduce((sum, line) => sum + (Number(line.Amount) || 0), 0)
        );

    const from =
        (voucher.Credits ?? [])
            .map(line => join([line.LedgerName, line.PartyCode && `(${line.PartyCode})`], ' '))
            .join(', ');

    return {
        name:
            voucher.VoucherNo
                ? `MR ${voucher.VoucherNo.split('-').slice(-2).join('-')}`
                : 'Money Receipt',

        title:'Money Receipt',

        info:
        [
            { label:'Receipt No', value:voucher.VoucherNo },
            { label:'Date', value:kit.date(voucher.VoucherDate) },
            { label:'Branch', value:voucher.BranchName },
            { label:'Status', value:String(voucher.Status ?? '') },
            { label:'Received From', value:from },
            { label:'On Account Of', value:voucher.Narration }
        ],

        rows:
            debits.map
            (
                line =>
                ({
                    tag:modeTag(line.Mode),
                    detail:videText(line, kit),
                    amount:roundMoney(Number(line.Amount) || 0)
                })
            ),

        extras:
            chargesLine
                ? [{ tag:'Charges', detail:'Paid by the customer', amount:charges }]
                : [],

        totalLabel:'Total Received',

        total:
            roundMoney(
                received + (chargesLine ? charges : 0)
            )
    };
}


// Tag in front of each "vide" row
function modeTag
(
    mode:
        string
):
    string
{
    switch
    (
        mode
    )
    {
        case 'POS':
            return 'CARD';

        case 'Check':
            return 'CHEQUE';

        default:
            return String(mode ?? '').toUpperCase();
    }
}

// Detail of a "vide" row (the tag already names the mode)
function modeDetail
(
    line:
        VoucherDebitLine,
    voucher:
        ReceiptVoucher,
    kit:
        PrintKit
):
    string
{
    if
    (
        line.Mode === 'Cash'
    )
    {
        return voucher.BranchName
            ? `Cash received at ${voucher.BranchName}`
            : 'Cash received';
    }

    return videText(
        line,
        kit
    );
}