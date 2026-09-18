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

export const RoleAssignmentRoutes:
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
            breadcrumb:'Role Assignment'
        },

        loadComponent:() =>
            import(
                '../pages/role-assignment/list/role-assignment-list'
            )
            .then(
                m =>
                    m.RoleAssignmentList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Role Assignment'
        },

        loadComponent:() =>
            import(
                '../pages/role-assignment/form/role-assignment-form'
            )
            .then(
                m =>
                    m.RoleAssignmentForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Role Assignment'
        },

        loadComponent:() =>
            import(
                '../pages/role-assignment/form/role-assignment-form'
            )
            .then(
                m =>
                    m.RoleAssignmentForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Role Assignment'
        },

        loadComponent:() =>
            import(
                '../pages/role-assignment/form/role-assignment-form'
            )
            .then(
                m =>
                    m.RoleAssignmentForm
            )
    }

];