//===============================================================
// SALES INVOICE thermal receipt (80 mm roll), shared by SP / AC /
// MB
//
// One fixed page that names its own paper (data-paper-w = 80, the
// height grows with the lines) so the printer gets a roll-sized
// page and the PDF page takes the same size.
//
//   Company name, branch, BIN, phone
//   SALES INVOICE · invoice no · date · customer · sales person
//   Lines : name, qty x price = amount (batch MRP split)
//   Gross, discounts, fractional, TOTAL
//   Paid by mode, Due
//   Thank-you line, printed stamp
//
// Monospace-friendly : numbers right-aligned in a fixed column.
//===============================================================

import
{
    PrintKit
}
from '../../../../../shared/print/print.models';

import
{
    SalesInvoicePrintData,
    salesInvoicePart,
    salesInvoiceQty,
    salesInvoiceShown,
    salesInvoiceTitle
}
from './sales-invoice.template';


// Roll width and a height estimate (mm) : header + lines + totals
// + payments + footer, with room to spare (the roll is cut after
// the last line printed)
const PAPER_WIDTH_MM =
    80;

function paperHeight
(
    data:
        SalesInvoicePrintData
):
    number
{
    const invoice =
        data.invoice;

    const lines =
        invoice.Lines ?? [];

    const lineMm =
        lines.reduce
        (
            (sum, line) =>
                sum
                + 8.5
                + (line.MrpText && line.MrpText.length > 14 ? 3.6 : 0)
                + (line.CampaignMembershipAmount > 0 ? 3.6 : 0)
                + (line.SpecialAmount > 0 ? 3.6 : 0),
            0
        );

    const totalRows =
        2
        + (invoice.CampaignDiscount > 0 ? 1 : 0)
        + (invoice.MembershipDiscount > 0 ? 1 : 0)
        + (invoice.SpecialDiscount > 0 ? 1 : 0)
        + (invoice.FractionalDiscount > 0 ? 1 : 0)
        + ((invoice.RegistrationTotal ?? 0) > 0 ? 1 : 0)
        + 2
        + (invoice.Payments ?? []).length;

    return Math.ceil(
        68
        + lineMm
        + totalRows * 4.4
        + 34
        + (invoice.Status === 'Cancelled' ? 8 : 0)
    );
}


//===============================================================
// Layout
//===============================================================

