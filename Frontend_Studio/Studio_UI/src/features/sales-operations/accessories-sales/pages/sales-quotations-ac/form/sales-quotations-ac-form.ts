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
// Sales Quotations - AC Form (hand-written : NEVER run Code Sync
// for this page again)
//
// The page is the shared Sales Invoice form in quotation mode
// (sales-operations/shared/sales-invoice); this file only gives it
// this page's config (SQ_AC_PAGE) and the invoice service of the
// type (defaults, products, customers, prices).
//===============================================================

@Component(
{
    selector:'sales-quotations-ac-form',

    standalone:true,

    imports:
    [
        SalesInvoiceForm
    ],

    providers:
        salesInvoiceProviders(
            SQ_AC_PAGE,
            SalesInvoicesAcService
        ),

    templateUrl:'./sales-quotations-ac-form.html',

    styleUrl:'./sales-quotations-ac-form.css'
})

export class SalesQuotationsAcForm
{
}
