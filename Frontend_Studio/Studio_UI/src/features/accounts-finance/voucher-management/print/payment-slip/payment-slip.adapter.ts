//===============================================================
// PAYMENT SLIP print : adapter
//
// Maps a Payment Voucher into the shared slip print model (A4
// sheet, Payee Copy + Office Copy halves). The design is shared
// by Money Receipt / Payment Slip / Fund Transfer Advice :
//   shared/print/templates/slip/  (template, styles, Excel)
// Decided here : how the voucher is split into slips (switches
// 0032 / 0011), the wording, and the switches.
//
// Payment Voucher (server shape) :
//   voucher.Debits  = Pay To rows
//   voucher.Credits = Payment Mode rows
//===============================================================

import
{
    PaymentVoucher
}
from '../../models/payment-voucher.model';

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
    PvPrintData,
    videText,
    join,
    headerOptions,
    companyCharge,
    payeeCharge
}
from '../payment-voucher-print.helpers';


//===============================================================
// Slips of a voucher
//===============================================================

// One Payment Slip : the payment rows (amount may be a part of
// a row), the parties it is paid to, and the MFS charges that
// belong to it (company / payee)
export interface SlipUnit
{
    rows: { line: VoucherDebitLine; amount: number }[];

    parties: VoucherCreditLine[];

    companyCharges: number;

    payeeCharges: number;

    // Title suffix : the mode (per-mode slips)
    mode: string;
}

