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
    moved
}
from '../../../../shared/utils/moved-route';


//===============================================================
// Booking Management Routes (hand-written, NO Code Sync)
//
// One page per product type, the same component (route data
// bookingType) :
//   Bookings - MB  bookings-mb   Sales Operations
//   Bookings - SP  bookings-sp   Service Operations (2026-11-15)
//   Bookings - AC  bookings-ac   Accessories Operations (2026-11-15)
// Each has the tabs Bookings / Collections / Cancellations &
// Refunds (Bookings_Engine.sql). The old "bookings" link opens
// Bookings - MB.
//===============================================================

export const bookingsPage =
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

    // Moved 2026-11-15 : each operation has its own Booking
    // Management menu (the old addresses open the new ones)
    moved('bookings-sp', '/service-operations/booking-management/bookings-sp'),

    moved('bookings-ac', '/accessories-operations/booking-management/bookings-ac')
];


// Service Operations > Booking Management : Bookings - SP
export const serviceBookingRoutes:
Routes =
[
    {
        path:'',
        redirectTo:'bookings-sp',
        pathMatch:'full'
    },

    bookingsPage('bookings-sp', 'SP', 'Bookings - SP')
];


// Accessories Operations > Booking Management : Bookings - AC
export const accessoriesBookingRoutes:
Routes =
[
    {
        path:'',
        redirectTo:'bookings-ac',
        pathMatch:'full'
    },

    bookingsPage('bookings-ac', 'AC', 'Bookings - AC')
];
