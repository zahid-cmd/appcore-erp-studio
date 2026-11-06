//===============================================================
// Sales Invoices - AC : print source (Print Engine)
//
//   /print-viewer/sales-invoices-ac/<id>?doc=sales-invoice
//   /print-viewer/sales-invoices-ac/<id>?doc=sales-invoice-thermal
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
    SI_AC_PAGE
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
    SalesInvoicesAcService
}
from '../services/sales-invoices-ac.service';


export const SALES_INVOICES_AC_PRINT:
    PrintSourceDef<SalesInvoicePrintData> =
    salesInvoicePrintSource(
        SI_AC_PAGE,
        SalesInvoicesAcService
    );
