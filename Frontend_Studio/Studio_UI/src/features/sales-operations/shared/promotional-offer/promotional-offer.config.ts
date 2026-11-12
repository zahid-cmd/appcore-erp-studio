//===============================================================
// Promotional Offers pages : what makes Sales Center / Service
// Center / Accessory Shop different
//
// One list, form and service serve the three pages
// (shared/promotional-offer); the routes hand each page its
// config (business-promotions.routes.ts). Hand-written pages :
// NEVER run Code Sync for them.
//===============================================================

import
{
    InjectionToken,
    Provider
}
from '@angular/core';

import
{
    PromotionalOfferChannel,
    PromotionalTargetType
}
from './promotional-offer.model';


// One Offer Coverage choice : "Models" -> the Model dropdown
// (All Models first)
export interface PromotionalOfferCoverage
{
    type:
        PromotionalTargetType;

    // Offer Coverage item : "Models"
    plural:
        string;

    // Item dropdown label : "Model"
    singular:
        string;
}


export interface PromotionalOfferPageConfig
{
    channel:
        PromotionalOfferChannel;

    // "Promotional Offers - Sales Center"
    title:
        string;

    // One offer : "Promotional Offer - Sales Center"
    docTitle:
        string;

    subtitle:
        string;

    // API path after environment.apiUrl
    apiPath:
        string;

    icon:
        string;

    // Words for the targets
    category:
        string;

    subCategory:
        string;

    product:
        string;

    // A product is searched (parts / accessories) or picked from
    // the list (bikes)
    searchProducts:
        boolean;

    // Offer Coverage choices (owner 2026-11-13 : Sales Center =
    // Models and Motor Bikes only)
    coverages:
        PromotionalOfferCoverage[];
}


export const PO_SALES_CENTER_PAGE:
    PromotionalOfferPageConfig =
{
    channel:'SalesCenter',
    title:'Promotional Offers - Sales Center',
    docTitle:'Promotional Offer - Sales Center',
    subtitle:'Motor bike offers : fixed discounts by model or colour, scratch cards, SMS offers',
    apiPath:'sales-operations/business-promotions/promotional-offers-sales-center',
    icon:'fas fa-motorcycle',
    category:'Bike Category',
    subCategory:'Model',
    product:'Motor Bike',
    searchProducts:false,
    coverages:
    [
        { type:'SubCategory', plural:'Models', singular:'Model' },
        { type:'Product', plural:'Motor Bikes', singular:'Motor Bike' }
    ]
};


export const PO_SERVICE_CENTER_PAGE:
    PromotionalOfferPageConfig =
{
    channel:'ServiceCenter',
    title:'Promotional Offers - Service Center',
    docTitle:'Promotional Offer - Service Center',
    subtitle:'Free service campaigns and spare parts / lubricant discounts by section',
    apiPath:'sales-operations/business-promotions/promotional-offers-service-center',
    icon:'fas fa-screwdriver-wrench',
    category:'Category',
    subCategory:'Sub Category',
    product:'Part',
    searchProducts:true,
    coverages:
    [
        { type:'Category', plural:'Categories', singular:'Category' },
        { type:'SubCategory', plural:'Sub Categories', singular:'Sub Category' },
        { type:'Product', plural:'Parts', singular:'Part' }
    ]
};


export const PO_ACCESSORY_SHOP_PAGE:
    PromotionalOfferPageConfig =
{
    channel:'AccessoryShop',
    title:'Promotional Offers - Accessory Shop',
    docTitle:'Promotional Offer - Accessory Shop',
    subtitle:'Accessory offers : direct price discounts and scratch cards',
    apiPath:'sales-operations/business-promotions/promotional-offers-accessory-shop',
    icon:'fas fa-helmet-safety',
    category:'Category',
    subCategory:'Sub Category',
    product:'Accessory',
    searchProducts:true,
    coverages:
    [
        { type:'Category', plural:'Categories', singular:'Category' },
        { type:'SubCategory', plural:'Sub Categories', singular:'Sub Category' },
        { type:'Product', plural:'Accessories', singular:'Accessory' }
    ]
};


export const PROMOTIONAL_OFFER_PAGE =
    new InjectionToken<PromotionalOfferPageConfig>('PROMOTIONAL_OFFER_PAGE');


export function promotionalOfferProviders
(
    page:
        PromotionalOfferPageConfig
):
    Provider[]
{
    return [
        {
            provide:PROMOTIONAL_OFFER_PAGE,
            useValue:page
        }
    ];
}
