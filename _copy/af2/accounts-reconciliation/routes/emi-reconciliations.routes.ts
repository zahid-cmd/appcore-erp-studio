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

export const EmiReconciliationsRoutes:
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
            breadcrumb:'EMI Reconciliations'
        },

        loadComponent:() =>
            import(
                '../pages/emi-reconciliations/list/emi-reconciliations-list'
            )
            .then(
                m =>
                    m.EmiReconciliationsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add EMI Reconciliations'
        },

        loadComponent:() =>
            import(
                '../pages/emi-reconciliations/form/emi-reconciliations-form'
            )
            .then(
                m =>
                    m.EmiReconciliationsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit EMI Reconciliations'
        },

        loadComponent:() =>
            import(
                '../pages/emi-reconciliations/form/emi-reconciliations-form'
            )
            .then(
                m =>
                    m.EmiReconciliationsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View EMI Reconciliations'
        },

        loadComponent:() =>
            import(
                '../pages/emi-reconciliations/form/emi-reconciliations-form'
            )
            .then(
                m =>
                    m.EmiReconciliationsForm
            )
    }

];