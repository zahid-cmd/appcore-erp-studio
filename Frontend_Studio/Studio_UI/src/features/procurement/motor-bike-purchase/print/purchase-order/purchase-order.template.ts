//===============================================================
// PURCHASE ORDER print : layout, styles, Excel
//
// Design (supplier copy, A4) :
//   logo | company | QR · title ribbon with the PO number · info
//   strip with the status stamp (kit.voucherHead, repeated on
//   every page)
//   Supplier (small heading on top, one compact line : name,
//   contact, phone, BIN, credit days, address)
//   Total Payable + amount in words (thin bar)
//   SL / Product / Qty / Unit Price / VAT % / VAT / Line Total
//   (splits across pages, header repeated, totals with the last
//   part)
//   Terms & Narration, notes, workflow line, signatures
//
// Reuses the voucher print styles (vd-*) for the amount bar,
// table, narration and signatures; po-* adds the supplier
// block and the totals.
//===============================================================

import
{
    roundMoney
}
from '../../../../../shared/components/accounting/accounting.models';

import
{
    ExcelCell,
    ExcelSheet,
    PrintKit,
    PrintWorkflowStep
}
from '../../../../../shared/print/print.models';

import
{
    VOUCHER_DOCUMENT_CSS
}
from '../../../../../shared/print/templates/voucher/voucher.styles';

import
{
    PurchaseOrder
}
from '../../models/purchase-orders-mb.model';


//===============================================================
// Data
//===============================================================

export interface PurchaseOrderPrintSupplier
{
    Name:
        string;

    Code:
        string;

    ContactPerson:
        string;

    Phone:
        string;

    Email:
        string;

    Address:
        string;

    BinNo:
        string;

    CreditDays:
        number | null;
}

export interface PurchaseOrderPrintData
{
    order:
        PurchaseOrder;

    // null when the supplier profile could not be read
    supplier:
        PurchaseOrderPrintSupplier | null;
}


//===============================================================
// Names by page type
//===============================================================

export const PURCHASE_ORDER_PAGE_TITLES:
    Record<string, string> =
{
    MB:'Purchase Order - MB',
    SP:'Purchase Order - SP',
    AC:'Purchase Order - AC'
};

const PRODUCT_HEADERS:
    Record<string, string> =
{
    MB:'Motor Bike',
    SP:'Spare Part / Lubricant',
    AC:'Accessory'
};

export function purchaseOrderTitle
(
    order:
        PurchaseOrder
):
    string
{
    return PURCHASE_ORDER_PAGE_TITLES[order.PageType] ?? 'Purchase Order';
}

// POMB-010101-2627-10-00001 → FY 2026-2027
function financialYear
(
    orderNo:
        string
):
    string
{
    const code =
        (orderNo ?? '').split('-')[2] ?? '';

    return /^\d{4}$/.test(code)
        ? `FY 20${code.slice(0, 2)}-20${code.slice(2)}`
        : '';
}


//===============================================================
// Shared pieces
//===============================================================

function meta
(
    order:
        PurchaseOrder,
    kit:
        PrintKit
):
    { label: string; value: string }[]
{
    return [
        { label:'PO Date', value:kit.date(order.OrderDate) },
        { label:'Expected Delivery', value:order.ExpectedDate ? kit.date(order.ExpectedDate) : '—' },
        { label:'Branch', value:order.BranchName },
        { label:'Financial Year', value:financialYear(order.OrderNo) },
        { label:'Prices', value:order.PriceIncludesVat ? 'VAT Inclusive' : 'VAT Exclusive' }
    ];
}

function workflow
(
    order:
        PurchaseOrder,
    kit:
        PrintKit
):
    PrintWorkflowStep[]
{
    const steps:
        PrintWorkflowStep[] =
    [
        { label:'Created', value:kit.dateTime(order.CreatedDate), tone:'done' },
        { label:'Approved', value:kit.dateTime(order.ApprovedDate), tone:'done' },
        { label:'Placed', value:kit.dateTime(order.PlacedDate), tone:'final' }
    ];

    if
    (
        order.Status === 'Cancelled'
        ||
        order.Status === 'Closed Short'
    )
    {
        steps.push(
            {
                label:order.Status,
                value:kit.dateTime(order.ClosedDate),
                tone:'cancel'
            }
        );
    }

    return steps;
}


