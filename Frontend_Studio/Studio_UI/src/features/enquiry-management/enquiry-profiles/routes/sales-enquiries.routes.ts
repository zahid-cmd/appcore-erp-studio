//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Submenu Routes
//===============================================================

export const SalesEnquiriesRoutes:
Routes =
[


    //===========================================================
    // Default
    //===========================================================

    {
        path:'',

        redirectTo:'list',

        pathMatch:'full'
    },


    //===========================================================
    // List
    //===========================================================

    {
        path:'list',

        data:
        {
            breadcrumb:'Sales Enquiries'
        },

        loadComponent:() =>
            import(
                '../pages/sales-enquiries/list/sales-enquiries-list'
            )
            .then(
                m =>
                    m.SalesEnquiriesList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Sales Enquiries'
        },

        loadComponent:() =>
            import(
                '../pages/sales-enquiries/form/sales-enquiries-form'
            )
            .then(
                m =>
                    m.SalesEnquiriesForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Sales Enquiries'
        },

        loadComponent:() =>
            import(
                '../pages/sales-enquiries/form/sales-enquiries-form'
            )
            .then(
                m =>
                    m.SalesEnquiriesForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Sales Enquiries'
        },

        loadComponent:() =>
            import(
                '../pages/sales-enquiries/form/sales-enquiries-form'
            )
            .then(
                m =>
                    m.SalesEnquiriesForm
            )
    }

    // Service Appointments / Test Rides : their own pages under
    // Follow-ups & Appointments (2026-11-06)

];