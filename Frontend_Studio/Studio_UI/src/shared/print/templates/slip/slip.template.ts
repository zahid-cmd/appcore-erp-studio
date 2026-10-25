//===============================================================
// Shared SLIP print : layout (A4 sheet, two halves)
//
// Design (agreed 2026-10-23) : each half is a framed card with a
// light diagonal security pattern and a navy → blue copy ribbon
// down the left edge (CUSTOMER COPY / OFFICE COPY). Header :
// logo | company (left), QR (right). One title block : title
// ribbon (top row), number (left) / date (right) (bottom row).
// Then the wording ("Received with thanks from … vide …"), the
// amount box, signature(s) and footer.
//
// Watermark (CANCELLED / REVERSED) : one per half, centred on its
// card, under the content (not one across the whole sheet).
//
// Styles : slip.styles.ts · Model : slip-print.model.ts
//===============================================================

import
{
    PrintKit
}
from '../../print.models';

import
{
    SlipDocument,
    SlipFill,
    SlipPrintModel
}
from './slip-print.model';


export function slipDocumentHtml
(
    document:
        SlipDocument,
    kit:
        PrintKit
):
    string
{
    return document.slips
        .map
        (
            slip =>
            {
                const halves =
                    document.copies
                        .map(copy => slipHalfHtml(slip, copy, document.watermark ?? '', kit))
                        .join('\n<div class="sl-cut"><span>&#9986; cut here</span></div>\n');

                return `<section class="pv-page sl-sheet">
${halves}
</section>`;
            }
        )
        .join('\n');
}

function slipHalfHtml
(
    slip:
        SlipPrintModel,
    copy:
        string,
    watermark:
        string,
    kit:
        PrintKit
):
    string
{
    const e =
        kit.escape;

    const mark =
        watermark
            ? `<div class="sl-mark">${e(watermark)}</div>`
            : '';

    const qr =
        slip.qr
            ? kit.qr(slip.qr)
            : '';

    const fills =
        slip.fills
            .map(fill => fillHtml(fill, kit))
            .join('\n  ');

    return `<div class="sl-half">
<div class="sl-frame"></div>
${mark}
<div class="sl-spine"><span>${e(copy)}</span></div>
<div class="sl-top">
  ${companyBlock(slip, kit)}
  ${qr ? `<div class="sl-qr">${qr}</div>` : ''}
</div>
<div class="sl-titlebox">
  <div class="sl-ribbon"><div class="sl-title">${e(slip.title)}</div></div>
  <div class="sl-ids">
    <div class="sl-idc"><span>${e(slip.numberLabel)}</span><b>${e(slip.number)}</b></div>
    <div class="sl-idc sl-idc-right"><span>${e(slip.dateLabel)}</span><b>${e(slip.date)}</b></div>
  </div>
</div>
<div class="sl-lit">
  ${fills}
</div>
<div class="sl-bottom">
  <div class="sl-amount"><span>Tk</span><b>${kit.money(slip.amount)}</b></div>
  <div class="sl-note">${e(slip.note)}</div>
  <div class="sl-signs">${slip.receiverSignature ? `<div class="sl-sign"><div>${e(slip.receiverSignature)}</div></div>` : ''}<div class="sl-sign"><div>${e(slip.signature)}</div></div></div>
</div>
<div class="sl-foot"><span>${e(slip.stamp)}</span><span class="sl-valid">${e(slip.footnote)}</span></div>
</div>`;
}

function fillHtml
(
    fill:
        SlipFill,
    kit:
        PrintKit
):
    string
{
    const e =
        kit.escape;

    if
    (
        fill.rows
    )
    {
        const rows =
            fill.rows
                .map
                (
                    row =>
                        `<tr><td class="sl-vm"><span class="sl-chip">${e(row.tag)}</span></td><td>${e(row.detail)}</td><td class="sl-vr">Tk ${kit.money(row.amount)}</td></tr>`
                )
                .join('');

        return `<div class="sl-fill sl-vide"><span class="sl-lbl">${e(fill.label)}</span><div class="sl-vide-box"><table>${rows}</table></div></div>`;
    }

    const value =
        (fill.parts ?? [])
            .map
            (
                part =>
                    part.muted
                        ? `<small>${e(part.text)}</small>`
                        : e(part.text)
            )
            .join('');

    return `<div class="sl-fill"><span class="sl-lbl">${e(fill.label)}</span><span class="sl-val${fill.words ? ' sl-words' : ''}">${value || '&nbsp;'}</span></div>`;
}

// Logo | company name, address, contacts (+ BIN / TIN)
function companyBlock
(
    slip:
        SlipPrintModel,
    kit:
        PrintKit
):
    string
{
    const e =
        kit.escape;

    const company =
        kit.company;

    const address =
        [company?.AddressLine1, company?.AddressLine2]
            .map(part => (part ?? '').trim())
            .filter(part => !!part)
            .join(', ');

    const contact =
        [
            company?.Phone ? `Phone : ${company.Phone}` : '',
            company?.Mobile ? `Mobile : ${company.Mobile}` : ''
        ]
        .filter(part => !!part)
        .join(' · ');

    const tax =
        slip.legal
            ? [
                company?.BINNo ? `BIN : ${company.BINNo}` : '',
                company?.TINNo ? `TIN : ${company.TINNo}` : ''
            ]
            .filter(part => !!part)
            .join(' · ')
            : '';

    const logo =
        slip.logo && kit.logo
            ? `<img class="sl-logo" src="${e(kit.logo)}" alt=""><div class="sl-sep"></div>`
            : '';

    return `<div class="sl-brand">
    ${logo}
    <div class="sl-co">
      ${company?.CompanyName ? `<div class="sl-co-name">${e(company.CompanyName)}</div>` : ''}
      ${address ? `<div class="sl-co-line">${e(address)}</div>` : ''}
      ${contact ? `<div class="sl-co-line">${e(contact)}</div>` : ''}
      ${tax ? `<div class="sl-co-line">${e(tax)}</div>` : ''}
    </div>
  </div>`;
}