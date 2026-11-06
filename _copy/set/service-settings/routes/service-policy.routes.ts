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

export const ServicePolicyRoutes:
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
            breadcrumb:'Service Policy'
        },

        loadComponent:() =>
            import(
                '../pages/service-policy/list/service-policy-list'
            )
            .then(
                m =>
                    m.ServicePolicyList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Service Policy'
        },

        loadComponent:() =>
            import(
                '../pages/service-policy/form/service-policy-form'
            )
            .then(
                m =>
                    m.ServicePolicyForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Service Policy'
        },

        loadComponent:() =>
            import(
                '../pages/service-policy/form/service-policy-form'
            )
            .then(
                m =>
                    m.ServicePolicyForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Service Policy'
        },

        loadComponent:() =>
            import(
                '../pages/service-policy/form/service-policy-form'
            )
            .then(
                m =>
                    m.ServicePolicyForm
            )
    }

];