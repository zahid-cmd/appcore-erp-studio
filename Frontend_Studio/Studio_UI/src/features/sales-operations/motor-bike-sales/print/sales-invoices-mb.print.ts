//===============================================================
// Sales Invoices - MB : print source (Print Engine)
//
//   /print-viewer/sales-invoices-mb/<id>?doc=sales-invoice
//   /print-viewer/sales-invoices-mb/<id>?doc=sales-invoice-thermal
//
// The source and layouts are shared by SP / AC / MB
// (sales-operations/shared/sales-invoice/print); this file gives
// this page's config and service.
//===============================================================

import
{
    PrintSourceDef
}
from '../../../../shared/print/print.models';

import
{
    SI_MB_PAGE
}
from '../../shared/sales-invoice/sales-invoice.config';

import
{
    SalesInvoicePrintData
}
from '../../shared/sales-invoice/print/sales-invoice.template';

import
{
    salesInvoicePrintSource
}
from '../../shared/sales-invoice/print/sales-invoice.print';

import
{
    SalesInvoicesMbService
}
from '../services/sales-invoices-mb.service';


export const SALES_INVOICES_MB_PRINT:
    PrintSourceDef<SalesInvoicePrintData> =
    salesInvoicePrintSource(
        SI_MB_PAGE,
        SalesInvoicesMbService
    );
