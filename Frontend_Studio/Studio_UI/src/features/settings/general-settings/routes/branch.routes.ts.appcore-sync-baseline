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

export const BranchRoutes:
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
            breadcrumb:'Branch'
        },

        loadComponent:() =>
            import(
                '../pages/branch/list/branch-list'
            )
            .then(
                m =>
                    m.BranchList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Branch'
        },

        loadComponent:() =>
            import(
                '../pages/branch/form/branch-form'
            )
            .then(
                m =>
                    m.BranchForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Branch'
        },

        loadComponent:() =>
            import(
                '../pages/branch/form/branch-form'
            )
            .then(
                m =>
                    m.BranchForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Branch'
        },

        loadComponent:() =>
            import(
                '../pages/branch/form/branch-form'
            )
            .then(
                m =>
                    m.BranchForm
            )
    }

];