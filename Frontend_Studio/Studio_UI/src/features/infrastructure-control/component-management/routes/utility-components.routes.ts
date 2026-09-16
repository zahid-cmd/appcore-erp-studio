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

export const UtilityComponentsRoutes:
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
            breadcrumb:'Utility Components'
        },

        loadComponent:() =>
            import(
                '../pages/utility-components/list/utility-components-list'
            )
            .then(
                m =>
                    m.UtilityComponentsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Utility Components'
        },

        loadComponent:() =>
            import(
                '../pages/utility-components/form/utility-components-form'
            )
            .then(
                m =>
                    m.UtilityComponentsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Utility Components'
        },

        loadComponent:() =>
            import(
                '../pages/utility-components/form/utility-components-form'
            )
            .then(
                m =>
                    m.UtilityComponentsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Utility Components'
        },

        loadComponent:() =>
            import(
                '../pages/utility-components/form/utility-components-form'
            )
            .then(
                m =>
                    m.UtilityComponentsForm
            )
    }

];