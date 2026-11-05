//===============================================================
// Imports
//===============================================================

import
{
    Injector
}
from '@angular/core';

import
{
    qrSvg
}
from '../../../../shared/print/qr-code';

import
{
    PrintSourceDef
}
from '../../../../shared/print/print.models';

import
{
    code128Svg
}
from '../../../../shared/print/code128';

import
{
    LabelOptions,
    LabelPaper,
    brandLogoUrl,
    formatLabelDate,
    labelsPerPage,
    mrpText,
    paperMargins
}
from '../models/barcode-management.model';


//===============================================================
// Barcode labels : renderer + print window
//
// One renderer for the live preview (right panel of the page) and
// the printed sheets, all sizes in mm :
//
//   Sticker  : brand · name · part number · batch / date · MRP on
//              the left, QR on the right, Code-128 full width at
//              the bottom with its value under it.
//   Hang-tag : brand, model, colour, chassis / engine no, MRP, QR
//              (batch value | chassis no) and Code-128 (batch
//              value); 105 x 148.5 mm, 4 per A4 portrait.
//
// Printing : the Print Viewer (/print-viewer/barcode-labels/<token>).
// The page saves the labels under a token; every sheet / roll
// label is a fixed page that names its paper (data-paper-w / -h),
// so A4 sheets print on A4 and a thermal roll prints one label per
// page of the label's size.
//===============================================================

export interface LabelItem
{
    kind:'label' | 'tag';
    name:string;
    partNumber:string;
    code:string;
    brandName:string;
    // Brand Management image path ('' = none)
    brandLogo:string;
    mrp:number;
    batchNo:string;
    // yyyy-MM-dd
    date:string;
    barcode:string;
    qrText:string;
    // Hang-tag
    color:string;
    chassisNo:string;
    engineNo:string;
    keyNo?:string;
    batteryNo?:string;
}


//===============================================================
// CSS (prefixed bcl- / bct- : the page preview puts it in the page)
//===============================================================

