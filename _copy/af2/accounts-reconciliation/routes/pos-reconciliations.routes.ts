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
// List of card receipts + the POS Settlement Center (full page).
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
            breadcrumb:'POS Reconciliation'
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
    // POS Settlement Center (settle / reject)
    //===========================================================

    {
        path:'center',

        data:
        {
            breadcrumb:'POS Settlement Center'
        },

        loadComponent:() =>
            import(
                '../pages/pos-reconciliations/center/pos-settlement-center'
            )
            .then(
                m =>
                    m.PosSettlementCenter
            )
    }

];