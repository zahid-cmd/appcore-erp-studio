//===============================================================
// Sales Invoices pages : what makes SP / AC / MB different
//
// One form, list, service and print serve every Sales Invoices
// page (shared/sales-invoice). Each page's own files only hand
// over its SalesInvoicePageConfig and its service.
//
// Switches are read BY CODE (Sales Operations = MOD-008); the
// server resolves them (GET defaults); the codes are kept here so
// the page can name them in its messages. '' = the switch is not
// on this page (its fallback is used).
//
// SP and AC are wired; MB is ready for its page.
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
    SalesInvoicePageType
}
from './sales-invoice.model';

import
{
    SalesInvoiceService
}
from './sales-invoice.service';


//===============================================================
// Switch codes of one page
//===============================================================

export interface SalesInvoiceSwitchCodes
{
    // Draft -> Approved -> Posted (OFF : save posts at once)
    POST_ON_APPROVAL:
        string;

    // Unpaid balance allowed (walk-in : never)
    ALLOW_CREDIT_SALE:
        string;

    // Child of ALLOW_CREDIT_SALE : refuse above the Credit Limit
    ENFORCE_CREDIT_LIMIT:
        string;

    // Value = most % below the MRP; empty = no limit
    ALLOW_PRICE_EDIT:
        string;

    // Special discount; Value = most %; empty = no limit
    ALLOW_DISCOUNT:
        string;

    BLOCK_BELOW_COST:
        string;

    // '' on MB (bikes are sold by chassis)
    ALLOW_WITHOUT_STOCK:
        string;

    BACK_DATED:
        string;

    // Value = within days; empty = any time
    ALLOW_CANCEL_POSTED:
        string;

    PRINT_AFTER_POSTING:
        string;

    // '' on MB
    ALLOW_WALK_IN:
        string;

    SELL_AT_BATCH_MRP:
        string;

    ROUND_DOWN_WHOLE_TAKA:
        string;

    // Print : payment breakdown on the customer copy (default OFF;
    // the customer copy never shows charges paid on top)
    PRINT_CUSTOMER_PAYMENTS:
        string;

    // Print : Show Discount on Print (default ON). OFF = the
    // customer copy, the thermal receipt and the Money Receipt
    // show the full MRP (no discount column or lines); the office
    // copy always shows the discounts
    PRINT_SHOW_DISCOUNT:
        string;

    // Print : Show Registration on Print (MB 0083, default ON; ''
    // on SP / AC). OFF = the Registration line is left off the
    // customer copy, the thermal receipt and the Money Receipt
    PRINT_SHOW_REGISTRATION:
        string;

    // VAT Management : Sales VAT Applicable (Value = from date)
    SALES_VAT:
        string;
}


//===============================================================
// One page
//===============================================================

export interface SalesInvoicePageConfig
{
    // SP / AC / MB
    pageType:
        SalesInvoicePageType;

    // Header : Add / Update / View <title>
    title:
        string;

    // Form header in full : "Sales Invoice - Motor Bikes" (add);
    // Update / View <fullTitle> (edit / view)
    fullTitle:
        string;

    // One document : "Sales Invoice - SP" (print, messages)
    docTitle:
        string;

    listTitle:
        string;

    // Number prefix (SISP / SIAC / SIMB)
    prefix:
        string;

    // API path after environment.apiUrl
    apiPath:
        string;

    // Print viewer source key (print-registry.ts) and its two
    // documents (A4 invoice, 80 mm thermal receipt)
    printKey:
        string;

    a4DocKey:
        string;

    thermalDocKey:
        string;

    item:
        string;

    itemLower:
        string;

    items:
        string;

    icon:
        string;

    // Payment Desk modes offered on this page (SP / AC : no EMI)
    paymentModes:
        string[];

    switches:
        SalesInvoiceSwitchCodes;

    // Sales Quotations (2026-11-11) : the same page in quotation
    // mode (no payment, no stock, no posting; MB : models with a
    // quantity). apiPath stays the invoice API (defaults,
    // products, customers, prices); quotationApiPath saves.
    isQuotation?:
        boolean;

    // The quotation API of the type (both page kinds : the
    // invoice loads a quotation to convert it)
    quotationApiPath:
        string;

    // Routes (no leading slash) : the invoice page and the
    // quotation page of the type
    invoiceRoute:
        string;

    quotationRoute:
        string;

    // Quotation Validity switch of the type
    quotationValiditySwitch:
        string;
}


//===============================================================
// The pages
//===============================================================

