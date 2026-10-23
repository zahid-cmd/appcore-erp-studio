//===============================================================
// Shared VOUCHER print : layout (office copy, A4 pages)
//
// Design (agreed 2026-10-23) :
//   copy label · logo | company | QR · title ribbon with the
//   number · info strip with the status stamp (kit.voucherHead,
//   repeated on every page)
//   total + amount in words (thin bar)
//   SL / Account / Short Notes / Debit / Credit (splits across
//   pages, header repeated, totals with the last part)
//   narration, notes, workflow line and signatures right after
//   the narration; stamp line at the bottom of the last page
//
// Styles : voucher.styles.ts · Model : voucher-print.model.ts
//===============================================================

import
{
    roundMoney
}
from '../../../components/accounting/accounting.models';

import
{
    PrintKit
}
from '../../print.models';

import
{
    VoucherPrintModel
}
from './voucher-print.model';


export function voucherDocumentHtml
(
    model:
        VoucherPrintModel,
    kit:
        PrintKit
):
    string
{
    const e =
        kit.escape;

    const totalDebit =
        roundMoney(model.lines.reduce((sum, line) => sum + line.debit, 0));

    const totalCredit =
        roundMoney(model.lines.reduce((sum, line) => sum + line.credit, 0));

    // SL counts the entered rows; system rows have none
    let serial =
        0;

    const rows =
        model.lines
            .map
            (
                line =>
                {
                    const sl =
                        line.system
                            ? ''
                            : String(++serial);

                    const code =
                        model.showCodes && line.code
                            ? ` <span class="vd-code">· ${e(line.code)}</span>`
                            : '';

                    return `<tr class="${line.system ? 'vd-sys' : ''}">
<td class="vd-c vd-sl">${sl}</td>
<td><div class="vd-main">${e(line.name)}${code}</div>${line.details ? `<div class="vd-sub">${e(line.details)}</div>` : ''}</td>
<td class="vd-notes">${e(line.notes)}</td>
<td class="vd-r vd-dr">${line.debit ? kit.money(line.debit) : ''}</td>
<td class="vd-r vd-cr">${line.credit ? kit.money(line.credit) : ''}</td>
</tr>`;
                }
            )
            .join('');

    const notes =
        model.notes
            .filter(note => !!note.text)
            .map
            (
                note =>
                    `<div class="vd-note${note.tone === 'danger' ? ' vd-danger' : ''}">${note.tone === 'danger' ? '' : '&#9888; '}${e(note.text)}</div>`
            )
            .join('');

    const head =
        kit.voucherHead(
        {
            copy:model.copy,
            title:model.title,
            numberLabel:model.numberLabel,
            number:model.number,
            meta:model.meta,
            status:model.status,
            qr:model.qr,
            logo:model.logo,
            legal:model.legal
        });

    return `<section class="pv-flow" data-watermark="${e(model.watermark)}">

<div class="pv-run-head">
${head}
</div>

<div class="pv-body">
<div class="vd-amount">
  <div class="vd-amount-total"><span>${e(model.totalLabel)}</span><b>Tk ${kit.money(model.total)}</b></div>
  <div class="vd-amount-words"><span>In Words</span><i>${e(kit.words(model.total))}</i></div>
</div>
<table class="pv-split vd-lines">
  <colgroup><col style="width:9mm"><col><col style="width:30mm"><col style="width:27mm"><col style="width:27mm"></colgroup>
  <thead><tr><th class="vd-c">SL</th><th>Account</th><th>Short Notes</th><th class="vd-r">Debit (Tk)</th><th class="vd-r">Credit (Tk)</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr class="vd-total"><td></td><td colspan="2" class="vd-r">Total</td><td class="vd-r vd-dr">${kit.money(totalDebit)}</td><td class="vd-r vd-cr">${kit.money(totalCredit)}</td></tr></tfoot>
</table>
<div class="vd-narration"><span>Narration</span><p>${e(model.narration || '—')}</p></div>
${notes}
<div class="vd-after">
${model.workflow.length ? kit.workflow(model.workflow) : ''}
${kit.signatures(model.signatures)}
</div>
</div>

<div class="pv-end">
${model.stamp ? `<div class="pv-printed">${e(model.stamp)}</div>` : ''}
</div>

</section>`;
}