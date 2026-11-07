//===============================================================
// Purchase Order pages : what makes MB / SP / AC different
//
// One form, list, service and print serve every Purchase Order
// page (shared/purchase-order). Each page's own files only hand
// over its PurchaseOrderPageConfig and its service.
//
// Switches are read BY CODE (Procurement = MOD-007); '' = the
// switch is not on this page (its fallback is used).
//===============================================================

import
{
    InjectionToken,
    Provider,
    Type
}
from '@angular/core';

import
{
    PurchaseOrderPageType
}
from './purchase-order.model';

import
{
    PurchaseOrderService
}
from './purchase-order.service';


//===============================================================
// Switch codes of one page
//===============================================================

export interface PurchaseOrderSwitchCodes
{
    // Read by the Purchases page
    PO_REQUIRED:
        string;

    CARRY_BALANCE:
        string;

    // PO date window (Value = most days; empty = any day)
    BACK_DATED:
        string;

    POST_DATED:
        string;

    // Value = most lines (OFF = no limit)
    MAX_LINES:
        string;

    EXPECTED_REQUIRED:
        string;

    PRINT_ON_APPROVAL:
        string;

    PLACE_ON_APPROVAL:
        string;

    // Pricing (SP / AC); '' on MB
    FREE_GOODS:
        string;

    // Value = Nearest (default) / Up / Down
    ROUND_PAYABLE:
        string;

    WHOLE_TAKA_LINES:
        string;

    // Missing = ON : the supplier's terms fill the order and stay
    // editable; OFF : they are fixed
    EDIT_SUPPLIER_TERMS:
        string;

    // ON = a line may go above the item's Max Stock Level (warning
    // only); OFF / missing = Max is a hard cap
    ABOVE_MAX_STOCK:
        string;
}


//===============================================================
// One page
//===============================================================

export interface PurchaseOrderPageConfig
{
    // MB / SP / AC
    pageType:
        PurchaseOrderPageType;

    // "Purchase Order - SP" (form, print) / "Purchase Orders - SP"
    title:
        string;

    listTitle:
        string;

    // API path after environment.apiUrl
    apiPath:
        string;

    // Print viewer key (print-registry.ts)
    printKey:
        string;

    // Purchase VAT rules used for the lines, by product type
    vatTypes:
        string[];

    // MRP / Profit % / DP pricing, free qty, additional discount,
    // rounding (SP / AC). false (MB) : unit price only.
    mrpPricing:
        boolean;

    // Words for the item : "Spare Part / Lubricant"
    item:
        string;

    // "spare part / lubricant"
    itemLower:
        string;

    // "a spare part / lubricant" / "an accessory"
    itemArticle:
        string;

    // "spare parts / lubricants"
    items:
        string;

    // "spare parts & lubricants" (VAT notices)
    goods:
        string;

    // Font Awesome icon of the Add card
    icon:
        string;

    switches:
        PurchaseOrderSwitchCodes;
}


//===============================================================
// The pages
//===============================================================

export const PO_MB_PAGE:
    PurchaseOrderPageConfig =
{
    pageType:'MB',
    title:'Purchase Order - MB',
    listTitle:'Purchase Orders - MB',
    apiPath:'procurement/motor-bike-purchase/purchase-orders-mb',
    printKey:'purchase-orders-mb',
    vatTypes:['Motor Bikes'],
    mrpPricing:false,
    item:'Motor Bike',
    itemLower:'motor bike',
    itemArticle:'a motor bike',
    items:'motor bikes',
    goods:'motor bikes',
    icon:'fa-motorcycle',
    switches:
    {
        PO_REQUIRED:'CFG-MOD-007-0001',
        CARRY_BALANCE:'CFG-MOD-007-0002',
        BACK_DATED:'CFG-MOD-007-0003',
        POST_DATED:'CFG-MOD-007-0004',
        MAX_LINES:'CFG-MOD-007-0005',
        EXPECTED_REQUIRED:'CFG-MOD-007-0006',
        PRINT_ON_APPROVAL:'CFG-MOD-007-0007',
        PLACE_ON_APPROVAL:'CFG-MOD-007-0009',
        FREE_GOODS:'',
        ROUND_PAYABLE:'',
        WHOLE_TAKA_LINES:'',
        EDIT_SUPPLIER_TERMS:'CFG-MOD-007-0040',
        ABOVE_MAX_STOCK:'CFG-MOD-007-0080'
    }
};

