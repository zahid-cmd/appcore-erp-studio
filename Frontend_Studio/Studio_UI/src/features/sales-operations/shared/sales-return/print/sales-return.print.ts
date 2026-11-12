//===============================================================
// Sales Returns - MB / SP / AC : print source (Print Engine)
//
//   /print-viewer/sales-returns-<type>/<publicId>?doc=sales-return
//
// One A4 document : the return as the Credit Note (Mushak 6.7) of
// the invoice : customer, invoice, lines returned with the
// invoice's own figures, VAT inside, the credit to the customer.
// Draft / Approved print with a DRAFT watermark, Cancelled with
// CANCELLED. Logo / BIN-TIN / printed stamp follow the company
// print switches.
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
    SalesReturnPageConfig,
    SR_AC_PAGE,
    SR_MB_PAGE,
    SR_SP_PAGE
}
from '../sales-return.config';

import
{
    SalesReturn
}
from '../sales-return.model';

import
{
    SalesReturnService
}
from '../sales-return.service';

import
{
    SALES_INVOICE_DOCUMENT_CSS
}
from '../../sales-invoice/print/sales-invoice.template';


export interface SalesReturnPrintData
{
    salesReturn:
        SalesReturn;
}

const ITEM_HEADERS:
    Record<string, string> =
{
    MB:'Motor Bike',
    SP:'Spare Part / Lubricant',
    AC:'Accessory'
};


function qty(value: number): string
{
    return String(Math.round((Number(value) || 0) * 100) / 100);
}


