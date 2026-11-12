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
// Sales Quotations - SP Form (hand-written : NEVER run Code Sync
// for this page again)
//
// The page is the shared Sales Invoice form in quotation mode
// (sales-operations/shared/sales-invoice); this file only gives it
// this page's config (SQ_SP_PAGE) and the invoice service of the
// type (defaults, products, customers, prices).
//===============================================================

@Component(
{
    selector:'sales-quotations-sp-form',

    standalone:true,

    imports:
    [
        SalesInvoiceForm
    ],

    providers:
        salesInvoiceProviders(
            SQ_SP_PAGE,
            SalesInvoicesSpService
        ),

    templateUrl:'./sales-quotations-sp-form.html',

    styleUrl:'./sales-quotations-sp-form.css'
})

export class SalesQuotationsSpForm
{
}