export const LABEL_CSS =
`
.bcl, .bct { box-sizing: border-box; position: relative; overflow: hidden; background: #ffffff; color: #000000;
             font-family: Arial, Helvetica, sans-serif; line-height: 1.12; }
.bcl *, .bct * { box-sizing: border-box; }

/* Sticker : shared pieces */
.bcl { display: flex; }
.bcl-brand { display: flex; align-items: center; flex: 0 0 auto; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em;
             white-space: nowrap; overflow: hidden; line-height: 1.3; border-bottom: 0.2mm solid #000000; }
.bcl-brand img { display: block; object-fit: contain; object-position: left center; }
.bcl-name { flex: 0 0 auto; font-weight: 700; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; word-break: break-word; line-height: 1.1; }
.bcl-part { flex: 0 0 auto; font-family: 'Courier New', Courier, monospace; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: 0.02em; }
.bcl-mrp { display: flex; align-items: baseline; gap: 0.25em; flex: 0 0 auto; font-weight: 800; white-space: nowrap; overflow: hidden; line-height: 1; }
.bcl-mrp i { font-style: normal; font-weight: 700; font-size: 0.6em; letter-spacing: 0.04em; }
.bcl-meta { flex: 0 0 auto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; }
.bcl-code { font-family: 'Courier New', Courier, monospace; font-weight: 700; letter-spacing: 0.02em; }

/* Barcode sticker : text over a full-width barcode */
.bcl-b { flex-direction: column; }
.bcl-b .bcl-row { display: flex; align-items: baseline; justify-content: space-between; gap: 1.5mm; flex: 0 0 auto; min-width: 0; }
.bcl-b .bcl-row .bcl-part { flex: 1 1 auto; min-width: 0; }
.bcl-b .bcl-bar { flex: 1 1 auto; min-height: 0; width: 100%; }
.bcl-b .bcl-bar svg { display: block; width: 100%; height: 100%; }
.bcl-b .bcl-hr { display: flex; justify-content: space-between; gap: 0.8mm; flex: 0 0 auto; white-space: nowrap; overflow: hidden; line-height: 1.25; }
.bcl-b .bcl-hr span { overflow: hidden; text-overflow: ellipsis; }
.bcl-b .bcl-hr span + span { flex: 0 0 auto; }

/* QR sticker : the QR on the left, the text beside it */
.bcl-q { flex-direction: row; align-items: stretch; }
.bcl-q .bcl-qr { flex: 0 0 auto; align-self: center; padding: 0.9mm; border: 0.3mm solid #000000; border-radius: 1.4mm; }
.bcl-q .bcl-qr svg { display: block; width: 100%; height: 100%; }
.bcl-q .bcl-text { display: flex; flex-direction: column; justify-content: center; gap: 0.35mm; align-self: center; flex: 1 1 auto; min-width: 0; overflow: hidden; }
.bcl-q .bcl-mrp { margin-top: 0.3mm; padding-top: 0.5mm; border-top: 0.2mm solid #000000; }
.bcl-q .bcl-foot { flex: 0 0 auto; }

/* Hang-tag : shared */
.bct { display: flex; flex-direction: column; align-items: stretch; }
.bct > * { flex-shrink: 0; }
.bct-qr svg { display: block; width: 100%; height: 100%; }
.bct-bar svg { display: block; }
.bct-model { font-weight: 800; text-align: center; line-height: 1.08; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.bct-id { display: flex; justify-content: space-between; align-items: baseline; gap: 3mm; }
.bct-id span { font-size: 3.1mm; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; white-space: nowrap; }
.bct-id b { font-family: 'Courier New', Courier, monospace; font-size: 4.8mm; font-weight: 800; letter-spacing: 0.02em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bct-codes { display: flex; align-items: flex-end; gap: 4mm; margin-top: 2.4mm; }
.bct-qr { flex: 0 0 auto; width: 27mm; height: 27mm; }
.bct-barbox { flex: 1 1 auto; min-width: 0; }
.bct-bar { width: 100%; height: 21mm; }
.bct-hr { margin-top: 0.8mm; font-size: 3.1mm; text-align: center; font-family: 'Courier New', Courier, monospace; font-weight: 700; letter-spacing: 0.06em; white-space: nowrap; overflow: hidden; }
.bct-mrp-k { font-size: 3.2mm; font-weight: 800; letter-spacing: 0.24em; text-transform: uppercase; }
.bct-mrp-v { font-size: 10mm; font-weight: 800; line-height: 1; white-space: nowrap; letter-spacing: -0.01em; }
.bct-mrp-n { font-size: 2.7mm; letter-spacing: 0.14em; text-transform: uppercase; }

/* Hang-tag : Classic (black on white) */
.bct-c { padding: 0 6mm 4.5mm; border: 0.35mm solid #000000; border-radius: 4mm; }
.bct-c .bct-hole { align-self: center; width: 6.5mm; height: 6.5mm; margin: 3.2mm 0 1.2mm; border: 0.35mm solid #000000; border-radius: 50%;
                   box-shadow: 0 0 0 1.2mm #ffffff, 0 0 0 1.5mm #000000; }
.bct-c .bct-brand { display: flex; align-items: center; justify-content: center; height: 10mm; margin-top: 0.6mm; font-size: 8mm; font-weight: 800;
                    letter-spacing: 0.16em; text-transform: uppercase; overflow: hidden; }
.bct-c .bct-brand img { max-height: 11mm; max-width: 70mm; object-fit: contain; }
.bct-c .bct-rule { height: 1.3mm; margin: 1.6mm 18mm 0; border-top: 0.35mm solid #000000; border-bottom: 0.35mm solid #000000; }
.bct-c .bct-model { margin-top: 2.6mm; font-size: 6.6mm; }
.bct-c .bct-color { margin-top: 1.2mm; text-align: center; font-size: 3.2mm; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; }
.bct-c .bct-ids { margin: 3mm 0 2.4mm; padding: 0 3mm; border: 0.35mm solid #000000; border-radius: 2mm; }
.bct-c .bct-id { padding: 1.45mm 0; }
.bct-c .bct-id + .bct-id { border-top: 0.2mm dashed #000000; }
.bct-c .bct-mrp { display: flex; flex-direction: column; align-items: center; gap: 0.6mm; margin: auto 0; padding: 2.4mm 0 2.2mm;
                  border-radius: 2mm; background: #000000; color: #ffffff; }
.bct-c .bct-foot { margin-top: 2.6mm; padding-top: 1.6mm; border-top: 0.2mm solid #000000; font-size: 2.9mm; text-align: center; letter-spacing: 0.04em;
                   white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Hang-tag : Premium (colour) */
.bct-p { border: 0.3mm solid #c7d2e6; border-radius: 4mm; background: #ffffff; }
.bct-p .bct-head { position: relative; display: flex; flex-direction: column; align-items: center; height: 25mm; padding-top: 3mm; color: #ffffff;
                   background: radial-gradient(120% 140% at 100% 0%, rgba(96, 165, 250, 0.55) 0%, rgba(96, 165, 250, 0) 55%),
                               linear-gradient(160deg, #081a40 0%, #12307a 55%, #1d4ed8 100%); }
.bct-p .bct-head::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 1.3mm;
                          background: linear-gradient(90deg, #b45309 0%, #f59e0b 30%, #fde68a 50%, #f59e0b 70%, #b45309 100%); }
.bct-p .bct-hole { width: 6.5mm; height: 6.5mm; border-radius: 50%; background: #ffffff; box-shadow: 0 0 0 1.1mm rgba(255, 255, 255, 0.35); }
.bct-p .bct-brand { display: flex; align-items: center; justify-content: center; flex: 1 1 auto; max-width: 92mm; padding-bottom: 1.3mm; font-size: 8mm;
                    font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; overflow: hidden; }
.bct-p .bct-brand img { max-height: 11mm; max-width: 64mm; padding: 1mm 3mm; border-radius: 2mm; background: #ffffff; object-fit: contain; }
.bct-p .bct-body { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; padding: 3mm 6mm 2.6mm; }
.bct-p .bct-body > * { flex-shrink: 0; }
.bct-p .bct-model { font-size: 6.6mm; color: #0b2a5b; }
.bct-p .bct-color { align-self: center; display: inline-flex; align-items: center; gap: 1.6mm; margin-top: 1.6mm; padding: 0.8mm 3mm 0.8mm 1.2mm;
                    border: 0.25mm solid #c7d2fe; border-radius: 4mm; background: #eef2ff; font-size: 3.2mm; font-weight: 700; letter-spacing: 0.12em;
                    text-transform: uppercase; color: #1e3a8a; }
.bct-p .bct-swatch { width: 3.6mm; height: 3.6mm; border-radius: 50%; border: 0.25mm solid rgba(15, 23, 42, 0.35); }
.bct-p .bct-ids { margin: 2.6mm 0 2.4mm; padding: 0 3mm; border: 0.25mm solid #c7d5f0; border-left: 1.2mm solid #1d4ed8; border-radius: 2mm; background: #f3f6fd; }
.bct-p .bct-id { padding: 1.35mm 0; }
.bct-p .bct-id + .bct-id { border-top: 0.25mm solid #dde5f3; }
.bct-p .bct-id span { color: #475569; }
.bct-p .bct-id b { color: #0b2a5b; }
.bct-p .bct-mrp { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.5mm; margin: auto 0; padding: 2.2mm 0 2mm;
                  border-radius: 2.5mm; overflow: hidden; color: #ffffff;
                  background: radial-gradient(90% 160% at 0% 0%, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 50%),
                              linear-gradient(120deg, #c2410c 0%, #ea580c 40%, #f59e0b 100%);
                  box-shadow: inset 0 -0.6mm 0 rgba(0, 0, 0, 0.12); }
.bct-p .bct-mrp-k { color: #ffedd5; }
.bct-p .bct-mrp-n { color: #ffedd5; }
.bct-p .bct-codes { padding: 1.6mm 2mm; border: 0.25mm solid #dbe4f3; border-radius: 2mm; }
.bct-p .bct-hr { color: #0b2a5b; }
.bct-p .bct-foot { display: flex; align-items: center; justify-content: center; height: 6.4mm; padding: 0 5mm; color: #e0e7ff; font-size: 2.9mm; letter-spacing: 0.06em;
                   background: linear-gradient(90deg, #081a40, #12307a); white-space: nowrap; overflow: hidden; }
`;


