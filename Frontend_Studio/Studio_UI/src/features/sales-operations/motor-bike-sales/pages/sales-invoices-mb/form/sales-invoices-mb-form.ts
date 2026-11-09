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
// Sales Invoices - MB Form (Motor Bike Sales)
//
// The page is the shared Sales Invoice form
// (sales-operations/shared/sales-invoice/form); this file only
// gives it this page's config and service.
//===============================================================

@Component(
{
    selector:'sales-invoices-mb-form',

    standalone:true,

    imports:
    [
        SalesInvoiceForm
    ],

    providers:
        salesInvoiceProviders(
            SI_MB_PAGE,
            SalesInvoicesMbService
        ),

    templateUrl:'./sales-invoices-mb-form.html',

    styleUrl:'./sales-invoices-mb-form.css'
})

export class SalesInvoicesMbForm
{
}
