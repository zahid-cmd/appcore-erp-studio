//===============================================================
// SALES INVOICE print (A4) : layout, styles, Excel
// (shared by SP / AC / MB)
//
// Design (A4, flow) :
//   logo | company | QR · title ribbon with the invoice number ·
//   info strip with the status stamp (kit.voucherHead, repeated on
//   every page)
//   Customer (one compact line : name, code, phone, type, address,
//   sales person)
//   Invoice Total + amount in words (thin bar)
//   Lines : part, qty, MRP (batch split), campaign / membership,
//   special, net, line total; totals (gross, discounts,
//   fractional, invoice total)
//   Payments (Payment Desk rows, receipt no), paid / due
//   Two copies : Customer Copy (paid / due; rows only when switch
//   "Print Payment Details on Customer Copy" is ON, never the charges
//   paid on top) and Office Copy (rows + charges paid on top)
//   Narration, notes, workflow line, signatures
//
// Reuses the voucher print styles (vd-*); si-* adds the customer
// box, totals and payments.
//===============================================================

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
    SalesInvoice,
    SalesInvoiceLine
}
from '../sales-invoice.model';


//===============================================================
// Data
//===============================================================

export interface SalesInvoicePrintData
{
    invoice:
        SalesInvoice;
}


//===============================================================
// Names by page type
//===============================================================

export const SALES_INVOICE_TITLES:
    Record<string, string> =
{
    SP:'Sales Invoice - SP',
    AC:'Sales Invoice - AC',
    MB:'Sales Invoice - MB'
};

const PRODUCT_HEADERS:
    Record<string, string> =
{
    SP:'Spare Part / Lubricant',
    AC:'Accessory',
    MB:'Motor Bike'
};

export function salesInvoiceTitle
(
    invoice:
        SalesInvoice
):
    string
{
    return SALES_INVOICE_TITLES[invoice.PageType] ?? 'Sales Invoice';
}

// SISP-010101-2627-11-00001 -> FY 2026-2027
export function salesInvoiceYear
(
    invoiceNo:
        string
):
    string
{
    const code =
        (invoiceNo ?? '').split('-')[2] ?? '';

    return /^\d{4}$/.test(code)
        ? `FY 20${code.slice(0, 2)}-20${code.slice(2)}`
        : '';
}

// SP / AC item name is "<part number> - <name>"
export function salesInvoicePart
(
    line:
        SalesInvoiceLine
):
    { part: string; name: string }
{
    const name =
        line.ProductName ?? '';

    const part =
        line.PartNumber ?? '';

    if
    (
        part
        &&
        name.startsWith(`${part} - `)
    )
    {
        return { part, name:name.slice(part.length + 3) };
    }

    const at =
        name.indexOf(' - ');

    return at > 0
        ? { part:name.slice(0, at).trim(), name:name.slice(at + 3).trim() }
        : { part, name };
}

export function salesInvoiceQty
(
    value:
        number
):
    string
{
    return String(Math.round((Number(value) || 0) * 100) / 100);
}


//===============================================================
// Discount hidden on print (switch "Show Discount on Print" OFF) :
// the discounts are added back, so every line, the total and the
// amount paid read at full MRP. Due stays as it is.
//===============================================================

export interface SalesInvoiceShown
{
    hide:boolean;
    // Discounts added back (campaign, membership, special,
    // fractional)
    addBack:number;
    // MB : the registration shown (0 = none or left off)
    registration:number;
    total:number;
    paid:number;
    line:(line: SalesInvoiceLine) => number;
}

export function salesInvoiceShown
(
    invoice:
        SalesInvoice,
    hide:
        boolean,
    // Switch "Show Registration on Print" OFF (MB) : the
    // registration is left out of the total and the amount paid
    hideRegistration:
        boolean =
        false
):
    SalesInvoiceShown
{
    const addBack =
        hide
            ? (Number(invoice.CampaignDiscount) || 0)
              + (Number(invoice.MembershipDiscount) || 0)
              + (Number(invoice.SpecialDiscount) || 0)
              + (Number(invoice.FractionalDiscount) || 0)
            : 0;

    const paidAmount =
        Number(invoice.PaidAmount) || 0;

    const registration =
        hideRegistration
            ? Number(invoice.RegistrationTotal) || 0
            : 0;

    return {
        hide,
        addBack,
        registration:hideRegistration ? 0 : Number(invoice.RegistrationTotal) || 0,
        total:(Number(invoice.InvoiceTotal) || 0) + addBack - registration,
        paid:paidAmount - Math.min(registration, paidAmount) + (hide && paidAmount > 0 ? addBack : 0),
        line:
            (line: SalesInvoiceLine) =>
                hide
                    ? (Number(line.LineTotal) || 0) + (Number(line.CampaignMembershipAmount) || 0) + (Number(line.SpecialAmount) || 0)
                    : Number(line.LineTotal) || 0
    };
}


