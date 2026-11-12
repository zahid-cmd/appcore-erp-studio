//===============================================================
// Sales Quotations - MB / SP / AC : print source (Print Engine)
//
//   /print-viewer/sales-quotations-<type>/<publicId>?doc=sales-quotation
//
// One A4 document : the quotation (customer or prospect, lines at
// the prices of the quotation day, discounts, total, validity,
// terms). Cancelled prints with a CANCELLED watermark. Logo /
// BIN-TIN / printed stamp follow the company print switches.
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
from '../../../../../shared/print/print.models';

import
{
    VOUCHER_SWITCH
}
from '../../../../../shared/components/accounting/voucher-switches';

import
{
    SalesInvoicePageConfig,
    SQ_AC_PAGE,
    SQ_MB_PAGE,
    SQ_SP_PAGE
}
from '../sales-invoice.config';

import
{
    SalesQuotation
}
from '../sales-invoice.model';

import
{
    SalesQuotationService
}
from '../sales-quotation.service';

import
{
    SALES_INVOICE_DOCUMENT_CSS
}
from './sales-invoice.template';


export interface SalesQuotationPrintData
{
    quotation:
        SalesQuotation;
}

const ITEM_HEADERS:
    Record<string, string> =
{
    MB:'Model',
    SP:'Spare Part / Lubricant',
    AC:'Accessory'
};


function qty
(
    value:
        number
):
    string
{
    return String(Math.round((Number(value) || 0) * 100) / 100);
}


export function salesQuotationHtml
(
    data:
        SalesQuotationPrintData,
    kit:
        PrintKit,
    page:
        SalesInvoicePageConfig,
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

    const q =
        data.quotation;

    const status =
        q.Status === 'Open' && q.IsExpired ? 'Expired' : q.Status;

    const fact =
        (label: string, value: string, sub: string = ''): string =>
            `<div class="si-fact"><span>${e(label)}</span><b>${e(value || '-')}</b>${sub ? `<i>${e(sub)}</i>` : ''}</div>`;

    const customerBlock =
        `<div class="si-cus">
  <div class="si-cus-head">Quotation For</div>
  <div class="si-cus-row">
    ${fact('Name', q.CustomerName, q.IsProspect ? 'Prospect' : q.CustomerCode)}
    ${fact('Phone', q.CustomerPhone)}
    ${fact('Address', q.CustomerAddress)}
    ${fact('Valid Until', q.ValidUntil ? kit.date(q.ValidUntil) : 'No expiry', q.IsExpired && q.Status === 'Open' ? 'Expired' : '')}
  </div>
</div>`;

    const showDisc =
        q.Lines.some(x => x.DiscountAmount > 0);

    const rows =
        q.Lines
            .map
            (
                (line, index) =>
                    `<tr>
  <td class="vd-c">${index + 1}</td>
  <td><div class="vd-main">${e(line.ProductName)}</div><div class="vd-sub">${e([line.PartNumber, line.ProductCode].filter(x => !!x).join(' || '))}${line.DiscountLabel ? ` <span class="si-div">||</span> ${e(line.DiscountLabel)}` : ''}</div></td>
  <td class="vd-r">${e(qty(line.Quantity))}${line.Unit ? ` <span class="si-unit">${e(line.Unit)}</span>` : ''}</td>
  <td class="vd-r">${kit.money(line.UnitPrice)}</td>
  <td class="vd-r">${kit.money(line.GrossAmount)}</td>
  ${showDisc ? `<td class="vd-r">${line.DiscountAmount > 0 ? kit.money(-line.DiscountAmount) : '-'}</td>` : ''}
  <td class="vd-r">${kit.money(line.NetAmount)}</td>
</tr>`
            )
            .join('');

    const span =
        showDisc ? 4 : 3;

    const sum =
        (label: string, value: number, cls: string = 'si-sum'): string =>
            `<tr class="${cls}"><td></td><td class="vd-r" colspan="${span}">${e(label)}</td><td class="vd-r">${kit.money(value)}</td></tr>`;

    const totals =
        [
            `<tr class="si-sum si-sum-first"><td></td><td class="vd-r">Gross (MRP)</td><td class="vd-r">${e(qty(q.TotalQuantity))}</td><td colspan="${span - 2}"></td><td class="vd-r">${kit.money(q.GrossAmount)}</td></tr>`,
            q.DiscountAmount > 0 ? sum('Less Discounts', -q.DiscountAmount) : '',
            sum('Quotation Total', q.QuotationTotal, 'vd-total')
        ]
        .join('');

    const head =
        kit.voucherHead(
        {
            copy:'',
            title:page.docTitle,
            numberLabel:'Quotation No',
            number:q.QuotationNo,
            meta:
            [
                { label:'Date', value:kit.date(q.QuotationDate) },
                { label:'Valid Until', value:q.ValidUntil ? kit.date(q.ValidUntil) : 'No expiry' },
                { label:'Branch', value:q.BranchName },
                { label:'Sales Person', value:q.SalesPersonName || '-' }
            ],
            status,
            qr:
                [
                    kit.company?.CompanyName || 'AppCore ERP',
                    page.docTitle,
                    q.QuotationNo,
                    kit.date(q.QuotationDate),
                    q.CustomerName,
                    `Tk ${kit.money(q.QuotationTotal)}`
                ]
                .filter(part => !!part)
                .join(' | '),
            logo:options.logo,
            legal:options.legal
        });

    return `<section class="pv-flow" data-watermark="${q.Status === 'Cancelled' ? 'CANCELLED' : ''}">
<div class="pv-run-head">
${head}
</div>
<div class="pv-body">
${customerBlock}
<div class="vd-amount">
  <div class="vd-amount-total"><span>Quotation Total</span><b>Tk ${kit.money(q.QuotationTotal)}</b></div>
  <div class="vd-amount-words"><span>In Words</span><i>${e(kit.words(q.QuotationTotal))}</i></div>
</div>
<table class="pv-split vd-lines si-lines">
  <colgroup><col style="width:9mm"><col><col style="width:17mm"><col style="width:24mm"><col style="width:24mm">${showDisc ? '<col style="width:22mm">' : ''}<col style="width:27mm"></colgroup>
  <thead><tr><th class="vd-c">SL</th><th>${e(ITEM_HEADERS[q.ProductType] ?? 'Item')}</th><th class="vd-r">Qty</th><th class="vd-r">Price</th><th class="vd-r">Gross</th>${showDisc ? '<th class="vd-r">Discount</th>' : ''}<th class="vd-r si-nowrap">Total (Tk)</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot>${totals}</tfoot>
</table>
${q.Narration ? `<div class="vd-narration"><span>Note</span><p>${e(q.Narration)}</p></div>` : ''}
<div class="vd-narration"><span>Terms</span><p>${e(q.Terms || 'Prices are those of the quotation date; the invoice is priced on the day of sale. No stock is reserved by this quotation.')}</p></div>
${q.Status === 'Cancelled' && q.CancelReason ? `<div class="vd-note vd-danger">Quotation cancelled : ${e(q.CancelReason)}</div>` : ''}
${q.Status === 'Converted' && q.SalesInvoiceNo ? `<div class="vd-note">Sold on Sales Invoice ${e(q.SalesInvoiceNo)}${q.ConvertedDate ? ` (${e(kit.date(q.ConvertedDate))})` : ''}.</div>` : ''}
<div class="vd-after">
${kit.signatures(['Prepared By', 'Customer', 'Authorised By'])}
</div>
</div>
<div class="pv-end">
${options.stamp ? `<div class="pv-printed">${e(q.BranchName ? q.BranchName + ' · ' : '')}Printed ${e(kit.now())}</div>` : ''}
</div>
</section>`;
}


