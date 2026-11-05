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
    SalesInvoiceList
}
from '../../../../shared/sales-invoice/list/sales-invoice-list';

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
// Sales Invoices - SP List (Spare Parts & Lubricant Sales)
//
// The page is the shared Sales Invoice list
// (sales-operations/shared/sales-invoice/list); this file only
// gives it this page's config and service.
//===============================================================

@Component(
{
    selector:'sales-invoices-sp-list',

    standalone:true,

    imports:
    [
        SalesInvoiceList
    ],

    providers:
        salesInvoiceProviders(
            SI_SP_PAGE,
            SalesInvoicesSpService
        ),

    templateUrl:'./sales-invoices-sp-list.html',

    styleUrl:'./sales-invoices-sp-list.css'
})

export class SalesInvoicesSpList
{
}
