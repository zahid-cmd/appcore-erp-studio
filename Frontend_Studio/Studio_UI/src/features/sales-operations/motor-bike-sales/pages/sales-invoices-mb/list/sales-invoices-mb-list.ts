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
    SI_MB_PAGE,
    salesInvoiceProviders
}
from '../../../../shared/sales-invoice/sales-invoice.config';

import
{
    SalesInvoicesMbService
}
from '../../../services/sales-invoices-mb.service';


//===============================================================
// Sales Invoices - MB List (Motor Bike Sales)
//
// The page is the shared Sales Invoice list
// (sales-operations/shared/sales-invoice/list); this file only
// gives it this page's config and service.
//===============================================================

@Component(
{
    selector:'sales-invoices-mb-list',

    standalone:true,

    imports:
    [
        SalesInvoiceList
    ],

    providers:
        salesInvoiceProviders(
            SI_MB_PAGE,
            SalesInvoicesMbService
        ),

    templateUrl:'./sales-invoices-mb-list.html',

    styleUrl:'./sales-invoices-mb-list.css'
})

export class SalesInvoicesMbList
{
}
