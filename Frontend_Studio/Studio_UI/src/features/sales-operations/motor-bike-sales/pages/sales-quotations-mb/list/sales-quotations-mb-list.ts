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
    SalesQuotationList
}
from '../../../../shared/sales-invoice/quotation-list/sales-quotation-list';

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
// Sales Quotations - MB List (hand-written : NEVER run Code Sync
// for this page again)
//
// The page is the shared Sales Quotation list
// (sales-operations/shared/sales-invoice); this file only gives it
// this page's config (SQ_MB_PAGE) and the invoice service of the
// type (defaults, products, customers, prices).
//===============================================================

@Component(
{
    selector:'sales-quotations-mb-list',

    standalone:true,

    imports:
    [
        SalesQuotationList
    ],

    providers:
        salesInvoiceProviders(
            SQ_MB_PAGE,
            SalesInvoicesMbService
        ),

    templateUrl:'./sales-quotations-mb-list.html',

    styleUrl:'./sales-quotations-mb-list.css'
})

export class SalesQuotationsMbList
{
}
