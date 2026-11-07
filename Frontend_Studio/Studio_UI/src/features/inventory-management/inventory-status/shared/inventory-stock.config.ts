//===============================================================
// Inventory Status pages : what makes MB / SP / AC different
//
// One list, stock card, service and print serve the three pages
// (inventory-status/shared). Each page's own list file only hands
// over its InventoryStockPageConfig.
//===============================================================

import
{
    InjectionToken,
    Provider
}
from '@angular/core';

import
{
    InventoryStockPageType
}
from './inventory-stock.model';


//===============================================================
// One page's tab (SP : Spare Parts / Lubricants; MB : Models /
// Technical Records)
//===============================================================

export interface InventoryStockTab
{
    id:
        string;

    label:
        string;

    // Rows of this ProductKind ('' = every kind); MB 'bikes' tab
    // lists the bikes instead
    kind:
        string;

    // MB : the free accessories (Additional / Promotional
    // Accessories products, from <apiPath>/bike-accessories)
    accessories?:
        boolean;
}

export interface InventoryStockPageConfig
{
    pageType:
        InventoryStockPageType;

    // Page header
    title:
        string;

    subtitle:
        string;

    icon:
        string;

    // inventory-management/inventory-status/<page>
    apiPath:
        string;

    // Print Viewer key : /print-viewer/<key>/<token>
    printKey:
        string;

    // Item word : "model" / "item"
    itemWord:
        string;

    // Product column header
    productHeader:
        string;

    tabs:
        InventoryStockTab[];

    // SP / AC : rack / shelf column
    showLocation:
        boolean;

    // SP / AC : part number in its own column
    showPartNumber:
        boolean;
}


//===============================================================
// The three pages
//===============================================================

export const STOCK_MB_PAGE:
    InventoryStockPageConfig =
{
    pageType:'MB',
    title:'Motor Bike Stock',
    subtitle:'Inventory Status : stock of every model, in transit and on hand',
    icon:'fas fa-motorcycle',
    apiPath:'inventory-management/inventory-status/motor-bike-stock',
    printKey:'motor-bike-stock',
    itemWord:'model',
    productHeader:'Model',
    tabs:
    [
        { id:'models', label:'Models', kind:'Motor Bikes' },
        { id:'accessories', label:'Free Accessories', kind:'Free Accessories', accessories:true },
        { id:'bikes', label:'Technical Records', kind:'' }
    ],
    showLocation:false,
    showPartNumber:false
};

export const STOCK_SP_PAGE:
    InventoryStockPageConfig =
{
    pageType:'SP',
    title:'Spare Parts & Lubricants Stock',
    subtitle:'Inventory Status : stock of every part, in transit and on hand',
    icon:'fas fa-gears',
    apiPath:'inventory-management/inventory-status/spare-parts-lubricants-stock',
    printKey:'spare-parts-lubricants-stock',
    itemWord:'item',
    productHeader:'Part',
    tabs:
    [
        { id:'spare-parts', label:'Spare Parts', kind:'Spare Parts' },
        { id:'lubricants', label:'Lubricants', kind:'Lubricants' }
    ],
    showLocation:true,
    showPartNumber:true
};

export const STOCK_AC_PAGE:
    InventoryStockPageConfig =
{
    pageType:'AC',
    title:'Accessories Stock',
    subtitle:'Inventory Status : stock of every accessory, in transit and on hand',
    icon:'fas fa-helmet-safety',
    apiPath:'inventory-management/inventory-status/accessories-stock',
    printKey:'accessories-stock',
    itemWord:'item',
    productHeader:'Accessory',
    tabs:
    [
        { id:'accessories', label:'Accessories', kind:'' }
    ],
    showLocation:true,
    showPartNumber:true
};


//===============================================================
// Injection
//===============================================================

export const INVENTORY_STOCK_PAGE =
    new InjectionToken<InventoryStockPageConfig>(
        'INVENTORY_STOCK_PAGE'
    );

export function inventoryStockProviders
(
    page:
        InventoryStockPageConfig
):
    Provider[]
{
    return [
        {
            provide:INVENTORY_STOCK_PAGE,
            useValue:page
        }
    ];
}
