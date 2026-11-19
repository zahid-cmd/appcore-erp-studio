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
    // Add : wings are fixed (made with the company), so the old
    // address only goes back to the list
    //===========================================================

    {
        path:'add',

        redirectTo:'list',

        pathMatch:'full'
    },


    //===========================================================
    // Edit : wings are fixed, so the old address only goes back
    // to the list (View still opens the form, read only)
    //===========================================================

    {
        path:'edit/:id',

        redirectTo:'list',

        pathMatch:'full'
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