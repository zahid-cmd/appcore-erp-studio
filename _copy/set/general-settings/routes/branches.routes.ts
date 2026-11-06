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

export const BranchesRoutes:
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
            breadcrumb:'Branches'
        },

        loadComponent:() =>
            import(
                '../pages/branches/list/branches-list'
            )
            .then(
                m =>
                    m.BranchesList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Branches'
        },

        loadComponent:() =>
            import(
                '../pages/branches/form/branches-form'
            )
            .then(
                m =>
                    m.BranchesForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Branches'
        },

        loadComponent:() =>
            import(
                '../pages/branches/form/branches-form'
            )
            .then(
                m =>
                    m.BranchesForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Branches'
        },

        loadComponent:() =>
            import(
                '../pages/branches/form/branches-form'
            )
            .then(
                m =>
                    m.BranchesForm
            )
    }

];