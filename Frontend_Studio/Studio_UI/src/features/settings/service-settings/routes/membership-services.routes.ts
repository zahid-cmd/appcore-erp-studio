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

export const MembershipServicesRoutes:
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
            breadcrumb:'Membership Services'
        },

        loadComponent:() =>
            import(
                '../pages/membership-services/list/membership-services-list'
            )
            .then(
                m =>
                    m.MembershipServicesList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Membership Services'
        },

        loadComponent:() =>
            import(
                '../pages/membership-services/form/membership-services-form'
            )
            .then(
                m =>
                    m.MembershipServicesForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Membership Services'
        },

        loadComponent:() =>
            import(
                '../pages/membership-services/form/membership-services-form'
            )
            .then(
                m =>
                    m.MembershipServicesForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Membership Services'
        },

        loadComponent:() =>
            import(
                '../pages/membership-services/form/membership-services-form'
            )
            .then(
                m =>
                    m.MembershipServicesForm
            )
    }

];