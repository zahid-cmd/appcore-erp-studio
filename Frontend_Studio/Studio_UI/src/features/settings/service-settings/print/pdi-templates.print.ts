//===============================================================
// PDI Templates : print source (Print Engine, 2026-11-10)
//
//   /print-viewer/pdi-templates/<template PublicId>?doc=blank-pdi-sheet
//                                                  (or bike-copy / office-copy)
//
// The BLANK PDI sheet of a template, filled by hand at the bike
// and typed into Bike Deliveries later. Two copies in one print :
// Bike Copy (goes with the bike) and Office Copy (kept). Same A4
// look as the filled sheet (bike-deliveries.print.ts) : Bangla
// first, English small; empty OK / Not OK boxes, reading lines
// with their units, Section B comment cells; the three role
// signatures. No model picture (a template covers many models).
// No company / voucher header : starts at the Bangla title.
// Compact : each copy fits one A4 page.
//===============================================================

import
{
    Injector
}
from '@angular/core';

import
{
    firstValueFrom
}
from 'rxjs';

import
{
    PrintKit,
    PrintSourceDef
}
from '../../../../shared/print/print.models';

import
{
    BIKE_DELIVERY_CSS
}
from '../../../sales-operations/motor-bike-sales/print/bike-deliveries.print';

import
{
    bikeImageUrl
}
from '../../../sales-operations/motor-bike-sales/services/bike-deliveries.service';

import
{
    PdiTemplate,
    PdiTemplateItem
}
from '../models/pdi-templates.model';

import
{
    PdiTemplatesService
}
from '../services/pdi-templates.service';


export interface PdiTemplatePrintData
{
    template:
        PdiTemplate;
}

const COPIES =
    ['Bike Copy', 'Office Copy'];


//===============================================================
// Helpers
//===============================================================

function bn(primaryBn: string, english: string, kit: PrintKit): string
{
    return primaryBn
        ? `<span class="bdp-bn">${kit.escape(primaryBn)}</span><span class="bdp-en">${kit.escape(english)}</span>`
        : `<span class="bdp-en-main">${kit.escape(english)}</span>`;
}

// The empty answer cell of an item
function blank(item: PdiTemplateItem, kit: PrintKit): string
{
    if (item.ItemType === 'Check')
    {
        return '<span class="pts-boxes"><span class="pts-box"></span><span class="pts-box pts-box-bad"></span></span>';
    }

    return `<span class="pts-line"></span>${item.ItemType === 'Reading' && item.Unit ? `<span class="pts-unit">${kit.escape(item.Unit)}</span>` : ''}`;
}

