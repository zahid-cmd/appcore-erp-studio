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

export const PosReconciliationsRoutes:
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
            breadcrumb:'POS Reconciliations'
        },

        loadComponent:() =>
            import(
                '../pages/pos-reconciliations/list/pos-reconciliations-list'
            )
            .then(
                m =>
                    m.PosReconciliationsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add POS Reconciliations'
        },

        loadComponent:() =>
            import(
                '../pages/pos-reconciliations/form/pos-reconciliations-form'
            )
            .then(
                m =>
                    m.PosReconciliationsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit POS Reconciliations'
        },

        loadComponent:() =>
            import(
                '../pages/pos-reconciliations/form/pos-reconciliations-form'
            )
            .then(
                m =>
                    m.PosReconciliationsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View POS Reconciliations'
        },

        loadComponent:() =>
            import(
                '../pages/pos-reconciliations/form/pos-reconciliations-form'
            )
            .then(
                m =>
                    m.PosReconciliationsForm
            )
    }

];