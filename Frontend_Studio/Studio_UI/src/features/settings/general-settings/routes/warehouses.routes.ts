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

export const WarehousesRoutes:
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
            breadcrumb:'Warehouses'
        },

        loadComponent:() =>
            import(
                '../pages/warehouses/list/warehouses-list'
            )
            .then(
                m =>
                    m.WarehousesList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Warehouses'
        },

        loadComponent:() =>
            import(
                '../pages/warehouses/form/warehouses-form'
            )
            .then(
                m =>
                    m.WarehousesForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Warehouses'
        },

        loadComponent:() =>
            import(
                '../pages/warehouses/form/warehouses-form'
            )
            .then(
                m =>
                    m.WarehousesForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Warehouses'
        },

        loadComponent:() =>
            import(
                '../pages/warehouses/form/warehouses-form'
            )
            .then(
                m =>
                    m.WarehousesForm
            )
    }

];