//===============================================================
// BANK DEPOSIT SLIP print : template (A4, flow)
//
// Checks of one Deposit Slip (DS-…) : the voucher header (logo |
// company | QR, title ribbon, info strip), total + words bar,
// the check table (splits across pages), signatures.
// Reuses the shared voucher body styles (vd-*) plus a few ds-*
// rules.
//===============================================================

import
{
    CheckDepositSlip,
    CheckDepositSlipLine
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
    ExcelCell,
    ExcelSheet,
    PrintKit
}
from '../../../../../shared/print/print.models';

import
{
    VOUCHER_DOCUMENT_CSS
}
from '../../../../../shared/print/templates/voucher/voucher.styles';


//===============================================================
// Data
//===============================================================

export interface DepositSlipPrintData
{
    slip:
        CheckDepositSlip;
}

// The checks still on the slip (an undone deposit drops off)
function slipChecks
(
    slip:
        CheckDepositSlip
):
    CheckDepositSlipLine[]
{
    return slip.Checks ?? [];
}

function slipTotal
(
    slip:
        CheckDepositSlip
):
    number
{
    return roundMoney(
        slipChecks(slip).reduce((sum, check) => sum + (Number(check.Amount) || 0), 0));
}

// DS-010101-2627-10-00003 → FY 2026-2027
function financialYear
(
    slipNo:
        string
):
    string
{
    const code =
        (slipNo ?? '').split('-')[2] ?? '';

    return /^\d{4}$/.test(code)
        ? `FY 20${code.slice(0, 2)}-20${code.slice(2)}`
        : '';
}


//===============================================================
// HTML
//===============================================================

export function bankDepositSlipHtml
(
    data:
        DepositSlipPrintData,
    kit:
        PrintKit
):
    string
{
    const e =
        kit.escape;

    const slip =
        data.slip;

    const checks =
        slipChecks(slip);

    const total =
        slipTotal(slip);

    const rows =
        checks
            .map
            (
                (check, index) =>
                    `<tr>
<td class="vd-c vd-sl">${index + 1}</td>
<td><div class="vd-main">${e(check.CheckNo)}</div><div class="vd-sub">${e(kit.date(check.CheckDate))}</div></td>
<td>${e(check.CheckBank)}</td>
<td><div class="vd-main">${e(check.PartyName)}</div><div class="vd-sub">${e(check.SourceVoucherNo)}</div></td>
<td class="vd-c ds-status">${check.Status && check.Status !== 'Deposited' ? e(check.Status) : ''}</td>
<td class="vd-r vd-dr">${kit.money(check.Amount)}</td>
</tr>`
            )
            .join('');

    const head =
        kit.voucherHead(
        {
            copy:'Bank Copy',
            title:'Bank Deposit Slip',
            numberLabel:'Slip No',
            number:slip.SlipNo,
            meta:
            [
                { label:'Deposit Date', value:kit.date(slip.SlipDate) },
                { label:'Branch', value:slip.BranchName },
                { label:'Financial Year', value:financialYear(slip.SlipNo) },
                { label:'Deposit Into', value:slip.BankLedgerName },
                { label:'Checks', value:String(checks.length) }
            ],
            status:'',
            qr:
                [
                    kit.company?.CompanyName || 'AppCore ERP',
                    'Bank Deposit Slip',
                    slip.SlipNo,
                    kit.date(slip.SlipDate),
                    `${checks.length} check(s)`,
                    `Tk ${kit.money(total)}`
                ]
                .join(' | '),
            logo:kit.isOn(VOUCHER_SWITCH.PRINT_LOGO, true),
            legal:kit.isOn(VOUCHER_SWITCH.PRINT_BIN_TIN, true)
        });

    const stamp =
        kit.isOn(VOUCHER_SWITCH.PRINT_STAMP, true)
            ? `${slip.BranchName ? slip.BranchName + ' · ' : ''}Printed ${kit.now()}`
            : '';

    return `<section class="pv-flow" data-watermark="">
<div class="pv-run-head">
${head}
</div>
<div class="pv-body">
<div class="vd-amount">
  <div class="vd-amount-total"><span>Total Deposited</span><b>Tk ${kit.money(total)}</b></div>
  <div class="vd-amount-words"><span>In Words</span><i>${e(kit.words(total))}</i></div>
</div>
<table class="pv-split vd-lines">
  <colgroup><col style="width:9mm"><col style="width:32mm"><col><col><col style="width:20mm"><col style="width:28mm"></colgroup>
  <thead><tr><th class="vd-c">SL</th><th>Check No / Date</th><th>Drawn On</th><th>Received From</th><th class="vd-c">Note</th><th class="vd-r">Amount (Tk)</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="6" class="vd-c">No checks remain on this slip.</td></tr>'}</tbody>
  <tfoot><tr class="vd-total"><td></td><td colspan="4" class="vd-r">Total · ${checks.length} check(s)</td><td class="vd-r vd-dr">${kit.money(total)}</td></tr></tfoot>
</table>
<div class="vd-narration"><span>Account</span><p>${e(slip.BankLedgerName)}${slip.BankLedgerCode ? ` <span class="vd-code">· ${e(slip.BankLedgerCode)}</span>` : ''}</p></div>
<div class="ds-note">Checks are credited to the account on realisation. Nothing is posted until each check clears.</div>
<div class="vd-after">
${kit.signatures(['Deposited By', 'Checked By', 'Authorised Signature', 'Bank Teller (Seal)'])}
</div>
</div>
<div class="pv-end">
${stamp ? `<div class="pv-printed">${e(stamp)}</div>` : ''}
</div>
</section>`;
}

export function BANK_DEPOSIT_SLIP_CSS():
    string
{
    return `${VOUCHER_DOCUMENT_CSS()}
.ds-status { font-size: 7.4pt; font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.5pt; }
.ds-note { margin-top: 2.5mm; font-size: 8pt; color: #475569; }
`;
}


//===============================================================
// Excel
//===============================================================

export function bankDepositSlipSheet
(
    data:
        DepositSlipPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const slip =
        data.slip;

    const checks =
        slipChecks(slip);

    const total =
        slipTotal(slip);

    const bold =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    const rows:
        ExcelCell[][] =
    [
        [{ v:kit.company?.CompanyName || 'AppCore ERP', s:'title' }],
        [bold('Bank Deposit Slip')],
        [],
        [bold('Slip No'), slip.SlipNo, null, bold('Deposit Date'), kit.date(slip.SlipDate)],
        [bold('Branch'), slip.BranchName, null, bold('Deposit Into'), slip.BankLedgerName],
        [],
        [bold('SL'), bold('Check No'), bold('Check Date'), bold('Drawn On'), bold('Received From'), bold('Voucher'), bold('Note'), bold('Amount')],
        ...checks.map(
            (check, index): ExcelCell[] =>
            [
                index + 1,
                check.CheckNo,
                kit.date(check.CheckDate),
                check.CheckBank,
                check.PartyName,
                check.SourceVoucherNo,
                check.Status && check.Status !== 'Deposited' ? check.Status : '',
                { v:roundMoney(check.Amount), s:'money' }
            ]),
        [null, null, null, null, null, null, bold('Total'), { v:total, s:'boldMoney' }],
        [],
        [bold('In Words'), kit.words(total)]
    ];

    return {
        name:
            slip.SlipNo
                ? `DS ${slip.SlipNo.split('-').slice(-2).join('-')}`
                : 'Deposit Slip',
        rows,
        columns:[6, 16, 13, 26, 28, 26, 12, 14]
    };
}