export const SI_SP_PAGE:
    SalesInvoicePageConfig =
{
    pageType:'SP',
    title:'Sales Invoices - SP',
    fullTitle:'Sales Invoice - Spare Parts & Lubricants',
    docTitle:'Sales Invoice - SP',
    listTitle:'Sales Invoices - Spare Parts & Lubricants',
    prefix:'SISP',
    apiPath:'sales-operations/spare-parts-lubricant-sales/sales-invoices-sp',
    quotationApiPath:'sales-operations/spare-parts-lubricant-sales/sales-quotations-sp',
    invoiceRoute:'sales-operations/spare-parts-lubricant-sales/sales-invoices-sp',
    quotationRoute:'sales-operations/spare-parts-lubricant-sales/sales-quotations-sp',
    quotationValiditySwitch:'CFG-MOD-008-0104',
    printKey:'sales-invoices-sp',
    a4DocKey:'sales-invoice',
    thermalDocKey:'sales-invoice-thermal',
    item:'Spare Part / Lubricant',
    itemLower:'spare part / lubricant',
    items:'spare parts / lubricants',
    icon:'fa-gears',
    paymentModes:['Cash', 'Bank', 'Check', 'MFS', 'POS'],
    switches:
    {
        POST_ON_APPROVAL:'CFG-MOD-008-0021',
        ALLOW_CREDIT_SALE:'CFG-MOD-008-0022',
        ENFORCE_CREDIT_LIMIT:'CFG-MOD-008-0023',
        ALLOW_PRICE_EDIT:'CFG-MOD-008-0024',
        ALLOW_DISCOUNT:'CFG-MOD-008-0025',
        BLOCK_BELOW_COST:'CFG-MOD-008-0026',
        ALLOW_WITHOUT_STOCK:'CFG-MOD-008-0027',
        BACK_DATED:'CFG-MOD-008-0028',
        ALLOW_CANCEL_POSTED:'CFG-MOD-008-0029',
        PRINT_AFTER_POSTING:'CFG-MOD-008-0030',
        ALLOW_WALK_IN:'CFG-MOD-008-0031',
        SELL_AT_BATCH_MRP:'CFG-MOD-008-0032',
        ROUND_DOWN_WHOLE_TAKA:'CFG-MOD-008-0033',
        PRINT_CUSTOMER_PAYMENTS:'CFG-MOD-008-0034',
        PRINT_SHOW_DISCOUNT:'CFG-MOD-008-0035',
        PRINT_SHOW_REGISTRATION:'',
        SALES_VAT:'CFG-MOD-013-0002'
    }
};


// Sales Invoices - AC (Accessories Sales)
export const SI_AC_PAGE:
    SalesInvoicePageConfig =
{
    pageType:'AC',
    title:'Sales Invoices - AC',
    fullTitle:'Sales Invoice - Accessories',
    docTitle:'Sales Invoice - AC',
    listTitle:'Sales Invoices - Accessories',
    prefix:'SIAC',
    apiPath:'sales-operations/accessories-sales/sales-invoices-ac',
    quotationApiPath:'sales-operations/accessories-sales/sales-quotations-ac',
    invoiceRoute:'sales-operations/accessories-sales/sales-invoices-ac',
    quotationRoute:'sales-operations/accessories-sales/sales-quotations-ac',
    quotationValiditySwitch:'CFG-MOD-008-0105',
    printKey:'sales-invoices-ac',
    a4DocKey:'sales-invoice',
    thermalDocKey:'sales-invoice-thermal',
    item:'Accessory',
    itemLower:'accessory',
    items:'accessories',
    icon:'fa-helmet-safety',
    paymentModes:['Cash', 'Bank', 'Check', 'MFS', 'POS'],
    switches:
    {
        POST_ON_APPROVAL:'CFG-MOD-008-0041',
        ALLOW_CREDIT_SALE:'CFG-MOD-008-0042',
        ENFORCE_CREDIT_LIMIT:'CFG-MOD-008-0043',
        ALLOW_PRICE_EDIT:'CFG-MOD-008-0044',
        ALLOW_DISCOUNT:'CFG-MOD-008-0045',
        BLOCK_BELOW_COST:'CFG-MOD-008-0046',
        ALLOW_WITHOUT_STOCK:'CFG-MOD-008-0047',
        BACK_DATED:'CFG-MOD-008-0048',
        ALLOW_CANCEL_POSTED:'CFG-MOD-008-0049',
        PRINT_AFTER_POSTING:'CFG-MOD-008-0050',
        ALLOW_WALK_IN:'CFG-MOD-008-0051',
        SELL_AT_BATCH_MRP:'CFG-MOD-008-0052',
        ROUND_DOWN_WHOLE_TAKA:'CFG-MOD-008-0053',
        PRINT_CUSTOMER_PAYMENTS:'CFG-MOD-008-0054',
        PRINT_SHOW_DISCOUNT:'CFG-MOD-008-0055',
        PRINT_SHOW_REGISTRATION:'',
        SALES_VAT:'CFG-MOD-013-0004'
    }
};


