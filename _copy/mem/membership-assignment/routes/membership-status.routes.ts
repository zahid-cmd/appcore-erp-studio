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

export const MembershipStatusRoutes:
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
            breadcrumb:'Membership Status'
        },

        loadComponent:() =>
            import(
                '../pages/membership-status/list/membership-status-list'
            )
            .then(
                m =>
                    m.MembershipStatusList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Membership Status'
        },

        loadComponent:() =>
            import(
                '../pages/membership-status/form/membership-status-form'
            )
            .then(
                m =>
                    m.MembershipStatusForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Membership Status'
        },

        loadComponent:() =>
            import(
                '../pages/membership-status/form/membership-status-form'
            )
            .then(
                m =>
                    m.MembershipStatusForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Membership Status'
        },

        loadComponent:() =>
            import(
                '../pages/membership-status/form/membership-status-form'
            )
            .then(
                m =>
                    m.MembershipStatusForm
            )
    }

];