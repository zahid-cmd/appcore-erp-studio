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

export const ServiceEnquiriesRoutes:
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
            breadcrumb:'Service Enquiries'
        },

        loadComponent:() =>
            import(
                '../pages/service-enquiries/list/service-enquiries-list'
            )
            .then(
                m =>
                    m.ServiceEnquiriesList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Service Enquiries'
        },

        loadComponent:() =>
            import(
                '../pages/service-enquiries/form/service-enquiries-form'
            )
            .then(
                m =>
                    m.ServiceEnquiriesForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Service Enquiries'
        },

        loadComponent:() =>
            import(
                '../pages/service-enquiries/form/service-enquiries-form'
            )
            .then(
                m =>
                    m.ServiceEnquiriesForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Service Enquiries'
        },

        loadComponent:() =>
            import(
                '../pages/service-enquiries/form/service-enquiries-form'
            )
            .then(
                m =>
                    m.ServiceEnquiriesForm
            )
    },


    //===========================================================
    // Sold bikes (MANUAL, not Code Sync) : a bike sold from the
    // outlet and its service schedule
    //===========================================================

    {
        path:'bike/add',

        data:
        {
            breadcrumb:'Add Sold Bike'
        },

        loadComponent:() =>
            import(
                '../pages/service-enquiries/sold-bike/sold-bike-form'
            )
            .then(
                m =>
                    m.SoldBikeForm
            )
    },

    {
        path:'bike/edit/:id',

        data:
        {
            breadcrumb:'Edit Sold Bike'
        },

        loadComponent:() =>
            import(
                '../pages/service-enquiries/sold-bike/sold-bike-form'
            )
            .then(
                m =>
                    m.SoldBikeForm
            )
    },

    {
        path:'bike/view/:id',

        data:
        {
            breadcrumb:'View Sold Bike'
        },

        loadComponent:() =>
            import(
                '../pages/service-enquiries/sold-bike/sold-bike-form'
            )
            .then(
                m =>
                    m.SoldBikeForm
            )
    },


    //===========================================================
    // Service Appointments (MANUAL, not Code Sync) : the day
    // board of workshop visits (?enquiry=<id> picks one)
    //===========================================================

    {
        path:'appointments',

        data:
        {
            breadcrumb:'Service Appointments'
        },

        loadComponent:() =>
            import(
                '../pages/service-enquiries/appointments/service-appointments'
            )
            .then(
                m =>
                    m.ServiceAppointmentsPage
            )
    }

];