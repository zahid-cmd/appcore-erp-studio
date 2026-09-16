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

export const LayoutComponentsRoutes:
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
            breadcrumb:'Layout Components'
        },

        loadComponent:() =>
            import(
                '../pages/layout-components/list/layout-components-list'
            )
            .then(
                m =>
                    m.LayoutComponentsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Layout Components'
        },

        loadComponent:() =>
            import(
                '../pages/layout-components/form/layout-components-form'
            )
            .then(
                m =>
                    m.LayoutComponentsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Layout Components'
        },

        loadComponent:() =>
            import(
                '../pages/layout-components/form/layout-components-form'
            )
            .then(
                m =>
                    m.LayoutComponentsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Layout Components'
        },

        loadComponent:() =>
            import(
                '../pages/layout-components/form/layout-components-form'
            )
            .then(
                m =>
                    m.LayoutComponentsForm
            )
    }

];