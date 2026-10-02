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

export const WingsRoutes:
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
            breadcrumb:'Wings'
        },

        loadComponent:() =>
            import(
                '../pages/wings/list/wings-list'
            )
            .then(
                m =>
                    m.WingsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Wings'
        },

        loadComponent:() =>
            import(
                '../pages/wings/form/wings-form'
            )
            .then(
                m =>
                    m.WingsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Wings'
        },

        loadComponent:() =>
            import(
                '../pages/wings/form/wings-form'
            )
            .then(
                m =>
                    m.WingsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Wings'
        },

        loadComponent:() =>
            import(
                '../pages/wings/form/wings-form'
            )
            .then(
                m =>
                    m.WingsForm
            )
    }

];