//===============================================================
// Layout
//===============================================================

export function purchaseOrderDocumentHtml
(
    data:
        PurchaseOrderPrintData,
    kit:
        PrintKit,
    options:
    {
        logo:boolean;
        legal:boolean;
        stamp:boolean;
    }
):
    string
{
    const e =
        kit.escape;

    const order =
        data.order;

    const supplier =
        data.supplier;

    const status =
        String(order.Status ?? '');

    const lines =
        order.Lines ?? [];

    const totalAmount =
        roundMoney(lines.reduce((sum, line) => sum + line.Amount, 0));

    const totalVat =
        roundMoney(lines.reduce((sum, line) => sum + line.VatAmount, 0));

    const totalPayable =
        roundMoney(lines.reduce((sum, line) => sum + line.LineTotal, 0));

    const totalQuantity =
        lines.reduce((sum, line) => sum + line.Quantity, 0);

    const units =
        [...new Set(lines.map(line => line.Unit).filter(Boolean))];

    const totalUnit =
        units.length === 1 ? units[0] : 'Pcs';

    const rows =
        lines
            .map
            (
                (line, index) =>
                    `<tr>
<td class="vd-c vd-sl">${index + 1}</td>
<td><div class="vd-main">${e(line.ProductName)}</div><div class="vd-sub">${e(line.ProductCode)}${line.ShortNotes ? ` · ${e(line.ShortNotes)}` : ''}</div></td>
<td class="vd-r">${e(line.Quantity)} <span class="po-unit">${e(line.Unit)}</span></td>
<td class="vd-r">${kit.money(line.UnitPrice)}</td>
<td class="vd-r">${e(line.VatRate)}</td>
<td class="vd-r">${kit.money(line.VatAmount)}</td>
<td class="vd-r po-total-col">${kit.money(line.LineTotal)}</td>
</tr>`
            )
            .join('');

    // Supplier : small heading on top, then one line of compact
    // label / value pairs (lighter than the info strip)
    const fact =
        (label: string, value: string, sub: string = ''): string =>
            `<div class="po-fact"><span>${e(label)}</span><b>${e(value || '—')}</b>${sub ? `<i>${e(sub)}</i>` : ''}</div>`;

    const supplierBlock =
        `<div class="po-sup">
  <div class="po-sup-head">Supplier</div>
  <div class="po-sup-row">
    ${fact('Name', supplier?.Name || order.SupplierName, supplier?.Code || order.SupplierCode)}
    ${fact('Contact Person', supplier?.ContactPerson ?? '')}
    ${fact('Phone', supplier?.Phone ?? '', supplier?.Email ?? '')}
    ${fact('BIN', supplier?.BinNo ?? '')}
    ${fact('Credit Days', supplier?.CreditDays != null ? `${supplier.CreditDays} days` : '')}
    ${fact('Address', supplier?.Address ?? '')}
  </div>
</div>`;

    const notes =
        [
            status === 'Cancelled' && order.CloseReason
                ? `<div class="vd-note vd-danger">Cancelled on ${e(kit.date(order.ClosedDate))} : ${e(order.CloseReason)}</div>`
                : '',
            status === 'Closed Short' && order.CloseReason
                ? `<div class="vd-note">&#9888; Closed short on ${e(kit.date(order.ClosedDate))} : ${e(order.CloseReason)}</div>`
                : '',
            `<div class="po-fine">VAT shown is an estimate at the rate in force on the PO date; the supplier's Mushak 6.3 is final.</div>`
        ]
        .join('');

    const head =
        kit.voucherHead(
        {
            copy:'',
            title:purchaseOrderTitle(order),
            numberLabel:'PO No',
            number:order.OrderNo,
            meta:meta(order, kit),
            status,
            qr:
                [
                    kit.company?.CompanyName || 'AppCore ERP',
                    'Purchase Order',
                    order.OrderNo,
                    kit.date(order.OrderDate),
                    order.SupplierName,
                    `Tk ${kit.money(totalPayable)}`,
                    status
                ]
                .filter(part => !!part)
                .join(' | '),
            logo:options.logo,
            legal:options.legal
        });

    return `<section class="pv-flow" data-watermark="${status === 'Cancelled' ? 'CANCELLED' : ''}">
<div class="pv-run-head">
${head}
</div>
<div class="pv-body">
${supplierBlock}
<div class="vd-amount">
  <div class="vd-amount-total"><span>Total Payable</span><b>Tk ${kit.money(totalPayable)}</b></div>
  <div class="vd-amount-words"><span>In Words</span><i>${e(kit.words(totalPayable))}</i></div>
</div>
<table class="pv-split vd-lines po-lines">
  <colgroup><col style="width:9mm"><col><col style="width:16mm"><col style="width:25mm"><col style="width:13mm"><col style="width:23mm"><col style="width:34mm"></colgroup>
  <thead><tr><th class="vd-c">SL</th><th>${e(PRODUCT_HEADERS[order.PageType] ?? 'Product')}</th><th class="vd-r">Qty</th><th class="vd-r">Unit Price</th><th class="vd-r">VAT %</th><th class="vd-r">VAT (Tk)</th><th class="vd-r po-nowrap">Line Total (Tk)</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr class="po-sum po-sum-first"><td></td><td class="vd-r">Amount (excl. VAT)</td><td class="vd-r">${totalQuantity} <span class="po-unit">${e(totalUnit)}</span></td><td colspan="3"></td><td class="vd-r">${kit.money(totalAmount)}</td></tr>
    <tr class="po-sum"><td></td><td class="vd-r">VAT (estimate)</td><td colspan="4"></td><td class="vd-r">${kit.money(totalVat)}</td></tr>
    <tr class="vd-total"><td></td><td class="vd-r">Total Payable</td><td colspan="4"></td><td class="vd-r">${kit.money(totalPayable)}</td></tr>
  </tfoot>
</table>
<div class="vd-narration"><span>Terms &amp; Narration</span><p>${e(order.Narration || '—')}</p></div>
${notes}
<div class="vd-after">
${kit.workflow(workflow(order, kit))}
${kit.signatures(['Prepared By', 'Approved By', 'Authorised Signature', 'Supplier Acceptance'])}
</div>
</div>
<div class="pv-end">
${options.stamp ? `<div class="pv-printed">${e(order.BranchName ? order.BranchName + ' · ' : '')}Printed ${e(kit.now())}</div>` : ''}
</div>
</section>`;
}


