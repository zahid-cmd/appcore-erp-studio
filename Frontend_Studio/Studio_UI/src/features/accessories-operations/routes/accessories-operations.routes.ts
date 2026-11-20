//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';

import
{
    moduleConfigurationRoutes
}
from '../../settings/general-settings/routes/module-configuration.routes';


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

    //===========================================================
    // Module Configuration (2026-11-20) : this module's switches.
    // Kept first : the setup menu's own route follows.
    //===========================================================

    ...moduleConfigurationRoutes(
        'accessories-setup', 'Accessories Setup', 'MOD-018', 'Accessories Configuration'),

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