export function salesInvoiceThermalHtml
(
    data:
        SalesInvoicePrintData,
    kit:
        PrintKit,
    options:
    {
        legal:boolean;
        stamp:boolean;
        // Switch "Print Payment Details on Customer Copy" : the
        // receipt is the customer's, so OFF = one Paid line
        customerPayments:boolean;
        // Switch "Show Discount on Print" (default ON) : OFF = full
        // MRP, no discount rows
        showDiscount?:boolean;
        // MB : switch "Show Registration on Print" (default ON)
        showRegistration?:boolean;
    }
):
    string
{
    const e =
        kit.escape;

    const invoice =
        data.invoice;

    const company =
        kit.company;

    const status =
        String(invoice.Status ?? '');

    // Discounts hidden (switch "Show Discount on Print" OFF)
    const shown =
        salesInvoiceShown(invoice, options.showDiscount === false, options.showRegistration === false);

    const lines =
        invoice.Lines ?? [];

    const payments =
        invoice.Payments ?? [];

    const bin =
        String(company?.BINNo ?? '').trim();

    const phone =
        String(company?.Phone || company?.Mobile || '').trim();

    const address =
        [company?.AddressLine1, company?.AddressLine2]
            .map(x => String(x ?? '').trim())
            .filter(x => !!x)
            .join(', ');

    const row =
        (label: string, value: string, cls: string = ''): string =>
            `<div class="sit-row${cls ? ' ' + cls : ''}"><span>${e(label)}</span><b>${e(value)}</b></div>`;

    const lineRows =
        lines
            .map
            (
                (line, index) =>
                {
                    const part =
                        salesInvoicePart(line);

                    const price =
                        line.Quantity > 0
                            ? line.GrossAmount / line.Quantity
                            : line.UnitPrice;

                    const mixed =
                        (line.HasMixedMrp || line.MrpCount > 1) && !line.PriceEdited;

                    return `<div class="sit-item">
  <div class="sit-item-name">${index + 1}. ${e(part.name)}</div>
  <div class="sit-item-code">${e(part.part ? `${part.part} || ${line.ProductCode}` : line.ProductCode)}</div>
  <div class="sit-row"><span>${e(salesInvoiceQty(line.Quantity))} ${e(line.Unit)} x ${mixed ? '' : kit.money(price)}</span><b>${kit.money(shown.hide ? shown.line(line) : line.GrossAmount)}</b></div>
  ${mixed ? `<div class="sit-item-code">${e(line.MrpText)}</div>` : ''}
  ${!shown.hide && line.CampaignMembershipAmount > 0 ? `<div class="sit-row sit-minus"><span>${e(line.DiscountLabel || line.DiscountSource)}</span><b>-${kit.money(line.CampaignMembershipAmount)}</b></div>` : ''}
  ${!shown.hide && line.SpecialAmount > 0 ? `<div class="sit-row sit-minus"><span>Special${line.SpecialDiscountPercent > 0 ? ` ${line.SpecialDiscountPercent}%` : ''}</span><b>-${kit.money(line.SpecialAmount)}</b></div>` : ''}
</div>`;
                }
            )
            .join('');

    const totals =
        [
            shown.hide ? '' : row('Gross (MRP)', kit.money(invoice.GrossAmount)),
            shown.hide ? '' : invoice.CampaignDiscount > 0 ? row('Campaign Discount', `-${kit.money(invoice.CampaignDiscount)}`) : '',
            shown.hide ? '' : invoice.MembershipDiscount > 0 ? row(`Membership${invoice.MembershipCardName ? ` (${invoice.MembershipCardName})` : ''}`, `-${kit.money(invoice.MembershipDiscount)}`) : '',
            shown.hide ? '' : invoice.SpecialDiscount > 0 ? row('Special Discount', `-${kit.money(invoice.SpecialDiscount)}`) : '',
            shown.hide ? '' : invoice.FractionalDiscount > 0 ? row('Fractional', `-${kit.money(invoice.FractionalDiscount)}`) : '',
            shown.registration > 0 ? row(`Registration x ${salesInvoiceQty(invoice.RegistrationCount ?? 0)}`, kit.money(shown.registration)) : '',
            row('TOTAL', `Tk ${kit.money(shown.total)}`, 'sit-total')
        ]
        .join('');

    const paid =
        [
            ...(options.customerPayments && !shown.hide ? payments : []).map
            (
                pay =>
                    row(
                        `Paid by ${pay.Mode}${pay.Mode === 'POS' && pay.TransactionRef ? ` ****${pay.TransactionRef}` : ''}`,
                        kit.money(pay.Amount)
                    )
            ),
            (!options.customerPayments || shown.hide || payments.length === 0) && invoice.PaidAmount > 0 ? row('Paid', kit.money(shown.paid)) : '',
            invoice.DueAmount > 0
                ? row('Due (on account)', kit.money(invoice.DueAmount), 'sit-due')
                : row('Change', kit.money(0))
        ]
        .join('');

    const height =
        paperHeight(data);

    return `<section class="pv-page sit-page" data-paper-w="${PAPER_WIDTH_MM}" data-paper-h="${height}">
${status === 'Cancelled' ? '<div class="sit-cancelled">CANCELLED</div>' : ''}
<div class="sit-head">
  <div class="sit-company">${e(company?.CompanyName || 'AppCore ERP')}</div>
  ${address ? `<div class="sit-small">${e(address)}</div>` : ''}
  ${invoice.BranchName ? `<div class="sit-small">Branch : ${e(invoice.BranchName)}</div>` : ''}
  ${options.legal && bin ? `<div class="sit-small">BIN ${e(bin)}</div>` : ''}
  ${phone ? `<div class="sit-small">${e(phone)}</div>` : ''}
</div>
<div class="sit-title">${e(salesInvoiceTitle(invoice).toUpperCase())}</div>
<div class="sit-meta">
  ${row('Invoice', invoice.InvoiceNo)}
  ${row('Date', kit.date(invoice.InvoiceDate))}
  ${row('Customer', invoice.CustomerName || invoice.CustomerCode)}
  ${invoice.CustomerPhone && !(invoice.CustomerName ?? '').includes(invoice.CustomerPhone) ? row('Phone', invoice.CustomerPhone) : ''}
  ${invoice.SalesPersonName ? row('Served by', invoice.SalesPersonName) : ''}
</div>
<div class="sit-rule"></div>
${lineRows}
<div class="sit-rule"></div>
${totals}
<div class="sit-words">${e(kit.words(shown.total))}</div>
<div class="sit-rule"></div>
${paid}
${invoice.ReceiptVoucherNo ? `<div class="sit-small sit-center">Receipt ${e(invoice.ReceiptVoucherNo)}</div>` : ''}
${invoice.VatApplicable ? '<div class="sit-small sit-center">Prices include VAT</div>' : ''}
<div class="sit-rule"></div>
<div class="sit-thanks">Thank you for shopping with us!</div>
${options.stamp ? `<div class="sit-small sit-center">Printed ${e(kit.now())}</div>` : ''}
</section>`;
}


//===============================================================
// Styles (80 mm roll, monospace-friendly)
//===============================================================

export function SALES_INVOICE_THERMAL_CSS():
    string
{
    return `
.sit-page { position: relative; box-sizing: border-box; padding: 4mm 4mm 5mm; background: #ffffff; color: #000000;
            font-family: 'Consolas', 'Cascadia Mono', 'Courier New', monospace; font-size: 8.2pt; line-height: 1.32; }
.sit-head { text-align: center; }
.sit-company { font-size: 11pt; font-weight: 800; letter-spacing: 0.3pt; }
.sit-small { font-size: 7.4pt; }
.sit-center { text-align: center; }
.sit-title { margin: 2mm 0 1.5mm; padding: 0.8mm 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000;
             text-align: center; font-size: 9pt; font-weight: 800; letter-spacing: 1pt; }
.sit-meta .sit-row span { min-width: 18mm; }
.sit-row { display: flex; justify-content: space-between; gap: 2mm; }
.sit-row span { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
.sit-row b { flex: 0 0 auto; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.sit-rule { margin: 1.6mm 0; border-top: 1px dashed #000; }
.sit-item { margin: 0 0 1.4mm; }
.sit-item-name { font-weight: 700; overflow-wrap: anywhere; }
.sit-item-code { font-size: 7.2pt; overflow-wrap: anywhere; }
.sit-minus span, .sit-minus b { font-weight: 400; }
.sit-total { margin-top: 0.8mm; padding-top: 0.8mm; border-top: 1px solid #000; font-size: 10pt; }
.sit-total b { font-weight: 800; }
.sit-due b { font-weight: 800; }
.sit-words { margin-top: 0.8mm; font-size: 7.2pt; font-style: italic; }
.sit-thanks { margin-top: 1mm; text-align: center; font-weight: 700; }
.sit-cancelled { margin: 0 0 2mm; padding: 1mm 0; border: 2px solid #000; text-align: center; font-size: 11pt; font-weight: 900; letter-spacing: 2pt; }
`;
}