export const PO_SP_PAGE:
    PurchaseOrderPageConfig =
{
    pageType:'SP',
    title:'Purchase Order - SP',
    listTitle:'Purchase Orders - SP',
    apiPath:'procurement/spare-parts-lubricant-purchase/purchase-orders-sp',
    printKey:'purchase-orders-sp',
    vatTypes:['Spare Parts', 'Lubricants'],
    mrpPricing:true,
    item:'Spare Part / Lubricant',
    itemLower:'spare part / lubricant',
    itemArticle:'a spare part / lubricant',
    items:'spare parts / lubricants',
    goods:'spare parts & lubricants',
    icon:'fa-gears',
    switches:
    {
        PO_REQUIRED:'CFG-MOD-007-0010',
        CARRY_BALANCE:'CFG-MOD-007-0011',
        BACK_DATED:'CFG-MOD-007-0012',
        POST_DATED:'CFG-MOD-007-0013',
        MAX_LINES:'CFG-MOD-007-0014',
        EXPECTED_REQUIRED:'CFG-MOD-007-0015',
        PRINT_ON_APPROVAL:'CFG-MOD-007-0016',
        PLACE_ON_APPROVAL:'CFG-MOD-007-0018',
        FREE_GOODS:'CFG-MOD-007-0028',
        ROUND_PAYABLE:'CFG-MOD-007-0030',
        WHOLE_TAKA_LINES:'CFG-MOD-007-0032',
        EDIT_SUPPLIER_TERMS:'CFG-MOD-007-0038',
        ABOVE_MAX_STOCK:'CFG-MOD-007-0081'
    }
};

export const PO_AC_PAGE:
    PurchaseOrderPageConfig =
{
    pageType:'AC',
    title:'Purchase Order - AC',
    listTitle:'Purchase Orders - AC',
    apiPath:'procurement/accessories-purchase/purchase-orders-ac',
    printKey:'purchase-orders-ac',
    vatTypes:['Accessories'],
    mrpPricing:true,
    item:'Accessory',
    itemLower:'accessory',
    itemArticle:'an accessory',
    items:'accessories',
    goods:'accessories',
    icon:'fa-helmet-safety',
    switches:
    {
        PO_REQUIRED:'CFG-MOD-007-0019',
        CARRY_BALANCE:'CFG-MOD-007-0020',
        BACK_DATED:'CFG-MOD-007-0021',
        POST_DATED:'CFG-MOD-007-0022',
        MAX_LINES:'CFG-MOD-007-0023',
        EXPECTED_REQUIRED:'CFG-MOD-007-0024',
        PRINT_ON_APPROVAL:'CFG-MOD-007-0025',
        PLACE_ON_APPROVAL:'CFG-MOD-007-0027',
        FREE_GOODS:'CFG-MOD-007-0029',
        ROUND_PAYABLE:'CFG-MOD-007-0031',
        WHOLE_TAKA_LINES:'CFG-MOD-007-0033',
        EDIT_SUPPLIER_TERMS:'CFG-MOD-007-0039',
        ABOVE_MAX_STOCK:'CFG-MOD-007-0082'
    }
};


//===============================================================
// DI : the page's form / list read these
//===============================================================

export const PURCHASE_ORDER_PAGE =
    new InjectionToken<PurchaseOrderPageConfig>('PURCHASE_ORDER_PAGE');

// Providers of one page : its config, and its service as the
// shared PurchaseOrderService
export function purchaseOrderProviders
(
    page:
        PurchaseOrderPageConfig,
    service:
        Type<PurchaseOrderService>
):
    Provider[]
{
    return [
        {
            provide:PURCHASE_ORDER_PAGE,
            useValue:page
        },
        {
            provide:PurchaseOrderService,
            useExisting:service
        }
    ];
}