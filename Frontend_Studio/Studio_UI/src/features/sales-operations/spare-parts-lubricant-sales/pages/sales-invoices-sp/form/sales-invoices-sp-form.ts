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
    SI_SP_PAGE,
    salesInvoiceProviders
}
from '../../../../shared/sales-invoice/sales-invoice.config';

import
{
    SalesInvoicesSpService
}
from '../../../services/sales-invoices-sp.service';


//===============================================================
// Sales Invoices - SP Form (Spare Parts & Lubricant Sales)
//
// The page is the shared Sales Invoice form
// (sales-operations/shared/sales-invoice/form); this file only
// gives it this page's config and service.
//===============================================================

@Component(
{
    selector:'sales-invoices-sp-form',

    standalone:true,

    imports:
    [
        SalesInvoiceForm
    ],

    providers:
        salesInvoiceProviders(
            SI_SP_PAGE,
            SalesInvoicesSpService
        ),

    templateUrl:'./sales-invoices-sp-form.html',

    styleUrl:'./sales-invoices-sp-form.css'
})

export class SalesInvoicesSpForm
{
}
