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
    SI_MB_PAGE
}
from '../../shared/sales-invoice/sales-invoice.config';


//===============================================================
// Sales Invoices - MB Service (Motor Bike Sales)
//
// Everything is in the shared SalesInvoiceService; this page only
// gives its API path
// (api/sales-operations/motor-bike-sales/sales-invoices-mb).
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class SalesInvoicesMbService
    extends SalesInvoiceService
{
    protected readonly apiPath:
        string =
        SI_MB_PAGE.apiPath;
}
