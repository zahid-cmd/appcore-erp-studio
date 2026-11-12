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
    SalesReturnForm
}
from '../../../../shared/sales-return/form/sales-return-form';

import
{
    SR_MB_PAGE,
    salesReturnProviders
}
from '../../../../shared/sales-return/sales-return.config';


//===============================================================
// Sales Returns - MB Form (hand-written : NEVER run Code Sync
// for this page again)
//
// The page is the shared Sales Return form
// (sales-operations/shared/sales-return); this file only gives it
// this page's config (SR_MB_PAGE).
//===============================================================

@Component(
{
    selector:'sales-returns-mb-form',

    standalone:true,

    imports:
    [
        SalesReturnForm
    ],

    providers:
        salesReturnProviders(
            SR_MB_PAGE
        ),

    templateUrl:'./sales-returns-mb-form.html',

    styleUrl:'./sales-returns-mb-form.css'
})

export class SalesReturnsMbForm
{
}
