//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Enquiry Dashboard Routes
//
// Hand-written, read-only page, NO Code Synchronization : one
// page, no add / edit / view routes.
//===============================================================

export const EnquiryDashboardRoutes:
Routes =
[
    {
        path:'',
        redirectTo:'view',
        pathMatch:'full'
    },

    {
        path:'view',

        data:
        {
            breadcrumb:'Enquiry Dashboard'
        },

        loadComponent:() =>
            import(
                '../pages/enquiry-dashboard/enquiry-dashboard'
            )
            .then(
                m =>
                    m.EnquiryDashboardPage
            )
    }
];