//===============================================================
// Styles (voucher styles + party boxes and totals)
//===============================================================

export function PURCHASE_ORDER_DOCUMENT_CSS():
    string
{
    return VOUCHER_DOCUMENT_CSS() + `
/* Supplier : thin heading on top, one compact line of facts */
.po-sup { margin: 0 0 3.2mm; border: 1px solid #dbe3ef; border-radius: 2mm; overflow: hidden; }
.po-sup-head { padding: 0.9mm 3.5mm; border-bottom: 1px solid #e2e8f0; background: rgba(37, 99, 235, 0.05);
               font-size: 6.4pt; font-weight: 800; letter-spacing: 1.4pt; text-transform: uppercase; color: #1e3a8a; }
.po-sup-row { display: grid; grid-template-columns: 1.6fr 1.1fr 1.2fr 0.9fr 0.7fr 1.3fr; column-gap: 3mm; padding: 1.6mm 3.5mm 1.8mm; }
.po-fact { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
.po-fact span { font-size: 6pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: #94a3b8; }
.po-fact b { font-size: 8.4pt; font-weight: 700; color: #0f172a; overflow-wrap: anywhere; }
.po-fact i { font-size: 7pt; font-style: normal; color: #64748b; overflow-wrap: anywhere; }

/* Status stamps the voucher header has no colour for */
.pv-vh-stamp-placed { border-color: #0369a1; color: #0369a1; }
.pv-vh-stamp-completed { border-color: #15803d; color: #15803d; }
.pv-vh-stamp-closed { border-color: #c2410c; color: #c2410c; }

/* Lines */
.po-unit { font-size: 7pt; color: #64748b; }
.po-nowrap { white-space: nowrap; }
.pv-vh-title { white-space: nowrap; }
.po-lines .po-total-col { background: rgba(37, 99, 235, 0.04); font-weight: 600; }
.po-sum td { border-bottom: 0; padding-top: 1.4mm; padding-bottom: 1.4mm; font-weight: 600; }
.po-sum-first td { border-top: 1.4px solid #0f172a; padding-top: 2.4mm; }
.po-lines .vd-total td { border-top: 1px solid #94a3b8; }

/* Fine print */
.po-fine { margin-top: 2.5mm; font-size: 7.4pt; color: #64748b; }
`;
}


