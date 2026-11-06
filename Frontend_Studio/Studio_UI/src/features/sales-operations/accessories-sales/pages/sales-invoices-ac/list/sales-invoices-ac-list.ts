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
    SI_AC_PAGE,
    salesInvoiceProviders
}
from '../../../../shared/sales-invoice/sales-invoice.config';

import
{
    SalesInvoicesAcService
}
from '../../../services/sales-invoices-ac.service';


//===============================================================
// Sales Invoices - AC List (Accessories Sales)
//
// The page is the shared Sales Invoice list
// (sales-operations/shared/sales-invoice/list); this file only
// gives it this page's config and service.
//===============================================================

@Component(
{
    selector:'sales-invoices-ac-list',

    standalone:true,

    imports:
    [
        SalesInvoiceList
    ],

    providers:
        salesInvoiceProviders(
            SI_AC_PAGE,
            SalesInvoicesAcService
        ),

    templateUrl:'./sales-invoices-ac-list.html',

    styleUrl:'./sales-invoices-ac-list.css'
})

export class SalesInvoicesAcList
{
}
