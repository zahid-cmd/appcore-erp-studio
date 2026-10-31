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

export const SparePartsLubricantsReceivingRoutes:
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
            breadcrumb:'Spare Parts & Lubricants Receiving'
        },

        loadComponent:() =>
            import(
                '../pages/spare-parts-lubricants-receiving/list/spare-parts-lubricants-receiving-list'
            )
            .then(
                m =>
                    m.SparePartsLubricantsReceivingList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Spare Parts & Lubricants Receiving'
        },

        loadComponent:() =>
            import(
                '../pages/spare-parts-lubricants-receiving/form/spare-parts-lubricants-receiving-form'
            )
            .then(
                m =>
                    m.SparePartsLubricantsReceivingForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Spare Parts & Lubricants Receiving'
        },

        loadComponent:() =>
            import(
                '../pages/spare-parts-lubricants-receiving/form/spare-parts-lubricants-receiving-form'
            )
            .then(
                m =>
                    m.SparePartsLubricantsReceivingForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Spare Parts & Lubricants Receiving'
        },

        loadComponent:() =>
            import(
                '../pages/spare-parts-lubricants-receiving/form/spare-parts-lubricants-receiving-form'
            )
            .then(
                m =>
                    m.SparePartsLubricantsReceivingForm
            )
    }

];