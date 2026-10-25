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
//
// List of checks + the Check Clearing Center (full page).
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
            breadcrumb:'Check Reconciliation'
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
    // Check Clearing Center (deposit / clear / dishonour)
    //===========================================================

    {
        path:'center',

        data:
        {
            breadcrumb:'Check Clearing Center'
        },

        loadComponent:() =>
            import(
                '../pages/check-reconciliations/center/check-clearing-center'
            )
            .then(
                m =>
                    m.CheckClearingCenter
            )
    }

];