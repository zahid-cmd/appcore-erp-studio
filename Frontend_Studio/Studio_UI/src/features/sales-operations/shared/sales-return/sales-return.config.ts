//===============================================================
// Sales Returns pages : what makes MB / SP / AC different
//
// One list, form, service and print serve every Sales Returns
// page (shared/sales-return). Each page's own files only hand
// over its SalesReturnPageConfig. Hand-written pages : NEVER run
// Code Sync for them again.
//===============================================================

import
{
    InjectionToken,
    Provider
}
from '@angular/core';

import
{
    SalesReturnPageType
}
from './sales-return.model';


export interface SalesReturnPageConfig
{
    pageType:
        SalesReturnPageType;

    // List header : "Sales Returns - SP"
    title:
        string;

    // Form header in full : "Sales Return - Spare Parts & Lubricants"
    fullTitle:
        string;

    // One document : "Sales Return - SP" (print, messages)
    docTitle:
        string;

    // Number prefix (SRMB / SRSP / SRAC)
    prefix:
        string;

    // API path after environment.apiUrl
    apiPath:
        string;

    // The invoice page of the type (no leading slash)
    invoiceRoute:
        string;

    // Print viewer source key (print-registry.ts) and its document
    printKey:
        string;

    a4DocKey:
        string;

    // The invoice print (the invoice returned from)
    invoicePrintKey:
        string;

    item:
        string;

    items:
        string;

    icon:
        string;
}


export const SR_SP_PAGE:
    SalesReturnPageConfig =
{
    pageType:'SP',
    title:'Sales Returns - SP',
    fullTitle:'Sales Return - Spare Parts & Lubricants',
    docTitle:'Sales Return - SP',
    prefix:'SRSP',
    apiPath:'sales-operations/spare-parts-lubricant-sales/sales-returns-sp',
    invoiceRoute:'sales-operations/spare-parts-lubricant-sales/sales-invoices-sp',
    printKey:'sales-returns-sp',
    a4DocKey:'sales-return',
    invoicePrintKey:'sales-invoices-sp',
    item:'Spare Part / Lubricant',
    items:'spare parts / lubricants',
    icon:'fa-gears'
};


export const SR_AC_PAGE:
    SalesReturnPageConfig =
{
    pageType:'AC',
    title:'Sales Returns - AC',
    fullTitle:'Sales Return - Accessories',
    docTitle:'Sales Return - AC',
    prefix:'SRAC',
    apiPath:'sales-operations/accessories-sales/sales-returns-ac',
    invoiceRoute:'sales-operations/accessories-sales/sales-invoices-ac',
    printKey:'sales-returns-ac',
    a4DocKey:'sales-return',
    invoicePrintKey:'sales-invoices-ac',
    item:'Accessory',
    items:'accessories',
    icon:'fa-helmet-safety'
};


// MB : whole chassis (quantity 1); allowed until the registration
// was sent to BRTA
export const SR_MB_PAGE:
    SalesReturnPageConfig =
{
    pageType:'MB',
    title:'Sales Returns - MB',
    fullTitle:'Sales Return - Motor Bikes',
    docTitle:'Sales Return - MB',
    prefix:'SRMB',
    apiPath:'sales-operations/motor-bike-sales/sales-returns-mb',
    invoiceRoute:'sales-operations/motor-bike-sales/sales-invoices-mb',
    printKey:'sales-returns-mb',
    a4DocKey:'sales-return',
    invoicePrintKey:'sales-invoices-mb',
    item:'Motor Bike',
    items:'motor bikes',
    icon:'fa-motorcycle'
};


export const SALES_RETURN_PAGE =
    new InjectionToken<SalesReturnPageConfig>('SALES_RETURN_PAGE');


export function salesReturnProviders
(
    page:
        SalesReturnPageConfig
):
    Provider[]
{
    return [
        {
            provide:SALES_RETURN_PAGE,
            useValue:page
        }
    ];
}
