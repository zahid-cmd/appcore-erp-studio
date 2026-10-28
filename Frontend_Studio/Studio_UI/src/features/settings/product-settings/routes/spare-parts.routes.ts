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

export const SparePartsRoutes:
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
            breadcrumb:'Spare Parts & Lubricants'
        },

        loadComponent:() =>
            import(
                '../pages/spare-parts/list/spare-parts-list'
            )
            .then(
                m =>
                    m.SparePartsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Spare Part / Lubricant'
        },

        loadComponent:() =>
            import(
                '../pages/spare-parts/form/spare-parts-form'
            )
            .then(
                m =>
                    m.SparePartsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Spare Part / Lubricant'
        },

        loadComponent:() =>
            import(
                '../pages/spare-parts/form/spare-parts-form'
            )
            .then(
                m =>
                    m.SparePartsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Spare Part / Lubricant'
        },

        loadComponent:() =>
            import(
                '../pages/spare-parts/form/spare-parts-form'
            )
            .then(
                m =>
                    m.SparePartsForm
            )
    }

];