//===============================================================
// One label
//===============================================================

export function renderLabel
(
    item:
        LabelItem,
    paper:
        LabelPaper,
    options:
        LabelOptions
):
    string
{
    return item.kind === 'tag'
        ? tagHtml(item, paper.labelWidth, paper.labelHeight, options)
        : stickerHtml(item, paper.labelWidth, paper.labelHeight, options);
}

// One code per sticker : the barcode design, or the QR design
// when only the QR is on
function stickerHtml
(
    item:
        LabelItem,
    width:
        number,
    height:
        number,
    o:
        LabelOptions
):
    string
{
    return o.qr && !o.code128
        ? qrStickerHtml(item, width, height, o)
        : barcodeStickerHtml(item, width, height, o);
}

// Brand · name · part number + MRP on one line · barcode (full
// width, the rest of the height) · its value + batch / date
function barcodeStickerHtml
(
    item:
        LabelItem,
    width:
        number,
    height:
        number,
    o:
        LabelOptions
):
    string
{
    // Scale against the 70 x 37 mm design
    const s =
        Math.min(height / 37, (width / 70) * 1.15);

    const pad =
        clamp(1.3 * s, 0.9, 1.6);

    const innerW =
        width - pad * 2;

    const font =
    {
        brand:clamp(2.4 * s, 1.5, 2.7),
        name:clamp(3.3 * s, 1.9, 3.6),
        part:clamp(2.8 * s, 1.7, 3.1),
        mrp:clamp(4.8 * s, 2.6, 5.2),
        hr:clamp(2.3 * s, 1.35, 2.5)
    };

    const parts:
        string[] = [];

    const brand =
        brandHtml(item, o, font.brand);

    if
    (
        brand
    )
    {
        parts.push(brand);
    }

    if
    (
        o.showName && item.name
    )
    {
        // Two lines when the name is long and the label tall enough
        const lines =
            height >= 30 && textWidth(item.name, font.name) > innerW ? 2 : 1;

        parts.push(`<div class="bcl-name" style="font-size:${mm(font.name)};-webkit-line-clamp:${lines};margin-top:${mm(0.4)}">${esc(item.name)}</div>`);
    }

    // Part number left, MRP right : one line
    const part =
        o.showPart && item.partNumber
            ? `<div class="bcl-part" style="font-size:${mm(font.part)}">${esc(item.partNumber)}</div>`
            : '<div class="bcl-part"></div>';

    const mrp =
        o.printMrp
            ? `<div class="bcl-mrp" style="font-size:${mm(font.mrp)}">${mrpHtml(o.mrpFormat, item.mrp)}</div>`
            : '';

    if
    (
        (o.showPart && item.partNumber) || o.printMrp
    )
    {
        parts.push(`<div class="bcl-row" style="margin-top:${mm(0.4)}">${part}${mrp}</div>`);
    }

    const meta =
        metaText(item, o);

    if
    (
        o.code128 && item.barcode
    )
    {
        parts.push(`<div class="bcl-bar" style="min-height:${mm((height - pad * 2) * 0.28)};margin-top:${mm(0.6)}">${code128Svg(item.barcode, '#000000')}</div>`);

        parts.push(`<div class="bcl-hr" style="font-size:${mm(font.hr)}"><span class="bcl-code">${esc(item.barcode)}</span>${meta ? `<span>${esc(meta)}</span>` : ''}</div>`);
    }
    else if
    (
        meta
    )
    {
        parts.push(`<div class="bcl-meta" style="font-size:${mm(font.hr)};margin-top:auto">${esc(meta)}</div>`);
    }

    return `<div class="bcl bcl-b" style="width:${mm(width)};height:${mm(height)};padding:${mm(pad)}">${parts.join('')}</div>`;
}

