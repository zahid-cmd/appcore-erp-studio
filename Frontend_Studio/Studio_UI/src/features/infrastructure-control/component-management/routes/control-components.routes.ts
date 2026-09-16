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

export const ControlComponentsRoutes:
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
            breadcrumb:'Control Components'
        },

        loadComponent:() =>
            import(
                '../pages/control-components/list/control-components-list'
            )
            .then(
                m =>
                    m.ControlComponentsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Control Components'
        },

        loadComponent:() =>
            import(
                '../pages/control-components/form/control-components-form'
            )
            .then(
                m =>
                    m.ControlComponentsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Control Components'
        },

        loadComponent:() =>
            import(
                '../pages/control-components/form/control-components-form'
            )
            .then(
                m =>
                    m.ControlComponentsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Control Components'
        },

        loadComponent:() =>
            import(
                '../pages/control-components/form/control-components-form'
            )
            .then(
                m =>
                    m.ControlComponentsForm
            )
    }

];