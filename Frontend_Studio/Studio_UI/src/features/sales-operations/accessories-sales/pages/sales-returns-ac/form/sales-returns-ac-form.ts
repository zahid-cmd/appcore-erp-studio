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
    SR_AC_PAGE,
    salesReturnProviders
}
from '../../../../shared/sales-return/sales-return.config';


//===============================================================
// Sales Returns - AC Form (hand-written : NEVER run Code Sync
// for this page again)
//
// The page is the shared Sales Return form
// (sales-operations/shared/sales-return); this file only gives it
// this page's config (SR_AC_PAGE).
//===============================================================

@Component(
{
    selector:'sales-returns-ac-form',

    standalone:true,

    imports:
    [
        SalesReturnForm
    ],

    providers:
        salesReturnProviders(
            SR_AC_PAGE
        ),

    templateUrl:'./sales-returns-ac-form.html',

    styleUrl:'./sales-returns-ac-form.css'
})

export class SalesReturnsAcForm
{
}
