//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Promotional Offers - Service Center routes (hand-written page : NEVER
// run Code Sync for it)
//===============================================================

export const PromotionalOffersServiceCenterRoutes:
Routes =
[
    {
        path:'',

        redirectTo:'list',

        pathMatch:'full'
    },

    {
        path:'list',

        data:
        {
            breadcrumb:'Promotional Offers - Service Center'
        },

        loadComponent:() =>
            import(
                '../pages/promotional-offers-service-center/list/promotional-offers-service-center-list'
            )
            .then(
                m =>
                    m.PromotionalOffersServiceCenterList
            )
    },

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Promotional Offer'
        },

        loadComponent:() =>
            import(
                '../pages/promotional-offers-service-center/form/promotional-offers-service-center-form'
            )
            .then(
                m =>
                    m.PromotionalOffersServiceCenterForm
            )
    },

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Update Promotional Offer'
        },

        loadComponent:() =>
            import(
                '../pages/promotional-offers-service-center/form/promotional-offers-service-center-form'
            )
            .then(
                m =>
                    m.PromotionalOffersServiceCenterForm
            )
    },

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Promotional Offer'
        },

        loadComponent:() =>
            import(
                '../pages/promotional-offers-service-center/form/promotional-offers-service-center-form'
            )
            .then(
                m =>
                    m.PromotionalOffersServiceCenterForm
            )
    }
];
