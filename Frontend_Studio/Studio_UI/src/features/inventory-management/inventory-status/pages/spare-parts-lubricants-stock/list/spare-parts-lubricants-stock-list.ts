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
    STOCK_SP_PAGE,
    inventoryStockProviders
}
from '../../../shared/inventory-stock.config';


//===============================================================
// Spare Parts & Lubricants Stock (Inventory Management › Inventory Status)
//
// The page is the shared stock list (inventory-status/shared);
// this file only gives it this page's config.
//===============================================================

@Component(
{
    selector:'spare-parts-lubricants-stock-list',

    standalone:true,

    imports:
    [
        InventoryStockList
    ],

    providers:
        inventoryStockProviders(
            STOCK_SP_PAGE
        ),

    templateUrl:'./spare-parts-lubricants-stock-list.html',

    styleUrl:'./spare-parts-lubricants-stock-list.css'
})

export class SparePartsLubricantsStockList
{
}
