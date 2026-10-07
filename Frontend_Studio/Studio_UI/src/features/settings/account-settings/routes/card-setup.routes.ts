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

export const CardSetupRoutes:
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
            breadcrumb:'Card Setup'
        },

        loadComponent:() =>
            import(
                '../pages/card-setup/list/card-setup-list'
            )
            .then(
                m =>
                    m.CardSetupList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Card Setup'
        },

        loadComponent:() =>
            import(
                '../pages/card-setup/form/card-setup-form'
            )
            .then(
                m =>
                    m.CardSetupForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Card Setup'
        },

        loadComponent:() =>
            import(
                '../pages/card-setup/form/card-setup-form'
            )
            .then(
                m =>
                    m.CardSetupForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Card Setup'
        },

        loadComponent:() =>
            import(
                '../pages/card-setup/form/card-setup-form'
            )
            .then(
                m =>
                    m.CardSetupForm
            )
    }

];