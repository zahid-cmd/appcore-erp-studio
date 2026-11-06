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

export const BranchAssignmentRoutes:
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
            breadcrumb:'Branch Assignment'
        },

        loadComponent:() =>
            import(
                '../pages/branch-assignment/list/branch-assignment-list'
            )
            .then(
                m =>
                    m.BranchAssignmentList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Branch Assignment'
        },

        loadComponent:() =>
            import(
                '../pages/branch-assignment/form/branch-assignment-form'
            )
            .then(
                m =>
                    m.BranchAssignmentForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Branch Assignment'
        },

        loadComponent:() =>
            import(
                '../pages/branch-assignment/form/branch-assignment-form'
            )
            .then(
                m =>
                    m.BranchAssignmentForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Branch Assignment'
        },

        loadComponent:() =>
            import(
                '../pages/branch-assignment/form/branch-assignment-form'
            )
            .then(
                m =>
                    m.BranchAssignmentForm
            )
    }

];