// QR (square, the label's height) on the left; brand, name, part
// number, MRP and the code / batch / date beside it
function qrStickerHtml
(
    item:
        LabelItem,
    width:
        number,
    height:
        number,
    o:
        LabelOptions
):
    string
{
    const s =
        Math.min(height / 37, (width / 70) * 1.15);

    const pad =
        clamp(1.3 * s, 0.9, 1.6);

    const innerW =
        width - pad * 2;

    const innerH =
        height - pad * 2;

    const qrSize =
        Math.min(innerH, innerW * 0.46);

    const gap =
        clamp(1.6 * s, 1, 2);

    const textW =
        innerW - qrSize - gap;

    // Design sizes, then one factor so the column fills the
    // label's height (no gaps, no overflow)
    const base =
    {
        brand:2.4 * s,
        name:3.4 * s,
        part:2.8 * s,
        mrp:5.0 * s,
        meta:2.2 * s
    };

    const hasBrand =
        o.showBrand && !!(item.brandName || item.brandLogo);

    const hasName =
        o.showName && !!item.name;

    const hasPart =
        o.showPart && !!item.partNumber;

    const meta =
        metaText(item, o);

    const nameLines =
        (size: number) =>
            hasName
                ? Math.max(1, Math.min(3, Math.ceil(textWidth(item.name, size) / Math.max(1, textW))))
                : 0;

    const needed =
        (k: number) =>
            (hasBrand ? base.brand * k * 1.45 + 0.5 : 0)
            + nameLines(base.name * k) * base.name * k * 1.1
            + (hasPart ? base.part * k * 1.2 : 0)
            + (o.printMrp ? base.mrp * k * 1.05 + 0.8 : 0)
            + (item.barcode ? base.meta * k * 1.25 : 0)
            + (meta ? base.meta * k * 1.25 : 0)
            + 1.4;

    let k =
        1;

    for
    (
        let i = 0;
        i < 6;
        i++
    )
    {
        k =
            clamp(k * qrSize / (needed(k) * 1.2), 0.55, 1.35);
    }

    // The code line must fit the column in Courier
    const metaMax =
        item.barcode ? textW / (item.barcode.length * 0.62) : 99;

    const font =
    {
        brand:Math.max(1.6, base.brand * k),
        name:Math.max(1.6, base.name * k),
        part:Math.max(1.5, base.part * k),
        // The amount fits the column (words at 0.6 of its size)
        mrp:Math.max(2.2, Math.min(base.mrp * k, mrpMax(o.mrpFormat, item.mrp, textW))),
        meta:Math.max(1.2, Math.min(base.meta * k, metaMax))
    };

    const lines:
        string[] = [];

    const brand =
        brandHtml(item, o, font.brand);

    if
    (
        brand
    )
    {
        lines.push(brand);
    }

    if
    (
        hasName
    )
    {
        lines.push(`<div class="bcl-name" style="font-size:${mm(font.name)};-webkit-line-clamp:${nameLines(font.name)}">${esc(item.name)}</div>`);
    }

    if
    (
        hasPart
    )
    {
        lines.push(`<div class="bcl-part" style="font-size:${mm(font.part)}">${esc(item.partNumber)}</div>`);
    }

    if
    (
        o.printMrp
    )
    {
        lines.push(`<div class="bcl-mrp" style="font-size:${mm(font.mrp)}">${mrpHtml(o.mrpFormat, item.mrp)}</div>`);
    }

    // The code (read by eye when the QR cannot be), then batch / date
    const foot =
        (item.barcode ? `<div class="bcl-meta bcl-code" style="font-size:${mm(font.meta)}">${esc(item.barcode)}</div>` : '')
        + (meta ? `<div class="bcl-meta" style="font-size:${mm(font.meta)}">${esc(meta)}</div>` : '');

    if
    (
        foot
    )
    {
        lines.push(`<div class="bcl-foot">${foot}</div>`);
    }

    const qr =
        item.qrText
            ? `<div class="bcl-qr" style="width:${mm(qrSize)};height:${mm(qrSize)};margin-right:${mm(gap)}">${qrSvg(item.qrText, '#000000', 1)}</div>`
            : '';

    return `<div class="bcl bcl-q" style="width:${mm(width)};height:${mm(height)};padding:${mm(pad)}">`
        + qr
        + `<div class="bcl-text" style="max-height:${mm(innerH)}">${lines.join('')}</div>`
        + `</div>`;
}

