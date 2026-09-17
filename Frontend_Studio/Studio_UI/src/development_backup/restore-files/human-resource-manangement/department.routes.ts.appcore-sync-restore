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

export const DepartmentRoutes:
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
            breadcrumb:'Department'
        },

        loadComponent:() =>
            import(
                '../pages/department/list/department-list'
            )
            .then(
                m =>
                    m.DepartmentList
            )
    },


    //===========================================================
    // Add
    //===========================================================

    {
        path:'add',

        data:
        {
            breadcrumb:'Add Department'
        },

        loadComponent:() =>
            import(
                '../pages/department/form/department-form'
            )
            .then(
                m =>
                    m.DepartmentForm
            )
    },


    //===========================================================
    // Edit
    //===========================================================

    {
        path:'edit/:id',

        data:
        {
            breadcrumb:'Edit Department'
        },

        loadComponent:() =>
            import(
                '../pages/department/form/department-form'
            )
            .then(
                m =>
                    m.DepartmentForm
            )
    },


    //===========================================================
    // View
    //===========================================================

    {
        path:'view/:id',

        data:
        {
            breadcrumb:'View Department'
        },

        loadComponent:() =>
            import(
                '../pages/department/form/department-form'
            )
            .then(
                m =>
                    m.DepartmentForm
            )
    }

];