//===============================================================
// Shared pieces
//===============================================================

function meta
(
    invoice:
        SalesInvoice,
    kit:
        PrintKit
):
    { label: string; value: string }[]
{
    return [
        { label:'Invoice Date', value:kit.date(invoice.InvoiceDate) },
        { label:'Branch', value:invoice.BranchName },
        { label:'Warehouse', value:invoice.WarehouseName },
        { label:'Financial Year', value:salesInvoiceYear(invoice.InvoiceNo) },
        { label:'Sales Person', value:invoice.SalesPersonName || '-' }
    ];
}

function workflow
(
    invoice:
        SalesInvoice,
    kit:
        PrintKit
):
    PrintWorkflowStep[]
{
    const steps:
        PrintWorkflowStep[] =
    [
        { label:'Created', value:kit.dateTime(invoice.CreatedDate), tone:'done' },
        { label:'Approved', value:kit.dateTime(invoice.ApprovedDate), tone:'done' },
        { label:'Posted', value:kit.dateTime(invoice.PostedDate), tone:'final' }
    ];

    if
    (
        invoice.Status === 'Cancelled'
    )
    {
        steps.push(
        {
            label:'Cancelled',
            value:kit.dateTime(invoice.CancelledDate),
            tone:'cancel'
        });
    }

    return steps;
}


//===============================================================
// Layout
//===============================================================

export function salesInvoiceDocumentHtml
(
    data:
        SalesInvoicePrintData,
    kit:
        PrintKit,
    options:
    {
        logo:boolean;
        legal:boolean;
        stamp:boolean;
        // Switch "Print Payment Details on Customer Copy" (default OFF)
        customerPayments:boolean;
        // Switch "Show Discount on Print" (default ON; the office
        // copy always shows the discounts)
        showDiscount?:boolean;
        // MB : switch "Show Registration on Print" (default ON; the
        // office copy always shows it)
        showRegistration?:boolean;
    },
    // Customer copy : payment total and due (breakdown only when the
    // switch is ON, never the charges paid on top). Office copy :
    // full breakdown with the charges paid on top.
    copy:
        'customer' | 'office' =
        'customer'
):
    string
{
    return salesInvoiceCopyHtml(data, kit, options, copy);
}

