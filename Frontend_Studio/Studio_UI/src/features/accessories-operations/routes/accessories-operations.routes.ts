//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Accessories Operations : the accessory shop (wing 03), made
// 2026-11-15 (hand-written : NEVER run Module / Menu / Submenu /
// Code Sync for it).
//
//   Booking Management     Bookings - AC
//   Accessories Sales      Quotations / Invoices / Returns - AC
//   Business Promotions    Promotional Offers - Accessory Shop
//
// The pages moved here from Sales Operations; their files stay in
// features/sales-operations, only the address changed.
//===============================================================

export const accessoriesOperationsRoutes:
Routes =
[
    {
        path:'',

        redirectTo:'accessories-sales/sales-invoices-ac',

        pathMatch:'full'
    },

    {
        path:'booking-management',

        data:
        {
            breadcrumb:'Booking Management'
        },

        loadChildren:() =>
            import(
                '../../sales-operations/booking-management/routes/booking-management.routes'
            )
            .then(
                m =>
                    m.accessoriesBookingRoutes
            )
    },

    {
        path:'accessories-sales',

        data:
        {
            breadcrumb:'Accessories Sales'
        },

        loadChildren:() =>
            import(
                '../../sales-operations/accessories-sales/routes/accessories-sales.routes'
            )
            .then(
                m =>
                    m.mnu008004Routes
            )
    },

    {
        path:'business-promotions',

        data:
        {
            breadcrumb:'Business Promotions'
        },

        children:
        [
            {
                path:'',

                redirectTo:'promotional-offers-accessory-shop',

                pathMatch:'full'
            },

            {
                path:'promotional-offers-accessory-shop',

                data:
                {
                    breadcrumb:'Promotional Offers - Accessory Shop'
                },

                loadChildren:() =>
                    import(
                        '../../sales-operations/business-promotions/routes/promotional-offers-accessory-shop.routes'
                    )
                    .then(
                        m =>
                            m.PromotionalOffersAccessoryShopRoutes
                    )
            }
        ]
    }
];
