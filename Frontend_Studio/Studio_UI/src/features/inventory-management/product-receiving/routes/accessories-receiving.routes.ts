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

export const AccessoriesReceivingRoutes:
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
            breadcrumb:'Accessories Receiving'
        },

        loadComponent:() =>
            import(
                '../pages/accessories-receiving/list/accessories-receiving-list'
            )
            .then(
                m =>
                    m.AccessoriesReceivingList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Accessories Receiving'
        },

        loadComponent:() =>
            import(
                '../pages/accessories-receiving/form/accessories-receiving-form'
            )
            .then(
                m =>
                    m.AccessoriesReceivingForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Accessories Receiving'
        },

        loadComponent:() =>
            import(
                '../pages/accessories-receiving/form/accessories-receiving-form'
            )
            .then(
                m =>
                    m.AccessoriesReceivingForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Accessories Receiving'
        },

        loadComponent:() =>
            import(
                '../pages/accessories-receiving/form/accessories-receiving-form'
            )
            .then(
                m =>
                    m.AccessoriesReceivingForm
            )
    }

];