export function salesReturnHtml
(
    data:
        SalesReturnPrintData,
    kit:
        PrintKit,
    page:
        SalesReturnPageConfig,
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

    const r =
        data.salesReturn;

    const fact =
        (label: string, value: string, sub: string = ''): string =>
            `<div class="si-fact"><span>${e(label)}</span><b>${e(value || '-')}</b>${sub ? `<i>${e(sub)}</i>` : ''}</div>`;

    const customerBlock =
        `<div class="si-cus">
  <div class="si-cus-head">Returned By</div>
  <div class="si-cus-row">
    ${fact('Customer', r.CustomerName, r.CustomerCode)}
    ${fact('Phone', r.CustomerPhone)}
    ${fact('Address', r.CustomerAddress)}
    ${fact('Against Invoice', r.SalesInvoiceNo, r.SalesInvoiceDate ? kit.date(r.SalesInvoiceDate) : '')}
  </div>
</div>`;

    const showDisc =
        r.Lines.some(x => x.DiscountAmount > 0);

    const rows =
        r.Lines
            .map
            (
                (line, index) =>
                    `<tr>
  <td class="vd-c">${index + 1}</td>
  <td><div class="vd-main">${e(line.ProductName)}</div><div class="vd-sub">${e(line.ChassisNo ? `Chassis ${line.ChassisNo} || Engine ${line.EngineNo}` : [line.PartNumber, line.ProductCode].filter(x => !!x).join(' || '))}${line.Reason ? ` <span class="si-div">||</span> ${e(line.Reason)}` : ''}</div></td>
  <td class="vd-r">${e(qty(line.Quantity))}${line.Unit ? ` <span class="si-unit">${e(line.Unit)}</span>` : ''}</td>
  <td class="vd-r">${kit.money(line.UnitPrice)}</td>
  <td class="vd-r">${kit.money(line.GrossAmount)}</td>
  ${showDisc ? `<td class="vd-r">${line.DiscountAmount > 0 ? kit.money(-line.DiscountAmount) : '-'}</td>` : ''}
  <td class="vd-r">${kit.money(line.VatInside)}</td>
  <td class="vd-r">${kit.money(line.LineTotal)}</td>
</tr>`
            )
            .join('');

    const span =
        showDisc ? 5 : 4;

    const sum =
        (label: string, value: number, cls: string = 'si-sum'): string =>
            `<tr class="${cls}"><td></td><td class="vd-r" colspan="${span}">${e(label)}</td><td class="vd-r">${kit.money(value)}</td></tr>`;

    const totals =
        [
            sum('Goods Returned (net)', r.ItemsAmount, 'si-sum si-sum-first'),
            r.RegistrationRefund > 0 ? sum('Registration Fees Refunded', r.RegistrationRefund) : '',
            sum('Credit to the Customer', r.ReturnTotal, 'vd-total')
        ]
        .join('');

    const head =
        kit.voucherHead(
        {
            copy:'',
            title:`${page.docTitle} · Credit Note (Mushak 6.7)`,
            numberLabel:'Return No',
            number:r.ReturnNo,
            meta:
            [
                { label:'Date', value:kit.date(r.ReturnDate) },
                { label:'Invoice', value:r.SalesInvoiceNo },
                { label:'Branch', value:r.BranchName },
                { label:'Warehouse', value:r.WarehouseName || '-' }
            ],
            status:r.Status,
            qr:
                [
                    kit.company?.CompanyName || 'AppCore ERP',
                    page.docTitle,
                    r.ReturnNo,
                    kit.date(r.ReturnDate),
                    r.CustomerName,
                    `Tk ${kit.money(r.ReturnTotal)}`
                ]
                .filter(part => !!part)
                .join(' | '),
            logo:options.logo,
            legal:options.legal
        });

    const watermark =
        r.Status === 'Cancelled'
            ? 'CANCELLED'
            : r.Status === 'Posted'
                ? ''
                : 'DRAFT';

    return `<section class="pv-flow" data-watermark="${watermark}">
<div class="pv-run-head">
${head}
</div>
<div class="pv-body">
${customerBlock}
<div class="vd-amount">
  <div class="vd-amount-total"><span>Credit to the Customer</span><b>Tk ${kit.money(r.ReturnTotal)}</b></div>
  <div class="vd-amount-words"><span>In Words</span><i>${e(kit.words(r.ReturnTotal))}</i></div>
</div>
<table class="pv-split vd-lines si-lines">
  <colgroup><col style="width:9mm"><col><col style="width:16mm"><col style="width:22mm"><col style="width:22mm">${showDisc ? '<col style="width:20mm">' : ''}<col style="width:20mm"><col style="width:25mm"></colgroup>
  <thead><tr><th class="vd-c">SL</th><th>${e(ITEM_HEADERS[r.ProductType] ?? 'Item')}</th><th class="vd-r">Qty</th><th class="vd-r">Price</th><th class="vd-r">Gross</th>${showDisc ? '<th class="vd-r">Discount</th>' : ''}<th class="vd-r">VAT Inside</th><th class="vd-r si-nowrap">Credit (Tk)</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot>${totals}</tfoot>
</table>
<div class="vd-narration"><span>Reason</span><p>${e(r.Reason || '-')}${r.Narration ? ` | ${e(r.Narration)}` : ''}</p></div>
<div class="vd-note">The amount is credited to the customer's account; any refund is paid by a separate Payment Voucher. VAT inside the goods returned : Tk ${kit.money(r.TotalVatInside)}.</div>
${r.Status === 'Cancelled' && r.CancelReason ? `<div class="vd-note vd-danger">Return cancelled : ${e(r.CancelReason)}</div>` : ''}
<div class="vd-after">
${kit.signatures(['Received By', 'Customer', 'Authorised By'])}
</div>
</div>
<div class="pv-end">
${options.stamp ? `<div class="pv-printed">${e(r.BranchName ? r.BranchName + ' · ' : '')}Printed ${e(kit.now())}</div>` : ''}
</div>
</section>`;
}


export function salesReturnPrintSource
(
    page:
        SalesReturnPageConfig
):
    PrintSourceDef<SalesReturnPrintData>
{
    return {
        key:page.printKey,
        title:'Sales Return',
        async load
        (
            injector:
                Injector,
            id:
                number | string
        ):
            Promise<SalesReturnPrintData>
        {
            const salesReturn =
                await firstValueFrom(
                    injector
                        .get(SalesReturnService)
                        .getById(page.apiPath, String(id))
                );

            return { salesReturn };
        },
        denyReason
        (
            data:
                SalesReturnPrintData
        ):
            string
        {
            return data?.salesReturn ? '' : 'The return was not found.';
        },
        fileName
        (
            data:
                SalesReturnPrintData
        ):
            string
        {
            return data.salesReturn.ReturnNo || page.docTitle;
        },
        documents:
        [
            {
                key:page.a4DocKey,
                title:`${page.docTitle} (A4)`,
                icon:'fas fa-arrow-rotate-left',
                render:
                    (data, kit) =>
                        salesReturnHtml(
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
    } as PrintSourceDef<SalesReturnPrintData>;
}


export const SALES_RETURNS_MB_PRINT =
    salesReturnPrintSource(SR_MB_PAGE);

export const SALES_RETURNS_SP_PRINT =
    salesReturnPrintSource(SR_SP_PAGE);

export const SALES_RETURNS_AC_PRINT =
    salesReturnPrintSource(SR_AC_PAGE);
