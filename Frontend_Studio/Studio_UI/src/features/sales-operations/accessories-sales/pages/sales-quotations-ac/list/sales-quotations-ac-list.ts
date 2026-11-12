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
    SQ_AC_PAGE,
    salesInvoiceProviders
}
from '../../../../shared/sales-invoice/sales-invoice.config';

import
{
    SalesInvoicesAcService
}
from '../../../services/sales-invoices-ac.service';


//===============================================================
// Sales Quotations - AC List (hand-written : NEVER run Code Sync
// for this page again)
//
// The page is the shared Sales Quotation list
// (sales-operations/shared/sales-invoice); this file only gives it
// this page's config (SQ_AC_PAGE) and the invoice service of the
// type (defaults, products, customers, prices).
//===============================================================

@Component(
{
    selector:'sales-quotations-ac-list',

    standalone:true,

    imports:
    [
        SalesQuotationList
    ],

    providers:
        salesInvoiceProviders(
            SQ_AC_PAGE,
            SalesInvoicesAcService
        ),

    templateUrl:'./sales-quotations-ac-list.html',

    styleUrl:'./sales-quotations-ac-list.css'
})

export class SalesQuotationsAcList
{
}
