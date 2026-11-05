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
// List of MFS receipts + the MFS Settlement Center (full page).
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
            breadcrumb:'MFS Reconciliation'
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
    // MFS Settlement Center (settle / reject)
    //===========================================================

    {
        path:'center',

        data:
        {
            breadcrumb:'MFS Settlement Center'
        },

        loadComponent:() =>
            import(
                '../pages/mfs-reconciliations/center/mfs-settlement-center'
            )
            .then(
                m =>
                    m.MfsSettlementCenter
            )
    }

];