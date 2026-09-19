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

export const ApplicationComponentsRoutes:
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
            breadcrumb:'Application Components'
        },

        loadComponent:() =>
            import(
                '../pages/application-components/list/application-components-list'
            )
            .then(
                m =>
                    m.ApplicationComponentsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Application Components'
        },

        loadComponent:() =>
            import(
                '../pages/application-components/form/application-components-form'
            )
            .then(
                m =>
                    m.ApplicationComponentsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Application Components'
        },

        loadComponent:() =>
            import(
                '../pages/application-components/form/application-components-form'
            )
            .then(
                m =>
                    m.ApplicationComponentsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Application Components'
        },

        loadComponent:() =>
            import(
                '../pages/application-components/form/application-components-form'
            )
            .then(
                m =>
                    m.ApplicationComponentsForm
            )
    }

];