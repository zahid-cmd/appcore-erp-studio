//===============================================================
// Imports
//===============================================================

import
{
    Component
}
from '@angular/core';

import
{
    SalesInvoiceForm
}
from '../../../../shared/sales-invoice/form/sales-invoice-form';

import
{
    SQ_MB_PAGE,
    salesInvoiceProviders
}
from '../../../../shared/sales-invoice/sales-invoice.config';

import
{
    SalesInvoicesMbService
}
from '../../../services/sales-invoices-mb.service';


//===============================================================
// Sales Quotations - MB Form (hand-written : NEVER run Code Sync
// for this page again)
//
// The page is the shared Sales Invoice form in quotation mode
// (sales-operations/shared/sales-invoice); this file only gives it
// this page's config (SQ_MB_PAGE) and the invoice service of the
// type (defaults, products, customers, prices).
//===============================================================

@Component(
{
    selector:'sales-quotations-mb-form',

    standalone:true,

    imports:
    [
        SalesInvoiceForm
    ],

    providers:
        salesInvoiceProviders(
            SQ_MB_PAGE,
            SalesInvoicesMbService
        ),

    templateUrl:'./sales-quotations-mb-form.html',

    styleUrl:'./sales-quotations-mb-form.css'
})

export class SalesQuotationsMbForm
{
}
