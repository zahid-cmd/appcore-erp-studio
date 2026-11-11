//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Booking Management Routes (hand-written, NO Code Sync)
//
// One submenu : Bookings (tabs Bookings / Collections /
// Cancellations & Refunds). Booking Collections and Booking
// Cancellations & Refunds were removed (BookingsMB_Engine.sql).
//===============================================================

export const bookingManagementRoutes:
Routes =
[
    {
        path:'',

        redirectTo:'bookings',

        pathMatch:'full'
    },

    {
        path:'bookings',

        data:
        {
            breadcrumb:'Bookings'
        },

        children:
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
                    breadcrumb:'Bookings'
                },

                loadComponent:() =>
                    import(
                        '../pages/bookings/list/bookings-list'
                    )
                    .then(
                        m =>
                            m.BookingsList
                    )
            }
        ]
    }
];
