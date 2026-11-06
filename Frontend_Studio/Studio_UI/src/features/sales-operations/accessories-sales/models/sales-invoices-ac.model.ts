//===============================================================
// Sales Invoices - AC model : the shared Sales Invoice model
// (sales-operations/shared/sales-invoice), kept here for the
// files that import it from this menu.
//
// The page names (Code Sync) are the shared types; the page adds
// no field (as SalesInvoicesAcDto derives from SalesInvoiceDto on
// the server).
//===============================================================

import
{
    SalesInvoice,
    CreateSalesInvoice,
    UpdateSalesInvoice,
    SalesInvoiceDefaults
}
from '../../shared/sales-invoice/sales-invoice.model';

export * from '../../shared/sales-invoice/sales-invoice.model';

export type SalesInvoicesAc =
    SalesInvoice;

export type CreateSalesInvoicesAc =
    CreateSalesInvoice;

export type UpdateSalesInvoicesAc =
    UpdateSalesInvoice;

export type SalesInvoicesAcDefaults =
    SalesInvoiceDefaults;