function brandHtml
(
    item:
        LabelItem,
    o:
        LabelOptions,
    size:
        number
):
    string
{
    if
    (
        !o.showBrand || !(item.brandName || item.brandLogo)
    )
    {
        return '';
    }

    const logo =
        o.brandAs === 'Logo' ? brandLogoUrl(item.brandLogo) : '';

    return logo
        ? `<div class="bcl-brand" style="height:${mm(size * 1.45)};padding-bottom:${mm(0.3)}"><img src="${esc(logo)}" alt="${esc(item.brandName)}" style="height:${mm(size * 1.25)};max-width:100%"></div>`
        : `<div class="bcl-brand" style="font-size:${mm(size)};padding-bottom:${mm(0.3)}">${esc(item.brandName)}</div>`;
}

// Largest MRP font (mm) whose line fits a width
function mrpMax
(
    format:
        string,
    mrp:
        number,
    width:
        number
):
    number
{
    const pattern =
        String(format ?? '').trim() || 'MRP {0}';

    const words =
        pattern.replace('{0}', '').trim().length;

    const amount =
        mrpText('{0}', mrp).length;

    return width / (amount * 0.6 + words * 0.42 + 0.4);
}

// Batch / date text (B31 · 28-Oct-26)
function metaText
(
    item:
        LabelItem,
    o:
        LabelOptions
):
    string
{
    return [
        o.showBatch && item.batchNo ? `B${item.batchNo}` : '',
        o.showDate && item.date ? formatLabelDate(item.date) : ''
    ]
    .filter(x => !!x)
    .join(' · ');
}

// Rough width (mm) of bold Arial text at a font size (mm)
function textWidth
(
    text:
        string,
    size:
        number
):
    number
{
    return String(text ?? '').length * size * 0.56;
}

// 'MRP {0}' → <i>MRP</i> 650.00 (the words smaller than the amount)
function mrpHtml
(
    format:
        string,
    mrp:
        number
):
    string
{
    const pattern =
        String(format ?? '').trim() || 'MRP {0}';

    const text =
        pattern.includes('{0}') ? pattern : `${pattern} {0}`;

    const [before, after] =
        [text.slice(0, text.indexOf('{0}')), text.slice(text.indexOf('{0}') + 3)];

    const amount =
        mrpText('{0}', mrp);

    return (before.trim() ? `<i>${esc(before.trim())}</i>` : '')
        + `<span>${esc(amount)}</span>`
        + (after.trim() ? `<i>${esc(after.trim())}</i>` : '');
}

