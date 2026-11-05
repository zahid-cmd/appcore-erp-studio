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
    SI_SP_PAGE
}
from '../../shared/sales-invoice/sales-invoice.config';


//===============================================================
// Sales Invoices - SP Service (Spare Parts & Lubricant Sales)
//
// Everything is in the shared SalesInvoiceService; this page only
// gives its API path
// (api/sales-operations/spare-parts-lubricant-sales/sales-invoices-sp).
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class SalesInvoicesSpService
    extends SalesInvoiceService
{
    protected readonly apiPath:
        string =
        SI_SP_PAGE.apiPath;
}