function sectionsHtml(t: PdiTemplate, kit: PrintKit): string
{
    let n = 0;

    return t.Sections
        .map(sec =>
        {
            if (sec.HasComments)
            {
                const rows =
                    sec.Items.map(item => `<tr>
  <td class="bdp-c">${++n}</td>
  <td>${bn(item.TextBn, item.Text, kit)}</td>
  <td class="bdp-c">${blank(item, kit)}</td>
  <td></td>
  <td></td>
</tr>`).join('');

                return `<table class="bdp-table pts-table pts-comments pv-split">
  <colgroup><col style="width:7mm"><col><col style="width:20mm"><col style="width:36mm"><col style="width:36mm"></colgroup>
  <thead><tr><th colspan="2">${bn(sec.TitleBn, sec.Title, kit)}</th><th class="bdp-c">OK / Not OK</th><th>Technician's comment</th><th>QC In-charge's comment</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
            }

            const first = n;
            const half = Math.ceil(sec.Items.length / 2);

            const cell =
                (item: PdiTemplateItem | undefined, i: number) =>
                    item
                        ? `<td class="bdp-c">${first + i + 1}</td><td>${bn(item.TextBn, item.Text, kit)}</td><td class="bdp-c">${blank(item, kit)}</td>`
                        : '<td></td><td></td><td></td>';

            const rows =
                Array.from({ length:half }, (_, i) =>
                    `<tr>${cell(sec.Items[i], i)}${cell(sec.Items[i + half], i + half)}</tr>`).join('');

            n += sec.Items.length;

            return `<table class="bdp-table pts-table pv-split">
  <colgroup><col style="width:7mm"><col><col style="width:20mm"><col style="width:7mm"><col><col style="width:20mm"></colgroup>
  <thead><tr><th colspan="6" class="bdp-sec">${bn(sec.TitleBn, sec.Title, kit)}</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;
        })
        .join('');
}

function copyHtml(t: PdiTemplate, kit: PrintKit, copy: string): string
{
    const e =
        (v: any) => kit.escape(v);

    const field =
        (label: string, wide = false) =>
            `<div class="pts-field${wide ? ' pts-wide' : ''}"><span>${e(label)}</span><i></i></div>`;

    return `<section class="pv-flow pts" data-watermark="${t.IsActive ? '' : 'INACTIVE'}">
<div class="pv-run-head">
<div class="pts-brand">
  <div class="pts-brand-logo">${t.BrandImagePath ? `<img src="${e(bikeImageUrl(t.BrandImagePath))}" alt="${e(t.BrandName)}">` : `<b>${e(t.BrandName)}</b>`}</div>
  <div class="pts-brand-sp">${e(t.ServiceProviderName)}</div>
</div>
<div class="pts-title">
  <div class="pts-t">
    <div class="pts-t-bn bdp-bn">${e(t.SheetTitleBn || 'প্রি-ডেলিভারি ইন্সপেকশন রিপোর্ট')}</div>
    <div class="pts-t-en">${e(t.SheetTitle || 'Pre-Delivery Inspection (PDI)')}</div>
  </div>
  <span class="pts-copy">${e(copy)}</span>
</div>
</div>
<div class="pv-body">
<div class="pts-fields">
  ${field('Delivery Date')}
  ${field('Challan No')}
  ${field('Customer / Dealer', true)}
  ${field('Mobile')}
  ${field('Address', true)}
  ${field('Model / Colour')}
  ${field('Chassis No')}
  ${field('Motor / Engine No')}
  ${field('Technician')}
</div>
${sectionsHtml(t, kit)}
<div class="bdp-boxes pts-notes">
  <div class="bdp-box pts-tall"><span>Problems found at delivery <i class="bdp-bn">(বাইক ডেলিভারি করার সময় কোন সমস্যা)</i></span></div>
  <div class="bdp-box pts-tall"><span>Remarks <i class="bdp-bn">(মন্তব্য)</i></span></div>
</div>
<div class="vd-after pts-sign">
${kit.signatures(['Technician', 'QC In-charge / Sales Officer', 'Warehouse In-charge / Sales Manager'])}
</div>
</div>
<div class="pv-end">
<div class="bdp-foot pts-foot">${t.FooterNoteBn ? `<span class="bdp-bn">${e(t.FooterNoteBn)}</span>` : ''}<span>${e(t.FooterNote)}</span></div>

</div>
</section>`;
}

function PDI_TEMPLATE_CSS(): string
{
    return BIKE_DELIVERY_CSS() + `
/* The engine moves each block into its own A4 page, so every
   rule is keyed on the block's own class (not on the section) */
.pts-title { display: flex; align-items: flex-end; justify-content: space-between; gap: 4mm; padding: 0 0 1.4mm; margin: 0 0 2mm; border-bottom: 0.6mm solid #1e3a8a; }
.pts-t { min-width: 0; }
.pts-t-bn { display: block; font-size: 13pt; font-weight: 700; line-height: 1.2; color: #0b2a5b; }
.pts-t-en { font-size: 7.6pt; font-weight: 700; letter-spacing: 0.8pt; text-transform: uppercase; color: #475569; }
.pts-copy { flex: 0 0 auto; padding: 0.6mm 2.4mm; border: 1px solid #94a3b8; border-radius: 1.2mm; font-size: 6.8pt; font-weight: 700; letter-spacing: 0.6pt; text-transform: uppercase; color: #334155; }
.pts-fields { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2.4mm 3.4mm; padding: 2mm 2.4mm; margin: 0 0 2.6mm; border: 1px solid #dbe3ef; border-radius: 1.6mm; }
.pts-field { display: flex; align-items: flex-end; gap: 1.4mm; min-width: 0; }
.pts-field.pts-wide { grid-column: span 2; }
.pts-field span { flex: 0 0 auto; font-size: 6pt; font-weight: 700; letter-spacing: 0.3pt; text-transform: uppercase; color: #64748b; }
.pts-field i { flex: 1; min-width: 10mm; height: 4mm; border-bottom: 1px dotted #94a3b8; }
.pts-brand { display: flex; align-items: center; justify-content: space-between; gap: 4mm; min-height: 9mm; margin: 0 0 1.6mm; }
.pts-brand-logo { display: flex; align-items: center; min-width: 0; }
.pts-brand-logo img { display: block; max-height: 9mm; max-width: 45mm; object-fit: contain; }
.pts-brand-logo b { font-size: 13pt; font-weight: 800; letter-spacing: 1pt; color: #0b2a5b; text-transform: uppercase; }
.pts-brand-sp { font-size: 11pt; font-weight: 800; color: #0b2a5b; text-align: right; }
.bdp-table.pts-table { margin: 0 0 2.4mm; }
/* Section B : room to write the Technician / QC comments */
.bdp-table.pts-comments td { height: 11.4mm; }
.bdp-table.pts-table th { padding: 0.6mm 1.2mm; font-size: 6.4pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* One line per check point : the rows keep the same height on
   every computer (Bangla fonts differ), so a copy stays on one A4 */
.bdp-table.pts-table td { height: 7mm; padding: 0 1.2mm; line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pts-table .bdp-bn { font-size: 7.2pt; line-height: 1.05; }
.pts-table .bdp-en { display: inline; margin-left: 1.2mm; font-size: 5.6pt; line-height: 1.05; }
.pts-table th .bdp-bn { font-size: 7.2pt; }
.pts-notes .bdp-bn { font-size: 6.8pt; }
.pts-title .pts-t-bn.bdp-bn { font-size: 13pt; }
.pts-boxes { display: inline-flex; gap: 1.6mm; }
.pts-box { display: inline-block; width: 3.4mm; height: 3.4mm; border: 1px solid #047857; border-radius: 0.5mm; }
.pts-box-bad { border-color: #be123c; }
.pts-line { display: inline-block; width: 10mm; height: 3mm; border-bottom: 1px dotted #64748b; vertical-align: bottom; }
.pts-unit { margin-left: 0.6mm; font-size: 6pt; font-weight: 700; color: #334155; }
.bdp-boxes.pts-notes { gap: 2mm; margin: 0 0 2mm; }
.pts-notes .bdp-box { padding: 1mm 2mm; border-radius: 1.6mm; }
.pts-tall { min-height: 19mm; }
.vd-after.pts-sign { margin-top: 0; padding-top: 1mm; }
.vd-after.pts-sign .pv-signs { padding-top: 10mm; }
.bdp-foot.pts-foot { margin: 0; font-size: 6.2pt; }
.pts-foot .bdp-bn { font-size: 6.6pt; }
`;
}


//===============================================================
// Source
//===============================================================

export const PDI_TEMPLATES_PRINT:
    PrintSourceDef<PdiTemplatePrintData> =
{
    key:'pdi-templates',

    title:'PDI Template',

    async load
    (
        injector: Injector,
        id: number | string
    ):
        Promise<PdiTemplatePrintData>
    {
        const template =
            await firstValueFrom(
                injector
                    .get(PdiTemplatesService)
                    .getById(String(id)));

        return { template };
    },

    denyReason
    (
        data: PdiTemplatePrintData
    ):
        string
    {
        return data.template.Sections.some(s => s.Items.length > 0)
            ? ''
            : 'This PDI template has no check points to print.';
    },

    fileName
    (
        data: PdiTemplatePrintData
    ):
        string
    {
        return `${data.template.Code || 'PDI'} Blank PDI Sheet`;
    },

    // The viewer's document drop-down : both copies (default),
    // or one copy
    documents:
    [
        {
            key:'blank-pdi-sheet',
            title:'Blank PDI Sheet - Bike + Office Copy',
            icon:'fas fa-clipboard-check',
            render:(data, kit) => COPIES.map(copy => copyHtml(data.template, kit, copy)).join('\n'),
            css:PDI_TEMPLATE_CSS()
        },
        {
            key:'bike-copy',
            title:'Blank PDI Sheet - Bike Copy',
            icon:'fas fa-motorcycle',
            render:(data, kit) => copyHtml(data.template, kit, COPIES[0]),
            css:PDI_TEMPLATE_CSS()
        },
        {
            key:'office-copy',
            title:'Blank PDI Sheet - Office Copy',
            icon:'fas fa-building',
            render:(data, kit) => copyHtml(data.template, kit, COPIES[1]),
            css:PDI_TEMPLATE_CSS()
        }
    ]
};