function tagHtml
(
    item:
        LabelItem,
    width:
        number,
    height:
        number,
    o:
        LabelOptions
):
    string
{
    const premium =
        o.tagStyle === 'Premium';

    // Codes : dark navy on Premium (scans like black)
    const ink =
        premium ? '#0b1f4d' : '#000000';

    const logo =
        o.showBrand && o.brandAs === 'Logo'
            ? brandLogoUrl(item.brandLogo)
            : '';

    const brand =
        o.showBrand && (logo || item.brandName)
            ? `<div class="bct-brand">${logo ? `<img src="${esc(logo)}" alt="${esc(item.brandName)}">` : esc(item.brandName)}</div>`
            : '';

    const rows =
        [
            ['Chassis No', item.chassisNo],
            ['Engine No', item.engineNo],
            o.showKey ? ['Key No', item.keyNo ?? ''] : null,
            o.showBattery ? ['Battery No', item.batteryNo ?? ''] : null
        ]
        .filter((x): x is string[] => !!x)
        .map(([label, value]) => `<div class="bct-id"><span>${label}</span><b>${esc(value || '—')}</b></div>`)
        .join('');

    const mrp =
        o.printMrp
            ? `<div class="bct-mrp">${tagMrpHtml(o.mrpFormat, item.mrp)}<span class="bct-mrp-n">VAT inclusive</span></div>`
            : '';

    const qr =
        o.qr && item.qrText
            ? `<div class="bct-qr">${qrSvg(item.qrText, ink, 2)}</div>`
            : '';

    const bar =
        o.code128 && item.barcode
            ? `<div class="bct-barbox"><div class="bct-bar">${code128Svg(item.barcode, ink)}</div><div class="bct-hr">${esc(item.barcode)}</div></div>`
            : '';

    const foot =
        [
            item.code,
            o.showBatch && item.batchNo ? `Batch ${item.batchNo}` : '',
            o.showDate && item.date ? formatLabelDate(item.date) : ''
        ]
        .filter(x => !!x)
        .join('  ·  ');

    const swatch =
        colorSwatch(item.color);

    const color =
        item.color
            ? premium
                ? `<div class="bct-color">${swatch ? `<span class="bct-swatch" style="background:${swatch}"></span>` : ''}${esc(item.color)}</div>`
                : `<div class="bct-color">Colour · ${esc(item.color)}</div>`
            : '';

    const middle =
        `<div class="bct-model">${esc(item.name)}</div>`
        + color
        + `<div class="bct-ids">${rows}</div>`
        + mrp
        + (qr || bar ? `<div class="bct-codes">${qr}${bar}</div>` : '');

    if
    (
        premium
    )
    {
        return `<div class="bct bct-p" style="width:${mm(width)};height:${mm(height)}">`
            + `<div class="bct-head"><div class="bct-hole"></div>${brand}</div>`
            + `<div class="bct-body">${middle}</div>`
            + (foot ? `<div class="bct-foot">${esc(foot)}</div>` : '')
            + `</div>`;
    }

    return `<div class="bct bct-c" style="width:${mm(width)};height:${mm(height)}">`
        + `<div class="bct-hole"></div>`
        + brand
        + (brand ? `<div class="bct-rule"></div>` : '')
        + middle
        + (foot ? `<div class="bct-foot">${esc(foot)}</div>` : '')
        + `</div>`;
}

// 'MRP {0}' on a hang-tag : the words small over the amount
function tagMrpHtml
(
    format:
        string,
    mrp:
        number
):
    string
{
    const pattern =
        String(format ?? '').trim() || 'MRP {0}';

    const text =
        pattern.includes('{0}') ? pattern : `${pattern} {0}`;

    const words =
        text.replace('{0}', '').trim();

    return (words ? `<span class="bct-mrp-k">${esc(words)}</span>` : '')
        + `<span class="bct-mrp-v">${esc(mrpText('{0}', mrp))}</span>`;
}

// A swatch for a colour name (Red, Matt Black, Pearl White …); ''
// when the name is not a known colour
function colorSwatch
(
    name:
        string
):
    string
{
    const text =
        String(name ?? '').toLowerCase();

    const colors:
        [string, string][] =
        [
            ['black', '#111827'],
            ['white', '#ffffff'],
            ['silver', '#c0c6cf'],
            ['grey', '#6b7280'],
            ['gray', '#6b7280'],
            ['red', '#dc2626'],
            ['maroon', '#7f1d1d'],
            ['blue', '#2563eb'],
            ['navy', '#1e3a8a'],
            ['green', '#16a34a'],
            ['yellow', '#facc15'],
            ['orange', '#f97316'],
            ['brown', '#92400e'],
            ['golden', '#d4a017'],
            ['gold', '#d4a017'],
            ['purple', '#7c3aed'],
            ['pink', '#ec4899']
        ];

    return colors.find(([key]) => text.includes(key))?.[1] ?? '';
}


//===============================================================
// Pages : the labels on the sheet grid (first sheet from a
// position) / one label per roll page
//===============================================================

export interface LabelPages
{
    html:string;
    pages:number;
    labels:number;
}

// Gap (mm) kept round each label when cut lines are printed
const CUT_GAP =
    1.5;

