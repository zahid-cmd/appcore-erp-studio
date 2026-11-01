//===============================================================
// Purchases pages : what makes MB / SP / AC different
//
// One form, list, service and print serve every Purchases page
// (shared/purchase). Each page's own files only hand over its
// PurchasePageConfig and its service.
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
    PurchasePageType
}
from './purchase.model';

import
{
    PurchaseService
}
from './purchase.service';


//===============================================================
// Switch codes of one page
//===============================================================

export interface PurchaseSwitchCodes
{
    // Lines come from one Purchase Order of the supplier
    PO_REQUIRED:
        string;

    // (server) PO balance carried or closed short
    CARRY_BALANCE:
        string;

    // Purchase date window (Value = most days; empty = any day)
    BACK_DATED:
        string;

    POST_DATED:
        string;

    // Value = most lines (OFF = no limit)
    MAX_LINES:
        string;

    // Mushak 6.3 No and Date required
    MUSHAK_REQUIRED:
        string;

    // Warehouse + Unit Desk here; stock on hand on posting
    RECEIVED_ON_PURCHASE:
        string;

    // Approve also posts
    POST_ON_APPROVAL:
        string;

    // An approved (not yet posted) purchase prints
    PRINT_ON_APPROVAL:
        string;

    // MB : every bike with Chassis, Engine, Key, Battery No
    UNITS_REQUIRED:
        string;

    UNIQUE_KEY_NO:
        string;

    UNIQUE_BATTERY_NO:
        string;

    // Supplier Invoice No required
    INVOICE_NO_REQUIRED:
        string;

    DO_REQUIRED:
        string;

    GATE_PASS_REQUIRED:
        string;

    // Value = tolerance % above the PO price
    PRICE_ABOVE_PO:
        string;

    // The line VAT % can be typed (as on the 6.3)
    VAT_AS_PER_63:
        string;

    // Pricing (SP / AC); '' on MB
    FREE_GOODS:
        string;

    // Value = Nearest (default) / Up / Down
    ROUND_PAYABLE:
        string;

    WHOLE_TAKA_LINES:
        string;

    // Missing = ON : the supplier's terms stay editable
    EDIT_SUPPLIER_TERMS:
        string;
}


//===============================================================
// One page
//===============================================================

export interface PurchasePageConfig
{
    // MB / SP / AC
    pageType:
        PurchasePageType;

    // "Purchase - SP" (form, print) / "Purchases - SP"
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

    item:
        string;

    itemLower:
        string;

    itemArticle:
        string;

    items:
        string;

    goods:
        string;

    icon:
        string;

    switches:
        PurchaseSwitchCodes;
}


//===============================================================
// The pages
//===============================================================

export const PUR_MB_PAGE:
    PurchasePageConfig =
{
    pageType:'MB',
    title:'Purchase - MB',
    listTitle:'Purchases - MB',
    apiPath:'procurement/motor-bike-purchase/purchases-mb',
    printKey:'purchases-mb',
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
        BACK_DATED:'CFG-MOD-007-0041',
        POST_DATED:'CFG-MOD-007-0042',
        MAX_LINES:'CFG-MOD-007-0043',
        MUSHAK_REQUIRED:'CFG-MOD-007-0044',
        RECEIVED_ON_PURCHASE:'CFG-MOD-007-0045',
        POST_ON_APPROVAL:'CFG-MOD-007-0046',
        PRINT_ON_APPROVAL:'CFG-MOD-007-0047',
        UNITS_REQUIRED:'CFG-MOD-007-0048',
        UNIQUE_KEY_NO:'CFG-MOD-007-0049',
        UNIQUE_BATTERY_NO:'CFG-MOD-007-0050',
        INVOICE_NO_REQUIRED:'CFG-MOD-007-0065',
        DO_REQUIRED:'CFG-MOD-007-0066',
        GATE_PASS_REQUIRED:'CFG-MOD-007-0067',
        PRICE_ABOVE_PO:'CFG-MOD-007-0068',
        VAT_AS_PER_63:'CFG-MOD-007-0069',
        FREE_GOODS:'',
        ROUND_PAYABLE:'',
        WHOLE_TAKA_LINES:'',
        EDIT_SUPPLIER_TERMS:'CFG-MOD-007-0040'
    }
};


