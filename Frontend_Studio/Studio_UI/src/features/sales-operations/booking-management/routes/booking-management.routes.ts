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
// One page per product type, the same component (route data
// bookingType) :
//   Bookings - MB  bookings-mb
//   Bookings - SP  bookings-sp
//   Bookings - AC  bookings-ac
// Each has the tabs Bookings / Collections / Cancellations &
// Refunds (Bookings_Engine.sql). The old "bookings" link opens
// Bookings - MB.
//===============================================================

const bookingsPage =
(
    path:
        string,
    type:
        'MB' | 'SP' | 'AC',
    title:
        string
) =>
({
    path,

    data:
    {
        breadcrumb:title
    },

    children:
    [
        {
            path:'',

            redirectTo:'list',

            pathMatch:'full' as const
        },

        {
            path:'list',

            data:
            {
                breadcrumb:title,

                bookingType:type
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
});


export const bookingManagementRoutes:
Routes =
[
    {
        path:'',

        redirectTo:'bookings-mb',

        pathMatch:'full'
    },

    {
        path:'bookings',

        redirectTo:'bookings-mb',

        pathMatch:'prefix'
    },

    bookingsPage('bookings-mb', 'MB', 'Bookings - MB'),

    bookingsPage('bookings-sp', 'SP', 'Bookings - SP'),

    bookingsPage('bookings-ac', 'AC', 'Bookings - AC')
];