// Dotted cut lines on the slot edges (between rows and columns and
// round the grid), with a scissors mark at the start of each line;
// an edge on the paper's edge needs no line
function cutLinesHtml
(
    paper:
        LabelPaper,
    margins:
        { left:number; top:number },
    nudgeX:
        number,
    nudgeY:
        number
):
    string
{
    const xs:
        number[] = [];

    const ys:
        number[] = [];

    for
    (
        let c = 0;
        c <= paper.cols;
        c++
    )
    {
        xs.push(
            c === 0
                ? margins.left
                : c === paper.cols
                    ? margins.left + paper.cols * paper.labelWidth + (paper.cols - 1) * paper.colGap
                    : margins.left + c * (paper.labelWidth + paper.colGap) - paper.colGap / 2);
    }

    for
    (
        let r = 0;
        r <= paper.rows;
        r++
    )
    {
        ys.push(
            r === 0
                ? margins.top
                : r === paper.rows
                    ? margins.top + paper.rows * paper.labelHeight + (paper.rows - 1) * paper.rowGap
                    : margins.top + r * (paper.labelHeight + paper.rowGap) - paper.rowGap / 2);
    }

    const left =
        xs[0] + nudgeX;

    const right =
        xs[xs.length - 1] + nudgeX;

    const top =
        ys[0] + nudgeY;

    const bottom =
        ys[ys.length - 1] + nudgeY;

    const inside =
        (value: number, size: number) =>
            value > 0.8 && value < size - 0.8;

    const lines:
        string[] = [];

    ys.forEach
    (
        y =>
        {
            const at =
                y + nudgeY;

            if
            (
                inside(at, paper.pageHeight)
            )
            {
                lines.push(`<div class="bcl-cut bcl-cut-h" style="left:${mm(left)};width:${mm(right - left)};top:${mm(at)}"><i style="left:${mm(Math.max(0.5, left) - left + 0.5)}">✂</i></div>`);
            }
        }
    );

    xs.forEach
    (
        x =>
        {
            const at =
                x + nudgeX;

            if
            (
                inside(at, paper.pageWidth)
            )
            {
                lines.push(`<div class="bcl-cut bcl-cut-v" style="top:${mm(top)};height:${mm(bottom - top)};left:${mm(at)}"><i style="top:${mm(0.5)}">✂</i></div>`);
            }
        }
    );

    return lines.join('');
}

export function renderPages
(
    items:
        LabelItem[],
    paper:
        LabelPaper,
    options:
        LabelOptions,
    startAt:
        number,
    nudgeX:
        number = 0,
    nudgeY:
        number = 0
):
    LabelPages
{
    const perPage =
        labelsPerPage(paper);

    const skip =
        paper.kind === 'roll'
            ? 0
            : Math.min(perPage - 1, Math.max(0, Math.floor(startAt) - 1));

    const margins =
        paper.kind === 'roll'
            ? { left:0, top:0 }
            : paperMargins(paper);

    const pages:
        string[][] = [];

    const slotOf =
        (position: number, inner: string, used: boolean) =>
        {
            const row =
                Math.floor(position / paper.cols);

            const col =
                position % paper.cols;

            const left =
                margins.left + col * (paper.labelWidth + paper.colGap) + nudgeX;

            const top =
                margins.top + row * (paper.labelHeight + paper.rowGap) + nudgeY;

            // Cut lines : the label sits inset in its slot, leaving a
            // gap around it for the scissors
            const inset =
                cut ? CUT_GAP : 0;

            return `<div class="bcl-slot${used ? ' bcl-used' : ''}" style="left:${mm(left + inset)};top:${mm(top + inset)};width:${mm(paper.labelWidth - inset * 2)};height:${mm(paper.labelHeight - inset * 2)}">${inner}</div>`;
        };

    // Cut lines : sheets of plain paper and hang-tags (not rolls)
    const cut =
        !!options.cutLines && paper.kind !== 'roll';

    // The label inside the gap
    const inner =
        cut
            ? { ...paper, labelWidth:paper.labelWidth - CUT_GAP * 2, labelHeight:paper.labelHeight - CUT_GAP * 2 }
            : paper;

    const guides =
        cut
            ? cutLinesHtml(paper, margins, nudgeX, nudgeY)
            : '';

    // Positions already used on the part-used sheet (screen only)
    if
    (
        skip > 0 && items.length > 0
    )
    {
        pages.push([]);

        for
        (
            let i = 0;
            i < skip;
            i++
        )
        {
            pages[0].push(slotOf(i, '', true));
        }
    }

    items.forEach
    (
        (item, index) =>
        {
            const slot =
                skip + index;

            const page =
                Math.floor(slot / perPage);

            while
            (
                pages.length <= page
            )
            {
                pages.push([]);
            }

            pages[page].push(slotOf(slot % perPage, renderLabel(item, inner, options), false));
        }
    );

    // Fixed pages of the Print Viewer, each on the paper's size
    const html =
        pages
            .map
            (
                slots =>
                    `<section class="pv-page bcl-page${cut ? ' bcl-page-cut' : ''}" data-paper-w="${paper.pageWidth}" data-paper-h="${paper.pageHeight}">${guides}${slots.join('')}</section>`
            )
            .join('');

    return {
        html,
        pages:pages.length,
        labels:items.length
    };
}


