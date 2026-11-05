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

export const OpeningStockRoutes:
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
            breadcrumb:'Opening Stock'
        },

        loadComponent:() =>
            import(
                '../pages/opening-stock/list/opening-stock-list'
            )
            .then(
                m =>
                    m.OpeningStockList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Opening Stock'
        },

        loadComponent:() =>
            import(
                '../pages/opening-stock/form/opening-stock-form'
            )
            .then(
                m =>
                    m.OpeningStockForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Opening Stock'
        },

        loadComponent:() =>
            import(
                '../pages/opening-stock/form/opening-stock-form'
            )
            .then(
                m =>
                    m.OpeningStockForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Opening Stock'
        },

        loadComponent:() =>
            import(
                '../pages/opening-stock/form/opening-stock-form'
            )
            .then(
                m =>
                    m.OpeningStockForm
            )
    }

];