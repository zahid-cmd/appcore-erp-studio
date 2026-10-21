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

export const MembershipPoliciesRoutes:
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
            breadcrumb:'Membership Policies'
        },

        loadComponent:() =>
            import(
                '../pages/membership-policies/list/membership-policies-list'
            )
            .then(
                m =>
                    m.MembershipPoliciesList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Membership Policies'
        },

        loadComponent:() =>
            import(
                '../pages/membership-policies/form/membership-policies-form'
            )
            .then(
                m =>
                    m.MembershipPoliciesForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Membership Policies'
        },

        loadComponent:() =>
            import(
                '../pages/membership-policies/form/membership-policies-form'
            )
            .then(
                m =>
                    m.MembershipPoliciesForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Membership Policies'
        },

        loadComponent:() =>
            import(
                '../pages/membership-policies/form/membership-policies-form'
            )
            .then(
                m =>
                    m.MembershipPoliciesForm
            )
    }

];