//===============================================================
// Excel
//===============================================================

export function purchaseOrderDocumentSheet
(
    data:
        PurchaseOrderPrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const order =
        data.order;

    const lines =
        order.Lines ?? [];

    const label =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    const info =
    [
        { label:'PO No', value:order.OrderNo },
        ...meta(order, kit),
        { label:'Status', value:order.Status },
        { label:'Supplier', value:data.supplier?.Name || order.SupplierName },
        { label:'Supplier BIN', value:data.supplier?.BinNo ?? '' }
    ];

    const infoRows:
        ExcelCell[][] =
        [];

    for
    (
        let i = 0;
        i < info.length;
        i += 2
    )
    {
        const left =
            info[i];

        const right =
            info[i + 1];

        infoRows.push(
            right
                ? [label(left.label), left.value, null, label(right.label), right.value]
                : [label(left.label), left.value]
        );
    }

    const totalAmount =
        roundMoney(lines.reduce((sum, line) => sum + line.Amount, 0));

    const totalVat =
        roundMoney(lines.reduce((sum, line) => sum + line.VatAmount, 0));

    const totalPayable =
        roundMoney(lines.reduce((sum, line) => sum + line.LineTotal, 0));

    const rows:
        ExcelCell[][] =
    [
        [{ v:kit.company?.CompanyName ?? '', s:'title' }],
        [{ v:purchaseOrderTitle(order).toUpperCase(), s:'bold' }],
        [],
        ...infoRows,
        [label('Terms & Narration'), order.Narration],
        [],
        [label('SL'), label('Product'), label('Code'), label('Short Notes'), label('Qty'), label('Unit Price'), label('VAT %'), label('Amount'), label('VAT'), label('Line Total')],
        ...lines.map
        (
            (line, index) =>
            [
                index + 1,
                line.ProductName,
                line.ProductCode,
                line.ShortNotes,
                line.Quantity,
                { v:line.UnitPrice, s:'money' },
                line.VatRate,
                { v:line.Amount, s:'money' },
                { v:line.VatAmount, s:'money' },
                { v:line.LineTotal, s:'money' }
            ] as ExcelCell[]
        ),
        [null, label('Total'), null, null, lines.reduce((sum, line) => sum + line.Quantity, 0), null, null, { v:totalAmount, s:'boldMoney' }, { v:totalVat, s:'boldMoney' }, { v:totalPayable, s:'boldMoney' }],
        [],
        [label('In Words'), kit.words(totalPayable)]
    ];

    const narrationRow =
        3 + infoRows.length + 1;

    return {
        name:
            order.OrderNo
                ? `PO ${order.OrderNo.split('-').slice(-2).join('-')}`
                : 'Purchase Order',
        rows,
        columns:[8, 40, 22, 24, 8, 16, 8, 16, 16, 16],
        merges:['A1:J1', 'A2:J2', `B${narrationRow}:J${narrationRow}`]
    };
}