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
    SalesReturnList
}
from '../../../../shared/sales-return/list/sales-return-list';

import
{
    SR_SP_PAGE,
    salesReturnProviders
}
from '../../../../shared/sales-return/sales-return.config';


//===============================================================
// Sales Returns - SP List (hand-written : NEVER run Code Sync
// for this page again)
//
// The page is the shared Sales Return list
// (sales-operations/shared/sales-return); this file only gives it
// this page's config (SR_SP_PAGE).
//===============================================================

@Component(
{
    selector:'sales-returns-sp-list',

    standalone:true,

    imports:
    [
        SalesReturnList
    ],

    providers:
        salesReturnProviders(
            SR_SP_PAGE
        ),

    templateUrl:'./sales-returns-sp-list.html',

    styleUrl:'./sales-returns-sp-list.css'
})

export class SalesReturnsSpList
{
}