//===============================================================
// Print request (saved by the page under a token : the viewer's id)
//===============================================================

export const BARCODE_LABELS_PRINT_KEY =
    'barcode-labels';

export interface BarcodeLabelsPrintRequest
{
    // 'Barcode Labels' / 'Motor Bike Hang-Tags'
    title:string;
    // Spare Parts · A4 3 × 8 · 24 labels · 1 page
    caption:string;
    // One per copy
    items:LabelItem[];
    paper:LabelPaper;
    options:LabelOptions;
    startAt:number;
    nudgeX:number;
    nudgeY:number;
}

const STORAGE_PREFIX =
    'appcore.barcode-labels-print.';

// Saves the request (older ones are dropped : a label list can be
// long); returns its token. 0 : the browser storage is blocked.
export function saveBarcodeLabelsPrintRequest
(
    request:
        BarcodeLabelsPrintRequest
):
    number
{
    const token =
        Date.now();

    try
    {
        Object.keys(localStorage)
            .filter(key => key.startsWith(STORAGE_PREFIX))
            .forEach(key => localStorage.removeItem(key));

        localStorage.setItem(
            STORAGE_PREFIX + token,
            JSON.stringify(request)
        );

        return token;
    }
    catch
    {
        return 0;
    }
}

function readBarcodeLabelsPrintRequest
(
    token:
        number
):
    BarcodeLabelsPrintRequest | null
{
    try
    {
        const text =
            localStorage.getItem(STORAGE_PREFIX + token);

        return text
            ? JSON.parse(text) as BarcodeLabelsPrintRequest
            : null;
    }
    catch
    {
        return null;
    }
}


//===============================================================
// Print source (Print Viewer)
//===============================================================

// Slot guides and used positions : on screen only
const LABELS_PRINT_CSS = `
.bcl-page .bcl-slot { position: absolute; overflow: hidden; }
.bcl-page-cut .bcl-slot { outline: none !important; }
.bcl-page .bcl-cut { position: absolute; z-index: 1; pointer-events: none; }
.bcl-page .bcl-cut-h { height: 0; border-top: 0.25mm dashed #475569; }
.bcl-page .bcl-cut-v { width: 0; border-left: 0.25mm dashed #475569; }
.bcl-page .bcl-cut i { position: absolute; font-style: normal; font-size: 3.4mm; line-height: 1; color: #334155; background: #ffffff;
                       font-family: 'Segoe UI Symbol', 'DejaVu Sans', Arial, sans-serif; }
.bcl-page .bcl-cut-h i { top: -1.8mm; }
.bcl-page .bcl-cut-v i { left: -1.75mm; transform: rotate(90deg); }
@media screen
{
    .bcl-page .bcl-slot { outline: 0.2mm dashed #cbd5e1; outline-offset: -0.1mm; }
    .bcl-page .bcl-slot.bcl-used { background: repeating-linear-gradient(45deg, #f1f5f9 0 2mm, #e2e8f0 2mm 4mm); }
}
${LABEL_CSS}
`;

export const BARCODE_LABELS_PRINT:
    PrintSourceDef<BarcodeLabelsPrintRequest> =
{
    key:BARCODE_LABELS_PRINT_KEY,

    title:'Barcode Labels',

    async load
    (
        _injector:
            Injector,
        id:
            number
    ):
        Promise<BarcodeLabelsPrintRequest>
    {
        const request =
            readBarcodeLabelsPrintRequest(id);

        if
        (
            !request
            ||
            !Array.isArray(request.items)
            ||
            request.items.length === 0
        )
        {
            throw new Error(
                'The labels are no longer here. Press Print on Barcode Management again.');
        }

        return request;
    },

    denyReason():
        string
    {
        return '';
    },

    fileName
    (
        data:
            BarcodeLabelsPrintRequest
    ):
        string
    {
        return data.caption || data.title;
    },

    documents:
    [
        {
            key:'labels',

            title:'Labels',

            icon:'fas fa-barcode',

            render
            (
                data:
                    BarcodeLabelsPrintRequest
            ):
                string
            {
                return renderPages(
                    data.items,
                    data.paper,
                    data.options,
                    data.startAt,
                    data.nudgeX,
                    data.nudgeY
                ).html;
            },

            css:LABELS_PRINT_CSS
        }
    ]
};


//===============================================================
// Helpers
//===============================================================

function mm
(
    value:
        number
):
    string
{
    return `${Math.round((Number(value) || 0) * 100) / 100}mm`;
}

function clamp
(
    value:
        number,
    min:
        number,
    max:
        number
):
    number
{
    return Math.min(max, Math.max(min, value));
}

export function esc
(
    value:
        string | number | null | undefined
):
    string
{
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