function salesInvoiceCopyHtml
(
    data:
        SalesInvoicePrintData,
    kit:
        PrintKit,
    options:
    {
        logo:boolean;
        legal:boolean;
        stamp:boolean;
        customerPayments:boolean;
        showDiscount?:boolean;
        showRegistration?:boolean;
    },
    copy:
        'customer' | 'office'
):
    string
{
    const e =
        kit.escape;

    const invoice =
        data.invoice;

    const office =
        copy === 'office';

    // Discounts hidden : customer copy with the switch OFF
    const shown =
        salesInvoiceShown(
            invoice,
            !office && options.showDiscount === false,
            !office && options.showRegistration === false);

    // Customer copy : breakdown only when the switch is ON (never
    // with the discounts hidden : the rows are the real amounts)
    const showBreakdown =
        office || (options.customerPayments && !shown.hide);

    const status =
        String(invoice.Status ?? '');

    const lines =
        invoice.Lines ?? [];

    const payments =
        invoice.Payments ?? [];

    const totalQuantity =
        lines.reduce((sum, line) => sum + line.Quantity, 0);

    const units =
        [...new Set(lines.map(line => line.Unit).filter(Boolean))];

    const totalUnit =
        units.length === 1 ? units[0] : '';

    const showSpecial =
        !shown.hide && invoice.SpecialDiscount > 0;

    const showDisc =
        !shown.hide && invoice.CampaignMembershipDiscount > 0;

    // Columns : SL, item, qty, MRP, [disc], [special], line total
    const amountCols =
        (showDisc ? 1 : 0) + (showSpecial ? 1 : 0);

    const rows =
        lines
            .map
            (
                (line, index) =>
                {
                    const part =
                        salesInvoicePart(line);

                    const mixed =
                        line.HasMixedMrp || line.MrpCount > 1;

                    return `<tr>
<td class="vd-c vd-sl">${index + 1}</td>
<td><div class="vd-main">${e(part.name)}</div><div class="vd-sub">${part.part ? `${e(part.part)} <span class="si-div">||</span> ` : ''}${e(line.ProductCode)}</div>${!shown.hide && line.DiscountLabel && line.CampaignMembershipAmount > 0 ? `<div class="si-disc-label">${e(line.DiscountLabel)}</div>` : ''}</td>
<td class="vd-r">${e(salesInvoiceQty(line.Quantity))} <span class="si-unit">${e(line.Unit)}</span></td>
<td class="vd-r">${e(line.MrpText || kit.money(line.Mrp))}${line.PriceEdited ? `<div class="si-small">@ ${kit.money(line.UnitPrice)}</div>` : mixed ? '<div class="si-small">batch MRPs</div>' : ''}</td>
<td class="vd-r">${kit.money(line.GrossAmount)}</td>
${showDisc ? `<td class="vd-r">${line.CampaignMembershipAmount > 0 ? kit.money(-line.CampaignMembershipAmount) : '-'}</td>` : ''}
${showSpecial ? `<td class="vd-r">${line.SpecialAmount > 0 ? kit.money(-line.SpecialAmount) : '-'}</td>` : ''}
<td class="vd-r si-total-col">${kit.money(shown.line(line))}</td>
</tr>`;
                }
            )
            .join('');

    // MB : the Registration line (switch "Show Registration on
    // Print"; the office copy always)
    const registrationRow =
        shown.registration > 0
            ? `<tr>
<td class="vd-c vd-sl">${lines.length + 1}</td>
<td><div class="vd-main">Registration</div><div class="vd-sub">${e(invoice.RegistrationTypeName ?? '')}${invoice.RegistrationStatus === 'Reversed' ? ' <span class="si-div">||</span> reversed' : ''}</div></td>
<td class="vd-r">${e(salesInvoiceQty(invoice.RegistrationCount ?? 0))} <span class="si-unit">Chassis</span></td>
<td class="vd-r">${kit.money(invoice.RegistrationAmount ?? 0)}</td>
<td class="vd-r">${kit.money(shown.registration)}</td>
${showDisc ? '<td class="vd-r">-</td>' : ''}
${showSpecial ? '<td class="vd-r">-</td>' : ''}
<td class="vd-r si-total-col">${kit.money(shown.registration)}</td>
</tr>`
            : '';

    const fact =
        (label: string, value: string, sub: string = ''): string =>
            `<div class="si-fact"><span>${e(label)}</span><b>${e(value || '-')}</b>${sub ? `<i>${e(sub)}</i>` : ''}</div>`;

    const customerBlock =
        `<div class="si-cus">
  <div class="si-cus-head">Customer</div>
  <div class="si-cus-row">
    ${fact('Name', invoice.CustomerName, invoice.CustomerCode)}
    ${fact('Phone', invoice.CustomerPhone)}
    ${fact('Type', invoice.CustomerTag || invoice.CustomerType)}
    ${fact('Membership', invoice.MembershipCardName ? `${invoice.MembershipCardName}${invoice.MembershipDiscountPercent > 0 ? ` (${invoice.MembershipDiscountPercent}%)` : ''}` : '', invoice.MembershipNo)}
    ${fact('Address', invoice.CustomerAddress)}
  </div>
</div>`;

    // Totals under the lines (label spans the middle columns)
    // SL | label (item .. last discount column) | total
    const span =
        4 + amountCols;

    const sum =
        (label: string, value: number, cls: string = 'si-sum'): string =>
            `<tr class="${cls}"><td></td><td class="vd-r" colspan="${span}">${e(label)}</td><td class="vd-r">${kit.money(value)}</td></tr>`;

    const totals =
        [
            `<tr class="si-sum si-sum-first"><td></td><td class="vd-r">Gross (MRP)</td><td class="vd-r">${e(salesInvoiceQty(totalQuantity))}${totalUnit ? ` <span class="si-unit">${e(totalUnit)}</span>` : ''}</td><td colspan="${2 + amountCols}"></td><td class="vd-r">${kit.money(invoice.GrossAmount)}</td></tr>`,
            !shown.hide && invoice.CampaignDiscount > 0 ? sum('Less Campaign Discount', -invoice.CampaignDiscount) : '',
            !shown.hide && invoice.MembershipDiscount > 0 ? sum(`Less Membership Discount${invoice.MembershipCardName ? ` (${invoice.MembershipCardName})` : ''}`, -invoice.MembershipDiscount) : '',
            !shown.hide && invoice.SpecialDiscount > 0 ? sum(`Less Special Discount${invoice.InvoiceSpecialType === 'Percent' ? ` (${invoice.InvoiceSpecialValue}%)` : ''}`, -invoice.SpecialDiscount) : '',
            !shown.hide && invoice.FractionalDiscount > 0 ? sum('Less Fractional Discount', -invoice.FractionalDiscount) : '',
            shown.registration > 0 ? sum('Add Registration', shown.registration) : '',
            sum('Invoice Total', shown.total, 'vd-total')
        ]
        .join('');

    // Charges the customer paid on top (MFS / POS) : office copy only
    const chargesOnTop =
        office
            ? payments
                .filter(row => row.ChargeAmount > 0 && row.ChargeBorneBy === 'Customer')
                .reduce((total, row) => total + row.ChargeAmount, 0)
            : 0;

    const payHead =
        `<div class="si-paybox-head"><span>Payment${showBreakdown && payments.length > 0 ? `s <em>${payments.length}</em>` : ''}</span>${invoice.ReceiptVoucherNo ? `<span class="si-paybox-ref">Receipt ${e(invoice.ReceiptVoucherNo)}</span>` : ''}</div>`;

    const payFoot =
        `<div class="si-paybox-foot">
    ${invoice.DueAmount > 0 ? '<span class="si-paybox-note">Credit sale : the due is on the customer\'s account.</span>' : ''}
    ${(invoice.BookingAdvance ?? 0) > 0 ? `<span>Booking advance${invoice.BookingNo ? ` (${e(invoice.BookingNo)})` : ''} <b>${kit.money(invoice.BookingAdvance ?? 0)}</b></span>` : ''}
    <span>Paid <b>${kit.money(shown.paid)}</b></span>
    ${chargesOnTop > 0 ? `<span class="si-paybox-muted">Charges paid on top <b>${kit.money(chargesOnTop)}</b></span>` : ''}
    <span class="${invoice.DueAmount > 0 ? 'si-paybox-due' : ''}">${invoice.DueAmount > 0 ? 'Due' : 'Balance'} <b>${kit.money(invoice.DueAmount)}</b></span>
  </div>`;

    // Payments : one boxed card; the rows only when the breakdown shows
    const paymentsBlock =
        `<div class="si-paybox">
  ${payHead}
  ${showBreakdown && payments.length > 0
        ? `<table class="si-paytab">
    <colgroup><col style="width:6mm"><col style="width:13mm"><col><col style="width:52mm"><col style="width:26mm"></colgroup>
    <tbody>${payments.map((row, index) => `<tr><td class="si-pay-sl">${index + 1}</td><td class="si-pay-mode">${e(row.Mode)}</td><td><b>${e(row.LedgerName)}</b><i>${e(row.LedgerCode)}</i></td><td class="si-pay-det">${e(paymentDetails(row, kit, office))}</td><td class="vd-r si-pay-amt">${kit.money(row.Amount)}</td></tr>`).join('')}</tbody>
  </table>`
        : ''}
  ${payFoot}
</div>`;

    const notes =
        [
            status === 'Cancelled' && invoice.CancelReason
                ? `<div class="vd-note vd-danger">Cancelled on ${e(kit.date(invoice.CancelledDate))} : ${e(invoice.CancelReason)}</div>`
                : '',
            status === 'Approved'
                ? '<div class="si-fine">Approved, not yet posted : no stock moved, no journal and no receipt yet.</div>'
                : '',
            invoice.VatApplicable
                ? `<div class="si-fine">Prices include VAT${shown.registration > 0 ? ' (registration : no VAT)' : ''}.</div>`
                : '',
            office && invoice.RegistrationStatus === 'Reversed'
                ? `<div class="si-fine">Registration reversed by ${e(invoice.RegistrationReversalNo ?? '')} : ${e(invoice.RegistrationReverseReason ?? '')}</div>`
                : '',
            invoice.JournalNo
                ? `<div class="si-fine">Journal ${e(invoice.JournalNo)}</div>`
                : ''
        ]
        .join('');

    const head =
        kit.voucherHead(
        {
            copy:office ? 'Office Copy' : 'Customer Copy',
            title:salesInvoiceTitle(invoice),
            numberLabel:'Invoice No',
            number:invoice.InvoiceNo,
            meta:meta(invoice, kit),
            status,
            qr:
                [
                    kit.company?.CompanyName || 'AppCore ERP',
                    'Sales Invoice',
                    invoice.InvoiceNo,
                    kit.date(invoice.InvoiceDate),
                    invoice.CustomerName,
                    `Tk ${kit.money(shown.total)}`,
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
${customerBlock}
<div class="vd-amount">
  <div class="vd-amount-total"><span>Invoice Total</span><b>Tk ${kit.money(shown.total)}</b></div>
  <div class="vd-amount-words"><span>In Words</span><i>${e(kit.words(shown.total))}</i></div>
</div>
<table class="pv-split vd-lines si-lines">
  <colgroup><col style="width:9mm"><col><col style="width:17mm"><col style="width:${lines.some(x => x.HasMixedMrp || x.MrpCount > 1) ? 36 : 22}mm"><col style="width:24mm">${showDisc ? '<col style="width:21mm">' : ''}${showSpecial ? '<col style="width:19mm">' : ''}<col style="width:27mm"></colgroup>
  <thead><tr><th class="vd-c">SL</th><th>${e(PRODUCT_HEADERS[invoice.PageType] ?? 'Item')}</th><th class="vd-r">Qty</th><th class="vd-r">MRP</th><th class="vd-r">Gross</th>${showDisc ? '<th class="vd-r">Camp./Member</th>' : ''}${showSpecial ? '<th class="vd-r">Special</th>' : ''}<th class="vd-r si-nowrap">Total (Tk)</th></tr></thead>
  <tbody>${rows}${registrationRow}</tbody>
  <tfoot>${totals}</tfoot>
</table>
${paymentsBlock}
<div class="vd-narration"><span>Narration</span><p>${e(invoice.Narration || '-')}</p></div>
${notes}
<div class="vd-after">
${kit.workflow(workflow(invoice, kit))}
${kit.signatures(['Prepared By', 'Checked By', 'Customer', 'Authorised By'])}
</div>
</div>
<div class="pv-end">
${options.stamp ? `<div class="pv-printed">${e(invoice.BranchName ? invoice.BranchName + ' · ' : '')}Printed ${e(kit.now())}</div>` : ''}
</div>
</section>`;
}

//===============================================================
// MONEY RECEIPT (A4, customer) : the money received on the
// invoice, numbered with its Receipt Voucher (the Receipt
// Voucher print itself stays as it is). With "Show Discount on
// Print" OFF the amount reads at full MRP (discounts added back),
// like the customer copy of the invoice.
//===============================================================

export function salesMoneyReceiptHtml
(
    data:
        SalesInvoicePrintData,
    kit:
        PrintKit,
    options:
    {
        logo:boolean;
        legal:boolean;
        stamp:boolean;
        showDiscount?:boolean;
        showRegistration?:boolean;
    }
):
    string
{
    const e =
        kit.escape;

    const invoice =
        data.invoice;

    const status =
        String(invoice.Status ?? '');

    const shown =
        salesInvoiceShown(invoice, options.showDiscount === false, options.showRegistration === false);

    const payments =
        invoice.Payments ?? [];

    const received =
        !!invoice.ReceiptVoucherNo && (Number(invoice.PaidAmount) || 0) > 0;

    const receiptDate =
        invoice.PostedDate || invoice.InvoiceDate;

    const fact =
        (label: string, value: string, sub: string = ''): string =>
            `<div class="si-fact"><span>${e(label)}</span><b>${e(value || '-')}</b>${sub ? `<i>${e(sub)}</i>` : ''}</div>`;

    const customerBlock =
        `<div class="si-cus">
  <div class="si-cus-head">Received From</div>
  <div class="si-cus-row">
    ${fact('Name', invoice.CustomerName, invoice.CustomerCode)}
    ${fact('Phone', invoice.CustomerPhone)}
    ${fact('Type', invoice.CustomerTag || invoice.CustomerType)}
    ${fact('Address', invoice.CustomerAddress)}
  </div>
</div>`;

    const items =
        [
            ...new Set((invoice.Lines ?? []).map(line => salesInvoicePart(line).name).filter(x => !!x)),
            ...(shown.registration > 0 ? ['Registration'] : [])
        ]
            .join(', ');

    // Discounts hidden : one row with the modes (the real rows
    // carry the amounts actually paid)
    const rows =
        !received
            ? ''
            : shown.hide
                ? `<tr><td class="si-pay-sl">1</td><td class="si-pay-mode">${e([...new Set(payments.map(x => x.Mode).filter(x => !!x))].join(' / ') || '-')}</td><td><b>Against Invoice ${e(invoice.InvoiceNo)}</b></td><td class="si-pay-det"></td><td class="vd-r si-pay-amt">${kit.money(shown.paid)}</td></tr>`
                : payments
                    .map((row, index) => `<tr><td class="si-pay-sl">${index + 1}</td><td class="si-pay-mode">${e(row.Mode)}</td><td><b>${e(row.LedgerName)}</b><i>${e(row.LedgerCode)}</i></td><td class="si-pay-det">${e(paymentDetails(row, kit, false))}</td><td class="vd-r si-pay-amt">${kit.money(row.Amount)}</td></tr>`)
                    .join('');

    const paymentsBlock =
        received
            ? `<div class="si-paybox">
  <div class="si-paybox-head"><span>Payment</span><span class="si-paybox-ref">Invoice ${e(invoice.InvoiceNo)} · ${e(kit.date(invoice.InvoiceDate))}</span></div>
  <table class="si-paytab">
    <colgroup><col style="width:6mm"><col style="width:13mm"><col><col style="width:52mm"><col style="width:26mm"></colgroup>
    <tbody>${rows}</tbody>
  </table>
  <div class="si-paybox-foot">
    ${invoice.DueAmount > 0 ? '<span class="si-paybox-note">Credit sale : the due is on the customer\'s account.</span>' : ''}
    ${(invoice.BookingAdvance ?? 0) > 0 ? `<span>Booking advance${invoice.BookingNo ? ` (${e(invoice.BookingNo)})` : ''} <b>${kit.money(invoice.BookingAdvance ?? 0)}</b></span>` : ''}
    <span>Received <b>${kit.money(shown.paid)}</b></span>
    ${invoice.DueAmount > 0 ? `<span class="si-paybox-due">Due <b>${kit.money(invoice.DueAmount)}</b></span>` : ''}
  </div>
</div>`
            : '<div class="vd-note vd-danger">No money has been received on this invoice yet : there is no Money Receipt.</div>';

    const head =
        kit.voucherHead(
        {
            copy:'Customer Copy',
            title:'Money Receipt',
            numberLabel:'Receipt No',
            number:invoice.ReceiptVoucherNo || '-',
            meta:
            [
                { label:'Receipt Date', value:kit.date(receiptDate) },
                { label:'Branch', value:invoice.BranchName },
                { label:'Invoice No', value:invoice.InvoiceNo },
                { label:'Financial Year', value:salesInvoiceYear(invoice.InvoiceNo) },
                { label:'Sales Person', value:invoice.SalesPersonName || '-' }
            ],
            status,
            qr:
                received
                    ? [
                        kit.company?.CompanyName || 'AppCore ERP',
                        'Money Receipt',
                        invoice.ReceiptVoucherNo,
                        kit.date(receiptDate),
                        invoice.CustomerName,
                        `Tk ${kit.money(shown.paid)}`
                    ]
                    .filter(part => !!part)
                    .join(' | ')
                    : '',
            logo:options.logo,
            legal:options.legal
        });

    return `<section class="pv-flow" data-watermark="${status === 'Cancelled' ? 'CANCELLED' : ''}">
<div class="pv-run-head">
${head}
</div>
<div class="pv-body">
${customerBlock}
${received
        ? `<div class="vd-amount">
  <div class="vd-amount-total"><span>Amount Received</span><b>Tk ${kit.money(shown.paid)}</b></div>
  <div class="vd-amount-words"><span>In Words</span><i>${e(kit.words(shown.paid))}</i></div>
</div>
<div class="si-mr-text">Received with thanks from <b>${e(invoice.CustomerName || invoice.CustomerCode)}</b> the sum of <b>Tk ${kit.money(shown.paid)}</b> against Sales Invoice <b>${e(invoice.InvoiceNo)}</b>${items ? ` for <b>${e(items)}</b>` : ''}.</div>`
        : ''}
${paymentsBlock}
${status === 'Cancelled' && invoice.CancelReason ? `<div class="vd-note vd-danger">Invoice cancelled on ${e(kit.date(invoice.CancelledDate))} : ${e(invoice.CancelReason)}</div>` : ''}
<div class="vd-after">
${kit.signatures(['Customer', 'Received By', 'Authorised By'])}
</div>
</div>
<div class="pv-end">
${options.stamp ? `<div class="pv-printed">${e(invoice.BranchName ? invoice.BranchName + ' · ' : '')}Printed ${e(kit.now())}</div>` : ''}
</div>
</section>`;
}


// Check No / MFS transaction / card + last 4 / charge
export function paymentDetails
(
    row:
        {
            Mode: string;
            CheckNo: string;
            CheckDate: string;
            CheckBank: string;
            TransactionRef: string;
            CardName: string;
            ChargeAmount: number;
            ChargeBorneBy: string;
        },
    kit:
        PrintKit,
    // false on the customer copy : the charges paid on top never show
    showCharge:
        boolean = true
):
    string
{
    const parts:
        string[] =
        [];

    switch
    (
        row.Mode
    )
    {
        case 'Check':
            parts.push(
                [row.CheckNo ? `No ${row.CheckNo}` : '', row.CheckDate ? kit.date(row.CheckDate) : '', row.CheckBank].filter(x => !!x).join(', ')
            );
            break;

        case 'MFS':
            parts.push(
                row.TransactionRef ? `Txn ${row.TransactionRef}` : ''
            );
            break;

        case 'POS':
        case 'EMI':
            parts.push(
                [row.CardName, row.TransactionRef ? `**** ${row.TransactionRef}` : ''].filter(x => !!x).join(' ')
            );
            break;
    }

    if
    (
        showCharge
        &&
        row.ChargeAmount > 0
        &&
        row.ChargeBorneBy === 'Customer'
    )
    {
        parts.push(
            `charge ${kit.money(row.ChargeAmount)} paid on top`
        );
    }

    return parts.filter(x => !!x).join(' · ');
}


//===============================================================
// Styles (voucher styles + customer box, totals, payments)
//===============================================================

export function SALES_INVOICE_DOCUMENT_CSS():
    string
{
    return VOUCHER_DOCUMENT_CSS() + `
/* Customer : thin heading on top, one compact line of facts */
.si-cus { margin: 0 0 3.2mm; border: 1px solid #dbe3ef; border-radius: 2mm; overflow: hidden; }
.si-cus-head { padding: 0.9mm 3.5mm; border-bottom: 1px solid #e2e8f0; background: rgba(37, 99, 235, 0.05);
               font-size: 6.4pt; font-weight: 800; letter-spacing: 1.4pt; text-transform: uppercase; color: #1e3a8a; }
.si-cus-row { display: grid; grid-template-columns: 1.7fr 1fr 0.8fr 1.2fr 1.6fr; column-gap: 3mm; padding: 1.6mm 3.5mm 1.8mm; }
.si-fact { display: flex; flex-direction: column; min-width: 0; line-height: 1.3; }
.si-fact span { font-size: 6pt; font-weight: 700; letter-spacing: 0.5pt; text-transform: uppercase; color: #94a3b8; }
.si-fact b { font-size: 8.4pt; font-weight: 700; color: #0f172a; overflow-wrap: anywhere; }
.si-fact i { font-size: 7pt; font-style: normal; color: #64748b; overflow-wrap: anywhere; }

/* Status stamps the voucher header has no colour for */
.pv-vh-stamp-posted { border-color: #15803d; color: #15803d; }
.pv-vh-title { white-space: nowrap; }

/* Lines */
.si-unit { font-size: 7pt; color: #64748b; }
.si-div { margin: 0 0.6mm; color: #94a3b8; font-weight: 700; }
.si-small { font-size: 6.8pt; color: #64748b; }
.si-disc-label { font-size: 6.8pt; font-weight: 600; color: #047857; }
.si-nowrap { white-space: nowrap; }
.si-lines .si-total-col { background: rgba(37, 99, 235, 0.04); font-weight: 600; }
.si-sum td { border-bottom: 0; padding-top: 1.2mm; padding-bottom: 1.2mm; font-weight: 600; }
.si-sum-first td { border-top: 1.4px solid #0f172a; padding-top: 2.4mm; }
.si-lines .vd-total td { border-top: 1px solid #94a3b8; }
.si-lines tfoot .vd-total td { border-bottom: 3px double #0f172a; padding-bottom: 2mm; }

/* Payments : boxed card, compact single-line rows */
.si-paybox { margin-top: 4mm; border: 1px solid #dbe3ef; border-radius: 2mm; overflow: hidden; break-inside: avoid; }
.si-paybox-head { display: flex; justify-content: space-between; align-items: center; padding: 0.9mm 3.5mm; border-bottom: 1px solid #e2e8f0;
                  background: rgba(16, 185, 129, 0.06); font-size: 6.4pt; font-weight: 800; letter-spacing: 1.4pt; text-transform: uppercase; color: #065f46; }
.si-paybox-head em { font-style: normal; margin-left: 1mm; color: #64748b; letter-spacing: 0; }
.si-paybox-ref { font-weight: 600; letter-spacing: 0.3pt; text-transform: none; color: #475569; font-size: 7pt; }
.si-paytab { width: 100%; border-collapse: collapse; table-layout: fixed; }
.si-paytab td { padding: 1.1mm 1.2mm; border-bottom: 1px dashed #e2e8f0; font-size: 7.8pt; line-height: 1.3; vertical-align: middle; color: #0f172a; }
.si-paytab tr:last-child td { border-bottom: 0; }
.si-paytab td:first-child { padding-left: 3.5mm; }
.si-paytab td:last-child { padding-right: 3.5mm; }
.si-paytab b { font-weight: 600; }
.si-paytab i { font-style: normal; margin-left: 1.6mm; font-size: 6.6pt; color: #94a3b8; }
.si-pay-sl { color: #94a3b8; font-size: 7pt !important; }
.si-pay-mode { font-size: 6.6pt !important; font-weight: 700; letter-spacing: 0.4pt; text-transform: uppercase; color: #047857 !important; }
.si-pay-det { font-size: 7pt !important; color: #64748b !important; }
.si-pay-amt { font-weight: 600; white-space: nowrap; }
.si-paybox-foot { display: flex; justify-content: flex-end; gap: 6mm; padding: 1.2mm 3.5mm; border-top: 1px solid #e2e8f0; background: #f8fafc; font-size: 7.6pt; color: #475569; }
.si-paybox-foot b { margin-left: 1.4mm; color: #0f172a; font-weight: 700; }
.si-paybox-muted b { color: #475569; font-weight: 600; }
.si-paybox-due b { color: #be123c; }
.si-paybox-note { margin-right: auto; color: #64748b; font-size: 7pt; }
.si-paybox-head + .si-paybox-foot { border-top: 0; }
.si-paid-line { display: flex; flex-wrap: wrap; gap: 1.2mm 6mm; margin: 4mm 0 0; font-size: 8pt; color: #475569; }
.si-paid-line b { color: #0f172a; }

/* Money Receipt */
.si-mr-text { margin: 0 0 3.2mm; font-size: 8.4pt; line-height: 1.5; color: #334155; }
.si-mr-text b { color: #0f172a; }

/* Fine print */
.si-fine { margin-top: 2mm; font-size: 7.4pt; color: #64748b; }
`;
}


//===============================================================
// Excel
//===============================================================

export function salesInvoiceDocumentSheet
(
    data:
        SalesInvoicePrintData,
    kit:
        PrintKit
):
    ExcelSheet
{
    const invoice =
        data.invoice;

    const lines =
        invoice.Lines ?? [];

    const label =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    const money =
        (value: number): ExcelCell =>
            ({ v:value, s:'money' });

    const bold =
        (value: number): ExcelCell =>
            ({ v:value, s:'boldMoney' });

    const rows:
        ExcelCell[][] =
    [
        [{ v:kit.company?.CompanyName ?? '', s:'title' }],
        [{ v:salesInvoiceTitle(invoice).toUpperCase(), s:'bold' }],
        [],
        [label('Invoice No'), invoice.InvoiceNo, null, label('Status'), invoice.Status],
        [label('Invoice Date'), kit.date(invoice.InvoiceDate), null, label('Branch'), invoice.BranchName],
        [label('Customer'), invoice.CustomerName, null, label('Phone'), invoice.CustomerPhone],
        [label('Warehouse'), invoice.WarehouseName, null, label('Sales Person'), invoice.SalesPersonName],
        [label('Journal'), invoice.JournalNo, null, label('Receipt'), invoice.ReceiptVoucherNo],
        [label('Narration'), invoice.Narration],
        [],
        [label('SL'), label('Item'), label('Code'), label('Qty'), label('MRP'), label('Gross'), label('Campaign / Membership'), label('Special'), label('Fractional'), label('Line Total'), label('VAT inside')],
        ...lines.map
        (
            (line, index) =>
            [
                index + 1,
                line.ProductName,
                line.ProductCode,
                line.Quantity,
                line.MrpText || line.Mrp,
                money(line.GrossAmount),
                money(line.CampaignMembershipAmount),
                money(line.SpecialAmount),
                money(line.FractionalShare),
                money(line.LineTotal),
                money(line.VatInside)
            ] as ExcelCell[]
        ),
        [],
        [null, label('Gross (MRP)'), null, null, null, null, null, null, null, bold(invoice.GrossAmount)],
        [null, label('Campaign / Membership'), null, null, null, null, null, null, null, bold(-invoice.CampaignMembershipDiscount)],
        [null, label('Special'), null, null, null, null, null, null, null, bold(-invoice.SpecialDiscount)],
        [null, label('Fractional'), null, null, null, null, null, null, null, bold(-invoice.FractionalDiscount)],
        [null, label('Invoice Total'), null, null, null, null, null, null, null, bold(invoice.InvoiceTotal)],
        ...((invoice.BookingAdvance ?? 0) > 0
            ? [[null, label(`Booking Advance${invoice.BookingNo ? ' (' + invoice.BookingNo + ')' : ''}`), null, null, null, null, null, null, null, bold(invoice.BookingAdvance ?? 0)] as ExcelCell[]]
            : []),
        [null, label('Paid'), null, null, null, null, null, null, null, bold(invoice.PaidAmount)],
        [null, label('Due'), null, null, null, null, null, null, null, bold(invoice.DueAmount)],
        [],
        [label('In Words'), kit.words(invoice.InvoiceTotal)]
    ];

    return {
        name:
            invoice.InvoiceNo
                ? `SI ${invoice.InvoiceNo.split('-').slice(-2).join('-')}`
                : 'Sales Invoice',
        rows,
        columns:[8, 40, 22, 8, 22, 14, 16, 12, 12, 16, 14],
        merges:['A1:K1', 'A2:K2', 'B9:K9']
    };
}
