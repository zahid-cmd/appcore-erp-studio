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
//
// Configure-only : no Add route (rows come from Membership Cards)
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
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Configure Membership Service'
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
            breadcrumb:'View Membership Service'
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