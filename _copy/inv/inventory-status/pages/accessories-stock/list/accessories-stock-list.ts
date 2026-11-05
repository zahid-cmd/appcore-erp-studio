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
    InventoryStockList
}
from '../../../shared/list/inventory-stock-list';

import
{
    STOCK_AC_PAGE,
    inventoryStockProviders
}
from '../../../shared/inventory-stock.config';


//===============================================================
// Accessories Stock (Inventory Management › Inventory Status)
//
// The page is the shared stock list (inventory-status/shared);
// this file only gives it this page's config.
//===============================================================

@Component(
{
    selector:'accessories-stock-list',

    standalone:true,

    imports:
    [
        InventoryStockList
    ],

    providers:
        inventoryStockProviders(
            STOCK_AC_PAGE
        ),

    templateUrl:'./accessories-stock-list.html',

    styleUrl:'./accessories-stock-list.css'
})

export class AccessoriesStockList
{
}
