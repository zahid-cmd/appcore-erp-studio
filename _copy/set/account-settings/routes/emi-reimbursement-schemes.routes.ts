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

export const EmiReimbursementSchemesRoutes:
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
            breadcrumb:'EMI Reimbursement Schemes'
        },

        loadComponent:() =>
            import(
                '../pages/emi-reimbursement-schemes/list/emi-reimbursement-schemes-list'
            )
            .then(
                m =>
                    m.EmiReimbursementSchemesList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add EMI Reimbursement Schemes'
        },

        loadComponent:() =>
            import(
                '../pages/emi-reimbursement-schemes/form/emi-reimbursement-schemes-form'
            )
            .then(
                m =>
                    m.EmiReimbursementSchemesForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit EMI Reimbursement Schemes'
        },

        loadComponent:() =>
            import(
                '../pages/emi-reimbursement-schemes/form/emi-reimbursement-schemes-form'
            )
            .then(
                m =>
                    m.EmiReimbursementSchemesForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View EMI Reimbursement Schemes'
        },

        loadComponent:() =>
            import(
                '../pages/emi-reimbursement-schemes/form/emi-reimbursement-schemes-form'
            )
            .then(
                m =>
                    m.EmiReimbursementSchemesForm
            )
    }

];