// Splits the voucher into Payment Slips by the switches :
//   Separate Per Party ON (0032) : one slip per supplier /
//     customer / ledger (n debits : 1 credit; the payment row
//     and its charges are shared in proportion to each party)
//   Multi Mode Payment Slip OFF (0011) : one slip per mode
//   otherwise : one slip for the whole voucher
export function slipUnits
(
    voucher:
        PaymentVoucher,
    kit:
        PrintKit
):
    SlipUnit[]
{
    const parties =
        voucher.Debits ?? [];

    const money =
        voucher.Credits ?? [];

    const perParty =
        kit.isOn(VOUCHER_SWITCH.PS_PER_PARTY, false);

    const multiMode =
        kit.isOn(VOUCHER_SWITCH.PS_MULTI_MODE, true);

    //-----------------------------------------------------------
    // Per party (only matters when there are several parties,
    // which means a single payment row)
    //-----------------------------------------------------------

    if
    (
        perParty
        &&
        parties.length > 1
        &&
        money.length === 1
    )
    {
        const pay =
            money[0];

        const payAmount =
            roundMoney(Number(pay.Amount) || 0);

        const company =
            companyCharge(pay);

        const payee =
            payeeCharge(pay);

        let companyLeft =
            company;

        let payeeLeft =
            payee;

        return parties.map
        (
            (party, index) =>
            {
                const amount =
                    roundMoney(Number(party.Amount) || 0);

                const last =
                    index === parties.length - 1;

                // Last slip takes the rounding remainder
                const share =
                    (total: number, left: number) =>
                        last
                            ? left
                            : payAmount > 0
                                ? roundMoney(total * amount / payAmount)
                                : 0;

                const companyShare =
                    share(company, companyLeft);

                const payeeShare =
                    share(payee, payeeLeft);

                companyLeft =
                    roundMoney(companyLeft - companyShare);

                payeeLeft =
                    roundMoney(payeeLeft - payeeShare);

                return {
                    rows:[{ line:pay, amount }],
                    parties:[party],
                    companyCharges:companyShare,
                    payeeCharges:payeeShare,
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
            SlipUnit[] =
            [];

        for
        (
            const line of money
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
                    parties,
                    companyCharges:0,
                    payeeCharges:0,
                    mode:line.Mode
                };

                units.push(unit);
            }

            unit.rows.push(
            {
                line,
                amount:roundMoney(Number(line.Amount) || 0)
            });

            unit.companyCharges =
                roundMoney(unit.companyCharges + companyCharge(line));

            unit.payeeCharges =
                roundMoney(unit.payeeCharges + payeeCharge(line));
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
    // One slip
    //-----------------------------------------------------------

    return [
    {
        rows:money.map
        (
            line =>
            ({
                line,
                amount:roundMoney(Number(line.Amount) || 0)
            })
        ),
        parties,
        companyCharges:roundMoney(
            money.reduce((sum, line) => sum + companyCharge(line), 0)
        ),
        payeeCharges:roundMoney(
            money.reduce((sum, line) => sum + payeeCharge(line), 0)
        ),
        mode:''
    }];
}


//===============================================================
// Document : one A4 sheet per slip
//===============================================================

export function paymentSlipDocument
(
    data:
        PvPrintData,
    kit:
        PrintKit
):
    SlipDocument
{
    const voucher =
        data.voucher;

    // Office copy (switch) : two halves; otherwise the payee
    // copy only
    const officeCopy =
        kit.isOn(VOUCHER_SWITCH.PS_OFFICE_COPY, true);

    return {
        slips:
            slipUnits(voucher, kit)
                .map(unit => paymentSlip(voucher, unit, kit)),

        copies:
            officeCopy
                ? ['Payee Copy', 'Office Copy']
                : ['Payee Copy'],

        watermark:
            voucher.Status === 'Cancelled'
                ? 'CANCELLED'
                : ''
    };
}

// Charges wording (MFS) : what the company paid on top and what
// was taken out of the transfer
function chargeParts
(
    company:
        number,
    payee:
        number,
    kit:
        PrintKit
):
    SlipPart[]
{
    const parts:
        SlipPart[] =
        [];

    if
    (
        company > 0
    )
    {
        parts.push(
            { text:`Tk ${kit.money(company)} ` },
            { text:'(borne by us, not deducted)', muted:true }
        );
    }

    if
    (
        payee > 0
    )
    {
        parts.push(
            { text:`${parts.length ? ', ' : ''}Tk ${kit.money(payee)} ` },
            { text:'(borne by the payee, deducted from the transfer)', muted:true }
        );
    }

    return parts;
}

function paymentSlip
(
    voucher:
        PaymentVoucher,
    unit:
        SlipUnit,
    kit:
        PrintKit
):
    SlipPrintModel
{
    const parties =
        unit.parties;

    // The slip shows what settles the payee's account : the paid
    // amount (charges are only mentioned)
    const total =
        roundMoney(
            unit.rows.reduce
            (
                (sum, row) =>
                    sum + row.amount,
                0
            )
        );

    // Switch "Payment Slip : Show Charges Line"
    const chargesLine =
        (unit.companyCharges > 0 || unit.payeeCharges > 0)
        &&
        kit.isOn(VOUCHER_SWITCH.PS_CHARGES_LINE, true);

    const isParty =
        voucher.LedgerType === 'Customer'
        ||
        voucher.LedgerType === 'Supplier';

    const showCode =
        kit.isOn(VOUCHER_SWITCH.PS_PARTY_CODE, true);

    const more =
        parties.length > 3
            ? ` and ${parties.length - 3} more`
            : '';

    // Name on the check(s) (a General Ledger payment : the payee
    // of the check, else the narration)
    const checkPayee =
        unit.rows
            .map(row => (row.line.PayeeName ?? '').trim())
            .find(name => !!name)
        ??
        '';

    // Paid to : suppliers / customers (at most 3 names)
    const to:
        SlipPart[] =
        isParty
            ? [
                ...parties
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
            : [{ text:checkPayee || (voucher.Narration ?? '') }];

    // On account of : narration (party) or the GL names
    const account =
        isParty
            ? voucher.Narration ?? ''
            : parties
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
        { label:'Paid to', parts:to },
        { label:'the sum of Taka', parts:[{ text:kit.words(total).replace(/^Taka\s+/i, '') }], words:true },
        { label:'vide', rows:vide },
        ...(chargesLine
            ? [{ label:'MFS charges', parts:chargeParts(unit.companyCharges, unit.payeeCharges, kit) }]
            : []),
        { label:'on account of', parts:[{ text:account }] }
    ];

    const options =
        headerOptions(kit);

    return {
        title:
            unit.mode
                ? `PAYMENT SLIP · ${unit.mode.toUpperCase()}`
                : 'PAYMENT SLIP',

        numberLabel:'Slip No',

        number:voucher.VoucherNo,

        dateLabel:'Date',

        date:kit.date(voucher.VoucherDate),

        // QR : plain text any phone can read
        qr:
            [
                kit.company?.CompanyName || 'AppCore ERP',
                'Payment Slip',
                voucher.VoucherNo,
                kit.date(voucher.VoucherDate),
                `Tk ${kit.money(total)}`,
                parties[0]?.LedgerName ?? ''
            ]
            .filter(part => !!part)
            .join(' | '),

        logo:options.logo,

        legal:options.legal,

        fills,

        amount:total,

        note:
            unit.rows.some(row => row.line.Mode === 'Check')
                ? 'Subject to cheque clearing.'
                : '',

        receiverSignature:"Receiver's Signature",

        signature:'Authorised Signature',

        stamp:
            kit.isOn(VOUCHER_SWITCH.PRINT_STAMP, true)
                ? `${voucher.BranchName ? voucher.BranchName + ' · ' : ''}Printed ${kit.now()}`
                : '',

        footnote:'This slip is valid with the authorised signature.'
    };
}


//===============================================================
// Excel : the whole voucher as one slip
//===============================================================

export function paymentSlipSheet
(
    data:
        PvPrintData,
    kit:
        PrintKit
):
    SlipSheet
{
    const voucher =
        data.voucher;

    const money =
        voucher.Credits ?? [];

    const company =
        roundMoney(
            money.reduce((sum, line) => sum + companyCharge(line), 0)
        );

    const payee =
        roundMoney(
            money.reduce((sum, line) => sum + payeeCharge(line), 0)
        );

    const chargesLine =
        (company > 0 || payee > 0)
        &&
        kit.isOn(VOUCHER_SWITCH.PS_CHARGES_LINE, true);

    const paid =
        roundMoney(
            money.reduce((sum, line) => sum + (Number(line.Amount) || 0), 0)
        );

    const to =
        (voucher.Debits ?? [])
            .map(line => join([line.LedgerName, line.PartyCode && `(${line.PartyCode})`], ' '))
            .join(', ');

    const notes =
        [
            ...(company > 0 ? [`Tk ${kit.money(company)} borne by us`] : []),
            ...(payee > 0 ? [`Tk ${kit.money(payee)} borne by the payee`] : [])
        ]
        .join(', ');

    return {
        name:
            voucher.VoucherNo
                ? `PS ${voucher.VoucherNo.split('-').slice(-2).join('-')}`
                : 'Payment Slip',

        title:'Payment Slip',

        info:
        [
            { label:'Slip No', value:voucher.VoucherNo },
            { label:'Date', value:kit.date(voucher.VoucherDate) },
            { label:'Branch', value:voucher.BranchName },
            { label:'Status', value:String(voucher.Status ?? '') },
            { label:'Paid To', value:to },
            { label:'On Account Of', value:voucher.Narration },
            ...(chargesLine ? [{ label:'MFS Charges', value:notes }] : [])
        ],

        rows:
            money.map
            (
                line =>
                ({
                    tag:modeTag(line.Mode),
                    detail:videText(line, kit),
                    amount:roundMoney(Number(line.Amount) || 0)
                })
            ),

        // Charges are not part of what the payee received
        extras:[],

        totalLabel:'Total Paid',

        total:paid
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
    return mode === 'Check'
        ? 'CHEQUE'
        : String(mode ?? '').toUpperCase();
}

// Detail of a "vide" row (the tag already names the mode)
function modeDetail
(
    line:
        VoucherDebitLine,
    voucher:
        PaymentVoucher,
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
            ? `Cash paid at ${voucher.BranchName}`
            : 'Cash paid';
    }

    return videText(
        line,
        kit
    );
}