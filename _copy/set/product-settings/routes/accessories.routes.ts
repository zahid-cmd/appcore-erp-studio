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

export const AccessoriesRoutes:
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
            breadcrumb:'Accessories'
        },

        loadComponent:() =>
            import(
                '../pages/accessories/list/accessories-list'
            )
            .then(
                m =>
                    m.AccessoriesList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Accessories'
        },

        loadComponent:() =>
            import(
                '../pages/accessories/form/accessories-form'
            )
            .then(
                m =>
                    m.AccessoriesForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Accessories'
        },

        loadComponent:() =>
            import(
                '../pages/accessories/form/accessories-form'
            )
            .then(
                m =>
                    m.AccessoriesForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Accessories'
        },

        loadComponent:() =>
            import(
                '../pages/accessories/form/accessories-form'
            )
            .then(
                m =>
                    m.AccessoriesForm
            )
    }

];