export const PUR_SP_PAGE:
    PurchasePageConfig =
{
    pageType:'SP',
    title:'Purchase - SP',
    listTitle:'Purchases - SP',
    apiPath:'procurement/spare-parts-lubricant-purchase/purchases-sp',
    printKey:'purchases-sp',
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
        BACK_DATED:'CFG-MOD-007-0051',
        POST_DATED:'CFG-MOD-007-0052',
        MAX_LINES:'CFG-MOD-007-0053',
        MUSHAK_REQUIRED:'CFG-MOD-007-0054',
        RECEIVED_ON_PURCHASE:'CFG-MOD-007-0055',
        POST_ON_APPROVAL:'CFG-MOD-007-0056',
        PRINT_ON_APPROVAL:'CFG-MOD-007-0057',
        UNITS_REQUIRED:'',
        UNIQUE_KEY_NO:'',
        UNIQUE_BATTERY_NO:'',
        INVOICE_NO_REQUIRED:'CFG-MOD-007-0070',
        DO_REQUIRED:'CFG-MOD-007-0071',
        GATE_PASS_REQUIRED:'CFG-MOD-007-0072',
        PRICE_ABOVE_PO:'CFG-MOD-007-0073',
        VAT_AS_PER_63:'CFG-MOD-007-0074',
        FREE_GOODS:'CFG-MOD-007-0028',
        ROUND_PAYABLE:'CFG-MOD-007-0030',
        WHOLE_TAKA_LINES:'CFG-MOD-007-0032',
        EDIT_SUPPLIER_TERMS:'CFG-MOD-007-0038'
    }
};


export const PUR_AC_PAGE:
    PurchasePageConfig =
{
    pageType:'AC',
    title:'Purchase - AC',
    listTitle:'Purchases - AC',
    apiPath:'procurement/accessories-purchase/purchases-ac',
    printKey:'purchases-ac',
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
        BACK_DATED:'CFG-MOD-007-0058',
        POST_DATED:'CFG-MOD-007-0059',
        MAX_LINES:'CFG-MOD-007-0060',
        MUSHAK_REQUIRED:'CFG-MOD-007-0061',
        RECEIVED_ON_PURCHASE:'CFG-MOD-007-0062',
        POST_ON_APPROVAL:'CFG-MOD-007-0063',
        PRINT_ON_APPROVAL:'CFG-MOD-007-0064',
        UNITS_REQUIRED:'',
        UNIQUE_KEY_NO:'',
        UNIQUE_BATTERY_NO:'',
        INVOICE_NO_REQUIRED:'CFG-MOD-007-0075',
        DO_REQUIRED:'CFG-MOD-007-0076',
        GATE_PASS_REQUIRED:'CFG-MOD-007-0077',
        PRICE_ABOVE_PO:'CFG-MOD-007-0078',
        VAT_AS_PER_63:'CFG-MOD-007-0079',
        FREE_GOODS:'CFG-MOD-007-0029',
        ROUND_PAYABLE:'CFG-MOD-007-0031',
        WHOLE_TAKA_LINES:'CFG-MOD-007-0033',
        EDIT_SUPPLIER_TERMS:'CFG-MOD-007-0039'
    }
};


//===============================================================
// DI : the page's form / list read these
//===============================================================

export const PURCHASE_PAGE =
    new InjectionToken<PurchasePageConfig>('PURCHASE_PAGE');


// Providers of one page : its config, and its service as the
// shared PurchaseService
export function purchaseProviders
(
    page:
        PurchasePageConfig,
    service:
        Type<PurchaseService>
):
    Provider[]
{
    return [
        {
            provide:PURCHASE_PAGE,
            useValue:page
        },
        {
            provide:PurchaseService,
            useExisting:service
        }
    ];
}
