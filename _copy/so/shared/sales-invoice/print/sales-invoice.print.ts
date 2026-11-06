//===============================================================
// Sales Invoices : print source (Print Engine), shared by SP /
// AC / MB. Each page's print file calls salesInvoicePrintSource
// with its config and service :
//
//   /print-viewer/sales-invoices-<type>/<id>?doc=sales-invoice
//   /print-viewer/sales-invoices-<type>/<id>?doc=sales-invoice-thermal
//
// Three documents :
//   sales-invoice          A4 Sales Invoice - Customer Copy (default)
//   sales-invoice-office   A4 Sales Invoice - Office Copy
//   sales-invoice-thermal  80 mm receipt (sales-invoice-thermal.template)
//
// Printable : Approved, Posted; Cancelled with a CANCELLED
// watermark. Draft is refused. Logo / BIN-TIN / printed stamp
// follow the company print switches (System Configuration,
// Accounts & Finance).
//===============================================================

import
{
    Injector,
    Type
}
from '@angular/core';

import
{
    firstValueFrom
}
from 'rxjs';

import
{
    SalesInvoiceService
}
from '../sales-invoice.service';

import
{
    SalesInvoicePageConfig
}
from '../sales-invoice.config';

import
{
    VOUCHER_SWITCH
}
from '../../../../../shared/components/accounting/voucher-switches';

import
{
    PrintSourceDef
}
from '../../../../../shared/print/print.models';

import
{
    SalesInvoicePrintData,
    SALES_INVOICE_DOCUMENT_CSS,
    salesInvoiceDocumentHtml,
    salesInvoiceDocumentSheet,
    salesInvoiceTitle
}
from './sales-invoice.template';

import
{
    SALES_INVOICE_THERMAL_CSS,
    salesInvoiceThermalHtml
}
from './sales-invoice-thermal.template';


//===============================================================
// Source
//===============================================================

export function salesInvoicePrintSource
(
    page:
        SalesInvoicePageConfig,
    service:
        Type<SalesInvoiceService>
):
    PrintSourceDef<SalesInvoicePrintData>
{
    return {
        key:page.printKey,

        title:'Sales Invoice',

        async load
        (
            injector:
                Injector,
            id:
                number | string
        ):
            Promise<SalesInvoicePrintData>
        {
            const invoice =
                await firstValueFrom(
                    injector
                        .get(service)
                        .getById(String(id))
                );

            return { invoice };
        },

        // Approved / Posted / Cancelled print; a draft does not
        denyReason
        (
            data:
                SalesInvoicePrintData
        ):
            string
        {
            const status =
                String(data?.invoice?.Status ?? '');

            if
            (
                !status
                ||
                status === 'Draft'
            )
            {
                return 'A draft sales invoice cannot be printed. Approve it first.';
            }

            return '';
        },

        fileName
        (
            data:
                SalesInvoicePrintData
        ):
            string
        {
            return data.invoice.InvoiceNo || salesInvoiceTitle(data.invoice);
        },

        documents:
        [
            // Default (the Print buttons open this key) : customer copy
            {
                key:page.a4DocKey,

                title:'Sales Invoice (A4) - Customer Copy',

                icon:'fas fa-user',

                render:
                    (data, kit) =>
                        salesInvoiceDocumentHtml(
                            data,
                            kit,
                            {
                                logo:kit.isOn(VOUCHER_SWITCH.PRINT_LOGO, true),
                                legal:kit.isOn(VOUCHER_SWITCH.PRINT_BIN_TIN, true),
                                stamp:kit.isOn(VOUCHER_SWITCH.PRINT_STAMP, true),
                                customerPayments:!!page.switches.PRINT_CUSTOMER_PAYMENTS && kit.isOn(page.switches.PRINT_CUSTOMER_PAYMENTS, false)
                            },
                            'customer'
                        ),

                css:
                    SALES_INVOICE_DOCUMENT_CSS(),

                excel:
                    (data, kit) =>
                        salesInvoiceDocumentSheet(data, kit)
            },

            // Office copy : full payment breakdown + charges paid on top
            {
                key:`${page.a4DocKey}-office`,

                title:'Sales Invoice (A4) - Office Copy',

                icon:'fas fa-building',

                render:
                    (data, kit) =>
                        salesInvoiceDocumentHtml(
                            data,
                            kit,
                            {
                                logo:kit.isOn(VOUCHER_SWITCH.PRINT_LOGO, true),
                                legal:kit.isOn(VOUCHER_SWITCH.PRINT_BIN_TIN, true),
                                stamp:kit.isOn(VOUCHER_SWITCH.PRINT_STAMP, true),
                                customerPayments:!!page.switches.PRINT_CUSTOMER_PAYMENTS && kit.isOn(page.switches.PRINT_CUSTOMER_PAYMENTS, false)
                            },
                            'office'
                        ),

                css:
                    SALES_INVOICE_DOCUMENT_CSS(),

                excel:
                    (data, kit) =>
                        salesInvoiceDocumentSheet(data, kit)
            },

            {
                key:page.thermalDocKey,

                title:'Receipt (Thermal 80 mm) - Customer',

                icon:'fas fa-receipt',

                render:
                    (data, kit) =>
                        salesInvoiceThermalHtml(
                            data,
                            kit,
                            {
                                legal:kit.isOn(VOUCHER_SWITCH.PRINT_BIN_TIN, true),
                                stamp:kit.isOn(VOUCHER_SWITCH.PRINT_STAMP, true),
                                customerPayments:!!page.switches.PRINT_CUSTOMER_PAYMENTS && kit.isOn(page.switches.PRINT_CUSTOMER_PAYMENTS, false)
                            }
                        ),

                css:
                    SALES_INVOICE_THERMAL_CSS()
            }
        ]
    };
}
