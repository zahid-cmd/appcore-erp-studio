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

export const MfsReconciliationsRoutes:
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
            breadcrumb:'MFS Reconciliations'
        },

        loadComponent:() =>
            import(
                '../pages/mfs-reconciliations/list/mfs-reconciliations-list'
            )
            .then(
                m =>
                    m.MfsReconciliationsList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add MFS Reconciliations'
        },

        loadComponent:() =>
            import(
                '../pages/mfs-reconciliations/form/mfs-reconciliations-form'
            )
            .then(
                m =>
                    m.MfsReconciliationsForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit MFS Reconciliations'
        },

        loadComponent:() =>
            import(
                '../pages/mfs-reconciliations/form/mfs-reconciliations-form'
            )
            .then(
                m =>
                    m.MfsReconciliationsForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View MFS Reconciliations'
        },

        loadComponent:() =>
            import(
                '../pages/mfs-reconciliations/form/mfs-reconciliations-form'
            )
            .then(
                m =>
                    m.MfsReconciliationsForm
            )
    }

];