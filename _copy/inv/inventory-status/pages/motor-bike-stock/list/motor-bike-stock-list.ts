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
    STOCK_MB_PAGE,
    inventoryStockProviders
}
from '../../../shared/inventory-stock.config';


//===============================================================
// Motor Bike Stock (Inventory Management › Inventory Status)
//
// The page is the shared stock list (inventory-status/shared);
// this file only gives it this page's config.
//===============================================================

@Component(
{
    selector:'motor-bike-stock-list',

    standalone:true,

    imports:
    [
        InventoryStockList
    ],

    providers:
        inventoryStockProviders(
            STOCK_MB_PAGE
        ),

    templateUrl:'./motor-bike-stock-list.html',

    styleUrl:'./motor-bike-stock-list.css'
})

export class MotorBikeStockList
{
}
