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
    SR_MB_PAGE,
    salesReturnProviders
}
from '../../../../shared/sales-return/sales-return.config';


//===============================================================
// Sales Returns - MB List (hand-written : NEVER run Code Sync
// for this page again)
//
// The page is the shared Sales Return list
// (sales-operations/shared/sales-return); this file only gives it
// this page's config (SR_MB_PAGE).
//===============================================================

@Component(
{
    selector:'sales-returns-mb-list',

    standalone:true,

    imports:
    [
        SalesReturnList
    ],

    providers:
        salesReturnProviders(
            SR_MB_PAGE
        ),

    templateUrl:'./sales-returns-mb-list.html',

    styleUrl:'./sales-returns-mb-list.css'
})

export class SalesReturnsMbList
{
}
