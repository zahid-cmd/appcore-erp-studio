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
//   Pricing terms line (Invoice Price, Margin % on an MRP
//   invoice, Additional Discount)
//   SL / Product / Qty (+ free) / MRP / [Margin %] / DP / Line Total
//   (MB : SL / Product / Qty / Unit Price / VAT % / VAT / Line
//   Total, no pricing terms line)
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
    PurchaseOrder,
    PurchaseOrderProductOption
}
from '../purchase-order.model';


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

    // Items with their stock levels (Internal copy); [] when not
    // read
    products?:
        PurchaseOrderProductOption[];
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

// POSP-010101-2627-10-00001 → FY 2026-2027
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
        // Internal copy : adds the stock position (never sent to
        // the supplier)
        internal?:boolean;
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

    // The server's saved figures (pricing, discount, rounding)
    const totalVat =
        roundMoney(lines.reduce((sum, line) => sum + line.VatAmount, 0));

    const totalPayable =
        order.TotalPayable;

    const netAmount =
        roundMoney(lines.reduce((sum, line) => sum + line.NetAmount, 0));

    const totalQuantity =
        lines.reduce((sum, line) => sum + line.Quantity, 0);

    const totalFree =
        lines.reduce((sum, line) => sum + (line.FreeQuantity || 0), 0);

    const mrpInvoice =
        order.InvoicePriceBasis === 'MRP';

    // VAT charged on this order; any of it not claimable (in cost)
    const vatCharged =
        order.VatCharged !== false;

    const vatInCost =
        vatCharged && lines.some(line => line.VatClaimable === false);

    const showRoundOff =
        order.RoundingMethod !== 'None'
        &&
        !order.WholeTakaLines;

    const units =
        [...new Set(lines.map(line => line.Unit).filter(Boolean))];

    const totalUnit =
        units.length === 1 ? units[0] : 'Pcs';

    // Motor bikes : unit price only (no MRP pricing)
    const mb =
        order.PageType === 'MB';

    const rows =
        mb
        ? lines
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
            .join('')
        : lines
            .map
            (
                (line, index) =>
                    `<tr>
<td class="vd-c vd-sl">${index + 1}</td>
<td><div class="vd-main">${e(line.ProductName)}</div><div class="vd-sub">${e(line.ProductCode)}${line.ShortNotes ? ` · ${e(line.ShortNotes)}` : ''}</div></td>
<td class="vd-r">${e(line.Quantity)} <span class="po-unit">${e(line.Unit)}</span>${line.FreeQuantity > 0 ? `<div class="po-free">+${e(line.FreeQuantity)} free</div>` : ''}</td>
${mrpInvoice ? `<td class="vd-r">${line.Mrp > 0 ? kit.money(line.Mrp) : '—'}</td>` : ''}
${mrpInvoice ? `<td class="vd-r">${e(line.ProfitPercent)}</td>` : ''}
<td class="vd-r">${kit.money(line.UnitPrice)}</td>
<td class="vd-r po-total-col">${kit.money(line.DpAmount)}</td>
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
            copy:options.internal ? 'INTERNAL COPY' : '',
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
${mb
    ? `<div class="po-terms"><span>Prices <b>${!vatCharged ? (order.PurchaseVatApplicable === false ? 'No VAT (not applicable)' : 'No VAT') : order.PriceIncludesVat ? 'incl. VAT' : 'excl. VAT'}</b></span></div>`
    : `<div class="po-terms">
  <span>Invoice Price <b>${mrpInvoice ? 'MRP' : 'DP'}</b></span>
  ${mrpInvoice && order.DefaultProfitPercent > 0 ? `<span>Margin <b>${e(order.DefaultProfitPercent)}%</b> on MRP</span>` : ''}
  ${order.AdditionalDiscountAmount > 0 ? `<span>Additional Discount <b>${order.AdditionalDiscountType === 'Percent' ? `${e(order.AdditionalDiscountValue)}%` : `Tk ${kit.money(order.AdditionalDiscountAmount)}`}</b></span>` : ''}
  <span>Prices <b>${!vatCharged ? (order.PurchaseVatApplicable === false ? 'No VAT (not applicable)' : 'No VAT') : order.PriceIncludesVat ? 'incl. VAT' : 'excl. VAT'}</b></span>
</div>`}
<table class="pv-split vd-lines po-lines">
  ${mb
    ? `<colgroup><col style="width:9mm"><col><col style="width:16mm"><col style="width:25mm"><col style="width:13mm"><col style="width:23mm"><col style="width:34mm"></colgroup>
  <thead><tr><th class="vd-c">SL</th><th>${e(PRODUCT_HEADERS[order.PageType] ?? 'Product')}</th><th class="vd-r">Qty</th><th class="vd-r">Unit Price</th><th class="vd-r">VAT %</th><th class="vd-r">VAT (Tk)</th><th class="vd-r po-nowrap">Line Total (Tk)</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr class="po-sum po-sum-first"><td></td><td class="vd-r">Amount (excl. VAT)</td><td class="vd-r">${totalQuantity} <span class="po-unit">${e(totalUnit)}</span></td><td colspan="3"></td><td class="vd-r">${kit.money(order.TotalAmount)}</td></tr>
    ${vatCharged ? `<tr class="po-sum"><td></td><td class="vd-r">VAT (Estimated)${vatInCost ? ' · not claimable, in cost' : ''}</td><td colspan="4"></td><td class="vd-r">${kit.money(totalVat)}</td></tr>` : ''}
    <tr class="vd-total"><td></td><td class="vd-r">Total Payable</td><td colspan="4"></td><td class="vd-r">${kit.money(totalPayable)}</td></tr>
  </tfoot>`
    : `<colgroup><col style="width:9mm"><col><col style="width:19mm">${mrpInvoice ? '<col style="width:22mm"><col style="width:16mm">' : ''}<col style="width:22mm"><col style="width:32mm"></colgroup>
  <thead><tr><th class="vd-c">SL</th><th>${e(PRODUCT_HEADERS[order.PageType] ?? 'Product')}</th><th class="vd-r">Qty</th>${mrpInvoice ? '<th class="vd-r">MRP</th>' : ''}${mrpInvoice ? '<th class="vd-r">Margin %</th>' : ''}<th class="vd-r">DP</th><th class="vd-r po-nowrap">Line Total (Tk)</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot>
    ${mrpInvoice
        ? `<tr class="po-sum po-sum-first"><td></td><td class="vd-r">Total at MRP</td><td class="vd-r">${totalQuantity} <span class="po-unit">${e(totalUnit)}</span>${totalFree > 0 ? `<div class="po-free">+${totalFree} free</div>` : ''}</td><td colspan="${mrpInvoice ? 3 : 1}"></td><td class="vd-r">${kit.money(order.TotalMrp)}</td></tr>
    <tr class="po-sum"><td></td><td class="vd-r" colspan="${mrpInvoice ? 5 : 3}">Less Margin</td><td class="vd-r">${kit.money(-order.TotalProfit)}</td></tr>
    <tr class="po-sum"><td></td><td class="vd-r" colspan="${mrpInvoice ? 5 : 3}">Total at DP</td><td class="vd-r">${kit.money(order.TotalDp)}</td></tr>`
        : `<tr class="po-sum po-sum-first"><td></td><td class="vd-r">Total at DP</td><td class="vd-r">${totalQuantity} <span class="po-unit">${e(totalUnit)}</span>${totalFree > 0 ? `<div class="po-free">+${totalFree} free</div>` : ''}</td><td colspan="${mrpInvoice ? 3 : 1}"></td><td class="vd-r">${kit.money(order.TotalDp)}</td></tr>`}
    ${order.AdditionalDiscountAmount > 0 ? `<tr class="po-sum"><td></td><td class="vd-r" colspan="${mrpInvoice ? 5 : 3}">Less Additional Discount${order.AdditionalDiscountType === 'Percent' ? ` (${e(order.AdditionalDiscountValue)}%)` : ''}</td><td class="vd-r">${kit.money(-order.AdditionalDiscountAmount)}</td></tr>` : ''}
    <tr class="po-sum"><td></td><td class="vd-r" colspan="${mrpInvoice ? 5 : 3}">Net Amount</td><td class="vd-r">${kit.money(netAmount)}</td></tr>
    ${vatCharged ? `<tr class="po-sum"><td></td><td class="vd-r" colspan="${mrpInvoice ? 5 : 3}">${order.PriceIncludesVat ? 'VAT (Estimated, Included)' : 'VAT (Estimated, Added)'}${vatInCost ? ' · not claimable, in cost' : ''}</td><td class="vd-r">${kit.money(totalVat)}</td></tr>` : ''}
    ${showRoundOff ? `<tr class="po-sum"><td></td><td class="vd-r" colspan="${mrpInvoice ? 5 : 3}">Round off</td><td class="vd-r">${kit.money(order.RoundingAdjustment)}</td></tr>` : ''}
    <tr class="vd-total"><td></td><td class="vd-r" colspan="${mrpInvoice ? 5 : 3}">Total Payable</td><td class="vd-r">${kit.money(totalPayable)}</td></tr>
  </tfoot>`}
</table>
${options.internal ? stockPositionHtml(data, kit) : ''}
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

//===============================================================
// Internal copy : stock position of each line (company wide)
//   Stock (all branches; — until Product Receiving), On order
//   (approved / placed orders not yet billed, this one too),
//   Re-order / Red / Max levels, status
//===============================================================

function stockPositionHtml
(
    data:
        PurchaseOrderPrintData,
    kit:
        PrintKit
):
    string
{
    const e =
        kit.escape;

    const items =
        new Map((data.products ?? []).map(x => [x.ProductCode, x]));

    const rows =
        (data.order.Lines ?? [])
            .map
            (
                (line, index) =>
                {
                    const item =
                        items.get(line.ProductCode);

                    const stock =
                        item?.TotalStock ?? null;

                    const onOrder =
                        item?.OnOrder ?? 0;

                    const available =
                        (stock ?? 0) + onOrder;

                    const status =
                        !item || !(item.ReorderLevel > 0)
                            ? '—'
                            : item.RedLevel > 0 && available <= item.RedLevel
                                ? 'Below red'
                                : available <= item.ReorderLevel
                                    ? 'Re-order'
                                    : 'OK';

                    const level =
                        (value: number | undefined): string =>
                            value && value > 0 ? String(value) : '—';

                    return `<tr>
<td class="vd-c vd-sl">${index + 1}</td>
<td><div class="vd-main">${e(line.ProductName)}</div><div class="vd-sub">${e(line.ProductCode)}</div></td>
<td class="vd-r">${e(line.Quantity)}</td>
<td class="vd-r">${stock === null ? '—' : e(stock)}</td>
<td class="vd-r">${e(onOrder)}</td>
<td class="vd-r">${level(item?.ReorderLevel)}</td>
<td class="vd-r">${level(item?.RedLevel)}</td>
<td class="vd-r">${level(item?.MaxStockLevel)}</td>
<td class="vd-c">${e(status)}</td>
</tr>`;
                }
            )
            .join('');

    return `<div class="po-internal-head">Internal : stock position (company wide)</div>
<table class="pv-split vd-lines po-lines po-internal">
  <colgroup><col style="width:9mm"><col><col style="width:15mm"><col style="width:16mm"><col style="width:17mm"><col style="width:16mm"><col style="width:13mm"><col style="width:14mm"><col style="width:20mm"></colgroup>
  <thead><tr><th class="vd-c">SL</th><th>Item</th><th class="vd-r">Ordered</th><th class="vd-r">Stock</th><th class="vd-r">On order</th><th class="vd-r">Re-order</th><th class="vd-r">Red</th><th class="vd-r">Max</th><th class="vd-c">Status</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="po-fine">Stock is the company stock in all branches (— until Product Receiving). On order includes this order. Not for the supplier.</div>`;
}


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

/* Pricing terms line (above the lines) */
.po-terms { display: flex; flex-wrap: wrap; gap: 1.2mm 5mm; margin: 0 0 2mm; font-size: 7.6pt; color: #475569; }
.po-terms b { color: #0f172a; font-weight: 700; }
.po-free { font-size: 6.8pt; font-weight: 600; color: #047857; }

/* Fine print */
.po-fine { margin-top: 2.5mm; font-size: 7.4pt; color: #64748b; }
.po-internal-head { margin: 5mm 0 1.5mm; font-size: 8.4pt; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #92400e; }
.po-internal th { background: #fffbeb; }
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

    const totalVat =
        roundMoney(lines.reduce((sum, line) => sum + line.VatAmount, 0));

    const totalPayable =
        order.TotalPayable;

    const money =
        (value: number): ExcelCell =>
            ({ v:value, s:'boldMoney' });

    // Motor bikes : unit price only (no MRP pricing)
    if
    (
        order.PageType === 'MB'
    )
    {
        const mbRows:
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
            [null, label('Total'), null, null, lines.reduce((sum, line) => sum + line.Quantity, 0), null, null, { v:order.TotalAmount, s:'boldMoney' }, { v:totalVat, s:'boldMoney' }, { v:totalPayable, s:'boldMoney' }],
            [],
            [label('In Words'), kit.words(totalPayable)]
        ];

        const mbNarrationRow =
            3 + infoRows.length + 1;

        return {
            name:
                order.OrderNo
                    ? `PO ${order.OrderNo.split('-').slice(-2).join('-')}`
                    : 'Purchase Order',
            rows:mbRows,
            columns:[8, 40, 22, 24, 8, 16, 8, 16, 16, 16],
            merges:['A1:J1', 'A2:J2', `B${mbNarrationRow}:J${mbNarrationRow}`]
        };
    }

    const rows:
        ExcelCell[][] =
    [
        [{ v:kit.company?.CompanyName ?? '', s:'title' }],
        [{ v:purchaseOrderTitle(order).toUpperCase(), s:'bold' }],
        [],
        ...infoRows,
        [label('Terms & Narration'), order.Narration],
        [],
        [label('Invoice Price'), order.InvoicePriceBasis, null, label('Margin % (MRP invoice)'), order.InvoicePriceBasis === 'MRP' ? order.DefaultProfitPercent : ''],
        [null, null, null, label('Additional Discount'), order.AdditionalDiscountType === 'Percent' ? `${order.AdditionalDiscountValue}%` : order.AdditionalDiscountAmount],
        [],
        [label('SL'), label('Product'), label('Code'), label('Short Notes'), label('Qty'), label('Free Qty'), label('MRP'), label('Margin %'), label('DP'), label('Line Total'), label('VAT %'), label('VAT'), label('Net Unit Cost')],
        ...lines.map
        (
            (line, index) =>
            [
                index + 1,
                line.ProductName,
                line.ProductCode,
                line.ShortNotes,
                line.Quantity,
                line.FreeQuantity || 0,
                order.InvoicePriceBasis === 'MRP' ? { v:line.Mrp, s:'money' } : '',
                order.InvoicePriceBasis === 'MRP' ? line.ProfitPercent : '',
                { v:line.UnitPrice, s:'money' },
                { v:line.DpAmount, s:'money' },
                line.VatRate,
                { v:line.VatAmount, s:'money' },
                { v:line.NetUnitCost, s:'money' }
            ] as ExcelCell[]
        ),
        [],
        ...(order.InvoicePriceBasis === 'MRP'
            ? [
                [null, label('Total at MRP'), null, null, null, null, null, null, null, money(order.TotalMrp)],
                [null, label('Less Margin'), null, null, null, null, null, null, null, money(-order.TotalProfit)]
            ] as ExcelCell[][]
            : []),
        [null, label('Total at DP'), null, null, lines.reduce((sum, line) => sum + line.Quantity, 0), null, null, null, null, money(order.TotalDp)],
        [null, label('Less Additional Discount'), null, null, null, null, null, null, null, money(-order.AdditionalDiscountAmount)],
        [null, label(order.PriceIncludesVat ? 'VAT (Estimated, Included)' : 'VAT (Estimated, Added)'), null, null, null, null, null, null, null, money(totalVat)],
        ...(order.RoundingAdjustment !== 0
            ? [[null, label('Round off'), null, null, null, null, null, null, null, money(order.RoundingAdjustment)]] as ExcelCell[][]
            : []),
        [null, label('Total Payable'), null, null, null, null, null, null, null, money(totalPayable)],
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
        columns:[8, 40, 22, 24, 8, 8, 14, 9, 14, 16, 8, 14, 14],
        merges:['A1:M1', 'A2:M2', `B${narrationRow}:M${narrationRow}`]
    };
}
