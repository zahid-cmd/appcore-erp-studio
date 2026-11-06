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
// Sales Invoices - AC Form (Accessories Sales)
//
// The page is the shared Sales Invoice form
// (sales-operations/shared/sales-invoice/form); this file only
// gives it this page's config and service.
//===============================================================

@Component(
{
    selector:'sales-invoices-ac-form',

    standalone:true,

    imports:
    [
        SalesInvoiceForm
    ],

    providers:
        salesInvoiceProviders(
            SI_AC_PAGE,
            SalesInvoicesAcService
        ),

    templateUrl:'./sales-invoices-ac-form.html',

    styleUrl:'./sales-invoices-ac-form.css'
})

export class SalesInvoicesAcForm
{
}