// Sales Invoices - MB (Motor Bike Sales) : one bike (chassis) per
// line, picked model -> colour -> chassis. No "Without Stock" /
// "Walk-in"; 0011 Delivery on Sale (server), EMI comes later.
export const SI_MB_PAGE:
    SalesInvoicePageConfig =
{
    pageType:'MB',
    title:'Sales Invoices - MB',
    fullTitle:'Sales Invoice - Motor Bikes',
    docTitle:'Sales Invoice - MB',
    listTitle:'Sales Invoices - Motor Bikes',
    prefix:'SIMB',
    apiPath:'sales-operations/motor-bike-sales/sales-invoices-mb',
    quotationApiPath:'sales-operations/motor-bike-sales/sales-quotations-mb',
    invoiceRoute:'sales-operations/motor-bike-sales/sales-invoices-mb',
    quotationRoute:'sales-operations/motor-bike-sales/sales-quotations-mb',
    quotationValiditySwitch:'CFG-MOD-008-0103',
    printKey:'sales-invoices-mb',
    a4DocKey:'sales-invoice',
    thermalDocKey:'sales-invoice-thermal',
    item:'Motor Bike',
    itemLower:'motor bike',
    items:'motor bikes',
    icon:'fa-motorcycle',
    paymentModes:['Cash', 'Bank', 'Check', 'MFS', 'POS'],
    switches:
    {
        POST_ON_APPROVAL:'CFG-MOD-008-0001',
        ALLOW_CREDIT_SALE:'CFG-MOD-008-0002',
        ENFORCE_CREDIT_LIMIT:'CFG-MOD-008-0003',
        ALLOW_PRICE_EDIT:'CFG-MOD-008-0004',
        ALLOW_DISCOUNT:'CFG-MOD-008-0005',
        BLOCK_BELOW_COST:'CFG-MOD-008-0006',
        ALLOW_WITHOUT_STOCK:'',
        BACK_DATED:'CFG-MOD-008-0008',
        ALLOW_CANCEL_POSTED:'CFG-MOD-008-0009',
        PRINT_AFTER_POSTING:'CFG-MOD-008-0010',
        ALLOW_WALK_IN:'',
        SELL_AT_BATCH_MRP:'CFG-MOD-008-0017',
        ROUND_DOWN_WHOLE_TAKA:'CFG-MOD-008-0018',
        PRINT_CUSTOMER_PAYMENTS:'CFG-MOD-008-0019',
        PRINT_SHOW_DISCOUNT:'CFG-MOD-008-0082',
        PRINT_SHOW_REGISTRATION:'CFG-MOD-008-0083',
        SALES_VAT:''
    }
};


//===============================================================
// DI : the page's form / list read these
//===============================================================

//===============================================================
// Sales Quotations - SP / AC / MB : the invoice config of the type
// in quotation mode (print key sales-quotations-<type>)
//===============================================================

function quotationPage
(
    invoice:
        SalesInvoicePageConfig,
    names:
        { title:string; fullTitle:string; docTitle:string; listTitle:string; prefix:string }
):
    SalesInvoicePageConfig
{
    return {
        ...invoice,
        ...names,
        isQuotation:true,
        printKey:invoice.printKey.replace('sales-invoices', 'sales-quotations'),
        a4DocKey:'sales-quotation',
        thermalDocKey:''
    };
}

export const SQ_SP_PAGE:
    SalesInvoicePageConfig =
    quotationPage(
        SI_SP_PAGE,
        {
            title:'Sales Quotations - SP',
            fullTitle:'Sales Quotation - Spare Parts & Lubricants',
            docTitle:'Sales Quotation - SP',
            listTitle:'Sales Quotations - Spare Parts & Lubricants',
            prefix:'SQSP'
        });

export const SQ_AC_PAGE:
    SalesInvoicePageConfig =
    quotationPage(
        SI_AC_PAGE,
        {
            title:'Sales Quotations - AC',
            fullTitle:'Sales Quotation - Accessories',
            docTitle:'Sales Quotation - AC',
            listTitle:'Sales Quotations - Accessories',
            prefix:'SQAC'
        });

export const SQ_MB_PAGE:
    SalesInvoicePageConfig =
    quotationPage(
        SI_MB_PAGE,
        {
            title:'Sales Quotations - MB',
            fullTitle:'Sales Quotation - Motor Bikes',
            docTitle:'Sales Quotation - MB',
            listTitle:'Sales Quotations - Motor Bikes',
            prefix:'SQMB'
        });


export const SALES_INVOICE_PAGE =
    new InjectionToken<SalesInvoicePageConfig>('SALES_INVOICE_PAGE');


// Providers of one page : its config, and its service as the
// shared SalesInvoiceService
export function salesInvoiceProviders
(
    page:
        SalesInvoicePageConfig,
    service:
        Type<SalesInvoiceService>
):
    Provider[]
{
    return [
        {
            provide:SALES_INVOICE_PAGE,
            useValue:page
        },
        {
            provide:SalesInvoiceService,
            useExisting:service
        }
    ];
}
