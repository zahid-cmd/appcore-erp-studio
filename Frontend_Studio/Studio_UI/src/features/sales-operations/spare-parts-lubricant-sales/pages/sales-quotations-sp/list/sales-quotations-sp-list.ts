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
    SQ_SP_PAGE,
    salesInvoiceProviders
}
from '../../../../shared/sales-invoice/sales-invoice.config';

import
{
    SalesInvoicesSpService
}
from '../../../services/sales-invoices-sp.service';


//===============================================================
// Sales Quotations - SP List (hand-written : NEVER run Code Sync
// for this page again)
//
// The page is the shared Sales Quotation list
// (sales-operations/shared/sales-invoice); this file only gives it
// this page's config (SQ_SP_PAGE) and the invoice service of the
// type (defaults, products, customers, prices).
//===============================================================

@Component(
{
    selector:'sales-quotations-sp-list',

    standalone:true,

    imports:
    [
        SalesQuotationList
    ],

    providers:
        salesInvoiceProviders(
            SQ_SP_PAGE,
            SalesInvoicesSpService
        ),

    templateUrl:'./sales-quotations-sp-list.html',

    styleUrl:'./sales-quotations-sp-list.css'
})

export class SalesQuotationsSpList
{
}