export function salesQuotationPrintSource
(
    page:
        SalesInvoicePageConfig
):
    PrintSourceDef<SalesQuotationPrintData>
{
    return {
        key:page.printKey,
        title:'Sales Quotation',
        async load
        (
            injector:
                Injector,
            id:
                number | string
        ):
            Promise<SalesQuotationPrintData>
        {
            const quotation =
                await firstValueFrom(
                    injector
                        .get(SalesQuotationService)
                        .getById(page.quotationApiPath, String(id))
                );

            return { quotation };
        },
        denyReason
        (
            data:
                SalesQuotationPrintData
        ):
            string
        {
            return data?.quotation ? '' : 'The quotation was not found.';
        },
        fileName
        (
            data:
                SalesQuotationPrintData
        ):
            string
        {
            return data.quotation.QuotationNo || page.docTitle;
        },
        documents:
        [
            {
                key:page.a4DocKey,
                title:`${page.docTitle} (A4)`,
                icon:'fas fa-file-signature',
                render:
                    (data, kit) =>
                        salesQuotationHtml(
                            data,
                            kit,
                            page,
                            {
                                logo:kit.isOn(VOUCHER_SWITCH.PRINT_LOGO, true),
                                legal:kit.isOn(VOUCHER_SWITCH.PRINT_BIN_TIN, true),
                                stamp:kit.isOn(VOUCHER_SWITCH.PRINT_STAMP, true)
                            }),
                css:
                    SALES_INVOICE_DOCUMENT_CSS()
            }
        ]
    } as PrintSourceDef<SalesQuotationPrintData>;
}


export const SALES_QUOTATIONS_MB_PRINT =
    salesQuotationPrintSource(SQ_MB_PAGE);

export const SALES_QUOTATIONS_SP_PRINT =
    salesQuotationPrintSource(SQ_SP_PAGE);

export const SALES_QUOTATIONS_AC_PRINT =
    salesQuotationPrintSource(SQ_AC_PAGE);
