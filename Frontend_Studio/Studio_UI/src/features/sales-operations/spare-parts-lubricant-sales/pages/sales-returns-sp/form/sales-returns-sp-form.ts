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
    SR_SP_PAGE,
    salesReturnProviders
}
from '../../../../shared/sales-return/sales-return.config';


//===============================================================
// Sales Returns - SP Form (hand-written : NEVER run Code Sync
// for this page again)
//
// The page is the shared Sales Return form
// (sales-operations/shared/sales-return); this file only gives it
// this page's config (SR_SP_PAGE).
//===============================================================

@Component(
{
    selector:'sales-returns-sp-form',

    standalone:true,

    imports:
    [
        SalesReturnForm
    ],

    providers:
        salesReturnProviders(
            SR_SP_PAGE
        ),

    templateUrl:'./sales-returns-sp-form.html',

    styleUrl:'./sales-returns-sp-form.css'
})

export class SalesReturnsSpForm
{
}
