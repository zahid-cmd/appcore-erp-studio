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

export const CustomerProfilesRoutes:
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
            breadcrumb:'Customer Profiles'
        },

        loadComponent:() =>
            import(
                '../pages/customer-profiles/list/customer-profiles-list'
            )
            .then(
                m =>
                    m.CustomerProfilesList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Customer Profiles'
        },

        loadComponent:() =>
            import(
                '../pages/customer-profiles/form/customer-profiles-form'
            )
            .then(
                m =>
                    m.CustomerProfilesForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Customer Profiles'
        },

        loadComponent:() =>
            import(
                '../pages/customer-profiles/form/customer-profiles-form'
            )
            .then(
                m =>
                    m.CustomerProfilesForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Customer Profiles'
        },

        loadComponent:() =>
            import(
                '../pages/customer-profiles/form/customer-profiles-form'
            )
            .then(
                m =>
                    m.CustomerProfilesForm
            )
    }

];