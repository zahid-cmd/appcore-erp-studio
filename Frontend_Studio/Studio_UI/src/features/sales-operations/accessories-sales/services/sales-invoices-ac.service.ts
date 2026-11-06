//===============================================================
// Imports
//===============================================================

import
{
    Injectable
}
from '@angular/core';

import
{
    SalesInvoiceService
}
from '../../shared/sales-invoice/sales-invoice.service';

import
{
    SI_AC_PAGE
}
from '../../shared/sales-invoice/sales-invoice.config';


//===============================================================
// Sales Invoices - AC Service (Accessories Sales)
//
// Everything is in the shared SalesInvoiceService; this page only
// gives its API path
// (api/sales-operations/accessories-sales/sales-invoices-ac).
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class SalesInvoicesAcService
    extends SalesInvoiceService
{
    protected readonly apiPath:
        string =
        SI_AC_PAGE.apiPath;
}
