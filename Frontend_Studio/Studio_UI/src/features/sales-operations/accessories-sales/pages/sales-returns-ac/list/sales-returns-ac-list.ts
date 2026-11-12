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
    SR_AC_PAGE,
    salesReturnProviders
}
from '../../../../shared/sales-return/sales-return.config';


//===============================================================
// Sales Returns - AC List (hand-written : NEVER run Code Sync
// for this page again)
//
// The page is the shared Sales Return list
// (sales-operations/shared/sales-return); this file only gives it
// this page's config (SR_AC_PAGE).
//===============================================================

@Component(
{
    selector:'sales-returns-ac-list',

    standalone:true,

    imports:
    [
        SalesReturnList
    ],

    providers:
        salesReturnProviders(
            SR_AC_PAGE
        ),

    templateUrl:'./sales-returns-ac-list.html',

    styleUrl:'./sales-returns-ac-list.css'
})

export class SalesReturnsAcList
{
}
