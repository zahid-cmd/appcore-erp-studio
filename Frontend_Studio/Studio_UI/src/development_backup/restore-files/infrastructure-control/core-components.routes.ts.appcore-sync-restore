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

export const CoreComponentsRoutes:
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
            breadcrumb:'Core Components'
        },

        loadComponent:() =>
            import(
                '../pages/core-components/list/core-components-list'
            )
            .then(
                m =>
                    m.CoreComponentsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Core Components'
        },

        loadComponent:() =>
            import(
                '../pages/core-components/form/core-components-form'
            )
            .then(
                m =>
                    m.CoreComponentsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Core Components'
        },

        loadComponent:() =>
            import(
                '../pages/core-components/form/core-components-form'
            )
            .then(
                m =>
                    m.CoreComponentsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Core Components'
        },

        loadComponent:() =>
            import(
                '../pages/core-components/form/core-components-form'
            )
            .then(
                m =>
                    m.CoreComponentsForm
            )
    }

];