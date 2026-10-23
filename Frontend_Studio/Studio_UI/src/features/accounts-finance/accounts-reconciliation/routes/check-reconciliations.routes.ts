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

export const CheckReconciliationsRoutes:
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
            breadcrumb:'Check Reconciliations'
        },

        loadComponent:() =>
            import(
                '../pages/check-reconciliations/list/check-reconciliations-list'
            )
            .then(
                m =>
                    m.CheckReconciliationsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Check Reconciliations'
        },

        loadComponent:() =>
            import(
                '../pages/check-reconciliations/form/check-reconciliations-form'
            )
            .then(
                m =>
                    m.CheckReconciliationsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Check Reconciliations'
        },

        loadComponent:() =>
            import(
                '../pages/check-reconciliations/form/check-reconciliations-form'
            )
            .then(
                m =>
                    m.CheckReconciliationsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Check Reconciliations'
        },

        loadComponent:() =>
            import(
                '../pages/check-reconciliations/form/check-reconciliations-form'
            )
            .then(
                m =>
                    m.CheckReconciliationsForm
            )
    }

];